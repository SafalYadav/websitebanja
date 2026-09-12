"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, ArrowRight, Zap, ShieldCheck, Clock, PhoneCall, CheckCircle2 } from "lucide-react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import EditableElement from "@/components/editor/EditableElement";
import SpatialSectionWrapper from "@/components/editor/SpatialSectionWrapper";
import { handleButtonActionClick } from "@/lib/buttonActions";
import { useWebsiteUI } from "@/contexts/WebsiteUIContext";
import MagneticButton from "@/components/patterns/MagneticButton";
import type { Hero, ButtonActionConfig, BackgroundStyleConfig, Spatial3dConfig, ImageIntentConfig, HeroBackgroundConfig } from "@/types/website";
import { getHeroAtmosphereImage } from "@/lib/categoryImages";

export function HeroBackgroundAtmosphere({
  heroBackground,
  category,
  visualArchetype,
}: {
  heroBackground?: HeroBackgroundConfig;
  category?: string;
  visualArchetype?: string;
}) {
  const bgImg = heroBackground?.imageUrl || getHeroAtmosphereImage(category, visualArchetype);

  const opacity = heroBackground?.opacity ?? 0.15;
  const blur = heroBackground?.blur ?? 18;
  const scale = heroBackground?.scale ?? 1.15;
  const position = heroBackground?.position ?? "right-edge";
  const fadeDirection = heroBackground?.fadeDirection ?? "to-left";

  const getPositionClasses = () => {
    switch (position) {
      case "right-edge":
        return "top-0 right-0 w-full sm:w-[68%] lg:w-[58%] h-full origin-top-right";
      case "left-edge":
        return "top-0 left-0 w-full sm:w-[68%] lg:w-[58%] h-full origin-top-left";
      case "top-right":
        return "-top-12 right-0 w-full sm:w-[60%] h-[120%] origin-top-right";
      case "bottom-right":
        return "bottom-0 right-0 w-full sm:w-[65%] h-[90%] origin-bottom-right";
      case "floating-offset":
        return "-top-10 right-4 sm:right-12 w-full sm:w-[62%] h-[115%] rounded-3xl origin-center";
      case "center":
      default:
        return "inset-0 w-full h-full origin-center";
    }
  };

  const getOverlayGradient = () => {
    switch (fadeDirection) {
      case "to-left":
        return "linear-gradient(to right, var(--wb-bg) 0%, var(--wb-bg) 35%, transparent 100%)";
      case "to-right":
        return "linear-gradient(to left, var(--wb-bg) 0%, var(--wb-bg) 35%, transparent 100%)";
      case "to-bottom":
        return "linear-gradient(to top, var(--wb-bg) 0%, var(--wb-bg) 30%, transparent 100%)";
      case "radial-out":
        return "radial-gradient(circle at 50% 50%, transparent 20%, var(--wb-bg) 85%)";
      case "center-soft":
      default:
        return "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 15%, var(--wb-bg) 85%)";
    }
  };

  if (heroBackground?.mode === "none") {
    return null;
  }

  return (
    <div className="hero-background-atmosphere absolute inset-0 pointer-events-none overflow-hidden z-0 select-none isolate">
      {/* Contextual atmosphere texture/image layer */}
      {bgImg && (
        <div
          className={`absolute ${getPositionClasses()} transition-opacity duration-1000 overflow-hidden`}
          style={{
            transform: `scale(${scale})`,
          }}
        >
          <img
            src={bgImg}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover select-none"
            style={{
              filter: `blur(${blur}px) saturate(1.18)`,
              opacity: opacity,
            }}
          />
        </div>
      )}

      {/* Directional contrast scrim guaranteeing 100% text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: getOverlayGradient(),
        }}
      />

      {/* Top and bottom edge softening mask */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, var(--wb-bg) 0%, transparent 15%, transparent 85%, var(--wb-bg) 100%)",
        }}
      />

      {/* Tonal ambient color blend matching archetype */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-soft-light"
        style={{
          background: "radial-gradient(circle at 60% 30%, var(--wb-glow-primary), transparent 70%)",
        }}
      />
    </div>
  );
}

