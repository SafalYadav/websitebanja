"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import EditableElement from "@/components/editor/EditableElement";

export interface ProcessStep {
  step?: number | string;
  title?: string;
  description?: string;
}

interface ProcessSectionProps {
  sectionKey?: string;
  steps?: ProcessStep[] | null;
  title?: string;
  subtitle?: string;
  badge?: string;
  category?: string;
}

function getCategoryProcessCopy(category?: string) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("dental") || cat.includes("clinic") || cat.includes("doctor")) {
    return {
      badge: "PATIENT JOURNEY",
      title: "Your Gentle Care Experience",
      subtitle: "A thoughtful, anxiety-free journey from initial scan to lasting confidence.",
    };
  }
  if (cat.includes("architect") || cat.includes("design") || cat.includes("spatial")) {
    return {
      badge: "DESIGN METHODOLOGY",
      title: "From Vision to Realization",
      subtitle: "Our rigorous architectural process shaping space, light, and natural materials.",
    };
  }
  if (cat.includes("saas") || cat.includes("software") || cat.includes("ai") || cat.includes("tech")) {
    return {
      badge: "PLATFORM ARCHITECTURE",
      title: "How Our Engine Executes",
      subtitle: "Engineered for high throughput, sub-millisecond latency, and automated reliability.",
    };
  }
  if (cat.includes("electric") || cat.includes("service") || cat.includes("trade")) {
    return {
      badge: "DISPATCH TIMELINE",
      title: "Rapid 4-Step Resolution",
      subtitle: "Fast, transparent emergency dispatch and certified master repair.",
    };
  }
  return {
    badge: "HOW IT WORKS",
    title: "Our Proven Workflow",
    subtitle: "A seamless, transparent progression designed for clarity and uncompromising quality.",
  };
}

export default function ProcessSection({
  sectionKey = "treatment_process",
  steps,
  title,
  subtitle,
  badge,
  category,
}: ProcessSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const defaults = getCategoryProcessCopy(category);
  const cat = (category || "").toLowerCase();

  const safeTitle = typeof title === "string" && title.trim() ? title : defaults.title;
  const safeSubtitle = typeof subtitle === "string" && subtitle.trim() ? subtitle : defaults.subtitle;
  const safeBadge = typeof badge === "string" && badge.trim() ? badge : defaults.badge;

  const rawSteps = Array.isArray(steps)
    ? steps.filter((s): s is ProcessStep => Boolean(s && typeof s === "object"))
    : [];

  const safeSteps = rawSteps.length > 0
    ? rawSteps.map((s, idx) => ({
        step: s.step || idx + 1,
        title: typeof s.title === "string" && s.title.trim() ? s.title : `Phase ${idx + 1}`,
        description:
          typeof s.description === "string" && s.description.trim()
            ? s.description
            : "Executed with rigorous standards and dedicated attention to every detail.",
      }))
    : cat.includes("saas") || cat.includes("software") || cat.includes("ai") || cat.includes("tech")
    ? [
        { step: 1, title: "Data Ingestion & Modeling", description: "Seamless API connections and unified schema synchronization across environments." },
        { step: 2, title: "Algorithmic Pipeline", description: "High-throughput real-time processing powered by distributed compute architecture." },
        { step: 3, title: "Automated Deployment", description: "Zero-downtime execution with automated rollback safeguards and telemetry." },
        { step: 4, title: "Continuous Monitoring", description: "Sub-second observability, alerting, and automated performance optimization." },
      ]
    : [
        { step: 1, title: "Initial Consultation", description: "Comprehensive discovery and detailed alignment on your specific goals." },
        { step: 2, title: "Precision Planning", description: "Bespoke design and strategy crafted to address your unique requirements." },
        { step: 3, title: "Flawless Execution", description: "Expert implementation utilizing high-grade craft and verified standards." },
        { step: 4, title: "Lasting Support", description: "Ongoing dedication and care to ensure enduring performance and satisfaction." },
      ];

  return (
    <section
      className="relative py-24 sm:py-32 px-6 sm:px-10 border-y overflow-hidden isolate"
      style={{
        backgroundColor: "var(--wb-bg)",
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
              color: "var(--wb-primary)",
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{safeBadge}</span>
          </div>

          <EditableElement sectionKey={sectionKey} elementPath={`${sectionKey}.title`} elementType="heading" label="Process Title" className="w-full">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ color: "var(--wb-fg)" }}>
              {safeTitle}
            </h2>
          </EditableElement>

          <EditableElement sectionKey={sectionKey} elementPath={`${sectionKey}.subtitle`} elementType="paragraph" label="Process Subtitle" className="w-full">
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--wb-muted)" }}>
              {safeSubtitle}
            </p>
          </EditableElement>
        </div>

        {/* Step Progression Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
          {safeSteps.map((stepItem, index) => (
            <motion.div
              key={index}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              whileHover={shouldReduceMotion ? {} : { y: -4 }}
              className="group relative rounded-3xl border p-7 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-xl"
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
              }}
            >
              <div>
                {/* Step Number Badge */}
                <div className="flex items-center justify-between mb-6">
                  <span
                    className="inline-flex h-9 px-3.5 items-center justify-center rounded-xl text-xs font-black tracking-wider uppercase border"
                    style={{
                      backgroundColor: "var(--wb-glow-primary)",
                      borderColor: "var(--wb-border)",
                      color: "var(--wb-primary)",
                    }}
                  >
                    STEP {String(stepItem.step).padStart(2, "0")}
                  </span>
                  {index < safeSteps.length - 1 && (
                    <ArrowRight className="h-4 w-4 hidden lg:block opacity-30 group-hover:opacity-70 group-hover:translate-x-1 transition-all" style={{ color: "var(--wb-muted)" }} />
                  )}
                </div>

                <EditableElement
                  sectionKey={sectionKey}
                  elementPath={`${sectionKey}[${index}].title`}
                  elementType="heading"
                  label={`Step ${index + 1} Title`}
                >
                  <h3 className="text-lg font-bold tracking-tight mb-2.5" style={{ color: "var(--wb-fg)" }}>
                    {stepItem.title}
                  </h3>
                </EditableElement>

                <EditableElement
                  sectionKey={sectionKey}
                  elementPath={`${sectionKey}[${index}].description`}
                  elementType="paragraph"
                  label={`Step ${index + 1} Details`}
                >
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--wb-muted)" }}>
                    {stepItem.description}
                  </p>
                </EditableElement>
              </div>

              <div
                className="mt-6 h-0.5 w-8 rounded-full transition-all duration-300 group-hover:w-full"
                style={{ background: "var(--wb-gradient-primary)" }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
