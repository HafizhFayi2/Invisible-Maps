/**
 * queue/rateLimiter.ts
 * Exponential backoff handler + token-bucket rate limiter.
 * Used across all external API calls to prevent bans and quota exhaustion.
 */

export interface BackoffOptions {
  baseMs?: number;       // Base wait time (default: 1000ms)
  multiplier?: number;   // Backoff multiplier (default: 2)
  maxMs?: number;        // Max wait time cap (default: 120_000ms)
  jitterMs?: number;     // Random jitter range (default: 500ms)
}

const BACKOFF_DEFAULTS: Required<BackoffOptions> = {
  baseMs: 1000,
  multiplier: 2,
  maxMs: 120_000,
  jitterMs: 500,
};

/**
 * Calculate exponential backoff delay for a given retry attempt.
 */
export function calcBackoffMs(attempt: number, opts: BackoffOptions = {}): number {
  const { baseMs, multiplier, maxMs, jitterMs } = { ...BACKOFF_DEFAULTS, ...opts };
  const raw = baseMs * Math.pow(multiplier, attempt);
  const capped = Math.min(raw, maxMs);
  const jitter = Math.random() * jitterMs;
  return Math.floor(capped + jitter);
}

/**
 * Sleep for the calculated backoff duration.
 */
export async function backoffSleep(attempt: number, opts: BackoffOptions = {}): Promise<void> {
  const ms = calcBackoffMs(attempt, opts);
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Token-bucket rate limiter.
 * Allows burst of `capacity` requests, refilling at `refillRatePerSec` tokens/second.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillRatePerSec: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /** Request a token. Returns true if allowed, false if rate-limited. */
  consume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /** Wait until a token is available, then consume it. */
  async waitAndConsume(): Promise<void> {
    while (!this.consume()) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.refillRatePerSec;
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

// Pre-built limiters for common APIs
/** Google Maps: 10 QPS default */
export const mapsRateLimiter = new TokenBucket(10, 10);

/** Gemini: 60 RPM = 1 RPS */
export const geminiRateLimiter = new TokenBucket(5, 1);

/** Socialflaut: 30 RPM = 0.5 RPS */
export const socialflautRateLimiter = new TokenBucket(5, 0.5);
