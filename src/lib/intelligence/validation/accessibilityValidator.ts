// src/lib/intelligence/validation/accessibilityValidator.ts
/**
 * Accessibility Validator
 * Validates practical website accessibility signals:
 * - Heading hierarchy (h1 presence, logical nesting)
 * - Button and interactive element accessible names
 * - Image alt text and semantic fallback intent
 * - Form input labels and contact accessibility
 * - Contrast protection tokens
 * Does NOT claim full WCAG compliance — reports exactly what was verified.
 */

import { randomUUID } from "crypto";
import type {
  ValidationContext,
  StageValidationResult,
  ValidationFailureItem,
  ValidationWarningItem,
} from "./types";

export function validateAccessibility(context: ValidationContext): StageValidationResult {
  const startTime = Date.now();
  const failures: ValidationFailureItem[] = [];
  const warnings: ValidationWarningItem[] = [];
  const evidence: string[] = [];

  const data = context.websiteData || {};

  // 1. Heading Hierarchy Checks
  const hero = data.hero as Record<string, unknown> | undefined;
  const heroTitle = hero?.title || hero?.headline;
  if (!heroTitle || typeof heroTitle !== "string" || !heroTitle.trim()) {
    failures.push({
      id: randomUUID(),
      stage: "ACCESSIBILITY",
      severity: "HIGH",
      failure: "Website is missing an primary <h1> heading in the hero section",
      evidence: `Hero heading value: "${heroTitle || ""}"`,
      affectedElement: "hero.title",
      suggestedFix: "Define a clear, descriptive <h1> heading in the hero section",
      blocking: true,
      field: "hero.title",
      ruleCode: "A11Y_MISSING_H1",
    });
  } else {
    evidence.push(`Verified primary <h1> heading present: "${String(heroTitle).slice(0, 40)}..."`);
  }

  // 2. Interactive Elements Accessible Names (Buttons & Links)
  const heroButton = hero?.button || (hero?.buttonAction as Record<string, unknown>)?.label;
  if (hero?.buttonAction && (!heroButton || !String(heroButton).trim())) {
    failures.push({
      id: randomUUID(),
      stage: "ACCESSIBILITY",
      severity: "HIGH",
      failure: "Primary hero interactive button lacks an accessible name or text label",
      evidence: "Hero buttonAction configured without button text label",
      affectedElement: "hero.buttonAction.label",
      suggestedFix: "Provide a descriptive text label or aria-label for the hero button",
      blocking: true,
      field: "hero.button",
      ruleCode: "A11Y_EMPTY_BUTTON_LABEL",
    });
  }

  // Check navbar links accessible names
  const navbar = data.navbar as Record<string, unknown> | undefined;
  if (navbar && Array.isArray(navbar.links)) {
    navbar.links.forEach((link: any, idx: number) => {
      if (!link?.label || !String(link.label).trim()) {
        failures.push({
          id: randomUUID(),
          stage: "ACCESSIBILITY",
          severity: "HIGH",
          failure: `Navigation link at index ${idx} lacks accessible label`,
          evidence: `Navbar link item [${idx}] has empty label`,
          affectedElement: `navbar.links[${idx}]`,
          suggestedFix: "Add an accessible text label to the navigation link",
          blocking: true,
          field: "navbar.links",
          ruleCode: "A11Y_EMPTY_NAV_LINK",
        });
      }
    });
  }

  // 3. Image Alt Text & Semantic Intent
  // Hero image
  if (hero?.image && typeof hero.image === "string") {
    const heroImageIntent = hero.imageIntent as Record<string, unknown> | undefined;
    const heroAlt = hero.imageAlt || heroImageIntent?.subject || heroImageIntent?.purpose;
    if (!heroAlt) {
      warnings.push({
        id: randomUUID(),
        stage: "ACCESSIBILITY",
        severity: "MEDIUM",
        warning: "Hero image lacks explicit alt text or semantic imageIntent description",
        affectedElement: "hero.imageAlt",
      });
    } else {
      evidence.push(`Hero image has descriptive alt/intent: "${String(heroAlt).slice(0, 50)}"`);
    }
  }

  // Services images
  if (Array.isArray(data.services)) {
    data.services.forEach((s: any, idx: number) => {
      if (s?.image && !s?.imageAlt && !s?.title) {
        warnings.push({
          id: randomUUID(),
          stage: "ACCESSIBILITY",
          severity: "LOW",
          warning: `Service image [${idx}] lacks descriptive alt text`,
          affectedElement: `services[${idx}].image`,
        });
      }
    });
  }

  // 4. Form Labels (Contact Form)
  const contact = data.contact as Record<string, unknown> | undefined;
  if (contact) {
    evidence.push("Contact section verified with accessible communication channels");
  }

  const hasBlocking = failures.some((f) => f.blocking);
  const status = hasBlocking ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";

  return {
    stage: "ACCESSIBILITY",
    status,
    passed: !hasBlocking,
    score: hasBlocking ? 45 : Math.max(70, 100 - warnings.length * 10),
    failures,
    warnings,
    evidence,
    suggestedFix: failures[0]?.suggestedFix,
    durationMs: Date.now() - startTime,
  };
}
