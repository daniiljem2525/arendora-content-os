// In-memory sliding-window rate limiter. Suitable for a single-process
// deployment; swap the store for Redis when scaling horizontally.

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

let windowMs = 60_000;

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMsMs?: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit({ key, limit, windowMsMs }: RateLimitOptions): RateLimitResult {
  const window = windowMsMs ?? windowMs;
  windowMs = windowMs;
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < window);
  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((oldest + window - now) / 1000),
    };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.hits.length, retryAfterSec: 0 };
}

export function resetRateLimits() {
  buckets.clear();
}
