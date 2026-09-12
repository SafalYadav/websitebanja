"use client";

import React from "react";
import type { CardFamily } from "@/types/website";
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
} from "@/components/cards/CardVariants";

export interface GenericCardProps {
  cardFamily?: CardFamily | string;
  id?: string;
  title: string;
  description?: string;
  subtitle?: string;
  details?: string;
  image?: string;
  metric?: string;
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
}

/**
 * Universal Card Renderer Registry
 * Dispatches to the 15 verified, distinct card architecture variants based on cardFamily.
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
}: GenericCardProps) {
  const indexStr = String(index + 1).padStart(2, "0");
  const effectiveTag = tag || badge;
  const effectiveDetails = details || description;

  switch (cardFamily) {
    case "bento":
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
