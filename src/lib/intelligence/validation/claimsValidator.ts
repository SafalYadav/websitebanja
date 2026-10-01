// src/lib/intelligence/validation/claimsValidator.ts
/**
 * Claims Validator
 * Reuses Grounded Business Intelligence and the canonical Forbidden Claims Engine.
 * Scans generated content across all website sections for unsupported awards,
 * certifications, statistics, years of experience, guarantees, and fabricated claims.
 */

import { randomUUID } from "crypto";
import type {
  ValidationContext,
  StageValidationResult,
  ValidationFailureItem,
  ValidationWarningItem,
} from "./types";
import { compileForbiddenClaims } from "../grounding/forbiddenClaimsEngine";
import type { ForbiddenClaimItem } from "../grounding/types";

export function validateClaims(context: ValidationContext): StageValidationResult {
  const startTime = Date.now();
  const failures: ValidationFailureItem[] = [];
  const warnings: ValidationWarningItem[] = [];
  const evidence: string[] = [];

  const data = context.websiteData || {};
  const grounded = context.groundedProfile;
  const businessName =
    String(
      context.businessName ||
        grounded?.identity?.canonicalName ||
        data.businessName ||
        "Business"
    ).trim();

  // 1. Obtain Canonical Forbidden Claims from Grounded BI or compile fresh
  let forbiddenClaims: ForbiddenClaimItem[] = [];
  if (grounded && Array.isArray(grounded.forbiddenClaims) && grounded.forbiddenClaims.length > 0) {
    forbiddenClaims = grounded.forbiddenClaims;
    evidence.push(`Loaded ${forbiddenClaims.length} active forbidden claim rules from Grounded BI profile`);
  } else {
    forbiddenClaims = compileForbiddenClaims({
      businessName,
      verifiedServices: grounded?.services || [],
      evidenceList: grounded?.evidence || [],
      hasVerifiedYears: false,
      hasVerifiedCertifications: false,
      hasVerifiedAwards: false,
      hasVerifiedPricing: false,
      hasVerifiedGuarantees: false,
      hasVerifiedTestimonials: false,
    });
    evidence.push(`Compiled ${forbiddenClaims.length} canonical forbidden claim rules for "${businessName}"`);
  }


  // 2. Extract All Text Snippets from WebsiteData for Verification
  const textCorpus: Array<{ element: string; text: string }> = [];

  const addText = (element: string, val: unknown) => {
    if (typeof val === "string" && val.trim()) {
      textCorpus.push({ element, text: val.trim() });
    }
  };

  const hero = data.hero as Record<string, unknown> | undefined;
  if (hero) {
    addText("hero.title", hero.title || hero.headline);
    addText("hero.subtitle", hero.subtitle);
    if (Array.isArray(hero.badges)) {
      hero.badges.forEach((b, i) => addText(`hero.badges[${i}]`, b));
    }
    if (Array.isArray(hero.trustBadges)) {
      hero.trustBadges.forEach((b, i) => addText(`hero.trustBadges[${i}]`, b));
    }
  }

  const about = data.about as Record<string, unknown> | undefined;
  if (about) {
    addText("about.title", about.title);
    addText("about.content", about.content);
    if (Array.isArray(about.highlights)) {
      about.highlights.forEach((h, i) => addText(`about.highlights[${i}]`, h));
    }
  }

  if (Array.isArray(data.services)) {
    data.services.forEach((s: any, i) => {
      addText(`services[${i}].title`, s?.title || s?.name);
      addText(`services[${i}].description`, s?.description);
    });
  }

  if (Array.isArray(data.features)) {
    data.features.forEach((f: any, i) => {
      addText(`features[${i}].title`, f?.title);
      addText(`features[${i}].description`, f?.description);
    });
  }

  if (Array.isArray(data.faq)) {
    data.faq.forEach((faq: any, i) => {
      addText(`faq[${i}].question`, faq?.question);
      addText(`faq[${i}].answer`, faq?.answer);
    });
  }

  const footer = data.footer as Record<string, unknown> | undefined;
  if (footer) {
    addText("footer.copyright", footer.copyright);
  }

  // 3. Scan Corpus Against Claim Patterns
  const patterns: Array<{
    claimType: ForbiddenClaimItem["claimType"];
    regex: RegExp;
    severity: "CRITICAL" | "HIGH";
    failureDesc: string;
    fix: string;
  }> = [
    {
      claimType: "UNSUPPORTED_AWARD",
      regex: /\b(award[- ]winning|won\s+the\s+.*award|best\s+[\w\s]{3,20}\s+202\d|national\s+winner)\b/i,
      severity: "CRITICAL",
      failureDesc: "Generated text contains an unverified award or trophy claim",
      fix: "Remove unverified award superlatives unless official citation exists in Grounded BI evidence",
    },
    {
      claimType: "UNSUPPORTED_CERTIFICATION",
      regex: /\b(iso[- ]\d{4,5}|certified\s+by\s+the\s+board|fda\s+approved|accredited\s+by)\b/i,
      severity: "CRITICAL",
      failureDesc: "Generated text contains an unverified regulatory certification or licensing badge",
      fix: "Remove unverified regulatory certification claim",
    },
    {
      claimType: "FABRICATED_STATISTIC",
      regex: /\b(\d{1,3}(,\d{3})*\+\s*(happy|satisfied|active|total)?\s*(clients|customers|patients|users|members|projects|reviews)|(99(\.\d+)?%|100%)\s*(satisfaction|success\s*rate))\b/i,
      severity: "HIGH",
      failureDesc: "Generated text contains fabricated customer metrics or completion statistics",
      fix: "Replace fabricated quantitative counts with descriptive value propositions",
    },

    {
      claimType: "UNSUPPORTED_EXPERIENCE_YEARS",
      regex: /\b(\d{1,2}\+?\s*years\s+of\s+experience|serving\s+.*since\s+\d{4}|established\s+in\s+\d{4}|over\s+\d{1,2}\s*years)\b/i,
      severity: "HIGH",
      failureDesc: "Generated text claims specific operational longevity or founding year without proof",
      fix: "Remove unsupported years of experience or verify founding date in Grounded BI",
    },
    {
      claimType: "UNSUPPORTED_GUARANTEE",
      regex: /\b(100%\s*money[- ]back\s*guarantee|lifetime\s*warranty|guaranteed\s*lowest\s*prices?|risk[- ]free\s*guarantee)\b/i,
      severity: "CRITICAL",
      failureDesc: "Generated text includes a contractual guarantee without business backing",
      fix: "Remove contractual money-back or warranty guarantee unless documented in business terms",
    },
    {
      claimType: "FABRICATED_PARTNERSHIP",
      regex: /\b(official\s+partner\s+of\s+(google|microsoft|apple|amazon)|backed\s+by\s+(google|microsoft|amazon))\b/i,
      severity: "CRITICAL",
      failureDesc: "Generated text claims an unauthorized corporate partnership with a major tech brand",
      fix: "Remove unauthorized partner claims and enterprise logos",
    },
    {
      claimType: "UNSUPPORTED_RANKING",
      regex: /\b(#[1|one]\s+rated|voted\s+#1|number\s+one\s+in\s+the\s+city)\b/i,
      severity: "HIGH",
      failureDesc: "Generated text uses superlative '#1' or 'Top Rated' claims without ranking authority",
      fix: "Replace '#1' superlative with grounded descriptive quality statements",
    },
  ];

  for (const item of textCorpus) {
    for (const p of patterns) {
      const match = item.text.match(p.regex);
      if (match) {
        failures.push({
          id: randomUUID(),
          stage: "CLAIMS",
          severity: p.severity,
          failure: `${p.failureDesc}: "${match[0]}"`,
          evidence: `Found in ${item.element}: "${match[0]}" within text snippet "${item.text.slice(0, 100)}..."`,
          affectedElement: item.element,
          suggestedFix: p.fix,
          blocking: true,
          field: item.element,
          ruleCode: `CLM_${p.claimType}`,
        });
      }
    }
  }

  const hasBlocking = failures.some((f) => f.blocking);
  const status = hasBlocking ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";

  return {
    stage: "CLAIMS",
    status,
    passed: !hasBlocking,
    score: hasBlocking ? Math.max(0, 50 - failures.length * 20) : Math.max(80, 100 - warnings.length * 10),
    failures,
    warnings,
    evidence,
    suggestedFix: failures[0]?.suggestedFix,
    durationMs: Date.now() - startTime,
  };
}
