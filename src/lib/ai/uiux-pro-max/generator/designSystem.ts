// src/lib/ai/uiux-pro-max/generator/designSystem.ts

import { reasonDesignSystem } from "../reasoning/reasoningEngine";
import type { UiUxDesignSystem, DesignSystemOptions } from "../types";
import type { WebsiteRequirement } from "../../requirementModel";

/**
 * Main generator entry point for UI/UX Pro Max Design Intelligence.
 */
export function generateUiUxDesignSystem(
  req: WebsiteRequirement,
  options?: DesignSystemOptions
): UiUxDesignSystem {
  return reasonDesignSystem(req, options);
}

/**
 * Formats a UiUxDesignSystem object into human-readable Markdown documentation.
 */
export function formatDesignSystemMarkdown(ds: UiUxDesignSystem): string {
  const sections: string[] = [];

  sections.push(`# UI/UX Pro Max Design System: ${ds.projectName}`);
  sections.push(`**Category:** ${ds.category} | **Primary Style:** ${ds.style.name} (\`${ds.style.id}\`)\n`);

  sections.push(`## 1. Design Dials (1-10)`);
  sections.push(`- **Variance:** ${ds.dials.variance}/10 (${ds.dials.varianceLabel})`);
  sections.push(`- **Motion Intensity:** ${ds.dials.motion}/10 (${ds.dials.motionLabel})`);
  sections.push(`- **Visual Density:** ${ds.dials.density}/10 (${ds.dials.densityLabel})\n`);

  sections.push(`## 2. Landing Pattern & Layout`);
  sections.push(`- **Pattern Name:** ${ds.pattern.name}`);
  sections.push(`- **Section Sequence:** ${ds.pattern.sections.join(" ➔ ")}`);
  sections.push(`- **CTA Placement:** ${ds.pattern.ctaPlacement}`);
  sections.push(`- **Color Strategy:** ${ds.pattern.colorStrategy}`);
  sections.push(`- **Conversion Optimization:** ${ds.pattern.conversion}\n`);

  sections.push(`## 3. Color Palette`);
  sections.push(`| Role | Value | Notes |`);
  sections.push(`|---|---|---|`);
  sections.push(`| Primary | \`${ds.colors.primary}\` | On: \`${ds.colors.onPrimary}\` |`);
  sections.push(`| Secondary | \`${ds.colors.secondary}\` | On: \`${ds.colors.onSecondary}\` |`);
  sections.push(`| Accent / CTA | \`${ds.colors.accent}\` | On: \`${ds.colors.onAccent}\` |`);
  sections.push(`| Background | \`${ds.colors.background}\` | Foreground: \`${ds.colors.foreground}\` |`);
  sections.push(`| Surface / Card | \`${ds.colors.card}\` | Foreground: \`${ds.colors.cardForeground}\` |`);
  sections.push(`| Muted | \`${ds.colors.muted}\` | Foreground: \`${ds.colors.mutedForeground}\` |`);
  sections.push(`| Border | \`${ds.colors.border}\` | Ring: \`${ds.colors.ring}\` |`);
  sections.push(`| Destructive | \`${ds.colors.destructive}\` | On: \`${ds.colors.onDestructive}\` |\n`);

  sections.push(`## 4. Typography`);
  sections.push(`- **Heading Font:** ${ds.typography.heading}`);
  sections.push(`- **Body Font:** ${ds.typography.body}`);
  sections.push(`- **Mood:** ${ds.typography.mood}`);
  if (ds.typography.googleFontsUrl) {
    sections.push(`- **Google Fonts:** [Link](${ds.typography.googleFontsUrl})`);
  }
  sections.push("");

  sections.push(`## 5. Spacing Scale`);
  sections.push(
    Object.entries(ds.spacingScale)
      .map(([k, v]) => `\`${k}\`: ${v}`)
      .join(" | ")
  );
  sections.push("");

  sections.push(`## 6. Anti-Patterns to Avoid`);
  if (ds.antiPatterns.length > 0) {
    for (const ap of ds.antiPatterns) {
      sections.push(`- ⚠️ ${ap}`);
    }
  } else {
    sections.push(`- No critical anti-patterns reported.`);
  }
  sections.push("");

  sections.push(`## 7. UX & Accessibility Guidelines`);
  for (const ux of ds.uxGuidelines.slice(0, 3)) {
    sections.push(`- **${ux.issue}** (${ux.severity})`);
    sections.push(`  - ✅ **Do:** ${ux.do}`);
    sections.push(`  - ❌ **Don't:** ${ux.dont}`);
  }
  sections.push("");

  return sections.join("\n");
}
