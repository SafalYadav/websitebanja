// src/lib/intelligence/production/productionJobStore.ts
// Phase 28 — Autonomous Production: Job Store & State Machine Manager
//
// Thread-safe, tenant-isolated state store with:
// - Deterministic state transition validation
// - Idempotency key registry & deduplication
// - External side-effect recording & duplicate prevention
// - Crash recovery & resumable job tracking
// - Secret redaction

import { randomUUID } from "crypto";
import { redactSecretsInObject } from "../memory/memoryStore";
import {
  type AutonomousProductionJob,
  type ProductionJobState,
  type ProductionBudget,
  type CreateProductionJobParams,
  type ProductionSideEffectRecord,
  VALID_PRODUCTION_TRANSITIONS,
  DEFAULT_PRODUCTION_BUDGET,
} from "./productionTypes";

export class ProductionJobStore {
  private static instance: ProductionJobStore;
  private jobs: Map<string, AutonomousProductionJob> = new Map();
  private idempotencyIndex: Map<string, string> = new Map(); // idempotencyKey -> jobId

  private constructor() {}

  public static getInstance(): ProductionJobStore {
    if (!ProductionJobStore.instance) {
      ProductionJobStore.instance = new ProductionJobStore();
    }
    return ProductionJobStore.instance;
  }

  /**
   * Resets all in-memory store contents. Strictly for testing.
   */
  public clearForTest(): void {
    this.jobs.clear();
    this.idempotencyIndex.clear();
  }

  /**
   * Generates a deterministic idempotency key if not provided.
   */
  public computeIdempotencyKey(params: {
    tenantId?: string | null;
    businessName: string;
    location: string;
    niche: string;
  }): string {
    const tenant = params.tenantId || "global";
    const normName = params.businessName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const normLoc = params.location.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const normNiche = params.niche.toLowerCase().replace(/[^a-z0-9]/g, "_");
    return `idem_${tenant}_${normName}_${normLoc}_${normNiche}`;
  }

  /**
   * Creates a new production job or returns an existing one if idempotencyKey matches.
   */
  public createJob(params: CreateProductionJobParams): AutonomousProductionJob {
    const tenantId = params.tenantId ?? null;
    const idempotencyKey =
      params.idempotencyKey ||
      this.computeIdempotencyKey({
        tenantId,
        businessName: params.businessName,
        location: params.location,
        niche: params.niche,
      });

    // Idempotency check: return existing job if key already registered
    const existingJobId = this.idempotencyIndex.get(idempotencyKey);
    if (existingJobId) {
      const existingJob = this.jobs.get(existingJobId);
      if (existingJob) {
        // Enforce tenant isolation on lookup
        if (tenantId && existingJob.tenantId && existingJob.tenantId !== tenantId) {
          throw new Error(`Tenant mismatch on existing idempotency key '${idempotencyKey}'`);
        }
        return JSON.parse(JSON.stringify(existingJob));
      }
    }

    const jobId = `pjob_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const businessId = `biz_${params.businessName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const now = new Date().toISOString();

    const budget: ProductionBudget = {
      ...DEFAULT_PRODUCTION_BUDGET,
      ...(params.budget || {}),
      modelCallsUsed: 0,
      retryCount: 0,
      executionTimeMs: 0,
    };

    const newJob: AutonomousProductionJob = {
      jobId,
      tenantId,
      idempotencyKey,
      businessId,
      businessName: params.businessName,
      location: params.location,
      niche: params.niche,
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone,
      state: "CREATED",
      objective:
        params.objective ||
        `Autonomous end-to-end production for ${params.businessName} in ${params.location}`,
      budget,
      leadId: params.customLeadId,
      learningCandidateIds: [],
      failureHistory: [],
      timeline: [
        {
          state: "CREATED",
          timestamp: now,
          details: "Autonomous production job initialized",
          actor: "AutonomousProductionOrchestrator",
        },
      ],
      sideEffectsExecuted: {},
      createdAt: now,
      updatedAt: now,
    };

    if (params.initialWebsiteData) {
      newJob.websiteData = params.initialWebsiteData as any;
    }

    const sanitizedJob = redactSecretsInObject(newJob) as AutonomousProductionJob;
    this.jobs.set(jobId, sanitizedJob);
    this.idempotencyIndex.set(idempotencyKey, jobId);

    return JSON.parse(JSON.stringify(sanitizedJob));
  }

  /**
   * Retrieves a production job by ID with strict tenant boundary enforcement.
   */
  public getJob(jobId: string, tenantId?: string | null): AutonomousProductionJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    if (tenantId && job.tenantId && job.tenantId !== tenantId) {
      return null; // Tenant isolation: hide jobs belonging to another tenant
    }

    return JSON.parse(JSON.stringify(job));
  }

