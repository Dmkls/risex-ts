export class RiseApiError extends Error {
  public readonly status: number;
  public readonly path: string;
  public readonly body?: unknown;

  constructor(status: number, path: string, message: string, body?: unknown) {
    super(`API ${path} → ${status}: ${message}`);
    this.name = 'RiseApiError';
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

export class RiseSigningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RiseSigningError';
  }
}

export class RiseRateLimitError extends Error {
  public readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`Rate limited. Retry after ${retryAfterMs}ms`);
    this.name = 'RiseRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}
