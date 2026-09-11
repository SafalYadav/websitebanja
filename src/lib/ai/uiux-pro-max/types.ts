// src/lib/ai/uiux-pro-max/types.ts

/**
 * UI/UX Pro Max Machine-Readable Design System Interfaces
 */

export interface ProductCatalogEntry {
  No?: string;
  "Product Type": string;
  Keywords: string;
  "Primary Style Recommendation": string;
  "Secondary Styles": string;
  "Landing Page Pattern": string;
  "Dashboard Style (if applicable)": string;
  "Color Palette Focus": string;
  "Key Considerations"?: string;
}

export interface UiStyleEntry {
  No?: string;
  "Style Category": string;
  Type: string;
  Keywords: string;
  "Primary Colors": string;
  "Secondary Colors"?: string;
  "Effects & Animation": string;
  "Best For": string;
  "Do Not Use For"?: string;
  "Light Mode ✓": string;
  "Dark Mode ✓": string;
  Performance: string;
  Accessibility: string;
  "Mobile-Friendly"?: string;
  "Conversion-Focused"?: string;
  "Framework Compatibility"?: string;
  "Era/Origin"?: string;
  Complexity?: string;
  "AI Prompt Keywords"?: string;
  "CSS/Technical Keywords"?: string;
  "Implementation Checklist"?: string;
  "Design System Variables"?: string;
  "Style ID": string;
  Aliases: string;
  Status: string;
  "Parent Style ID"?: string;
  "Replacement Domain"?: string;
  "Replacement ID"?: string;
  "Preferred Mode"?: string;
}

export interface ColorPaletteEntry {
  No?: string;
  "Product Type": string;
  Primary: string;
  "On Primary": string;
  Secondary: string;
  "On Secondary": string;
  Accent: string;
  "On Accent": string;
  Background: string;
  Foreground: string;
  Card: string;
  "Card Foreground": string;
  Muted: string;
  "Muted Foreground": string;
  Border: string;
  Destructive: string;
  "On Destructive": string;
  Ring: string;
  Notes: string;
}

export interface TypographyPairingEntry {
  No?: string;
  "Font Pairing Name": string;
  Category: string;
  "Heading Font": string;
  "Body Font": string;
  "Mood/Style Keywords": string;
  "Best For": string;
  "Google Fonts URL": string;
  "CSS Import": string;
  "Tailwind Config": string;
  Notes: string;
}

export interface LandingPatternEntry {
  No?: string;
  "Pattern Name": string;
  Keywords: string;
  "Section Order": string;
  "Primary CTA Placement": string;
  "Color Strategy": string;
  "Recommended Effects": string;
  "Conversion Optimization": string;
  "Pattern ID": string;
  Aliases: string;
}

export interface UiReasoningEntry {
  No?: string;
  UI_Category: string;
  Recommended_Pattern: string;
  Style_Priority: string;
  Color_Mood: string;
  Typography_Mood: string;
  Key_Effects: string;
  Decision_Rules: string;
  Anti_Patterns: string;
  Severity: string;
  Reasoning: string;
  Confidence?: string;
}

export interface UxGuidelineEntry {
  No?: string;
  Category: string;
  Issue: string;
  Platform: string;
  Description: string;
  Do: string;
  "Don't": string;
  "Code Example Good": string;
  "Code Example Bad": string;
  Severity: string;
}

export interface MotionSnippetEntry {
  No?: string;
  Category: string;
  "Intensity Tier": "Subtle" | "Standard" | "Complex";
  Keywords: string;
  Trigger: string;
  Duration: string;
  Easing: string;
  "GSAP Snippet": string;
  "Framework Notes": string;
  Do: string;
  "Don't": string;
  "Performance Notes": string;
}

export interface StackGuidelineEntry {
  No?: string;
  Category: string;
  Guideline: string;
  Description: string;
  Do: string;
  "Don't": string;
  "Code Good": string;
  "Code Bad": string;
  Severity: string;
  "Docs URL"?: string;
  "Applies To"?: string;
  Status?: string;
  "Verified At"?: string;
}

/**
 * 1-10 Design Dial Configuration
 */
export interface UiUxDialConfig {
  variance: number; // 1-10: 1=centered/minimal, 10=bold/asymmetric
  varianceLabel: string;
  motion: number; // 1-10: 1=subtle, 10=complex
  motionLabel: string;
  density: number; // 1-10: 1=spacious, 10=dense/dashboard
  densityLabel: string;
}

export interface SpacingScale {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
}

/**
 * Machine-Readable UI/UX Pro Max Design System
 */
export interface UiUxDesignSystem {
  projectName: string;
  category: string;
  pattern: {
    name: string;
    sections: string[];
    ctaPlacement: string;
    colorStrategy: string;
    conversion: string;
  };
  style: {
    id: string;
    name: string;
    type: string;
    effects: string;
    keywords: string[];
    bestFor: string;
    accessibility: string;
    lightMode: boolean;
    darkMode: boolean;
  };
  colors: {
    primary: string;
    onPrimary: string;
    secondary: string;
    onSecondary: string;
    accent: string;
    onAccent: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    destructive: string;
    onDestructive: string;
    ring: string;
    notes?: string;
  };
  typography: {
    heading: string;
    body: string;
    mood: string;
    bestFor: string;
    googleFontsUrl?: string;
    cssImport?: string;
  };
  effects: string;
  motion: {
    level: "minimal" | "subtle" | "energetic" | "smooth";
    tier: "Subtle" | "Standard" | "Complex";
    durationBase: string;
    easing: string;
    snippet?: string;
  };
  dials: UiUxDialConfig;
  spacingScale: SpacingScale;
  antiPatterns: string[];
  uxGuidelines: Array<{
    category: string;
    issue: string;
    do: string;
    dont: string;
    severity: string;
  }>;
  stackGuidelines: Array<{
    category: string;
    guideline: string;
    description: string;
    do: string;
    dont: string;
    severity: string;
  }>;
  sourceIdentities: {
    product: string | null;
    reasoning: string | null;
    style: string | null;
    color: string | null;
    typography: string | null;
    landing: string | null;
  };
}

export interface DesignSystemOptions {
  projectName?: string;
  variance?: number; // 1-10
  motion?: number; // 1-10
  density?: number; // 1-10
  stack?: "nextjs" | "react" | "html-tailwind" | "shadcn";
  preferredMode?: "light" | "dark" | "auto";
}
