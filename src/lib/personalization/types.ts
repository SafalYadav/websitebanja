// src/lib/personalization/types.ts
/**
 * Personalized Preview Generation Data Models & Interfaces
 * Phase: Phase 10 (Automated Personalized Preview Generation)
 *
 * Governs:
 *   - Request / Response contracts connecting Phase 8 leads, Phase 9 audits, and Phase 6 generation
 *   - Structured Phase 11 outreach handoff specifications
 *   - Image manifest and contrast compliance reporting
 */

import type { BusinessLead } from "@/lib/discovery/types";
import type { LeadAuditReport } from "@/lib/audit/types";
import type { WebsiteData } from "@/types/website";

export interface ImageManifestEntry {
  role: string;
  url: string;
  source: string;
  author: string;
  intent: string;
  license: string;
}

export interface HeroContrastReport {
  headingContrast: number;
  subtitleContrast: number;
  ctaContrast: number;
  isReadable: boolean;
  remedyApplied: string;
  details: string;
}

export interface OutreachContext {
  mainWebsiteProblems: string[];
  newWebsiteImprovements: string[];
  personalizationPoints: string[];
}

export interface PersonalizedPreviewData {
  id: string;
  slug: string;
  url: string;
  qualityScore: number;
  designArchetype: string;
  sectionCount: number;
  sections: string[];
  imageManifest: ImageManifestEntry[];
  contrastReport: HeroContrastReport;
  websiteData: WebsiteData;
  createdAt: string;
}

export interface PersonalizedPreviewRequest {
  leadId: string;
  auditId?: string;
  userId?: string;
  forceFresh?: boolean;
  overrideLead?: Partial<BusinessLead>;
  overrideAudit?: Partial<LeadAuditReport>;
  groundedProfile?: import("@/lib/intelligence/grounding/types").GroundedBusinessProfile;
  placesPhotos?: import("@/lib/intelligence/grounding/assetTypes").RawPlacesPhoto[];
  placesReviews?: import("@/lib/intelligence/grounding/assetTypes").RawPlacesReview[];
}

export interface PersonalizedPreviewResponse {
  success: boolean;
  status: "generated" | "quality_failed" | "failed";
  preview?: {
    id: string;
    slug: string;
    url: string;
    qualityScore: number;
    designArchetype: string;
    sectionCount: number;
    imageManifest: ImageManifestEntry[];
    contrastReport: HeroContrastReport;
  };
  business: {
    name: string;
    industry: string;
    category: string;
    location: string;
    phone?: string;
    email?: string;
  };
  outreachContext?: OutreachContext;
  handoffPhase: "phase11_personalized_outreach";
  auditId: string;
  leadId: string;
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
}

export interface StoredPreviewRecord {
  previewId: string;
  slug: string;
  leadId: string;
  auditId: string;
  businessId?: string;
  businessName: string;
  industry: string;
  generatedAt: string;
  previewUrl: string;
  qualityScore: number;
  designArchetype: string;
  imageManifest: ImageManifestEntry[];
  generationStatus: "generated" | "quality_failed" | "failed";
  userId?: string;
}
