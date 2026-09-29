# WebsiteBanja — Phase 12 — Reply Intelligence + CRM Foundation Report
**Prompt ID**: 58142  
**Generated Date**: September 29, 2026  
**Environment**: Strictly Local Development (macOS / Node.js v26.5.1 / Next.js 16.2.12 / n8n 1.123.18)  
**Status**: Completed & Verified — 100% Passing (20/20 Phase 12 Tests, 208/208 Regression Tests)

---

## 1. Executive Summary

Phase 12 builds the **Reply Intelligence + CRM Foundation** for WebsiteBanja. Prior phases established business discovery (Phase 8), deep website auditing and research (Phase 9), personalized interactive preview generation (Phase 10), and human-approved multi-channel outreach drafting with local simulated dispatch (Phase 11). Phase 12 closes the feedback loop by ingesting inbound client responses, extracting structured intelligence (intent, sentiment, urgency, confidence), calculating deterministic next-action recommendations, updating the lead's CRM lifecycle status, and recording audit events into a chronological timeline.

In compliance with the **Strict Local-Only Development Lock**:
- **Zero Real External Messages**: All incoming responses are ingested and analyzed through local simulation (`POST /api/automation/simulate-reply` and `/admin/crm`).
- **Zero Automated Outbound Calls**: All next actions are categorized as `recommendedAction` for human review; `automatedAction` is strictly locked to `null`.
- **Factual Safety**: The intelligence engine never hallucinates prices, discounts, promises, customer details, or fake meeting times. Ambiguous or low-confidence replies automatically flag `requiresHumanReview = true`.
- **Seamless Lineage**: Seamlessly ingests Phase 11 simulated outbound outreach records into conversations without duplicating data.

---

## 2. Architecture & Pipeline Overview

```
                               PHASE 12 ARCHITECTURE
                               
   +-------------------------------------------------------------------------+
   |                     INBOUND SIMULATED COMMUNICATION                     |
   |                                                                         |
   |   +-----------------------+     +-----------------------------------+   |
   |   | Channel (Email/WA/SMS)|     | Inbound Customer Response Text    |   |
   |   +-----------+-----------+     +-----------------+-----------------+   |
   |               |                                   |                     |
   |               +-----------------+-----------------+                     |
   |                                 |                                       |
   |                                 v                                       |
   |              POST /api/automation/simulate-reply                        |
   +---------------------------------|---------------------------------------+
                                     |
                                     v
   +-------------------------------------------------------------------------+
   |                       CRM REPOSITORY & STORAGE                          |
   |                       (scratch/crm/*.json)                              |
   |                                                                         |
   |   1. Resolve Lead & Seed Conversation from Phase 11 Outreach            |
   |   2. Append Inbound Message to Conversation                             |
   |   3. Increment Message & Unread Metrics (Status -> REPLIED)             |
   +---------------------------------|---------------------------------------+
                                     |
                                     v
   +-------------------------------------------------------------------------+
   |                     REPLY INTELLIGENCE ENGINE                           |
   |                                                                         |
   |   - Intent Classifier: 14 Categories (Asking Price, Call, Opt-Out, etc) |
   |   - Sentiment Classifier: POSITIVE, NEUTRAL, NEGATIVE, MIXED, UNKNOWN   |
   |   - Urgency Classifier: LOW, MEDIUM, HIGH                               |
   |   - Confidence Scoring (0.0 to 1.0)                                     |
   |   - Human Review Triggers (< 0.65 confidence or ambiguous syntax)       |
   |   - Multi-Provider (Gemini/Groq/OpenAI) + Deterministic Fallback        |
   +---------------------------------|---------------------------------------+
                                     |
                                     v
   +-------------------------------------------------------------------------+
   |                     NEXT ACTION & STATUS ENGINE                         |
   |                                                                         |
   |   - Recommended Action: HUMAN_REPLY_REQUIRED, SCHEDULE_CALL, etc.       |
   |   - Automated Action: null (Strictly Locked in Phase 12)                |
   |   - Status Transition: OUTREACH_SENT -> REPLIED -> INTERESTED / LOST    |
   |   - Chronological CRM Event Logged to Timeline                          |
   +---------------------------------|---------------------------------------+
                                     |
                                     v
   +-------------------------------------------------------------------------+
   |                     PHASE 13 HANDOFF CONTRACT                           |
   |   handoffPhase: "phase13_autonomous_lead_pipeline"                      |
   |   payload: { leadId, latestInboundMessage, intelligence, nextAction }   |
   +-------------------------------------------------------------------------+
```

