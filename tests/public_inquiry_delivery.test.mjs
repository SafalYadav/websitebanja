import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function handler({ published = true, writeError = null, analyticsError = false } = {}) {
  let writes = 0;
  const overrides = {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    "@/lib/rateLimit": { checkMemoryRateLimit: () => ({ success: true }) },
    "@/lib/supabaseServer": { getClientIp: () => "unit-test" },
    "@/lib/db/queries": {
      dbGetProjectByPublicSlug: async () => ({ id: "project", user_id: "owner", is_published: published }),
      dbGetProjectOwnership: async () => null,
      dbAppendLeadToProject: async () => { writes++; return { error: writeError }; },
      dbInsertAnalyticsEvent: async () => { if (analyticsError) throw new Error("Analytics unavailable"); },
    },
  };
  const source = fs.readFileSync(new URL("../src/app/api/public/submit-lead/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(compiled, { exports: loaded.exports, module: loaded, console,
    require: id => Object.hasOwn(overrides, id) ? overrides[id] : require(id) });
  return { submit: () => loaded.exports.POST({ json: async () => ({ slug: "approved-site", name: "Test", email: "test@example.com", message: "Test inquiry" }) }), writes: () => writes };
}
test("database failure never returns inquiry delivery success", async () => {
  const api = handler({ writeError: new Error("Database write denied") });
  const result = await api.submit();
  assert.equal(result.status, 503);
  assert.equal(result.body.success, false);
});
test("unpublished and missing publication flags fail closed before writing", async () => {
  for (const published of [false, null]) {
    const api = handler({ published });
    assert.equal((await api.submit()).status, 403);
    assert.equal(api.writes(), 0);
  }
});
test("stored inquiry remains successful when optional analytics fails", async () => {
  const api = handler({ analyticsError: true });
  const result = await api.submit();
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(api.writes(), 1);
  assert.match(result.body.leadId, /^lead_[a-f0-9-]{36}$/);
});
