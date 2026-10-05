# WebsiteBanja AI — Canonical Architecture & System Blueprint

**Document Version**: 3.0.0  
**Effective Date**: October 2026  
**Status**: Authoritative Production Reference  

---

## 1. Executive Summary & Core Product Mission

WebsiteBanja is an autonomous, voice-first and data-grounded AI website design studio. Unlike traditional template-based website builders that insert generic text into static component layouts, WebsiteBanja generates bespoke, conversion-grade websites tailored uniquely to each specific business.

### Core Generation Contract
1. **Zero Generic Boilerplate**: Every section, headline, value proposition, and FAQ must derive strictly from grounded business intelligence, category-specific customer journeys, or verified real-world data.
2. **Deterministic Grounding**: Google Places listings, existing customer website audits, and verified social proof take absolute precedence over synthetic content.
3. **Semantic Asset Integrity**: High-relevance business-specific visual assets (e.g., two-wheeler fleet imagery for bike rentals, culinary staging for restaurants) are strictly enforced; generic office/tech stock photos and cross-domain asset leakage are blocked.
4. **Autonomous Convergence**: Every generation entry point—public website UI, conversational Mitra agent, Studio copilot, n8n automation, Autonomous Pipeline, and direct API endpoints—converges on the single **CanonicalGenerationOrchestrator**.

---

## 2. Universal Generation Architecture

All generation requests enter a unified, 11-stage canonical generation lifecycle:

```
INPUT (Lead / Prompt / Place ID / Existing Website URL)
  │
  ▼
[Stage 1: Business Discovery & Intelligence Gathering]
  ├── Google Places API grounding (factual coordinates, ratings, verified phone, address)
  └── Existing Website Ingestion (Cheerio crawling, meta extraction, value propositions)
  │
  ▼
[Stage 2: Business Semantic Reasoning]
  ├── Domain & Industry Classification (15 canonical verticals)
  ├── Customer Journey & Intent Modeling (Direct Booking, Consultation, Menu, Quote)
  └── Transaction Type Resolution (immediate commerce vs. asynchronous inquiry)
  │
  ▼
[Stage 3: Executive Strategy & Active Learning]
  ├── StrategyManager & Candidate Ingestion (prior operational lessons & failure patterns)
  └── CEO / Boss Strategic Directives (archetype guidance, spatial 3D control)
  │
  ▼
[Stage 4: Dynamic Information Architecture & Section Planning]
  ├── BusinessSectionPlanner (tailored section order matching transaction type)
  └── Purpose Deduplication (zero duplicate contact, inquiry, or booking sections)
  │
  ▼
[Stage 5: Grounded Asset Selection]
  ├── Authentic Google Places Photos (ranked, formatted, attribution preserved)
  ├── Domain-Gated Curated Registry (zero four-wheeler leakage for two-wheelers)
  └── Strict Domain Incompatibility Gating
  │
  ▼
[Stage 6: AST Generation & Content Synthesis]
  ├── Anti-Boilerplate Headline Synthesis (category-driven, city-grounded)
  ├── Contextual Offering Descriptions
  └── Verified Review Filtering (zero fabricated reviews or placeholder personas)
  │
  ▼
[Stage 7: 7-Stage Validation Pipeline]
  ├── 1. Semantic Validator (business domain match, zero generic markers)
  ├── 2. Grounded Claims Validator (address, contact, verified data)
  ├── 3. CTA Validator (semantic action label, valid scroll/link target)
  ├── 4. Accessibility & Contrast Validator (WCAG AAA 4.5:1 / 7:1 conformance)
  ├── 5. Navigation & Anchors Validator (matching section IDs)
  ├── 6. Performance & Asset Validator (image resolution, responsiveness)
  └── 7. Visual Harmony Validator (typography pairing, color mode consistency)
  │
  ▼
[Stage 8: Bounded Self-Correcting Repair Loop]
  └── RepairCoordinator (max 3 deterministic iterations addressing specific rule failures)
  │
  ▼
[Stage 9: Quality Gate & Decision]
  ├── READY: Store preview / publish AST
  └── BLOCKED: Controlled error boundary with diagnostic feedback
  │
  ▼
[Stage 10: Preview Persistence & Multi-Tenant Isolation]
  ├── Azure PostgreSQL / Supabase DB record
  └── Azure Blob Storage (or local scratch/ fallback)
  │
  ▼
[Stage 11: Real-World Presentation]
  └── Next.js Server & Client Renderer (Adaptive MagneticButton, Responsive Layouts)
```

---

## 3. Core Architectural Components

### 3.1. CanonicalGenerationOrchestrator (`src/lib/intelligence/orchestration/`)
The centralized pipeline coordinator. Guarantees that no caller can bypass grounding, semantic reasoning, section planning, asset filtering, or the 7-stage validation/repair loop.

### 3.2. BusinessSectionPlanner (`src/lib/intelligence/planning/`)
Replaces static section ordering with dynamic, business-intent-driven journeys:
- **Direct Booking** (Rentals, Hospitality): `Hero -> Services/Fleet -> Features -> Contact -> Reviews -> FAQ -> About -> Footer`
- **Consultation** (Clinics, Law, Agencies): `Hero -> Services -> About -> Features -> Reviews -> Contact -> FAQ -> Footer`
- **Artisanal / Experience** (Cafes, Restaurants): `Hero -> Services/Menu -> About -> Features -> Contact -> FAQ -> Footer`
- **Service Quote** (HVAC, Contractors): `Hero -> Services -> About -> Features -> Contact -> FAQ -> Footer`

