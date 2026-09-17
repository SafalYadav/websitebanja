"use client";

import React from "react";
import type { CardFamily, CardColorTreatment } from "@/types/website";
import {
  BentoCard,
  ExpandableCard,
  StackedCard,
  SpotlightCard,
  ImageRevealCard,
  PerspectiveCard,
  EditorialCard,
  HorizontalMediaCard,
  ProjectShowcaseCard,
  TestimonialStackCard,
  ComparisonCard,
  StatCard,
  ServiceCard,
  FeatureRevealCard,
  FloatingCard,
  MinimalFlatCard,
  ElevatedCard,
  BorderedCard,
  AsymmetricCard,
  ImageLedCard,
  SoftSurfaceCard,
  GlassLayeredCard,
  BrutalistCard,
  LuxuryCard,
  OrganicCard,
  TechnicalCard,
  OversizedTypographyCard,
} from "@/components/cards/CardVariants";
import { resolveCardColorTreatment } from "@/lib/cardStyles";

export interface GenericCardProps {
  cardFamily?: CardFamily | string;
  id?: string;
  title: string;
  description?: string;
  subtitle?: string;
  details?: string;
  image?: string;
  metric?: string;
  metricLabel?: string;
  statusLabel?: string;
  tag?: string;
  badge?: string;
  index?: number;
  icon?: React.ReactNode;
  span?: "col-span-1" | "col-span-2" | "col-span-3";
  features?: string[];
  price?: string;
  ctaText?: string;
  accentColor?: string;
  reviews?: Array<{ author: string; role: string; text: string; rating: number }>;
  comparisonFeatures?: Array<{ name: string; standard: string; pro: string }>;
  sublabel?: string;
  author?: string;
  date?: string;
  visualArchetype?: string;
  colorMood?: string;
  treatment?: CardColorTreatment;
  isDark?: boolean;
}

export function normalizeCardFamily(raw?: string): CardFamily {
  if (!raw) return "bento";
  const s = String(raw).toLowerCase().trim().replace(/[_\s]+/g, "-");

  // 1. Exact or dedicated family matches
  if (s.includes("brutalist")) return "brutalist";
  if (s.includes("luxury") || s.includes("bespoke")) return "luxury";
  if (s.includes("organic") || s.includes("warm-material") || s.includes("warm")) return "organic";
  if (s.includes("technical") || s.includes("cyber")) return "technical";
  if (s.includes("oversized") || s.includes("typography-led")) return "oversized-typography";
  if (s.includes("minimal-flat") || s.includes("flat-minimal") || s === "flat") return "minimal-flat";
  if (s.includes("elevated") || s.includes("elevated-clean")) return "elevated";
  if (s.includes("bordered")) return "bordered";
  if (s.includes("asymmetric")) return "asymmetric";
  if (s.includes("image-led") || s.includes("image-focused")) return "image-led";
  if (s.includes("soft-surface") || s === "soft") return "soft-surface";
  if (s.includes("glass-layered") || s.includes("glassmorphic")) return "glass-layered";
  if (s.includes("editorial") || s.includes("editorial-flow")) return "editorial";
  if (s.includes("horizontal-media") || s.includes("horizontal")) return "horizontal-media";
  if (s.includes("bento") || s.includes("tactile-bento")) return "bento";

  // 2. Interactive and feature families
  if (s.includes("expand")) return "expandable";
  if (s.includes("stacked") || s.includes("stack")) return "stacked";
  if (s.includes("spotlight")) return "spotlight";
  if (s.includes("image-reveal")) return "image-reveal";
  if (s.includes("feature-reveal") || s.includes("reveal")) return "feature-reveal";
  if (s.includes("perspective") || s.includes("depth") || s.includes("3d")) return "perspective";
  if (s.includes("showcase") || s.includes("project") || s.includes("work")) return "project-showcase";
  if (s.includes("testimonial") || s.includes("review")) return "testimonial-stack";
  if (s.includes("comparison") || s.includes("compare")) return "comparison";
  if (s.includes("stat") || s.includes("metric") || s.includes("number")) return "stat";
  if (s.includes("floating")) return "floating";
  if (s.includes("service")) return "service";

  return "bento";
}

/**
 * Universal Card Renderer Registry
 * Dispatches to the 15+ verified, distinct card architecture variants based on cardFamily
 * and binds styling dynamically to the active Design Direction and color system.
 */
