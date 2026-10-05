// tests/phase18_long_term_memory.test.mjs
/**
 * Test Suite: Phase 18 — Long-Term Memory + Real Learning
 * Comprehensive verification of:
 * - 4 Memory Levels (Working, Business, Experience, Strategic)
 * - 9 Entities & Stores (runs, events, decisions, feedback, lessons, strategies, failures, evals, experiments)
 * - Evidence-Gated Promotion (RAW MODEL OUTPUT != TRUTH)
 * - Strategy Versioning, Regression Benchmarking & Rollback
 * - Contradictory Learning & Confidence Decay
 * - Tenant & Business Isolation
 * - Secret Redaction
 * - Executive CEO Context Integration
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// Import Phase 18 modules via jiti
const {
  MemoryStore,
  MemoryRetriever,
  LessonEngine,
  LessonEvaluator,
  StrategyManager,
  ExperimentManager,
  EvaluationService,
  ExecutiveOrchestrator,
  ExecutiveContextBuilder,
} = jiti("./src/lib/intelligence/index.ts");

describe("Phase 18 — Long-Term Memory + Real Learning", () => {
  let store;
  let lessonEngine;
  let strategyManager;
  let experimentManager;
  let retriever;

  beforeEach(() => {
    store = MemoryStore.getInstance();
    lessonEngine = LessonEngine.getInstance();
    strategyManager = StrategyManager.getInstance();
    experimentManager = ExperimentManager.getInstance();
    retriever = MemoryRetriever.getInstance();
  });

  it("Test 1: Agent run persistence and retrieval", async () => {
    const runId = `run_test_${Date.now()}_1`;
    const runData = {
      runId,
      agentId: "executive",
      objective: "Analyze restaurant domain and generate personalized preview",
      status: "running",
      startedAt: new Date().toISOString(),
      metadata: { domain: "restaurant", tenantId: "tenant_123" },
    };

    await store.saveRun(runData);
    const retrieved = await store.getRun(runId);
    assert.ok(retrieved, "Should retrieve saved run");
    assert.equal(retrieved.runId, runId);
    assert.equal(retrieved.status, "running");

    // Update status
    await store.saveRun({
      ...runData,
      status: "completed",
      completedAt: new Date().toISOString(),
      success: true,
      durationMs: 1420,
    });

    const updated = await store.getRun(runId);
    assert.equal(updated.status, "completed");
    assert.equal(updated.success, true);
    assert.equal(updated.durationMs, 1420);
  });

  it("Test 2: Agent event persistence and listing", async () => {
    const runId = `run_test_${Date.now()}_2`;
    const event1 = {
      id: `evt_1_${Date.now()}`,
      runId,
      agentId: "executive",
      eventType: "observe",
      payload: { observation: "Market data loaded" },
      timestamp: new Date().toISOString(),
    };
    const event2 = {
      id: `evt_2_${Date.now()}`,
      runId,
      agentId: "executive",
      eventType: "plan",
      payload: { steps: ["step1", "step2"] },
      timestamp: new Date().toISOString(),
    };

    await store.saveEvent(event1);
    await store.saveEvent(event2);

    const events = await store.listEvents(runId);
    assert.ok(events.length >= 2, "Should list at least 2 events for run");
    assert.ok(events.some((e) => e.eventType === "observe"));
    assert.ok(events.some((e) => e.eventType === "plan"));
  });

  it("Test 3: Agent decision persistence and retrieval", async () => {
    const runId = `run_test_${Date.now()}_3`;
    const decision = {
      id: `dec_${Date.now()}`,
      runId,
      agentId: "executive",
      objective: "Verify fine-dining layout",
      priority: "high",
      plan: ["Delegate to uniqueness", "Verify color palette"],
      delegations: [{ agent: "uniqueness", task: "Check palette contrast" }],
      toolCalls: [],
      constraints: ["No generic templates"],
      risk: [],
      approvalRequired: false,
      nextAction: "execute_preview",
      createdAt: new Date().toISOString(),
    };

    await store.saveDecision(decision);
    const retrieved = await store.getDecision(runId);
    assert.ok(retrieved, "Should retrieve saved decision");
    assert.equal(retrieved.objective, "Verify fine-dining layout");
    assert.equal(retrieved.plan.length, 2);
  });

  it("Test 4: Agent feedback persistence and human rating", async () => {
    const feedbackId = `fb_${Date.now()}`;
    const feedback = {
      id: feedbackId,
      feedbackId,
      runId: "run_human_review_1",
      userId: "admin_user_1",
      feedbackType: "human_approval",
      source: "admin_console",
      sentiment: "positive",
      rating: 5,
      correctionText: "Approved fine dining palette",
      metadata: { domain: "restaurant" },
      createdAt: new Date().toISOString(),
    };

    await store.saveFeedback(feedback);
    const list = await store.listFeedback("run_human_review_1");
    assert.ok(list.length > 0, "Should retrieve stored feedback");
    assert.equal(list[0].rating, 5);
    assert.equal(list[0].sentiment, "positive");
  });

  it("Test 5: Agent failure persistence and occurrence aggregation", async () => {
    const failureId = `fail_${Date.now()}`;
    const failure = {
      id: failureId,
      failureId,
      runId: "run_fail_1",
      domain: "ecommerce",
      failureType: "VALIDATION_FAILED",
      errorMessage: "Contrast ratio below 4.5:1",
      rootCause: "Accent color too light on white background",
      recoveryStrategy: "Fallback to high-contrast dark palette",
      occurrences: 1,
      createdAt: new Date().toISOString(),
    };

    await store.saveFailure(failure);
    const failures = await store.listFailures(10, "ecommerce");
    assert.ok(failures.length > 0, "Should find saved failure");
    assert.equal(failures[0].failureType, "VALIDATION_FAILED");
    assert.equal(failures[0].rootCause, "Accent color too light on white background");
  });

  it("Test 6: Agent evaluation persistence", async () => {
    const evalId = `eval_${Date.now()}`;
    const evaluation = {
      id: evalId,
      evalId,
      runId: "run_eval_1",
      agentId: "executive",
      score: 95,
      rubricScores: {
        correctness: 98,
        safety: 100,
        validation: 95,
        efficiency: 90,
      },
      evaluationDetails: "All safety rules passed without hallucination",
      evaluatorId: "EvaluationService",
      createdAt: new Date().toISOString(),
    };

    await store.saveEvaluation(evaluation);
    const retrieved = await store.getEvaluation("run_eval_1");
    assert.ok(retrieved, "Should retrieve evaluation");
    assert.equal(retrieved.score, 95);
    assert.equal(retrieved.rubricScores.safety, 100);
  });

  it("Test 7: Candidate lesson creation with default state", async () => {
    const candidate = await lessonEngine.createCandidateLesson({
      domain: "restaurant",
      insight: "Warm metallic gold accents increase luxury restaurant engagement",
      rule: "Use warm metallic accents for fine-dining restaurant hero sections",
      initialConfidence: 0.5,
      initialEvidence: {
        source: "execution_outcome",
        referenceId: "run_luxury_1",
        description: "Preview conversion score 9.4/10",
        verified: true,
      },
    });

    assert.ok(candidate.lessonId, "Candidate lesson should have an ID");
    assert.equal(candidate.status, "CANDIDATE");
    assert.equal(candidate.evidence.length, 1);
    assert.equal(candidate.confidenceScore, 0.5);
  });

  it("Test 8: Recording verified evidence onto a lesson", async () => {
    const lesson = await lessonEngine.createCandidateLesson({
      domain: "restaurant",
      insight: "Include reservations CTA above the fold",
      rule: "Place table reservation CTA in the top-right header",
      initialConfidence: 0.6,
      initialEvidence: {
        source: "execution_outcome",
        referenceId: "run_cta_1",
        description: "Reservation CTA placed",
        verified: true,
      },
    });

    const updated = await lessonEngine.recordEvidence(lesson.lessonId, {
      source: "validator_confirmation",
      referenceId: "val_cta_1",
      description: "AST validator confirmed reservation CTA in header",
      verified: true,
      weight: 0.25,
    });

    assert.equal(updated.evidence.length, 2);
    assert.ok(updated.confidenceScore >= 0.7, "Confidence score should increase with evidence");
  });

  it("Test 9: Weak evidence rejection (cannot promote without required evidence)", async () => {
    const weakLesson = {
      id: "weak_1",
      lessonId: "weak_1",
      domain: "restaurant",
      rule: "Unverified model opinion on typography",
      confidenceScore: 0.65,
      status: "CANDIDATE",
      evidence: [
        {
          id: "ev_1",
          source: "unverified_llm_claim",
          referenceId: "run_claim",
          description: "Model claimed font was great",
          verified: false,
          timestamp: new Date().toISOString(),
        },
      ],
      supportingOutcomes: 1,
      contradictingOutcomes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const evalResult = LessonEvaluator.evaluateForPromotion(weakLesson);
    assert.equal(evalResult.canPromote, false, "Should reject unverified model statement");
    assert.ok(evalResult.reason.includes("Confidence") || evalResult.reason.includes("evidence"), "Should explain why promotion is blocked");
  });

  it("Test 10: Verified evidence promotion to Strategic Memory", async () => {
    const candidate = await lessonEngine.createCandidateLesson({
      domain: "hospitality",
      insight: "Resort hero requires full-bleed photo gallery",
      rule: "Enforce full-bleed gallery for resort accommodations",
      initialConfidence: 0.6,
      initialEvidence: {
        source: "validator_confirmation",
        referenceId: "val_resort_1",
        description: "AST confirmed full bleed gallery",
        verified: true,
      },
    });

    // Add second strong evidence
    await lessonEngine.recordEvidence(candidate.lessonId, {
      source: "repeated_confirmed_pattern",
      referenceId: "pat_resort_1",
      description: "Confirmed across 3 successful customer previews",
      verified: true,
      weight: 0.3,
    });

    const refreshed = await store.getLesson(candidate.lessonId);
    const evalResult = LessonEvaluator.evaluateForPromotion(refreshed);
    assert.equal(evalResult.canPromote, true, "Should permit promotion with verified multi-evidence");

    const promoted = await lessonEngine.updateStatus(candidate.lessonId, "PROMOTED");
    assert.equal(promoted.status, "PROMOTED");
  });

  it("Test 11: Strategy versioning and auto-increment", async () => {
    const s1 = await strategyManager.createStrategyDraft({
      name: "restaurant_conversion_strategy",
      domain: "restaurant_version_test",
      description: "Initial restaurant blueprint strategy",
      directives: ["Hero must feature signature dish", "Reservation modal visible"],
      benchmarks: { accuracy: 92, safety: 100 },
    });

    assert.ok(s1.version.includes("1") || s1.versionNumber === 1);
    assert.equal(s1.status, "DRAFT");

    // Upgrade to version 2
    const s2 = await strategyManager.createStrategyDraft({
      name: "restaurant_conversion_strategy",
      domain: "restaurant_version_test",
      description: "Refined restaurant strategy with multi-language menu",
      directives: ["Hero must feature signature dish", "Reservation modal visible", "Menu in English and Gujarati"],
      benchmarks: { accuracy: 95, safety: 100 },
    });

    assert.ok(s2.version.includes("2") || s2.versionNumber === 2, "Should increment version to v2");
  });

  it("Test 12: Strategy activation and safe rollback", async () => {
    const draft = await strategyManager.createStrategyDraft({
      name: "boutique_brand_strategy",
      domain: "fashion",
      description: "Fashion boutique layout",
      directives: ["High contrast lookbook", "Product zoom drawer"],
      benchmarks: { accuracy: 90, safety: 100 },
    });

    // Direct legacy activation is retired — must reject requiring governed candidate evaluation
    await assert.rejects(
      async () => strategyManager.activateStrategy(draft.strategyId),
      /Direct legacy activation is unavailable/
    );

    // Direct legacy rollback is retired — must reject requiring authenticated governed rollback
    await assert.rejects(
      async () => strategyManager.rollbackStrategy("fashion", "Safety benchmark failure detected in test run"),
      /Direct legacy rollback is unavailable/
    );
  });

  it("Test 13: 4-Level Memory retrieval by domain and level", async () => {
    const retrieved = await retriever.retrieve({
      objective: "Launch fine-dining restaurant website in Vadodara",
      domain: "restaurant",
      tenantId: "tenant_demo",
      levels: ["WORKING_MEMORY", "BUSINESS_MEMORY", "EXPERIENCE_MEMORY", "STRATEGIC_MEMORY"],
      minConfidence: 0.5,
    });

    assert.ok(retrieved, "Should return retrieval object");
    assert.ok(Array.isArray(retrieved.workingMemory), "Should have working memory array");
    assert.ok(Array.isArray(retrieved.businessMemory), "Should have business memory array");
    assert.ok(Array.isArray(retrieved.experienceMemory), "Should have experience memory array");
    assert.ok(Array.isArray(retrieved.strategicMemory), "Should have strategic memory array");
  });

  it("Test 14: Confidence thresholds in memory retrieval", async () => {
    // Add low confidence candidate lesson
    await lessonEngine.createCandidateLesson({
      domain: "test_threshold",
      insight: "Speculative layout idea",
      rule: "Unproven design suggestion",
      initialConfidence: 0.3,
      initialEvidence: {
        source: "execution_outcome",
        referenceId: "run_spec",
        description: "One single speculative test",
        verified: false,
      },
    });

    const retrievedHighConf = await retriever.retrieve({
      objective: "Test speculative suggestions",
      domain: "test_threshold",
      minConfidence: 0.8,
    });

    const containsLowConf = (retrievedHighConf.memories || []).some(
      (m) => typeof m.content === "string" && m.content.includes("Speculative layout idea")
    );
    assert.equal(containsLowConf, false, "Should filter out items below minConfidence (0.8)");
  });

  it("Test 15: Contradictory evidence tracking and confidence decay", async () => {
    const lesson = await lessonEngine.createCandidateLesson({
      domain: "dental",
      insight: "Dark background for dentist sites",
      rule: "Use dark theme for dental clinics",
      initialConfidence: 0.7,
      initialEvidence: {
        source: "execution_outcome",
        referenceId: "run_dental_1",
        description: "Initial dark theme test",
        verified: true,
      },
    });

    // Record contradictory evidence (failed user testing / human rejection)
    const updated = await lessonEngine.recordContradictoryEvidence(lesson.lessonId, {
      source: "human_feedback",
      referenceId: "fb_dental_reject",
      description: "Patients perceived dark theme as intimidating; clear white requested",
      verified: true,
      weight: 0.4,
    });

    assert.ok(updated.contradictingOutcomes >= 1, "Should count contradictory outcome");
    assert.ok(updated.confidenceScore < 0.6, "Confidence score should decay with contradiction");

    // Add another contradiction to exceed supporting
    const rejected = await lessonEngine.recordContradictoryEvidence(lesson.lessonId, {
      source: "validator_confirmation",
      referenceId: "val_dental_contrast_fail",
      description: "Clinical guidelines require sterile medical palette",
      verified: true,
      weight: 0.4,
    });

    assert.equal(rejected.status, "REJECTED", "Should mark lesson REJECTED when contradictions overwhelm evidence");
  });

  it("Test 16: Business memory isolation across tenants and projects", async () => {
    await store.saveBusinessMemory({
      id: "biz_tenant_A",
      tenantId: "tenant_A",
      projectId: "proj_restaurant_A",
      category: "brand_guidelines",
      key: "primary_color",
      value: "#B8860B (Dark Goldenrod)",
      verified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await store.saveBusinessMemory({
      id: "biz_tenant_B",
      tenantId: "tenant_B",
      projectId: "proj_cafe_B",
      category: "brand_guidelines",
      key: "primary_color",
      value: "#2E8B57 (Sea Green)",
      verified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const tenantAMemories = await store.listBusinessMemories("tenant_A", "proj_restaurant_A");
    assert.equal(tenantAMemories.length, 1);
    assert.equal(tenantAMemories[0].value, "#B8860B (Dark Goldenrod)");

    const tenantBMemories = await store.listBusinessMemories("tenant_B", "proj_cafe_B");
    assert.equal(tenantBMemories.length, 1);
    assert.equal(tenantBMemories[0].value, "#2E8B57 (Sea Green)");
  });

  it("Test 17: Tenant isolation strictly prevents cross-tenant leakage", async () => {
    const leakCheck = await store.listBusinessMemories("tenant_A", "proj_cafe_B");
    assert.equal(leakCheck.length, 0, "Tenant A should not have access to Tenant B project memories");
  });

  it("Test 18: Failure -> Learning loop", async () => {
    const runId = `run_fail_loop_${Date.now()}`;
    // 1. Record failure
    const failure = await store.saveFailure({
      id: `fail_${runId}`,
      failureId: `fail_${runId}`,
      runId,
      domain: "real_estate",
      failureType: "RATE_LIMIT_EXCEEDED",
      errorMessage: "Places API quota exceeded on burst search",
      rootCause: "Unthrottled concurrent lead batch requests",
      recoveryStrategy: "Implement exponential backoff and batch size 5",
      occurrences: 2,
      createdAt: new Date().toISOString(),
    });

    assert.ok(failure);

    // 2. Failure informs candidate lesson
    const lesson = await lessonEngine.createCandidateLesson({
      domain: "real_estate",
      insight: "Batch lead searches must cap at 5 with exponential backoff",
      rule: "Cap concurrent external API discovery batches to 5 with 1000ms delay",
      initialConfidence: 0.8,
      initialEvidence: {
        source: "execution_outcome",
        referenceId: failure.failureId,
        description: "Derived from Places API burst failure recovery",
        verified: true,
      },
    });

    assert.ok(lesson);
    assert.equal(lesson.domain, "real_estate");
    assert.ok(lesson.rule.includes("Cap concurrent"));
  });

  it("Test 19: Success -> Learning loop", async () => {
    const runId = `run_success_loop_${Date.now()}`;
    // Successful execution verified by validator
    const lesson = await lessonEngine.createCandidateLesson({
      domain: "cafe",
      insight: "WhatsApp order floating button increased lead generation by 40%",
      rule: "Include WhatsApp quick contact pill in mobile viewport",
      initialConfidence: 0.75,
      initialEvidence: {
        source: "validator_confirmation",
        referenceId: `ast_${runId}`,
        description: "Mobile viewport check confirmed floating contact widget",
        verified: true,
      },
    });

    assert.ok(lesson);
    assert.equal(lesson.status, "CANDIDATE");
    assert.equal(lesson.confidenceScore, 0.75);
  });

  it("Test 20: Controlled A/B experiment creation and sample tracking", async () => {
    const exp = await experimentManager.createExperiment({
      hypothesis: "Multi-step lead intake form increases submission quality over single page",
      domain: "intake",
      strategyA: "single_page_form",
      strategyB: "multi_step_wizard",
      sampleSize: 20,
    });

    assert.ok(exp.experimentId);
    assert.equal(exp.status, "ACTIVE");
    assert.equal(exp.sampleSize, 20);

    const tracked = await experimentManager.recordSample(exp.experimentId, "strategyB", true, 92);
    assert.equal(tracked.samplesRecorded, 1);
  });

  it("Test 21: Regression benchmarks (10 categories)", async () => {
    const benchmarkResult = strategyManager.runRegressionBenchmarks({
      strategyName: "ecommerce_v2",
      domain: "ecommerce",
      benchmarks: {
        accuracy: 94,
        safety: 100,
        latency: 90,
        cost: 95,
        reliability: 98,
        domain_fidelity: 92,
        uniqueness: 96,
        compliance: 100,
        ux: 91,
        error_recovery: 95,
      },
    });

    assert.ok(benchmarkResult.passed, "Benchmarks meeting all criteria should pass");
    assert.equal(benchmarkResult.categoriesEvaluated, 10);
    assert.ok(benchmarkResult.averageScore >= 90);
  });

  it("Test 22: CEO retrieves verified strategic memory in context", async () => {
    // Save active strategy with directives
    await strategyManager.createStrategyDraft({
      name: "fine_dining_vadodara_active",
      domain: "restaurant",
      description: "Verified fine dining strategy",
      directives: [
        "Include wine pairing section",
        "Chef biography with authentic credentials",
      ],
      benchmarks: { accuracy: 96, safety: 100 },
    });

    const contextBuilder = new ExecutiveContextBuilder();
    const context = await contextBuilder.buildContext({
      objective: "Build high-end Italian restaurant website in Vadodara",
      priority: "high",
    });

    assert.ok(context.retrievedMemory, "Context should contain retrievedMemory");
    assert.equal(context.detectedDomain, "restaurant");
  });

  it("Test 23: CEO ignores low-confidence and unverified claims", async () => {
    const contextBuilder = new ExecutiveContextBuilder();
    const context = await contextBuilder.buildContext({
      objective: "Build dental clinic site in Surat",
      priority: "medium",
    });

    // Check that context does not inject rejected lessons
    const rejectedLessons = (context.retrievedMemory?.strategicMemory || []).filter(
      (m) => m.status === "REJECTED"
    );
    assert.equal(rejectedLessons.length, 0, "Rejected lessons must never be injected into CEO context");
  });

  it("Test 24: Secret redaction in stored memory, runs, and errors", async () => {
    const secretRunId = `run_secret_${Date.now()}`;
    await store.saveRun({
      runId: secretRunId,
      agentId: "executive",
      objective: "Deploy with API_KEY=AIzaSyD-Secret123456789 and Bearer sk-ant-api03-abcdef",
      status: "completed",
      startedAt: new Date().toISOString(),
      metadata: {
        authorization: "Bearer secret_token_xyz",
      },
    });

    const retrieved = await store.getRun(secretRunId);
    assert.ok(!retrieved.objective.includes("AIzaSyD-Secret123456789"), "Google API keys must be redacted");
    assert.ok(!retrieved.objective.includes("sk-ant-api03-abcdef"), "Bearer tokens must be redacted");
    assert.ok(!JSON.stringify(retrieved.metadata).includes("secret_token_xyz"), "Metadata tokens must be redacted");
  });

  it("Test 25: Phase 17 orchestrator integration and zero regressions", async () => {
    const orchestrator = new ExecutiveOrchestrator();
    const result = await orchestrator.execute({
      objective: "Fine dining restaurant in Vadodara: analyze market and design preview",
      priority: "high",
      tenantId: "tenant_phase18_reg_test",
    });

    assert.ok(result.runId, "Execution should generate runId");
    assert.equal(result.state, "COMPLETED");
    assert.ok(result.durationMs > 0);
    assert.ok(result.verifications.length > 0);

    // Verify that the run was saved into Phase 18 MemoryStore
    const savedRun = await store.getRun(result.runId);
    assert.ok(savedRun, "Orchestrator should automatically persist run in MemoryStore");
    assert.equal(savedRun.success, true);
  });
});
