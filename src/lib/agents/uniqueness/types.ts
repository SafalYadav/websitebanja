// src/lib/agents/uniqueness/types.ts
import { z } from "zod";
import type { DesignFingerprint } from "@/lib/agents/skills/types";

export type UniquenessStatus = "PASS" | "REVIEW" | "REGENERATE";

export interface SimilarityWeights {
  structural: number;
  fingerprint: number;
  componentPattern: number;
  semantic: number;
}

export interface UniquenessThresholdConfig {
  passThreshold: number; // e.g., < 0.65 => PASS
  regenerateThreshold: number; // e.g., >= 0.82 => REGENERATE
  weights: SimilarityWeights;
}

export const DEFAULT_UNIQUENESS_CONFIG: UniquenessThresholdConfig = {
  passThreshold: 0.65,
  regenerateThreshold: 0.82,
  weights: {
    structural: 0.35,
    fingerprint: 0.30,
    componentPattern: 0.20,
    semantic: 0.15,
  },
};

export interface CandidateWebsite {
  id: string;
  businessName: string;
  category: string;
  fingerprint: DesignFingerprint;
  sectionOrder: string[];
  layoutType?: string;
  primaryColor?: string;
  secondaryColor?: string;
  cardStyle?: string;
  images?: string[];
}

export interface SimilarityBreakdown {
  structuralSimilarity: number;
  fingerprintSimilarity: number;
  componentPatternSimilarity: number;
  semanticSimilarity: number;
  imageSimilarity?: number;
  compositeScore: number;
}

export interface UniquenessCheckInput {
  newWebsite: Record<string, unknown>;
  businessName: string;
  category: string;
  description: string;
  explicitConstraints?: string[];
  threeDPreference?: "yes" | "no";
  candidates?: CandidateWebsite[];
  currentProjectId?: string;
  thresholdConfig?: Partial<UniquenessThresholdConfig>;
  regenerationAttempt?: number;
}

export interface UniquenessAgentOutput {
  status: UniquenessStatus;
  similarityScore: number;
  closestCandidateId?: string;
  closestCandidateName?: string;
  issues: string[];
  redesignDirectives: string[];
  similarityBreakdown: SimilarityBreakdown;
  confidence: number;
  summary: string;
}

export const SimilarityBreakdownSchema = z.object({
  structuralSimilarity: z.number().min(0).max(1).default(0),
  fingerprintSimilarity: z.number().min(0).max(1).default(0),
  componentPatternSimilarity: z.number().min(0).max(1).default(0),
  semanticSimilarity: z.number().min(0).max(1).default(0),
  imageSimilarity: z.number().min(0).max(1).optional(),
  compositeScore: z.number().min(0).max(1).default(0),
});

export const UniquenessAgentOutputSchema = z.object({
  status: z.enum(["PASS", "REVIEW", "REGENERATE"]).default("PASS"),
  similarityScore: z.number().min(0).max(1).default(0),
  closestCandidateId: z.string().optional(),
  closestCandidateName: z.string().optional(),
  issues: z.array(z.string()).default([]),
  redesignDirectives: z.array(z.string()).default([]),
  similarityBreakdown: SimilarityBreakdownSchema.default({
    structuralSimilarity: 0,
    fingerprintSimilarity: 0,
    componentPatternSimilarity: 0,
    semanticSimilarity: 0,
    compositeScore: 0,
  }),
  confidence: z.number().min(0).max(1).default(0.9),
  summary: z.string().default("Uniqueness check passed"),
});

export interface UniquenessCheckResult {
  success: boolean;
  data: UniquenessAgentOutput;
  source: "agent" | "fallback";
  provider?: string;
  model?: string;
  latencyMs: number;
  warnings: string[];
}