---

## 3. End-to-End Autonomous Pipeline Integration

The WebsiteBanja autonomous pipeline now cleanly links five operational phases:

```
[Phase 8: Discovery]   --> Discovers & qualifies local businesses lacking modern web assets
       |
[Phase 9: Audit]       --> Crawls existing sites (or handles missing sites) with 7-dimension audit
       |
[Phase 10: Preview]    --> Generates personalized, high-aesthetic interactive preview
       |
[Phase 11: Outreach]   --> Synthesizes factual, channel-native outreach & dispatches to local outbox
       |
[Phase 12: Reply & CRM]--> Ingests inbound reply, runs intelligence classification & CRM tracking
       |
[Phase 13: Pipeline]   --> Autonomous orchestration & scheduled pipeline execution (Coming Next)
```

Lineage is preserved across every record:
- `leadId`: Primary identifier established in Phase 8
- `outreachId`: Phase 11 simulated dispatch identifier
- `conversationId`: Persistent multi-channel conversation thread
- `handoffPhase`: Explicit forward pointer to `phase13_autonomous_lead_pipeline`

---

## 4. CRM Data Model & Lifecycle State Machine

Implemented in `src/lib/crm/types.ts`:

### 4.1 Canonical 15-State Lead Lifecycle
```
[DISCOVERED]  (Phase 8 Discovery)
     |
[QUALIFIED]   (Phase 8 Qualification Score >= 60)
     |
[AUDITED]     (Phase 9 Technical & UX Audit)
     |
[PREVIEW_READY] (Phase 10 Personalized Preview Generated)
     |
[OUTREACH_DRAFTED] (Phase 11 Human Review Queue)
     |
[OUTREACH_APPROVED] (Phase 11 Admin Approval)
     |
[OUTREACH_SENT] (Phase 11 Simulated Dispatch to Local Outbox)
     |
[REPLIED] (Phase 12 Inbound Client Message Received)
     +-------------------+--------------------+--------------------+
     |                   |                    |                    |
[INTERESTED]     [NOT_INTERESTED]     [DO_NOT_CONTACT]      [FOLLOW_UP]
(Price, Demo, Call) (Has site, no need)   (Stop, opt-out)     (Needs time, busy)
     |                                                             |
[MEETING_REQUESTED]                                                |
     |                                                             |
   [WON]                                                         [LOST]
```

Every status transition records:
- `previousStatus`: Status prior to transition
- `newStatus`: Updated lifecycle state
- `reason`: Grounded explanation (e.g. "Prospect requested pricing details")
- `timestamp`: ISO 8601 timestamp
- `source`: `"ai_classification"` | `"simulation"` | `"admin"` | `"system"` | `"n8n"`
- `messageId` & `conversationId`: Linked message context

---

## 5. Reply Intelligence Classification Engine

Implemented in `src/lib/crm/replyIntelligence.ts`:

### 5.1 Intent Categories (14 Categories)
1. `INTERESTED`: General high interest, enthusiastic praise.
2. `ASKING_PRICE`: Asking about cost, packages, discounts, pricing tiers.
3. `ASKING_FOR_DETAILS`: Inquiring about features, technology, timeline, process.
4. `ASKING_FOR_DEMO`: Asking to see specific portfolio samples, e-commerce, or interactive features.
5. `ASKING_FOR_CALL`: Suggesting a phone call, Google Meet, or Zoom discussion.
6. `POSITIVE_GENERAL`: Polite positive reply without immediate commercial commitment ("Looks nice!").
7. `NEEDS_TIME`: Currently busy, travelling, evaluating next quarter ("Check back next month").
8. `NOT_INTERESTED`: Clear polite rejection ("Not looking for this right now").
9. `ALREADY_HAS_WEBSITE`: States they recently launched or already have an agency/in-house developer.
10. `WRONG_CONTACT`: Wrong department, person no longer at business, forwarded to someone else.
11. `DO_NOT_CONTACT`: Explicit opt-out request ("Unsubscribe", "Remove me", "Do not contact again").
12. `CONFUSED`: Did not understand the preview, asking who we are or how we got their info.
13. `UNCLEAR`: Vague single word responses ("ok", "k", "?", thumbs up).
14. `OTHER`: Any edge case not matching established categories.

