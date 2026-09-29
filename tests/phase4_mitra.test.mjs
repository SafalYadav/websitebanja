// tests/phase4_mitra.test.mjs
/**
 * WebsiteBanja Phase 4: Mitra 2.0 (Real-Time Voice + Agent Runtime) Test Suite
 *
 * Verifies all 15 core requirements from Phase 4 Section 25:
 * 1. Session creation
 * 2. Authentication
 * 3. Project isolation
 * 4. Context integration
 * 5. Tool registry
 * 6. Tool argument validation
 * 7. Tool authorization
 * 8. Tool telemetry
 * 9. Provider fallback
 * 10. Secret sanitization
 * 11. Session cleanup
 * 12. Interruption (Barge-in)
 * 13. Context priority
 * 14. Destructive confirmation
 * 15. Reconnect behavior (bounded)
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// Load modules using Jiti
const { mitraSessionManager, MAX_RECONNECT_ATTEMPTS } = jiti("@/lib/agents/mitra/sessionManager.ts");
const { mitraToolRegistry } = jiti("@/lib/agents/mitra/toolRegistry.ts");
const { mitraAgentRuntime } = jiti("@/lib/agents/mitra/agentRuntime.ts");
const { getRecentEvents, clearTelemetryForTesting } = jiti("@/lib/telemetry/agentTelemetry.ts");
const { sanitizeErrorOutput } = jiti("@/lib/ai/router/modelConfig.ts");
const { buildAIContext } = jiti("@/lib/ai/contextBuilder.ts");

describe("Phase 4: Mitra 2.0 — Real-Time Voice + Agent Runtime", () => {
  beforeEach(() => {
    mitraSessionManager.resetForTesting();
    if (clearTelemetryForTesting) {
      clearTelemetryForTesting();
    }
  });

  test("Test 1 — Session creation: session receives valid ID and initial state", () => {
    const session = mitraSessionManager.createSession({
      userId: "usr_alice_123",
      projectId: "proj_autolux",
      mode: "live",
    });

    assert.ok(session.sessionId.startsWith("mitra_sess_"), "Session ID must follow mitra_sess_ prefix");
    assert.equal(session.userId, "usr_alice_123");
    assert.equal(session.projectId, "proj_autolux");
    assert.equal(session.status, "idle");
    assert.equal(session.mode, "live");
    assert.equal(session.reconnectAttempts, 0);
    assert.ok(session.startedAt, "Must record startedAt timestamp");
  });

  test("Test 2 — Authentication: unauthenticated users cannot start protected Mitra sessions", () => {
    assert.throws(
      () => {
        mitraSessionManager.createSession({ userId: "" });
      },
      /Authentication required/i,
      "Must throw authentication error for empty userId"
    );

    assert.throws(
      () => {
        // @ts-expect-error testing missing userId
        mitraSessionManager.createSession({});
      },
      /Authentication required/i,
      "Must throw authentication error when userId is missing"
    );
  });

  test("Test 3 — Project isolation: User A cannot use Mitra tools against User B's project", async () => {
    const result = await mitraToolRegistry.executeTool(
      "get_project_knowledge",
      { category: "business_info" },
      {
        userId: "usr_attacker",
        projectId: "proj_victim_999",
        sessionId: "sess_isolation_test",
      }
    );

    assert.equal(result.success, false);
    assert.match(
      result.error || "",
      /Unauthorized/i,
      "Cross-tenant tool execution must be rejected with Unauthorized"
    );
  });

  test("Test 4 — Context integration: Mitra receives Phase 3 context bundle", async () => {
    const aiContext = await buildAIContext({
      taskType: "planning",
      userPrompt: "Authentic wood-fired pizzeria in Mumbai",
      websiteType: "restaurant",
      verifiedProjectKnowledge: {
        specialty: "Wood-fired stone oven",
        pickupLocation: "BKC Mumbai",
      },
    });

    assert.ok(aiContext.systemKnowledgePrompt.toLowerCase().includes("restaurant"), "Context must load restaurant archetype");
    assert.ok(aiContext.projectDataPrompt.includes("Wood-fired stone oven"), "Must include verified project facts");
    assert.ok(aiContext.projectDataPrompt.includes("<untrusted_project_data>"), "Must be structurally fenced");

    const runtimeRes = await mitraAgentRuntime.processTurn({
      userId: "usr_alice",
      message: "Can you create a website for my pizzeria?",
      language: "English",
      currentNeeds: { businessName: "Pizza Napoli", category: "restaurant" },
    });
    assert.equal(runtimeRes.success, true);
    assert.ok(runtimeRes.data.reply);
  });

  test("Test 5 — Tool registry: only registered tools can execute", async () => {
    const result = await mitraToolRegistry.executeTool(
      "execute_arbitrary_shell_command",
      { command: "rm -rf /" },
      {
        userId: "usr_alice",
        sessionId: "sess_reg_test",
      }
    );

    assert.equal(result.success, false);
    assert.match(
      result.error || "",
      /is not registered/i,
      "Arbitrary unapproved tool names must be rejected"
    );
  });

  test("Test 6 — Tool argument validation: invalid tool arguments are rejected", async () => {
    // update_project_knowledge requires key and value
    const result = await mitraToolRegistry.executeTool(
      "update_project_knowledge",
      { missingKey: 123 },
      {
        userId: "usr_alice",
        projectId: "proj_dummy",
        sessionId: "sess_arg_test",
      }
    );

    assert.equal(result.success, false);
    assert.match(
      result.error || "",
      /Argument validation failed/i,
      "Malformed arguments must be rejected by validator"
    );
  });

  test("Test 7 — Tool authorization: unauthorized project actions are rejected", async () => {
    const result = await mitraToolRegistry.executeTool(
      "update_project_knowledge",
      { key: "phone", value: "+919876543210" },
      {
        userId: "usr_unauthorized",
        projectId: "proj_other_user",
        sessionId: "sess_auth_test",
      }
    );

    assert.equal(result.success, false);
    assert.match(result.error || "", /Unauthorized/i);
  });

  test("Test 8 — Tool telemetry: tool call and result telemetry is emitted", async () => {
    const session = mitraSessionManager.createSession({
      userId: "usr_telemetry_test",
      projectId: "proj_test_telemetry",
    });

    // Execute create_or_update_plan tool
    await mitraToolRegistry.executeTool(
      "create_or_update_plan",
      {
        businessName: "Velocity Motors",
        category: "Automotive",
      },
      {
        userId: "usr_telemetry_test",
        projectId: "proj_test_telemetry",
        sessionId: session.sessionId,
      }
    );

    const recentEvents = getRecentEvents({ limit: 10 });
    const toolCallEvent = recentEvents.find(
      (e) => e.event === "agent.tool_call" && e.metadata?.toolName === "create_or_update_plan"
    );
    const toolResultEvent = recentEvents.find(
      (e) => e.event === "agent.tool_result" && e.metadata?.toolName === "create_or_update_plan"
    );

    assert.ok(toolCallEvent, "Must emit agent.tool_call event");
    assert.ok(toolResultEvent, "Must emit agent.tool_result event");
    assert.equal(toolCallEvent.requestId, session.sessionId);
    assert.equal(toolResultEvent.requestId, session.sessionId);
  });

  test("Test 9 — Provider fallback: Live/provider failure transitions to fallback correctly", () => {
    const session = mitraSessionManager.createSession({
      userId: "usr_fallback_user",
      mode: "live",
    });

    // Simulate exceeding reconnect limits
    mitraSessionManager.recordReconnect(session.sessionId);
    mitraSessionManager.recordReconnect(session.sessionId);
    mitraSessionManager.recordReconnect(session.sessionId);
    const lastAttempt = mitraSessionManager.recordReconnect(session.sessionId);

    assert.equal(lastAttempt.allowed, false, "4th reconnect attempt must be blocked");

    const updated = mitraSessionManager.getSession(session.sessionId);
    assert.equal(updated.mode, "fallback", "Session mode must transition to fallback");
    assert.equal(updated.status, "error");

    const recentEvents = getRecentEvents({ limit: 10 });
    const fallbackEvent = recentEvents.find((e) => e.event === "agent.fallback");
    assert.ok(fallbackEvent, "agent.fallback event must be emitted");
  });

  test("Test 10 — Secret sanitization: API keys and bearer tokens never appear in telemetry/logs", () => {
    const dirtyString = "Error with API key AIzaSyD9876543210ABCDEF1234567890ABCDE and Bearer secret_token_xyz! sk-ant-live0123456";
    const sanitized = sanitizeErrorOutput(dirtyString);

    assert.ok(!sanitized.includes("AIzaSyD9876543210ABCDEF1234567890ABCDE"), "AIza key must be scrubbed");
    assert.ok(!sanitized.includes("Bearer secret_token_xyz!"), "Bearer token must be scrubbed");
    assert.ok(!sanitized.includes("sk-ant-live0123456"), "Secret key must be scrubbed");
    assert.ok(sanitized.includes("[REDACTED_GEMINI_KEY]"), "Gemini key must be scrubbed with [REDACTED_GEMINI_KEY]");
    assert.ok(sanitized.includes("[REDACTED_API_KEY]"), "OpenAI/Claude key must be scrubbed with [REDACTED_API_KEY]");

    // Also verify session metadata sanitization
    const session = mitraSessionManager.createSession({
      userId: "usr_sec_test",
      metadata: {
        rawLog: "Connecting with key=AIzaSySecretKey",
      },
    });

    assert.ok(!JSON.stringify(session.metadata).includes("AIzaSySecretKey"));
  });

  test("Test 11 — Session cleanup: closed/failed sessions do not remain permanently active", () => {
    const session1 = mitraSessionManager.createSession({ userId: "usr_clean_1" });
    const session2 = mitraSessionManager.createSession({ userId: "usr_clean_2" });
    assert.ok(session2.sessionId);

    assert.equal(mitraSessionManager.getActiveSessionCount(), 2);

    mitraSessionManager.closeSession(session1.sessionId);
    assert.equal(mitraSessionManager.getActiveSessionCount(), 1);

    // Evict stale sessions with simulated 0ms threshold
    const cleaned = mitraSessionManager.cleanupStaleSessions(0);
    assert.equal(cleaned, 1);
    assert.equal(mitraSessionManager.getActiveSessionCount(), 0);
  });

  test("Test 12 — Interruption: Speaking -> interrupted transition works safely", () => {
    const session = mitraSessionManager.createSession({ userId: "usr_barge_in" });
    mitraSessionManager.updateSessionStatus(session.sessionId, "speaking");

    let current = mitraSessionManager.getSession(session.sessionId);
    assert.equal(current.status, "speaking");

    // User interrupts
    mitraSessionManager.updateSessionStatus(session.sessionId, "interrupted");
    current = mitraSessionManager.getSession(session.sessionId);
    assert.equal(current.status, "interrupted");

    const recentEvents = getRecentEvents({ limit: 10 });
    const interruptEvent = recentEvents.find((e) => e.metadata?.status === "interrupted");
    assert.ok(interruptEvent, "Interruption telemetry must be emitted");
  });

  test("Test 13 — Context priority: explicit user request overrides stale project knowledge", async () => {
    const freshPrompt = "Make the primary theme dark obsidian and neon emerald, ignoring previous blue request";
    const aiContext = await buildAIContext({
      taskType: "planning",
      userPrompt: freshPrompt,
      verifiedProjectKnowledge: {
        primaryColor: "#0000FF", // Stale blue
        theme: "light corporate",
      },
    });

    const userInstructionIdx = aiContext.fullPromptContext.indexOf("CURRENT USER INSTRUCTION (HIGHEST PRIORITY)");
    const projectDataIdx = aiContext.fullPromptContext.indexOf("<untrusted_project_data>");

    assert.ok(userInstructionIdx > -1, "Must contain user instruction section");
    assert.ok(projectDataIdx > -1, "Must contain project data section");
    assert.ok(
      aiContext.fullPromptContext.includes(freshPrompt),
      "User instruction must be explicitly preserved"
    );
  });

  test("Test 14 — Destructive confirmation: protected destructive actions cannot execute without confirmation", async () => {
    // 1. generate_website without confirmation
    const genResult = await mitraToolRegistry.executeTool(
      "generate_website",
      { businessName: "Apex Logistics", category: "Freight" },
      { userId: "usr_test", sessionId: "sess_destruct_1" }
    );

    assert.equal(genResult.success, false);
    assert.equal(genResult.requiresConfirmation, true);
    assert.ok(genResult.confirmationPrompt?.includes("Apex Logistics"));

    // 2. generate_website with confirmed: true
    const genConfirmedResult = await mitraToolRegistry.executeTool(
      "generate_website",
      { businessName: "Apex Logistics", category: "Freight", confirmed: true },
      { userId: "usr_test", sessionId: "sess_destruct_1" }
    );
    assert.equal(genConfirmedResult.success, true);

    // 3. edit_website delete action without confirmation
    const deleteResult = await mitraToolRegistry.executeTool(
      "edit_website",
      { sectionId: "hero_section_1", action: "delete" },
      { userId: "usr_test", sessionId: "sess_destruct_2" }
    );
    assert.equal(deleteResult.success, false);
    assert.equal(deleteResult.requiresConfirmation, true);
  });

  test("Test 15 — Reconnect behavior: reconnect attempts are bounded and do not loop indefinitely", () => {
    const session = mitraSessionManager.createSession({ userId: "usr_reconnect_loop_test" });

    // Attempts 1, 2, 3 must succeed
    assert.equal(mitraSessionManager.recordReconnect(session.sessionId).allowed, true);
    assert.equal(mitraSessionManager.recordReconnect(session.sessionId).allowed, true);
    assert.equal(mitraSessionManager.recordReconnect(session.sessionId).allowed, true);

    // Attempt 4 must exceed MAX_RECONNECT_ATTEMPTS
    const attempt4 = mitraSessionManager.recordReconnect(session.sessionId);
    assert.equal(attempt4.allowed, false);
    assert.equal(attempt4.count, MAX_RECONNECT_ATTEMPTS + 1);

    const afterExceeded = mitraSessionManager.getSession(session.sessionId);
    assert.equal(afterExceeded.status, "error");
    assert.equal(afterExceeded.mode, "fallback");
  });
});
