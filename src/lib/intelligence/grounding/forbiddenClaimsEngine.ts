// src/lib/intelligence/grounding/forbiddenClaimsEngine.ts
// Grounded Business Intelligence — Forbidden Claims Safety Layer
// Produces the definitive list of claims that downstream generators (previews, copy, outreach)
// are strictly prohibited from generating unless verified by direct evidence.

import crypto from "crypto";
import type { ForbiddenClaimItem, GroundedServiceItem, EvidenceItem } from "./types";

export interface CompileForbiddenClaimsInput {
  businessName: string;
  verifiedServices: GroundedServiceItem[];
  evidenceList: EvidenceItem[];
  hasVerifiedYears?: boolean;
  hasVerifiedCertifications?: boolean;
  hasVerifiedAwards?: boolean;
  hasVerifiedPricing?: boolean;
  hasVerifiedGuarantees?: boolean;
  hasVerifiedTestimonials?: boolean;
}

export function compileForbiddenClaims(
  input: CompileForbiddenClaimsInput
): ForbiddenClaimItem[] {
  const claims: ForbiddenClaimItem[] = [];

  const addClaim = (
    type: ForbiddenClaimItem["claimType"],
    description: string,
    reason: string
  ) => {
    claims.push({
      id: `fc_${type.toLowerCase().slice(0, 10)}_${crypto.randomBytes(3).toString("hex")}`,
      claimType: type,
      claimDescription: description,
      forbiddenReason: reason,
      status: "FORBIDDEN",
    });
  };

  // 1. Rankings & Superlatives (#1, Best in City)
  addClaim(
    "UNSUPPORTED_RANKING",
    `Do not claim that ${input.businessName} is '#1', 'Top Rated', or 'Leading' unless corroborated by official ranking or rating authority.`,
    "Superlative rankings without authoritative third-party evidence constitute misleading marketing and hallucinated authority."
  );

  // 2. Fabricated Statistics & Customer Counts
  addClaim(
    "FABRICATED_STATISTIC",
    `Do not claim specific unverified numerical statistics (e.g., '10,000+ satisfied clients', '99% success rate', '500+ projects completed') for ${input.businessName}.`,
    "Fabricated customer numbers undermine credibility and fail consumer protection truthfulness standards."
  );

  // 3. Years of Experience (unless verified)
  if (!input.hasVerifiedYears) {
    addClaim(
      "UNSUPPORTED_EXPERIENCE_YEARS",
      `Do not claim specific years of operation or longevity (e.g., 'Over 15 years in business', 'Serving the community since 2005') for ${input.businessName}.`,
      "No verifiable date of founding or registration was observed across verified sources."
    );
  }

  // 4. Awards & Accreditations (unless verified)
  if (!input.hasVerifiedAwards) {
    addClaim(
      "UNSUPPORTED_AWARD",
      `Do not invent industry awards, trophies, or badges (e.g., 'Best Boutique Hotel 2024') for ${input.businessName}.`,
      "No official award citations or certificates were found in ground truth evidence."
    );
  }

  // 5. Certifications & Licensing (unless verified)
  if (!input.hasVerifiedCertifications) {
    addClaim(
      "UNSUPPORTED_CERTIFICATION",
      `Do not invent regulatory certifications, ISO standards, or medical board badges unless explicitly documented in evidence.`,
      "Regulatory and certification claims require explicit evidentiary proof to prevent legal liability."
    );
  }

  // 6. Guarantees & Warranties (unless verified)
  if (!input.hasVerifiedGuarantees) {
    addClaim(
      "UNSUPPORTED_GUARANTEE",
      `Do not claim '100% Money-Back Guarantee', 'Lifetime Warranty', or 'Risk-Free Trial' unless explicitly stated by the business.`,
      "Commercial guarantees imply contractual obligation and must originate directly from business terms."
    );
  }

  // 7. Pricing & Discounts (unless verified)
  if (!input.hasVerifiedPricing) {
    addClaim(
      "UNSUPPORTED_PRICING",
      `Do not invent exact prices, fee schedules, or promotional discounts (e.g., 'Starting at $49', '50% off this week') for ${input.businessName}.`,
      "Fabricated prices distort business offering and lead to customer dispute."
    );
  }

  // 8. Fabricated Testimonials (unless verified)
  if (!input.hasVerifiedTestimonials) {
    addClaim(
      "UNSUPPORTED_TESTIMONIAL",
      `Do not invent fictional customer reviews, client quotes, or named testimonials for ${input.businessName}.`,
      "Fictional testimonials are prohibited under consumer protection regulations."
    );
  }

  // 9. Fabricated Corporate Partnerships
  addClaim(
    "FABRICATED_PARTNERSHIP",
    `Do not display logos or claim official partnerships with Fortune 500 companies (e.g., Google, Microsoft, Apple) unless verified in evidence.`,
    "Partner logos without documented agreements violate trademark rights and truthful representation."
  );

  // 10. Unsupported Services
  const serviceNames = input.verifiedServices.map((s) => s.name.toLowerCase());
  addClaim(
    "UNSUPPORTED_SERVICE",
    `Do not add tangential or generic services outside the verified list (${serviceNames.slice(0, 5).join(", ") || "none verified"}) merely because they are common in the industry archetype.`,
    "Each service offered must be grounded in observed website content, business category, or official Places profile."
  );

  return claims;
}
