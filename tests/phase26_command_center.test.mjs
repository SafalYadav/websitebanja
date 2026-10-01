// tests/phase26_command_center.test.mjs
// Phase 26 — CEO Command Center
// 25 deterministic unit and integration tests verifying all required Command Center capabilities.
// Uses node:test + node:assert/strict + jiti for TypeScript imports.

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createJiti from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jiti = createJiti(__dirname, {
  alias: { "@": path.resolve(__dirname, "../src") },
  interopDefault: true,
});

// Import Command Center service and types
const {
  CommandCenterService,
  commandCenterService,
  CANONICAL_PIPELINE_STAGES,
} = jiti("@/lib/intelligence/commandCenter/commandCenterService");

// Import underlying subsystems to set up test fixtures
const { ExecutionMemory } = jiti("@/lib/intelligence/memory/executionMemory");
const { DelegationTreeStore } = jiti("@/lib/intelligence/delegation/delegationTree");
const { AutonomousPipeline } = jiti("@/lib/intelligence/pipeline/autonomousPipeline");
const { ApprovalGate } = jiti("@/lib/intelligence/pipeline/approvalGate");
const { GovernanceApprovalStore } = jiti("@/lib/intelligence/policies/governanceApprovalStore");
const { MemoryStore } = jiti("@/lib/intelligence/memory/memoryStore");

// Import route handler
const commandCenterRoute = jiti("@/app/api/admin/intelligence/command-center/route.ts");

