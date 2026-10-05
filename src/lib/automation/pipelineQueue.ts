// src/lib/automation/pipelineQueue.ts
// Phase 13 — Durable Job Queue, Bounded Retries, Single-Lead Failure Isolation & Idempotency Store

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { GenerationHoldError } from "@/lib/intelligence/orchestration/generationHold";
import type {
  PipelineJob,
  PipelineRun,
  PipelineStage,
  PipelineStatus,
} from "./pipelineTypes";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import {
  savePipelineRunToPostgres,
  getPipelineRunFromPostgres,
  listPipelineRunsFromPostgres,
  ensurePipelineCrmTables,
  suspendPipelineRun,
} from "@/lib/db/pipelineCrmPersistence";
import { assertPipelineExecution, attachPipelineExecution, claimPipelineExecution,
  detachPipelineExecution, PipelineExecutionLostError, releasePipelineExecution, renewPipelineExecution } from "./pipelineExecutionLease";
import { commitPipelineStageResult, readPipelineStageResult } from "./pipelineExecutionLease";

const PIPELINE_DIR = path.resolve(process.cwd(), "scratch/pipeline");
const RUNS_FILE = path.join(PIPELINE_DIR, "runs.json");
const JOBS_FILE = path.join(PIPELINE_DIR, "jobs.json");

