import assert from "node:assert/strict";
import {
  auditKnowledgeStaleness,
  auditKnowledgeStalenessSync,
  checkCategoryParity,
  checkComponentParity,
  checkActionParity,
  checkBackendParity,
  canonicalJsonStringify,
  computeSha256,
  computeEntryChecksum,
  EXPECTED_INDUSTRY_KEYS,
  EXPECTED_WEBSITE_SECTIONS,
  SUPPORTED_BUTTON_ACTIONS,
  SUPPORTED_BACKEND_REQUIREMENTS,
} from "../src/knowledge/staleness/audit";
import { getGlobalKnowledgeRegistry } from "../src/knowledge/global/index";
import { CATEGORY_MAP } from "../src/lib/categoryImages";
import type {
  GlobalKnowledgeEntry,
  WebsiteTypePayload,
  ComponentDefinitionPayload,
  IntegrationPayload,
  GenerationRulePayload,
  BackendCapabilityPayload,
} from "../src/knowledge/global/types";

console.log("================================================================================");
console.log("ADVERSARIAL CHALLENGE SUITE: STALENESS & SCHEMA DRIFT ENGINE");
console.log("================================================================================\n");

async function runAdversarialChallenges() {
  let passedCount = 0;
  let totalCount = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    totalCount++;
    try {
      fn();
      console.log(`  ✔ [PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(err);
      throw err;
    }
  }

  async function testAsync(name: string, fn: () => Promise<void>) {
    totalCount++;
    try {
      await fn();
      console.log(`  ✔ [PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(err);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. BASELINE EMPIRICAL EXECUTION
  // ---------------------------------------------------------------------------
  console.log("[Suite 1] Live Global Knowledge Base Baseline Audit");

  await testAsync("auditKnowledgeStaleness() returns healthy report with 38 entries and 0 issues", async () => {
    const report = await auditKnowledgeStaleness();
    assert.equal(report.healthy, true, "Report must be healthy");
    assert.equal(report.staleCount, 0, "Stale count must be 0");
    assert.equal(report.totalEntries, 38, "Total entries audited must be exactly 38");
    assert.equal(report.issues.length, 0, "Issues array must be empty");
    assert.equal(Object.keys(report.entryHashes).length, 38, "All 38 entries must have computed hashes");
  });

  await testAsync("All 4 parity checks pass on the canonical registry", async () => {
    const report = await auditKnowledgeStaleness();
    const pc = report.parityChecks;

    // 1. Category Parity
    assert.equal(pc.categoryParity.passed, true, "Category parity must pass");
    assert.equal(pc.categoryParity.auditedCount, 15, "Must audit 15 industries");
    assert.equal(pc.categoryParity.expectedCount, 15, "Expected count must be 15");

    // 2. Component Parity
    assert.equal(pc.componentParity.passed, true, "Component parity must pass");
    assert.equal(pc.componentParity.auditedCount, 9, "Must audit 9 canonical sections");
    assert.equal(pc.componentParity.expectedCount, 9, "Expected count must be 9");

    // 3. Action Parity
    assert.equal(pc.actionParity.passed, true, "Action parity must pass");
    assert.ok(pc.actionParity.auditedCount > 0, "Must audit actions across rules/integrations/components");

    // 4. Backend Parity
    assert.equal(pc.backendParity.passed, true, "Backend parity must pass");
    assert.equal(pc.backendParity.expectedCount, 4, "Must expect 4 backend requirements");
  });

  // ---------------------------------------------------------------------------
  // 2. DRIFT SENSITIVITY: CATEGORY PARITY
  // ---------------------------------------------------------------------------
  console.log("\n[Suite 2] Category Parity Drift Sensitivity");

  test("Detects unknown / unmapped category in CATEGORY_MAP (Code Drift)", () => {
    const fakeCategoryMap = {
      ...CATEGORY_MAP,
      "unmapped_crypto_casino": { label: "Crypto Casino", images: [] },
    };
    const websiteTypes = getGlobalKnowledgeRegistry({ category: "website_types" }) as GlobalKnowledgeEntry<WebsiteTypePayload>[];
    const result = checkCategoryParity(websiteTypes, fakeCategoryMap);

    assert.equal(result.passed, false, "Category parity should fail with unmapped code category");
    const driftIssue = result.issues.find((i) => i.code === "SCHEMA_DRIFT" && i.message.includes("unmapped_crypto_casino"));
    assert.ok(driftIssue, "Must flag SCHEMA_DRIFT for unmapped_crypto_casino");
    assert.equal(driftIssue?.severity, "high");
  });

  test("Detects missing category when CATEGORY_MAP lacks an entry present in KB (Code Desync)", () => {
    const truncatedMap = { ...CATEGORY_MAP };
    delete (truncatedMap as any)["cafe"];

    const websiteTypes = getGlobalKnowledgeRegistry({ category: "website_types" }) as GlobalKnowledgeEntry<WebsiteTypePayload>[];
    const result = checkCategoryParity(websiteTypes, truncatedMap);

    assert.equal(result.passed, false, "Category parity should fail when CATEGORY_MAP is missing 'cafe'");
    const missingIssue = result.issues.find((i) => i.code === "MISSING_CODE_PARITY" && i.message.includes("cafe"));
    assert.ok(missingIssue, "Must flag MISSING_CODE_PARITY for cafe");
    assert.equal(missingIssue?.severity, "high");
  });

  test("Detects discrepancy when website_types has fewer or more than 15 entries", () => {
    const websiteTypes = (getGlobalKnowledgeRegistry({ category: "website_types" }) as GlobalKnowledgeEntry<WebsiteTypePayload>[]).slice(0, 14);
    const result = checkCategoryParity(websiteTypes, CATEGORY_MAP);

    assert.equal(result.passed, false, "Must fail if count != 15");
    const countIssue = result.issues.find((i) => i.code === "SCHEMA_DRIFT" && i.message.includes("Expected exactly 15"));
    assert.ok(countIssue, "Must flag SCHEMA_DRIFT count mismatch");
  });

  // ---------------------------------------------------------------------------
  // 3. DRIFT SENSITIVITY: COMPONENT PARITY
  // ---------------------------------------------------------------------------
  console.log("\n[Suite 3] Component Parity Drift Sensitivity");

  test("Detects when a canonical section is missing from KB components", () => {
    const components = getGlobalKnowledgeRegistry({ category: "components" }) as GlobalKnowledgeEntry<ComponentDefinitionPayload>[];
    const extendedExpectedSections = [...EXPECTED_WEBSITE_SECTIONS, "ai_live_concierge_widget"];

    const result = checkComponentParity(components, extendedExpectedSections);
    assert.equal(result.passed, false, "Component parity must fail for unregistered section");
    const issue = result.issues.find((i) => i.code === "MISSING_CODE_PARITY" && i.message.includes("ai_live_concierge_widget"));
    assert.ok(issue, "Must flag MISSING_CODE_PARITY for ai_live_concierge_widget");
    assert.equal(issue?.severity, "high");
  });

  test("Detects invalid component definition: missing componentKey", () => {
    const invalidComp: GlobalKnowledgeEntry<ComponentDefinitionPayload> = {
      metadata: {
        id: "wb:global:components:corrupt_comp",
        category: "components",
        title: "Corrupt Component",
        description: "Testing drift",
        version: "1.0.0",
        status: "active",
        source: "core",
        schemaVersion: "1.0.0",
        updatedAt: new Date().toISOString(),
      },
      data: {
        componentKey: "" as any,
        displayName: "Corrupt",
        description: "Corrupt component for test",
        allowedElementTypes: ["heading"],
        requiredFields: [],
        optionalFields: [],
        supportsButtonAction: false,
        supportsImageFallback: false,
        defaultData: {},
      },
    };

    const result = checkComponentParity([invalidComp], ["corrupt_comp"]);
    assert.equal(result.passed, false);
    const issue = result.issues.find((i) => i.code === "SCHEMA_DRIFT" && i.message.includes("missing a componentKey"));
    assert.ok(issue, "Must flag SCHEMA_DRIFT for missing componentKey");
  });

  test("Detects invalid component definition: empty allowedElementTypes", () => {
    const invalidComp: GlobalKnowledgeEntry<ComponentDefinitionPayload> = {
      metadata: {
        id: "wb:global:components:empty_elements",
        category: "components",
        title: "Empty Elements Component",
        description: "Testing drift",
        version: "1.0.0",
        status: "active",
        source: "core",
        schemaVersion: "1.0.0",
        updatedAt: new Date().toISOString(),
      },
      data: {
        componentKey: "empty_elements",
        displayName: "Empty Elements",
        description: "Empty elements component for test",
        allowedElementTypes: [],
        requiredFields: [],
        optionalFields: [],
        supportsButtonAction: false,
        supportsImageFallback: false,
        defaultData: {},
      },
    };

    const result = checkComponentParity([invalidComp], ["empty_elements"]);
    assert.equal(result.passed, false);
    const issue = result.issues.find((i) => i.code === "SCHEMA_DRIFT" && i.message.includes("defines no allowedElementTypes"));
    assert.ok(issue, "Must flag SCHEMA_DRIFT medium severity for empty allowedElementTypes");
    assert.equal(issue?.severity, "medium");
  });

  // ---------------------------------------------------------------------------
  // 4. DRIFT SENSITIVITY: ACTION PARITY
  // ---------------------------------------------------------------------------
  console.log("\n[Suite 4] Action Parity Drift Sensitivity");

  test("Detects unsupported button action in integrations", () => {
    const bogusIntegration: GlobalKnowledgeEntry<IntegrationPayload> = {
      metadata: {
        id: "wb:global:integrations:bogus",
        category: "integrations",
        title: "Bogus Integration",
        description: "Test",
        version: "1.0.0",
        status: "active",
        source: "core",
        schemaVersion: "1.0.0",
        updatedAt: new Date().toISOString(),
      },
      data: {
        integrationKey: "bogus",
        name: "Bogus",
        description: "Test bogus integration",
        configurationRequirements: [],
        supportedActions: ["quantum_teleport" as any],
        isProOnly: false,
      },
    };

    const result = checkActionParity([], [bogusIntegration], []);
    assert.equal(result.passed, false, "Action parity must fail for quantum_teleport");
    const issue = result.issues.find((i) => i.code === "SCHEMA_DRIFT" && i.message.includes("quantum_teleport"));
    assert.ok(issue, "Must flag unsupported ButtonActionType");
    assert.equal(issue?.severity, "high");
  });

  test("Detects unsupported button action in generation rules", () => {
    const bogusRule: GlobalKnowledgeEntry<GenerationRulePayload> = {
      metadata: {
        id: "wb:global:generation_rules:bogus_actions",
        category: "generation_rules",
        title: "Bogus Actions Rule",
        description: "Test",
        version: "1.0.0",
        status: "active",
        source: "core",
        schemaVersion: "1.0.0",
        updatedAt: new Date().toISOString(),
      },
      data: {
        ruleKey: "bogus",
        title: "Bogus",
        description: "Test rule",
        priority: "mandatory",
        allowedButtonActions: ["launch_missile" as any],
      },
    };

    const result = checkActionParity([bogusRule as any], [], []);
    assert.equal(result.passed, false, "Action parity must fail for launch_missile");
    const issue = result.issues.find((i) => i.code === "SCHEMA_DRIFT" && i.message.includes("launch_missile"));
    assert.ok(issue, "Must flag unsupported action in generation rules");
  });

  // ---------------------------------------------------------------------------
  // 5. DRIFT SENSITIVITY: BACKEND PARITY
  // ---------------------------------------------------------------------------
  console.log("\n[Suite 5] Backend Parity Drift Sensitivity");

  test("Detects unknown backend requirement archetype in backend_capabilities", () => {
    const bogusBackend: GlobalKnowledgeEntry<BackendCapabilityPayload> = {
      metadata: {
        id: "wb:global:backend_capabilities:blockchain",
        category: "backend_capabilities",
        title: "Blockchain Backend",
        description: "Test",
        version: "1.0.0",
        status: "active",
        source: "core",
        schemaVersion: "1.0.0",
        updatedAt: new Date().toISOString(),
      },
      data: {
        requirementType: "blockchain_ledger" as any,
        title: "Blockchain",
        description: "Test",
        applicableCategories: [],
        capabilities: [],
        options: {
          managed: { title: "Managed", description: "M", features: [] },
          custom: { title: "Custom", description: "C", features: [] },
        },
      },
    };

    const websiteTypes = getGlobalKnowledgeRegistry({ category: "website_types" }) as GlobalKnowledgeEntry<WebsiteTypePayload>[];
    const result = checkBackendParity([bogusBackend], websiteTypes);
    assert.equal(result.passed, false, "Backend parity must fail for blockchain_ledger");
    const issue = result.issues.find((i) => i.code === "SCHEMA_DRIFT" && i.message.includes("blockchain_ledger"));
    assert.ok(issue, "Must flag unsupported BackendRequirement archetype");
  });

  test("Detects missing canonical BackendRequirement in backend_capabilities", () => {
    // Only supply 3 requirements, missing 'managed_orders'
    const partialBackends = (getGlobalKnowledgeRegistry({ category: "backend_capabilities" }) as GlobalKnowledgeEntry<BackendCapabilityPayload>[])
      .filter((e) => e.data.requirementType !== "managed_orders");
    const websiteTypes = getGlobalKnowledgeRegistry({ category: "website_types" }) as GlobalKnowledgeEntry<WebsiteTypePayload>[];

    const result = checkBackendParity(partialBackends, websiteTypes);
    assert.equal(result.passed, false, "Backend parity must fail when missing managed_orders");
    const issue = result.issues.find((i) => i.code === "MISSING_CODE_PARITY" && i.message.includes("managed_orders"));
    assert.ok(issue, "Must flag missing managed_orders backend capability");
  });

  test("Detects invalid defaultBackendRequirement on website_types entry", () => {
    const bogusWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
      metadata: {
        id: "wb:global:website_types:alien_mart",
        category: "website_types",
        title: "Alien Mart",
        description: "Test",
        version: "1.0.0",
        status: "active",
        source: "core",
        schemaVersion: "1.0.0",
        updatedAt: new Date().toISOString(),
      },
      data: {
        key: "alien_mart",
        displayName: "Alien Mart",
        industryKeywords: ["alien"],
        recommendedSections: ["hero"],
        defaultServices: [],
        defaultStyle: "clean",
        defaultPrimaryColor: "#000",
        defaultSecondaryColor: "#fff",
        hasCatalog: false,
        catalogLabel: "Catalog",
        defaultBackendRequirement: "telepathic_network" as any,
        targetAudienceArchetypes: [],
      },
    };

    const backends = getGlobalKnowledgeRegistry({ category: "backend_capabilities" }) as GlobalKnowledgeEntry<BackendCapabilityPayload>[];
    const result = checkBackendParity(backends, [bogusWebsiteType]);
    assert.equal(result.passed, false, "Backend parity must fail for invalid defaultBackendRequirement");
    const issue = result.issues.find((i) => i.code === "SCHEMA_DRIFT" && i.message.includes("telepathic_network"));
    assert.ok(issue, "Must flag unrecognized defaultBackendRequirement");
  });

  // ---------------------------------------------------------------------------
  // 6. HASHING SENSITIVITY: SHA-256 CANONICAL HASHING
  // ---------------------------------------------------------------------------
  console.log("\n[Suite 6] Cryptographic Hashing Sensitivity & Tamper Detection");

  test("SHA-256 canonical hashing is key-order independent (deterministic)", () => {
    const obj1 = { z: 100, a: "hello", m: [1, 2, 3], nested: { y: "world", b: 42 } };
    const obj2 = { nested: { b: 42, y: "world" }, a: "hello", m: [1, 2, 3], z: 100 };

    const json1 = canonicalJsonStringify(obj1);
    const json2 = canonicalJsonStringify(obj2);

    assert.equal(json1, json2, "Canonical string representations must be identical regardless of key order");
    assert.equal(computeSha256(json1), computeSha256(json2), "Computed hashes must match perfectly");
  });

  test("SHA-256 canonical hashing detects any value change (high sensitivity)", () => {
    const baseObj = { title: "Hero Component", allowedElementTypes: ["heading", "subheading"] };
    const tamperedObj = { title: "Hero Component", allowedElementTypes: ["heading", "subheading", "injected_tag"] };

    const hash1 = computeSha256(canonicalJsonStringify(baseObj));
    const hash2 = computeSha256(canonicalJsonStringify(tamperedObj));

    assert.notEqual(hash1, hash2, "Payload change must yield distinct SHA-256 hash");
  });

  test("auditKnowledgeStalenessSync detects unrecorded payload modification (HASH_MISMATCH)", () => {
    const allEntries = getGlobalKnowledgeRegistry({ status: "all" });
    const originalEntry = allEntries[0];
    const correctHash = computeEntryChecksum(originalEntry);

    // Entry with recorded checksum matching correctHash
    const lockedEntry: GlobalKnowledgeEntry = {
      ...originalEntry,
      metadata: {
        ...originalEntry.metadata,
        checksum: correctHash,
      },
    };

    // Verify unmodified entry produces zero issues
    const cleanReport = auditKnowledgeStalenessSync({ entries: [lockedEntry] });
    const cleanMismatch = cleanReport.issues.find((i) => i.code === "HASH_MISMATCH");
    assert.equal(cleanMismatch, undefined, "Clean entry must not produce HASH_MISMATCH");

    // Now tamper with the payload data while keeping original recorded checksum
    const tamperedEntry: GlobalKnowledgeEntry = {
      ...lockedEntry,
      data: {
        ...(lockedEntry.data as any),
        unauthorizedInjectedField: "attacker_payload",
      },
    };

    const tamperedReport = auditKnowledgeStalenessSync({ entries: [tamperedEntry] });
    const mismatchIssue = tamperedReport.issues.find((i) => i.code === "HASH_MISMATCH");

    assert.ok(mismatchIssue, "Audit must detect payload tampering via HASH_MISMATCH");
    assert.equal(mismatchIssue?.severity, "high", "HASH_MISMATCH must be high severity");
    assert.equal(tamperedReport.healthy, false, "Report must be unhealthy on HASH_MISMATCH");
    assert.ok(mismatchIssue?.message.includes("Data was modified without updating metadata checksum"));
  });

  // ---------------------------------------------------------------------------
  // 7. LIFECYCLE, TTL & SEMVER SENSITIVITY
  // ---------------------------------------------------------------------------
  console.log("\n[Suite 7] Lifecycle Staleness, TTL & SemVer Auditing");

  test("Detects expired deprecated entry exceeding 60-day grace period (EXPIRED_TTL)", () => {
    const seventyDaysAgo = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString();
    const expiredEntry: GlobalKnowledgeEntry = {
      metadata: {
        id: "wb:global:integrations:legacy_v1",
        category: "integrations",
        title: "Legacy Integration",
        description: "Deprecated test",
        version: "1.0.0",
        status: "deprecated",
        source: "core",
        schemaVersion: "1.0.0",
        updatedAt: seventyDaysAgo,
        supersededBy: "wb:global:integrations:modern_v2",
      },
      data: { integrationKey: "legacy" },
    };

    const report = auditKnowledgeStalenessSync({ entries: [expiredEntry] });
    const ttlIssue = report.issues.find((i) => i.code === "EXPIRED_TTL");
    assert.ok(ttlIssue, "Must flag EXPIRED_TTL for entry deprecated >60 days");
    assert.equal(ttlIssue?.severity, "low");
  });

  test("Detects deprecated entry missing supersededBy pointer", () => {
    const recentDate = new Date().toISOString();
    const deprecatedWithoutPointer: GlobalKnowledgeEntry = {
      metadata: {
        id: "wb:global:integrations:abandoned",
        category: "integrations",
        title: "Abandoned Integration",
        description: "Missing pointer test",
        version: "1.0.0",
        status: "deprecated",
        source: "core",
        schemaVersion: "1.0.0",
        updatedAt: recentDate,
      },
      data: { integrationKey: "abandoned" },
    };

    const report = auditKnowledgeStalenessSync({ entries: [deprecatedWithoutPointer] });
    const pointerIssue = report.issues.find((i) => i.code === "SCHEMA_DRIFT" && i.message.includes("supersededBy"));
    assert.ok(pointerIssue, "Must flag missing supersededBy pointer");
  });

  test("Detects invalid SemVer format on knowledge metadata", () => {
    const badSemverEntry: GlobalKnowledgeEntry = {
      metadata: {
        id: "wb:global:integrations:bad_version",
        category: "integrations",
        title: "Bad Version",
        description: "Test",
        version: "v2-final-beta" as any, // Non-standard SemVer
        status: "active",
        source: "core",
        schemaVersion: "1.0.0",
        updatedAt: new Date().toISOString(),
      },
      data: { integrationKey: "bad_version" },
    };

    const report = auditKnowledgeStalenessSync({ entries: [badSemverEntry] });
    const versionIssue = report.issues.find((i) => i.code === "SCHEMA_DRIFT" && i.message.includes("invalid SemVer version"));
    assert.ok(versionIssue, "Must flag invalid SemVer version");
    assert.equal(versionIssue?.severity, "medium");
  });

  console.log("\n================================================================================");
  console.log(`ALL ${passedCount} OF ${totalCount} ADVERSARIAL CHALLENGES PASSED EMPIRICALLY!`);
  console.log("================================================================================\n");
}

runAdversarialChallenges().catch((err) => {
  console.error("Adversarial test suite encountered an unexpected failure:", err);
  process.exit(1);
});
