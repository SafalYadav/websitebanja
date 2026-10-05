import type { PipelineRun } from "./pipelineTypes";

export function isPipelineSuspended(run: PipelineRun): boolean {
  return run.status === "PAUSED" || run.status === "CANCELLED";
}

/** Pending approvals and unfinished employees are never a completed run. */
export function updatePipelineCompletion(run: PipelineRun): void {
  if (isPipelineSuspended(run)) {
    if (run.status === "PAUSED") run.completedAt = undefined;
    return;
  }
  const leads = Object.values(run.leads);
  if (leads.some(lead => lead.status === "paused" || (lead.currentStage === "HUMAN_APPROVAL" && lead.status === "pending"))) {
    run.status = "PAUSED";
    run.pausedAt = new Date().toISOString();
    run.pauseReason = leads.some(lead => lead.status === "paused" && lead.researchId) ? "research" : "outreach";
    run.completedAt = undefined;
  } else if (leads.some(lead => lead.status === "running" || lead.status === "pending")) {
    run.status = "RUNNING";
    run.completedAt = undefined;
  } else {
    run.status = leads.length > 0 && leads.every(lead => lead.status === "failed") ? "FAILED"
      : leads.some(lead => lead.status === "failed") ? "PARTIAL_SUCCESS" : "COMPLETED";
    run.completedAt = new Date().toISOString();
  }
  run.updatedAt = new Date().toISOString();
}
