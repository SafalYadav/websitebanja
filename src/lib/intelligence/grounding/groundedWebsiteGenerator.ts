// src/lib/intelligence/grounding/groundedWebsiteGenerator.ts
// Phase 20A — Grounded Website Generator Bridge
// Injects verified business photos, reviews, and grounded facts directly into WebsiteData.
// Strictly enforces anti-fabrication, attribution, and forbidden claims compliance.

import type { WebsiteData, Service, Feature } from "@/types/website";
import type { GroundedAssetSelectionResult } from "./assetTypes";
import type { GroundedBusinessProfile } from "./types";

export interface GroundedGenerationOptions {
  preserveCustomContent?: boolean;
}

/**
 * Applies grounded business intelligence and selected verified assets to a WebsiteData structure.
 */
export function applyGroundedAssetsToWebsite(
  websiteData: WebsiteData,
  assetSelection: GroundedAssetSelectionResult,
  profile: GroundedBusinessProfile,
  _options: GroundedGenerationOptions = {}
): WebsiteData {
  const result: WebsiteData = JSON.parse(JSON.stringify(websiteData));
  result.photoCredits = assetSelection.assets
    .filter((asset) => asset.source === "google_places" && asset.contentUrl && asset.attribution?.displayName)
    .map((asset) => ({ name: asset.attribution!.displayName!, uri: asset.attribution!.uri }))
    .filter((credit, index, credits) => credits.findIndex((item) => item.name === credit.name && item.uri === credit.uri) === index);

  const canonicalName = profile.identity.canonicalName || result.businessName || "Business";
  result.businessName = canonicalName;
  if (result.brand) {
    result.brand.name = canonicalName;
    if (profile.location.city) {
      result.brand.location = profile.location.formattedAddress || profile.location.city;
    }
  }

  // ----------------------------------------------------
  // 1. Hero Section Grounding
  // ----------------------------------------------------
  if (result.hero) {
    if (assetSelection.heroAsset) {
      result.hero.image = assetSelection.heroAsset.contentUrl;
    }

    // Grounded Trust Badges (Anti-Fabrication: Remove unsupported guarantees)
    const groundedTrustBadges: string[] = [];

    // Verified Rating & Review Count
    const ratingFact = profile.factsAndInferences.find(
      (f) => f.type === "OBSERVED_FACT" && f.statement.toLowerCase().includes("rating")
    );
    if (ratingFact) {
      // Extract numbers like "4.8★" and "444 reviews"
      const ratingMatch = ratingFact.statement.match(/(\d+\.\d+)★/);
      const countMatch = ratingFact.statement.match(/(\d+)\s+(?:[\w]+\s+)?reviews/i);
      if (ratingMatch && countMatch) {
        groundedTrustBadges.push(`Google: ${ratingMatch[1]}★ (${countMatch[1]} Reviews)`);
      } else if (ratingMatch) {
        groundedTrustBadges.push(`Google: ${ratingMatch[1]}★ Rating`);
      }
    }

    // Verified Location Badge
    if (profile.location.isVerified && profile.location.city) {
      groundedTrustBadges.push(`Located in ${profile.location.city}`);
    }

    result.hero.trustBadges = groundedTrustBadges;

    // Badges array
    result.hero.badges = [
      ...(ratingFact ? ["Google Rating"] : []),
      "Direct Communication",
      profile.location.city ? `Serving ${profile.location.city}` : "Local Business",
    ];

    // Clean any lingering generic template slogans from hero title
    if (!result.hero.title || /dedicated excellence|high velocity|autonomous architecture|verified local preview/i.test(result.hero.title)) {
      result.hero.title = profile.archetype && profile.archetype !== "unknown"
        ? `${canonicalName} — Premier ${profile.archetype.replace(/_/g, " ")}${profile.location.city ? ` in ${profile.location.city}` : ""}`
        : `${canonicalName}${profile.location.city ? ` — ${profile.location.city}` : ""}`;
    }

    // Ground hero eyebrow in verified business category and location
    if (!result.hero.eyebrow || /verified local preview|home & professional/i.test(result.hero.eyebrow)) {
      const categoryLabel = profile.archetype && profile.archetype !== "unknown"
        ? profile.archetype.replace(/_/g, " ")
        : (result.brand?.industry || "Commercial");
      result.hero.eyebrow = `${categoryLabel} • ${profile.location.city || "Verified Establishment"}`;
    }

    // Ground hero CTA button from observed business strategy
    if (profile.ctaStrategy?.observedCtas && profile.ctaStrategy.observedCtas.length > 0) {
      result.hero.button = profile.ctaStrategy.observedCtas[0].text;
    }

    // Ensure hero subtitle doesn't contain forbidden claims
    if (result.hero.subtitle) {
      result.hero.subtitle = sanitizeForbiddenText(result.hero.subtitle, profile);
    }
  }

  // ----------------------------------------------------
  // 2. About Section Grounding
  // ----------------------------------------------------
  if (result.about) {
    if (assetSelection.aboutAsset) {
      result.about.image = assetSelection.aboutAsset.contentUrl;
    }

    // Build grounded highlights
    const highlights: string[] = [];
    if (profile.location.formattedAddress) {
      highlights.push(`Established premises at ${profile.location.formattedAddress}`);
    }
    const observedServices = profile.services.filter((s) => s.isObserved);
    if (observedServices.length > 0) {
      highlights.push(`Specialized offerings: ${observedServices.slice(0, 3).map((s) => s.name).join(", ")}`);
    }
    const ratingFact = profile.factsAndInferences.find(
      (f) => f.type === "OBSERVED_FACT" && f.statement.toLowerCase().includes("rating")
    );
    if (ratingFact) {
      highlights.push(ratingFact.statement);
    }

    if (highlights.length > 0) {
      result.about.highlights = highlights;
    }

    if (result.about.content) {
      result.about.content = sanitizeForbiddenText(result.about.content, profile);
    }
  }

  // ----------------------------------------------------
  // 3. Services Section Grounding
  // ----------------------------------------------------
  const observedServices = profile.services.filter((s) => s.isObserved && s.confidence >= 0.7);
  if (observedServices.length >= 2) {
    result.services = observedServices.map((obs, idx): Service => {
      const assignedAsset = assetSelection.serviceAssets[idx];
      return {
        title: obs.name,
        description: obs.description || `Contact ${canonicalName} for details, availability, and pricing for ${obs.name}.`,
        image: assignedAsset?.contentUrl,
        badge: obs.isObserved ? "Listed Offering" : undefined,
      };
    });
  } else if (Array.isArray(result.services)) {
    // Preserve existing services but inject grounded service asset images
    result.services = result.services.map((s, idx): Service => {
      const assignedAsset = assetSelection.serviceAssets[idx];
      return {
        ...s,
        image: assignedAsset ? assignedAsset.contentUrl : s.image,
        description: sanitizeForbiddenText(s.description || "", profile),
      };
    });
  }

  // ----------------------------------------------------
  // 4. Features / Visual Gallery Grounding
  // ----------------------------------------------------
  if (assetSelection.galleryAssets.length > 0) {
    const galleryFeatures: Feature[] = assetSelection.galleryAssets.map((asset, i): Feature => {
      const attr = asset.attribution?.displayName;
      return {
        title: `${canonicalName} — Highlight ${i + 1}`,
        description: attr ? `Verified business photograph (Credit: ${attr} via Google Places)` : `Verified business environment at ${canonicalName}`,
        image: asset.contentUrl,
        tag: "Verified Photo",
        badge: "Google Places",
      };
    });

    // If sectionOrder contains "gallery", or if features exists, populate
    if (Array.isArray(result.features) && result.features.length > 0) {
      // Append gallery features or replace features if generic placeholders exist
      const hasGenericFeatures = result.features.every((f) =>
        f.title.includes("Feature") || f.title.includes("Guarantee") || f.title.includes("Dedicated")
      );
      if (hasGenericFeatures && galleryFeatures.length >= 1) {
        result.features = galleryFeatures;
      } else {
        // Merge real photos into existing feature cards
        result.features = result.features.map((f, idx) => {
          const gal = assetSelection.galleryAssets[idx];
          const attr = gal?.attribution?.displayName;
          const desc = attr ? `${f.description} (Credit: ${attr} via Google Places)` : f.description;
          return {
            ...f,
            image: gal?.contentUrl || f.image,
            description: sanitizeForbiddenText(desc || "", profile),
          };
        });
      }
    } else {
      result.features = galleryFeatures;
    }
  }

  // ----------------------------------------------------
  // 5. Reviews Section Grounding (Strict Anti-Fabrication)
  // ----------------------------------------------------
  if (assetSelection.reviewAssets.length > 0) {
    // Populate with authentic verified reviews
    (result as any).reviews = assetSelection.reviewAssets.map((rev) => ({
      name: rev.reviewerName || "Verified Customer",
      role: "Verified Google Review",
      quote: rev.reviewText,
      text: rev.reviewText,
      rating: rev.rating,
      authorUri: rev.attribution?.uri,
    }));
  } else {
    // ZERO VERIFIED REVIEWS AVAILABLE:
    // DO NOT leave synthetic or fabricated reviews ("Rohan Patel", etc.).
    // Remove "reviews" and "testimonials" from sectionOrder, or provide neutral verified standards.
    (result as any).reviews = [];
    if (Array.isArray(result.sectionOrder)) {
      result.sectionOrder = result.sectionOrder.filter(
        (sec) => sec !== "reviews" && sec !== "testimonials" && sec !== "patient_reviews" && sec !== "guest_reviews"
      );
    }
    if (Array.isArray(result.pages)) {
      result.pages = result.pages.map((p) => ({
        ...p,
        sectionOrder: Array.isArray(p.sectionOrder)
          ? p.sectionOrder.filter(
              (sec) => sec !== "reviews" && sec !== "testimonials" && sec !== "patient_reviews" && sec !== "guest_reviews"
            )
          : p.sectionOrder,
      }));
    }
  }

  // ----------------------------------------------------
  // 6. Contact Section Grounding
  // ----------------------------------------------------
  if (result.contact) {
    if (profile.location.formattedAddress) {
      result.contact.address = profile.location.formattedAddress;
    } else if (profile.location.city) {
      result.contact.address = `${canonicalName}, ${profile.location.city}`;
    } else if (result.contact.address && result.contact.address.includes("Gujarat")) {
      result.contact.address = "Commercial Premises";
    }

    if (profile.identity.phone) {
      result.contact.phone = profile.identity.phone;
    } else if (result.contact.phone && result.contact.phone.includes("98250")) {
      result.contact.phone = undefined;
    }

    if (result.contact.email && result.contact.email.includes("@websitebanja.local")) {
      result.contact.email = undefined;
    }
  }

  return result;
}

