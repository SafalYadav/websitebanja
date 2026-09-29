import type { WebsiteRequirement } from "./requirementModel";
import { generateDesignTokens, type DesignTokens } from "./design/designTokens";
import { generateDesignRules, type DesignRules, type SupportedIndustry } from "./design/designRules";
import { resolveComponent, type ComponentMetadata } from "../components/registry";
import { generateUiUxDesignSystem, type UiUxDesignSystem } from "./uiux-pro-max";

/** Complete website plan derived from requirement */
export interface PlannedPage {
  name: string;
  slug: string;
  isHome: boolean;
  sections: string[];
}

export interface WebsitePlan {
  industry: SupportedIndustry;
  businessName: string;
  pages: PlannedPage[];
  content: Record<string, string>;
  designTokens: DesignTokens;
  designRules: DesignRules;
  uiUxDesignSystem?: UiUxDesignSystem;
}

/** Design plan containing tokens, rules, and layout specs */
export interface DesignPlan {
  designTokens: DesignTokens;
  designRules: DesignRules;
  themeMode: "light" | "dark";
  motionLevel: "minimal" | "subtle" | "energetic" | "smooth";
  ctaEmphasis: "prominent" | "high" | "urgent";
  uiUxDesignSystem?: UiUxDesignSystem;
}

/** Component plan – list of resolved component descriptors to render/generate */
export interface ComponentPlan {
  components: string[];
  resolvedComponents: ComponentMetadata[];
}

import type { AIContextResult } from "./contextBuilder";

/**
 * Creates an intelligent website plan from WebsiteRequirement.
 * Automatically infers pages and section structure if not explicitly provided.
 */
export function createWebsitePlan(req: WebsiteRequirement, contextBundle?: AIContextResult): WebsitePlan {
  // Step 1: UI/UX Pro Max Design Intelligence reasoning
  const uiUxDesignSystem = generateUiUxDesignSystem(req);
  const designRules = generateDesignRules(req);
  const designTokens = generateDesignTokens(req, uiUxDesignSystem);

  // Derive pages
  let pages: PlannedPage[];
  if (req.pages && req.pages.length > 0) {
    pages = req.pages.map((p, idx) => ({
      name: p.name,
      slug: p.slug ?? (idx === 0 ? "" : p.name.toLowerCase().replace(/\s+/g, "-")),
      isHome: idx === 0,
      sections: p.sections,
    }));
  } else {
    // Generate intelligent default home page with sections based on industry design rules and global knowledge
    const baseSections = contextBundle?.globalKnowledge?.websiteType?.data.recommendedSections?.length
      ? contextBundle.globalKnowledge.websiteType.data.recommendedSections
      : designRules.layout.recommendedSections;
    const sections = [...baseSections];

    // If booking or ecommerce requested, ensure productsSection/catalog is included
    if ((req.functionality?.booking || req.functionality?.ecommerce) && !sections.includes("productsSection")) {
      const heroIdx = sections.indexOf("hero");
      sections.splice(heroIdx + 1, 0, "productsSection");
    }

    pages = [
      {
        name: "Home",
        slug: "",
        isHome: true,
        sections,
      },
    ];
  }

  // Pre-fill industry-aware content snippets if not supplied
  const businessFacts = contextBundle?.projectKnowledge;
  const content: Record<string, string> = {
    heroTitle:
      req.content?.heroTitle ||
      (businessFacts?.tagline ? `${req.business.name} - ${businessFacts.tagline}` : `${req.business.name} - ${designRules.industryProfile.displayName}`),
    heroSubtitle:
      req.content?.heroSubtitle ||
      (typeof businessFacts?.description === "string" ? businessFacts.description : `${designRules.industryProfile.archetype}. Dedicated to providing top-tier solutions.`),
    ctaText: req.cta || designRules.industryProfile.defaultCtaText,
    ...(req.content || {}),
  };

  return {
    industry: designRules.industry,
    businessName: req.business.name,
    pages,
    content,
    designTokens,
    designRules,
    uiUxDesignSystem,
  };
}

