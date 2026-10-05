import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import path from "node:path";
import crypto from "node:crypto";

function loadQueue(jobs, parents) {
  const files = new Map([["/fixture/scratch/pipeline/followups.json", JSON.stringify(jobs)]]);
  const reads = [];
  const mockFs = {
    existsSync: name => files.has(name) || name === "/fixture/scratch/pipeline",
    mkdirSync() {}, readFileSync: name => files.get(name),
    writeFileSync: (name, value) => files.set(name, value),
    renameSync: (from, to) => { files.set(to, files.get(from)); files.delete(from); },
  };
  const source = fs.readFileSync(new URL("../src/lib/automation/followUpQueue.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loadedModule = { exports: {} };
  const imports = {
    fs: mockFs, path, crypto,
    "@/lib/telemetry/agentTelemetry": { emitAgentEvent() {} },
    "./pipelineQueue": { PipelineQueue: { getPipelineRun: async (id, tenant) => parents[id]?.tenantId === tenant ? parents[id] : null } },
    "@/lib/crm/crmRepository": { crmRepository: {
      getLeadCRMState: async id => { reads.push(id); return { status: "DO_NOT_CONTACT" }; },
    } },
  };
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, process: { cwd: () => "/fixture" }, console, Date,
    require: id => { assert.ok(Object.hasOwn(imports, id), id); return imports[id]; } });
  return { queue: loadedModule.exports.FollowUpQueue, files, reads };
}

test("tenant clock advancement only processes verified owned parent/lead; other and legacy jobs remain untouched", async () => {
  const jobs = ["owned", "other", "legacy", "cancelled", "paused", "missing-lead"].map(id => ({
    id, runId: id, leadId: `lead-${id}`, status: "scheduled", dueAt: "2020-01-01T00:00:00Z",
  }));
  const { queue, files, reads } = loadQueue(jobs, {
    owned: { tenantId: "tenant", status: "RUNNING", leads: { "lead-owned": {} } },
    other: { tenantId: "other", status: "RUNNING", leads: { "lead-other": {} } },
    cancelled: { tenantId: "tenant", status: "CANCELLED", leads: { "lead-cancelled": {} } },
    paused: { tenantId: "tenant", status: "PAUSED", leads: { "lead-paused": {} } },
    "missing-lead": { tenantId: "tenant", status: "RUNNING", leads: {} },
  });
  queue.setSimulatedClock("2026-01-01T00:00:00Z", "tenant");
  queue.setSimulatedClock("2025-01-01T00:00:00Z", "other");
  const result = await queue.advanceSimulationClock(3, "tenant");
  assert.equal(result.newTime, "2026-01-04T00:00:00.000Z");
  assert.equal(queue.getSimulatedClock("other").toISOString(), "2025-01-01T00:00:00.000Z");
  assert.deepEqual(reads, ["lead-owned"]);
  const saved = JSON.parse(files.get("/fixture/scratch/pipeline/followups.json"));
  assert.equal(saved[0].status, "cancelled");
  assert.ok(saved.slice(1).every(job => job.status === "scheduled"));
});

test("invalid simulation advances and blank tenant cannot change any clock", async () => {
  const { queue, files } = loadQueue([], {});
  const initial = files.size;
  for (const days of [NaN, Infinity, -1, 0, 1.5, 31]) await assert.rejects(queue.advanceSimulationClock(days, "tenant"), /1–30/);
  await assert.rejects(queue.advanceSimulationClock(3, " "), /tenant/);
  assert.equal(files.size, initial + 1); // legacy initialization only; no advanced clock
});
