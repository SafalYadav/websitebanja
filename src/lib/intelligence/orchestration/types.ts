// src/lib/intelligence/orchestration/types.ts
/**
 * Canonical Generation Orchestrator Types
 * Defines the unified contract across all WebsiteBanja generation entry points.
 */

import type { WebsiteData } from "@/types/website";
import type { GroundedBusinessProfile } from "../grounding/types";
import type { GroundedAssetSelectionResult, RawPlacesPhoto, RawPlacesReview } from "../grounding/assetTypes";
import type { ValidationReport } from "../validation/types";
import type { LeadAuditReport } from "@/lib/audit/types";
import type { BusinessLead } from "@/lib/discovery/types";
import type { PersonalizedPreviewResponse } from "@/lib/personalization/types";
import type { BusinessSemanticProfile } from "../semantic/businessSemanticReasoner";

export interface ExecutiveGenerationBrief {
  approvedDomain: string;
  approvedSubdomain: string;
  designDirection: string;
  offeringConstraints: string[];
  preferredImageSubjects: string[];
  forbiddenImageSubjects: string[];
  sectionOrder: string[];
  primaryCta: { label: string; intent: string };
  uniquenessDirectives: string[];
  confidence: number;
  evidence: string[];
  delegationTaskId?: string;
}

export interface CanonicalGenerationRequest {
  businessName: string;
  category?: string;
  location?: string;
  websiteUrl?: string;
  phone?: string;
  email?: string;
  placeId?: string;
  leadId?: string;
  auditId?: string;
  overrideLead?: BusinessLead;
  overrideAudit?: LeadAuditReport;
  groundedProfile?: GroundedBusinessProfile;
  placesPhotos?: RawPlacesPhoto[];
  placesReviews?: RawPlacesReview[];
  userId?: string;
  tenantId?: string;
  source:
    | "ui_builder"
    | "api"
    | "automation_n8n"
    | "autonomous_pipeline"
    | "production_job"
    | "studio"
    | "cli";
}

export interface CanonicalGenerationResponse {
  success: boolean;
  status: "READY" | "REPAIRED" | "FAILED";
  websiteData: WebsiteData;
  preview: {
    id: string;
    url: string;
    slug: string;
  };
  previewDetails?: PersonalizedPreviewResponse["preview"];
  businessContext: {
    businessName: string;
    domain: string;
    location: string;
    rating?: number;
    reviewCount?: number;
    phone?: string;
    existingWebsiteStatus?: "none" | "present" | "audited";
    existingWebsiteUrl?: string | null;
    placeId?: string;
    tenantId?: string | null;
    auditReport?: unknown;
    executiveDirectives?: unknown;
    semanticProfile?: BusinessSemanticProfile;
    executiveBrief?: ExecutiveGenerationBrief;
  };
  groundedProfile?: GroundedBusinessProfile;
  assetSelection?: GroundedAssetSelectionResult;
  validationReport?: ValidationReport;
  repairCount: number;
  durationMs: number;
  error?: {
    code: string;
    message: string;
  };
}
