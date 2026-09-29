# WebsiteBanja — Local n8n Automation Foundation (Phase 7)

This directory contains the exported n8n workflow and configuration for triggering local preview website generation from n8n.

---

## 1. Prerequisites

- **Node.js**: v18+ (tested with Node v20/v22)
- **WebsiteBanja Local Server**: Running on `http://localhost:3000` (`npm run dev`)
- **n8n**: v1.x or v2.x (`npx n8n@latest` or global `npm install -g n8n`)

---

## 2. Directory Structure

```text
automation/n8n/
├── WebsiteBanja_Local_Preview_Generator.json           # Phase 7: Local Preview Generator
├── WebsiteBanja_Business_Discovery_Qualification.json # Phase 8: Business Discovery & Lead Qualification
├── WebsiteBanja_Business_Research_Website_Audit.json  # Phase 9: Business Research & Website Audit
├── WebsiteBanja_Personalized_Preview_Generation.json  # Phase 10: Personalized Preview Generation
├── WebsiteBanja_Personalized_Outreach_Draft.json     # Phase 11: Personalized Outreach Foundation
├── WebsiteBanja_Reply_Intelligence_CRM.json           # Phase 12: Reply Intelligence & CRM Processing
├── WebsiteBanja_Autonomous_Lead_Pipeline.json         # Phase 13: Autonomous Lead Pipeline Master Orchestrator
└── README.md                                           # Setup & runbook guide
```

---

## 3. Starting the Local n8n Server

Run n8n locally with strictly local binding, Safari cookie compatibility, and node environment variable access enabled:

```bash
# Recommended command for strict-local execution
N8N_SECURE_COOKIE=false \
N8N_HOST=localhost \
N8N_LISTEN_ADDRESS=127.0.0.1 \
N8N_PORT=5678 \
N8N_BLOCK_ENV_ACCESS_IN_NODE=false \
N8N_DIAGNOSTICS_ENABLED=false \
N8N_VERSION_NOTIFICATIONS_ENABLED=false \
N8N_HIRING_BANNER_ENABLED=false \
WEBSITEBANJA_AUTOMATION_SECRET="<your-local-automation-secret>" \
n8n start
```

Open your browser to: [http://localhost:5678](http://localhost:5678).

---

## 4. Automation Authentication Setup

WebsiteBanja's automation endpoint (`POST /api/automation/generate-preview`) requires authentication via the `x-automation-secret` header or `Authorization: Bearer <secret>`.

There are two supported ways to supply this secret in local development:

### Approach A: Local Environment Variable (Recommended & Default)
When n8n is launched with `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` and `WEBSITEBANJA_AUTOMATION_SECRET`, the workflow's HTTP Request node automatically reads:
```javascript
{{ $env.WEBSITEBANJA_AUTOMATION_SECRET }}
```
Zero credential configuration in the n8n UI is required.

### Approach B: n8n Header Auth Credential (UI-Managed)
If you prefer managing secrets inside the n8n UI:
1. In n8n, navigate to **Credentials** → **New Credential**.
2. Select **Header Auth**.
3. Set **Name**: `x-automation-secret`.
4. Set **Value**: `<your-local-automation-secret>`.
5. In the `HTTP Request → WebsiteBanja` node:
   - Change **Authentication** to **Generic Credential Type**.
   - Select **Generic Auth Type** → **Header Auth**.
   - Select your saved credential.

---

## 5. Importing & Executing the Workflow

1. Open n8n at `http://localhost:5678`.
2. Go to **Workflows** → Click **Add workflow** (or press `Cmd/Ctrl + O`).
3. Click **Import from File...** and select `automation/n8n/WebsiteBanja_Local_Preview_Generator.json`.
4. Click **Test Step** or **Execute Workflow**.
5. The workflow will:
   - Load sample business data (`Astra Coffee House`, Vadodara).
   - Send payload to `http://localhost:3000/api/automation/generate-preview`.
   - Validate and run the Phase 6 premium website generation engine with Phase 6.1 image deduplication.
   - Return a live local preview URL: `http://localhost:3000/preview/:id`.
   - Format the final output in the `Format Preview Result` node.

---

## 6. Expected Preview Response

```json
{
  "success": true,
  "status": "preview",
  "business": {
    "name": "Astra Coffee House",
    "industry": "restaurant",
    "category": "Restaurant & Fine Dining",
    "location": "Vadodara, Gujarat"
  },
  "preview": {
    "id": "prev_astra-coffee-house_b7de41f3",
    "slug": "astra-coffee-house-b7de41f3",
    "url": "http://localhost:3000/preview/prev_astra-coffee-house_b7de41f3"
  },
  "design": {
    "archetype": "warm_artisanal",
    "heroType": "fullscreen_visual",
    "colorMood": "warm_artisanal",
    "sectionCount": 8,
    "qualityScore": 100
  },
  "generation": {
    "requestId": "req_auto_...",
    "model": "websitebanja-premium-engine",
    "durationMs": 6
  }
}
```

---

## 7. Troubleshooting

- **Error: "access to env vars denied"**:
  In modern n8n versions, accessing `$env` in expressions is blocked by default. Restart n8n with `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`.
- **Error: Safari Cookie Issues**:
  Safari rejects secure cookies over unencrypted local HTTP. Start n8n with `N8N_SECURE_COOKIE=false`.
- **Error: 401 Unauthorized**:
  Ensure the secret provided in `x-automation-secret` matches `WEBSITEBANJA_AUTOMATION_SECRET` configured in your Next.js environment.
- **Error: ECONNREFUSED 127.0.0.1:3000**:
  Ensure the Next.js development server is running (`npm run dev`) before executing the n8n workflow.
- **Port 5678 already in use**:
  Start n8n on an alternative port: `N8N_PORT=5679 n8n start`.

---

## 8. Stopping n8n
Press `Ctrl + C` in the terminal where n8n is running.
