# WebsiteBanja — Phase 13: Autonomous Lead Pipeline Engineering Report

**Prompt ID:** 73461  
**Project:** WebsiteBanja  
**Phase:** 13 — Autonomous Lead Pipeline  
**Execution Environment:** Strict Local Development Only  
**Verification Date:** 2026-09-29  
**Status:** 100% Complete & Verified (30/30 Phase 13 Tests Passed, 134/134 Regression Tests Passed)

---

## 1. Executive Summary & Architecture Overview

Phase 13 establishes the central orchestration layer for WebsiteBanja, unifying the autonomous engines developed in Phases 8 through 12 into ONE robust, self-healing, autonomous lead-generation pipeline.

Prior to Phase 13, the platform possessed isolated capabilities:
- **Phase 8:** Business Discovery & Qualification
- **Phase 9:** Business Research & Website Audit
- **Phase 10:** Automated Personalized Preview Generation
- **Phase 11:** Personalized Outreach Foundation
- **Phase 12:** Reply Intelligence & CRM Foundation

Phase 13 provides the **Master Orchestrator**, durable **Job Queue**, **Single-Lead Failure Isolation**, **Bounded Retry Mechanism**, **Follow-Up Queue**, **Simulated Clock Engine**, and an interactive **Pipeline Admin Dashboard**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PIPELINE ORCHESTRATOR                                     │
│                     (src/lib/automation/pipelineOrchestrator.ts)                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  [Stage 1: Discovery & Qualification] (Phase 8: discoveryService.ts)                   │
│         │                                                                              │
│         ▼                                                                              │
│  [Stage 2: Research & Website Audit] (Phase 9: auditService.ts)                        │
│         │                                                                              │
│         ▼                                                                              │
│  [Stage 3: Personalized Preview Generation] (Phase 10: previewGenerator.ts)            │
│         │                                                                              │
│         ▼                                                                              │
│  [Stage 4: Outreach Draft Generation] (Phase 11: personalizationEngine.ts)             │
│         │                                                                              │
│         ▼                                                                              │
│  [Stage 5: Human Approval / Simulated Dispatch] (Phase 11: simulationProvider.ts)      │
│         │                                                                              │
│         ▼                                                                              │
│  [Stage 6: Inbound Reply / Reply Intelligence] (Phase 12: replySimulation.ts)          │
│         │                                                                              │
│         ▼                                                                              │
│  [Stage 7: Follow-Up Queue & Lifecycle Completion] (followUpQueue.ts)                  │
│                                                                                        │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      [Durable Job Queue & State]                 [Follow-up Queue]
      (scratch/pipeline/runs.json)                (scratch/pipeline/followups.json)
      (scratch/pipeline/jobs.json)                Max 2 follow-ups
      (scratch/pipeline/idempotency.json)         Simulated clock advance
      Max 3 retries, single-lead isolation
