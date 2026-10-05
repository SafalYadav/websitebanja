import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
function loadSource(relative, overrides = {}) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(compiled, { exports: loadedModule.exports, module: loadedModule, Buffer, process, Date, Set, Error, URL,
    require: id => Object.hasOwn(overrides, id) ? overrides[id]
      : id === "./pipelineResearchContinuation" ? loadSource("src/lib/intelligence/orchestration/pipelineResearchContinuation.ts", overrides)
      : ["./approvedKnowledgeBinding", "@/lib/intelligence/orchestration/approvedKnowledgeBinding"].includes(id) ? loadSource("src/lib/intelligence/orchestration/approvedKnowledgeBinding.ts", overrides)
      : ["./canonicalPayloadHash", "../policies/canonicalPayloadHash"].includes(id) ? loadSource("src/lib/intelligence/policies/canonicalPayloadHash.ts", overrides)
      : require(id) }, { filename: relative });
  return loadedModule.exports;
}
const semantics = loadSource("src/lib/intelligence/semantic/businessSemanticReasoner.ts");
const bindings = loadSource("src/lib/intelligence/orchestration/approvedKnowledgeBinding.ts");
function approvedKnowledgeFixture() {
  const row = { id: "research", tenant_id: "owner", version: 1, status: "APPROVED", active: true,
    reviewed_by: "owner", approved_by: "owner", knowledge_version_id: "7", concept_key: "wine_retail:liquor_store",
    regression_report: { passed: true }, concept, dossier: { reusableKnowledge: concept, offerings: [{ title: "Wine", evidenceIds: ["google-type"] }] },
    agent_trace: [{ agent: "ceo", status: "completed", output: { domain: "wine_retail" } }, { agent: "boss", status: "completed", output: { approved: true } }] };
  return { ...row, reviewed_payload_hash: bindings.researchReviewHash(row) };
}

test("approved learning consumption rejects missing, changed or cross-tenant human evidence", () => {
  const original = approvedKnowledgeFixture();
  const binding = bindings.approvedKnowledgeBinding(original);
  assert.equal(binding.versionId, "7");
  for (const changed of [
    { ...original, active: false }, { ...original, reviewed_payload_hash: null },
    { ...original, tenant_id: "other" }, { ...original, approved_by: "ceo" },
    { ...original, status: "WAITING_HUMAN_APPROVAL" },
    { ...original, regression_report: { passed: false } },
    { ...original, dossier: { ...original.dossier, offerings: [{ title: "Hotel rooms" }] } },
    { ...original, concept: { ...original.concept, businessModel: "Hotel booking" } },
  ]) assert.throws(() => bindings.approvedKnowledgeBinding(changed), /Fresh human review/);
});

test("knowledge rollback rechecks reviewed active version under the concept lock before writes", async () => {
  const calls = [];
  const route = loadSource("src/app/api/admin/intelligence/knowledge/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/lib/adminAuth": { verifyAdminAuth: async () => ({ isAdmin: true, userId: "owner" }) },
    "@/lib/intelligence/orchestration/semanticKnowledge": { ensureKnowledgeTables: async () => {},
      KnowledgeConceptSchema: { parse: value => value }, evaluateKnowledgeRegression: () => ({ passed: true }) },
    "@/lib/db/queries": { getPool: () => ({ connect: async () => ({ release: () => {}, query: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.startsWith("SELECT *")) return { rows: [{ id: "7", tenant_id: "owner", concept_key: "wine_retail:liquor_store", approved_by: "owner", regression_report: { passed: true }, concept }] };
      if (sql.includes("FOR UPDATE OF k")) return { rows: [{ ...approvedKnowledgeFixture(), active: false }] };
      if (sql.includes("AND active")) return { rows: [{ id: "9" }] };
      return { rows: [] };
    } }) }) },
  });
  const request = expectedActiveVersionId => ({ json: async () => ({ versionId: "7", expectedActiveVersionId }) });
  const stale = await route.POST(request("8"));
  assert.equal(stale.status, 409); assert.equal(stale.body.code, "STALE_KNOWLEDGE_ROLLBACK");
  assert.ok(calls.some(call => call.sql.includes("pg_advisory_xact_lock")));
  assert.ok(calls.every(call => !/^(UPDATE|INSERT|COMMIT)/.test(call.sql)));
  calls.length = 0;
  const accepted = await route.POST(request("9"));
  assert.equal(accepted.status, 200);
  assert.ok(calls.some(call => call.sql === "COMMIT"));
  const firstWrite = calls.findIndex(call => call.sql.startsWith("UPDATE"));
  const checkedActive = calls.findIndex(call => call.sql.startsWith("SELECT id") && call.sql.includes("AND active"));
  assert.ok(checkedActive < firstWrite);
});

test("actual governance hash includes nested evidence and is invariant to object key order", () => {
  const { hashActionPayload } = loadSource("src/lib/intelligence/policies/policyEngine.ts", {
    "./governanceTypes": loadSource("src/lib/intelligence/policies/governanceTypes.ts"),
    "./governanceAuditLog": { GovernanceAuditLog: { getInstance: () => ({}) }, governanceAuditLog: {} },
    "./governanceApprovalStore": { GovernanceApprovalStore: { getInstance: () => ({}) }, governanceApprovalStore: {} },
  });
  const original = { action: "promote", evidence: [{ source: "official", confidence: .95 }], benchmark: { score: 95, gates: { accessibility: true } } };
  assert.equal(hashActionPayload(original), hashActionPayload({ benchmark: { gates: { accessibility: true }, score: 95 }, evidence: [{ confidence: .95, source: "official" }], action: "promote" }));
  for (const changed of [
    { ...original, evidence: [{ source: "unverified", confidence: .95 }] },
    { ...original, benchmark: { score: 95, gates: { accessibility: false } } },
    { ...original, evidence: [{ source: "official", confidence: .1 }] },
  ]) assert.notEqual(hashActionPayload(original), hashActionPayload(changed));
  assert.throws(() => hashActionPayload(undefined), /serializable/);
});

test("private generation trace listings and detailed reads always use authenticated tenant scope", async () => {
  const calls = [];
  const route = loadSource("src/app/api/admin/intelligence/generation-traces/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/lib/adminAuth": { verifyAdminAuth: async () => ({ isAdmin: true, userId: "owner" }) },
    "@/lib/db/queries": { getPool: () => ({ query: async (sql, values) => { calls.push({ sql, values }); return { rows: [] }; } }) },
  });
  assert.equal((await route.GET({ url: "https://unit.test/traces?tenantId=other" })).status, 200);
  assert.match(calls[0].sql, /WHERE tenant_id=\$1/); assert.equal(calls[0].values[0], "owner");
  assert.equal((await route.GET({ url: "https://unit.test/traces?id=cgen_123_abc&tenantId=other" })).status, 200);
  assert.match(calls[1].sql, /WHERE id=\$1 AND tenant_id=\$2/); assert.equal(calls[1].values[1], "owner");
  assert.equal((await route.GET({ url: "https://unit.test/traces?id=invalid" })).status, 400);
  assert.equal(calls.length, 2);
});

