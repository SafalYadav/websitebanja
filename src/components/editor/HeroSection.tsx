"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, ArrowRight, Zap, ShieldCheck, Clock, PhoneCall, CheckCircle2 } from "lucide-react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import EditableElement from "@/components/editor/EditableElement";
import SpatialSectionWrapper from "@/components/editor/SpatialSectionWrapper";
import { handleButtonActionClick } from "@/lib/buttonActions";
import type { Hero, ButtonActionConfig, BackgroundStyleConfig, Spatial3dConfig, ImageIntentConfig } from "@/types/website";
import { useWebsiteUI } from "@/contexts/WebsiteUIContext";

interface HeroSectionProps extends Partial<Hero> {
  sectionKey?: string;
  image?: string;
  buttonAction?: ButtonActionConfig;
  layoutVariant?: "split_showcase" | "fullscreen_visual" | "minimal_editorial" | "spatial_depth_hero" | "bento_grid_hero" | "action_focused";
  backgroundStyle?: BackgroundStyleConfig;
  spatial3d?: Spatial3dConfig;
  imageIntent?: ImageIntentConfig;
  badges?: string[];
}

export default function HeroSection({
  sectionKey = "hero",
  title,
  subtitle,
  button,
  image,
  buttonAction,
  layoutVariant = "split_showcase",
  backgroundStyle,
  spatial3d,
  badges,
}: HeroSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const { publicSlug, onSwitchPage } = useWebsiteUI();
  const context = { siteSlug: publicSlug, onSwitchPage };

  const safeTitle = typeof title === "string" && title.trim() ? title : "Crafting Excellence For Modern Clients";
  const safeSubtitle =
    typeof subtitle === "string" && subtitle.trim()
      ? subtitle
      : "Discover tailored solutions, superior craftsmanship, and dedicated service designed to accelerate your growth.";
  const safeButton = typeof button === "string" && button.trim() ? button : "Explore Services";

  const bgType = backgroundStyle?.type || "solid";

  // 1. Fullscreen Visual Layout (Architecture, Fine Dining, Luxury)
  if (layoutVariant === "fullscreen_visual" && image) {
    return (
      <section className="relative overflow-hidden min-h-[90vh] flex flex-col justify-end pb-24 pt-36 px-6 sm:px-12 transition-colors duration-300">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <ImageWithFallback
            src={image}
            alt={safeTitle}
            className="h-full w-full object-cover object-center transform scale-105 filter brightness-[0.72] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        <div className="mx-auto max-w-6xl w-full z-10 text-white">
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase bg-white/10 backdrop-blur-md border border-white/20 text-white">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>SIGNATURE COLLECTION</span>
            </div>

            <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".title"} elementType="heading" label="Hero Headline">
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08] text-balance text-white drop-shadow-lg">
                {safeTitle}
              </h1>
            </EditableElement>

            <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".subtitle"} elementType="paragraph" label="Hero Subtitle">
              <p className="text-lg sm:text-xl text-zinc-200 font-light max-w-2xl leading-relaxed text-balance drop-shadow">
                {safeSubtitle}
              </p>
            </EditableElement>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".button"} elementType="button" label="Primary Button" value={safeButton}>
                <button
                  type="button"
                  onClick={(e) => handleButtonActionClick(buttonAction, "contact", e, context)}
                  className="group relative inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-bold text-white shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 bg-white/20 backdrop-blur-lg border border-white/40 hover:bg-white hover:text-black cursor-pointer"
                >
                  <span>{safeButton}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </EditableElement>

              <button
                type="button"
                onClick={(e) => handleButtonActionClick({ type: "scroll", target: "about" }, "about", e, context)}
                className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold transition border border-white/20 text-white hover:bg-white/10 backdrop-blur-md cursor-pointer"
              >
                <span>View Portfolio</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  // 2. Minimal Editorial Layout (High-End Fashion, Architecture Essays)
  if (layoutVariant === "minimal_editorial") {
    return (
      <section
        className="relative overflow-hidden pt-28 pb-24 sm:pt-36 sm:pb-32 px-6 sm:px-12 flex flex-col justify-center min-h-[80vh] transition-colors duration-300"
        style={{ backgroundColor: "var(--wb-bg)" }}
      >
        <div className="mx-auto max-w-5xl w-full text-center flex flex-col items-center space-y-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500 border-b pb-1" style={{ borderColor: "var(--wb-border)" }}>
            <span>AUTONOMOUS DESIGN DIRECTION</span>
          </div>

          <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".title"} elementType="heading" label="Hero Headline">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-light tracking-tight leading-[1.12] text-balance max-w-4xl" style={{ color: "var(--wb-fg)" }}>
              {safeTitle}
            </h1>
          </EditableElement>

          <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".subtitle"} elementType="paragraph" label="Hero Subtitle">
            <p className="text-base sm:text-lg max-w-2xl text-balance leading-relaxed text-zinc-500 font-normal">
              {safeSubtitle}
            </p>
          </EditableElement>

          <div className="flex flex-wrap items-center justify-center gap-5 pt-4">
            <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".button"} elementType="button" label="Primary Button" value={safeButton}>
              <button
                type="button"
                onClick={(e) => handleButtonActionClick(buttonAction, "services", e, context)}
                className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:opacity-90 active:scale-98 cursor-pointer"
                style={{ backgroundColor: "var(--wb-primary)" }}
              >
                <span>{safeButton}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </EditableElement>
          </div>

          {image && (
            <div className="w-full max-w-4xl mt-12 pt-6">
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-2xl border" style={{ borderColor: "var(--wb-border)" }}>
                <ImageWithFallback
                  src={image}
                  alt={safeTitle}
                  className="h-full w-full object-cover transition-transform duration-1000 hover:scale-102"
                />
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // 3. Action Focused Layout (Dental Clinic, Emergency Plumber, Local Trades)
  if (layoutVariant === "action_focused") {
    return (
      <section
        className="relative overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-28 px-6 sm:px-10 flex flex-col justify-center min-h-[80vh] transition-colors duration-300"
        style={{ backgroundColor: "var(--wb-bg)" }}
      >
        <div className="mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-bold tracking-wide uppercase shadow-xs border bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Available 24/7 • Licensed & Insured</span>
            </div>

            <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".title"} elementType="heading" label="Hero Headline">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.14] text-balance" style={{ color: "var(--wb-fg)" }}>
                {safeTitle}
              </h1>
            </EditableElement>

            <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".subtitle"} elementType="paragraph" label="Hero Subtitle">
              <p className="text-base sm:text-lg max-w-xl text-balance leading-relaxed" style={{ color: "var(--wb-muted)" }}>
                {safeSubtitle}
              </p>
            </EditableElement>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".button"} elementType="button" label="Primary Button" value={safeButton}>
                <button
                  type="button"
                  onClick={(e) => handleButtonActionClick(buttonAction, "contact", e, context)}
                  className="inline-flex items-center gap-2.5 rounded-xl px-8 py-4 text-base font-bold text-white shadow-xl transition-all hover:scale-102 active:scale-98 cursor-pointer"
                  style={{ backgroundColor: "var(--wb-primary)" }}
                >
                  <PhoneCall className="h-5 w-5 animate-pulse" />
                  <span>{safeButton}</span>
                </button>
              </EditableElement>

              <button
                type="button"
                onClick={(e) => handleButtonActionClick({ type: "scroll", target: "services" }, "services", e, context)}
                className="inline-flex items-center gap-2 rounded-xl px-7 py-4 text-sm font-semibold border backdrop-blur-md cursor-pointer"
                style={{ backgroundColor: "var(--wb-surface)", borderColor: "var(--wb-border)", color: "var(--wb-fg)" }}
              >
                <span>View Services & Rates</span>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--wb-border)] w-full flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-semibold" style={{ color: "var(--wb-muted)" }}>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[var(--wb-primary)]" />
                <span>30-Min Rapid Response</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>100% Satisfaction Guarantee</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative w-full">
            <div className="relative rounded-3xl border p-3 shadow-2xl overflow-hidden" style={{ backgroundColor: "var(--wb-surface)", borderColor: "var(--wb-border)" }}>
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden">
                <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".image"} elementType="image" label="Hero Photo">
                  <ImageWithFallback src={image} alt={safeTitle} className="h-full w-full object-cover" />
                </EditableElement>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 4. Default Showcase & Spatial Depth Layout (SaaS, AI, Creative)
  const isSpatialHero = layoutVariant === "spatial_depth_hero" || Boolean(spatial3d?.enabled);

  const visualCardContent = (
    <div
      className="relative mx-auto rounded-3xl border p-3 shadow-2xl backdrop-blur-2xl overflow-hidden group"
      style={{
        backgroundColor: "var(--wb-surface)",
        borderColor: "var(--wb-border)",
        boxShadow: "0 25px 50px -12px var(--wb-glow-primary)",
        transformStyle: isSpatialHero ? "preserve-3d" : undefined,
      }}
    >
      <div
        className="relative aspect-[16/11] sm:aspect-[4/3] w-full rounded-2xl overflow-hidden"
        style={{
          transform: isSpatialHero ? "translateZ(24px)" : undefined,
        }}
      >
        <EditableElement
          sectionKey={sectionKey}
          elementPath={sectionKey + ".image"}
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

      <div
        className="absolute bottom-6 left-6 right-6 rounded-2xl p-4 border backdrop-blur-xl shadow-2xl flex items-center justify-between pointer-events-none"
        style={{
          backgroundColor: "var(--wb-surface)",
          borderColor: "var(--wb-border)",
          transform: isSpatialHero ? "translateZ(48px)" : undefined,
        }}
      >
        <div className="space-y-0.5">
          <p className="text-xs font-bold tracking-tight" style={{ color: "var(--wb-fg)" }}>
            {safeTitle.slice(0, 34)}
          </p>
          <p className="text-[11px]" style={{ color: "var(--wb-muted)" }}>
            Intelligently Engineered & Scalable
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
  );

  return (
    <section
      className="relative overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-32 px-6 sm:px-10 flex flex-col justify-center min-h-[85vh] transition-colors duration-300"
      style={{ backgroundColor: "var(--wb-bg)" }}
    >
      {/* Dynamic Background Surface Treatments */}
      {bgType === "tech_grid" && (
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(56,189,248,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.06)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />
      )}

      {bgType === "dot_grid" && (
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgba(148,163,184,0.15)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_70%,transparent_100%)]" />
      )}

      {bgType === "tonal_field" && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 blur-3xl"
          style={{
            background: "radial-gradient(circle at 60% 40%, var(--wb-glow-primary), transparent 60%)",
          }}
        />
      )}

      {/* Standard Glow Orbs for split showcase */}
      {bgType !== "editorial_whitespace" && bgType !== "tech_grid" && (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            animate={
              shouldReduceMotion
                ? {}
                : {
                    scale: [1, 1.15, 1],
                    opacity: [0.35, 0.55, 0.35],
                  }
            }
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full blur-3xl"
            style={{
              background: "radial-gradient(ellipse at center, var(--wb-glow-primary), transparent 70%)",
            }}
          />
        </div>
      )}

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
              <span className="tracking-wider">
                {badges && badges.length > 0 ? badges[0] : "PREMIER DIGITAL EXPERIENCE"}
              </span>
            </div>

            {/* Main Headline */}
            <EditableElement
              sectionKey={sectionKey}
              elementPath={sectionKey + ".title"}
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
              elementPath={sectionKey + ".subtitle"}
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
                elementPath={sectionKey + ".button"}
                elementType="button"
                label="Primary Button"
                value={safeButton}
              >
                <button
                  type="button"
                  onClick={(e) => handleButtonActionClick(buttonAction, "services", e, context)}
                  className="group relative inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white shadow-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                  style={{
                    background: "var(--wb-gradient-primary)",
                    boxShadow: "0 10px 30px -6px var(--wb-glow-primary)",
                  }}
                >
                  <span>{safeButton}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </EditableElement>

              <button
                type="button"
                onClick={(e) => handleButtonActionClick({ type: "scroll", target: "contact" }, "contact", e, context)}
                className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-sm font-semibold transition border backdrop-blur-md hover:bg-black/5 dark:hover:bg-white/10 shadow-sm cursor-pointer"
                style={{
                  backgroundColor: "var(--wb-surface)",
                  borderColor: "var(--wb-border)",
                  color: "var(--wb-fg)",
                }}
              >
                <span>Get in Touch</span>
              </button>
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

          {/* Right Column: Prominent Visual Image Showcase with optional 3D Spatial Wrapper */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-5 relative w-full"
          >
            {isSpatialHero ? (
              <SpatialSectionWrapper config={spatial3d}>
                {visualCardContent}
              </SpatialSectionWrapper>
            ) : (
              visualCardContent
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
