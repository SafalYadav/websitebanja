// src/lib/intelligence/delegation/conflictResolver.ts
import { randomUUID } from "crypto";
import type { TaskConflict, TaskEscalation, DelegationRiskLevel } from "./delegationTypes";
import { StrategyManager } from "../learning/strategyManager";

export interface ConflictDetectionInput {
  skillsOutput?: {
    selectedSkills?: Array<{ skillId: string; reason?: string }>;
    designDirection?: {
      visualStyle?: string;
      layoutStrategy?: string;
      heroStrategy?: string;
      colorDirection?: string;
      componentStrategy?: string;
    };
    variationStrategy?: {
      avoidPatterns?: string[];
      preferredPatterns?: string[];
      noveltyLevel?: string;
    };
    recommendations?: string[];
    warnings?: string[];
  };
  uniquenessOutput?: {
    status?: string; // "PASS" | "REVIEW" | "REGENERATE"
    overallSimilarity?: number;
    detectedIssues?: string[];
    redesignDirectives?: string[];
    closestCandidate?: { businessName: string; similarityScore: number };
  };
  contextConstraints?: string[];
  tenantId?: string | null;
}

export class ConflictResolver {
  private static instance: ConflictResolver;

  private constructor() {}

  public static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  /**
   * Analyzes outputs from Skills and Uniqueness agents to detect and resolve conflicts.
   */
  public async detectAndResolve(
    input: ConflictDetectionInput
  ): Promise<{
    conflicts: TaskConflict[];
    escalation: TaskEscalation | null;
    resolvedDirectives: string[];
  }> {
    const conflicts: TaskConflict[] = [];
    const resolvedDirectives: string[] = [];

    const skills = input.skillsOutput;
    const uniqueness = input.uniquenessOutput;

    if (!skills || !uniqueness) {
      return { conflicts: [], escalation: null, resolvedDirectives: [] };
    }

    // 1. Check Uniqueness Status: REGENERATE indicates high structural conflict
    if (uniqueness.status === "REGENERATE") {
      const conflictId = `conf_${randomUUID().slice(0, 8)}`;
      const issue = uniqueness.detectedIssues?.[0] || "Structural similarity exceeds threshold";

      const conflict: TaskConflict = {
        conflictId,
        topic: "structural_similarity_threshold",
        sourceA: {
          agent: "skills",
          recommendation: `Proposed layout: ${skills.designDirection?.layoutStrategy || "standard"}`,
          reason: "Selected by industry skill heuristics",
        },
        sourceB: {
          agent: "uniqueness",
          recommendation: `REGENERATE: ${issue}`,
          reason: `Similarity score ${(uniqueness.overallSimilarity ?? 0).toFixed(2)} exceeds allowable threshold`,
        },
        severity: "high",
        resolution: "escalated_to_ceo",
        resolvedOutcome: null,
        resolutionRationale: "Structural collision cannot be resolved automatically at Boss level without CEO approval.",
      };

      conflicts.push(conflict);

      const escalation: TaskEscalation = {
        reason: `Critical uniqueness failure: candidate layout exceeds similarity threshold with ${uniqueness.closestCandidate?.businessName || "competitor"}.`,
        fromAgent: "boss",
        toAgent: "ceo",
        severity: "critical",
        unresolvedConflicts: [conflict],
        partialResults: { skills, uniqueness },
        timestamp: new Date().toISOString(),
      };

      return { conflicts, escalation, resolvedDirectives };
    }

    // 2. Check Pattern Conflicts (Skills preferredPatterns vs Uniqueness redesignDirectives / avoidPatterns)
    const skillsPreferred = skills.variationStrategy?.preferredPatterns || [];
    const uniquenessDirectives = uniqueness.redesignDirectives || [];
    const uniquenessIssues = uniqueness.detectedIssues || [];

    for (const directive of uniquenessDirectives) {
      const lowerDir = directive.toLowerCase();

      // Check if Uniqueness tells us to differentiate hero, but Skills selected a standard hero
      if (
        (lowerDir.includes("hero") || lowerDir.includes("layout")) &&
        skills.designDirection?.heroStrategy
      ) {
        const conflictId = `conf_${randomUUID().slice(0, 8)}`;
        const resolvedHero = `adaptive_custom_${skills.designDirection.heroStrategy}`;

        conflicts.push({
          conflictId,
          topic: "hero_layout_differentiation",
          sourceA: {
            agent: "skills",
            recommendation: `Hero strategy: ${skills.designDirection.heroStrategy}`,
          },
          sourceB: {
            agent: "uniqueness",
            recommendation: directive,
          },
          severity: "medium",
          resolution: "resolved_locally",
          resolvedOutcome: resolvedHero,
          resolutionRationale:
            "Boss prioritized Uniqueness differentiation requirement while retaining core UX ergonomics from Skills.",
        });

        resolvedDirectives.push(`Apply differentiated hero: ${resolvedHero} (${directive})`);
      }

      // Check color direction conflicts
      if (lowerDir.includes("color") || lowerDir.includes("palette")) {
        const conflictId = `conf_${randomUUID().slice(0, 8)}`;
        const originalColor = skills.designDirection?.colorDirection || "default_palette";
        const modifiedColor = `${originalColor}_contrasted`;

        conflicts.push({
          conflictId,
          topic: "color_palette_contrast",
          sourceA: {
            agent: "skills",
            recommendation: `Color direction: ${originalColor}`,
          },
          sourceB: {
            agent: "uniqueness",
            recommendation: directive,
          },
          severity: "low",
          resolution: "resolved_locally",
          resolvedOutcome: modifiedColor,
          resolutionRationale:
            "Boss shifted accent color nuance to preserve brand identity without visual collision.",
        });

        resolvedDirectives.push(`Shift color scheme: ${modifiedColor}`);
      }
    }

    // 3. Consult Phase 18 Active Strategic Lessons (if applicable)
    try {
      const activeStrategy = await StrategyManager.getInstance().getActiveStrategy("design");
      if (activeStrategy && activeStrategy.status === "ACTIVE") {
        resolvedDirectives.push(`Enforce Strategic Rule: ${activeStrategy.name}`);
        if (Array.isArray(activeStrategy.directives)) {
          resolvedDirectives.push(...activeStrategy.directives);
        }
      }
    } catch {
      // Non-fatal if strategyManager lookup is bypassed or during synthetic tests
    }

    // 4. Check for Unresolved High Severity Conflicts
    const unresolvedHigh = conflicts.filter(
      (c) => c.severity === "high" && c.resolution === "unresolved"
    );

    let escalation: TaskEscalation | null = null;
    if (unresolvedHigh.length > 0) {
      escalation = {
        reason: `Boss encountered ${unresolvedHigh.length} unresolved high-severity conflicts between Skills and Uniqueness.`,
        fromAgent: "boss",
        toAgent: "ceo",
        severity: "high",
        unresolvedConflicts: unresolvedHigh,
        partialResults: { skills, uniqueness },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      conflicts,
      escalation,
      resolvedDirectives,
    };
  }
}

export const conflictResolver = ConflictResolver.getInstance();
