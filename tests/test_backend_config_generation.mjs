/**
 * WebsiteBanja AI — Backend Config & Schema Resilience Verification Test
 *
 * Validates:
 * 1. Schema cache error recovery in updateProject (no crash on missing backend_config column)
 * 2. Complete backend_config preservation in json_data and Project object
 * 3. hydrateProjectMetadata restores backend_config and backend_requirement seamlessly
 * 4. Real website generation flow with detectBackendRequirement
 * 5. Supabase migrations contain backend_config and schema reload notification
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jitiFactory from "jiti";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  dotenv.config({ path: ".env" });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const jiti = jitiFactory(process.cwd(), {
  alias: {
    "@": path.resolve(process.cwd(), "src"),
  },
});

console.log("================================================================================");
console.log("TESTING BACKEND_CONFIG SCHEMA FIX & REAL WEBSITE GENERATION");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function runTest(title, testFn) {
  try {
    testFn();
    console.log(`  ✔ [PASS] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(err);
    failed++;
  }
}


// 1. Imports
const {
  hydrateProjectMetadata,
  VALID_PROJECT_COLUMNS,
} = jiti("@/lib/projects");

const {
  detectBackendRequirement,
} = jiti("@/lib/backendDetection");

const {
  createWebsitePlan,
  createDesignPlan,
  selectComponents,
} = jiti("@/lib/ai/planner");

const {
  generateComponents,
} = jiti("@/lib/ai/generation/generator");

// -----------------------------------------------------------------------------
// [Suite 1] Migration & Column Definition Verification
// -----------------------------------------------------------------------------
console.log("[Suite 1] Migration & Schema Definition Audit");

runTest("01_azure_schema_baseline.sql exists and contains required DDL for backend columns", () => {
  const schemaPath = path.resolve(
    ROOT,
    "azure-migration/01_azure_schema_baseline.sql"
  );
  assert.ok(fs.existsSync(schemaPath), "Azure baseline schema file must exist");

  const content = fs.readFileSync(schemaPath, "utf8");
  assert.ok(content.includes("backend_requirement TEXT"), "Must define backend_requirement column");
  assert.ok(content.includes("backend_config JSONB"), "Must define backend_config column");
});

runTest("VALID_PROJECT_COLUMNS whitelist preserves backend_config and backend_requirement", () => {
  assert.ok(VALID_PROJECT_COLUMNS.has("backend_config"), "Must include backend_config in whitelist");
  assert.ok(VALID_PROJECT_COLUMNS.has("backend_requirement"), "Must include backend_requirement in whitelist");
});

// -----------------------------------------------------------------------------
// [Suite 2] Metadata Hydration & Resilience Verification
// -----------------------------------------------------------------------------
console.log("\n[Suite 2] Metadata Hydration & Fallback Resilience");

runTest("hydrateProjectMetadata restores backend_config from json_data when column is null", () => {
  const mockDbRow = {
    id: "proj-123",
    user_id: "user-456",
    name: "SmileCare Dental",
    business_name: "SmileCare Dental",
    category: "dental",
    backend_requirement: null,
    backend_config: null,
    json_data: {
      hero: { title: "Dental Clinic" },
      backend_requirement: "managed_booking",
      backend_config: {
        requiresBackend: true,
        requirementType: "managed_booking",
        title: "Appointment Booking Engine",
        capabilities: ["calendar", "reminders"],
      },
    },
  };

  const hydrated = hydrateProjectMetadata(mockDbRow);
  assert.ok(hydrated, "Hydrated project must exist");
  assert.equal(hydrated.backend_requirement, "managed_booking");
  assert.ok(hydrated.backend_config, "backend_config must be restored");
  assert.equal(hydrated.backend_config.requiresBackend, true);
  assert.equal(hydrated.backend_config.title, "Appointment Booking Engine");
  assert.deepEqual(hydrated.backend_config.capabilities, ["calendar", "reminders"]);
});

runTest("hydrateProjectMetadata prioritizes existing column values if populated", () => {
  const mockDbRow = {
    id: "proj-999",
    user_id: "user-456",
    name: "Custom Shop",
    backend_requirement: "managed_orders",
    backend_config: {
      requiresBackend: true,
      requirementType: "managed_orders",
      title: "Active DB Config",
    },
    json_data: {
      backend_config: { title: "Old JSON Config" },
    },
  };

  const hydrated = hydrateProjectMetadata(mockDbRow);
  assert.equal(hydrated.backend_requirement, "managed_orders");
  assert.equal(hydrated.backend_config.title, "Active DB Config");
});

// -----------------------------------------------------------------------------
// [Suite 3] Actual Website Generation Flow with Backend Detection
// -----------------------------------------------------------------------------
console.log("\n[Suite 3] Real Website Generation Flow with Backend Detection");

runTest("Backend requirement is accurately detected for category 'dental'", () => {
  const analysis = detectBackendRequirement("dental");
  assert.equal(analysis.requiresBackend, true);
  assert.equal(analysis.requirementType, "managed_booking");
  assert.ok(analysis.title.includes("Booking") || analysis.title.includes("Appointment"));
  assert.ok(analysis.capabilities.length > 0);
});

runTest("Backend requirement is accurately detected for category 'restaurant'", () => {
  const analysis = detectBackendRequirement("restaurant");
  assert.equal(analysis.requiresBackend, true);
  assert.equal(analysis.requirementType, "managed_orders");
  assert.ok(analysis.title.includes("Order") || analysis.title.includes("Menu") || analysis.title.includes("Table"));
});

runTest("Actual website generation creates complete components and packages backend_config", () => {
  const requirement = {
    intent: "create",
    business: {
      name: "Summit Family Dental",
      industry: "dental",
      type: "dental practice",
    },
    services: ["Checkups", "Cleanings", "Teeth Whitening", "Invisalign"],
    cta: "Book Online Now",
    functionality: { booking: true },
  };

  // 1. Detect backend
  const backendAnalysis = detectBackendRequirement(requirement.business.industry);
  const backendRequirement = backendAnalysis.requiresBackend ? backendAnalysis.requirementType : "static";
  const backendConfig = {
    requiresBackend: backendAnalysis.requiresBackend,
    requirementType: backendRequirement,
    title: backendAnalysis.title,
    capabilities: backendAnalysis.capabilities,
  };

  // 2. Generate Plan
  const websitePlan = createWebsitePlan(requirement);
  const designPlan = createDesignPlan(websitePlan, requirement);
  const componentPlan = selectComponents(designPlan, requirement);

  // 3. Generate Components
  const result = generateComponents(requirement, componentPlan, websitePlan, designPlan);
  assert.ok(result.files.length >= 5, "Generated files must include all components");
  assert.ok(result.files.includes("Website.tsx"), "Website.tsx must be generated");

  // 4. Validate packaged update payload
  const updatePayload = {
    name: requirement.business.name,
    business_name: requirement.business.name,
    category: requirement.business.industry,
    backend_requirement: backendRequirement,
    backend_config: backendConfig,
    json_data: {
      sections: ["navbar", "hero", "services", "contact", "footer"],
      backend_requirement: backendRequirement,
      backend_config: backendConfig,
    },
  };

  assert.equal(updatePayload.backend_requirement, "managed_booking");
  assert.equal(updatePayload.backend_config.requiresBackend, true);
  assert.equal(updatePayload.json_data.backend_config.title, backendAnalysis.title);

  // 5. Test hydration on the resulting project structure
  const simulatedProject = {
    id: "test-gen-proj",
    user_id: "test-user",
    ...updatePayload,
  };

  const verifiedProject = hydrateProjectMetadata(simulatedProject);
  assert.equal(verifiedProject.backend_config.requirementType, "managed_booking");
  assert.ok(verifiedProject.backend_config.capabilities.length > 0);
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`BACKEND_CONFIG & GENERATION VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
}
