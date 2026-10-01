// src/lib/intelligence/learningLoop/candidateIngestionEngine.ts
// Phase 27 — Learning Loop: Candidate Ingestion Engine
//
// Invariant: RAW MODEL OUTPUT MUST NEVER AUTOMATICALLY BECOME TRUTH.
// All ingested inputs start strictly as CANDIDATE lessons.

import { randomUUID } from "crypto";
import type {
  CandidateLesson,
  CandidateSourceType,
  HumanFeedbackItem,
} from "./types";
import { sanitizeLearningInput } from "./promptInjectionGuard";
import type { EvidenceItem, EvidenceType } from "../memory/memoryTypes";

export class CandidateIngestionEngine {
  private static instance: CandidateIngestionEngine;

  private constructor() {}

  public static getInstance(): CandidateIngestionEngine {
    if (!CandidateIngestionEngine.instance) {
      CandidateIngestionEngine.instance = new CandidateIngestionEngine();
    }
    return CandidateIngestionEngine.instance;
  }

  /**
   * Ingests a candidate lesson from any valid source.
   * Strips prompt injection attempts and initializes status to CANDIDATE.
   */
  public createCandidate(params: {
    title: string;
    statement: string;
    domain: string;
    sourceType: CandidateSourceType;
    sourceRunId?: string;
    tenantId?: string | null;
    isGlobalScope?: boolean;
    initialConfidence?: number;
    initialEvidenceDescription?: string;
    initialEvidenceType?: EvidenceType;
    initialEvidenceSource?: string;
    metadata?: Record<string, unknown>;
  }): CandidateLesson {
    const id = `cand_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const lessonId = `lsn_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // Sanitize title and statement against prompt injection
    const sanitizedTitle = sanitizeLearningInput(params.title).safeText;
    const sanitizedStatement = sanitizeLearningInput(params.statement).safeText;

    const sourceRunId = params.sourceRunId || `run_${Date.now()}`;
    const evidenceItems: EvidenceItem[] = [];

    if (params.initialEvidenceDescription) {
      const sanitizedEvDesc = sanitizeLearningInput(params.initialEvidenceDescription).safeText;
      evidenceItems.push({
        id: `ev_${Date.now()}_${randomUUID().slice(0, 6)}`,
        type: params.initialEvidenceType || "execution_outcome",
        description: sanitizedEvDesc,
        runId: sourceRunId,
        source: params.initialEvidenceSource || params.sourceType,
        timestamp: now,
        confidence: Math.min(1.0, Math.max(0.1, params.initialConfidence ?? 0.6)),
        contradictory: false,
      });
    }

    const candidate: CandidateLesson = {
      id,
      lessonId,
      title: sanitizedTitle,
      statement: sanitizedStatement,
      domain: (params.domain || "general").toLowerCase().trim(),
      tenantId: params.tenantId || null,
      isGlobalScope: params.isGlobalScope ?? (params.tenantId == null),
      status: "CANDIDATE", // INVARIANT: Always starts as CANDIDATE
      confidence: Math.min(1.0, Math.max(0.1, params.initialConfidence ?? 0.6)),
      sourceType: params.sourceType,
      sourceRunIds: [sourceRunId],
      evidence: evidenceItems,
      supportingOutcomes: evidenceItems.length > 0 ? 1 : 0,
      contradictingOutcomes: 0,
      validationCount: 0,
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now,
    };

    return candidate;
  }

  /**
   * Ingests a lesson from a validation failure (anti-pattern/avoid directive).
   */
  public ingestValidationFailure(params: {
    stage: string;
    issue: string;
    remediationRule: string;
    domain: string;
    runId: string;
    tenantId?: string | null;
  }): CandidateLesson {
    const title = `Avoid ${params.stage} Failure: ${params.issue}`;
    const statement = `Ensure ${params.remediationRule} to prevent ${params.stage} validation failures`;

    return this.createCandidate({
      title,
      statement,
      domain: params.domain,
      sourceType: "validation_failure",
      sourceRunId: params.runId,
      tenantId: params.tenantId,
      initialConfidence: 0.65,
      initialEvidenceDescription: `Validation stage '${params.stage}' reported: ${params.issue}`,
      initialEvidenceType: "validator_confirmation",
      initialEvidenceSource: `validation_gate_${params.stage}`,
      metadata: {
        stage: params.stage,
        issue: params.issue,
        isAntiPattern: true,
      },
    });
  }

  /**
   * Ingests a lesson from a successful repair execution.
   */
  public ingestRepairSuccess(params: {
    stage: string;
    fixApplied: string;
    domain: string;
    runId: string;
    tenantId?: string | null;
  }): CandidateLesson {
    const title = `Effective Repair for ${params.stage}`;
    const statement = `When ${params.stage} fails, applying '${params.fixApplied}' restores compliance`;

    return this.createCandidate({
      title,
      statement,
      domain: params.domain,
      sourceType: "repair_success",
      sourceRunId: params.runId,
      tenantId: params.tenantId,
      initialConfidence: 0.75,
      initialEvidenceDescription: `Self-correction repair confirmed fix: ${params.fixApplied}`,
      initialEvidenceType: "validator_confirmation",
      initialEvidenceSource: "repair_coordinator",
      metadata: {
        stage: params.stage,
        fixApplied: params.fixApplied,
      },
    });
  }

  /**
   * Ingests a lesson from human feedback (correction or rating).
   */
  public ingestHumanFeedback(feedback: HumanFeedbackItem, domain: string): CandidateLesson {
    const sanitizedFeedback = sanitizeLearningInput(feedback.feedbackText).safeText;
    const sanitizedDirective = feedback.suggestedDirective
      ? sanitizeLearningInput(feedback.suggestedDirective).safeText
      : undefined;

    const title = `Human Feedback: ${feedback.type.toUpperCase()}`;
    const statement = sanitizedDirective || sanitizedFeedback;

    return this.createCandidate({
      title,
      statement,
      domain,
      sourceType: "human_feedback",
      sourceRunId: feedback.runId,
      tenantId: feedback.tenantId,
      initialConfidence: feedback.type === "approval" ? 0.85 : 0.7,
      initialEvidenceDescription: `Human reviewer noted: ${sanitizedFeedback}`,
      initialEvidenceType: "human_feedback",
      initialEvidenceSource: feedback.source,
      metadata: {
        feedbackId: feedback.feedbackId,
        feedbackType: feedback.type,
        rating: feedback.rating,
      },
    });
  }
}
