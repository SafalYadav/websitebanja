"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  Shield,
  Zap,
  TrendingUp,
  CheckCircle,
  Award,
  Coffee,
  Heart,
  Star,
  Compass,
} from "lucide-react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import EditableElement from "@/components/editor/EditableElement";
import type {
  Feature,
  CardFamily,
  CardColorTreatment,
  FeaturesLayoutStrategyConfig,
  FeaturesCardGeometry,
  FeaturesAnimationStrategy,
} from "@/types/website";
import { getCategoryImages } from "@/lib/categoryImages";

const FEATURE_ICONS = [Sparkles, Shield, Zap, TrendingUp, CheckCircle, Award, Coffee, Heart, Star, Compass];

interface FeaturesSectionProps {
  sectionKey?: string;
  features?: Feature[] | null;
  title?: string;
  subtitle?: string;
  badge?: string;
  category?: string;
  cardTreatment?: CardColorTreatment | "bordered" | "glassmorphic" | "elevated" | "flat_minimal" | "subtle_gradient";
  visualArchetype?: string;
  cardFamily?: CardFamily;
  featuresLayoutStrategy?: FeaturesLayoutStrategyConfig;
  is3d?: boolean;
}

function getFeatureMetric(index: number, category?: string, archetype?: string): string | null {
  const cat = (category || "").toLowerCase();
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("dining") || cat.includes("coffee") || archetype === "warm_artisanal") {
    return index === 0 ? "Single-Origin Sourced" : index === 1 ? "Roasted Weekly" : "Direct Ethical Trade";
  }
  if (cat.includes("tech") || cat.includes("saas") || cat.includes("software") || cat.includes("ai") || archetype === "dark_technical") {
    return index === 0 ? "99.99% Uptime SLA" : index === 1 ? "< 15ms Query Latency" : "SOC2 Type II Certified";
  }
  if (cat.includes("dental") || cat.includes("clinic") || cat.includes("medical")) {
    return index === 0 ? "100% Pain-Free Care" : index === 1 ? "Digital 3D Diagnostics" : "Board Certified Specialists";
  }
  if (cat.includes("electric") || cat.includes("plumb") || cat.includes("repair")) {
    return index === 0 ? "30-Min Rapid Arrival" : index === 1 ? "100% Upfront Pricing" : "Licensed & Bonded";
  }
  if (cat.includes("ceramic") || cat.includes("pottery") || cat.includes("stoneware")) {
    return index === 0 ? "100% Handcrafted Stoneware" : index === 1 ? "Food-Safe Mineral Glaze" : "High-Fire 1260°C Kiln";
  }
  if (cat.includes("fashion") || cat.includes("couture") || cat.includes("atelier")) {
    return index === 0 ? "European Master Tailoring" : index === 1 ? "Pure Silk & Cashmere" : "Zero-Waste Atelier";
  }
  if (cat.includes("architect") || cat.includes("interior")) {
    return index === 0 ? "Published Works" : index === 1 ? "Sustainable Passivhaus" : "Bespoke Spatial Craft";
  }
  if (cat.includes("agency") || cat.includes("creative")) {
    return index === 0 ? "Global Design Awards" : index === 1 ? "Founder-Led Sprints" : "10x Brand Impact";
  }
  return index === 0 ? "Verified Standards" : index === 1 ? "Dedicated Craft" : "Uncompromising Quality";
}

function getFeatureMetricLabel(index: number, category?: string): string {
  const cat = (category || "").toLowerCase();
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("dining") || cat.includes("coffee")) {
    return index === 0 ? "SOURCING" : index === 1 ? "ROAST STANDARD" : "ETHICAL TRADE";
  }
  if (cat.includes("tech") || cat.includes("saas") || cat.includes("software") || cat.includes("ai")) {
    return index === 0 ? "AVAILABILITY" : index === 1 ? "PERFORMANCE" : "COMPLIANCE";
  }
  if (cat.includes("dental") || cat.includes("clinic") || cat.includes("medical")) {
    return index === 0 ? "PATIENT CARE" : index === 1 ? "DIAGNOSTICS" : "CREDENTIALS";
  }
  if (cat.includes("electric") || cat.includes("plumb") || cat.includes("repair")) {
    return index === 0 ? "RESPONSE TIME" : index === 1 ? "TRANSPARENCY" : "GUARANTEE";
  }
  if (cat.includes("ceramic") || cat.includes("pottery") || cat.includes("stoneware")) {
    return index === 0 ? "ARTISANAL FORM" : index === 1 ? "SAFETY" : "KILN PROCESS";
  }
  return index === 0 ? "STANDARD" : index === 1 ? "INTEGRITY" : "COMMITMENT";
}

