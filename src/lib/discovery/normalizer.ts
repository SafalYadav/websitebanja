// src/lib/discovery/normalizer.ts
/**
 * Data Normalization Engine
 * Phase: Phase 8 (Business Discovery + Lead Qualification)
 *
 * Normalizes raw business attributes (name, phone, domain, category, address)
 * to enable deterministic deduplication, accurate qualification, and clean downstream processing.
 */

import { normalizeIndustry } from "@/lib/ai/design/designRules";
import type { WebsiteRequirement } from "@/lib/ai/requirementModel";

/**
 * Normalizes business name by removing punctuation, legal entities, and branch suffixes.
 * Example:
 *   "Astra Specialty Coffee - Vadodara Branch" -> "astra specialty coffee"
 *   "Grand Heritage Dining Pvt. Ltd." -> "grand heritage dining"
 */
export function normalizeBusinessName(name: string): string {
  if (!name) return "";

  let cleaned = name.toLowerCase().trim();

  // Strip common branch / location suffixes separated by hyphen, comma, or parentheses
  cleaned = cleaned.replace(/[-–—]\s*(branch|outpost|vadodara|ahmedabad|mumbai|delhi|gujarat|india).*$/i, "");
  cleaned = cleaned.replace(/,\s*(branch|outpost|vadodara|ahmedabad|mumbai|delhi|gujarat|india).*$/i, "");
  cleaned = cleaned.replace(/\((branch|outpost|vadodara|ahmedabad|mumbai|delhi|gujarat|india)[^)]*\)/i, "");

  // Strip corporate / legal entity suffixes
  cleaned = cleaned.replace(/\b(pvt\.?\s*ltd\.?|private\s*limited|ltd\.?|limited|llp|inc\.?|corp\.?|co\.?|llc)\b/gi, "");

  // Strip non-alphanumeric characters (keep single spaces)
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, " ");

  // Collapse multiple whitespaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Normalizes telephone numbers to canonical digits for exact matching.
 * Example:
 *   "+91 (98765) 43210" -> "+919876543210"
 *   "098765-43210" -> "+919876543210" (when 10-digit Indian mobile)
 */
export function normalizePhoneNumber(phone?: string): string | undefined {
  if (!phone) return undefined;

  const raw = phone.trim();
  if (!raw) return undefined;

  // Extract all digits and check for leading +
  const hasPlus = raw.startsWith("+");
  const digitsOnly = raw.replace(/\D/g, "");

  if (!digitsOnly || digitsOnly.length < 7) {
    return undefined; // Incomplete or invalid phone
  }

  // Handle standard 10-digit Indian numbers
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  // Handle 11-digit numbers with leading 0 (e.g. 09876543210)
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    return `+91${digitsOnly.slice(1)}`;
  }

  // Handle 12-digit numbers starting with 91 (e.g. 919876543210)
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `+${digitsOnly}`;
  }

  // Fallback: Return with + if original had +, otherwise return digits
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Normalizes website URLs to a bare, canonical root domain for matching.
 * Example:
 *   "https://www.GrandHeritageDining.com/menu?ref=1" -> "grandheritagedining.com"
 *   "http://smilecarevadodara.in/" -> "smilecarevadodara.in"
 */
export function normalizeWebsiteDomain(url?: string): string | undefined {
  if (!url) return undefined;

  let cleaned = url.trim().toLowerCase();
  if (!cleaned) return undefined;

  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//i, "");

  // Strip www
  cleaned = cleaned.replace(/^www\./i, "");

  // Strip port, path, query, hash
  cleaned = cleaned.split("/")[0].split("?")[0].split("#")[0].split(":")[0];

  cleaned = cleaned.trim();

  // Basic domain sanity check
  if (!cleaned || !cleaned.includes(".") || cleaned.endsWith(".")) {
    return undefined;
  }

  return cleaned;
}

/**
 * Normalizes category and maps it into Phase 6 supported industry and category title.
 */
export function normalizeCategory(categoryStr?: string, description?: string): { category: string; industry: string } {
  const raw = (categoryStr || "").trim();
  const rawDesc = (description || "").trim();

  const req: any = {
    business: {
      name: "Business",
      industry: raw || "General",
      type: raw || "General",
      description: rawDesc,
    },
    businessName: "Business",
    category: raw || "General",
    description: rawDesc,
    intent: `${raw} ${rawDesc}`,
    targetAudience: "Customers",
    style: "modern",
  };

  const industry = normalizeIndustry(req);

  return {
    category: raw || industry,
    industry,
  };
}
