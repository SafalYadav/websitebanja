# WebsiteBanja Phase 22 — n8n Ops Agent

## Overview

The **n8n Ops Agent** represents the tactical execution layer for WebsiteBanja. 

```
                 👑 WebsiteBanja CEO (Brain / Intelligence / Memory)
                               │
                               │ Task Envelope (`CeoN8nTaskDispatch`)
                               ▼
                        ⚙️ n8n Ops Agent
                               │
        ┌──────────────┬───────┴──────┬──────────────┐
        ▼              ▼              ▼              ▼
   Lead Discovery  Audit & Preview  Outreach Draft  Reply / CRM
   (SERP / Places) (Design & QA)   (Approval Gate)  (State Machine)
        │              │              │              │
        └──────────────┴───────┬──────┴──────────────┘
                               │
                               ▼
                   Executive Callback (`N8nCeoTaskCallback`)
                               │
                               ▼
                     CEO Memory & Learning
```

### Architectural Principles
1. **Brain vs. Muscle Separation**:
   - **WebsiteBanja**: Holds long-term strategic memory, executive decision policies, lessons learned, and qualification algorithms.
   - **n8n**: Orchestrates external APIs, scheduling, event webhooks, and retry pipelines.
2. **Safety & Policy Invariants**:
   - **WhatsApp**: Strictly disabled across all nodes and tools.
   - **Email Outreach**: Dispatching live emails is never automatic. Outreach creation generates a draft and marks `approvalRequired: true`.
   - **Opt-Out Compliance**: Any lead with status `DO_NOT_CONTACT` is rejected from follow-up schedules.
   - **Secret Scrubbing**: All logs, prompts, and memory payloads pass through automated secret redaction.

---

## Tool Catalog & Workflow Files

Located in `automation/n8n/ops/`:

| Workflow File | Tool Name | Description |
|---|---|---|
| `WB_Ops_Agent_Main.json` | *Main Orchestrator* | Receives CEO task dispatch, invokes Gemini AI Agent, calls sub-tools, sends callback to CEO. |
| `WB_Ops_Agent_Discovery.json` | `discover_leads` | Searches and discovers local businesses via SERP / Google Places. |
| `WB_Ops_Agent_Qualification.json` | `qualify_lead` | Scores lead viability, website gap, and business opportunity. |
| `WB_Ops_Agent_Research.json` | `research_business` | Analyzes business history, hours, reviews, and offering. |
| `WB_Ops_Agent_Audit.json` | `audit_website` | Audits existing website for SEO, mobile usability, speed, and CTA issues. |
| `WB_Ops_Agent_Preview.json` | `generate_preview` | Generates a modern personalized website preview. |
| `WB_Ops_Agent_Validation.json` | `validate_preview` | Validates preview quality score, contrast, and structure. |
| `WB_Ops_Agent_Outreach_Draft.json` | `create_outreach` | Generates personalized outreach copy with human approval gate. |
| `WB_Ops_Agent_Reply_Intelligence.json` | `analyze_reply` | Extracts sentiment, intent, objections, and urgency from prospect replies. |
| `WB_Ops_Agent_Followup.json` | `schedule_followup` | Queues automated follow-ups compliant with cadence limits. |
| `WB_Ops_Agent_CRM.json` | `update_crm` / `get_lead_status` | Updates pipeline stage, CRM status, and event timeline. |
| `WB_Ops_Agent_CEO_Report.json` | `report_to_ceo` | Summarizes operational results directly back to CEO memory store. |

---

## API Endpoints

All tool execution requests require authentication header `x-automation-secret: <AUTOMATION_SECRET>`.

### 1. Tool Execution: `POST /api/automation/ops`
Executes any of the 12 approved operational tools.
```bash
curl -X POST http://localhost:3000/api/automation/ops \
  -H "Content-Type: application/json" \
  -H "x-automation-secret: your_automation_secret" \
  -d '{
    "tool": "discover_leads",
    "input": { "location": "Kathmandu", "niche": "dental", "limit": 5 },
    "requestId": "req_123",
    "taskId": "task_456"
  }'
```

### 2. CEO Task Dispatch: `POST /api/automation/ops/dispatch`
Called by the CEO to dispatch an operational directive to n8n (or local fallback).
```bash
curl -X POST http://localhost:3000/api/automation/ops/dispatch \
  -H "Content-Type: application/json" \
  -H "x-automation-secret: your_automation_secret" \
  -d '{
    "taskId": "task_ops_001",
    "objective": "Discover and audit 3 boutique dental clinics in Kathmandu",
    "allowedTools": ["discover_leads", "qualify_lead", "audit_website", "report_to_ceo"],
    "priority": "high"
  }'
```

### 3. CEO Callback: `POST /api/automation/ops/callback`
Called by n8n Ops Agent upon completing an operational workflow.
```bash
curl -X POST http://localhost:3000/api/automation/ops/callback \
  -H "Content-Type: application/json" \
  -H "x-automation-secret: your_automation_secret" \
  -d '{
    "taskId": "task_ops_001",
    "status": "completed",
    "summary": "Discovered 3 dental clinics and generated audits.",
    "actions": [
      { "tool": "discover_leads", "status": "success", "timestamp": "2026-10-01T12:00:00Z" }
    ],
    "results": {},
    "failures": [],
    "approvalRequired": false,
    "evidence": [
      { "source": "SERP", "description": "Found 3 verified clinics", "verified": true }
    ],
    "timestamp": "2026-10-01T12:05:00Z"
  }'
```

---

## Environment Configuration

In your n8n instance or `.env`:
```env
# WebsiteBanja Connection
WEBSITEBANJA_API_URL=http://localhost:3000
AUTOMATION_SECRET=your_configured_secret_key

# n8n Webhook Endpoint (WebsiteBanja -> n8n)
N8N_OPS_AGENT_WEBHOOK_URL=http://localhost:5678/webhook/wb-ops-agent

# Model Credentials
GEMINI_API_KEY=your_gemini_api_key
```
