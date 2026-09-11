// src/lib/ai/designStrategy.ts
/**
 * WebsiteBanja AI — Design Strategy & Layout Intelligence Engine
 * 
 * Transforms business context, user constraints, and industry intelligence into
 * an internal Design Strategy that governs:
 * 1. Visual Archetype
 * 2. Hero Composition & Layout Variant
 * 3. Purposeful Section Order & Sequencing (Anti-Repetition)
 * 4. Background Strategy (Tonal fields, dot-grids, tech-grids, noise, editorial whitespace)
 * 5. Image Intent (Subject, lighting, composition, crop, fallback)
 * 6. Typography Scale & Mood
 * 7. Spatial 3D Eligibility (NONE, SUBTLE_2_5D, ADVANCED_CSS_3D)
 * 
 * Priority Hierarchy:
 * Explicit User Requirements > Business Objective > Target Audience > Industry > Brand Personality > Content > Design Skills > Safe Defaults.
 */

import type {
  BackgroundStyleConfig,
  DesignStrategyData,
  ImageIntentConfig,
  Spatial3dConfig,
} from "@/types/website";

export interface StrategyInputContext {
  category?: string;
  businessName?: string;
  description?: string;
  targetAudience?: string;
  style?: string;
  primaryColor?: string;
  secondaryColor?: string;
  prompt?: string;
  requirements?: string;
  requestedFeatures?: string[];
}

export type VisualArchetype =
  | "minimal_editorial"
  | "dark_technical"
  | "clean_clinical"
  | "warm_artisanal"
  | "bold_brutalist"
  | "expressive_creative"
  | "luxury_bespoke"
  | "high_trust_service";

export interface ComputedDesignStrategy extends DesignStrategyData {
  sectionSequence: string[];
  imageIntents: Record<string, ImageIntentConfig>;
  typographyTokens: {
    headingFont: string;
    bodyFont: string;
    headingScale: number;
    letterSpacing: string;
    lineHeight: number;
    headingStyle: "uppercase" | "normal" | "serif" | "geometric";
  };
  colorSystem: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    contrastRatio: number;
    mood: string;
  };
}

/**
 * Derives visual archetype based on industry, brand cues, and explicit user requirements.
 */
export function deriveVisualArchetype(context: StrategyInputContext): VisualArchetype {
  const combined = [
    context.category || "",
    context.style || "",
    context.description || "",
    context.prompt || "",
    context.requirements || "",
  ]
    .join(" ")
    .toLowerCase();

  // 1. Check explicit style requirements first
  const styleOnly = (context.style || "").toLowerCase();
  if (
    styleOnly.includes("brutalist") ||
    styleOnly.includes("neo-brutalist") ||
    combined.includes("neo-brutalist") ||
    combined.includes("brutalist style") ||
    (combined.includes("brutalist") && !combined.includes("architect"))
  ) {
    return "bold_brutalist";
  }
  if (
    combined.includes("luxury") ||
    combined.includes("bespoke") ||
    combined.includes("high-end") ||
    combined.includes("couture") ||
    combined.includes("fashion")
  ) {
    return "luxury_bespoke";
  }
  if (combined.includes("editorial") || combined.includes("magazine") || combined.includes("vogue")) {
    return "minimal_editorial";
  }
  if (combined.includes("dark mode") || combined.includes("cyber") || combined.includes("matrix") || combined.includes("technical")) {
    return "dark_technical";
  }

  // 2. Industry-driven archetypes
  if (
    combined.includes("dental") ||
    combined.includes("dentist") ||
    combined.includes("clinic") ||
    combined.includes("doctor") ||
    combined.includes("medical") ||
    combined.includes("health") ||
    combined.includes("hospital")
  ) {
    return "clean_clinical";
  }

  if (
    combined.includes("restaurant") ||
    combined.includes("cafe") ||
    combined.includes("coffee") ||
    combined.includes("bakery") ||
    combined.includes("bistro") ||
    combined.includes("dining") ||
    combined.includes("culinary") ||
    combined.includes("food")
  ) {
    return "warm_artisanal";
  }

  if (
    combined.includes("saas") ||
    combined.includes("software") ||
    combined.includes("ai tool") ||
    combined.includes("developer") ||
    combined.includes("tech platform") ||
    combined.includes("fintech") ||
    combined.includes("cloud")
  ) {
    return "dark_technical";
  }

  if (
    combined.includes("architect") ||
    combined.includes("interior design") ||
    combined.includes("landscape design") ||
    combined.includes("villa")
  ) {
    return "minimal_editorial";
  }

  if (
    combined.includes("fashion") ||
    combined.includes("jewelry") ||
    combined.includes("perfume") ||
    combined.includes("apparel") ||
    combined.includes("boutique")
  ) {
    return "luxury_bespoke";
  }

  if (
    combined.includes("agency") ||
    combined.includes("creative studio") ||
    combined.includes("designer") ||
    combined.includes("photograph") ||
    combined.includes("portfolio")
  ) {
    return "expressive_creative";
  }

  if (
    combined.includes("plumber") ||
    combined.includes("electrician") ||
    combined.includes("locksmith") ||
    combined.includes("hvac") ||
    combined.includes("roofing") ||
    combined.includes("mechanic") ||
    combined.includes("contractor")
  ) {
    return "high_trust_service";
  }

  return "minimal_editorial";
}

