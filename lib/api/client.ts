import { ApiError, type Problem } from "./errors";

/**
 * Minimal typed fetch client for one upstream service. Server-side only — it
 * carries the caller's keystone access token. Adds: JSON encode/decode,
 * problem+json → `ApiError`, bounded retry with jittered backoff on 429/5xx,
 * an `AbortSignal` passthrough, and a request id for cross-service tracing.
 */
export type ApiClientOptions = {
  service: string;
  baseUrl: string;
  token?: string;
  /** total attempts including the first; default 3 */
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
};

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  /** override retry for this call (mutations often shouldn't retry) */
  idempotent?: boolean;
};

export class ApiClient {
  private readonly opts: Required<Omit<ApiClientOptions, "token">> & { token?: string };

  constructor(options: ApiClientOptions) {
    this.opts = {
      service: options.service,
      baseUrl: options.baseUrl.replace(/\/$/, ""),
      token: options.token,
      maxAttempts: options.maxAttempts ?? 3,
      fetchImpl: options.fetchImpl ?? fetch,
    };
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const method = options.method ?? "GET";
    const retry = options.idempotent ?? method === "GET";
    const attempts = retry ? this.opts.maxAttempts : 1;

    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await this.once<T>(url, method, options);
      } catch (err) {
        lastError = err;
        if (err instanceof ApiError && !err.retryable) throw err;
        if (attempt === attempts) throw err;
        await sleep(backoffMs(attempt));
      }
    }
    throw lastError;
  }

  /** Open an SSE stream. Returns the raw `Response` body reader wrapper. */
  async stream(path: string, options: RequestOptions = {}): Promise<ReadableStream<Uint8Array>> {
    const res = await this.opts.fetchImpl(this.buildUrl(path, options.query), {
      method: options.method ?? "POST",
      headers: this.headers({ accept: "text/event-stream" }),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
    if (!res.ok || !res.body) throw await this.toApiError(res);
    return res.body;
  }

  private async once<T>(url: string, method: string, options: RequestOptions): Promise<T> {
    const res = await this.opts.fetchImpl(url, {
      method,
      headers: this.headers(),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });

    if (!res.ok) throw await this.toApiError(res);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private headers(extra: Record<string, string> = {}): HeadersInit {
    const h: Record<string, string> = {
      "content-type": "application/json",
      "x-request-id": crypto.randomUUID(),
      ...extra,
    };
    if (this.opts.token) h.authorization = `Bearer ${this.opts.token}`;
    return h;
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const url = new URL(this.opts.baseUrl + (path.startsWith("/") ? path : `/${path}`));
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    return url.toString();
  }

  private async toApiError(res: Response): Promise<ApiError> {
    let problem: Problem = { title: res.statusText || "Request failed", status: res.status };
    try {
      const body = (await res.json()) as Partial<Problem>;
      problem = { ...problem, ...body, status: body.status ?? res.status };
    } catch {
      // non-JSON error body — keep the status-derived problem
    }
    return new ApiError(this.opts.service, problem);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoffMs = (attempt: number) =>
  Math.round((2 ** attempt * 100) / 2 + (Math.random() * (2 ** attempt * 100)) / 2);
