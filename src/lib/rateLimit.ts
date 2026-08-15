/**
 * Server-side rate limiting helper functions.
 */

/**
 * Checks if the request should bypass rate limiting.
 * Strictly active ONLY during local development (NODE_ENV === 'development').
 * In production, this function ALWAYS returns false regardless of environment variables.
 */
export function shouldBypassRateLimit(ip: string): boolean {
  // CRITICAL SECURITY ENFORCEMENT: Never bypass in production
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  // 1. Explicit development bypass flag
  if (process.env.RATE_LIMIT_DEV_BYPASS === "true" || process.env.RATE_LIMIT_DEV_BYPASS === "1") {
    console.info(`[RateLimit] Development bypass active via RATE_LIMIT_DEV_BYPASS=true (client IP: ${ip})`);
    return true;
  }

  // 2. IP-specific development bypass list
  const rawBypassIps = process.env.RATE_LIMIT_BYPASS_IPS;
  if (!rawBypassIps) {
    return false;
  }

  const allowedIps = rawBypassIps
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const cleanIp = ip.trim().toLowerCase();

  const isMatched = allowedIps.some((allowed) => {
    if (allowed === cleanIp) return true;
    if (allowed === "localhost" && (cleanIp === "127.0.0.1" || cleanIp === "::1")) return true;
    return false;
  });

  if (isMatched) {
    console.info(`[RateLimit] Development bypass active for matching IP: ${ip}`);
  }

  return isMatched;
}