```

---

## 2. Pipeline State Machine & Lifecycle Stages

The pipeline state machine enforces strict, non-skippable sequential progression across 14 lifecycle stages:

| Stage | Allowed Next Transitions | Purpose |
|---|---|---|
| `DISCOVERY` | `QUALIFICATION`, `FAILED`, `CANCELLED`, `PAUSED` | Searches local catalog for business candidates |
| `QUALIFICATION` | `RESEARCH_AUDIT`, `COMPLETED`, `FAILED`, `CANCELLED`, `PAUSED` | Filters out disqualified entities, computes scores |
| `RESEARCH_AUDIT` | `PREVIEW_GENERATION`, `FAILED`, `CANCELLED`, `PAUSED` | Bounded crawl, technical/SEO audit & opportunity scoring |
| `PREVIEW_GENERATION` | `OUTREACH_DRAFT`, `FAILED`, `CANCELLED`, `PAUSED` | Generates bespoke preview, enforces hero contrast & quality |
| `OUTREACH_DRAFT` | `HUMAN_APPROVAL`, `SIMULATED_DISPATCH`, `FAILED`, `CANCELLED`, `PAUSED` | Creates channel-specific pitch referencing audit findings |
| `HUMAN_APPROVAL` | `SIMULATED_DISPATCH`, `FAILED`, `CANCELLED`, `PAUSED` | Manual review gate in Outreach Queue |
| `SIMULATED_DISPATCH` | `WAITING_FOR_REPLY`, `FAILED`, `CANCELLED`, `PAUSED` | Emulates delivery, generates receipt, creates CRM conversation |
| `WAITING_FOR_REPLY` | `REPLY_INTELLIGENCE`, `FOLLOW_UP_QUEUE`, `COMPLETED`, `FAILED`, `CANCELLED`, `PAUSED` | Awaits prospect response |
| `REPLY_INTELLIGENCE` | `FOLLOW_UP_QUEUE`, `COMPLETED`, `FAILED`, `CANCELLED`, `PAUSED` | Classifies inbound intent, sentiment & urgency |
| `FOLLOW_UP_QUEUE` | `SIMULATED_DISPATCH`, `COMPLETED`, `FAILED`, `CANCELLED`, `PAUSED` | Schedules and executes bounded follow-ups (max 2) |
| `PAUSED` | Any active stage, `CANCELLED` | Suspends execution without losing state |
| `FAILED` | Retried stage, `CANCELLED` | Captures errors, enables manual or automated retry |
| `CANCELLED` | Terminal | Halts execution, aborts scheduled follow-ups |
| `COMPLETED` | Terminal | Marks successful conclusion of pipeline run |

State transition validation is implemented via `validateStageTransition(from, to)` and `assertValidStageTransition(from, to)`.

---

## 3. Durable Job Queue & Local Storage Design

All pipeline runs, jobs, and execution states are persisted locally in atomic JSON files under `scratch/pipeline/`:
- `scratch/pipeline/runs.json`: Stores complete `PipelineRun` entities, criteria, run-level stats, and per-lead progress.
- `scratch/pipeline/jobs.json`: Granular `PipelineJob` records per stage execution attempt.
- `scratch/pipeline/idempotency.json`: Execution cache keyed by `${runId}:${leadId}:${stage}`.
- `scratch/pipeline/followups.json`: Durable follow-up queue jobs.
- `scratch/pipeline/simulated_clock.json`: Active simulation clock timestamp.

All file writes utilize atomic staging via temporary files (`.tmp.${timestamp}`) and atomic rename (`fs.renameSync`) to ensure zero file corruption even during unexpected process termination.

---

## 4. Single-Lead Failure Isolation Architecture

A core design requirement is that individual business failures must never halt or corrupt the entire pipeline run:
- If a lead fails during research (e.g., website unreachable) or preview generation (e.g., asset failure), the error is isolated to that specific lead.
- The lead's state transitions to `status: "failed"`, the error trace is appended to `lead.errorHistory` and `run.errors`, and `run.stats.failed` is incremented.
- The outer batch loop catches the error cleanly via `PipelineQueue.executeLeadStageSafe()` and continues processing all other qualified leads.
- If at least one lead succeeds, the run status concludes as `PARTIAL_SUCCESS`.

---

## 5. Bounded Retry Engine & Backoff Strategy

Transient errors (e.g., temporary timeouts, rate limits) are handled by a bounded exponential retry mechanism:
- **Maximum Attempts:** Bounded strictly to `maxAttempts = 3`.
- **Backoff Calculation:** `min(baseBackoffMs * 2^(attempt - 1) + jitter, 1000ms)`.
- **Retry Auditing:** Each retry attempt is logged to `lead.timeline` as a `"retried"` event and emitted via `pipeline_retry` telemetry.
- **Terminal Failure:** If all 3 attempts fail, the error is recorded, and the lead is marked `failed` without throwing unhandled exceptions.

---

## 6. Idempotency & Deduplication Protection

To prevent accidental duplicate executions, preview rebuilds, or redundant outreach drafting:
- A composite idempotency key is computed: `${pipelineRunId}:${leadId}:${stage}`.
- Before executing any stage for a lead, `PipelineQueue.checkIdempotency()` verifies if a result was already recorded.
- If already executed, the cached result is returned immediately with zero duplicate computation.
- Upon successful execution, `PipelineQueue.recordIdempotency()` saves the result with an ISO timestamp.

---

## 7. Follow-Up Queue & No-Reply State Engine

Follow-up automation is managed via `FollowUpQueue` (`src/lib/automation/followUpQueue.ts`):
- **Follow-Up Scheduling:** When an outreach dispatch completes, Follow-Up #1 is scheduled (default +3 days).
- **Hard Bound (Max 2):** Exactly 2 follow-ups are permitted per lead.
- **No-Response Handling:** If Follow-Up #2 is executed without receiving a reply, the lead transitions to `NO_RESPONSE` $\rightarrow$ `LOST` / `MANUAL_REVIEW`, and no further follow-up is scheduled.
- **Immediate Cancellation:** If an inbound reply is simulated or the lead is marked `DO_NOT_CONTACT`, all pending follow-ups for that lead are cancelled immediately.
- **Simulated Clock:** `FollowUpQueue.advanceSimulationClock(days)` allows advancing simulated time by $N$ days to evaluate and execute due follow-ups.

---

## 8. Central Orchestration Flow (Phase 8 → Phase 12)

The `PipelineOrchestrator` (`src/lib/automation/pipelineOrchestrator.ts`) directly consumes existing engine modules without rewriting:
1. **Phase 8:** `executeDiscoveryRun` discovers candidate businesses and qualifies high-opportunity leads.
2. **Phase 9:** `auditQualifiedLead` compiles research, conducts multi-dimensional website audits, and generates Phase 10 design inputs.
3. **Phase 10:** `generatePersonalizedPreview` builds bespoke preview websites, resolves semantic images, and enforces hero contrast.
4. **Phase 11:** `generateOutreachDraft` crafts personalized outreach referencing audit findings.
5. **Phase 11 Simulation:** `localSimulationProvider.simulateDispatch` emulates transmission and issues simulation receipts.
6. **Phase 12:** `crmRepository.createConversation` seeds CRM threads, updates lead status to `OUTREACH_SENT`, and records timeline activities.
7. **Phase 12 Reply Simulation:** `simulateInboundReply` classifies inbound replies, detects intent/sentiment, and cancels pending follow-ups.

---

## 9. Human Approval & Safety Controls

The pipeline provides robust operator controls:
- **Auto-Approve Toggle:** Runs can be launched with `autoApproveOutreach: true` (full autonomous simulation) or `autoApproveOutreach: false` (pauses at `HUMAN_APPROVAL` stage awaiting operator review in the Outreach Queue).
- **Run Pause:** Operators can pause an active run at any time via `POST /api/automation/pipeline/pause`.
- **Run Resume:** Paused runs can be resumed via `POST /api/automation/pipeline/resume`.
- **Run Cancel:** Active runs can be cancelled via `POST /api/automation/pipeline/cancel`, which immediately cancels all pending follow-ups.
- **Run Retry:** Failed runs can be retried via `POST /api/automation/pipeline/[runId]/retry`.

---

## 10. DO_NOT_CONTACT & Unsubscribe Enforcement

Prospect autonomy and opt-out preferences are strictly enforced:
- Before any stage is executed for a lead, the orchestrator checks `crmRepository.getLeadCRMState(leadId)`.
- If the lead is marked `DO_NOT_CONTACT`:
  1. The pipeline immediately skips processing for this lead (`status: "skipped"`).
  2. No outreach draft or simulated dispatch is generated.
  3. Any scheduled follow-ups are cancelled immediately.
  4. An audit timeline event is recorded.

---

## 11. Telemetry & Observability Integration

Registered telemetry events in `src/lib/telemetry/types.ts`:
- `pipeline_started` / `pipeline.started`: Emitted when run starts.
- `pipeline_stage_started` / `pipeline.stage_started`: Emitted at stage boundaries.
- `pipeline_stage_completed` / `pipeline.stage_completed`: Emitted on stage completion.
- `pipeline_stage_failed` / `pipeline.stage_failed`: Emitted on stage errors.
- `pipeline_retry` / `pipeline.retry`: Emitted on retry attempts.
- `pipeline_paused` / `pipeline.paused`: Emitted when paused by operator.
- `pipeline_resumed` / `pipeline.resumed`: Emitted when resumed.
- `pipeline_cancelled` / `pipeline.cancelled`: Emitted when cancelled.
- `pipeline_completed` / `pipeline.completed`: Emitted when run concludes.
- `followup_queued` / `followup.queued`: Emitted when follow-up is scheduled.
- `followup_executed` / `followup.executed`: Emitted when simulated follow-up fires.

---

## 12. Automation API Endpoints Reference

All automation endpoints are protected by `x-automation-secret` or `Authorization: Bearer <secret>`:

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/automation/pipeline` | Lists all pipeline runs and status summaries |
| `POST` | `/api/automation/pipeline/run` | Triggers a new autonomous pipeline run |
| `GET` | `/api/automation/pipeline/[runId]` | Retrieves run details, lead progress, and handoff contract |
| `POST` | `/api/automation/pipeline/pause` | Pauses an active pipeline run |
| `POST` | `/api/automation/pipeline/resume` | Resumes a paused pipeline run |
| `POST` | `/api/automation/pipeline/cancel` | Cancels a pipeline run and aborts scheduled follow-ups |
| `POST` | `/api/automation/pipeline/[runId]/retry` | Retries failed stages for leads in a run |
| `POST` | `/api/automation/pipeline/[runId]/simulate-reply` | Simulates an inbound reply for a lead in the run |
| `POST` | `/api/automation/pipeline/advance-clock` | Advances simulated clock and executes due follow-ups |

