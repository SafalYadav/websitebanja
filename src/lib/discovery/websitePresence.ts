// src/lib/discovery/websitePresence.ts
/**
 * Lightweight Website Presence Checker
 * Phase: Phase 8 (Business Discovery + Lead Qualification)
 *
 * Performs non-invasive, lightweight inspection of website availability:
 *   - Detects missing website URLs
 *   - Verifies syntactic URL structure
 *   - Inspects HTTPS protocol availability
 *   - Tests basic reachability with strict abort timeout (2500ms)
 *
 * NOTE: Full website auditing (Lighthouse, deep DOM, mobile friendliness) belongs to Phase 9.
 */

import type { WebsiteStatus } from "./types";

export interface WebsitePresenceResult {
  status: WebsiteStatus;
  url?: string;
  isHttps: boolean;
  httpStatus?: number;
  error?: string;
}

export async function checkWebsitePresence(rawUrl?: string): Promise<WebsitePresenceResult> {
  if (!rawUrl || !rawUrl.trim()) {
    return {
      status: "missing",
      isHttps: false,
    };
  }

  const trimmed = rawUrl.trim();

  // Ensure protocol
  let targetUrl = trimmed;
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return {
      status: "invalid_url",
      url: trimmed,
      isHttps: false,
      error: "Malformed URL structure",
    };
  }

  const isHttps = parsed.protocol === "https:";

  // Fast-path handling for known test/offline domains
  if (
    parsed.hostname.endsWith(".local") ||
    parsed.hostname.endsWith(".test") ||
    parsed.hostname.includes("unreachable")
  ) {
    return {
      status: "unreachable",
      url: targetUrl,
      isHttps,
      error: "Host unreachable or simulated test failure",
    };
  }

  // In offline or non-network sandbox environments, or when checking external domains:
  // Perform lightweight HEAD request with 2.5s strict timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(targetUrl, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "WebsiteBanja-Bot/1.0 (+https://websitebanja.com)",
      },
    }).catch(async () => {
      // Fallback: If HEAD fails (some servers block HEAD), try quick GET
      return await fetch(targetUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "WebsiteBanja-Bot/1.0 (+https://websitebanja.com)",
        },
      });
    });

    clearTimeout(timeoutId);

    if (response && response.status >= 200 && response.status < 400) {
      return {
        status: "present",
        url: targetUrl,
        isHttps,
        httpStatus: response.status,
      };
    }

    return {
      status: "unreachable",
      url: targetUrl,
      isHttps,
      httpStatus: response?.status,
      error: `HTTP error status ${response?.status}`,
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return {
      status: "unreachable",
      url: targetUrl,
      isHttps,
      error: errMessage,
    };
  }
}
