"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Wrench, Sparkles, ArrowRight, Layers, Cpu, Gem } from "lucide-react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import EditableElement from "@/components/editor/EditableElement";
import { handleButtonActionClick } from "@/lib/buttonActions";
import type { Service, CardFamily } from "@/types/website";
import { useWebsiteUI } from "@/contexts/WebsiteUIContext";
import { CardRenderer } from "@/components/registry/cardRendererRegistry";

const SERVICE_ICONS = [Wrench, Sparkles, Layers, Cpu, Gem];

interface ServicesSectionProps {
  sectionKey?: string;
  services?: Service[] | null;
  title?: string;
  subtitle?: string;
  badge?: string;
  category?: string;
  cardTreatment?: "bordered" | "glassmorphic" | "elevated" | "flat_minimal" | "subtle_gradient";
  visualArchetype?: string;
  cardFamily?: CardFamily;
}

function getServiceBadge(index: number, category?: string, archetype?: string): string | null {
  const cat = (category || "").toLowerCase();
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("dining")) {
    return index === 0 ? "Chef's Selection" : index === 1 ? "House Special" : "Farm Sourced";
  }
  if (cat.includes("dental") || cat.includes("dentist") || cat.includes("clinic")) {
    return index === 0 ? "3D Guided Care" : index === 1 ? "Sedation Comfort" : "Smile Restorative";
  }
  if (cat.includes("electric") || cat.includes("plumb") || cat.includes("repair")) {
    return index === 0 ? "24/7 Rapid Dispatch" : index === 1 ? "Code Compliant" : "Lifetime Warranty";
  }
  if (cat.includes("ceramic") || cat.includes("pottery") || cat.includes("tableware")) {
    return index === 0 ? "Wheel-Thrown" : index === 1 ? "Small Batch" : "Wood-Fired Kiln";
  }
  if (cat.includes("fashion") || cat.includes("couture")) {
    return index === 0 ? "Atelier Bespoke" : index === 1 ? "Limited Run" : "Pure Cashmere";
  }
  if (cat.includes("architect") || cat.includes("interior")) {
    return index === 0 ? "Spatial Concept" : index === 1 ? "Passive Solar" : "Turnkey Execution";
  }
  if (cat.includes("agency") || cat.includes("creative")) {
    return index === 0 ? "Brand Strategy" : index === 1 ? "Digital Systems" : "Kinetic Visuals";
  }
  if (cat.includes("tech") || cat.includes("saas") || cat.includes("ai") || archetype === "dark_technical") {
    return index === 0 ? "Real-time Telemetry" : index === 1 ? "Cloud Engine" : "Zero Latency";
  }
  return null;
}

function getCategoryServicesCopy(category?: string) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("dining") || cat.includes("bakery") || cat.includes("bistro")) {
    return {
      badge: "Culinary Highlights",
      title: "Signature Offerings & Menu",
      subtitle: "Artisan-crafted dishes and handcrafted beverages prepared with fresh seasonal ingredients.",
    };
  }
  if (cat.includes("dental") || cat.includes("dentist") || cat.includes("clinic")) {
    return {
      badge: "Clinical Care",
      title: "Comprehensive Dental Treatments",
      subtitle: "Modern diagnostic technology paired with gentle, personalized clinical care.",
    };
  }
  if (cat.includes("architect") || cat.includes("interior")) {
    return {
      badge: "Design Disciplines",
      title: "Architectural & Spatial Practice",
      subtitle: "From bespoke residential sanctuaries to visionary commercial developments.",
    };
  }
  if (cat.includes("couture") || (cat.includes("fashion") && !cat.includes("agency"))) {
    return {
      badge: "Atelier Creations",
      title: "Curated Seasonal Collection",
      subtitle: "Masterful tailoring, elevated materials, and timeless aesthetic silhouettes.",
    };
  }
  if (cat.includes("ceramic") || cat.includes("pottery") || cat.includes("tableware") || cat.includes("stoneware")) {
    return {
      badge: "Studio Collections",
      title: "Handcrafted Ceramic Series",
      subtitle: "Functional stoneware and sculptural vessels crafted on the wheel and fired in small batches.",
    };
  }
  if (cat.includes("agency") || cat.includes("branding") || cat.includes("creative studio")) {
    return {
      badge: "Our Capabilities",
      title: "Strategic Design & Creative Services",
      subtitle: "Transforming vision into iconic identity, digital experiences, and measurable cultural impact.",
    };
  }
  if (cat.includes("plumb") || cat.includes("electric") || cat.includes("trade") || cat.includes("repair")) {
    return {
      badge: "Expert Trades",
      title: "Professional Service Solutions",
      subtitle: "Licensed master technicians, upfront pricing, and guaranteed rapid response.",
    };
  }
  if (cat.includes("saas") || cat.includes("tech") || cat.includes("software") || cat.includes("ai")) {
    return {
      badge: "Platform Capabilities",
      title: "Engineered For Peak Performance",
      subtitle: "Automated workflows, scalable cloud infrastructure, and intelligent integrations.",
    };
  }
  return {
    badge: "What We Offer",
    title: "Signature Services & Capabilities",
    subtitle: "Tailored solutions delivered with precision, craftsmanship, and verified standards.",
  };
}

