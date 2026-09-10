# Project: WebsiteBanja Knowledge Base Architecture

## Architecture
WebsiteBanja is a Next.js App Router application backed by Supabase for relational persistence, authentication, and file storage.
The Knowledge Base architecture cleanly decouples two distinct knowledge domains:
1. **Global Knowledge Base**: Immutable, category-driven, versioned platform capabilities (supported website types, section components, catalog formats, design tokens, prompt rules, backend options) stored in code (`src/knowledge/global/*`) with zero tenant/project data.
2. **User/Project Knowledge Base**: Tenant-scoped business information, client preferences, and custom context stored in Supabase `public.project_knowledge` linked strictly by `project_id` and `user_id`, protected by non-recursive RLS policies.
3. **Retrieval Service Layer**: Unified facade (`src/lib/knowledge/*`) providing strongly-typed accessors (`getGlobalKnowledge`, `getProjectKnowledge`, `getProjectContext`, `getKnowledgeByCategory`, etc.) that abstract physical storage from generation endpoints (`/api/generate`, `/api/plan`).

```
+-------------------------------------------------------------------------+
|                  Generation & Planning Endpoints                        |
|                  (/api/generate, /api/plan, etc.)                       |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  Knowledge Retrieval Service Layer                      |
|                  (src/lib/knowledge/index.ts)                           |
+-------------------+---------------------------------+-------------------+
                    |                                 |
                    v                                 v
+---------------------------------------+ +-------------------------------+
|      Global Knowledge Base            | |    User/Project Knowledge     |
|      (src/knowledge/global/*)         | |    (public.project_knowledge) |
|  - website_types                      | |  - project_id & user_id FKs   |
|  - components                         | |  - strict Supabase RLS        |
|  - integrations                       | |  - zero cross-tenant leakage  |
|  - design_system                      | +-------------------------------+
|  - technical_constraints              |
|  - generation_rules                   |
|  - backend_capabilities               |
|  - versioning & staleness audit       |
+---------------------------------------+
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Codebase Audit Document | Comprehensive audit of Next.js routes, state, DB tables (`docs/knowledge-base-audit.md`) | M1 | R1 |
| 2 | Canonical Data Ownership Document | Single source of truth mapping for all business/project parameters (`docs/knowledge-base-data-ownership.md`) | M1 | R1 |
| 3 | Knowledge Base Architecture Document | End-to-end design, boundaries, security, and interface specs (`docs/knowledge-base-architecture.md`) | M1 | R1 |
| 4 | KB Update Process Document | Evolution workflows, versioning protocol, drift detection (`docs/knowledge-base-update-process.md`) | M1 | R1 |
| 5 | Global KB Taxonomy & Schema | 7-category taxonomy with standardized metadata (`version`, `status`, `updated_at`, `source`) | M2 | R2 |
| 6 | Global KB Platform Data Files | Population of all 15 industry types, 9 section components, design tokens, generation rules | M2 | R2 |
| 7 | Global KB Staleness & Drift Engine | Automated SHA-256 and schema comparison to detect drift between code and KB | M2 | R2 |
| 8 | Project Knowledge Supabase Schema | DDL migration for `public.project_knowledge` with composite unique constraint `(project_id, category, key)` | M3 | R3 |
| 9 | Supabase RLS Policies for Project KB | Non-recursive RLS policies enforcing tenant isolation (`is_project_owner`, `is_website_member`) | M3 | R3 |
| 10 | Project Knowledge Types & Client Layer | TypeScript interfaces and DB accessors utilizing `getUserScopedClient` | M3 | R3 |
| 11 | Knowledge Retrieval Layer Interface | Clean decoupled interface (`getGlobalKnowledge`, `getProjectKnowledge`, etc.) | M4 | R4 |
| 12 | Project Context Assembly & Fallback | Context aggregator (`getProjectContext`) with backward-compatible fallback to `projects` columns | M4 | R4 |
| 13 | Non-Breaking Generation Integration | Integration into `/api/generate` and `/api/plan` prompt pipelines without breaking contracts | M4 | R4 |
| 14 | E2E Requirement-Driven Test Suite | Opaque-box test suite verifying Tiers 1-4 (global KB, project KB, RLS, compatibility) | E2E-Track | R5 |
| 15 | Adversarial Hardening & Forensic Integrity Audit | Tier 5 adversarial stress testing, zero-leakage verification, and audit signoff | M5 | R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Architecture & Audit Documentation (R1) | Features 1, 2, 3, 4: Write all 4 architecture docs in `docs/` | None | VERIFIED |
| M2 | Global Knowledge Base System (R2) | Features 5, 6, 7: Implement category-driven Global KB and staleness detection | M1 | VERIFIED |
| M3 | User/Project Knowledge Base & Schema (R3) | Features 8, 9, 10: Implement Supabase schema migration and RLS policies | M1 | VERIFIED |
| M4 | Knowledge Retrieval Layer Abstraction (R4) | Features 11, 12, 13: Build retrieval service and wire into generation pipelines | M2, M3 | VERIFIED |
| E2E | E2E Testing Track | Feature 14: Comprehensive test infra and test cases (Tiers 1-4) | M1 | VERIFIED |
| M5 | Final Milestone: 100% E2E Pass & Hardening (R5) | Feature 15: Pass all E2E tests, existing tests, Tier 5 adversarial tests, Forensic Audit | M4, E2E | VERIFIED |
| P2 | Phase 2: Core AI + Studio + Website Generation | End-to-end multi-turn AI agent, studio copilot, category generation & workspace state | M5 | VERIFIED |
| P3 | Phase 3: Production Backend, Persistence & Lifecycle | Column whitelist completion, backend requirement lifecycle, studio hydration, atomic publishing, project isolation | P2 | VERIFIED |

## Interface Contracts

### Global Knowledge Base Contract
```typescript
export interface KnowledgeMetadata {
  id: string;
  category: 'website_types' | 'components' | 'integrations' | 'design_system' | 'technical_constraints' | 'generation_rules' | 'backend_capabilities';
  title: string;
  description: string;
  version: string;
  status: 'active' | 'deprecated' | 'draft';
  source: string;
  schemaVersion: string;
  updatedAt: string;
  tags?: string[];
}

