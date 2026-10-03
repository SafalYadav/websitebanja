"use client";

import { Wrench, Sparkles, Layers, Cpu, Gem } from "lucide-react";
import EditableElement from "@/components/editor/EditableElement";
import type { Service, CardFamily } from "@/types/website";
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

function getServicesFallbackCopy() {
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
  category: _category,
  cardTreatment,
  visualArchetype,
  cardFamily,
}: ServicesSectionProps) {
  const fallbackCopy = getServicesFallbackCopy();
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

  return (
    <section
      id={sectionKey}
      data-section-type="services"
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
            const cardBadge = service.badge || service.tag;

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
                  treatment={typeof cardTreatment === "object" ? cardTreatment : undefined}
                  visualArchetype={visualArchetype}
                  ctaText="Explore Offering"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
