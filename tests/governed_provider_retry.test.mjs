import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function router() {
  const loadedModule = { exports: {} };
  const source = fs.readFileSync(new URL("../src/lib/ai/router/modelRouter.ts", import.meta.url), "utf8");
  class Missing { isConfigured() { return false; } }
  const imports = {
    "./geminiAdapter": { GeminiAdapter: Missing }, "./groqAdapter": { GroqAdapter: Missing },
    "./openRouterAdapter": { OpenRouterAdapter: Missing },
    "./modelConfig": { MODEL_CONFIG: { timeouts: { standard: 1000 } }, sanitizeErrorOutput: value => value },
    "@/lib/telemetry/agentTelemetry": { emitAgentEvent() {} },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module: loadedModule, exports: loadedModule.exports, performance, setTimeout: callback => { callback(); },
      require: id => { assert.ok(Object.hasOwn(imports, id), id); return imports[id]; } });
  return new loadedModule.exports.ModelRouter();
}
const policy = { primaryProvider: "gemini", fallbacks: [{ provider: "groq" }, { provider: "openrouter" }], maxRetries: 1, maxTotalAttempts: 2, stopOnNonTransient: true };
function failure(type, retryable = true) { return { success: false, provider: "gemini", model: "fixture", latencyMs: 0, error: { type, message: "fixture failure", retryable } }; }
test("governed retry is capped across all providers and reports actual attempts", async () => {
  const service = router(); let primary = 0; let fallback = 0;
  service.registerAdapter({ providerName: "gemini", isConfigured: () => true, generate: async () => { primary++; return failure("TIMEOUT"); } });
  service.registerAdapter({ providerName: "groq", isConfigured: () => true, generate: async () => { fallback++; return { success: true }; } });
  const result = await service.route({ userPrompt: "fixture" }, policy);
  assert.equal(result.success, false); assert.equal(primary, 2); assert.equal(fallback, 0); assert.equal(result.attemptCount, 2);
});
test("transient retry may succeed but invalid/auth/unknown responses and exceptions never fallback", async () => {
  for (const type of ["PARSE_ERROR", "AUTH_ERROR", "UNKNOWN", "throw"]) {
    const service = router(); let calls = 0;
    service.registerAdapter({ providerName: "gemini", isConfigured: () => true, generate: async () => { calls++; if (type === "throw") throw new Error("unexpected"); return failure(type); } });
    service.registerAdapter({ providerName: "groq", isConfigured: () => true, generate: async () => { calls++; return { success: true }; } });
    assert.equal((await service.route({ userPrompt: "fixture" }, policy)).success, false);
    assert.equal(calls, 1);
  }
  const service = router(); let calls = 0;
  service.registerAdapter({ providerName: "gemini", isConfigured: () => true, generate: async () => ++calls === 1 ? failure("RATE_LIMIT") : { success: true, provider: "gemini", model: "fixture", latencyMs: 0, data: { verified: true } } });
  const result = await service.route({ userPrompt: "fixture" }, policy);
  assert.equal(result.success, true); assert.equal(result.attemptCount, 2);
});
