/**
 * Upstream services all speak RFC 9457 `application/problem+json`. This turns
 * that into one error type the UI can branch on, and classifies whether a call
 * is worth retrying.
 */
export type Problem = {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  code?: string;
  instance?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: string;
  readonly service: string;

  constructor(service: string, problem: Problem) {
    super(problem.title);
    this.name = "ApiError";
    this.service = service;
    this.status = problem.status;
    this.code = problem.code ?? "unknown";
    this.detail = problem.detail;
  }

  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }

  /** shape the UI shows in an error boundary / toast */
  toDisplay(): { title: string; detail?: string; canRetry: boolean } {
    return { title: this.message, detail: this.detail, canRetry: this.retryable };
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
