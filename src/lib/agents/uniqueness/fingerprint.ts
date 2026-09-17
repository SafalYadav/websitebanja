// src/lib/agents/uniqueness/fingerprint.ts
import type { WebsiteData } from "@/types/website";
import type { DesignFingerprint } from "@/lib/agents/skills/types";
import { extractDesignFingerprint } from "@/lib/agents/skills/designFingerprint";

export interface DetailedDesignFingerprint extends DesignFingerprint {
  sectionTypes: string[];
  totalSections: number;
  heroCtaAction?: string;
  has3dSpatial: boolean;
  backgroundType: string;
  primaryColorKey: string;
  images: string[];
  servicesCardFamily?: string;
  featuresCardFamily?: string;
  reviewsCardFamily?: string;
  featuresLayoutVariant?: string;
  featuresGeometry?: string;
  featuresCardArrangement?: string;
  featuresAnimationStrategy?: string;
  featuresIconTreatment?: string;
  featuresMetricTreatment?: string;
  colorDirection: string;
  paletteFingerprint?: string;
  imageFingerprint?: string;
  imageSourceFingerprint?: string;
  sectionVisualFingerprint?: string;
}

/**
 * Extracts and normalizes unique image URLs/IDs present in website AST.
 */
export function extractImagesFromData(data: Record<string, any>): string[] {
  const images = new Set<string>();
  const normalize = (url: unknown) => {
    if (typeof url === "string" && url.trim().length > 0) {
      // Normalize Unsplash or static image URLs to their base id/path to catch identical photos
      const clean = url.split("?")[0].trim();
      if (clean) images.add(clean);
    }
  };

  if (data.hero?.image) normalize(data.hero.image);
  if (data.hero?.backgroundImage) normalize(data.hero.backgroundImage);
  if (data.hero?.atmosphereImage) normalize(data.hero.atmosphereImage);
  if (data.about?.image) normalize(data.about.image);
  if (data.about?.backgroundImage) normalize(data.about.backgroundImage);
  if (Array.isArray(data.gallery?.images)) {
    data.gallery.images.forEach((img: any) => normalize(typeof img === "string" ? img : img?.url));
  }
  if (Array.isArray(data.services?.items)) {
    data.services.items.forEach((s: any) => normalize(s?.image));
  }
  if (Array.isArray(data.features?.items)) {
    data.features.items.forEach((f: any) => normalize(f?.image));
  }
  if (Array.isArray(data.team?.members)) {
    data.team.members.forEach((m: any) => normalize(m?.avatar || m?.image));
  }
  return Array.from(images);
}

/**
 * Extracts an enriched design fingerprint from a website AST for rigorous similarity evaluation.
 */
export function extractDetailedDesignFingerprint(
  data: Partial<WebsiteData> | Record<string, any>
): DetailedDesignFingerprint {
  const base = extractDesignFingerprint(data);

  // If input already has fingerprint fields directly on it, preserve them
  if (data.heroType && !data.hero) base.heroType = data.heroType;
  if (data.navigationType && !data.navbar) base.navigationType = data.navigationType;
  if (data.visualArchetype && !data.style) base.visualArchetype = data.visualArchetype;
  if (data.typographyStyle && !data.typography) base.typographyStyle = data.typographyStyle;
  if (data.colorDirection && !data.brand) base.colorDirection = data.colorDirection;
  if (data.cardStyle && !data.cardFamily) base.cardStyle = data.cardStyle;
  if (data.animationStyle) base.animationStyle = data.animationStyle;
  if (data.layoutType) base.layoutType = data.layoutType;

  const hero = data.hero || {};
  const brand = data.brand || {};
  const spatial = data.spatial3d || data.spatial || {};

  const sectionOrder = base.sectionOrder;
  const sectionTypes = Array.from(new Set(sectionOrder));

  const primaryColor = brand.primaryColor || data.primaryColor || data.colorDirection || "default";
  const primaryColorKey = String(primaryColor).toLowerCase().replace(/[^a-z0-9]/g, "_");
  const images = extractImagesFromData(data);

  const backgroundType =
    data.designStrategy?.backgroundStrategy?.type ||
    data.backgroundStyle?.type ||
    data.backgroundType ||
    "solid";

  const primaryCardFamily =
    data.designStrategy?.cardFamilyStrategy?.primaryCardFamily ||
    data.cardFamily ||
    data.cardStyle ||
    base.cardStyle;

  if (primaryCardFamily) {
    base.cardStyle = primaryCardFamily;
  }

  const servicesCardFamily =
    data.designStrategy?.cardFamilyStrategy?.servicesCardFamily ||
    (Array.isArray(data.services) && (data.services[0] as any)?.cardFamily) ||
    undefined;

  const featuresCardFamily =
    data.designStrategy?.cardFamilyStrategy?.featuresCardFamily ||
    (Array.isArray(data.features) && (data.features[0] as any)?.cardFamily) ||
    undefined;

  const reviewsCardFamily =
    data.designStrategy?.cardFamilyStrategy?.reviewsCardFamily ||
    undefined;

  const featStrat =
    data.designStrategy?.featuresLayoutStrategy ||
    (data as any).featuresLayoutStrategy;
  const featuresLayoutVariant = featStrat?.layoutVariant || undefined;
  const featuresGeometry = featStrat?.cardGeometry || undefined;
  const featuresCardArrangement = featStrat?.layoutVariant || undefined;
  const featuresAnimationStrategy = featStrat?.animationStrategy || undefined;
  const featuresIconTreatment = featStrat?.iconTreatment || undefined;
  const featuresMetricTreatment = featStrat?.metricTreatment || undefined;

  const stratColorSystem = data.designStrategy?.colorSystem || {};
  const paletteName = stratColorSystem.paletteName || stratColorSystem.mood || primaryColorKey;
  const colorDirection = paletteName;
  const paletteFingerprint = `${paletteName}_${stratColorSystem.primary || primaryColorKey}_${stratColorSystem.secondary || ""}_${stratColorSystem.accent || ""}`.toLowerCase();
  const sortedImages = [...images].sort();
  const imageFingerprint = sortedImages.length > 0 ? sortedImages.map((img) => img.split("/photo-")[1]?.split("?")[0] || img).join("|") : "no-images";
  const imageSourceFingerprint = `unsplash_verified:${images.length}`;
  const sectionVisualFingerprint = `${sectionOrder.join("-")}_feat:${featuresLayoutVariant || "default"}_geom:${featuresGeometry || "default"}_serv:${servicesCardFamily || "default"}`;

  return {
    ...base,
    sectionTypes,
    totalSections: sectionOrder.length,
    heroCtaAction: hero.cta?.action?.type || hero.buttonAction || "scroll",
    has3dSpatial: Boolean(spatial.enabled && spatial.level !== "NONE"),
    backgroundType,
    primaryColorKey,
    images,
    servicesCardFamily,
    featuresCardFamily,
    reviewsCardFamily,
    featuresLayoutVariant,
    featuresGeometry,
    featuresCardArrangement,
    featuresAnimationStrategy,
    featuresIconTreatment,
    featuresMetricTreatment,
    colorDirection,
    paletteFingerprint,
    imageFingerprint,
    imageSourceFingerprint,
    sectionVisualFingerprint,
  };
}
