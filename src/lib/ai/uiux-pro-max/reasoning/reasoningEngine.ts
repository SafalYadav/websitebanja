// src/lib/ai/uiux-pro-max/reasoning/reasoningEngine.ts

import { searchEngine } from "../search/searchEngine";
import { parseDecisionRules, applyDecisionRules } from "./decisionRules";
import { resolveColorMode, selectPaletteForMode, filterAntiPatternsForMode } from "./colorMode";
import { inferDesignDials, resolveDensity, resolveMotion, resolveVariance } from "./dials";
import type {
  UiReasoningEntry,
  UiStyleEntry,
  ColorPaletteEntry,
  TypographyPairingEntry,
  LandingPatternEntry,
  UiUxDesignSystem,
  DesignSystemOptions,
} from "../types";
import type { WebsiteRequirement } from "../../requirementModel";

import uiReasoningData from "../data/uiReasoning.json";
import stylesData from "../data/styles.json";
import landingData from "../data/landing.json";

const reasoningList = uiReasoningData as UiReasoningEntry[];
const allStyles = stylesData as UiStyleEntry[];
const allLanding = landingData as LandingPatternEntry[];

// Build style lookup map by Style ID, Category, and Aliases
const styleLookup = new Map<string, UiStyleEntry>();
for (const style of allStyles) {
  if (style["Style ID"]) styleLookup.set(style["Style ID"].toLowerCase(), style);
  if (style["Style Category"]) styleLookup.set(style["Style Category"].toLowerCase(), style);
  if (style.Aliases) {
    for (const alias of style.Aliases.split("|")) {
      const a = alias.trim().toLowerCase();
      if (a) styleLookup.set(a, style);
    }
  }
}

// Build landing lookup
const landingLookup = new Map<string, LandingPatternEntry>();
for (const pattern of allLanding) {
  if (pattern["Pattern ID"]) landingLookup.set(pattern["Pattern ID"].toLowerCase(), pattern);
  if (pattern["Pattern Name"]) landingLookup.set(pattern["Pattern Name"].toLowerCase(), pattern);
  if (pattern.Aliases) {
    for (const alias of pattern.Aliases.split("|")) {
      const a = alias.trim().toLowerCase();
      if (a) landingLookup.set(a, pattern);
    }
  }
}

function resolveStyleEntry(ref: string): UiStyleEntry | undefined {
  const clean = String(ref || "").trim().toLowerCase();
  let found = styleLookup.get(clean);
  const seen = new Set<string>();

  while (found && found.Status === "deprecated") {
    const parentId = (found["Parent Style ID"] || "").toLowerCase();
    if (!parentId || seen.has(parentId)) return undefined;
    seen.add(parentId);
    found = styleLookup.get(parentId);
  }

  return found;
}

function findReasoningRule(category: string): UiReasoningEntry | undefined {
  const catLower = category.trim().toLowerCase();
  for (const rule of reasoningList) {
    if (rule.UI_Category.trim().toLowerCase() === catLower) {
      return rule;
    }
  }
  // Substring fallback match
  for (const rule of reasoningList) {
    const rc = rule.UI_Category.trim().toLowerCase();
    if (rc.includes(catLower) || catLower.includes(rc)) {
      return rule;
    }
  }
  return undefined;
}