function getCategoryFeaturesCopy(category?: string) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("dining") || cat.includes("bakery") || cat.includes("bistro") || cat.includes("coffee")) {
    return {
      badge: "The Experience",
      title: "Why Dine With Us",
      subtitle: "Artisanal sourcing, warm hospitality, and a welcoming dining atmosphere.",
    };
  }
  if (cat.includes("dental") || cat.includes("dentist") || cat.includes("clinic")) {
    return {
      badge: "Patient Excellence",
      title: "The Standard of Care",
      subtitle: "Comfortable procedures, sterile modern facilities, and compassionate clinical experts.",
    };
  }
  if (cat.includes("architect") || cat.includes("interior")) {
    return {
      badge: "Design Rigor",
      title: "Our Architectural Principles",
      subtitle: "Contextual sensitivity, structural elegance, and sustainable material craftsmanship.",
    };
  }
  if (cat.includes("couture") || (cat.includes("fashion") && !cat.includes("agency"))) {
    return {
      badge: "Atelier Standards",
      title: "The Art of Sartorial Craft",
      subtitle: "Uncompromising attention to detail, heirloom quality, and bespoke craftsmanship.",
    };
  }
  if (cat.includes("ceramic") || cat.includes("pottery") || cat.includes("tableware") || cat.includes("stoneware")) {
    return {
      badge: "Craft Heritage",
      title: "Artisanal Clay & Glaze Standards",
      subtitle: "Wheel-thrown integrity, durable high-fire stoneware, and toxic-free food-safe glazes.",
    };
  }
  if (cat.includes("agency") || cat.includes("branding") || cat.includes("creative studio")) {
    return {
      badge: "Agency Values",
      title: "Why Forward-Thinking Brands Choose Us",
      subtitle: "Uncompromising craft, high-velocity iteration, and measurable business growth.",
    };
  }
  if (cat.includes("plumb") || cat.includes("electric") || cat.includes("trade") || cat.includes("repair")) {
    return {
      badge: "Customer Guarantee",
      title: "The Reliable Choice",
      subtitle: "Upfront pricing, certified master tradespeople, and 100% guaranteed workmanship.",
    };
  }
  if (cat.includes("saas") || cat.includes("tech") || cat.includes("software") || cat.includes("ai")) {
    return {
      badge: "Core Advantages",
      title: "Built For Modern Scale",
      subtitle: "Sub-millisecond latency, bank-grade encryption, and seamless team collaboration.",
    };
  }
  return {
    badge: "Key Advantages",
    title: "Why Clients Choose Us",
    subtitle: "Built with precision, uncompromising reliability, and dedicated support.",
  };
}

function getGeometryClass(geom: FeaturesCardGeometry): string {
  switch (geom) {
    case "sharp":
      return "rounded-none";
    case "rounded-standard":
      return "rounded-2xl";
    case "rounded-heavy":
      return "rounded-3xl";
    case "pill-subtle":
      return "rounded-2xl";
    case "asymmetric-squircle":
      return "rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md";
    case "bordered-flat":
      return "rounded-xl border-2 shadow-none";
    default:
      return "rounded-2xl";
  }
}