test("canonical research review and knowledge rollback scope every lookup to authenticated owner", async () => {
  for (const kind of ["research", "knowledge"]) {
    const calls = []; const auth = { isAdmin: true, userId: "owner" };
    let foreignResponse = false;
    let staleResponse = false;
    const query = async (sql, values = []) => {
      calls.push({ sql, values });
      if (sql.startsWith("SELECT *")) {
        assert.match(sql, /tenant_id=\$2/);
        assert.equal(values[1], "owner");
        return { rows: staleResponse ? [{ id: "foreign", tenant_id: "owner", status: "WAITING_HUMAN_APPROVAL", version: 2, dossier: { evidence: "changed" }, agent_trace: [] }]
          : foreignResponse ? [{ tenant_id: "other" }] : [] };
      }
      if (sql.startsWith("SELECT")) {
        assert.match(sql, /tenant_id=\$1/);
        assert.equal(values[0], "owner");
      }
      return { rows: [] };
    };
    const route = loadSource(`src/app/api/admin/intelligence/${kind}/route.ts`, {
      "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) }, after: () => { throw new Error("Unauthorized resume"); } },
      "@/lib/adminAuth": { verifyAdminAuth: async () => auth },
      "@/lib/db/queries": { getPool: () => ({ query, connect: async () => ({ query, release: () => {} }) }) },
      "@/lib/intelligence/orchestration/resumeApprovedResearch": { resumeApprovedResearch: () => { throw new Error("Unauthorized resume"); } },
      "@/lib/intelligence/orchestration/researchGovernance": { ensureResearchTables: async () => {}, ResearchDossierSchema: { parse: () => { throw new Error("Unauthorized parsing"); } } },
      "@/lib/intelligence/orchestration/semanticKnowledge": { ensureKnowledgeTables: async () => {}, KnowledgeConceptSchema: {}, evaluateKnowledgeRegression: () => { throw new Error("Unauthorized evaluation"); }, verifyReusableKnowledge: () => { throw new Error("Unauthorized activation"); } },
    });
    assert.equal((await route.GET({})).status, 200);
    const body = kind === "research" ? { id: "foreign", action: "approve", tenantId: "other", expectedReviewHash: "a".repeat(64) } : { versionId: "7", tenantId: "other", expectedActiveVersionId: "8" };
    for (const foreign of [false, true]) {
      foreignResponse = foreign;
      const response = await route.POST({ json: async () => body });
      assert.equal(response.status, 404);
    }
    if (kind === "research") {
      staleResponse = true;
      const stale = await route.POST({ json: async () => body });
      assert.equal(stale.status, 409);
      assert.equal(stale.body.code, "STALE_RESEARCH_REVIEW");
      assert.equal((await route.POST({ json: async () => ({ id: "foreign", action: "approve" }) })).status, 400);
    }
    assert.ok(calls.every(call => !/^(INSERT|UPDATE|COMMIT)/.test(call.sql)));
    assert.equal((await route.POST({ json: async () => { throw new Error("Invalid JSON"); } })).status, 400);
    auth.isAdmin = false;
    assert.equal((await route.GET({})).status, 403);
    assert.equal((await route.POST({ json: async () => body })).status, 403);
  }
});

test("legacy learning benchmark cannot turn defaults or simulated scores into executed quality gates", () => {
  const engine = loadSource("src/lib/intelligence/learningLoop/learningRegressionBenchmark.ts").LearningRegressionBenchmark.getInstance();
  for (const options of [undefined, { simulatedCategoryScores: { restaurant: 100, spa: 100 } }, { forceFailure: false }]) {
    const candidate = { status: "REGRESSION_PENDING", domain: "wine_retail" };
    const result = engine.runBenchmark(candidate, options);
    assert.equal(result.benchmarkResult.status, "unavailable");
    assert.equal(result.benchmarkResult.passed, false);
    assert.equal(result.benchmarkResult.categoriesTested, 0);
    assert.equal(Object.values(result.benchmarkResult.qualityGateChecks).some(Boolean), false);
    assert.equal(result.candidate.status, "REGRESSION_PENDING");
  }
});

test("legacy strategy heuristics cannot auto-approve or directly activate/rollback learning", async () => {
  const writes = [];
  const strategy = { strategyId: "legacy", status: "DRAFT", domain: "generation", avoidPatterns: [] };
  const manager = loadSource("src/lib/intelligence/learning/strategyManager.ts", {
    "../memory/memoryStore": { MemoryStore: { getInstance: () => ({ getStrategy: async () => strategy, saveStrategy: async item => writes.push(item) }) } },
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: text => text },
  }).StrategyManager.getInstance();
  const result = await manager.runRegressionTests("legacy");
  assert.equal(result.status, "unavailable"); assert.equal(result.passed, false);
  assert.equal(result.categoriesTested, 0); assert.equal(strategy.status, "DRAFT");
  await assert.rejects(manager.activateStrategy("legacy"), /governed candidate/);
  await assert.rejects(manager.rollbackStrategy("generation"), /authenticated governed/);
  assert.equal(writes.length, 0);
});

function governanceFixture() {
  const auth = { isAdmin: true, userId: "owner" };
  const authority = loadSource("src/lib/intelligence/pipeline/humanApprovalAuthorization.ts", {
    "@/lib/adminAuth": { verifyAdminAuth: async () => auth },
  });
  const { createHash } = require("node:crypto");
  const hashActionPayload = payload => createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const store = loadSource("src/lib/intelligence/policies/governanceApprovalStore.ts", {
    "./policyEngine": { hashActionPayload }, "../pipeline/humanApprovalAuthorization": authority,
  }).governanceApprovalStore;
  const audit = loadSource("src/lib/intelligence/policies/governanceAuditLog.ts").governanceAuditLog;
  const decisions = [];
  const route = loadSource("src/app/api/admin/intelligence/governance/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/lib/adminAuth": { verifyAdminAuth: async () => auth },
    "@/lib/rateLimit": { checkMemoryRateLimit: () => ({ success: true }) },
    "@/lib/supabaseServer": { getClientIp: () => "unit" },
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: value => value },
    "@/lib/intelligence/pipeline/humanApprovalAuthorization": authority,
    "@/lib/intelligence/policies/governanceApprovalStore": { governanceApprovalStore: store },
    "@/lib/intelligence/policies/governanceAuditLog": { governanceAuditLog: audit },
    "@/lib/intelligence/policies/policyEngine": { policyEngine: { listRules: () => [], evaluateAction: input => { decisions.push(input); return input; } } },
  });
  const request = body => ({ json: async () => body });
  return { auth, authority, store, audit, route, decisions, request, hashActionPayload };
}

test("legacy governance API derives all authority from human auth and never lists or mutates another tenant", async () => {
  const { auth, store, audit, route, request, decisions } = governanceFixture();
  const other = store.createApproval({ action: "send", requestedBy: "agent", tenantId: "other", actionPayload: { draft: "other" } });
  const legacy = store.createApproval({ action: "send", requestedBy: "agent", actionPayload: {} });
  const created = await route.POST(request({ action: "create_approval", tool: "send", requestedBy: "ceo", tenantId: "other", actionPayload: { draft: "owned" } }));
  assert.equal(created.status, 200);
  const own = created.body.record;
  assert.equal(own.tenantId, "owner"); assert.equal(own.requestedBy, "owner");
  for (const action of ["approve", "reject"]) {
    for (const approvalId of [other.approvalId, legacy.approvalId, "missing"]) {
      const response = await route.POST(request({ action, approvalId, approvedBy: "owner", tenantId: "other" }));
      assert.equal(response.status, 404);
    }
  }
  assert.equal(store.getRecord(other.approvalId).status, "PENDING");
  const approved = await route.POST(request({ action: "approve", approvalId: own.approvalId, approvedBy: "invented-admin", tenantId: "other" }));
  assert.equal(approved.status, 200); assert.equal(approved.body.record.approvedBy, "owner");
  await route.POST(request({ action: "evaluate_action", tool: "send", authorityLevel: "WRITE_EXTERNAL", tenantId: "other", requestingAgent: "ceo" }));
  assert.equal(decisions[0].tenantId, "owner"); assert.equal(decisions[0].requestingAgent, "owner");
  for (const tenantId of ["owner", "other", null]) audit.record({ action: "unit", requestingAgent: "agent", decision: "BLOCK", authorityLevel: "WRITE_EXTERNAL", riskLevel: "high", policyId: "unit", reason: "unit", tenantId, requiresHumanApproval: true });
  const listed = await route.GET({});
  assert.equal(listed.body.governance.recentApprovalRecords.length, 1);
  assert.equal(listed.body.governance.recentDecisions.length, 1);
  assert.equal(listed.body.governance.auditSummary.total, 1);
  assert.equal(listed.body.governance.persistence, "process_local");
  assert.equal((await route.POST(request({ action: "evaluate_action", tool: "send", authorityLevel: "UNLIMITED" }))).status, 400);
  auth.isAdmin = false;
  assert.equal((await route.POST(request({ action: "approve", approvalId: own.approvalId }))).status, 403);
  assert.equal((await route.GET({})).status, 403);
});

