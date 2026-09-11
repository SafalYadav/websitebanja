// src/lib/ai/generation/autoFix.ts

import fs from "fs";
import path from "path";

export interface AutoFixAttempt {
  attemptNumber: number;
  errorDetected: string;
  remediationApplied: string;
  success: boolean;
  timestamp: string;
}

export interface AutoFixReport {
  finalStatus: "fixed" | "failed";
  attempts: AutoFixAttempt[];
  totalAttempts: number;
  logFilePath: string;
  error?: string;
}

export type AutoFixRemediator = (error: Error, attempt: number) => Promise<boolean> | boolean;

/**
 * Production auto-fix loop.
 * Detects failures in code generation, component compiling, or build validation,
 * applies targeted remediations, and re-validates.
 * Strictly capped at max 3 attempts. Unresolved errors are cleanly reported as failure.
 */
export async function runAutoFixLoop<T>(
  taskFn: (attempt: number) => Promise<T> | T,
  remediator: AutoFixRemediator,
  options: {
    maxAttempts?: number;
    logDir?: string;
    taskName?: string;
  } = {}
): Promise<{ result?: T; report: AutoFixReport }> {
  const maxAttempts = options.maxAttempts ?? 3;
  const taskName = options.taskName ?? "generation_validation";
  const logDir = options.logDir ?? path.resolve(process.cwd(), "logs", "autoFix");

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const attempts: AutoFixAttempt[] = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFilePath = path.join(logDir, `autofix_${taskName}_${timestamp}.json`);

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await taskFn(attempt);
      // Success
      attempts.push({
        attemptNumber: attempt,
        errorDetected: "None",
        remediationApplied: attempt > 1 ? "Remediation verified successful" : "Initial attempt succeeded without fix",
        success: true,
        timestamp: new Date().toISOString(),
      });

      const report: AutoFixReport = {
        finalStatus: "fixed",
        attempts,
        totalAttempts: attempt,
        logFilePath,
      };

      fs.writeFileSync(logFilePath, JSON.stringify(report, null, 2), "utf8");
      return { result, report };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      let remediationApplied = "No remediation applied";
      if (attempt < maxAttempts) {
        try {
          const remediated = await remediator(lastError, attempt);
          remediationApplied = remediated
            ? `Applied targeted heuristic fix for pattern: ${lastError.message.slice(0, 100)}`
            : "Remediator could not handle error pattern";
        } catch (remErr) {
          remediationApplied = `Remediation attempt failed: ${remErr instanceof Error ? remErr.message : remErr}`;
        }
      }

      attempts.push({
        attemptNumber: attempt,
        errorDetected: lastError.message,
        remediationApplied,
        success: false,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // If we reach here, max attempts exceeded
  const failureReport: AutoFixReport = {
    finalStatus: "failed",
    attempts,
    totalAttempts: maxAttempts,
    logFilePath,
    error: lastError?.message || "Max attempts exceeded without resolution",
  };

  fs.writeFileSync(logFilePath, JSON.stringify(failureReport, null, 2), "utf8");
  return { report: failureReport };
}
