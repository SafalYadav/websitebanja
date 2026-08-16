"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Wrench, Sparkles, ArrowRight, Layers, Cpu, Gem } from "lucide-react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import EditableElement from "@/components/editor/EditableElement";
import { handleButtonActionClick } from "@/lib/buttonActions";
import type { Service } from "@/types/website";
import { useWebsiteUI } from "@/contexts/WebsiteUIContext";

const SERVICE_ICONS = [Wrench, Sparkles, Layers, Cpu, Gem];

interface ServicesSectionProps {
  sectionKey?: string;
  services?: Service[] | null;
}

export default function ServicesSection({
  sectionKey = "services",
  services,
}: ServicesSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const { publicSlug, onSwitchPage } = useWebsiteUI();
  const context = { siteSlug: publicSlug, onSwitchPage };

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
    <section className="relative py-24 sm:py-32 px-6 sm:px-10 overflow-hidden">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute top-1/3 right-0 h-96 w-96 rounded-full blur-3xl opacity-25 -z-10"
        style={{ backgroundColor: "var(--wb-glow-primary)" }}
      />

      <div className="mx-auto max-w-7xl">
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
            <Wrench className="h-3.5 w-3.5" />
            <span>Specialized Offerings</span>
          </div>

          <h2
            className="text-3xl sm:text-5xl font-extrabold tracking-tight"
            style={{ color: "var(--wb-fg)" }}
          >
            Our Core Services
          </h2>

          <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--wb-muted)" }}>
            High-impact solutions designed with precision, efficiency, and customized to your specific business needs.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {safeServices.map((service, index) => {
            const Icon = SERVICE_ICONS[index % SERVICE_ICONS.length];
            const hasImage = Boolean((service as { image?: string }).image);

            return (
              <motion.article
                key={index}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                whileHover={shouldReduceMotion ? {} : { y: -8 }}
                className="group relative rounded-3xl border backdrop-blur-xl transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl"
                style={{
                  backgroundColor: "var(--wb-surface)",
                  borderColor: "var(--wb-border)",
                }}
              >
                {/* Service Image Header */}
                {hasImage && (
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <EditableElement
                      sectionKey={sectionKey}
                      elementPath={`${sectionKey}[${index}].image`}
                      elementType="image"
                      label="Service Image"
                      className="w-full h-full"
                    >
                      <ImageWithFallback
                        src={(service as { image?: string }).image}
                        alt={service.title || "Service"}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </EditableElement>
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--wb-bg)] via-transparent to-transparent opacity-90 pointer-events-none" />
                  </div>
                )}

                <div className="p-7 space-y-4 flex-1">
                  {/* Icon Container */}
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border shadow-md transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: "var(--wb-glow-primary)",
                      borderColor: "var(--wb-border)",
                      color: "var(--wb-primary)",
                    }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <EditableElement
                    sectionKey={sectionKey}
                    elementPath={`${sectionKey}[${index}].title`}
                    elementType="heading"
                    label={`Service ${index + 1} Title`}
                  >
                    <h3
                      className="text-xl font-bold transition-colors group-hover:text-[var(--wb-primary)]"
                      style={{ color: "var(--wb-fg)" }}
                    >
                      {service.title}
                    </h3>
                  </EditableElement>

                  <EditableElement
                    sectionKey={sectionKey}
                    elementPath={`${sectionKey}[${index}].description`}
                    elementType="paragraph"
                    label={`Service ${index + 1} Details`}
                  >
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--wb-muted)" }}
                    >
                      {service.description}
                    </p>
                  </EditableElement>
                </div>

                {/* Footer Action */}
                <button
                  type="button"
                  onClick={(e) => handleButtonActionClick(service.buttonAction, "contact", e, context)}
                  className="px-7 pb-6 pt-3 border-t border-[var(--wb-border)] flex items-center justify-between text-xs font-bold text-[var(--wb-primary)] cursor-pointer text-left"
                >
                  <span>Explore Offering</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}