function ensurePipelineStorage(): void {
  if (!fs.existsSync(PIPELINE_DIR)) {
    fs.mkdirSync(PIPELINE_DIR, { recursive: true });
  }
  if (!fs.existsSync(RUNS_FILE)) {
    fs.writeFileSync(RUNS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(JOBS_FILE)) {
    fs.writeFileSync(JOBS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

function readJSON<T>(filePath: string, fallback: T): T {
  ensurePipelineStorage();
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[PipelineQueue] Failed to parse ${filePath}, returning fallback`, err);
    return fallback;
  }
}

function writeJSON<T>(filePath: string, data: T): void {
  ensurePipelineStorage();
  const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpPath, filePath);
}

export class PipelineQueue {
  static async readStageResult(run: PipelineRun, leadId: string, stage: PipelineStage) { return readPipelineStageResult(run, leadId, stage); }
  static async commitStageResult(run: PipelineRun, leadId: string, stage: PipelineStage, result: unknown): Promise<void> { await commitPipelineStageResult(run, leadId, stage, result); }
  static async assertExecution(run: PipelineRun): Promise<void> { await assertPipelineExecution(run); }

  static async suspendRun(run: PipelineRun): Promise<void> { await suspendPipelineRun(run); }

  static async withRunExecution(run: PipelineRun, statuses: PipelineStatus[], work: () => Promise<PipelineRun>, researchId?: string): Promise<PipelineRun> {
    const readiness = await ensurePipelineCrmTables();
    if (!readiness.success) throw new Error("Pipeline persistence schema unavailable");
    const fence = await claimPipelineExecution(run, statuses, researchId);
    let heartbeat: Promise<void> = Promise.resolve();
    let heartbeatFailure: unknown;
    const timer = setInterval(() => {
      heartbeat = heartbeat.then(async () => {
        if (heartbeatFailure) return;
        try { await renewPipelineExecution(fence); } catch (error) { heartbeatFailure = error; }
      });
    }, 30_000);
    try {
      const snapshot = await getPipelineRunFromPostgres(run.id, fence.tenantId);
      if (!snapshot) throw new PipelineExecutionLostError();
      Object.assign(run, snapshot);
      run.pausedAt = undefined;
      run.pauseReason = undefined;
      run.activeResearchContinuationId = researchId;
      run.completedAt = undefined;
      attachPipelineExecution(run, fence);
      await this.assertExecution(run);
      const result = await work();
      if (heartbeatFailure && result.status === "RUNNING") throw heartbeatFailure;
      return result;
    } catch (error) {
      // Only the still-authoritative worker can record failure. A revoked worker
      // must never overwrite the owner's pause/cancel or a successor's progress.
      try {
        await this.assertExecution(run);
        run.status = "FAILED";
        run.error = sanitizeErrorOutput(error);
        run.updatedAt = new Date().toISOString();
        await this.savePipelineRun(run);
      } catch (fenceError) {
        if (!(fenceError instanceof PipelineExecutionLostError)) throw fenceError;
      }
      throw error;
    } finally {
      clearInterval(timer);
      await heartbeat;
      detachPipelineExecution(run);
      await releasePipelineExecution(fence);
      if (run.status === "PAUSED" && run.pauseReason === "research" && run.tenantId) {
        const { recoverPipelineContinuations } = await import("@/lib/intelligence/orchestration/pipelineResearchContinuation");
        await recoverPipelineContinuations({ tenantId: run.tenantId, runId: run.id });
      }
    }
  }
  /**
   * Saves or updates a PipelineRun record (Azure PostgreSQL primary + durable dual-write)
   */
  static async savePipelineRun(run: PipelineRun): Promise<void> {
    // Validate the authoritative fence before updating an instance-local mirror.
    await savePipelineRunToPostgres(run);
    ensurePipelineStorage();
    const runs = readJSON<PipelineRun[]>(RUNS_FILE, []);
    const idx = runs.findIndex((r) => r.id === run.id);
    if (idx >= 0) {
      runs[idx] = run;
    } else {
      runs.unshift(run);
    }
    writeJSON(RUNS_FILE, runs);

  }

  /**
   * Retrieves a PipelineRun by ID (Azure PostgreSQL primary with local fallback)
   */
  static async getPipelineRun(runId: string, tenantId?: string): Promise<PipelineRun | null> {
    try {
      const pgRun = await getPipelineRunFromPostgres(runId, tenantId);
      if (tenantId || pgRun) return pgRun;
    } catch (error) { if (tenantId) throw error; }

    ensurePipelineStorage();
    const runs = readJSON<PipelineRun[]>(RUNS_FILE, []);
    return runs.find((r) => r.id === runId) || null;
  }

  /**
   * Lists all PipelineRuns (Azure PostgreSQL primary with local fallback)
   */
  static async listPipelineRuns(tenantId?: string): Promise<PipelineRun[]> {
    try {
      const pgRuns = await listPipelineRunsFromPostgres(tenantId);
      if (tenantId || (pgRuns && pgRuns.length > 0)) return pgRuns;
    } catch (error) { if (tenantId) throw error; }

    ensurePipelineStorage();
    const localRuns = readJSON<PipelineRun[]>(RUNS_FILE, []);
    // Lazy sync local runs into Azure PostgreSQL if available
    if (localRuns.length > 0) {
      for (const run of localRuns.slice(0, 5)) {
        savePipelineRunToPostgres(run).catch(() => {});
      }
    }
    return localRuns;
  }

  /**
   * Atomically updates a PipelineRun
   */
  static async updatePipelineRun(
    runId: string,
    updater: (run: PipelineRun) => void | PipelineRun
  ): Promise<PipelineRun | null> {
    ensurePipelineStorage();
    const runs = readJSON<PipelineRun[]>(RUNS_FILE, []);
    const idx = runs.findIndex((r) => r.id === runId);
    let current: PipelineRun | null = idx >= 0 ? runs[idx] : null;

    if (!current) {
      current = await this.getPipelineRun(runId);
    }
    if (!current) return null;

    const updated = updater(current);
    const finalRun = (updated !== undefined ? updated : current) as PipelineRun;
    finalRun.updatedAt = new Date().toISOString();

    if (idx >= 0) {
      runs[idx] = finalRun;
      writeJSON(RUNS_FILE, runs);
    }

    try {
      await savePipelineRunToPostgres(finalRun);
    } catch {}

    return finalRun;
  }

  /**
   * Saves or updates a PipelineJob record
   */
  static async savePipelineJob(job: PipelineJob): Promise<void> {
    ensurePipelineStorage();
    const jobs = readJSON<PipelineJob[]>(JOBS_FILE, []);
    const idx = jobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      jobs[idx] = job;
    } else {
      jobs.push(job);
    }
    writeJSON(JOBS_FILE, jobs);
  }

  /**
   * Retrieves a PipelineJob by ID
   */
  static async getPipelineJob(jobId: string): Promise<PipelineJob | null> {
    ensurePipelineStorage();
    const jobs = readJSON<PipelineJob[]>(JOBS_FILE, []);
    return jobs.find((j) => j.id === jobId) || null;
  }

  /**
   * Lists jobs optionally filtered by runId
   */
  static async listPipelineJobs(runId?: string): Promise<PipelineJob[]> {
    ensurePipelineStorage();
    const jobs = readJSON<PipelineJob[]>(JOBS_FILE, []);
    if (runId) {
      return jobs.filter((j) => j.runId === runId);
    }
    return jobs;
  }

  /**
   * Creates composite idempotency key
   */
  static makeIdempotencyKey(runId: string, leadId: string, stage: PipelineStage): string {
    return `${runId}:${leadId}:${stage}`;
  }

  /**
   * Executes an asynchronous task with bounded retries (maxAttempts = 3 default)
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      backoffMs?: number;
      onRetry?: (attempt: number, error: unknown) => void;
    } = {}
  ): Promise<T> {
    const maxAttempts = options.maxAttempts ?? 3;
    const baseBackoff = options.backoffMs ?? 50; // fast default for local tests

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (err instanceof GenerationHoldError || err instanceof PipelineExecutionLostError) throw err;
        lastError = err;
        if (attempt < maxAttempts) {
          if (options.onRetry) {
            options.onRetry(attempt, err);
          }
          const jitter = Math.random() * 20;
          const waitMs = Math.min(baseBackoff * Math.pow(2, attempt - 1) + jitter, 1000);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }
    throw lastError;
  }

  /**
   * Executes a stage for a single lead safely, providing failure isolation.
   * If this lead fails, it logs error, updates lead progress, but DOES NOT throw.
   */
  static async executeLeadStageSafe<T>(
    run: PipelineRun,
    leadId: string,
    stage: PipelineStage,
    stageFn: () => Promise<T>,
    options: { maxAttempts?: number } = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    await this.assertExecution(run);
    const lead = run.leads[leadId];
    if (!lead) {
      return { success: false, error: `Lead ${leadId} not found in pipeline run` };
    }

    // Check idempotency first
    const idem = await this.readStageResult(run, leadId, stage);
    if (idem.executed) {
      await this.assertExecution(run);
      return { success: true, data: idem.result as T };
    }

    const maxAttempts = options.maxAttempts ?? 3;
    lead.currentStage = stage;
    lead.status = "running";
    lead.timeline.push({
      stage,
      status: "started",
      timestamp: new Date().toISOString(),
    });

    // Create job record
    const jobId = `job_${crypto.randomBytes(6).toString("hex")}`;
    const job: PipelineJob = {
      id: jobId,
      runId: run.id,
      leadId,
      stage,
      status: "running",
      attempt: 1,
      maxAttempts,
      idempotencyKey: this.makeIdempotencyKey(run.id, leadId, stage),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.savePipelineJob(job);

    try {
      const result = await this.executeWithRetry(async () => {
        await this.assertExecution(run);
        const data = await stageFn();
        await this.assertExecution(run);
        return data;
      }, {
        maxAttempts,
        onRetry: (attempt, err) => {
          job.attempt = attempt + 1;
          job.updatedAt = new Date().toISOString();
          lead.retryCount += 1;
          lead.timeline.push({
            stage,
            status: "retried",
            timestamp: new Date().toISOString(),
            details: `Retry attempt ${attempt + 1}: ${(err as Error)?.message || String(err)}`,
          });
          emitAgentEvent({
            event: "pipeline_retry",
            agent: "boss",
            requestId: run.id,
            reason: `Retry stage ${stage} for lead ${leadId} (attempt ${attempt + 1})`,
          });
        },
      });

      // Success
      await this.commitStageResult(run, leadId, stage, result);
      job.status = "completed";
      job.updatedAt = new Date().toISOString();
      await this.savePipelineJob(job);

      lead.status = "completed";
      lead.timeline.push({
        stage,
        status: "completed",
        timestamp: new Date().toISOString(),
      });

      return { success: true, data: result };
    } catch (err) {
      if (err instanceof PipelineExecutionLostError) throw err;
      await this.assertExecution(run);
      if (err instanceof GenerationHoldError) {
        job.status = "paused";
        job.updatedAt = new Date().toISOString();
        await this.savePipelineJob(job);
        lead.status = "paused";
        lead.researchId = err.hold.researchId;
        lead.generationCorrelationId = err.hold.correlationId;
        lead.timeline.push({ stage, status: "paused", timestamp: job.updatedAt, details: err.message });
        run.status = "PAUSED";
        run.completedAt = undefined;
        run.pausedAt = job.updatedAt;
        run.pauseReason = "research";
        run.updatedAt = job.updatedAt;
        await this.savePipelineRun(run);
        return { success: false, error: err.message };
      }
      const errMsg = (err as Error)?.message || String(err);
      job.status = "failed";
      job.error = errMsg;
      job.updatedAt = new Date().toISOString();
      await this.savePipelineJob(job);

      lead.status = "failed";
      lead.lastError = errMsg;
      lead.errorHistory.push({
        stage,
        error: errMsg,
        timestamp: new Date().toISOString(),
      });
      lead.timeline.push({
        stage,
        status: "failed",
        timestamp: new Date().toISOString(),
        details: errMsg,
      });

      run.errors.push({
        leadId,
        stage,
        error: errMsg,
        timestamp: new Date().toISOString(),
      });

      run.stats.failed += 1;

      emitAgentEvent({
        event: "pipeline_stage_failed",
        agent: "boss",
        requestId: run.id,
        error: errMsg,
        reason: `Stage ${stage} failed for lead ${leadId} after ${maxAttempts} attempts`,
      });

      return { success: false, error: errMsg };
    }
  }

  /**
   * Resets / clears pipeline scratch files (for test resets)
   */
  static async clearPipelineData(): Promise<void> {
    ensurePipelineStorage();
    writeJSON(RUNS_FILE, []);
    writeJSON(JOBS_FILE, []);
  }
}