export interface GlobalKnowledgeEntry<T = unknown> {
  metadata: KnowledgeMetadata;
  data: T;
}
```

### Project Knowledge Base Contract
```typescript
export interface ProjectKnowledgeRecord {
  id: string;
  project_id: string;
  user_id: string;
  category: string;
  key: string;
  content: Record<string, unknown>;
  source: 'user_input' | 'ai_inference' | 'system_default' | 'catalog_sync';
  version: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

### Retrieval Service Contract
```typescript
export interface IKnowledgeRetrievalService {
  getGlobalKnowledge(options?: { category?: string; status?: 'active' | 'deprecated' | 'all' }): Promise<GlobalKnowledgeEntry[]>;
  getGlobalKnowledgeById<T = unknown>(id: string): Promise<GlobalKnowledgeEntry<T> | null>;
  getKnowledgeByCategory<T = unknown>(category: string): Promise<GlobalKnowledgeEntry<T>[]>;
  getProjectKnowledge(projectId: string, token?: string): Promise<ProjectKnowledgeRecord[]>;
  getProjectKnowledgeItem<T = unknown>(projectId: string, category: string, key: string, token?: string): Promise<T | null>;
  getProjectContext(projectId: string, token?: string): Promise<ProjectContextBundle>;
  setProjectKnowledge(projectId: string, category: string, key: string, content: Record<string, unknown>, source?: string, token?: string): Promise<ProjectKnowledgeRecord>;
  checkKnowledgeStaleness(): Promise<StalenessReport>;
}
```

## Code Layout
```
/docs/
  knowledge-base-audit.md           # Audit of existing architecture and data flows (M1)
  knowledge-base-data-ownership.md   # Canonical ownership of all business/project parameters (M1)
  knowledge-base-architecture.md     # System design, data models, RLS policies, retrieval (M1)
  knowledge-base-update-process.md   # Update protocols, versioning, staleness mitigation (M1)

/src/knowledge/
  global/                            # Global Knowledge Base (M2)
    types.ts                         # Global KB schemas & metadata interfaces
    website-types.ts                 # Supported website types (15 industries)
    components.ts                    # Section components (9 sections, buttons, etc.)
    integrations.ts                  # Integrations (WhatsApp, Maps, Custom Domain)
    design-system.ts                 # Design tokens, themes (light premium, dark)
    technical-constraints.ts         # Rate limits, token limits, timeouts
    generation-rules.ts              # System prompts, JSON schema enforcement
    backend-capabilities.ts          # Backend requirements detection
    index.ts                         # Registry export
  staleness/                         # Staleness detection engine (M2)
    audit.ts                         # Checksum & schema drift validator

/supabase/migrations/
  20260905000000_create_project_knowledge.sql # Schema & RLS for public.project_knowledge (M3)

/src/lib/knowledge/                 # Retrieval Layer Abstraction (M4)
  types.ts                           # Retrieval interfaces & context bundle types
  retrieval.ts                       # IKnowledgeRetrievalService implementation
  index.ts                           # Public facade exports

/tests/
  phase2_multiturn_agent.mjs         # Multi-turn sequential state modification test suite
  phase2_generation_categories.mjs   # Multi-category website generation verification suite
  knowledge_base.test.mjs            # Knowledge base architecture verification suite
  staleness_drift_challenge.test.ts  # Adversarial schema drift & staleness challenge suite
  studio_copilot.e2e.spec.ts         # Playwright Studio AI Copilot E2E test suite
  voice.e2e.spec.ts                  # Playwright voice pipeline E2E test suite
  voice_text_consistency.e2e.spec.ts # Playwright voice/text canonical parity test suite
  phase3_lifecycle_persistence.test.ts # Phase 3 lifecycle, whitelist, hydration & isolation test suite
  project_isolation.test.mjs         # Multi-tenant catalog & project isolation test suite
```

## Phase 2: Core AI + Studio + Website Generation Verification Matrix
| Test Suite | Focus / Coverage | Result |
|------------|------------------|--------|
| `tests/phase2_multiturn_agent.mjs` | 6 sequential user turns (category, name, color override, add feature, remove feature, modify/restore feature) with state merging & deterministic readiness | **6/6 PASSED (100%)** |
| `tests/phase2_generation_categories.mjs` | Prompt extraction, canonical category mapping, backend requirement detection, image resolution, and prompt synthesis across 7 major categories | **7/7 PASSED (100%)** |
| `tests/knowledge_base.test.mjs` | Global taxonomy, deep immutability, 4-way parity, SHA-256 canonical hashing, context bundle assembly, zero secrets | **13/13 PASSED (100%)** |
| `tests/staleness_drift_challenge.test.ts` | Adversarial schema drift engine, code drift sensitivity, component/action/backend parity, cryptographic tampering detection | **19/19 PASSED (100%)** |
| `tests/studio_copilot.e2e.spec.ts` | Playwright E2E: Studio loading, tab navigation, headline prompt update, button prompt update, canvas synchronization, undo/redo | **PASSED (1/1, 8.0s)** |
| `tests/voice.e2e.spec.ts` | Playwright E2E: App load (200), agent init, greeting, AudioContext, audio decoding/playback pipeline, multi-turn interaction | **PASSED (1/1, 4.9s)** *(Physical speaker: UNVERIFIED)* |
| `tests/voice_text_consistency.e2e.spec.ts` | Playwright E2E: 100% exact string match `Chat UI === Server Reply === TTS Input === Voice Replay` across multi-turn and distinctive tokens | **PASSED (1/1, 17.8s)** |

## Phase 3: Production Backend, Persistence & Lifecycle Verification Matrix
| Test Suite | Focus / Coverage | Result |
|------------|------------------|--------|
| `tests/phase3_lifecycle_persistence.test.ts` | VALID_PROJECT_COLUMNS whitelist, 7-category backend requirement lifecycle, atomic studio hydration via hydrateFromProject, multi-project switching, slug sanitization, publication snapshot immutability, autosave deduplication | **6/6 PASSED (100%)** |
| `tests/project_isolation.test.mjs` | CTA execution engine, publishing snapshot immutability, 10-step catalog persistence regression (A->J), strict 3-project multi-tenant isolation | **4/4 PASSED (100%)** |
## Phase 4: Production SEO, Entity Grounding & AI Discoverability
- **Official Canonical Domain**: `https://websitebanja.com`
- **Infrastructure**: Azure Container Apps (`websitebanja-app`, `centralindia`) with automated HTTPS/SSL, rolling zero-downtime revisions, and non-fatal IndexNow CI/CD ping.
- **Apex Domain Enforcement**: Middleware enforces 308 permanent redirect from `www.websitebanja.com` to `https://websitebanja.com`.
- **Crawler & Robots Directives**:
  - `src/app/robots.ts`: Allows `/`, `/agent`, `/p/`, `/llms.txt`, `/sitemap.xml`, `/favicon.ico` for all crawlers including explicit AI bots (`GPTBot`, `ChatGPT-User`, `Google-Extended`, `PerplexityBot`, `ClaudeBot`, `anthropic-ai`, `Applebot`, `Googlebot`, `Bingbot`).
  - Private routes (`/dashboard`, `/editor`, `/builder`, `/api`, etc.) protected with `X-Robots-Tag: noindex, nofollow, noarchive`.
- **Structured Data (Schema.org)**:
  - `WebSite`: `@id: https://websitebanja.com/#website`, `alternateName: ["WebsiteBanja", "Website Banja", "WebsiteBanja.com"]`.
  - `Organization`: `@id: https://websitebanja.com/#organization`, `name: WebsiteBanja AI`, `logo: /logo.png`.
  - `SoftwareApplication`: `@id: https://websitebanja.com/#software`, `applicationCategory: DesignApplication`, `applicationSubCategory: AI Website Builder`, `featureList`, free tier offer.
  - `FAQPage`: Authentic Q&As on capabilities, customization, responsive design, and 1-click publishing.
- **Entity Grounding & Crawlable Content**:
  - `AboutEntity.tsx`: Semantic server-rendered component on homepage detailing brand, category, core capabilities, comparison to traditional template builders, and official canonical URL.
  - `public/llms.txt`: Structured plain-text documentation for LLMs. Explicitly defines official identity and declares historical/temporary prototype domains (e.g., `websitebanja.lovable.app`) as deprecated and non-canonical.
- **Branded Favicon**:
  - Genuine multi-size ICO binary container (16x16, 32x32, 48x48) generated directly from `public/logo.png` (WebsiteBanja branding).
  - Maintained identically in both `public/favicon.ico` and `src/app/favicon.ico` for seamless Next.js App Router metadata serving.
- **External AI Discovery Note**:
  - Search engine and AI crawler indexing cycles (Google, Bing, Perplexity, OpenAI, Anthropic) operate asynchronously.
  - Technical and semantic grounding is fully deployed; independent AI discovery will reflect as external search engine crawlers re-index `websitebanja.com` and its sitemap.