/**
 * Removes or neutralizes unsupported forbidden claims in generated text.
 */
function sanitizeForbiddenText(text: string, profile: GroundedBusinessProfile): string {
  let cleaned = text;

  // Check forbidden claims
  for (const item of profile.forbiddenClaims) {
    if (item.status === "FORBIDDEN") {
      switch (item.claimType) {
        case "UNSUPPORTED_GUARANTEE":
          cleaned = cleaned.replace(/100%\s+satisfaction\s+guarantee[d]?/gi, "uncompromising commitment to craft");
          cleaned = cleaned.replace(/money\s*back\s+guarantee/gi, "transparent pricing and care");
          cleaned = cleaned.replace(/guaranteed\s+results/gi, "measurable standards");
          break;
        case "UNSUPPORTED_AWARD":
          cleaned = cleaned.replace(/award[\s-]winning/gi, "dedicated");
          cleaned = cleaned.replace(/#1\s+[a-z\s]+/gi, "respected regional provider");
          break;
        case "UNSUPPORTED_EXPERIENCE_YEARS":
          cleaned = cleaned.replace(/\b\d{2}\+?\s+years\s+(of\s+)?experience\b/gi, "trusted experience");
          break;
        case "FABRICATED_STATISTIC":
          cleaned = cleaned.replace(/99%|98%|95%|100%/g, "proven");
          break;
      }
    }
  }

  return cleaned;
}
