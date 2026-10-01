// src/lib/intelligence/validation/validationStore.ts
/**
 * Validation Store
 * Tenant-scoped persistence for validation reports, run history, and repair cycles.
 */

import fs from "fs";
import path from "path";
import type { ValidationReport, ValidationHistoryRecord } from "./types";

export class ValidationStore {
  private static instance: ValidationStore;
  private reports: Map<string, ValidationReport> = new Map();
  private history: Map<string, ValidationHistoryRecord> = new Map();
  private storageDir: string;

  private constructor() {
    this.storageDir = path.join(process.cwd(), "scratch", "validation");
    if (!fs.existsSync(this.storageDir)) {
      try {
        fs.mkdirSync(this.storageDir, { recursive: true });
      } catch {
        // Fallback for sandboxes without scratch access
      }
    }
  }

  public static getInstance(): ValidationStore {
    if (!ValidationStore.instance) {
      ValidationStore.instance = new ValidationStore();
    }
    return ValidationStore.instance;
  }

  private getHistoryKey(tenantId: string, projectId: string): string {
    return `${tenantId}:${projectId}`;
  }

  public async saveReport(report: ValidationReport): Promise<void> {
    this.reports.set(report.validationId, report);

    const histKey = this.getHistoryKey(report.tenantId, report.projectId);
    const existing = this.history.get(histKey);

    const cycle = {
      cycleNumber: report.retryCount + 1,
      validationId: report.validationId,
      decision: report.decision,
      failureCount: report.blockingFailures.length,
      failureFingerprint: report.failureFingerprint,
      repaired: report.decision === "READY",
      timestamp: report.completedAt,
    };

    if (existing) {
      existing.latestReport = report;
      existing.cycles.push(cycle);
      existing.updatedAt = new Date().toISOString();
      this.history.set(histKey, existing);
    } else {
      this.history.set(histKey, {
        projectId: report.projectId,
        tenantId: report.tenantId,
        latestReport: report,
        cycles: [cycle],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Persist to disk scratch
    try {
      if (fs.existsSync(this.storageDir)) {
        const filePath = path.join(this.storageDir, `${report.validationId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf8");
      }
    } catch {
      // In-memory fallback
    }
  }

  public getReport(validationId: string, tenantId?: string): ValidationReport | null {
    const report = this.reports.get(validationId);
    if (!report) return null;
    if (tenantId && report.tenantId !== tenantId) return null; // Enforce tenant isolation
    return report;
  }

  public getLatestProjectReport(tenantId: string, projectId: string): ValidationReport | null {
    const hist = this.history.get(this.getHistoryKey(tenantId, projectId));
    return hist ? hist.latestReport : null;
  }

  public getProjectHistory(tenantId: string, projectId: string): ValidationHistoryRecord | null {
    const hist = this.history.get(this.getHistoryKey(tenantId, projectId));
    return hist || null;
  }

  public _clearForTest(): void {
    this.reports.clear();
    this.history.clear();
    try {
      if (fs.existsSync(this.storageDir)) {
        const files = fs.readdirSync(this.storageDir);
        for (const f of files) {
          if (f.endsWith(".json")) {
            fs.unlinkSync(path.join(this.storageDir, f));
          }
        }
      }
    } catch {
      // ignore
    }
  }
}

export const validationStore = ValidationStore.getInstance();
