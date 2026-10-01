// src/lib/intelligence/memory/executionMemory.ts
import type { ExecutiveExecutionResult } from "../executive/executiveTypes";

export class ExecutionMemory {
  private static instance: ExecutionMemory;
  private runs: Map<string, ExecutiveExecutionResult> = new Map();
  private runOrder: string[] = [];
  private readonly maxCapacity = 50;

  private constructor() {}

  public static getInstance(): ExecutionMemory {
    if (!ExecutionMemory.instance) {
      ExecutionMemory.instance = new ExecutionMemory();
    }
    return ExecutionMemory.instance;
  }

  public recordRun(result: ExecutiveExecutionResult): void {
    if (this.runs.has(result.runId)) {
      this.runs.set(result.runId, result);
      return;
    }

    if (this.runOrder.length >= this.maxCapacity) {
      const oldestId = this.runOrder.shift();
      if (oldestId) this.runs.delete(oldestId);
    }

    this.runOrder.push(result.runId);
    this.runs.set(result.runId, result);
  }

  public getRun(runId: string): ExecutiveExecutionResult | undefined {
    return this.runs.get(runId);
  }

  public getRecentRuns(limit = 10): ExecutiveExecutionResult[] {
    return this.runOrder
      .slice(-limit)
      .reverse()
      .map((id) => this.runs.get(id))
      .filter((r): r is ExecutiveExecutionResult => r !== undefined);
  }

  public clear(): void {
    this.runs.clear();
    this.runOrder = [];
  }
}
