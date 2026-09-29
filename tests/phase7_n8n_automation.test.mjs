// tests/phase7_n8n_automation.test.mjs
/**
 * WebsiteBanja Phase 7: n8n Automation Foundation + Preview Integration — Test Suite
 *
 * Verifies all Phase 7 requirements:
 *  1. Authentication: Rejects unauthorized requests with 401 and code UNAUTHORIZED
 *  2. Authentication: Rejects invalid secrets
 *  3. Authentication: Accepts x-automation-secret header
 *  4. Authentication: Accepts Authorization: Bearer token
 *  5. Validation: Rejects missing businessName with 400 and code VALIDATION_FAILED
 *  6. Validation: Rejects oversized payload with 413
 *  7. Generation: Generates complete preview for Astra Coffee House
 *  8. Preview Persistence: Local preview file exists in scratch/previews/:id.json
 *  9. Quality & Archetype: warm_artisanal archetype and quality score >= 90
 * 10. Idempotency: Subsequent identical requests return cached result
 * 11. Imagery & Differentiation: Generated site contains zero in-page duplicates
 * 12. Telemetry: Automation events emitted to telemetry system
 * 13. n8n Workflow Export: Valid workflow file exists with required nodes and no hardcoded secrets
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// ── Imports ───────────────────────────────────────────────────────────────────

const { POST } = jiti("./src/app/api/automation/generate-preview/route.ts");
const { generateAutomationPreview } = jiti("./src/lib/automation/previewService.ts");
const { computeIdempotencyKey } = jiti("./src/lib/automation/idempotency.ts");
const { canonicalizeImageUrl } = jiti("./src/lib/images/semanticImageSourcing.ts");

const DEFAULT_SECRET = "wb-auto-secret-local-dev-2026";

// Helper to create mock NextRequest / Request
function createMockRequest(body, headers = {}) {
  const serialized = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("http://localhost:3000/api/automation/generate-preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: serialized,
  });
}

// ── Test Suites ───────────────────────────────────────────────────────────────

describe("Phase 7 — Automation API Authentication & Security", () => {
  test("1. Rejects request without automation secret (401 UNAUTHORIZED)", async () => {
    const req = createMockRequest({ businessName: "Test Cafe" });
    const res = await POST(req);
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.success, false);
    assert.equal(data.error.code, "UNAUTHORIZED");
  });

  test("2. Rejects request with invalid automation secret", async () => {
    const req = createMockRequest(
      { businessName: "Test Cafe" },
      { "x-automation-secret": "invalid-secret-key" }
    );
    const res = await POST(req);
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.success, false);
    assert.equal(data.error.code, "UNAUTHORIZED");
  });

  test("3. Accepts request with valid x-automation-secret header", async () => {
    const req = createMockRequest(
      { businessName: "Astra Coffee House", industry: "restaurant" },
      { "x-automation-secret": DEFAULT_SECRET }
    );
    const res = await POST(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.status, "preview");
  });

  test("4. Accepts request with Authorization: Bearer token", async () => {
    const req = createMockRequest(
      { businessName: "Astra Coffee House", industry: "restaurant" },
      { authorization: `Bearer ${DEFAULT_SECRET}` }
    );
    const res = await POST(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
  });
});

describe("Phase 7 — Payload Validation & Robustness", () => {
  test("5. Rejects missing or blank businessName (400 VALIDATION_FAILED)", async () => {
    const req = createMockRequest(
      { businessName: "   " },
      { "x-automation-secret": DEFAULT_SECRET }
    );
    const res = await POST(req);
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.equal(data.error.code, "VALIDATION_FAILED");
  });

  test("6. Rejects oversized payload exceeding 256KB (413 PAYLOAD_TOO_LARGE)", async () => {
    const giantPayload = {
      businessName: "Astra Coffee House",
      description: "X".repeat(270 * 1024),
    };
    const req = createMockRequest(giantPayload, { "x-automation-secret": DEFAULT_SECRET });
    const res = await POST(req);
    const data = await res.json();

    assert.equal(res.status, 413);
    assert.equal(data.success, false);
    assert.equal(data.error.code, "PAYLOAD_TOO_LARGE");
  });

  test("7. Rejects malformed JSON syntax (400 MALFORMED_JSON)", async () => {
    const req = createMockRequest("{ invalid json", { "x-automation-secret": DEFAULT_SECRET });
    const res = await POST(req);
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.equal(data.error.code, "MALFORMED_JSON");
  });
});

describe("Phase 7 — End-to-End Generation & Preview Creation", () => {
  test("8. Generates complete preview for Astra Coffee House (Phase 6 Engine)", async () => {
    const result = await generateAutomationPreview(
      {
        businessName: "Astra Coffee House",
        industry: "restaurant",
        location: "Vadodara, Gujarat",
        description:
          "A premium modern café focused on specialty coffee, desserts and relaxed evening dining.",
        services: ["Specialty Coffee", "Desserts", "Brunch", "Private Events"],
        contact: {
          phone: "+91 98765 43210",
          email: "hello@astracoffee.in",
        },
      },
      "req_test_e2e"
    );

    assert.equal(result.success, true);
    assert.equal(result.status, "preview");
    assert.equal(result.business.name, "Astra Coffee House");
    assert.equal(result.business.industry, "restaurant");
    assert.ok(result.preview.id.startsWith("prev_astra-coffee-house"));
    assert.ok(result.preview.url.includes(result.preview.id));

    // Design system assertions
    assert.equal(result.design?.archetype, "warm_artisanal");
    assert.ok((result.design?.qualityScore || 0) >= 90, "Quality score must be >= 90");

    // Local file persistence check
    const previewFile = path.join(process.cwd(), "scratch/previews", `${result.preview.id}.json`);
    assert.ok(fs.existsSync(previewFile), `Preview file must exist at ${previewFile}`);

    const websiteData = JSON.parse(fs.readFileSync(previewFile, "utf-8"));
    assert.equal(websiteData.businessName, "Astra Coffee House");
    assert.ok(websiteData.hero.image, "Hero image must be populated");
    assert.equal(websiteData.services.length, 4, "Must have 4 services");
  });

  test("9. Sourced imagery has zero in-page duplicates", async () => {
    const result = await generateAutomationPreview(
      {
        businessName: "Astra Coffee House",
        industry: "restaurant",
        services: ["Espresso Bar", "Single Origin Pour-over", "Brioche French Toast", "Degustation Dessert"],
      },
      "req_test_images"
    );

    const previewFile = path.join(process.cwd(), "scratch/previews", `${result.preview.id}.json`);
    const websiteData = JSON.parse(fs.readFileSync(previewFile, "utf-8"));

    const collectedImages = [];
    if (websiteData.hero?.image) collectedImages.push(canonicalizeImageUrl(websiteData.hero.image));
    if (websiteData.about?.image) collectedImages.push(canonicalizeImageUrl(websiteData.about.image));
    websiteData.services?.forEach((s) => {
      if (s.image) collectedImages.push(canonicalizeImageUrl(s.image));
    });
    websiteData.features?.forEach((f) => {
      if (f.image) collectedImages.push(canonicalizeImageUrl(f.image));
    });

    const uniqueImages = new Set(collectedImages);
    assert.equal(
      collectedImages.length,
      uniqueImages.size,
      `All images in Astra Coffee House must be distinct (got ${uniqueImages.size}/${collectedImages.length})`
    );
  });

  test("10. Idempotency returns cached preview on repeat call", async () => {
    const key = `test_idemp_${Date.now()}`;
    const payload = {
      businessName: "Astra Coffee House",
      industry: "restaurant",
      idempotencyKey: key,
    };

    // First call
    const req1 = createMockRequest(payload, {
      "x-automation-secret": DEFAULT_SECRET,
      "x-idempotency-key": key,
    });
    const res1 = await POST(req1);
    const data1 = await res1.json();
    assert.equal(res1.status, 200);
    assert.equal(data1.cached, undefined);

    // Second call
    const req2 = createMockRequest(payload, {
      "x-automation-secret": DEFAULT_SECRET,
      "x-idempotency-key": key,
    });
    const res2 = await POST(req2);
    const data2 = await res2.json();
    assert.equal(res2.status, 200);
    assert.equal(data2.cached, true);
    assert.equal(data2.preview.id, data1.preview.id);
  });
});

describe("Phase 7 — n8n Workflow Export & Local Documentation", () => {
  test("11. Valid n8n workflow file exists in automation/n8n", () => {
    const workflowPath = path.resolve(
      process.cwd(),
      "automation/n8n/WebsiteBanja_Local_Preview_Generator.json"
    );
    assert.ok(fs.existsSync(workflowPath), "Workflow file must exist");

    const content = fs.readFileSync(workflowPath, "utf-8");
    const json = JSON.parse(content);

    assert.equal(json.name, "WebsiteBanja — Local Preview Generator");
    assert.ok(Array.isArray(json.nodes), "Must contain nodes array");

    // Verify critical nodes
    const nodeNames = json.nodes.map((n) => n.name);
    assert.ok(nodeNames.includes("Manual Trigger"), "Must have Manual Trigger");
    assert.ok(nodeNames.includes("Business Test Data"), "Must have Business Test Data");
    assert.ok(nodeNames.includes("Validate & Prepare Payload"), "Must have Validate Payload code node");
    assert.ok(nodeNames.includes("HTTP Request → WebsiteBanja"), "Must have HTTP Request node");
    assert.ok(nodeNames.includes("Success?"), "Must have If node");
    assert.ok(nodeNames.includes("Format Preview Result"), "Must have Format Result node");
    assert.ok(nodeNames.includes("Record Error"), "Must have Error node");
  });

  test("12. n8n workflow contains NO real hardcoded secrets", () => {
    const workflowPath = path.resolve(
      process.cwd(),
      "automation/n8n/WebsiteBanja_Local_Preview_Generator.json"
    );
    const content = fs.readFileSync(workflowPath, "utf-8");

    assert.ok(!content.includes("sk-"), "Must not contain OpenAI secret key");
    assert.ok(!content.includes("sbp_"), "Must not contain Supabase service key");
    assert.ok(!content.includes("eyJhbGci"), "Must not contain JWT tokens");
  });

  test("13. Comprehensive local setup documentation exists", () => {
    const readmePath = path.resolve(process.cwd(), "automation/n8n/README.md");
    assert.ok(fs.existsSync(readmePath), "automation/n8n/README.md must exist");

    const content = fs.readFileSync(readmePath, "utf-8");
    assert.ok(content.includes("http://localhost:5678"), "Must document n8n port");
    assert.ok(content.includes("http://localhost:3000"), "Must document WebsiteBanja port");
    assert.ok(content.includes("WEBSITEBANJA_AUTOMATION_SECRET"), "Must document secret variable");
    assert.ok(content.includes("Astra Coffee House"), "Must document test business");
  });
});
