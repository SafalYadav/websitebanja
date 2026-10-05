import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(relative, overrides, globals = {}) {
  const source = fs.readFileSync(new URL(`../src/lib/${relative}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, process, Date, console, ...globals,
    require: id => Object.hasOwn(overrides, id) ? overrides[id] : id === "@/lib/automation/pipelineExecutionLease" ? { pipelineExecutionFence: () => undefined } : id.startsWith("@/") || id.startsWith(".") ? {} : require(id) });
  return loaded.exports;
}
const run = { id: "run_owned", tenantId: "tenant", userId: "owner", status: "PAUSED", currentStage: "PREVIEW_GENERATION", criteria: {}, stats: {}, leads: {}, errors: [],
  pausedAt: "2026-10-04T00:00:00Z", error: "research pending", createdAt: "2026-10-04T00:00:00Z", updatedAt: "2026-10-04T00:00:00Z" };
test("PostgreSQL adapter contract preserves trusted identity and complete paused-run metadata", async () => {
  const queries = [];
  const row = { pipeline_run_id: run.id, tenant_id: "tenant", user_id: "owner", status: run.status, current_stage: run.currentStage, criteria: {}, stats: {}, leads: {}, errors: [],
    created_at: run.createdAt, updated_at: run.updatedAt, run_data: { ...run, tenantId: "snapshot-must-not-override-db-owner" } };
  const persistence = load("db/pipelineCrmPersistence.ts", { "./queries": { getPool: () => ({ query: async (sql, params) => {
    queries.push({ sql, params }); return { rowCount: 1, rows: sql.startsWith("SELECT") ? [row] : [] };
  } }) } });
  assert.equal(await persistence.savePipelineRunToPostgres(run), true);
  const insert = queries.find(item => item.sql.includes("INSERT INTO public.autonomous_pipeline_runs"));
  assert.equal(insert.params[10], "tenant");
  assert.equal(insert.params[11], "owner");
  assert.equal(JSON.parse(insert.params[12]).pausedAt, run.pausedAt);
  assert.match(insert.sql, /tenant_id IS NOT DISTINCT FROM EXCLUDED\.tenant_id/);
  const restored = await persistence.getPipelineRunFromPostgres(run.id, "tenant");
  assert.equal(restored.tenantId, "tenant");
  assert.equal(restored.userId, "owner");
  assert.equal(restored.pausedAt, run.pausedAt);
  assert.equal(restored.error, run.error);
  assert.match(queries.at(-1).sql, /tenant_id=\$2/);
  assert.equal(queries.at(-1).params[1], "tenant");
  await persistence.listPipelineRunsFromPostgres("tenant");
  assert.match(queries.at(-1).sql, /tenant_id=\$1/);
  assert.equal(queries.at(-1).params[0], "tenant");
});
const responses = { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
test("resume claim contract is tenant-scoped and conditional; duplicate callers cannot both claim", async () => {
  let status = "PAUSED";
  const statements = [];
  const lease = load("automation/pipelineExecutionLease.ts", { "@/lib/db/queries": { getPool: () => ({ query: async (sql, params) => {
    statements.push({ sql, params });
    if (sql.startsWith("UPDATE public.autonomous_pipeline_runs")) {
      if (params[1] !== "tenant" || status !== "PAUSED") return { rowCount: 0, rows: [] };
      status = "RUNNING";
      return { rowCount: 1, rows: [{ pipeline_run_id: run.id }] };
    }
    return { rowCount: 1, rows: sql.startsWith("SELECT") ? [{ pipeline_run_id: run.id, tenant_id: "tenant", status, criteria: {}, stats: {}, leads: {}, errors: [] }] : [] };
  } }) } });
  await assert.rejects(lease.claimPipelineExecution({ ...run, tenantId: "other" }, ["PAUSED"]), /ownership/);
  const results = await Promise.allSettled([lease.claimPipelineExecution(run, ["PAUSED"]), lease.claimPipelineExecution(run, ["PAUSED"])]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(results.filter(result => result.status === "rejected").length, 1);
  const claim = statements.find(statement => statement.sql.startsWith("UPDATE public.autonomous_pipeline_runs"));
  assert.match(claim.sql, /tenant_id=\$2 AND status=ANY\(\$4::text\[\]\)/);
});
test("shared automation identity requires auth and never derives a tenant from request body", async () => {
  const shared = (authorized, admin, env) => load("automation/automationApiIdentity.ts", {
    "next/server": responses, "./auth": { isAuthorized: async () => authorized },
    "@/lib/adminAuth": { verifyAdminAuth: async () => admin },
  }, { process: { env } });
  assert.equal((await shared(false, { isAdmin: false }, {}).authorizeAutomationTenant({})).response.status, 401);
  assert.equal((await shared(true, { isAdmin: false }, {}).authorizeAutomationTenant({})).response.status, 403);
  const server = await shared(true, { isAdmin: false }, { AUTOMATION_TENANT_ID: "server-tenant" }).authorizeAutomationTenant({ tenantId: "forged" });
  assert.equal(server.identity.tenantId, "server-tenant");
  assert.equal(server.identity.userId, undefined);
  const admin = await shared(true, { isAdmin: true, userId: "authenticated-admin" }, { AUTOMATION_TENANT_ID: "server-tenant" }).authorizeAutomationTenant({});
  assert.equal(admin.identity.tenantId, "authenticated-admin");
});
test("pipeline list/read/pause/cancel/retry route contracts use trusted identity and ignore forged body user", async () => {
  const calls = [];
  const types = load("automation/pipelineTypes.ts", {});
  const overrides = {
    "next/server": responses,
    "@/lib/automation/automationApiIdentity": { authorizeAutomationTenant: async () => ({ identity: { tenantId: "trusted", userId: "verified-user" } }) },
    "@/lib/automation/pipelineTypes": types,
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: value => String(value) },
    "@/lib/automation/pipelineQueue": { PipelineQueue: {
      listPipelineRuns: async tenant => { calls.push(["list", tenant]); return []; },
      getPipelineRun: async (id, tenant) => { calls.push(["get", id, tenant]); return run; },
    } },
    "@/lib/automation/pipelineOrchestrator": { PipelineOrchestrator: {
      getHandoffContract: async (id, tenant) => { calls.push(["handoff", id, tenant]); return {}; },
      pauseRun: async (id, tenant) => { calls.push(["pause", id, tenant]); return run; },
      cancelRun: async (id, reason, tenant) => { calls.push(["cancel", id, reason, tenant]); return run; },
      retryFailedJobs: async (id, user, tenant) => { calls.push(["retry", id, user, tenant]); return run; },
      simulateReplyForRunLead: async (id, lead, message, channel, user, tenant) => { calls.push(["reply", id, lead, message, channel, user, tenant]); return {}; },
    } },
  };
  const req = { json: async () => ({ runId: run.id, userId: "forged", tenantId: "victim", reason: "Stop", leadId: "lead", messageText: "Hello" }) };
  const context = { params: Promise.resolve({ runId: run.id }) };
  for (const [file, method] of [["route.ts", "GET"], ["[runId]/route.ts", "GET"], ["pause/route.ts", "POST"], ["cancel/route.ts", "POST"], ["[runId]/retry/route.ts", "POST"], ["[runId]/simulate-reply/route.ts", "POST"]]) {
    const api = load(`../app/api/automation/pipeline/${file}`, overrides);
    assert.equal((await api[method](req, context)).status, 200);
  }
  assert.ok(calls.every(call => call.at(-1) === "trusted"));
  assert.equal(calls.find(call => call[0] === "retry")[2], "verified-user");
  assert.ok(!JSON.stringify(calls).includes("forged"));
  assert.equal(calls.find(call => call[0] === "reply")[5], "verified-user");
  const reply = load("../app/api/automation/pipeline/[runId]/simulate-reply/route.ts", overrides);
  const before = calls.length;
  assert.equal((await reply.POST({ json: async () => ({ leadId: "lead", messageText: "Hello", channel: "whatsapp" }) }, context)).status, 400);
  assert.equal(calls.length, before);
});
test("governed persistence rejects conflicting owner and unavailable database instead of acknowledging fallback", async () => {
  const conflict = load("db/pipelineCrmPersistence.ts", { "./queries": { getPool: () => ({ query: async () => ({ rows: [], rowCount: 0 }) }) } });
  await assert.rejects(conflict.savePipelineRunToPostgres(run), /ownership or execution fence validation failed/);
  const unavailable = load("db/pipelineCrmPersistence.ts", { "./queries": { getPool: () => ({ query: async sql => {
    if (sql.startsWith("SELECT")) throw new Error("Database unavailable");
    return { rows: [], rowCount: 1 };
  } }) } });
  await assert.rejects(unavailable.getPipelineRunFromPostgres(run.id, "tenant"), /Database unavailable/);
  await assert.rejects(unavailable.listPipelineRunsFromPostgres("tenant"), /Database unavailable/);
});
test("tenant-scoped queue reads never fall back to shared scratch data after database denial", async () => {
  const queue = load("automation/pipelineQueue.ts", {
    "fs": { existsSync: () => { throw new Error("Shared scratch must not be read"); } },
    "@/lib/db/pipelineCrmPersistence": { getPipelineRunFromPostgres: async () => { throw new Error("Scoped database unavailable"); }, listPipelineRunsFromPostgres: async () => { throw new Error("Scoped database unavailable"); } },
  }).PipelineQueue;
  await assert.rejects(queue.getPipelineRun(run.id, "tenant"), /Scoped database unavailable/);
  await assert.rejects(queue.listPipelineRuns("tenant"), /Scoped database unavailable/);
});
