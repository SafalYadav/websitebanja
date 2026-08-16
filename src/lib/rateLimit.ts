/**
 * Server-side rate limiting helper functions with in-memory fallback.
 */

// In-memory sliding window fallback store (active if Upstash is not configured)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

/**
 * Checks in-memory rate limiting when Upstash Redis is not available.
 * Default: 3 requests per 7 days rolling window.
 */
export function checkMemoryRateLimit(
  key: string,
  limit: number = 3,
  windowMs: number = 7 * 24 * 60 * 60 * 1000
): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count };
}

/**
 * Checks if the request should bypass rate limiting.
 * Strictly active ONLY during local development (NODE_ENV === 'development').
 * In production, this function ALWAYS returns false regardless of environment variables.
 */
export function shouldBypassRateLimit(ip: string): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  if (process.env.RATE_LIMIT_DEV_BYPASS === "true" || process.env.RATE_LIMIT_DEV_BYPASS === "1") {
    return true;
  }

  const rawBypassIps = process.env.RATE_LIMIT_BYPASS_IPS;
  if (!rawBypassIps) {
    return false;
  }

  const allowedIps = rawBypassIps
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const cleanIp = ip.trim().toLowerCase();

  return allowedIps.some((allowed) => {
    if (allowed === cleanIp) return true;
    if (allowed === "localhost" && (cleanIp === "127.0.0.1" || cleanIp === "::1")) return true;
    return false;
  });
}
