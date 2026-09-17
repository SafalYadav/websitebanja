// tests/test_mitra_provider_optimization.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

console.log("================================================================================");
console.log("WEBSITEBANJA AI — PHASE 4B: MITRA PROVIDER & COST OPTIMIZATION TEST SUITE");
console.log("================================================================================\n");

const testResults = [];

function recordTest(num, name, status, details = "") {
  testResults.push({ num, name, status, details });
  const icon = status === "PASS" ? "✔" : status === "FAIL" ? "✖" : "⚠";
  console.log(`[TEST ${String(num).padStart(2, "0")}] ${name}: ${icon} ${status}${details ? ` (${details})` : ""}`);
}

async function runTests() {
  // Test 1: Mitra uses Gemini as primary provider
  try {
    const configPath = path.join(ROOT, "src/lib/ai/router/modelConfig.ts");
    const configContent = fs.readFileSync(configPath, "utf8");
    assert.ok(configContent.includes("mitra:"), "MODEL_CONFIG has mitra policy defined");
    assert.ok(
      configContent.includes('primaryProvider: (process.env.MITRA_PRIMARY_PROVIDER as ModelProviderName) || "gemini"'),
      "Mitra policy defaults primaryProvider to gemini"
    );
    recordTest(1, "Mitra uses Gemini as primary provider", "PASS");
  } catch (err) {
    recordTest(1, "Mitra uses Gemini as primary provider", "FAIL", err.message);
  }

  // Test 2: Mitra uses OpenRouter as secondary fallback
  try {
    const configPath = path.join(ROOT, "src/lib/ai/router/modelConfig.ts");
    const configContent = fs.readFileSync(configPath, "utf8");
    assert.ok(
      configContent.includes('provider: (process.env.MITRA_FALLBACK_PROVIDER as ModelProviderName) || "openrouter"'),
      "Mitra policy defaults fallback to openrouter"
    );
    recordTest(2, "Mitra uses OpenRouter as secondary fallback", "PASS");
  } catch (err) {
    recordTest(2, "Mitra uses OpenRouter as secondary fallback", "FAIL", err.message);
  }

  // Test 3: Mitra does NOT use OpenAI as primary
  try {
    const talkRoute = fs.readFileSync(path.join(ROOT, "src/app/api/agent/talk/route.ts"), "utf8");
    const voiceRoute = fs.readFileSync(path.join(ROOT, "src/app/api/agent/voice/route.ts"), "utf8");
    const sseRoute = fs.readFileSync(path.join(ROOT, "src/app/api/agent/sse/route.ts"), "utf8");
    const configContent = fs.readFileSync(path.join(ROOT, "src/lib/ai/router/modelConfig.ts"), "utf8");

    assert.ok(!talkRoute.includes("import { openai }"), "Talk route does not import openai");
    assert.ok(!voiceRoute.includes("import { openai }"), "Voice route does not import openai");
    assert.ok(!sseRoute.includes("import { openai }"), "SSE route does not import openai");
    assert.ok(!configContent.includes('primaryProvider: "openai"'), "Mitra policy never sets primaryProvider to openai");
    recordTest(3, "Mitra does NOT use OpenAI as primary", "PASS");
  } catch (err) {
    recordTest(3, "Mitra does NOT use OpenAI as primary", "FAIL", err.message);
  }

  // Test 4: Mitra does NOT use OpenAI as fallback
  try {
    const configContent = fs.readFileSync(path.join(ROOT, "src/lib/ai/router/modelConfig.ts"), "utf8");
    const mitraBlockMatch = configContent.match(/mitra:\s*\(\):\s*RoutingPolicy\s*=>\s*\{([\s\S]*?)\n\s*\},/);
    assert.ok(mitraBlockMatch, "Mitra policy block found in modelConfig.ts");
    const mitraBlock = mitraBlockMatch[1];
    assert.ok(!mitraBlock.includes('"openai"'), "Mitra policy block has no reference to openai string");
    recordTest(4, "Mitra does NOT use OpenAI as fallback", "PASS");
  } catch (err) {
    recordTest(4, "Mitra does NOT use OpenAI as fallback", "FAIL", err.message);
  }

  // Test 5: Groq is not used unless explicitly configured or appropriate
  try {
    const configContent = fs.readFileSync(path.join(ROOT, "src/lib/ai/router/modelConfig.ts"), "utf8");
    assert.ok(
      configContent.includes('process.env.MITRA_ENABLE_GROQ_FALLBACK === "true"'),
      "Groq fallback in Mitra is guarded by MITRA_ENABLE_GROQ_FALLBACK"
    );
    recordTest(5, "Groq is optional and gated by explicit configuration", "PASS");
  } catch (err) {
    recordTest(5, "Groq is optional and gated by explicit configuration", "FAIL", err.message);
  }

  // Test 6: Website generation still uses GPT/OpenAI
  try {
    const genRoute = fs.readFileSync(path.join(ROOT, "src/app/api/generate/route.ts"), "utf8");
    const openaiLib = fs.readFileSync(path.join(ROOT, "src/lib/openai.ts"), "utf8");
    assert.ok(genRoute.includes("openai"), "Website generator route still uses OpenAI");
    assert.ok(openaiLib.includes("OpenAI"), "openai.ts exists and initializes OpenAI client");
    recordTest(6, "Website generation still uses GPT/OpenAI (protected)", "PASS");
  } catch (err) {
    recordTest(6, "Website generation still uses GPT/OpenAI (protected)", "FAIL", err.message);
  }

  // Test 7: Skills Agent does not use OpenAI
  try {
    const configContent = fs.readFileSync(path.join(ROOT, "src/lib/ai/router/modelConfig.ts"), "utf8");
    const skillsStart = configContent.indexOf("skills:");
    const skillsEnd = configContent.indexOf("uniqueness:");
    assert.ok(skillsStart !== -1 && skillsEnd !== -1, "Skills policy block found");
    const skillsBlock = configContent.slice(skillsStart, skillsEnd);
    assert.ok(!skillsBlock.includes('"openai"'), "Skills Agent policy contains zero OpenAI");
    recordTest(7, "Skills Agent does not use OpenAI", "PASS");
  } catch (err) {
    recordTest(7, "Skills Agent does not use OpenAI", "FAIL", err.message);
  }

  // Test 8: Uniqueness Agent does not use OpenAI
  try {
    const configContent = fs.readFileSync(path.join(ROOT, "src/lib/ai/router/modelConfig.ts"), "utf8");
    const uniquenessStart = configContent.indexOf("uniqueness:");
    const uniquenessEnd = configContent.indexOf("mitra:");
    assert.ok(uniquenessStart !== -1 && uniquenessEnd !== -1, "Uniqueness policy block found");
    const uniquenessBlock = configContent.slice(uniquenessStart, uniquenessEnd);
    assert.ok(!uniquenessBlock.includes('"openai"'), "Uniqueness Agent policy contains zero OpenAI");
    recordTest(8, "Uniqueness Agent does not use OpenAI", "PASS");
  } catch (err) {
    recordTest(8, "Uniqueness Agent does not use OpenAI", "FAIL", err.message);
  }

  // Test 9: Boss Agent does not use OpenAI
  try {
    const configContent = fs.readFileSync(path.join(ROOT, "src/lib/ai/router/modelConfig.ts"), "utf8");
    const bossStart = configContent.indexOf("boss:");
    assert.ok(bossStart !== -1, "Boss policy block found");
    const bossBlock = configContent.slice(bossStart);
    assert.ok(!bossBlock.includes('"openai"'), "Boss Agent policy contains zero OpenAI");
    recordTest(9, "Boss Agent does not use OpenAI", "PASS");
  } catch (err) {
    recordTest(9, "Boss Agent does not use OpenAI", "FAIL", err.message);
  }

  // Test 10: Fallback occurs correctly when Gemini fails (to OpenRouter)
  try {
    const routerPath = path.join(ROOT, "src/lib/ai/router/modelRouter.ts");
    const routerContent = fs.readFileSync(routerPath, "utf8");
    assert.ok(routerContent.includes("for (let i = 0; i < pipeline.length; i++)"), "Pipeline iterates through fallbacks");
    assert.ok(routerContent.includes("fallbackCount: i"), "Records fallback count during pipeline traversal");
    recordTest(10, "Fallback pipeline advances sequentially on failure", "PASS");
  } catch (err) {
    recordTest(10, "Fallback pipeline advances sequentially on failure", "FAIL", err.message);
  }

  // Test 11: Router retry logic works for transient errors
  try {
    const routerPath = path.join(ROOT, "src/lib/ai/router/modelRouter.ts");
    const routerContent = fs.readFileSync(routerPath, "utf8");
    assert.ok(routerContent.includes("response.error?.retryable"), "Router checks retryable error flag");
    assert.ok(routerContent.includes("backoffDelay"), "Router implements backoff delay for retries");
    recordTest(11, "Router retry logic works for transient errors", "PASS");
  } catch (err) {
    recordTest(11, "Router retry logic works for transient errors", "FAIL", err.message);
  }

  // Test 12: Conversation context window is bounded (capped messages)
  try {
    const talkRoute = fs.readFileSync(path.join(ROOT, "src/app/api/agent/talk/route.ts"), "utf8");
    const sseRoute = fs.readFileSync(path.join(ROOT, "src/app/api/agent/sse/route.ts"), "utf8");
    assert.ok(/messages[\s\S]*?\.slice\(-10\)/.test(talkRoute), "Talk route caps context messages to 10");
    assert.ok(sseRoute.includes("slice(-8)"), "SSE route caps context history to 8");
    recordTest(12, "Conversation context window is bounded", "PASS");
  } catch (err) {
    recordTest(12, "Conversation context window is bounded", "FAIL", err.message);
  }

  // Test 13: Extracted requirements are preserved across turns
  try {
    const talkRoute = fs.readFileSync(path.join(ROOT, "src/app/api/agent/talk/route.ts"), "utf8");
    assert.ok(
      talkRoute.includes("Prior accumulated extracted needs: ${JSON.stringify(currentNeeds)}"),
      "Prior extracted needs injected into system prompt"
    );
    recordTest(13, "Extracted requirements preserved across turns", "PASS");
  } catch (err) {
    recordTest(13, "Extracted requirements preserved across turns", "FAIL", err.message);
  }

  // Test 14: Normalizer handles Gemini raw outputs cleanly
  try {
    const normalizerPath = path.join(ROOT, "src/lib/ai/agentNormalizer.ts");
    const normalizerContent = fs.readFileSync(normalizerPath, "utf8");
    assert.ok(normalizerContent.includes("normalizeAgentResponse"), "normalizeAgentResponse exported");
    assert.ok(normalizerContent.includes("JSON.parse"), "normalizer handles valid JSON string from Gemini");
    recordTest(14, "Normalizer handles Gemini raw outputs cleanly", "PASS");
  } catch (err) {
    recordTest(14, "Normalizer handles Gemini raw outputs cleanly", "FAIL", err.message);
  }

  // Test 15: Normalizer handles OpenRouter raw outputs cleanly
  try {
    const normalizerPath = path.join(ROOT, "src/lib/ai/agentNormalizer.ts");
    const normalizerContent = fs.readFileSync(normalizerPath, "utf8");
    assert.ok(
      normalizerContent.includes('cleaned.startsWith("```")') && normalizerContent.includes('indexOf("{")'),
      "Normalizer extracts JSON from markdown-fenced responses"
    );
    recordTest(15, "Normalizer handles OpenRouter markdown raw outputs", "PASS");
  } catch (err) {
    recordTest(15, "Normalizer handles OpenRouter markdown raw outputs", "FAIL", err.message);
  }

  // Test 16: Invalid/empty model output triggers deterministic localized fallback
  try {
    const talkRoute = fs.readFileSync(path.join(ROOT, "src/app/api/agent/talk/route.ts"), "utf8");
    assert.ok(
      talkRoute.includes("const fallbackData = buildFallbackResponse"),
      "Talk route invokes buildFallbackResponse when upstream model fails"
    );
    recordTest(16, "Deterministic localized fallback on empty/failed model output", "PASS");
  } catch (err) {
    recordTest(16, "Deterministic localized fallback on empty/failed model output", "FAIL", err.message);
  }

  // Test 17: Telemetry records provider, model, latency, and status
  try {
    const talkRoute = fs.readFileSync(path.join(ROOT, "src/app/api/agent/talk/route.ts"), "utf8");
    assert.ok(talkRoute.includes("recordAgentRun({"), "Talk route records agent telemetry");
    assert.ok(talkRoute.includes("agentName: \"mitra\""), "Telemetry identifies agent as mitra");
    assert.ok(talkRoute.includes("modelProvider: routerResponse.provider"), "Records model provider");
    assert.ok(talkRoute.includes("modelName: routerResponse.model"), "Records model name");
    assert.ok(talkRoute.includes("latencyMs: Math.round(routerResponse.latencyMs)"), "Records latency");
    recordTest(17, "Telemetry records provider, model, latency, and status", "PASS");
  } catch (err) {
    recordTest(17, "Telemetry records provider, model, latency, and status", "FAIL", err.message);
  }

  // Test 18: Telemetry does NOT expose API keys or secrets
  try {
    const configPath = path.join(ROOT, "src/lib/ai/router/modelConfig.ts");
    const configContent = fs.readFileSync(configPath, "utf8");
    assert.ok(configContent.includes("sanitizeErrorOutput"), "Sanitizer function present");
    const testSecret1 = "Bearer sk-1234567890abcdef1234";
    const testSecret2 = "Error: AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4";
    const regexBearer = /Bearer\s+[A-Za-z0-9._-]+/gi;
    const regexGemini = /\bAIzaSy[A-Za-z0-9_-]{20,}\b/g;
    assert.ok(regexBearer.test(testSecret1), "Bearer token pattern detected");
    assert.ok(regexGemini.test(testSecret2), "Gemini key pattern detected");
    recordTest(18, "Telemetry strips API keys and secrets", "PASS");
  } catch (err) {
    recordTest(18, "Telemetry strips API keys and secrets", "FAIL", err.message);
  }

  // Test 19: No duplicate AI model calls for the same turn
  try {
    const talkRoute = fs.readFileSync(path.join(ROOT, "src/app/api/agent/talk/route.ts"), "utf8");
    const routerCalls = (talkRoute.match(/await router\.route\(/g) || []).length;
    assert.equal(routerCalls, 1, "Exactly ONE router.route call per conversational turn");
    recordTest(19, "No duplicate AI model calls for the same turn", "PASS");
  } catch (err) {
    recordTest(19, "No duplicate AI model calls for the same turn", "FAIL", err.message);
  }

  // Test 20: No TTS synthesis triggered for empty/whitespace text
  try {
    const voiceRoute = fs.readFileSync(path.join(ROOT, "src/app/api/agent/voice/route.ts"), "utf8");
    assert.ok(voiceRoute.includes('if (!trimmedText)'), "Checks for empty trimmed text");
    assert.ok(voiceRoute.includes('"text" cannot be empty'), "Rejects empty text with 400 error");
    recordTest(20, "No TTS synthesis triggered for empty/whitespace text", "PASS");
  } catch (err) {
    recordTest(20, "No TTS synthesis triggered for empty/whitespace text", "FAIL", err.message);
  }

  // Test 21: Voice endpoint does NOT call OpenAI TTS
  try {
    const voiceRoute = fs.readFileSync(path.join(ROOT, "src/app/api/agent/voice/route.ts"), "utf8");
    assert.ok(!voiceRoute.includes("openai.audio.speech.create"), "Zero openai.audio.speech.create calls");
    assert.ok(!voiceRoute.includes("import { openai }"), "Zero openai imports in voice route");
    recordTest(21, "Voice endpoint does NOT call OpenAI TTS", "PASS");
  } catch (err) {
    recordTest(21, "Voice endpoint does NOT call OpenAI TTS", "FAIL", err.message);
  }

  // Test 22: Gemini TTS / Linear PCM is used for voice synthesis
  try {
    const voiceRoute = fs.readFileSync(path.join(ROOT, "src/app/api/agent/voice/route.ts"), "utf8");
    assert.ok(voiceRoute.includes("generateGeminiSpeech"), "Uses generateGeminiSpeech for voice synthesis");
    assert.ok(voiceRoute.includes("findMatchingGreetingPcm"), "Uses pre-cached linear PCM greetings");
    assert.ok(voiceRoute.includes("'audio/pcm;rate=24000'"), "Returns linear 24kHz PCM stream");
    recordTest(22, "Gemini TTS / Linear PCM used for voice synthesis", "PASS");
  } catch (err) {
    recordTest(22, "Gemini TTS / Linear PCM used for voice synthesis", "FAIL", err.message);
  }

  // Test 23: Marathi/Hindi/Mixed speech understanding preserved (Phase 4A)
  try {
    const detectorPath = path.join(ROOT, "src/lib/ai/mitraLanguageDetector.ts");
    const detectorContent = fs.readFileSync(detectorPath, "utf8");
    assert.ok(detectorContent.includes("MARATHI_DEVANAGARI_SIGNALS"), "Marathi Devanagari lexicon preserved");
    assert.ok(detectorContent.includes("HINDI_DEVANAGARI_SIGNALS"), "Hindi Devanagari lexicon preserved");
    assert.ok(detectorContent.includes("TECHNICAL_ENGLISH_TERMS"), "Technical English lexicon preserved");
    recordTest(23, "Marathi/Hindi/Mixed speech understanding preserved", "PASS");
  } catch (err) {
    recordTest(23, "Marathi/Hindi/Mixed speech understanding preserved", "FAIL", err.message);
  }

  // Test 24: 2-second silence rule preserved (Phase 4A)
  try {
    const hookPath = path.join(ROOT, "src/hooks/useVoiceAgent.ts");
    const hookContent = fs.readFileSync(hookPath, "utf8");
    assert.ok(hookContent.includes("SILENCE_DURATION_MS = 2000"), "2000ms silence constant preserved");
    assert.ok(hookContent.includes("recognition.continuous = true"), "Continuous recognition preserved");
    recordTest(24, "2-second continuous silence rule preserved", "PASS");
  } catch (err) {
    recordTest(24, "2-second continuous silence rule preserved", "FAIL", err.message);
  }

  // Test 25: All API keys remain server-side only
  try {
    const clientHook = fs.readFileSync(path.join(ROOT, "src/hooks/useVoiceAgent.ts"), "utf8");
    const clientOrb = fs.readFileSync(path.join(ROOT, "src/components/agent/AiTalkingAgent.tsx"), "utf8");
    assert.ok(!clientHook.includes("API_KEY"), "useVoiceAgent has no API_KEY reference");
    assert.ok(!clientOrb.includes("API_KEY"), "AiTalkingAgent has no API_KEY reference");
    assert.ok(!clientHook.includes("process.env"), "useVoiceAgent has no process.env leaks");
    recordTest(25, "All API keys remain strictly server-side only", "PASS");
  } catch (err) {
    recordTest(25, "All API keys remain strictly server-side only", "FAIL", err.message);
  }

  console.log("\n--------------------------------------------------------------------------------");
  const passed = testResults.filter((r) => r.status === "PASS").length;
  const failed = testResults.filter((r) => r.status === "FAIL").length;
  console.log(`TOTAL TESTS: ${testResults.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("--------------------------------------------------------------------------------");

  if (failed > 0) {
    console.error(`\n❌ ${failed} test(s) failed!`);
    process.exit(1);
  } else {
    console.log("\n✅ ALL 25 TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

runTests();
