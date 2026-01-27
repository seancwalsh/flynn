/**
 * Simple in-memory rate limiter middleware
 * 
 * For production, use Redis-based rate limiting.
 */

import type { Context, Next, MiddlewareHandler } from "hono";
import { AppError } from "./error-handler";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (per-process, will reset on restart)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60_000); // Every minute

interface RateLimitOptions {
  windowMs?: number;   // Time window in milliseconds
  maxRequests?: number; // Max requests per window
  keyGenerator?: (c: Context) => string; // Custom key generator
}

/**
 * Create a rate limiter middleware
 */
export function rateLimiter(options: RateLimitOptions = {}): MiddlewareHandler {
  const {
    windowMs = 60_000, // 1 minute default
    maxRequests = 10,   // 10 requests per minute default
    keyGenerator = (c: Context) => {
      // Use IP address as key (X-Forwarded-For for proxied requests)
      const forwarded = c.req.header("x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
      return `${ip}:${c.req.path}`;
    },
  } = options;

  return async (c: Context, next: Next) => {
    const key = keyGenerator(c);
    const now = Date.now();
    
    let entry = store.get(key);
    
    if (!entry || entry.resetAt < now) {
      // Start new window
      entry = {
        count: 1,
        resetAt: now + windowMs,
      };
      store.set(key, entry);
    } else {
      entry.count++;
    }
    
    // Set rate limit headers
    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header("X-RateLimit-Remaining", String(Math.max(0, maxRequests - entry.count)));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    
    if (entry.count > maxRequests) {
      throw new AppError(
        "Too many requests, please try again later",
        429,
        "RATE_LIMIT_EXCEEDED"
      );
    }
    
    await next();
  };
}

/**
 * Auth-specific rate limiter (stricter limits)
 */
export const authRateLimiter = rateLimiter({
  windowMs: 60_000,     // 1 minute window
  maxRequests: 5,       // 5 attempts per minute
  keyGenerator: (c: Context) => {
    // Rate limit by IP + endpoint
    const forwarded = c.req.header("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    // Include method to distinguish login vs register
    return `auth:${ip}:${c.req.method}:${c.req.path}`;
  },
});

/**
 * Get the rate limit store (for testing)
 */
export function getRateLimitStore(): Map<string, RateLimitEntry> {
  return store;
}

/**
 * Clear the rate limit store (for testing)
 */
export function clearRateLimitStore(): void {
  store.clear();
}
