import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { randomUUID } from "node:crypto";
const require = createRequire(import.meta.url);
function durableRunFixture() {
  const rows = new Map();
  return {
    registerAutonomousRun: async (run, key, identity) => {
      const id = JSON.stringify([run.tenantId, key || `internal:${run.pipelineRunId}`]);
      const old = rows.get(id);
      if (old) {
        if (old.identity !== identity) throw new Error('Idempotency key already belongs to a different pipeline request');
        return { created: false, run: structuredClone(old.run), revision: old.revision };
      }
      rows.set(id, { run: structuredClone(run), identity, revision: 0 });
      return { created: true, run: structuredClone(run), revision: 0 };
    },
    checkpointAutonomousRun: async (run, revision, token) => {
      const row = [...rows.values()].find(item => item.run.pipelineRunId === run.pipelineRunId && item.run.tenantId === run.tenantId);
      if (!row || row.revision !== revision || (row.token || token) && row.token !== token) throw new Error('Checkpoint conflict');
      row.run = structuredClone(run); row.revision++;
      return row.revision;
    },
    readAutonomousRun: async (id, tenant) => {
      const row = [...rows.values()].find(item => item.run.pipelineRunId === id && item.run.tenantId === tenant);
      return row ? structuredClone(row.run) : undefined;
    },
    listAutonomousRuns: async tenant => [...rows.values()].filter(row => row.run.tenantId === tenant).map(row => structuredClone(row.run)),
    claimAutonomousResearch: async (id, tenant) => {
      const row = [...rows.values()].find(item => item.run.pipelineRunId === id && item.run.tenantId === tenant);
      if (!row || row.token || !['research_required', 'waiting_research_approval'].includes(row.run.status)) return null;
      row.token = randomUUID();
      return { run: structuredClone(row.run), revision: row.revision, token: row.token };
    },
    assertAutonomousResearchLease: async (id, tenant, token) => {
      const row = [...rows.values()].find(item => item.run.pipelineRunId === id && item.run.tenantId === tenant);
      if (!row || row.token !== token || ['paused', 'cancelled'].includes(row.run.status)) throw new Error('Execution lease lost');
    },
    releaseAutonomousResearchLease: async (id, tenant, token) => {
      const row = [...rows.values()].find(item => item.run.pipelineRunId === id && item.run.tenantId === tenant);
      if (row?.token === token) delete row.token;
    },
  };
}
function compile(relative, imports) {
  const loadedModule = { exports: {} };
  const source = fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module: loadedModule, exports: loadedModule.exports, URL, require: id => Object.hasOwn(imports, id) ? imports[id] : require(id) });
  return loadedModule.exports;
}
function fixture(admin = { isAdmin: false }, identity = { tenantId: "tenant" }) {
  const calls = [];
  const owned = { tenantId: "tenant", pipelineRunId: "run", leads: { lead: {} } };
  const approvals = [{ tenantId: "tenant", pipelineRunId: "run", leadId: "lead", outreachId: "draft" }, { tenantId: "other", pipelineRunId: "other-run", outreachId: "other-draft" }];
  const types = compile("src/lib/intelligence/pipeline/pipelineTypes.ts", {});
  const api = compile("src/app/api/automation/pipeline/autonomous/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/lib/automation/automationApiIdentity": { authorizeAutomationTenant: async () => ({ identity }) },
    "@/lib/adminAuth": { verifyAdminAuth: async () => admin },
    "@/lib/intelligence/pipeline/humanApprovalAuthorization": { authorizeHumanApproval: async () => ({ kind: "authenticated_human_approval", userId: admin.userId }) },
    "@/lib/rateLimit": { checkMemoryRateLimit: () => ({ success: true }) },
    "@/lib/supabaseServer": { getClientIp: () => "fixture" },
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: value => value },
    "@/lib/intelligence/pipeline/pipelineTypes": types,
    "@/lib/intelligence/pipeline/autonomousPipeline": { autonomousPipeline: {
      getRun: id => id === "run" ? owned : { tenantId: "other", leads: { lead: {} } },
      readStoredRun: async (id, tenant) => id === 'run' && tenant === 'tenant' ? owned : undefined,
      listStoredRuns: async (limit, tenant) => { calls.push(["list", tenant]); return []; },
      startPipeline: async (criteria, options) => { calls.push(["start", criteria, options]); return { ...owned, stats: {}, status: "running" }; },
      executeApprovedSend: async (...args) => { calls.push(["send", ...args]); return { success: true }; },
    } },
    "@/lib/intelligence/pipeline/approvalGate": { approvalGate: {
      getStoredPendingApprovals: async tenant => approvals.filter(record => record.tenantId === tenant),
      formatTelegramApprovalRequest: record => ({ outreachId: record.outreachId }),
      getStoredApprovalRecord: async (id, tenant) => approvals.find(record => record.outreachId === id && record.tenantId === tenant),
      approveDraft: async (...args) => { calls.push(["approve", ...args]); return approvals[0]; },
      rejectDraft: async (...args) => { calls.push(["reject", ...args]); return approvals[0]; },
    } },
  });
  const post = body => api.POST({ json: async () => body });
  return { api, post, calls };
}
test("alternate autonomous reads cannot expose other tenant runs or pending approvals", async () => {
  const { api, calls } = fixture();
  const pending = await api.GET({ url: "https://fixture/?action=pending_approvals" });
  assert.equal(pending.body.count, 1);
  assert.equal(pending.body.pendingApprovals[0].outreachId, "draft");
  assert.equal((await api.GET({ url: "https://fixture/?runId=other-run" })).status, 404);
  await api.GET({ url: "https://fixture/" });
  assert.deepEqual(calls, [["list", "tenant"]]);
});
test("automation cannot impersonate human approvers; authenticated human ID replaces payload identities", async () => {
  const machine = fixture();
  for (const action of ["approve", "reject"]) assert.equal((await machine.post({ action, outreachId: "draft", approvedBy: "human_admin", rejectedBy: "owner" })).status, 403);
  assert.equal(machine.calls.length, 0);
  const human = fixture({ isAdmin: true, userId: "tenant" }, { tenantId: "tenant", userId: "tenant" });
  assert.equal((await human.post({ action: "approve", outreachId: "other-draft" })).status, 404);
  assert.equal((await human.post({ action: "approve", outreachId: "draft", approvedBy: "forged" })).status, 200);
  assert.equal(human.calls[0][2].userId, "tenant");
});
test("start derives tenant identity; send requires exact original owned approval/run/lead", async () => {
  const { post, calls } = fixture();
  assert.equal((await post({ action: "start", niche: "wine retail", location: "Delhi", tenantId: "other", userId: "forged" })).status, 200);
  assert.equal(calls[0][2].tenantId, "tenant"); assert.equal(calls[0][2].userId, undefined);
  assert.equal((await post({ action: "send", pipelineRunId: "other-run", leadId: "lead", outreachId: "draft" })).status, 400);
  assert.equal((await post({ action: "send", pipelineRunId: "run", leadId: "different", outreachId: "draft" })).status, 400);
  assert.equal((await post({ action: "terminal", pipelineRunId: "other-run", leadId: "lead", outcome: "WON" })).status, 404);
  assert.equal(calls.length, 1);
  assert.equal((await post({ action: "start", limit: -1 })).status, 400);
});
test("actual alternate send does not turn simulation or missing provider ID into delivered progress", async () => {
  let result = { success: true, isSimulated: true, messageId: "mock-only" }; let marked = 0;
  const pipeline = compile("src/lib/intelligence/pipeline/autonomousPipeline.ts", {
    "./autonomousRunStore": durableRunFixture(),
    "../orchestration/generationHold": compile("src/lib/intelligence/orchestration/generationHold.ts", {}),
    crypto: { randomUUID }, "./pipelineTypes": compile("src/lib/intelligence/pipeline/pipelineTypes.ts", {}),
    "./approvalGate": { approvalGate: {
      getStoredApprovalRecord: async (id, tenant) => ({ outreachId: id, tenantId: tenant, pipelineRunId: "run", leadId: "lead", status: "READY_TO_SEND" }),
      canSend: () => true, markSent: () => { marked++; },
    } },
    "../memory/memoryStore": { MemoryStore: {} },
    "@/lib/integrations/gmailEmailProvider": { GmailEmailProvider: { sendOutreachEmail: async () => result } },
    "@/lib/crm/crmRepository": { crmRepository: { getLeadCRMState: async () => null } },
    "@/lib/discovery/leadRepository": { leadRepository: {} },
    "@/lib/telemetry/agentTelemetry": { emitAgentEvent() {} },
    "../ops/opsToolExecutor": { opsToolExecutor: {} },
  }).autonomousPipeline;
  const run = { tenantId: "tenant", stats: { approved: 0, sent: 0, pendingApproval: 1 },
    leads: { lead: { currentStage: "HUMAN_APPROVAL", timeline: [] } } };
  pipeline.runs.set("run", run);
  const simulated = await pipeline.executeApprovedSend("run", "lead", "draft", { userId: "tenant" });
  assert.equal(simulated.isSimulated, true); assert.equal(marked, 0);
  assert.equal(run.stats.sent, 0); assert.equal(run.leads.lead.currentStage, "HUMAN_APPROVAL");
  assert.equal(run.leads.lead.sentAt, undefined);
  result = { success: true, isSimulated: false };
  assert.equal((await pipeline.executeApprovedSend("run", "lead", "draft", { userId: "tenant" })).success, false);
  assert.equal(marked, 0); assert.equal(run.stats.sent, 0);
});
test("alternate pipeline idempotency separates tenants, claims before discovery and rejects changed inputs", async () => {
  let discoveries = 0;
  const imports = {
    "./autonomousRunStore": durableRunFixture(),
    "../orchestration/generationHold": compile("src/lib/intelligence/orchestration/generationHold.ts", {}),
    crypto: { randomUUID }, "./pipelineTypes": compile("src/lib/intelligence/pipeline/pipelineTypes.ts", {}),
    "./approvalGate": { approvalGate: {} }, "../memory/memoryStore": { MemoryStore: {} },
    "@/lib/integrations/gmailEmailProvider": { GmailEmailProvider: class {} },
    "@/lib/crm/crmRepository": { crmRepository: {} }, "@/lib/discovery/leadRepository": { leadRepository: {} },
    "@/lib/telemetry/agentTelemetry": { emitAgentEvent() {} },
    "../ops/opsToolExecutor": { opsToolExecutor: { executeTool: async request => {
      if (request.tool === "discover_leads") { discoveries++; await Promise.resolve(); return { success: true, result: { leads: [] } }; }
      return { success: true, result: {} };
    } } },
  };
  const pipeline = compile("src/lib/intelligence/pipeline/autonomousPipeline.ts", imports).autonomousPipeline;
  const criteria = { niche: "wine retail", location: "Delhi" };
  const options = { tenantId: "tenant", idempotencyKey: "same" };
  const [first, duplicate] = await Promise.all([pipeline.startPipeline(criteria, options), pipeline.startPipeline(criteria, options)]);
  assert.equal(first.pipelineRunId, duplicate.pipelineRunId); assert.equal(discoveries, 1);
  assert.equal((await pipeline.startPipeline(criteria, options)).pipelineRunId, first.pipelineRunId);
  await assert.rejects(pipeline.startPipeline({ ...criteria, niche: "spa" }, options), /different pipeline request/);
  const other = await pipeline.startPipeline(criteria, { ...options, tenantId: "other" });
  assert.notEqual(other.pipelineRunId, first.pipelineRunId); assert.equal(discoveries, 2);
  const restarted = compile("src/lib/intelligence/pipeline/autonomousPipeline.ts", imports).autonomousPipeline;
  assert.equal(restarted.getRun(first.pipelineRunId), undefined);
  const restored = await restarted.readStoredRun(first.pipelineRunId, 'tenant');
  assert.equal(restored.pipelineRunId, first.pipelineRunId);
  assert.equal(restored.status, 'completed');
  assert.equal(await restarted.readStoredRun(first.pipelineRunId, 'other'), undefined);
  assert.equal((await restarted.startPipeline(criteria, options)).pipelineRunId, first.pipelineRunId);
  assert.equal(discoveries, 2);
  await assert.rejects(restarted.startPipeline({ ...criteria, niche: 'different' }, options), /different pipeline request/);
});
test('durable autonomous store scopes SQL, claims idempotency atomically and rejects stale checkpoints', async () => {
  const rows = new Map();
  const pool = { query: async (sql, values) => {
    if (sql.startsWith('INSERT')) {
      assert.match(sql, /ON CONFLICT\(tenant_id,idempotency_key\) DO NOTHING/);
      const [id, tenant, key, hash, data] = values;
      const scoped = JSON.stringify([tenant, key]);
      if (rows.has(scoped)) return { rowCount: 0, rows: [] };
      const row = { id, tenant, key, request_hash: hash, revision: 0, run_data: JSON.parse(data) };
      rows.set(scoped, row);
      return { rowCount: 1, rows: [structuredClone(row)] };
    }
    if (sql.startsWith('UPDATE')) {
      assert.match(sql, /run_id=\$1 AND tenant_id=\$2 AND revision=\$4/);
      const [id, tenant, data, revision] = values;
      const row = [...rows.values()].find(item => item.id === id && item.tenant === tenant && item.revision === revision);
      if (!row) return { rowCount: 0, rows: [] };
      row.run_data = JSON.parse(data); row.revision++;
      return { rowCount: 1, rows: [{ revision: row.revision }] };
    }
    if (sql.includes('idempotency_key=$2')) {
      assert.match(sql, /tenant_id=\$1 AND idempotency_key=\$2/);
      const row = rows.get(JSON.stringify(values));
      return { rowCount: row ? 1 : 0, rows: row ? [structuredClone(row)] : [] };
    }
    if (sql.includes('run_id=$1')) {
      assert.match(sql, /run_id=\$1 AND tenant_id=\$2/);
      const row = [...rows.values()].find(item => item.id === values[0] && item.tenant === values[1]);
      return { rowCount: row ? 1 : 0, rows: row ? [structuredClone(row)] : [] };
    }
    assert.match(sql, /WHERE tenant_id=\$1 ORDER BY created_at DESC,run_id DESC LIMIT \$2/);
    return { rows: [...rows.values()].filter(item => item.tenant === values[0]).map(item => structuredClone(item)) };
  } };
  const store = compile('src/lib/intelligence/pipeline/autonomousRunStore.ts', {
    '@/lib/db/queries': { getPool: () => pool },
    '@/lib/ai/router/modelConfig': { sanitizeErrorOutput: value => value },
  });
  const run = { pipelineRunId: 'run-one', tenantId: 'tenant', status: 'running' };
  const [created, duplicate] = await Promise.all([
    store.registerAutonomousRun(run, 'key', 'same-input'),
    store.registerAutonomousRun({ ...run, pipelineRunId: 'run-two' }, 'key', 'same-input'),
  ]);
  assert.equal(created.created, true); assert.equal(duplicate.created, false);
  assert.equal(duplicate.run.pipelineRunId, 'run-one');
  await assert.rejects(store.registerAutonomousRun(run, 'key', 'changed-input'), /different pipeline request/);
  assert.equal(await store.readAutonomousRun('run-one', 'other'), undefined);
  assert.equal(await store.checkpointAutonomousRun({ ...run, status: 'completed' }, 0), 1);
  await assert.rejects(store.checkpointAutonomousRun(run, 0), /checkpoint conflict/);
  assert.equal((await store.readAutonomousRun('run-one', 'tenant')).status, 'completed');
  assert.equal((await store.listAutonomousRuns('other')).length, 0);
  await assert.rejects(store.registerAutonomousRun({ ...run, tenantId: '' }, 'key', 'same-input'), /Trusted autonomous/);
  await assert.rejects(store.listAutonomousRuns('tenant', 101), /bounded run list/);
  const failed = compile('src/lib/intelligence/pipeline/autonomousRunStore.ts', {
    '@/lib/db/queries': { getPool: () => ({ query: async () => { throw new Error('Database unavailable'); } }) },
    '@/lib/ai/router/modelConfig': { sanitizeErrorOutput: value => value },
  });
  await assert.rejects(failed.readAutonomousRun('run-one', 'tenant'), /Database unavailable/);
});
test("alternate pipeline preserves research hold without failure counters, fabricated preview or outreach", async () => {
  for (const status of ["RESEARCH_REQUIRED", "WAITING_HUMAN_APPROVAL"]) {
    const calls = [];
    let observation = { status: "WAITING_HUMAN_APPROVAL", result: null };
    const hold = { status, researchId: "a".repeat(64), correlationId: "correlation" };
    const imports = {
      "./autonomousRunStore": durableRunFixture(),
      crypto: { randomUUID }, "./pipelineTypes": compile("src/lib/intelligence/pipeline/pipelineTypes.ts", {}),
      "../orchestration/generationHold": compile("src/lib/intelligence/orchestration/generationHold.ts", {}),
      "./approvalGate": { approvalGate: { registerDraft: async () => {} } }, "../memory/memoryStore": { MemoryStore: {} },
      "../orchestration/researchObservation": { readResearchObservation: async (id, observer) => {
        assert.equal(id, hold.researchId); assert.equal(observer.tenantId, "tenant");
        return observation;
      } },
      "@/lib/integrations/gmailEmailProvider": { GmailEmailProvider: class {} },
      "@/lib/crm/crmRepository": { crmRepository: { getLeadCRMState: async () => null, updateLeadStatus: async () => {} } },
      "@/lib/discovery/leadRepository": { leadRepository: {} },
      "@/lib/telemetry/agentTelemetry": { emitAgentEvent() {} },
      "../ops/opsToolExecutor": { opsToolExecutor: { executeTool: async request => {
        calls.push(request.tool);
        if (request.tool === "discover_leads") return { success: true, result: { leads: [{ leadId: "lead", businessName: "Unknown Niche", category: "unresolved", city: "Delhi", email: "owner@example.com" }] } };
        if (request.tool === "qualify_lead") return { success: true, result: { qualified: true, score: 90 } };
        if (request.tool === "audit_website") return { success: true, result: { websiteStatus: "missing", auditScore: 80 } };
        if (request.tool === "generate_preview") return { success: false, result: hold, errors: [] };
        if (request.tool === "validate_preview") { assert.equal(request.input.previewId, "reviewed-preview"); return { success: true, result: { passed: true, score: 90 } }; }
        if (request.tool === "create_outreach") return { success: true, result: { outreachId: "draft", subject: "Grounded preview", body: "Review your approved preview" } };
        if (["research_business", "report_to_ceo"].includes(request.tool)) return { success: true, result: {} };
        throw new Error(`Forbidden downstream work ${request.tool}`);
      } } },
    };
    const pipeline = compile("src/lib/intelligence/pipeline/autonomousPipeline.ts", imports).autonomousPipeline;
    const run = await pipeline.startPipeline({ niche: "unresolved", location: "Delhi" }, { tenantId: "tenant" });
    assert.equal(run.status, status === "RESEARCH_REQUIRED" ? "research_required" : "waiting_research_approval");
    assert.equal(run.currentStage, "RESEARCH");
    assert.equal(run.completedAt, undefined);
    assert.equal(run.stats.failed, 0); assert.equal(run.stats.previewsGenerated, 0); assert.equal(run.stats.outreachDrafted, 0);
    assert.equal(run.leads.lead.generationHold.researchId, hold.researchId);
    assert.equal(run.leads.lead.previewId, undefined);
    assert.equal(calls.includes("validate_preview"), false);
    await assert.rejects(pipeline.resumeResearch(run.pipelineRunId, "other"), /Owned/);
    await pipeline.resumeResearch(run.pipelineRunId, "tenant");
    assert.equal(calls.includes("validate_preview"), false);
    observation = { status: "READY", result: { success: true, leadId: "wrong", preview: { id: "reviewed-preview", url: "https://fixture/preview/reviewed-preview" } } };
    await assert.rejects(pipeline.resumeResearch(run.pipelineRunId, "tenant"), /original lead/);
    observation.result.leadId = "lead";
    const restarted = compile("src/lib/intelligence/pipeline/autonomousPipeline.ts", imports).autonomousPipeline;
    const competing = compile("src/lib/intelligence/pipeline/autonomousPipeline.ts", imports).autonomousPipeline;
    assert.equal(restarted.getRun(run.pipelineRunId), undefined);
    await Promise.all([restarted.resumeResearch(run.pipelineRunId, "tenant"), competing.resumeResearch(run.pipelineRunId, "tenant")]);
    await restarted.resumeResearch(run.pipelineRunId, "tenant");
    const completed = await pipeline.readStoredRun(run.pipelineRunId, 'tenant');
    assert.equal(completed.status, "waiting_approval");
    assert.equal(completed.stats.previewsGenerated, 1); assert.equal(completed.stats.outreachDrafted, 1);
    assert.equal(completed.leads.lead.generationHold, undefined);
    for (const tool of ["discover_leads", "qualify_lead", "generate_preview", "validate_preview", "create_outreach"]) {
      assert.equal(calls.filter(item => item === tool).length, 1, tool);
    }
  }
});

