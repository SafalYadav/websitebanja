// src/lib/ai/design/designBrief.ts
/**
 * Phase 6 — Design Brief Compiler
 *
 * Synthesizes ComputedDesignStrategy + DesignRules + WebsiteRequirement into
 * a single, structured DesignBrief that is:
 *   1. Embedded into the generation prompt for precise AI compliance
 *   2. Stored in WebsiteData.designBrief for renderer guidance
 *   3. Used by the QualityValidator for deterministic checks
 *
 * No AI calls — purely deterministic TypeScript computation.
 */

import type { ComputedDesignStrategy } from "@/lib/ai/designStrategy";
import type { DesignRules } from "./designRules";
import type { WebsiteRequirement } from "@/lib/ai/requirementModel";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SemanticColorSystem {
  /** Page background base */
  background: string;
  /** Card / raised surface */
  surface: string;
  /** Elevated card variant */
  surfaceElevated: string;
  /** Primary text color */
  foreground: string;
  /** Secondary / subdued text */
  muted: string;
  /** Primary brand action color */
  primary: string;
  /** Secondary brand color */
  secondary: string;
  /** Accent / highlight */
  accent: string;
  /** Border / divider */
  border: string;
  /** Glow / shadow color derived from primary */
  shadow: string;
  /** Is this a dark-mode palette? */
  isDark: boolean;
}

export interface TypographySystem {
  headingFont: string;
  bodyFont: string;
  /** CSS heading size scale multiplier */
  headingScale: number;
  bodyScale: number;
  lineHeight: number;
  letterSpacing: string;
  /** Display style category */
  headingStyle: "uppercase" | "normal" | "serif" | "geometric";
}

export interface LayoutSystem {
  heroLayout: "split_showcase" | "fullscreen_visual" | "minimal_editorial" | "spatial_depth_hero" | "bento_grid_hero" | "action_focused";
  sectionOrder: string[];
  density: "compact" | "medium" | "spacious";
  gridColumns: { mobile: number; tablet: number; desktop: number };
  containerMaxWidth: string;
}

export interface SectionPlan {
  sectionKey: string;
  label: string;
  cardFamily: string;
  purpose: string;
}

export interface ImageryStrategy {
  heroMode: string;
  heroOpacity: number;
  heroBlur: number;
  heroSemanticIntent: string;
  negativeTerms: string[];
  visualStyle: string;
}

export interface MotionConfig {
  level: "NONE" | "SUBTLE" | "MODERATE" | "CINEMATIC";
  durationBaseMs: number;
  easing: string;
  hoverZoomScale: number;
  reducedMotionFallback: true; // always true — required for accessibility
}

export interface ResponsiveConfig {
  mobileFirst: true; // always true — mobile-first required
  breakpoints: { sm: 640; md: 768; lg: 1024; xl: 1280 };
  stackingBehavior: "natural-flow" | "grid-collapse" | "hide-auxiliary";
  typographyScale: "clamp-based" | "breakpoint-step";
  imageStrategy: "lazy-load-offscreen" | "priority-hero-only";
}

export interface SeoConfig {
  pageTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  headingHierarchy: "h1-brand-primary, h2-section-headline, h3-card-label";
}

export interface AccessibilityConfig {
  colorContrastMinimumAA: true;
  focusRingVisible: true;
  reducedMotionRespected: true;
  semanticHeadingHierarchy: true;
  altTextRequired: true;
}

/**
 * Structured design brief — the single contract between design intelligence and generation.
 */