test("legacy governance store rejects string or serialized approval proof, missing scope and duplicate consumption", async () => {
  const { authority, store } = governanceFixture();
  const payload = { draft: "reviewed" };
  const record = store.createApproval({ action: "send", requestedBy: "agent", tenantId: "owner", actionPayload: payload });
  for (const authorization of [undefined, "human", { kind: "authenticated_human_approval" }]) {
    assert.throws(() => store.approve({ approvalId: record.approvalId, approvedBy: "owner", tenantId: "owner", authorization }), /Verified human/);
    assert.throws(() => store.reject({ approvalId: record.approvalId, rejectedBy: "owner", tenantId: "owner", authorization }), /Verified human/);
  }
  const proof = await authority.authorizeHumanApproval({}, "owner");
  assert.throws(() => store.approve({ approvalId: record.approvalId, approvedBy: "other", tenantId: "owner", authorization: proof }), /identity mismatch/);
  assert.throws(() => store.reject({ approvalId: record.approvalId, rejectedBy: "owner", tenantId: "other", authorization: proof }), /Verified human/);
  assert.equal(store.listPending().length, 0); assert.equal(store.listRecords().length, 0);
  store.approve({ approvalId: record.approvalId, approvedBy: "owner", tenantId: "owner", authorization: proof });
  assert.equal(store.validateForExecution({ approvalId: record.approvalId, actionPayload: payload }).valid, false);
  assert.equal(store.validateForExecution({ approvalId: record.approvalId, actionPayload: payload, tenantId: "other" }).valid, false);
  assert.equal(store.validateForExecution({ approvalId: record.approvalId, actionPayload: { draft: "changed" }, tenantId: "owner" }).valid, false);
  assert.equal(store.validateForExecution({ approvalId: record.approvalId, actionPayload: payload, tenantId: "owner" }).valid, true);
  assert.throws(() => store.consume(record.approvalId), /Valid owned/);
  assert.throws(() => store.consume(record.approvalId, "other"), /Valid owned/);
  store.consume(record.approvalId, "owner");
  assert.throws(() => store.consume(record.approvalId, "owner"), /Valid owned/);
});

test("actual production approval requires a human capability and cannot swallow governance rejection", async () => {
  const { authority } = governanceFixture();
  const writes = []; const events = [];
  const job = { jobId: "job", tenantId: "owner", state: "WAITING_FOR_APPROVAL", approvalId: "approval" };
  const singleton = value => ({ getInstance: () => value });
  const production = loadSource("src/lib/intelligence/production/productionOrchestrator.ts", {
    "./productionJobStore": { ProductionJobStore: singleton({ getJob: () => job, updateJob: (...args) => writes.push(args), transitionState: (...args) => { writes.push(args); return job; } }) },
    "@/lib/telemetry/agentTelemetry": { emitAgentEvent: event => events.push(event) },
    "../grounding/groundedIntelligenceService": { GroundedIntelligenceService: singleton({}) },
    "../grounding/groundedAssetSelector": { GroundedAssetSelector: singleton({}) },
    "../grounding/groundedWebsiteGenerator": {},
    "../orchestration/canonicalGenerationOrchestrator": {},
    "../validation/validationOrchestrator": { ValidationOrchestrator: singleton({}) },
    "../validation/repairCoordinator": { RepairCoordinator: singleton({}) },
    "../policies/governanceApprovalStore": { GovernanceApprovalStore: singleton({ approve: () => { throw new Error("Governance rejection"); }, reject: () => { throw new Error("Governance rejection"); } }) },
    "../pipeline/humanApprovalAuthorization": authority,
    "../learningLoop/learningLoopOrchestrator": { LearningLoopOrchestrator: singleton({}) },
    "@/lib/crm/crmRepository": {},
  }).autonomousProductionOrchestrator;
  await assert.rejects(production.approveJob("job", "owner", "owner"), /Verified human/);
  const proof = await authority.authorizeHumanApproval({}, "owner");
  await assert.rejects(production.approveJob("job", "owner", "owner", proof), /Governance rejection/);
  await assert.rejects(production.rejectJob("job", "owner", "Reject", "owner", proof), /Governance rejection/);
  assert.equal(writes.length, 0); assert.equal(events.length, 0);
});

test("actual strategy promotion binds human approval to the exact candidate, evidence and benchmark", async () => {
  for (const mutation of ["valid", "statement", "evidence", "benchmark", "domain", "candidate", "other-approval", "missing-proof"]) {
    const { authority, store, hashActionPayload } = governanceFixture();
    const persisted = [];
    const coordinator = loadSource("src/lib/intelligence/learningLoop/strategyPromotionCoordinator.ts", {
      "../policies/governanceApprovalStore": { GovernanceApprovalStore: { getInstance: () => store } },
      "../policies/policyEngine": { hashActionPayload },
      "../pipeline/humanApprovalAuthorization": authority,
      "../memory/memoryStore": { MemoryStore: { getInstance: () => ({ saveStrategy: async value => persisted.push(value) }) } },
    }).StrategyPromotionCoordinator.getInstance();
    const candidate = { id: "candidate", lessonId: "lesson", tenantId: "owner", status: "APPROVAL_PENDING", domain: "wine_retail",
      statement: "Ground verified retail facts", confidence: .95, evidence: [{ id: "evidence", description: "Verified category" }],
      evaluationReport: { canProgress: true }, regressionBenchmark: { passed: true, overallScore: 95 } };
    const requested = coordinator.requestPromotionApproval({ candidate, requestedBy: "research-agent" });
    let approvalId = requested.approvalId;
    if (mutation === "statement") candidate.statement = "Invent specialist claims";
    if (mutation === "evidence") candidate.evidence[0].description = "Unverified description";
    if (mutation === "benchmark") candidate.regressionBenchmark.overallScore = 100;
    if (mutation === "domain") candidate.domain = "hospitality";
    if (mutation === "candidate") candidate.id = "different";
    if (mutation === "other-approval") approvalId = store.createApproval({ action: "send", requestedBy: "agent", tenantId: "owner", actionPayload: {} }).approvalId;
    const proof = mutation === "missing-proof" ? undefined : await authority.authorizeHumanApproval({}, "owner");
    const execute = () => coordinator.promoteWithApproval({ candidate, approvalId, approvedBy: "owner", tenantId: "owner", authorization: proof });
    if (mutation === "valid") {
      const result = await execute();
      assert.equal(result.candidate.status, "PROMOTED"); assert.equal(persisted.length, 1);
      assert.equal(store.getRecord(approvalId).consumed, true);
    } else {
      await assert.rejects(execute(), /fresh approval|Verified human/);
      assert.equal(persisted.length, 0); assert.equal(candidate.status, "APPROVAL_PENDING");
      assert.equal(store.getRecord(approvalId).status, "PENDING");
    }
  }
});

