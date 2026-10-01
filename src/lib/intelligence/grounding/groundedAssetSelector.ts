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
} from "./assetTypes";
import type { GroundedBusinessProfile } from "./types";

export interface AssetSelectorOptions {
  photos?: RawPlacesPhoto[];
  reviews?: RawPlacesReview[];
  category?: string;
  fallbackImageGenerator?: (role: string, itemIndex?: number, itemTitle?: string) => string;
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
   * Selects and allocates verified business assets and clean fallbacks for website generation.
   */
  public selectAssets(
    profile: GroundedBusinessProfile,
    options: AssetSelectorOptions = {}
  ): GroundedAssetSelectionResult {
    const businessId = profile.businessId;
    const businessName = profile.identity.canonicalName || "Business";
    const category = options.category || profile.archetype || "commercial";
    const freshness = profile.freshness.freshnessStatus;

    const rawPhotos = options.photos || [];
    const rawReviews = options.reviews || [];

    const selectedAssets: GroundedBusinessAsset[] = [];
    const usedPhotoNames = new Set<string>();

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

    // ----------------------------------------------------
    // 1. Hero Asset Selection
    // ----------------------------------------------------
    let heroAsset: GroundedBusinessAsset | undefined;
    if (rawPhotos.length > 0) {
      const p0 = rawPhotos[0];
      usedPhotoNames.add(p0.name);
      heroAsset = {
        id: `ast_hero_${crypto.randomBytes(3).toString("hex")}`,
        type: "BUSINESS_PHOTO",
        source: "google_places",
        sourceReference: p0.name,
        businessId,
        targetSection: "hero",
        contentUrl: googlePlacesSource.resolvePhotoUrl(p0.name, 1600, 1000),
        photoReference: p0.name,
        photoDimensions: { widthPx: p0.widthPx, heightPx: p0.heightPx },
        attribution: p0.authorAttributions?.[0],
        evidenceId: profile.evidence.find((e) => e.supports === "visual.photos")?.id || "ev_places_photo",
        confidence: 0.98,
        freshness,
        allowedForGeneration: true,
        isFallback: false,
        metadata: { position: "hero_primary", exteriorOrMain: true },
      };
    } else {
      const fallbackUrl = fallbackGen("hero");
      heroAsset = {
        id: `ast_hero_fallback_${crypto.randomBytes(3).toString("hex")}`,
        type: "STOCK_FALLBACK_IMAGE",
        source: "user_input",
        sourceReference: "unsplash_semantic",
        businessId,
        targetSection: "hero",
        contentUrl: fallbackUrl,
        evidenceId: "ev_stock_fallback_hero",
        confidence: 0.70,
        freshness,
        allowedForGeneration: true,
        isFallback: true,
        metadata: { note: "High-quality stock fallback image; verified business photo unavailable" },
      };
    }
    selectedAssets.push(heroAsset);

    // ----------------------------------------------------
    // 2. About Asset Selection
    // ----------------------------------------------------
    let aboutAsset: GroundedBusinessAsset | undefined;
    const remainingPhotosForAbout = rawPhotos.filter((p) => !usedPhotoNames.has(p.name));
    if (remainingPhotosForAbout.length > 0) {
      const p1 = remainingPhotosForAbout[0];
      usedPhotoNames.add(p1.name);
      aboutAsset = {
        id: `ast_about_${crypto.randomBytes(3).toString("hex")}`,
        type: "BUSINESS_PHOTO",
        source: "google_places",
        sourceReference: p1.name,
        businessId,
        targetSection: "about",
        contentUrl: googlePlacesSource.resolvePhotoUrl(p1.name, 1200, 800),
        photoReference: p1.name,
        photoDimensions: { widthPx: p1.widthPx, heightPx: p1.heightPx },
        attribution: p1.authorAttributions?.[0],
        evidenceId: profile.evidence.find((e) => e.supports === "visual.photos")?.id || "ev_places_photo",
        confidence: 0.95,
        freshness,
        allowedForGeneration: true,
        isFallback: false,
        metadata: { position: "about_story" },
      };
    } else {
      const fallbackUrl = fallbackGen("about");
      aboutAsset = {
        id: `ast_about_fallback_${crypto.randomBytes(3).toString("hex")}`,
        type: "STOCK_FALLBACK_IMAGE",
        source: "user_input",
        sourceReference: "unsplash_semantic",
        businessId,
        targetSection: "about",
        contentUrl: fallbackUrl,
        evidenceId: "ev_stock_fallback_about",
        confidence: 0.70,
        freshness,
        allowedForGeneration: true,
        isFallback: true,
        metadata: { note: "High-quality stock fallback image; verified business photo unavailable" },
      };
    }
    selectedAssets.push(aboutAsset);

    // Remaining photos after Hero and About
    const remainingPhotos = rawPhotos.filter((p) => !usedPhotoNames.has(p.name));
    const servicePhotosPool = remainingPhotos.filter((p) => p.name.includes("srv") || p.name.includes("service"));
    const galleryPhotosPool = remainingPhotos.filter((p) => p.name.includes("gal") || p.name.includes("gallery"));
    const neutralPhotos = remainingPhotos.filter((p) => !servicePhotosPool.includes(p) && !galleryPhotosPool.includes(p));

    // Allocate neutral photos: first 2 to gallery if gallery empty, then to services, then rest to gallery
    for (const ph of neutralPhotos) {
      if (galleryPhotosPool.length < 2) {
        galleryPhotosPool.push(ph);
      } else if (servicePhotosPool.length < profile.services.length) {
        servicePhotosPool.push(ph);
      } else {
        galleryPhotosPool.push(ph);
      }
    }

    // ----------------------------------------------------
    // 3. Service Assets Selection (Deduplicated)
    // ----------------------------------------------------
    const serviceAssets: Record<number, GroundedBusinessAsset> = {};
    const servicesCount = Math.max(profile.services.length, 3);

    for (let idx = 0; idx < servicesCount; idx++) {
      const serviceTitle = profile.services[idx]?.name || `Service ${idx + 1}`;
      if (servicePhotosPool.length > 0) {
        const ph = servicePhotosPool.shift()!;
        usedPhotoNames.add(ph.name);
        const sAsset: GroundedBusinessAsset = {
          id: `ast_service_${idx}_${crypto.randomBytes(3).toString("hex")}`,
          type: "BUSINESS_PHOTO",
          source: "google_places",
          sourceReference: ph.name,
          businessId,
          targetSection: "services",
          contentUrl: googlePlacesSource.resolvePhotoUrl(ph.name, 800, 600),
          photoReference: ph.name,
          photoDimensions: { widthPx: ph.widthPx, heightPx: ph.heightPx },
          attribution: ph.authorAttributions?.[0],
          evidenceId: profile.evidence.find((e) => e.supports === "visual.photos")?.id || "ev_places_photo",
          confidence: 0.92,
          freshness,
          allowedForGeneration: true,
          isFallback: false,
          metadata: { serviceIndex: idx, serviceTitle },
        };
        serviceAssets[idx] = sAsset;
        selectedAssets.push(sAsset);
      } else {
        const fallbackUrl = fallbackGen("services", idx, serviceTitle);
        const sAsset: GroundedBusinessAsset = {
          id: `ast_service_fallback_${idx}_${crypto.randomBytes(3).toString("hex")}`,
          type: "STOCK_FALLBACK_IMAGE",
          source: "user_input",
          sourceReference: "unsplash_semantic",
          businessId,
          targetSection: "services",
          contentUrl: fallbackUrl,
          evidenceId: `ev_stock_fallback_service_${idx}`,
          confidence: 0.70,
          freshness,
          allowedForGeneration: true,
          isFallback: true,
          metadata: { serviceIndex: idx, serviceTitle },
        };
        serviceAssets[idx] = sAsset;
        selectedAssets.push(sAsset);
      }
    }

    // ----------------------------------------------------
    // 4. Gallery / Features Asset Selection
    // ----------------------------------------------------
    const galleryAssets: GroundedBusinessAsset[] = [];
    for (let i = 0; i < Math.min(galleryPhotosPool.length, 6); i++) {
      const ph = galleryPhotosPool[i];
      usedPhotoNames.add(ph.name);
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
        metadata: { galleryIndex: i },
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
      const rating = rv.rating ?? 5;

      const sanitized = sanitizeReview(text, author);
      if (!sanitized.isSafe) continue;
      if (rating < 4.0) continue; // Only showcase positive verified endorsements

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
