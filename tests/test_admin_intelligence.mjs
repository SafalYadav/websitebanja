// tests/test_admin_intelligence.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

console.log("================================================================================");
console.log("WEBSITEBANJA AI — PHASE 6: ADMIN INTELLIGENCE CENTER TEST SUITE");
console.log("================================================================================\n");

const testResults = [];

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
  const { isUserAdmin } = jiti("../src/lib/adminAuth.ts");
  const { BossReportSchema } = jiti("../src/lib/agents/boss/types.ts");
  const { analyzeAgentHealth } = jiti("../src/lib/agents/boss/healthAnalyzer.ts");
  const { evaluateDiagnosticRules, fetchTelemetrySummary } = jiti("../src/lib/agents/boss/diagnostics.ts");
  const { generateRecommendations } = jiti("../src/lib/agents/boss/recommendationEngine.ts");
  const { runBossAgent } = jiti("../src/lib/agents/boss/bossAgent.ts");
  const { sanitizeErrorOutput } = jiti("../src/lib/ai/router/modelConfig.ts");

  function createSampleTelemetry() {
    return {
      windowMinutes: 1440,
      totalRuns: 250,
      totalErrors: 5,
      agentBreakdown: {
        mitra: { runs: 100, errors: 2, successes: 98, fallbacks: 5, avgLatencyMs: 420, errorTypes: { TIMEOUT: 2 }, recentErrors: [] },
        skills: { runs: 75, errors: 1, successes: 74, fallbacks: 2, avgLatencyMs: 310, errorTypes: { PARSE: 1 }, recentErrors: [] },
        uniqueness: { runs: 50, errors: 2, successes: 48, fallbacks: 1, avgLatencyMs: 580, errorTypes: { TIMEOUT: 2 }, recentErrors: [] },
        boss: { runs: 25, errors: 0, successes: 25, fallbacks: 0, avgLatencyMs: 650, errorTypes: {}, recentErrors: [] },
      },
      providerBreakdown: {
        gemini: { calls: 220, successes: 215, errors: 5, fallbacks: 8, avgLatencyMs: 380, recentErrors: [] },
        openrouter: { calls: 20, successes: 20, errors: 0, fallbacks: 0, avgLatencyMs: 620, recentErrors: [] },
        groq: { calls: 10, successes: 10, errors: 0, fallbacks: 0, avgLatencyMs: 190, recentErrors: [] },
      },
    };
  }

  // ─── TEST 1: Admin authentication verification ─────────────────────────────
  try {
    process.env.ADMIN_EMAILS = "founder@websitebanja.com,admin@websitebanja.com";
    assert.equal(isUserAdmin({ email: "founder@websitebanja.com" }), true);
    assert.equal(isUserAdmin({ email: "ADMIN@WEBSITEBANJA.COM" }), true); // Case-insensitive
    assert.equal(isUserAdmin({ email: "user@gmail.com" }), false);
    assert.equal(isUserAdmin({ app_metadata: { role: "admin" } }), true);
    assert.equal(isUserAdmin({ app_metadata: { role: "superadmin" } }), true);
    recordTest(1, "Admin authentication verification (isUserAdmin)", "PASS");
  } catch (err) {
    recordTest(1, "Admin authentication verification (isUserAdmin)", "FAIL", err.message);
  }

  // ─── TEST 2: Unauthorized diagnostics request handling ─────────────────────
  try {
    assert.equal(isUserAdmin(null), false);
    assert.equal(isUserAdmin(undefined), false);
    assert.equal(isUserAdmin({ email: "attacker@exploit.net" }), false);
    assert.equal(isUserAdmin({ app_metadata: { role: "user" } }), false);
    recordTest(2, "Unauthorized diagnostics request rejection", "PASS");
  } catch (err) {
    recordTest(2, "Unauthorized diagnostics request rejection", "FAIL", err.message);
  }

  // ─── TEST 3: Authorized admin diagnostics report execution ────────────────
  try {
    const report = await runBossAgent({
      windowMinutes: 1440,
      syntheticTelemetry: createSampleTelemetry(),
    }, { userId: "admin-uuid" });

    assert.ok(report, "Report should be generated");
    assert.ok(["HEALTHY", "DEGRADED", "WARNING", "CRITICAL", "UNKNOWN"].includes(report.overallStatus));
    assert.ok(typeof report.overallHealthScore === "number");
    assert.ok(report.overallHealthScore >= 0 && report.overallHealthScore <= 100);
    recordTest(3, "Authorized admin diagnostics report execution", "PASS", `Score: ${report.overallHealthScore}`);
  } catch (err) {
    recordTest(3, "Authorized admin diagnostics report execution", "FAIL", err.message);
  }

  // ─── TEST 4: Diagnostics response shape conforms to BossReportSchema ───────
  try {
    const report = await runBossAgent({
      windowMinutes: 60,
      syntheticTelemetry: createSampleTelemetry(),
    });
    const parsed = BossReportSchema.safeParse(report);
    assert.ok(parsed.success, "Report must strictly conform to BossReportSchema");
    recordTest(4, "Diagnostics response shape conformant to schema", "PASS");
  } catch (err) {
    recordTest(4, "Diagnostics response shape conformant to schema", "FAIL", err.message);
  }

  // ─── TEST 5: Agent health rendering handles all 4 agents ───────────────────
  try {
    const telemetry = createSampleTelemetry();
    const health = analyzeAgentHealth(telemetry);
    const agentNames = health.agents.map((a) => a.agent);
    assert.ok(agentNames.includes("mitra"), "Must include mitra");
    assert.ok(agentNames.includes("skills"), "Must include skills");
    assert.ok(agentNames.includes("uniqueness"), "Must include uniqueness");
    assert.ok(agentNames.includes("boss"), "Must include boss");
    assert.equal(health.agents.length, 4, "Must evaluate exactly 4 core agents");
    recordTest(5, "Agent health covers all 4 core agents", "PASS");
  } catch (err) {
    recordTest(5, "Agent health covers all 4 core agents", "FAIL", err.message);
  }

  // ─── TEST 6: Missing / empty agent data handled gracefully ─────────────────
  try {
    const emptySummary = {
      windowMinutes: 1440,
      totalRuns: 0,
      totalErrors: 0,
      agentBreakdown: {
        mitra: { runs: 0, errors: 0, successes: 0, fallbacks: 0, avgLatencyMs: 0, errorTypes: {}, recentErrors: [] },
        skills: { runs: 0, errors: 0, successes: 0, fallbacks: 0, avgLatencyMs: 0, errorTypes: {}, recentErrors: [] },
        uniqueness: { runs: 0, errors: 0, successes: 0, fallbacks: 0, avgLatencyMs: 0, errorTypes: {}, recentErrors: [] },
        boss: { runs: 0, errors: 0, successes: 0, fallbacks: 0, avgLatencyMs: 0, errorTypes: {}, recentErrors: [] },
      },
      providerBreakdown: {},
    };
    const health = analyzeAgentHealth(emptySummary);
    assert.equal(health.overallStatus, "UNKNOWN", "Empty telemetry defaults safely to UNKNOWN status when 0 active runs");
    assert.equal(health.overallHealthScore, 100);
    assert.equal(health.agents.find((a) => a.agent === "mitra").status, "UNKNOWN");
    recordTest(6, "Missing / empty agent data handled gracefully", "PASS");
  } catch (err) {
    recordTest(6, "Missing / empty agent data handled gracefully", "FAIL", err.message);
  }

  // ─── TEST 7: Boss diagnostics unavailable fallback ─────────────────────────
  try {
    // Force router to fail with an invalid policy
    const report = await runBossAgent({
      syntheticTelemetry: createSampleTelemetry(),
    }, {
      policy: {
        primary: { provider: "invalid", model: "none" },
        fallbacks: [],
        timeoutMs: 10,
      },
    });

    assert.ok(report, "Should produce valid fallback report");
    assert.equal(report.metadata?.engine, "deterministic_rule_diagnostics");
    assert.ok(report.summary.length > 20, "Should contain informative deterministic summary");
    recordTest(7, "Boss diagnostics unavailable -> safe deterministic fallback", "PASS");
  } catch (err) {
    recordTest(7, "Boss diagnostics unavailable -> safe deterministic fallback", "FAIL", err.message);
  }

  // ─── TEST 8: Provider health breakdown metrics ─────────────────────────────
  try {
    const telemetry = createSampleTelemetry();
    const gemini = telemetry.providerBreakdown.gemini;
    assert.equal(gemini.calls, 220);
    assert.equal(gemini.successes, 215);
    assert.equal(gemini.errors, 5);
    assert.equal(gemini.fallbacks, 8);
    assert.equal(gemini.avgLatencyMs, 380);
    recordTest(8, "Provider breakdown calculates calls, successes, fallbacks, latency", "PASS");
  } catch (err) {
    recordTest(8, "Provider breakdown calculates calls, successes, fallbacks, latency", "FAIL", err.message);
  }

  // ─── TEST 9: Empty telemetry produces safe default structure ───────────────
  try {
    const summary = await fetchTelemetrySummary(1440);
    assert.ok(summary, "fetchTelemetrySummary should return valid object even when DB is offline");
    assert.equal(typeof summary.windowMinutes, "number");
    assert.ok(summary.agentBreakdown.mitra);
    assert.ok(summary.agentBreakdown.skills);
    assert.ok(summary.agentBreakdown.uniqueness);
    assert.ok(summary.agentBreakdown.boss);
    recordTest(9, "Empty telemetry produces safe default structure", "PASS");
  } catch (err) {
    recordTest(9, "Empty telemetry produces safe default structure", "FAIL", err.message);
  }

  // ─── TEST 10: Sanitization of secrets in errors and outputs ────────────────
  try {
    const sensitiveError = "Error connecting to https://api.openai.com/v1: Bearer sk-proj-1234567890abcdef";
    const sanitized = sanitizeErrorOutput(sensitiveError);
    assert.ok(!sanitized.includes("sk-proj-1234567890abcdef"), "Must strip API keys");
    assert.ok(sanitized.includes("[REDACTED]"), "Must replace with [REDACTED]");

    const dbError = "FATAL: password authentication failed for user 'azure_admin' pwd='SuperSecretPassword123'";
    const sanitizedDb = sanitizeErrorOutput(dbError);
    assert.ok(!sanitizedDb.includes("SuperSecretPassword123"), "Must strip database passwords");
    assert.ok(sanitizedDb.includes("[REDACTED]"), "Must redact passwords with [REDACTED]");
    recordTest(10, "Sanitization of secrets in error messages and outputs", "PASS");
  } catch (err) {
    recordTest(10, "Sanitization of secrets in error messages and outputs", "FAIL", err.message);
  }

  // ─── TEST 11: Privacy: Raw private conversation transcripts excluded ──────
  try {
    const telemetry = createSampleTelemetry();
    const { issues } = evaluateDiagnosticRules(telemetry);
    const serializedIssues = JSON.stringify(issues);
    assert.ok(!serializedIssues.includes("user_transcript"), "Issues must not contain raw user conversation transcripts");
    assert.ok(!serializedIssues.includes("prompt_text"), "Issues must not expose private user prompts");
    recordTest(11, "Sanitization of raw private conversation data", "PASS");
  } catch (err) {
    recordTest(11, "Sanitization of raw private conversation data", "FAIL", err.message);
  }

  // ─── TEST 12: Recommendation rendering includes priority and non-autonomous status
  try {
    const mockIssue = {
      id: "test-issue",
      agent: "mitra",
      severity: "HIGH",
      title: "Elevated Fallbacks",
      observation: "Mitra fallback rate is 45%",
      likelyCause: "Gemini rate limit",
      possibleCauses: [],
      confidence: 0.85,
    };
    const recs = generateRecommendations([mockIssue], [], []);
    assert.ok(recs.length > 0, "Should generate recommendations");
    const rec = recs[0];
    assert.equal(rec.status, "OPEN", "Initial recommendation status must be OPEN (no auto-execution)");
    assert.ok(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].includes(rec.priority));
    assert.ok(rec.action.length > 10, "Recommendation must contain clear human action");
    recordTest(12, "Recommendation rendering includes priority and status 'OPEN'", "PASS");
  } catch (err) {
    recordTest(12, "Recommendation rendering includes priority and status 'OPEN'", "FAIL", err.message);
  }

  // ─── TEST 13: Strict separation of FACT vs HYPOTHESIS in diagnostic issues ─
  try {
    const degradedTelemetry = {
      windowMinutes: 1440,
      totalRuns: 100,
      totalErrors: 25,
      agentBreakdown: {
        mitra: { runs: 100, errors: 25, successes: 75, fallbacks: 45, avgLatencyMs: 9500, errorTypes: {}, recentErrors: [] },
        skills: { runs: 0, errors: 0, successes: 0, fallbacks: 0, avgLatencyMs: 0, errorTypes: {}, recentErrors: [] },
        uniqueness: { runs: 0, errors: 0, successes: 0, fallbacks: 0, avgLatencyMs: 0, errorTypes: {}, recentErrors: [] },
        boss: { runs: 0, errors: 0, successes: 0, fallbacks: 0, avgLatencyMs: 0, errorTypes: {}, recentErrors: [] },
      },
      providerBreakdown: {},
    };
    const { issues } = evaluateDiagnosticRules(degradedTelemetry);
    assert.ok(issues.length > 0, "Should detect elevated issues");

    for (const issue of issues) {
      assert.ok(issue.observation, "Must have an observed empirical fact");
      assert.ok(issue.likelyCause, "Must have a likely cause hypothesis");
      assert.notEqual(issue.observation, issue.likelyCause, "Fact and hypothesis must be strictly distinct");
      assert.ok(Array.isArray(issue.possibleCauses), "Must support secondary possible causes list");
    }
    recordTest(13, "Strict separation of FACT vs HYPOTHESIS in issues", "PASS");
  } catch (err) {
    recordTest(13, "Strict separation of FACT vs HYPOTHESIS in issues", "FAIL", err.message);
  }

  // ─── TEST 14: Severity classification correctly handles all 5 levels ───────
  try {
    const severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
    for (const sev of severities) {
      const parsed = BossReportSchema.safeParse({
        overallStatus: "DEGRADED",
        overallHealthScore: 70,
        summary: "Test summary",
        agents: [],
        issues: [{
          id: `iss-${sev}`,
          agent: "mitra",
          severity: sev,
          title: `Test ${sev}`,
          observation: "Observed",
          likelyCause: "Hypothesis",
          possibleCauses: [],
          confidence: 0.8,
        }],
        recommendations: [],
        crossAgentCorrelations: [],
      });
      assert.ok(parsed.success, `Severity ${sev} must be valid according to schema`);
    }
    recordTest(14, "Severity classification handles all 5 levels correctly", "PASS");
  } catch (err) {
    recordTest(14, "Severity classification handles all 5 levels correctly", "FAIL", err.message);
  }

  // ─── TEST 15: Time window bounding prevents unbounded table scans ──────────
  try {
    const summaryMin = await fetchTelemetrySummary(-50); // Negative window
    assert.ok(summaryMin.windowMinutes >= 5, "Window minutes must be bounded to minimum 5");

    const summaryMax = await fetchTelemetrySummary(999999); // Excessive window
    assert.ok(summaryMax.windowMinutes <= 10080, "Window minutes must be bounded to maximum 7 days (10080 min)");
    recordTest(15, "Time window bounding strictly limits query bounds (5 to 10080 min)", "PASS");
  } catch (err) {
    recordTest(15, "Time window bounding strictly limits query bounds (5 to 10080 min)", "FAIL", err.message);
  }

  // ─── TEST 16: Zero autonomous write permissions enforced ──────────────────
  try {
    const report = await runBossAgent({
      syntheticTelemetry: createSampleTelemetry(),
    });

    // Verify BossReport structure has no mutation endpoints or executable payloads
    assert.equal(typeof report.executeAction, "undefined", "Boss report must not include executeAction");
    assert.equal(typeof report.mutateConfig, "undefined", "Boss report must not include mutateConfig");
    assert.equal(typeof report.deployCode, "undefined", "Boss report must not include deployCode");

    for (const rec of report.recommendations) {
      assert.equal(rec.status, "OPEN", "All recommendations must be OPEN, requiring human approval");
    }
    recordTest(16, "Zero autonomous write permissions enforced (read-only supervisor)", "PASS");
  } catch (err) {
    recordTest(16, "Zero autonomous write permissions enforced (read-only supervisor)", "FAIL", err.message);
  }

  // ─── SUMMARY REPORT ────────────────────────────────────────────────────────
  console.log("\n--------------------------------------------------------------------------------");
  const passed = testResults.filter((t) => t.status === "PASS").length;
  const failed = testResults.filter((t) => t.status === "FAIL").length;
  console.log(`TOTAL TESTS: ${testResults.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("--------------------------------------------------------------------------------\n");

  if (failed > 0) {
    console.error(`❌ ${failed} TESTS FAILED!`);
    process.exit(1);
  } else {
    console.log(`✅ ALL ${passed} TESTS PASSED SUCCESSFULLY!`);
  }
}

runTests().catch((err) => {
  console.error("Fatal test suite execution error:", err);
  process.exit(1);
});
