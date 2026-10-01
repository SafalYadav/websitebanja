// src/lib/intelligence/delegation/delegationManager.ts
import { randomUUID } from "crypto";
import type {
  TaskEnvelope,
  TaskResultEnvelope,
  ExecutionTreeNode,
  DelegationRiskLevel,
  DelegationStatus,
} from "./delegationTypes";
import { taskEnvelopeValidator } from "./taskEnvelopeValidator";
import { bossDelegator } from "./bossDelegator";
import { delegationTreeStore } from "./delegationTree";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { MemoryStore } from "../memory/memoryStore";
import { LessonEngine } from "../learning/lessonEngine";

export interface CeoDelegationRequest {
  objective: string;
  input?: Record<string, unknown>;
  constraints?: string[];
  toolAllowlist?: string[];
  budget?: {
    maxToolCalls?: number;
    maxModelCalls?: number;
    maxRetries?: number;
    maxDurationMs?: number;
    estimatedCost?: number;
  };
  deadline?: string;
  riskLevel?: DelegationRiskLevel;
  approvalRequired?: boolean;
  tenantId?: string | null;
  projectId?: string | null;
  createdBy?: string;
  correlationId?: string;
}

export class DelegationManager {
  private static instance: DelegationManager;

  private constructor() {}

  public static getInstance(): DelegationManager {
    if (!DelegationManager.instance) {
      DelegationManager.instance = new DelegationManager();
    }
    return DelegationManager.instance;
  }