/**
 * Determines purposeful, industry-specific section sequence to eliminate repetitive layouts.
 */
export function deriveSectionSequence(archetype: VisualArchetype, context: StrategyInputContext): string[] {
  const combined = [
    context.category || "",
    context.prompt || "",
    context.requirements || "",
    ...(context.requestedFeatures || []),
  ].join(" ").toLowerCase();

  const hasCustomPricing = combined.includes("pricing") || combined.includes("plans");

  let sequence: string[];

  switch (archetype) {
    case "warm_artisanal": // Restaurant / Cafe / Bakery
      sequence = ["hero", "signature_dishes", "atmosphere_story", "menu", "gallery", "reviews", "contact", "footer"];
      break;

    case "clean_clinical": // Dental / Medical Clinic
      sequence = ["hero", "trust_proof", "services", "doctor_clinic", "treatment_process", "reviews", "faq", "contact", "footer"];
      break;

    case "dark_technical": // SaaS / AI Platform
      sequence = ["hero", "social_proof", "features", "workflow_steps", "services", "faq", "contact", "footer"];
      if (hasCustomPricing) {
        sequence.splice(sequence.indexOf("faq"), 0, "pricing");
      }
      break;

    case "minimal_editorial": // Architecture / Design
      sequence = ["hero", "selected_works", "project_details", "about", "services", "contact", "footer"];
      break;

    case "luxury_bespoke": // Luxury Fashion / Boutique
      sequence = ["hero", "curated_collection", "craft_heritage", "lookbook", "services", "reviews", "contact", "footer"];
      break;

    case "high_trust_service": // Plumber / Electrician / Trades
      sequence = ["hero", "emergency_services", "trust_guarantees", "services", "reviews", "service_area", "contact", "footer"];
      break;

    case "expressive_creative": // Creative Agency / Portfolio
      sequence = ["hero", "selected_cases", "creative_capabilities", "about", "awards_metrics", "contact", "footer"];
      break;

    case "bold_brutalist":
      sequence = ["hero", "manifesto", "services", "selected_works", "faq", "contact", "footer"];
      break;

    default:
      sequence = ["hero", "about", "services", "features", "reviews", "faq", "contact", "footer"];
  }

  // Ensure contact and footer exist at end
  if (!sequence.includes("footer")) sequence.push("footer");
  return sequence;
}

/**
 * Computes Spatial 3D eligibility according to category, brand goals, and device constraints.
 */