### 5.2 Sentiment Levels
`POSITIVE` | `NEUTRAL` | `NEGATIVE` | `MIXED` | `UNKNOWN`

### 5.3 Urgency Levels
- `HIGH`: Opt-outs (`DO_NOT_CONTACT`), Price inquiries (`ASKING_PRICE`), Meeting requests (`ASKING_FOR_CALL`).
- `MEDIUM`: Timing delays (`NEEDS_TIME`), Demo requests (`ASKING_FOR_DEMO`), Technical questions (`ASKING_FOR_DETAILS`).
- `LOW`: Rejections (`NOT_INTERESTED`), Existing websites (`ALREADY_HAS_WEBSITE`), Polite praise (`POSITIVE_GENERAL`).

---

## 6. Factual Safety & Anti-Hallucination Guardrails

- **Zero Hallucinated Metrics**: The intelligence engine never invents pricing figures, discounts, customer counts, fake meeting schedules, or promises.
- **Missing Context Safeguards**: When messages lack substantive information (e.g. single character or ambiguous phrases like "k"), the engine marks the intent as `UNCLEAR` with confidence $< 0.65$ and forces `requiresHumanReview = true`.
- **Grounded Key Signals**: All extracted `keySignals` are directly cited from the client's actual message text.

---

## 7. Deterministic Next Action Engine

Implemented in `src/lib/crm/nextActionEngine.ts`:

| Intent Category | Recommended Action | Priority | Suggested Follow-up Window |
|---|---|---|---|
| `DO_NOT_CONTACT` | `DO_NOT_CONTACT` | URGENT | N/A (Blacklisted) |
| `ASKING_PRICE` | `HUMAN_REPLY_REQUIRED` | HIGH | 1 Day |
| `ASKING_FOR_CALL` | `SCHEDULE_CALL` | HIGH / URGENT | 1 Day |
| `INTERESTED` | `HUMAN_REPLY_REQUIRED` | HIGH | 1 Day |
| `ASKING_FOR_DEMO` | `SEND_DEMO_LINK` | HIGH | 1 Day |
| `NEEDS_TIME` | `FOLLOW_UP_LATER` | MEDIUM | 7 Days |
| `POSITIVE_GENERAL` | `HUMAN_REPLY_REQUIRED` | MEDIUM | 2 Days |
| `NOT_INTERESTED` | `CLOSE_LEAD` | LOW | N/A (Archived) |
| `ALREADY_HAS_WEBSITE` | `CLOSE_LEAD` | LOW | N/A (Archived) |
| `UNCLEAR` / `CONFUSED` | `HUMAN_REVIEW` | MEDIUM | 1 Day |

**Absolute Safety Lock**: `automatedAction` is strictly `null` across all next action objects in Phase 12. No automated emails, SMS, or WhatsApp messages are dispatched.

---

## 8. Inbound Reply Simulation Engine

Implemented in `src/lib/crm/replySimulation.ts` and `src/lib/crm/crmRepository.ts`:
- **Scratch Storage Path**: `scratch/crm/`
  - `scratch/crm/conversations.json`: Global index of conversation threads.
  - `scratch/crm/messages.json`: Global index of inbound/outbound communication records.
  - `scratch/crm/timeline.json`: Global chronological event log.
  - `scratch/crm/lead_states.json`: Lead lifecycle status overrides and transition audit history.
- **Seeding from Phase 11**: Calling `simulateInboundReply` or opening `/admin/crm` automatically reads `scratch/outreach/outreach.json` and seeds the outbound message with preview URL metadata and status `OUTREACH_SENT`.

---

## 9. Admin CRM Console (`/admin/crm`)