test("same-domain strategies and rollback remain independent across authenticated tenants", async () => {
  const { auth, authority, store, hashActionPayload } = governanceFixture();
  const persisted = [];
  const coordinator = loadSource("src/lib/intelligence/learningLoop/strategyPromotionCoordinator.ts", {
    "../policies/governanceApprovalStore": { GovernanceApprovalStore: { getInstance: () => store } },
    "../policies/policyEngine": { hashActionPayload },
    "../pipeline/humanApprovalAuthorization": authority,
    "../memory/memoryStore": { MemoryStore: { getInstance: () => ({ saveStrategy: async value => persisted.push(value) }) } },
  }).StrategyPromotionCoordinator.getInstance();
  const promote = async (tenantId, id) => {
    auth.userId = tenantId;
    const authorization = await authority.authorizeHumanApproval({}, tenantId);
    const candidate = { id, lessonId: id, tenantId, status: "APPROVAL_PENDING", domain: "wine_retail",
      statement: `${tenantId} verified directive`, evidence: [], regressionBenchmark: { passed: true, overallScore: 95 } };
    const { approvalId } = coordinator.requestPromotionApproval({ candidate, requestedBy: "agent" });
    return coordinator.promoteWithApproval({ candidate, approvalId, approvedBy: tenantId, tenantId, authorization });
  };
  const own = await promote("owner", "candidate-a");
  const other = await promote("other", "candidate-b");
  assert.notEqual(own.newStrategy.strategyId, other.newStrategy.strategyId);
  assert.equal(own.newStrategy.status, "ACTIVE");
  assert.equal(coordinator.getStrategyVersionsForDomain("wine_retail").length, 0);
  assert.equal(coordinator.getStrategyVersionsForDomain("wine_retail", "owner").length, 1);
  assert.equal(coordinator.listAllActiveStrategies("owner")[0].strategyId, own.newStrategy.strategyId);
  assert.equal(coordinator.listAllActiveStrategies("other")[0].strategyId, other.newStrategy.strategyId);
  assert.equal(persisted[0].tenantId, "owner"); assert.equal(persisted[1].tenantId, "other");
  const proof = await authority.authorizeHumanApproval({}, "other");
  assert.throws(() => coordinator.rollbackStrategy({ domain: "wine_retail", executedBy: "owner", tenantId: "owner", authorization: proof, rollbackReason: "test" }), /Verified human/);
  coordinator.rollbackStrategy({ domain: "wine_retail", executedBy: "other", tenantId: "other", authorization: proof, rollbackReason: "test" });
  assert.equal(coordinator.getActiveStrategy("wine_retail", "owner").strategyId, own.newStrategy.strategyId);
  assert.equal(coordinator.getActiveStrategy("wine_retail", "other"), null);
});
function repairFixture() {
  const events = [];
  const repairs = loadSource("src/lib/intelligence/validation/repairCoordinator.ts", {
    "@/lib/telemetry/agentTelemetry": { emitAgentEvent: event => events.push(event) },
    "../planning/sectionOrder": loadSource("src/lib/intelligence/planning/sectionOrder.ts"),
  }).RepairCoordinator.getInstance();
  const context = { projectId: "project", tenantId: "tenant", runId: "run", retryCount: 1,
    semanticProfile: { domain: "wine_retail", confidence: .95, primaryCta: { label: "Visit the store" } },
    websiteData: { brand: { industry: "hospitality" }, category: "hospitality", hero: { title: "Real business name" } } };
  const report = { validationId: "validation", isLoopDetected: false,
    blockingFailures: [{ ruleCode: "SEM_GROUNDED_ARCHETYPE_CONTRADICTION" }] };
  return { repairs, context, report, events };
}
test("deterministic repair preserves approved domain without fabricating Boss completion", async () => {
  const fixture = repairFixture();
  const result = await fixture.repairs.executeRepair(fixture.context, fixture.report);
  assert.equal(result.success, true);
  assert.equal(result.repairedData.category, 'wine_retail');
  assert.equal(fixture.context.websiteData.category, 'hospitality');
  assert.equal(result.delegationTask, undefined);
  assert.equal(result.delegationResult, undefined);
  assert.ok(fixture.events.every(event => event.agent === 'repair_coordinator'));
});
test("repair rejects unknown business, generic content synthesis and additional repair passes", async () => {
  for (const mode of ['missing-profile', 'generic-domain', 'missing-hero', 'boilerplate', 'leaked-features', 'second-repair', 'loop']) {
    const fixture = repairFixture();
    if (mode === 'missing-profile') delete fixture.context.semanticProfile;
    if (mode === 'generic-domain') fixture.context.semanticProfile.domain = 'general_commercial';
    if (mode === 'missing-hero') fixture.report.blockingFailures[0].ruleCode = 'SEM_MISSING_HERO';
    if (mode === 'boilerplate') fixture.report.blockingFailures[0].ruleCode = 'SEM_FORBIDDEN_BOILERPLATE_TEXT';
    if (mode === 'leaked-features') fixture.report.blockingFailures[0].ruleCode = 'SEM_LEAKED_INTERNAL_SLOGANS';
    if (mode === 'second-repair') fixture.context.retryCount = 2;
    if (mode === 'loop') fixture.report.isLoopDetected = true;
    const result = await fixture.repairs.executeRepair(fixture.context, fixture.report);
    assert.equal(result.success, false, mode);
    assert.deepEqual(result.repairedData, fixture.context.websiteData);
    assert.ok(result.error.length > 0);
  }
});
test("first repeated validation signature halts repairs", () => {
  const { repairs } = repairFixture();
  assert.equal(repairs.detectLoop('same', ['same']), true);
  assert.equal(repairs.detectLoop('same', ['different']), false);
});
const knowledge = loadSource("src/lib/intelligence/orchestration/semanticKnowledge.ts", {
  "@/lib/db/queries": { getPool: () => { throw new Error("Unit test must not access production DB"); } },
  "../semantic/businessSemanticReasoner": semantics,
});
const concept = {
  domain: "wine_retail", subdomain: "liquor_store", categoryTerms: ["liquor_store"],
  businessModel: "Retail sale of wine and spirits", primaryCta: { label: "Visit the store", intent: "store_visit" },
  preferredSubjects: ["wine shelves"], forbiddenSubjects: ["hotel rooms"], regulatoryConstraints: ["No unsupported licensing claims"],
};

test("runtime knowledge readers bind the exact human-reviewed dossier and scoped version", async () => {
  let current = approvedKnowledgeFixture();
  const statements = [];
  const reader = loadSource("src/lib/intelligence/orchestration/semanticKnowledge.ts", {
    "../semantic/businessSemanticReasoner": semantics,
    "@/lib/db/queries": { getPool: () => ({ query: async (sql, params) => {
      statements.push({ sql, params });
      return { rows: sql.startsWith("SELECT r.*") ? [current] : [] };
    } }) },
  });
  const approved = await reader.findApprovedKnowledge("owner", "liquor_store");
  assert.equal(approved.concept.domain, "wine_retail");
  assert.equal(approved.binding.tenantId, "owner");
  const original = await reader.readApprovedResearchKnowledge("research", "owner");
  assert.equal(original.dossier.offerings[0].title, "Wine");
  const reads = statements.filter(item => item.sql.startsWith("SELECT r.*"));
  assert.ok(reads[0].sql.includes("k.tenant_id=$1"));
  assert.equal(reads[0].params[0], "owner");
  assert.ok(reads[1].sql.includes("r.id=$1 AND r.tenant_id=$2"));
  assert.equal(reads[1].params[1], "owner");
  current = { ...current, dossier: { ...current.dossier, offerings: [{ title: "Unreviewed rooms" }] } };
  await assert.rejects(reader.findApprovedKnowledge("owner", "liquor_store"), /Fresh human review/);
  await assert.rejects(reader.readApprovedResearchKnowledge("research", "owner"), /Fresh human review/);
});

