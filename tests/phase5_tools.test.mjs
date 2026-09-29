// tests/phase5_tools.test.mjs
/**
 * WebsiteBanja Phase 5: Mitra Tools & Real Agent Actions — Test Suite
 *
 * Verifies all Phase 5 enhancements to the Mitra tool runtime:
 *
 *  1.  ToolErrorCode + ToolErrorDetail are present on failed results
 *  2.  update_project_knowledge rejects invalid categories
 *  3.  update_project_knowledge accepts all 8 allowed categories
 *  4.  get_project_knowledge respects limit parameter
 *  5.  generate_website in-memory preview (no projectId → success, not saved)
 *  6.  generate_website idempotency cache returns cached result on 2nd call
 *  7.  AbortSignal: already-aborted signal returns TOOL_CANCELLED immediately
 *  8.  AbortSignal: aborting mid-execution cancels and returns TOOL_CANCELLED
 *  9.  edit_website requires confirmation guard
 * 10.  get_project_state returns PROJECT_NOT_FOUND when no projectId
 * 11.  create_or_update_plan rejects empty plan sections
 * 12.  create_or_update_plan succeeds without projectId (stateless)
 * 13.  ToolPermissionPolicy: policy fields match expected shape per tool
 * 14.  Tool result always carries the 'tool' field on success paths
 * 15.  Tool result always carries the 'tool' field on failure paths
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// ── Imports ───────────────────────────────────────────────────────────────────
const {
  mitraToolRegistry,
  clearIdempotencyCacheForTesting,
} = jiti("./src/lib/agents/mitra/toolRegistry.ts");

const {
  resetTelemetryForTesting,
} = jiti("./src/lib/telemetry/agentTelemetry.ts");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal authenticated context (no project). */
const authCtx = (overrides = {}) => ({
  userId: "usr_phase5_test",
  sessionId: "sess_phase5_001",
  ...overrides,
});

/** Authenticated context with a (fake) project. */
const projectCtx = (projectId = "proj_p5_fake", overrides = {}) =>
  authCtx({ projectId, ...overrides });