Built with React 19 and Tailwind CSS:
- **3-Column Workspace**:
  1. **Left (Lead Directory)**: Search input, status filter pills, unread count badges, and real-time intent indicators.
  2. **Center (Conversation & Timeline)**: Visual chat thread distinguishing outbound outreach from inbound replies, linked preview URLs, and chronological audit markers.
  3. **Right (AI Reply Intelligence Inspector)**: Intent badge, sentiment badge, urgency badge, visual confidence meter, human review warning banner, intelligence summary, key signals, and recommended next action.
- **Interactive Simulation Modal**: "Simulate Incoming Reply" with one-click presets:
  - Price Inquiry
  - Call / Consultation Request
  - Demo Request
  - Needs Time
  - Already Has Website
  - Do Not Contact
  - Ambiguous ("k")
- **Manual Status Transition Bar**: Allows human operators to transition lead status with mandatory audit reason logging.

---

## 10. Automation API Endpoints

### 1. `POST /api/automation/simulate-reply`
- Ingests inbound reply, runs intelligence, updates status, and logs timeline event.
- Request: `{ leadId: string, channel?: string, messageText: string }`.
- Response: 200 OK with `message`, `conversation`, `analysis`, `nextAction`, `leadStatus`, and `handoffPhase: "phase13_autonomous_lead_pipeline"`.

### 2. `GET /api/automation/crm`
- Lists all leads that have entered the CRM pipeline with optional filters (`status`, `channel`, `search`, `userId`).

### 3. `GET /api/automation/crm/[leadId]`
- Retrieves full CRM state for a single lead: profile, active conversation, chat history, latest analysis, next action, and timeline.

### 4. `POST /api/automation/crm/[leadId]/analyze`
- Executes on-demand reply intelligence on custom text within the specific lead's business context.

### 5. `PATCH /api/automation/crm/[leadId]/status`
- Updates lead lifecycle state with audit transition history (`previousStatus`, `newStatus`, `reason`, `source: "admin"`).

---

## 11. Exported n8n Workflow Architecture

Exported to `automation/n8n/WebsiteBanja_Reply_Intelligence_CRM.json`:
- **Nodes**:
  1. `When Executed by Trigger`: Manual execution trigger.
  2. `Set Inbound Reply Parameters`: Sets `leadId`, `channel`, and `messageText`.
  3. `HTTP Request → Simulate Reply & Classify`: Calls `POST http://localhost:3000/api/automation/simulate-reply` with `$env.WEBSITEBANJA_AUTOMATION_SECRET`.
  4. `Is Price Inquiry?`: Evaluates `json.analysis.intent === "ASKING_PRICE"`.
  5. `Commercial Opportunity Route`: Routes pricing inquiries for priority handling.
  6. `Standard CRM Status Route`: Handles general replies and flags review cases.
- **Zero Secrets**: Uses only `$env.WEBSITEBANJA_AUTOMATION_SECRET`.

---

## 12. Security Hardening & Zero-Leakage Architecture

- **Authentication**: Strict validation of `x-automation-secret` or `Authorization: Bearer <secret>`.
- **Payload Limits**: 256KB request cap enforcing rejection with HTTP 413 `PAYLOAD_TOO_LARGE`.
- **Error Sanitization**: `sanitizeErrorOutput` masks internal stack traces and server variables.
- **SSRF & Network Isolation**: Zero outbound network requests; runs completely local.

---

## 13. Telemetry & Agent Event Logging

Registered 10 Phase 12 CRM events in `src/lib/telemetry/types.ts`:
- `reply_received` / `crm.reply.received`: Inbound message logged.
- `reply_analyzed` / `crm.reply.analyzed`: AI/heuristic classification complete.
- `reply_analysis_failed` / `crm.reply.analysis_failed`: Error during classification.
- `crm_status_changed` / `crm.status.changed`: Lead lifecycle state updated.
- `crm_action_recommended` / `crm.action.recommended`: Next action determined.

---

## 14. Live Endpoint Simulation Verification

Executed live `curl` verification against local development server:

### Test Case 1: Pricing Inquiry
```bash
curl -X POST http://localhost:3000/api/automation/simulate-reply \
  -H "Content-Type: application/json" \
  -H "x-automation-secret: wb-auto-secret-local-dev-2026" \
  -d '{"leadId":"lead_cc4f59e3d5e5","channel":"email","messageText":"Hi, I checked the preview. Looks interesting. What would something like this cost?"}'
```
**Output**: `intent: ASKING_PRICE`, `sentiment: POSITIVE`, `urgency: HIGH`, `confidence: 0.95`, `recommendedAction: HUMAN_REPLY_REQUIRED`, `leadStatus: INTERESTED`.

