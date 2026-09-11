// src/lib/ai/uiux-pro-max/reasoning/dials.ts

import type { SpacingScale, UiUxDialConfig } from "../types";
import type { WebsiteRequirement } from "../../requirementModel";

export interface ResolvedVariance {
  value: number;
  label: string;
  styleKeywords: string[];
}

export interface ResolvedMotion {
  value: number;
  label: string;
  tier: "Subtle" | "Standard" | "Complex";
  level: "minimal" | "subtle" | "energetic" | "smooth";
  durationBase: string;
  easing: string;
}

export interface ResolvedDensity {
  value: number;
  label: string;
  spacing: SpacingScale;
}

export function resolveVariance(value: number): ResolvedVariance {
  const v = Math.max(1, Math.min(10, Math.round(value)));
  if (v <= 3) {
    return {
      value: v,
      label: "Centered / Minimal",
      styleKeywords: ["Minimalism", "Exaggerated Minimalism", "centered", "symmetric", "grid-based"],
    };
  }
  if (v <= 7) {
    return {
      value: v,
      label: "Balanced / Modern",
      styleKeywords: ["modern", "structured", "balanced"],
    };
  }
  return {
    value: v,
    label: "Bold / Asymmetric",
    styleKeywords: ["Brutalism", "Bento Grids", "asymmetric", "experimental"],
  };
}

export function resolveMotion(value: number): ResolvedMotion {
  const v = Math.max(1, Math.min(10, Math.round(value)));
  if (v <= 3) {
    return {
      value: v,
      label: "Subtle",
      tier: "Subtle",
      level: "subtle",
      durationBase: "200ms",
      easing: "ease-out",
    };
  }
  if (v <= 7) {
    return {
      value: v,
      label: "Standard",
      tier: "Standard",
      level: "smooth",
      durationBase: "300ms",
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    };
  }
  return {
    value: v,
    label: "Complex",
    tier: "Complex",
    level: "energetic",
    durationBase: "450ms",
    easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  };
}

export function resolveDensity(value: number): ResolvedDensity {
  const v = Math.max(1, Math.min(10, Math.round(value)));
  if (v <= 3) {
    return {
      value: v,
      label: "Spacious",
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "24px",
        lg: "32px",
        xl: "48px",
        "2xl": "64px",
        "3xl": "96px",
      },
    };
  }
  if (v <= 7) {
    return {
      value: v,
      label: "Standard",
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
      },
    };
  }
  return {
    value: v,
    label: "Dense / Dashboard",
    spacing: {
      xs: "2px",
      sm: "4px",
      md: "8px",
      lg: "12px",
      xl: "16px",
      "2xl": "24px",
      "3xl": "32px",
    },
  };
}

/**
 * Derives appropriate design dials (variance, motion, density) from WebsiteRequirement context
 * if user hasn't explicitly supplied custom dial preferences.
 */
export function inferDesignDials(
  req: WebsiteRequirement,
  overrides?: { variance?: number; motion?: number; density?: number }
): UiUxDialConfig {
  const combined = `${req.business?.industry || ""} ${req.business?.type || ""} ${req.intent || ""} ${req.brand?.style || ""}`.toLowerCase();

  let defaultVariance = 5;
  let defaultMotion = 5;
  let defaultDensity = 5;

  if (
    combined.includes("dental") ||
    combined.includes("clinic") ||
    combined.includes("medical") ||
    combined.includes("doctor") ||
    combined.includes("health") ||
    combined.includes("hospital")
  ) {
    defaultVariance = 2; // Clean, centered, predictable
    defaultMotion = 2; // Calm, respectful
    defaultDensity = 2; // Spacious, readable
  } else if (combined.includes("restaurant") || combined.includes("cafe") || combined.includes("dining")) {
    defaultVariance = 5;
    defaultMotion = 4;
    defaultDensity = 3;
  } else if (combined.includes("real estate") || combined.includes("luxury") || combined.includes("architecture")) {
    defaultVariance = 3;
    defaultMotion = 3;
    defaultDensity = 2;
  } else if (combined.includes("gym") || combined.includes("fitness") || combined.includes("sports")) {
    defaultVariance = 7;
    defaultMotion = 7;
    defaultDensity = 4;
  } else if (combined.includes("saas") || combined.includes("ai") || combined.includes("startup") || combined.includes("tech")) {
    defaultVariance = 8; // Bold, asymmetric, bento
    defaultMotion = 7; // Modern micro-interactions
    defaultDensity = 5; // Balanced data density
  } else if (combined.includes("ecommerce") || combined.includes("shop") || combined.includes("store")) {
    defaultVariance = 5;
    defaultMotion = 4;
    defaultDensity = 8; // High catalog density
  }

  // Density preference mapping
  if (req.designPreferences?.density === "compact") defaultDensity = 8;
  if (req.designPreferences?.density === "spacious") defaultDensity = 2;

  const finalVariance = overrides?.variance ?? defaultVariance;
  const finalMotion = overrides?.motion ?? defaultMotion;
  const finalDensity = overrides?.density ?? defaultDensity;

  const resV = resolveVariance(finalVariance);
  const resM = resolveMotion(finalMotion);
  const resD = resolveDensity(finalDensity);

  return {
    variance: resV.value,
    varianceLabel: resV.label,
    motion: resM.value,
    motionLabel: resM.label,
    density: resD.value,
    densityLabel: resD.label,
  };
}
