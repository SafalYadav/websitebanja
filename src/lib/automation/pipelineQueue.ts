// src/lib/automation/pipelineQueue.ts
// Phase 13 — Durable Job Queue, Bounded Retries, Single-Lead Failure Isolation & Idempotency Store

import fs from "fs";
import path from "path";
import crypto from "crypto";
import type {
  PipelineJob,
  PipelineRun,
  PipelineStage,
  LeadPipelineProgress,
} from "./pipelineTypes";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import {
  savePipelineRunToPostgres,
  getPipelineRunFromPostgres,
  listPipelineRunsFromPostgres,
} from "@/lib/db/pipelineCrmPersistence";

const PIPELINE_DIR = path.resolve(process.cwd(), "scratch/pipeline");
const RUNS_FILE = path.join(PIPELINE_DIR, "runs.json");
const JOBS_FILE = path.join(PIPELINE_DIR, "jobs.json");
const IDEMPOTENCY_FILE = path.join(PIPELINE_DIR, "idempotency.json");

interface IdempotencyRecord {
  key: string;
  runId: string;
  leadId: string;
  stage: PipelineStage;
  timestamp: string;
  result: unknown;
}

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
  if (!fs.existsSync(IDEMPOTENCY_FILE)) {
    fs.writeFileSync(IDEMPOTENCY_FILE, JSON.stringify({}, null, 2), "utf-8");
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
  /**
   * Saves or updates a PipelineRun record (Azure PostgreSQL primary + durable dual-write)
   */
  static async savePipelineRun(run: PipelineRun): Promise<void> {
    ensurePipelineStorage();
    const runs = readJSON<PipelineRun[]>(RUNS_FILE, []);
    const idx = runs.findIndex((r) => r.id === run.id);
    if (idx >= 0) {
      runs[idx] = run;
    } else {
      runs.unshift(run);
    }
    writeJSON(RUNS_FILE, runs);

    // Persist to Azure PostgreSQL Flexible Server
    try {
      await savePipelineRunToPostgres(run);
    } catch (err) {
      console.warn(`[PipelineQueue] Postgres write error for run ${run.id}:`, (err as Error)?.message);
    }
  }

  /**
   * Retrieves a PipelineRun by ID (Azure PostgreSQL primary with local fallback)
   */
  static async getPipelineRun(runId: string): Promise<PipelineRun | null> {
    try {
      const pgRun = await getPipelineRunFromPostgres(runId);
      if (pgRun) return pgRun;
    } catch {}

    ensurePipelineStorage();
    const runs = readJSON<PipelineRun[]>(RUNS_FILE, []);
    return runs.find((r) => r.id === runId) || null;
  }

  /**
   * Lists all PipelineRuns (Azure PostgreSQL primary with local fallback)
   */
  static async listPipelineRuns(): Promise<PipelineRun[]> {
    try {
      const pgRuns = await listPipelineRunsFromPostgres();
      if (pgRuns && pgRuns.length > 0) return pgRuns;
    } catch {}

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
   * Checks if a job has already executed for this runId + leadId + stage
   */
  static async checkIdempotency(
    runId: string,
    leadId: string,
    stage: PipelineStage
  ): Promise<{ executed: boolean; result?: unknown }> {
    ensurePipelineStorage();
    const map = readJSON<Record<string, IdempotencyRecord>>(IDEMPOTENCY_FILE, {});
    const key = this.makeIdempotencyKey(runId, leadId, stage);
    if (map[key]) {
      return { executed: true, result: map[key].result };
    }
    return { executed: false };
  }

  /**
   * Records successful execution into the idempotency store
   */
  static async recordIdempotency(
    runId: string,
    leadId: string,
    stage: PipelineStage,
    result: unknown
  ): Promise<void> {
    ensurePipelineStorage();
    const map = readJSON<Record<string, IdempotencyRecord>>(IDEMPOTENCY_FILE, {});
    const key = this.makeIdempotencyKey(runId, leadId, stage);
    map[key] = {
      key,
      runId,
      leadId,
      stage,
      timestamp: new Date().toISOString(),
      result,
    };
    writeJSON(IDEMPOTENCY_FILE, map);
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
    const lead = run.leads[leadId];
    if (!lead) {
      return { success: false, error: `Lead ${leadId} not found in pipeline run` };
    }

    // Check idempotency first
    const idem = await this.checkIdempotency(run.id, leadId, stage);
    if (idem.executed) {
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
      const result = await this.executeWithRetry(stageFn, {
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
      job.status = "completed";
      job.updatedAt = new Date().toISOString();
      await this.savePipelineJob(job);

      await this.recordIdempotency(run.id, leadId, stage, result);

      lead.status = "completed";
      lead.timeline.push({
        stage,
        status: "completed",
        timestamp: new Date().toISOString(),
      });

      return { success: true, data: result };
    } catch (err) {
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
    writeJSON(IDEMPOTENCY_FILE, {});
  }
}