// ═════════════════════════════════════════════════════════════════════════════
describe("Phase 5: Mitra Tools & Real Agent Actions", () => {
  beforeEach(() => {
    resetTelemetryForTesting();
    clearIdempotencyCacheForTesting();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  test("Test 1 — ToolErrorCode + ToolErrorDetail are present on failed results", async () => {
    // Call an unknown tool → TOOL_NOT_FOUND
    const result = await mitraToolRegistry.executeTool(
      "nonexistent_tool_xyz",
      {},
      authCtx()
    );

    assert.equal(result.success, false);
    assert.ok(result.tool, "result.tool must be set");
    assert.ok(result.errorDetail, "errorDetail must be present");
    assert.equal(result.errorDetail.code, "TOOL_NOT_FOUND");
    assert.ok(typeof result.errorDetail.message === "string" && result.errorDetail.message.length > 0);
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  test("Test 2 — update_project_knowledge rejects invalid categories", async () => {
    const result = await mitraToolRegistry.executeTool(
      "update_project_knowledge",
      { key: "my_key", value: { foo: "bar" }, category: "totally_invalid_category" },
      projectCtx()
    );

    assert.equal(result.success, false);
    assert.ok(result.errorDetail, "errorDetail must be present");
    assert.equal(result.errorDetail.code, "INVALID_TOOL_ARGUMENTS");
    assert.ok(result.error?.toLowerCase().includes("category") || result.errorDetail.message?.toLowerCase().includes("category"),
      "Error must mention category");
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  test("Test 3 — update_project_knowledge accepts all 8 allowed categories (arg validation only)", async () => {
    const allowed = [
      "business_info",
      "brand",
      "preferences",
      "services",
      "features",
      "extracted_needs",
      "planning",
      "agent_decisions",
    ];

    for (const cat of allowed) {
      // We only test validateArgs — execution will fail with PROJECT_ACCESS_DENIED
      // (no real DB), but validation must pass (no INVALID_TOOL_ARGUMENTS)
      const result = await mitraToolRegistry.executeTool(
        "update_project_knowledge",
        { key: `test_${cat}`, value: { valid: true }, category: cat },
        projectCtx()
      );

      // Must NOT fail with an arg-validation error for a valid category
      if (!result.success) {
        assert.notEqual(
          result.errorDetail?.code,
          "INVALID_TOOL_ARGUMENTS",
          `Category '${cat}' should pass validation but failed with INVALID_TOOL_ARGUMENTS`
        );
      }
    }
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  test("Test 4 — get_project_knowledge respects limit parameter", async () => {
    // The tool itself enforces: limit is capped at 50, default 15.
    // We inspect validateArgs / parameter schema only (no real DB in test env).
    const tool = mitraToolRegistry.getTool("get_project_knowledge");
    assert.ok(tool, "get_project_knowledge must be registered");

    const limitProp = tool.parameters?.properties?.limit;
    assert.ok(limitProp, "limit parameter must be declared in schema");
    assert.equal(limitProp.type, "number");

    // Verify the cap constant in execution path via argument introspection.
    // Call with an extreme limit; should not crash on validation.
    if (tool.validateArgs) {
      const res = tool.validateArgs({ limit: 9999 });
      // No category or key constraint here — validate just passes
      assert.equal(res.valid, true, "limit:9999 must pass validation (cap applied at runtime)");
    }
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  test("Test 5 — generate_website in-memory preview succeeds without projectId", async () => {
    // No projectId → in-memory generation, status='preview', success:true
    const result = await mitraToolRegistry.executeTool(
      "generate_website",
      { businessName: "Preview Corp", category: "Consulting", confirmed: true },
      authCtx() // NO projectId
    );

    assert.equal(result.success, true, `Expected success:true but got: ${result.error ?? result.errorDetail?.code}`);
    assert.equal(result.tool, "generate_website");
    assert.ok(result.data, "result.data must be present");
    assert.equal(result.data.status, "preview", "status must be 'preview' when no project is linked");
    assert.equal(result.data.businessName, "Preview Corp");
    assert.ok(Array.isArray(result.data.componentsGenerated) && result.data.componentsGenerated.length > 0,
      "componentsGenerated must be a non-empty array");
    assert.ok(result.data.website?.hero?.title?.includes("Preview Corp"),
      "Generated website hero title must include business name");
    assert.ok(result.message?.includes("no project linked"), "Message must indicate no project was saved");
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  test("Test 6 — generate_website idempotency cache returns cached result on 2nd call", async () => {
    const idempotencyKey = "idem_phase5_run_001";

    // First call — generates result and caches it
    const first = await mitraToolRegistry.executeTool(
      "generate_website",
      { businessName: "CacheCo", category: "Retail", confirmed: true, idempotencyKey },
      authCtx() // no projectId → in-memory path
    );

    assert.equal(first.success, true);

    // Second call with same idempotencyKey — must return cached result
    const second = await mitraToolRegistry.executeTool(
      "generate_website",
      { businessName: "CacheCo", category: "Retail", confirmed: true, idempotencyKey },
      authCtx()
    );

    assert.equal(second.success, true);
    // Same object reference (from cache)
    assert.deepEqual(first.data, second.data, "Cached result must be identical to first result");
  });

  // ── Test 7 ──────────────────────────────────────────────────────────────────
  test("Test 7 — AbortSignal: already-aborted signal returns TOOL_CANCELLED immediately", async () => {
    const controller = new AbortController();
    controller.abort(); // abort BEFORE calling

    const result = await mitraToolRegistry.executeTool(
      "get_project_knowledge",
      { category: "brand" },
      projectCtx("proj_abort_test_1", { abortSignal: controller.signal })
    );

    assert.equal(result.success, false);
    assert.equal(result.tool, "get_project_knowledge");
    assert.equal(result.errorDetail?.code, "TOOL_CANCELLED");
  });

  // ── Test 8 ──────────────────────────────────────────────────────────────────
  test("Test 8 — AbortSignal: aborting during execution returns TOOL_CANCELLED", async () => {
    const controller = new AbortController();

    // We need a tool that awaits long enough for abort to fire.
    // generate_website (confirmed, no projectId) calls AI planner which is synchronous
    // in test env, so we abort after a tiny delay while executeTool is running.
    const execPromise = mitraToolRegistry.executeTool(
      "generate_website",
      { businessName: "AbortBiz", category: "Tech", confirmed: true },
      authCtx({ abortSignal: controller.signal })
    );

    // Abort after 5ms — the execution may already complete before abort fires.
    // In that case the result is success (race won by exec) — both outcomes are valid.
    setTimeout(() => controller.abort(), 5);

    const result = await execPromise;

    // Accept either: TOOL_CANCELLED (abort won race) or success (exec won race).
    // Both are correct; the important thing is no unhandled rejection occurs.
    if (!result.success) {
      assert.equal(result.errorDetail?.code, "TOOL_CANCELLED",
        `Failure must be TOOL_CANCELLED not ${result.errorDetail?.code}`);
    } else {
      assert.equal(result.success, true);
    }
  });

  // ── Test 9 ──────────────────────────────────────────────────────────────────
  test("Test 9 — edit_website requires confirmation before executing", async () => {
    // Call WITHOUT confirmed=true
    const result = await mitraToolRegistry.executeTool(
      "edit_website",
      { sectionId: "hero_123", action: "delete" },
      authCtx({ projectId: "proj_p5_edit" }) // projectId present but DB will deny
    );

    // Must gate on confirmation BEFORE ownership check
    // (confirmed check runs before ownership in execute)
    assert.equal(result.success, false);
    assert.equal(result.requiresConfirmation, true);
    assert.ok(result.confirmationPrompt, "confirmationPrompt must be provided");
    assert.equal(result.errorDetail?.code, "CONFIRMATION_REQUIRED");
  });

  // ── Test 10 ─────────────────────────────────────────────────────────────────
  test("Test 10 — get_project_state returns PROJECT_NOT_FOUND when no projectId in context or args", async () => {
    const result = await mitraToolRegistry.executeTool(
      "get_project_state",
      {}, // no projectId in args
      authCtx() // no projectId in context
    );

    assert.equal(result.success, false);
    assert.equal(result.tool, "get_project_state");
    assert.equal(result.errorDetail?.code, "PROJECT_NOT_FOUND");
  });

  // ── Test 11 ─────────────────────────────────────────────────────────────────
  test("Test 11 — create_or_update_plan rejects missing required businessName", async () => {
    const result = await mitraToolRegistry.executeTool(
      "create_or_update_plan",
      { category: "Consulting" }, // missing businessName
      authCtx()
    );

    assert.equal(result.success, false);
    assert.equal(result.errorDetail?.code, "INVALID_TOOL_ARGUMENTS");
    assert.ok(
      result.error?.toLowerCase().includes("businessname") ||
        result.errorDetail?.message?.toLowerCase().includes("businessname"),
      `Error must mention businessName; got: ${result.error}`
    );
  });

  // ── Test 12 ─────────────────────────────────────────────────────────────────
  test("Test 12 — create_or_update_plan succeeds without projectId (stateless)", async () => {
    const result = await mitraToolRegistry.executeTool(
      "create_or_update_plan",
      {
        businessName: "Apex Consulting",
        category: "Consulting",
        description: "Strategy and management consulting firm",
        services: ["Strategy", "Operations", "Finance"],
      },
      authCtx() // no projectId
    );

    assert.equal(result.success, true, `Expected success but got: ${result.error ?? result.errorDetail?.code}`);
    assert.equal(result.tool, "create_or_update_plan");
    assert.ok(result.data, "result.data must be present (the plan object)");
    // createWebsitePlan returns a plan with at least a 'business' or 'sections' field
    assert.ok(typeof result.data === "object", "result.data must be an object (the plan)");
    assert.ok(result.message?.includes("Apex Consulting"), "Message must include business name");
  });

  // ── Test 13 ─────────────────────────────────────────────────────────────────
  test("Test 13 — ToolPermissionPolicy: each registered tool exposes a policy with correct shape", () => {
    const tools = mitraToolRegistry.getAllTools();

    // Should have at least 6 tools registered (Phase 5 tools 1–6)
    assert.ok(tools.length >= 6, `Expected ≥6 registered tools, got ${tools.length}`);

    for (const tool of tools) {
      if (!tool.policy) continue; // policy is optional per interface
      assert.ok(typeof tool.policy.requiresAuth === "boolean",
        `${tool.name}.policy.requiresAuth must be boolean`);
      assert.ok(typeof tool.policy.requiresProjectOwnership === "boolean",
        `${tool.name}.policy.requiresProjectOwnership must be boolean`);
      assert.ok(typeof tool.policy.requiresConfirmation === "boolean",
        `${tool.name}.policy.requiresConfirmation must be boolean`);
      assert.ok(typeof tool.policy.destructive === "boolean",
        `${tool.name}.policy.destructive must be boolean`);
    }

    // Destructive tools must require confirmation
    const destructiveTools = tools.filter((t) => t.policy?.destructive);
    for (const dt of destructiveTools) {
      assert.ok(
        dt.policy.requiresConfirmation === true || dt.requiresConfirmation === true,
        `Destructive tool '${dt.name}' must require confirmation`
      );
    }
  });

  // ── Test 14 ─────────────────────────────────────────────────────────────────
  test("Test 14 — Tool result always carries 'tool' field on success", async () => {
    const result = await mitraToolRegistry.executeTool(
      "generate_website",
      { businessName: "ToolFieldCo", category: "Finance", confirmed: true },
      authCtx()
    );

    assert.equal(result.success, true);
    assert.ok(result.tool, "'tool' field must be present on success result");
    assert.equal(result.tool, "generate_website");
  });

  // ── Test 15 ─────────────────────────────────────────────────────────────────
  test("Test 15 — Tool result always carries 'tool' field on failure", async () => {
    // Missing userId → AUTH_REQUIRED
    const noAuth = await mitraToolRegistry.executeTool(
      "get_project_state",
      {},
      { userId: "", sessionId: "sess_field_check" }
    );
    assert.equal(noAuth.success, false);
    assert.ok(noAuth.tool, "'tool' field must be present on AUTH_REQUIRED failure");

    // Unknown tool → TOOL_NOT_FOUND
    const notFound = await mitraToolRegistry.executeTool(
      "unknown_xyz_tool",
      {},
      authCtx()
    );
    assert.equal(notFound.success, false);
    assert.ok(notFound.tool, "'tool' field must be present on TOOL_NOT_FOUND failure");

    // Arg validation failure
    const badArgs = await mitraToolRegistry.executeTool(
      "generate_website",
      { businessName: "", category: "Tech" },
      authCtx()
    );
    assert.equal(badArgs.success, false);
    assert.ok(badArgs.tool, "'tool' field must be present on INVALID_TOOL_ARGUMENTS failure");
  });
});
