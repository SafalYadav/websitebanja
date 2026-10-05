// src/lib/intelligence/grounding/types.ts
// Grounded Business Intelligence — Data Models and Contracts
// Defines verifiable evidence models, business identity, fact vs inference separation,
// forbidden claims, confidence tiers, and source conflict representations.

import type { RawPlacesPhoto, RawPlacesReview } from "./assetTypes";

export type EvidenceSourceType =
  | "business_website"
  | "google_places"
  | "google_maps"
  | "google_search"
  | "website_audit"
  | "user_input";

export type VerificationStatus =
  | "verified"
  | "inferred"
  | "unverified"
  | "conflicting";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface EvidenceItem {
  id: string;
  source: EvidenceSourceType;
  reference: string; // URL, Place ID, Search Query, or Audit ID
  observation: string; // Verifiable observed fact
  supports: string; // Which attribute/conclusion this observation supports
  confidence: number; // 0.0 to 1.0
  confidenceLevel: ConfidenceLevel;
  verificationStatus: VerificationStatus;
  timestamp: string;
}

export type FactOrInferenceType = "OBSERVED_FACT" | "DERIVED_INFERENCE";

export interface FactVsInferenceItem {
  id: string;
  type: FactOrInferenceType;
  statement: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  evidenceIds: string[];
  rationale?: string;
}

export interface GroundedServiceItem {
  name: string;
  category?: string;
  description?: string;
  isObserved: boolean; // true if explicitly found on site / Places; false if inferred
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  evidenceIds: string[];
}

export interface GroundedAudience {
  segment: string;
  isObserved: boolean; // true if explicitly stated in text
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  evidenceIds: string[];
  rationale: string;
}

export interface GroundedLocation {
  formattedAddress?: string;
  city?: string;
  locality?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  serviceArea?: string[];
  isVerified: boolean;
  confidence: number;
  evidenceIds: string[];
}

export interface GroundedBrandSignals {
  businessName: string;
  tagline?: string;
  tone?: string;
  colors?: string[];
  typography?: string;
  imageryStyle?: string;
  positioning?: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  evidenceIds: string[];
}

export interface GroundedVisualStyle {
  status: "AVAILABLE" | "UNAVAILABLE";
  colorPalette?: string[];
  visualMood?: string;
  photographyStyle?: string;
  layoutStyle?: string;
  typographyStyle?: string;
  designDensity?: string;
  designClassification?: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  evidenceIds: string[];
  reason?: string;
}

export interface GroundedCtaStrategy {
  observedCtas: Array<{
    text: string;
    channel?: string;
    evidenceId: string;
  }>;
  primaryCtaStrategy: string;
  recommendedNextAction: string;
  rationale: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
}

export type ForbiddenClaimType =
  | "UNSUPPORTED_AWARD"
  | "UNSUPPORTED_CERTIFICATION"
  | "UNSUPPORTED_EXPERIENCE_YEARS"
  | "UNSUPPORTED_GUARANTEE"
  | "UNSUPPORTED_PRICING"
  | "UNSUPPORTED_LOCATION"
  | "UNSUPPORTED_SERVICE"
  | "UNSUPPORTED_CUSTOMER_COUNT"
  | "UNSUPPORTED_RANKING"
  | "UNSUPPORTED_TESTIMONIAL"
  | "FABRICATED_STATISTIC"
  | "FABRICATED_PARTNERSHIP";

export interface ForbiddenClaimItem {
  id: string;
  claimType: ForbiddenClaimType;
  claimDescription: string;
  forbiddenReason: string;
  status: "FORBIDDEN" | "UNVERIFIED";
}

export interface SourceConflict {
  id: string;
  field: string;
  sourceA: {
    source: EvidenceSourceType;
    reference: string;
    value: string;
  };
  sourceB: {
    source: EvidenceSourceType;
    reference: string;
    value: string;
  };
  resolutionStatus: "UNRESOLVED_CONFLICT" | "PREFERRED_AUTHORITATIVE";
  chosenValue?: string;
  explanation: string;
}

export interface BusinessAmbiguity {
  isAmbiguous: boolean;
  candidatesCount: number;
  candidateMatches: Array<{
    name: string;
    address?: string;
    placeId?: string;
    confidence: number;
  }>;
  resolutionMessage: string;
}

export interface BusinessIdentity {
  businessId: string; // Stable internal identifier
  placeId?: string; // Google Place ID reference
  canonicalName: string;
  normalizedWebsite?: string;
  formattedAddress?: string;
  phone?: string;
  sourceReferences: Record<string, string>;
}

export interface GroundedBusinessProfile {
  googlePlaceTypes?: string[];
  googlePrimaryType?: string;
  businessId: string;
  tenantId: string | null;
  identity: BusinessIdentity;
  archetype: string; // e.g., "dental_clinic", "boutique_hotel", or "unknown"
  archetypeConfidence: ConfidenceLevel;
  industryFamily: string; // e.g., "healthcare", "hospitality", or "unknown"
  industryConfidence: ConfidenceLevel;
  services: GroundedServiceItem[];
  audience: GroundedAudience[];
  location: GroundedLocation;
  brandSignals: GroundedBrandSignals;
  visualStyle: GroundedVisualStyle;
  ctaStrategy: GroundedCtaStrategy;
  evidence: EvidenceItem[];
  factsAndInferences: FactVsInferenceItem[];
  forbiddenClaims: ForbiddenClaimItem[];
  conflicts: SourceConflict[];
  ambiguity: BusinessAmbiguity;
  freshness: {
    fetchedAt: string;
    freshnessStatus: "FRESH" | "STALE" | "EXPIRED";
    sourcesFetched: string[];
  };
  placesPhotos?: RawPlacesPhoto[];
  placesReviews?: RawPlacesReview[];
  websitePhotos?: Array<{ url: string; alt?: string; sourceUrl?: string }>;
  clientAssets?: Array<{ url: string; label?: string }>;
  compositeConfidence: number; // 0.0 to 1.0
  compositeConfidenceLevel: ConfidenceLevel;
}

export interface BusinessResearchRequest {
  businessName: string;
  location?: string;
  website?: string;
  placeId?: string;
  category?: string;
  tenantId?: string | null;
  userId?: string | null;
  forceRefresh?: boolean;
}

export interface BusinessResearchResult {
  success: boolean;
  profile: GroundedBusinessProfile;
  errors?: string[];
  durationMs: number;
}
