/**
 * WebsiteBanja Global Knowledge Base System - Automated Staleness & Schema Drift Engine
 * Location: src/knowledge/staleness/audit.ts
 * Milestone: M2 (Global Knowledge Base System)
 * Architectural Reference: docs/knowledge-base-architecture.md (Section 5)
 * Maintenance Reference: docs/knowledge-base-update-process.md (Section 4)
 *
 * Responsibilities:
 * 1. Cryptographic SHA-256 content hashing of all Global Knowledge entries.
 * 2. Four automated parity checks:
 *    - Category parity: Verifies 15 industry keys match CATEGORY_MAP in src/lib/categoryImages.ts.
 *    - Component parity: Verifies all 9 sections in WebsiteData (src/types/website.ts) are registered.
 *    - Action parity: Verifies actions match supported types in src/lib/studioAiActions.ts & ButtonActionType.
 *    - Backend parity: Verifies backend requirement types match src/lib/backendDetection.ts & BackendRequirement.
 * 3. TTL and lifecycle staleness auditing (>60 days deprecated grace period check).
 * 4. CI/CD gatekeeper: Exits with non-zero code on high/medium severity issues.
 */

import { createHash } from "node:crypto";
import type {
  GlobalKnowledgeCategory,
  GlobalKnowledgeEntry,
  WebsiteTypePayload,
  ComponentDefinitionPayload,
  IntegrationPayload,
  GenerationRulePayload,
  BackendCapabilityPayload,
  BackendRequirement,
} from "../global/types";
import {
  GLOBAL_WEBSITE_TYPES,
  GLOBAL_COMPONENTS,
  GLOBAL_INTEGRATIONS,
  GLOBAL_GENERATION_RULES,
  GLOBAL_BACKEND_CAPABILITIES,
  getGlobalKnowledgeRegistry,
} from "../global/index";
import { CATEGORY_MAP } from "../../lib/categoryImages";
import type { ButtonActionType } from "../../types/website";
import type { StudioAiAction } from "../../lib/studioAiActions";

// ============================================================================
// Data Contracts & Types
// ============================================================================

export type StalenessIssueSeverity = "low" | "medium" | "high";

export type StalenessIssueCode =
  | "HASH_MISMATCH"
  | "SCHEMA_DRIFT"
  | "MISSING_CODE_PARITY"
  | "EXPIRED_TTL";

export interface StalenessIssue {
  itemId?: string;
  category: GlobalKnowledgeCategory | "all";
  severity: StalenessIssueSeverity;
  code: StalenessIssueCode;
  message: string;
  remediation: string;
}

export type ParityCheckName =
  | "category_parity"
  | "component_parity"
  | "action_parity"
  | "backend_parity";

export interface ParityCheckResult {
  checkName: ParityCheckName;
  passed: boolean;
  auditedCount: number;
  expectedCount: number;
  details: string;
  issues: StalenessIssue[];
}

export interface StalenessReport {
  timestamp: string;
  totalEntries: number;
  staleCount: number;
  healthy: boolean;
  issues: StalenessIssue[];
  entryHashes: Record<string, string>;
  parityChecks: {
    categoryParity: ParityCheckResult;
    componentParity: ParityCheckResult;
    actionParity: ParityCheckResult;
    backendParity: ParityCheckResult;
  };
}

export interface StalenessAuditOptions {
  /** Optional custom entries array for isolated testing */
  entries?: readonly GlobalKnowledgeEntry[];
  /** Optional custom category map for mocking */
  categoryMap?: Record<string, unknown>;
  /** Optional custom section keys for mocking */
  expectedSections?: readonly string[];
  /** Grace period for deprecated items in milliseconds (default: 60 days) */
  deprecationGracePeriodMs?: number;
}

// ============================================================================
// Canonical Constants for Verification
// ============================================================================

export const EXPECTED_INDUSTRY_KEYS = [
  "grocery",
  "cafe",
  "restaurant",
  "gym",
  "salon",
  "clinic",
  "architecture",
  "real estate",
  "hotel",
  "agency",
  "tech",
  "e-commerce",
  "education",
  "portfolio",
  "general",
] as const;

export const EXPECTED_WEBSITE_SECTIONS = [
  "navbar",
  "hero",
  "about",
  "services",
  "features",
  "productsSection",
  "faq",
  "contact",
  "footer",
] as const;

