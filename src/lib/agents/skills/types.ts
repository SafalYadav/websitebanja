// src/lib/agents/skills/types.ts
import { z } from "zod";
import type { SkillId } from "@/lib/skills/types";

export interface DesignFingerprint {
  heroType: string;
  navigationType: string;
  layoutType: string;
  sectionOrder: string[];
  visualArchetype: string;
  typographyStyle: string;
  colorDirection: string;
  cardStyle: string;
  animationStyle: string;
}

export interface SkillsAgentInput {
  businessName: string;
  category: string;
  description: string;
  targetAudience?: string;
  goals?: string[];
  requestedFeatures?: string[];
  stylePreferences?: string[];
  primaryColor?: string;
  secondaryColor?: string;
  explicitConstraints?: string[];
  threeDPreference?: "yes" | "no";
  motionPreference?: "none" | "subtle" | "high";
  previousDesigns?: DesignFingerprint[];
  recentProjects?: DesignFingerprint[];
}

export interface SelectedSkillItem {
  skillId: SkillId;
  reason: string;
  priority: "required" | "recommended" | "optional";
}

export interface DesignDirection {
  visualStyle: string;
  layoutStrategy: string;
  typographyDirection: string;
  colorDirection: string;
  heroStrategy: string;
  sectionStrategy: string;
  componentStrategy: string;
  interactionStrategy: string;
}

export interface VariationStrategy {
  avoidPatterns: string[];
  preferredPatterns: string[];
  noveltyLevel: "conservative" | "moderate" | "high";
}

export interface MissingSkillItem {
  capability: string;
  suggestedCategory: string;
  rationale: string;
}

export interface SkillsAgentOutput {
  selectedSkills: SelectedSkillItem[];
  designDirection: DesignDirection;
  variationStrategy: VariationStrategy;
  missingSkills: MissingSkillItem[];
  warnings: string[];
  confidence: number;
}

export const SelectedSkillItemSchema = z.object({
  skillId: z.string().min(1) as z.ZodType<SkillId>,
  reason: z.string().min(1),
  priority: z.enum(["required", "recommended", "optional"]).default("recommended"),
});

export const DesignDirectionSchema = z.object({
  visualStyle: z.string().default("modern"),
  layoutStrategy: z.string().default("asymmetric_editorial"),
  typographyDirection: z.string().default("clean_modern"),
  colorDirection: z.string().default("balanced"),
  heroStrategy: z.string().default("split_screen"),
  sectionStrategy: z.string().default("conversion_focused"),
  componentStrategy: z.string().default("tactile_surfaces"),
  interactionStrategy: z.string().default("subtle_reveal"),
});

export const VariationStrategySchema = z.object({
  avoidPatterns: z.array(z.string()).default([]),
  preferredPatterns: z.array(z.string()).default([]),
  noveltyLevel: z.enum(["conservative", "moderate", "high"]).default("moderate"),
});

export const MissingSkillItemSchema = z.object({
  capability: z.string(),
  suggestedCategory: z.string(),
  rationale: z.string(),
});

export const SkillsAgentOutputSchema = z.object({
  selectedSkills: z.array(SelectedSkillItemSchema).min(1, "At least one skill must be selected"),
  designDirection: DesignDirectionSchema,
  variationStrategy: VariationStrategySchema,
  missingSkills: z.array(MissingSkillItemSchema).default([]),
  warnings: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.9),
});

export interface SkillsAgentResult {
  success: boolean;
  data: SkillsAgentOutput;
  source: "agent" | "fallback";
  provider?: string;
  model?: string;
  latencyMs: number;
  warnings: string[];
}
