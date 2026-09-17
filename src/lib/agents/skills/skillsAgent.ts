// src/lib/agents/skills/skillsAgent.ts
import { runAgent } from "../runtime/agentRuntime";
import { routeModelRequest } from "@/lib/ai/router/modelRouter";
import { MODEL_CONFIG } from "@/lib/ai/router/modelConfig";
import type { RoutingPolicy } from "@/lib/ai/router/types";
import { getRegisteredSkills } from "@/lib/skills/skillRegistry";
import type { SkillMetadata } from "@/lib/skills/types";
import { selectSkillsForRequest } from "@/lib/skills/skillSelector";
import type {
  SkillsAgentInput,
  SkillsAgentOutput,
  SkillsAgentResult,
  SelectedSkillItem,
} from "./types";
import { SkillsAgentOutputSchema } from "./types";
import {
  buildSkillsAgentSystemPrompt,
  buildSkillsAgentUserPrompt,
} from "./skillsAgentPrompt";

/**
 * Validates that all selected skills exist in the canonical WebsiteBanja skill registry.
 */
function validateAndSanitizeSkills(
  rawSkills: SelectedSkillItem[]
): { validSkills: SelectedSkillItem[]; unknownSkills: string[] } {
  const allSkills: SkillMetadata[] = getRegisteredSkills();
  const validIds = new Set(allSkills.map((s: SkillMetadata) => s.id));
  const seen = new Set<string>();

  const validSkills: SelectedSkillItem[] = [];
  const unknownSkills: string[] = [];

  for (const item of rawSkills) {
    if (!validIds.has(item.skillId)) {
      unknownSkills.push(item.skillId);
      continue;
    }
    if (!seen.has(item.skillId)) {
      seen.add(item.skillId);
      validSkills.push(item);
    }
  }

  // Ensure essential foundational skills are always present
  const foundationalFloor: Array<{ id: "ui-ux" | "design-systems" | "responsive-design" | "accessibility"; reason: string }> = [
    { id: "ui-ux", reason: "Foundational visual hierarchy and conversion baseline" },
    { id: "design-systems", reason: "8pt spatial grid and semantic token cohesion" },
    { id: "responsive-design", reason: "Touch ergonomics and zero-overflow layout reflow" },
    { id: "accessibility", reason: "WCAG 2.2 AA contrast and inclusive screen-reader floor" },
  ];

  for (const f of foundationalFloor) {
    if (!seen.has(f.id)) {
      validSkills.unshift({ skillId: f.id, reason: f.reason, priority: "required" });
      seen.add(f.id);
    }
  }

  return { validSkills, unknownSkills };
}

/**
 * Builds a deterministic fallback output using the existing heuristic skillSelector.
 * Used ONLY when all AI providers in the Model Router fail.
 * Strictly non-GPT / non-LLM fallback!
 */