test("canonical knowledge registration executes representative semantic probes without claiming rendered QA", () => {
  const report = knowledge.evaluateKnowledgeRegression(concept);
  assert.equal(report.passed, true);
  assert.equal(report.scope, "semantic_knowledge_registration");
  assert.equal(report.renderedWebsiteVerified, false);
  assert.ok(report.checks.some(check => check.name.includes("Bright Future Academy")));
  for (const category of ["spa", "massage", "salon", "restaurant", "bike rental", "dental clinic", "legal counsel", "education", "AI software company"]) {
    assert.equal(knowledge.evaluateKnowledgeRegression({ ...concept, categoryTerms: [category] }).passed, false, category);
  }
  assert.equal(knowledge.evaluateKnowledgeRegression({ ...concept, preferredSubjects: [" Wine-Shelves "], forbiddenSubjects: ["wine shelves"] }).passed, false);
});
test("employee provider success with an empty contract is recorded as failure and stops generation", async () => {
  const records = [];
  let calls = 0;
  const employees = loadSource("src/lib/intelligence/orchestration/generationEmployees.ts", {
    "@/lib/ai/router/modelRouter": { modelRouter: { route: async () => { calls++; return { success: true, data: {} }; } } },
    "@/lib/ai/router/modelConfig": { MODEL_CONFIG: { agentPolicies: { boss: () => ({}) } } },
    "@/lib/skills/skillRegistry": { getRegisteredSkills: () => [], loadSkillContent: () => "" },
    "./contrastMath": { paletteContrast: () => 21 },
  });
  await assert.rejects(employees.runGenerationEmployees({}, { evidence: [{ id: "google-type", verificationStatus: "verified", supports: ["category"] }] }, "unit", undefined,
    async product => records.push(product)), /ceo_understanding unavailable or invalid work product/);
  assert.equal(calls, 1);
  assert.equal(records[0].status, "failed");
});
test("invalid regeneration requests stop before providers or skills are invoked", async () => {
  const employees = loadSource("src/lib/intelligence/orchestration/generationEmployees.ts", {
    "@/lib/ai/router/modelRouter": { modelRouter: { route: () => { throw new Error('Unexpected provider call'); } } },
    "@/lib/ai/router/modelConfig": { MODEL_CONFIG: { agentPolicies: { boss: () => ({}) } } },
    "@/lib/skills/skillRegistry": { getRegisteredSkills: () => { throw new Error('Unexpected skill selection'); }, loadSkillContent: () => '' },
    "./contrastMath": { paletteContrast: () => 21 },
  });
  const baseline = { attempt: 1, stage: 'validation', failures: ['Hero content rejected'], previousOutput: { design: {}, content: {} } };
  for (const repair of [{ ...baseline, attempt: 2 }, { ...baseline, stage: 'unknown' },
    { ...baseline, failures: [] }, { ...baseline, failures: [' '] }, { ...baseline, failures: ['a'.repeat(2001)] },
    { ...baseline, failures: Array(13).fill('Rejected content') }]) {
    await assert.rejects(employees.runGenerationEmployees({}, {}, 'unit', undefined, undefined, repair), /invalid controlled regeneration context/);
  }
});
test("Boss independently reviews every content claim; incomplete, duplicate or unsupported reviews stop generation", async () => {
  const approvedProfile = { domain: "wine_retail", subdomain: "liquor_store", primaryCta: { label: "Visit store", intent: "store_visit" } };
  const outputs = {
    ceo_understanding: { approved: true, domain: "wine_retail", subdomain: "liquor_store", confidence: .95, contradictions: [], evidenceIds: ["type"], customerIntent: "Visit the store", preferredSubjects: ["wine shelves"], forbiddenSubjects: ["hotel rooms"], cta: { label: "Visit store", intent: "store_visit" } },
    boss_semantics: { approved: true, evidenceIds: ["type"], reasons: ["Google explicitly confirms retail category"] },
    skills: { domain: "wine_retail", selectedSkills: [{ id: "retail", purpose: "Ground retail visitor content", acceptanceCriteria: ["Relevant retail content"] }], confidence: .95 },
    boss_skills: { approved: true, reasons: ["Retail skill matches verified place type"], checkedSkillIds: ["retail"] },
    designer: { domain: "wine_retail", direction: "Readable editorial retail storefront direction", heroLayout: "minimal_editorial", headingFont: "Georgia", bodyFont: "Arial", colors: Object.fromEntries(["bg", "surface", "text", "muted", "primary", "secondary", "accent", "border"].map(key => [key, "#000000"])), sectionOrder: ["hero", "contact", "footer"] },
    content: { domain: "wine_retail", title: "Visit the wine store", subtitle: "Explore this local wine retail store", aboutTitle: "Local wine retail", aboutContent: "A local wine store welcoming visitors to its retail location.", evidenceIds: ["type"], services: [{ title: "Wine retail", description: "Visit the local wine retail location", evidenceIds: ["type"] }], features: [], cta: "Visit store" },
  };
  const keys = ["hero", "about", "cta", "business_domain", "service:0"];
  const baseline = { approved: true, domain: "wine_retail", claims: keys.map(key => ({ key, supported: true, confidence: .95, evidenceIds: ["type"], rationale: "Explicit Google category supports safe category-level statement" })) };
  for (const variant of ["valid", "repair-valid", "repair-subdomain", "repair-cta", "content-cta", "missing", "duplicate", "unsupported", "wrong-evidence"]) {
    const review = structuredClone(baseline);
    if (variant === "missing") review.claims.pop();
    if (variant === "duplicate") review.claims[4].key = "hero";
    if (variant === "unsupported") review.claims[4].supported = false;
    if (variant === "wrong-evidence") review.claims[4].evidenceIds = ["unrelated"];
    const calls = []; const records = [];
    const employees = loadSource("src/lib/intelligence/orchestration/generationEmployees.ts", {
      "@/lib/ai/router/modelRouter": { modelRouter: { route: async request => {
        const agent = request.metadata.agent; calls.push(agent);
        const input = JSON.parse(request.userPrompt);
        if (variant === 'content-cta' && agent === 'content') {
          return { success: true, data: { ...outputs.content, cta: 'Reserve a room' }, attemptCount: 1 };
        }
        if (variant.startsWith('repair-')) {
          assert.equal(input.repair.attempt, 1);
          assert.deepEqual(input.repair.failures, ['Unreadable hero text']);
          if (agent === 'ceo_understanding' && variant !== 'repair-valid') {
            const contradictory = structuredClone(outputs[agent]);
            if (variant === 'repair-subdomain') contradictory.subdomain = 'hotel';
            if (variant === 'repair-cta') contradictory.cta.intent = 'room_reservation';
            return { success: true, data: contradictory, attemptCount: 1 };
          }
        }
        if (agent === "boss_content") {
          assert.equal(input.inputs.contentClaims.length, 5);
          assert.equal(input.evidence[0].observation, "Google type liquor_store");
        }
        return { success: true, data: agent === "boss_content" ? review : outputs[agent], attemptCount: 1 };
      } } },
      "@/lib/ai/router/modelConfig": { MODEL_CONFIG: { agentPolicies: { boss: () => ({}) } } },
      "@/lib/skills/skillRegistry": { getRegisteredSkills: () => [{ id: "retail", description: "Retail", verificationCriteria: ["Retail fidelity"] }], loadSkillContent: () => "Execute grounded retail content." },
      "./contrastMath": { paletteContrast: () => 21 },
    });
    const result = employees.runGenerationEmployees(approvedProfile, { evidence: [{ id: "type", verificationStatus: "verified", supports: "industryFamily", observation: "Google type liquor_store" }] }, "claims-unit", undefined, async record => records.push({ ...record }),
      variant.startsWith('repair-') ? { attempt: 1, stage: 'rendered', failures: ['Unreadable hero text'], previousOutput: { design: {}, content: {} } } : undefined);
    if (variant === 'repair-subdomain' || variant === 'repair-cta') {
      await assert.rejects(result, /regeneration cannot change/);
      assert.deepEqual(calls, ['ceo_understanding']);
      assert.equal(records.at(-1).status, 'rejected');
      continue;
    }
    if (variant === 'content-cta') {
      await assert.rejects(result, /changes the approved CTA strategy/);
      assert.equal(calls.at(-1), 'content');
      assert.equal(records.at(-1).status, 'rejected');
      continue;
    }
    if (variant === "valid" || variant === 'repair-valid') {
      const completed = await result;
      assert.equal(completed.contentBoss.approved, true);
      if (variant === 'repair-valid') assert.deepEqual(completed.profile, approvedProfile);
    }
    else { await assert.rejects(result, /Boss rejected unsupported content/); assert.equal(records.at(-1).status, "rejected"); }
    assert.equal(calls.at(-1), "boss_content");
  }
});
test("reusable knowledge rejects company identity and contact data", () => {
  assert.throws(() => knowledge.verifyReusableKnowledge({ ...concept, businessModel: "G-Town Wines sells wine" }, "G-Town Wines"));
  assert.throws(() => knowledge.verifyReusableKnowledge({ ...concept, businessModel: "Contact info@example.com for wine" }, "Company"));
  assert.throws(() => knowledge.verifyReusableKnowledge({ ...concept, domain: "unknown" }, "Company"));
  assert.throws(() => knowledge.verifyReusableKnowledge({ ...concept, categoryTerms: ["store"] }, "Company"));
  assert.equal(knowledge.verifyReusableKnowledge(concept, "G-Town Wines").domain, "wine_retail");
});
test("activation regressions reject a wine concept hijacking spa or AI", () => {
  assert.equal(knowledge.evaluateKnowledgeRegression({ ...concept, categoryTerms: ["spa"] }).passed, false);
  assert.equal(knowledge.evaluateKnowledgeRegression({ ...concept, categoryTerms: ["AI software company"] }).passed, false);
  assert.equal(knowledge.evaluateKnowledgeRegression({ ...concept, forbiddenSubjects: ["wine shelves"] }).passed, false);
  assert.equal(knowledge.evaluateKnowledgeRegression(concept).passed, true);
});
test("missing employee or rendered comparison evidence blocks without calling AI", async () => {
  let calls = 0;
  const review = loadSource("src/lib/intelligence/orchestration/renderedPublishReview.ts", {
    "@/lib/ai/router/modelRouter": { modelRouter: { route: () => { calls++; throw new Error("Unexpected model call"); } } },
    "@/lib/ai/router/modelConfig": { MODEL_CONFIG: { agentPolicies: { boss: () => ({}) } } },
  });
const base = { correlationId: "unit", profile: {}, website: {}, audit: { status: "completed", viewports: [] }, comparisons: [], employeeTrace: [] };
  assert.equal((await review.reviewRenderedCandidate(base)).approved, false);
  const employeeTrace = ["ceo_understanding", "boss_semantics", "skills", "boss_skills", "designer", "content", "boss_content"].map(agent => ({ agent, status: "completed" }));
  assert.equal((await review.reviewRenderedCandidate({ ...base, employeeTrace })).approved, false);
  assert.equal(calls, 0);
});

