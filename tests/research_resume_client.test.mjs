import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function client(fetch, timers = {}) {
  const source = fs.readFileSync(new URL("../src/lib/researchResumeClient.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, fetch, setTimeout, clearTimeout, ...timers,
    require: () => ({ generationResearchRoute: id => `/api/generation/research/${id}` }) });
  return loadedModule.exports;
}
const researchId = "a".repeat(64);
test("refresh observes existing research using renewed credentials without generating again", async () => {
  const calls = [];
  const statuses = [];
  let tokens = 0;
  const api = client(async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => calls.length === 1
      ? { status: "GENERATING", result: { success: true, websiteData: { premature: true } } }
      : { status: "READY", result: { success: true, websiteData: { name: "Approved" } } } };
  }, { setTimeout: callback => { queueMicrotask(callback); return 1; }, clearTimeout: () => {} });
  const result = await api.waitForApprovedResearch({ researchId, getAccessToken: async () => `token-${++tokens}`, onStatus: status => statuses.push(status) });
  assert.equal(result.name, "Approved");
  assert.deepEqual(statuses, ["GENERATING", "READY"]);
  assert.equal(tokens, 2);
  assert.equal(calls[1].options.headers.Authorization, "Bearer token-2");
  assert.ok(calls.every(call => call.url.endsWith(researchId) && !call.options.method));
});
test("terminal rejection and expired authentication stop observation", async () => {
  for (const status of ["REJECTED", "FAILED", "QUALITY_BLOCKED"]) {
    const api = client(async () => ({ ok: true, status: 200, json: async () => ({ status, result: { error: { message: "Review denied" } } }) }));
    await assert.rejects(api.waitForApprovedResearch({ researchId, getAccessToken: async () => "token", onStatus: () => {} }), /Review denied/);
  }
  const api = client(async () => ({ ok: false, status: 401 }));
  await assert.rejects(api.waitForApprovedResearch({ researchId, getAccessToken: async () => "token", onStatus: () => {} }), /session expired/);
});
test("cancelled or invalid observations never fetch; storage keys isolate user and project", async () => {
  const api = client(() => { throw new Error("Unexpected fetch"); });
  const controller = new AbortController(); controller.abort();
  const input = { researchId, getAccessToken: async () => "token", onStatus: () => {}, signal: controller.signal };
  await assert.rejects(api.waitForApprovedResearch(input), /cancelled/);
  await assert.rejects(api.waitForApprovedResearch({ ...input, researchId: "invalid" }), /Invalid research/);
  assert.notEqual(api.pendingResearchStorageKey("owner-a", "project"), api.pendingResearchStorageKey("owner-b", "project"));
  assert.notEqual(api.pendingResearchStorageKey("owner", "project-a"), api.pendingResearchStorageKey("owner", "project-b"));
});