export function deriveSpatial3dConfig(archetype: VisualArchetype, context: StrategyInputContext): Spatial3dConfig {
  const combined = [
    context.category || "",
    context.prompt || "",
    context.requirements || "",
    context.style || "",
  ].join(" ").toLowerCase();

  const hasExplicitNoAnimation =
    /\b(no\s+animat\w*|without\s+animat\w*|disable\s+animat\w*|no\s+motion|static\s+only|plain)\b/i.test(
      combined
    );

  const hasExplicit3DRequest =
    /\b(3d|spatial|perspective|tilt|depth|interactive\s+hero|parallax|floating\s+cards)\b/i.test(combined);

  if (hasExplicitNoAnimation) {
    return {
      enabled: false,
      level: "NONE",
      targetSection: "hero",
      mobileFallback: "flat",
    };
  }

  if (hasExplicit3DRequest) {
    return {
      enabled: true,
      level: "ADVANCED_CSS_3D",
      targetSection: "hero",
      perspective: 1200,
      tiltMaxDeg: 12,
      zSeparationPx: 32,
      mobileFallback: "2.5d",
    };
  }

  switch (archetype) {
    case "dark_technical": // SaaS / AI
    case "expressive_creative": // Creative Agency
    case "minimal_editorial": // Architecture
      return {
        enabled: true,
        level: "ADVANCED_CSS_3D",
        targetSection: "hero",
        perspective: 1200,
        tiltMaxDeg: 10,
        zSeparationPx: 24,
        mobileFallback: "2.5d",
      };

    case "luxury_bespoke": // Luxury DTC
      return {
        enabled: true,
        level: "SUBTLE_2_5D",
        targetSection: "hero",
        perspective: 1400,
        tiltMaxDeg: 5,
        zSeparationPx: 12,
        mobileFallback: "flat",
      };

    case "clean_clinical": // Dental / Healthcare
    case "high_trust_service": // Trades / Plumbing
    case "warm_artisanal": // Restaurant / Cafe
    default:
      return {
        enabled: false,
        level: "NONE",
        targetSection: "hero",
        mobileFallback: "flat",
      };
  }
}

/**
 * Computes Background Strategy (Textures, dot-grids, technical grids, noise, tonal fields).
 */
export function deriveBackgroundStrategy(archetype: VisualArchetype, isDark: boolean): BackgroundStyleConfig {
  switch (archetype) {
    case "dark_technical":
      return {
        type: "tech_grid",
        color: isDark ? "#090D16" : "#0F172A",
        accentColor: "rgba(56, 189, 248, 0.08)",
        patternOpacity: 0.12,
      };

    case "minimal_editorial":
      return {
        type: "editorial_whitespace",
        color: isDark ? "#121214" : "#FDFCFA",
        patternOpacity: 0,
      };

    case "warm_artisanal":
      return {
        type: "tonal_field",
        color: isDark ? "#181411" : "#FAF6F0",
        accentColor: "rgba(217, 119, 6, 0.06)",
        patternOpacity: 0.08,
      };

    case "clean_clinical":
      return {
        type: "solid",
        color: isDark ? "#0A111E" : "#F8FAFC",
        accentColor: "rgba(2, 132, 199, 0.04)",
        patternOpacity: 0.04,
      };

    case "luxury_bespoke":
      return {
        type: "editorial_whitespace",
        color: isDark ? "#0C0A09" : "#FAFAF9",
        accentColor: "rgba(212, 175, 55, 0.05)",
        patternOpacity: 0.03,
      };

    case "expressive_creative":
    case "bold_brutalist":
      return {
        type: "dot_grid",
        color: isDark ? "#0F0F12" : "#F8F8FA",
        accentColor: "rgba(168, 85, 247, 0.1)",
        patternOpacity: 0.14,
      };

    case "high_trust_service":
    default:
      return {
        type: "solid",
        color: isDark ? "#0F172A" : "#FFFFFF",
        patternOpacity: 0.02,
      };
  }
}

/**
 * Computes Image Intent for each purposeful section.
 */
