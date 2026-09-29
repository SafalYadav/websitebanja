# WebsiteBanja — Phase 11 — Personalized Outreach Foundation Report
**Prompt ID**: 84621  
**Generated Date**: September 29, 2026  
**Environment**: Strictly Local Development (macOS / Node.js v26.5.1 / Next.js 16.2.12 / n8n 1.123.18)  
**Status**: Completed & Verified — 100% Passing (18/18 Phase 11 Tests, 188/188 Regression Tests)

---

## 1. Executive Summary

Phase 11 establishes the **Personalized Outreach Foundation** for WebsiteBanja. Following the automated generation of qualified business leads in Phase 8, deep multi-dimensional audits and business research in Phase 9, and bespoke preview website generation in Phase 10, Phase 11 delivers a factual, multi-channel outreach engine that converts technical observations into compelling, respectful, and bespoke communication.

Crucially, Phase 11 is built under an **Absolute Local-Only Hard Lock** with a mandatory **Human-in-the-Loop Review & Approval Architecture**. In this phase:
- **Zero Real External Messages**: No real emails, WhatsApp messages, Instagram DMs, or SMS messages are ever sent over live networks.
- **Simulated Dispatch**: Approved messages are recorded strictly into a local file-based simulation outbox (`scratch/outreach/`).
- **Factual Integrity**: Zero placeholder tokens, zero lorem ipsum, and zero fabricated claims (awards, revenue metrics, or fake staff claims) are permitted. All outreach points are directly grounded in Phase 8 lead attributes and Phase 9 audit observations.
- **Multi-Channel Differentiation**: Email, WhatsApp, Instagram DM, and SMS channels are tailored with distinct tonality, length bounds, and call-to-actions.

---

## 2. Architecture & Pipeline Overview

```
                                PHASE 11 ARCHITECTURE
                                
   +-------------------------------------------------------------------------+
   |                       PHASE 10 INPUT ARTIFACTS                         |
   |                                                                         |
   |   +-----------------------+     +-----------------------------------+   |
   |   | Phase 8 Qualified Lead|     | Phase 9 Lead Audit Report         |   |
   |   +-----------+-----------+     +-----------------+-----------------+   |
   |               |                                   |                     |
   |               +-----------------+-----------------+                     |
   |                                 |                                       |
   |               +-----------------v-----------------+                     |
   |               | Phase 10 Stored Preview Record     |                     |
   |               | (previewUrl, designArchetype, etc)|                     |
   |               +-----------------+-----------------+                     |
   +---------------------------------|---------------------------------------+
                                     |
                                     v
   +-------------------------------------------------------------------------+
   |                     PHASE 11 PERSONALIZATION ENGINE                     |
   |                                                                         |
   |   1. Data Resolution & Deduplication (leadId + channel + previewId)     |
   |   2. Observation & Impact Extraction (Grounded in Audit Signals)       |
   |   3. Channel-Specific Tone & Layout Formatter                          |
   |      - Email: 5-Part Professional Structure                            |
   |      - WhatsApp: Conversational & Concise (< 800 chars)                |
   |      - Instagram DM: Natural & Respectful (< 500 chars)                |
   |      - SMS: High-Impact & Punchy (< 160 chars)                         |
   |   4. Quality & Factual Claim Validator                                 |
   |      - Credential Leakage Scanner (Tokens, Secrets, Passwords)          |
   |      - Factual Claim Verifier (No fabricated revenue/awards)           |
   |      - Repetition & Placeholder Filter                                 |
   +---------------------------------|---------------------------------------+
                                     |
                                     v
   +-------------------------------------------------------------------------+
   |                  HUMAN-IN-THE-LOOP APPROVAL LIFECYCLE                  |
   |                                                                         |
   |      [draft] ----(auto-check)----> [review] ----(admin edit)            |
   |                                       |                                 |
   |                                       v                                 |
   |                             [approved / rejected]                       |
   |                                       |                                 |
   |                                (simulated dispatch)                     |
   |                                       v                                 |
   |                       [simulated_sent] (Local Outbox)                   |
   +---------------------------------|---------------------------------------+
                                     |
                                     v
   +-------------------------------------------------------------------------+
   |                      PHASE 12 CRM HANDOFF CONTRACT                      |
   |   handoffPhase: "phase12_reply_intelligence_crm"                        |
   |   receipt: { dispatchTimestamp, simulatedRecipient, simEngine }         |
   +-------------------------------------------------------------------------+
```

