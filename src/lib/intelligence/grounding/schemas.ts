// src/lib/intelligence/grounding/schemas.ts
// Zod schemas for Grounded Business Intelligence output validation

import { z } from "zod";

export const EvidenceSourceTypeSchema = z.enum([
  "business_website",
  "google_places",
  "google_maps",
  "google_search",
  "website_audit",
  "user_input",
]);

export const VerificationStatusSchema = z.enum([
  "verified",
  "inferred",
  "unverified",
  "conflicting",
]);

export const ConfidenceLevelSchema = z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

export const EvidenceItemSchema = z.object({
  id: z.string().min(1),
  source: EvidenceSourceTypeSchema,
  reference: z.string().min(1),
  observation: z.string().min(1),
  supports: z.string().min(1),
  confidence: z.number().min(0).max(1),
  confidenceLevel: ConfidenceLevelSchema,
  verificationStatus: VerificationStatusSchema,
  timestamp: z.string(),
});

export const FactVsInferenceItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["OBSERVED_FACT", "DERIVED_INFERENCE"]),
  statement: z.string().min(1),
  confidence: z.number().min(0).max(1),
  confidenceLevel: ConfidenceLevelSchema,
  evidenceIds: z.array(z.string()),
  rationale: z.string().optional(),
});

export const GroundedServiceItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  isObserved: z.boolean(),
  confidence: z.number().min(0).max(1),
  confidenceLevel: ConfidenceLevelSchema,
  evidenceIds: z.array(z.string()),
});

export const GroundedAudienceSchema = z.object({
  segment: z.string().min(1),
  isObserved: z.boolean(),
  confidence: z.number().min(0).max(1),
  confidenceLevel: ConfidenceLevelSchema,
  evidenceIds: z.array(z.string()),
  rationale: z.string(),
});

export const GroundedLocationSchema = z.object({
  formattedAddress: z.string().optional(),
  city: z.string().optional(),
  locality: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  serviceArea: z.array(z.string()).optional(),
  isVerified: z.boolean(),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string()),
});

export const GroundedBrandSignalsSchema = z.object({
  businessName: z.string().min(1),
  tagline: z.string().optional(),
  tone: z.string().optional(),
  colors: z.array(z.string()).optional(),
  typography: z.string().optional(),
  imageryStyle: z.string().optional(),
  positioning: z.string().optional(),
  confidence: z.number().min(0).max(1),
  confidenceLevel: ConfidenceLevelSchema,
  evidenceIds: z.array(z.string()),
});

export const GroundedVisualStyleSchema = z.object({
  status: z.enum(["AVAILABLE", "UNAVAILABLE"]),
  colorPalette: z.array(z.string()).optional(),
  visualMood: z.string().optional(),
  photographyStyle: z.string().optional(),
  layoutStyle: z.string().optional(),
  typographyStyle: z.string().optional(),
  designDensity: z.string().optional(),
  designClassification: z.string().optional(),
  confidence: z.number().min(0).max(1),
  confidenceLevel: ConfidenceLevelSchema,
  evidenceIds: z.array(z.string()),
  reason: z.string().optional(),
});

export const GroundedCtaStrategySchema = z.object({
  observedCtas: z.array(
    z.object({
      text: z.string(),
      channel: z.string().optional(),
      evidenceId: z.string(),
    })
  ),
  primaryCtaStrategy: z.string().min(1),
  recommendedNextAction: z.string().min(1),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  confidenceLevel: ConfidenceLevelSchema,
});

export const ForbiddenClaimTypeSchema = z.enum([
  "UNSUPPORTED_AWARD",
  "UNSUPPORTED_CERTIFICATION",
  "UNSUPPORTED_EXPERIENCE_YEARS",
  "UNSUPPORTED_GUARANTEE",
  "UNSUPPORTED_PRICING",
  "UNSUPPORTED_LOCATION",
  "UNSUPPORTED_SERVICE",
  "UNSUPPORTED_CUSTOMER_COUNT",
  "UNSUPPORTED_RANKING",
  "UNSUPPORTED_TESTIMONIAL",
  "FABRICATED_STATISTIC",
  "FABRICATED_PARTNERSHIP",
]);

export const ForbiddenClaimItemSchema = z.object({
  id: z.string().min(1),
  claimType: ForbiddenClaimTypeSchema,
  claimDescription: z.string().min(1),
  forbiddenReason: z.string().min(1),
  status: z.enum(["FORBIDDEN", "UNVERIFIED"]),
});

export const SourceConflictSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  sourceA: z.object({
    source: EvidenceSourceTypeSchema,
    reference: z.string(),
    value: z.string(),
  }),
  sourceB: z.object({
    source: EvidenceSourceTypeSchema,
    reference: z.string(),
    value: z.string(),
  }),
  resolutionStatus: z.enum(["UNRESOLVED_CONFLICT", "PREFERRED_AUTHORITATIVE"]),
  chosenValue: z.string().optional(),
  explanation: z.string(),
});

export const BusinessAmbiguitySchema = z.object({
  isAmbiguous: z.boolean(),
  candidatesCount: z.number().int().min(0),
  candidateMatches: z.array(
    z.object({
      name: z.string(),
      address: z.string().optional(),
      placeId: z.string().optional(),
      confidence: z.number().min(0).max(1),
    })
  ),
  resolutionMessage: z.string(),
});

export const BusinessIdentitySchema = z.object({
  businessId: z.string().min(1),
  placeId: z.string().optional(),
  canonicalName: z.string().min(1),
  normalizedWebsite: z.string().optional(),
  formattedAddress: z.string().optional(),
  phone: z.string().optional(),
  sourceReferences: z.record(z.string(), z.string()),
});

export const GroundedBusinessProfileSchema = z.object({
  businessId: z.string().min(1),
  tenantId: z.string().nullable(),
  identity: BusinessIdentitySchema,
  archetype: z.string(),
  archetypeConfidence: ConfidenceLevelSchema,
  industryFamily: z.string(),
  industryConfidence: ConfidenceLevelSchema,
  services: z.array(GroundedServiceItemSchema),
  audience: z.array(GroundedAudienceSchema),
  location: GroundedLocationSchema,
  brandSignals: GroundedBrandSignalsSchema,
  visualStyle: GroundedVisualStyleSchema,
  ctaStrategy: GroundedCtaStrategySchema,
  evidence: z.array(EvidenceItemSchema),
  factsAndInferences: z.array(FactVsInferenceItemSchema),
  forbiddenClaims: z.array(ForbiddenClaimItemSchema),
  conflicts: z.array(SourceConflictSchema),
  ambiguity: BusinessAmbiguitySchema,
  freshness: z.object({
    fetchedAt: z.string(),
    freshnessStatus: z.enum(["FRESH", "STALE", "EXPIRED"]),
    sourcesFetched: z.array(z.string()),
  }),
  placesPhotos: z.array(z.any()).optional(),
  placesReviews: z.array(z.any()).optional(),
  websitePhotos: z.array(z.any()).optional(),
  clientAssets: z.array(z.any()).optional(),
  compositeConfidence: z.number().min(0).max(1),
  compositeConfidenceLevel: ConfidenceLevelSchema,
});

export const BusinessResearchRequestSchema = z.object({
  businessName: z.string().min(1),
  location: z.string().optional(),
  website: z.string().optional(),
  placeId: z.string().optional(),
  category: z.string().optional(),
  tenantId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  forceRefresh: z.boolean().optional(),
});