export function deriveImageIntents(
  archetype: VisualArchetype,
  context: StrategyInputContext
): Record<string, ImageIntentConfig> {
  const business = context.businessName || "the business";

  switch (archetype) {
    case "warm_artisanal":
      return {
        hero: {
          subject: `Warm cinematic dining atmosphere, artisan beverage or signature dish for ${business}`,
          visualStyle: "cinematic warm lighting, shallow depth of field, organic textures",
          aspectRatio: "16:9",
          composition: "wide landscape hero framing with negative space for headline typography",
          crop: "center-weighted crop focused on culinary artistry",
          purpose: "Evoke immediate appetite and sensory warmth",
          fallbackType: "tonal_composition",
        },
        signature_dishes: {
          subject: "Close-up plating of chef signature dishes, natural daylight, gourmet garnish",
          visualStyle: "crisp macro food photography",
          aspectRatio: "4:3",
          composition: "centered top-down or 45-degree angle plating",
          crop: "tight crop on food texture",
          purpose: "Showcase culinary craft and ingredient quality",
          fallbackType: "tonal_composition",
        },
        atmosphere_story: {
          subject: "Inviting restaurant interior, candlelit dining tables, artisan kitchen craft",
          visualStyle: "warm ambient hospitality photography",
          aspectRatio: "4:3",
          composition: "deep environmental interior perspective",
          crop: "wide architectural crop",
          purpose: "Establish physical dining ambiance and comfort",
          fallbackType: "tonal_composition",
        },
      };

    case "clean_clinical":
      return {
        hero: {
          subject: `Modern state-of-the-art clinical interior or friendly healthcare professional for ${business}`,
          visualStyle: "bright natural daylight, sterile calm, reassuring professional demeanor",
          aspectRatio: "16:9",
          composition: "clean split composition with uncluttered clinical environment",
          crop: "eye-level patient perspective",
          purpose: "Alleviate patient dental anxiety and establish clinical hygiene and trust",
          fallbackType: "svg_geometric",
        },
        doctor_clinic: {
          subject: "Compassionate clinician consultation, advanced ergonomic treatment room",
          visualStyle: "authentic medical portraiture, reassuring smiles",
          aspectRatio: "4:3",
          composition: "clinician with modern medical equipment",
          crop: "medium close-up",
          purpose: "Humanize care and demonstrate medical competence",
          fallbackType: "svg_geometric",
        },
      };

    case "minimal_editorial":
      return {
        hero: {
          subject: `Striking modern architectural exterior or serene interior spatial design by ${business}`,
          visualStyle: "golden-hour architectural photography, sharp geometric lines, dramatic shadows",
          aspectRatio: "16:9",
          composition: "monumental landscape framing, rigorous horizontal alignment",
          crop: "wide cinematic architectural crop",
          purpose: "Demonstrate spatial mastery and aesthetic refinement",
          fallbackType: "abstract_mesh",
        },
        selected_works: {
          subject: "Contemporary residential or commercial facade, sustainable materials",
          visualStyle: "crisp daylight architectural documentation",
          aspectRatio: "4:3",
          composition: "geometric elevation view",
          crop: "centered structural framing",
          purpose: "Showcase portfolio pedigree and material execution",
          fallbackType: "abstract_mesh",
        },
      };

    case "dark_technical":
      return {
        hero: {
          subject: `Next-generation software UI dashboard, interactive data graphs, glowing telemetry for ${business}`,
          visualStyle: "sleek dark UI, subtle neon accent edge glows, crisp typography",
          aspectRatio: "16:10",
          composition: "isometric or straight-on interface depth showcase",
          crop: "browser window or floating product frame",
          purpose: "Demonstrate product velocity, capability, and modern engineering",
          fallbackType: "abstract_mesh",
        },
      };

    case "luxury_bespoke":
      return {
        hero: {
          subject: `High-end editorial fashion model or luxury product showcase for ${business}`,
          visualStyle: "high-contrast studio lighting, neutral muted tones, tactile fabric textures",
          aspectRatio: "4:5",
          composition: "vertical editorial lookbook framing",
          crop: "fashion editorial portrait crop",
          purpose: "Project exclusivity, craftsmanship, and prestige",
          fallbackType: "tonal_composition",
        },
      };

    case "high_trust_service":
    default:
      return {
        hero: {
          subject: `Professional licensed technician with modern service vehicle and tools for ${business}`,
          visualStyle: "authentic clean trades photography, bright outdoor daylight",
          aspectRatio: "16:9",
          composition: "approachable professional with trust badges",
          crop: "action-oriented service framing",
          purpose: "Provide immediate customer reassurance of speed, reliability, and licensure",
          fallbackType: "svg_geometric",
        },
      };
  }
}

