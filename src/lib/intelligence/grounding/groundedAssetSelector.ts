// src/lib/intelligence/grounding/groundedAssetSelector.ts
// Phase 20A — Grounded Asset Selection Engine
// Deterministically maps verified business photos, reviews, and grounded facts
// into appropriate website sections without duplication, hallucination, or fabrication.

import crypto from "crypto";
import { googlePlacesSource } from "./sources/googlePlacesSource";
import { sanitizeReview } from "./reviewSanitizer";
import { resolveSemanticImage } from "@/lib/images/semanticImageSourcing";
import type {
  GroundedBusinessAsset,
  GroundedAssetSelectionResult,
  RawPlacesPhoto,
  RawPlacesReview,
  AssetType,
  AssetAttribution,
} from "./assetTypes";
import type { GroundedBusinessProfile, EvidenceSourceType } from "./types";

export interface AssetSelectorOptions {
  photos?: RawPlacesPhoto[];
  reviews?: RawPlacesReview[];
  category?: string;
  fallbackImageGenerator?: (role: string, itemIndex?: number, itemTitle?: string) => string;
}

export function scoreGooglePlacesPhoto(photo: RawPlacesPhoto): { score: number; isHeroSuitable: boolean; aspectRatio: number } {
  let score = 50;
  const width = photo.widthPx || 0;
  const height = photo.heightPx || 0;
  const aspectRatio = width > 0 && height > 0 ? width / height : 1.33;

  if (width >= 1200 && height >= 800) {
    score += 25;
  } else if (width < 600 || height < 400) {
    score -= 30;
  }

  if (aspectRatio >= 1.3 && aspectRatio <= 2.0) {
    score += 20;
  } else if (aspectRatio < 1.0) {
    score -= 20;
  }

  if (photo.authorAttributions && photo.authorAttributions.length > 0) {
    score += 5;
  }

  const finalScore = Math.max(0, Math.min(100, score));
  return {
    score: finalScore,
    isHeroSuitable: finalScore >= 60 && aspectRatio >= 1.2,
    aspectRatio,
  };
}

export class GroundedAssetSelector {
  private static instance: GroundedAssetSelector;

  private constructor() {}

  public static getInstance(): GroundedAssetSelector {
    if (!GroundedAssetSelector.instance) {
      GroundedAssetSelector.instance = new GroundedAssetSelector();
    }
    return GroundedAssetSelector.instance;
  }

