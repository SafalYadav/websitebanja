// src/lib/audit/crawler.ts
/**
 * Safe Fetcher & Bounded Website Crawler
 * Phase: Phase 9 (Business Research + Website Audit Agent)
 *
 * Provides controlled, rate-limited, and SSRF-protected website retrieval:
 *   - Follows strictly same-origin links
 *   - Limits maximum pages (default: 8) and depth (default: 2)
 *   - Enforces 2500ms per-page timeout and 2MB response size limit
 *   - Re-checks every redirect against SSRF rules
 */

import { validateUrlForSsrf } from "./ssrfGuard";

export interface CrawledPage {
  url: string;
  html: string;
  httpStatus: number;
  sizeBytes: number;
  isHttps: boolean;
  contentType: string;
}

export interface CrawlResult {
  rootUrl: string;
  pages: CrawledPage[];
  totalVisited: number;
  isTruncated: boolean;
  error?: string;
}

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 2500;

/**
 * Safely fetches a single HTML page with SSRF and redirect validation
 */
export async function fetchPageSafe(
  rawUrl: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  redirectCount: number = 0
): Promise<CrawledPage | null> {
  const ssrfCheck = validateUrlForSsrf(rawUrl);
  if (!ssrfCheck.isSafe || !ssrfCheck.url) {
    throw new Error(`SSRF validation failed: ${ssrfCheck.reason}`);
  }

  if (redirectCount > MAX_REDIRECTS) {
    throw new Error(`Exceeded maximum redirect limit of ${MAX_REDIRECTS}`);
  }

  const targetUrl = ssrfCheck.url.toString();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "WebsiteBanja-AuditBot/1.0 (+https://websitebanja.com)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      redirect: "manual", // Handle redirects manually to inspect target URL against SSRF
    });

    clearTimeout(timeoutId);

    // Handle manual redirects
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        throw new Error(`Redirect status ${res.status} missing Location header`);
      }
      const resolvedRedirect = new URL(location, targetUrl).toString();
      return await fetchPageSafe(resolvedRedirect, timeoutMs, redirectCount + 1);
    }

    const contentType = res.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      // Not an HTML document (e.g. image, pdf, binary)
      return null;
    }

    const text = await res.text();
    const sizeBytes = Buffer.byteLength(text, "utf-8");

    if (sizeBytes > MAX_RESPONSE_BYTES) {
      throw new Error(`Page size (${sizeBytes} bytes) exceeds limit of ${MAX_RESPONSE_BYTES} bytes`);
    }

    return {
      url: targetUrl,
      html: text,
      httpStatus: res.status,
      sizeBytes,
      isHttps: ssrfCheck.url.protocol === "https:",
      contentType,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

/**
 * Extracts candidate internal navigation links from HTML text
 */
export function extractInternalLinks(html: string, baseUrl: string): string[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }

  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>/gi;
  const links = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    if (
      !rawHref ||
      rawHref.startsWith("#") ||
      rawHref.startsWith("javascript:") ||
      rawHref.startsWith("mailto:") ||
      rawHref.startsWith("tel:")
    ) {
      continue;
    }

    try {
      const resolved = new URL(rawHref, base);
      // Enforce strictly same-origin links
      if (resolved.origin === base.origin) {
        // Strip hash and common tracking queries
        resolved.hash = "";
        resolved.search = "";
        const clean = resolved.toString();
        // Skip common asset extensions
        if (!/\.(pdf|zip|png|jpe?g|gif|webp|svg|css|js|woff2?)$/i.test(clean)) {
          links.add(clean);
        }
      }
    } catch {
      // Ignore invalid URLs
    }
  }

  return Array.from(links);
}

/**
 * Executes a bounded crawl of a website starting from rootUrl
 */
export async function crawlWebsiteBounded(
  rootUrl: string,
  maxPages = 8,
  maxDepth = 2
): Promise<CrawlResult> {
  const pages: CrawledPage[] = [];
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: rootUrl, depth: 0 }];

  while (queue.length > 0 && pages.length < maxPages) {
    const current = queue.shift()!;
    if (visited.has(current.url) || current.depth > maxDepth) {
      continue;
    }

    visited.add(current.url);

    try {
      const fetched = await fetchPageSafe(current.url);
      if (fetched) {
        pages.push(fetched);

        // Discover more links if we have depth left
        if (current.depth < maxDepth && pages.length < maxPages) {
          const discoveredLinks = extractInternalLinks(fetched.html, current.url);
          for (const link of discoveredLinks) {
            if (!visited.has(link) && !queue.some((q) => q.url === link)) {
              queue.push({ url: link, depth: current.depth + 1 });
            }
          }
        }
      }
    } catch (err: unknown) {
      // For secondary pages, log and continue bounded crawl
      if (pages.length === 0) {
        return {
          rootUrl,
          pages: [],
          totalVisited: visited.size,
          isTruncated: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }

  return {
    rootUrl,
    pages,
    totalVisited: visited.size,
    isTruncated: queue.length > 0,
  };
}
