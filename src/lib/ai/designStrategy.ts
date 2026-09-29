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
  BackgroundType,
  DesignStrategyData,
  ImageIntentConfig,
  Spatial3dConfig,
  CardFamily,
  CardColorTreatment,
  CardFamilyStrategyConfig,
  SkillExecutionPlan,
  SkillExecutionSectionPlan,
  HeroBackgroundConfig,
  FeaturesLayoutStrategyConfig,
  FeaturesLayoutVariant,
  FeaturesCardGeometry,
  FeaturesAnimationStrategy,
  FeaturesIconTreatment,
} from "@/types/website";
import { getHeroAtmosphereImage } from "@/lib/categoryImages";
import { resolveCardColorTreatment } from "@/lib/cardStyles";
import { resolveSemanticImage } from "@/lib/images/semanticImageSourcing";

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
  seed?: string | number;
  requestedFeatures?: string[];
  avoidPatterns?: string[];
  recentFingerprints?: any[];
  threeDPreference?: "yes" | "no";
  motionPreference?: "none" | "subtle" | "high";
}

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
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
  cardFamilyStrategy: CardFamilyStrategyConfig;
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
    /** Alternate surface (elevated card) */
    surfaceAlt?: string;
    text: string;
    muted: string;
    border: string;
    shadow?: string;
    /** Accent color for card highlights */
    cardAccent?: string;
    /** Accent color for section-level highlights */
    sectionAccent?: string;
    contrastRatio: number;
    mood: string;
    /** Palette name identifier for anti-repetition */
    paletteName?: string;
    /** Whether this is a dark-mode palette */
    isDark?: boolean;
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

  // 2. Specialized Phase 6 industries (checked first to prevent greedy substring collisions)
  if (
    combined.includes("hotel") ||
    combined.includes("resort") ||
    combined.includes("hospitality") ||
    combined.includes("luxury stay") ||
    combined.includes("boutique hotel")
  ) {
    return "luxury_bespoke";
  }

  if (
    /\bspa\b/.test(combined) ||
    combined.includes("wellness") ||
    combined.includes("yoga") ||
    combined.includes("pilates") ||
    combined.includes("meditation") ||
    combined.includes("holistic") ||
    combined.includes("ayurved")
  ) {
    return "warm_artisanal";
  }

  if (
    combined.includes("law firm") ||
    combined.includes("attorney") ||
    combined.includes("lawyer") ||
    combined.includes("legal counsel") ||
    combined.includes("litigation")
  ) {
    return "high_trust_service";
  }

  if (
    combined.includes("dealership") ||
    combined.includes("automotive") ||
    combined.includes("automobile") ||
    combined.includes("car sales")
  ) {
    return "bold_brutalist";
  }

  if (
    combined.includes("finance") ||
    combined.includes("wealth management") ||
    combined.includes("investment") ||
    combined.includes("accounting") ||
    combined.includes("hedge fund")
  ) {
    return "dark_technical";
  }

  if (
    combined.includes("education") ||
    combined.includes("university") ||
    combined.includes("college") ||
    combined.includes("academy") ||
    combined.includes("school")
  ) {
    return "clean_clinical";
  }

  // 3. Baseline industry-driven archetypes
  if (
    combined.includes("dental") ||
    combined.includes("dentist") ||
    combined.includes("clinic") ||
    combined.includes("doctor") ||
    combined.includes("medical") ||
    (combined.includes("health") && !combined.includes("wellness")) ||
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
    (combined.includes("dining") && !combined.includes("hotel") && !combined.includes("resort")) ||
    combined.includes("culinary") ||
    combined.includes("food")
  ) {
    const avoidList = (Array.isArray(context.avoidPatterns) ? context.avoidPatterns : []).map((p) => p.toLowerCase());
    const recentArchetypes = (Array.isArray(context.recentFingerprints) ? context.recentFingerprints : []).map(
      (fp: any) => String(fp.visualArchetype || "").toLowerCase()
    );

    const candidates: VisualArchetype[] = [
      "warm_artisanal",
      "minimal_editorial",
      "luxury_bespoke",
      "expressive_creative",
      "bold_brutalist",
    ];

    const seedNum = typeof context.seed === "number"
      ? Math.abs(context.seed)
      : (context.seed ? Math.abs(stringToSeed(String(context.seed))) : 0);

    const uncollided = candidates.filter(
      (c) => !avoidList.some((a) => a.includes(c)) && !recentArchetypes.includes(c)
    );

    if (uncollided.length > 0) {
      return uncollided[seedNum % uncollided.length];
    }

    return candidates[seedNum % candidates.length];
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

  // Phase 6: Expanded industry section sequences (prioritized to avoid false fashion/restaurant matches)
  if (
    combined.includes("hotel") ||
    combined.includes("resort") ||
    combined.includes("hospitality") ||
    combined.includes("luxury stay") ||
    combined.includes("boutique hotel")
  ) {
    return ["hero", "room_showcase", "amenities", "about", "dining", "reviews", "booking", "footer"];
  }

  if (
    /\bspa\b/.test(combined) ||
    combined.includes("wellness") ||
    combined.includes("yoga") ||
    combined.includes("pilates") ||
    combined.includes("meditation") ||
    combined.includes("holistic") ||
    combined.includes("ayurved")
  ) {
    return ["hero", "treatments", "atmosphere", "practitioners", "pricing", "reviews", "contact", "footer"];
  }

  if (
    combined.includes("law firm") ||
    combined.includes("attorney") ||
    combined.includes("lawyer") ||
    combined.includes("legal counsel") ||
    combined.includes("litigation")
  ) {
    return ["hero", "practice_areas", "attorney_profiles", "case_results", "testimonials", "contact", "footer"];
  }

  if (
    combined.includes("finance") ||
    combined.includes("wealth management") ||
    combined.includes("investment") ||
    combined.includes("accounting") ||
    combined.includes("hedge fund")
  ) {
    return ["hero", "solutions", "process", "social_proof", "features", "contact", "footer"];
  }

  if (
    combined.includes("education") ||
    combined.includes("university") ||
    combined.includes("college") ||
    combined.includes("academy") ||
    combined.includes("school")
  ) {
    return ["hero", "programs", "faculty", "outcomes", "campus", "faq", "contact", "footer"];
  }

  if (
    combined.includes("dealership") ||
    combined.includes("automotive") ||
    combined.includes("automobile") ||
    combined.includes("car sales")
  ) {
    return ["hero", "productsSection", "services", "features", "about", "faq", "contact", "footer"];
  }

  // 1. Dental Clinic / Healthcare / Orthodontics (must precede ceramic check to prevent "ceramic braces" matching pottery)
  if (
    combined.includes("dental") ||
    combined.includes("dentist") ||
    combined.includes("clinic") ||
    combined.includes("doctor") ||
    combined.includes("medical") ||
    (combined.includes("healthcare") && !combined.includes("wellness")) ||
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
    (combined.includes("boutique") && !combined.includes("hotel") && !combined.includes("resort")) ||
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

  // Anti-Repetition: safely vary interior section order if collision detected
  const avoidList = (Array.isArray(context.avoidPatterns) ? context.avoidPatterns : []).map((p) => p.toLowerCase());
  const hasSequenceCollision =
    avoidList.some((p) => p.includes("section_order") || p.includes("order") || p.includes("reorder")) ||
    (Array.isArray(context.recentFingerprints) ? context.recentFingerprints : []).some(
      (fp: any) => Array.isArray(fp.sectionOrder) && JSON.stringify(fp.sectionOrder) === JSON.stringify(sequence)
    );

  if (hasSequenceCollision && sequence.length >= 5) {
    // Preserve hero as first and contact/footer as last, swap/rotate interior sections
    const interior = sequence.slice(1, -2);
    if (interior.length >= 2) {
      const swapped = [interior[1], interior[0], ...interior.slice(2)];
      sequence = [sequence[0], ...swapped, sequence[sequence.length - 2], sequence[sequence.length - 1]];
    }
  }

  return sequence;
}

/**
 * Computes Spatial 3D eligibility according to category, brand goals, and device constraints.
 * 3D IS NOT THE DEFAULT. 3D/WebGL/R3F MUST NEVER be automatically added without explicit user consent.
 */
export function deriveSpatial3dConfig(archetype: VisualArchetype, context: StrategyInputContext): Spatial3dConfig {
  // 1. Explicit NO preference has absolute priority
  if (context.threeDPreference === "no") {
    return {
      enabled: false,
      level: "NONE",
      targetSection: "hero",
      mobileFallback: "flat",
    };
  }

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

  const hasExplicitNo3D =
    /\b(no\s+3d|without\s+3d|2d\s+only|simple\s+2d|normal\s+website|flat\s+website|3d\s+nahi|no\s+webgl)\b/i.test(
      combined
    );

  if (hasExplicitNoAnimation || hasExplicitNo3D) {
    return {
      enabled: false,
      level: "NONE",
      targetSection: "hero",
      mobileFallback: "flat",
    };
  }

  // 2. Explicit 3D request check
  const hasExplicit3DRequest =
    context.threeDPreference === "yes" ||
    /\b(3d\s*(?:website|model|models|canvas|animation|animations|effect|effects|scroll|scene|hero|product\s+viewer|view)|three\.?js|webgl|r3f|react\s+three\s+fiber|spline|spatial\s+3d|3d\s+chahiye)\b/i.test(
      combined
    );

  // 3. 3D IS NOT THE DEFAULT: Return NONE for all archetypes unless explicitly requested
  if (!hasExplicit3DRequest) {
    return {
      enabled: false,
      level: "NONE",
      targetSection: "hero",
      mobileFallback: "flat",
    };
  }

  // 4. Explicit 3D requested: configure spatial depth
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

/**
 * Computes Background Strategy (Textures, dot-grids, technical grids, noise, tonal fields, warm glow, clinical calm, luxury noir, mesh gradient, paper texture, organic warmth, architectural plane, cinematic dark, layered fields, spatial depth mesh).
 * 
 * Rules:
 * 1. User Prompt Overrides ALWAYS Win ("minimal white" -> solid #FFF; "dark cinematic" -> cinematic_dark; "nature/organic" -> organic_warmth).
 * 2. If 3D is ON, select spatial depth backdrops (e.g. spatial_depth_mesh).
 * 3. Dynamic Archetype Candidates with Anti-Repetition Rotation (never repeat the exact same backdrop across successive runs of the same business).
 */
export function deriveBackgroundStrategy(
  archetype: VisualArchetype,
  isDark: boolean,
  context?: StrategyInputContext,
  spatial3d?: Spatial3dConfig
): BackgroundStyleConfig {
  const prompt = [
    context?.prompt || "",
    context?.requirements || "",
    context?.style || "",
    context?.description || "",
  ]
    .join(" ")
    .toLowerCase();

  // 1. Explicit user prompt overrides ALWAYS take absolute precedence
  if (
    prompt.includes("minimal white") ||
    prompt.includes("clean white") ||
    prompt.includes("pure white") ||
    prompt.includes("crisp white") ||
    prompt.includes("clean whitespace")
  ) {
    return {
      type: "solid",
      color: "#FFFFFF",
      patternOpacity: 0,
    };
  }

  if (prompt.includes("dark cinematic") || prompt.includes("cinematic dark") || prompt.includes("midnight noir")) {
    return {
      type: "cinematic_dark",
      color: "#070A0F",
      accentColor: "rgba(56, 189, 248, 0.12)",
      patternOpacity: 0.2,
    };
  }

  if (prompt.includes("nature") || prompt.includes("organic warmth") || prompt.includes("terracotta") || prompt.includes("earthy")) {
    return {
      type: "organic_warmth",
      color: isDark ? "#140E0A" : "#FDFBF7",
      accentColor: "rgba(217, 119, 6, 0.12)",
      patternOpacity: 0.16,
    };
  }

  if (prompt.includes("paper") || prompt.includes("craft") || prompt.includes("textured paper") || prompt.includes("print magazine")) {
    return {
      type: "paper_texture",
      color: isDark ? "#121214" : "#FAF8F5",
      accentColor: "rgba(120, 53, 15, 0.08)",
      patternOpacity: 0.14,
    };
  }

  if (prompt.includes("architectural") || prompt.includes("geometry") || prompt.includes("concrete")) {
    return {
      type: "architectural_plane",
      color: isDark ? "#0F0F12" : "#F8F8FA",
      accentColor: "rgba(99, 102, 241, 0.08)",
      patternOpacity: 0.15,
    };
  }

  if (prompt.includes("mesh gradient") || prompt.includes("aurora") || prompt.includes("ambient glow")) {
    return {
      type: "mesh_gradient",
      color: isDark ? "#0A0D14" : "#F8FAFC",
      accentColor: isDark ? "rgba(99, 102, 241, 0.20)" : "rgba(56, 189, 248, 0.18)",
      patternOpacity: 0.22,
    };
  }

  if (prompt.includes("tech grid") || prompt.includes("matrix") || prompt.includes("cyber") || prompt.includes("terminal")) {
    return {
      type: "tech_grid",
      color: isDark ? "#080C14" : "#0F172A",
      accentColor: "rgba(56, 189, 248, 0.10)",
      patternOpacity: 0.15,
    };
  }

  // 2. Spatial 3D Enabled Specifics
  if (spatial3d?.enabled) {
    return {
      type: "spatial_depth_mesh",
      color: isDark ? "#05070B" : "#F4F6FB",
      accentColor: isDark ? "rgba(56, 189, 248, 0.18)" : "rgba(79, 70, 229, 0.12)",
      patternOpacity: 0.25,
    };
  }

  // 3. Dynamic Archetype Candidates with Anti-Repetition Rotation
  const seedNum = typeof context?.seed === "number"
    ? Math.abs(context.seed)
    : (context?.seed ? Math.abs(stringToSeed(String(context.seed))) : 0);

  const avoidList = (Array.isArray(context?.avoidPatterns) ? context.avoidPatterns : []).map((p) => p.toLowerCase());
  const recentBgTypes = (Array.isArray(context?.recentFingerprints) ? context.recentFingerprints : []).map(
    (fp: any) => String(fp.backgroundType || fp.backgroundStrategy?.type || "").toLowerCase()
  );

  const archetypeBgCandidates: Record<VisualArchetype, BackgroundType[]> = {
    warm_artisanal: ["organic_warmth", "warm_glow", "paper_texture", "layered_fields", "mesh_gradient", "subtle_grain"],
    clean_clinical: ["clinical_calm", "solid", "subtle_grain", "layered_fields", "mesh_gradient"],
    luxury_bespoke: [isDark ? "luxury_noir" : "editorial_whitespace", "architectural_plane", "layered_fields", "mesh_gradient", "paper_texture"],
    dark_technical: ["tech_grid", "cinematic_dark", "mesh_gradient", "noise", "layered_fields"],
    minimal_editorial: ["editorial_whitespace", "paper_texture", "architectural_plane", "solid", "subtle_grain"],
    bold_brutalist: ["dot_grid", "layered_fields", "solid", "tech_grid", "mesh_gradient"],
    expressive_creative: ["mesh_gradient", "layered_fields", "dot_grid", "cinematic_dark", "noise"],
    high_trust_service: ["solid", "subtle_grain", "layered_fields", "warm_glow"],
  };

  const pool = archetypeBgCandidates[archetype] || ["solid", "layered_fields", "mesh_gradient"];
  const uncollided = pool.filter(
    (bg) => !avoidList.some((a) => a.includes(bg.toLowerCase())) && !recentBgTypes.includes(bg.toLowerCase())
  );

  const chosenType = uncollided.length > 0
    ? uncollided[seedNum % uncollided.length]
    : pool[seedNum % pool.length];

  switch (chosenType) {
    case "organic_warmth":
      return {
        type: "organic_warmth",
        color: isDark ? "#140E0A" : "#FDFBF7",
        accentColor: "rgba(217, 119, 6, 0.12)",
        patternOpacity: 0.15,
      };
    case "warm_glow":
      return {
        type: "warm_glow",
        color: isDark ? "#140E0A" : "#FBF7F0",
        accentColor: "rgba(217, 119, 6, 0.12)",
        patternOpacity: 0.15,
      };
    case "paper_texture":
      return {
        type: "paper_texture",
        color: isDark ? "#121214" : "#FAF8F5",
        accentColor: "rgba(120, 53, 15, 0.08)",
        patternOpacity: 0.12,
      };
    case "mesh_gradient":
      return {
        type: "mesh_gradient",
        color: isDark ? "#090D16" : "#F8FAFC",
        accentColor: isDark ? "rgba(99, 102, 241, 0.20)" : "rgba(217, 119, 6, 0.14)",
        patternOpacity: 0.20,
      };
    case "cinematic_dark":
      return {
        type: "cinematic_dark",
        color: "#070A0F",
        accentColor: "rgba(56, 189, 248, 0.12)",
        patternOpacity: 0.18,
      };
    case "architectural_plane":
      return {
        type: "architectural_plane",
        color: isDark ? "#0F0F12" : "#F8F8FA",
        accentColor: "rgba(99, 102, 241, 0.08)",
        patternOpacity: 0.12,
      };
    case "layered_fields":
      return {
        type: "layered_fields",
        color: isDark ? "#0D111A" : "#FAFBFD",
        accentColor: isDark ? "rgba(56, 189, 248, 0.10)" : "rgba(217, 119, 6, 0.08)",
        patternOpacity: 0.14,
      };
    case "tech_grid":
      return {
        type: "tech_grid",
        color: isDark ? "#080C14" : "#0F172A",
        accentColor: "rgba(56, 189, 248, 0.08)",
        patternOpacity: 0.14,
      };
    case "clinical_calm":
      return {
        type: "clinical_calm",
        color: isDark ? "#0A131F" : "#F8FAFC",
        accentColor: "rgba(2, 132, 199, 0.08)",
        patternOpacity: 0.06,
      };
    case "luxury_noir":
      return {
        type: "luxury_noir",
        color: "#0B0A09",
        accentColor: "rgba(212, 175, 55, 0.08)",
        patternOpacity: 0.05,
      };
    case "editorial_whitespace":
      return {
        type: "editorial_whitespace",
        color: isDark ? "#101012" : "#FDFCFA",
        patternOpacity: 0,
      };
    case "dot_grid":
      return {
        type: "dot_grid",
        color: isDark ? "#0D0D11" : "#F8F8FA",
        accentColor: "rgba(168, 85, 247, 0.12)",
        patternOpacity: 0.15,
      };
    case "subtle_grain":
      return {
        type: "subtle_grain",
        color: isDark ? "#121316" : "#FBFBFC",
        accentColor: "rgba(0, 0, 0, 0.05)",
        patternOpacity: 0.08,
      };
    case "solid":
    default:
      return {
        type: "solid",
        color: isDark ? "#0F172A" : "#FFFFFF",
        patternOpacity: 0.03,
      };
  }
}

/**
 * Derives coordinated Card Family strategy with anti-repetition avoidance and intra-page specialization.
 * Ensures the website does NOT reuse a single monolithic card pattern for every section.
 */
export function deriveCardFamilyStrategy(
  archetype: VisualArchetype,
  context: StrategyInputContext,
  primaryColor: string,
  secondaryColor: string,
  isDark: boolean,
  colorOverrides?: {
    accentColor?: string;
    surfaceColor?: string;
    borderColor?: string;
    textColor?: string;
  }
): CardFamilyStrategyConfig {
  const seedNum = typeof context.seed === "number"
    ? Math.abs(context.seed)
    : (context.seed ? Math.abs(stringToSeed(String(context.seed))) : 0);

  const avoidList = (Array.isArray(context.avoidPatterns) ? context.avoidPatterns : []).map((p) => p.toLowerCase());
  const recentCards = (Array.isArray(context.recentFingerprints) ? context.recentFingerprints : []).map(
    (fp: any) => String(fp.cardFamily || fp.primaryCardFamily || fp.cardStyle || "").toLowerCase()
  );

  // Diverse pools of primary card families per visual archetype
  const familyPools: Record<VisualArchetype, CardFamily[]> = {
    warm_artisanal: ["organic", "elevated", "bordered", "asymmetric", "soft-surface", "editorial"],
    clean_clinical: ["minimal-flat", "bordered", "soft-surface", "elevated", "technical"],
    luxury_bespoke: ["luxury", "editorial", "image-led", "glass-layered", "asymmetric"],
    dark_technical: ["technical", "glass-layered", "bento", "oversized-typography", "bordered"],
    minimal_editorial: ["editorial", "minimal-flat", "bordered", "asymmetric", "oversized-typography"],
    bold_brutalist: ["brutalist", "bordered", "oversized-typography", "minimal-flat"],
    expressive_creative: ["asymmetric", "brutalist", "image-led", "glass-layered", "oversized-typography"],
    high_trust_service: ["elevated", "bordered", "minimal-flat", "soft-surface"],
  };

  const pool = familyPools[archetype] || ["elevated", "bordered", "minimal-flat"];

  // Anti-repetition: avoid recently used card families
  const uncollided = pool.filter(
    (f) => !avoidList.some((a) => a.includes(f.toLowerCase())) && !recentCards.includes(f.toLowerCase())
  );

  const primaryCardFamily: CardFamily = uncollided.length > 0
    ? uncollided[seedNum % uncollided.length]
    : pool[seedNum % pool.length];

  // Intra-page specialization:
  // Services: media-rich, image-led, horizontal, luxury, or organic
  const servicesCandidates: CardFamily[] = [
    "image-led",
    "horizontal-media",
    "elevated",
    "luxury",
    "organic",
    "soft-surface",
  ];
  const filteredServices = servicesCandidates.filter((c) => c !== primaryCardFamily);
  const servicesCardFamily = filteredServices[seedNum % filteredServices.length] || "image-led";

  // Features: technical, minimal, bordered, brutalist, or bento
  const featuresCandidates: CardFamily[] = [
    "minimal-flat",
    "bordered",
    "bento",
    "technical",
    "brutalist",
    "soft-surface",
  ];
  const filteredFeatures = featuresCandidates.filter((c) => c !== primaryCardFamily && c !== servicesCardFamily);
  const featuresCardFamily = filteredFeatures[(seedNum + 1) % filteredFeatures.length] || "bordered";

  // Reviews: editorial quote, testimonial stack, soft-surface, or asymmetric
  const reviewsCandidates: CardFamily[] = [
    "editorial",
    "testimonial-stack",
    "soft-surface",
    "asymmetric",
    "stacked",
  ];
  const filteredReviews = reviewsCandidates.filter((c) => c !== primaryCardFamily && c !== servicesCardFamily && c !== featuresCardFamily);
  const reviewsCardFamily = filteredReviews[(seedNum + 2) % filteredReviews.length] || "editorial";

  const cardTreatment = resolveCardColorTreatment({
    archetype,
    cardFamily: primaryCardFamily,
    primaryColor,
    secondaryColor,
    accentColor: colorOverrides?.accentColor,
    surfaceColor: colorOverrides?.surfaceColor,
    borderColor: colorOverrides?.borderColor,
    textColor: colorOverrides?.textColor,
    isDark,
  });

  return {
    primaryCardFamily,
    servicesCardFamily,
    featuresCardFamily,
    reviewsCardFamily,
    cardTreatment,
  };
}

/**
 * Derives a rich, dedicated layout and presentation strategy for the Features / "Why Choose Us" section.
 * Enforces at least 8 distinct layout archetypes, dynamic card geometries, animation systems,
 * and contextual non-telemetry metric badges.
 */
export function deriveFeaturesLayoutStrategy(
  archetype: VisualArchetype,
  category: string | undefined,
  context: StrategyInputContext,
  isDark: boolean,
  spatial3d: Spatial3dConfig,
  seedNum: number,
  recentFingerprints?: string[]
): FeaturesLayoutStrategyConfig {
  const cat = (category || "").toLowerCase();

  // 1. Determine candidate layout variants tailored to industry & visual archetype
  let candidates: FeaturesLayoutVariant[] = [];
  if (
    cat.includes("restaurant") ||
    cat.includes("cafe") ||
    cat.includes("coffee") ||
    cat.includes("dining") ||
    cat.includes("bistro") ||
    cat.includes("bakery") ||
    archetype === "warm_artisanal"
  ) {
    candidates = [
      "horizontal-story",
      "feature-timeline",
      "image-led-features",
      "asymmetric-editorial",
      "three-column-grid",
      "oversized-typographic",
    ];
  } else if (
    archetype === "luxury_bespoke" ||
    cat.includes("couture") ||
    cat.includes("fashion") ||
    cat.includes("jewelry") ||
    cat.includes("hotel")
  ) {
    candidates = [
      "editorial-split",
      "image-led-features",
      "asymmetric-editorial",
      "horizontal-story",
      "three-column-grid",
    ];
  } else if (
    archetype === "dark_technical" ||
    cat.includes("saas") ||
    cat.includes("software") ||
    cat.includes("tech") ||
    cat.includes("ai")
  ) {
    candidates = [
      "bento-features",
      "three-column-grid",
      "oversized-typographic",
      "asymmetric-editorial",
      "feature-timeline",
    ];
  } else if (
    archetype === "minimal_editorial" ||
    cat.includes("architect") ||
    cat.includes("interior") ||
    cat.includes("design")
  ) {
    candidates = [
      "oversized-typographic",
      "editorial-split",
      "three-column-grid",
      "horizontal-story",
      "asymmetric-editorial",
    ];
  } else if (
    archetype === "bold_brutalist" ||
    cat.includes("gym") ||
    cat.includes("fitness") ||
    cat.includes("crossfit")
  ) {
    candidates = [
      "oversized-typographic",
      "asymmetric-editorial",
      "three-column-grid",
      "bento-features",
      "horizontal-story",
    ];
  } else if (
    archetype === "expressive_creative" ||
    cat.includes("agency") ||
    cat.includes("studio")
  ) {
    candidates = [
      "bento-features",
      "horizontal-story",
      "image-led-features",
      "asymmetric-editorial",
      "editorial-split",
    ];
  } else if (
    archetype === "clean_clinical" ||
    cat.includes("dental") ||
    cat.includes("clinic") ||
    cat.includes("medical")
  ) {
    candidates = [
      "three-column-grid",
      "editorial-split",
      "asymmetric-editorial",
      "horizontal-story",
      "feature-timeline",
    ];
  } else {
    candidates = [
      "three-column-grid",
      "horizontal-story",
      "asymmetric-editorial",
      "feature-timeline",
      "editorial-split",
      "oversized-typographic",
      "image-led-features",
      "bento-features",
    ];
  }

  // 2. Anti-Repetition Filter against recent fingerprints
  const recentLayouts = new Set<string>();
  const recentGeometries = new Set<string>();
  (recentFingerprints || []).forEach((fp: any) => {
    const str = typeof fp === "string" ? fp : (fp?.antiRepetitionFingerprint || "");
    if (typeof str === "string" && str) {
      const matchLayout = str.match(/feat-layout:([a-z-]+)/);
      if (matchLayout) recentLayouts.add(matchLayout[1]);
      const matchGeom = str.match(/feat-geom:([a-z-]+)/);
      if (matchGeom) recentGeometries.add(matchGeom[1]);
    }
    if (fp && typeof fp === "object") {
      if (fp.featuresLayoutVariant) recentLayouts.add(fp.featuresLayoutVariant);
      if (fp.featuresGeometry) recentGeometries.add(fp.featuresGeometry);
    }
  });

  const availableLayouts = candidates.filter((c) => !recentLayouts.has(c));
  const pool = availableLayouts.length > 0 ? availableLayouts : candidates;
  const layoutVariant = pool[seedNum % pool.length];

  // 3. Determine Card Geometry
  let geometryCandidates: FeaturesCardGeometry[] = [];
  if (archetype === "bold_brutalist") {
    geometryCandidates = ["sharp", "bordered-flat"];
  } else if (archetype === "luxury_bespoke") {
    geometryCandidates = ["sharp", "rounded-standard"];
  } else if (archetype === "warm_artisanal") {
    geometryCandidates = ["rounded-heavy", "rounded-standard", "asymmetric-squircle"];
  } else if (archetype === "clean_clinical") {
    geometryCandidates = ["rounded-standard", "pill-subtle"];
  } else if (archetype === "expressive_creative") {
    geometryCandidates = ["asymmetric-squircle", "rounded-heavy", "pill-subtle"];
  } else {
    geometryCandidates = ["rounded-standard", "rounded-heavy", "sharp", "pill-subtle", "asymmetric-squircle", "bordered-flat"];
  }

  const filteredGeom = geometryCandidates.filter((g) => !recentGeometries.has(g));
  const geomPool = filteredGeom.length > 0 ? filteredGeom : geometryCandidates;
  const cardGeometry = geomPool[(seedNum + 1) % geomPool.length];

  // 4. Determine Density & Divider Style
  const densityList: Array<"compact" | "standard" | "spacious"> = ["standard", "spacious", "compact"];
  const density = densityList[seedNum % densityList.length];

  const dividerList: Array<"none" | "subtle-border" | "dashed" | "accent-solid"> =
    archetype === "bold_brutalist"
      ? ["accent-solid", "subtle-border"]
      : archetype === "luxury_bespoke"
      ? ["subtle-border", "none"]
      : ["subtle-border", "none", "dashed", "accent-solid"];
  const dividerStyle = dividerList[(seedNum + 2) % dividerList.length];

  // 5. Determine Icon Treatment based on layoutVariant & archetype
  let iconTreatment: FeaturesIconTreatment = "inline-icon";
  if (layoutVariant === "oversized-typographic") {
    const opts: FeaturesIconTreatment[] = ["numbered-feature", "no-icon", "decorative-glyph"];
    iconTreatment = opts[seedNum % opts.length];
  } else if (layoutVariant === "horizontal-story") {
    const opts: FeaturesIconTreatment[] = ["numbered-feature", "oversized-icon", "icon-and-label"];
    iconTreatment = opts[seedNum % opts.length];
  } else if (layoutVariant === "feature-timeline") {
    const opts: FeaturesIconTreatment[] = ["numbered-feature", "abstract-shape", "inline-icon"];
    iconTreatment = opts[seedNum % opts.length];
  } else if (layoutVariant === "image-led-features") {
    const opts: FeaturesIconTreatment[] = ["image-thumbnail", "icon-and-label", "inline-icon"];
    iconTreatment = opts[seedNum % opts.length];
  } else if (layoutVariant === "editorial-split") {
    const opts: FeaturesIconTreatment[] = ["icon-and-label", "numbered-feature", "decorative-glyph", "inline-icon"];
    iconTreatment = opts[seedNum % opts.length];
  } else {
    const opts: FeaturesIconTreatment[] = ["oversized-icon", "inline-icon", "abstract-shape", "numbered-feature"];
    iconTreatment = opts[seedNum % opts.length];
  }

  // 6. Animation Strategy
  const animationCandidates: FeaturesAnimationStrategy[] =
    archetype === "bold_brutalist"
      ? ["clip-path-reveal", "editorial-slide", "horizontal-reveal"]
      : archetype === "luxury_bespoke"
      ? ["masked-text-reveal", "fade-up-stagger", "scale-reveal"]
      : archetype === "dark_technical"
      ? ["horizontal-reveal", "scale-reveal", "fade-up-stagger"]
      : archetype === "warm_artisanal"
      ? ["fade-up-stagger", "subtle-parallax", "editorial-slide"]
      : ["fade-up-stagger", "horizontal-reveal", "scale-reveal", "editorial-slide"];
  const animationStrategy = animationCandidates[seedNum % animationCandidates.length];

  // 7. Metric Treatment (Strictly Non-Telemetry)
  const metricOptions: Array<"badge" | "highlight-stat" | "editorial-quote" | "contextual-tag" | "none"> = [
    "contextual-tag",
    "badge",
    "highlight-stat",
    "editorial-quote",
  ];
  const metricTreatment = metricOptions[(seedNum + 3) % metricOptions.length];

  // 8. Header Alignment
  const headerOptions: Array<"center" | "left" | "split"> =
    layoutVariant === "editorial-split"
      ? ["split", "left"]
      : layoutVariant === "asymmetric-editorial"
      ? ["left", "center"]
      : ["center", "left", "split"];
  const headerAlignment = headerOptions[seedNum % headerOptions.length];

  // 9. Spatial 3D Composition (Strictly conditioned on 3D eligibility)
  let spatialComposition: "layered-depth" | "floating-planes" | "depth-separated" | "none" = "none";
  if (spatial3d.enabled && spatial3d.level !== "NONE") {
    const spatialOpts: Array<"layered-depth" | "floating-planes" | "depth-separated"> = [
      "layered-depth",
      "floating-planes",
      "depth-separated",
    ];
    spatialComposition = spatialOpts[seedNum % spatialOpts.length];
  }

  return {
    layoutVariant,
    cardGeometry,
    density,
    dividerStyle,
    iconTreatment,
    animationStrategy,
    metricTreatment,
    headerAlignment,
    spatialComposition,
    mediaPlacement: seedNum % 2 === 0 ? "left" : "right",
  };
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
  const semanticImg = resolveSemanticImage({
    category: context.category,
    businessName: context.businessName,
    archetype,
    role: "heroBackground",
    seed: context.seed,
    avoidImages: (context.avoidPatterns || []).filter((p) => p.startsWith("http")),
  });
  const imageUrl = semanticImg.imageUrl || getHeroAtmosphereImage(context.category, archetype, context.seed || context.businessName);

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

  const candidateOptions: Record<VisualArchetype, Array<"split_showcase" | "fullscreen_visual" | "minimal_editorial" | "spatial_depth_hero" | "bento_grid_hero" | "action_focused">> = {
    warm_artisanal: ["fullscreen_visual", "split_showcase", "minimal_editorial", "spatial_depth_hero"],
    clean_clinical: ["action_focused", "split_showcase", "minimal_editorial", "spatial_depth_hero"],
    minimal_editorial: ["fullscreen_visual", "minimal_editorial", "split_showcase", "spatial_depth_hero"],
    luxury_bespoke: ["minimal_editorial", "fullscreen_visual", "split_showcase", "spatial_depth_hero"],
    high_trust_service: ["action_focused", "split_showcase", "minimal_editorial", "spatial_depth_hero"],
    expressive_creative: ["bento_grid_hero", "split_showcase", "fullscreen_visual", "spatial_depth_hero"],
    dark_technical: ["spatial_depth_hero", "split_showcase", "bento_grid_hero"],
    bold_brutalist: ["minimal_editorial", "split_showcase", "bento_grid_hero", "spatial_depth_hero"],
  };

  type HeroLayoutType = "split_showcase" | "fullscreen_visual" | "minimal_editorial" | "spatial_depth_hero" | "bento_grid_hero" | "action_focused";
  const rawList: HeroLayoutType[] = candidateOptions[archetype] || ["split_showcase", "minimal_editorial", "fullscreen_visual"];
  const validList: HeroLayoutType[] = spatial3d.enabled ? rawList : rawList.filter((cand): cand is HeroLayoutType => cand !== "spatial_depth_hero");
  const list: HeroLayoutType[] = validList.length > 0 ? validList : ["split_showcase", "bento_grid_hero", "fullscreen_visual"];

  // Anti-repetition: check if candidate should be avoided
  const avoidList = (Array.isArray(context.avoidPatterns) ? context.avoidPatterns : []).map((p) => p.toLowerCase());
  const recentLayouts = (Array.isArray(context.recentFingerprints) ? context.recentFingerprints : []).map((fp: any) =>
    String(fp.layoutType || fp.heroType || fp.layoutVariant || "").toLowerCase()
  );

  const shouldAvoid = (cand: string) =>
    avoidList.some((p) => p.includes(cand) || p.includes(`hero:${cand}`)) ||
    recentLayouts.includes(cand);

  const preferred = list[0];
  if (shouldAvoid(preferred)) {
    const alternateCandidate = list.find((cand) => !shouldAvoid(cand)) || list[1] || list[0];
    return alternateCandidate;
  }

  const alternateCandidate = list.find((cand) => !shouldAvoid(cand)) || list[0];
  return alternateCandidate;
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
  sectionSequence: string[],
  cardFamilyStrategy?: CardFamilyStrategyConfig
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
    selectedSkills.push({
      skillId: "creative-art-direction",
      reason: "Disciplined negative space, refined serif hierarchy, and spatial project framing",
      instructionsApplied: ["Generous editorial whitespace", "Architectural blueprint layout", "Curated work showcase"],
    });
    if (context.threeDPreference === "yes") {
      selectedSkills.push({
        skillId: "spatial-interaction",
        reason: "Perspective depth and spatial layering honoring architectural physical space",
        instructionsApplied: ["Subtle CSS 3D tilt", "Multi-plane project cards", "Tactile hover inspection"],
      });
    } else {
      selectedSkills.push({
        skillId: "interaction-design",
        reason: "Refined 2D editorial transitions, interactive gallery filters, and high-elegance micro-interactions",
        instructionsApplied: ["Tactile hover inspection", "Editorial gallery transition", "Refined negative space"],
      });
    }
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
      if (cardFamilyStrategy?.featuresCardFamily) {
        cardFamily = cardFamilyStrategy.featuresCardFamily;
      } else if (archetype === "dark_technical") {
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
      if (cardFamilyStrategy?.servicesCardFamily) {
        cardFamily = cardFamilyStrategy.servicesCardFamily;
      } else if (archetype === "clean_clinical") {
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
      if (cardFamilyStrategy?.reviewsCardFamily) {
        cardFamily = cardFamilyStrategy.reviewsCardFamily;
      } else if (archetype === "minimal_editorial" || archetype === "luxury_bespoke") {
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
  const backgroundStrategy = deriveBackgroundStrategy(archetype, isDark, context, spatial3d);
  const heroBackground = deriveHeroBackground(archetype, context, isDark);
  const imageIntents = deriveImageIntents(archetype, context);

  const seedNum = typeof context.seed === "number"
    ? Math.abs(context.seed)
    : (context.seed ? Math.abs(stringToSeed(String(context.seed))) : 0);

  // Color system with anti-repetition rotation if no explicit user override
  interface PaletteSpec {
    name: string;
    p: string;
    s: string;
    accent: string;
    bg: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    muted: string;
    border: string;
    shadow: string;
    isDark: boolean;
  }

  const palettes: Record<VisualArchetype, Array<PaletteSpec>> = {
    clean_clinical: [
      {
        name: "cerulean_cyan_mist",
        p: "#0284C7",
        s: "#0D9488",
        accent: "#38BDF8",
        bg: "#F8FAFC",
        surface: "#FFFFFF",
        surfaceAlt: "#F1F5F9",
        text: "#0F172A",
        muted: "#64748B",
        border: "rgba(2, 132, 199, 0.14)",
        shadow: "0 16px 36px -10px rgba(2, 132, 199, 0.08)",
        isDark: false,
      },
      {
        name: "teal_emerald_light",
        p: "#0D9488",
        s: "#0284C7",
        accent: "#10B981",
        bg: "#F6FBF9",
        surface: "#FFFFFF",
        surfaceAlt: "#E6F4F1",
        text: "#0F2824",
        muted: "#5E7C77",
        border: "rgba(13, 148, 136, 0.14)",
        shadow: "0 16px 36px -10px rgba(13, 148, 136, 0.08)",
        isDark: false,
      },
      {
        name: "sapphire_azure_clean",
        p: "#2563EB",
        s: "#0284C7",
        accent: "#60A5FA",
        bg: "#FFFFFF",
        surface: "#F8FAFC",
        surfaceAlt: "#EFF6FF",
        text: "#1E293B",
        muted: "#64748B",
        border: "rgba(37, 99, 235, 0.12)",
        shadow: "0 16px 36px -10px rgba(37, 99, 235, 0.07)",
        isDark: false,
      },
      {
        name: "clinical_nordic_slate",
        p: "#059669",
        s: "#10B981",
        accent: "#34D399",
        bg: "#FDFDFD",
        surface: "#FFFFFF",
        surfaceAlt: "#F2FBF7",
        text: "#064E3B",
        muted: "#4B7C6E",
        border: "rgba(5, 150, 105, 0.14)",
        shadow: "0 16px 36px -10px rgba(5, 150, 105, 0.08)",
        isDark: false,
      },
    ],
    warm_artisanal: [
      {
        name: "warm_cream_copper",
        p: "#C2410C", // Copper/Terracotta
        s: "#451A03", // Espresso
        accent: "#D97706", // Amber gold
        bg: "#FDFBF7", // Warm cream
        surface: "#FFFFFF",
        surfaceAlt: "#F8F4EE",
        text: "#292524",
        muted: "#78716C",
        border: "rgba(120, 53, 15, 0.12)",
        shadow: "0 18px 40px -12px rgba(120, 53, 15, 0.08)",
        isDark: false,
      },
      {
        name: "charcoal_amber_ivory",
        p: "#F59E0B", // Amber Gold
        s: "#1C1917", // Deep Charcoal
        accent: "#EA580C", // Burnt Orange
        bg: "#18181B", // Dark charcoal
        surface: "#27272A",
        surfaceAlt: "#202023",
        text: "#FAF5EE",
        muted: "#A1A1AA",
        border: "rgba(245, 158, 11, 0.20)",
        shadow: "0 20px 45px -10px rgba(0, 0, 0, 0.6)",
        isDark: true,
      },
      {
        name: "sage_parchment_earth",
        p: "#2D5A43", // Forest Sage
        s: "#1C2E24", // Deep Pine
        accent: "#854D0E", // Earthy Hazelnut
        bg: "#F7F8F4", // Parchment Mist
        surface: "#FFFFFF",
        surfaceAlt: "#EFF2EA",
        text: "#1F2923",
        muted: "#5F7065",
        border: "rgba(45, 90, 67, 0.12)",
        shadow: "0 16px 36px -10px rgba(45, 90, 67, 0.07)",
        isDark: false,
      },
      {
        name: "terracotta_sand_navy",
        p: "#EA580C", // Terracotta Fire
        s: "#0F172A", // Midnight Navy
        accent: "#0284C7", // Sky Cerulean
        bg: "#FFFDF9", // Sand Dunes
        surface: "#FFFFFF",
        surfaceAlt: "#F8F3EB",
        text: "#0F172A",
        muted: "#64748B",
        border: "rgba(234, 88, 12, 0.14)",
        shadow: "0 18px 42px -12px rgba(15, 23, 42, 0.08)",
        isDark: false,
      },
      {
        name: "monochrome_editorial_stone",
        p: "#18181B", // Obsidian Ink
        s: "#3F3F46", // Slate Zinc
        accent: "#71717A", // Muted Nickel
        bg: "#FAFAFA", // Pure Editorial
        surface: "#FFFFFF",
        surfaceAlt: "#F4F4F5",
        text: "#09090B",
        muted: "#71717A",
        border: "rgba(0, 0, 0, 0.08)",
        shadow: "0 14px 30px -8px rgba(0, 0, 0, 0.05)",
        isDark: false,
      },
    ],
    dark_technical: [
      {
        name: "cyan_telemetry",
        p: "#38BDF8",
        s: "#818CF8",
        accent: "#06B6D4",
        bg: "#0B0F19",
        surface: "rgba(15, 23, 42, 0.85)",
        surfaceAlt: "rgba(30, 41, 59, 0.70)",
        text: "#F8FAFC",
        muted: "#94A3B8",
        border: "rgba(56, 189, 248, 0.22)",
        shadow: "0 0 30px -5px rgba(56, 189, 248, 0.15)",
        isDark: true,
      },
      {
        name: "emerald_matrix",
        p: "#10B981",
        s: "#06B6D4",
        accent: "#34D399",
        bg: "#0A1015",
        surface: "rgba(11, 24, 25, 0.85)",
        surfaceAlt: "rgba(18, 38, 40, 0.70)",
        text: "#F0FDF4",
        muted: "#86EFAC",
        border: "rgba(16, 185, 129, 0.22)",
        shadow: "0 0 30px -5px rgba(16, 185, 129, 0.15)",
        isDark: true,
      },
      {
        name: "violet_cyber",
        p: "#A855F7",
        s: "#6366F1",
        accent: "#EC4899",
        bg: "#0F0D1B",
        surface: "rgba(24, 18, 43, 0.85)",
        surfaceAlt: "rgba(39, 30, 68, 0.70)",
        text: "#FAF5FF",
        muted: "#D8B4FE",
        border: "rgba(168, 85, 247, 0.22)",
        shadow: "0 0 30px -5px rgba(168, 85, 247, 0.15)",
        isDark: true,
      },
    ],
    minimal_editorial: [
      {
        name: "slate_noir_clean",
        p: "#1E293B",
        s: "#475569",
        accent: "#0F172A",
        bg: "#FAFAFA",
        surface: "#FFFFFF",
        surfaceAlt: "#F1F5F9",
        text: "#0F172A",
        muted: "#64748B",
        border: "rgba(0, 0, 0, 0.08)",
        shadow: "none",
        isDark: false,
      },
      {
        name: "warm_parchment_black",
        p: "#18181B",
        s: "#3F3F46",
        accent: "#A16207",
        bg: "#FDFDFD",
        surface: "#FFFFFF",
        surfaceAlt: "#F5F5F4",
        text: "#1C1917",
        muted: "#78716C",
        border: "rgba(0, 0, 0, 0.06)",
        shadow: "none",
        isDark: false,
      },
    ],
    luxury_bespoke: [
      {
        name: "gilded_noir",
        p: "#18181B",
        s: "#D4AF37",
        accent: "#F5E0A3",
        bg: "#0D0D10",
        surface: "#18181D",
        surfaceAlt: "#222228",
        text: "#FAF5E9",
        muted: "#A1A1AA",
        border: "rgba(212, 175, 55, 0.25)",
        shadow: "0 20px 40px -10px rgba(0, 0, 0, 0.7)",
        isDark: true,
      },
      {
        name: "champagne_ivory",
        p: "#78350F",
        s: "#B45309",
        accent: "#D4AF37",
        bg: "#FCFBF8",
        surface: "#FFFFFF",
        surfaceAlt: "#F7F5EE",
        text: "#1C1917",
        muted: "#78716C",
        border: "rgba(180, 140, 40, 0.20)",
        shadow: "0 15px 35px -8px rgba(180, 140, 40, 0.08)",
        isDark: false,
      },
    ],
    bold_brutalist: [
      {
        name: "industrial_international_orange",
        p: "#000000",
        s: "#FF5E00",
        accent: "#FF5E00",
        bg: "#F4F4F4",
        surface: "#FFFFFF",
        surfaceAlt: "#ECECEC",
        text: "#000000",
        muted: "#444444",
        border: "2px solid #000000",
        shadow: "4px 4px 0px 0px #000000",
        isDark: false,
      },
      {
        name: "electric_volt_black",
        p: "#111111",
        s: "#FFE600",
        accent: "#FFE600",
        bg: "#FAFAFA",
        surface: "#FFFFFF",
        surfaceAlt: "#F2F2F2",
        text: "#000000",
        muted: "#555555",
        border: "2px solid #111111",
        shadow: "4px 4px 0px 0px #FFE600",
        isDark: false,
      },
    ],
    expressive_creative: [
      {
        name: "indigo_sunset",
        p: "#6366F1",
        s: "#EC4899",
        accent: "#F43F5E",
        bg: "#FAF5FF",
        surface: "#FFFFFF",
        surfaceAlt: "#F3E8FF",
        text: "#1E1B4B",
        muted: "#6B7280",
        border: "rgba(99, 102, 241, 0.15)",
        shadow: "0 18px 40px -10px rgba(99, 102, 241, 0.08)",
        isDark: false,
      },
      {
        name: "magenta_electric",
        p: "#8B5CF6",
        s: "#F43F5E",
        accent: "#06B6D4",
        bg: "#FFFFFF",
        surface: "#FAF5FF",
        surfaceAlt: "#EDE9FE",
        text: "#2E1065",
        muted: "#7C3AED",
        border: "rgba(139, 92, 246, 0.15)",
        shadow: "0 18px 40px -10px rgba(139, 92, 246, 0.08)",
        isDark: false,
      },
    ],
    high_trust_service: [
      {
        name: "pacific_navy",
        p: "#0284C7",
        s: "#0369A1",
        accent: "#0284C7",
        bg: "#FFFFFF",
        surface: "#F8FAFC",
        surfaceAlt: "#F1F5F9",
        text: "#0F172A",
        muted: "#64748B",
        border: "rgba(2, 132, 199, 0.12)",
        shadow: "0 16px 36px -10px rgba(2, 132, 199, 0.06)",
        isDark: false,
      },
      {
        name: "trusted_forest",
        p: "#059669",
        s: "#047857",
        accent: "#10B981",
        bg: "#F6FBF9",
        surface: "#FFFFFF",
        surfaceAlt: "#E6F4F1",
        text: "#064E3B",
        muted: "#4B7C6E",
        border: "rgba(5, 150, 105, 0.12)",
        shadow: "0 16px 36px -10px rgba(5, 150, 105, 0.06)",
        isDark: false,
      },
    ],
  };

  const avoidList = (Array.isArray(context.avoidPatterns) ? context.avoidPatterns : []).map((p) => p.toLowerCase());
  const recentColors = (Array.isArray(context.recentFingerprints) ? context.recentFingerprints : []).map((fp: any) =>
    String(fp.colorDirection || fp.primaryColor || fp.paletteName || "").toLowerCase()
  );

  const isCollided = (key: string) =>
    avoidList.some((p) => p.includes(key.toLowerCase())) ||
    recentColors.some((rc: string) => rc.includes(key.toLowerCase()));

  const options = palettes[archetype] || palettes.clean_clinical;
  const uncollided = options.filter(
    (opt) => !isCollided(opt.p) && !isCollided(opt.name)
  );
  const chosenPalette: PaletteSpec = uncollided.length > 0
    ? uncollided[seedNum % uncollided.length]
    : options[seedNum % options.length];

  let defaultPrimary = chosenPalette.p;
  let defaultSecondary = chosenPalette.s;

  const hasColorCollision = isCollided(chosenPalette.p) || isCollided(chosenPalette.name);
  if (hasColorCollision && uncollided.length === 0) {
    if (archetype === "clean_clinical") {
      defaultPrimary = "#0D9488";
    } else if (archetype === "warm_artisanal") {
      defaultPrimary = "#B45309";
    } else if (archetype === "dark_technical") {
      defaultPrimary = "#818CF8";
    }
  }

  const resolvedPrimary = context.primaryColor || defaultPrimary;
  const resolvedSecondary = context.secondaryColor || defaultSecondary;

  const cardFamilyStrategy = deriveCardFamilyStrategy(
    archetype,
    context,
    resolvedPrimary,
    resolvedSecondary,
    isDark,
    {
      accentColor: chosenPalette.accent,
      surfaceColor: chosenPalette.surface,
      borderColor: chosenPalette.border,
      textColor: chosenPalette.text,
    }
  );

  const skillExecutionPlan = deriveSkillExecutionPlan(
    archetype,
    context,
    sectionSequence,
    cardFamilyStrategy
  );

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
      archetype === "minimal_editorial"
        ? "Playfair Display, serif"
        : archetype === "luxury_bespoke"
        ? "Cinzel, serif"
        : archetype === "dark_technical"
        ? "Space Grotesk, sans-serif"
        : archetype === "expressive_creative"
        ? "Syne, sans-serif"
        : archetype === "bold_brutalist"
        ? "Outfit, sans-serif"
        : archetype === "warm_artisanal"
        ? "Fraunces, serif"
        : "Plus Jakarta Sans, sans-serif",
    bodyFont:
      archetype === "dark_technical"
        ? "JetBrains Mono, monospace"
        : archetype === "minimal_editorial" || archetype === "luxury_bespoke"
        ? "Inter, sans-serif"
        : archetype === "warm_artisanal"
        ? "Plus Jakarta Sans, sans-serif"
        : "DM Sans, sans-serif",
    headingScale: archetype === "minimal_editorial" ? 1.55 : 1.4,
    letterSpacing: archetype === "dark_technical" ? "-0.03em" : "-0.015em",
    lineHeight: 1.15,
    headingStyle: (archetype === "bold_brutalist" ? "uppercase" : "normal") as "uppercase" | "normal" | "serif" | "geometric",
  };

  const colorSystem = {
    primary: resolvedPrimary,
    secondary: resolvedSecondary,
    accent: chosenPalette.accent || (archetype === "warm_artisanal" ? "#F59E0B" : "#F43F5E"),
    bg: backgroundStrategy.color || chosenPalette.bg || (isDark ? "#090D16" : "#FFFFFF"),
    surface: chosenPalette.surface || (isDark ? "rgba(255, 255, 255, 0.05)" : "#FFFFFF"),
    surfaceAlt: chosenPalette.surfaceAlt || (isDark ? "rgba(255, 255, 255, 0.08)" : "#F8FAFC"),
    text: chosenPalette.text || (isDark ? "#F8FAFC" : "#0F172A"),
    muted: chosenPalette.muted || (isDark ? "#94A3B8" : "#64748B"),
    border: chosenPalette.border || (isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"),
    shadow: chosenPalette.shadow || (isDark ? "0 20px 40px -10px rgba(0,0,0,0.6)" : "0 16px 35px -8px rgba(0,0,0,0.07)"),
    cardAccent: chosenPalette.accent || resolvedPrimary,
    sectionAccent: resolvedSecondary,
    contrastRatio: archetype === "clean_clinical" ? 7.0 : 4.5,
    mood: chosenPalette.name,
    paletteName: chosenPalette.name,
    isDark,
  };

  const featuresLayoutStrategy = deriveFeaturesLayoutStrategy(
    archetype,
    context.category,
    context,
    isDark,
    spatial3d,
    seedNum,
    context.recentFingerprints
  );

  const antiRepetitionFingerprint = `${archetype}_${heroType}_${cardFamilyStrategy.primaryCardFamily}_${backgroundStrategy.type}_${typographyTokens.headingFont.split(",")[0].trim().replace(/\s+/g, "")}_pal:${colorSystem.paletteName}_${colorSystem.primary.replace("#", "")}_feat-layout:${featuresLayoutStrategy.layoutVariant}_feat-geom:${featuresLayoutStrategy.cardGeometry}`;

  return {
    visualArchetype: archetype,
    heroType,
    colorMood: archetype,
    typographyStyle: typographyTokens.headingFont,
    cardTreatment,
    cardFamilyStrategy,
    featuresLayoutStrategy,
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
    threeDPreference: spatial3d.enabled ? "yes" : "no",
  };
}