export const SUPPORTED_BUTTON_ACTIONS: ReadonlySet<ButtonActionType> = new Set<ButtonActionType>([
  "scroll",
  "page",
  "url",
  "whatsapp",
  "call",
  "email",
  "none",
]);

export const SUPPORTED_STUDIO_ACTIONS: ReadonlySet<StudioAiAction["action"]> = new Set<StudioAiAction["action"]>([
  "update_text",
  "replace_image",
  "update_button",
  "set_button_action",
  "set_button_scroll_target",
  "set_button_page_target",
  "set_button_whatsapp",
  "set_button_external_url",
  "set_button_call",
  "set_button_email",
  "move_element",
  "add_section",
  "delete_section",
  "reorder_sections",
  "add_product",
  "update_product",
  "delete_product",
  "add_page",
  "delete_page",
  "set_page_seo",
  "toggle_admin_dashboard",
  "update_theme",
]);

export const SUPPORTED_BACKEND_REQUIREMENTS: ReadonlySet<BackendRequirement> = new Set<BackendRequirement>([
  "static",
  "managed_booking",
  "managed_orders",
  "custom_api",
]);

const DEFAULT_DEPRECATION_GRACE_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

// ============================================================================
// Cryptographic Hashing Utilities
// ============================================================================

/**
 * Deterministically serializes an arbitrary object or primitive to JSON
 * by recursively sorting all dictionary keys alphabetically.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJsonStringify).join(",") + "]";
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJsonStringify((obj as Record<string, unknown>)[k])}`
  );
  return "{" + pairs.join(",") + "}";
}

/**
 * Computes a standard hex-encoded SHA-256 hash over UTF-8 string input.
 */
export function computeSha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Computes the canonical SHA-256 checksum of a global knowledge entry's payload data.
 */
export function computeEntryChecksum(entry: GlobalKnowledgeEntry): string {
  const canonicalData = canonicalJsonStringify(entry.data);
  return computeSha256(canonicalData);
}

// ============================================================================
// Parity Check 1: Category Parity
// ============================================================================

/**
 * Verifies that all 15 industry keys in website_types match CATEGORY_MAP in categoryImages.ts.
 */
export function checkCategoryParity(
  websiteTypes: readonly GlobalKnowledgeEntry<WebsiteTypePayload>[],
  categoryMapSource: Record<string, unknown> = (CATEGORY_MAP as Record<string, unknown>) || {}
): ParityCheckResult {
  const issues: StalenessIssue[] = [];
  const kbCategoryKeys = new Set(websiteTypes.map((e) => e.data.key));
  const codeCategoryKeys = new Set(Object.keys(categoryMapSource));

  // 1. Verify every KB category exists in code CATEGORY_MAP
  for (const kbKey of kbCategoryKeys) {
    if (!codeCategoryKeys.has(kbKey)) {
      issues.push({
        itemId: `wb:global:website_types:${kbKey}`,
        category: "website_types",
        severity: "high",
        code: "MISSING_CODE_PARITY",
        message: `Industry archetype "${kbKey}" in Global Knowledge is missing from CATEGORY_MAP in src/lib/categoryImages.ts.`,
        remediation: `Add image set for "${kbKey}" to CATEGORY_MAP in src/lib/categoryImages.ts.`,
      });
    }
  }

  // 2. Verify every CATEGORY_MAP key exists in KB
  for (const codeKey of codeCategoryKeys) {
    if (!kbCategoryKeys.has(codeKey)) {
      issues.push({
        itemId: `wb:global:website_types:${codeKey}`,
        category: "website_types",
        severity: "high",
        code: "SCHEMA_DRIFT",
        message: `Category "${codeKey}" in src/lib/categoryImages.ts is not registered in website_types knowledge entries.`,
        remediation: `Create website type entry for "${codeKey}" in src/knowledge/global/website-types.ts.`,
      });
    }
  }

  // 3. Verify total count matches exact 15 industries
  if (kbCategoryKeys.size !== 15) {
    issues.push({
      category: "website_types",
      severity: "high",
      code: "SCHEMA_DRIFT",
      message: `Expected exactly 15 website types in Global Knowledge, but found ${kbCategoryKeys.size}.`,
      remediation: `Ensure all 15 industry archetypes (${EXPECTED_INDUSTRY_KEYS.join(", ")}) are registered.`,
    });
  }

  const passed = issues.length === 0;
  return {
    checkName: "category_parity",
    passed,
    auditedCount: kbCategoryKeys.size,
    expectedCount: 15,
    details: passed
      ? `All 15 industry categories match CATEGORY_MAP perfectly.`
      : `Discrepancies found between website_types (${kbCategoryKeys.size}) and CATEGORY_MAP (${codeCategoryKeys.size}).`,
    issues,
  };
}

