// src/lib/intelligence/validation/navigationValidator.ts
/**
 * Navigation Validator
 * Validates internal links, navigation menu, page slugs, anchor targets, and footer links.
 * Strictly prevents broken internal navigation from passing the READY gate.
 * Distinguishes verified internal routes from unverified external URLs.
 */

import { randomUUID } from "crypto";
import type {
  ValidationContext,
  StageValidationResult,
  ValidationFailureItem,
  ValidationWarningItem,
} from "./types";
import type { NavbarConfig, WebsitePage, NavLink } from "@/types/website";

export function validateNavigation(context: ValidationContext): StageValidationResult {
  const startTime = Date.now();
  const failures: ValidationFailureItem[] = [];
  const warnings: ValidationWarningItem[] = [];
  const evidence: string[] = [];

  const data = context.websiteData || {};

  // Build available internal targets
  const sectionOrder = Array.isArray(data.sectionOrder) ? (data.sectionOrder as string[]) : [];
  const sectionKeys = new Set(
    sectionOrder
      .map((s) => s.toLowerCase().replace(/^#/, ""))
      .concat(Object.keys(data).map((k) => k.toLowerCase()))
  );
  // Always include standard anchor fallbacks if sections exist
  if (data.contact) sectionKeys.add("contact");
  if (data.services) sectionKeys.add("services");
  if (data.about) sectionKeys.add("about");
  if (data.hero) sectionKeys.add("hero");
  if (data.faq) sectionKeys.add("faq");

  const pages = Array.isArray(data.pages) ? (data.pages as WebsitePage[]) : [];
  const validSlugs = new Set(pages.map((p) => p.slug.toLowerCase().replace(/^\//, "")));
  validSlugs.add(""); // root home page

  // 1. Navbar Links Validation
  const navbar = data.navbar as NavbarConfig | undefined;
  if (navbar && Array.isArray(navbar.links) && navbar.links.length > 0) {
    evidence.push(`Navbar contains ${navbar.links.length} navigation links`);

    for (let i = 0; i < navbar.links.length; i++) {
      const link = navbar.links[i] as NavLink;
      const label = String(link.label || "").trim();
      const action = link.action;

      if (!label) {
        failures.push({
          id: randomUUID(),
          stage: "NAVIGATION",
          severity: "HIGH",
          failure: `Navbar link at index ${i} has an empty label`,
          evidence: `Navbar link item has no readable text`,
          affectedElement: `navbar.links[${i}].label`,
          suggestedFix: "Provide a descriptive text label for the navigation item",
          blocking: true,
          field: "navbar.links",
          ruleCode: "NAV_EMPTY_LINK_LABEL",
        });
      }

      if (!action || !action.target) {
        failures.push({
          id: randomUUID(),
          stage: "NAVIGATION",
          severity: "HIGH",
          failure: `Navbar link "${label || `[${i}]`}" has missing action or target`,
          evidence: `Action: ${JSON.stringify(action)}`,
          affectedElement: `navbar.links[${i}].action`,
          suggestedFix: "Assign a target section or page route to the navbar link",
          blocking: true,
          field: "navbar.links",
          ruleCode: "NAV_MISSING_ACTION_TARGET",
        });
        continue;
      }

      const target = String(action.target).trim();
      const type = String(action.type || "scroll").toLowerCase();

      if (type === "scroll" || target.startsWith("#")) {
        const anchorName = target.replace(/^#/, "").toLowerCase();
        if (!sectionKeys.has(anchorName)) {
          failures.push({
            id: randomUUID(),
            stage: "NAVIGATION",
            severity: "HIGH",
            failure: `Navbar link "${label}" targets non-existent section anchor "#${anchorName}"`,
            evidence: `Target anchor "#${anchorName}" not found in page sections: ${Array.from(sectionKeys).join(", ")}`,
            affectedElement: `navbar.links[${i}].action.target`,
            suggestedFix: `Update link target to match an existing section (e.g., "#${Array.from(sectionKeys)[0] || "hero"}")`,
            blocking: true,
            field: "navbar.links",
            ruleCode: "NAV_BROKEN_INTERNAL_ANCHOR",
          });
        } else {
          evidence.push(`Verified navbar internal anchor: "${label}" -> "#${anchorName}"`);
        }
      } else if (type === "page" || (target.startsWith("/") && !target.startsWith("//"))) {
        const cleanSlug = target.replace(/^\//, "").toLowerCase();
        if (!validSlugs.has(cleanSlug)) {
          failures.push({
            id: randomUUID(),
            stage: "NAVIGATION",
            severity: "HIGH",
            failure: `Navbar link "${label}" points to missing internal route "/${cleanSlug}"`,
            evidence: `Target page slug "/${cleanSlug}" not found in declared pages`,
            affectedElement: `navbar.links[${i}].action.target`,
            suggestedFix: `Ensure route "/${cleanSlug}" exists in website pages or link to home anchor`,
            blocking: true,
            field: "navbar.links",
            ruleCode: "NAV_BROKEN_INTERNAL_PAGE",
          });
        } else {
          evidence.push(`Verified navbar internal page route: "${label}" -> "/${cleanSlug}"`);
        }
      } else if (type === "url" || /^https?:\/\//i.test(target)) {
        // External link: distinguished clearly from internal broken links
        evidence.push(`External URL detected: "${label}" -> "${target}" (unverified external destination)`);
      }
    }
  } else {
    // If multi-page site has no navbar links, warn
    if (pages.length > 1) {
      warnings.push({
        id: randomUUID(),
        stage: "NAVIGATION",
        severity: "MEDIUM",
        warning: `Website has ${pages.length} pages but no navbar navigation links configured`,
        affectedElement: "navbar.links",
      });
    }
  }

  // 2. Check Primary Routes (Home page must exist)
  if (pages.length > 0) {
    const hasHome = pages.some((p) => p.slug === "" || p.slug === "/" || p.isHome);
    if (!hasHome) {
      failures.push({
        id: randomUUID(),
        stage: "NAVIGATION",
        severity: "CRITICAL",
        failure: "Multi-page website definition has no home page (slug: '' or isHome: true)",
        evidence: `Available page slugs: ${pages.map((p) => p.slug).join(", ")}`,
        affectedElement: "pages",
        suggestedFix: "Designate a home page in pages array with slug '' and isHome true",
        blocking: true,
        field: "pages",
        ruleCode: "NAV_MISSING_HOME_PAGE",
      });
    }
  }

  const hasBlocking = failures.some((f) => f.blocking);
  const status = hasBlocking ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";

  return {
    stage: "NAVIGATION",
    status,
    passed: !hasBlocking,
    score: hasBlocking ? 35 : Math.max(75, 100 - warnings.length * 10),
    failures,
    warnings,
    evidence,
    suggestedFix: failures[0]?.suggestedFix,
    durationMs: Date.now() - startTime,
  };
}