function reviewFixture(decide) {
  const calls = [];
  const review = loadSource("src/lib/intelligence/orchestration/renderedPublishReview.ts", {
    "node:fs/promises": { readFile: async () => Buffer.from("unit-only-pixel-fixture-not-a-rendered-acceptance-test") },
    "@/lib/ai/router/modelRouter": { modelRouter: { route: async request => {
      calls.push(request.metadata.agent);
      const input = JSON.parse(request.userPrompt);
      return { success: true, data: decide(request.metadata.agent, input) };
    } } },
    "@/lib/ai/router/modelConfig": { MODEL_CONFIG: { agentPolicies: { boss: () => ({}) } } },
  });
  const input = { correlationId: "unit", profile: {}, website: {},
    audit: { status: "completed", viewports: ["desktop", "mobile"].map(viewport => ({ viewport, screenshotPath: "unit", html: "<h1>Fixture</h1>", issues: [], imageEvidence: [],
      textContrast: { status: "completed", method: "rendered-glyph-background-differential", errors: [], checks: [{ id: "fixture", label: "Fixture", requiredRatio: 3, minimumRatio: 7, corePixels: 20, passed: true }] } })) },
    comparisons: [{ id: "owned-fixture", sectionOrder: ["hero", "contact"] }],
    employeeTrace: ["ceo_understanding", "boss_semantics", "skills", "boss_skills", "designer", "content", "boss_content"].map(agent => ({ agent, status: "completed" })),
    skillDocuments: [{ id: "accessibility", markdown: "Unit fixture instructions", sha256: "unit", acceptanceCriteria: ["Readable desktop/mobile text"] }],
  };
  return { review, input, calls };
}
function passingDecision(input) {
  return { approved: true, confidence: .95, inspectedEvidence: input.evidenceIds,
    checks: input.requiredCriteria.map(criterion => ({ criterion, passed: true, observation: "Unit fixture evidence inspected" })),
    errors: [], redesignRequirements: [], skillAssessments: input.selectedSkillDocuments.map(skill => ({ skillId: skill.id,
      criterion: skill.acceptanceCriteria[0], passed: true, evidenceIds: ["desktop_pixels", "mobile_pixels"], observation: "Unit fixture measured evidence" })) };
}
test("Boss cannot hide a rejected skill behind a duplicate passing assessment", async () => {
  const fixture = reviewFixture((agent, input) => {
    const decision = passingDecision(input);
    if (agent === "boss_final") decision.skillAssessments.push({ ...decision.skillAssessments[0], passed: false });
    return decision;
  });
  const result = await fixture.review.reviewRenderedCandidate(fixture.input);
  assert.equal(result.approved, false);
  assert.equal(result.trace.at(-1).agent, "boss_final");
  assert.equal(result.trace.at(-1).repairEligible, false);
  assert.equal(fixture.calls.includes("ceo_publish"), false);
});
test("Image Agent cannot hide rejected pixels behind a duplicate passing assessment", async () => {
  const fixture = reviewFixture((agent, input) => ({ ...passingDecision(input), imageAssessments: [
    { evidenceId: "photo:fixture", observedSubjects: ["retail shelves"], relevanceScore: .95, approved: true, reason: "Unit fixture approved observed subject" },
    { evidenceId: "photo:fixture", observedSubjects: ["hotel room"], relevanceScore: .1, approved: false, reason: "Unit fixture contradictory rejected subject" },
  ] }));
  fixture.input.audit.viewports[0].imageEvidence.push({ id: "photo:fixture", screenshotPath: "unit", sourceUrl: "https://fixture/image", alt: "Fixture", kind: "photo" });
  const result = await fixture.review.reviewRenderedCandidate(fixture.input);
  assert.equal(result.approved, false);
  assert.equal(result.trace.at(-1).agent, "image_relevance");
  assert.equal(result.trace.at(-1).repairEligible, false);
  assert.deepEqual(fixture.calls, ["image_relevance"]);
});
test("async resource ignores stale/unmounted responses and supports refresh/error dismissal", async () => {
  const state = []; let cursor = 0; let deps; let cleanup; let pendingEffect; let writes = 0;
  const hooks = { useState: initial => {
    const index = cursor++; if (!(index in state)) state[index] = initial;
    return [state[index], value => { writes++; state[index] = typeof value === "function" ? value(state[index]) : value; }];
  }, useCallback: callback => callback, useEffect: (effect, next) => {
    if (!deps || next.some((value, index) => value !== deps[index])) { deps = next; pendingEffect = effect; }
  } };
  const { useAsyncResource } = loadSource("src/hooks/useAsyncResource.ts", { react: hooks });
  const ResourceHarness = (key, load) => {
    cursor = 0; const output = useAsyncResource(key, load);
    if (pendingEffect) { cleanup?.(); cleanup = pendingEffect(); pendingEffect = undefined; }
    return output;
  };
  const tick = () => new Promise(resolve => setImmediate(resolve));
  let resolveOld; let resolveNew;
  const old = () => new Promise(resolve => { resolveOld = resolve; });
  const current = () => new Promise(resolve => { resolveNew = resolve; });
  assert.equal(ResourceHarness("old-filter", old).loading, true);
  assert.equal(ResourceHarness("new-filter", current).data, null);
  resolveNew("current-data"); await tick();
  assert.equal(ResourceHarness("new-filter", current).data, "current-data");
  const before = writes; resolveOld("stale-data"); await tick(); assert.equal(writes, before);
  ResourceHarness("new-filter", current).refresh();
  assert.equal(ResourceHarness("new-filter", current).loading, true);
  const beforeUnmount = writes; cleanup(); resolveNew("late-data"); await tick(); assert.equal(writes, beforeUnmount);
  const failed = async () => { throw new Error("Verified request failure"); };
  ResourceHarness("failed-request", failed); await tick();
  const failure = ResourceHarness("failed-request", failed); assert.equal(failure.error, "Verified request failure");
  failure.dismissError(); assert.equal(ResourceHarness("failed-request", failed).error, null);
});
test("reference demos never claim rendered skill verification or auto-pass unknown entries", () => {
  const { referenceAudit } = loadSource("src/lib/skills/referenceAudit.ts", {});
  const known = referenceAudit("accessibility", ["accessibility"]);
  assert.equal(known.status, "UNVERIFIED");
  assert.equal(known.evidence.runtimeVerification, false);
  assert.equal(known.evidence.wcagTested, undefined);
  assert.equal(referenceAudit("unknown-business-skill", ["accessibility"]).status, "NOT_FOUND");
});
test("random single passed check cannot approve a specialist", async () => {
  const fixture = reviewFixture((agent, input) => ({ ...passingDecision(input), checks: [{ criterion: "random_pass", passed: true, observation: "Unrelated passing observation" }] }));
  assert.equal((await fixture.review.reviewRenderedCandidate(fixture.input)).approved, false);
  assert.deepEqual(fixture.calls, ["image_relevance"]);
});
test("missing or failed raster contrast blocks publication before any model may approve it", async () => {
  for (const mode of ["missing", "failed", "empty", "invalid", "fake-threshold", "duplicate-viewport"]) {
    const fixture = reviewFixture((agent, input) => passingDecision(input));
    const viewport = fixture.input.audit.viewports[0];
    if (mode === "missing") delete viewport.textContrast;
    else if (mode === "failed") viewport.textContrast.checks[0].minimumRatio = 1.1;
    else if (mode === "empty") viewport.textContrast.checks = [];
    else if (mode === "fake-threshold") viewport.textContrast.checks[0].requiredRatio = 0;
    else if (mode === "duplicate-viewport") fixture.input.audit.viewports[1].viewport = "desktop";
    else viewport.textContrast.checks[0].minimumRatio = NaN;
    assert.equal((await fixture.review.reviewRenderedCandidate(fixture.input)).approved, false);
    assert.equal(fixture.calls.length, 0);
  }
});
test("open-menu publication requires matching screenshot and measured contrast evidence", async () => {
  for (const mode of ["missing", "wrong-id", "failed-contrast", "missing-phase", "failed-interaction"]) {
    const fixture = reviewFixture((agent, input) => passingDecision(input));
    const viewport = fixture.input.audit.viewports[1];
    viewport.interactionChecks = [{ kind: "navigation_menu", phase: "open", stateId: "menu-1", label: "Menu", passed: true }];
    viewport.interactionStates = [{ id: "menu-1", screenshotPath: viewport.screenshotPath, textContrast: structuredClone(viewport.textContrast) }];
    if (mode === "missing") viewport.interactionStates = [];
    if (mode === "wrong-id") viewport.interactionStates[0].id = "different";
    if (mode === "failed-contrast") viewport.interactionStates[0].textContrast.checks[0].minimumRatio = 1.1;
    if (mode === "missing-phase") delete viewport.interactionChecks[0].phase;
    if (mode === "failed-interaction") viewport.interactionChecks[0].passed = false;
    assert.equal((await fixture.review.reviewRenderedCandidate(fixture.input)).approved, false);
    assert.equal(fixture.calls.length, 0);
  }
});
test("every publication specialist must acknowledge supplied open-state pixels", async () => {
  for (const acknowledge of [true, false]) {
    const fixture = reviewFixture((agent, input) => {
      const decision = passingDecision(input);
      if (!acknowledge) decision.inspectedEvidence = decision.inspectedEvidence.filter(id => !id.startsWith("state:"));
      return decision;
    });
    const viewport = fixture.input.audit.viewports[1];
    viewport.interactionChecks = [{ kind: "navigation_menu", phase: "open", stateId: "menu-1", label: "Menu", passed: true }];
    viewport.interactionStates = [{ id: "menu-1", screenshotPath: viewport.screenshotPath, textContrast: structuredClone(viewport.textContrast) }];
    const result = await fixture.review.reviewRenderedCandidate(fixture.input);
    assert.equal(result.approved, acknowledge);
    assert.equal(fixture.calls.length, acknowledge ? 5 : 1);
  }
});
test("destination-page publication requires pixels, contrast, restoration and independent specialist acknowledgement", async () => {
  for (const mode of ["valid", "missing-pixels", "failed-contrast", "missing-restore", "ignored-evidence"]) {
    const fixture = reviewFixture((agent, input) => {
      const decision = passingDecision(input);
      if (mode === "ignored-evidence") decision.inspectedEvidence = decision.inspectedEvidence.filter(id => !id.startsWith("state:"));
      return decision;
    });
    const viewport = fixture.input.audit.viewports[0];
    viewport.interactionChecks = [
      { kind: "page_navigation", phase: "open", stateId: "page-transition-0", label: "Services", passed: true },
      { kind: "page_navigation", phase: "restore", stateId: "page-transition-0", label: "Services", passed: true },
    ];
    viewport.interactionStates = [{ id: "page-transition-0", screenshotPath: viewport.screenshotPath, textContrast: structuredClone(viewport.textContrast) }];
    if (mode === "missing-pixels") viewport.interactionStates = [];
    if (mode === "failed-contrast") viewport.interactionStates[0].textContrast.checks[0].minimumRatio = 1;
    if (mode === "missing-restore") viewport.interactionChecks.pop();
    const result = await fixture.review.reviewRenderedCandidate(fixture.input);
    assert.equal(result.approved, mode === "valid", mode);
    assert.equal(fixture.calls.length, mode === "valid" ? 5 : mode === "ignored-evidence" ? 1 : 0);
  }
});
test("rejected specialist stops Boss and CEO publication calls", async () => {
  const fixture = reviewFixture((agent, input) => ({ ...passingDecision(input), approved: agent !== "uniqueness" }));
  assert.equal((await fixture.review.reviewRenderedCandidate(fixture.input)).approved, false);
  assert.deepEqual(fixture.calls, ["image_relevance", "visual_accessibility", "uniqueness"]);
});
test("only a complete evidence-backed specialist rejection may request controlled redesign", async () => {
  for (const mode of ['actionable', 'missing-criterion', 'missing-pixels', 'low-confidence', 'no-failed-check', 'ceo-rejection']) {
    const fixture = reviewFixture((agent, input) => {
      const decision = passingDecision(input);
      if (agent !== (mode === 'ceo-rejection' ? 'ceo_publish' : 'uniqueness')) return decision;
      decision.approved = false;
      decision.redesignRequirements = ['Change the repeated hero composition using the approved retail direction.'];
      if (mode !== 'no-failed-check') decision.checks.find(check => check.criterion === (mode === 'ceo-rejection' ? 'publication_authorized' : 'rendered_composition')).passed = false;
      if (mode === 'missing-criterion') decision.checks = decision.checks.filter(check => check.criterion !== 'typography_comparison');
      if (mode === 'missing-pixels') decision.inspectedEvidence = decision.inspectedEvidence.filter(id => id !== 'mobile_pixels');
      if (mode === 'low-confidence') decision.confidence = .4;
      return decision;
    });
    const result = await fixture.review.reviewRenderedCandidate(fixture.input);
    assert.equal(result.approved, false);
    const repairs = fixture.review.renderedRepairRequirements(result);
    assert.equal(repairs.length, mode === 'actionable' ? 1 : 0, mode);
    assert.equal(result.trace.at(-1).repairEligible, mode === 'actionable', mode);
  }
  const unavailable = reviewFixture((agent, input) => passingDecision(input));
  unavailable.input.comparisons = [];
  const result = await unavailable.review.reviewRenderedCandidate(unavailable.input);
  assert.equal(unavailable.review.renderedRepairRequirements(result).length, 0);
});
test("all required evidence-backed contracts execute in publication order", async () => {
  const fixture = reviewFixture((agent, input) => passingDecision(input));
  const result = await fixture.review.reviewRenderedCandidate(fixture.input);
  assert.equal(result.approved, true);
  assert.deepEqual(fixture.calls, ["image_relevance", "visual_accessibility", "uniqueness", "boss_final", "ceo_publish"]);
});