  /**
   * Lists jobs matching criteria with tenant isolation.
   */
  public listJobs(
    tenantId?: string | null,
    filter?: {
      state?: ProductionJobState;
      states?: ProductionJobState[];
      limit?: number;
    }
  ): AutonomousProductionJob[] {
    let result = Array.from(this.jobs.values());

    if (tenantId) {
      result = result.filter((j) => j.tenantId === tenantId);
    }

    if (filter?.state) {
      result = result.filter((j) => j.state === filter.state);
    }

    if (filter?.states && filter.states.length > 0) {
      const allowed = new Set(filter.states);
      result = result.filter((j) => allowed.has(j.state));
    }

    // Sort by latest updated first
    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (filter?.limit && filter.limit > 0) {
      result = result.slice(0, filter.limit);
    }

    return JSON.parse(JSON.stringify(result));
  }

  /**
   * Transitions a job to a new state with deterministic state graph validation.
   */
  public transitionState(
    jobId: string,
    newState: ProductionJobState,
    details?: string,
    tenantId?: string | null,
    actor: string = "AutonomousProductionOrchestrator"
  ): AutonomousProductionJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Production job '${jobId}' not found`);
    }

    if (tenantId && job.tenantId && job.tenantId !== tenantId) {
      throw new Error(`Unauthorized: tenant '${tenantId}' cannot transition job '${jobId}'`);
    }

    // If state is already newState and details match, return idempotently
    if (job.state === newState) {
      return JSON.parse(JSON.stringify(job));
    }

    const allowedNext = VALID_PRODUCTION_TRANSITIONS[job.state];
    if (!allowedNext || !allowedNext.includes(newState)) {
      throw new Error(
        `Invalid state transition: '${job.state}' -> '${newState}' is not permitted by state machine`
      );
    }

    const now = new Date().toISOString();
    const prevTimestamp = new Date(job.updatedAt).getTime();
    const currentTimestamp = new Date(now).getTime();
    const durationMs = Math.max(0, currentTimestamp - prevTimestamp);

    job.state = newState;
    job.updatedAt = now;
    job.timeline.push({
      state: newState,
      timestamp: now,
      details,
      actor,
      durationMs,
    });

    if (newState === "WON" || newState === "LOST" || newState === "FAILED") {
      job.completedAt = now;
    }

    const sanitizedJob = redactSecretsInObject(job) as AutonomousProductionJob;
    this.jobs.set(jobId, sanitizedJob);

    return JSON.parse(JSON.stringify(sanitizedJob));
  }

  /**
   * Updates job attributes (domain artefacts, metrics, etc.) safely.
   */
  public updateJob(
    jobId: string,
    updates: Partial<AutonomousProductionJob>,
    tenantId?: string | null
  ): AutonomousProductionJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Production job '${jobId}' not found`);
    }

    if (tenantId && job.tenantId && job.tenantId !== tenantId) {
      throw new Error(`Unauthorized: tenant '${tenantId}' cannot update job '${jobId}'`);
    }

    // State changes must go through transitionState, not arbitrary updates
    if (updates.state && updates.state !== job.state) {
      throw new Error(
        `Direct state mutation forbidden. Use transitionState to change state to '${updates.state}'`
      );
    }

    Object.assign(job, updates);
    job.updatedAt = new Date().toISOString();

    const sanitized = redactSecretsInObject(job) as AutonomousProductionJob;
    this.jobs.set(jobId, sanitized);

    return JSON.parse(JSON.stringify(sanitized));
  }

  /**
   * Checks whether an external side-effect has already run for this job.
   */
  public hasSideEffect(jobId: string, effectKey: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    return !!job.sideEffectsExecuted[effectKey];
  }

  /**
   * Registers a successfully executed side-effect.
   */
  public recordSideEffect(
    jobId: string,
    effectKey: string,
    resultSummary: string
  ): ProductionSideEffectRecord {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Production job '${jobId}' not found`);
    }

    const record: ProductionSideEffectRecord = {
      effectKey,
      executedAt: new Date().toISOString(),
      resultSummary: redactSecretsInObject({ resultSummary }).resultSummary,
    };

    job.sideEffectsExecuted[effectKey] = record;
    job.updatedAt = new Date().toISOString();

    this.jobs.set(jobId, job);
    return record;
  }

  /**
   * Returns all non-terminal jobs that were interrupted and can be safely resumed.
   */
  public getResumableJobs(tenantId?: string | null): AutonomousProductionJob[] {
    const terminalStates = new Set<ProductionJobState>(["WON", "LOST", "FAILED"]);
    let jobs = Array.from(this.jobs.values()).filter((j) => !terminalStates.has(j.state));

    if (tenantId) {
      jobs = jobs.filter((j) => j.tenantId === tenantId);
    }

    return JSON.parse(JSON.stringify(jobs));
  }
}

export const productionJobStore = ProductionJobStore.getInstance();