---

## 13. Pipeline Admin Dashboard Architecture

Implemented at `src/app/admin/automation/page.tsx`:
- **Top Safety Banner:** Highlights local simulation constraints (`NO REAL SEND`).
- **Metric Cards:** Displays aggregated statistics: Total Runs, Qualified Leads, Previews Created, Outreach Dispatched, Replies Ingested, and Interested Leads.
- **Stage Flow Visualizer:** Real-time stepper representing the 7 key lifecycle phases.
- **Simulation Clock Controls:** Quick action buttons (`+3 Days`, `+7 Days`) to advance the clock and fire due follow-ups.
- **Runs Master List:** Interactive run selector with live status badges (`RUNNING`, `COMPLETED`, `PAUSED`, `FAILED`).
- **Lead Pipeline Progress Table:** Inspects business name, current stage badge, retry counter, preview link, and error message.
- **Interactive Modals:**
  - *Trigger Autonomous Run Modal:* Custom query, city, limit, channel, and auto-approve toggle.
  - *Simulate Inbound Reply Modal:* Quick templates for price inquiry, call request, and opt-out.

---

## 14. Master n8n Autonomous Pipeline Workflow

Exported to `automation/n8n/WebsiteBanja_Autonomous_Lead_Pipeline.json`:
- **Trigger:** Manual Trigger node.
- **Set Node:** Configures target criteria (industry, city, limit, channel, autoApproveOutreach).
- **HTTP Request (Start Run):** `POST http://localhost:3000/api/automation/pipeline/run`.
- **HTTP Request (Poll/Inspect):** `GET http://localhost:3000/api/automation/pipeline/{{ $json.run.id }}`.
- **HTTP Request (Advance Clock):** `POST http://localhost:3000/api/automation/pipeline/advance-clock`.
- **Code Node:** Summarizes run ID, status, conversion funnel, and executed follow-ups.
- **Zero Secrets:** Employs `={{ $env.WEBSITEBANJA_AUTOMATION_SECRET }}` without any hardcoded credentials.

