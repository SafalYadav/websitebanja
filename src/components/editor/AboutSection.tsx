"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Compass, CheckCircle2, HeartHandshake, Sparkles } from "lucide-react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import EditableElement from "@/components/editor/EditableElement";
import type { About } from "@/types/website";

interface AboutSectionProps extends Partial<About> {
  sectionKey?: string;
  image?: string;
}

export default function AboutSection({
  sectionKey = "about",
  title,
  content,
  image,
}: AboutSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  const safeTitle = typeof title === "string" && title.trim() ? title : "Driven by Passion, Built for Impact";
  const safeContent =
    typeof content === "string" && content.trim()
      ? content
      : "We are a dedicated team of innovators, craftsmen, and problem solvers committed to delivering exceptional experiences that empower our clients to stand out and thrive in competitive markets.";

  return (
    <section
      className="relative py-24 sm:py-32 px-6 sm:px-10 border-y overflow-hidden"
      style={{
        backgroundColor: "var(--wb-bg-alt)",
        borderColor: "var(--wb-border)",
      }}
    >
      {/* Ambient background lighting */}
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full blur-3xl opacity-20 -z-10"
        style={{ backgroundColor: "var(--wb-glow-secondary)" }}
      />

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Editorial Image Composition */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-5 order-2 lg:order-1 relative"
          >
            <div
              className="relative rounded-3xl border p-3 shadow-2xl backdrop-blur-xl overflow-hidden group"
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
                boxShadow: "0 20px 40px -12px var(--wb-glow-secondary)",
              }}
            >
              <div className="relative aspect-[4/3] sm:aspect-square w-full rounded-2xl overflow-hidden">
                <EditableElement
                  sectionKey={sectionKey}
                  elementPath={`${sectionKey}.image`}
                  elementType="image"
                  label="About Photo"
                  className="w-full h-full"
                >
                  <ImageWithFallback
                    src={image}
                    alt={safeTitle}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </EditableElement>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating Story Stamp Badge */}
              <div
                className="absolute top-6 right-6 rounded-2xl px-3.5 py-2 border backdrop-blur-xl shadow-xl flex items-center gap-2 pointer-events-none"
                style={{
                  backgroundColor: "var(--wb-surface)",
                  borderColor: "var(--wb-border)",
                }}
              >
                <Sparkles className="h-4 w-4 text-[var(--wb-primary)]" />
                <span className="text-xs font-bold" style={{ color: "var(--wb-fg)" }}>
                  Verified Quality
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Narrative Story & Core Highlights */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="lg:col-span-7 space-y-6 order-1 lg:order-2"
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border backdrop-blur-sm"
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
                color: "var(--wb-primary)",
              }}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>About Our Mission</span>
            </div>

            <EditableElement
              sectionKey={sectionKey}
              elementPath={`${sectionKey}.title`}
              elementType="heading"
              label="About Title"
              className="w-full"
            >
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-balance"
                style={{ color: "var(--wb-fg)" }}
              >
                {safeTitle}
              </h2>
            </EditableElement>

            <EditableElement
              sectionKey={sectionKey}
              elementPath={`${sectionKey}.content`}
              elementType="paragraph"
              label="About Story"
              className="w-full"
            >
              <p
                className="text-base sm:text-lg leading-relaxed whitespace-pre-line"
                style={{ color: "var(--wb-muted)" }}
              >
                {safeContent}
              </p>
            </EditableElement>

            {/* Core Value Checklist */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                "Client-First Focus",
                "Uncompromising Precision",
                "Transparent Communication",
                "Continuous Innovation",
              ].map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl border backdrop-blur-sm"
                  style={{
                    backgroundColor: "var(--wb-surface)",
                    borderColor: "var(--wb-border)",
                  }}
                >
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-lg flex-shrink-0"
                    style={{ background: "var(--wb-glow-primary)", color: "var(--wb-primary)" }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: "var(--wb-fg)" }}>
                    {point}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2 text-xs font-semibold" style={{ color: "var(--wb-muted)" }}>
              <HeartHandshake className="h-4 w-4 text-[var(--wb-primary)]" />
              <span>Committed to long-term partnerships and client success</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}