/**
 * Master Design Strategy generator.
 * Harmonizes archetype, section sequence, spatial 3D, background, image intent, and typography.
 */
export function generateDesignStrategy(context: StrategyInputContext): ComputedDesignStrategy {
  const archetype = deriveVisualArchetype(context);
  const isDark =
    (context.style || "").toLowerCase().includes("dark") ||
    (context.prompt || "").toLowerCase().includes("dark mode") ||
    archetype === "dark_technical";

  const sectionSequence = deriveSectionSequence(archetype, context);
  const spatial3d = deriveSpatial3dConfig(archetype, context);
  const backgroundStrategy = deriveBackgroundStrategy(archetype, isDark);
  const imageIntents = deriveImageIntents(archetype, context);

  // Hero layout variant matching archetype
  const heroType =
    spatial3d.enabled && spatial3d.level === "ADVANCED_CSS_3D"
      ? "spatial_depth_hero"
      : archetype === "minimal_editorial"
      ? "fullscreen_visual"
      : archetype === "luxury_bespoke"
      ? "minimal_editorial"
      : archetype === "high_trust_service"
      ? "action_focused"
      : "split_showcase";

  const cardTreatment =
    archetype === "dark_technical"
      ? "glassmorphic"
      : archetype === "minimal_editorial" || archetype === "luxury_bespoke"
      ? "flat_minimal"
      : archetype === "bold_brutalist"
      ? "bordered"
      : "elevated";

  // Typography tokens
  const typographyTokens = {
    headingFont:
      archetype === "minimal_editorial" || archetype === "luxury_bespoke"
        ? "Playfair Display, serif"
        : archetype === "dark_technical"
        ? "Space Grotesk, sans-serif"
        : "Plus Jakarta Sans, sans-serif",
    bodyFont: "Inter, sans-serif",
    headingScale: archetype === "minimal_editorial" ? 1.55 : 1.4,
    letterSpacing: archetype === "dark_technical" ? "-0.03em" : "-0.015em",
    lineHeight: 1.15,
    headingStyle: (archetype === "bold_brutalist" ? "uppercase" : "normal") as "uppercase" | "normal" | "serif" | "geometric",
  };

  // Color system
  const colorSystem = {
    primary: context.primaryColor || (archetype === "clean_clinical" ? "#0284C7" : archetype === "warm_artisanal" ? "#D97706" : archetype === "dark_technical" ? "#38BDF8" : "#2563EB"),
    secondary: context.secondaryColor || (archetype === "clean_clinical" ? "#0D9488" : archetype === "warm_artisanal" ? "#78350F" : archetype === "dark_technical" ? "#818CF8" : "#60A5FA"),
    accent: archetype === "warm_artisanal" ? "#F59E0B" : "#F43F5E",
    bg: backgroundStrategy.color || (isDark ? "#090D16" : "#FFFFFF"),
    surface: isDark ? "rgba(255, 255, 255, 0.05)" : "#FFFFFF",
    text: isDark ? "#F8FAFC" : "#0F172A",
    muted: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
    contrastRatio: archetype === "clean_clinical" ? 7.0 : 4.5,
    mood: archetype,
  };

  return {
    visualArchetype: archetype,
    heroType,
    colorMood: archetype,
    typographyStyle: typographyTokens.headingFont,
    cardTreatment,
    backgroundStrategy,
    spatial3d,
    sectionSequence,
    imageIntents,
    typographyTokens,
    colorSystem,
  };
}
