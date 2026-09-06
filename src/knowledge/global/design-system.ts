import type { GlobalKnowledgeEntry, DesignSystemPayload } from "./types";

export const designSystemEntry: GlobalKnowledgeEntry<DesignSystemPayload> = {
  metadata: {
    id: "wb:global:design_system:v1",
    category: "design_system",
    title: "WebsiteBanja Dual-Theme Design System & CSS Token Architecture",
    description: "Comprehensive visual token specification covering Luminous Light, Dark Luxury, 18 CSS variables, and WCAG AA accessibility compliance",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/design-system.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["design", "tokens", "css", "theme", "luminous", "dark", "wcag", "contrast"]
  },
  data: {
    key: "default_design_system",
    name: "WebsiteBanja Design System",
    description: "18-token adaptive CSS architecture with dual high-contrast themes",
    type: "token_specification",
    themes: {
      luminous_light: {
        name: "Luminous Light (Default)",
        description: "Soft brand-tinted luminous canvas (5-8% tint into white) with crisp slate typography and translucent glass surfaces.",
        surface: "rgba(255, 255, 255, 0.88)",
        surfaceHover: "#FFFFFF",
        fg: "#0F172A",
        muted: "#475569",
        border: "rgba(0, 0, 0, 0.08)",
        contrastRatioHeading: "14.2:1",
        contrastRatioBody: "7.1:1",
        isDark: false
      },
      dark_luxury: {
        name: "Dark Luxury",
        description: "Deep obsidian brand-tinted canvas (clamped RGB from primary color; NOT pure #000) with glowing accents and light slate typography.",
        surface: "rgba(255, 255, 255, 0.05)",
        surfaceHover: "rgba(255, 255, 255, 0.09)",
        fg: "#F8FAFC",
        muted: "#94A3B8",
        border: "rgba(255, 255, 255, 0.1)",
        contrastRatioHeading: "15.8:1",
        contrastRatioBody: "8.4:1",
        isDark: true
      }
    },
    cssTokens: [
      { token: "--wb-primary", cssVariable: "--wb-primary", description: "Authoritative brand primary color", sampleDefault: "#3B82F6", category: "color" },
      { token: "--wb-secondary", cssVariable: "--wb-secondary", description: "Harmonious brand secondary color", sampleDefault: "#8B5CF6", category: "color" },
      { token: "--wb-accent", cssVariable: "--wb-accent", description: "Vibrant accent color for highlights and badges", sampleDefault: "#38BDF8", category: "color" },
      { token: "--wb-bg", cssVariable: "--wb-bg", description: "Primary page canvas background color", sampleDefault: "rgb(250, 250, 255)", category: "surface" },
      { token: "--wb-bg-primary", cssVariable: "--wb-bg-primary", description: "Alias for primary background (same as --wb-bg)", sampleDefault: "rgb(250, 250, 255)", category: "surface" },
      { token: "--wb-bg-alt", cssVariable: "--wb-bg-alt", description: "Alternating section background color", sampleDefault: "rgb(243, 244, 255)", category: "surface" },
      { token: "--wb-surface", cssVariable: "--wb-surface", description: "Card and interactive element surface background", sampleDefault: "rgba(255, 255, 255, 0.88)", category: "surface" },
      { token: "--wb-surface-hover", cssVariable: "--wb-surface-hover", description: "Card hover surface background", sampleDefault: "#FFFFFF", category: "surface" },
      { token: "--wb-fg", cssVariable: "--wb-fg", description: "Main body and heading foreground text color", sampleDefault: "#0F172A", category: "color" },
      { token: "--wb-muted", cssVariable: "--wb-muted", description: "Secondary and caption text color", sampleDefault: "#475569", category: "color" },
      { token: "--wb-border", cssVariable: "--wb-border", description: "Component and card border color", sampleDefault: "rgba(0, 0, 0, 0.08)", category: "surface" },
      { token: "--wb-glow-primary", cssVariable: "--wb-glow-primary", description: "Radial brand primary glow for buttons and cards", sampleDefault: "rgba(59, 130, 246, 0.18)", category: "shadow" },
      { token: "--wb-glow-secondary", cssVariable: "--wb-glow-secondary", description: "Radial brand secondary glow", sampleDefault: "rgba(139, 92, 246, 0.14)", category: "shadow" },
      { token: "--wb-gradient-primary", cssVariable: "--wb-gradient-primary", description: "135deg linear gradient from primary to secondary", sampleDefault: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)", category: "color" },
      { token: "--wb-gradient-secondary", cssVariable: "--wb-gradient-secondary", description: "135deg linear gradient from secondary to primary", sampleDefault: "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)", category: "color" },
      { token: "--wb-gradient-text", cssVariable: "--wb-gradient-text", description: "Text clipping gradient for headline accentuation", sampleDefault: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)", category: "color" },
      { token: "--wb-gradient-hero-overlay", cssVariable: "--wb-gradient-hero-overlay", description: "Radial gradient spotlight overlay for hero sections", sampleDefault: "radial-gradient(ellipse 90% 70% at 50% -10%, rgba(59, 130, 246, 0.2), transparent 90%)", category: "surface" },
      { token: "--wb-radius-sm", cssVariable: "--wb-radius-sm", description: "Small border radius for badges and inputs", sampleDefault: "4px", category: "radius" },
      { token: "--wb-radius-md", cssVariable: "--wb-radius-md", description: "Medium border radius for buttons and cards", sampleDefault: "8px", category: "radius" },
      { token: "--wb-radius-lg", cssVariable: "--wb-radius-lg", description: "Large border radius for modals and containers", sampleDefault: "16px", category: "radius" }
    ],
    wcagCompliance: {
      standard: "WCAG 2.1 Level AA",
      minimumNormalTextContrast: 4.5,
      minimumLargeTextContrast: 3.0,
      minimumUiElementContrast: 3.0,
      minimumTapTargetPx: 44,
      rules: [
        "Normal body text (< 18pt or < 14pt bold) must achieve a contrast ratio of at least 4.5:1 against the canvas background.",
        "Headings (>= 18pt or >= 14pt bold) must achieve a contrast ratio of at least 3.0:1.",
        "Interactive buttons and form inputs must maintain a clear boundary of at least 3.0:1 contrast or visible focus rings.",
        "Touch targets on mobile viewports must measure at least 44x44 CSS pixels."
      ]
    },
    darkThemeKeywords: [
      "dark", "night", "black", "luxury", "neon", "cyber", "obsidian"
    ]
  }
};

