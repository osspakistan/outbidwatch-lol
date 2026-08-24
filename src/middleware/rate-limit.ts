import type { MiddlewareHandler } from 'hono';
import type { Env, AppVariables } from '../types/env';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window IP rate limiter on Cloudflare Worker instance
const ipStore = new Map<string, RateLimitRecord>();

function cleanupStaleRecords(now: number) {
  if (ipStore.size > 200) {
    for (const [ip, rec] of ipStore.entries()) {
      if (rec.resetAt < now) {
        ipStore.delete(ip);
      }
    }
  }
}

/**
 * IP Rate Limiting Middleware for Public Write Endpoints
 * Limits requests per client IP within a rolling time window.
 */
export function rateLimiter(options: { maxRequests: number; windowSeconds: number }): MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> {
  return async (c, next) => {
    // Only apply rate limiting to mutating methods (POST, PUT, DELETE, PATCH)
    if (c.req.method === 'GET' || c.req.method === 'HEAD' || c.req.method === 'OPTIONS') {
      await next();
      return;
    }

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || '127.0.0.1';
    const now = Date.now();
    const windowMs = options.windowSeconds * 1000;

    cleanupStaleRecords(now);

    let record = ipStore.get(ip);
    if (!record || record.resetAt < now) {
      record = { count: 1, resetAt: now + windowMs };
      ipStore.set(ip, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, options.maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

    c.header('X-RateLimit-Limit', String(options.maxRequests));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(resetSeconds));

    if (record.count > options.maxRequests) {
      c.header('Retry-After', String(resetSeconds));
      return c.json({
        success: false,
        error: 'Too Many Requests: Rate limit exceeded. Please try again later.',
        retry_after_seconds: resetSeconds,
      }, 429);
    }

    await next();
  };
}
