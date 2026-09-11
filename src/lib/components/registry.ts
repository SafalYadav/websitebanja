// src/lib/components/registry.ts
/**
 * Component Registry & External 21st.dev Adapter Architecture.
 *
 * Clearly separates:
 * A. Local WebsiteBanja components (verified, importable, token-aware, accessible)
 * B. 21st.dev verified components (ambient glow hero, asymmetric bento grid, pricing cards, animated CTA)
 * C. ExternalComponentAdapter / TwentyFirstAdapter (token adaptation, dependency validation, deterministic fallback)
 */

import {
  TwentyFirstAdapter,
  type ComponentMetadata,
  type ResolutionAuditEntry,
} from "./twentyFirstAdapter";
import {
  TWENTY_FIRST_CATALOG,
  get21stCatalog,
  has21stComponent,
  get21stComponentDef,
  type TwentyFirstComponentDef,
} from "./twentyFirstRegistry";

export type { ComponentMetadata, ResolutionAuditEntry, TwentyFirstComponentDef };
export { TwentyFirstAdapter, TWENTY_FIRST_CATALOG, get21stCatalog, has21stComponent, get21stComponentDef };

/**
 * A. Local WebsiteBanja Verified Components
 * Every single component here maps to a real, compilable, token-aware file.
 */
export const LOCAL_COMPONENTS: Record<string, ComponentMetadata> = {
  Navbar: {
    id: "Navbar",
    displayName: "Responsive Navigation Header",
    category: "navigation",
    importPath: "@/components/editor/NavbarSection",
    source: "local",
    status: "verified",
    isFallback: false,
    fallbackReason: null,
    dependencies: ["lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["navbar"],
  },
  HeroSection: {
    id: "HeroSection",
    displayName: "Hero Banner with CTA & Motion",
    category: "hero",
    importPath: "@/components/editor/HeroSection",
    source: "local",
    status: "verified",
    isFallback: false,
    fallbackReason: null,
    dependencies: ["framer-motion", "lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["hero"],
  },
  ServicesSection: {
    id: "ServicesSection",
    displayName: "Interactive Services Grid",
    category: "content",
    importPath: "@/components/editor/ServicesSection",
    source: "local",
    status: "verified",
    isFallback: false,
    fallbackReason: null,
    dependencies: ["framer-motion", "lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["services"],
  },
  ProductsSection: {
    id: "ProductsSection",
    displayName: "Product & Rental Catalog Showcase",
    category: "catalog",
    importPath: "@/components/editor/ProductsSection",
    source: "local",
    status: "verified",
    isFallback: false,
    fallbackReason: null,
    dependencies: ["lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["products", "productsSection", "catalog", "pricing"],
  },
  FeaturesSection: {
    id: "FeaturesSection",
    displayName: "Feature Highlights & Trust Cards",
    category: "content",
    importPath: "@/components/editor/FeaturesSection",
    source: "local",
    status: "verified",
    isFallback: false,
    fallbackReason: null,
    dependencies: ["lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["features"],
  },
  AboutSection: {
    id: "AboutSection",
    displayName: "About Story & Credentials",
    category: "content",
    importPath: "@/components/editor/AboutSection",
    source: "local",
    status: "verified",
    isFallback: false,
    fallbackReason: null,
    dependencies: ["react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["about"],
  },
  FAQSection: {
    id: "FAQSection",
    displayName: "Accessible FAQ Accordion",
    category: "content",
    importPath: "@/components/editor/FAQSection",
    source: "local",
    status: "verified",
    isFallback: false,
    fallbackReason: null,
    dependencies: ["lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["faq"],
  },
  ContactSection: {
    id: "ContactSection",
    displayName: "Direct Lead & Contact Section",
    category: "form",
    importPath: "@/components/editor/ContactSection",
    source: "local",
    status: "verified",
    isFallback: false,
    fallbackReason: null,
    dependencies: ["react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["contact"],
  },
  FooterSection: {
    id: "FooterSection",
    displayName: "Semantic Footer & Brand Links",
    category: "footer",
    importPath: "@/components/editor/FooterSection",
    source: "local",
    status: "verified",
    isFallback: false,
    fallbackReason: null,
    dependencies: ["react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["footer"],
  },
  WebsiteRenderer: {
    id: "WebsiteRenderer",
    displayName: "Full Dynamic Website Renderer",
    category: "layout",
    importPath: "@/components/editor/WebsiteRenderer",
    source: "local",
    status: "verified",
    isFallback: false,
    fallbackReason: null,
    dependencies: ["framer-motion", "lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["*"],
  },
};

/**
 * B. External Component Adapter (21st.dev Adapter)
 *
 * Integrates directly with TwentyFirstAdapter.
 * Resolves verified 21st.dev components to real source implementations in src/components/21st/,
 * while preserving graceful deterministic fallback to local components with explicit fallback telemetry.
 */
export class ExternalComponentAdapter {
  static resolve21stComponent(componentKey: string): ComponentMetadata {
    return TwentyFirstAdapter.resolve21stComponent(componentKey);
  }

  static adapt21stSource(rawCode: string, tokens?: any) {
    return TwentyFirstAdapter.adapt21stSource(rawCode, tokens);
  }
}

/**
 * Universal component resolver.
 * Resolves any logical name (e.g. "HeroSection", "21st:hero-glow", "21st:bento-grid", "ProductsSection")
 * to a verified, importable, token-aware component metadata object.
 */
export function resolveComponent(name: string): ComponentMetadata {
  if (name.startsWith("21st:")) {
    return TwentyFirstAdapter.resolve21stComponent(name);
  }

  if (LOCAL_COMPONENTS[name]) {
    return LOCAL_COMPONENTS[name];
  }

  // Check if it's a known 21st component without prefix
  if (TWENTY_FIRST_CATALOG[`21st:${name}`]) {
    return TwentyFirstAdapter.resolve21stComponent(`21st:${name}`);
  }

  // Fallback to 21st adapter resolution
  return TwentyFirstAdapter.resolve21stComponent(name);
}

/**
 * Backward-compatible mapping of component name -> import string.
 * All paths guaranteed to resolve without module-not-found errors.
 */
export const componentRegistry: Record<string, string> = {
  ...Object.fromEntries(Object.entries(LOCAL_COMPONENTS).map(([key, meta]) => [key, meta.importPath])),
  ...Object.fromEntries(Object.entries(TWENTY_FIRST_CATALOG).map(([key, meta]) => [key, meta.importPath])),
};
