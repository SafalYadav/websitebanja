// src/lib/intelligence/validation/validationOrchestrator.ts
/**
 * Validation Orchestrator
 * Requirement #21: Quality Gate + Bounded Self-Correction Repair Loop
 * Coordinates 7 validation stages in exact deterministic sequence:
 * SEMANTIC -> VISUAL -> CTA -> NAVIGATION -> CLAIMS -> ACCESSIBILITY -> PERFORMANCE
 * Determines deterministic READY / REPAIR_REQUIRED / FAILED decisions.
 * Drives server-side bounded repair loop with Boss delegation and loop protection.
 */

import { randomUUID } from "crypto";
import type {
  ValidationContext,
  ValidationReport,
  ValidationStage,
  StageValidationResult,
  ValidationFailureItem,
  ValidationWarningItem,
  ValidationDecision,
  CeoValidationAlert,
} from "./types";
import { ORDERED_VALIDATION_STAGES } from "./types";
import { validateSemantics } from "./semanticValidator";
import { validateVisual } from "./visualValidator";
import { validateCTA } from "./ctaValidator";
import { validateNavigation } from "./navigationValidator";
import { validateClaims } from "./claimsValidator";
import { validateAccessibility } from "./accessibilityValidator";
import { validatePerformance } from "./performanceValidator";
import { repairCoordinator } from "./repairCoordinator";
import { validationStore } from "./validationStore";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { redactSecretsInObject } from "../memory/memoryStore";

export const DEFAULT_MAX_RETRIES = 3;

export class ValidationOrchestrator {
  private static instance: ValidationOrchestrator;

  private constructor() {}

  public static getInstance(): ValidationOrchestrator {
    if (!ValidationOrchestrator.instance) {
      ValidationOrchestrator.instance = new ValidationOrchestrator();
    }
    return ValidationOrchestrator.instance;
  }

  /**
   * Executes the 7 modular validation stages in exact deterministic order.
   */
  public async validateWebsite(context: ValidationContext): Promise<ValidationReport> {
    const startTime = new Date().toISOString();
    const validationId = `val_${randomUUID().slice(0, 10)}`;
    const maxRetries = context.maxRetries ?? DEFAULT_MAX_RETRIES;
    const retryCount = context.retryCount ?? 0;
    const remainingRetries = Math.max(0, maxRetries - retryCount);

    emitAgentEvent({
      agent: "CEO",
      event: "agent.started",
      status: "running",
      metadata: {
        action: "agent_validation_started",
        validationId,
        projectId: context.projectId,
        retryCount,
        maxRetries,
        tenantId: context.tenantId,
      },
      projectId: context.projectId,
    });



    const stageResults: Partial<Record<ValidationStage, StageValidationResult>> = {};
    const allFailures: ValidationFailureItem[] = [];
    const allWarnings: ValidationWarningItem[] = [];

    // Execute stages in strictly defined order
    for (const stage of ORDERED_VALIDATION_STAGES) {
      let result: StageValidationResult;

      try {
        switch (stage) {
          case "SEMANTIC":
            result = validateSemantics(context);
            break;
          case "VISUAL":
            result = validateVisual(context);
            break;
          case "CTA":
            result = validateCTA(context);
            break;
          case "NAVIGATION":
            result = validateNavigation(context);
            break;
          case "CLAIMS":
            result = validateClaims(context);
            break;
          case "ACCESSIBILITY":
            result = validateAccessibility(context);
            break;
          case "PERFORMANCE":
            result = validatePerformance(context);
            break;
          default:
            throw new Error(`Unknown validation stage: ${stage}`);
        }
      } catch (err: any) {
        // Safe validator failure containment
        result = {
          stage,
          status: "FAIL",
          passed: false,
          failures: [
            {
              id: randomUUID(),
              stage,
              severity: "CRITICAL",
              failure: `Validator exception in ${stage}: ${err?.message || "Internal error"}`,
              evidence: String(err?.stack || err),
              affectedElement: stage,
              suggestedFix: "Review validator input schema",
              blocking: true,
            },
          ],
          warnings: [],
          evidence: [],
          durationMs: 0,
        };
      }

      stageResults[stage] = result;
      allFailures.push(...result.failures);
      allWarnings.push(...result.warnings);
    }

    const blockingFailures = allFailures.filter((f) => f.blocking);
    const failureFingerprint = repairCoordinator.computeFailureFingerprint(blockingFailures);
    const isLoopDetected = repairCoordinator.detectLoop(
      failureFingerprint,
      context.previousFingerprints || []
    );

    // Deterministic Decision Matrix
    let decision: ValidationDecision;
    if (blockingFailures.length === 0) {
      decision = "READY";
    } else if (isLoopDetected) {
      decision = "FAILED";
    } else if (remainingRetries <= 0) {
      decision = "FAILED";
    } else {
      decision = "REPAIR_REQUIRED";
    }

    // Calculate score
    const scores = Object.values(stageResults)
      .map((r) => r.score)
      .filter((s): s is number => typeof s === "number");
    const overallScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : undefined;

    const report: ValidationReport = {
      validationId,
      projectId: context.projectId,
      runId: context.runId,
      tenantId: context.tenantId,
      decision,
      overallScore,
      stageResults: stageResults as Record<ValidationStage, StageValidationResult>,
      blockingFailures,
      allFailures,
      allWarnings,
      retryCount,
      maxRetries,
      remainingRetries,
      isLoopDetected,
      failureFingerprint,
      createdAt: startTime,
      completedAt: new Date().toISOString(),
    };

    // Scrub secrets from report before persistence
    const sanitizedReport = redactSecretsInObject(report) as ValidationReport;
    await validationStore.saveReport(sanitizedReport);

    emitAgentEvent({
      agent: "CEO",
      event: "agent.completed",
      status: decision === "READY" ? "success" : "error",
      metadata: {
        action: "agent_validation_completed",
        validationId,
        decision,
        blockingCount: blockingFailures.length,
        overallScore,
        isLoopDetected,
        tenantId: context.tenantId,
      },
      projectId: context.projectId,
    });

    return sanitizedReport;
  }

