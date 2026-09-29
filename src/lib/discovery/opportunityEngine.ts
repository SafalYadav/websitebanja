// src/lib/discovery/opportunityEngine.ts
/**
 * Opportunity Scoring Engine
 * Phase: Phase 8 (Business Discovery + Lead Qualification)
 *
 * Calculates a dedicated Opportunity Score (0-100) reflecting the potential
 * commercial upside and website upgrade value for WebsiteBanja services.
 *
 * Distinct from the Qualification Score:
 *   - Qualification: "Is this lead valid, active, commercial, and safe to engage?"
 *   - Opportunity: "How high is the potential value, website deficiency, and preview impact?"
 */

import type { BusinessLead } from "./types";

export interface OpportunityResult {
  score: number;
  reasons: string[];
}

export function calculateOpportunityScore(
  lead: Partial<BusinessLead> & { isPermanentlyClosed?: boolean }
): OpportunityResult {
  // If permanently closed or duplicate, opportunity is 0
  if (lead.isPermanentlyClosed || lead.leadStatus === "DUPLICATE") {
    return {
      score: 0,
      reasons: ["UNVIABLE_LEAD"],
    };
  }

  let score = 0;
  const reasons: string[] = [];

  // 1. Website Deficiency / Absence (Up to +40)
  if (!lead.website || lead.websiteStatus === "missing") {
    score += 40;
    reasons.push("OPPORTUNITY_NO_EXISTING_WEBSITE");
  } else if (lead.websiteStatus === "unreachable" || lead.websiteStatus === "invalid_url") {
    score += 30;
    reasons.push("OPPORTUNITY_UNREACHABLE_OR_BROKEN_WEBSITE");
  } else if (lead.websiteStatus === "present") {
    // Existing live website -> still has redesign opportunity if older HTTP or lower rating
    score += 10;
    reasons.push("OPPORTUNITY_MODERNIZATION_CANDIDATE");
  }

  // 2. High-Value Industry Vertical (Up to +20)
  const premiumIndustries = new Set([
    "restaurant",
    "luxury_hotel",
    "wellness_spa",
    "dental",
    "healthcare",
    "law_firm",
    "finance",
    "real_estate",
  ]);

  const normCat = (lead.category || "").toLowerCase();
  const normInd = (lead.industry || "").toLowerCase();

  if (premiumIndustries.has(normCat) || premiumIndustries.has(normInd)) {
    score += 20;
    reasons.push("OPPORTUNITY_HIGH_VALUE_VERTICAL");
  } else {
    score += 10;
    reasons.push("OPPORTUNITY_STANDARD_VERTICAL");
  }

  // 3. Established Social Proof / Reputation (Up to +20)
  if (lead.rating && lead.rating >= 4.5 && lead.reviewCount && lead.reviewCount >= 50) {
    score += 20;
    reasons.push("OPPORTUNITY_PREMIUM_REPUTATION");
  } else if (lead.rating && lead.rating >= 4.0 && lead.reviewCount && lead.reviewCount >= 10) {
    score += 12;
    reasons.push("OPPORTUNITY_ESTABLISHED_LOCAL_PRESENCE");
  } else if (lead.reviewCount && lead.reviewCount > 0) {
    score += 5;
    reasons.push("OPPORTUNITY_EMERGING_BUSINESS");
  }

  // 4. Reachability & Direct Contact Channels (Up to +15)
  const hasPhone = Boolean(lead.phone || lead.normalizedPhone);
  const hasEmail = Boolean(lead.email);

  if (hasPhone && hasEmail) {
    score += 15;
    reasons.push("OPPORTUNITY_MULTI_CHANNEL_REACHABLE");
  } else if (hasPhone || hasEmail) {
    score += 10;
    reasons.push("OPPORTUNITY_DIRECT_CONTACT_AVAILABLE");
  }

  // 5. Rich Content for Instant AI Preview (Up to +10)
  if (lead.description && lead.description.length > 40) {
    score += 10;
    reasons.push("OPPORTUNITY_RICH_STORY_FOR_PREVIEW");
  } else if (lead.description) {
    score += 5;
    reasons.push("OPPORTUNITY_BASIC_DESCRIPTION_AVAILABLE");
  }

  const finalScore = Math.max(0, Math.min(100, score));

  return {
    score: finalScore,
    reasons,
  };
}