---

## 15. End-to-End Simulation Walkthrough

Execution trace for a typical autonomous run:
1. **Trigger:** `POST /api/automation/pipeline/run` with `{ industry: "restaurant", city: "Vadodara", limit: 1 }`.
2. **Discovery:** Evaluated 6 candidate businesses; qualified `Grand Heritage Dining` (qualification score: 95).
3. **Research & Audit:** Bounded crawl analyzed responsive structure; generated Phase 10 design brief.
4. **Preview Generation:** Built bespoke preview `prev_grand-heritage-dining_a3aedcef` at `http://localhost:3000/preview/prev_grand-heritage-dining_a3aedcef`.
5. **Outreach Drafting:** Drafted email pitch referencing lack of online table reservation system.
6. **Simulated Dispatch:** Emulated send, generated simulation receipt, and opened CRM conversation.
7. **Follow-Up Scheduled:** Scheduled Follow-Up #1 for +3 simulated days.
8. **Inbound Reply:** Lead responded: *"We love the preview website! What is the price and how do we proceed?"*.
9. **Reply Intelligence:** Classified intent as `ASKING_PRICE`, sentiment `POSITIVE`, and urgency `HIGH`.
10. **Follow-Up Cancelled:** Follow-Up #1 was cancelled immediately upon receiving the reply.
11. **Funnel Completion:** Lead status updated to `INTERESTED` with recommended action `HUMAN_REPLY_REQUIRED`.

