import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../../src/core/RateLimiter.js';
import { RiseRateLimitError } from '../../src/utils/errors.js';

describe('RateLimiter', () => {
  it('should allow requests within limit', () => {
    const limiter = new RateLimiter(5, 10_000);
    expect(() => {
      for (let i = 0; i < 5; i++) limiter.acquire();
    }).not.toThrow();
  });

  it('should throw when limit exceeded', () => {
    const limiter = new RateLimiter(3, 10_000);
    limiter.acquire();
    limiter.acquire();
    limiter.acquire();
    expect(() => limiter.acquire()).toThrow(RiseRateLimitError);
  });

  it('should report remaining tokens', () => {
    const limiter = new RateLimiter(5, 10_000);
    expect(limiter.remaining).toBe(5);
    limiter.acquire();
    expect(limiter.remaining).toBe(4);
  });

  it('should refill after window', async () => {
    const limiter = new RateLimiter(2, 50); // 50ms window
    limiter.acquire();
    limiter.acquire();
    expect(() => limiter.acquire()).toThrow();
    await new Promise((r) => setTimeout(r, 60));
    expect(() => limiter.acquire()).not.toThrow();
  });
});
