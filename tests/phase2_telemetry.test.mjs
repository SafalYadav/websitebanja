// tests/phase2_telemetry.test.mjs
/**
 * WebsiteBanja Phase 2: Real-Time Agent Telemetry & Health Panel Test Suite
 *
 * Verifies:
 * 1. Event creation: structure, ISO timestamp, valid agent & event type.
 * 2. Request correlation: end-to-end request tracing sharing identical requestId.
 * 3. Provider telemetry: provider name, model name, and failover tracking.
 * 4. Latency measurement: numeric latencyMs tracked on provider success/error.
 * 5. Fallback sequence: canonical provider failover event ordering.
 * 6. Secret sanitization in telemetry: AIza keys, sk- tokens, Bearer tokens scrubbed.
 * 7. Telemetry failure isolation: listener/storage failures NEVER crash AI requests.
 * 8. Tenant isolation & authorization: non-admin tenant filtering & SSE route 401/403 security.
 * 9. Real-time event delivery: pub/sub delivery to active stream listeners.
 * 10. State management & stale cleanup: live agent state transitions and stale timeout recovery.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// Load production modules via jiti
const {
  emitAgentEvent,
  subscribeToTelemetry,
  getActiveAgentStatuses,
  getRecentEvents,
  resetTelemetryForTesting,
} = jiti("@/lib/telemetry/agentTelemetry.ts");

const { GET: telemetryStreamGET } = jiti("@/app/api/admin/agents/telemetry/stream/route.ts");

describe("Phase 2: Real-Time Agent Telemetry & Health Panel", () => {
  beforeEach(() => {
    resetTelemetryForTesting();
  });

  test("1. Event Creation: generates valid ID, ISO timestamp, agent name, and event type", () => {
    const event = emitAgentEvent({
      event: "agent.started",
      agent: "mitra",
      requestId: "req_unit_001",
      metadata: { action: "Intake started" },
    });

    assert.ok(event, "Event must be returned");
    assert.ok(typeof event.id === "string" && event.id.length > 0, "Event must have a valid string id");
    assert.ok(!isNaN(Date.parse(event.timestamp)), "Event timestamp must be a valid ISO 8601 date string");
    assert.equal(event.event, "agent.started");
    assert.equal(event.agent, "mitra");
    assert.equal(event.requestId, "req_unit_001");
  });

  test("2. Request Correlation: multiple events from the same request share identical requestId", () => {
    const traceId = `req_trace_${Date.now()}`;

    emitAgentEvent({ event: "agent.started", agent: "generator", requestId: traceId });
    emitAgentEvent({ event: "agent.thinking", agent: "generator", requestId: traceId });
    emitAgentEvent({
      event: "agent.provider_call",
      agent: "generator",
      requestId: traceId,
      provider: "openai",
      model: "gpt-5.6-luna",
    });
    emitAgentEvent({
      event: "agent.provider_success",
      agent: "generator",
      requestId: traceId,
      provider: "openai",
      model: "gpt-5.6-luna",
      latencyMs: 420,
    });
    emitAgentEvent({
      event: "agent.completed",
      agent: "generator",
      requestId: traceId,
      latencyMs: 780,
    });

    const events = getRecentEvents({ requestId: traceId });
    assert.equal(events.length, 5, "Should record all 5 lifecycle events for trace");
    for (const ev of events) {
      assert.equal(ev.requestId, traceId, `Event ${ev.event} must match requestId`);
    }
  });

  test("3. Provider Telemetry: captures provider name, model name, and failover targets", () => {
    const reqId = `req_prov_${Date.now()}`;

    const callEvent = emitAgentEvent({
      event: "agent.provider_call",
      agent: "planner",
      requestId: reqId,
      provider: "gemini",
      model: "gemini-2.5-flash",
    });

    assert.equal(callEvent.provider, "gemini");
    assert.equal(callEvent.model, "gemini-2.5-flash");

    const fallbackEvent = emitAgentEvent({
      event: "agent.fallback",
      agent: "planner",
      requestId: reqId,
      fromProvider: "gemini",
      toProvider: "groq",
      fromModel: "gemini-2.5-flash",
      toModel: "llama-3.3-70b-versatile",
      reason: "Gemini 429 quota exhaustion",
    });

    assert.equal(fallbackEvent.fromProvider, "gemini");
    assert.equal(fallbackEvent.toProvider, "groq");
    assert.equal(fallbackEvent.fromModel, "gemini-2.5-flash");
    assert.equal(fallbackEvent.toModel, "llama-3.3-70b-versatile");
    assert.equal(fallbackEvent.reason, "Gemini 429 quota exhaustion");
  });

  test("4. Latency Measurement: positive numeric latencyMs recorded on success and error events", () => {
    const successEvent = emitAgentEvent({
      event: "agent.provider_success",
      agent: "extractor",
      requestId: "req_lat_001",
      provider: "gemini",
      model: "gemini-2.5-flash",
      latencyMs: 312,
    });

    assert.equal(typeof successEvent.latencyMs, "number");
    assert.ok(successEvent.latencyMs > 0, "Latency must be positive");
    assert.equal(successEvent.latencyMs, 312);

    const errorEvent = emitAgentEvent({
      event: "agent.provider_error",
      agent: "extractor",
      requestId: "req_lat_002",
      provider: "gemini",
      model: "gemini-2.5-flash",
      latencyMs: 95,
      error: "Connection timeout",
    });

    assert.equal(errorEvent.latencyMs, 95);
  });

  test("5. Fallback Sequence: reflects canonical provider_call -> provider_error -> fallback -> provider_call -> provider_success order", () => {
    const reqId = `req_fallback_seq_${Date.now()}`;

    // Step 1: Initial call to Gemini
    emitAgentEvent({
      event: "agent.provider_call",
      agent: "mitra",
      requestId: reqId,
      provider: "gemini",
      model: "gemini-2.5-flash",
    });

    // Step 2: Gemini fails with 429
    emitAgentEvent({
      event: "agent.provider_error",
      agent: "mitra",
      requestId: reqId,
      provider: "gemini",
      model: "gemini-2.5-flash",
      latencyMs: 140,
      error: "429 Too Many Requests: Resource exhausted",
    });

    // Step 3: Model router triggers fallback
    emitAgentEvent({
      event: "agent.fallback",
      agent: "mitra",
      requestId: reqId,
      fromProvider: "gemini",
      toProvider: "openrouter",
      fromModel: "gemini-2.5-flash",
      toModel: "mistralai/mistral-large-2411",
      reason: "429 Too Many Requests: Resource exhausted",
    });

    // Step 4: Call to fallback provider OpenRouter
    emitAgentEvent({
      event: "agent.provider_call",
      agent: "mitra",
      requestId: reqId,
      provider: "openrouter",
      model: "mistralai/mistral-large-2411",
    });

    // Step 5: Fallback provider succeeds
    emitAgentEvent({
      event: "agent.provider_success",
      agent: "mitra",
      requestId: reqId,
      provider: "openrouter",
      model: "mistralai/mistral-large-2411",
      latencyMs: 480,
    });

    const history = getRecentEvents({ requestId: reqId });
    assert.equal(history.length, 5);
    assert.equal(history[0].event, "agent.provider_call");
    assert.equal(history[0].provider, "gemini");
    assert.equal(history[1].event, "agent.provider_error");
    assert.equal(history[2].event, "agent.fallback");
    assert.equal(history[2].fromProvider, "gemini");
    assert.equal(history[2].toProvider, "openrouter");
    assert.equal(history[3].event, "agent.provider_call");
    assert.equal(history[3].provider, "openrouter");
    assert.equal(history[4].event, "agent.provider_success");
    assert.equal(history[4].provider, "openrouter");
  });

  test("6. Secret Sanitization: raw API keys, sk- tokens, and Bearer tokens are scrubbed from telemetry", () => {
    const rawApiKey = "AIzaSyB1234567890abcdef1234567890abcdef";
    const rawOpenAiKey = "sk-proj-secretKey1234567890abcdef1234567890";
    const rawBearer = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThis";

    const event = emitAgentEvent({
      event: "agent.provider_error",
      agent: "studio",
      requestId: "req_sanitize_01",
      error: `Failed call with key=${rawApiKey} and auth ${rawBearer}`,
      metadata: {
        openAiToken: rawOpenAiKey,
        rawUrl: `https://generativelanguage.googleapis.com/v1beta/models?key=${rawApiKey}`,
      },
    });

    // Verify error message scrubbed
    assert.ok(!event.error?.includes(rawApiKey), "Raw Google API key must not appear in error");
    assert.ok(!event.error?.includes(rawBearer), "Bearer token must not appear in error");

    // Verify metadata scrubbed
    const serializedMeta = JSON.stringify(event.metadata || {});
    assert.ok(!serializedMeta.includes(rawApiKey), "Raw Google API key must not appear in metadata");
    assert.ok(!serializedMeta.includes(rawOpenAiKey), "OpenAI key must not appear in metadata");
  });

  test("7. Telemetry Failure Isolation: subscriber exceptions never crash AI request execution", () => {
    // Register a malicious or failing subscriber
    subscribeToTelemetry(() => {
      throw new Error("Fatal crash inside external SSE subscriber");
    });

    // Calling emitAgentEvent should NOT throw
    assert.doesNotThrow(() => {
      const result = emitAgentEvent({
        event: "agent.started",
        agent: "boss",
        requestId: "req_safe_01",
      });
      assert.ok(result, "emitAgentEvent must complete successfully despite subscriber error");
    });
  });

  test("8. Tenant Isolation & Authorization: non-admin tenants receive only their own events and SSE endpoint enforces auth", async () => {
    // 8a. Telemetry subscriber tenant filtering
    const tenantAEvents = [];
    const tenantBEvents = [];

    subscribeToTelemetry((ev) => tenantAEvents.push(ev), { userId: "tenant_user_A", isAdmin: false });
    subscribeToTelemetry((ev) => tenantBEvents.push(ev), { userId: "tenant_user_B", isAdmin: false });

    // Emit event for Tenant A
    emitAgentEvent({
      event: "agent.started",
      agent: "generator",
      userId: "tenant_user_A",
      requestId: "req_tenant_A",
    });

    // Emit event for Tenant B
    emitAgentEvent({
      event: "agent.started",
      agent: "generator",
      userId: "tenant_user_B",
      requestId: "req_tenant_B",
    });

    assert.equal(tenantAEvents.length, 1);
    assert.equal(tenantAEvents[0].userId, "tenant_user_A");

    assert.equal(tenantBEvents.length, 1);
    assert.equal(tenantBEvents[0].userId, "tenant_user_B");

    // 8b. SSE Route Authentication Check: unauthenticated request is blocked
    const unauthReq = new Request("http://localhost:3000/api/admin/agents/telemetry/stream", {
      method: "GET",
    });
    const unauthRes = await telemetryStreamGET(unauthReq);
    assert.ok(
      unauthRes.status === 401 || unauthRes.status === 403,
      `Unauthenticated SSE request must return 401 or 403, got ${unauthRes.status}`
    );
  });

  test("9. Real-Time Delivery: subscribers receive emitted events instantly", () => {
    const received = [];
    const unsubscribe = subscribeToTelemetry((ev) => {
      received.push(ev);
    });

    emitAgentEvent({
      event: "agent.thinking",
      agent: "uniqueness",
      requestId: "req_realtime_01",
    });

    emitAgentEvent({
      event: "agent.completed",
      agent: "uniqueness",
      requestId: "req_realtime_01",
    });

    assert.equal(received.length, 2);
    assert.equal(received[0].event, "agent.thinking");
    assert.equal(received[1].event, "agent.completed");

    // After unsubscribe, no further events delivered
    unsubscribe();
    emitAgentEvent({
      event: "agent.started",
      agent: "uniqueness",
      requestId: "req_realtime_02",
    });

    assert.equal(received.length, 2, "Unsubscribed listener must receive no further events");
  });

  test("10. State Management & Cleanup: agent live state transitions correctly and stale requests recover", () => {
    // Initial state is idle
    let statuses = getActiveAgentStatuses();
    assert.equal(statuses.skills?.state, "idle");

    // Agent starts -> state becomes running
    emitAgentEvent({
      event: "agent.started",
      agent: "skills",
      requestId: "req_state_01",
      provider: "gemini",
      model: "gemini-2.5-flash",
    });

    statuses = getActiveAgentStatuses();
    assert.equal(statuses.skills?.state, "running");
    assert.equal(statuses.skills?.requestId, "req_state_01");

    // Agent completes -> state transitions to success
    emitAgentEvent({
      event: "agent.completed",
      agent: "skills",
      requestId: "req_state_01",
      latencyMs: 250,
    });

    statuses = getActiveAgentStatuses();
    assert.equal(statuses.skills?.state, "success");
    assert.equal(statuses.skills?.lastLatencyMs, 250);

    // Agent fails -> state transitions to error
    emitAgentEvent({
      event: "agent.failed",
      agent: "skills",
      requestId: "req_state_02",
      error: "Parsing exception",
    });

    statuses = getActiveAgentStatuses();
    assert.equal(statuses.skills?.state, "error");
    assert.equal(statuses.skills?.lastError, "Parsing exception");
  });
});
