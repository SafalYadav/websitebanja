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
  CardFamily,
  SkillExecutionPlan,
  SkillExecutionSectionPlan,
  HeroBackgroundConfig,
} from "@/types/website";
import { getHeroAtmosphereImage } from "@/lib/categoryImages";

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
  skillExecutionPlan: SkillExecutionPlan;
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

  // 2. Industry-driven archetypes (must precede generic marketing adjectives like "bespoke" or "high-end")
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
    combined.includes("agency") ||
    combined.includes("creative studio") ||
    combined.includes("branding studio") ||
    combined.includes("design agency") ||
    combined.includes("advertising") ||
    combined.includes("portfolio")
  ) {
    return "expressive_creative";
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
    combined.includes("couture") ||
    combined.includes("fashion") ||
    combined.includes("apparel") ||
    combined.includes("jewelry") ||
    combined.includes("perfume") ||
    combined.includes("luxury boutique")
  ) {
    return "luxury_bespoke";
  }

  if (
    combined.includes("ceramic") ||
    combined.includes("pottery") ||
    combined.includes("tableware") ||
    combined.includes("stoneware") ||
    (combined.includes("craft") && !combined.includes("software") && !combined.includes("fashion")) ||
    combined.includes("artisanal")
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

  // 3. Fallback style descriptors
  if (
    combined.includes("luxury") ||
    combined.includes("bespoke") ||
    combined.includes("high-end")
  ) {
    return "luxury_bespoke";
  }
  if (combined.includes("editorial") || combined.includes("magazine") || combined.includes("vogue")) {
    return "minimal_editorial";
  }
  if (combined.includes("dark mode") || combined.includes("cyber") || combined.includes("matrix") || combined.includes("technical")) {
    return "dark_technical";
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
    context.description || "",
    context.businessName || "",
    ...(context.requestedFeatures || []),
  ].join(" ").toLowerCase();

  const hasCustomPricing = combined.includes("pricing") || combined.includes("plans");

  // 1. Dental Clinic / Healthcare / Orthodontics (must precede ceramic check to prevent "ceramic braces" matching pottery)
  if (
    combined.includes("dental") ||
    combined.includes("dentist") ||
    combined.includes("clinic") ||
    combined.includes("doctor") ||
    combined.includes("medical") ||
    combined.includes("healthcare") ||
    combined.includes("orthodont") ||
    combined.includes("teeth")
  ) {
    return ["hero", "trust_proof", "services", "doctor_clinic", "treatment_process", "reviews", "faq", "contact", "footer"];
  }

  // 2. Ceramics / E-Commerce / Stoneware
  const isDentalOrMedical =
    combined.includes("dental") ||
    combined.includes("dentist") ||
    combined.includes("orthodont") ||
    combined.includes("teeth") ||
    combined.includes("clinic") ||
    combined.includes("braces") ||
    combined.includes("aligner");

  if (
    !isDentalOrMedical &&
    (combined.includes("ceramic") ||
      combined.includes("pottery") ||
      combined.includes("tableware") ||
      combined.includes("stoneware") ||
      combined.includes("e-commerce") ||
      combined.includes("ecommerce"))
  ) {
    return ["hero", "curated_collection", "about", "craft_heritage", "features", "reviews", "faq", "contact", "footer"];
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
    return ["hero", "signature_dishes", "atmosphere_story", "menu", "gallery", "reviews", "contact", "footer"];
  }

  if (
    combined.includes("saas") ||
    combined.includes("software") ||
    combined.includes("ai platform") ||
    combined.includes("ai tool") ||
    combined.includes("developer") ||
    combined.includes("tech platform") ||
    combined.includes("fintech") ||
    combined.includes("cloud")
  ) {
    const seq = ["hero", "social_proof", "features", "workflow_steps", "services", "faq", "contact", "footer"];
    if (hasCustomPricing) seq.splice(seq.indexOf("faq"), 0, "pricing");
    return seq;
  }

  if (
    combined.includes("architect") ||
    combined.includes("interior design") ||
    combined.includes("spatial") ||
    combined.includes("landscape design")
  ) {
    return ["hero", "selected_works", "project_details", "about", "services", "contact", "footer"];
  }

  if (
    combined.includes("fashion") ||
    combined.includes("couture") ||
    combined.includes("apparel") ||
    combined.includes("boutique") ||
    combined.includes("jewelry")
  ) {
    return ["hero", "curated_collection", "craft_heritage", "lookbook", "services", "reviews", "contact", "footer"];
  }

  if (
    combined.includes("agency") ||
    combined.includes("creative studio") ||
    combined.includes("branding") ||
    combined.includes("design studio")
  ) {
    return ["hero", "selected_cases", "creative_capabilities", "about", "awards_metrics", "contact", "footer"];
  }

  if (
    combined.includes("electric") ||
    combined.includes("plumb") ||
    combined.includes("locksmith") ||
    combined.includes("hvac") ||
    combined.includes("roofing") ||
    combined.includes("mechanic") ||
    combined.includes("trades") ||
    combined.includes("contractor")
  ) {
    return ["hero", "emergency_services", "trust_guarantees", "services", "reviews", "service_area", "contact", "footer"];
  }

  let sequence: string[];

  switch (archetype) {
    case "warm_artisanal":
      sequence = ["hero", "curated_collection", "about", "craft_heritage", "reviews", "contact", "footer"];
      break;

    case "clean_clinical":
      sequence = ["hero", "trust_proof", "services", "doctor_clinic", "treatment_process", "reviews", "faq", "contact", "footer"];
      break;

    case "dark_technical":
      sequence = ["hero", "social_proof", "features", "workflow_steps", "services", "faq", "contact", "footer"];
      if (hasCustomPricing) {
        sequence.splice(sequence.indexOf("faq"), 0, "pricing");
      }
      break;

    case "minimal_editorial":
      sequence = ["hero", "selected_works", "project_details", "about", "services", "contact", "footer"];
      break;

    case "luxury_bespoke":
      sequence = ["hero", "curated_collection", "craft_heritage", "lookbook", "services", "reviews", "contact", "footer"];
      break;

    case "high_trust_service":
      sequence = ["hero", "emergency_services", "trust_guarantees", "services", "reviews", "service_area", "contact", "footer"];
      break;

    case "expressive_creative":
      sequence = ["hero", "selected_cases", "creative_capabilities", "about", "awards_metrics", "contact", "footer"];
      break;

    case "bold_brutalist":
      sequence = ["hero", "manifesto", "services", "selected_works", "faq", "contact", "footer"];
      break;

    default:
      sequence = ["hero", "about", "services", "features", "reviews", "faq", "contact", "footer"];
  }

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
 * Computes Background Strategy (Textures, dot-grids, technical grids, noise, tonal fields, warm glow, clinical calm, luxury noir).
 */
export function deriveBackgroundStrategy(archetype: VisualArchetype, isDark: boolean): BackgroundStyleConfig {
  switch (archetype) {
    case "warm_artisanal": // Cafe, Restaurant, Bakery
      return {
        type: "warm_glow",
        color: isDark ? "#140E0A" : "#FBF7F0",
        accentColor: "rgba(217, 119, 6, 0.12)",
        patternOpacity: 0.15,
      };

    case "clean_clinical": // Dental, Medical Clinic
      return {
        type: "clinical_calm",
        color: isDark ? "#0A131F" : "#F8FAFC",
        accentColor: "rgba(2, 132, 199, 0.08)",
        patternOpacity: 0.06,
      };

    case "luxury_bespoke": // Luxury Fashion, High-End DTC
      return {
        type: isDark ? "luxury_noir" : "editorial_whitespace",
        color: isDark ? "#0B0A09" : "#FAF9F6",
        accentColor: "rgba(212, 175, 55, 0.08)",
        patternOpacity: 0.05,
      };

    case "dark_technical": // SaaS, AI Platform
      return {
        type: "tech_grid",
        color: isDark ? "#080C14" : "#0F172A",
        accentColor: "rgba(56, 189, 248, 0.08)",
        patternOpacity: 0.14,
      };

    case "minimal_editorial": // Architecture, Fine Art
      return {
        type: "editorial_whitespace",
        color: isDark ? "#101012" : "#FDFCFA",
        patternOpacity: 0,
      };

    case "expressive_creative": // Creative Agency, Studio
    case "bold_brutalist":
      return {
        type: "dot_grid",
        color: isDark ? "#0D0D11" : "#F8F8FA",
        accentColor: "rgba(168, 85, 247, 0.12)",
        patternOpacity: 0.15,
      };

    case "high_trust_service": // Trades, Plumber, Electrician
    default:
      return {
        type: "solid",
        color: isDark ? "#0F172A" : "#FFFFFF",
        patternOpacity: 0.03,
      };
  }
}

/**
 * Derives contextual Hero background atmosphere matching the business domain and visual archetype.
 * Enforces the core rule: "visible when you look for it, invisible when you read the headline."
 */
export function deriveHeroBackground(
  archetype: VisualArchetype,
  context: StrategyInputContext,
  isDark: boolean
): HeroBackgroundConfig {
  const imageUrl = getHeroAtmosphereImage(context.category, archetype);

  switch (archetype) {
    case "warm_artisanal": // Restaurant, Cafe, Bakery, Bistro, Ceramics
      return {
        mode: "contextual-image",
        semanticIntent: "Warm artisanal coffee crema swirl with soft morning steam and botanical terracotta glow, low contrast watermark atmosphere",
        imageUrl,
        negativeTerms: ["giant cup stock photo", "busy cafe people", "harsh flash", "distracting elements", "clinical"],
        opacity: 0.16,
        blur: 16,
        position: "right-edge",
        scale: 1.15,
        overlay: "radial-vignette",
        fadeDirection: "to-left",
      };

    case "clean_clinical": // Dental Clinic, Doctors, Medical
      return {
        mode: "abstract",
        semanticIntent: "Translucent clean dental clinical instruments soft cyan glow, comforting spa-like serene medical geometry",
        imageUrl,
        negativeTerms: ["open mouth", "drills", "bloody", "surgery", "pottery", "ceramics", "food", "dark"],
        opacity: 0.12,
        blur: 24,
        position: "top-right",
        scale: 1.1,
        overlay: "linear-fade-left",
        fadeDirection: "to-left",
      };

    case "dark_technical": // SaaS, AI, Distributed Database
      return {
        mode: "abstract",
        semanticIntent: "Deep obsidian telemetry lines, glowing vector cluster mesh, sub-millisecond retrieval node graph",
        imageUrl,
        negativeTerms: ["office workers", "cafe", "food", "beach", "happy corporate team", "bright lights"],
        opacity: 0.18,
        blur: 20,
        position: "right-edge",
        scale: 1.2,
        overlay: "linear-fade-left",
        fadeDirection: "to-left",
      };

    case "minimal_editorial": // Architecture Studio
      return {
        mode: "architectural",
        semanticIntent: "Concrete facade shadow play, minimalist spatial linework, modern cantilever architectural perspective",
        imageUrl,
        negativeTerms: ["crowded city", "colorful stock image", "random construction workers", "busy textures"],
        opacity: 0.14,
        blur: 14,
        position: "floating-offset",
        scale: 1.15,
        overlay: "radial-vignette",
        fadeDirection: "to-left",
      };

    case "luxury_bespoke": // Luxury Fashion Maison
      return {
        mode: "material",
        semanticIntent: "Hand-woven double-faced silk fabric folds, tactile atelier textile drape, ethereal cashmere texture",
        imageUrl,
        negativeTerms: ["bright runway lights", "cheap clothing", "busy shopping mall", "distracting logos"],
        opacity: 0.15,
        blur: 18,
        position: "right-edge",
        scale: 1.15,
        overlay: "linear-fade-left",
        fadeDirection: "to-left",
      };

    case "high_trust_service": // Electrician, Emergency Trades
      return {
        mode: "texture",
        semanticIntent: "Subtle electrical blueprint schematic lines, copper wiring geometry, precision technical diagram",
        imageUrl,
        negativeTerms: ["kitchen", "bathroom", "random living room", "unrelated home interior"],
        opacity: 0.12,
        blur: 20,
        position: "right-edge",
        scale: 1.15,
        overlay: "linear-fade-left",
        fadeDirection: "to-left",
      };

    case "expressive_creative": // Creative Agency, Branding Studio
      return {
        mode: "atmospheric",
        semanticIntent: "Kinetic typographic distortion, layered visual gradients, monochromatic brand monolith atmosphere",
        imageUrl,
        negativeTerms: ["generic corporate office", "handshakes", "stock charts", "cluttered stock photos"],
        opacity: 0.16,
        blur: 22,
        position: "center",
        scale: 1.2,
        overlay: "radial-vignette",
        fadeDirection: "radial-out",
      };

    case "bold_brutalist":
    default:
      return {
        mode: "gradient",
        semanticIntent: "Subtle architectural tonal field with restrained edge highlight",
        imageUrl,
        opacity: 0.10,
        blur: 24,
        position: "center",
        scale: 1.1,
        overlay: "radial-vignette",
        fadeDirection: "center-soft",
      };
  }
}

/**
 * Derives bespoke Hero composition matching the business domain and customer psychology.
 */
export function deriveHeroLayout(
  archetype: VisualArchetype,
  context: StrategyInputContext,
  spatial3d: Spatial3dConfig
): "split_showcase" | "fullscreen_visual" | "minimal_editorial" | "spatial_depth_hero" | "bento_grid_hero" | "action_focused" {
  const combined = [
    context.category || "",
    context.prompt || "",
    context.description || "",
    context.style || "",
  ].join(" ").toLowerCase();

  // Explicit user override wins
  if (combined.includes("fullscreen") || combined.includes("cinematic hero")) return "fullscreen_visual";
  if (combined.includes("minimal hero") || combined.includes("editorial hero")) return "minimal_editorial";
  if (combined.includes("bento hero") || combined.includes("bento grid")) return "bento_grid_hero";
  if (combined.includes("split hero") || combined.includes("split showcase")) return "split_showcase";

  if (spatial3d.enabled && spatial3d.level === "ADVANCED_CSS_3D") {
    return "spatial_depth_hero";
  }

  switch (archetype) {
    case "warm_artisanal": // Restaurant / Cafe: cinematic atmosphere, sensory immersion
      return "fullscreen_visual";

    case "clean_clinical": // Dental / Healthcare: reassurance, appointment CTA, doctor trust
      return "action_focused";

    case "minimal_editorial": // Architecture: spatial grandeur, gallery photography
      return "fullscreen_visual";

    case "luxury_bespoke": // Fashion: high-fashion editorial typography, refined framing
      return "minimal_editorial";

    case "high_trust_service": // Plumber / Emergency: rapid call CTA, trust badges
      return "action_focused";

    case "expressive_creative": // Agency: creative showcase, bold hierarchy
      return "bento_grid_hero";

    case "dark_technical": // SaaS / AI: interactive software preview, feature depth
      return "spatial_depth_hero";

    case "bold_brutalist":
      return "minimal_editorial";

    default:
      return "split_showcase";
  }
}

/**
 * Generates an evocative visual art direction concept for the business.
 */
export function deriveVisualConcept(archetype: VisualArchetype, context: StrategyInputContext): { concept: string; summary: string } {
  const name = context.businessName || "The Brand";
  switch (archetype) {
    case "warm_artisanal":
      return {
        concept: "Sensory Warmth & Artisanal Hospitality",
        summary: `Crafted for ${name} with rich coffee/culinary textures, amber ambient lighting, and an inviting, tactile dining atmosphere.`,
      };
    case "clean_clinical":
      return {
        concept: "Tranquil Clinical Excellence & Reassuring Care",
        summary: `Tailored for ${name} with soothing cyan/sky tones, spacious clinical cleanliness, and immediate trust-building cues that ease patient anxiety.`,
      };
    case "dark_technical":
      return {
        concept: "High-Velocity Obsidian Infrastructure",
        summary: `Architected for ${name} with deep slate backgrounds, illuminated technical grids, glowing interface cards, and precise developer-grade typography.`,
      };
    case "minimal_editorial":
      return {
        concept: "Monolithic Geometry & Sculpted Natural Light",
        summary: `Curated for ${name} with generous gallery whitespace, architectural framing, refined serif typography, and full-bleed spatial imagery.`,
      };
    case "luxury_bespoke":
      return {
        concept: "Tactile Haute Couture & High-Contrast Elegance",
        summary: `Styled for ${name} with editorial typography, rich noir/champagne accents, and museum-grade collection showcases.`,
      };
    case "high_trust_service":
      return {
        concept: "Neighborhood Reliability & Instant Proof",
        summary: `Focused for ${name} on rapid-response availability, transparent guarantees, licensed credentials, and immediate phone/booking conversion.`,
      };
    case "expressive_creative":
      return {
        concept: "Boundary-Pushing Experimental Studio",
        summary: `Designed for ${name} with asymmetric bento layouts, bold kinetic typography, and immersive case study storytelling.`,
      };
    case "bold_brutalist":
      return {
        concept: "High-Impact Neo-Brutalism",
        summary: `Engineered for ${name} with raw stark contrast, heavy structured borders, and unapologetic typographic conviction.`,
      };
    default:
      return {
        concept: "Bespoke Modern Distinction",
        summary: `Engineered specifically for ${name} with tailored typography, thoughtful color harmony, and purposeful narrative hierarchy.`,
      };
  }
}

/**
 * Derives Motion Strategy level with device and reduced-motion awareness.
 */
export function deriveMotionStrategy(archetype: VisualArchetype, context: StrategyInputContext): "NONE" | "SUBTLE" | "MODERATE" | "CINEMATIC" {
  const prompt = (context.prompt || "").toLowerCase();
  if (/no\s+motion|no\s+animat\w*|static\s+only/i.test(prompt)) return "NONE";
  if (/cinematic|heavy\s+motion|dynamic/i.test(prompt)) return "CINEMATIC";

  switch (archetype) {
    case "luxury_bespoke":
    case "expressive_creative":
      return "CINEMATIC";
    case "warm_artisanal":
    case "dark_technical":
      return "MODERATE";
    case "clean_clinical":
    case "minimal_editorial":
    case "high_trust_service":
    default:
      return "SUBTLE";
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
 * Derives a deterministic, traceable skill execution plan connecting selected skills,
 * section layout archetypes, compositional card families, interaction patterns, and negative image guards.
 */
export function deriveSkillExecutionPlan(
  archetype: VisualArchetype,
  context: StrategyInputContext,
  sectionSequence: string[]
): SkillExecutionPlan {
  const cat = (context.category || "").toLowerCase();
  const desc = (context.description || "").toLowerCase();
  const prompt = (context.prompt || "").toLowerCase();
  const combined = `${cat} ${desc} ${prompt}`;

  // 1. Relevant Skills selection (5-8 skills)
  const selectedSkills: Array<{ skillId: string; reason: string; instructionsApplied: string[] }> = [
    {
      skillId: "ui-ux",
      reason: "Visual hierarchy, clear scan paths, and high-conversion above-the-fold value proposition",
      instructionsApplied: ["3-second clarity test", "CTA contrast dominance", "WCAG readability"],
    },
    {
      skillId: "design-systems",
      reason: "8pt spatial rhythm and tokens tailored to " + archetype,
      instructionsApplied: ["Spacing tokens", "Surface elevations", "Consistent border radii"],
    },
    {
      skillId: "typography",
      reason: "Optimal optical hierarchy and typographic pairing for " + archetype,
      instructionsApplied: ["Display font pairing", "Line measure <= 65ch", "Fluid type scaling"],
    },
    {
      skillId: "responsive-design",
      reason: "Mobile-first reflow, 44x44px touch targets, zero horizontal overflow",
      instructionsApplied: ["Touch targets", "Fluid flex/grid reflow", "0px horizontal overflow guard"],
    },
    {
      skillId: "accessibility",
      reason: "WCAG 2.2 AA contrast adherence and keyboard navigation",
      instructionsApplied: ["Contrast verification", "Semantic landmarks", "Focus rings"],
    },
  ];

  // Add contextual industry/technical skills
  if (archetype === "dark_technical" || combined.includes("saas") || combined.includes("tech")) {
    selectedSkills.push(
      {
        skillId: "saas-ux",
        reason: "Time-to-value acceleration, high-density telemetry, and technical workflow clarity",
        instructionsApplied: ["Bento information density", "Interactive telemetry preview", "Direct friction-free CTA"],
      },
      {
        skillId: "21st-dev",
        reason: "Dark technical aesthetics with spotlight glows, subtle glass borders, and tech-grids",
        instructionsApplied: ["Spotlight glow cards", "Bento layout structure", "Micro-glow accents"],
      },
      {
        skillId: "framer-motion",
        reason: "Spring-physics hover states and staggered entrance choreography",
        instructionsApplied: ["Spring transitions", "Reduced-motion media query fallback"],
      }
    );
  } else if (archetype === "clean_clinical" || combined.includes("dental") || combined.includes("clinic")) {
    selectedSkills.push(
      {
        skillId: "clean-clinical",
        reason: "High-trust clinical calm palette, patient anxiety reduction, and diagnostic proof",
        instructionsApplied: ["Sterile calm color system", "Trust badge hierarchy", "Clear booking touchpoints"],
      },
      {
        skillId: "cro",
        reason: "Urgent care & booking appointment velocity with prominent contact actions",
        instructionsApplied: ["Primary appointment action", "Emergency contact visibility", "Social proof placement"],
      },
      {
        skillId: "ux-psychology",
        reason: "Social proof, authoritative reassurance, and reduced cognitive friction for anxious patients",
        instructionsApplied: ["Social proof clustering", "Authority credential signals", "Clarity over complexity"],
      }
    );
  } else if (archetype === "warm_artisanal" || combined.includes("restaurant") || combined.includes("cafe")) {
    selectedSkills.push(
      {
        skillId: "creative-art-direction",
        reason: "Rich sensory storytelling, warm hearth tones, and artisanal culinary ambiance",
        instructionsApplied: ["Warm glow ambient lighting", "Artisanal food photography layout", "Editorial typography"],
      },
      {
        skillId: "cro",
        reason: "Reservation conversion optimization and easy menu discovery",
        instructionsApplied: ["Reserve table CTA prominence", "Signature dish showcases", "Location and hours clarity"],
      }
    );
  } else if (archetype === "minimal_editorial" || combined.includes("architect")) {
    selectedSkills.push(
      {
        skillId: "creative-art-direction",
        reason: "Disciplined negative space, refined serif hierarchy, and spatial project framing",
        instructionsApplied: ["Generous editorial whitespace", "Architectural blueprint layout", "Curated work showcase"],
      },
      {
        skillId: "spatial-interaction",
        reason: "Perspective depth and spatial layering honoring architectural physical space",
        instructionsApplied: ["Subtle CSS 3D tilt", "Multi-plane project cards", "Tactile hover inspection"],
      }
    );
  } else if (archetype === "luxury_bespoke" || combined.includes("fashion") || combined.includes("couture")) {
    selectedSkills.push(
      {
        skillId: "luxury-noir",
        reason: "High-contrast editorial framing, bespoke atelier heritage, and tactile curtain reveals",
        instructionsApplied: ["Luxury noir contrast scrim", "Atelier collection showcase", "Curtain reveal transitions"],
      },
      {
        skillId: "creative-art-direction",
        reason: "Haute couture typography, poetic copy cadence, and heirloom materiality",
        instructionsApplied: ["Serif display titles", "Muted gold accents", "Lookbook layout structure"],
      }
    );
  } else if (archetype === "high_trust_service" || combined.includes("electric") || combined.includes("plumb")) {
    selectedSkills.push(
      {
        skillId: "high-trust-service",
        reason: "Immediate emergency dispatch, certified master tradespeople verification, and upfront pricing",
        instructionsApplied: ["24/7 Emergency call bar", "License & bonding trust badges", "Transparent pricing guarantees"],
      },
      {
        skillId: "cro",
        reason: "Click-to-call direct conversion and 30-minute rapid arrival guarantees",
        instructionsApplied: ["Sticky phone contact", "Emergency dispatch banner", "Verified homeowner reviews"],
      }
    );
  } else if (combined.includes("ceramic") || combined.includes("pottery") || combined.includes("ecommerce")) {
    selectedSkills.push(
      {
        skillId: "ecommerce-ux",
        reason: "Faceted product curation, tactile ceramic texture zoom, and streamlined checkout",
        instructionsApplied: ["Product catalog cards", "Wabi-sabi earth tone palette", "Quick purchase CTAs"],
      },
      {
        skillId: "creative-art-direction",
        reason: "Tactile artisanal materiality highlighting kiln-fired textures and organic forms",
        instructionsApplied: ["Warm studio photography", "Artisanal collection framing", "Muted terracotta tones"],
      }
    );
  } else if (archetype === "expressive_creative" || combined.includes("agency")) {
    selectedSkills.push(
      {
        skillId: "creative-art-direction",
        reason: "Bold visual personality, kinetic type reveals, and boundary-pushing portfolio layouts",
        instructionsApplied: ["Kinetic headline reveal", "Interactive portfolio grid", "Deep dark canvas"],
      },
      {
        skillId: "21st-dev",
        reason: "High-polish modern design components and tactile interactive states",
        instructionsApplied: ["Magnetic buttons", "Interactive cursor states", "Physics gravity containers"],
      }
    );
  }

  // Determine negative image keywords per industry to eliminate cross-industry image contamination
  const negativeImageTerms: string[] = ["blurry", "watermark", "low-res", "stock artifact"];
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("food")) {
    negativeImageTerms.push("medical", "dentistry", "doctor", "clinic", "circuit", "code", "motherboard", "software", "warehouse", "wire", "wrench", "industrial", "blueprint");
  } else if (cat.includes("dental") || cat.includes("clinic") || cat.includes("medical")) {
    negativeImageTerms.push("food", "restaurant", "burger", "pizza", "coffee", "fashion", "runway", "fabric", "circuit", "dark mode", "wrench", "cocktail", "bar", "nightclub");
  } else if (cat.includes("tech") || cat.includes("saas") || cat.includes("software") || cat.includes("ai")) {
    negativeImageTerms.push("food", "restaurant", "clinic", "dentist", "pottery", "clay", "ceramics", "dress", "runway", "wrench", "pipes", "plumbing", "dentistry");
  } else if (cat.includes("architect") || cat.includes("interior")) {
    negativeImageTerms.push("fast food", "dentistry", "tooth", "clinic", "neon", "server room", "coding", "retail rack", "plumbing", "wrench", "cocktail");
  } else if (cat.includes("fashion") || cat.includes("couture")) {
    negativeImageTerms.push("food", "dental", "tech", "server", "wire", "screwdriver", "wrench", "pipes", "code", "clinical", "hospital", "dentist");
  } else if (cat.includes("electric") || cat.includes("plumb") || cat.includes("repair") || cat.includes("trade")) {
    negativeImageTerms.push("fashion", "haute couture", "runway", "cocktail", "pizza", "ceramics", "pottery", "luxury jewelry", "model", "dentist");
  } else if (cat.includes("ceramic") || cat.includes("pottery") || cat.includes("tableware")) {
    negativeImageTerms.push("dental", "clinic", "electrician", "circuit board", "server rack", "cyber", "surgery", "wrench", "motherboard", "code");
  } else if (cat.includes("agency") || cat.includes("creative")) {
    negativeImageTerms.push("dental", "medical", "clinic", "fast food", "plumbing", "wrench", "cheap clipart", "tools", "teeth", "hospital");
  }

  // Section-by-section plan
  const sections: SkillExecutionSectionPlan[] = sectionSequence.map((secKey) => {
    let cardFamily: CardFamily = "bento";
    let interactionPattern = "MagneticButton";
    const motionPattern = "spring_reveal";

    if (secKey === "features" || secKey === "trust_proof" || secKey === "trust_guarantees") {
      if (archetype === "dark_technical") {
        cardFamily = "bento";
        interactionPattern = "CommandPalette";
      } else if (archetype === "clean_clinical") {
        cardFamily = "comparison";
        interactionPattern = "MagneticButton";
      } else if (archetype === "warm_artisanal") {
        cardFamily = "editorial";
        interactionPattern = "MagneticButton";
      } else if (archetype === "minimal_editorial") {
        cardFamily = "project-showcase";
        interactionPattern = "PerspectiveCarousel";
      } else if (archetype === "luxury_bespoke") {
        cardFamily = "image-reveal";
        interactionPattern = "VerseCard";
      } else if (archetype === "high_trust_service") {
        cardFamily = "comparison";
        interactionPattern = "MagneticButton";
      } else if (archetype === "expressive_creative") {
        cardFamily = "feature-reveal";
        interactionPattern = "PhysicsGravityContainer";
      } else {
        cardFamily = "bento";
      }
    } else if (
      secKey === "services" ||
      secKey === "menu" ||
      secKey === "signature_dishes" ||
      secKey === "emergency_services" ||
      secKey === "creative_capabilities"
    ) {
      if (archetype === "clean_clinical") {
        cardFamily = "perspective";
      } else if (archetype === "warm_artisanal") {
        cardFamily = "service";
      } else if (archetype === "dark_technical") {
        cardFamily = "spotlight";
      } else if (archetype === "minimal_editorial") {
        cardFamily = "horizontal-media";
      } else if (archetype === "luxury_bespoke") {
        cardFamily = "horizontal-media";
      } else if (archetype === "high_trust_service") {
        cardFamily = "service";
      } else if (archetype === "expressive_creative") {
        cardFamily = "spotlight";
      } else {
        cardFamily = "service";
      }
    } else if (secKey === "products" || secKey === "catalog" || secKey === "curated_collection") {
      if (archetype === "luxury_bespoke") {
        cardFamily = "image-reveal";
      } else {
        cardFamily = "expandable";
      }
    } else if (secKey === "reviews" || secKey === "testimonials" || secKey === "patient_reviews" || secKey === "guest_reviews") {
      if (archetype === "minimal_editorial" || archetype === "luxury_bespoke") {
        cardFamily = "stacked";
      } else {
        cardFamily = "testimonial-stack";
      }
    } else if (secKey === "workflow_steps" || secKey === "process" || secKey === "treatment_process" || secKey === "methodology") {
      if (archetype === "dark_technical") {
        cardFamily = "expandable";
      } else if (archetype === "clean_clinical") {
        cardFamily = "stacked";
      } else {
        cardFamily = "service";
      }
    } else if (secKey === "awards_metrics" || secKey === "service_area") {
      cardFamily = "stat";
    } else if (secKey === "about" || secKey === "craft_heritage" || secKey === "atmosphere_story" || secKey === "doctor_clinic") {
      cardFamily = "editorial";
    } else if (secKey === "contact" || secKey === "reservation" || secKey === "booking") {
      cardFamily = "floating";
    }

    return {
      sectionType: secKey,
      cardFamily,
      interactionPattern,
      motionPattern,
      imageNegativeTerms: negativeImageTerms,
    };
  });

  return {
    selectedSkills,
    layoutFamily: `${archetype}_grid_system`,
    sectionOrder: sectionSequence,
    sections,
  };
}

/**
 * Master Design Strategy generator.
 * Harmonizes archetype, section sequence, spatial 3D, background, image intent, typography, and skill execution plan.
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
  const heroBackground = deriveHeroBackground(archetype, context, isDark);
  const imageIntents = deriveImageIntents(archetype, context);
  const skillExecutionPlan = deriveSkillExecutionPlan(archetype, context, sectionSequence);

  // Hero layout variant matching archetype and business domain
  const heroType = deriveHeroLayout(archetype, context, spatial3d);
  const visualConceptData = deriveVisualConcept(archetype, context);
  const motionStrategy = deriveMotionStrategy(archetype, context);

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

  const antiRepetitionFingerprint = `${archetype}_${heroType}_${backgroundStrategy.type}_${typographyTokens.headingFont.split(",")[0].trim().replace(/\s+/g, "")}_${colorSystem.primary.replace("#", "")}`;

  return {
    visualArchetype: archetype,
    heroType,
    colorMood: archetype,
    typographyStyle: typographyTokens.headingFont,
    cardTreatment,
    backgroundStrategy,
    spatial3d,
    heroBackground,
    sectionSequence,
    imageIntents,
    skillExecutionPlan,
    typographyTokens,
    colorSystem,
    visualConcept: visualConceptData.concept,
    artDirectionSummary: visualConceptData.summary,
    antiRepetitionFingerprint,
    motionStrategy,
  };
}
