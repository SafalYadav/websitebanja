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

/**
 * Creates an intelligent website plan from WebsiteRequirement.
 * Automatically infers pages and section structure if not explicitly provided.
 */
export function createWebsitePlan(req: WebsiteRequirement): WebsitePlan {
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
    // Generate intelligent default home page with sections based on industry design rules
    const sections = [...designRules.layout.recommendedSections];

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
  const content: Record<string, string> = {
    heroTitle: req.content?.heroTitle || `${req.business.name} - ${designRules.industryProfile.displayName}`,
    heroSubtitle:
      req.content?.heroSubtitle ||
      `${designRules.industryProfile.archetype}. Dedicated to providing top-tier solutions.`,
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
 * Selects components for the website based on design plan and functional requirements.
 * Maps logical section needs to verified, compilable components.
 */
export function selectComponents(_designPlan: DesignPlan, req: WebsiteRequirement): ComponentPlan {
  const componentNames: string[] = ["Navbar", "HeroSection"];

  // Add catalog / products if ecommerce or rental or booking is enabled
  if (req.functionality?.ecommerce || req.functionality?.booking || req.business.industry === "car_rental") {
    componentNames.push("ProductsSection");
  }

  // Always include core service and credential sections
  componentNames.push("ServicesSection", "AboutSection", "FeaturesSection", "FAQSection", "ContactSection", "FooterSection");

  // Detect opportunities for verified 21st.dev components
  const instructions = (req.specialInstructions || []).join(" ").toLowerCase();
  const intent = (req.intent || "").toLowerCase();
  const brandStyle = (req.brand?.style || "").toLowerCase();
  const designStyle = (typeof req.designPreferences?.style === "string" ? req.designPreferences.style : "").toLowerCase();
  const allText = `${instructions} ${intent} ${brandStyle} ${designStyle} ${req.business?.type || ""}`;

  const isHighVariance = (_designPlan.uiUxDesignSystem?.dials.variance ?? 0) >= 8;
  const isBentoOrModern =
    (_designPlan.uiUxDesignSystem?.style.name || "").toLowerCase().includes("bento") ||
    (_designPlan.uiUxDesignSystem?.style.name || "").toLowerCase().includes("brutalism");

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

  // De-duplicate component list
  const uniqueNames = Array.from(new Set(componentNames));

  // Resolve every component through the verified registry/adapter
  const resolvedComponents = uniqueNames.map((name) => resolveComponent(name));

  return {
    components: uniqueNames,
    resolvedComponents,
  };
}
