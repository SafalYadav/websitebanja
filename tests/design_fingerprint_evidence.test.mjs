import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(query) {
  const loadedModule = { exports: {} };
  const source = fs.readFileSync(new URL("../src/lib/agents/skills/designFingerprint.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module: loadedModule, exports: loadedModule.exports, require: id => {
      assert.equal(id, "@/lib/db/queries"); return { getPool: () => ({ query }) };
    } });
  return loadedModule.exports;
}
const website = {
  hero: { title: "Wine retail" }, navbar: { style: "classic" },
  sectionOrder: ["hero", "about", "services", "products", "features", "gallery", "testimonials", "faq", "contact", "footer"],
  designStrategy: { heroType: "minimal_editorial", visualArchetype: "luxury_bespoke", typographyStyle: "Georgia",
    cardTreatment: "bordered", motionStrategy: "SUBTLE", colorSystem: { primary: "#112233" } },
};
test("design fingerprint captures canonical strategy and all sections without fabricated defaults", () => {
  const { extractDesignFingerprint } = load(() => { throw new Error("unexpected database access"); });
  const fingerprint = extractDesignFingerprint(website);
  assert.equal(fingerprint.heroType, "minimal_editorial"); assert.equal(fingerprint.visualArchetype, "luxury_bespoke");
  assert.equal(fingerprint.typographyStyle, "Georgia"); assert.equal(fingerprint.cardStyle, "bordered");
  assert.equal(fingerprint.colorDirection, "#112233"); assert.equal(fingerprint.sectionOrder.length, 10);
  const missing = extractDesignFingerprint({ hero: [] });
  for (const key of ["heroType", "navigationType", "layoutType", "visualArchetype", "typographyStyle", "colorDirection", "cardStyle", "animationStyle"]) assert.equal(missing[key], "unknown", key);
});
test("recent comparisons require trusted owner, scoped SQL and real fields; DB failure cannot use global cache", async () => {
  const calls = [];
  const { getRecentDesignFingerprints } = load(async (sql, params) => { calls.push({ sql, params }); return { rows: [{ json_data: website }, { json_data: {} }, { json_data: null }, { json_data: [] }] }; });
  await assert.rejects(getRecentDesignFingerprints("wine", 3), /Trusted owner/);
  for (const limit of [0, 21, NaN, 1.5]) await assert.rejects(getRecentDesignFingerprints("wine", limit, "owner"), /limit/);
  assert.equal(calls.length, 0);
  const fingerprints = await getRecentDesignFingerprints("wine_retail", 3, "owner");
  assert.equal(fingerprints.length, 1); assert.match(calls[0].sql, /WHERE user_id=\$1/);
  assert.equal(calls[0].params[0], "owner"); assert.equal(calls[0].params[1], "wine_retail");
  const failed = load(async () => { throw new Error("database unavailable"); });
  await assert.rejects(failed.getRecentDesignFingerprints("wine", 3, "owner"), /database unavailable/);
});
test("canonical owned comparison selector excludes empty AST and incomplete fingerprints", async () => {
  const loadedModule = { exports: {} }; let requestedOwner;
  const source = fs.readFileSync(new URL("../src/lib/agents/uniqueness/candidateSelector.ts", import.meta.url), "utf8");
  const { extractDesignFingerprint } = load(() => {});
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module: loadedModule, exports: loadedModule.exports, require: id => {
      if (id === "./fingerprint") return { extractDetailedDesignFingerprint: extractDesignFingerprint };
      assert.equal(id, "@/lib/db/queries"); return { getPool: () => ({ query: async (sql, params) => {
        assert.match(sql, /WHERE user_id=\$1/); requestedOwner = params[0];
        return { rows: [website, {}, [], { hero: { title: " " } }, { ...website, designStrategy: {} }].map((json_data, index) => ({ id: `site-${index}`, json_data })) };
      } }) };
    } });
  const candidates = await loadedModule.exports.selectOwnedComparisonWebsites("owner");
  assert.equal(requestedOwner, "owner"); assert.equal(candidates.length, 1); assert.equal(candidates[0].id, "site-0");
});