---

## 16. Phase 14 Handoff Contract Specification

Structured contract returned by `PipelineOrchestrator.getHandoffContract()` for consumption by Phase 14 (Analytics, Cost & Optimization):

```typescript
export interface Phase14HandoffContract {
  pipelineRunId: string;
  timestamp: string;
  status: PipelineStatus;
  metrics: PipelineStats;
  costMetrics: {
    estimatedTokens: number;
    estimatedCostUsd: number;
    durationMs: number;
  };
  conversionFunnel: {
    leadsDiscovered: number;
    leadsQualified: number;
    auditsCompleted: number;
    previewsCreated: number;
    outreachSent: number;
    repliesTotal: number;
    positiveReplies: number;
  };
}
```

---

## 17. Phase 15 Compatibility & UI Groundwork

Phase 13 establishes the data structures required for Phase 15 (CRM Spreadsheet UI):
- Each lead retains structured attributes: `leadId`, `businessName`, `currentStage`, `status`, `auditId`, `previewId`, `previewUrl`, `outreachId`, `conversationId`, and complete audit timeline.
- The tabular layout in `/admin/automation` demonstrates column-based stage visibility, ready to be expanded into a spreadsheet-style grid in Phase 15.

---

## 18. Test Coverage & Verification Results (30/30 Pass)

The dedicated test suite `tests/phase13_autonomous_lead_pipeline.test.mjs` was executed and achieved a **100% pass rate (30/30 passed)**:

| # | Test Scenario | Result |
|---|---|---|
| 1 | State machine allows valid sequential transitions | **PASS** |
| 2 | State machine allows valid pause and resume transitions | **PASS** |
| 3 | State machine allows valid failure and cancellation transitions | **PASS** |
| 4 | State machine rejects illegal forward stage jumping | **PASS** |
| 5 | State machine rejects transitions out of terminal COMPLETED and CANCELLED | **PASS** |
| 6 | State machine allows idempotent self-transitions | **PASS** |
| 7 | Idempotency store creates composite key and records execution result | **PASS** |
| 8 | Idempotency store isolates results between different stages and leads | **PASS** |
| 9 | Pipeline queue saves and retrieves a PipelineRun record | **PASS** |
| 10 | Pipeline queue saves and queries PipelineJob records | **PASS** |
| 11 | Pipeline queue supports atomic updates to PipelineRun | **PASS** |
| 12 | Bounded retries succeed if transient failure resolves within max attempts | **PASS** |
| 13 | Bounded retries fail cleanly and throw when maxAttempts (3) is exceeded | **PASS** |
| 14 | Single-lead failure isolation: failing lead leaves other leads unharmed | **PASS** |
| 15 | Single-lead failure isolation records error trace in lead history & run.errors | **PASS** |
| 16 | Central orchestrator executes end-to-end autonomous run | **PASS** |
| 17 | Central orchestrator tracks individual lead progress across stages | **PASS** |
| 18 | Central orchestrator generates personalized preview and assigns previewUrl | **PASS** |
| 19 | Central orchestrator drafts and simulates dispatch of personalized outreach | **PASS** |
| 20 | Central orchestrator creates CRM conversation and timeline events | **PASS** |
| 21 | Pause flow: Pausing an active run transitions status to PAUSED | **PASS** |
| 22 | Resume flow: Resuming a paused run transitions status back to RUNNING | **PASS** |
| 23 | Cancel flow: Cancelling a run marks status CANCELLED and aborts follow-ups | **PASS** |
| 24 | Retry flow: Retrying failed jobs resets failed leads to pending | **PASS** |
| 25 | Follow-up queue schedules follow-up #1 with due date | **PASS** |
| 26 | Follow-up queue enforces strict MAX 2 follow-ups constraint | **PASS** |
| 27 | Simulated clock advancement executes due follow-ups and adds CRM messages | **PASS** |
| 28 | Follow-up queue immediately cancels pending follow-ups when lead replies | **PASS** |
| 29 | Reply simulation within run context updates stats.repliesReceived and stats.interested | **PASS** |
| 30 | Pipeline API validates authorization secret & master n8n workflow has 0 secrets | **PASS** |

