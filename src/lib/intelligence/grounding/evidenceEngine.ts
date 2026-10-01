// src/lib/intelligence/grounding/evidenceEngine.ts
// Grounded Business Intelligence — Evidence & Confidence Engine
// Creates traceable evidence, separates observed facts from derived inferences,
// computes confidence scores, and detects source conflicts.

import crypto from "crypto";
import type {
  EvidenceItem,
  EvidenceSourceType,
  ConfidenceLevel,
  VerificationStatus,
  FactVsInferenceItem,
  SourceConflict,
} from "./types";

export const SOURCE_WEIGHTS: Record<EvidenceSourceType, number> = {
  business_website: 0.95,
  google_places: 0.95,
  website_audit: 0.90,
  google_maps: 0.85,
  google_search: 0.70,
  user_input: 0.50,
};

export function scoreToConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.85) return "HIGH";
  if (score >= 0.60) return "MEDIUM";
  if (score >= 0.30) return "LOW";
  return "UNKNOWN";
}

export function createEvidenceItem(params: {
  source: EvidenceSourceType;
  reference: string;
  observation: string;
  supports: string;
  baseConfidence?: number;
  verificationStatus?: VerificationStatus;
}): EvidenceItem {
  const sourceWeight = SOURCE_WEIGHTS[params.source] ?? 0.5;
  const rawScore = params.baseConfidence !== undefined
    ? Math.min(Math.max(params.baseConfidence * sourceWeight, 0), 1)
    : sourceWeight;

  const score = Math.round(rawScore * 100) / 100;
  const id = `ev_${params.source.slice(0, 4)}_${crypto.randomBytes(4).toString("hex")}`;

  return {
    id,
    source: params.source,
    reference: params.reference,
    observation: params.observation.trim(),
    supports: params.supports.trim(),
    confidence: score,
    confidenceLevel: scoreToConfidenceLevel(score),
    verificationStatus: params.verificationStatus || "verified",
    timestamp: new Date().toISOString(),
  };
}

export function createObservedFact(params: {
  statement: string;
  evidenceIds: string[];
  confidence?: number;
}): FactVsInferenceItem {
  const confidence = params.confidence ?? 0.95;
  return {
    id: `fact_${crypto.randomBytes(4).toString("hex")}`,
    type: "OBSERVED_FACT",
    statement: params.statement.trim(),
    confidence,
    confidenceLevel: scoreToConfidenceLevel(confidence),
    evidenceIds: params.evidenceIds,
  };
}

export function createDerivedInference(params: {
  statement: string;
  evidenceIds: string[];
  confidence?: number;
  rationale: string;
}): FactVsInferenceItem {
  const confidence = params.confidence ?? 0.65;
  return {
    id: `inf_${crypto.randomBytes(4).toString("hex")}`,
    type: "DERIVED_INFERENCE",
    statement: params.statement.trim(),
    confidence,
    confidenceLevel: scoreToConfidenceLevel(confidence),
    evidenceIds: params.evidenceIds,
    rationale: params.rationale.trim(),
  };
}

/**
 * Detects conflicts between two sources for the same logical attribute.
 * If values differ non-trivially, produces a structured SourceConflict.
 */
export function detectSourceConflict(params: {
  field: string;
  sourceA: { source: EvidenceSourceType; reference: string; value: string };
  sourceB: { source: EvidenceSourceType; reference: string; value: string };
  preferredSource?: EvidenceSourceType;
}): SourceConflict | null {
  const valA = params.sourceA.value.trim().toLowerCase();
  const valB = params.sourceB.value.trim().toLowerCase();

  if (!valA || !valB || valA === valB) {
    return null;
  }

  const isSignificant =
    !valA.includes(valB) &&
    !valB.includes(valA) &&
    valA.replace(/[^a-z0-9]/g, "") !== valB.replace(/[^a-z0-9]/g, "");

  if (!isSignificant) {
    return null;
  }

  const hasPreferred = Boolean(params.preferredSource);
  const preferred = params.preferredSource === params.sourceA.source
    ? params.sourceA.value
    : params.preferredSource === params.sourceB.source
    ? params.sourceB.value
    : undefined;

  return {
    id: `conflict_${params.field}_${crypto.randomBytes(3).toString("hex")}`,
    field: params.field,
    sourceA: params.sourceA,
    sourceB: params.sourceB,
    resolutionStatus: hasPreferred ? "PREFERRED_AUTHORITATIVE" : "UNRESOLVED_CONFLICT",
    chosenValue: preferred,
    explanation: hasPreferred
      ? `Source '${params.preferredSource}' was preferred for '${params.field}' based on authoritative precedence, but variance was recorded.`
      : `Conflicting data observed for '${params.field}' between ${params.sourceA.source} ("${params.sourceA.value}") and ${params.sourceB.source} ("${params.sourceB.value}"). Uncertainty remains.`,
  };
}