test("Boss cannot skip any selected skill acceptance criterion", async () => {
  const fixture = reviewFixture((agent, input) => passingDecision(input));
  fixture.input.skillDocuments[0].acceptanceCriteria.push("Keyboard focus must be verified");
  const result = await fixture.review.reviewRenderedCandidate(fixture.input);
  assert.equal(result.approved, false);
  assert.deepEqual(fixture.calls, ["image_relevance", "visual_accessibility", "uniqueness", "boss_final"]);
});

test("durable publication rejects an unreviewed successful result", async () => {
  let writes = 0;
  const store = loadSource("src/lib/intelligence/orchestration/generationTraceStore.ts", {
    "@/lib/db/queries": { getPool: () => ({ query: async () => { writes++; return { rowCount: 1, rows: [] }; } }) },
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: value => value },
  });
  await assert.rejects(store.beginGenerationTrace("unit", { businessName: "Business" }), /tenant identity/);
  await assert.rejects(store.finishGenerationTrace("unit", { success: true, status: "READY", websiteData: { generationGate: "READY" } }), /publish review/);
  assert.equal(writes, 0);
});
test("public generated-preview reads exclude private employee and review diagnostics", async () => {
  let sql = "";
  const store = loadSource("src/lib/intelligence/orchestration/generationTraceStore.ts", {
    "@/lib/db/queries": { getPool: () => ({ query: async statement => {
      sql = statement;
      return { rows: [{ website: { hero: { title: "Public content" }, generationGate: "READY", employeeTrace: ["private"], renderedAudit: {}, publishReview: { approved: true }, generationOwnerId: "private-owner" } }] };
    } }) },
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: value => value },
  });
  const website = await store.readApprovedGeneratedPreview("prev_fixture_123");
  assert.equal(website.hero.title, "Public content");
  for (const field of ["employeeTrace", "renderedAudit", "publishReview", "generationOwnerId"]) assert.equal(field in website, false);
  assert.ok(sql.includes("status IN ('READY','REPAIRED')"));
  assert.ok(sql.includes("'publishReview'->>'approved'='true'"));
});

