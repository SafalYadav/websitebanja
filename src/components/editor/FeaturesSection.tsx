"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Shield, Zap, TrendingUp, CheckCircle, Award } from "lucide-react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import EditableElement from "@/components/editor/EditableElement";
import type { Feature } from "@/types/website";

const FEATURE_ICONS = [Sparkles, Shield, Zap, TrendingUp, CheckCircle, Award];

interface FeaturesSectionProps {
  sectionKey?: string;
  features?: Feature[] | null;
}

export default function FeaturesSection({
  sectionKey = "features",
  features,
}: FeaturesSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  // Bulletproof defensive normalization
  const safeFeatures = Array.isArray(features)
    ? features.filter((f): f is Feature & { image?: string } => Boolean(f && typeof f === "object"))
    : [];

  if (safeFeatures.length === 0) {
    return (
      <section
        className="relative py-16 px-6 sm:px-10 border-y text-center"
        style={{
          backgroundColor: "var(--wb-bg-alt)",
          borderColor: "var(--wb-border)",
        }}
      >
        <div className="mx-auto max-w-xl p-8 rounded-3xl border border-dashed border-[var(--wb-border)]">
          <Sparkles className="h-6 w-6 mx-auto mb-2 text-[var(--wb-secondary)]" />
          <h3 className="text-base font-bold" style={{ color: "var(--wb-fg)" }}>
            Features Section
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--wb-muted)" }}>
            No feature items present. Add features in the inspector or choose another section.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative py-24 sm:py-32 px-6 sm:px-10 border-y overflow-hidden"
      style={{
        backgroundColor: "var(--wb-bg-alt)",
        borderColor: "var(--wb-border)",
      }}
    >
      {/* Soft ambient lighting */}
      <div
        className="pointer-events-none absolute top-1/3 left-0 h-96 w-96 rounded-full blur-3xl opacity-25 -z-10"
        style={{ backgroundColor: "var(--wb-glow-secondary)" }}
      />

      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border backdrop-blur-sm"
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
              color: "var(--wb-secondary)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Key Advantages</span>
          </div>

          <h2
            className="text-3xl sm:text-5xl font-extrabold tracking-tight"
            style={{ color: "var(--wb-fg)" }}
          >
            Why Clients Choose Us
          </h2>

          <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--wb-muted)" }}>
            Engineered from the ground up for exceptional quality, uncompromising reliability, and rapid results.
          </p>
        </div>

        {/* Features Bento Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {safeFeatures.map((feature, index) => {
            const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
            const hasImage = Boolean((feature as { image?: string }).image);
            const isFeatured = index === 0 && safeFeatures.length > 2;

            return (
              <motion.div
                key={index}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                whileHover={shouldReduceMotion ? {} : { y: -6 }}
                className={`group relative rounded-3xl border p-8 backdrop-blur-xl transition-all duration-300 shadow-xl flex flex-col justify-between overflow-hidden ${
                  isFeatured ? "sm:col-span-2 lg:col-span-2" : ""
                }`}
                style={{
                  backgroundColor: "var(--wb-surface)",
                  borderColor: "var(--wb-border)",
                }}
              >
                {/* Background image if featured */}
                {isFeatured && hasImage && (
                  <div className="absolute inset-0 -z-10 opacity-20 transition-transform duration-700 group-hover:scale-105">
                    <ImageWithFallback
                      src={(feature as { image?: string }).image}
                      alt={feature.title || "Feature"}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--wb-bg-alt)] via-transparent to-[var(--wb-bg-alt)]" />
                  </div>
                )}

                <div>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border mb-6 transition-transform group-hover:scale-105 shadow-md"
                    style={{
                      backgroundColor: "var(--wb-glow-secondary)",
                      borderColor: "var(--wb-border)",
                      color: "var(--wb-secondary)",
                    }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <EditableElement
                    sectionKey={sectionKey}
                    elementPath={`${sectionKey}[${index}].title`}
                    elementType="heading"
                    label={`Feature ${index + 1} Title`}
                  >
                    <h3
                      className="text-xl sm:text-2xl font-bold"
                      style={{ color: "var(--wb-fg)" }}
                    >
                      {feature.title}
                    </h3>
                  </EditableElement>

                  <EditableElement
                    sectionKey={sectionKey}
                    elementPath={`${sectionKey}[${index}].description`}
                    elementType="paragraph"
                    label={`Feature ${index + 1} Description`}
                    className="mt-3"
                  >
                    <p
                      className="text-sm sm:text-base leading-relaxed"
                      style={{ color: "var(--wb-muted)" }}
                    >
                      {feature.description}
                    </p>
                  </EditableElement>
                </div>

                <div
                  className="mt-8 h-1 w-12 rounded-full transition-all duration-300 group-hover:w-full"
                  style={{ background: "var(--wb-gradient-primary)" }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}