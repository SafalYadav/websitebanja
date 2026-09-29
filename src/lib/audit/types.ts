// src/lib/audit/types.ts
/**
 * WebsiteBanja Business Research & Website Audit — Types & Contracts
 * Phase: Phase 9 (Business Research + Website Audit Agent)
 */

import type { BusinessLead } from "@/lib/discovery/types";

export type AuditSeverity = "high" | "medium" | "low" | "info";

export interface AuditIssue {
  category: "technical" | "mobile" | "ux" | "seo" | "accessibility" | "conversion";
  severity: AuditSeverity;
  evidence: string;
  recommendation: string;
}

export interface TechnicalAuditResult {
  https: boolean;
  httpStatus?: number;
  title?: string;
  titleLength: number;
  metaDescription?: string;
  metaDescriptionLength: number;
  viewportPresent: boolean;
  canonicalPresent: boolean;
  h1Count: number;
  h2Count: number;
  scriptCount: number;
  stylesheetCount: number;
  imageCount: number;
  imagesMissingAlt: number;
  pageSizeKb: number;
  issues: AuditIssue[];
}

export interface MobileAuditResult {
  status: "static_analysis" | "browser_verified";
  viewportConfigured: boolean;
  responsiveMetaPresent: boolean;
  hasClickablePhone: boolean;
  hasMobileNavigation: boolean;
  issues: AuditIssue[];
}

export interface UxAuditResult {
  score: number; // 0-100
  hasPrimaryCtaAboveFold: boolean;
  hasClearNavigation: boolean;
  hasTrustSignals: boolean;
  hasClearValueProposition: boolean;
  issues: AuditIssue[];
}

export interface SeoAuditResult {
  score: number; // 0-100
  titleOptimal: boolean;
  metaDescriptionOptimal: boolean;
  singleH1Present: boolean;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  hasLocationRelevance: boolean;
  issues: AuditIssue[];
}

export interface ConversionAuditResult {
  score: number; // 0-100
  hasPhoneCta: boolean;
  hasEmailCta: boolean;
  hasContactForm: boolean;
  hasBookingLink: boolean;
  hasWhatsAppLink: boolean;
  hasPhysicalAddress: boolean;
  hasTestimonials: boolean;
  issues: AuditIssue[];
}

export interface AccessibilityAuditResult {
  score: number; // 0-100
  missingAltCount: number;
  hasLangAttribute: boolean;
  hasHeadingHierarchy: boolean;
  issues: AuditIssue[];
}

export interface PerformanceSignals {
  status: "static_analysis";
  htmlSizeBytes: number;
  imageCount: number;
  scriptCount: number;
  stylesheetCount: number;
  externalDomainCount: number;
}

export interface Phase10DesignInputs {
  visualDirection: string;
  layoutStrategy: string;
  requiredSections: string[];
  ctaStrategy: string;
  imageryDirection: string;
  contentPriorities: string[];
}

export interface ResearchSummary {
  businessName: string;
  industry: string;
  category: string;
  location: string;
  summary: string;
  publicContact: {
    phone?: string;
    email?: string;
    address?: string;
  };
  socialPresence: string[];
  reputationSummary: string;
}

export interface LeadAuditReport {
  auditId: string;
  leadId: string;
  auditedAt: string;
  business: {
    businessName: string;
    category: string;
    industry: string;
    location: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  research: ResearchSummary;
  website: {
    status: "present" | "missing" | "unreachable" | "unknown";
    url?: string;
    pagesAudited: number;
    auditedUrls: string[];
  };
  technical: TechnicalAuditResult;
  mobile: MobileAuditResult;
  ux: UxAuditResult;
  seo: SeoAuditResult;
  conversion: ConversionAuditResult;
  performance: PerformanceSignals;
  accessibility: AccessibilityAuditResult;
  opportunity: {
    score: number; // 0-100 (websiteOpportunityScore)
    reasons: string[];
  };
  recommendations: string[];
  phase10DesignInputs: Phase10DesignInputs;
  handoffPhase: "phase10_automated_preview_generation";
}

export interface AuditLeadRequest {
  leadId?: string;
  lead?: BusinessLead;
  maxPages?: number;
  maxDepth?: number;
}

export interface AuditLeadResponse {
  success: boolean;
  auditId: string;
  report: LeadAuditReport;
}

export interface AuditErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  auditId?: string;
}
