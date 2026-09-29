// src/lib/discovery/types.ts
/**
 * WebsiteBanja Business Discovery & Lead Qualification — Types & Schemas
 * Phase: Phase 8 (Business Discovery + Lead Qualification)
 */

export type LeadStatus =
  | "DISCOVERED"
  | "QUALIFIED"
  | "DISQUALIFIED"
  | "DUPLICATE"
  | "NEEDS_REVIEW";

export type QualificationStatus = "QUALIFIED" | "DISQUALIFIED" | "NEEDS_REVIEW";

export type WebsiteStatus = "missing" | "present" | "unreachable" | "invalid_url";

export interface DiscoveryCriteria {
  query: string;
  location: string;
  radiusKm?: number;
  limit?: number;
  categories?: string[];
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  minRating?: number;
  keywords?: string[];
  provider?: string;
}

export interface RawBusinessRecord {
  sourceId: string;
  source: string;
  name: string;
  category?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  isPermanentlyClosed?: boolean;
  socialLinks?: Record<string, string>;
  rawMetadata?: Record<string, unknown>;
}

export interface BusinessLead {
  leadId: string;
  businessName: string;
  normalizedName: string;
  category: string;
  industry: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  normalizedPhone?: string;
  email?: string;
  website?: string;
  normalizedDomain?: string;
  websiteStatus: WebsiteStatus;
  socialLinks?: Record<string, string>;
  rating?: number;
  reviewCount?: number;
  source: string;
  sourceId: string;
  discoveredAt: string;
  qualificationStatus: QualificationStatus;
  leadStatus: LeadStatus;
  qualificationScore: number;
  opportunityScore: number;
  reasonCodes: string[];
  opportunityReasons: string[];
  duplicateOf?: string;
  notes?: string[];
  metadata?: Record<string, unknown>;
  userId?: string;
}

export interface DiscoveryRunSummary {
  runId: string;
  query: string;
  location: string;
  discovered: number;
  newLeads: number;
  duplicates: number;
  qualified: number;
  disqualified: number;
  needsReview: number;
  durationMs: number;
  provider: string;
}

export interface DiscoveryResponse {
  success: boolean;
  runId: string;
  summary: DiscoveryRunSummary;
  leads: BusinessLead[];
  qualifiedLeads: BusinessLead[];
}

export interface DiscoveryErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  runId?: string;
}