export const luminousLightThemeEntry: GlobalKnowledgeEntry<DesignSystemPayload> = {
  metadata: {
    id: "wb:global:design_system:luminous_light:v1",
    category: "design_system",
    title: "Luminous Light Theme Preset",
    description: "Soft brand-tinted luminous light canvas with high-contrast slate typography and glass surfaces",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/design-system.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["theme", "light", "luminous", "clean", "preset"]
  },
  data: {
    key: "luminous_light",
    name: "Luminous Light",
    description: "Default clean, crisp, accessible light aesthetic with subtle brand saturation",
    type: "theme_preset",
    isDark: false,
    activationKeywords: ["clean", "light", "modern", "minimal"],
    contrastRequirements: {
      normalTextMinRatio: 4.5,
      largeTextMinRatio: 3.0,
      wcagLevel: "AA"
    },
    cssVariables: {
      "--wb-surface": "rgba(255, 255, 255, 0.88)",
      "--wb-surface-hover": "#FFFFFF",
      "--wb-fg": "#0F172A",
      "--wb-muted": "#475569",
      "--wb-border": "rgba(0, 0, 0, 0.08)"
    }
  }
};

export const darkLuxuryThemeEntry: GlobalKnowledgeEntry<DesignSystemPayload> = {
  metadata: {
    id: "wb:global:design_system:dark_luxury:v1",
    category: "design_system",
    title: "Dark Luxury Theme Preset",
    description: "Deep obsidian brand-tinted dark canvas with glowing accents and light slate typography",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/design-system.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["theme", "dark", "luxury", "obsidian", "night", "preset"]
  },
  data: {
    key: "dark_luxury",
    name: "Dark Luxury",
    description: "High-contrast dark canvas clamped from primary brand hue with glowing card borders",
    type: "theme_preset",
    isDark: true,
    activationKeywords: ["dark", "night", "black", "luxury", "neon", "cyber", "obsidian"],
    contrastRequirements: {
      normalTextMinRatio: 4.5,
      largeTextMinRatio: 3.0,
      wcagLevel: "AA"
    },
    cssVariables: {
      "--wb-surface": "rgba(255, 255, 255, 0.05)",
      "--wb-surface-hover": "rgba(255, 255, 255, 0.09)",
      "--wb-fg": "#F8FAFC",
      "--wb-muted": "#94A3B8",
      "--wb-border": "rgba(255, 255, 255, 0.1)"
    }
  }
};

export const GLOBAL_DESIGN_SYSTEM: GlobalKnowledgeEntry<DesignSystemPayload>[] = [
  designSystemEntry,
  luminousLightThemeEntry,
  darkLuxuryThemeEntry,
];
