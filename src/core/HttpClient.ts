import { RiseApiError } from '../utils/errors.js';
import { RateLimiter } from './RateLimiter.js';
import { Logger } from './Logger.js';
import { DEFAULT_TIMEOUT_MS, REST_RATE_LIMIT, REST_RATE_WINDOW_MS } from '../utils/constants.js';
import type { LogLevel } from './Logger.js';

export interface HttpClientOptions {
  baseUrl: string;
  timeout?: number;
  logLevel?: LogLevel;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly rateLimiter: RateLimiter;
  private readonly log: Logger;

  constructor(opts: HttpClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS;
    this.rateLimiter = new RateLimiter(REST_RATE_LIMIT, REST_RATE_WINDOW_MS);
    this.log = new Logger('HttpClient', opts.logLevel ?? 'warn');
  }

  async get<T = unknown>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async delete<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('DELETE', path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    await this.rateLimiter.acquireAsync();

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    this.log.debug(`${method} ${path}`);

    try {
      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };
      if (body !== undefined) {
        init.body = JSON.stringify(body);
      }

      const res = await fetch(url, init);
      const json = await res.json();

      if (!res.ok) {
        const msg =
          (json as Record<string, unknown>).message ??
          (json as Record<string, Record<string, unknown>>).error?.message ??
          res.statusText;
        throw new RiseApiError(res.status, path, String(msg), json);
      }

      return this.unwrap(json) as T;
    } catch (err) {
      if (err instanceof RiseApiError) throw err;
      if ((err as Error).name === 'AbortError') {
        throw new RiseApiError(0, path, `Request timed out after ${this.timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private unwrap(json: unknown): unknown {
    if (json && typeof json === 'object' && 'data' in json) {
      return (json as Record<string, unknown>).data;
    }
    return json;
  }
}
