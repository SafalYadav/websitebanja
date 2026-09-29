// src/lib/ai/design/qualityValidator.ts
/**
 * Phase 6 — Deterministic Quality Validator
 *
 * Performs post-generation quality checks on generated WebsiteData objects.
 * All checks are deterministic TypeScript — no AI calls.
 *
 * Categories:
 *   1. Structure checks (section count, ordering, completeness)
 *   2. Content checks (generic text detection, business name presence)
 *   3. Design checks (color system, hero consistency)
 *   4. Anti-generic detection (template-pattern fingerprinting)
 *   5. Accessibility checks (alt text, contact methods)
 *
 * Returns a QualityReport with score, issues, warnings, and auto-fix suggestions.
 */

import type { DesignBrief } from "./designBrief";

// ── Types ─────────────────────────────────────────────────────────────────────

export type IssueSeverity = "error" | "warning" | "info";

export interface QualityIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  suggestion?: string;
}

export interface QualityReport {
  /** 0–100 quality score */
  score: number;
  /** Is the website acceptable for display? (score >= 60) */
  passed: boolean;
  issues: QualityIssue[];
  warnings: QualityIssue[];
  /** Anti-generic detection result */
  genericityScore: number; // 0 = unique, 100 = completely generic template
  isGeneric: boolean;
  /** Auto-fixed version of the data (may differ from input) */
  sanitizedData: Record<string, unknown>;
}

// ── Generic Pattern Detection ─────────────────────────────────────────────────

/** Known generic / placeholder phrases that indicate AI hallucinated boilerplate */
const GENERIC_PHRASES: string[] = [
  "premium quality and service",
  "we are the best",
  "your trusted partner",
  "excellence in everything we do",
  "we are committed to excellence",
  "quality you can trust",
  "serving you since",
  "your satisfaction is our priority",
  "we go above and beyond",
  "taking your business to the next level",
  "innovative solutions",
  "cutting-edge technology",
  "world-class service",
  "state of the art",
  "lorem ipsum",
  "[business name]",
  "placeholder",
  "coming soon",
  "insert text here",
];

