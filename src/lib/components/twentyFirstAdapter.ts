// src/lib/components/twentyFirstAdapter.ts
/**
 * 21st.dev Component Adapter & Deterministic Fallback Engine.
 *
 * Responsibilities:
 * 1. Resolves 21st.dev components against the verified catalog.
 * 2. Adapts external component styling and code to WebsiteBanja design tokens.
 * 3. Enforces deterministic fallback to local components with explicit fallback telemetry.
 * 4. Never falsely marks source as "21st.dev" when fallback occurs.
 */

import { get21stComponentDef, has21stComponent } from "./twentyFirstRegistry";
import { validate21stSource, sanitize21stSource } from "./twentyFirstSanitizer";
import type { DesignTokens } from "@/lib/ai/design/designTokens";

export interface ComponentMetadata {
  id: string;
  displayName: string;
  category: "navigation" | "hero" | "content" | "catalog" | "form" | "layout" | "footer";
  importPath: string;
  source: "local" | "21st.dev";
  status: "verified" | "fallback" | "local";
  isFallback: boolean;
  fallbackReason: string | null;
  dependencies: string[];
  sourceReference?: string;
  isTokenAware: boolean;
  isResponsive: boolean;
  isAccessible: boolean;
  compatibleSections: string[];
}

export interface ResolutionAuditEntry {
  timestamp: string;
  requestedKey: string;
  resolvedId: string;
  resolvedSource: "local" | "21st.dev";
  status: "verified" | "fallback" | "local";
  isFallback: boolean;
  fallbackReason: string | null;
  importPath: string;
}

const auditLog: ResolutionAuditEntry[] = [];

/**
 * Local fallback component index for safe deterministic substitution.
 */
