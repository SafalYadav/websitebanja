import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(relative, overrides = {}, globals = {}) {
  const source = fs.readFileSync(new URL(`../src/lib/${relative}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(compiled, { module: loadedModule, exports: loadedModule.exports, process, Date, console, setInterval, clearInterval, setTimeout,
    ...globals, require: id => Object.hasOwn(overrides, id) ? overrides[id] : id.startsWith("@/") || id.startsWith(".") ? {} : require(id) });
  return loadedModule.exports;
}

function leaseFixture() {
  const state = { token: null, valid: true, status: "PAUSED", statements: [] };
  const pool = { query: async (sql, params) => {
    state.statements.push({ sql, params });
    if (sql.includes("status=ANY")) {
      if (params[1] !== "tenant" || !params[3].includes(state.status) || (state.token && state.valid)) return { rowCount: 0 };
      state.token = params[2]; state.valid = true; state.status = "RUNNING";
      return { rowCount: 1 };
    }
    if (sql.includes("SET execution_lease_token=NULL")) {
      if (params[2] === state.token) state.token = null;
      return { rowCount: 1 };
    }
    return { rowCount: params[1] === "tenant" && params[2] === state.token && state.valid && state.status === "RUNNING" ? 1 : 0 };
  } };
  const lease = load("automation/pipelineExecutionLease.ts", { "@/lib/db/queries": { getPool: () => pool } });
  const run = { id: "run", tenantId: "tenant", status: "PAUSED" };
  return { state, pool, lease, run };
}

test("execution capability rejects expired/cancelled workers and cannot revive an expired lease", async () => {
  const { state, lease, run } = leaseFixture();
  const fence = await lease.claimPipelineExecution(run, ["PAUSED"]);
  lease.attachPipelineExecution(run, fence);
  assert.equal(JSON.stringify(run).includes(fence.token), false);
  await lease.assertPipelineExecution(run);
  state.valid = false;
  await assert.rejects(lease.assertPipelineExecution(run), /expired, cancelled or superseded/);
  await assert.rejects(lease.renewPipelineExecution(fence), /expired, cancelled or superseded/);
  state.valid = true; state.status = "CANCELLED";
  await assert.rejects(lease.assertPipelineExecution(run), /expired, cancelled or superseded/);
  const renew = state.statements.find(item => item.sql.includes("SET execution_lease_until"));
  assert.match(renew.sql, /execution_lease_until>NOW\(\) AND status='RUNNING'/);
});

test("expired worker cannot release or use the successor's execution claim", async () => {
  const { state, lease, run } = leaseFixture();
  const first = await lease.claimPipelineExecution(run, ["PAUSED"]);
  state.valid = false;
  const successor = await lease.claimPipelineExecution(run, ["RUNNING"]);
  assert.notEqual(first.token, successor.token);
  lease.attachPipelineExecution(run, first);
  await lease.releasePipelineExecution(first);
  assert.equal(state.token, successor.token);
  await assert.rejects(lease.assertPipelineExecution(run), /superseded/);
});
test("automatic execution recovery remains tied to its original research purpose, not any expired run", async () => {
  const { lease, state, run } = leaseFixture();
  const research = "a".repeat(64);
  await lease.claimPipelineExecution(run, ["PAUSED", "RUNNING"], research);
  const claim = state.statements[0];
  assert.equal(claim.params[4], research);
  assert.match(claim.sql, /status='RUNNING' AND run_data->>'activeResearchContinuationId'=\$5/);
  assert.match(claim.sql, /leads->c\.lead_id->>'researchId'=\$5 AND c\.status='RUNNING'/);
  assert.match(claim.sql, /jsonb_build_object\('activeResearchContinuationId',\$5::text\)/);
  const other = leaseFixture();
  await other.lease.claimPipelineExecution(other.run, ["PAUSED"]);
  assert.equal(other.state.statements[0].sql.includes("generation_pipeline_continuations"), false);
  assert.equal(other.state.statements[0].params.length, 4);
});

test("run wrapper restores authoritative state and clears heartbeat/capability on work failure", async () => {
  const { state, lease, run } = leaseFixture();
  let stopped = false;
  let savedFailure = false;
  const queue = load("automation/pipelineQueue.ts", {
    "./pipelineExecutionLease": lease,
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: value => value.message },
    "@/lib/db/pipelineCrmPersistence": {
      ensurePipelineCrmTables: async () => ({ success: true }),
      getPipelineRunFromPostgres: async () => ({ ...run, status: state.status, currentStage: "PREVIEW_GENERATION" }),
    },
  }, { setInterval: () => "heartbeat", clearInterval: timer => { assert.equal(timer, "heartbeat"); stopped = true; } }).PipelineQueue;
  queue.savePipelineRun = async current => {
    assert.equal(lease.pipelineExecutionFence(current).token, state.token);
    assert.equal(current.status, "FAILED");
    savedFailure = true;
    state.status = current.status;
  };
  await assert.rejects(queue.withRunExecution(run, ["PAUSED"], async () => {
    assert.equal(run.status, "RUNNING");
    assert.equal(run.currentStage, "PREVIEW_GENERATION");
    assert.equal(JSON.stringify(run).includes(state.token), false);
    throw new Error("Provider unavailable");
  }), /Provider unavailable/);
  assert.equal(savedFailure, true);
  assert.equal(stopped, true);
  assert.equal(state.token, null);
  assert.equal(lease.pipelineExecutionFence(run), undefined);
});

test("owned DB saves carry a private fence and cannot recreate a deleted worker's run", async () => {
  const { lease, run } = leaseFixture();
  const fence = await lease.claimPipelineExecution(run, ["PAUSED"]);
  lease.attachPipelineExecution(run, fence);
  const statements = [];
  const persistence = load("db/pipelineCrmPersistence.ts", {
    "@/lib/automation/pipelineExecutionLease": lease,
    "./queries": { getPool: () => ({ query: async (sql, params) => { statements.push({ sql, params }); return { rowCount: 1 }; } }) },
  });
  await persistence.savePipelineRunToPostgres(run);
  const saved = statements.find(item => item.sql.includes("INSERT INTO public.autonomous_pipeline_runs"));
  assert.equal(saved.params[13], fence.token);
  assert.equal(saved.params[12].includes(fence.token), false);
  assert.match(saved.sql, /WHERE \$14::text IS NULL OR EXISTS/);
  assert.match(saved.sql, /execution_lease_until>NOW\(\)/);
  run.status = "CANCELLED";
  await persistence.suspendPipelineRun(run);
  const suspension = statements.at(-1);
  assert.match(suspension.sql, /execution_lease_token=NULL,execution_lease_until=NULL/);
  assert.equal(suspension.params[1], "tenant");
  assert.equal(suspension.params[2], "CANCELLED");
});

test("durable stage results reuse the original result and reject expired checkpoint writes", async () => {
  let valid = true;
  let saved;
  const statements = [];
  const lease = load("automation/pipelineExecutionLease.ts", {
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: value => String(value) },
    "@/lib/db/queries": { getPool: () => ({ query: async (sql, params) => {
      statements.push({ sql, params });
      if (sql.startsWith("SELECT s.result")) return { rows: valid && saved ? [{ result: saved }] : [] };
      if (valid) saved ||= JSON.parse(params[5]);
      return { rowCount: valid ? 1 : 0 };
    } }) },
  });
  const run = { id: "run", tenantId: "tenant" };
  lease.attachPipelineExecution(run, { runId: "run", tenantId: "tenant", token: "capability" });
  await lease.commitPipelineStageResult(run, "lead", "PREVIEW_GENERATION", { preview: { id: "prev_original" } });
  const read = await lease.readPipelineStageResult(run, "lead", "PREVIEW_GENERATION");
  assert.equal(read.executed, true);
  assert.equal(read.result.preview.id, "prev_original");
  await lease.commitPipelineStageResult(run, "lead", "PREVIEW_GENERATION", { preview: { id: "prev_duplicate" } });
  assert.equal(saved.preview.id, "prev_original");
  valid = false;
  await assert.rejects(lease.commitPipelineStageResult(run, "lead", "PREVIEW_GENERATION", {}), /superseded/);
  const write = statements[0];
  assert.match(write.sql, /status='RUNNING' FOR UPDATE/);
  assert.match(write.sql, /DO UPDATE SET result=autonomous_pipeline_stage_results\.result/);
  assert.deepEqual(Array.from(write.params).slice(0, 5), ["run", "tenant", "lead", "PREVIEW_GENERATION", "capability"]);
  const readSql = statements[1].sql;
  assert.match(readSql, /s\.tenant_id=\$2 AND r\.tenant_id=\$2/);
});

test("lease loss after a stage stops completion/idempotency without treating it as retryable lead failure", async () => {
  const { lease } = leaseFixture();
  const queue = load("automation/pipelineQueue.ts", { "./pipelineExecutionLease": lease,
    "@/lib/intelligence/orchestration/generationHold": { GenerationHoldError: class extends Error {} } }).PipelineQueue;
  let checks = 0;
  const completed = [];
  queue.assertExecution = async () => { if (++checks >= 3) throw new lease.PipelineExecutionLostError(); };
  queue.readStageResult = async () => ({ executed: false });
  queue.savePipelineJob = async job => { completed.push(job.status); };
  queue.commitStageResult = async () => { throw new Error("Must not record revoked result"); };
  const run = { id: "run", leads: { lead: { timeline: [], retryCount: 0 } }, errors: [], stats: { failed: 0 } };
  let executed = 0;
  await assert.rejects(queue.executeLeadStageSafe(run, "lead", "PREVIEW_GENERATION", async () => { executed++; return {}; }), /superseded/);
  assert.equal(executed, 1);
  assert.deepEqual(completed, ["running"]);
  assert.equal(run.stats.failed, 0);
  assert.equal(run.leads.lead.retryCount, 0);
});

test("cancelled parent prevents canonical publication; valid parent is locked until finalization commits", async () => {
  const result = { success: true, status: "READY", websiteData: { publishReview: { approved: true }, generationGate: "READY" } };
  const fence = { runId: "run", tenantId: "tenant", token: "private-worker-capability" };
  const exercise = async valid => {
    const statements = [];
    let released = false;
    const client = { query: async (sql, params) => { statements.push({ sql, params }); return { rowCount: sql.includes("FROM public.autonomous_pipeline_runs") && !valid ? 0 : 1 }; }, release: () => { released = true; } };
    const trace = load("intelligence/orchestration/generationTraceStore.ts", {
      "@/lib/db/queries": { getPool: () => ({ connect: async () => client }) },
      "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: value => String(value) },
    });
    if (valid) await trace.finishGenerationTrace("trace", result, undefined, fence);
    else await assert.rejects(trace.finishGenerationTrace("trace", result, undefined, fence), /publication denied/);
    assert.equal(released, true);
    const locked = statements.find(item => item.sql.includes("FROM public.autonomous_pipeline_runs"));
    assert.match(locked.sql, /execution_lease_until>NOW\(\) AND status='RUNNING' FOR UPDATE/);
    assert.deepEqual(Array.from(locked.params), ["run", "tenant", fence.token]);
    assert.equal(statements.some(item => item.sql.startsWith("UPDATE public.generation_execution_traces")), valid);
    assert.equal(statements.some(item => item.sql.startsWith("INSERT INTO public.autonomous_pipeline_stage_results")), valid);
    assert.equal(statements.at(-1).sql, valid ? "COMMIT" : "ROLLBACK");
  };
  await exercise(false);
  await exercise(true);
});
