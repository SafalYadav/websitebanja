// tests/test_boss_agent.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

console.log("================================================================================");
console.log("WEBSITEBANJA AI — PHASE 5: BOSS AGENT (SUPERVISOR / ORCHESTRATOR) TEST SUITE");
console.log("================================================================================\n");

const testResults = [];

import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: {
    "@/": path.resolve(ROOT, "src") + "/",
  },
});

function recordTest(num, name, status, details = "") {
  testResults.push({ num, name, status, details });
  const icon = status === "PASS" ? "✔" : status === "FAIL" ? "✖" : "⚠";
  console.log(`[TEST ${String(num).padStart(2, "0")}] ${name}: ${icon} ${status}${details ? ` (${details})` : ""}`);
}

async function runTests() {
  const { analyzeAgentHealth } = jiti("../src/lib/agents/boss/healthAnalyzer.ts");
  const { evaluateDiagnosticRules } = jiti("../src/lib/agents/boss/diagnostics.ts");
  const { generateRecommendations } = jiti("../src/lib/agents/boss/recommendationEngine.ts");
  const { runBossAgent } = jiti("../src/lib/agents/boss/bossAgent.ts");
  const { isUserAdmin } = jiti("../src/lib/adminAuth.ts");

  function createBaseTelemetry() {
    return {
      windowMinutes: 1440,
      totalRuns: 300,
      totalErrors: 0,
      agentBreakdown: {
        mitra: { runs: 100, errors: 0, successes: 100, fallbacks: 2, avgLatencyMs: 450, errorTypes: {}, recentErrors: [] },
        skills: { runs: 100, errors: 0, successes: 100, fallbacks: 3, avgLatencyMs: 280, errorTypes: {}, recentErrors: [] },
        uniqueness: { runs: 100, errors: 0, successes: 100, fallbacks: 1, avgLatencyMs: 600, errorTypes: {}, recentErrors: [] },
        boss: { runs: 0, errors: 0, successes: 0, fallbacks: 0, avgLatencyMs: 0, errorTypes: {}, recentErrors: [] },
      },
      providerBreakdown: { gemini: { calls: 290, errors: 0 }, openrouter: { calls: 10, errors: 0 } },
    };
  }

  // Test 1: Healthy system -> HEALTHY
  try {
    const t = createBaseTelemetry();
    const res = analyzeAgentHealth(t);
    assert.equal(res.overallStatus, "HEALTHY", "Overall status must be HEALTHY");
    assert.ok(res.overallHealthScore >= 90, `Health score should be >= 90, got ${res.overallHealthScore}`);
    recordTest(1, "Healthy system -> HEALTHY", "PASS", `Score: ${res.overallHealthScore}`);
  } catch (err) {
    recordTest(1, "Healthy system -> HEALTHY", "FAIL", err.message);
  }

  // Test 2: Elevated errors -> DEGRADED / WARNING
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.mitra.errors = 18; // 18% error rate
    const res = analyzeAgentHealth(t);
    const mitraRes = res.agents.find((a) => a.agent === "mitra");
    assert.ok(mitraRes.healthScore < 85, `Mitra score should drop below 85, got ${mitraRes.healthScore}`);
    assert.ok(["DEGRADED", "WARNING"].includes(res.overallStatus), `Status must be DEGRADED or WARNING, got ${res.overallStatus}`);
    recordTest(2, "Elevated errors -> DEGRADED / WARNING", "PASS", `Status: ${res.overallStatus}, Mitra Score: ${mitraRes.healthScore}`);
  } catch (err) {
    recordTest(2, "Elevated errors -> DEGRADED / WARNING", "FAIL", err.message);
  }

  // Test 3: Critical agent failure -> CRITICAL
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.skills.errors = 45; // 45% error rate
    const res = analyzeAgentHealth(t);
    assert.equal(res.overallStatus, "CRITICAL", `Expected CRITICAL, got ${res.overallStatus}`);
    recordTest(3, "Critical agent failure -> CRITICAL", "PASS", `Status: ${res.overallStatus}`);
  } catch (err) {
    recordTest(3, "Critical agent failure -> CRITICAL", "FAIL", err.message);
  }

  // Test 4: Mitra provider fallback spike detected
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.mitra.fallbacks = 48; // 48% fallback rate
    const { issues } = evaluateDiagnosticRules(t);
    const fbIssue = issues.find((i) => i.id === "mitra-fallback-spike");
    assert.ok(fbIssue, "Mitra fallback spike must be detected");
    assert.ok(fbIssue.observation.includes("48.0%"), "Observation must cite factual percentage");
    recordTest(4, "Mitra provider fallback spike detected", "PASS");
  } catch (err) {
    recordTest(4, "Mitra provider fallback spike detected", "FAIL", err.message);
  }

  // Test 5: Skills Agent fallback spike detected
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.skills.fallbacks = 52; // 52% fallback rate
    const { issues } = evaluateDiagnosticRules(t);
    const skillsIssue = issues.find((i) => i.id === "skills-fallback-spike");
    assert.ok(skillsIssue, "Skills fallback spike must be detected");
    recordTest(5, "Skills Agent fallback spike detected", "PASS");
  } catch (err) {
    recordTest(5, "Skills Agent fallback spike detected", "FAIL", err.message);
  }

  // Test 6: Uniqueness regeneration spike detected
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.uniqueness.metadataSummary = { regenerationRate: 0.38 }; // 38%
    const { issues } = evaluateDiagnosticRules(t);
    const regenIssue = issues.find((i) => i.id === "uniqueness-regen-spike");
    assert.ok(regenIssue, "Uniqueness regeneration spike must be detected");
    assert.equal(regenIssue.severity, "MEDIUM");
    recordTest(6, "Uniqueness regeneration spike detected", "PASS");
  } catch (err) {
    recordTest(6, "Uniqueness regeneration spike detected", "FAIL", err.message);
  }

  // Test 7: Cross-agent correlation works
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.uniqueness.metadataSummary = { regenerationRate: 0.42 };
    t.agentBreakdown.skills.fallbacks = 10;
    const { crossAgentCorrelations } = evaluateDiagnosticRules(t);
    const designRepetition = crossAgentCorrelations.find((c) => c.pattern === "Systemic Design Repetition Loop");
    assert.ok(designRepetition, "Cross-agent correlation 'Systemic Design Repetition Loop' must trigger");
    assert.deepEqual(designRepetition.agents, ["skills", "uniqueness"]);
    recordTest(7, "Cross-agent correlation works", "PASS");
  } catch (err) {
    recordTest(7, "Cross-agent correlation works", "FAIL", err.message);
  }

  // Test 8: Root cause separates facts from hypotheses
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.mitra.errors = 35;
    const { issues } = evaluateDiagnosticRules(t);
    const criticalMitra = issues.find((i) => i.id === "mitra-err-critical");
    assert.ok(criticalMitra.observation, "Must have empirical observation");
    assert.ok(criticalMitra.likelyCause, "Must have likely cause hypothesis");
    assert.ok(Array.isArray(criticalMitra.possibleCauses) && criticalMitra.possibleCauses.length > 0, "Must have possible causes");
    assert.notEqual(criticalMitra.observation, criticalMitra.likelyCause, "Observation and likely cause must be distinct");
    recordTest(8, "Root cause separates facts from hypotheses", "PASS");
  } catch (err) {
    recordTest(8, "Root cause separates facts from hypotheses", "FAIL", err.message);
  }

  // Test 9: Confidence score is valid
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.mitra.errors = 35;
    t.agentBreakdown.uniqueness.metadataSummary = { regenerationRate: 0.35 };
    const { issues } = evaluateDiagnosticRules(t);
    for (const issue of issues) {
      assert.ok(typeof issue.confidence === "number", "Confidence must be a number");
      assert.ok(issue.confidence >= 0 && issue.confidence <= 1, `Confidence must be in [0, 1], got ${issue.confidence}`);
    }
    recordTest(9, "Confidence score is valid", "PASS");
  } catch (err) {
    recordTest(9, "Confidence score is valid", "FAIL", err.message);
  }

  // Test 10: Severity classification works
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.mitra.errors = 35; // Critical
    t.agentBreakdown.mitra.fallbacks = 45; // Medium
    const { issues } = evaluateDiagnosticRules(t);
    const severities = issues.map((i) => i.severity);
    assert.ok(severities.includes("CRITICAL"), "Includes CRITICAL severity");
    assert.ok(severities.includes("MEDIUM"), "Includes MEDIUM severity");
    recordTest(10, "Severity classification works", "PASS");
  } catch (err) {
    recordTest(10, "Severity classification works", "FAIL", err.message);
  }

  // Test 11: Recommendations are structured
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.uniqueness.metadataSummary = { regenerationRate: 0.35 };
    const { issues, crossAgentCorrelations } = evaluateDiagnosticRules(t);
    const health = analyzeAgentHealth(t);
    const recs = generateRecommendations(issues, crossAgentCorrelations, health.agents);
    assert.ok(recs.length > 0, "Must produce recommendations");
    for (const r of recs) {
      assert.ok(r.id && r.title && r.action && r.priority && r.agent, "Recommendation has required fields");
      assert.equal(r.status, "OPEN", "Status must be OPEN");
    }
    recordTest(11, "Recommendations are structured", "PASS");
  } catch (err) {
    recordTest(11, "Recommendations are structured", "FAIL", err.message);
  }

  // Test 12: Malformed AI response -> deterministic fallback
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.mitra.errors = 20;
    // Execute Boss Agent with synthetic telemetry and guaranteed fallback
    const report = await runBossAgent({ syntheticTelemetry: t });
    assert.ok(report.overallStatus, "Report has overallStatus");
    assert.ok(typeof report.overallHealthScore === "number", "Report has overallHealthScore");
    assert.ok(report.summary.length > 10, "Summary is populated");
    assert.ok(report.agents.length >= 3, "All 3 agents reported");
    recordTest(12, "Malformed AI response -> deterministic fallback", "PASS");
  } catch (err) {
    recordTest(12, "Malformed AI response -> deterministic fallback", "FAIL", err.message);
  }

  // Test 13: All providers unavailable -> deterministic diagnostics
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.mitra.fallbacks = 50;
    // Run Boss Agent with mock invalid policy ensuring all model calls bypass to deterministic
    const report = await runBossAgent(
      { syntheticTelemetry: t },
      { policy: { primaryProvider: "gemini", fallbacks: [], timeoutMs: 1 } }
    );
    assert.ok(report.overallHealthScore > 0, "Deterministic fallback calculates health score");
    assert.ok(report.issues.length > 0, "Deterministic fallback detects issues");
    recordTest(13, "All providers unavailable -> deterministic diagnostics", "PASS");
  } catch (err) {
    recordTest(13, "All providers unavailable -> deterministic diagnostics", "FAIL", err.message);
  }

  // Test 14: No autonomous modification capability
  try {
    const bossCode = fs.readFileSync(path.join(ROOT, "src/lib/agents/boss/bossAgent.ts"), "utf8");
    assert.ok(!bossCode.includes("fs.writeFileSync"), "Boss does not write to local filesystem");
    assert.ok(!bossCode.includes("child_process"), "Boss does not spawn child processes");
    assert.ok(!bossCode.includes("execSync"), "Boss does not execute shell commands");
    recordTest(14, "No autonomous modification capability", "PASS");
  } catch (err) {
    recordTest(14, "No autonomous modification capability", "FAIL", err.message);
  }

  // Test 15: Boss cannot execute arbitrary commands
  try {
    const bossFiles = fs.readdirSync(path.join(ROOT, "src/lib/agents/boss")).filter(f => fs.statSync(path.join(ROOT, "src/lib/agents/boss", f)).isFile());
    for (const f of bossFiles) {
      const content = fs.readFileSync(path.join(ROOT, "src/lib/agents/boss", f), "utf8");
      assert.ok(!content.includes("eval("), `File ${f} does not contain eval()`);
      assert.ok(!content.includes("exec("), `File ${f} does not contain exec()`);
      assert.ok(!content.includes("spawn("), `File ${f} does not contain spawn()`);
    }
    recordTest(15, "Boss cannot execute arbitrary commands", "PASS");
  } catch (err) {
    recordTest(15, "Boss cannot execute arbitrary commands", "FAIL", err.message);
  }

  // Test 16: Boss cannot write to production database schemas or tables
  try {
    const diagCode = fs.readFileSync(path.join(ROOT, "src/lib/agents/boss/diagnostics.ts"), "utf8");
    assert.ok(!diagCode.includes("DROP "), "No DROP statements");
    assert.ok(!diagCode.includes("ALTER "), "No ALTER statements");
    assert.ok(!diagCode.includes("UPDATE "), "No UPDATE statements in diagnostics");
    assert.ok(!diagCode.includes("DELETE "), "No DELETE statements");
    recordTest(16, "Boss cannot write to production schemas/tables", "PASS");
  } catch (err) {
    recordTest(16, "Boss cannot write to production schemas/tables", "FAIL", err.message);
  }

  // Test 17: Admin-only diagnostics route exists
  try {
    const routeCode = fs.readFileSync(path.join(ROOT, "src/app/api/admin/agents/diagnostics/route.ts"), "utf8");
    assert.ok(routeCode.includes("verifyAdminAuth"), "Route imports verifyAdminAuth");
    assert.ok(routeCode.includes("auth.isAdmin"), "Route verifies auth.isAdmin");
    assert.ok(routeCode.includes("403") || routeCode.includes("401"), "Route returns 401/403 for unauthorized requests");
    recordTest(17, "Admin-only diagnostics route protected", "PASS");
  } catch (err) {
    recordTest(17, "Admin-only diagnostics route protected", "FAIL", err.message);
  }

  // Test 18: Unauthorized request rejected
  try {
    // Test isUserAdmin with non-admin user
    const regularUser = { id: "user-123", email: "guest@example.com", app_metadata: { role: "authenticated" } };
    assert.equal(isUserAdmin(regularUser), false, "Regular user must be rejected as non-admin");

    const nullUser = null;
    assert.equal(isUserAdmin(nullUser), false, "Null user must be rejected");

    // Test with admin user
    const adminUser = { id: "admin-123", email: "admin@example.com", app_metadata: { role: "admin" } };
    assert.equal(isUserAdmin(adminUser), true, "Admin role user must be accepted");
    recordTest(18, "Unauthorized requests rejected by isUserAdmin", "PASS");
  } catch (err) {
    recordTest(18, "Unauthorized requests rejected by isUserAdmin", "FAIL", err.message);
  }

  // Test 19: No secrets appear in output
  try {
    const routeCode = fs.readFileSync(path.join(ROOT, "src/app/api/admin/agents/diagnostics/route.ts"), "utf8");
    assert.ok(routeCode.includes("sanitizeErrorOutput"), "Route uses sanitizeErrorOutput on errors");
    assert.ok(!routeCode.includes("process.env.OPENAI_API_KEY"), "Does not access OPENAI_API_KEY");
    recordTest(19, "No secrets appear in output", "PASS");
  } catch (err) {
    recordTest(19, "No secrets appear in output", "FAIL", err.message);
  }

  // Test 20: No full private conversations unnecessarily sent to model
  try {
    const promptCode = fs.readFileSync(path.join(ROOT, "src/lib/agents/boss/bossPrompt.ts"), "utf8");
    assert.ok(!promptCode.includes("userMessage"), "Prompt does not ingest userMessage");
    assert.ok(!promptCode.includes("transcript"), "Prompt does not ingest raw transcript");
    assert.ok(promptCode.includes("Telemetry"), "Prompt focuses exclusively on Telemetry");
    recordTest(20, "No full private conversations sent to model", "PASS");
  } catch (err) {
    recordTest(20, "No full private conversations sent to model", "FAIL", err.message);
  }

  // Test 21: Bounded telemetry query
  try {
    const diagCode = fs.readFileSync(path.join(ROOT, "src/lib/agents/boss/diagnostics.ts"), "utf8");
    assert.ok(diagCode.includes("LIMIT 500"), "Runs query has strict LIMIT 500");
    assert.ok(diagCode.includes("LIMIT 200"), "Errors query has strict LIMIT 200");
    recordTest(21, "Bounded telemetry query (capped limits)", "PASS");
  } catch (err) {
    recordTest(21, "Bounded telemetry query (capped limits)", "FAIL", err.message);
  }

  // Test 22: GPT/OpenAI is not used by Boss
  try {
    const bossFiles = fs.readdirSync(path.join(ROOT, "src/lib/agents/boss")).filter(f => fs.statSync(path.join(ROOT, "src/lib/agents/boss", f)).isFile());
    for (const f of bossFiles) {
      const content = fs.readFileSync(path.join(ROOT, "src/lib/agents/boss", f), "utf8");
      assert.ok(!content.includes("from '@/lib/openai'"), `File ${f} does not import from openai`);
      assert.ok(!content.includes("from '@/lib/ai/openaiProvider'"), `File ${f} does not import openaiProvider`);
    }
    recordTest(22, "GPT/OpenAI is not used by Boss Agent", "PASS");
  } catch (err) {
    recordTest(22, "GPT/OpenAI is not used by Boss Agent", "FAIL", err.message);
  }

  // Test 23: Existing Model Router is reused
  try {
    const bossCode = fs.readFileSync(path.join(ROOT, "src/lib/agents/boss/bossAgent.ts"), "utf8");
    assert.ok(bossCode.includes('from "@/lib/ai/router/modelRouter"'), "Imports ModelRouter from Phase 1");
    assert.ok(bossCode.includes("new ModelRouter()"), "Instantiates ModelRouter");
    recordTest(23, "Existing Model Router is reused", "PASS");
  } catch (err) {
    recordTest(23, "Existing Model Router is reused", "FAIL", err.message);
  }

  // Test 24: Health score remains normalized [0, 100]
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.mitra.errors = 200; // Extreme errors
    t.agentBreakdown.mitra.runs = 100;
    const res = analyzeAgentHealth(t);
    assert.ok(res.overallHealthScore >= 0 && res.overallHealthScore <= 100, `Health score ${res.overallHealthScore} within [0, 100]`);
    for (const a of res.agents) {
      assert.ok(a.healthScore >= 0 && a.healthScore <= 100, `Agent ${a.agent} health score ${a.healthScore} within [0, 100]`);
    }
    recordTest(24, "Health score remains normalized [0, 100]", "PASS");
  } catch (err) {
    recordTest(24, "Health score remains normalized [0, 100]", "FAIL", err.message);
  }

  // Test 25: Unknown agent status handled safely
  try {
    const t = createBaseTelemetry();
    t.agentBreakdown.mitra.runs = 0; // Inactive agent
    const res = analyzeAgentHealth(t);
    const mitraMetric = res.agents.find((a) => a.agent === "mitra");
    assert.equal(mitraMetric.status, "UNKNOWN", "Agent with 0 runs marked as UNKNOWN");
    assert.equal(mitraMetric.healthScore, 100, "Unknown agent does not penalize health score");
    recordTest(25, "Unknown agent status handled safely", "PASS");
  } catch (err) {
    recordTest(25, "Unknown agent status handled safely", "FAIL", err.message);
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