**Deduplication Protocol**: Scans planned sections by semantic purpose (`contact_intent`, `about_intent`, `offering_intent`) and collapses redundant blocks into a single primary conversion point.

### 3.3. Grounded Intelligence & Asset Engine (`src/lib/intelligence/grounding/`)
- **Google Places API**: Fetches real-world place IDs, customer ratings, review counts, verified phone numbers, and authentic location photos.
- **Review Sanitizer**: Strips emojis, profanity, and formatting errors. If zero verified reviews exist, the `reviews` section is completely omitted rather than fabricating synthetic quotes.
- **Semantic Image Sourcing**: Domain-gated asset catalogs preventing car images from appearing on motorcycle websites, or laptops appearing on culinary websites.

### 3.4. Executive Intelligence & Boss Agent (`src/lib/agents/boss/`, `src/lib/intelligence/executive/`)
- **BossAgent**: Multi-agent executive monitoring health, design repetition, cross-agent correlations, and visual quality across Mitra, Skills Agent, and Uniqueness Agent.
- **Hierarchical Delegation**: BossDelegator routes high-level tasks to specialized sub-agents with signed task envelopes and validation boundaries.

### 3.5. Continuous Learning Loop (`src/lib/intelligence/learningLoop/`, `src/lib/intelligence/learning/`)
- **StrategyManager**: Maintains verified design and generation strategies across industries.
- **CandidateIngestionEngine**: Automatically logs generation and validation failures as candidate lessons.
- **StrategyPromotionCoordinator**: Elevates lessons to promoted production strategies after regression testing, creating a persistent self-improving generation loop.

### 3.6. n8n Ops Agent & Autonomous Production (`src/lib/intelligence/ops/`, `src/lib/intelligence/production/`)
- **n8n Ops Webhooks**: External workflow automation hosted on Azure Container Apps (`n8n-app`), executing lead discovery, website audits, and preview dispatch.
- **ProductionOrchestrator & ProductionJobStore**: Manages asynchronous multi-stage jobs (Discovery -> Audit -> Grounding -> Generation -> Verification -> Outreach) with full retry resilience.

---

## 4. Production Infrastructure & Deployment Architecture

### 4.1. Cloud Topology (Azure Cloud - Central India)
- **Container Environment**: Azure Container Apps (`websitebanja-env`)
- **Core App**: `websitebanja-app` (Next.js 16, Node.js 20, Sharp, Webpack)
- **Ops Agent**: `n8n-app` (External ingress, secured by `WEBSITEBANJA_AUTOMATION_SECRET`)
- **Container Registry**: Azure Container Registry (`websitebanjacr.azurecr.io`)
- **Database**: Azure Flexible PostgreSQL (`pg` connection pool with SSL)
- **Object Storage**: Azure Blob Storage (`@azure/storage-blob`) with local disk fallback
- **Caching & Rate Limiting**: Upstash Redis (`@upstash/ratelimit`, `@upstash/redis`)
- **Authentication**: Supabase Auth (JWT, email, OAuth, admin role verification)
- **Payments**: Razorpay Gateway (Webhooks, verified signatures, plan expiration crons)

### 4.2. CI/CD Pipeline (`.github/workflows/deploy-azure.yml`)
1. **Trigger**: Push to `origin/main` (excluding Markdown documentation).
2. **Build**: Docker Buildx builds immutable SHA-tagged image (`websitebanja:${{ github.sha }}`) and pushes to Azure ACR.
3. **Auth**: Azure OIDC Login (Federated credentials via GitHub Actions, zero static service principal passwords).
4. **Deploy**: `az containerapp update` deploys immutable SHA image and configures environment secrets.
5. **Verify**: Runs automated smoke test suite (`azure-migration/11_smoke_test_container_app.mjs`) against live URL verifying public pages, auth guards, telemetry, and health.
6. **IndexNow Ping**: Automatically pings search engines upon successful deployment.

---

## 5. Security, Governance & Multi-Tenant Isolation

1. **Automation Secret Boundary**: All automation endpoints require `x-automation-secret` or verified admin Supabase Bearer token.
2. **Tenant Data Isolation**: Database queries enforce `user_id` and `project_id` matching; project data is partitioned.
3. **Prompt Injection Hardening**: Incoming user prompts are filtered for system instructions, developer mode escapes, and delimiter hijacking.
4. **GovernanceGuard**: Blocks unapproved live external communications (e.g. WhatsApp/SMS dry-run enforcement) unless human-in-the-loop approval is explicitly recorded.

---

## 6. Known Status & Roadmap

- **Universal Generation Architecture**: Fully implemented and converged across all entry points.
- **Grounded Assets**: Real Google Places integration active; verified two-wheeler and mobility assets enforced.
- **Responsive UI/UX**: Dark mode / Light mode adaptive contrast verified (MagneticButton WCAG AAA 21:1 contrast).
- **Active Generation Focus**: Final refinement of anti-boilerplate headline synthesis in `previewGenerator.ts`.
