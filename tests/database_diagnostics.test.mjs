import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function route(auth, query) {
  const source = fs.readFileSync(new URL("../src/app/api/automation/pipeline/verify-db/route.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loadedModule = { exports: {} };
  const imports = {
    "next/server": { NextResponse: { json: (body, options) => ({ body, ...options, status: options?.status ?? 200 }) } },
    "@/lib/automation/automationApiIdentity": { authorizeAutomationTenant: async () => auth },
    "@/lib/db/queries": { getPool: () => ({ query }) },
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: () => "Sanitized database error" },
  };
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, require: id => {
    assert.ok(Object.hasOwn(imports, id), `Unexpected dependency: ${id}`); return imports[id];
  }, Date });
  return loadedModule.exports.GET;
}

test("database GET diagnostics are read-only and scope every run read/count to trusted tenant", async () => {
  const queries = [];
  const get = route({ identity: { tenantId: "trusted" } }, async (sql, params) => {
    queries.push({ sql, params });
    assert.match(sql.trim(), /^SELECT/);
    assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|ALTER|CREATE)\b/i);
    return { rows: sql.includes("COUNT") ? [{ count: 14 }] : [] };
  });
  const result = await get({ tenantId: "forged" });
  assert.equal(result.status, 200);
  assert.equal(result.body.verification.totalPersistedRunsCount, 14);
  assert.equal(result.body.verification.pipelineWriteReadLifecycle, "NOT_EXECUTED");
  assert.equal(result.body.verification.crmWriteReadLifecycle, "NOT_EXECUTED");
  assert.equal(result.headers["Cache-Control"], "private, no-store");
  for (const query of queries.filter(item => item.sql.includes("FROM public."))) {
    assert.match(query.sql, /WHERE tenant_id=\$1/);
    assert.equal(query.params[0], "trusted");
  }
  assert.equal(queries.length, 3);
});

test("unauthorized diagnostics do not touch DB; DB failures cannot report successful verification", async () => {
  let calls = 0;
  const denied = await route({ response: { status: 403 } }, async () => { calls++; })({});
  assert.equal(denied.status, 403);
  assert.equal(calls, 0);
  const failed = await route({ identity: { tenantId: "trusted" } }, async () => { throw new Error("private connection payload"); })({});
  assert.equal(failed.status, 503);
  assert.equal(failed.body.success, false);
  assert.equal(failed.body.error.message, "Sanitized database error");
});
