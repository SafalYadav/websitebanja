// src/lib/intelligence/learning/lessonEngine.ts
import { MemoryStore } from "../memory/memoryStore";
import type {
  AgentLessonRecord,
  EvidenceItem,
  EvidenceType,
  LessonStatus,
} from "../memory/memoryTypes";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export class LessonEngine {
  private static instance: LessonEngine;
  private store: MemoryStore;

  private constructor() {
    this.store = MemoryStore.getInstance();
  }

  public static getInstance(): LessonEngine {
    if (!LessonEngine.instance) {
      LessonEngine.instance = new LessonEngine();
    }
    return LessonEngine.instance;
  }

  /**
   * Creates a new candidate lesson from an observed execution pattern.
   * STRICT PRINCIPLE: Always starts as CANDIDATE. Raw model output != truth.
   */
  public async createCandidateLesson(params: {
    title?: string;
    statement?: string;
    insight?: string;
    rule?: string;
    domain: string;
    sourceRunId?: string;
    initialConfidence?: number;
    initialEvidence?: {
      type?: EvidenceType;
      source?: string;
      referenceId?: string;
      description: string;
      verified?: boolean;
    };
  }): Promise<AgentLessonRecord> {
    const lessonId = `lsn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const sourceRunId = params.sourceRunId || params.initialEvidence?.referenceId || `run_src_${Date.now()}`;
    const initialEvidenceItems: EvidenceItem[] = [];

    if (params.initialEvidence) {
      initialEvidenceItems.push({
        id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: (params.initialEvidence.type || params.initialEvidence.source || "execution_outcome") as EvidenceType,
        description: sanitizeErrorOutput(params.initialEvidence.description),
        runId: sourceRunId,
        source: params.initialEvidence.source || "execution_outcome",
        timestamp: now,
        confidence: params.initialConfidence ?? 0.5,
      });
    }

    const title = params.title || params.insight || "Observed Strategy Lesson";
    const statement = params.statement || params.rule || "";
    const confidence = params.initialConfidence ?? 0.5;

    const lesson: AgentLessonRecord = {
      id: lessonId,
      lessonId,
      title: sanitizeErrorOutput(title),
      statement: sanitizeErrorOutput(statement),
      domain: (params.domain || "general").toLowerCase(),
      status: "CANDIDATE",
      confidence,
      sourceRunIds: [sourceRunId],
      evidence: initialEvidenceItems,
      supportingOutcomes: params.initialEvidence ? 1 : 0,
      contradictingOutcomes: 0,
      validationCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Attach convenience alias properties
    (lesson as any).confidenceScore = confidence;
    (lesson as any).rule = lesson.statement;
    (lesson as any).insight = lesson.title;

    await this.store.saveLesson(lesson);
    return lesson;
  }

  /**
   * Adds evidence to an existing lesson and recalculates confidence and status.
   * Supports contradictory evidence without overwriting history.
   */
  public async recordEvidence(
    lessonId: string,
    evidence: {
      type?: EvidenceType;
      source?: string;
      referenceId?: string;
      description: string;
      runId?: string;
      isContradictory?: boolean;
      verified?: boolean;
      weight?: number;
    }
  ): Promise<AgentLessonRecord | undefined> {
    const lesson = await this.store.getLesson(lessonId);
    if (!lesson) return undefined;

    const runId = evidence.runId || evidence.referenceId || `run_${Date.now()}`;
    const evidenceType = (evidence.type || evidence.source || "validator_confirmation") as EvidenceType;
    const weight = evidence.weight ?? (evidence.isContradictory ? 0.2 : 0.15);

    const evidenceItem: EvidenceItem = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: evidenceType,
      description: sanitizeErrorOutput(evidence.description),
      runId,
      source: evidence.source || evidenceType,
      timestamp: new Date().toISOString(),
      confidence: evidence.isContradictory ? 0.7 : 0.85,
      contradictory: evidence.isContradictory ?? false,
    };

    lesson.evidence.push(evidenceItem);
    if (runId && !lesson.sourceRunIds.includes(runId)) {
      lesson.sourceRunIds.push(runId);
    }

    if (evidence.isContradictory) {
      // Contradictory evidence decreases confidence
      lesson.contradictingOutcomes += 1;
      lesson.confidence = Math.max(0.1, Number((lesson.confidence - weight).toFixed(2)));

      // If contradicting outcomes match or exceed supporting outcomes, reject lesson
      if (lesson.contradictingOutcomes >= lesson.supportingOutcomes) {
        lesson.status = "REJECTED";
      }
    } else {
      // Supporting evidence increases confidence
      lesson.supportingOutcomes += 1;
      lesson.confidence = Math.min(0.99, Number((lesson.confidence + weight).toFixed(2)));

      if (lesson.status === "CANDIDATE" && lesson.supportingOutcomes >= 2) {
        lesson.status = "VALIDATING";
      } else if (lesson.status === "VALIDATING" && lesson.supportingOutcomes >= 3) {
        lesson.status = "VERIFIED";
      }
    }

    lesson.updatedAt = new Date().toISOString();
    (lesson as any).confidenceScore = lesson.confidence;
    (lesson as any).rule = lesson.statement;
    (lesson as any).insight = lesson.title;

    await this.store.saveLesson(lesson);
    return lesson;
  }

  public async recordContradictoryEvidence(
    lessonId: string,
    evidence: {
      type?: EvidenceType;
      source?: string;
      referenceId?: string;
      description: string;
      runId?: string;
      verified?: boolean;
      weight?: number;
    }
  ): Promise<AgentLessonRecord | undefined> {
    return this.recordEvidence(lessonId, {
      ...evidence,
      isContradictory: true,
    });
  }

  /**
   * Manually sets lesson status (for human reviewers or automated promotions).
   */
  public async updateStatus(lessonId: string, status: LessonStatus): Promise<AgentLessonRecord | undefined> {
    const lesson = await this.store.getLesson(lessonId);
    if (!lesson) return undefined;

    lesson.status = status;
    if (status === "PROMOTED") {
      lesson.promotedAt = new Date().toISOString();
    }
    lesson.updatedAt = new Date().toISOString();
    await this.store.saveLesson(lesson);
    return lesson;
  }
}
