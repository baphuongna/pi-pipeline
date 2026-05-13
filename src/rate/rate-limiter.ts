/**
 * Rate Limiter Pattern
 * 
 * Token bucket rate limiter with configurable limits.
 */

export interface RateLimiterOptions {
  /** Maximum tokens in bucket */
  maxTokens?: number;
  /** Tokens added per interval */
  refillRate?: number;
  /** Refill interval in ms */
  refillIntervalMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

/**
 * Token bucket rate limiter.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly refillIntervalMs: number;

  constructor(options: RateLimiterOptions = {}) {
    this.maxTokens = options.maxTokens ?? 100;
    this.refillRate = options.refillRate ?? 10;
    this.refillIntervalMs = options.refillIntervalMs ?? 1000;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Try to acquire a token.
   */
  tryAcquire(tokens: number = 1): RateLimitResult {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return {
        allowed: true,
        remaining: Math.floor(this.tokens),
      };
    }

    const needed = tokens - this.tokens;
    const retryAfterMs = Math.ceil((needed / this.refillRate) * this.refillIntervalMs);

    return {
      allowed: false,
      remaining: Math.floor(this.tokens),
      retryAfterMs,
    };
  }

  /**
   * Async acquire with waiting.
   */
  async acquire(tokens: number = 1): Promise<RateLimitResult> {
    let result = this.tryAcquire(tokens);
    
    while (!result.allowed && result.retryAfterMs) {
      await this.sleep(result.retryAfterMs);
      result = this.tryAcquire(tokens);
    }

    return result;
  }

  /**
   * Check if can acquire without consuming.
   */
  canAcquire(tokens: number = 1): boolean {
    this.refill();
    return this.tokens >= tokens;
  }

  /**
   * Get current remaining tokens.
   */
  getRemaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Reset the limiter.
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const intervals = Math.floor(elapsed / this.refillIntervalMs);
    
    if (intervals > 0) {
      const refill = intervals * this.refillRate;
      this.tokens = Math.min(this.maxTokens, this.tokens + refill);
      this.lastRefill = now;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a rate limiter.
 */
export function createRateLimiter(options?: RateLimiterOptions): RateLimiter {
  return new RateLimiter(options);
}

/**
 * Decorator for rate-limited functions.
 */
export function rateLimited<T extends (...args: unknown[]) => Promise<unknown>>(
  limiter: RateLimiter,
  fn: T
): T {
  return (async function (...args: Parameters<T>) {
    await limiter.acquire();
    return fn(...args);
  }) as T;
}
