import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(relative, overrides = {}, globals = {}) {
  const source = fs.readFileSync(new URL(`../src/lib/intelligence/${relative}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, performance, Date, console, process: { env: {} }, URL, AbortSignal, ...globals,
    require: id => Object.hasOwn(overrides, id) ? overrides[id] : id.startsWith("@/") || id.startsWith(".") ? {} : require(id) });
  return loaded.exports;
}
const contracts = load("ops/opsToolTypes.ts");
const holds = load("orchestration/generationHold.ts");
function executor(generate, handoff = null) {
  return load("ops/opsToolExecutor.ts", {
    "./opsToolTypes": contracts,
    "../memory/memoryStore": { redactSecretsInObject: value => value },
    "@/lib/telemetry/agentTelemetry": { emitAgentEvent: () => {} },
    "../orchestration/canonicalGenerationOrchestrator": { canonicalGenerationOrchestrator: { generateWebsite: generate } },
    "../orchestration/generationTraceStore": { readOwnedApprovedGeneratedPreview: async () => null, readOwnedGenerationHandoff: async () => handoff },
    "@/lib/audit/auditService": { buildResearchSummary: () => ({ businessName: "Store", category: "retail", location: "City" }) },
    "../grounding/groundedIntelligenceService": { groundedIntelligenceService: { researchBusiness: async () => ({ success: false, profile: { evidence: [] } }) } },
  }).opsToolExecutor;
}
const request = { tool: "generate_preview", input: { businessName: "Unknown" }, taskId: "task", requestId: "req", tenantId: "tenant", idempotencyKey: "same" };
test("ops preserves pending research without passing or caching it as generation success", async () => {
  let calls = 0;
  const api = executor(async () => { calls++; return { success: false, status: "WAITING_HUMAN_APPROVAL", researchId: "a".repeat(64), error: { message: "Review required" } }; });
  const response = await api.executeTool(request);
  assert.equal(response.success, false);
  assert.equal(response.result.status, "WAITING_HUMAN_APPROVAL");
  assert.equal(response.result.researchId, "a".repeat(64));
  await api.executeTool(request);
  assert.equal(calls, 2);
});
test("ops cannot validate a caller-fabricated AST or draft outreach without the matching owned preview", async () => {
  const api = executor(async () => { throw new Error("Unexpected generation"); });
  const validation = await api.executeTool({ ...request, tool: "validate_preview", input: { previewId: "prev_fake", websiteData: { hero: "fake" } } });
  assert.equal(validation.success, false);
  assert.match(validation.errors[0], /Owned approved preview not found/);
  const draft = await api.executeTool({ ...request, tool: "create_outreach", input: { leadId: "lead", previewId: "prev_other", preview: { url: "fake" } } });
  assert.equal(draft.success, false);
  assert.match(draft.errors[0], /does not match this lead/);
});
test("ops does not replace unavailable business research with a generic summary", async () => {
  const api = executor(async () => { throw new Error("Unexpected generation"); });
  const result = await api.executeTool({ ...request, tool: "research_business", input: { lead: { businessName: "Store", leadId: "lead" } } });
  assert.equal(result.success, false);
  assert.match(result.errors[0], /generic summary cannot replace research/);
});
test("ops idempotency separates identical explicit keys between tenants", async () => {
  let calls = 0;
  const api = executor(async () => ({ success: true, status: "READY", preview: { id: `prev_${++calls}`, url: "/preview", slug: "approved" }, websiteData: {}, validationReport: { overallScore: 88 } }));
  assert.equal((await api.executeTool(request)).result.qualityScore, 88);
  await api.executeTool(request);
  await api.executeTool({ ...request, tenantId: "another-tenant" });
  assert.equal(calls, 2);
});
function localClient(executeTool, globals = {}) {
  return load("ops/n8nOpsClient.ts", { "./opsToolTypes": contracts, "./opsToolExecutor": { opsToolExecutor: { executeTool } },
    "../orchestration/generationHold": holds, "@/lib/telemetry/agentTelemetry": { emitAgentEvent: () => {} } }, globals).n8nOpsClient;
}
const dispatch = { taskId: "task", objective: "Generate a website", constraints: [], allowedTools: ["generate_preview", "validate_preview", "create_outreach"],
  approvalRequired: false, tenantId: "tenant", leadId: "lead", input: { businessName: "Store" } };
test("local ops research hold returns approval_required and never starts validation or outreach", async () => {
  const calls = [];
  const client = localClient(async req => { calls.push(req.tool); return { success: false, errors: ["Research required"], result: { status: "RESEARCH_REQUIRED", researchId: "b".repeat(64) } }; });
  const result = await client.executeLocalOpsAgentLoop(dispatch);
  assert.equal(result.status, "approval_required");
  assert.equal(result.approvalRequired, true);
  assert.deepEqual(calls, ["generate_preview"]);
  assert.equal(result.results.generate_preview.researchId, "b".repeat(64));
});
test("local ops stops before outreach when owned preview validation fails", async () => {
  const calls = [];
  const client = localClient(async req => { calls.push(req.tool); return req.tool === "generate_preview"
    ? { success: true, result: { previewId: "prev_owned" } }
    : { success: false, result: { passed: false }, errors: ["Validation failed"] }; });
  const result = await client.executeLocalOpsAgentLoop(dispatch);
  assert.equal(result.status, "blocked");
  assert.deepEqual(calls, ["generate_preview", "validate_preview"]);
});
test("failed research blocks all downstream generation and outreach tools", async () => {
  const calls = [];
  const client = localClient(async req => { calls.push(req.tool); return { success: false, result: null, errors: ["Research unavailable"] }; });
  const result = await client.executeLocalOpsAgentLoop({ ...dispatch, allowedTools: ["research_business", ...dispatch.allowedTools], input: { lead: { businessName: "Store", leadId: "lead" } } });
  assert.equal(result.status, "blocked");
  assert.deepEqual(calls, ["research_business"]);
});
test("remote timeout never replays ops locally; production without executor fails closed", async () => {
  let localCalls = 0;
  const client = localClient(async () => { localCalls++; }, { process: { env: { NODE_ENV: "production", N8N_OPS_AGENT_WEBHOOK_URL: "https://n8n.example.com/task", AUTOMATION_SECRET: "unit-only" } },
    fetch: async () => { throw new Error("Timeout after potential execution"); } });
  await assert.rejects(client.dispatchTask(dispatch), /without local replay/);
  const missing = localClient(async () => { localCalls++; }, { process: { env: { NODE_ENV: "production" } } });
  await assert.rejects(missing.dispatchTask(dispatch), /configure the authenticated remote executor/);
  assert.equal(localCalls, 0);
});
test("automation ops boundary replaces payload identities with trusted server identity", async () => {
  const forwarded = [];
  const route = load("../../app/api/automation/ops/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    "@/lib/automation/auth": { isAuthorized: async () => true },
    "@/lib/adminAuth": { verifyAdminAuth: async () => ({ isAdmin: false }) },
    "@/lib/intelligence/ops/opsToolExecutor": { opsToolExecutor: { executeTool: async req => { forwarded.push(req); return { success: true, errors: [], result: {} }; } } },
    "@/lib/intelligence/ops/opsToolTypes": contracts,
    "@/lib/intelligence/orchestration/generationHold": holds,
    "@/lib/telemetry/agentTelemetry": { emitAgentEvent: () => {} },
  }, { process: { env: { AUTOMATION_TENANT_ID: "configured-tenant" } } });
  const response = await route.POST({ json: async () => ({ ...request, tenantId: "victim", userId: "forged-admin" }) });
  assert.equal(response.status, 200);
  assert.equal(forwarded[0].tenantId, "configured-tenant");
  assert.equal(forwarded[0].userId, null);
});
test("owned publication reads and outreach handoffs enforce tenant and original lead predicates", async () => {
  const queries = [];
  const store = load("orchestration/generationTraceStore.ts", {
    "@/lib/db/queries": { getPool: () => ({ query: async (sql, params) => { queries.push({ sql, params }); return { rows: [] }; } }) },
  });
  assert.equal(await store.readOwnedApprovedGeneratedPreview("prev_site", "tenant"), null);
  assert.match(queries[0].sql, /tenant_id=\$2/);
  assert.equal(queries[0].params[1], "tenant");
  assert.equal(await store.readOwnedGenerationHandoff("prev_site", "tenant", "original-lead"), null);
  assert.match(queries[1].sql, /request->>'leadId'=\$3/);
  assert.equal(queries[1].params[2], "original-lead");
  assert.match(queries[1].sql, /publishReview'->>'approved'='true'/);
});