interface HeroSectionProps extends Partial<Hero> {
  sectionKey?: string;
  image?: string;
  buttonAction?: ButtonActionConfig;
  layoutVariant?: "split_showcase" | "fullscreen_visual" | "minimal_editorial" | "spatial_depth_hero" | "bento_grid_hero" | "action_focused";
  backgroundStyle?: BackgroundStyleConfig;
  spatial3d?: Spatial3dConfig;
  heroBackground?: HeroBackgroundConfig;
  category?: string;
  visualArchetype?: string;
  imageIntent?: ImageIntentConfig;
  badges?: string[];
  trustBadges?: string[];
  eyebrow?: string;
  imageFit?: "cover" | "contain" | "natural";
  imageFocalPoint?: string;
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
  heroBackground,
  category,
  visualArchetype,
  badges,
  trustBadges,
  eyebrow,
  imageFit,
  imageFocalPoint,
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

  const effectiveEyebrow = eyebrow?.trim() || (badges && badges.length > 0 ? badges[0] : "PREMIER EXPERIENCE");
  const effectiveTrustBadges = (Array.isArray(trustBadges) && trustBadges.length > 0)
    ? trustBadges
    : (badges && badges.length > 1)
      ? badges.slice(1, 4)
      : ["Verified Expertise", "Artisanal Precision", "Direct Communication"];