function selectBestStyleMatch(
  results: UiStyleEntry[],
  priorityKeywords: string[]
): UiStyleEntry {
  if (results.length === 0) {
    return allStyles[0];
  }
  if (priorityKeywords.length === 0) {
    return results[0];
  }

  // 1. Direct priority match from reasoning contract
  for (const priority of priorityKeywords) {
    const resolved = resolveStyleEntry(priority);
    if (resolved && resolved.Status !== "deprecated") {
      return resolved;
    }
  }

  // 2. Score by keywords
  let best = results[0];
  let bestScore = -1;

  for (const item of results) {
    const itemStr = `${item["Style Category"]} ${item.Keywords} ${item["AI Prompt Keywords"] || ""}`.toLowerCase();
    let score = 0;
    for (const kw of priorityKeywords) {
      const kwLower = kw.toLowerCase();
      if (item["Style Category"].toLowerCase().includes(kwLower)) {
        score += 10;
      } else if (itemStr.includes(kwLower)) {
        score += 3;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return bestScore > 0 ? best : results[0];
}

/**
 * Main Reasoning function producing a comprehensive UiUxDesignSystem
 * directly from requirement context and UI/UX Pro Max rules.
 */
export function reasonDesignSystem(
  req: WebsiteRequirement,
  options?: DesignSystemOptions
): UiUxDesignSystem {
  const query = [
    req.business?.name,
    req.business?.type,
    req.business?.industry,
    req.intent,
    req.brand?.style,
    req.cta,
    ...(req.services || []),
    ...(req.specialInstructions || []),
  ]
    .filter(Boolean)
    .join(" ");

  // 1. Dials resolution
  const dials = inferDesignDials(req, {
    variance: options?.variance,
    motion: options?.motion,
    density: options?.density,
  });

  const varianceInfo = resolveVariance(dials.variance);
  const motionInfo = resolveMotion(dials.motion);
  const densityInfo = resolveDensity(dials.density);

  // 2. Product category discovery
  const productSearch = searchEngine.searchProducts(query, 1);
  let category = "General";
  const productEntry = productSearch.results[0];

  if (productSearch.results.length > 0) {
    category = productSearch.results[0]["Product Type"];
  }

  // 3. Reasoning rule lookup & decision rules
  const rule = findReasoningRule(category) || findReasoningRule(req.business?.type || "") || findReasoningRule(req.business?.industry || "");
  let recommendedPattern = "Hero + Features + CTA";
  let stylePriority: string[] = ["Minimalism", "Flat Design"];
  let colorMood = "Professional";
  let typographyMood = "Clean";
  let keyEffects = "Subtle hover transitions";
  let antiPatternsRaw = "";
  let preferredMode: "dark" | "light" | null = null;

  if (rule) {
    const decRules = parseDecisionRules(rule.Decision_Rules);
    const appliedDecisions = applyDecisionRules(decRules, query);

    recommendedPattern = appliedDecisions.pattern || rule.Recommended_Pattern;
    const ruleStyles = rule.Style_Priority.split("+").map((s) => s.trim());
    stylePriority = [...appliedDecisions.styleIds, ...ruleStyles];
    colorMood = rule.Color_Mood;
    typographyMood = rule.Typography_Mood;
    keyEffects = rule.Key_Effects;
    antiPatternsRaw = rule.Anti_Patterns;
    preferredMode = appliedDecisions.mode;
  }

  // 4. Multi-domain search with variance bias
  const effectiveStyleKeywords = [...varianceInfo.styleKeywords, ...stylePriority];
  const styleSearch = searchEngine.searchStyles(
    `${query} ${category} ${effectiveStyleKeywords.slice(0, 2).join(" ")}`,
    5
  );
  const bestStyle = selectBestStyleMatch(styleSearch.results, effectiveStyleKeywords);

  // 5. Color resolution & mode matching
  const resolvedMode =
    options?.preferredMode && options.preferredMode !== "auto"
      ? options.preferredMode
      : preferredMode || resolveColorMode(query, bestStyle, req.designPreferences?.themeMode as "light" | "dark" | undefined);

  const colorSearch = searchEngine.searchColors(`${colorMood} ${query} ${category}`, 5);
  const bestColor: ColorPaletteEntry = selectPaletteForMode(colorSearch.results, resolvedMode);

  // 6. Typography search
  const typoSearch = searchEngine.searchTypography(`${typographyMood} ${query}`, 3);
  const bestTypo: TypographyPairingEntry =
    typoSearch.results.length > 0
      ? typoSearch.results[0]
      : {
          "Font Pairing Name": "Inter + Inter",
          Category: "Modern Sans",
          "Heading Font": "Inter",
          "Body Font": "Inter",
          "Mood/Style Keywords": "Clean, Modern, Reliable",
          "Best For": "General Purpose",
          "Google Fonts URL": "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
          "CSS Import": "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');",
          "Tailwind Config": "",
          Notes: "",
        };

  // 7. Landing pattern search
  const landingSearch = searchEngine.searchLanding(recommendedPattern, 3);
  const matchedPattern =
    landingLookup.get(recommendedPattern.toLowerCase()) ||
    landingSearch.results.find((p) => p["Pattern Name"].toLowerCase() === recommendedPattern.toLowerCase()) ||
    landingSearch.results[0] ||
    allLanding[0];

  const parsedSections = matchedPattern["Section Order"]
    .split(/[>+,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 8. Motion snippet search
  const motionSearch = searchEngine.searchMotion(`${query} ${motionInfo.tier}`, 3);
  const bestMotion = motionSearch.results.find((m) => m["Intensity Tier"] === motionInfo.tier) || motionSearch.results[0];

  // 9. UX Guidelines search
  const uxSearch = searchEngine.searchUx(`${category} ${query}`, 4);
  const uxGuidelines = uxSearch.results.map((u) => ({
    category: u.Category,
    issue: u.Issue,
    do: u.Do,
    dont: u["Don't"],
    severity: u.Severity,
  }));

  // 10. Stack Guidelines
  const stackChoice = options?.stack || "nextjs";
  const stackSearch = searchEngine.searchStack(query, stackChoice, 3);
  const stackGuidelines = stackSearch.results.map((s) => ({
    category: s.Category,
    guideline: s.Guideline,
    description: s.Description,
    do: s.Do,
    dont: s["Don't"],
    severity: s.Severity,
  }));

  // 11. Anti-patterns filtering for mode
  const filteredAntiPatterns = filterAntiPatternsForMode(antiPatternsRaw, resolvedMode);

  return {
    projectName: options?.projectName || req.business?.name || "WebsiteBanja Project",
    category,
    pattern: {
      name: matchedPattern["Pattern Name"],
      sections: parsedSections.length > 0 ? parsedSections : ["Hero", "Features", "Services", "CTA", "Footer"],
      ctaPlacement: matchedPattern["Primary CTA Placement"] || "Above fold & Header",
      colorStrategy: matchedPattern["Color Strategy"] || "High-contrast CTA on muted background",
      conversion: matchedPattern["Conversion Optimization"] || "Frictionless primary action",
    },
    style: {
      id: bestStyle["Style ID"] || "minimalism",
      name: bestStyle["Style Category"] || "Minimalism",
      type: bestStyle.Type || "Modern",
      effects: bestStyle["Effects & Animation"] || keyEffects,
      keywords: (bestStyle.Keywords || "").split(",").map((k) => k.trim()).filter(Boolean),
      bestFor: bestStyle["Best For"] || "",
      accessibility: bestStyle.Accessibility || "AA Compliant",
      lightMode: (bestStyle["Light Mode ✓"] || "").includes("✓"),
      darkMode: (bestStyle["Dark Mode ✓"] || "").includes("✓"),
    },
    colors: {
      primary: bestColor.Primary || "#2563EB",
      onPrimary: bestColor["On Primary"] || "#FFFFFF",
      secondary: bestColor.Secondary || "#3B82F6",
      onSecondary: bestColor["On Secondary"] || "#FFFFFF",
      accent: bestColor.Accent || "#F59E0B",
      onAccent: bestColor["On Accent"] || "#FFFFFF",
      background: bestColor.Background || (resolvedMode === "dark" ? "#0F172A" : "#FFFFFF"),
      foreground: bestColor.Foreground || (resolvedMode === "dark" ? "#F8FAFC" : "#0F172A"),
      card: bestColor.Card || (resolvedMode === "dark" ? "#1E293B" : "#FFFFFF"),
      cardForeground: bestColor["Card Foreground"] || (resolvedMode === "dark" ? "#F8FAFC" : "#0F172A"),
      muted: bestColor.Muted || (resolvedMode === "dark" ? "#334155" : "#F1F5F9"),
      mutedForeground: bestColor["Muted Foreground"] || (resolvedMode === "dark" ? "#94A3B8" : "#64748B"),
      border: bestColor.Border || (resolvedMode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"),
      destructive: bestColor.Destructive || "#EF4444",
      onDestructive: bestColor["On Destructive"] || "#FFFFFF",
      ring: bestColor.Ring || bestColor.Primary || "#2563EB",
      notes: bestColor.Notes,
    },
    typography: {
      heading: bestTypo["Heading Font"] || "Plus Jakarta Sans",
      body: bestTypo["Body Font"] || "Inter",
      mood: bestTypo["Mood/Style Keywords"] || typographyMood,
      bestFor: bestTypo["Best For"] || "",
      googleFontsUrl: bestTypo["Google Fonts URL"],
      cssImport: bestTypo["CSS Import"],
    },
    effects: `${bestStyle["Effects & Animation"] || ""} | ${keyEffects}`.trim(),
    motion: {
      level: motionInfo.level,
      tier: motionInfo.tier,
      durationBase: motionInfo.durationBase,
      easing: motionInfo.easing,
      snippet: bestMotion ? bestMotion["GSAP Snippet"] : undefined,
    },
    dials,
    spacingScale: densityInfo.spacing,
    antiPatterns: filteredAntiPatterns,
    uxGuidelines,
    stackGuidelines,
    sourceIdentities: {
      product: productEntry ? productEntry["Product Type"] : null,
      reasoning: rule ? rule.UI_Category : null,
      style: bestStyle["Style ID"] || bestStyle["Style Category"] || null,
      color: bestColor["Product Type"] || null,
      typography: bestTypo["Font Pairing Name"] || null,
      landing: matchedPattern["Pattern Name"] || null,
    },
  };
}