export function buildDeterministicSkillsFallback(input: SkillsAgentInput): SkillsAgentOutput {
  const heuristic = selectSkillsForRequest({
    category: input.category,
    businessName: input.businessName,
    description: input.description,
    targetAudience: input.targetAudience,
    requestedFeatures: input.requestedFeatures,
    style: input.stylePreferences?.[0],
    threeDPreference: input.threeDPreference,
    motionPreference: input.motionPreference,
  });

  const selectedSkills: SelectedSkillItem[] = heuristic.activeSkills.map((s) => ({
    skillId: s.id,
    reason: s.reason,
    priority: s.relevanceScore >= 0.8 ? "required" : "recommended",
  }));

  const { validSkills } = validateAndSanitizeSkills(selectedSkills);

  const previous = input.recentProjects || input.previousDesigns || [];
  const avoidPatterns = ["generic_centered_cards"];
  if (previous.length > 0) {
    previous.forEach((fp) => {
      if (fp.heroType) avoidPatterns.push(`hero:${fp.heroType}`, fp.heroType);
      if (fp.layoutType) avoidPatterns.push(`layout:${fp.layoutType}`, fp.layoutType);
      if (fp.colorDirection) avoidPatterns.push(fp.colorDirection);
      if (Array.isArray(fp.sectionOrder)) avoidPatterns.push("section_order");
    });
  }

  return {
    selectedSkills: validSkills,
    designDirection: {
      visualStyle: input.stylePreferences?.[0] || "modern_clean",
      layoutStrategy: "asymmetric_editorial",
      typographyDirection: "modular_scale_sans",
      colorDirection: input.primaryColor ? `${input.primaryColor}_accent` : "balanced_tonal",
      heroStrategy: "split_screen_interactive",
      sectionStrategy: "conversion_focused",
      componentStrategy: "tactile_surfaces",
      interactionStrategy: "subtle_reveal",
    },
    variationStrategy: {
      avoidPatterns,
      preferredPatterns: ["bento_grid", "tactile_borders"],
      noveltyLevel: "moderate",
    },
    missingSkills: [],
    warnings: ["Model Router providers failed; used deterministic heuristic fallback."],
    confidence: 0.75,
  };
}

/**
 * Executes the Skills Agent pre-generation intelligence engine.
 */
export async function runSkillsAgent(
  input: SkillsAgentInput,
  options?: {
    userId?: string | null;
    projectId?: string | null;
    sessionId?: string | null;
    policy?: Partial<RoutingPolicy>;
    timeoutMs?: number;
  }
): Promise<SkillsAgentResult> {
  const startTime = performance.now();
  const routingPolicy = options?.policy || MODEL_CONFIG.agentPolicies.skills();

  const agentRun = await runAgent<SkillsAgentInput, SkillsAgentOutput>({
    agentName: "skills",
    input,
    userId: options?.userId,
    projectId: options?.projectId,
    sessionId: options?.sessionId,
    policy: routingPolicy,
    execute: async (_context) => {
      const systemPrompt = buildSkillsAgentSystemPrompt();
      const userPrompt = buildSkillsAgentUserPrompt(input);

      const response = await routeModelRequest<SkillsAgentOutput>(
        {
          systemPrompt,
          userPrompt,
          responseSchema: { type: "object" },
          zodSchema: SkillsAgentOutputSchema,
          temperature: 0.3,
          maxTokens: 1500,
          timeoutMs: options?.timeoutMs ?? routingPolicy.timeoutMs ?? 5000,
        },
        routingPolicy
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "Model failed to produce valid Skills Agent output");
      }

      // Validate that skills exist in canonical registry
      const { validSkills, unknownSkills } = validateAndSanitizeSkills(response.data.selectedSkills);
      const warnings = [...(response.data.warnings || [])];

      if (unknownSkills.length > 0) {
        warnings.push(`Model selected unknown skills that were filtered: ${unknownSkills.join(", ")}`);
      }

      const sanitizedData: SkillsAgentOutput = {
        ...response.data,
        selectedSkills: validSkills,
        warnings,
      };

      return {
        data: sanitizedData,
        provider: response.provider,
        model: response.model,
        decisionOutput: sanitizedData as unknown as Record<string, unknown>,
        confidenceScore: sanitizedData.confidence,
      };
    },
  });

  const latencyMs = Math.round(performance.now() - startTime);

  if (agentRun.success && agentRun.data) {
    return {
      success: true,
      data: agentRun.data,
      source: "agent",
      provider: agentRun.provider,
      model: agentRun.model,
      latencyMs,
      warnings: agentRun.data.warnings || [],
    };
  }

  // Graceful deterministic fallback (never crashes website generation)
  const fallbackData = buildDeterministicSkillsFallback(input);
  return {
    success: true,
    data: fallbackData,
    source: "fallback",
    provider: "deterministic_heuristic",
    model: "none",
    latencyMs,
    warnings: fallbackData.warnings,
  };
}
