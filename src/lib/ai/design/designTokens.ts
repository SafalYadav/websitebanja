import type { WebsiteRequirement } from "../requirementModel";
import { generateDesignRules, type DesignRules } from "./designRules";
import type { UiUxDesignSystem } from "../uiux-pro-max/types";

/**
 * Normalized Design Tokens consumed by the website generation engine and renderer.
 */
export interface DesignTokens {
  rules: DesignRules;
  uiUxDesignSystem?: UiUxDesignSystem;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    backgroundAlt: string;
    surface: string;
    surfaceHover: string;
    text: string;
    muted: string;
    border: string;
    accent: string;
    glowPrimary: string;
    glowSecondary: string;
    gradientPrimary: string;
    card?: string;
    cardForeground?: string;
    ring?: string;
    destructive?: string;
  };
  typography: {
    heading: string;
    body: string;
    headingScale: number;
    bodyScale: number;
    fontSizeBase: string;
    lineHeightBase: string;
    letterSpacing: string;
  };
  spacing: {
    unit: string;
    small: string;
    medium: string;
    large: string;
    sectionPaddingY: string;
    cardPadding: string;
  };
  radius: {
    default: string;
    button: string;
    card: string;
  };
  shadows: {
    subtle: string;
    medium: string;
    prominent: string;
  };
  breakpoints: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  motion: {
    prefersReduced: boolean;
    durationBase: string;
    easing: string;
    animationLevel: "minimal" | "subtle" | "energetic" | "smooth";
  };
}

function hexToRgba(hex: string, alpha: number): string {
  let sanitized = hex.replace("#", "").trim();
  if (sanitized.length === 3) {
    sanitized = sanitized[0] + sanitized[0] + sanitized[1] + sanitized[1] + sanitized[2] + sanitized[2];
  }
  if (sanitized.length === 6) {
    const r = parseInt(sanitized.substring(0, 2), 16);
    const g = parseInt(sanitized.substring(2, 4), 16);
    const b = parseInt(sanitized.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `rgba(79, 70, 229, ${alpha})`;
}

/**
 * Generates rich, industry-tailored design tokens from WebsiteRequirement.
 * Integrates UI/UX Pro Max Design Intelligence and layers brand/user overrides on top.
 */
export function generateDesignTokens(
  req: WebsiteRequirement,
  uiUxDesignSystem?: UiUxDesignSystem
): DesignTokens {
  const rules = generateDesignRules(req);

  const primary =
    req.brand?.colors?.primary ||
    uiUxDesignSystem?.colors.primary ||
    rules.colorSystem.primaryDefault;
  const secondary =
    req.brand?.colors?.secondary ||
    uiUxDesignSystem?.colors.secondary ||
    rules.colorSystem.secondaryDefault;
  const accent =
    req.brand?.colors?.accent ||
    uiUxDesignSystem?.colors.accent ||
    rules.colorSystem.accentDefault;
  const background =
    uiUxDesignSystem?.colors.background ||
    rules.colorSystem.bgDefault;
  const text =
    uiUxDesignSystem?.colors.foreground ||
    rules.colorSystem.textDefault;

  const isDark = background.startsWith("#0") || background.startsWith("#1");

  const backgroundAlt = isDark ? "#1E293B" : "#F1F5F9";
  const surface =
    uiUxDesignSystem?.colors.card ||
    (isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.9)");
  const surfaceHover = isDark ? "rgba(255, 255, 255, 0.1)" : "#FFFFFF";
  const muted =
    uiUxDesignSystem?.colors.mutedForeground ||
    (isDark ? "#94A3B8" : "#64748B");
  const border =
    uiUxDesignSystem?.colors.border ||
    (isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)");

  const card = uiUxDesignSystem?.colors.card;
  const cardForeground = uiUxDesignSystem?.colors.cardForeground;
  const ring = uiUxDesignSystem?.colors.ring;
  const destructive = uiUxDesignSystem?.colors.destructive;

  const glowPrimary = hexToRgba(primary, isDark ? 0.35 : 0.18);
  const glowSecondary = hexToRgba(secondary, isDark ? 0.25 : 0.14);
  const gradientPrimary = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;

  const density =
    req.designPreferences?.density ||
    (uiUxDesignSystem?.dials.density
      ? uiUxDesignSystem.dials.density <= 3
        ? "spacious"
        : uiUxDesignSystem.dials.density >= 8
        ? "compact"
        : "medium"
      : rules.spacing.density);
  const spacingUnit = density === "compact" ? "4px" : density === "spacious" ? "12px" : "8px";

  const buttonRadius =
    rules.cta.buttonShape === "pill"
      ? "9999px"
      : rules.cta.buttonShape === "sharp"
      ? "0.125rem"
      : "0.5rem";

  const headingFont =
    req.brand?.typography?.heading ||
    uiUxDesignSystem?.typography.heading ||
    rules.typography.headingFont;
  const bodyFont =
    req.brand?.typography?.body ||
    uiUxDesignSystem?.typography.body ||
    rules.typography.bodyFont;

  return {
    rules,
    uiUxDesignSystem,
    colors: {
      primary,
      secondary,
      background,
      backgroundAlt,
      surface,
      surfaceHover,
      text,
      muted,
      border,
      accent,
      glowPrimary,
      glowSecondary,
      gradientPrimary,
      card,
      cardForeground,
      ring,
      destructive,
    },
    typography: {
      heading: headingFont,
      body: bodyFont,
      headingScale: rules.typography.headingScale,
      bodyScale: rules.typography.bodyScale,
      fontSizeBase: `${rules.typography.bodyScale}rem`,
      lineHeightBase: String(rules.typography.lineHeight),
      letterSpacing: rules.typography.letterSpacing,
    },
    spacing: {
      unit: spacingUnit,
      small: `calc(${spacingUnit} * 0.75)`,
      medium: `calc(${spacingUnit} * 1.5)`,
      large: `calc(${spacingUnit} * 3)`,
      sectionPaddingY: rules.spacing.sectionPaddingY,
      cardPadding: rules.spacing.cardPadding,
    },
    radius: {
      default: "0.5rem",
      button: buttonRadius,
      card: rules.cta.buttonShape === "sharp" ? "0.25rem" : "0.75rem",
    },
    shadows: {
      subtle: isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 2px rgba(0,0,0,0.05)",
      medium: isDark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 6px -1px rgba(0,0,0,0.1)",
      prominent: isDark ? "0 10px 25px rgba(0,0,0,0.6)" : "0 10px 15px -3px rgba(0,0,0,0.1)",
    },
    breakpoints: {
      sm: req.responsive?.breakpoints?.sm ?? 640,
      md: req.responsive?.breakpoints?.md ?? 768,
      lg: req.responsive?.breakpoints?.lg ?? 1024,
      xl: 1280,
    },
    motion: {
      prefersReduced: false,
      durationBase: `${rules.motion.durationBaseMs}ms`,
      easing: rules.motion.easing,
      animationLevel: rules.motion.animationLevel,
    },
  };
}