const LOCAL_FALLBACKS: Record<string, Omit<ComponentMetadata, "id" | "status" | "isFallback" | "fallbackReason">> = {
  Navbar: {
    displayName: "Responsive Navigation Header",
    category: "navigation",
    importPath: "@/components/editor/NavbarSection",
    source: "local",
    dependencies: ["lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["navbar"],
  },
  HeroSection: {
    displayName: "Hero Banner with CTA & Motion",
    category: "hero",
    importPath: "@/components/editor/HeroSection",
    source: "local",
    dependencies: ["framer-motion", "lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["hero", "hero-booking", "hero-glow"],
  },
  FeaturesSection: {
    displayName: "Feature Highlights & Trust Cards",
    category: "content",
    importPath: "@/components/editor/FeaturesSection",
    source: "local",
    dependencies: ["lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["features", "feature-grid", "bento-grid"],
  },
  ProductsSection: {
    displayName: "Product & Rental Catalog Showcase",
    category: "catalog",
    importPath: "@/components/editor/ProductsSection",
    source: "local",
    dependencies: ["lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["products", "productsSection", "catalog", "pricing"],
  },
  ServicesSection: {
    displayName: "Interactive Services Grid",
    category: "content",
    importPath: "@/components/editor/ServicesSection",
    source: "local",
    dependencies: ["framer-motion", "lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["services"],
  },
  AboutSection: {
    displayName: "About Story & Credentials",
    category: "content",
    importPath: "@/components/editor/AboutSection",
    source: "local",
    dependencies: ["react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["about"],
  },
  FAQSection: {
    displayName: "Accessible FAQ Accordion",
    category: "content",
    importPath: "@/components/editor/FAQSection",
    source: "local",
    dependencies: ["lucide-react", "react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["faq"],
  },
  ContactSection: {
    displayName: "Direct Lead & Contact Section",
    category: "form",
    importPath: "@/components/editor/ContactSection",
    source: "local",
    dependencies: ["react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["contact", "cta"],
  },
  FooterSection: {
    displayName: "Semantic Footer & Brand Links",
    category: "footer",
    importPath: "@/components/editor/FooterSection",
    source: "local",
    dependencies: ["react"],
    isTokenAware: true,
    isResponsive: true,
    isAccessible: true,
    compatibleSections: ["footer"],
  },
};

export class TwentyFirstAdapter {
  /**
   * Resolves a 21st.dev component request.
   * If the component is verified and available in the 21st catalog, returns source="21st.dev".
   * If unknown or unavailable, performs a deterministic fallback to a local component,
   * setting source="local", status="fallback", and recording the exact fallbackReason.
   */
  static resolve21stComponent(componentKey: string): ComponentMetadata {
    const normalizedKey = componentKey.startsWith("21st:") ? componentKey : `21st:${componentKey}`;

    // 1. Check if component is in the verified 21st catalog
    if (has21stComponent(normalizedKey)) {
      const def = get21stComponentDef(normalizedKey)!;

      const meta: ComponentMetadata = {
        id: def.id,
        displayName: def.displayName,
        category:
          def.category === "pricing"
            ? "catalog"
            : def.category === "cta"
            ? "form"
            : def.category === "features"
            ? "content"
            : def.category,
        importPath: def.importPath,
        source: "21st.dev",
        status: "verified",
        isFallback: false,
        fallbackReason: null,
        dependencies: def.dependencies,
        sourceReference: def.sourceReference,
        isTokenAware: def.isTokenAware,
        isResponsive: def.isResponsive,
        isAccessible: def.isAccessible,
        compatibleSections: def.compatibleSections,
      };

      auditLog.push({
        timestamp: new Date().toISOString(),
        requestedKey: componentKey,
        resolvedId: meta.id,
        resolvedSource: "21st.dev",
        status: "verified",
        isFallback: false,
        fallbackReason: null,
        importPath: meta.importPath,
      });

      return meta;
    }

    // 2. Fallback: Component not found in 21st catalog
    const clean = normalizedKey.replace(/^21st:/, "").toLowerCase();
    let targetLocal = "HeroSection";

    if (clean.includes("nav") || clean.includes("header")) {
      targetLocal = "Navbar";
    } else if (clean.includes("bento") || clean.includes("feature") || clean.includes("grid")) {
      targetLocal = "FeaturesSection";
    } else if (clean.includes("price") || clean.includes("pricing") || clean.includes("tier") || clean.includes("product") || clean.includes("catalog")) {
      targetLocal = "ProductsSection";
    } else if (clean.includes("service")) {
      targetLocal = "ServicesSection";
    } else if (clean.includes("faq") || clean.includes("accordion")) {
      targetLocal = "FAQSection";
    } else if (clean.includes("cta") || clean.includes("contact") || clean.includes("form")) {
      targetLocal = "ContactSection";
    } else if (clean.includes("about")) {
      targetLocal = "AboutSection";
    } else if (clean.includes("footer")) {
      targetLocal = "FooterSection";
    }

    const fallbackBase = LOCAL_FALLBACKS[targetLocal] || LOCAL_FALLBACKS.HeroSection;
    const fallbackReason = `Component "${componentKey}" was not found in 21st.dev verified catalog; safely defaulted to local ${targetLocal}.`;

    const fallbackMeta: ComponentMetadata = {
      id: normalizedKey,
      displayName: `${fallbackBase.displayName} (Local Fallback for ${componentKey})`,
      category: fallbackBase.category,
      importPath: fallbackBase.importPath,
      source: "local", // Crucial: NOT 21st.dev!
      status: "fallback",
      isFallback: true,
      fallbackReason,
      dependencies: fallbackBase.dependencies,
      isTokenAware: fallbackBase.isTokenAware,
      isResponsive: fallbackBase.isResponsive,
      isAccessible: fallbackBase.isAccessible,
      compatibleSections: fallbackBase.compatibleSections,
    };

    auditLog.push({
      timestamp: new Date().toISOString(),
      requestedKey: componentKey,
      resolvedId: fallbackMeta.id,
      resolvedSource: "local",
      status: "fallback",
      isFallback: true,
      fallbackReason,
      importPath: fallbackMeta.importPath,
    });

    return fallbackMeta;
  }

  /**
   * Adapts raw 21st.dev component source code to WebsiteBanja design tokens and constraints.
   */
  static adapt21stSource(
    rawCode: string,
    _tokens?: Partial<DesignTokens>
  ): {
    adaptedCode: string;
    tokenReplacements: number;
    isValid: boolean;
    errors: string[];
  } {
    // 1. Sanitize input code
    let code = sanitize21stSource(rawCode);
    let tokenReplacements = 0;

    // 2. Token replacements: hardcoded colors to CSS variables
    const stringReplacements: Array<[RegExp, string]> = [
      [/\b(bg|text|border|ring)-(blue|indigo|violet)-(500|600|700)\b/g, "$1-[var(--wb-primary)]"],
      [/\b(bg|text|border|ring)-(sky|cyan|blue)-(300|400)\b/g, "$1-[var(--wb-secondary)]"],
      [/\b(bg|text|border)-(slate|zinc|gray)-(900|950)\b/g, "$1-[var(--wb-bg)]"],
      [/\b(bg|text|border)-(slate|zinc|gray)-(800|850)\b/g, "$1-[var(--wb-surface)]"],
      [/\b(text|border)-(slate|zinc|gray)-(400|500)\b/g, "$1-[var(--wb-muted)]"],
      [/\b(text)-(slate|zinc|gray)-(50|100)\b/g, "$1-[var(--wb-fg)]"],
    ];

    for (const [regex, replacement] of stringReplacements) {
      const prev = code;
      code = code.replace(regex, replacement);
      if (prev !== code) {
        tokenReplacements++;
      }
    }

    // Replace hex colors
    const prevHex = code;
    code = code.replace(/#[0-9a-fA-F]{6}/g, (_match: string) => {
      tokenReplacements++;
      return "var(--wb-primary)";
    });
    if (prevHex !== code) {
      tokenReplacements++;
    }

    // 3. Ensure Framer Motion wraps with useReducedMotion if motion is used
    if (code.includes("framer-motion") && !code.includes("useReducedMotion")) {
      code = code.replace(
        /import\s+{([^}]+)}\s+from\s+["']framer-motion["']/,
        `import { $1, useReducedMotion } from "framer-motion"`
      );
      tokenReplacements++;
    }

    // 4. Validate output source
    const validation = validate21stSource(code);

    return {
      adaptedCode: code,
      tokenReplacements,
      isValid: validation.valid,
      errors: validation.errors,
    };
  }

  /**
   * Returns audit history of all component resolutions.
   */
  static getAuditLog(): ResolutionAuditEntry[] {
    return [...auditLog];
  }

  /**
   * Clears the audit log (useful for isolation between test runs).
   */
  static clearAuditLog(): void {
    auditLog.length = 0;
  }
}