  /**
   * Selects and allocates verified business assets using the 5-Tier Fallback Hierarchy:
   * Tier 1: Verified Google Places Photos (scored and sorted)
   * Tier 2: Official Website Crawl Photos (from verified business website)
   * Tier 3: Client-Provided Business Assets
   * Tier 4: Category-Gated Semantic Stock (strictly positive matched, never SaaS for non-SaaS)
   * Tier 5: Neutral Typographic Layout (no irrelevant stock imagery)
   */
  public selectAssets(
    profile: GroundedBusinessProfile,
    options: AssetSelectorOptions = {}
  ): GroundedAssetSelectionResult {
    const businessId = profile.businessId;
    const businessName = profile.identity.canonicalName || "Business";
    const category = options.category || profile.archetype || "commercial";
    const freshness = profile.freshness.freshnessStatus;

    // Raw sources from profile or options
    const rawPhotos = options.photos && options.photos.length > 0 ? options.photos : profile.placesPhotos || [];
    const rawReviews = options.reviews && options.reviews.length > 0 ? options.reviews : profile.placesReviews || [];
    const websitePhotos = profile.websitePhotos || [];
    const clientAssets = profile.clientAssets || [];

    // Sort Google Places photos by quality/resolution score
    const sortedGooglePhotos = [...rawPhotos].sort((a, b) => {
      return scoreGooglePlacesPhoto(b).score - scoreGooglePlacesPhoto(a).score;
    });

    const usedGooglePhotos = new Set<string>();
    const usedWebsitePhotos = new Set<string>();
    const usedClientAssets = new Set<string>();
    const selectedAssets: GroundedBusinessAsset[] = [];

    const fallbackGen =
      options.fallbackImageGenerator ||
      ((role: string, itemIndex?: number, itemTitle?: string) => {
        const res = resolveSemanticImage({
          category,
          businessName,
          archetype: profile.archetype,
          role: role as any,
          itemIndex,
          itemTitle,
        });
        return res.imageUrl;
      });

    // Helper: 5-Tier Image Resolver for a specific section role
    const resolveTieredImage = (
      targetSection: GroundedBusinessAsset["targetSection"],
      role: string,
      reqWidth = 1200,
      reqHeight = 800,
      itemIndex?: number,
      itemTitle?: string
    ): GroundedBusinessAsset => {
      // Tier 1: Google Places Photo
      const availableGoogle = sortedGooglePhotos.filter((p) => !usedGooglePhotos.has(p.name));
      if (availableGoogle.length > 0) {
        const p = availableGoogle[0];
        usedGooglePhotos.add(p.name);
        return {
          id: `ast_${targetSection}_${crypto.randomBytes(3).toString("hex")}`,
          type: "BUSINESS_PHOTO",
          source: "google_places",
          sourceReference: p.name,
          businessId,
          targetSection,
          contentUrl: googlePlacesSource.resolvePhotoUrl(p.name, reqWidth, reqHeight),
          photoReference: p.name,
          photoDimensions: { widthPx: p.widthPx, heightPx: p.heightPx },
          attribution: p.authorAttributions?.[0],
          evidenceId: profile.evidence.find((e) => e.supports === "visual.photos")?.id || "ev_places_photo",
          confidence: 0.98,
          freshness,
          allowedForGeneration: true,
          isFallback: false,
          metadata: { tier: 1, position: targetSection },
        };
      }

      // Tier 2: Official Website Crawl Asset
      const availableWebsite = websitePhotos.filter((w) => !usedWebsitePhotos.has(w.url));
      if (availableWebsite.length > 0) {
        const w = availableWebsite[0];
        usedWebsitePhotos.add(w.url);
        return {
          id: `ast_${targetSection}_crawl_${crypto.randomBytes(3).toString("hex")}`,
          type: "WEBSITE_CRAWL_IMAGE",
          source: "business_website",
          sourceReference: w.url,
          businessId,
          targetSection,
          contentUrl: w.url,
          attribution: { displayName: `${businessName} Official Website` },
          evidenceId: "ev_website_crawl_photo",
          confidence: 0.90,
          freshness,
          allowedForGeneration: true,
          isFallback: false,
          metadata: { tier: 2, position: targetSection, sourceUrl: w.sourceUrl },
        };
      }

      // Tier 3: Client-Provided Business Asset
      const availableClient = clientAssets.filter((c) => !usedClientAssets.has(c.url));
      if (availableClient.length > 0) {
        const c = availableClient[0];
        usedClientAssets.add(c.url);
        return {
          id: `ast_${targetSection}_client_${crypto.randomBytes(3).toString("hex")}`,
          type: "CLIENT_ASSET",
          source: "user_input",
          sourceReference: c.url,
          businessId,
          targetSection,
          contentUrl: c.url,
          evidenceId: "ev_client_uploaded_asset",
          confidence: 0.95,
          freshness,
          allowedForGeneration: true,
          isFallback: false,
          metadata: { tier: 3, label: c.label },
        };
      }

      // Tier 4: Category-Gated Semantic Stock
      const isSaaSOrTech = /saas|software|platform|tech|devops|api/i.test(category) || /saas/i.test(profile.archetype);
      const fallbackUrl = fallbackGen(role, itemIndex, itemTitle);

      // Guard: Never use developer/laptop imagery for non-tech businesses
      const isDevImage = fallbackUrl && /photo-1531482615713|photo-1550751827|photo-1517694712/i.test(fallbackUrl);
      if (fallbackUrl && (!isDevImage || isSaaSOrTech)) {
        return {
          id: `ast_${targetSection}_stock_${crypto.randomBytes(3).toString("hex")}`,
          type: "STOCK_FALLBACK_IMAGE",
          source: "user_input",
          sourceReference: "unsplash_semantic",
          businessId,
          targetSection,
          contentUrl: fallbackUrl,
          evidenceId: `ev_stock_fallback_${targetSection}`,
          confidence: 0.70,
          freshness,
          allowedForGeneration: true,
          isFallback: true,
          metadata: { tier: 4, note: "Curated category-gated stock asset" },
        };
      }

      // Tier 5: Neutral Typographic Layout (No irrelevant stock image)
      return {
        id: `ast_${targetSection}_typo_${crypto.randomBytes(3).toString("hex")}`,
        type: "TYPOGRAPHIC_LAYOUT",
        source: "user_input",
        sourceReference: "typographic_design",
        businessId,
        targetSection,
        contentUrl: undefined,
        evidenceId: `ev_typographic_${targetSection}`,
        confidence: 0.85,
        freshness,
        allowedForGeneration: true,
        isFallback: true,
        metadata: { tier: 5, note: "Neutral high-design typographic layout without irrelevant stock" },
      };
    };

    // ----------------------------------------------------
    // 1. Hero Asset Selection
    // ----------------------------------------------------
    const heroAsset = resolveTieredImage("hero", "hero", 1600, 1000);
    selectedAssets.push(heroAsset);

    // ----------------------------------------------------
    // 2. About Asset Selection
    // ----------------------------------------------------
    const aboutAsset = resolveTieredImage("about", "about", 1200, 800);
    selectedAssets.push(aboutAsset);

    // ----------------------------------------------------
    // 3. Service Assets Selection (Deduplicated)
    // ----------------------------------------------------
    const serviceAssets: Record<number, GroundedBusinessAsset> = {};
    const servicesCount = Math.max(profile.services.length, 3);

    for (let idx = 0; idx < servicesCount; idx++) {
      const serviceTitle = profile.services[idx]?.name || `Service ${idx + 1}`;
      const sAsset = resolveTieredImage("services", "services", 800, 600, idx, serviceTitle);
      sAsset.metadata = { ...sAsset.metadata, serviceIndex: idx, serviceTitle };
      serviceAssets[idx] = sAsset;
      selectedAssets.push(sAsset);
    }

    // ----------------------------------------------------
    // 4. Gallery / Features Asset Selection
    // ----------------------------------------------------
    const galleryAssets: GroundedBusinessAsset[] = [];
    const remainingGoogleForGallery = sortedGooglePhotos.filter((p) => !usedGooglePhotos.has(p.name));
    const galleryCount = Math.min(remainingGoogleForGallery.length, 6);

    for (let i = 0; i < galleryCount; i++) {
      const ph = remainingGoogleForGallery[i];
      usedGooglePhotos.add(ph.name);
      const galAsset: GroundedBusinessAsset = {
        id: `ast_gallery_${i}_${crypto.randomBytes(3).toString("hex")}`,
        type: "BUSINESS_PHOTO",
        source: "google_places",
        sourceReference: ph.name,
        businessId,
        targetSection: "gallery",
        contentUrl: googlePlacesSource.resolvePhotoUrl(ph.name, 1000, 750),
        photoReference: ph.name,
        photoDimensions: { widthPx: ph.widthPx, heightPx: ph.heightPx },
        attribution: ph.authorAttributions?.[0],
        evidenceId: profile.evidence.find((e) => e.supports === "visual.photos")?.id || "ev_places_photo",
        confidence: 0.95,
        freshness,
        allowedForGeneration: true,
        isFallback: false,
        metadata: { tier: 1, galleryIndex: i },
      };
      galleryAssets.push(galAsset);
      selectedAssets.push(galAsset);
    }

    // ----------------------------------------------------
    // 5. Review Assets Selection (Strict Anti-Fabrication Rule)
    // ----------------------------------------------------
    const reviewAssets: GroundedBusinessAsset[] = [];
    for (let i = 0; i < rawReviews.length; i++) {
      const rv = rawReviews[i];
      const text = rv.text?.text || "";
      const author = rv.authorAttribution?.displayName || "Verified Customer";
      const rating = rv.rating;

      const sanitized = sanitizeReview(text, author);
      if (!sanitized.isSafe) continue;
      if (rating !== undefined && (rating < 1 || rating > 5)) continue;

      const rAsset: GroundedBusinessAsset = {
        id: `ast_review_${i}_${crypto.randomBytes(3).toString("hex")}`,
        type: "BUSINESS_REVIEW",
        source: "google_places",
        sourceReference: rv.name || `review_${i}`,
        businessId,
        targetSection: "reviews",
        reviewText: sanitized.sanitizedText,
        reviewerName: sanitized.sanitizedAuthor,
        rating,
        publishTime: rv.publishTime,
        attribution: {
          displayName: sanitized.sanitizedAuthor,
          uri: rv.authorAttribution?.uri,
          photoUri: rv.authorAttribution?.photoUri,
        },
        evidenceId: profile.evidence.find((e) => e.supports === "reputation.reviews")?.id || `ev_review_${i}`,
        confidence: 0.95,
        freshness,
        allowedForGeneration: true,
        isFallback: false,
        metadata: { reviewIndex: i },
      };
      reviewAssets.push(rAsset);
      selectedAssets.push(rAsset);
    }

    // ----------------------------------------------------
    // 6. Grounded Facts Selection (Trust Badges & Highlights)
    // ----------------------------------------------------
    const factAssets: GroundedBusinessAsset[] = [];

    // Observed Rating Fact (Case-Insensitive)
    const ratingFact = profile.factsAndInferences.find(
      (f) => f.type === "OBSERVED_FACT" && f.statement.toLowerCase().includes("rating")
    );
    if (ratingFact) {
      const fAsset: GroundedBusinessAsset = {
        id: `ast_fact_rating_${crypto.randomBytes(3).toString("hex")}`,
        type: "GROUNDED_FACT",
        source: "google_places",
        sourceReference: "places_rating",
        businessId,
        targetSection: "hero",
        factStatement: ratingFact.statement,
        evidenceId: ratingFact.evidenceIds[0] || "ev_rating",
        confidence: ratingFact.confidence,
        freshness,
        allowedForGeneration: true,
        isFallback: false,
        metadata: { factType: "customer_rating" },
      };
      factAssets.push(fAsset);
      selectedAssets.push(fAsset);
    }

    // Verified Address Fact
    if (profile.location.isVerified && profile.location.formattedAddress) {
      const fAsset: GroundedBusinessAsset = {
        id: `ast_fact_addr_${crypto.randomBytes(3).toString("hex")}`,
        type: "GROUNDED_FACT",
        source: "google_places",
        sourceReference: "places_address",
        businessId,
        targetSection: "contact",
        factStatement: `Verified location: ${profile.location.formattedAddress}`,
        evidenceId: profile.location.evidenceIds[0] || "ev_address",
        confidence: profile.location.confidence,
        freshness,
        allowedForGeneration: true,
        isFallback: false,
        metadata: { factType: "verified_address" },
      };
      factAssets.push(fAsset);
      selectedAssets.push(fAsset);
    }

    // Verified Phone Fact
    if (profile.identity.phone) {
      const fAsset: GroundedBusinessAsset = {
        id: `ast_fact_phone_${crypto.randomBytes(3).toString("hex")}`,
        type: "GROUNDED_FACT",
        source: "google_places",
        sourceReference: "places_phone",
        businessId,
        targetSection: "contact",
        factStatement: `Direct telephone: ${profile.identity.phone}`,
        evidenceId: "ev_phone",
        confidence: 0.95,
        freshness,
        allowedForGeneration: true,
        isFallback: false,
        metadata: { factType: "verified_phone" },
      };
      factAssets.push(fAsset);
      selectedAssets.push(fAsset);
    }

    const businessPhotosCount = selectedAssets.filter((a) => a.type === "BUSINESS_PHOTO").length;
    const fallbacksCount = selectedAssets.filter((a) => a.isFallback).length;

    return {
      businessId,
      assets: selectedAssets,
      heroAsset,
      aboutAsset,
      galleryAssets,
      serviceAssets,
      reviewAssets,
      factAssets,
      summary: {
        totalSelected: selectedAssets.length,
        businessPhotosCount,
        reviewsCount: reviewAssets.length,
        factsCount: factAssets.length,
        fallbacksCount,
      },
    };
  }
}

export const groundedAssetSelector = GroundedAssetSelector.getInstance();
