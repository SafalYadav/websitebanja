// src/lib/discovery/qualificationEngine.ts
/**
 * Deterministic First-Pass Qualification Engine
 * Phase: Phase 8 (Business Discovery + Lead Qualification)
 *
 * Evaluates business viability for WebsiteBanja generation and preview outreach.
 * Uses transparent, deterministic rule-based evaluation with explicit reason codes.
 */

import type { BusinessLead, QualificationStatus } from "./types";

export interface QualificationResult {
  score: number;
  status: QualificationStatus;
  reasonCodes: string[];
}

// Commercial categories well-suited for WebsiteBanja AI generation
const HIGH_VALUE_COMMERCIAL_CATEGORIES = new Set([
  "restaurant",
  "cafe",
  "bakery",
  "luxury_hotel",
  "hotel",
  "dental",
  "healthcare",
  "wellness_spa",
  "spa",
  "creative_agency",
  "law_firm",
  "finance",
  "real_estate",
  "car_rental",
  "gym",
  "automotive",
  "retail",
  "ecommerce",
]);

// Non-commercial or prohibited entity keywords
const NON_COMMERCIAL_PATTERNS = [
  /\b(government|municipal|municipality|police|court|parliament|panchayat)\b/i,
  /\b(embassy|consulate|passport\s*office|post\s*office)\b/i,
  /\b(public\s*park|public\s*garden|bus\s*stand|railway\s*station)\b/i,
  /\b(cemetery|graveyard|crematorium)\b/i,
];

export function qualifyBusinessLead(
  lead: Partial<BusinessLead> & { isPermanentlyClosed?: boolean }
): QualificationResult {
  let score = 0;
  const reasonCodes: string[] = [];

  // --- HARD NEGATIVES (Immediate Disqualification) ---

  // 1. Permanently closed
  if (lead.isPermanentlyClosed) {
    reasonCodes.push("PERMANENTLY_CLOSED");
    return {
      score: 0,
      status: "DISQUALIFIED",
      reasonCodes,
    };
  }

  // 2. Duplicate lead
  if (lead.leadStatus === "DUPLICATE") {
    reasonCodes.push("DUPLICATE_LEAD");
    return {
      score: 0,
      status: "DISQUALIFIED",
      reasonCodes,
    };
  }

  // 3. Non-commercial / government / public service entity
  const fullText = `${lead.businessName || ""} ${lead.category || ""} ${lead.description || ""}`.toLowerCase();
  const isNonCommercial =
    lead.category === "government_service" ||
    NON_COMMERCIAL_PATTERNS.some((pattern) => pattern.test(fullText));

  if (isNonCommercial) {
    reasonCodes.push("IRRELEVANT_NON_COMMERCIAL_ENTITY");
    return {
      score: 10,
      status: "DISQUALIFIED",
      reasonCodes,
    };
  }

  // --- POSITIVE SIGNALS ---

  // A. Active business presence (+20)
  if (lead.businessName && !lead.isPermanentlyClosed) {
    score += 20;
    reasonCodes.push("ACTIVE_BUSINESS");
  }

  // B. Commercial category suitability (+15)
  const normCat = (lead.category || "").toLowerCase();
  const normInd = (lead.industry || "").toLowerCase();
  const isCommercial =
    HIGH_VALUE_COMMERCIAL_CATEGORIES.has(normCat) ||
    HIGH_VALUE_COMMERCIAL_CATEGORIES.has(normInd);

  if (isCommercial) {
    score += 15;
    reasonCodes.push("COMMERCIAL_CATEGORY");
  } else {
    // Unlisted or general category gets neutral/small score
    score += 5;
    reasonCodes.push("GENERAL_CATEGORY");
  }

  // C. Website Presence Analysis (+25 for No Website / +15 for Defective/Unreachable)
  if (!lead.website || lead.websiteStatus === "missing") {
    score += 25;
    reasonCodes.push("NO_WEBSITE");
  } else if (lead.websiteStatus === "unreachable" || lead.websiteStatus === "invalid_url") {
    score += 15;
    reasonCodes.push("WEBSITE_DEFECTIVE_OR_UNREACHABLE");
  } else if (lead.websiteStatus === "present") {
    // Has a live website -> Lower initial need for pure generation, but still viable
    score += 5;
    reasonCodes.push("EXISTING_WEBSITE_PRESENT");
  }

  // D. Contact channels (+10 for Phone, +10 for Email, +10 for Address)
  if (lead.phone || lead.normalizedPhone) {
    score += 10;
    reasonCodes.push("HAS_PHONE");
  }

  if (lead.email) {
    score += 10;
    reasonCodes.push("HAS_EMAIL");
  }

  if (lead.address && lead.city) {
    score += 10;
    reasonCodes.push("HAS_PHYSICAL_LOCATION");
  }

  // E. Information density sufficient for high-quality preview generation (+10)
  const hasMinDataForPreview =
    Boolean(lead.businessName) &&
    Boolean(lead.category || lead.industry) &&
    Boolean(lead.city || lead.address) &&
    Boolean(lead.description || (lead.phone && lead.category));

  if (hasMinDataForPreview) {
    score += 10;
    reasonCodes.push("SUFFICIENT_BUSINESS_DATA");
  } else {
    // Deduct if data is severely deficient
    score -= 20;
    reasonCodes.push("INSUFFICIENT_DATA_FOR_PREVIEW");
  }

  // F. Reputation bonus
  if (lead.rating && lead.rating >= 4.0 && lead.reviewCount && lead.reviewCount >= 10) {
    score += 5;
    reasonCodes.push("ESTABLISHED_REPUTATION");
  }

  // Clamp score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, score));

  // Determine status based on explicit thresholds
  let status: QualificationStatus;
  if (finalScore >= 60) {
    status = "QUALIFIED";
  } else if (finalScore >= 40) {
    status = "NEEDS_REVIEW";
  } else {
    status = "DISQUALIFIED";
  }

  return {
    score: finalScore,
    status,
    reasonCodes,
  };
}