### Test Case 2: Already Has Website
```bash
curl -X POST http://localhost:3000/api/automation/simulate-reply \
  -H "Content-Type: application/json" \
  -H "x-automation-secret: wb-auto-secret-local-dev-2026" \
  -d '{"leadId":"lead_cc4f59e3d5e5","channel":"email","messageText":"Thanks, but we already have a website."}'
```
**Output**: `intent: ALREADY_HAS_WEBSITE`, `sentiment: NEUTRAL`, `urgency: LOW`, `confidence: 0.95`, `recommendedAction: CLOSE_LEAD`, `leadStatus: NOT_INTERESTED`.

### Test Case 3: Do Not Contact
```bash
curl -X POST http://localhost:3000/api/automation/simulate-reply \
  -H "Content-Type: application/json" \
  -H "x-automation-secret: wb-auto-secret-local-dev-2026" \
  -d '{"leadId":"lead_cc4f59e3d5e5","channel":"email","messageText":"Please don'\''t contact me again."}'
```
**Output**: `intent: DO_NOT_CONTACT`, `sentiment: NEGATIVE`, `urgency: HIGH`, `confidence: 0.98`, `recommendedAction: DO_NOT_CONTACT`, `leadStatus: DO_NOT_CONTACT`, `priority: URGENT`.

---

## 15. Confidence Scoring & Human Review Triggers

- **Confidence Threshold**: $\ge 0.65$ considered reliable for automated lifecycle transitions.
- **Ambiguous Syntax**: Short tokens ("k", "ok", "?") produce confidence $\approx 0.40$, automatically setting `requiresHumanReview = true` and `recommendedAction = "HUMAN_REVIEW"`.
- **Status Safeguard**: When confidence is $< 0.65$, lead status remains `REPLIED` with reason `"Pending operator verification"`, preventing erroneous auto-categorization.

---

## 16. Multi-Channel Support

The CRM data models and simulation pipeline support four distinct channels:
1. `email`: Handles structured formal replies with subject line metadata.
2. `whatsapp`: Supports fast conversational messages.
3. `instagram`: Supports social DM inquiries.
4. `sms`: Handles ultra-short responses.

---

## 17. Conversation Timeline & Audit Trail Integrity

Every state change creates an unalterable `CRMEvent` stored in `scratch/crm/timeline.json`:
- `LEAD_CREATED`
- `OUTREACH_DRAFTED`
- `OUTREACH_SIMULATED`
- `MESSAGE_RECEIVED`
- `REPLY_ANALYZED`
- `STATUS_CHANGED`
- `ACTION_RECOMMENDED`

Timeline events are strictly sorted chronologically by timestamp.

---

## 18. Multi-Tenant Isolation

- All repository queries and storage structures support optional `userId` scoping.
- Leads, conversations, and messages from one tenant are completely hidden from queries specifying another `userId`.

---

## 19. Phase 11 Handoff Integration & Lineage

The CRM repository automatically checks `scratch/outreach/outreach.json` and seeds:
1. Active conversation with `status: "WAITING_FOR_REPLY"`.
2. Outbound message containing the full personalized outreach text, subject line, and live preview URL.
3. Chronological timeline event `OUTREACH_SIMULATED`.
4. Initial lead status `OUTREACH_SENT`.

---

## 20. Phase 13 Autonomous Lead Pipeline Handoff Contract

Every reply analysis and simulation output packages the structured Phase 13 contract:
```typescript
export interface Phase13HandoffContract {
  leadId: string;
  businessName: string;
  channel: OutreachChannel;
  leadStatus: CRMLeadStatus;
  conversationId: string;
  latestInboundMessage: CRMMessage;
  intelligence: ReplyAnalysis;
  nextAction: NextAction;
  handoffPhase: "phase13_autonomous_lead_pipeline";
}
```

This contract equips Phase 13 to orchestrate autonomous pipeline loops, manage scheduled follow-ups, and trigger campaign workflows.

