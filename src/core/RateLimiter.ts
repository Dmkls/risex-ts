import { RiseRateLimitError } from '../utils/errors.js';

export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly windowMs: number;
  private lastRefill: number;

  constructor(maxTokens: number, windowMs: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.windowMs = windowMs;
    this.lastRefill = Date.now();
  }

  acquire(): void {
    this.refill();
    if (this.tokens < 1) {
      const elapsed = Date.now() - this.lastRefill;
      const waitMs = this.windowMs - elapsed;
      throw new RiseRateLimitError(Math.max(waitMs, 0));
    }
    this.tokens -= 1;
  }

  async acquireAsync(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const elapsed = Date.now() - this.lastRefill;
      const waitMs = Math.max(this.windowMs - elapsed, 0);
      await new Promise((r) => setTimeout(r, waitMs));
      this.refill();
    }
    this.tokens -= 1;
  }

  get remaining(): number {
    this.refill();
    return this.tokens;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed >= this.windowMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }
}