test("resume requires a durable claim and never starts a second simultaneous generation", async () => {
  let claimed = false, generations = 0, resumedRequest, resumedLease;
  const statements = [];
  const resume = loadSource("src/lib/intelligence/orchestration/resumeApprovedResearch.ts", {
    "@/lib/db/queries": { getPool: () => ({ query: async (statement, values) => {
      statements.push({ statement, values });
      if (statement.includes("WITH claim")) {
        if (claimed) return { rows: [] };
        claimed = true;
        return { rows: [{ request: { source: "ui_builder", businessName: "Fixture", leadId: "original-project", userId: "owner" } }] };
      }
      return { rows: [], rowCount: 1 };
    } }) },
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: error => error.message },
    "./canonicalGenerationOrchestrator": { canonicalGenerationOrchestrator: { generateWebsite: async (request, lease) => {
      generations++;
      resumedRequest = request;
      resumedLease = lease;
      return { success: true, status: "READY", websiteData: { hero: { title: "Verified fixture" } } };
    } } },
  });
  await Promise.all([resume.resumeApprovedResearch("research"), resume.resumeApprovedResearch("research")]);
  assert.equal(generations, 1);
  assert.equal(resumedRequest.leadId, "original-project");
  assert.equal(resumedRequest.userId, "owner");
  assert.ok(resumedLease.leaseToken);
  assert.equal(statements.some(item => item.statement.startsWith("INSERT INTO public.projects")), false);
  const claim = statements.find(item => item.statement.includes("WITH claim")).statement;
  assert.ok(claim.includes("k.research_id=r.id AND k.tenant_id=r.tenant_id"));
  assert.ok(claim.includes("r.reviewed_by=r.tenant_id AND k.approved_by=r.reviewed_by"));
  assert.ok(claim.includes("k.active AND k.regression_report->>'passed'='true'"));
  assert.ok(claim.includes("k.concept=r.dossier->'reusableKnowledge'"));
});

test("resume stops before generation when the approved knowledge claim is unavailable", async () => {
  let generations = 0;
  const statements = [];
  const resume = loadSource("src/lib/intelligence/orchestration/resumeApprovedResearch.ts", {
    "@/lib/db/queries": { getPool: () => ({ query: async statement => {
      statements.push(statement);
      return { rows: [], rowCount: 0 };
    } }) },
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: error => error.message },
    "./canonicalGenerationOrchestrator": { canonicalGenerationOrchestrator: { generateWebsite: async () => {
      generations++;
      return { success: true, status: "READY" };
    } } },
  });
  await resume.resumeApprovedResearch("revoked-research");
  assert.equal(generations, 0);
  assert.equal(statements.length, 3);
  assert.ok(statements[2].includes("q.status='QUEUED'"));
  assert.ok(statements[2].includes("AND NOT EXISTS"));
  assert.equal(statements.some(statement => statement.includes("SET status='READY'")), false);
});

test("fenced finalization atomically saves owned project, publication and queue outcome", async () => {
  const statements = [];
  const approved = approvedKnowledgeFixture();
  const store = loadSource("src/lib/intelligence/orchestration/generationTraceStore.ts", {
    "@/lib/db/queries": { getPool: () => ({ connect: async () => ({ query: async (statement, values) => {
      statements.push({ statement, values }); return { rowCount: 1, rows: [statement.includes("FOR SHARE OF r,k") ? approved : {}] };
    }, release() {} }) }) },
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: value => value },
  });
  await store.finishGenerationTrace("trace", { success: true, status: "READY", websiteData: { generationGate: "READY", publishReview: { approved: true } } },
    { researchId: "research", leaseToken: "current-token", request: { source: "ui_builder", leadId: "original-project", userId: "owner" } },
    undefined, [bindings.approvedKnowledgeBinding(approved)]);
  const leaseRead = statements.find(item => item.statement.includes("lease_until>NOW()"));
  assert.equal(leaseRead.values[1], "current-token");
  assert.ok(leaseRead.statement.includes("lease_until>NOW()"));
  const project = statements.find(item => item.statement.startsWith("UPDATE public.projects"));
  assert.equal(project.values[1], "original-project");
  assert.equal(project.values[2], "owner");
  assert.ok(project.statement.includes("AND user_id=$3"));
  assert.equal(statements.at(-1).statement, "COMMIT");
  assert.equal(statements.filter(item => item.statement.startsWith("UPDATE")).length, 3);
});

test("learning revoked during rendering cannot publish; every consumed version is locked before writes", async () => {
  const original = approvedKnowledgeFixture();
  for (const current of [{ ...original, active: false }, { ...original, dossier: { ...original.dossier, changed: true } }, null]) {
    const statements = [];
    const store = loadSource("src/lib/intelligence/orchestration/generationTraceStore.ts", {
      "@/lib/db/queries": { getPool: () => ({ connect: async () => ({ query: async (sql, values) => {
        statements.push({ sql, values });
        return { rowCount: current ? 1 : 0, rows: current ? [current] : [] };
      }, release() {} }) }) },
      "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: value => value },
    });
    await assert.rejects(store.finishGenerationTrace("trace", { success: true, status: "READY", websiteData: { generationGate: "READY", publishReview: { approved: true } } },
      undefined, undefined, [bindings.approvedKnowledgeBinding(original)]), /Fresh human review/);
    assert.equal(statements.at(-1).sql, "ROLLBACK");
    assert.equal(statements.some(item => /^(UPDATE|INSERT|COMMIT)/.test(item.sql)), false);
    const locked = statements.find(item => item.sql.includes("FOR SHARE OF r,k"));
    assert.equal(locked.values[1], "owner");
    assert.equal(locked.values[2], "7");
  }
});

test("expired or superseded resume worker cannot publish", async () => {
  const statements = [];
  const store = loadSource("src/lib/intelligence/orchestration/generationTraceStore.ts", {
    "@/lib/db/queries": { getPool: () => ({ connect: async () => ({ query: async statement => {
      statements.push(statement); return { rowCount: 0, rows: [] };
    }, release() {} }) }) },
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: value => value },
  });
  await assert.rejects(store.finishGenerationTrace("trace", { success: true, status: "READY", websiteData: { generationGate: "READY", publishReview: { approved: true } } },
    { researchId: "research", leaseToken: "old-token", request: { source: "ui_builder", leadId: "original-project", userId: "owner" } }), /lease expired or superseded/);
  assert.equal(statements.some(statement => statement.startsWith("UPDATE")), false);
  assert.equal(statements.at(-1), "ROLLBACK");
});
