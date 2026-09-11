# WebsiteBanja AI — Canonical Project Architecture

## Overview
WebsiteBanja AI is an autonomous AI website creation platform that designs, plans, and synthesizes production-ready websites for Indian and global businesses. Users interact either through a conversational AI agent or a structured business details intake.

---

## Canonical Technology Stack

| Layer | Technology | Architectural Role |
| :--- | :--- | :--- |
| **Product** | WebsiteBanja AI | Autonomous AI Website Studio |
| **Authentication** | **Supabase Auth** | User signup, session tokens, JWTs, OAuth. (*Auth is the ONLY Supabase service active.*) |
| **Database** | **Azure PostgreSQL** | Azure Database for PostgreSQL Flexible Server. All project, version, preview, catalog, knowledge, and analytics persistence via connection pooling (`pg.Pool`). |
| **Storage** | **Azure Blob Storage** | Multi-tenant project workspace state (`project-workspaces` container) via Azure Storage Blob SDK (`@azure/storage-blob`). |
| **Hosting** | **Azure Container Apps** | Containerized server runtime with Docker / Node.js 20, zero Vercel dependencies. |
| **Primary AI Engine** | **OpenAI Responses API** | Structured generation endpoints with strict JSON outputs and tool calling. |
| **Generation Model** | **GPT-5.6 Luna** (`gpt-5.6-luna`) | Primary model for full website synthesis, component planning, and copilot edits. |
| **Design Intelligence** | **OpenAI Hosted Skills** | 19 modular design intelligence skills + Master Orchestrator (`SKILL.md`) dynamically injected based on user prompt, business category, and explicit cues. |
| **Voice / Agent** | **Gemini Multi-turn & Live API** | Interactive conversational intake, voice streaming, and requirement extraction. |
| **Frontend Framework** | **Next.js 15 (App Router)** | React Server Components, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons. |

---

## Website Generation Pipeline

```
Browser (User Intake)
       │
       ▼
Supabase Auth (JWT verification & session check)
       │
       ▼
Next.js API Route (/api/plan, /api/generate)
       │
       ▼
Intake & Business Validation (validateBusinessInputs, PII quarantine)
       │
       ▼
Dynamic Skill Selection (skillSelector evaluates category, intent, cues)
       │
       ▼
OpenAI Responses API + GPT-5.6 Luna
       │
       ▼
OpenAI Hosted Skills Injection (token-budgeted, maximum 10 skills)
       │
       ▼
Website JSON Synthesis (pages, components, themes, design tokens)
       │
       ▼
Post-Generation Validation (AST validation, contrast checks, responsive rules)
       │
       ▼
Persistence Layer
 ├─ Database: Azure PostgreSQL (projects, published_versions, preview_links, catalog_items)
 └─ Storage: Azure Blob Storage (project-workspaces/.websitebanja/)
       │
       ▼
Studio Workspace / Live Preview
```

---

## Intentionally Decommissioned Components

| Component | Status | Rationale |
| :--- | :--- | :--- |
| **Supabase Database** | **Completely Removed** | All application data, relational tables, and stored functions have been migrated to Azure PostgreSQL. Zero `supabase.from()` or `supabase.rpc()` calls remain. |
| **Supabase Storage** | **Completely Removed** | All object storage (`project-workspaces`) is served directly by Azure Blob Storage via `@azure/storage-blob`. |
| **Vercel** | **Completely Removed** | The application is hosted on Azure Container Apps. All Vercel-specific headers (`x-vercel-forwarded-for`), configurations (`.vercel/`), and documentation references have been removed. |
| **Templates / Showcase** | **Permanently Removed** | WebsiteBanja AI creates bespoke autonomous designs tailored to each business. Fixed template catalogs and static showcase galleries have been intentionally eliminated. |
| **Start with a Prompt** | **Removed** | Customer onboarding offers two balanced, neutral paths: **Talk with AI Agent** or **Use Business Details**. |

---

## Key Architectural Decisions & WHY Comments

1. **Supabase Auth Isolation**: Supabase Auth remains as the identity provider while all data persistence is on Azure PostgreSQL. This clean decoupling ensures user sessions remain stable while eliminating proprietary database lock-in.
2. **Dynamic Skill Selection (0.65 threshold)**: Prevents irrelevant design directives (e.g. 3D WebGL or heavy GSAP animations) from polluting clean, fast-loading business websites while guaranteeing foundational skills (UI/UX, Typography, Responsive Design, Accessibility) are always present.
3. **Storage Container Virtual Directories**: A single Azure Blob container (`project-workspaces`) hosts all multi-tenant projects using virtual directories (`${projectId}/.websitebanja/`). This avoids container proliferation while providing strict tenant isolation.
4. **Rate Limit Key Separation**: `ai_plan_usage_*` (lightweight planning) is isolated from `ai_usage_*` (heavy generation), preventing planning iterations from burning user generation credits.
5. **maxDuration = 120**: Long LLM reasoning and code synthesis cycles are protected from premature proxy/ingress termination in container environments.
6. **INR-Only Pricing**: Transparent Indian market alignment (₹0 Free Starter, ₹500/mo Paid Pro) with zero dollar confusion.
