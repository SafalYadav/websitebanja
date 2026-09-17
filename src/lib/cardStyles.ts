// src/lib/cardStyles.ts
import type { CardColorTreatment, CardFamily } from "@/types/website";

export interface CardStyleInput {
  archetype?: string;
  cardFamily?: CardFamily | string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  textColor?: string;
  isDark?: boolean;
}

/**
 * Derives coordinated surface, border, shadow, corner, and accent styling
 * for a card family.
 *
 * ARCHITECTURAL PRINCIPLE:
 * Card family strictly governs STRUCTURE and GEOMETRY (corners, border width, shadow depth, padding).
 * Design Strategy strictly governs COLORS (primary, secondary, accent, surface, border tint).
 * An organic card does NOT imply green/brown; a luxury card does NOT imply black/gold.
 */
export function resolveCardColorTreatment(input: CardStyleInput): CardColorTreatment {
  const {
    archetype = "warm_artisanal",
    cardFamily = "elevated",
    primaryColor = "#2563EB",
    secondaryColor = "#1E40AF",
    accentColor,
    surfaceColor,
    borderColor,
    textColor,
    isDark = false,
  } = input;

  const archLower = archetype.toLowerCase();
  const famLower = String(cardFamily).toLowerCase();

  const resolvedAccent = accentColor || primaryColor;
  const resolvedText = textColor || (isDark ? "#F8FAFC" : "#0F172A");
  const resolvedSurface =
    surfaceColor ||
    (isDark ? "rgba(255, 255, 255, 0.05)" : "#FFFFFF");

  // 1. Neo-Brutalist Family (High contrast, heavy borders, sharp corners, hard offset shadow)
  if (famLower.includes("brutalist") || archLower.includes("brutalist")) {
    const hardBorderColor = isDark ? "#FFFFFF" : "#000000";
    return {
      surface: isDark ? "#121212" : "#FFFFFF",
      border: `2px solid ${hardBorderColor}`,
      shadow: `4px 4px 0px 0px ${hardBorderColor}`,
      accent: resolvedAccent,
      corner: "none",
      text: isDark ? "#FFFFFF" : "#000000",
      badgeBg: isDark ? "#FFFFFF" : "#000000",
      badgeText: isDark ? "#000000" : "#FFFFFF",
    };
  }

  // 2. Luxury & Bespoke Family (Refined bevel, expansive soft ambient elevation, rounded corners)
  if (famLower.includes("luxury")) {
    return {
      surface: isDark ? "rgba(18, 18, 21, 0.85)" : "#FAF9F6",
      border: borderColor || (isDark ? `1px solid ${resolvedAccent}40` : `1px solid ${resolvedAccent}25`),
      shadow: isDark
        ? `0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 15px ${resolvedAccent}15`
        : `0 15px 35px -8px ${primaryColor}15, 0 1px 2px rgba(0, 0, 0, 0.04)`,
      accent: resolvedAccent,
      corner: "xl",
      text: resolvedText,
      badgeBg: `${resolvedAccent}18`,
      badgeText: resolvedAccent,
    };
  }

  // 3. Technical & Glass-Layered Family (Frosted surface, subtle inner border glow)
  if (famLower.includes("technical") || famLower.includes("glass") || archLower.includes("technical")) {
    return {
      surface: isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.80)",
      border: borderColor || (isDark ? `1px solid ${resolvedAccent}35` : `1px solid ${primaryColor}20`),
      shadow: isDark
        ? `0 0 30px -5px ${resolvedAccent}20, inset 0 1px 0 rgba(255, 255, 255, 0.08)`
        : `0 10px 25px -5px ${primaryColor}10, inset 0 1px 0 rgba(255, 255, 255, 0.60)`,
      accent: resolvedAccent,
      corner: "lg",
      text: resolvedText,
      badgeBg: `${resolvedAccent}18`,
      badgeText: resolvedAccent,
    };
  }

  // 4. Organic & Handcrafted Family (Extra soft generous pill corners, warm diffused depth)
  if (famLower.includes("organic")) {
    return {
      surface: resolvedSurface,
      border: borderColor || (isDark ? `1px solid ${resolvedAccent}30` : `1px solid ${primaryColor}18`),
      shadow: isDark
        ? "0 20px 45px -10px rgba(0, 0, 0, 0.6)"
        : `0 18px 40px -12px ${secondaryColor}15, 0 2px 4px rgba(0, 0, 0, 0.02)`,
      accent: resolvedAccent,
      corner: "2xl",
      text: resolvedText,
      badgeBg: `${resolvedAccent}20`,
      badgeText: isDark ? "#FFFFFF" : resolvedAccent,
    };
  }

  // 5. Minimal Flat & Editorial Family (Subtle hairline border, zero or near-zero shadow, compact corner)
  if (famLower.includes("editorial") || famLower.includes("minimal-flat")) {
    return {
      surface: resolvedSurface,
      border: borderColor || (isDark ? "1px solid rgba(255, 255, 255, 0.10)" : "1px solid rgba(0, 0, 0, 0.08)"),
      shadow: "none",
      accent: resolvedAccent,
      corner: "sm",
      text: resolvedText,
      badgeBg: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
      badgeText: resolvedText,
    };
  }

  // 6. Bordered Family (Defined crisp framing, subtle shadow)
  if (famLower.includes("bordered")) {
    return {
      surface: resolvedSurface,
      border: borderColor || (isDark ? `1px solid ${resolvedAccent}40` : `1px solid ${primaryColor}25`),
      shadow: "0 4px 12px -2px rgba(0, 0, 0, 0.05)",
      accent: resolvedAccent,
      corner: "lg",
      text: resolvedText,
      badgeBg: `${resolvedAccent}15`,
      badgeText: resolvedAccent,
    };
  }

  // 7. Asymmetric Family (Geometric asymmetry, high-visual interest)
  if (famLower.includes("asymmetric")) {
    return {
      surface: resolvedSurface,
      border: borderColor || (isDark ? `1px solid ${resolvedAccent}35` : `1px solid ${primaryColor}20`),
      shadow: isDark ? "0 18px 36px -8px rgba(0, 0, 0, 0.5)" : "0 16px 36px -10px rgba(0, 0, 0, 0.08)",
      accent: resolvedAccent,
      corner: "2xl",
      text: resolvedText,
      badgeBg: `${resolvedAccent}18`,
      badgeText: resolvedAccent,
    };
  }

  // Default / Elevated Family Fallback
  return {
    surface: resolvedSurface,
    border: borderColor || (isDark ? "1px solid rgba(255, 255, 255, 0.10)" : "1px solid rgba(0, 0, 0, 0.07)"),
    shadow: isDark
      ? "0 20px 40px -10px rgba(0, 0, 0, 0.6)"
      : "0 16px 35px -8px rgba(0, 0, 0, 0.07)",
    accent: resolvedAccent,
    corner: "2xl",
    text: resolvedText,
    badgeBg: `${resolvedAccent}15`,
    badgeText: resolvedAccent,
  };
}

/**
 * Returns Tailwind classNames for corner radius token.
 */
export function getCornerClassName(corner?: CardColorTreatment["corner"]): string {
  switch (corner) {
    case "none":
      return "rounded-none";
    case "sm":
      return "rounded-sm";
    case "md":
      return "rounded-md";
    case "lg":
      return "rounded-lg";
    case "xl":
      return "rounded-xl";
    case "2xl":
      return "rounded-2xl";
    case "full":
      return "rounded-full";
    default:
      return "rounded-2xl";
  }
}
