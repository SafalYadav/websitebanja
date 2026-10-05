import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { computeIdempotencyKey, getIdempotentResult, setIdempotentResult } from "../src/lib/automation/idempotency.ts";

const id = "a".repeat(64);
test("automation idempotency never shares explicit keys across tenants or different request requirements", () => {
  const input = { businessName: "Store", style: "editorial" };
  const first = computeIdempotencyKey("same-explicit-key", input, "tenant-a");
  assert.equal(first, computeIdempotencyKey("same-explicit-key", input, "tenant-a"));
  const other = computeIdempotencyKey("same-explicit-key", input, "tenant-b");
  assert.notEqual(first, other);
  assert.notEqual(first, computeIdempotencyKey("same-explicit-key", { ...input, style: "bold" }, "tenant-a"));
  setIdempotentResult(first, { success: true, preview: { id: "tenant-a-preview" } });
  assert.equal(getIdempotentResult(other), null);
  assert.equal(getIdempotentResult(first).preview.id, "tenant-a-preview");
  assert.throws(() => computeIdempotencyKey("key", input, ""), /Trusted tenant/);
});
function observer(row) {
  const queries = [];
  const source = fs.readFileSync(new URL("../src/lib/intelligence/orchestration/researchObservation.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { exports: loaded.exports, module: loaded, Date,
    require: () => ({ getPool: () => ({ query: async (sql, parameters) => { queries.push({ sql, parameters }); return { rows: row ? [row] : [] }; } }) }) });
  return { ...loaded.exports, queries };
}
test("research observation scopes SQL by authenticated user or server automation tenant", async () => {
  const api = observer(null);
  assert.equal(await api.readResearchObservation(id, { kind: "user", userId: "owner" }), null);
  assert.match(api.queries[0].sql, /r\.request->>'userId'=\$2/);
  assert.equal(api.queries[0].parameters[1], "owner");
  assert.equal(await api.readResearchObservation(id, { kind: "automation", tenantId: "tenant" }), null);
  assert.match(api.queries[1].sql, /r\.tenant_id=\$2/);
  assert.equal(api.queries[1].parameters[1], "tenant");
  await assert.rejects(api.readResearchObservation(id, { kind: "automation", tenantId: "" }), /Trusted/);
  await assert.rejects(api.readResearchObservation("bad", { kind: "user", userId: "owner" }), /Invalid/);
  assert.equal(api.queries.length, 2);
});
test("only approved queued/expired work requests recovery; exhausted leases report terminal failure", async () => {
  const base = { research_status: "WAITING_HUMAN_APPROVAL", status: null, result: null, lease_until: null, attempts: 0 };
  assert.equal((await observer(base).readResearchObservation(id, { kind: "automation", tenantId: "tenant" })).shouldResume, false);
  assert.equal((await observer({ ...base, research_status: "APPROVED", status: "QUEUED" }).readResearchObservation(id, { kind: "automation", tenantId: "tenant" })).shouldResume, true);
  const expired = await observer({ ...base, research_status: "APPROVED", status: "GENERATING", lease_until: new Date(Date.now() - 1000), attempts: 2 }).readResearchObservation(id, { kind: "automation", tenantId: "tenant" });
  assert.equal(expired.status, "FAILED");
  assert.equal(expired.result.error.code, "RESUME_RETRY_EXHAUSTED");
});
test("READY research requests owned parent recovery without starting child generation again", async () => {
  const api = observer({ research_status: "APPROVED", status: "READY", lease_until: null, attempts: 1, result: null,
    continuation_pending: true, tenant_id: "sql-verified-owner" });
  const observed = await api.readResearchObservation(id, { kind: "automation", tenantId: "sql-verified-owner" });
  assert.equal(observed.shouldResume, false);
  assert.equal(observed.continuationTenant, "sql-verified-owner");
  assert.match(api.queries[0].sql, /c\.research_id=r\.id AND c\.tenant_id=r\.tenant_id/);
  assert.match(api.queries[0].sql, /c\.status='RUNNING' AND c\.lease_until<NOW\(\)/);
});
test("user and automation polling recover READY parent work using stored scope, without exposing recovery controls", async () => {
  for (const route of ["generation", "automation"]) {
    const callbacks = [], recovered = [];
    const overrides = {
      "next/server": { after: fn => callbacks.push(fn), NextResponse: { json: body => ({ body }) } },
      "@/lib/supabaseServer": { validateUserAuth: async () => ({ user: { id: "user" } }) },
      "@/lib/automation/auth": { isAuthorized: async () => true },
      "@/lib/adminAuth": { verifyAdminAuth: async () => ({ isAdmin: true, userId: "user" }) },
      "@/lib/intelligence/orchestration/researchObservation": { readResearchObservation: async () => ({
        shouldResume: false, status: "READY", result: { success: true }, continuationTenant: "stored-owner",
      }) },
      "@/lib/intelligence/orchestration/resumeApprovedResearch": { resumeApprovedResearch: async () => { throw new Error("Must not regenerate READY work"); } },
      "@/lib/intelligence/orchestration/pipelineResearchContinuation": { recoverPipelineContinuations: async identity => { recovered.push(identity); } },
    };
    const source = fs.readFileSync(new URL(`../src/app/api/${route}/research/[id]/route.ts`, import.meta.url), "utf8");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const loadedModule = { exports: {} };
    vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, process, require: name => overrides[name] });
    const response = await loadedModule.exports.GET({}, { params: Promise.resolve({ id }) });
    assert.equal(response.body.status, "READY");
    assert.equal(response.body.continuationTenant, undefined);
    assert.equal(callbacks.length, 1);
    await callbacks[0]();
    assert.equal(recovered[0].tenantId, "stored-owner");
    assert.equal(recovered[0].researchId, id);
  }
});
test("automation completion exposes handoff data but not AST, private research or traces", async () => {
  const api = observer({ research_status: "APPROVED", status: "READY", lease_until: null, attempts: 1, lead_id: "original-lead", audit_id: "original-audit",
    result: { success: true, websiteData: { employeeTrace: ["private"], sectionOrder: ["hero", "contact"], designStrategy: { visualArchetype: "retail" } },
      preview: { id: "prev_approved", url: "/preview/prev_approved", slug: "approved" }, businessContext: { businessName: "Store", domain: "retail", location: "City", semanticProfile: "private" },
      groundedProfile: "private", correlationId: "original-correlation", previewDetails: { qualityScore: 90 } } });
  const observation = await api.readResearchObservation(id, { kind: "automation", tenantId: "tenant" });
  assert.equal(observation.result.websiteData, undefined);
  assert.equal(observation.result.leadId, "original-lead");
  assert.equal(observation.result.preview.id, "prev_approved");
  assert.equal(observation.result.business.name, "Store");
  assert.ok(!JSON.stringify(observation).includes("private"));
});

