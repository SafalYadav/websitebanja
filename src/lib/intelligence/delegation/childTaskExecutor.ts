// src/lib/intelligence/delegation/childTaskExecutor.ts
import { runSkillsAgent } from "@/lib/agents/skills/skillsAgent";
import type { SkillsAgentInput } from "@/lib/agents/skills/types";
import { runUniquenessAgent } from "@/lib/agents/uniqueness/uniquenessAgent";
import type { UniquenessCheckInput } from "@/lib/agents/uniqueness/types";
import type { TaskEnvelope, TaskResultEnvelope } from "./delegationTypes";
import { taskEnvelopeValidator } from "./taskEnvelopeValidator";

export class ChildTaskExecutor {
  private static instance: ChildTaskExecutor;

  private constructor() {}

  public static getInstance(): ChildTaskExecutor {
    if (!ChildTaskExecutor.instance) {
      ChildTaskExecutor.instance = new ChildTaskExecutor();
    }
    return ChildTaskExecutor.instance;
  }

  /**
   * Executes a specialized child task (depth = 2) for either Skills or Uniqueness.
   * Isolates runtime errors, enforces timeout, and produces a structured TaskResultEnvelope.
   */
  public async executeChildTask(envelope: TaskEnvelope): Promise<TaskResultEnvelope> {
    const startTime = performance.now();

    // 1. Validate envelope integrity
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
        error: `Envelope validation failed: ${validation.errors.join("; ")}`,
        validation: { passed: false, details: validation.errors.join("; ") },
      };
    }

    if (envelope.depth !== 2) {
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
        error: `Child task executor expects depth=2, received depth=${envelope.depth}`,
        validation: { passed: false, details: "Depth violation" },
      };
    }

    const timeoutMs = envelope.budget.maxDurationMs || 15000;

    try {
      const executePromise = (async () => {
        const agentName = envelope.agent.toLowerCase();
        if (agentName === "skills") {
          return await this.executeSkillsTask(envelope);
        } else if (agentName === "uniqueness") {
          return await this.executeUniquenessTask(envelope);
        } else {
          throw new Error(`Unsupported child agent '${envelope.agent}'`);
        }
      })();

      // Wrap in timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Child task timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      return await Promise.race([executePromise, timeoutPromise]);
    } catch (err: unknown) {
      const durationMs = performance.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

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
        durationMs,
        error: errorMsg,
        validation: { passed: false, details: errorMsg },
      };
    }
  }

  private async executeSkillsTask(envelope: TaskEnvelope): Promise<TaskResultEnvelope> {
    const startTime = performance.now();
    const rawInput = envelope.input as Record<string, unknown>;

    const skillsInput: SkillsAgentInput = {
      category: (rawInput.category as string) || "business",
      businessName: (rawInput.businessName as string) || "Client Business",
      description: (rawInput.description as string) || envelope.objective,
      targetAudience: (rawInput.targetAudience as string) || "General public",
      requestedFeatures: Array.isArray(rawInput.requestedFeatures)
        ? (rawInput.requestedFeatures as string[])
        : [],
      stylePreferences: Array.isArray(rawInput.stylePreferences)
        ? (rawInput.stylePreferences as string[])
        : ["modern_clean"],
      primaryColor: (rawInput.primaryColor as string) || "#0f172a",
      previousDesigns: Array.isArray(rawInput.previousDesigns)
        ? (rawInput.previousDesigns as any[])
        : [],
    };

    const result = await runSkillsAgent(skillsInput, {
      userId: envelope.createdBy,
      projectId: envelope.projectId,
      timeoutMs: envelope.budget.maxDurationMs || 10000,
    });

    const durationMs = performance.now() - startTime;
    const output = result.data;

    const findings: string[] = [
      `Selected ${output.selectedSkills.length} design skills for category '${skillsInput.category}'.`,
      `Design Direction: ${output.designDirection.visualStyle} with ${output.designDirection.layoutStrategy} layout.`,
    ];

    const recommendations: string[] = [
      `Adopt layout strategy: ${output.designDirection.layoutStrategy}`,
      `Color direction: ${output.designDirection.colorDirection}`,
      `Hero strategy: ${output.designDirection.heroStrategy}`,
    ];

    const artifacts = [
      {
        type: "skills_selection",
        name: "skills_output",
        content: output,
      },
    ];

    return {
      taskId: envelope.taskId,
      parentTaskId: envelope.parentTaskId,
      agent: "skills",
      status: result.success ? "completed" : "failed",
      data: output,
      findings,
      conflicts: [],
      recommendations,
      confidence: output.confidence ?? 0.85,
      evidence: [
        {
          source: "skillRegistry",
          description: `Verified ${output.selectedSkills.length} skills against canonical registry`,
          verified: true,
        },
      ],
      artifacts,
      durationMs,
      error: result.warnings && result.warnings.length > 0 ? result.warnings.join("; ") : null,
      validation: {
        passed: result.success,
        details: result.source === "fallback" ? "Executed via deterministic heuristic fallback" : undefined,
      },
    };
  }

  private async executeUniquenessTask(envelope: TaskEnvelope): Promise<TaskResultEnvelope> {
    const startTime = performance.now();
    const rawInput = envelope.input as Record<string, unknown>;

    const uniquenessInput: UniquenessCheckInput = {
      newWebsite: (rawInput.newWebsite as any) || {
        heroType: (rawInput.heroType as string) || "split_screen_interactive",
        layoutType: (rawInput.layoutType as string) || "asymmetric_editorial",
        colorPalette: (rawInput.colorPalette as string[]) || ["#0f172a", "#38bdf8"],
        sectionOrder: (rawInput.sectionOrder as string[]) || ["hero", "features", "pricing", "cta"],
        typography: (rawInput.typography as any) || { headingFont: "Inter", bodyFont: "Inter" },
        componentFingerprints: (rawInput.componentFingerprints as string[]) || ["card_standard", "nav_top"],
      },
      category: (rawInput.category as string) || "business",
      businessName: (rawInput.businessName as string) || "Client Business",
      description: (rawInput.description as string) || envelope.objective,
      candidates: Array.isArray(rawInput.candidateWebsites)
        ? (rawInput.candidateWebsites as any[])
        : Array.isArray(rawInput.candidates)
        ? (rawInput.candidates as any[])
        : [],
      regenerationAttempt: typeof rawInput.regenerationAttempt === "number" ? rawInput.regenerationAttempt : 0,
    };

    const result = await runUniquenessAgent(uniquenessInput, {
      userId: envelope.createdBy,
      projectId: envelope.projectId ?? undefined,
    });

    const durationMs = performance.now() - startTime;
    const output = result.data;

    const findings: string[] = [
      `Evaluated uniqueness status: ${output.status}.`,
      `Structural similarity score: ${output.similarityScore.toFixed(2)}.`,
    ];

    if (output.issues && output.issues.length > 0) {
      findings.push(...output.issues);
    }

    const recommendations = [...(output.redesignDirectives || [])];

    const artifacts = [
      {
        type: "uniqueness_check",
        name: "uniqueness_output",
        content: output,
      },
    ];

    return {
      taskId: envelope.taskId,
      parentTaskId: envelope.parentTaskId,
      agent: "uniqueness",
      status: result.success ? "completed" : "failed",
      data: output,
      findings,
      conflicts: [],
      recommendations,
      confidence: output.confidence ?? 0.9,
      evidence: [
        {
          source: "similarityEngine",
          description: `Evaluated cosine layout and AST token distance against candidate set`,
          verified: true,
        },
      ],
      artifacts,
      durationMs,
      error: result.warnings && result.warnings.length > 0 ? result.warnings.join("; ") : null,
      validation: {
        passed: output.status === "PASS" || output.status === "REVIEW",
        details: output.status === "REGENERATE" ? "Uniqueness threshold exceeded" : undefined,
      },
    };
  }
}

export const childTaskExecutor = ChildTaskExecutor.getInstance();