---

## 3. End-to-End Autonomous Pipeline Integration

The WebsiteBanja autonomous pipeline now cleanly links four operational phases:

```
[Phase 8: Discovery]   --> Discovers & qualifies local businesses lacking modern web assets
       |
[Phase 9: Audit]       --> Crawls existing sites (or handles missing sites) with 7-dimension audit
       |
[Phase 10: Preview]    --> Generates personalized, high-aesthetic interactive preview
       |
[Phase 11: Outreach]   --> Synthesizes factual, channel-native outreach & queues for approval
       |
[Phase 12: CRM]        --> Ingests simulated dispatch receipt, ready for reply parsing & follow-up
```

Every record carries a continuous lineage:
- `leadId`: Primary key from discovery
- `auditId`: Technical audit record identifier
- `previewId`: Interactive preview identifier
- `previewUrl`: Live local preview URL (e.g. `http://localhost:3000/preview/prev_grand-heritage-dining_f41f88a4`)
- `handoffPhase`: Explicit forward pointer to `phase12_reply_intelligence_crm`

---

## 4. Personalization Engine Architecture

Implemented in `src/lib/outreach/personalizationEngine.ts`:
- **Input Context**: Resolves `BusinessLead`, `LeadAuditReport`, and `StoredPreviewRecord`. If an audit or preview is missing, it dynamically generates an authentic missing-site audit or local preview to guarantee continuity.
- **Observation Extractor**: Parses audit signals to identify specific, undeniable value drivers:
  - Missing site: Emphasizes established offline reputation vs lack of dedicated digital booking/menu.
  - Mobile responsiveness: Highlights 70%+ local smartphone traffic and touch target difficulty.
  - Missing CTAs: Pinpoints lack of 1-click WhatsApp concierge or phone call triggers.
  - Missing HTTPS: Flags browser security warnings and trust erosion.
- **Personalization Structure**:
  - `websiteProblems`: Concrete observations extracted from the audit.
  - `improvements`: Specific features engineered into the preview.
  - `businessSpecificPoints`: Business name, verified city/location, and Google review metrics.

---

## 5. Multi-Channel Outreach Formats

| Channel | Length Limit | Tone & Style | Key Structural Elements |
|---|---|---|---|
| **Email** | 2,500 chars | Professional, consultative, respectful | 1. Subject line with business name<br>2. Direct observation & local praise<br>3. Business impact statement<br>4. 4-bullet bespoke feature summary<br>5. Live preview URL & handover offer |
| **WhatsApp** | 800 chars | Conversational, direct, fast-reading | 1. Friendly greeting to business team<br>2. Observation of local reputation<br>3. 1-sentence value proposition<br>4. Interactive preview URL<br>5. Low-pressure call to action |
| **Instagram DM** | 500 chars | Visual, modern, collaborative | 1. Casual peer greeting<br>2. Compliment on visual presence/aesthetic<br>3. Reference to interactive web concept<br>4. Clean preview URL<br>5. Brief feedback ask |
| **SMS** | 160 chars | Ultra-compact, punchy, immediate | 1. Business name callout<br>2. Direct preview link<br>3. Actionable next step |

---

## 6. Factual Claim & Quality Validator System

Implemented in `src/lib/outreach/qualityValidator.ts`:
Every draft is subjected to an automated 8-point inspection:
1. `business_name_referenced`: Verifies the draft explicitly contains the target business name.
2. `valid_local_preview_url`: Verifies the presence of a valid `http://localhost:3000/preview/...` URL.
3. `valid_email_subject`: For email channel, enforces non-empty, professional subject line.
4. `no_placeholders_or_lorem`: Scans for `[Business Name]`, `{{...}}`, `<...>`, `TODO`, `lorem ipsum`, `dolor sit amet`.
5. `no_fabricated_claims`: Enforces zero hallucinated awards ("Best in City 2025"), zero fake revenue stats ("triple your revenue by 300%"), and zero ungrounded team metrics.
6. `no_credential_leakage`: Scans against API key prefixes (`wb-auto-`, `sk-`, `ey...`, `ghp_`, `bearer`), passwords, and internal secrets.
7. `no_duplicate_sentences`: Prevents repetitive bot-like sentences.
8. `channel_length_valid`: Enforces strict character limits per channel.