for (const filename of ["WebsiteBanja_Local_Preview_Generator", "WebsiteBanja_Personalized_Preview_Generation"]) {
  test(`${filename}: pending review waits/polls without another POST; only READY result proceeds`, () => {
    const workflow = JSON.parse(fs.readFileSync(new URL(`../automation/n8n/${filename}.json`, import.meta.url), "utf8"));
    const node = name => workflow.nodes.find(item => item.name === name);
    assert.equal(node("Observe Approved Research").parameters.method, "GET");
    assert.equal(node("Wait for Human Review").parameters.unit, "minutes");
    assert.ok(node("Wait for Human Review").parameters.amount * 60 >= 65);
    const condition = node("Research Pending?").parameters.conditions.boolean[0].value1.slice(3, -2).trim();
    const pending = status => vm.runInNewContext(`(${condition})`, { $json: { researchId: id, status } });
    for (const status of ["research_required", "WAITING_HUMAN_APPROVAL", "QUEUED", "GENERATING"]) assert.equal(pending(status), true);
    for (const status of ["FAILED", "REJECTED", "QUALITY_BLOCKED", "READY"]) assert.equal(pending(status), false);
    const normalize = response => vm.runInNewContext(`(function(){${node("Normalize Research Result").parameters.jsCode}})()`, { $input: { first: () => ({ json: response }) } })[0].json;
    assert.equal(normalize({ researchId: id, status: "GENERATING", result: { success: true, preview: { id: "premature" } } }).success, false);
    assert.equal(normalize({ researchId: id, status: "READY", result: { success: true, preview: { id: "approved" }, leadId: "original" } }).leadId, "original");
    assert.equal(normalize({ researchId: id, status: "REJECTED", result: { success: false, error: { code: "REJECTED" } } }).success, false);
    const seen = new Set(), queue = ["Wait for Human Review"];
    while (queue.length) {
      const name = queue.shift(); if (seen.has(name)) continue; seen.add(name);
      if (node(name)?.parameters.method === "POST") assert.fail("Research loop must not generate again");
      for (const branch of workflow.connections[name]?.main || []) for (const edge of branch) queue.push(edge.node);
    }
  });
}