export function CardRenderer({
  cardFamily = "bento",
  id,
  title,
  description = "",
  subtitle,
  details,
  image,
  metric,
  metricLabel,
  statusLabel,
  tag,
  badge,
  index = 0,
  icon,
  span,
  features,
  price,
  ctaText,
  accentColor,
  reviews,
  comparisonFeatures,
  sublabel,
  author,
  date,
  visualArchetype,
  treatment,
  isDark,
}: GenericCardProps) {
  const indexStr = String(index + 1).padStart(2, "0");
  const effectiveTag = tag || badge;
  const effectiveDetails = details || description;
  const normalized = normalizeCardFamily(cardFamily);

  const computedTreatment =
    treatment ||
    resolveCardColorTreatment({
      archetype: visualArchetype,
      cardFamily: normalized,
      primaryColor: accentColor,
      isDark,
    });

  switch (normalized) {
    case "minimal-flat":
      return (
        <MinimalFlatCard
          title={title}
          description={description}
          tag={effectiveTag}
          icon={icon}
          treatment={computedTreatment}
        />
      );

    case "elevated":
      return (
        <ElevatedCard
          title={title}
          description={description}
          tag={effectiveTag}
          icon={icon}
          image={image}
          treatment={computedTreatment}
        />
      );

    case "bordered":
      return (
        <BorderedCard
          title={title}
          description={description}
          tag={effectiveTag}
          metric={metric}
          treatment={computedTreatment}
        />
      );

    case "asymmetric":
      return (
        <AsymmetricCard
          title={title}
          description={description}
          tag={effectiveTag}
          index={index}
          treatment={computedTreatment}
        />
      );

    case "image-led":
      return (
        <ImageLedCard
          title={title}
          description={description}
          image={image}
          tag={effectiveTag}
          ctaText={ctaText}
          treatment={computedTreatment}
        />
      );

    case "soft-surface":
      return (
        <SoftSurfaceCard
          title={title}
          description={description}
          tag={effectiveTag}
          icon={icon}
          treatment={computedTreatment}
        />
      );

    case "glass-layered":
      return (
        <GlassLayeredCard
          title={title}
          description={description}
          tag={effectiveTag}
          treatment={computedTreatment}
        />
      );

    case "brutalist":
      return (
        <BrutalistCard
          title={title}
          description={description}
          tag={effectiveTag}
          index={index}
          treatment={computedTreatment}
        />
      );

    case "luxury":
      return (
        <LuxuryCard
          title={title}
          description={description}
          tag={effectiveTag}
          index={index}
          image={image}
          treatment={computedTreatment}
        />
      );

    case "organic":
      return (
        <OrganicCard
          title={title}
          description={description}
          tag={effectiveTag}
          image={image}
          treatment={computedTreatment}
        />
      );

    case "technical":
      return (
        <TechnicalCard
          title={title}
          description={description}
          tag={effectiveTag}
          metric={metric}
          metricLabel={metricLabel || sublabel}
          statusLabel={statusLabel}
          treatment={computedTreatment}
        />
      );

    case "oversized-typography":
      return (
        <OversizedTypographyCard
          title={title}
          description={description}
          metric={metric}
          index={index}
          tag={effectiveTag}
          treatment={computedTreatment}
        />
      );

    case "editorial":
      return (
        <EditorialCard
          issue={`VOL. ${indexStr}`}
          title={title}
          excerpt={description}
          author={author || "Studio Lead"}
          date={date || "CURRENT COLLECTION"}
        />
      );

    case "horizontal-media":
      return (
        <HorizontalMediaCard
          title={title}
          description={description}
          image={image || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"}
          ctaText={ctaText || "Explore Details"}
        />
      );

    case "bento":
      return (
        <BentoCard
          title={title}
          description={description}
          tag={effectiveTag}
          metric={metric}
          metricLabel={metricLabel || sublabel}
          span={span}
          icon={icon}
        />
      );

    case "expandable":
      return (
        <ExpandableCard
          id={id || `card-${index}`}
          title={title}
          subtitle={subtitle || effectiveTag || "Tap to expand"}
          details={effectiveDetails}
          image={image}
        />
      );

    case "stacked":
      return (
        <StackedCard
          cards={[
            { title, desc: description },
            { title: `${title} Architecture`, desc: effectiveDetails },
            { title: "Standard of Precision", desc: metric || "Engineered for maximum reliability and aesthetic impact." },
          ]}
        />
      );

    case "spotlight":
      return (
        <SpotlightCard
          title={title}
          description={description}
          accentColor={accentColor}
        />
      );

    case "image-reveal":
      return (
        <ImageRevealCard
          title={title}
          subtitle={subtitle || effectiveTag || description}
          image={image || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80"}
        />
      );

    case "perspective":
      return (
        <PerspectiveCard
          title={title}
          description={description}
        />
      );

    case "project-showcase":
      return (
        <ProjectShowcaseCard
          title={title}
          category={effectiveTag || subtitle || "Featured Project"}
          image={image || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"}
          stats={metric}
        />
      );

    case "testimonial-stack":
      return (
        <TestimonialStackCard
          reviews={
            reviews && reviews.length > 0
              ? reviews
              : [
                  {
                    author: title,
                    role: subtitle || "Verified Client",
                    text: description,
                    rating: 5,
                  },
                ]
          }
        />
      );

    case "comparison":
      return (
        <ComparisonCard
          title={title}
          description={description}
          standardTitle="Traditional Method"
          proTitle="Our Standard"
          standardValue="Conventional / Delayed"
          proValue={metric || subtitle || "Certified & Immediate"}
          features={comparisonFeatures}
        />
      );

    case "stat":
      return (
        <StatCard
          value={metric || "100%"}
          label={title.toUpperCase()}
          sublabel={description}
        />
      );

    case "service":
      return (
        <ServiceCard
          index={indexStr}
          title={title}
          description={description}
          price={price}
          features={features && features.length > 0 ? features : undefined}
        />
      );

    case "feature-reveal":
      return (
        <FeatureRevealCard
          title={title}
          summary={description}
          deepDive={effectiveDetails}
        />
      );

    case "floating":
      return (
        <FloatingCard
          title={title}
          description={description}
          badge={effectiveTag}
          treatment={computedTreatment}
        />
      );

    default:
      return (
        <BentoCard
          title={title}
          description={description}
          tag={effectiveTag}
          metric={metric}
          span={span}
          icon={icon}
        />
      );
  }
}
