"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Shield, Zap, TrendingUp, CheckCircle, Award } from "lucide-react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import EditableElement from "@/components/editor/EditableElement";
import type { Feature, CardFamily } from "@/types/website";
import { CardRenderer } from "@/components/registry/cardRendererRegistry";

const FEATURE_ICONS = [Sparkles, Shield, Zap, TrendingUp, CheckCircle, Award];

interface FeaturesSectionProps {
  sectionKey?: string;
  features?: Feature[] | null;
  title?: string;
  subtitle?: string;
  badge?: string;
  category?: string;
  cardTreatment?: "bordered" | "glassmorphic" | "elevated" | "flat_minimal" | "subtle_gradient";
  visualArchetype?: string;
  cardFamily?: CardFamily;
}

function getFeatureMetric(index: number, category?: string, archetype?: string): string | null {
  const cat = (category || "").toLowerCase();
  if (cat.includes("tech") || cat.includes("saas") || cat.includes("software") || cat.includes("ai") || archetype === "dark_technical") {
    return index === 0 ? "99.99% Uptime SLA" : index === 1 ? "< 15ms Latency" : "SOC2 Type II";
  }
  if (cat.includes("dental") || cat.includes("clinic") || cat.includes("medical")) {
    return index === 0 ? "100% Pain-Free Care" : index === 1 ? "Digital 3D Diagnostics" : "Board Certified";
  }
  if (cat.includes("electric") || cat.includes("plumb") || cat.includes("repair")) {
    return index === 0 ? "30-Min Rapid Arrival" : index === 1 ? "100% Upfront Pricing" : "Licensed & Bonded";
  }
  if (cat.includes("ceramic") || cat.includes("pottery") || cat.includes("stoneware")) {
    return index === 0 ? "100% Handcrafted Stoneware" : index === 1 ? "Food-Safe Mineral Glaze" : "High-Fire 1260°C";
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
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("dining")) {
    return index === 0 ? "Farm-to-Table Fresh" : index === 1 ? "Single-Origin Beans" : "Master Chef Curated";
  }
  return index === 0 ? "Verified Standards" : index === 1 ? "Dedicated Care" : null;
}

function getCategoryFeaturesCopy(category?: string) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("dining") || cat.includes("bakery") || cat.includes("bistro")) {
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
}: FeaturesSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  const fallbackCopy = getCategoryFeaturesCopy(category);
  const safeTitle = typeof title === "string" && title.trim() ? title : fallbackCopy.title;
  const safeSubtitle = typeof subtitle === "string" && subtitle.trim() ? subtitle : fallbackCopy.subtitle;
  const safeBadge = typeof badge === "string" && badge.trim() ? badge : fallbackCopy.badge;

  const rawFeatures = Array.isArray(features)
    ? features.filter((f): f is Feature & { image?: string; name?: string; text?: string } => Boolean(f && typeof f === "object"))
    : [];

  const safeFeatures: Array<Feature & { image?: string }> = rawFeatures
    .map((f, idx) => {
      const itemTitle = (f.title || f.name || "").trim();
      const itemDesc = (f.description || f.text || "").trim();
      if (!itemTitle && !itemDesc) return null;
      const result: Feature & { image?: string } = {
        title: itemTitle || `Key Advantage ${idx + 1}`,
        description: itemDesc || "Engineered with meticulous craft, rigorous standards, and dedicated client focus.",
        image: f.image,
        icon: f.icon,
      };
      return result;
    })
    .filter((f): f is Feature & { image?: string } => f !== null);

  if (safeFeatures.length === 0) {
    return null;
  }

  const catLower = (category || "").toLowerCase();
  const isTechOrSaaS = catLower.includes("tech") || catLower.includes("saas") || catLower.includes("software") || catLower.includes("ai") || visualArchetype === "dark_technical";

  return (
    <section
      className="relative py-24 sm:py-32 px-6 sm:px-10 border-y overflow-hidden isolate"
      style={{
        backgroundColor: "var(--wb-bg-alt)",
        borderColor: "var(--wb-border)",
      }}
    >
      {/* Soft ambient lighting */}
      <div
        className="pointer-events-none absolute top-1/3 left-0 h-96 w-96 rounded-full blur-3xl opacity-30 z-0"
        style={{ backgroundColor: "var(--wb-glow-secondary)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
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

          <EditableElement sectionKey={sectionKey} elementPath={`${sectionKey}.subtitle`} elementType="paragraph" label="Features Subtitle" className="w-full">
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--wb-muted)" }}>
              {safeSubtitle}
            </p>
          </EditableElement>
        </div>

        {/* Features Dynamic Card Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {safeFeatures.map((feature, index) => {
            const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
            const isFeatured = index === 0 && safeFeatures.length > 2;
            const metric = getFeatureMetric(index, category, visualArchetype) || (feature as any).metric;

            const effectiveCardFamily: CardFamily =
              (feature as any).cardFamily ||
              cardFamily ||
              (visualArchetype === "clean_clinical"
                ? "comparison"
                : visualArchetype === "luxury_bespoke"
                ? "image-reveal"
                : visualArchetype === "minimal_editorial"
                ? "editorial"
                : visualArchetype === "warm_artisanal"
                ? "editorial"
                : visualArchetype === "expressive_creative"
                ? "feature-reveal"
                : visualArchetype === "high_trust_service"
                ? "comparison"
                : "bento");

            return (
              <div
                key={index}
                className={isFeatured && effectiveCardFamily === "bento" ? "sm:col-span-2 lg:col-span-2" : "col-span-1"}
              >
                <CardRenderer
                  cardFamily={effectiveCardFamily}
                  id={`${sectionKey}-${index}`}
                  title={feature.title}
                  description={feature.description}
                  tag={feature.badge || (feature as any).tag}
                  badge={feature.badge}
                  metric={metric || undefined}
                  image={(feature as any).image}
                  icon={<Icon className="h-5 w-5" />}
                  index={index}
                  span={isFeatured ? "col-span-2" : "col-span-1"}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}