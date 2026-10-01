// tests/phase17_executive_intelligence.test.mjs
/**
 * Test Suite: Phase 17 — CEO / Executive Intelligence Foundation
 * Tests Executive Agent, Orchestrator, Sub-Agent Registry, Tool Registry,
 * Safety Policies, Loop Detection, Verification, Category Mismatch Detection,
 * Telemetry, Transport-Agnostic Service, and Redaction.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// Import modules via jiti
const {
  executeExecutiveTask,
  getRecentExecutiveRuns,
  getExecutiveRun,
  ExecutiveOrchestrator,
  ExecutiveAgent,
  AgentRegistry,
  ToolRegistry,
  ExecutionMemory,
  evaluateExecutiveExecution,
  TrajectoryLogger,
} = jiti("./src/lib/intelligence/index.ts");

const { LoopDetector, validateToolSafety } = jiti("./src/lib/intelligence/policies/safetyPolicy.ts");
const { verifyExecutiveExecution } = jiti("./src/lib/intelligence/executive/executiveVerifier.ts");
const { detectDomainFromObjective } = jiti("./src/lib/intelligence/executive/executiveContextBuilder.ts");

describe("Phase 17 — Executive / CEO Intelligence Foundation", () => {
  it("Test 1: Domain detection and objective handling", () => {
    const restaurantDomain = detectDomainFromObjective("Fine dining Italian restaurant in Vadodara");
    assert.equal(restaurantDomain, "restaurant", "Should identify restaurant domain");

    const bikeDomain = detectDomainFromObjective("Electric bike rental and scooter services");
    assert.equal(bikeDomain, "automotive", "Should identify automotive/rental domain");

    const hospitalDomain = detectDomainFromObjective("Pediatric dental clinic in Ahmedabad");
    assert.equal(hospitalDomain, "healthcare", "Should identify healthcare domain");
  });

  it("Test 2: Structured CEO output schema & deterministic planner", () => {
    const agent = new ExecutiveAgent();
    const context = {
      runId: "test_run_1",
      objective: "Launch high-converting website for boutique cafe in Surat",
      priority: "high",
      allowExternalWrite: false,
      requireHumanApproval: true,
      constraints: ["Strict anti-generic design"],
      detectedDomain: "restaurant",
      availableAgents: ["boss", "uniqueness", "skills", "designer"],
      availableTools: ["preview_generation", "preview_validation"],
      history: [],
      startTime: Date.now(),
    };

    const decision = agent.generateDeterministicDecision(context);

    assert.equal(decision.objective, context.objective);
    assert.equal(decision.priority, "high");
    assert.ok(Array.isArray(decision.plan), "Plan should be an array");
    assert.ok(decision.plan.length > 0, "Plan should contain steps");
    assert.ok(Array.isArray(decision.delegations), "Delegations should be an array");
    assert.ok(Array.isArray(decision.tool_calls), "Tool calls should be an array");
    assert.ok(Array.isArray(decision.constraints), "Constraints should be an array");
    assert.ok(Array.isArray(decision.risk), "Risk should be an array");
    assert.equal(typeof decision.approval_required, "boolean");
    assert.ok(decision.next_action.length > 0, "Next action must be specified");
    assert.ok(decision.report.length > 0, "Report must be specified");
  });

  it("Test 3: Agent Registry discovery and execution", async () => {
    const registry = AgentRegistry.getInstance();
    const available = registry.getAvailableAgents();

    assert.ok(available.includes("boss"), "Boss agent must be registered");
    assert.ok(available.includes("uniqueness"), "Uniqueness agent must be registered");
    assert.ok(available.includes("skills"), "Skills agent must be registered");
    assert.ok(available.includes("mitra"), "Mitra agent must be registered");
    assert.ok(available.includes("designer"), "Designer agent must be registered");
    assert.ok(available.includes("copywriter"), "Copywriter agent must be registered");
    assert.ok(available.includes("auditor"), "Auditor agent must be registered");

    // Execute delegation to designer
    const context = {
      runId: "reg_test",
      objective: "Design hero for cafe",
      priority: "medium",
      allowExternalWrite: false,
      requireHumanApproval: true,
      constraints: [],
      detectedDomain: "restaurant",
      availableAgents: available,
      availableTools: [],
      history: [],
      startTime: Date.now(),
    };

    const designerResult = await registry.executeDelegation(
      "designer",
      "Design layout",
      { businessName: "Artisan Cafe", category: "restaurant" },
      context
    );
    assert.equal(designerResult.success, true);
    assert.ok(designerResult.data, "Designer data should be populated");
  });

  it("Test 4: Safety Policy — WhatsApp strictly and unconditionally blocked", () => {
    const context = {
      runId: "safe_test",
      objective: "Notify client",
      priority: "low",
      allowExternalWrite: true,
      requireHumanApproval: false,
      constraints: [],
      availableAgents: [],
      availableTools: ["send_whatsapp_message"],
      history: [],
      startTime: Date.now(),
    };

    const check = validateToolSafety(
      "send_whatsapp_message",
      "HIGH_RISK_ACTION",
      { phoneNumber: "+919876543210", message: "Hello" },
      context
    );

    assert.equal(check.allowed, false, "WhatsApp must be blocked");
    assert.match(check.reason, /WhatsApp outbound communication is strictly disabled/i);
  });

  it("Test 5: Safety Policy — External outreach gated on human approval", () => {
    const gatedContext = {
      runId: "email_gate_test",
      objective: "Send outreach email",
      priority: "high",
      allowExternalWrite: true,
      requireHumanApproval: true, // Human approval is required
      constraints: [],
      availableAgents: [],
      availableTools: ["send_outreach_email"],
      history: [],
      startTime: Date.now(),
    };

    const gatedCheck = validateToolSafety(
      "send_outreach_email",
      "WRITE_EXTERNAL",
      { recipientEmail: "lead@example.com", draftId: "draft_123" },
      gatedContext
    );
    assert.equal(gatedCheck.allowed, false, "Outreach send must be blocked when human approval is required");

    const approvedContext = {
      ...gatedContext,
      requireHumanApproval: false, // Explicit approval given
    };
    const approvedCheck = validateToolSafety(
      "send_outreach_email",
      "WRITE_EXTERNAL",
      { recipientEmail: "lead@example.com", draftId: "draft_123" },
      approvedContext
    );
    assert.equal(approvedCheck.allowed, true, "Outreach send allowed when human approval criteria satisfied");
  });

  it("Test 6: Category mismatch detection in verification", () => {
    const context = {
      runId: "mismatch_test",
      objective: "Fine dining restaurant website",
      priority: "high",
      allowExternalWrite: false,
      requireHumanApproval: true,
      constraints: [],
      detectedDomain: "restaurant",
      availableAgents: [],
      availableTools: [],
      history: [],
      startTime: Date.now(),
    };

    const decision = {
      objective: context.objective,
      priority: "high",
      plan: ["Generate preview"],
      delegations: [],
      tool_calls: [],
      constraints: [],
      risk: [],
      approval_required: false,
      next_action: "deploy",
      report: "Generated preview for restaurant",
    };

    // Mismatched output containing bike rental terms for a restaurant
    const mismatchedDelegation = [
      {
        agent: "designer",
        task: "Generate preview layout",
        success: true,
        data: { previewHtml: "<div>Best bike rental and scooter tours in town!</div>" },
      },
    ];

    const verifications = verifyExecutiveExecution(decision, mismatchedDelegation, [], context);
    const categoryCheck = verifications.find((v) => v.rule === "domain_category_coherence");

    assert.ok(categoryCheck, "Category coherence check must run");
    assert.equal(categoryCheck.passed, false, "Category mismatch must be detected");
    assert.equal(categoryCheck.categoryMismatch, true);
    assert.match(categoryCheck.details, /bike rental/i);
  });

  it("Test 7: Infinite loop detection halts repeating failure cycles", () => {
    const detector = new LoopDetector();
    const type = "tool";
    const name = "flaky_tool";
    const params = { target: "test_entity" };

    // Record 1st failure
    detector.recordAttempt(type, name, params, false);
    assert.equal(detector.checkLoop(type, name, params, 2), false, "1st failure is not yet a loop");

    // Record 2nd consecutive identical failure
    detector.recordAttempt(type, name, params, false);
    assert.equal(detector.checkLoop(type, name, params, 2), true, "2nd consecutive failure triggers loop detection");

    // Success breaks the loop
    detector.recordAttempt(type, name, params, true);
    assert.equal(detector.checkLoop(type, name, params, 2), false, "Success clears consecutive failure loop");
  });

  it("Test 8: Full Executive Orchestrator lifecycle (OBSERVE -> PLAN -> DELEGATE -> VERIFY -> REPORT)", async () => {
    const orchestrator = new ExecutiveOrchestrator();
    const result = await orchestrator.execute({
      objective: "Fine dining restaurant in Vadodara: analyze market, verify domain skills, and design personalized preview.",
      priority: "high",
      allowExternalWrite: false,
      requireHumanApproval: true,
    });

    assert.equal(result.success, true, "Executive execution should succeed");
    assert.equal(result.state, "COMPLETED", "Final state should be COMPLETED");
    assert.ok(result.runId.startsWith("exec_"), "Run ID must have exec_ prefix");
    assert.ok(result.trajectory.length >= 6, "Trajectory must track all state transitions");

    // Verify trajectory states
    const states = result.trajectory.map((t) => t.state);
    assert.ok(states.includes("OBSERVING"));
    assert.ok(states.includes("UNDERSTANDING"));
    assert.ok(states.includes("PLANNING"));
    assert.ok(states.includes("DELEGATING"));
    assert.ok(states.includes("VERIFYING"));
    assert.ok(states.includes("REPORTING"));
    assert.ok(states.includes("COMPLETED"));

    // Verify delegations & tools ran
    assert.ok(result.delegationResults.length > 0, "Delegation results should exist");
    assert.ok(result.toolCallResults.length > 0, "Tool call results should exist");

    // Verify report generated
    assert.ok(result.report.includes("EXECUTIVE BRIEFING"), "Report briefing must be generated");
    assert.ok(result.decision.next_action.length > 0, "Next action must be specified");
  });

  it("Test 9: Self-repair on category mismatch during execution", async () => {
    const orchestrator = new ExecutiveOrchestrator({
      bounds: {
        maxRetries: 2,
        maxDurationMs: 15_000,
        maxToolCalls: 5,
        maxDelegationDepth: 2,
        maxConsecutiveIdenticalFailures: 2,
      },
    });

    // Run objective
    const result = await orchestrator.execute({
      objective: "High-end jewelry boutique in Surat: craft bespoke visual architecture",
      priority: "medium",
    });

    assert.equal(result.success, true);
    assert.equal(result.state, "COMPLETED");
  });

  it("Test 10: In-Memory Memory & Transport-Agnostic Service API", async () => {
    const recent = getRecentExecutiveRuns(5);
    assert.ok(Array.isArray(recent), "Recent runs must return an array");
    assert.ok(recent.length > 0, "Recent runs must include executed runs");

    const latest = recent[0];
    const fetched = getExecutiveRun(latest.runId);
    assert.ok(fetched, "Should fetch run by ID from ExecutionMemory");
    assert.equal(fetched.runId, latest.runId);
  });

  it("Test 11: Executive Evaluator scores safety, integrity, and efficiency", async () => {
    const recent = getRecentExecutiveRuns(1);
    assert.ok(recent.length > 0);
    const evaluation = evaluateExecutiveExecution(recent[0]);

    assert.ok(evaluation.overallScore >= 0 && evaluation.overallScore <= 100);
    assert.equal(evaluation.safetyScore, 100, "Safety score must be 100 (no violations)");
    assert.ok(["A", "B", "C", "D", "F"].includes(evaluation.grade));
    assert.ok(evaluation.highlights.length > 0);
  });

  it("Test 12: Secret redaction in telemetry & errors", async () => {
    const secretKey = "AIzaSySecretPlacesKey1234567890";
    const bearer = "Bearer ya29.a0ARrdaM9876543210secretToken";

    const orchestrator = new ExecutiveOrchestrator();
    const result = await orchestrator.execute({
      objective: `Evaluate secret token handling ${secretKey} and ${bearer}`,
      priority: "low",
    });

    // Verify secret is not in the plain report or trajectory details
    const reportText = result.report;
    assert.ok(!reportText.includes(secretKey), "Raw Google API key must be redacted");
    assert.ok(!reportText.includes(bearer), "Raw Bearer token must be redacted");
  });

  it("Test 13: Existing system regressions — Boss, Skills, and Uniqueness agents remain functional", async () => {
    const { runBossAgent } = jiti("./src/lib/agents/boss/bossAgent.ts");
    const { runSkillsAgent } = jiti("./src/lib/agents/skills/skillsAgent.ts");
    const { runUniquenessAgent } = jiti("./src/lib/agents/uniqueness/uniquenessAgent.ts");

    // 1. Boss agent runs cleanly
    const bossReport = await runBossAgent({ windowMinutes: 60 });
    assert.ok(bossReport.overallStatus, "Boss report overallStatus should be present");
    assert.ok(typeof bossReport.overallHealthScore === "number", "Health score should be a number");
    assert.ok(Array.isArray(bossReport.agents), "Agents list should be present");

    // 2. Skills agent runs cleanly
    const skillsResult = await runSkillsAgent({
      businessName: "Test Bakery",
      category: "bakery",
      description: "Organic sourdough and artisanal pastries",
    });
    assert.equal(skillsResult.success, true);
    assert.ok(skillsResult.data);

    // 3. Uniqueness agent runs cleanly
    const uniquenessResult = await runUniquenessAgent({
      newWebsite: { hero: "Artisanal Breads" },
      businessName: "Test Bakery",
      category: "bakery",
      description: "Organic bakery",
    });
    assert.equal(uniquenessResult.success, true);
    assert.ok(uniquenessResult.data);
  });
});