export default function ServicesSection({
  sectionKey = "services",
  services,
  title,
  subtitle,
  badge,
  category,
  cardTreatment,
  visualArchetype,
  cardFamily,
}: ServicesSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const { publicSlug, onSwitchPage } = useWebsiteUI();
  const context = { siteSlug: publicSlug, onSwitchPage };

  const fallbackCopy = getCategoryServicesCopy(category);
  const safeTitle = typeof title === "string" && title.trim() ? title : fallbackCopy.title;
  const safeSubtitle = typeof subtitle === "string" && subtitle.trim() ? subtitle : fallbackCopy.subtitle;
  const safeBadge = typeof badge === "string" && badge.trim() ? badge : fallbackCopy.badge;

  // Defensive array normalization
  const safeServices = Array.isArray(services)
    ? services.filter((s): s is Service & { image?: string } => Boolean(s && typeof s === "object"))
    : [];

  if (safeServices.length === 0) {
    return (
      <section
        className="relative py-16 px-6 sm:px-10 text-center"
        style={{
          backgroundColor: "var(--wb-bg)",
          borderColor: "var(--wb-border)",
        }}
      >
        <div className="mx-auto max-w-xl p-8 rounded-3xl border border-dashed border-[var(--wb-border)]">
          <Wrench className="h-6 w-6 mx-auto mb-2 text-[var(--wb-primary)]" />
          <h3 className="text-base font-bold" style={{ color: "var(--wb-fg)" }}>
            Services Section
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--wb-muted)" }}>
            No services listed yet. Add items in the inspector panel.
          </p>
        </div>
      </section>
    );
  }

  const catLower = (category || "").toLowerCase();
  const isFoodOrDining = catLower.includes("restaurant") || catLower.includes("cafe") || catLower.includes("food") || catLower.includes("bistro") || catLower.includes("bakery");
  const isTradeService = catLower.includes("electric") || catLower.includes("plumb") || catLower.includes("service") || catLower.includes("repair");
  const isTechOrSaaS = catLower.includes("tech") || catLower.includes("saas") || catLower.includes("software") || catLower.includes("ai") || visualArchetype === "dark_technical";
  const isEditorialOrLuxury = visualArchetype === "minimal_editorial" || visualArchetype === "luxury_bespoke" || cardTreatment === "flat_minimal";

  return (
    <section
      className="relative py-24 sm:py-32 px-6 sm:px-10 overflow-hidden isolate"
      style={{
        backgroundColor: "var(--wb-bg)",
      }}
    >
      {/* Soft ambient lighting */}
      <div
        className="pointer-events-none absolute top-1/4 right-0 h-96 w-96 rounded-full blur-3xl opacity-30 z-0"
        style={{ backgroundColor: "var(--wb-glow-primary)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Header Block */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border backdrop-blur-sm"
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
              color: "var(--wb-primary)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{safeBadge}</span>
          </div>

          <EditableElement sectionKey={sectionKey} elementPath={`${sectionKey}.title`} elementType="heading" label="Services Title" className="w-full">
            <h2
              className="text-3xl sm:text-5xl font-extrabold tracking-tight"
              style={{ color: "var(--wb-fg)" }}
            >
              {safeTitle}
            </h2>
          </EditableElement>

          <EditableElement sectionKey={sectionKey} elementPath={`${sectionKey}.subtitle`} elementType="paragraph" label="Services Subtitle" className="w-full">
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--wb-muted)" }}>
              {safeSubtitle}
            </p>
          </EditableElement>
        </div>

        {/* Services Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {safeServices.map((service, index) => {
            const Icon = SERVICE_ICONS[index % SERVICE_ICONS.length];
            const cardBadge = getServiceBadge(index, category, visualArchetype) || service.badge || service.tag;

            const effectiveCardFamily: CardFamily =
              service.cardFamily ||
              cardFamily ||
              (visualArchetype === "clean_clinical"
                ? "perspective"
                : visualArchetype === "minimal_editorial"
                ? "horizontal-media"
                : visualArchetype === "luxury_bespoke"
                ? "horizontal-media"
                : visualArchetype === "dark_technical"
                ? "spotlight"
                : visualArchetype === "expressive_creative"
                ? "spotlight"
                : "service");

            return (
              <div key={index} className="col-span-1">
                <CardRenderer
                  cardFamily={effectiveCardFamily}
                  id={`${sectionKey}-${index}`}
                  title={service.title}
                  description={service.description}
                  tag={cardBadge || undefined}
                  badge={cardBadge || undefined}
                  image={service.image}
                  icon={<Icon className="h-5 w-5" />}
                  index={index}
                  ctaText={isFoodOrDining ? "Inquire / Reserve" : isTradeService ? "Request Immediate Dispatch" : isTechOrSaaS ? "Explore Architecture" : "Explore Offering"}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}