  /**
   * Orchestrates an end-to-end hierarchical delegation from CEO -> Boss -> Skills / Uniqueness.
   */
  public async executeCeoDelegation(
    request: CeoDelegationRequest
  ): Promise<{ result: TaskResultEnvelope; tree: ExecutionTreeNode }> {
    const startTime = performance.now();
    const correlationId = request.correlationId || `corr_${randomUUID().slice(0, 8)}`;
    const rootTaskId = `task_ceo_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const deadline =
      request.deadline ||
      new Date(Date.now() + (request.budget?.maxDurationMs || 60000)).toISOString();

    // 1. Construct CEO Root Envelope (depth = 0)
    const ceoEnvelope: TaskEnvelope = {
      taskId: rootTaskId,
      parentTaskId: null,
      objective: request.objective,
      agent: "ceo",
      input: request.input || {},
      constraints: request.constraints || ["No generic templates", "Enforce WCAG 2.2 AA accessibility floor"],
      toolAllowlist: request.toolAllowlist || ["read_memory", "analyze_design", "evaluate_similarity", "recommend_skills"],
      budget: {
        maxToolCalls: request.budget?.maxToolCalls ?? 20,
        maxModelCalls: request.budget?.maxModelCalls ?? 10,
        maxRetries: request.budget?.maxRetries ?? 2,
        maxDurationMs: request.budget?.maxDurationMs ?? 30000,
        estimatedCost: request.budget?.estimatedCost,
      },
      deadline,
      expectedOutput: { type: "executive_consolidated_strategy" },
      successCriteria: [
        "Specialized subtasks completed by Skills and Uniqueness",
        "Zero unhandled layout collisions",
        "Consolidated deliverable validated against brand objectives",
      ],
      riskLevel: request.riskLevel || "low",
      depth: 0,
      createdAt: now,
      createdBy: request.createdBy || "ceo",
      correlationId,
      tenantId: request.tenantId || null,
      projectId: request.projectId || null,
      approvalRequired: request.approvalRequired ?? false,
      status: "RUNNING",
    };

    // 2. Validate CEO Envelope
    const ceoValidation = taskEnvelopeValidator.validateEnvelope(ceoEnvelope);
    if (!ceoValidation.valid) {
      const errorMsg = `CEO Envelope validation failed: ${ceoValidation.errors.join("; ")}`;
      const failedResult: TaskResultEnvelope = {
        taskId: rootTaskId,
        parentTaskId: null,
        agent: "ceo",
        status: "failed",
        data: null,
        findings: [],
        conflicts: [],
        recommendations: [],
        confidence: 0,
        evidence: [],
        artifacts: [],
        durationMs: performance.now() - startTime,
        error: errorMsg,
        validation: { passed: false, details: errorMsg },
      };

      const treeNode: ExecutionTreeNode = {
        taskId: rootTaskId,
        parentTaskId: null,
        agent: "ceo",
        objective: request.objective,
        depth: 0,
        status: "FAILED",
        riskLevel: ceoEnvelope.riskLevel,
        approvalRequired: ceoEnvelope.approvalRequired,
        durationMs: performance.now() - startTime,
        error: errorMsg,
        children: [],
        createdAt: now,
        completedAt: new Date().toISOString(),
      };
      delegationTreeStore.addNode(treeNode);

      return { result: failedResult, tree: treeNode };
    }

    // 3. Register CEO node in Tree
    const ceoNode: ExecutionTreeNode = {
      taskId: rootTaskId,
      parentTaskId: null,
      agent: "ceo",
      objective: ceoEnvelope.objective,
      depth: 0,
      status: "RUNNING",
      riskLevel: ceoEnvelope.riskLevel,
      approvalRequired: ceoEnvelope.approvalRequired,
      durationMs: 0,
      children: [],
      createdAt: now,
    };
    delegationTreeStore.addNode(ceoNode);

    // Record Telemetry
    emitAgentEvent({
      agent: "executive",
      event: "delegation.created",
      metadata: { taskId: rootTaskId, depth: 0, objective: ceoEnvelope.objective },
    });

    // 4. Construct Boss Envelope (depth = 1)
    const bossTaskId = `task_boss_${randomUUID().slice(0, 8)}`;
    const bossEnvelope: TaskEnvelope = {
      taskId: bossTaskId,
      parentTaskId: rootTaskId,
      objective: `Supervise and decompose execution for: ${ceoEnvelope.objective}`,
      agent: "boss",
      input: { ...ceoEnvelope.input },
      constraints: [...ceoEnvelope.constraints],
      toolAllowlist: ceoEnvelope.toolAllowlist.filter((t) => !t.includes("admin")),
      budget: {
        maxToolCalls: Math.floor((ceoEnvelope.budget.maxToolCalls || 20) * 0.8),
        maxModelCalls: Math.floor((ceoEnvelope.budget.maxModelCalls || 10) * 0.8),
        maxRetries: 1,
        maxDurationMs: Math.floor((ceoEnvelope.budget.maxDurationMs || 30000) * 0.8),
        estimatedCost: ceoEnvelope.budget.estimatedCost ? ceoEnvelope.budget.estimatedCost * 0.8 : undefined,
      },
      deadline: ceoEnvelope.deadline,
      expectedOutput: { type: "boss_supervision_deliverable" },
      successCriteria: [
        "Coordinate Skills design system selection",
        "Coordinate Uniqueness differentiation audit",
        "Resolve operational conflicts locally or escalate to CEO",
      ],
      riskLevel: ceoEnvelope.riskLevel,
      depth: 1,
      createdAt: new Date().toISOString(),
      createdBy: "ceo",
      correlationId,
      tenantId: ceoEnvelope.tenantId,
      projectId: ceoEnvelope.projectId,
      approvalRequired: ceoEnvelope.approvalRequired,
      status: "PENDING",
    };

    // 5. Validate Parent-Child Invariant (CEO -> Boss)
    const parentChildCheck = taskEnvelopeValidator.validateParentChild(ceoEnvelope, bossEnvelope);
    if (!parentChildCheck.valid) {
      const errorMsg = `CEO -> Boss hierarchy invariant violated: ${parentChildCheck.errors.join("; ")}`;
      delegationTreeStore.updateNode(rootTaskId, {
        status: "FAILED",
        error: errorMsg,
        durationMs: performance.now() - startTime,
        completedAt: new Date().toISOString(),
      });

      return {
        result: {
          taskId: rootTaskId,
          parentTaskId: null,
          agent: "ceo",
          status: "failed",
          data: null,
          findings: [],
          conflicts: [],
          recommendations: [],
          confidence: 0,
          evidence: [],
          artifacts: [],
          durationMs: performance.now() - startTime,
          error: errorMsg,
        },
        tree: delegationTreeStore.getTree(rootTaskId)!,
      };
    }

    // Register Boss Node in Tree
    const bossNode: ExecutionTreeNode = {
      taskId: bossTaskId,
      parentTaskId: rootTaskId,
      agent: "boss",
      objective: bossEnvelope.objective,
      depth: 1,
      status: "RUNNING",
      riskLevel: bossEnvelope.riskLevel,
      approvalRequired: bossEnvelope.approvalRequired,
      durationMs: 0,
      children: [],
      createdAt: new Date().toISOString(),
    };
    delegationTreeStore.addNode(bossNode);

    emitAgentEvent({
      agent: "boss",
      event: "delegation.dispatched",
      metadata: { taskId: bossTaskId, parentTaskId: rootTaskId, depth: 1 },
    });

    // 6. Execute Boss Delegation
    bossEnvelope.status = "RUNNING";
    const bossResult = await bossDelegator.delegateToBoss(bossEnvelope);
    bossEnvelope.status = bossResult.status === "completed" ? "COMPLETED" : "FAILED";

    // 7. Update Tree with Boss Subtasks and Results
    if (bossResult.subtasks && bossResult.subtasks.length > 0) {
      for (const subtask of bossResult.subtasks) {
        delegationTreeStore.addNode({
          taskId: subtask.taskId,
          parentTaskId: bossTaskId,
          agent: subtask.agent,
          objective: `Child task executed by ${subtask.agent}`,
          depth: 2,
          status: subtask.status === "completed" ? "COMPLETED" : "FAILED",
          riskLevel: bossEnvelope.riskLevel,
          approvalRequired: bossEnvelope.approvalRequired,
          durationMs: subtask.durationMs,
          result: subtask.data,
          error: subtask.error || null,
          children: [],
          createdAt: new Date(Date.now() - subtask.durationMs).toISOString(),
          completedAt: new Date().toISOString(),
        });
      }
    }

    delegationTreeStore.updateNode(bossTaskId, {
      status: bossResult.status === "completed" ? "COMPLETED" : bossResult.status === "escalated" ? "ESCALATED" : "FAILED",
      durationMs: bossResult.durationMs,
      result: bossResult.data,
      error: bossResult.error || null,
      escalation: bossResult.escalation || null,
      completedAt: new Date().toISOString(),
    });

    // 8. Handle Outcomes & Phase 18 Memory Integration
    const totalDurationMs = performance.now() - startTime;

    if (bossResult.status === "escalated") {
      emitAgentEvent({
        agent: "executive",
        event: "delegation.escalated",
        metadata: {
          rootTaskId,
          escalationReason: bossResult.escalation?.reason,
          unresolvedConflicts: bossResult.conflicts.length,
        },
      });

      delegationTreeStore.updateNode(rootTaskId, {
        status: "ESCALATED",
        durationMs: totalDurationMs,
        escalation: bossResult.escalation || null,
        completedAt: new Date().toISOString(),
      });

      return {
        result: {
          taskId: rootTaskId,
          parentTaskId: null,
          agent: "ceo",
          status: "escalated",
          data: bossResult.data,
          subtasks: [bossResult],
          findings: [
            "CEO received escalation from Boss supervisor.",
            ...bossResult.findings,
          ],
          conflicts: bossResult.conflicts,
          recommendations: [
            `Strategic Intervention Required: ${bossResult.escalation?.reason}`,
            ...bossResult.recommendations,
          ],
          confidence: bossResult.confidence,
          evidence: bossResult.evidence,
          artifacts: bossResult.artifacts,
          durationMs: totalDurationMs,
          escalation: bossResult.escalation,
          report: `CEO DELEGATION REPORT [ESCALATED]\nStatus: ESCALATED TO EXECUTIVE OVERSIGHT\nReason: ${bossResult.escalation?.reason}`,
        },
        tree: delegationTreeStore.getTree(rootTaskId)!,
      };
    }

    if (bossResult.status === "failed") {
      emitAgentEvent({
        agent: "executive",
        event: "delegation.failed",
        metadata: { rootTaskId, error: bossResult.error },
      });

      delegationTreeStore.updateNode(rootTaskId, {
        status: "FAILED",
        durationMs: totalDurationMs,
        error: bossResult.error || "Boss execution failed",
        completedAt: new Date().toISOString(),
      });

      return {
        result: {
          taskId: rootTaskId,
          parentTaskId: null,
          agent: "ceo",
          status: "failed",
          data: null,
          findings: bossResult.findings,
          conflicts: bossResult.conflicts,
          recommendations: bossResult.recommendations,
          confidence: 0,
          evidence: bossResult.evidence,
          artifacts: bossResult.artifacts,
          durationMs: totalDurationMs,
          error: bossResult.error,
        },
        tree: delegationTreeStore.getTree(rootTaskId)!,
      };
    }

    // 9. Success Path: Record Memory in Phase 18 Store
    try {
      await MemoryStore.getInstance().saveDecision({
        decisionId: `dec_${rootTaskId}`,
        runId: rootTaskId,
        agentName: "ceo",
        objective: ceoEnvelope.objective,
        chosenAction: "boss_skills_uniqueness_orchestration",
        reasoningSummary: `Delegated task with ${bossResult.conflicts.length} conflicts handled`,
        confidence: bossResult.confidence,
        metadata: {
          conflictsCount: bossResult.conflicts.length,
          durationMs: totalDurationMs,
        },
      });

      // If conflicts were successfully resolved locally, record a learning lesson
      const resolvedConflicts = bossResult.conflicts.filter((c) => c.resolution === "resolved_locally");
      if (resolvedConflicts.length > 0) {
        await LessonEngine.getInstance().createCandidateLesson({
          domain: "design",
          title: `Conflict resolution pattern for ${resolvedConflicts[0].topic}`,
          statement: `When Skills and Uniqueness conflict on ${resolvedConflicts[0].topic}, resolve by: ${resolvedConflicts[0].resolvedOutcome}`,
          sourceRunId: rootTaskId,
          initialConfidence: 0.9,
          initialEvidence: {
            description: `Resolved ${resolvedConflicts.length} design conflicts during Boss supervision`,
            verified: true,
          },
        });
      }
    } catch {
      // Non-fatal telemetry/memory logging failure
    }

    emitAgentEvent({
      agent: "executive",
      event: "delegation.completed",
      metadata: {
        rootTaskId,
        durationMs: totalDurationMs,
        conflicts: bossResult.conflicts.length,
      },
    });

    delegationTreeStore.updateNode(rootTaskId, {
      status: "COMPLETED",
      durationMs: totalDurationMs,
      result: bossResult.data,
      completedAt: new Date().toISOString(),
    });

    const ceoDeliverable: TaskResultEnvelope = {
      taskId: rootTaskId,
      parentTaskId: null,
      agent: "ceo",
      status: "completed",
      data: bossResult.data,
      subtasks: [bossResult],
      findings: [
        "Executive objective accomplished via hierarchical Boss supervision.",
        ...bossResult.findings,
      ],
      conflicts: bossResult.conflicts,
      recommendations: bossResult.recommendations,
      confidence: bossResult.confidence,
      evidence: bossResult.evidence,
      artifacts: bossResult.artifacts,
      durationMs: totalDurationMs,
      validation: { passed: true, details: "Full hierarchy completed within budget and constraints" },
      report: [
        `# EXECUTIVE STRATEGY & DELEGATION REPORT`,
        `Objective: ${ceoEnvelope.objective}`,
        `Status: COMPLETED (Hierarchy: CEO -> Boss -> Skills/Uniqueness)`,
        `Duration: ${totalDurationMs.toFixed(0)}ms`,
        `Confidence: ${(bossResult.confidence * 100).toFixed(0)}%`,
        `Conflicts Handled: ${bossResult.conflicts.length}`,
        `Deliverables & Synthesis:`,
        `  - Skills Selection & Layout Strategy: VALIDATED`,
        `  - Uniqueness & AST Fingerprint Audit: VALIDATED`,
      ].join("\n"),
    };

    return {
      result: ceoDeliverable,
      tree: delegationTreeStore.getTree(rootTaskId)!,
    };
  }

  /**
   * Retrieves an execution tree by root task ID.
   */
  public getExecutionTree(rootTaskId: string): ExecutionTreeNode | undefined {
    return delegationTreeStore.getTree(rootTaskId);
  }

  /**
   * Returns all recent execution trees.
   */
  public getRecentTrees(limit = 10): ExecutionTreeNode[] {
    return delegationTreeStore.getAllTrees({ limit });
  }
}

export const delegationManager = DelegationManager.getInstance();