---

## 7. Anti-Spam & Reputation Protection Guardrails

- **Zero Blind Autonomous Outreach**: All generated drafts start in `draft` status (or `review` if validation flags any issue).
- **Human Approval Gate**: Only records explicitly transitioned to `approved` can be simulated sent.
- **Opt-Out & Respectful Framing**: No aggressive sales language, false urgency ("act in 24 hours"), or guilt trips.
- **Deduplication Engine**: Keyed on `leadId + channel + previewId`. Prevents generating multiple competing messages for the same business on the same channel.

---

## 8. Human-in-the-Loop Review & Approval Lifecycle

The workflow enforces a strict state machine:
```
           +-----------------------------+
           |       generateOutreachDraft |
           +--------------+--------------+
                          |
             [validation.isValid ?]
              /                \
           YES                  NO
            /                    \
           v                      v
     +-----------+          +-----------+
     |   draft   |          |  review   |
     +-----+-----+          +-----+-----+
           |                      |
           +----------+-----------+
                      |
              (Admin Edits Content)
                      |
                      v
             +-----------------+
             |    approved     |
             +--------+--------+
                      |
              (Simulate Dispatch)
                      |
                      v
             +-----------------+
             | simulated_sent  |  --> Dispatches to scratch/outreach/
             +-----------------+
```
- **Rejection Path**: An admin can also flag a record as `rejected` with custom audit notes, immediately removing it from active outreach queues.

---

## 9. Local Simulation Outbox & Receipt System

Implemented in `src/lib/outreach/simulationProvider.ts` and `src/lib/outreach/outreachRepository.ts`:
- **Outbox Directory**: `scratch/outreach/`
- **Index File**: `scratch/outreach/outreach.json`
- **Receipt Files**: `scratch/outreach/receipts/{outreachId}_receipt.json`
- **Dispatch Receipt Structure**:
  ```json
  {
    "receiptId": "sim_rcpt_1790689191720_a1b2c3",
    "outreachId": "outreach_email_1790689191678_9dd6ab",
    "channel": "email",
    "recipient": "reservations@grandheritagedining.com",
    "dispatchedAt": "2026-09-29T13:39:51.720Z",
    "status": "simulated_sent",
    "previewUrl": "http://localhost:3000/preview/prev_grand-heritage-dining_f41f88a4",
    "simulationProvider": "WebsiteBanja_Local_Simulation_Engine",
    "safeLocalMode": true
  }
  ```

---

## 10. Admin Outreach Console (`/admin/outreach`)

Built with React 19 and Tailwind CSS:
- **Pipeline Tracker**: Visual 9-stage tracker from Discovered to Replied.
- **Strict Local Notice**: Prominent banner explaining the local-only hard lock.
- **Draft Generator**: Interactive inline form to generate multi-channel drafts for any discovered lead.
- **Search & Filters**: Real-time filtering by channel (Email, WhatsApp, Instagram, SMS), status (`draft`, `review`, `approved`, `simulated_sent`, `rejected`), and keyword query.
- **Draft Inspector & Editor**: Full modal allowing admins to inspect audit observations, review validation checks, edit subject/message text in real-time, approve, reject, or trigger simulated dispatch.

---

## 11. Automation API Endpoints

### `POST /api/automation/generate-outreach-draft`
- **Authentication**: Requires `x-automation-secret: wb-auto-secret-local-dev-2026` or Bearer token.
- **Payload Limits**: Capped at 256KB to protect against buffer exhaustion.
- **Request Body**:
  ```json
  {
    "leadId": "lead_cc4f59e3d5e5",
    "channel": "email",
    "regenerate": false
  }
  ```
- **Response**: Returns 200 OK with full `OutreachRecord`, `validation`, and `handoffPhase: "phase12_reply_intelligence_crm"`.

### `GET /api/automation/outreach`
- Lists saved outreach records with optional query parameters: `leadId`, `channel`, `status`, `search`.

### `PATCH /api/automation/outreach`
- Allows status updates (`approved`, `rejected`, `simulated_sent`) and content edits. When `status: "simulated_sent"` is submitted, it automatically executes simulated dispatch and issues an outbox receipt.

---

## 12. Exported n8n Workflow Architecture