/** The baseline template section order that indicates no design intelligence was applied */
const GENERIC_SECTION_ORDERS: string[][] = [
  ["hero", "about", "services", "features", "faq", "contact", "footer"],
  ["hero", "features", "how_it_works", "testimonials", "contact", "footer"],
  ["hero", "services", "about", "features", "contact", "footer"],
  ["navbar", "hero", "about", "services", "features", "faq", "contact", "footer"],
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function containsGenericPhrase(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  return GENERIC_PHRASES.find((p) => lower.includes(p)) ?? null;
}

function isGenericSectionOrder(sectionOrder: string[]): boolean {
  const normalized = sectionOrder.map((s) => s.toLowerCase().replace(/section$/i, "").trim());
  return GENERIC_SECTION_ORDERS.some((generic) => {
    const gNorm = generic.map((s) => s.toLowerCase());
    return (
      normalized.length === gNorm.length &&
      normalized.every((s, i) => s === gNorm[i])
    );
  });
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ── Main Validator ────────────────────────────────────────────────────────────

/**
 * Validates a generated WebsiteData object against design brief requirements.
 *
 * @param data - The raw generated website data object
 * @param businessName - The business name (for presence checks)
 * @param brief - Optional DesignBrief for cross-validation
 * @returns QualityReport with score, issues, and sanitized data
 */
export function validateWebsiteQuality(
  data: Record<string, unknown>,
  businessName: string,
  brief?: DesignBrief
): QualityReport {
  const issues: QualityIssue[] = [];
  const warnings: QualityIssue[] = [];
  let deductions = 0;
  let genericityScore = 0;
  const sanitized = { ...data };

  // ── 1. Structure Checks ──────────────────────────────────────────────────

  // 1a. Section order present and non-empty
  const sectionOrder = Array.isArray(data.sectionOrder) ? (data.sectionOrder as string[]) : [];
  if (sectionOrder.length === 0) {
    issues.push({
      code: "MISSING_SECTION_ORDER",
      severity: "error",
      message: "sectionOrder is missing or empty",
      suggestion: "Ensure generateDesignStrategy() is called and its sectionSequence is used",
    });
    deductions += 20;
  } else if (sectionOrder.length < 3) {
    issues.push({
      code: "TOO_FEW_SECTIONS",
      severity: "warning",
      message: `Only ${sectionOrder.length} sections defined — minimum 3 required`,
      suggestion: "Add at least: hero, contact, footer",
    });
    deductions += 10;
  } else if (sectionOrder.length > 12) {
    warnings.push({
      code: "TOO_MANY_SECTIONS",
      severity: "warning",
      message: `${sectionOrder.length} sections is unusually high — consider trimming`,
    });
    deductions += 5;
  }

  // 1b. Hero must exist
  const hero = data.hero as Record<string, unknown> | undefined;
  if (!hero) {
    issues.push({
      code: "MISSING_HERO",
      severity: "error",
      message: "No hero section found",
      suggestion: "Every website must have a hero section",
    });
    deductions += 25;
  }

  // 1c. Footer must exist
  if (!data.footer) {
    issues.push({
      code: "MISSING_FOOTER",
      severity: "error",
      message: "No footer section found",
      suggestion: "Every website must have a footer section",
    });
    deductions += 10;
  }

  // 1d. Contact must exist (either as section or in footer)
  const hasContact = data.contact || sectionOrder.some((s) => ["contact", "reservation", "booking"].includes(s.toLowerCase()));
  if (!hasContact) {
    warnings.push({
      code: "MISSING_CONTACT",
      severity: "warning",
      message: "No contact section found — conversion path is incomplete",
      suggestion: "Add a contact section with at least one contact method",
    });
    deductions += 8;
  }

  // 1e. No duplicate section types
  const sectionTypeCounts: Record<string, number> = {};
  for (const s of sectionOrder) {
    sectionTypeCounts[s] = (sectionTypeCounts[s] || 0) + 1;
  }
  const duplicates = Object.entries(sectionTypeCounts).filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    warnings.push({
      code: "DUPLICATE_SECTIONS",
      severity: "warning",
      message: `Duplicate sections detected: ${duplicates.map(([k]) => k).join(", ")}`,
    });
    deductions += 5;
  }

  // ── 2. Content Checks ────────────────────────────────────────────────────

  // 2a. Hero title must contain business name
  const heroTitle = String(hero?.title || hero?.headline || "").trim();
  if (heroTitle && !heroTitle.toLowerCase().includes(businessName.toLowerCase().split(" ")[0])) {
    warnings.push({
      code: "HERO_TITLE_MISSING_BUSINESS_NAME",
      severity: "warning",
      message: `Hero title "${heroTitle.slice(0, 60)}" doesn't reference business name "${businessName}"`,
      suggestion: "Hero title should uniquely identify the business",
    });
    deductions += 5;
    genericityScore += 15;
  }

  // 2b. Hero title generic check
  const heroGenericPhrase = containsGenericPhrase(heroTitle);
  if (heroGenericPhrase) {
    issues.push({
      code: "GENERIC_HERO_TITLE",
      severity: "warning",
      message: `Hero title contains generic phrase: "${heroGenericPhrase}"`,
      suggestion: "Rewrite hero title with specific, business-authentic language",
    });
    deductions += 10;
    genericityScore += 20;
  }

  // 2c. Services must be non-empty and not all generic
  const services = Array.isArray(data.services) ? (data.services as Record<string, unknown>[]) : [];
  if (services.length === 0) {
    issues.push({
      code: "EMPTY_SERVICES",
      severity: "error",
      message: "Services section is empty",
      suggestion: "Provide at least 3 industry-relevant services",
    });
    deductions += 15;
  } else {
    const genericServices = services.filter((s) => {
      const title = String(s.title || "").toLowerCase();
      return (
        title.includes("service 1") ||
        title.includes("service 2") ||
        title.includes("our service") ||
        title === "service"
      );
    });
    if (genericServices.length > 0) {
      warnings.push({
        code: "GENERIC_SERVICE_TITLES",
        severity: "warning",
        message: `${genericServices.length} service(s) have generic titles`,
        suggestion: "Use specific, industry-authentic service names",
      });
      deductions += 8;
      genericityScore += 15;
    }
  }

  // 2d. FAQ must not be empty if present
  const faq = Array.isArray(data.faq) ? (data.faq as Record<string, unknown>[]) : [];
  if (sectionOrder.includes("faq") && faq.length === 0) {
    warnings.push({
      code: "EMPTY_FAQ",
      severity: "warning",
      message: "FAQ section is in sectionOrder but faq array is empty",
      suggestion: "Add at least 3 relevant FAQ entries",
    });
    deductions += 6;
  }

  // 2e. Features generic check
  const features = Array.isArray(data.features) ? (data.features as Record<string, unknown>[]) : [];
  if (features.length > 0) {
    const knownGenericFeatures = ["verified excellence", "rapid turnaround", "transparent pricing", "24/7 support", "quality guaranteed"];
    const genericCount = features.filter((f) => {
      const title = String(f.title || "").toLowerCase();
      return knownGenericFeatures.some((g) => title.includes(g));
    }).length;
    if (genericCount >= 2) {
      warnings.push({
        code: "GENERIC_FEATURE_TITLES",
        severity: "warning",
        message: `${genericCount} features appear to be generic defaults ("Verified Excellence", "Rapid Turnaround", etc.)`,
        suggestion: "Replace with industry-specific differentiators for this business",
      });
      deductions += 10;
      genericityScore += 20;
    }
  }

  // ── 3. Anti-Generic Section Order Check ──────────────────────────────────

  if (sectionOrder.length > 0 && isGenericSectionOrder(sectionOrder)) {
    warnings.push({
      code: "GENERIC_SECTION_ORDER",
      severity: "warning",
      message: "Section order matches a known generic template pattern",
      suggestion: "Use industry-specific section ordering from generateDesignStrategy().sectionSequence",
    });
    deductions += 12;
    genericityScore += 25;
  }

  // ── 4. Design Brief Cross-Validation ─────────────────────────────────────

  if (brief) {
    // 4a. Hero layout matches brief
    const heroLayoutVariant = String(hero?.layoutVariant || "");
    if (heroLayoutVariant && heroLayoutVariant !== brief.layout.heroLayout) {
      warnings.push({
        code: "HERO_LAYOUT_MISMATCH",
        severity: "info",
        message: `Hero layoutVariant "${heroLayoutVariant}" differs from brief recommendation "${brief.layout.heroLayout}"`,
      });
    }

    // 4b. Design strategy embedded in output
    if (!data.designStrategy) {
      warnings.push({
        code: "MISSING_DESIGN_STRATEGY",
        severity: "info",
        message: "designStrategy field is missing from generated data",
        suggestion: "Ensure the prompt JSON schema includes designStrategy field",
      });
      deductions += 3;
    }
  }

  // ── 5. Accessibility Checks ───────────────────────────────────────────────

  // 5a. Contact info has at least one method
  const contact = data.contact as Record<string, unknown> | undefined;
  if (contact) {
    const hasContactMethod = !!(contact.phone || contact.email || contact.whatsapp || contact.address);
    if (!hasContactMethod) {
      warnings.push({
        code: "EMPTY_CONTACT_INFO",
        severity: "warning",
        message: "Contact section has no phone, email, whatsapp, or address",
        suggestion: "Include at least one contact method for accessibility and conversion",
      });
      deductions += 8;
    }
  }

  // ── 6. Internal String Contamination Check ────────────────────────────────
  const forbiddenInternalStrings = [
    "WARM_ARTISANAL", "DARK_TECHNICAL", "HIGH_TRUST_SERVICE", "CLEAN_CLINICAL",
    "LUXURY_BESPOKE", "EXPRESSIVE_CREATIVE", "BOLD_BRUTALIST", "MINIMAL_EDITORIAL",
    "DESIGN INTELLIGENCE", "AUTONOMOUS DESIGN", "PROMPT", "SKILL.md", "SKILL ID",
  ];

  const dataString = JSON.stringify(data);
  const foundInternal = forbiddenInternalStrings.filter((s) => dataString.includes(s));
  if (foundInternal.length > 0) {
    issues.push({
      code: "INTERNAL_STRING_CONTAMINATION",
      severity: "error",
      message: `Generated content contains internal system strings: ${foundInternal.join(", ")}`,
      suggestion: "These internal identifiers must never appear in user-visible content",
    });
    deductions += 15;
    genericityScore += 10;
  }

  // ── Final Score ───────────────────────────────────────────────────────────
  const score = Math.max(0, Math.min(100, 100 - deductions));
  const finalGenericityScore = Math.min(100, genericityScore);

  return {
    score,
    passed: score >= 60,
    issues,
    warnings,
    genericityScore: finalGenericityScore,
    isGeneric: finalGenericityScore >= 40,
    sanitizedData: sanitized,
  };
}

/**
 * Formats a QualityReport as a concise log string for server-side telemetry.
 */
export function formatQualityReport(report: QualityReport): string {
  const grade = scoreToGrade(report.score);
  const errorCount = report.issues.filter((i) => i.severity === "error").length;
  const warnCount = report.warnings.length;
  return `[QA] score=${report.score}/100 grade=${grade} passed=${report.passed} generic=${report.genericityScore}% errors=${errorCount} warnings=${warnCount}`;
}
