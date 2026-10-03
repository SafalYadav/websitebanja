// src/lib/intelligence/grounding/assetTypes.ts
// Phase 20A — Grounded Business Assets & Website Generation Contracts
// Bridges Grounded Business Intelligence and actual Website Generation.
// Enforces Google Places compliance, attribution, prompt injection safety, and anti-fabrication.

import type { EvidenceSourceType } from "./types";

export type AssetType =
  | "BUSINESS_PHOTO"
  | "WEBSITE_CRAWL_IMAGE"
  | "CLIENT_ASSET"
  | "STOCK_FALLBACK_IMAGE"
  | "TYPOGRAPHIC_LAYOUT"
  | "GENERATED_VISUAL"
  | "BUSINESS_REVIEW"
  | "GROUNDED_FACT";

export type AssetPlacementTarget =
  | "hero"
  | "about"
  | "services"
  | "features"
  | "gallery"
  | "reviews"
  | "contact";

export interface AssetAttribution {
  displayName?: string;
  uri?: string;
  photoUri?: string;
}

export interface GroundedBusinessAsset {
  id: string;
  type: AssetType;
  source: EvidenceSourceType;
  sourceReference: string; // e.g. Place ID or photo reference name
  businessId: string;
  targetSection: AssetPlacementTarget;
  contentUrl?: string; // Resolved photo proxy or secure media URL
  photoReference?: string; // Google Places photo resource name (places/.../photos/...)
  photoDimensions?: {
    widthPx?: number;
    heightPx?: number;
  };
  reviewText?: string;
  reviewerName?: string;
  rating?: number;
  publishTime?: string;
  factStatement?: string;
  attribution?: AssetAttribution;
  evidenceId: string;
  confidence: number; // 0.0 to 1.0
  freshness: "FRESH" | "STALE" | "EXPIRED";
  allowedForGeneration: boolean;
  isFallback: boolean;
  metadata?: Record<string, unknown>;
}

export interface GroundedAssetSelectionResult {
  businessId: string;
  assets: GroundedBusinessAsset[];
  heroAsset?: GroundedBusinessAsset;
  aboutAsset?: GroundedBusinessAsset;
  galleryAssets: GroundedBusinessAsset[];
  serviceAssets: Record<number, GroundedBusinessAsset>;
  reviewAssets: GroundedBusinessAsset[];
  factAssets: GroundedBusinessAsset[];
  summary: {
    totalSelected: number;
    businessPhotosCount: number;
    reviewsCount: number;
    factsCount: number;
    fallbacksCount: number;
  };
}

export interface RawPlacesPhoto {
  name: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: Array<{
    displayName: string;
    uri?: string;
    photoUri?: string;
  }>;
}

export interface RawPlacesReview {
  name?: string;
  relativePublishTimeDescription?: string;
  rating?: number;
  text?: {
    text: string;
    languageCode?: string;
  };
  originalText?: {
    text: string;
    languageCode?: string;
  };
  authorAttribution?: {
    displayName: string;
    uri?: string;
    photoUri?: string;
  };
  publishTime?: string;
}