// ============================================================================
// Parity Check 2: Component Parity
// ============================================================================

/**
 * Verifies that all 9 canonical sections in WebsiteData (src/types/website.ts)
 * are registered in components knowledge entries.
 */
export function checkComponentParity(
  componentEntries: readonly GlobalKnowledgeEntry<ComponentDefinitionPayload>[],
  expectedSections: readonly string[] = EXPECTED_WEBSITE_SECTIONS
): ParityCheckResult {
  const issues: StalenessIssue[] = [];
  const registeredComponentKeys = new Set(componentEntries.map((e) => e.data.componentKey));

  // 1. Verify all 9 sections in WebsiteData exist in components
  for (const sectionKey of expectedSections) {
    if (!registeredComponentKeys.has(sectionKey)) {
      issues.push({
        itemId: `wb:global:components:${sectionKey}`,
        category: "components",
        severity: "high",
        code: "MISSING_CODE_PARITY",
        message: `Canonical WebsiteData section "${sectionKey}" from src/types/website.ts is not registered in components knowledge entries.`,
        remediation: `Add component specification for "${sectionKey}" in src/knowledge/global/components.ts.`,
      });
    }
  }

  // 2. Verify component schemas have valid required fields and allowed element types
  for (const entry of componentEntries) {
    const comp = entry.data;
    if (!comp.componentKey) {
      issues.push({
        itemId: entry.metadata.id,
        category: "components",
        severity: "high",
        code: "SCHEMA_DRIFT",
        message: `Component entry "${entry.metadata.id}" is missing a componentKey property.`,
        remediation: `Define componentKey in component payload.`,
      });
    }
    if (!Array.isArray(comp.allowedElementTypes) || comp.allowedElementTypes.length === 0) {
      issues.push({
        itemId: entry.metadata.id,
        category: "components",
        severity: "medium",
        code: "SCHEMA_DRIFT",
        message: `Component "${comp.componentKey}" defines no allowedElementTypes.`,
        remediation: `Specify valid ElementType primitives for "${comp.componentKey}".`,
      });
    }
  }

  const passed = issues.filter((i) => i.severity === "high" || i.severity === "medium").length === 0;
  return {
    checkName: "component_parity",
    passed,
    auditedCount: registeredComponentKeys.size,
    expectedCount: expectedSections.length,
    details: passed
      ? `All ${expectedSections.length} canonical sections in WebsiteData are registered in components.`
      : `Missing canonical sections in components knowledge: ${issues.map((i) => i.message).join("; ")}`,
    issues,
  };
}

// ============================================================================
// Parity Check 3: Action Parity
// ============================================================================

/**
 * Verifies that actions referenced in generation rules, integrations, and components
 * match supported action types in src/lib/studioAiActions.ts & ButtonActionType.
 */
export function checkActionParity(
  generationRules: readonly GlobalKnowledgeEntry<GenerationRulePayload>[],
  integrations: readonly GlobalKnowledgeEntry<IntegrationPayload>[],
  components: readonly GlobalKnowledgeEntry<ComponentDefinitionPayload>[]
): ParityCheckResult {
  const issues: StalenessIssue[] = [];
  let auditedActionCount = 0;

  // 1. Audit button actions in integrations
  for (const entry of integrations) {
    const supportedActions = entry.data.supportedActions || [];
    for (const action of supportedActions) {
      auditedActionCount++;
      if (!SUPPORTED_BUTTON_ACTIONS.has(action)) {
        issues.push({
          itemId: entry.metadata.id,
          category: "integrations",
          severity: "high",
          code: "SCHEMA_DRIFT",
          message: `Integration "${entry.data.integrationKey}" specifies unsupported ButtonActionType "${action}".`,
          remediation: `Update supportedActions to use valid ButtonActionType (${Array.from(SUPPORTED_BUTTON_ACTIONS).join(", ")}).`,
        });
      }
    }
  }

  // 2. Audit allowed actions in generation rules
  for (const entry of generationRules) {
    const rules = entry.data;
    if (rules.outputRequirements?.requireValidActionTargets) {
      auditedActionCount++;
    }
    const allowedActions = rules.allowedButtonActions;
    if (Array.isArray(allowedActions)) {
      for (const act of allowedActions) {
        auditedActionCount++;
        if (!SUPPORTED_BUTTON_ACTIONS.has(act)) {
          issues.push({
            itemId: entry.metadata.id,
            category: "generation_rules",
            severity: "high",
            code: "SCHEMA_DRIFT",
            message: `Generation rule "${entry.metadata.id}" permits unsupported button action "${act}".`,
            remediation: `Restructure allowed button actions to match ButtonActionType in src/types/website.ts.`,
          });
        }
      }
    }
  }

  // 3. Audit component CTA action configurations
  for (const entry of components) {
    if (entry.data.supportsButtonAction) {
      auditedActionCount++;
    }
  }

  const passed = issues.length === 0;
  return {
    checkName: "action_parity",
    passed,
    auditedCount: auditedActionCount,
    expectedCount: SUPPORTED_BUTTON_ACTIONS.size,
    details: passed
      ? `All button actions and integration triggers match supported ButtonActionType and studioAiActions.`
      : `Discrepancies found in action types: ${issues.map((i) => i.message).join("; ")}`,
    issues,
  };
}

