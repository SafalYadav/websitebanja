// src/lib/intelligence/validation/ctaValidator.ts
/**
 * CTA Validator
 * Validates that the generated website has an appropriate and functional conversion path.
 * Checks primary CTA presence, business alignment, meaningful copy, and valid destinations.
 */

import { randomUUID } from "crypto";
import type {
  ValidationContext,
  StageValidationResult,
  ValidationFailureItem,
  ValidationWarningItem,
} from "./types";

export function validateCTA(context: ValidationContext): StageValidationResult {
  const startTime = Date.now();
  const failures: ValidationFailureItem[] = [];
  const warnings: ValidationWarningItem[] = [];
  const evidence: string[] = [];

  const data = context.websiteData || {};
  const hero = data.hero as Record<string, unknown> | undefined;

  // 1. Primary CTA Existence
  const heroButton = String(hero?.button || hero?.ctaText || "").trim();
  const heroAction = hero?.buttonAction as Record<string, unknown> | undefined;

  if (!heroButton && !heroAction) {
    failures.push({
      id: randomUUID(),
      stage: "CTA",
      severity: "CRITICAL",
      failure: "Primary hero CTA button is completely missing",
      evidence: "Hero section contains no button label or buttonAction configuration",
      affectedElement: "hero.button",
      suggestedFix: "Add a prominent primary CTA button (e.g., 'Book Now', 'Get Free Quote', 'Contact Us')",
      blocking: true,
      field: "hero.button",
      ruleCode: "CTA_MISSING_PRIMARY",
    });
  } else {
    evidence.push(`Primary CTA label: "${heroButton || heroAction?.label || "Action"}"`);
  }

  // 2. Meaningful CTA Text
  if (heroButton) {
    const meaninglessPatterns = [/^click\s*here$/i, /^submit$/i, /^button$/i, /^read\s*more$/i, /^test$/i];
    if (meaninglessPatterns.some((p) => p.test(heroButton))) {
      failures.push({
        id: randomUUID(),
        stage: "CTA",
        severity: "HIGH",
        failure: `Primary CTA text "${heroButton}" is uninformative and generic`,
        evidence: `CTA copy: "${heroButton}"`,
        affectedElement: "hero.button",
        suggestedFix: "Replace generic copy with action-oriented text tailored to the business outcome",
        blocking: true,
        field: "hero.button",
        ruleCode: "CTA_GENERIC_TEXT",
      });
    }
  }

  // 3. CTA Action Destination Validation
  if (heroAction) {
    const actionType = String(heroAction.type || "").toLowerCase();
    const actionTarget = String(heroAction.target || "").trim();

    if (!actionTarget || actionTarget === "#" || actionTarget === "undefined") {
      failures.push({
        id: randomUUID(),
        stage: "CTA",
        severity: "CRITICAL",
        failure: "Primary CTA action points to an empty or placeholder target ('#')",
        evidence: `buttonAction.target: "${actionTarget}"`,
        affectedElement: "hero.buttonAction.target",
        suggestedFix: "Set action target to an existing section anchor (e.g. 'contact') or valid URL/phone",
        blocking: true,
        field: "hero.buttonAction.target",
        ruleCode: "CTA_BROKEN_DESTINATION",
      });
    } else {
      // Validate destination format based on action type
      if (actionType === "scroll") {
        // Target should be an existing section
        const sectionOrder = Array.isArray(data.sectionOrder) ? (data.sectionOrder as string[]) : [];
        const cleanTarget = actionTarget.replace(/^#/, "").toLowerCase();
        const hasSection =
          sectionOrder.map((s) => s.toLowerCase()).includes(cleanTarget) ||
          Boolean(data[cleanTarget]) ||
          ["contact", "services", "pricing", "products"].includes(cleanTarget);

        if (!hasSection) {
          failures.push({
            id: randomUUID(),
            stage: "CTA",
            severity: "HIGH",
            failure: `Scroll CTA points to non-existent section "#${cleanTarget}"`,
            evidence: `Target: "${actionTarget}", Available sections: ${sectionOrder.join(", ") || "none"}`,
            affectedElement: "hero.buttonAction.target",
            suggestedFix: `Update CTA target to scroll to an existing section (e.g. 'contact')`,
            blocking: true,
            field: "hero.buttonAction.target",
            ruleCode: "CTA_TARGET_SECTION_NOT_FOUND",
          });
        } else {
          evidence.push(`Scroll CTA correctly targets section "#${cleanTarget}"`);
        }
      } else if (actionType === "call") {
        if (!/^\+?[0-9\s\-().]{7,20}$/.test(actionTarget.replace(/^tel:/, ""))) {
          warnings.push({
            id: randomUUID(),
            stage: "CTA",
            severity: "MEDIUM",
            warning: `Call CTA target "${actionTarget}" does not appear to be a valid phone number`,
            affectedElement: "hero.buttonAction.target",
          });
        }
      } else if (actionType === "email") {
        if (!actionTarget.includes("@")) {
          warnings.push({
            id: randomUUID(),
            stage: "CTA",
            severity: "MEDIUM",
            warning: `Email CTA target "${actionTarget}" is missing '@'`,
            affectedElement: "hero.buttonAction.target",
          });
        }
      }
    }
  }

  // 4. Grounded Business Alignment
  if (context.groundedProfile) {
    const archetype = (context.groundedProfile.archetype || "").toLowerCase();
    const ctaLower = (heroButton || "").toLowerCase();


    // Check if industry has high-converting expected CTAs
    if (archetype.includes("restaurant") || archetype.includes("cafe")) {
      const foodCTAs = ["book", "table", "menu", "order", "call", "reserve", "visit"];
      if (!foodCTAs.some((c) => ctaLower.includes(c))) {
        warnings.push({
          id: randomUUID(),
          stage: "CTA",
          severity: "MEDIUM",
          warning: `CTA "${heroButton}" may not be optimal for a dining establishment (expected: Reserve Table, Order Online, View Menu)`,
          affectedElement: "hero.button",
        });
      }
    } else if (archetype.includes("car") || archetype.includes("rental")) {
      const rentalCTAs = ["book", "rent", "quote", "fleet", "reserve", "drive"];
      if (!rentalCTAs.some((c) => ctaLower.includes(c))) {
        warnings.push({
          id: randomUUID(),
          stage: "CTA",
          severity: "MEDIUM",
          warning: `CTA "${heroButton}" may not be optimal for a car rental business (expected: Book Now, Get Instant Quote, View Fleet)`,
          affectedElement: "hero.button",
        });
      }
    }
  }

  const hasBlocking = failures.some((f) => f.blocking);
  const status = hasBlocking ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";

  return {
    stage: "CTA",
    status,
    passed: !hasBlocking,
    score: hasBlocking ? 30 : Math.max(70, 100 - warnings.length * 10),
    failures,
    warnings,
    evidence,
    suggestedFix: failures[0]?.suggestedFix,
    durationMs: Date.now() - startTime,
  };
}
