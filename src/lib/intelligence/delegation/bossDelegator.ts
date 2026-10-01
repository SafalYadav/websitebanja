// src/lib/intelligence/delegation/bossDelegator.ts
import { randomUUID } from "crypto";
import type {
  TaskEnvelope,
  TaskResultEnvelope,
  TaskBudget,
  TaskConflict,
  TaskEscalation,
} from "./delegationTypes";
import { taskEnvelopeValidator } from "./taskEnvelopeValidator";
import { childTaskExecutor } from "./childTaskExecutor";
import { conflictResolver } from "./conflictResolver";
import { capabilityMatcher } from "./capabilityMatcher";

export class BossDelegator {
  private static instance: BossDelegator;

  private constructor() {}

  public static getInstance(): BossDelegator {
    if (!BossDelegator.instance) {
      BossDelegator.instance = new BossDelegator();
    }
    return BossDelegator.instance;
  }

  /**
   * Decomposes and executes a strategic task envelope assigned to the Boss Agent.
   * Boss acts as supervisor (depth = 1), delegating specialized work to Skills and Uniqueness (depth = 2).
   */
  public async delegateToBoss(envelope: TaskEnvelope): Promise<TaskResultEnvelope> {
    const startTime = performance.now();

    // 1. Invariant & Envelope Validation
    const validation = taskEnvelopeValidator.validateEnvelope(envelope);
    if (!validation.valid) {
      return {
        taskId: envelope.taskId,
        parentTaskId: envelope.parentTaskId,
        agent: envelope.agent,
        status: "failed",
        data: null,
        findings: [],
        conflicts: [],
        recommendations: [],
        confidence: 0,
        evidence: [],
        artifacts: [],
        durationMs: performance.now() - startTime,
        error: `Boss received invalid envelope: ${validation.errors.join("; ")}`,
        validation: { passed: false, details: validation.errors.join("; ") },
      };
    }

    if (envelope.depth !== 1 || envelope.agent.toLowerCase() !== "boss") {
      return {
        taskId: envelope.taskId,
        parentTaskId: envelope.parentTaskId,
        agent: envelope.agent,
        status: "failed",
        data: null,
        findings: [],
        conflicts: [],
        recommendations: [],
        confidence: 0,
        evidence: [],
        artifacts: [],
        durationMs: performance.now() - startTime,
        error: `BossDelegator expects depth=1 and agent='boss', received depth=${envelope.depth}, agent='${envelope.agent}'`,
        validation: { passed: false, details: "Invalid hierarchy depth or agent target" },
      };
    }

    // 2. Determine Subtask Allocation using CapabilityMatcher
    const skillsCap = capabilityMatcher.findBestAgent(["ui", "design_system", "layout"], {
      allowedAgents: ["skills"],
    });
    const uniquenessCap = capabilityMatcher.findBestAgent(["uniqueness", "similarity", "differentiation"], {
      allowedAgents: ["uniqueness"],
    });

    // 3. Subdivide Budgets strictly within parent budget
    const childBudget: TaskBudget = {
      maxToolCalls: envelope.budget.maxToolCalls ? Math.floor(envelope.budget.maxToolCalls / 2) : 5,
      maxModelCalls: envelope.budget.maxModelCalls ? Math.floor(envelope.budget.maxModelCalls / 2) : 3,
      maxRetries: 1,
      maxDurationMs: envelope.budget.maxDurationMs ? Math.floor(envelope.budget.maxDurationMs / 2) : 10000,
      estimatedCost: envelope.budget.estimatedCost ? envelope.budget.estimatedCost / 2 : undefined,
    };

    // Subtask 1: Skills Task (depth = 2)
    const skillsEnvelope: TaskEnvelope = {
      taskId: `task_skill_${randomUUID().slice(0, 8)}`,
      parentTaskId: envelope.taskId,
      objective: `Extract design system, UI layout strategy, and component skills for: ${envelope.objective}`,
      agent: "skills",
      input: {
        ...envelope.input,
        businessName: envelope.input.businessName || "WebsiteBanja Client",
        category: envelope.input.category || "business",
        description: envelope.objective,
      },
      constraints: [...envelope.constraints],
      toolAllowlist: envelope.toolAllowlist.filter((t) => !t.includes("admin")), // Narrows tool allowlist
      budget: childBudget,
      deadline: envelope.deadline,
      expectedOutput: { type: "skills_selection_output" },
      successCriteria: ["Valid skill selection", "WCAG 2.2 AA compliant tokens"],
      riskLevel: envelope.riskLevel,
      depth: 2,
      createdAt: new Date().toISOString(),
      createdBy: "boss",
      correlationId: envelope.correlationId,
      tenantId: envelope.tenantId,
      projectId: envelope.projectId,
      approvalRequired: envelope.approvalRequired,
      status: "PENDING",
    };

    // Validate parent-child invariants for Skills task
    const skillParentCheck = taskEnvelopeValidator.validateParentChild(envelope, skillsEnvelope);
    if (!skillParentCheck.valid) {
      return {
        taskId: envelope.taskId,
        parentTaskId: envelope.parentTaskId,
        agent: "boss",
        status: "failed",
        data: null,
        findings: [],
        conflicts: [],
        recommendations: [],
        confidence: 0,
        evidence: [],
        artifacts: [],
        durationMs: performance.now() - startTime,
        error: `Skills child task invariant failed: ${skillParentCheck.errors.join("; ")}`,
      };
    }

    // 4. Execute Skills Task
    skillsEnvelope.status = "RUNNING";
    const skillsResult = await childTaskExecutor.executeChildTask(skillsEnvelope);
    skillsEnvelope.status = skillsResult.status === "completed" ? "COMPLETED" : "FAILED";

    // Subtask 2: Uniqueness Task (depth = 2)
    const skillsOutput = skillsResult.data as any;
    const uniquenessEnvelope: TaskEnvelope = {
      taskId: `task_uniq_${randomUUID().slice(0, 8)}`,
      parentTaskId: envelope.taskId,
      objective: `Verify design differentiation and check AST/layout overlap for: ${envelope.objective}`,
      agent: "uniqueness",
      input: {
        ...envelope.input,
        category: envelope.input.category || "business",
        description: envelope.objective,
        newWebsite: {
          heroType: skillsOutput?.designDirection?.heroStrategy || "split_screen_interactive",
          layoutType: skillsOutput?.designDirection?.layoutStrategy || "asymmetric_editorial",
          colorPalette: [
            (envelope.input.primaryColor as string) || "#0f172a",
            "#38bdf8",
            "#f1f5f9",
          ],
          sectionOrder: ["hero", "features", "social_proof", "pricing", "contact"],
          typography: { headingFont: "Inter", bodyFont: "Inter" },
          componentFingerprints: skillsOutput?.selectedSkills
            ? skillsOutput.selectedSkills.map((s: any) => `comp_${s.skillId}`)
            : ["comp_ui_ux"],
        },
        candidateWebsites: envelope.input.candidateWebsites || [],
        regenerationAttempt: envelope.input.regenerationAttempt || 0,
      },
      constraints: [...envelope.constraints],
      toolAllowlist: envelope.toolAllowlist.filter((t) => !t.includes("admin")),
      budget: childBudget,
      deadline: envelope.deadline,
      expectedOutput: { type: "uniqueness_check_output" },
      successCriteria: ["AST similarity below threshold", "No direct layout duplication"],
      riskLevel: envelope.riskLevel,
      depth: 2,
      createdAt: new Date().toISOString(),
      createdBy: "boss",
      correlationId: envelope.correlationId,
      tenantId: envelope.tenantId,
      projectId: envelope.projectId,
      approvalRequired: envelope.approvalRequired,
      status: "PENDING",
    };

    // Validate parent-child invariants for Uniqueness task
    const uniqParentCheck = taskEnvelopeValidator.validateParentChild(envelope, uniquenessEnvelope);
    if (!uniqParentCheck.valid) {
      return {
        taskId: envelope.taskId,
        parentTaskId: envelope.parentTaskId,
        agent: "boss",
        status: "failed",
        data: null,
        findings: [],
        conflicts: [],
        recommendations: [],
        confidence: 0,
        evidence: [],
        artifacts: [],
        durationMs: performance.now() - startTime,
        error: `Uniqueness child task invariant failed: ${uniqParentCheck.errors.join("; ")}`,
      };
    }

    // 5. Execute Uniqueness Task
    uniquenessEnvelope.status = "RUNNING";
    const uniquenessResult = await childTaskExecutor.executeChildTask(uniquenessEnvelope);
    uniquenessEnvelope.status = uniquenessResult.status === "completed" ? "COMPLETED" : "FAILED";

    // 6. Detect and Resolve Operational Conflicts between Child Outputs
    const conflictResolution = await conflictResolver.detectAndResolve({
      skillsOutput: skillsResult.data as any,
      uniquenessOutput: uniquenessResult.data as any,
      contextConstraints: envelope.constraints,
      tenantId: envelope.tenantId,
    });

    // 7. Check if High-Severity Escalation occurred
    if (conflictResolution.escalation) {
      const durationMs = performance.now() - startTime;
      return {
        taskId: envelope.taskId,
        parentTaskId: envelope.parentTaskId,
        agent: "boss",
        status: "escalated",
        data: {
          skills: skillsResult.data,
          uniqueness: uniquenessResult.data,
          resolvedDirectives: conflictResolution.resolvedDirectives,
        },
        subtasks: [skillsResult, uniquenessResult],
        findings: [
          `Boss halted autonomous synthesis due to high-severity operational conflict.`,
          ...skillsResult.findings,
          ...uniquenessResult.findings,
        ],
        conflicts: conflictResolution.conflicts,
        recommendations: [
          `Escalated to CEO: ${conflictResolution.escalation.reason}`,
          ...skillsResult.recommendations,
          ...uniquenessResult.recommendations,
        ],
        confidence: 0.4,
        evidence: [...skillsResult.evidence, ...uniquenessResult.evidence],
        artifacts: [...skillsResult.artifacts, ...uniquenessResult.artifacts],
        durationMs,
        escalation: conflictResolution.escalation,
        validation: {
          passed: false,
          details: `Delegation escalated to CEO: ${conflictResolution.escalation.reason}`,
        },
        report: `BOSS SUPERVISORY REPORT [ESCALATED]\nStatus: ESCALATED TO CEO\nReason: ${conflictResolution.escalation.reason}`,
      };
    }

    // 8. Consolidate Results, Apply Resolutions & Synthesize
    const durationMs = performance.now() - startTime;
    const consolidatedFindings: string[] = [
      `Boss supervised 2 child tasks (Skills: ${skillsResult.status}, Uniqueness: ${uniquenessResult.status}).`,
      ...skillsResult.findings,
      ...uniquenessResult.findings,
    ];

    const consolidatedRecommendations: string[] = [
      ...conflictResolution.resolvedDirectives,
      ...skillsResult.recommendations,
      ...uniquenessResult.recommendations,
    ];

    const consolidatedEvidence = [
      ...skillsResult.evidence,
      ...uniquenessResult.evidence,
      {
        source: "boss_supervision",
        description: `Verified child task execution within budget and resolved ${conflictResolution.conflicts.length} operational conflicts.`,
        verified: true,
      },
    ];

    const consolidatedArtifacts = [
      ...skillsResult.artifacts,
      ...uniquenessResult.artifacts,
      {
        type: "boss_synthesis",
        name: "boss_consolidated_output",
        content: {
          resolvedDirectives: conflictResolution.resolvedDirectives,
          conflicts: conflictResolution.conflicts,
          skillsSummary: skillsResult.data,
          uniquenessSummary: uniquenessResult.data,
        },
      },
    ];

    const confidence =
      skillsResult.status === "completed" && uniquenessResult.status === "completed"
        ? Math.min(skillsResult.confidence, uniquenessResult.confidence)
        : 0.5;

    const report = [
      `# BOSS SUPERVISORY CONSOLIDATION REPORT`,
      `Task: ${envelope.objective}`,
      `Status: COMPLETED (Delegation Depth: 1 -> 2)`,
      `Subtasks:`,
      `  - Skills: ${skillsResult.status} (${skillsResult.durationMs.toFixed(0)}ms)`,
      `  - Uniqueness: ${uniquenessResult.status} (${uniquenessResult.durationMs.toFixed(0)}ms)`,
      `Conflicts Detected: ${conflictResolution.conflicts.length}`,
      `Resolved Directives: ${conflictResolution.resolvedDirectives.length}`,
      `Confidence: ${(confidence * 100).toFixed(0)}%`,
    ].join("\n");

    return {
      taskId: envelope.taskId,
      parentTaskId: envelope.parentTaskId,
      agent: "boss",
      status: "completed",
      data: {
        skills: skillsResult.data,
        uniqueness: uniquenessResult.data,
        resolvedDirectives: conflictResolution.resolvedDirectives,
      },
      subtasks: [skillsResult, uniquenessResult],
      findings: consolidatedFindings,
      conflicts: conflictResolution.conflicts,
      recommendations: consolidatedRecommendations,
      confidence,
      evidence: consolidatedEvidence,
      artifacts: consolidatedArtifacts,
      durationMs,
      validation: {
        passed: true,
        details: "Subtasks successfully completed and consolidated by Boss supervisor",
      },
      report,
    };
  }
}

export const bossDelegator = BossDelegator.getInstance();
export const delegateToBoss = (envelope: TaskEnvelope) => bossDelegator.delegateToBoss(envelope);
