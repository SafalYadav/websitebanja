// src/lib/components/twentyFirstRegistry.ts
/**
 * 21st.dev Component Catalog & Discovery Layer.
 * Defines verified 21st.dev components, their dependencies, token compatibility,
 * and deterministic fallback mappings to local WebsiteBanja components.
 */

export interface TwentyFirstComponentDef {
  id: string;
  displayName: string;
  category: "hero" | "features" | "pricing" | "cta" | "navigation" | "footer" | "content";
  importPath: string;
  source: "21st.dev";
  status: "verified";
  dependencies: string[];
  isTokenAware: boolean;
  isResponsive: boolean;
  isAccessible: boolean;
  compatibleSections: string[];
  tags: string[];
  defaultFallbackId: string;
  sourceReference: string;
}

export const TWENTY_FIRST_CATALOG: Record<string, TwentyFirstComponentDef> = {
  "21st:navbar": {
    id: "21st:navbar",
    displayName: "21st.dev Adapted Responsive Navigation Header",
    category: "navigation",
    importPath: "@/components/editor/NavbarSection",
    source: "21st.dev",
    status: "verified",
    dependencies: ["lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["navbar", "navigation"],
    tags: ["navbar", "header", "navigation", "responsive"],
    defaultFallbackId: "Navbar",
    sourceReference: "21st.dev/r/navbar-v1",
  },
  "21st:hero-glow": {
    id: "21st:hero-glow",
    displayName: "21st.dev Adapted Hero Glow with Ambient Lighting",
    category: "hero",
    importPath: "@/components/21st/HeroGlow21st",
    source: "21st.dev",
    status: "verified",
    dependencies: ["framer-motion", "lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["hero", "hero-booking", "hero-glow"],
    tags: ["glow", "modern", "saas", "ambient", "micro-interactions"],
    defaultFallbackId: "HeroSection",
    sourceReference: "21st.dev/r/hero-glow-v1",
  },
  "21st:bento-grid": {
    id: "21st:bento-grid",
    displayName: "21st.dev Adapted Bento Grid Feature Showcase",
    category: "features",
    importPath: "@/components/21st/BentoGrid21st",
    source: "21st.dev",
    status: "verified",
    dependencies: ["framer-motion", "lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["features", "feature-grid", "bento-grid", "services"],
    tags: ["bento", "grid", "asymmetric", "hover-highlight", "saas"],
    defaultFallbackId: "FeaturesSection",
    sourceReference: "21st.dev/r/bento-grid-v2",
  },
  "21st:pricing-table": {
    id: "21st:pricing-table",
    displayName: "21st.dev Adapted Modern Pricing Tier Table",
    category: "pricing",
    importPath: "@/components/21st/PricingTable21st",
    source: "21st.dev",
    status: "verified",
    dependencies: ["framer-motion", "lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["pricing", "products", "productsSection", "catalog"],
    tags: ["pricing", "tiers", "popular-badge", "switch", "conversion"],
    defaultFallbackId: "ProductsSection",
    sourceReference: "21st.dev/r/pricing-table-v1",
  },
  "21st:animated-cta": {
    id: "21st:animated-cta",
    displayName: "21st.dev Adapted High-Impact Animated CTA",
    category: "cta",
    importPath: "@/components/21st/AnimatedCta21st",
    source: "21st.dev",
    status: "verified",
    dependencies: ["framer-motion", "lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["cta", "contact", "banner", "action"],
    tags: ["cta", "radial-glow", "gradient-text", "conversion", "banner"],
    defaultFallbackId: "ContactSection",
    sourceReference: "21st.dev/r/animated-cta-v1",
  },
};

/**
 * Returns the entire verified 21st.dev component catalog.
 */
export function get21stCatalog(): TwentyFirstComponentDef[] {
  return Object.values(TWENTY_FIRST_CATALOG);
}

/**
 * Checks whether a component key exists in the verified 21st.dev catalog.
 */
export function has21stComponent(key: string): boolean {
  const normalized = key.startsWith("21st:") ? key : `21st:${key}`;
  return Boolean(TWENTY_FIRST_CATALOG[normalized]);
}

/**
 * Retrieves a component definition from the 21st.dev catalog.
 */
export function get21stComponentDef(key: string): TwentyFirstComponentDef | undefined {
  const normalized = key.startsWith("21st:") ? key : `21st:${key}`;
  return TWENTY_FIRST_CATALOG[normalized];
}