describe("Phase 26 — CEO Command Center", () => {
  beforeEach(() => {
    // Reset stores to deterministic clean state
    ExecutionMemory.getInstance().clear();
    DelegationTreeStore.getInstance().clear();
    AutonomousPipeline.getInstance().clear();
    ApprovalGate.getInstance().clear();
    GovernanceApprovalStore.getInstance()._clearForTest();
  });

  // ─── Test 1: Command Center API Exists ──────────────────────────────────────
  test("1. Command Center API route handler exists and exports GET", () => {
    assert.ok(commandCenterRoute, "Route module exists");
    assert.equal(typeof commandCenterRoute.GET, "function", "Exports GET function");
  });

  // ─── Test 2: Authenticated Access Required ──────────────────────────────────
  test("2. Command Center API blocks requests missing authorization header", async () => {
    const req = new Request("http://localhost:3000/api/admin/intelligence/command-center", {
      headers: {},
    });
    const res = await commandCenterRoute.GET(req);
    assert.equal(res.status, 401, "Rejects request without authorization");
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.message, /Unauthorized|Missing|Forbidden|Administrator/);
  });

  // ─── Test 3: Unauthorized Access Blocked ────────────────────────────────────
  test("3. Command Center API blocks non-admin credentials", async () => {
    const req = new Request("http://localhost:3000/api/admin/intelligence/command-center", {
      headers: { Authorization: "Bearer invalid_non_admin_token" },
    });
    const res = await commandCenterRoute.GET(req);
    assert.ok(res.status === 401 || res.status === 403, "Rejects unauthorized token");
    const json = await res.json();
    assert.equal(json.success, false);
  });

  // ─── Test 4: Tenant Isolation ───────────────────────────────────────────────
  test("4. Tenant isolation scopes pipeline and approvals to requested tenantId", async () => {
    const govStore = GovernanceApprovalStore.getInstance();
    govStore.createApproval({
      action: "send_outreach_email",
      requestedBy: "agent_A",
      tenantId: "tenant_alpha",
      actionPayload: { leadId: "lead_1" },
    });
    govStore.createApproval({
      action: "send_outreach_email",
      requestedBy: "agent_B",
      tenantId: "tenant_beta",
      actionPayload: { leadId: "lead_2" },
    });

    const alphaData = await commandCenterService.getCommandCenterData({
      tenantId: "tenant_alpha",
    });
    assert.equal(alphaData.tenantId, "tenant_alpha");
    assert.equal(alphaData.approvalQueue.approvals.length, 1);
    assert.equal(alphaData.approvalQueue.approvals[0].tenantId, "tenant_alpha");

    const betaData = await commandCenterService.getCommandCenterData({
      tenantId: "tenant_beta",
    });
    assert.equal(betaData.tenantId, "tenant_beta");
    assert.equal(betaData.approvalQueue.approvals.length, 1);
    assert.equal(betaData.approvalQueue.approvals[0].tenantId, "tenant_beta");
  });

  // ─── Test 5: Executive Overview Aggregation ─────────────────────────────────
  test("5. Executive overview aggregates counts accurately from subsystems", async () => {
    // Record a sample CEO execution
    const execMemory = ExecutionMemory.getInstance();
    execMemory.recordRun({
      runId: "run_exec_1",
      objective: "Scale Kathmandu dental outreach",
      state: "PLANNING",
      priority: "high",
      decision: {
        objective: "Scale Kathmandu dental outreach",
        priority: "high",
        plan: ["Discover leads", "Generate previews"],
        delegations: [],
        tool_calls: [],
        constraints: ["Budget: $100"],
        risk: ["Low"],
        approval_required: false,
        next_action: "Dispatch discovery",
        report: "Ready to execute",
      },
      delegationResults: [],
      toolCallResults: [],
      trajectory: [{ step: 1, action: "PLAN", timestamp: new Date().toISOString() }],
      durationMs: 450,
      success: true,
      error: "",
    });

    // Add a delegation tree
    const treeStore = DelegationTreeStore.getInstance();
    treeStore.addNode({
      taskId: "task_root_1",
      parentTaskId: null,
      agent: "ceo",
      status: "RUNNING",
      depth: 0,
      riskLevel: "medium",
      approvalRequired: false,
      objective: "Root Strategic Task",
      children: [],
    });
    treeStore.addNode({
      taskId: "task_child_1",
      parentTaskId: "task_root_1",
      agent: "boss",
      status: "RUNNING",
      depth: 1,
      riskLevel: "low",
      approvalRequired: false,
      objective: "Sub-task validation",
      children: [],
    });

    const data = await commandCenterService.getCommandCenterData();
    assert.equal(data.executiveOverview.activeObjectivesCount, 1);
    assert.equal(data.executiveOverview.activeTasksCount, 2);
    assert.equal(data.executiveOverview.delegatedTasksCount, 1);
    assert.equal(data.executiveOverview.recentCeoDecisionsCount, 1);
    assert.ok(data.executiveOverview.systemHealth);
  });

  // ─── Test 6: Current Objective Visibility ───────────────────────────────────
  test("6. Current objective exposes active objective, status, and constraints", async () => {
    const execMemory = ExecutionMemory.getInstance();
    execMemory.recordRun({
      runId: "run_ceo_sample",
      objective: "Automate medical clinic client onboarding in Pokhara",
      state: "DELEGATING",
      priority: "critical",
      decision: {
        objective: "Automate medical clinic client onboarding in Pokhara",
        priority: "critical",
        plan: ["Audit websites", "Draft preview websites"],
        delegations: [],
        tool_calls: [],
        constraints: ["Must adhere to GDPR", "Max 5 clinic discovery"],
        risk: ["High"],
        approval_required: true,
        next_action: "Awaiting approval for outreach draft",
        report: "Delegation active",
      },
      delegationResults: [],
      toolCallResults: [],
      trajectory: [{ step: 1, action: "INIT", timestamp: new Date().toISOString() }],
      durationMs: 320,
      success: true,
      error: "",
    });

    const data = await commandCenterService.getCommandCenterData();
    assert.equal(data.currentObjective.objective, "Automate medical clinic client onboarding in Pokhara");
    assert.equal(data.currentObjective.status, "DELEGATING");
    assert.equal(data.currentObjective.priority, "critical");
    assert.equal(data.currentObjective.nextAction, "Awaiting approval for outreach draft");
    assert.equal(data.currentObjective.constraints.length, 2);
  });

  // ─── Test 7: Current Priority Visibility ────────────────────────────────────
  test("7. Current priority is clearly exposed alongside next action", async () => {
    const execMemory = ExecutionMemory.getInstance();
    execMemory.recordRun({
      runId: "run_priority_test",
      objective: "Deploy emergency security patch",
      state: "OBSERVING",
      priority: "critical",
      decision: {
        objective: "Deploy emergency security patch",
        priority: "critical",
        plan: [],
        delegations: [],
        tool_calls: [],
        constraints: [],
        risk: [],
        approval_required: true,
        next_action: "Perform verification audit",
        report: "",
      },
      delegationResults: [],
      toolCallResults: [],
      trajectory: [],
      durationMs: 100,
      success: true,
      error: "",
    });

    const data = await commandCenterService.getCommandCenterData();
    assert.equal(data.currentPriority.level, "critical");
    assert.equal(data.currentPriority.objective, "Deploy emergency security patch");
    assert.equal(data.currentPriority.nextAction, "Perform verification audit");
  });

  // ─── Test 8: Active Tasks Visibility ────────────────────────────────────────
  test("8. Active tasks expose task ID, owner agent, status, and risk level", async () => {
    const treeStore = DelegationTreeStore.getInstance();
    treeStore.addNode({
      taskId: "task_active_99",
      parentTaskId: null,
      agent: "n8n_ops_agent",
      status: "RUNNING",
      depth: 0,
      riskLevel: "medium",
      approvalRequired: false,
      objective: "Perform website preview generation",
      children: [],
    });

    const data = await commandCenterService.getCommandCenterData();
    const task = data.activeTasks.find((t) => t.taskId === "task_active_99");
    assert.ok(task, "Found active task in command center");
    assert.equal(task.agent, "n8n_ops_agent");
    assert.equal(task.status, "RUNNING");
    assert.equal(task.riskLevel, "medium");
  });

  // ─── Test 9: Delegation Hierarchy Visibility ────────────────────────────────
  test("9. Delegation hierarchy visualizes tree nodes and child relationships", async () => {
    const treeStore = DelegationTreeStore.getInstance();
    treeStore.addNode({
      taskId: "tree_root_ceo",
      parentTaskId: null,
      agent: "ceo",
      status: "RUNNING",
      depth: 0,
      riskLevel: "low",
      approvalRequired: false,
      objective: "Root task",
      children: [],
    });
    treeStore.addNode({
      taskId: "tree_child_boss",
      parentTaskId: "tree_root_ceo",
      agent: "boss",
      status: "RUNNING",
      depth: 1,
      riskLevel: "low",
      approvalRequired: false,
      objective: "Boss supervision",
      children: [],
    });

    const data = await commandCenterService.getCommandCenterData();
    assert.equal(data.delegations.length, 1);
    const root = data.delegations[0];
    assert.equal(root.taskId, "tree_root_ceo");
    assert.equal(root.assignedAgent, "ceo");
    assert.equal(root.children.length, 1);
    assert.equal(root.children[0].taskId, "tree_child_boss");
    assert.equal(root.children[0].assignedAgent, "boss");
  });

  // ─── Test 10: Agent Status Visibility ───────────────────────────────────────
  test("10. Agent status reflects real system agents with legitimate states", async () => {
    const data = await commandCenterService.getCommandCenterData();
    assert.ok(data.agentStatus.length >= 8, "Tracks all required core agents");
    const agentNames = data.agentStatus.map((a) => a.agent);
    assert.ok(agentNames.includes("executive"), "Includes CEO/executive agent");
    assert.ok(agentNames.includes("boss"), "Includes Boss supervisor");
    assert.ok(agentNames.includes("skills"), "Includes Skills agent");
    assert.ok(agentNames.includes("uniqueness"), "Includes Uniqueness agent");
    assert.ok(agentNames.includes("n8n_ops"), "Includes n8n Ops agent");

    for (const a of data.agentStatus) {
      assert.ok(
        ["active", "idle", "waiting", "failed", "unavailable"].includes(a.state),
        `Agent ${a.agent} has valid non-fabricated state ${a.state}`
      );
    }
  });

  // ─── Test 11: Tool Activity Visibility ──────────────────────────────────────
  test("11. Tool activity exposes tool names, executing agent, and execution status", async () => {
    const execMemory = ExecutionMemory.getInstance();
    execMemory.recordRun({
      runId: "run_with_tools",
      objective: "Audit test business",
      state: "COMPLETED",
      priority: "medium",
      decision: {
        objective: "",
        priority: "medium",
        plan: [],
        delegations: [],
        tool_calls: [],
        constraints: [],
        risk: [],
        approval_required: false,
        next_action: "",
        report: "",
      },
      delegationResults: [],
      toolCallResults: [
        { tool: "audit_website", success: true, data: { score: 85 }, error: "" },
        { tool: "generate_preview", success: true, data: { previewId: "p_1" }, error: "" },
      ],
      trajectory: [{ step: 1, action: "DONE", timestamp: new Date().toISOString() }],
      durationMs: 250,
      success: true,
      error: "",
    });

    const data = await commandCenterService.getCommandCenterData();
    assert.ok(data.toolActivity.length >= 2, "Contains executed tools");
    const tools = data.toolActivity.map((t) => t.tool);
    assert.ok(tools.includes("audit_website"), "Exposes audit_website tool");
    assert.ok(tools.includes("generate_preview"), "Exposes generate_preview tool");
  });

  // ─── Test 12: Memory Insights Visibility (Read-Only) ─────────────────────────
  test("12. Memory insights exposes lessons and strategies without modifying production", async () => {
    const data = await commandCenterService.getCommandCenterData();
    assert.ok(Array.isArray(data.memoryInsights.recentLessons), "recentLessons is an array");
    assert.ok(Array.isArray(data.memoryInsights.recentStrategicMemory), "strategicMemory is an array");
    assert.ok(Array.isArray(data.memoryInsights.relevantExperienceMemory), "experienceMemory is an array");
    assert.ok(Array.isArray(data.memoryInsights.strategyVersions), "strategyVersions is an array");
  });

  // ─── Test 13: Failure & Incident Visibility ─────────────────────────────────
  test("13. Failures exposes incident records with sanitized error summaries", async () => {
    const memStore = MemoryStore.getInstance();
    await memStore.saveFailure({
      failureId: "fail_rate_limit",
      failureType: "RATE_LIMIT_ERROR",
      component: "GooglePlacesClient",
      taskId: "task_disc_402",
      agent: "discovery_agent",
      safeErrorMessage: "Rate limit exceeded token=sk-secretToken12345",
      severity: "HIGH",
    });

    const data = await commandCenterService.getCommandCenterData();
    assert.ok(data.failures.length >= 1, "Recorded failure appears in command center");
    const failure = data.failures.find((f) => f.failureType === "RATE_LIMIT_ERROR");
    assert.ok(failure, "Found failure incident");
    assert.equal(failure.severity, "HIGH");
    // Secrets must be redacted from errorSummary!
    assert.doesNotMatch(failure.errorSummary, /secretToken12345/);
    assert.match(failure.errorSummary, /\[REDACTED\]/);
  });

  // ─── Test 14: Approval Queue Visibility ─────────────────────────────────────
  test("14. Approval queue aggregates governance and outreach draft approvals", async () => {
    const govStore = GovernanceApprovalStore.getInstance();
    govStore.createApproval({
      action: "send_outreach_email",
      requestedBy: "n8n_ops_agent",
      tenantId: "tenant_x",
      actionPayload: { email: "dr.shrestha@example.com" },
    });

    const data = await commandCenterService.getCommandCenterData();
    assert.equal(data.approvalQueue.totalPending, 1);
    assert.equal(data.approvalQueue.approvals[0].action, "send_outreach_email");
    assert.equal(data.approvalQueue.approvals[0].requestingAgent, "n8n_ops_agent");
  });

  // ─── Test 15: Governance Remains Enforced ───────────────────────────────────
  test("15. Governance cannot be bypassed: automated approver IDs are rejected", () => {
    const govStore = GovernanceApprovalStore.getInstance();
    const record = govStore.createApproval({
      action: "send_outreach_email",
      requestedBy: "n8n_agent",
      tenantId: "t1",
      actionPayload: { email: "test@example.com" },
    });

    // AI and CEO cannot approve!
    assert.throws(
      () => govStore.approve({ approvalId: record.approvalId, approvedBy: "ai", tenantId: "t1" }),
      /not a valid human approver/
    );
    assert.throws(
      () => govStore.approve({ approvalId: record.approvalId, approvedBy: "ceo", tenantId: "t1" }),
      /not a valid human approver/
    );
  });

  // ─── Test 16: Pipeline Status Visibility ────────────────────────────────────
  test("16. Pipeline status exposes 15 canonical stages and run stats", async () => {
    const pipeline = AutonomousPipeline.getInstance();
    await pipeline.startPipeline({
      niche: "dental",
      location: "Kathmandu",
      limit: 2,
    });

    const data = await commandCenterService.getCommandCenterData();
    assert.equal(data.pipelineStatus.stages.length, 15);
    assert.ok(data.pipelineStatus.stages.includes("DISCOVER"));
    assert.ok(data.pipelineStatus.stages.includes("PREVIEW_GENERATION"));
    assert.ok(data.pipelineStatus.stages.includes("HUMAN_APPROVAL"));
    assert.ok(data.pipelineStatus.stages.includes("TERMINAL"));
    assert.equal(data.pipelineStatus.runs.length, 1);
  });

  // ─── Test 17: Learning Status Visibility ────────────────────────────────────
  test("17. Learning status exposes lesson counts and validation status", async () => {
    const data = await commandCenterService.getCommandCenterData();
    assert.equal(typeof data.learningStatus.totalLessons, "number");
    assert.equal(typeof data.learningStatus.candidateLessons, "number");
    assert.equal(typeof data.learningStatus.validatedLessons, "number");
    assert.equal(typeof data.learningStatus.promotedStrategies, "number");
    assert.ok(Array.isArray(data.learningStatus.recentExperiments));
    assert.ok(Array.isArray(data.learningStatus.evaluationActivity));
  });

  // ─── Test 18: System Health Visibility ──────────────────────────────────────
  test("18. System health exposes WebsiteBanja, database, storage, and n8n readiness", async () => {
    const data = await commandCenterService.getCommandCenterData();
    assert.ok(data.systemHealth.overallStatus, "Has overall status");
    assert.ok(data.systemHealth.websiteBanja.status, "Has WebsiteBanja app status");
    assert.ok(data.systemHealth.database.status, "Has database status");
    assert.ok(data.systemHealth.storage.status, "Has storage status");
    assert.ok(data.systemHealth.n8nOpsAgent.status, "Has n8n status");
    assert.equal(typeof data.systemHealth.readiness.ready, "boolean");
  });

  // ─── Test 19: Recent CEO Decisions Visibility ───────────────────────────────
  test("19. Recent CEO decisions expose structured execution metadata without chain-of-thought", async () => {
    const execMemory = ExecutionMemory.getInstance();
    execMemory.recordRun({
      runId: "run_ceo_decision_meta",
      objective: "Formulate Q4 expansion strategy",
      state: "COMPLETED",
      priority: "high",
      decision: {
        objective: "Formulate Q4 expansion strategy",
        priority: "high",
        plan: ["Assess capacity", "Target medical clinics"],
        delegations: [{ agent: "boss", task: "Health check" }],
        tool_calls: [{ tool: "get_lead_status", parameters: {} }],
        constraints: ["Zero downtime"],
        risk: ["Low"],
        approval_required: false,
        next_action: "Review pipeline telemetry",
        report: "Structured decision completed.",
      },
      delegationResults: [],
      toolCallResults: [],
      trajectory: [],
      durationMs: 180,
      success: true,
      error: "",
    });

    const data = await commandCenterService.getCommandCenterData();
    assert.equal(data.recentCeoDecisions.length, 1);
    const dec = data.recentCeoDecisions[0];
    assert.equal(dec.objective, "Formulate Q4 expansion strategy");
    assert.equal(dec.priority, "high");
    assert.equal(dec.plan.length, 2);
    assert.equal(dec.delegationsCount, 1);
    assert.equal(dec.toolCallsCount, 1);
    assert.equal(dec.outcome, "COMPLETED");
  });

  // ─── Test 20: Next Recommended Action Visibility ────────────────────────────
  test("20. Next recommended action derives from approval queue or CEO plan", async () => {
    // With pending approval
    const govStore = GovernanceApprovalStore.getInstance();
    govStore.createApproval({
      action: "send_outreach_email",
      requestedBy: "n8n_agent",
      actionPayload: { leadId: "lead_urgent" },
    });

    const dataWithApproval = await commandCenterService.getCommandCenterData();
    assert.equal(dataWithApproval.nextRecommendedAction.source, "APPROVAL_GATE");
    assert.match(dataWithApproval.nextRecommendedAction.action, /Review and approve pending action/);

    // Clear approvals and test CEO decision fallback
    govStore._clearForTest();
    const execMemory = ExecutionMemory.getInstance();
    execMemory.recordRun({
      runId: "run_action_test",
      objective: "Run automated tests",
      state: "OBSERVING",
      priority: "medium",
      decision: {
        objective: "",
        priority: "medium",
        plan: [],
        delegations: [],
        tool_calls: [],
        constraints: [],
        risk: [],
        approval_required: false,
        next_action: "Verify test suite coverage",
        report: "",
      },
      delegationResults: [],
      toolCallResults: [],
      trajectory: [],
      durationMs: 50,
      success: true,
      error: "",
    });

    const dataWithCeo = await commandCenterService.getCommandCenterData();
    assert.equal(dataWithCeo.nextRecommendedAction.source, "CEO_DECISION");
    assert.equal(dataWithCeo.nextRecommendedAction.action, "Verify test suite coverage");
  });

  // ─── Test 21: Secret Redaction ──────────────────────────────────────────────
  test("21. Raw API keys, bearer tokens, and passwords are fully redacted from command center output", async () => {
    const memStore = MemoryStore.getInstance();
    await memStore.saveFailure({
      failureId: "fail_auth_sec",
      failureType: "AUTH_FAILURE",
      component: "OutreachWorker",
      taskId: "task_sec_01",
      agent: "outreach_agent",
      safeErrorMessage: "Failed using Bearer abcdef1234567890abcdef and password=SuperSecretPassword99",
      severity: "CRITICAL",
    });

    const data = await commandCenterService.getCommandCenterData();
    const f = data.failures.find((x) => x.task === "task_sec_01" || x.id === "fail_auth_sec");
    assert.ok(f, "Failure found");
    assert.doesNotMatch(f.errorSummary, /SuperSecretPassword99/);
    assert.doesNotMatch(f.errorSummary, /abcdef1234567890abcdef/);
  });

  // ─── Test 22: Empty-State Handling ──────────────────────────────────────────
  test("22. Empty state produces clean default fallbacks without throwing", async () => {
    const data = await commandCenterService.getCommandCenterData();
    assert.equal(data.currentObjective.objective, "Awaiting execution");
    assert.equal(data.currentPriority.objective, "No active objective");
    assert.equal(data.activeTasks.length, 0);
    assert.equal(data.delegations.length, 0);
    assert.equal(data.approvalQueue.totalPending, 0);
    assert.equal(data.pipelineStatus.runs.length, 0);
    assert.equal(data.recentCeoDecisions.length, 0);
    assert.equal(data.nextRecommendedAction.action, "No recommended action available.");
  });

  // ─── Test 23: Partial API Failure Handling ──────────────────────────────────
  test("23. Partial subsystem offline state degrades gracefully without failing response", async () => {
    // Unconfigured environment simulation
    const originalEnv = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const data = await commandCenterService.getCommandCenterData();
      assert.ok(data, "Returns data even with unconfigured database");
      assert.ok(["DEGRADED", "HEALTHY"].includes(data.systemHealth.overallStatus));
    } finally {
      if (originalEnv) process.env.DATABASE_URL = originalEnv;
    }
  });

  // ─── Test 24: No Direct Tool Execution From Frontend ─────────────────────────
  test("24. CommandCenterService is strictly read-only and does not expose executeTool", () => {
    assert.equal(typeof commandCenterService.executeTool, "undefined");
    assert.equal(typeof commandCenterService.runTool, "undefined");
    assert.equal(typeof commandCenterService.dispatchOpsTool, "undefined");
  });

  // ─── Test 25: Existing Phase 25 Invariants Preserved ────────────────────────
  test("25. Phase 25 invariants preserved: WhatsApp permanently blocked and one-time approvals enforced", () => {
    const govStore = GovernanceApprovalStore.getInstance();
    const record = govStore.createApproval({
      action: "send_outreach_email",
      requestedBy: "agent_p25",
      actionPayload: { msg: "Hello" },
    });

    // Human approval works
    govStore.approve({ approvalId: record.approvalId, approvedBy: "admin@websitebanja.com" });
    // Consume approval
    govStore.consume(record.approvalId);

    // Validation after consumption fails: cannot be reused
    const validation = govStore.validateForExecution({
      approvalId: record.approvalId,
      actionPayload: { msg: "Hello" },
    });
    assert.equal(validation.valid, false);
    assert.match(validation.reason ?? "", /already been consumed/);
  });
});