/**
 * Creates design plan linking tokens and design rules.
 */
export function createDesignPlan(plan: WebsitePlan, _req: WebsiteRequirement): DesignPlan {
  const isDark =
    plan.designTokens.colors.background.startsWith("#0") ||
    plan.designTokens.colors.background.startsWith("#1");
  return {
    designTokens: plan.designTokens,
    designRules: plan.designRules,
    themeMode: isDark ? "dark" : "light",
    motionLevel: plan.uiUxDesignSystem?.motion.level || plan.designRules.motion.animationLevel,
    ctaEmphasis: plan.designRules.cta.emphasis,
    uiUxDesignSystem: plan.uiUxDesignSystem,
  };
}

/**
 * Maps logical design-rule section names to React component names.
 * This is the single source of truth for section → component resolution.
 * Keep this mapping stable; add new entries when new sections are introduced.
 */
const SECTION_TO_COMPONENT: Record<string, string> = {
  // Core structural
  navbar: "Navbar",
  hero: "HeroSection",
  footer: "FooterSection",
  // Service / Offering sections
  services: "ServicesSection",
  emergency_services: "ServicesSection",
  creative_capabilities: "ServicesSection",
  // About / Story sections
  about: "AboutSection",
  atmosphere_story: "AboutSection",
  craft_heritage: "AboutSection",
  doctor_clinic: "AboutSection",
  // Features / Trust sections
  features: "FeaturesSection",
  trust_proof: "FeaturesSection",
  trust_guarantees: "FeaturesSection",
  // Catalog / Products
  productsSection: "ProductsSection",
  catalog: "ProductsSection",
  curated_collection: "ProductsSection",
  // Process / Workflow
  workflow_steps: "ProcessSection",
  treatment_process: "ProcessSection",
  process: "ProcessSection",
  methodology: "ProcessSection",
  // Reviews / Testimonials
  reviews: "ReviewsSection",
  testimonials: "ReviewsSection",
  patient_reviews: "ReviewsSection",
  guest_reviews: "ReviewsSection",
  // FAQ
  faq: "FAQSection",
  // Contact / Booking
  contact: "ContactSection",
  reservation: "ContactSection",
  booking: "ContactSection",
  // Specialty sections → mapped to closest existing component
  signature_dishes: "ServicesSection",
  menu: "ServicesSection",
  // Awards/Metrics → Features section
  awards_metrics: "FeaturesSection",
  selected_works: "ServicesSection",
  selected_cases: "ServicesSection",
  // Social proof / about
  social_proof: "FeaturesSection",
  // Rooms / Amenities (luxury hotel) → Services
  room_showcase: "ServicesSection",
  amenities: "FeaturesSection",
  dining: "ServicesSection",
  // Education
  programs: "ServicesSection",
  faculty: "AboutSection",
  outcomes: "FeaturesSection",
  campus: "AboutSection",
  // Wellness
  treatments: "ServicesSection",
  atmosphere: "AboutSection",
  practitioners: "AboutSection",
  pricing: "FeaturesSection",
  // Law firm
  practice_areas: "ServicesSection",
  attorney_profiles: "AboutSection",
  case_results: "FeaturesSection",
  // Finance
  solutions: "ServicesSection",
  // Portfolio
  skills: "FeaturesSection",
  // Gallery
  gallery: "ServicesSection",
  // Misc
  service_area: "FeaturesSection",
};

/**
 * Selects components for the website based on design plan and functional requirements.
 *
 * Phase 6: Fixes the critical template-repetition bug where `selectComponents()`
 * unconditionally pushed the same 7 components for every business type.
 * Now uses `designRules.layout.recommendedSections` (which is industry-specific)
 * to drive intelligent, differentiated section selection.
 */