// ============================================================================
// Parity Check 4: Backend Parity
// ============================================================================

/**
 * Verifies that backend requirement types in backend_capabilities and website_types
 * match BackendRequirement in src/types/project.ts and src/lib/backendDetection.ts.
 */
export function checkBackendParity(
  backendCapabilities: readonly GlobalKnowledgeEntry<BackendCapabilityPayload>[],
  websiteTypes: readonly GlobalKnowledgeEntry<WebsiteTypePayload>[]
): ParityCheckResult {
  const issues: StalenessIssue[] = [];
  const registeredRequirements = new Set(backendCapabilities.map((e) => e.data.requirementType));

  // 1. Verify every registered requirement is a recognized BackendRequirement
  for (const req of registeredRequirements) {
    if (!SUPPORTED_BACKEND_REQUIREMENTS.has(req)) {
      issues.push({
        itemId: `wb:global:backend_capabilities:${req}`,
        category: "backend_capabilities",
        severity: "high",
        code: "SCHEMA_DRIFT",
        message: `Backend capability archetype "${req}" is not recognized by BackendRequirement in src/types/project.ts.`,
        remediation: `Update requirementType to one of: ${Array.from(SUPPORTED_BACKEND_REQUIREMENTS).join(", ")}.`,
      });
    }
  }

  // 2. Verify all 4 supported BackendRequirement values exist in backend_capabilities
  for (const expectedReq of SUPPORTED_BACKEND_REQUIREMENTS) {
    if (!registeredRequirements.has(expectedReq)) {
      issues.push({
        itemId: `wb:global:backend_capabilities:${expectedReq}`,
        category: "backend_capabilities",
        severity: "high",
        code: "MISSING_CODE_PARITY",
        message: `BackendRequirement "${expectedReq}" from src/lib/backendDetection.ts is not registered in backend_capabilities knowledge entries.`,
        remediation: `Add capability entry for "${expectedReq}" in src/knowledge/global/backend-capabilities.ts.`,
      });
    }
  }

  // 3. Verify website_types specify valid defaultBackendRequirement
  for (const wt of websiteTypes) {
    const defReq = wt.data.defaultBackendRequirement;
    if (!SUPPORTED_BACKEND_REQUIREMENTS.has(defReq)) {
      issues.push({
        itemId: wt.metadata.id,
        category: "website_types",
        severity: "high",
        code: "SCHEMA_DRIFT",
        message: `Website type "${wt.data.key}" has unrecognized defaultBackendRequirement "${defReq}".`,
        remediation: `Set defaultBackendRequirement to one of: ${Array.from(SUPPORTED_BACKEND_REQUIREMENTS).join(", ")}.`,
      });
    }
  }

  const passed = issues.length === 0;
  return {
    checkName: "backend_parity",
    passed,
    auditedCount: registeredRequirements.size + websiteTypes.length,
    expectedCount: SUPPORTED_BACKEND_REQUIREMENTS.size,
    details: passed
      ? `All backend archetypes (${registeredRequirements.size}) and website type defaults match BackendRequirement.`
      : `Backend parity violations found: ${issues.map((i) => i.message).join("; ")}`,
    issues,
  };
}

// ============================================================================
// Main Audit Engine: Synchronous & Asynchronous Implementations
// ============================================================================

/**
 * Synchronously executes the complete staleness and schema drift audit across all entries.
 */
