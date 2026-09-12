import { prisma } from "@/lib/db";

/**
 * Database-backed sliding-window rate limiter.
 *
 * How it works:
 * - Each request is tracked by (identifier, route, windowStart)
 * - windowStart is rounded down to the nearest window boundary
 * - Within a window, requests increment a counter via upsert
 * - If the counter exceeds maxRequests, the request is denied with 429
 *
 * Why DB-backed instead of in-memory:
 * - Survives server restarts (important for dev, critical for production)
 * - Works across multiple server instances if horizontally scaled
 * - For production, this should move to Redis for better performance
 *
 * Note: In production, this should be replaced with a Redis-based solution
 * (e.g. upstash/ratelimit) for lower latency and better scalability.
 * The DB approach is acceptable for this assessment scope.
 */

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // Seconds until the window resets
  remaining: number;
}

/**
 * Check and enforce rate limiting for a given identifier + route.
 *
 * @param identifier - IP address, or IP+email composite key
 * @param route - The API route being rate-limited (e.g. "/api/auth/signin")
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Window duration in milliseconds
 */
export async function checkRateLimit(
  identifier: string,
  route: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(now - (now % windowMs));

  try {
    // Upsert: create or increment the counter for this window
    const entry = await prisma.rateLimitEntry.upsert({
      where: {
        identifier_route_windowStart: {
          identifier,
          route,
          windowStart,
        },
      },
      create: {
        identifier,
        route,
        windowStart,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });

    if (entry.count > maxRequests) {
      const windowEndMs = windowStart.getTime() + windowMs;
      const retryAfter = Math.ceil((windowEndMs - now) / 1000);

      return {
        allowed: false,
        retryAfter,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
    };
  } catch {
    // If rate limiting fails (e.g. DB error), allow the request
    // to avoid blocking legitimate users. Log the error in production.
    console.error("Rate limit check failed, allowing request");
    return { allowed: true, remaining: maxRequests };
  }
}

/**
 * Clean up expired rate limit entries.
 * Call this periodically or via a cron job.
 */
export async function cleanupRateLimitEntries(
  maxAgeMs: number = 60 * 60 * 1000 // 1 hour default
): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeMs);
  await prisma.rateLimitEntry.deleteMany({
    where: {
      windowStart: { lt: cutoff },
    },
  });
}