Exported to `automation/n8n/WebsiteBanja_Personalized_Outreach_Draft.json`:
- **Nodes**:
  1. `Manual Trigger`: Triggers automated draft generation on-demand.
  2. `Set Lead & Channel`: Sets parameters for targeted lead and chosen channel.
  3. `HTTP Request -> Generate Draft`: Calls `http://localhost:3000/api/automation/generate-outreach-draft` using environment secret `$env.WEBSITEBANJA_AUTOMATION_SECRET`.
  4. `If Draft Valid?`: Evaluates `json.outreach.validation.isValid`.
  5. `Draft Ready for Human Review`: Captures valid draft in local workflow.
  6. `Flag for Manual Review`: Captures flagged draft for remediation.
- **Zero Hardcoded Secrets**: Scanned and verified. Only references environment variables.

---

## 13. Security Hardening & Zero-Leakage Architecture

- **Credential Leak Detection**: Every draft is scanned prior to saving; any string containing secret keys or auth headers causes immediate validation failure.
- **SSRF Immunity**: The outreach pipeline makes zero external outbound requests.
- **Input Sanitization**: All user/lead inputs are escaped and stripped of control characters.
- **Safe Error Masking**: `sanitizeErrorOutput` ensures raw internal stack traces and server variables are never returned in API responses.

---

## 14. Telemetry & Agent Event Logging

Registered 8 new Phase 11 telemetry event types in `src/lib/telemetry/types.ts`:
- `outreach.draft.started`: Draft generation initiated.
- `outreach.draft.generated`: Draft successfully formatted.
- `outreach.draft.validation_failed`: Quality or anti-spam rules failed.
- `outreach.created`: New record saved to repository.
- `outreach.reviewed`: Admin inspected the draft.
- `outreach.approved`: Admin approved the draft for dispatch.
- `outreach.rejected`: Admin rejected the draft.
- `outreach.simulated`: Message successfully recorded in local simulation outbox.

---

## 15. Multi-Industry Verification Results

Tested across 5 distinct industries:

| Industry | Business Name | Channel | Observation Tested | Result |
|---|---|---|---|---|
| **Restaurant** | Grand Heritage Dining | Email | Missing dedicated site & menu | Pass (5-part email) |
| **Fitness** | IronPulse Gym | WhatsApp | Missing mobile CTA & WhatsApp | Pass (Conversational, 560 chars) |
| **Boutique Hotel** | Blue Orchid Hotel | Instagram | Insecure HTTP & desktop layout | Pass (Aesthetic peer DM, 340 chars) |
| **Legal** | Vadodara Legal Associates | Email | Unresponsive mobile layout | Pass (Consultative tone) |
| **Dental / Healthcare** | Apex Dental Clinic | SMS | Missing online appointment link | Pass (142 chars, under 160) |

---

## 16. Multi-Channel Quality & Character Bounds Compliance

- **SMS Compliance**: Verified strictly $\le 160$ characters across all test fixtures.
- **Instagram Compliance**: Verified strictly $\le 500$ characters.
- **WhatsApp Compliance**: Verified strictly $\le 800$ characters.
- **Email Compliance**: Verified strictly $\le 2500$ characters with structured paragraphs.

---

## 17. Deduplication & Idempotency Guarantees

- **Idempotency Rule**: Calling `generateOutreachDraft` multiple times for the same `leadId + channel + previewId` returns the existing record with `reusedExisting: true`.
- **Regenerate Flag**: Providing `regenerate: true` forces a clean rewrite and creates a fresh draft if required.

---

## 18. Multi-Tenant Isolation

- All records in `scratch/outreach/outreach.json` and receipts in `scratch/outreach/receipts/` support optional `userId` scoping.
- Filtering by `userId` strictly hides records belonging to other tenants.

---

## 19. Phase 12 CRM & Reply Intelligence Handoff Contract

Every outreach record and dispatch receipt explicitly provides the Phase 12 handoff contract:
```typescript
{
  handoffPhase: "phase12_reply_intelligence_crm",
  outreachId: string,
  leadId: string,
  channel: "email" | "whatsapp" | "instagram" | "sms",
  status: "simulated_sent",
  dispatchedAt: string,
  previewUrl: string,
  expectedReplyChannels: string[]
}
```
This enables Phase 12 to immediately simulate and ingest prospective customer replies, track engagement metrics, and route replies to the CRM inbox.