export function selectComponents(designPlan: DesignPlan, req: WebsiteRequirement): ComponentPlan {
  // Step 1: Determine the canonical section sequence for this industry.
  // Priority: designRules.layout.recommendedSections (set per-industry in designRules.ts)
  const recommendedSections = designPlan.designRules.layout.recommendedSections;

  // Step 2: If ecommerce or booking is enabled, inject productsSection if not already present
  const effectiveSections = [...recommendedSections];
  if ((req.functionality?.ecommerce || req.functionality?.booking || req.business.industry === "car_rental") &&
      !effectiveSections.includes("productsSection") &&
      !effectiveSections.includes("catalog")) {
    const heroIdx = effectiveSections.indexOf("hero");
    const insertIdx = heroIdx >= 0 ? heroIdx + 1 : 1;
    effectiveSections.splice(insertIdx, 0, "productsSection");
  }

  // Step 3: Map logical section names → React component names (deduped, ordered)
  const componentNames: string[] = [];
  const seenComponents = new Set<string>();

  for (const section of effectiveSections) {
    const componentName = SECTION_TO_COMPONENT[section];
    if (componentName && !seenComponents.has(componentName)) {
      componentNames.push(componentName);
      seenComponents.add(componentName);
    }
    // If the section key is already a component name (e.g. "ProductsSection"), accept it directly
    else if (!componentName && section.charAt(0) === section.charAt(0).toUpperCase() && !seenComponents.has(section)) {
      componentNames.push(section);
      seenComponents.add(section);
    }
  }

  // Step 4: Ensure minimum viable website structure (Navbar + HeroSection + FooterSection)
  if (!seenComponents.has("Navbar")) componentNames.unshift("Navbar");
  if (!seenComponents.has("HeroSection")) {
    const navIdx = componentNames.indexOf("Navbar");
    componentNames.splice(navIdx + 1, 0, "HeroSection");
  }
  if (!seenComponents.has("FooterSection")) componentNames.push("FooterSection");

  // Step 5: Detect opportunities for verified 21st.dev components
  const instructions = (req.specialInstructions || []).join(" ").toLowerCase();
  const intent = (req.intent || "").toLowerCase();
  const brandStyle = (req.brand?.style || "").toLowerCase();
  const designStyle = (typeof req.designPreferences?.style === "string" ? req.designPreferences.style : "").toLowerCase();
  const allText = `${instructions} ${intent} ${brandStyle} ${designStyle} ${req.business?.type || ""}`;

  const isHighVariance = (designPlan.uiUxDesignSystem?.dials.variance ?? 0) >= 8;
  const isBentoOrModern =
    (designPlan.uiUxDesignSystem?.style.name || "").toLowerCase().includes("bento") ||
    (designPlan.uiUxDesignSystem?.style.name || "").toLowerCase().includes("brutalism");

  const wants21st =
    allText.includes("21st") ||
    allText.includes("glow") ||
    allText.includes("bento") ||
    allText.includes("modern hero") ||
    allText.includes("animated cta") ||
    isHighVariance ||
    isBentoOrModern ||
    (req.business?.industry === "saas" && (allText.includes("modern") || allText.includes("premium")));

  if (wants21st) {
    if (allText.includes("glow") || allText.includes("modern") || allText.includes("hero") || allText.includes("21st")) {
      componentNames.push("21st:hero-glow");
    }
    if (allText.includes("bento") || allText.includes("feature") || isHighVariance || isBentoOrModern || allText.includes("21st")) {
      componentNames.push("21st:bento-grid");
    }
    if (allText.includes("pricing") || allText.includes("21st") || req.pricing) {
      componentNames.push("21st:pricing-table");
    }
    if (allText.includes("animated cta") || allText.includes("cta") || allText.includes("21st")) {
      componentNames.push("21st:animated-cta");
    }
  }

  // De-duplicate component list (preserving order)
  const uniqueNames = Array.from(new Set(componentNames));

  // Resolve every component through the verified registry/adapter
  const resolvedComponents = uniqueNames.map((name) => resolveComponent(name));

  return {
    components: uniqueNames,
    resolvedComponents,
  };
}
