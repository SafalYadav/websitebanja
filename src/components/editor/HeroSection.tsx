"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, ArrowRight, Zap, ShieldCheck, Clock } from "lucide-react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import EditableElement from "@/components/editor/EditableElement";
import type { Hero } from "@/types/website";

interface HeroSectionProps extends Partial<Hero> {
  sectionKey?: string;
  image?: string;
}

export default function HeroSection({
  sectionKey = "hero",
  title,
  subtitle,
  button,
  image,
}: HeroSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  const safeTitle = typeof title === "string" && title.trim() ? title : "Crafting Excellence For Modern Clients";
  const safeSubtitle =
    typeof subtitle === "string" && subtitle.trim()
      ? subtitle
      : "Discover tailored solutions, superior craftsmanship, and dedicated service designed to accelerate your growth.";
  const safeButton = typeof button === "string" && button.trim() ? button : "Explore Services";

  return (
    <section
      className="relative overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-32 px-6 sm:px-10 flex flex-col justify-center min-h-[85vh] transition-colors duration-300"
      style={{ backgroundColor: "var(--wb-bg)" }}
    >
      {/* Animated Layered Background Glow Orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  scale: [1, 1.15, 1],
                  opacity: [0.4, 0.65, 0.4],
                }
          }
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(ellipse at center, var(--wb-glow-primary), transparent 70%)",
          }}
        />

        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: [0, 25, 0],
                  y: [0, -20, 0],
                  scale: [1, 1.1, 1],
                }
          }
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -right-20 h-[450px] w-[450px] rounded-full blur-3xl opacity-40"
          style={{
            background: "radial-gradient(ellipse at center, var(--wb-glow-secondary), transparent 70%)",
          }}
        />

        <div
          className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full blur-3xl opacity-30"
          style={{
            background: "radial-gradient(ellipse at center, var(--wb-glow-primary), transparent 70%)",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.04)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_70%,transparent_100%)]" />
      </div>

      <div className="mx-auto max-w-7xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column: Typography & CTAs */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left z-10"
          >
            {/* Category Pill Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide uppercase shadow-md backdrop-blur-md mb-6 border"
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
                color: "var(--wb-fg)",
              }}
            >
              <span className="flex h-2 w-2 rounded-full bg-[var(--wb-primary)] animate-pulse" />
              <span className="tracking-wider">PREMIER DIGITAL EXPERIENCE</span>
            </div>

            {/* Main Headline */}
            <EditableElement
              sectionKey={sectionKey}
              elementPath={`${sectionKey}.title`}
              elementType="heading"
              label="Hero Headline"
              className="w-full"
            >
              <h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-extrabold tracking-tight leading-[1.12] text-balance"
                style={{ color: "var(--wb-fg)" }}
              >
                {safeTitle}
              </h1>
            </EditableElement>

            {/* Subtitle */}
            <EditableElement
              sectionKey={sectionKey}
              elementPath={`${sectionKey}.subtitle`}
              elementType="paragraph"
              label="Hero Subtitle"
              className="w-full mt-6"
            >
              <p
                className="text-base sm:text-lg max-w-xl text-balance leading-relaxed"
                style={{ color: "var(--wb-muted)" }}
              >
                {safeSubtitle}
              </p>
            </EditableElement>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <EditableElement
                sectionKey={sectionKey}
                elementPath={`${sectionKey}.button`}
                elementType="button"
                label="Primary Button"
              >
                <button
                  type="button"
                  className="group relative inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white shadow-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                  style={{
                    background: "var(--wb-gradient-primary)",
                    boxShadow: "0 10px 30px -6px var(--wb-glow-primary)",
                  }}
                >
                  <span>{safeButton}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </EditableElement>

              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-sm font-semibold transition border backdrop-blur-md hover:bg-black/5 dark:hover:bg-white/10 shadow-sm"
                style={{
                  backgroundColor: "var(--wb-surface)",
                  borderColor: "var(--wb-border)",
                  color: "var(--wb-fg)",
                }}
              >
                <span>Get in Touch</span>
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 pt-6 border-t border-[var(--wb-border)] w-full flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-semibold">
              <div className="flex items-center gap-2" style={{ color: "var(--wb-muted)" }}>
                <Zap className="h-4 w-4 text-[var(--wb-primary)]" />
                <span>Fast & Reliable Delivery</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: "var(--wb-muted)" }}>
                <ShieldCheck className="h-4 w-4 text-[var(--wb-secondary)]" />
                <span>Bespoke Quality Standards</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: "var(--wb-muted)" }}>
                <Clock className="h-4 w-4 text-[var(--wb-primary)]" />
                <span>Dedicated Service</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Prominent Visual Image Showcase */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-5 relative w-full"
          >
            <div
              className="relative mx-auto rounded-3xl border p-3 shadow-2xl backdrop-blur-2xl overflow-hidden group"
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
                boxShadow: "0 25px 50px -12px var(--wb-glow-primary)",
              }}
            >
              {/* Image Frame */}
              <div className="relative aspect-[16/11] sm:aspect-[4/3] w-full rounded-2xl overflow-hidden">
                <EditableElement
                  sectionKey={sectionKey}
                  elementPath={`${sectionKey}.image`}
                  elementType="image"
                  label="Hero Showcase Photo"
                  className="w-full h-full"
                >
                  <ImageWithFallback
                    src={image}
                    alt={safeTitle}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </EditableElement>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating Glassmorphic Feature Overlay Card */}
              <div
                className="absolute bottom-6 left-6 right-6 rounded-2xl p-4 border backdrop-blur-xl shadow-2xl flex items-center justify-between pointer-events-none"
                style={{
                  backgroundColor: "var(--wb-surface)",
                  borderColor: "var(--wb-border)",
                }}
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold tracking-tight" style={{ color: "var(--wb-fg)" }}>
                    {safeTitle.slice(0, 34)}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--wb-muted)" }}>
                    Crafted with precision & passion
                  </p>
                </div>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl font-bold text-white shadow-md text-xs flex-shrink-0"
                  style={{ background: "var(--wb-gradient-primary)" }}
                >
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}