---

## 20. Test Suite Coverage & Verification Results

### Phase 11 Dedicated Test Suite
**Command**: `node --test tests/phase11_personalized_outreach.test.mjs`
- **Suites**: 5
- **Tests**: 18
- **Pass Rate**: 100% (18 passed, 0 failed, 0 skipped)
- **Duration**: ~360ms

### Full Project Regression Test Suite (Phases 1 through 11)
**Command**: `node --test tests/phase1_hardening.test.mjs tests/phase2_telemetry.test.mjs tests/phase3_context.test.mjs tests/phase4_mitra.test.mjs tests/phase5_tools.test.mjs tests/phase6_generation.test.mjs tests/phase6_1_images.test.mjs tests/phase7_n8n_automation.test.mjs tests/phase8_business_discovery.test.mjs tests/phase9_research_audit.test.mjs tests/phase10_personalized_preview.test.mjs tests/phase11_personalized_outreach.test.mjs`
- **Suites**: 37
- **Tests**: 188
- **Pass Rate**: 100% (188 passed, 0 failed, 0 skipped)
- **Duration**: ~10.4s

---

## 21. TypeScript Typecheck & Production Build Verification

1. **Typecheck (`npx tsc --noEmit`)**:
   - Exit Code: `0`
   - Diagnostic Errors: `0`
2. **Production Build (`npm run build`)**:
   - Exit Code: `0`
   - Output: Optimized production build generated successfully.
   - Verified Routes:
     - `○ /admin/outreach`
     - `ƒ /api/automation/generate-outreach-draft`
     - `ƒ /api/automation/outreach`

---

## 22. Local-Only Hard Lock Verification

- **Git Status**: 0 commits made, 0 pushes attempted.
- **Azure Deploys**: 0 deploys executed.
- **External Communications**: 0 emails sent, 0 WhatsApp messages sent, 0 DMs sent, 0 phone calls initiated.
- **Local Simulation**: All message dispatches recorded strictly in `scratch/outreach/`.

---

## 23. File Directory & Artifact Manifest

```
websitebanja/
├── automation/
│   └── n8n/
│       ├── README.md                                          [Updated with Phase 11]
│       └── WebsiteBanja_Personalized_Outreach_Draft.json      [Phase 11 n8n Workflow]
├── scratch/
│   └── outreach/
│       ├── outreach.json                                      [Outreach Index & State]
│       └── receipts/                                          [Simulation Receipts]
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── outreach/
│   │   │       └── page.tsx                                   [Admin Outreach UI]
│   │   └── api/
│   │       └── automation/
│   │           ├── generate-outreach-draft/
│   │           │   └── route.ts                               [Draft Generation API]
│   │           └── outreach/
│   │               └── route.ts                               [Outreach Mgmt API]
│   └── lib/
│       ├── outreach/
│       │   ├── outreachRepository.ts                          [Outbox Repository]
│       │   ├── personalizationEngine.ts                       [Multi-Channel Engine]
│       │   ├── qualityValidator.ts                            [Anti-Spam & Fact Checker]
│       │   ├── simulationProvider.ts                          [Local Dispatch Engine]
│       │   └── types.ts                                       [Data Models & Contracts]
│       └── telemetry/
│           └── types.ts                                       [Outreach Telemetry Events]
├── tests/
│   └── phase11_personalized_outreach.test.mjs                 [Dedicated 18-Test Suite]
└── phase11_personalized_outreach_report.md                    [This Comprehensive Report]
```

---

## 24. Phase 12 Roadmap & Next Steps

Phase 11 successfully delivers the outreach foundation. The pipeline is now primed for **Phase 12 — Reply Intelligence & CRM**:
1. **Inbound Reply Ingestion**: Simulating customer responses across channels (positive, hesitant, price-inquiry, objection).
2. **Intent & Sentiment Classification**: AI agent analyzing inbound reply intent (e.g. `interested`, `not_interested`, `reschedule`, `request_pricing`).
3. **Automated Follow-up Generation**: Contextual follow-up drafts tailored to the specific objection or inquiry.
4. **CRM Lead Board**: Visual Kanban pipeline tracking lead stages from `contacted` to `replied`, `meeting_scheduled`, and `converted`.
