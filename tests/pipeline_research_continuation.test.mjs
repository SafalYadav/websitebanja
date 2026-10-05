import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(relative, overrides = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(`../src/lib/${relative}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, process, Date, console,
    require: id => Object.hasOwn(overrides, id) ? overrides[id]
      : id === "./pipelineResearchContinuation" ? load("intelligence/orchestration/pipelineResearchContinuation.ts", overrides)
      : id === "./approvedKnowledgeBinding" ? load("intelligence/orchestration/approvedKnowledgeBinding.ts", overrides)
      : id === "../policies/canonicalPayloadHash" ? load("intelligence/policies/canonicalPayloadHash.ts", overrides)
      : id.startsWith("@/") || id.startsWith(".") ? {} : require(id) });
  return loadedModule.exports;
}
const request = { source: "autonomous_pipeline", businessName: "Evidence Store", pipelineRunId: "original-run", leadId: "original-lead", tenantId: "owner" };
const fence = { runId: "original-run", tenantId: "owner", token: "private-fence" };
const researchId = "a".repeat(64);
const sanitize = { sanitizeErrorOutput: value => typeof value === "string" ? value : value.message };

test("research linkage requires the exact original owned request and a live execution fence", async () => {
  const statements = [];
  const api = load("intelligence/orchestration/pipelineResearchContinuation.ts", {
    "@/lib/db/queries": { getPool: () => ({ query: async (sql, params) => { statements.push({ sql, params }); return { rowCount: 1 }; } }) },
    "@/lib/ai/router/modelConfig": sanitize,
  });
  await assert.rejects(api.bindPipelineResearch(researchId, { ...request, tenantId: "other" }, fence), /Original owned/);
  await assert.rejects(api.bindPipelineResearch(researchId, { ...request, pipelineRunId: "other-run" }, fence), /Original owned/);
  assert.equal(statements.length, 0);
  await api.bindPipelineResearch(researchId, request, fence);
  assert.deepEqual(Array.from(statements[0].params), [request.pipelineRunId, request.tenantId, fence.token, request.leadId, researchId]);
  assert.match(statements[0].sql, /execution_lease_until>NOW\(\).*status='RUNNING'.*leads \? \$4 FOR UPDATE/s);
  assert.match(statements[0].sql, /r\.request->>'pipelineRunId'=p\.pipeline_run_id AND r\.request->>'leadId'=\$4/);
  assert.match(statements[0].sql, /generation_pipeline_continuations\.tenant_id=EXCLUDED\.tenant_id/);
});

test("research identity isolates original project/lead/run rather than sharing a company's paused generation", () => {
  const governance = load("intelligence/orchestration/researchGovernance.ts", {
    "./semanticKnowledge": { KnowledgeConceptSchema: require("zod").z.object({}) },
  });
  const key = governance.researchKey(request);
  assert.equal(key, governance.researchKey({ ...request }));
  for (const changed of [{ leadId: "another-lead" }, { pipelineRunId: "another-run" }, { tenantId: "another-tenant" },
    { requirements: { style: "editorial" } }, { websiteUrl: "https://official.example" }, { source: "api" }]) {
    assert.notEqual(key, governance.researchKey({ ...request, ...changed }));
  }
});

test("approved child finalization locks parent and commits publication, checkpoint, result and continuation together", async () => {
  const approval = load("intelligence/orchestration/approvedKnowledgeBinding.ts");
  const concept = { domain: "wine_retail", subdomain: "liquor_store" };
  const approved = { id: researchId, tenant_id: "owner", version: 1, status: "APPROVED", active: true,
    reviewed_by: "owner", approved_by: "owner", knowledge_version_id: "7", concept_key: "wine_retail:liquor_store",
    regression_report: { passed: true }, concept, dossier: { reusableKnowledge: concept }, agent_trace: [] };
  approved.reviewed_payload_hash = approval.researchReviewHash(approved);
  for (const parentStatus of ["CANCELLED", "human", "research"]) {
    const statements = [];
    const store = load("intelligence/orchestration/generationTraceStore.ts", {
      "@/lib/ai/router/modelConfig": sanitize,
      "@/lib/db/queries": { getPool: () => ({ connect: async () => ({
        query: async (sql, params) => {
          statements.push({ sql, params });
          return { rowCount: 1, rows: sql.includes("FOR SHARE OF r,k") ? [approved] : sql.includes("FOR UPDATE OF p,c") ? [{ status: parentStatus === "CANCELLED" ? "CANCELLED" : "PAUSED", pause_reason: parentStatus }] : [{}] };
        }, release() {},
      }) }) },
    });
    const result = { success: true, status: "READY", preview: { id: "prev_original" }, websiteData: { generationGate: "READY", publishReview: { approved: true } } };
    const finish = store.finishGenerationTrace("child-trace", result, { researchId, leaseToken: "child-lease", request }, undefined, [approval.approvedKnowledgeBinding(approved)]);
    if (parentStatus !== "research") {
      await assert.rejects(finish, error => error.code === (parentStatus === "human" ? "PIPELINE_PARENT_PAUSED" : "PIPELINE_PARENT_CANCELLED"));
      assert.equal(statements.some(item => item.sql.startsWith("UPDATE public.generation_execution_traces")), false);
      assert.equal(statements.at(-1).sql, "ROLLBACK");
    } else {
      await finish;
      assert.equal(statements.at(-1).sql, "COMMIT");
      const parent = statements.find(item => item.sql.includes("FOR UPDATE OF p,c"));
      assert.deepEqual(Array.from(parent.params), [request.pipelineRunId, request.tenantId, researchId, request.leadId]);
      const checkpoint = statements.find(item => item.sql.startsWith("INSERT INTO public.autonomous_pipeline_stage_results"));
      assert.equal(checkpoint.params[0], request.pipelineRunId);
      assert.equal(JSON.parse(checkpoint.params[3]).preview.id, "prev_original");
      const queued = statements.find(item => item.sql.startsWith("UPDATE public.generation_pipeline_continuations"));
      assert.equal(queued.params[2], "QUEUED");
      assert.equal(queued.params[0], researchId);
    }
  }
});

test("owner-paused and cancelled parents stop approved research before model generation", async () => {
  for (const status of ["human", "CANCELLED"]) {
    const statements = [];
    let generations = 0;
    const resume = load("intelligence/orchestration/resumeApprovedResearch.ts", {
      "@/lib/ai/router/modelConfig": sanitize,
      "@/lib/db/queries": { getPool: () => ({ query: async (sql, params) => {
        statements.push({ sql, params });
        return { rowCount: 1, rows: sql.includes("WITH claim") ? [{ request }] : sql.startsWith("SELECT p.status")
          ? [{ status: status === "human" ? "PAUSED" : "CANCELLED", pause_reason: status }] : [] };
      } }) },
      "./canonicalGenerationOrchestrator": { canonicalGenerationOrchestrator: { generateWebsite: async () => { generations++; throw new Error("Must not generate"); } } },
    });
    await resume.resumeApprovedResearch(researchId);
    assert.equal(generations, 0);
    if (status === "human") {
      assert.match(statements.at(-1).sql, /status='QUEUED'.*attempts=GREATEST\(attempts-1,0\)/s);
      assert.equal(statements.at(-1).params[0], researchId);
    } else {
      const stopped = statements.find(item => item.sql.startsWith("UPDATE public.generation_research_resumes SET status=$4"));
      assert.equal(stopped.params[3], "REJECTED");
      assert.equal(JSON.parse(stopped.params[1]).error.code, "PIPELINE_PARENT_CANCELLED");
    }
  }
});

test("manual cancellation revokes only this owned parent's pending continuation capabilities", async () => {
  const statements = [];
  const api = load("intelligence/orchestration/pipelineResearchContinuation.ts", {
    "@/lib/ai/router/modelConfig": sanitize,
    "@/lib/db/queries": { getPool: () => ({ query: async (sql, params) => {
      statements.push({ sql, params });
      return { rowCount: 1, rows: sql.startsWith("SELECT to_regclass") ? [{ available: true }] : [] };
    } }) },
  });
  await api.cancelPipelineContinuations(request.pipelineRunId, "owner");
  assert.deepEqual(Array.from(statements.at(-1).params), [request.pipelineRunId, "owner"]);
  assert.match(statements.at(-1).sql, /lease_token=NULL,lease_until=NULL/);
  assert.match(statements.at(-1).sql, /p\.tenant_id=\$2 AND p\.status='CANCELLED'/);
});

test("outbox recovery is leased, tenant-scoped, research-only and resumes the exact original parent", async () => {
  let claimed = false;
  const statements = [], resumes = [];
  const api = load("intelligence/orchestration/pipelineResearchContinuation.ts", {
    "@/lib/ai/router/modelConfig": sanitize,
    "@/lib/db/queries": { getPool: () => ({ query: async (sql, params) => {
      statements.push({ sql, params });
      if (sql.includes("WITH candidate")) {
        if (claimed || params[0] !== "owner") return { rows: [] };
        claimed = true;
        return { rows: [{ research_id: researchId, pipeline_run_id: request.pipelineRunId, tenant_id: "owner" }] };
      }
      return { rowCount: 1, rows: [] };
    } }) },
    "@/lib/automation/pipelineOrchestrator": { PipelineOrchestrator: { resumeRun: async (...args) => { resumes.push(args); return { status: "PAUSED" }; } } },
  });
  await api.recoverPipelineContinuations({ researchId, tenantId: "other" });
  await Promise.all([api.recoverPipelineContinuations({ researchId, tenantId: "owner" }), api.recoverPipelineContinuations({ researchId, tenantId: "owner" })]);
  assert.equal(resumes.length, 1);
  assert.deepEqual(Array.from(resumes[0]), [request.pipelineRunId, undefined, "owner", researchId]);
  const claim = statements.find(item => item.sql.includes("WITH candidate"));
  assert.match(claim.sql, /c\.tenant_id=\$1/);
  assert.match(claim.sql, /p\.run_data->>'pauseReason'='research'/);
  assert.match(claim.sql, /p\.status='RUNNING' AND p\.run_data->>'activeResearchContinuationId'=c\.research_id/);
  assert.match(claim.sql, /p\.leads->c\.lead_id->>'researchId'=c\.research_id/);
  assert.match(claim.sql, /FOR UPDATE OF c SKIP LOCKED/);
  assert.match(claim.sql, /p\.execution_lease_until<=NOW\(\)/);
  assert.equal(statements.at(-1).params[2], "COMPLETED");
});

test("legacy autonomous research without verified linkage is rejected, never guessed or rebound", async () => {
  const api = load("intelligence/orchestration/pipelineResearchContinuation.ts");
  await assert.rejects(api.assertResearchParent(researchId, { ...request, pipelineRunId: undefined }), /Legacy autonomous research/);
  await api.assertResearchParent(researchId, { ...request, pipelineRunId: undefined, source: "ui_builder" });
});