  /**
   * Executes the full Self-Correction & Bounded Repair Loop.
   * Validates -> If failures -> Boss repairs -> Regenerates -> Validates again.
   * Halts strictly when READY, loop detected, or max retries exhausted.
   */
  public async executeSelfCorrectionLoop(context: ValidationContext): Promise<{
    finalReport: ValidationReport;
    finalWebsiteData: Record<string, unknown>;
    cycles: number;
    repaired: boolean;
    ceoAlert?: CeoValidationAlert;
  }> {
    let currentData = JSON.parse(JSON.stringify(context.websiteData || {}));
    let currentRetryCount = context.retryCount ?? 0;
    const maxRetries = context.maxRetries ?? DEFAULT_MAX_RETRIES;
    const historyFingerprints: string[] = [...(context.previousFingerprints || [])];

    let cycles = 0;
    let latestReport!: ValidationReport;

    while (cycles <= maxRetries) {
      cycles++;

      const cycleContext: ValidationContext = {
        ...context,
        websiteData: currentData,
        retryCount: currentRetryCount,
        maxRetries,
        previousFingerprints: historyFingerprints,
      };

      latestReport = await this.validateWebsite(cycleContext);
      historyFingerprints.push(latestReport.failureFingerprint);

      // If READY, terminate loop successfully
      if (latestReport.decision === "READY") {
        return {
          finalReport: latestReport,
          finalWebsiteData: currentData,
          cycles,
          repaired: cycles > 1,
        };
      }

      // If FAILED (loop detected or budget exhausted), escalate to CEO and break
      if (latestReport.decision === "FAILED" || latestReport.remainingRetries <= 0) {
        const ceoAlert = repairCoordinator.createCeoAlert(latestReport);
        emitAgentEvent({
          agent: "CEO",
          event: "agent.failed",
          status: "error",
          metadata: {
            action: "agent_repair_exhausted",
            alertId: ceoAlert.alertId,
            reason: latestReport.isLoopDetected ? "LOOP_DETECTED" : "RETRY_BUDGET_EXHAUSTED",
            cycles,
            tenantId: context.tenantId,
          },
          projectId: context.projectId,
        });



        return {
          finalReport: latestReport,
          finalWebsiteData: currentData,
          cycles,
          repaired: false,
          ceoAlert,
        };
      }

      // If REPAIR_REQUIRED: execute bounded repair with Boss delegator
      currentRetryCount++;
      const repairResult = await repairCoordinator.executeRepair(cycleContext, latestReport);

      if (!repairResult.success) {
        const ceoAlert = repairCoordinator.createCeoAlert(latestReport);
        return {
          finalReport: latestReport,
          finalWebsiteData: currentData,
          cycles,
          repaired: false,
          ceoAlert,
        };
      }

      // Update data with repaired output for the next validation pass
      currentData = repairResult.repairedData;
    }

    // Safety fallback if loop exits unexpectedly
    const ceoAlert = repairCoordinator.createCeoAlert(latestReport);
    return {
      finalReport: latestReport,
      finalWebsiteData: currentData,
      cycles,
      repaired: false,
      ceoAlert,
    };
  }
}

export const validationOrchestrator = ValidationOrchestrator.getInstance();