function getAnimationVariants(strategy: FeaturesAnimationStrategy, index: number, shouldReduceMotion: boolean | null): {
  initial: any;
  whileInView: any;
  transition: any;
} {
  if (shouldReduceMotion) {
    return {
      initial: { opacity: 1 },
      whileInView: { opacity: 1 },
      transition: { duration: 0 },
    };
  }
  const delay = index * 0.1;
  switch (strategy) {
    case "horizontal-reveal":
      return {
        initial: { opacity: 0, x: -25 },
        whileInView: { opacity: 1, x: 0 },
        transition: { duration: 0.5, delay, ease: "easeOut" },
      };
    case "clip-path-reveal":
      return {
        initial: { opacity: 0, scale: 0.94 },
        whileInView: { opacity: 1, scale: 1 },
        transition: { duration: 0.55, delay, ease: "easeOut" },
      };
    case "scale-reveal":
      return {
        initial: { opacity: 0, scale: 0.9 },
        whileInView: { opacity: 1, scale: 1 },
        transition: { duration: 0.5, delay, ease: "easeOut" },
      };
    case "editorial-slide":
      return {
        initial: { opacity: 0, x: 20 },
        whileInView: { opacity: 1, x: 0 },
        transition: { duration: 0.5, delay, ease: "easeOut" },
      };
    case "masked-text-reveal":
      return {
        initial: { opacity: 0, y: 15 },
        whileInView: { opacity: 1, y: 0 },
        transition: { duration: 0.45, delay, ease: "easeOut" },
      };
    case "subtle-parallax":
      return {
        initial: { opacity: 0, y: index % 2 === 0 ? 15 : 30 },
        whileInView: { opacity: 1, y: 0 },
        transition: { duration: 0.6, delay, ease: "easeOut" },
      };
    case "minimal-motion":
      return {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        transition: { duration: 0.2, delay },
      };
    case "fade-up-stagger":
    default:
      return {
        initial: { opacity: 0, y: 25 },
        whileInView: { opacity: 1, y: 0 },
        transition: { duration: 0.5, delay, ease: "easeOut" },
      };
  }
}

