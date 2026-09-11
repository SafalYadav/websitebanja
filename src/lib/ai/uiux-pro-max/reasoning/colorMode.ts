// src/lib/ai/uiux-pro-max/reasoning/colorMode.ts

import type { ColorPaletteEntry, UiStyleEntry } from "../types";

const DARK_BACKGROUND_MAX_LUMINANCE = 0.18;

const DARK_PRIMARY_MARKERS = [
  "dark mode primary",
  "dark primary",
  "dark-only",
  "dark only",
  "dark preferred",
  "dark focused",
  "dark-first",
  "dark rich",
  "light mode only as exception",
];

const DARK_QUERY_MARKERS = [
  "dark mode",
  "dark theme",
  "dark ui",
  "dark-mode",
  "darkmode",
  "night mode",
  "midnight",
  "oled",
];

export function relativeLuminance(hexColor: string): number | null {
  if (!hexColor) return null;
  let value = hexColor.trim().replace(/^#/, "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (value.length !== 6) return null;

  try {
    const r = parseInt(value.substring(0, 2), 16) / 255;
    const g = parseInt(value.substring(2, 4), 16) / 255;
    const b = parseInt(value.substring(4, 6), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

    const toLinear = (c: number) =>
      c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  } catch {
    return null;
  }
}

export function isPaletteDark(palette: ColorPaletteEntry): boolean {
  const lum = relativeLuminance(palette.Background);
  return lum !== null && lum < DARK_BACKGROUND_MAX_LUMINANCE;
}

export function resolveColorMode(
  query: string,
  style?: UiStyleEntry,
  preference?: "light" | "dark" | "auto"
): "dark" | "light" {
  if (preference === "dark" || preference === "light") {
    return preference;
  }

  const queryLower = (query || "").toLowerCase();
  if (DARK_QUERY_MARKERS.some((marker) => queryLower.includes(marker))) {
    return "dark";
  }

  if (style) {
    const stylePreferred = (style["Preferred Mode"] || "").toLowerCase();
    if (stylePreferred === "dark") return "dark";
    if (stylePreferred === "light") return "light";

    const darkCol = (style["Dark Mode ✓"] || "").toLowerCase();
    if (DARK_PRIMARY_MARKERS.some((m) => darkCol.includes(m))) {
      return "dark";
    }
  }

  return "light";
}

export function selectPaletteForMode(
  palettes: ColorPaletteEntry[],
  mode: "dark" | "light"
): ColorPaletteEntry {
  if (!palettes || palettes.length === 0) {
    return {
      "Product Type": "Fallback",
      Primary: mode === "dark" ? "#6366F1" : "#2563EB",
      "On Primary": "#FFFFFF",
      Secondary: mode === "dark" ? "#818CF8" : "#3B82F6",
      "On Secondary": "#FFFFFF",
      Accent: "#F59E0B",
      "On Accent": "#FFFFFF",
      Background: mode === "dark" ? "#0F172A" : "#F8FAFC",
      Foreground: mode === "dark" ? "#F8FAFC" : "#0F172A",
      Card: mode === "dark" ? "#1E293B" : "#FFFFFF",
      "Card Foreground": mode === "dark" ? "#F8FAFC" : "#0F172A",
      Muted: mode === "dark" ? "#334155" : "#E2E8F0",
      "Muted Foreground": mode === "dark" ? "#94A3B8" : "#64748B",
      Border: mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
      Destructive: "#EF4444",
      "On Destructive": "#FFFFFF",
      Ring: mode === "dark" ? "#6366F1" : "#2563EB",
      Notes: "Default standard palette",
    };
  }

  const matching = palettes.filter((p) =>
    mode === "dark" ? isPaletteDark(p) : !isPaletteDark(p)
  );

  return matching.length > 0 ? matching[0] : palettes[0];
}

export function filterAntiPatternsForMode(
  rawAntiPatterns: string,
  mode: "dark" | "light"
): string[] {
  if (!rawAntiPatterns) return [];

  const items = rawAntiPatterns
    .split(/[;|\n]+/)
    .map((s) => s.trim().replace(/^[-*•]\s*/, ""))
    .filter((s) => s.length > 0);

  // If in dark mode, filter out anti-patterns warning against dark mode
  if (mode === "dark") {
    return items.filter(
      (item) =>
        !/avoid\s+dark\s+mode/i.test(item) &&
        !/do\s+not\s+use\s+dark\s+mode/i.test(item) &&
        !/don't\s+use\s+dark\s+mode/i.test(item)
    );
  }

  return items;
}