export interface DesignBrief {
  /** Human-readable visual direction statement */
  visualDirection: string;
  /** Brand personality keywords */
  brandPersonality: string[];
  businessContext: {
    industry: string;
    positioning: string;
    voiceAndTone: string;
    targetAudience: string;
    trustSignals: string[];
  };
  colorSystem: SemanticColorSystem;
  typography: TypographySystem;
  layout: LayoutSystem;
  sectionPlans: SectionPlan[];
  imagery: ImageryStrategy;
  motion: MotionConfig;
  responsive: ResponsiveConfig;
  seo: SeoConfig;
  accessibility: AccessibilityConfig;
  /** Patterns the generator must NOT produce */
  antiPatterns: string[];
  /** Absolute generation requirements */
  qualityRequirements: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  about: "Our Story",
  services: "Services",
  features: "Why Choose Us",
  reviews: "Client Reviews",
  faq: "FAQ",
  contact: "Contact",
  footer: "Footer",
  atmosphere_story: "Atmosphere & Heritage",
  craft_heritage: "Craft & Heritage",
  doctor_clinic: "Our Doctors",
  treatment_process: "Treatment Process",
  trust_proof: "Trust & Standards",
  trust_guarantees: "Guarantees",
  workflow_steps: "How It Works",
  selected_works: "Selected Work",
  selected_cases: "Case Studies",
  creative_capabilities: "Capabilities",
  awards_metrics: "Recognition",
  signature_dishes: "Signature Dishes",
  menu: "Menu",
  gallery: "Gallery",
  emergency_services: "Emergency Services",
  service_area: "Service Area",
  reservation: "Reservation",
  booking: "Booking",
  room_showcase: "Rooms & Suites",
  amenities: "Amenities",
  dining: "Dining",
  programs: "Programs",
  faculty: "Faculty",
  outcomes: "Outcomes",
  campus: "Campus",
  treatments: "Treatments",
  atmosphere: "Atmosphere",
  practitioners: "Practitioners",
  pricing: "Pricing",
  practice_areas: "Practice Areas",
  attorney_profiles: "Our Attorneys",
  case_results: "Case Results",
  solutions: "Solutions",
  skills: "Skills & Expertise",
  social_proof: "Social Proof",
  process: "Our Process",
  methodology: "Methodology",
  testimonials: "Testimonials",
};

const SECTION_PURPOSES: Record<string, string> = {
  hero: "Establish brand identity, capture attention, drive primary CTA conversion",
  about: "Build emotional connection, establish credibility and founder story",
  services: "Showcase service offerings with distinct value propositions per item",
  features: "Communicate differentiators, trust signals, and competitive advantages",
  reviews: "Provide social proof through authentic client testimonials",
  faq: "Resolve objections and common questions to reduce friction",
  contact: "Convert intent to action — phone, email, form, location",
  footer: "Navigation, legal, social links, secondary contact",
  workflow_steps: "Demystify the client journey and build process confidence",
  selected_cases: "Demonstrate proven results through curated case studies",
  awards_metrics: "Validate authority with industry recognition and key metrics",
};

// ── Compiler ──────────────────────────────────────────────────────────────────

/**
 * Compiles a structured DesignBrief from design strategy + design rules + requirement.
 * This is the primary entry point for the design brief system.
 */