---

## 21. Test Suite Coverage & Verification Results

### Phase 12 Dedicated Test Suite
**Command**: `node --test tests/phase12_reply_intelligence_crm.test.mjs`
- **Suites**: 4
- **Tests**: 20
- **Pass Rate**: 100% (20 passed, 0 failed, 0 skipped)
- **Duration**: ~350ms

### Full Project Regression Test Suite (Phases 1 through 12)
**Command**: `node --test tests/phase1_hardening.test.mjs tests/phase2_telemetry.test.mjs tests/phase3_context.test.mjs tests/phase4_mitra.test.mjs tests/phase5_tools.test.mjs tests/phase6_generation.test.mjs tests/phase6_1_images.test.mjs tests/phase7_n8n_automation.test.mjs tests/phase8_business_discovery.test.mjs tests/phase9_research_audit.test.mjs tests/phase10_personalized_preview.test.mjs tests/phase11_personalized_outreach.test.mjs tests/phase12_reply_intelligence_crm.test.mjs`
- **Suites**: 41
- **Tests**: 208
- **Pass Rate**: 100% (208 passed, 0 failed, 0 skipped)
- **Duration**: ~10.6s

---

## 22. TypeScript Typecheck & Production Build Verification

1. **Typecheck (`npx tsc --noEmit`)**:
   - Exit Code: `0`
   - Diagnostic Errors: `0`
2. **Production Build (`npm run build`)**:
   - Exit Code: `0`
   - Output: Production build finalized successfully.
   - Verified Routes:
     - `○ /admin/crm`
     - `ƒ /api/automation/crm`
     - `ƒ /api/automation/crm/[leadId]`
     - `ƒ /api/automation/crm/[leadId]/analyze`
     - `ƒ /api/automation/crm/[leadId]/status`
     - `ƒ /api/automation/simulate-reply`

---

## 23. Local-Only Hard Lock Verification

- **Git Status**: 0 commits made, 0 pushes attempted.
- **Azure Deploys**: 0 deploys executed.
- **External Communications**: 0 real emails sent, 0 real WhatsApp messages sent, 0 real SMS sent, 0 phone calls placed.
- **Local Simulation**: All message dispatches and replies recorded strictly in `scratch/crm/`.

---

## 24. File Directory & Artifact Manifest

```
websitebanja/
├── automation/
│   └── n8n/
│       ├── README.md                                          [Updated with Phase 12]
│       └── WebsiteBanja_Reply_Intelligence_CRM.json           [Phase 12 n8n Workflow]
├── scratch/
│   └── crm/
│       ├── conversations.json                                 [CRM Conversations Index]
│       ├── messages.json                                      [CRM Messages Index]
│       ├── timeline.json                                      [CRM Timeline Events]
│       └── lead_states.json                                   [Lead Status Overrides]
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── crm/
│   │   │       └── page.tsx                                   [Admin CRM UI Console]
│   │   └── api/
│   │       └── automation/
│   │           ├── simulate-reply/
│   │           │   └── route.ts                               [POST Simulate Reply API]
│   │           └── crm/
│   │               ├── route.ts                               [GET CRM Leads List]
│   │               └── [leadId]/
│   │                   ├── route.ts                           [GET Lead CRM Details]
│   │                   ├── analyze/
│   │                   │   └── route.ts                       [POST Custom Text Analysis]
│   │                   └── status/
│   │                       └── route.ts                       [PATCH Lead CRM Status]
│   └── lib/
│       ├── crm/
│       │   ├── types.ts                                       [Canonical CRM Types]
│       │   ├── crmRepository.ts                               [Local CRM State Store]
│       │   ├── replyIntelligence.ts                           [Reply Intelligence Engine]
│       │   ├── nextActionEngine.ts                            [Deterministic Next Action]
│       │   └── replySimulation.ts                             [Reply Simulation Engine]
│       └── telemetry/
│           └── types.ts                                       [CRM Telemetry Event Types]
├── tests/
│   └── phase12_reply_intelligence_crm.test.mjs                [Dedicated 20-Test Suite]
└── phase12_reply_intelligence_crm_report.md                    [This Comprehensive Report]
```
