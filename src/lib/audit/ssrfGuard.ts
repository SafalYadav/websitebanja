// src/lib/audit/ssrfGuard.ts
/**
 * Server-Side Request Forgery (SSRF) Guard & URL Sanitizer
 * Phase: Phase 9 (Business Research + Website Audit Agent)
 *
 * Enforces strict security boundaries on external website URLs:
 *   - Restricts protocols strictly to HTTP and HTTPS
 *   - Blocks loopback, private IPv4/IPv6, link-local, and cloud metadata targets
 *   - Blocks internal/private TLDs (.local, .internal, .localhost, .corp)
 *   - Supports safe URL canonicalization
 */

export interface SsrfCheckResult {
  isSafe: boolean;
  reason?: string;
  url?: URL;
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "metadata.google.internal",
  "instance-data",
  "169.254.169.254",
]);

const BLOCKED_TLDS = [
  ".local",
  ".internal",
  ".localhost",
  ".test",
  ".corp",
  ".home",
  ".lan",
];

function isPrivateIpV4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;

  // 10.0.0.0/8 (Private)
  if (parts[0] === 10) return true;

  // 172.16.0.0/12 (Private)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Metadata 169.254.169.254)
  if (parts[0] === 169 && parts[1] === 254) return true;

  // 0.0.0.0/8
  if (parts[0] === 0) return true;

  return false;
}

function isPrivateIpV6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  // fc00::/7 (Unique Local Address)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  // fe80::/10 (Link-local)
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  return false;
}

/**
 * Validates a target URL against SSRF protection policies.
 */
export function validateUrlForSsrf(rawUrl: string): SsrfCheckResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isSafe: false, reason: "Empty or invalid URL input" };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { isSafe: false, reason: "URL string is blank" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isSafe: false, reason: "Malformed URL syntax" };
  }

  // 1. Protocol check: strictly http: or https:
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      isSafe: false,
      reason: `Unsupported protocol: '${parsed.protocol}'. Only http: and https: are allowed.`,
    };
  }

  // 2. Reject credentials embedded in URL
  if (parsed.username || parsed.password) {
    return {
      isSafe: false,
      reason: "URL contains userinfo authentication credentials",
    };
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // 3. Exact blocked hostnames check
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return {
      isSafe: false,
      reason: `Access to blocked host '${hostname}' is prohibited (SSRF protection).`,
    };
  }

  // 4. Blocked internal TLDs
  if (BLOCKED_TLDS.some((tld) => hostname.endsWith(tld))) {
    return {
      isSafe: false,
      reason: `Access to internal domain '${hostname}' is prohibited (SSRF protection).`,
    };
  }

  // 5. IPv4 check
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    if (isPrivateIpV4(hostname)) {
      return {
        isSafe: false,
        reason: `Target IPv4 '${hostname}' is private or reserved (SSRF protection).`,
      };
    }
  }

  // 6. IPv6 check
  if (hostname.includes(":")) {
    const cleanIpv6 = hostname.replace(/^\[|\]$/g, "");
    if (isPrivateIpV6(cleanIpv6)) {
      return {
        isSafe: false,
        reason: `Target IPv6 '${hostname}' is private or reserved (SSRF protection).`,
      };
    }
  }

  return { isSafe: true, url: parsed };
}

/**
 * Convenient boolean check for public web URL safety.
 */
export function isSafePublicUrl(rawUrl: string): boolean {
  return validateUrlForSsrf(rawUrl).isSafe;
}

/**
 * Validates and normalizes target URL for audit scanning.
 */
export function validateAuditTargetUrl(rawUrl: string): {
  safe: boolean;
  reason?: string;
  normalizedUrl?: string;
} {
  const result = validateUrlForSsrf(rawUrl);
  if (!result.isSafe || !result.url) {
    return { safe: false, reason: result.reason || "Invalid URL" };
  }
  return {
    safe: true,
    normalizedUrl: result.url.toString(),
  };
}