  // 1. Fullscreen Visual Layout (Architecture, Fine Dining, Luxury, Hospitality)
  if (layoutVariant === "fullscreen_visual") {
    return (
      <section data-section="hero" className="relative overflow-hidden min-h-[92vh] flex flex-col justify-end pb-24 pt-36 px-6 sm:px-12 transition-colors duration-300 bg-zinc-950 isolate">
        <HeroBackgroundAtmosphere heroBackground={heroBackground} category={category} visualArchetype={visualArchetype} />
        <div className="absolute inset-0 z-0 overflow-hidden bg-zinc-950">
          {image ? (
            <ImageWithFallback
              src={image}
              alt={safeTitle}
              className="h-full w-full object-cover object-center transform scale-105 filter brightness-[0.70] contrast-[1.1]"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-stone-900 to-black" />
          )}
          {/* Guaranteed accessible contrast scrim: 3-tier gradient + ambient tint */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/75 to-black/40 pointer-events-none" />
          <div className="absolute inset-0 bg-black/35 pointer-events-none" />
          {bgType === "warm_glow" && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(217,119,6,0.4)_0%,transparent_70%)] mix-blend-screen pointer-events-none" />
          )}
          {bgType === "luxury_noir" && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.25)_0%,transparent_60%)] mix-blend-screen pointer-events-none" />
          )}
        </div>

        <div className="relative z-10 mx-auto max-w-6xl w-full text-white">
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase bg-white/10 backdrop-blur-md border border-white/20 text-white">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{badges && badges.length > 0 ? badges[0] : "ARTISANAL DISTINCTION"}</span>
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
                <MagneticButton
                  type="button"
                  onClick={(e) => handleButtonActionClick(buttonAction, "contact", e, context)}
                  className="group relative inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-bold text-white shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 bg-white/20 backdrop-blur-lg border border-white/40 hover:bg-white hover:text-black cursor-pointer"
                >
                  <span>{safeButton}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </MagneticButton>
              </EditableElement>

              <button
                type="button"
                onClick={(e) => handleButtonActionClick({ type: "scroll", target: "about" }, "about", e, context)}
                className="inline-flex items-center gap-2 rounded-full px-6 py-4 text-sm font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                <span>Learn More</span>
              </button>
            </div>

            {/* Dynamic Trust Cues */}
            {trustBadges && trustBadges.length > 0 && (
              <div className="pt-8 border-t border-white/15 flex flex-wrap items-center gap-6 text-xs text-zinc-300 font-medium">
                {trustBadges.map((badgeText, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span>{badgeText}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    );
  }

  // 2. Minimal Editorial Layout (High-End Fashion, Architecture Essays)
  if (layoutVariant === "minimal_editorial") {
    return (
      <section
        data-section="hero"
        className="relative overflow-hidden pt-28 pb-24 sm:pt-36 sm:pb-32 px-6 sm:px-12 flex flex-col justify-center min-h-[85vh] transition-colors duration-300 isolate"
        style={{ backgroundColor: "var(--wb-bg)" }}
      >
        <HeroBackgroundAtmosphere heroBackground={heroBackground} category={category} visualArchetype={visualArchetype} />

        <div className="relative z-10 mx-auto max-w-5xl w-full text-center flex flex-col items-center space-y-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] border-b pb-1.5" style={{ borderColor: "var(--wb-border)", color: "var(--wb-muted)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--wb-primary)]" />
            <span>{effectiveEyebrow}</span>
          </div>

          <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".title"} elementType="heading" label="Hero Headline">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-light tracking-tight leading-[1.08] text-balance max-w-5xl" style={{ color: "var(--wb-fg)" }}>
              {safeTitle}
            </h1>
          </EditableElement>

          <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".subtitle"} elementType="paragraph" label="Hero Subtitle">
            <p className="text-base sm:text-lg md:text-xl max-w-2xl text-balance leading-relaxed font-normal" style={{ color: "var(--wb-muted)" }}>
              {safeSubtitle}
            </p>
          </EditableElement>

          <div className="flex flex-wrap items-center justify-center gap-5 pt-4">
            <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".button"} elementType="button" label="Primary Button" value={safeButton}>
              <MagneticButton
                type="button"
                onClick={(e) => handleButtonActionClick(buttonAction, "services", e, context)}
                className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition hover:opacity-95 active:scale-98 cursor-pointer"
                style={{ backgroundColor: "var(--wb-primary)", boxShadow: "0 10px 25px -5px var(--wb-glow-primary)" }}
              >
                <span>{safeButton}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </MagneticButton>
            </EditableElement>
          </div>

          {image && (
            <div className="w-full max-w-4xl mt-12 pt-6">
              <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden shadow-2xl border" style={{ borderColor: "var(--wb-border)" }}>
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
        data-section="hero"
        className="relative overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-28 px-6 sm:px-10 flex flex-col justify-center min-h-[85vh] transition-colors duration-300 isolate"
        style={{ backgroundColor: "var(--wb-bg)" }}
      >
        <HeroBackgroundAtmosphere heroBackground={heroBackground} category={category} visualArchetype={visualArchetype} />

        <div className="relative z-10 mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide uppercase shadow-xs border bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{effectiveEyebrow}</span>
            </div>

            <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".title"} elementType="heading" label="Hero Headline">
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-balance" style={{ color: "var(--wb-fg)" }}>
                {safeTitle}
              </h1>
            </EditableElement>

            <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".subtitle"} elementType="paragraph" label="Hero Subtitle">
              <p className="text-base sm:text-lg md:text-xl max-w-xl text-balance leading-relaxed font-normal" style={{ color: "var(--wb-muted)" }}>
                {safeSubtitle}
              </p>
            </EditableElement>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".button"} elementType="button" label="Primary Button" value={safeButton}>
                <MagneticButton
                  type="button"
                  onClick={(e) => handleButtonActionClick(buttonAction, "contact", e, context)}
                  className="inline-flex items-center gap-2.5 rounded-xl px-8 py-4 text-base font-bold text-white shadow-xl transition-all hover:scale-102 active:scale-98 cursor-pointer"
                  style={{ backgroundColor: "var(--wb-primary)", boxShadow: "0 10px 25px -5px var(--wb-glow-primary)" }}
                >
                  <PhoneCall className="h-5 w-5 animate-pulse" />
                  <span>{safeButton}</span>
                </MagneticButton>
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
              {effectiveTrustBadges.slice(0, 2).map((badgeText, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  {idx === 0 ? <Clock className="h-4 w-4 text-[var(--wb-primary)]" /> : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                  <span>{badgeText}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 relative w-full">
            <div className="relative rounded-3xl border p-3 shadow-2xl overflow-hidden" style={{ backgroundColor: "var(--wb-surface)", borderColor: "var(--wb-border)" }}>
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden">
                <EditableElement sectionKey={sectionKey} elementPath={sectionKey + ".image"} elementType="image" label="Hero Photo" className="w-full h-full">
                  <ImageWithFallback
                    src={image}
                    alt={safeTitle}
                    fit={imageFit || "cover"}
                    focalPoint={imageFocalPoint}
                    wrapperClassName="w-full h-full"
                    className="h-full w-full object-cover"
                  />
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
            fit={imageFit || "cover"}
            focalPoint={imageFocalPoint}
            wrapperClassName="w-full h-full"
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
            {effectiveTrustBadges[0] || effectiveEyebrow}
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
      data-section="hero"
      className="relative overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-32 px-6 sm:px-10 flex flex-col justify-center min-h-[85vh] transition-colors duration-300 isolate"
      style={{ backgroundColor: "var(--wb-bg)" }}
    >
      <HeroBackgroundAtmosphere heroBackground={heroBackground} category={category} visualArchetype={visualArchetype} />
      {/* Dynamic Background Surface Treatments */}
      {bgType === "tech_grid" && (
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.08)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_70%,transparent_100%)]" />
      )}

      {bgType === "dot_grid" && (
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(rgba(148,163,184,0.2)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_70%,transparent_100%)]" />
      )}

      {bgType === "tonal_field" && (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-50 blur-3xl"
          style={{
            background: "radial-gradient(circle at 60% 40%, var(--wb-glow-primary), transparent 60%)",
          }}
        />
      )}

      {bgType === "warm_glow" && (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-60 blur-3xl"
          style={{
            background: "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(245, 158, 11, 0.28), transparent 70%), radial-gradient(circle at 80% 80%, rgba(217, 119, 6, 0.18), transparent 50%)",
          }}
        />
      )}

      {bgType === "clinical_calm" && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: "radial-gradient(circle at 20% 20%, rgba(14, 165, 233, 0.12), transparent 50%), radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.09), transparent 50%)",
          }}
        />
      )}

      {bgType === "luxury_noir" && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: "radial-gradient(circle at 50% 30%, rgba(212, 175, 55, 0.12), transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(10,10,12,0.9) 100%)",
          }}
        />
      )}

      {bgType === "subtle_grain" && (
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(rgba(100,116,139,0.12)_1px,transparent_1px)] [background-size:16px_16px]" />
      )}

      {/* Standard Glow Orbs for split showcase */}
      {bgType !== "editorial_whitespace" && bgType !== "tech_grid" && bgType !== "warm_glow" && bgType !== "luxury_noir" && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
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

      <div className="relative z-10 mx-auto max-w-7xl w-full">
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
                {effectiveEyebrow}
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
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-balance"
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
                className="text-base sm:text-lg md:text-xl max-w-xl text-balance leading-relaxed font-normal"
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
                <MagneticButton
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
                </MagneticButton>
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
              {effectiveTrustBadges.slice(0, 3).map((badgeText, idx) => (
                <div key={idx} className="flex items-center gap-2" style={{ color: "var(--wb-muted)" }}>
                  {idx === 0 ? (
                    <Zap className="h-4 w-4 text-[var(--wb-primary)]" />
                  ) : idx === 1 ? (
                    <ShieldCheck className="h-4 w-4 text-[var(--wb-secondary)]" />
                  ) : (
                    <Clock className="h-4 w-4 text-[var(--wb-primary)]" />
                  )}
                  <span>{badgeText}</span>
                </div>
              ))}
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