test('research execution fencing rejects parallel claims, stale checkpoints and stale release', async () => {
  const state = { run: { pipelineRunId: 'run', tenantId: 'tenant', status: 'research_required' }, token: null, expired: false, revision: 3 };
  const pool = { query: async (sql, values) => {
    const [id, tenant, token] = values;
    assert.equal(id, 'run');
    const missing = { rowCount: 0, rows: [] };
    if (tenant !== 'tenant') return missing;
    if (sql.includes('SET lease_token=$3')) {
      assert.match(sql, /run_id=\$1 AND tenant_id=\$2/);
      assert.match(sql, /IN \('research_required','waiting_research_approval'\)/);
      assert.match(sql, /lease_token IS NULL OR lease_until<=NOW\(\)/);
      if (state.token && !state.expired) return missing;
      if (!['research_required', 'waiting_research_approval'].includes(state.run.status)) return missing;
      state.token = token; state.expired = false;
      return { rowCount: 1, rows: [{ run_data: structuredClone(state.run), revision: state.revision, request_hash: 'hash' }] };
    }
    if (sql.includes('SET lease_token=NULL')) {
      assert.match(sql, /run_id=\$1 AND tenant_id=\$2 AND lease_token=\$3/);
      if (state.token === token) state.token = null;
      return { rowCount: 1, rows: [] };
    }
    if (sql.startsWith('SELECT')) {
      assert.match(sql, /lease_token=\$3 AND lease_until>NOW\(\)/);
      assert.match(sql, /IN \('research_required','waiting_research_approval'\)/);
      return state.token === token && !state.expired && ['research_required', 'waiting_research_approval'].includes(state.run.status)
        ? { rowCount: 1, rows: [{ run_id: id }] } : missing;
    }
    assert.match(sql, /\$5::text IS NULL AND lease_token IS NULL/);
    assert.match(sql, /lease_token=\$5 AND lease_until>NOW\(\)/);
    const revision = values[3], fence = values[4];
    if (revision !== state.revision || (fence ? state.token !== fence || state.expired : state.token !== null)) return missing;
    state.run = JSON.parse(values[2]); state.revision++;
    return { rowCount: 1, rows: [{ revision: state.revision }] };
  } };
  const store = compile('src/lib/intelligence/pipeline/autonomousRunStore.ts', {
    '@/lib/db/queries': { getPool: () => pool }, '@/lib/ai/router/modelConfig': { sanitizeErrorOutput: value => value },
  });
  const first = await store.claimAutonomousResearch('run', 'tenant');
  assert.ok(first.token);
  assert.equal(await store.claimAutonomousResearch('run', 'tenant'), null);
  assert.equal(await store.claimAutonomousResearch('run', 'other'), null);
  await assert.rejects(store.checkpointAutonomousRun(state.run, 3), /checkpoint conflict/);
  state.expired = true;
  await assert.rejects(store.assertAutonomousResearchLease('run', 'tenant', first.token), /lease lost/);
  const second = await store.claimAutonomousResearch('run', 'tenant');
  assert.notEqual(second.token, first.token);
  await assert.rejects(store.checkpointAutonomousRun(state.run, 3, first.token), /checkpoint conflict/);
  await store.releaseAutonomousResearchLease('run', 'tenant', first.token);
  await store.assertAutonomousResearchLease('run', 'tenant', second.token);
  assert.equal(await store.checkpointAutonomousRun(state.run, 3, second.token), 4);
  state.run.status = 'paused';
  await assert.rejects(store.assertAutonomousResearchLease('run', 'tenant', second.token), /lease lost/);
  await store.releaseAutonomousResearchLease('run', 'tenant', second.token);
  await assert.rejects(store.checkpointAutonomousRun(state.run, 4, second.token), /checkpoint conflict/);
  assert.equal(await store.claimAutonomousResearch('run', 'tenant'), null);
});
