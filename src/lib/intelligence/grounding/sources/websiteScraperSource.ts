// src/lib/intelligence/grounding/sources/websiteScraperSource.ts
// Grounded Business Intelligence — Authoritative Website Research Adapter
// Safely retrieves, parses, and extracts verifiable factual signals from the business website.
// Reuses existing SSRF protection, bounded crawling, and HTML extraction from Phase 9.

import { fetchPageSafe } from "@/lib/audit/crawler";
import { parseHtml, type ParsedHtmlDocument } from "@/lib/audit/htmlParser";
import { createEvidenceItem } from "../evidenceEngine";
import type { EvidenceItem } from "../types";

export interface WebsiteGroundedData {
  isAvailable: boolean;
  normalizedUrl?: string;
  title?: string;
  metaDescription?: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  observedCtas: Array<{ text: string; channel?: string; evidenceId: string }>;
  contact: {
    phone?: string;
    email?: string;
    hasWhatsApp: boolean;
  };
  sampleText: string;
  evidence: EvidenceItem[];
  error?: string;
}

export class WebsiteScraperSource {
  private static instance: WebsiteScraperSource;

  private constructor() {}

  public static getInstance(): WebsiteScraperSource {
    if (!WebsiteScraperSource.instance) {
      WebsiteScraperSource.instance = new WebsiteScraperSource();
    }
    return WebsiteScraperSource.instance;
  }

  public isConfigured(): boolean {
    return true; // Scraper is built-in with native SSRF and HTML parser
  }

  /**
   * Scrapes and analyzes an authoritative business website safely.
   */
  public async scrapeWebsite(rawUrl?: string): Promise<WebsiteGroundedData> {
    if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
      return {
        isAvailable: false,
        headings: { h1: [], h2: [], h3: [] },
        observedCtas: [],
        contact: { hasWhatsApp: false },
        sampleText: "",
        evidence: [],
        error: "No website URL provided.",
      };
    }

    let urlToFetch = rawUrl.trim();
    if (!urlToFetch.startsWith("http://") && !urlToFetch.startsWith("https://")) {
      urlToFetch = `https://${urlToFetch}`;
    }

    try {
      const page = await fetchPageSafe(urlToFetch, 3500);
      if (!page || !page.html) {
        return {
          isAvailable: false,
          normalizedUrl: urlToFetch,
          headings: { h1: [], h2: [], h3: [] },
          observedCtas: [],
          contact: { hasWhatsApp: false },
          sampleText: "",
          evidence: [],
          error: "Website returned empty response or could not be loaded.",
        };
      }

      const doc: ParsedHtmlDocument = parseHtml(page.html);
      const evidence: EvidenceItem[] = [];

      // Title & Branding evidence
      if (doc.title) {
        evidence.push(
          createEvidenceItem({
            source: "business_website",
            reference: urlToFetch,
            observation: `Page <title> tag explicitly states: "${doc.title}"`,
            supports: "brandSignals.businessName",
            baseConfidence: 0.98,
          })
        );
      }

      if (doc.metaDescription) {
        evidence.push(
          createEvidenceItem({
            source: "business_website",
            reference: urlToFetch,
            observation: `Meta description observed: "${doc.metaDescription}"`,
            supports: "brandSignals.tagline",
            baseConfidence: 0.92,
          })
        );
      }

      // Headings (Services & Architecture)
      const allHeadings = [...doc.h1List, ...doc.h2List, ...doc.h3List];
      if (allHeadings.length > 0) {
        evidence.push(
          createEvidenceItem({
            source: "business_website",
            reference: urlToFetch,
            observation: `Content structure contains key headings: "${allHeadings.slice(0, 4).join(" | ")}"`,
            supports: "services",
            baseConfidence: 0.90,
          })
        );
      }

      // Contact indicators
      let phone: string | undefined;
      let email: string | undefined;
      let hasWhatsApp = false;

      for (const link of doc.links) {
        if (link.isPhone && !phone) {
          phone = link.href.replace(/^tel:/i, "").trim();
        }
        if (link.isEmail && !email) {
          email = link.href.replace(/^mailto:/i, "").trim();
        }
        if (link.isWhatsApp) {
          hasWhatsApp = true;
        }
      }

      if (phone) {
        evidence.push(
          createEvidenceItem({
            source: "business_website",
            reference: urlToFetch,
            observation: `Verified telephone link found in DOM: "${phone}"`,
            supports: "identity.phone",
            baseConfidence: 0.95,
          })
        );
      }

      if (email) {
        evidence.push(
          createEvidenceItem({
            source: "business_website",
            reference: urlToFetch,
            observation: `Direct email link found in DOM: "${email}"`,
            supports: "identity.email",
            baseConfidence: 0.95,
          })
        );
      }

      // CTA buttons observed
      const observedCtas: Array<{ text: string; channel?: string; evidenceId: string }> = [];
      const distinctButtonTexts = Array.from(
        new Set(
          doc.buttons
            .map((b) => b.text.trim())
            .filter((t) => t.length > 1 && t.length < 40)
        )
      );

      for (const btnText of distinctButtonTexts.slice(0, 6)) {
        const ev = createEvidenceItem({
          source: "business_website",
          reference: urlToFetch,
          observation: `Call-to-Action button observed: "${btnText}"`,
          supports: "ctaStrategy.observedCtas",
          baseConfidence: 0.95,
        });
        evidence.push(ev);
        observedCtas.push({
          text: btnText,
          channel: "web_button",
          evidenceId: ev.id,
        });
      }

      return {
        isAvailable: true,
        normalizedUrl: urlToFetch,
        title: doc.title,
        metaDescription: doc.metaDescription,
        headings: {
          h1: doc.h1List,
          h2: doc.h2List,
          h3: doc.h3List,
        },
        observedCtas,
        contact: {
          phone,
          email,
          hasWhatsApp,
        },
        sampleText: doc.rawText ? doc.rawText.slice(0, 1500) : "",
        evidence,
      };
    } catch (err) {
      return {
        isAvailable: false,
        normalizedUrl: urlToFetch,
        headings: { h1: [], h2: [], h3: [] },
        observedCtas: [],
        contact: { hasWhatsApp: false },
        sampleText: "",
        evidence: [],
        error: err instanceof Error ? err.message : "Error scraping business website",
      };
    }
  }
}

export const websiteScraperSource = WebsiteScraperSource.getInstance();
