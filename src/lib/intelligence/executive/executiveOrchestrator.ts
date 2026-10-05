// src/lib/intelligence/executive/executiveOrchestrator.ts
import {
  type ExecutiveExecutionResult,
  type ExecutiveTaskRequest,
  type ExecutiveContext,
  type ExecutiveExecutionState,
  type ExecutiveExecutionTrajectoryStep,
  type ExecutiveEscalation,
  type ExecutiveVerificationResult,
  type ExecutiveDecision,
} from "./executiveTypes";
import { buildExecutiveContext } from "./executiveContextBuilder";
import { ExecutiveAgent } from "./executiveAgent";
import { verifyExecutiveExecution } from "./executiveVerifier";
import { generateExecutiveReport } from "./executiveReporter";
import { AgentRegistry } from "../agents/agentRegistry";
import { ToolRegistry } from "../tools/toolRegistry";
import { LoopDetector, DEFAULT_EXECUTION_BOUNDS, type ExecutionBounds } from "../policies/safetyPolicy";
import {
  emitExecutiveStarted,
  emitExecutivePlanning,
  emitExecutiveDelegating,
  emitExecutiveVerifying,
  emitExecutiveRepaired,
  emitExecutiveEscalated,
  emitExecutiveCompleted,
  emitExecutiveFailed,
} from "../telemetry/executiveTelemetry";
import { ExecutionMemory } from "../memory/executionMemory";
import { MemoryStore } from "../memory/memoryStore";
import { EvaluationService } from "../evals/evaluationService";
import { LessonEngine } from "../learning/lessonEngine";
import { TrajectoryLogger } from "../learning/trajectoryLogger";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export class ExecutiveOrchestrator {
  private agent: ExecutiveAgent;
  private agentRegistry: AgentRegistry;
  private toolRegistry: ToolRegistry;
  private memory: ExecutionMemory;
  private store: MemoryStore;
  private bounds: ExecutionBounds;

  constructor(options?: {
    customAgent?: ExecutiveAgent;
    bounds?: Partial<ExecutionBounds>;
  }) {
    this.agent = options?.customAgent || new ExecutiveAgent();
    this.agentRegistry = AgentRegistry.getInstance();
    this.toolRegistry = ToolRegistry.getInstance();
    this.memory = ExecutionMemory.getInstance();
    this.store = MemoryStore.getInstance();
    this.bounds = { ...DEFAULT_EXECUTION_BOUNDS, ...options?.bounds };
  }

  public async execute(request: ExecutiveTaskRequest): Promise<ExecutiveExecutionResult> {
    const startTime = Date.now();
    const runId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const trajectory: ExecutiveExecutionTrajectoryStep[] = [];
    const escalations: ExecutiveEscalation[] = [];
    const loopDetector = new LoopDetector();

    let currentState: ExecutiveExecutionState = "IDLE";

    const transitionState = (newState: ExecutiveExecutionState, details?: Record<string, unknown>) => {
      currentState = newState;
      trajectory.push({
        state: newState,
        timestamp: new Date().toISOString(),
        details,
      });
    };

    // 1. OBSERVE
    transitionState("OBSERVING", { objective: request.objective });
    const context: ExecutiveContext = await buildExecutiveContext(request, runId);
    const domain = context.detectedDomain || "general";
    const tenantId = context.tenantId || request.tenantId || request.userId || "default_tenant";

    // Persist run start and execution_started event into long-term memory
    await this.store.saveRun(tenantId, {
      id: runId,
      runId,
      parentRunId: null,
      agentId: "executive",
      objective: context.objective,
      domain,
      status: "running",
      startedAt: new Date(startTime).toISOString(),
      success: false,
      validationStatus: "pending",
      userId: context.userId,
      projectId: context.projectId,
      sessionId: context.sessionId,
      createdAt: new Date(startTime).toISOString(),
    });

    await this.store.saveEvent(tenantId, {
      id: `evt_start_${Date.now()}`,
      eventId: `evt_start_${Date.now()}`,
      runId,
      agentId: "executive",
      eventType: "execution_started",
      timestamp: new Date().toISOString(),
      payload: { objective: context.objective, priority: context.priority },
      createdAt: new Date().toISOString(),
    });

    emitExecutiveStarted({
      runId,
      objective: context.objective,
      priority: context.priority,
      userId: context.userId,
      projectId: context.projectId,
      metadata: { detectedDomain: context.detectedDomain },
    });

    // 2. UNDERSTAND
    transitionState("UNDERSTANDING", {
      detectedDomain: context.detectedDomain,
      constraintsCount: context.constraints.length,
      retrievedMemoriesCount: context.retrievedMemories?.length ?? 0,
    });

    // 3. PLAN
    transitionState("PLANNING");
    let decision: ExecutiveDecision;
    try {
      decision = await this.agent.plan(context);
      emitExecutivePlanning({
        runId,
        objective: context.objective,
        planSteps: decision.plan.length,
      });
    } catch (err) {
      const errMsg = sanitizeErrorOutput(err instanceof Error ? err.message : String(err));
      decision = this.agent.generateDeterministicDecision(context);
      escalations.push({
        reason: `Planning fallback triggered: ${errMsg}`,
        severity: "warning",
        timestamp: new Date().toISOString(),
      });
    }

    // Persist strategic decision into long-term memory
    await this.store.saveDecision(tenantId, {
      id: `dec_${Date.now()}`,
      decisionId: `dec_${Date.now()}`,
      runId,
      objective: context.objective,
      decisionType: "strategic_plan",
      chosenAction: decision.next_action,
      alternativesConsidered: ["unassisted_generation", "standard_fallback"],
      reasoningSummary: decision.report || `Synthesized ${decision.plan.length}-step plan for ${domain}`,
      confidence: 0.9,
      evidence: decision.constraints,
      createdAt: new Date().toISOString(),
    });

    await this.store.saveEvent(tenantId, {
      id: `evt_plan_${Date.now()}`,
      eventId: `evt_plan_${Date.now()}`,
      runId,
      agentId: "executive",
      eventType: "planning_completed",
      timestamp: new Date().toISOString(),
      payload: { stepsCount: decision.plan.length },
      createdAt: new Date().toISOString(),
    });

    // 4. DELEGATE & TOOL EXECUTION (with loop detection and repair cycles)
    let delegationResults: Array<{ agent: string; task: string; success: boolean; data?: unknown; error?: string }> = [];
    let toolCallResults: Array<{ tool: string; success: boolean; data?: unknown; error?: string }> = [];
    let verifications: ExecutiveVerificationResult[] = [];
    let repairsApplied = 0;
    let isExecutionSuccess = false;

    for (let cycle = 0; cycle <= this.bounds.maxRetries; cycle++) {
      transitionState(cycle === 0 ? "DELEGATING" : "REPAIRING", { cycle });

      delegationResults = [];
      toolCallResults = [];

      // Check timeout bound
      if (Date.now() - startTime > this.bounds.maxDurationMs) {
        escalations.push({
          reason: `Max execution duration exceeded (${this.bounds.maxDurationMs}ms).`,
          severity: "critical",
          timestamp: new Date().toISOString(),
        });
        break;
      }

      // Execute Delegations (up to max bounds)
      let toolCallCount = 0;
      for (const delegation of decision.delegations.slice(0, this.bounds.maxDelegationDepth)) {
        const isLoop = loopDetector.checkLoop(
          "agent",
          delegation.agent,
          delegation.parameters || {},
          this.bounds.maxConsecutiveIdenticalFailures
        );

        if (isLoop) {
          escalations.push({
            reason: `Infinite loop detected for agent '${delegation.agent}'. Repeated identical failure halted.`,
            severity: "critical",
            timestamp: new Date().toISOString(),
          });
          delegationResults.push({
            agent: delegation.agent,
            task: delegation.task,
            success: false,
            error: "Halted by safety policy: repeated identical action loop detected.",
          });
          break;
        }

        emitExecutiveDelegating({
          runId,
          agent: delegation.agent,
          task: delegation.task,
        });

        const result = await this.agentRegistry.executeDelegation(
          delegation.agent,
          delegation.task,
          delegation.parameters || {},
          context
        );

        loopDetector.recordAttempt("agent", delegation.agent, delegation.parameters || {}, result.success);

        delegationResults.push({
          agent: delegation.agent,
          task: delegation.task,
          success: result.success,
          data: result.data,
          error: result.error,
        });
      }

      // Execute Tools (up to max tool call bound)
      for (const toolCall of decision.tool_calls) {
        if (toolCallCount >= this.bounds.maxToolCalls) {
          escalations.push({
            reason: `Max tool calls limit reached (${this.bounds.maxToolCalls}).`,
            severity: "warning",
            timestamp: new Date().toISOString(),
          });
          break;
        }

        const isLoop = loopDetector.checkLoop(
          "tool",
          toolCall.tool,
          toolCall.parameters || {},
          this.bounds.maxConsecutiveIdenticalFailures
        );

        if (isLoop) {
          escalations.push({
            reason: `Infinite loop detected for tool '${toolCall.tool}'. Repeated identical failure halted.`,
            severity: "critical",
            timestamp: new Date().toISOString(),
          });
          toolCallResults.push({
            tool: toolCall.tool,
            success: false,
            error: "Halted by safety policy: repeated identical tool loop detected.",
          });
          break;
        }

        const result = await this.toolRegistry.executeTool(
          toolCall.tool,
          toolCall.parameters || {},
          context
        );

        toolCallCount++;
        loopDetector.recordAttempt("tool", toolCall.tool, toolCall.parameters || {}, result.success);

        toolCallResults.push({
          tool: toolCall.tool,
          success: result.success,
          data: result.data,
          error: result.error,
        });
      }

      // 5. VERIFY
      transitionState("VERIFYING", { cycle });
      verifications = verifyExecutiveExecution(decision, delegationResults, toolCallResults, context);

      emitExecutiveVerifying({
        runId,
        checkCount: verifications.length,
      });

      const failedVerifications = verifications.filter((v) => !v.passed);

      if (failedVerifications.length === 0) {
        // All checks passed!
        isExecutionSuccess = true;
        break;
      }

      // If we have category mismatch or errors, attempt repair
      if (cycle < this.bounds.maxRetries) {
        repairsApplied++;
        const failureReasons = failedVerifications.map((f) => f.details || f.rule).join("; ");

        emitExecutiveRepaired({
          runId,
          repairCount: repairsApplied,
          reason: failureReasons,
        });

        // If category mismatch: adjust parameters for next cycle
        const categoryCheck = verifications.find((v) => v.categoryMismatch);
        if (categoryCheck) {
          const expectedCat = context.detectedDomain || "general";
          decision.delegations.forEach((d) => {
            if (d.parameters) {
              d.parameters.category = expectedCat;
              d.parameters.domain = expectedCat;
              // Clean any conflicting preview html if any
              if (d.parameters.previewHtml) {
                d.parameters.previewHtml = `<html><body>Tailored for ${expectedCat}</body></html>`;
              }
            }
          });
          decision.tool_calls.forEach((t) => {
            if (t.parameters) {
              t.parameters.category = expectedCat;
            }
          });
        }
      } else {
        // Retries exhausted -> ESCALATE
        transitionState("ESCALATING", { repairsApplied });
        const finalReasons = failedVerifications.map((f) => f.details || f.rule).join("; ");
        escalations.push({
          reason: `Verification failed after ${repairsApplied} repairs: ${finalReasons}`,
          severity: "critical",
          timestamp: new Date().toISOString(),
          actionRequired: "Human administrator review required.",
        });

        emitExecutiveEscalated({
          runId,
          reason: finalReasons,
          severity: "critical",
        });
      }
    }

    // 8. LEARN
    // Stage execution trajectory
    const durationMs = Date.now() - startTime;

    // 9. REPORT
    transitionState("REPORTING");
    const reportText = generateExecutiveReport(
      decision,
      delegationResults,
      toolCallResults,
      verifications,
      escalations,
      durationMs
    );

    const finalState: ExecutiveExecutionState = isExecutionSuccess ? "COMPLETED" : "FAILED";
    transitionState(finalState);

    const finalResult: ExecutiveExecutionResult = {
      runId,
      objective: context.objective,
      state: finalState,
      priority: context.priority,
      decision,
      delegationResults,
      toolCallResults,
      verifications,
      escalations,
      repairsApplied,
      trajectory,
      report: reportText,
      durationMs,
      success: isExecutionSuccess,
      error: !isExecutionSuccess ? escalations[0]?.reason : undefined,
    };

    if (isExecutionSuccess) {
      emitExecutiveCompleted({
        runId,
        latencyMs: durationMs,
        reportSummary: decision.next_action,
      });
    } else {
      emitExecutiveFailed({
        runId,
        error: escalations[0]?.reason || "Execution failed",
        latencyMs: durationMs,
      });
    }

    // Record failure if not recovered
    if (!isExecutionSuccess) {
      await this.store.saveFailure(tenantId, {
        id: `fail_${Date.now()}`,
        failureId: `fail_${Date.now()}`,
        runId,
        agentId: "executive",
        failureType: verifications.some((v) => v.categoryMismatch) ? "category_mismatch" : "validation_failure",
        errorCode: "VERIFICATION_FAILURE",
        safeErrorMessage: escalations[0]?.reason || "Execution verifications failed",
        attemptedAction: decision.next_action,
        retryCount: repairsApplied,
        recoveryAction: repairsApplied > 0 ? "parameter_rewriting" : undefined,
        recovered: false,
        domain,
        createdAt: new Date().toISOString(),
      });
    }

    // Record into Memory & Trajectory Stage
    this.memory.recordRun(finalResult);
    TrajectoryLogger.stageTrajectory(finalResult);

    // Evaluate Run and persist structured evidence
    try {
      const evalService = EvaluationService.getInstance();
      await evalService.evaluateRun(finalResult);

      // Formulate candidate lesson from outcome if successful
      if (isExecutionSuccess) {
        const lessonEngine = LessonEngine.getInstance();
        await lessonEngine.createCandidateLesson({
          title: `Successful ${domain} execution pattern`,
          statement: `Strategy '${decision.next_action}' verified successful for domain '${domain}' with ${verifications.length} passed checks.`,
          domain,
          sourceRunId: runId,
          tenantId,
          initialEvidence: {
            type: "execution_outcome",
            description: `All ${verifications.length} validation and quality checks passed in ${durationMs}ms.`,
            source: "ExecutiveOrchestrator",
          },
        });
      }
    } catch {
      // Safe fallback
    }

    // Update final run state in MemoryStore
    await this.store.saveRun(tenantId, {
      id: runId,
      runId,
      parentRunId: null,
      agentId: "executive",
      objective: context.objective,
      domain,
      status: isExecutionSuccess ? "success" : "failed",
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs,
      success: isExecutionSuccess,
      failureReason: !isExecutionSuccess ? escalations[0]?.reason : null,
      validationStatus: isExecutionSuccess ? "passed" : "failed",
      outputReference: { nextAction: decision.next_action, repairs: repairsApplied },
      userId: context.userId,
      projectId: context.projectId,
      sessionId: context.sessionId,
      createdAt: new Date(startTime).toISOString(),
    });

    await this.store.saveEvent(tenantId, {
      id: `evt_end_${Date.now()}`,
      eventId: `evt_end_${Date.now()}`,
      runId,
      agentId: "executive",
      eventType: isExecutionSuccess ? "execution_completed" : "execution_failed",
      timestamp: new Date().toISOString(),
      durationMs,
      payload: { success: isExecutionSuccess, repairsApplied },
      createdAt: new Date().toISOString(),
    });

    return finalResult;
  }
}
