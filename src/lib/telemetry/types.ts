// src/lib/telemetry/types.ts

export type AgentTelemetryEventType =
  | "agent.started"
  | "agent.thinking"
  | "agent.provider_call"
  | "agent.provider_success"
  | "agent.provider_error"
  | "agent.fallback"
  | "agent.tool_call"
  | "agent.tool_result"
  | "agent.completed"
  | "agent.failed"
  | "automation.started"
  | "automation.validated"
  | "automation.website_generation_started"
  | "automation.website_generation_completed"
  | "automation.website_generation_failed"
  | "automation.preview_created"
  | "automation.auth_failed"
  | "automation.idempotent_hit"
  | "automation.failed"
  | "business.discovery.started"
  | "business.discovery.provider_call"
  | "business.discovery.provider_success"
  | "business.discovery.provider_error"
  | "business.discovery.normalized"
  | "business.discovery.duplicate"
  | "business.qualification.completed"
  | "business.qualification.disqualified"
  | "business.lead.created"
  | "business.research.started"
  | "business.research.completed"
  | "website.resolve.started"
  | "website.resolve.completed"
  | "website.fetch.started"
  | "website.fetch.completed"
  | "website.fetch.failed"
  | "website.audit.started"
  | "website.audit.completed"
  | "website.audit.failed"
  | "phase10.handoff.created"
  | "preview.generation.started"
  | "preview.context.loaded"
  | "preview.design.created"
  | "preview.images.resolved"
  | "preview.generation.completed"
  | "preview.quality.started"
  | "preview.quality.passed"
  | "preview.quality.failed"
  | "preview.generation.failed"
  | "preview.handoff.created"
  | "outreach.draft.started"
  | "outreach.draft.generated"
  | "outreach.draft.validation_failed"
  | "outreach.created"
  | "outreach.reviewed"
  | "outreach.approved"
  | "outreach.rejected"
  | "outreach.simulated"
  | "reply_received"
  | "reply_analyzed"
  | "reply_analysis_failed"
  | "crm_status_changed"
  | "crm_action_recommended"
  | "crm.reply.received"
  | "crm.reply.analyzed"
  | "crm.reply.analysis_failed"
  | "crm.status.changed"
  | "crm.action.recommended"
  | "pipeline_started"
  | "pipeline_stage_started"
  | "pipeline_stage_completed"
  | "pipeline_stage_failed"
  | "pipeline_retry"
  | "pipeline_paused"
  | "pipeline_resumed"
  | "pipeline_cancelled"
  | "pipeline_completed"
  | "followup_queued"
  | "followup_executed"
  | "pipeline.started"
  | "pipeline.stage_started"
  | "pipeline.stage_completed"
  | "pipeline.stage_failed"
  | "pipeline.retry"
  | "pipeline.paused"
  | "pipeline.resumed"
  | "pipeline.cancelled"
  | "pipeline.completed"
  | "followup.queued"
  | "followup.executed"
  | "analytics_generated"
  | "cost_estimated"
  | "optimization_detected"
  | "analytics.generated"
  | "analytics.cost_estimated"
  | "analytics.optimization_detected";

export type AgentName =
  | "mitra"
  | "generator"
  | "planner"
  | "extractor"
  | "studio"
  | "skills"
  | "uniqueness"
  | "boss"
  | string;

export type AgentState = "idle" | "running" | "success" | "error" | "fallback";

export interface AgentTelemetryEvent {
  id: string;
  timestamp: string; // ISO 8601
  event: AgentTelemetryEventType;
  agent: AgentName;
  requestId?: string;
  projectId?: string;
  userId?: string;
  provider?: string;
  model?: string;
  fromProvider?: string;
  toProvider?: string;
  fromModel?: string;
  toModel?: string;
  reason?: string;
  error?: string;
  status?: "running" | "success" | "error" | "fallback";
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}

export type AgentTelemetryEventInput = Omit<AgentTelemetryEvent, "id" | "timestamp"> & {
  id?: string;
  timestamp?: string;
};

export interface AgentLiveStatus {
  agent: string;
  state: AgentState;
  currentOperation?: string;
  startedAt?: string;
  updatedAt: string;
  lastActiveAt?: string | number;
  provider?: string;
  model?: string;
  requestId?: string;
  currentRequestId?: string;
  lastEvent?: AgentTelemetryEventType;
  lastLatencyMs?: number;
  lastError?: string;
  error?: string;
}

export interface TelemetryFilter {
  agent?: string;
  requestId?: string;
  userId?: string;
  projectId?: string;
  limit?: number;
  isAdmin?: boolean;
}