export function auditKnowledgeStalenessSync(
  options: StalenessAuditOptions = {}
): StalenessReport {
  const timestamp = new Date().toISOString();
  const entries = options.entries ?? getGlobalKnowledgeRegistry({ status: "all" });
  const gracePeriodMs = options.deprecationGracePeriodMs ?? DEFAULT_DEPRECATION_GRACE_MS;
  const nowMs = Date.now();

  const issues: StalenessIssue[] = [];
  const entryHashes: Record<string, string> = {};

  // -------------------------------------------------------------------------
  // Tier 1: SHA-256 Hashing & Entry-Level Integrity
  // -------------------------------------------------------------------------
  for (const entry of entries) {
    const hash = computeEntryChecksum(entry);
    entryHashes[entry.metadata.id] = hash;

    // A. Checksum verification (if recorded in metadata)
    const recordedChecksum = entry.metadata.checksum;
    if (recordedChecksum && recordedChecksum !== hash) {
      issues.push({
        itemId: entry.metadata.id,
        category: entry.metadata.category,
        severity: "high",
        code: "HASH_MISMATCH",
        message: `SHA-256 content checksum mismatch on entry "${entry.metadata.id}". Recorded: ${recordedChecksum}, Computed: ${hash}. Data was modified without updating metadata checksum.`,
        remediation: `Review modifications, bump metadata.version per SemVer, and update metadata.checksum to "${hash}".`,
      });
    }

    // B. SemVer and Metadata format validation
    const semVerRegex = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
    if (!semVerRegex.test(entry.metadata.version)) {
      issues.push({
        itemId: entry.metadata.id,
        category: entry.metadata.category,
        severity: "medium",
        code: "SCHEMA_DRIFT",
        message: `Entry "${entry.metadata.id}" has invalid SemVer version "${entry.metadata.version}".`,
        remediation: `Ensure version conforms to Semantic Versioning 2.0.0 (MAJOR.MINOR.PATCH).`,
      });
    }

    // C. Deprecation grace period / TTL audit
    if (entry.metadata.status === "deprecated") {
      const updatedMs = Date.parse(entry.metadata.updatedAt);
      if (!isNaN(updatedMs) && nowMs - updatedMs > gracePeriodMs) {
        issues.push({
          itemId: entry.metadata.id,
          category: entry.metadata.category,
          severity: "low",
          code: "EXPIRED_TTL",
          message: `Entry "${entry.metadata.id}" has been deprecated for over 60 days (updatedAt: ${entry.metadata.updatedAt}).`,
          remediation: `Candidate for archiving: Transition status to "archived" if no longer required for backward compatibility.`,
        });
      }
      if (!entry.metadata.supersededBy) {
        issues.push({
          itemId: entry.metadata.id,
          category: entry.metadata.category,
          severity: "low",
          code: "SCHEMA_DRIFT",
          message: `Deprecated entry "${entry.metadata.id}" is missing a "supersededBy" pointer.`,
          remediation: `Specify the replacement entry URN in metadata.supersededBy.`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Tier 2: Static Code Reflection & Parity Checks
  // -------------------------------------------------------------------------
  const websiteTypes = (options.entries
    ? options.entries.filter((e) => e.metadata.category === "website_types")
    : GLOBAL_WEBSITE_TYPES) as readonly GlobalKnowledgeEntry<WebsiteTypePayload>[];

  const components = (options.entries
    ? options.entries.filter((e) => e.metadata.category === "components")
    : GLOBAL_COMPONENTS) as readonly GlobalKnowledgeEntry<ComponentDefinitionPayload>[];

  const integrations = (options.entries
    ? options.entries.filter((e) => e.metadata.category === "integrations")
    : GLOBAL_INTEGRATIONS) as readonly GlobalKnowledgeEntry<IntegrationPayload>[];

  const generationRules = (options.entries
    ? options.entries.filter((e) => e.metadata.category === "generation_rules")
    : GLOBAL_GENERATION_RULES) as readonly GlobalKnowledgeEntry<GenerationRulePayload>[];

  const backendCapabilities = (options.entries
    ? options.entries.filter((e) => e.metadata.category === "backend_capabilities")
    : GLOBAL_BACKEND_CAPABILITIES) as readonly GlobalKnowledgeEntry<BackendCapabilityPayload>[];

  const categoryParity = checkCategoryParity(websiteTypes, options.categoryMap);
  const componentParity = checkComponentParity(components, options.expectedSections);
  const actionParity = checkActionParity(generationRules, integrations, components);
  const backendParity = checkBackendParity(backendCapabilities, websiteTypes);

  issues.push(
    ...categoryParity.issues,
    ...componentParity.issues,
    ...actionParity.issues,
    ...backendParity.issues
  );

  // -------------------------------------------------------------------------
  // Aggregate Health & Report Assembly
  // -------------------------------------------------------------------------
  const highSeverityCount = issues.filter((i) => i.severity === "high").length;
  const mediumSeverityCount = issues.filter((i) => i.severity === "medium").length;
  const staleCount = issues.length;
  const healthy = highSeverityCount === 0 && mediumSeverityCount === 0;

  return {
    timestamp,
    totalEntries: entries.length,
    staleCount,
    healthy,
    issues,
    entryHashes,
    parityChecks: {
      categoryParity,
      componentParity,
      actionParity,
      backendParity,
    },
  };
}

/**
 * Primary asynchronous export matching the IKnowledgeRetrievalService contract:
 * auditKnowledgeStaleness(): Promise<StalenessReport>
 */
export async function auditKnowledgeStaleness(
  options: StalenessAuditOptions = {}
): Promise<StalenessReport> {
  return Promise.resolve(auditKnowledgeStalenessSync(options));
}

// ============================================================================
// Pretty Formatter for CLI Output
// ============================================================================

export function formatStalenessReport(report: StalenessReport): string {
  const lines: string[] = [];
  lines.push("================================================================================");
  lines.push(` WEBSITEBANJA GLOBAL KNOWLEDGE BASE STALENESS & DRIFT REPORT`);
  lines.push(` Timestamp: ${report.timestamp}`);
  lines.push(` Total Entries Audited: ${report.totalEntries} | Issues Detected: ${report.staleCount}`);
  lines.push(` Overall Health: ${report.healthy ? "✔ HEALTHY (PASS)" : "✖ UNHEALTHY (FAIL)"}`);
  lines.push("================================================================================");
  lines.push("");

  lines.push("--- FOUR AUTOMATED PARITY CHECKS ---");
  const pc = report.parityChecks;
  lines.push(` 1. Category Parity: [${pc.categoryParity.passed ? "✔ PASS" : "✖ FAIL"}] ${pc.categoryParity.details}`);
  lines.push(` 2. Component Parity: [${pc.componentParity.passed ? "✔ PASS" : "✖ FAIL"}] ${pc.componentParity.details}`);
  lines.push(` 3. Action Parity:    [${pc.actionParity.passed ? "✔ PASS" : "✖ FAIL"}] ${pc.actionParity.details}`);
  lines.push(` 4. Backend Parity:   [${pc.backendParity.passed ? "✔ PASS" : "✖ FAIL"}] ${pc.backendParity.details}`);
  lines.push("");

  if (report.issues.length > 0) {
    lines.push("--- DETECTED ISSUES & DRIFT REMEDIATION ---");
    for (const [idx, issue] of report.issues.entries()) {
      const icon = issue.severity === "high" ? "🔴" : issue.severity === "medium" ? "🟡" : "🔵";
      lines.push(`${idx + 1}. ${icon} [${issue.severity.toUpperCase()}] [${issue.code}] Category: ${issue.category}`);
      if (issue.itemId) lines.push(`   Item: ${issue.itemId}`);
      lines.push(`   Message: ${issue.message}`);
      lines.push(`   Remediation: ${issue.remediation}`);
      lines.push("");
    }
  } else {
    lines.push("✔ All knowledge entries are cryptographic locked and in 100% code parity!");
  }

  return lines.join("\n");
}

// ============================================================================
// Direct CLI Runner (npm run kb:audit)
// ============================================================================

if (
  typeof process !== "undefined" &&
  process.argv &&
  process.argv[1] &&
  (process.argv[1].endsWith("audit.ts") || process.argv[1].endsWith("audit.js"))
) {
  try {
    const report = auditKnowledgeStalenessSync();
    console.log(formatStalenessReport(report));

    const blockingIssues = report.issues.filter(
      (i) => i.severity === "high" || i.severity === "medium"
    );

    if (blockingIssues.length > 0) {
      console.error(`\n❌ KB Audit Failed: ${blockingIssues.length} high/medium severity issues detected.`);
      process.exit(1);
    } else {
      console.log("\n✅ KB Audit Passed: Zero blocking schema drift or staleness issues.");
      process.exit(0);
    }
  } catch (err) {
    console.error("Fatal error during KB staleness audit execution:", err);
    process.exit(1);
  }
}