---

## 19. Full Project Regression Results (134/134 Pass)

All automation regression test suites across Phases 7 through 13 were executed concurrently:

```text
▶ Phase 13: Autonomous Lead Pipeline Test Suite (30/30 PASSED)
▶ Phase 7: Automation API Authentication & Security (4/4 PASSED)
▶ Phase 7: Payload Validation & Robustness (3/3 PASSED)
▶ Phase 7: End-to-End Generation & Preview Creation (3/3 PASSED)
▶ Phase 7: n8n Workflow Export & Local Documentation (3/3 PASSED)
▶ Phase 8: Input Validation & Criteria (4/4 PASSED)
▶ Phase 8: Provider Abstraction & Deterministic Fixtures (1/1 PASSED)
▶ Phase 8: Normalization Engine (4/4 PASSED)
▶ Phase 8: Deduplication Engine (1/1 PASSED)
▶ Phase 8: Website Presence & Reachability (1/1 PASSED)
▶ Phase 8: Qualification & Opportunity Engines (3/3 PASSED)
▶ Phase 8: Persistence & Tenant Isolation (1/1 PASSED)
▶ Phase 8: Automation API & n8n Workflow (3/3 PASSED)
▶ Phase 9: SSRF Protection & URL Validation (6/6 PASSED)
▶ Phase 9: HTML Parser & Content Extraction (4/4 PASSED)
▶ Phase 9: Multi-Dimensional Audit Evaluators (4/4 PASSED)
▶ Phase 9: Opportunity Scoring & Synthetic Fallback (3/3 PASSED)
▶ Phase 9: Repository Persistence & Tenant Isolation (2/2 PASSED)
▶ Phase 9: API Security & Orchestration (3/3 PASSED)
▶ Phase 9: Exported n8n Workflow Validation (1/1 PASSED)
...
Total: 134 passed, 0 failed, 33 suites (100% Pass Rate)
```

TypeScript verification and Next.js production build:
- `npx tsc --noEmit`: 0 errors
- `npm run build`: 100% success (all routes compiled cleanly)

---

## 20. Local-Only Verification & Deployment Integrity

Strict adherence to the **Absolute Local-Only Hard Lock** was verified:
- `git status --short`: Zero commits created, zero pushes executed, zero PRs opened.
- No external communications were initiated (no real emails, SMS, WhatsApp, or DMs).
- All discovery, preview, outreach, reply, and follow-up data resides strictly in local `scratch/` directories.
- `WEBSITEBANJA_AUTOMATION_SECRET` remains securely configured in local environment variables.
- Dev server running on `http://localhost:3000` (task `task-4658`).
- Local n8n daemon running on `http://localhost:5678` (task `task-3950`).