export function compileDesignBrief(
  strategy: ComputedDesignStrategy,
  rules: DesignRules,
  req: WebsiteRequirement
): DesignBrief {
  const isDark = strategy.colorSystem.isDark ?? (strategy.colorSystem.bg?.startsWith("#0") || false);

  // ── Color System ─────────────────────────────────────────────────────────
  const colorSystem: SemanticColorSystem = {
    background: strategy.colorSystem.bg || rules.colorSystem.bgDefault,
    surface: strategy.colorSystem.surface || (isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF"),
    surfaceElevated: strategy.colorSystem.surfaceAlt || (isDark ? "rgba(255,255,255,0.08)" : "#F8FAFC"),
    foreground: strategy.colorSystem.text || rules.colorSystem.textDefault,
    muted: strategy.colorSystem.muted || (isDark ? "#94A3B8" : "#64748B"),
    primary: strategy.colorSystem.primary || rules.colorSystem.primaryDefault,
    secondary: strategy.colorSystem.secondary || rules.colorSystem.secondaryDefault,
    accent: strategy.colorSystem.accent || rules.colorSystem.accentDefault,
    border: strategy.colorSystem.border || (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"),
    shadow: strategy.colorSystem.shadow || (isDark ? "0 20px 40px -10px rgba(0,0,0,0.6)" : "0 16px 35px -8px rgba(0,0,0,0.07)"),
    isDark,
  };

  // ── Typography ───────────────────────────────────────────────────────────
  const typography: TypographySystem = {
    headingFont: strategy.typographyTokens.headingFont || rules.typography.headingFont,
    bodyFont: strategy.typographyTokens.bodyFont || rules.typography.bodyFont,
    headingScale: strategy.typographyTokens.headingScale ?? rules.typography.headingScale,
    bodyScale: rules.typography.bodyScale,
    lineHeight: strategy.typographyTokens.lineHeight ?? rules.typography.lineHeight,
    letterSpacing: strategy.typographyTokens.letterSpacing || rules.typography.letterSpacing,
    headingStyle: (strategy.typographyTokens.headingStyle || rules.typography.headingStyle) as TypographySystem["headingStyle"],
  };

  // ── Layout ───────────────────────────────────────────────────────────────
  const layout: LayoutSystem = {
    heroLayout: strategy.heroType as LayoutSystem["heroLayout"],
    sectionOrder: strategy.sectionSequence,
    density: rules.spacing.density,
    gridColumns: rules.layout.gridColumns,
    containerMaxWidth: rules.spacing.containerMaxWidth,
  };

  // ── Section Plans ────────────────────────────────────────────────────────
  const sectionPlans: SectionPlan[] = strategy.sectionSequence
    .filter((key) => key !== "navbar")
    .map((key) => ({
      sectionKey: key,
      label: SECTION_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      cardFamily: strategy.skillExecutionPlan?.sections?.find((s) => s.sectionType === key)?.cardFamily || "elevated",
      purpose: SECTION_PURPOSES[key] || `Contextual content section for ${key}`,
    }));

  // ── Imagery ──────────────────────────────────────────────────────────────
  const heroBackground = strategy.heroBackground;
  const imagery: ImageryStrategy = {
    heroMode: heroBackground?.mode || "abstract",
    heroOpacity: heroBackground?.opacity ?? 0.14,
    heroBlur: heroBackground?.blur ?? 16,
    heroSemanticIntent: heroBackground?.semanticIntent || "Contextual atmospheric background for this business",
    negativeTerms: heroBackground?.negativeTerms || [],
    visualStyle: strategy.artDirectionSummary || "Modern, clean, professional",
  };

  // ── Motion ───────────────────────────────────────────────────────────────
  const motion: MotionConfig = {
    level: strategy.motionStrategy || "SUBTLE",
    durationBaseMs: rules.motion.durationBaseMs,
    easing: rules.motion.easing,
    hoverZoomScale: rules.motion.hoverZoomScale,
    reducedMotionFallback: true,
  };

  // ── Responsive ───────────────────────────────────────────────────────────
  const responsive: ResponsiveConfig = {
    mobileFirst: true,
    breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 },
    stackingBehavior: rules.spacing.density === "compact" ? "grid-collapse" : "natural-flow",
    typographyScale: "clamp-based",
    imageStrategy: "lazy-load-offscreen",
  };

  // ── SEO ──────────────────────────────────────────────────────────────────
  const businessDesc = req.business.type || rules.industryProfile.displayName;
  const location = req.location ? ` in ${req.location}` : "";
  const seo: SeoConfig = {
    pageTitle: `${req.business.name} — ${businessDesc}${location}`,
    metaDescription: (req.content?.heroSubtitle || rules.industryProfile.archetype).slice(0, 155),
    ogTitle: `${req.business.name} | ${rules.industryProfile.displayName}`,
    ogDescription: (req.content?.heroSubtitle || `Discover ${req.business.name}. ${rules.industryProfile.archetype}`).slice(0, 200),
    headingHierarchy: "h1-brand-primary, h2-section-headline, h3-card-label",
  };

  // ── Accessibility ────────────────────────────────────────────────────────
  const accessibility: AccessibilityConfig = {
    colorContrastMinimumAA: true,
    focusRingVisible: true,
    reducedMotionRespected: true,
    semanticHeadingHierarchy: true,
    altTextRequired: true,
  };

  // ── Anti-Patterns ────────────────────────────────────────────────────────
  const antiPatterns: string[] = [
    `Do NOT produce a generic hero→features→about→FAQ→contact template`,
    `Do NOT use internal system strings (WARM_ARTISANAL, DARK_TECHNICAL, HIGH_TRUST_SERVICE) in visible content`,
    `Do NOT output industry-contaminated content (e.g. dental content on a restaurant website)`,
    `Do NOT use placeholder phrases like "Premium Quality & Service" or "We Are the Best"`,
    `Do NOT make the hero title identical to the business name alone — add value proposition`,
    `Do NOT use the exact same card layout for every section`,
  ];
  if (strategy.sectionSequence.length > 0) {
    antiPatterns.push(`Section order MUST match: ${strategy.sectionSequence.join(" → ")}`);
  }

  // ── Quality Requirements ─────────────────────────────────────────────────
  const qualityRequirements: string[] = [
    `Business name "${req.business.name}" must appear in hero title`,
    `Hero must have at least 3 contextually appropriate trust badges for ${rules.industryProfile.displayName}`,
    `Services list must reflect actual services for ${rules.industryProfile.displayName}, not generic defaults`,
    `FAQ must have at least 4 relevant questions (not empty)`,
    `CTA text must be "${rules.cta.primaryLabel}" (or equivalent conversion action)`,
    `All text must be written for target audience: ${req.audience || rules.industryProfile.voiceAndTone}`,
    `Visual archetype is "${strategy.visualArchetype}" — maintain visual consistency across all sections`,
  ];

  // ── Brand Personality ────────────────────────────────────────────────────
  const brandPersonality = rules.industryProfile.voiceAndTone
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  return {
    visualDirection: strategy.artDirectionSummary || `${strategy.visualConcept} — ${strategy.visualArchetype}`,
    brandPersonality,
    businessContext: {
      industry: rules.industryProfile.displayName,
      positioning: rules.industryProfile.archetype,
      voiceAndTone: rules.industryProfile.voiceAndTone,
      targetAudience: req.audience || "General audience",
      trustSignals: rules.industryProfile.trustSignals,
    },
    colorSystem,
    typography,
    layout,
    sectionPlans,
    imagery,
    motion,
    responsive,
    seo,
    accessibility,
    antiPatterns,
    qualityRequirements,
  };
}

/**
 * Formats a DesignBrief as a structured prompt section for injection into buildWebsitePrompt().
 * Returns a concise, machine-readable design specification the LLM can reliably follow.
 */
export function formatDesignBriefForPrompt(brief: DesignBrief): string {
  return `
==========================
DESIGN BRIEF (FOLLOW PRECISELY)
==========================

Visual Direction: ${brief.visualDirection}
Brand Personality: ${brief.brandPersonality.join(", ")}
Industry: ${brief.businessContext.industry}
Positioning: ${brief.businessContext.positioning}
Voice & Tone: ${brief.businessContext.voiceAndTone}
Target Audience: ${brief.businessContext.targetAudience}
Trust Signals: ${brief.businessContext.trustSignals.join(", ")}

SECTION ORDER (MANDATORY — do not change this sequence):
${brief.sectionPlans.map((s, i) => `  ${i + 1}. ${s.sectionKey} → "${s.label}" — ${s.purpose}`).join("\n")}

COLOR SYSTEM:
  Background: ${brief.colorSystem.background}
  Surface: ${brief.colorSystem.surface}
  Foreground: ${brief.colorSystem.foreground}
  Primary: ${brief.colorSystem.primary}
  Secondary: ${brief.colorSystem.secondary}
  Accent: ${brief.colorSystem.accent}
  Muted: ${brief.colorSystem.muted}
  Border: ${brief.colorSystem.border}
  Mode: ${brief.colorSystem.isDark ? "dark" : "light"}

TYPOGRAPHY:
  Heading Font: ${brief.typography.headingFont}
  Body Font: ${brief.typography.bodyFont}
  Style: ${brief.typography.headingStyle}
  Letter Spacing: ${brief.typography.letterSpacing}

HERO LAYOUT: ${brief.layout.heroLayout}
HERO IMAGERY: ${brief.imagery.heroMode} (opacity: ${brief.imagery.heroOpacity}, intent: "${brief.imagery.heroSemanticIntent}")
MOTION LEVEL: ${brief.motion.level} — ALL animations MUST include prefers-reduced-motion safe fallbacks

ANTI-PATTERNS (DO NOT):
${brief.antiPatterns.map((p) => `  ✗ ${p}`).join("\n")}

QUALITY REQUIREMENTS (MUST):
${brief.qualityRequirements.map((q) => `  ✓ ${q}`).join("\n")}
`.trim();
}
