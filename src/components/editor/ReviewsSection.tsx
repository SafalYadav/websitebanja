"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Star, Quote, CheckCircle } from "lucide-react";
import EditableElement from "@/components/editor/EditableElement";
import type { CardFamily, CardColorTreatment } from "@/types/website";
import { CardRenderer } from "@/components/registry/cardRendererRegistry";

export interface ReviewItem {
  name?: string;
  author?: string;
  client?: string;
  title?: string;
  text?: string;
  quote?: string;
  review?: string;
  description?: string;
  role?: string;
  rating?: number;
  authorUri?: string;
}

interface ReviewsSectionProps {
  sectionKey?: string;
  reviews?: ReviewItem[] | null;
  title?: string;
  subtitle?: string;
  badge?: string;
  category?: string;
  cardFamily?: CardFamily;
  cardTreatment?: CardColorTreatment | string;
  visualArchetype?: string;
}

function getCategoryReviewsCopy(category?: string) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("dental") || cat.includes("clinic") || cat.includes("doctor")) {
    return {
      badge: "PATIENT TESTIMONIALS",
      title: "Real Stories of Restored Smiles",
      subtitle: "Read how our gentle, anxiety-free care transformed our patients' health and confidence.",
    };
  }
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("dining")) {
    return {
      badge: "GUEST EXPERIENCES",
      title: "Praised by Diners & Critics",
      subtitle: "Memorable dining moments, artisan flavors, and warm hospitality.",
    };
  }
  if (cat.includes("architect") || cat.includes("spatial")) {
    return {
      badge: "CLIENT VOICES",
      title: "Trusted by Discerning Commissioners",
      subtitle: "What clients say about our architectural rigor, contextual sensitivity, and spatial artistry.",
    };
  }
  if (cat.includes("agency") || cat.includes("branding") || cat.includes("creative studio")) {
    return {
      badge: "CLIENT ENDORSEMENTS",
      title: "Trusted by High-Growth Brands",
      subtitle: "What founders and creative leaders say about our strategic vision and design execution.",
    };
  }
  if (cat.includes("ceramic") || cat.includes("pottery") || cat.includes("tableware")) {
    return {
      badge: "COLLECTOR REVIEWS",
      title: "Cherished in Homes & Studios Worldwide",
      subtitle: "Read feedback from collectors who live with our handcrafted ceramics every day.",
    };
  }
  if (cat.includes("electric") || cat.includes("service") || cat.includes("trade")) {
    return {
      badge: "VERIFIED REVIEWS",
      title: "Trusted Across the Neighborhood",
      subtitle: "Hundreds of homeowners and businesses rely on our 24/7 master technicians.",
    };
  }
  return {
    badge: "CLIENT FEEDBACK",
    title: "What Our Clients Say",
    subtitle: "Real experiences and genuine endorsements from partners who value our standards.",
  };
}

export default function ReviewsSection({
  sectionKey = "reviews",
  reviews,
  title,
  subtitle,
  badge,
  category,
  cardFamily,
  cardTreatment,
  visualArchetype,
}: ReviewsSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const defaults = getCategoryReviewsCopy(category);

  const safeTitle = typeof title === "string" && title.trim() ? title : defaults.title;
  const safeSubtitle = typeof subtitle === "string" && subtitle.trim() ? subtitle : defaults.subtitle;
  const safeBadge = typeof badge === "string" && badge.trim() ? badge : defaults.badge;

  const rawReviews = Array.isArray(reviews)
    ? reviews.filter((r): r is ReviewItem => Boolean(r && typeof r === "object"))
    : [];

  const safeReviews = rawReviews
    .filter((r) => Boolean((r.text || r.quote || r.review || r.description)?.trim()))
    .map((r, idx) => {
        const name = (r.name || r.author || r.client || r.title || `Client Review ${idx + 1}`).trim();
        const text = (r.text || r.quote || r.review || r.description || "").trim();
        const role = (r.role || "").trim();
        const rating = typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5 ? r.rating : undefined;
        const authorUri = r.authorUri?.startsWith("https://") ? r.authorUri : undefined;
        return { name, text, role, rating, authorUri };
      });

  if (safeReviews.length === 0) return null;

  return (
    <section
      className="relative py-24 sm:py-32 px-6 sm:px-10 border-y overflow-hidden isolate"
      style={{
        backgroundColor: "var(--wb-bg-alt)",
        borderColor: "var(--wb-border)",
      }}
    >
      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border backdrop-blur-sm"
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
              color: "var(--wb-secondary)",
            }}
          >
            <Quote className="h-3.5 w-3.5" />
            <span>{safeBadge}</span>
          </div>

          <EditableElement sectionKey={sectionKey} elementPath={`${sectionKey}.title`} elementType="heading" label="Reviews Title" className="w-full">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ color: "var(--wb-fg)" }}>
              {safeTitle}
            </h2>
          </EditableElement>

          <EditableElement sectionKey={sectionKey} elementPath={`${sectionKey}.subtitle`} elementType="paragraph" label="Reviews Subtitle" className="w-full">
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--wb-muted)" }}>
              {safeSubtitle}
            </p>
          </EditableElement>
        </div>

        {/* Testimonials Presentation */}
        {cardFamily === "testimonial-stack" && safeReviews.every((r) => r.rating !== undefined) ? (
          <div className="max-w-2xl mx-auto">
            <CardRenderer
              cardFamily="testimonial-stack"
              title={safeReviews[0]?.name || "Client Review"}
              reviews={safeReviews.map((r) => ({
                author: r.name,
                role: r.role,
                text: r.text,
                rating: r.rating!,
              }))}
            />
          </div>
        ) : cardFamily === "stacked" ? (
          <div className="max-w-xl mx-auto">
            <CardRenderer
              cardFamily="stacked"
              title={safeReviews[0]?.name || "Client Review"}
              description={safeReviews[0]?.text}
              details={safeReviews[1]?.text}
              metric={safeReviews[2]?.text}
            />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {safeReviews.map((item, index) => {
              const reviewFamily = cardFamily || "editorial";
              return (
                <div key={index} className="col-span-1">
                  <CardRenderer
                    cardFamily={reviewFamily}
                    id={`${sectionKey}-${index}`}
                    title={item.name}
                    subtitle={item.role}
                    description={item.text}
                    tag={item.role}
                    badge={item.rating !== undefined ? `${item.rating.toFixed(1)} ★` : undefined}
                    treatment={typeof cardTreatment === "object" ? cardTreatment : undefined}
                    visualArchetype={visualArchetype}
                    index={index}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
          {safeReviews.filter((item) => item.authorUri).map((item, index) => (
            <a key={index} href={item.authorUri} target="_blank" rel="noopener noreferrer">
              {item.name} · Google review
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
