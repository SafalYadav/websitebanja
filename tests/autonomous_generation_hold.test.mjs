import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(relative, overrides = {}) {
  const source = fs.readFileSync(new URL(`../src/lib/${relative}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, process, Date, console, setTimeout, clearTimeout,
    require: id => Object.hasOwn(overrides, id) ? overrides[id] : id.startsWith("@/") || id.startsWith(".") ? {} : require(id) });
  return loaded.exports;
}
const holds = load("intelligence/orchestration/generationHold.ts");
const completion = load("automation/pipelineCompletion.ts");
const types = load("automation/pipelineTypes.ts");
const leases = load("automation/pipelineExecutionLease.ts");
test("pipeline criteria reject invalid inputs and disabled WhatsApp outreach", () => {
  const valid = { industry: "Wine retail", city: "City" };
  assert.equal(types.PipelineRunCriteriaSchema.safeParse(valid).success, true);
  for (const value of [null, { ...valid, limit: -1 }, { ...valid, limit: 100 }, { ...valid, channel: "whatsapp" }, { ...valid, autoApproveOutreach: "true" }]) {
    assert.equal(types.PipelineRunCriteriaSchema.safeParse(value).success, false);
  }
});
function fixture() {
  const queue = load("automation/pipelineQueue.ts", { "@/lib/intelligence/orchestration/generationHold": holds,
    "./pipelineExecutionLease": leases,
    "@/lib/telemetry/agentTelemetry": { emitAgentEvent: () => {} } }).PipelineQueue;
  const state = { saved: null, jobs: [], records: new Map(), generations: 0, audits: 0, drafts: 0, discovery: [], resumed: null, observation: { status: "WAITING_HUMAN_APPROVAL" } };
  queue.savePipelineRun = async run => { state.saved = run; };
  queue.getPipelineRun = async () => state.saved;
  queue.assertExecution = async () => {};
  queue.withRunExecution = async (run, statuses, work) => {
    if (!statuses.includes(run.status)) throw new Error("Pipeline execution claim denied");
    run.status = "RUNNING";
    run.pausedAt = undefined;
    return work();
  };
  queue.savePipelineJob = async job => { state.jobs.push({ ...job }); };
  queue.readStageResult = async (run, lead, stage) => ({ executed: state.records.has(`${run.id}:${lead}:${stage}`), result: state.records.get(`${run.id}:${lead}:${stage}`) });
  queue.commitStageResult = async (run, lead, stage, result) => { state.records.set(`${run.id}:${lead}:${stage}`, result); };
  const lead = { leadId: "lead", businessName: "Unknown Store", category: "new_concept" };
  const orchestrator = load("automation/pipelineOrchestrator.ts", {
    "./pipelineTypes": types, "./pipelineQueue": { PipelineQueue: queue }, "./pipelineCompletion": completion,
    "./pipelineExecutionLease": leases,
    "@/lib/intelligence/orchestration/generationHold": holds,
    "@/lib/intelligence/orchestration/researchGovernance": { readResearchResume: async () => state.resumed },
    "@/lib/intelligence/orchestration/researchObservation": { readResearchObservation: async () => state.observation },
    "@/lib/intelligence/orchestration/canonicalGenerationOrchestrator": { canonicalGenerationOrchestrator: { generateWebsite: async () => { state.generations++; return { success: false, status: "RESEARCH_REQUIRED", researchId: "a".repeat(64), correlationId: "original" }; } } },
    "@/lib/discovery/discoveryService": { executeDiscoveryRun: async request => { state.discovery.push(request); return { qualifiedLeads: [], summary: { discovered: 0 } }; } },
    "@/lib/audit/auditService": { auditQualifiedLead: async () => { state.audits++; return { auditId: "audit" }; } },
    "@/lib/discovery/leadRepository": { leadRepository: { findLeadById: async () => lead } },
    "@/lib/crm/crmRepository": { crmRepository: { getLeadCRMState: async () => null } },
    "@/lib/outreach/personalizationEngine": { generateOutreachDraft: async () => { state.drafts++; return { success: true, outreach: { outreachId: "draft" } }; } },
    "@/lib/telemetry/agentTelemetry": { emitAgentEvent: () => {} },
  }).PipelineOrchestrator;
  const run = { id: "run", tenantId: "tenant", status: "RUNNING", currentStage: "QUALIFICATION", criteria: { industry: "new_concept", city: "City", autoApproveOutreach: false },
    stats: { audited: 0, previewsGenerated: 0, outreachDrafted: 0, failed: 0 }, errors: [], leads: { lead: { leadId: "lead", status: "pending", currentStage: "QUALIFICATION", retryCount: 0, errorHistory: [], timeline: [] } } };
  state.saved = run;
  return { queue, state, orchestrator, run, lead };
}
test("research hold pauses job/run without retries, failed counters or successful idempotency records", async () => {
  const { orchestrator, run, lead, state } = fixture();
  await orchestrator.processLeadBatch(run, [lead]);
  assert.equal(run.status, "PAUSED");
  assert.equal(run.leads.lead.status, "paused");
  assert.equal(run.leads.lead.researchId, "a".repeat(64));
  assert.equal(state.generations, 1);
  assert.equal(state.drafts, 0);
  assert.equal(run.stats.failed, 0);
  assert.equal(run.leads.lead.retryCount, 0);
  assert.equal(state.jobs.at(-1).status, "paused");
  assert.equal(state.records.has("run:lead:PREVIEW_GENERATION"), false);
});
test("pending resume observes original research; approved resume uses saved result without regeneration or duplicate counts", async () => {
  const { orchestrator, run, lead, state } = fixture();
  await orchestrator.processLeadBatch(run, [lead]);
  await orchestrator.resumeRun("run", undefined, "tenant");
  assert.equal(state.generations, 1);
  assert.equal(run.status, "PAUSED");
  assert.equal(run.stats.audited, 1);
  state.resumed = { result: { success: true, status: "READY", preview: { id: "prev_owned", url: "/preview/prev_owned" } } };
  await orchestrator.resumeRun("run", undefined, "tenant");
  assert.equal(state.generations, 1);
  assert.equal(state.drafts, 1);
  assert.equal(run.stats.previewsGenerated, 1);
  assert.equal(run.stats.audited, 1);
  assert.equal(run.leads.lead.currentStage, "HUMAN_APPROVAL");
  assert.equal(run.status, "PAUSED");
  assert.equal(run.completedAt, undefined);
});
test("approved child outbox resumes the original domain pipeline once and reuses its durable reviewed preview", async () => {
  const { orchestrator, run, lead, state } = fixture();
  await orchestrator.processLeadBatch(run, [lead]);
  assert.equal(run.pauseReason, "research");
  const result = { success: true, status: "READY", preview: { id: "prev_approved", url: "/preview/prev_approved" } };
  state.resumed = { result };
  state.records.set("run:lead:PREVIEW_GENERATION", result);
  let claimed = false;
  const calls = [];
  const continuation = load("intelligence/orchestration/pipelineResearchContinuation.ts", {
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: value => value.message },
    "@/lib/db/queries": { getPool: () => ({ query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("WITH candidate")) {
        if (claimed || state.saved.status !== "PAUSED" || state.saved.pauseReason !== "research") return { rows: [] };
        claimed = true;
        return { rows: [{ research_id: "a".repeat(64), pipeline_run_id: run.id, tenant_id: run.tenantId }] };
      }
      return { rows: [], rowCount: 1 };
    } }) },
    "@/lib/automation/pipelineOrchestrator": { PipelineOrchestrator: orchestrator },
  });
  await Promise.all([continuation.recoverPipelineContinuations({ tenantId: "tenant", researchId: "a".repeat(64) }), continuation.recoverPipelineContinuations({ tenantId: "tenant", researchId: "a".repeat(64) })]);
  assert.equal(state.generations, 1);
  assert.equal(state.audits, 1);
  assert.equal(state.drafts, 1);
  assert.equal(run.leads.lead.previewId, "prev_approved");
  assert.equal(run.leads.lead.currentStage, "HUMAN_APPROVAL");
  assert.equal(run.status, "PAUSED");
  assert.equal(run.pauseReason, "outreach");
  assert.equal(calls.at(-1).params[2], "COMPLETED");
});
test("rejected research and cross-tenant resume cannot proceed to generation/outreach", async () => {
  const { orchestrator, run, lead, state } = fixture();
  await orchestrator.processLeadBatch(run, [lead]);
  await assert.rejects(orchestrator.resumeRun("run", undefined, "other"), /ownership validation failed/);
  state.observation = { status: "REJECTED" };
  await orchestrator.resumeRun("run", undefined, "tenant");
  assert.equal(run.status, "FAILED");
  assert.equal(state.generations, 1);
  assert.equal(state.drafts, 0);
});
test("empty unknown-industry discovery never substitutes restaurants", async () => {
  const { orchestrator, state } = fixture();
  const run = await orchestrator.startRun({ industry: "specialist wine retail", city: "City" }, undefined, "tenant");
  assert.equal(state.discovery.length, 1);
  assert.equal(state.discovery[0].query, "specialist wine retail");
  assert.equal(state.generations, 0);
  assert.equal(run.status, "COMPLETED");
  await assert.rejects(orchestrator.startRun({ industry: "retail", city: "City" }), /Trusted autonomous pipeline tenant/);
});
test("reply simulation rejects untrusted/cross-tenant identity and disabled channel before CRM work", async () => {
  const { orchestrator } = fixture();
  await assert.rejects(orchestrator.simulateReplyForRunLead("run", "lead", "Hello"), /Trusted pipeline tenant/);
  await assert.rejects(orchestrator.simulateReplyForRunLead("run", "lead", "Hello", "email", undefined, "other"), /ownership validation failed/);
  await assert.rejects(orchestrator.simulateReplyForRunLead("run", "lead", "Hello", "whatsapp", undefined, "tenant"), /disabled/);
});
