// src/lib/intelligence/learning/trajectoryLogger.ts
import type { ExecutiveExecutionResult } from "../executive/executiveTypes";

export interface TrajectoryLearningRecord {
  runId: string;
  timestamp: string;
  domain: string;
  objective: string;
  success: boolean;
  repairsApplied: number;
  escalated: boolean;
  totalDurationMs: number;
  delegationsCount: number;
  toolsCount: number;
  trajectorySummary: string;
}

export class TrajectoryLogger {
  private static trajectories: TrajectoryLearningRecord[] = [];

  public static stageTrajectory(result: ExecutiveExecutionResult): TrajectoryLearningRecord {
    const record: TrajectoryLearningRecord = {
      runId: result.runId,
      timestamp: new Date().toISOString(),
      domain: result.decision.objective.split(" ")[0] || "general",
      objective: result.objective,
      success: result.success,
      repairsApplied: result.repairsApplied,
      escalated: result.escalations.length > 0,
      totalDurationMs: result.durationMs,
      delegationsCount: result.delegationResults.length,
      toolsCount: result.toolCallResults.length,
      trajectorySummary: result.trajectory.map((t) => t.state).join(" -> "),
    };

    this.trajectories.push(record);
    if (this.trajectories.length > 100) {
      this.trajectories.shift();
    }

    return record;
  }

  public static getStagedTrajectories(): TrajectoryLearningRecord[] {
    return [...this.trajectories];
  }
}