export default function FeaturesSection({
  sectionKey = "features",
  features,
  title,
  subtitle,
  badge,
  category,
  cardTreatment,
  visualArchetype,
  cardFamily,
  featuresLayoutStrategy,
  is3d,
}: FeaturesSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  const fallbackCopy = getCategoryFeaturesCopy(category);
  const safeTitle = typeof title === "string" && title.trim() ? title : fallbackCopy.title;
  const safeSubtitle = typeof subtitle === "string" && subtitle.trim() ? subtitle : fallbackCopy.subtitle;
  const safeBadge = typeof badge === "string" && badge.trim() ? badge : fallbackCopy.badge;

  // Fallback images from curated pool for image-led layouts
  const categoryImages = getCategoryImages(category);
  const fallbackFeatureImages = categoryImages.features || categoryImages.services || [];

  const rawFeatures = Array.isArray(features)
    ? features.filter((f): f is Feature & { image?: string; name?: string; text?: string } => Boolean(f && typeof f === "object"))
    : [];

  const safeFeatures: Array<Feature & { image?: string; metric?: string; metricLabel?: string }> = rawFeatures
    .map((f, idx) => {
      const itemTitle = (f.title || f.name || "").trim();
      const itemDesc = (f.description || f.text || "").trim();
      if (!itemTitle && !itemDesc) return null;
      const metricVal = (f as any).metric || getFeatureMetric(idx, category, visualArchetype);
      const metricLabelVal = (f as any).metricLabel || getFeatureMetricLabel(idx, category);
      const result: Feature & { image?: string; metric?: string; metricLabel?: string } = {
        title: itemTitle || `Key Advantage ${idx + 1}`,
        description: itemDesc || "Engineered with meticulous craft, rigorous standards, and dedicated client focus.",
        image: f.image || fallbackFeatureImages[idx % (fallbackFeatureImages.length || 1)],
        icon: f.icon,
        metric: metricVal || undefined,
        metricLabel: metricLabelVal || undefined,
      };
      return result;
    })
    .filter((f): f is Feature & { image?: string; metric?: string; metricLabel?: string } => f !== null);

  if (safeFeatures.length === 0) {
    return null;
  }

  // Active Strategy
  const strategy: FeaturesLayoutStrategyConfig = featuresLayoutStrategy || {
    layoutVariant: "asymmetric-editorial",
    cardGeometry: "rounded-standard",
    density: "standard",
    dividerStyle: "subtle-border",
    iconTreatment: "inline-icon",
    animationStrategy: "fade-up-stagger",
    metricTreatment: "contextual-tag",
    headerAlignment: "center",
    spatialComposition: is3d ? "layered-depth" : "none",
  };

  const geomClass = getGeometryClass(strategy.cardGeometry);
  const hasSpatial = Boolean(is3d || (strategy.spatialComposition && strategy.spatialComposition !== "none"));

  // Density padding
  const sectionPy =
    strategy.density === "compact"
      ? "py-16 sm:py-20"
      : strategy.density === "spacious"
      ? "py-32 sm:py-40"
      : "py-24 sm:py-32";

  // Section Header Renderer
  const renderHeader = () => {
    const isSplit = strategy.headerAlignment === "split";
    const isLeft = strategy.headerAlignment === "left" || isSplit;

    return (
      <div
        className={
          isSplit
            ? "flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 pb-8 border-b border-[var(--wb-border)]"
            : isLeft
            ? "text-left max-w-2xl mb-16 space-y-3"
            : "text-center max-w-2xl mx-auto mb-16 space-y-3"
        }
      >
        <div className={isSplit ? "max-w-xl space-y-3" : "space-y-3"}>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border backdrop-blur-sm"
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
              color: "var(--wb-secondary)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{safeBadge}</span>
          </div>

          <EditableElement sectionKey={sectionKey} elementPath={`${sectionKey}.title`} elementType="heading" label="Features Title" className="w-full">
            <h2
              className="text-3xl sm:text-5xl font-extrabold tracking-tight"
              style={{ color: "var(--wb-fg)" }}
            >
              {safeTitle}
            </h2>
          </EditableElement>
        </div>

        <div className={isSplit ? "max-w-md" : ""}>
          <EditableElement sectionKey={sectionKey} elementPath={`${sectionKey}.subtitle`} elementType="paragraph" label="Features Subtitle" className="w-full">
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--wb-muted)" }}>
              {safeSubtitle}
            </p>
          </EditableElement>
        </div>
      </div>
    );
  };

  // Icon / Marker Renderer
  const renderIconOrMarker = (feature: Feature & { image?: string; metric?: string; metricLabel?: string }, index: number) => {
    const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
    switch (strategy.iconTreatment) {
      case "numbered-feature":
        return (
          <span className="font-mono text-2xl sm:text-3xl font-black text-[var(--wb-primary)]">
            {String(index + 1).padStart(2, "0")}
          </span>
        );
      case "oversized-icon":
        return (
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center border shadow-xs"
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
              color: "var(--wb-primary)",
            }}
          >
            <Icon className="h-7 w-7" />
          </div>
        );
      case "icon-and-label":
        return (
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border"
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
              color: "var(--wb-primary)",
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{feature.metricLabel || `ADVANTAGE 0${index + 1}`}</span>
          </div>
        );
      case "decorative-glyph":
        return <span className="text-2xl font-black text-[var(--wb-primary)]">✦</span>;
      case "image-thumbnail":
        return (
          <div className="h-12 w-12 rounded-xl overflow-hidden relative border border-[var(--wb-border)] shrink-0 shadow-xs">
            <ImageWithFallback src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
          </div>
        );
      case "abstract-shape":
        return (
          <div
            className="h-11 w-11 rounded-lg rotate-3 flex items-center justify-center border"
            style={{
              backgroundColor: "color-mix(in srgb, var(--wb-primary) 12%, transparent)",
              borderColor: "color-mix(in srgb, var(--wb-primary) 30%, transparent)",
              color: "var(--wb-primary)",
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
        );
      case "no-icon":
        return null;
      case "inline-icon":
      default:
        return (
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center border shadow-xs"
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
              color: "var(--wb-primary)",
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
        );
    }
  };

  // Metric Banner Renderer
  const renderMetric = (feature: Feature & { metric?: string; metricLabel?: string }) => {
    if (!feature.metric || strategy.metricTreatment === "none") return null;
    return (
      <div className="mt-6 pt-4 border-t border-[var(--wb-border)] flex items-baseline justify-between gap-4">
        <span className="text-xl sm:text-2xl font-black text-[var(--wb-primary)] font-mono">
          {feature.metric}
        </span>
        {feature.metricLabel && (
          <span className="text-xs text-[var(--wb-muted)] font-mono uppercase tracking-wider">
            {feature.metricLabel}
          </span>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // LAYOUT VARIANT RENDERERS (8 Real Compositions)
  // ---------------------------------------------------------------------------

  // A. ASYMMETRIC EDITORIAL (Hero left/right dominant card + stacked supporting cards)
  const renderAsymmetricEditorial = () => {
    const dominant = safeFeatures[0];
    const secondary = safeFeatures.slice(1);
    const mediaLeft = strategy.mediaPlacement === "left";

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Dominant Card */}
        <motion.div
          {...getAnimationVariants(strategy.animationStrategy, 0, shouldReduceMotion)}
          className={`lg:col-span-7 flex flex-col justify-between p-8 sm:p-12 border ${geomClass} ${
            mediaLeft ? "lg:order-1" : "lg:order-2"
          } ${hasSpatial ? "shadow-2xl hover:translate-y-[-4px] transition-transform duration-300" : ""}`}
          style={{
            backgroundColor: "var(--wb-surface)",
            borderColor: "var(--wb-border)",
          }}
        >
          {dominant.image && (
            <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden mb-8 border border-[var(--wb-border)]">
              <ImageWithFallback src={dominant.image} alt={dominant.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {renderIconOrMarker(dominant, 0)}
              {dominant.metricLabel && (
                <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-full bg-[var(--wb-surface-hover)] border border-[var(--wb-border)] text-[var(--wb-muted)]">
                  {dominant.metricLabel}
                </span>
              )}
            </div>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: "var(--wb-fg)" }}>
              {dominant.title}
            </h3>
            <p className="text-base sm:text-lg leading-relaxed" style={{ color: "var(--wb-muted)" }}>
              {dominant.description}
            </p>
          </div>
          {renderMetric(dominant)}
        </motion.div>

        {/* Supporting Secondary Cards */}
        <div className={`lg:col-span-5 flex flex-col gap-6 justify-between ${mediaLeft ? "lg:order-2" : "lg:order-1"}`}>
          {secondary.map((feat, idx) => (
            <motion.div
              key={idx + 1}
              {...getAnimationVariants(strategy.animationStrategy, idx + 1, shouldReduceMotion)}
              className={`p-6 sm:p-8 border ${geomClass} flex flex-col justify-between flex-1 ${
                hasSpatial ? "shadow-lg hover:translate-y-[-2px] transition-transform duration-300" : ""
              }`}
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {renderIconOrMarker(feat, idx + 1)}
                  {feat.metricLabel && (
                    <span className="text-xs font-mono uppercase text-[var(--wb-muted)]">
                      {feat.metricLabel}
                    </span>
                  )}
                </div>
                <h4 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "var(--wb-fg)" }}>
                  {feat.title}
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: "var(--wb-muted)" }}>
                  {feat.description}
                </p>
              </div>
              {renderMetric(feat)}
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  // B. THREE-COLUMN GRID (Equal columns, strong vertical rhythm)
  const renderThreeColumnGrid = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {safeFeatures.map((feature, index) => (
          <motion.div
            key={index}
            {...getAnimationVariants(strategy.animationStrategy, index, shouldReduceMotion)}
            className={`p-8 border ${geomClass} flex flex-col justify-between group ${
              hasSpatial ? "shadow-lg hover:translate-y-[-4px] transition-transform duration-300" : ""
            }`}
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {renderIconOrMarker(feature, index)}
                {feature.metricLabel && (
                  <span className="text-xs font-mono uppercase text-[var(--wb-muted)]">
                    {feature.metricLabel}
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "var(--wb-fg)" }}>
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--wb-muted)" }}>
                {feature.description}
              </p>
            </div>
            {renderMetric(feature)}
          </motion.div>
        ))}
      </div>
    );
  };

  // C. HORIZONTAL STORY (Wide stacked rows with horizontal content progression)
  const renderHorizontalStory = () => {
    return (
      <div className="flex flex-col space-y-6">
        {safeFeatures.map((feature, index) => (
          <motion.div
            key={index}
            {...getAnimationVariants(strategy.animationStrategy, index, shouldReduceMotion)}
            className={`p-6 sm:p-10 border ${geomClass} flex flex-col md:flex-row md:items-center justify-between gap-6 group ${
              hasSpatial ? "shadow-md hover:translate-x-2 transition-transform duration-300" : ""
            }`}
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
            }}
          >
            <div className="flex items-start sm:items-center gap-6 md:w-1/3">
              <div className="shrink-0">{renderIconOrMarker(feature, index)}</div>
              <div>
                {feature.metricLabel && (
                  <span className="text-xs font-mono uppercase text-[var(--wb-secondary)] block mb-1">
                    {feature.metricLabel}
                  </span>
                )}
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "var(--wb-fg)" }}>
                  {feature.title}
                </h3>
              </div>
            </div>

            <div className="md:w-1/2">
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--wb-muted)" }}>
                {feature.description}
              </p>
            </div>

            {feature.metric && (
              <div className="md:w-1/6 md:text-right shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[var(--wb-border)]">
                <span className="text-xl font-black text-[var(--wb-primary)] font-mono block">
                  {feature.metric}
                </span>
                <span className="text-[10px] uppercase font-mono text-[var(--wb-muted)]">Verified</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  // D. FEATURE TIMELINE (Vertical connecting rail with progression nodes)
  const renderFeatureTimeline = () => {
    return (
      <div className="relative max-w-4xl mx-auto pl-6 sm:pl-10 space-y-12">
        {/* Connecting visual spine */}
        <div
          className="absolute left-2.5 sm:left-4 top-4 bottom-4 w-0.5"
          style={{ backgroundColor: "var(--wb-border)" }}
        />

        {safeFeatures.map((feature, index) => (
          <motion.div
            key={index}
            {...getAnimationVariants(strategy.animationStrategy, index, shouldReduceMotion)}
            className="relative flex items-start gap-6 group"
          >
            {/* Timeline node */}
            <div
              className="absolute -left-6 sm:-left-10 mt-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-primary)",
              }}
            >
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--wb-primary)" }} />
            </div>

            {/* Timeline content card */}
            <div
              className={`p-6 sm:p-8 border ${geomClass} w-full ${
                hasSpatial ? "shadow-md hover:translate-y-[-2px] transition-transform duration-300" : ""
              }`}
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="font-mono text-sm font-bold text-[var(--wb-primary)]">
                  PHASE 0${index + 1}
                </span>
                {feature.metricLabel && (
                  <span className="text-xs font-mono uppercase text-[var(--wb-muted)]">
                    {feature.metricLabel}
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--wb-fg)" }}>
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--wb-muted)" }}>
                {feature.description}
              </p>
              {renderMetric(feature)}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // E. BENTO FEATURES (Dynamic multi-span 12-col staggered bento, NOT old 3-col bento)
  const renderBentoFeatures = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {safeFeatures.map((feature, index) => {
          let spanClass = "md:col-span-4";
          if (index === 0) spanClass = "md:col-span-8";
          else if (index === 1) spanClass = "md:col-span-4";
          else if (index === 2) spanClass = "md:col-span-12";
          else spanClass = "md:col-span-6";

          return (
            <motion.div
              key={index}
              {...getAnimationVariants(strategy.animationStrategy, index, shouldReduceMotion)}
              className={`${spanClass} p-8 border ${geomClass} flex flex-col justify-between group ${
                hasSpatial ? "shadow-xl hover:translate-y-[-3px] transition-transform duration-300" : ""
              }`}
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
              }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  {renderIconOrMarker(feature, index)}
                  {feature.metricLabel && (
                    <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-[var(--wb-surface-hover)] border border-[var(--wb-border)] text-[var(--wb-muted)]">
                      {feature.metricLabel}
                    </span>
                  )}
                </div>
                <h3
                  className={`font-black tracking-tight ${index === 0 ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}
                  style={{ color: "var(--wb-fg)" }}
                >
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--wb-muted)" }}>
                  {feature.description}
                </p>
              </div>
              {renderMetric(feature)}
            </motion.div>
          );
        })}
      </div>
    );
  };

  // F. OVERSIZED TYPOGRAPHIC (Headline-led dominant display typography)
  const renderOversizedTypographic = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
        {safeFeatures.map((feature, index) => (
          <motion.div
            key={index}
            {...getAnimationVariants(strategy.animationStrategy, index, shouldReduceMotion)}
            className="flex flex-col justify-between pt-6 border-t-2 space-y-6 group"
            style={{ borderColor: "var(--wb-primary)" }}
          >
            <div>
              <span className="font-mono text-5xl sm:text-6xl font-black text-[var(--wb-primary)]/40 block mb-4 group-hover:text-[var(--wb-primary)] transition-colors">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-2xl sm:text-4xl font-black tracking-tight mb-4" style={{ color: "var(--wb-fg)" }}>
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--wb-muted)" }}>
                {feature.description}
              </p>
            </div>
            {renderMetric(feature)}
          </motion.div>
        ))}
      </div>
    );
  };

  // G. IMAGE-LED FEATURES (Integrated contextual photography for every card)
  const renderImageLedFeatures = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {safeFeatures.map((feature, index) => (
          <motion.div
            key={index}
            {...getAnimationVariants(strategy.animationStrategy, index, shouldReduceMotion)}
            className={`border ${geomClass} overflow-hidden flex flex-col justify-between group ${
              hasSpatial ? "shadow-xl hover:translate-y-[-4px] transition-transform duration-300" : ""
            }`}
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
            }}
          >
            {feature.image && (
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <ImageWithFallback
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                {feature.metricLabel && (
                  <span className="absolute bottom-3 left-3 text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white border border-white/20">
                    {feature.metricLabel}
                  </span>
                )}
              </div>
            )}
            <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 space-y-4">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "var(--wb-fg)" }}>
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--wb-muted)" }}>
                  {feature.description}
                </p>
              </div>
              {renderMetric(feature)}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // H. EDITORIAL SPLIT (Sticky left narrative headline + stacked right detail cards)
  const renderEditorialSplit = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Sticky Left Narrative */}
        <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border"
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
              color: "var(--wb-secondary)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{safeBadge}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight" style={{ color: "var(--wb-fg)" }}>
            {safeTitle}
          </h2>

          <p className="text-base sm:text-lg leading-relaxed" style={{ color: "var(--wb-muted)" }}>
            {safeSubtitle}
          </p>

          <div className="pt-6 border-t border-[var(--wb-border)] flex items-center gap-4">
            <span className="font-mono text-3xl font-black text-[var(--wb-primary)]">
              {safeFeatures.length}+
            </span>
            <span className="text-xs uppercase font-mono text-[var(--wb-muted)] leading-tight">
              Foundational Principles of Quality
            </span>
          </div>
        </div>

        {/* Stacked Right Detail Cards */}
        <div className="lg:col-span-7 space-y-6">
          {safeFeatures.map((feature, index) => (
            <motion.div
              key={index}
              {...getAnimationVariants(strategy.animationStrategy, index, shouldReduceMotion)}
              className={`p-6 sm:p-8 border ${geomClass} ${
                hasSpatial ? "shadow-md hover:translate-x-2 transition-transform duration-300" : ""
              }`}
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
              }}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0">{renderIconOrMarker(feature, index)}</div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-tight" style={{ color: "var(--wb-fg)" }}>
                      {feature.title}
                    </h3>
                    {feature.metricLabel && (
                      <span className="text-xs font-mono uppercase text-[var(--wb-muted)]">
                        {feature.metricLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--wb-muted)" }}>
                    {feature.description}
                  </p>
                  {renderMetric(feature)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  // Dispatch layout variant
  const renderLayoutContent = () => {
    switch (strategy.layoutVariant) {
      case "asymmetric-editorial":
        return renderAsymmetricEditorial();
      case "three-column-grid":
        return renderThreeColumnGrid();
      case "horizontal-story":
        return renderHorizontalStory();
      case "feature-timeline":
        return renderFeatureTimeline();
      case "bento-features":
        return renderBentoFeatures();
      case "oversized-typographic":
        return renderOversizedTypographic();
      case "image-led-features":
        return renderImageLedFeatures();
      case "editorial-split":
        return renderEditorialSplit();
      default:
        return renderThreeColumnGrid();
    }
  };

  return (
    <section
      className={`relative ${sectionPy} px-6 sm:px-10 border-y overflow-hidden isolate`}
      data-wb-features-layout={strategy.layoutVariant}
      data-wb-spatial={hasSpatial ? "true" : undefined}
      style={{
        backgroundColor: "var(--wb-bg-alt)",
        borderColor: "var(--wb-border)",
        ...(hasSpatial
          ? {
              perspective: "1200px",
              transformStyle: "preserve-3d",
            }
          : {}),
      }}
    >
      {/* Soft atmospheric ambient glow */}
      <div
        className="pointer-events-none absolute top-1/3 left-0 h-96 w-96 rounded-full blur-3xl opacity-20 z-0"
        style={{ backgroundColor: "var(--wb-glow-secondary)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* For split layouts, header is rendered inside the layout grid */}
        {strategy.layoutVariant !== "editorial-split" && renderHeader()}
        {renderLayoutContent()}
      </div>
    </section>
  );
}
