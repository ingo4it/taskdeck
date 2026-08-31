/**
 * A small SSE client built on `fetch` (not `EventSource`) so it can POST a body
 * and carry cookies, and so reconnect/backoff is under our control. Used by the
 * job-stream and answer-stream hooks; both connect to taskdeck's own route
 * handlers, which proxy the upstream service and attach the session.
 */
export type SSEMessage = { event: string; data: string; id?: string };

/** Parse a byte stream of `event:`/`data:`/`id:` frames into messages. */
export async function* parseSSE(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<SSEMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) return;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const msg = frameToMessage(frame);
        if (msg) yield msg;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function frameToMessage(frame: string): SSEMessage | null {
  let event = "message";
  let id: string | undefined;
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith(":")) continue; // comment / heartbeat
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    const val = idx === -1 ? "" : line.slice(idx + 1).replace(/^ /, "");
    if (field === "event") event = val;
    else if (field === "data") dataLines.push(val);
    else if (field === "id") id = val;
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n"), id };
}

export type SubscribeOptions<T> = {
  url: string;
  init?: RequestInit;
  onMessage: (event: string, payload: T) => void;
  onStatus?: (status: "connecting" | "open" | "reconnecting" | "closed") => void;
  onError?: (err: unknown) => void;
  signal: AbortSignal;
  maxRetries?: number;
};

/**
 * Connect and keep the stream alive across transient drops. Reconnects with
 * exponential backoff + jitter, forwards `Last-Event-ID`, and stops for good on
 * abort or a non-retryable HTTP status (4xx other than 408/429).
 */
export async function subscribe<T = unknown>(opts: SubscribeOptions<T>): Promise<void> {
  const maxRetries = opts.maxRetries ?? 8;
  let attempt = 0;
  let lastId: string | undefined;

  while (!opts.signal.aborted) {
    opts.onStatus?.(attempt === 0 ? "connecting" : "reconnecting");
    try {
      const headers = new Headers(opts.init?.headers);
      headers.set("accept", "text/event-stream");
      if (lastId) headers.set("last-event-id", lastId);

      const res = await fetch(opts.url, { ...opts.init, headers, signal: opts.signal });
      if (!res.ok || !res.body) {
        if (res.status < 500 && res.status !== 408 && res.status !== 429) {
          throw new NonRetryable(`stream failed: ${res.status}`);
        }
        throw new Error(`stream ${res.status}`);
      }

      attempt = 0;
      opts.onStatus?.("open");
      for await (const msg of parseSSE(res.body, opts.signal)) {
        if (msg.id) lastId = msg.id;
        try {
          opts.onMessage(msg.event, JSON.parse(msg.data) as T);
        } catch {
          opts.onMessage(msg.event, msg.data as T);
        }
      }
      // stream ended cleanly from the server; treat as done
      break;
    } catch (err) {
      if (opts.signal.aborted || err instanceof NonRetryable) {
        opts.onError?.(err);
        break;
      }
      attempt++;
      if (attempt > maxRetries) {
        opts.onError?.(err);
        break;
      }
      await sleep(backoffMs(attempt), opts.signal);
    }
  }
  opts.onStatus?.("closed");
}

class NonRetryable extends Error {}

const backoffMs = (attempt: number) => {
  const base = Math.min(30_000, 2 ** attempt * 250);
  return base / 2 + Math.random() * (base / 2);
};

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });
