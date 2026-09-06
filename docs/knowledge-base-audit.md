# WebsiteBanja Knowledge Base Architecture Audit

**Document Version**: 1.0.0  
**Milestone**: M1 (Architecture Documentation)  
**Status**: Authoritative Reference  
**Target Systems**: Next.js App Router, Supabase PostgreSQL, Supabase Storage, OpenAI Integration  

---

## 1. Executive Summary & Audit Scope

WebsiteBanja is an automated website builder platform built on the **Next.js App Router (React 19)**, **Tailwind CSS v4**, **Zustand v5**, **Supabase PostgREST & Storage**, and OpenAI LLM endpoints (`gpt-4.1-mini` and `gpt-4o-mini`). The platform enables small businesses and individuals to transform natural language prompts or onboarding questionnaires into fully functional, responsive, multi-page websites with integrated product/service catalogs, contact routing, and custom domain publishing.

### 1.1 The Architecture Problem
In the existing codebase, two fundamentally different types of knowledge are tightly coupled:
1. **Platform Capabilities (Global Knowledge)**: What WebsiteBanja *can build* — including supported industry taxonomies (15 categories), default section schemas (hero, about, services, features, faq, contact, footer, products), design tokens (light premium and dark themes), rate limits, and LLM system prompt engineering rules.
2. **Tenant Business Data (User/Project Knowledge)**: What a specific client's business *is* — business name, contact coordinates, brand color overrides, catalog inventories, architectural decisions, and customer leads.

Platform rules are currently hardcoded across multiple TypeScript utility modules (`src/lib/prompts.ts`, `src/lib/promptExtractor.ts`, `src/lib/categoryImages.ts`, `src/lib/featureRegistry.ts`, `src/lib/backendDetection.ts`), while project data is fragmented across relational columns in `public.projects`, monolithic JSONB documents (`projects.json_data`), markdown files in Supabase Storage (`project-workspaces`), and browser memory.

### 1.2 Audit Mission & Boundaries
This audit establishes the baseline for separating WebsiteBanja's knowledge into two isolated spheres:
- **Global Knowledge Base**: Immutable, category-driven, version-controlled in code (`src/knowledge/global/*`) containing zero tenant data.
- **User/Project Knowledge Base**: Tenant-scoped relational storage in Supabase (`public.project_knowledge`), isolated by `project_id` and `user_id` foreign keys and protected by non-recursive Row Level Security (RLS).
- **Retrieval Service Layer**: A unified access layer (`src/lib/knowledge/`) abstracting physical storage from AI generation and frontend consumption.

---

## 2. Next.js App Router & Endpoint Mapping

### 2.1 Route Inventory

| Route Path | Type | Auth / Protection | Purpose / Data Interaction |
|---|---|---|---|
| `/` | Page (Public) | None | Marketing landing page with hero prompt input and category selector. |
| `/login`, `/signup`, `/auth/callback` | Page (Public) | Supabase Auth | User authentication, session establishment, and OAuth redirection. |
| `/dashboard` | Page (Protected) | Authenticated User | Project listing dashboard; fetches user projects via `getProjects()`. |
| `/editor/[id]` | Page (Protected) | Project Owner / Member | Multi-step onboarding wizard (`/business-info`, `/features`, `/branding`, `/content`, `/review`). |
| `/editor/[id]/loading` | Page (Protected) | Project Owner / Member | Orchestration route: executes `/api/plan` (workspace markdown) and `/api/generate` (website layout JSON). |
| `/editor/[id]/workspace` | Page (Protected) | Project Owner / Member | Interactive Studio workspace: canvas preview (`WebsiteRenderer.tsx`), AI action panel, catalog manager, page manager. |
| `/preview/[id]` | Page (Public / Token) | Preview Link (2-day TTL) | Ephemeral read-only preview of draft website; queries `public.preview_links` via `get_preview_snapshot` RPC. |
| `/p/[slug]` | Page (Public) | Edge Cached / Public | Production live site; queries `public.published_versions` via `get_published_project_by_slug` RPC and `catalog_items`. |
| `/api/generate` | Route Handler | Bearer Token + Rate Limit | Generates full website structure JSON via OpenAI `gpt-4.1-mini`. |
| `/api/plan` | Route Handler | Bearer Token + Rate Limit | Generates 15 markdown planning files (`.websitebanja/`) via OpenAI `gpt-4.1-mini`. |
| `/api/extract` | Route Handler | Bearer Token + Rate Limit | Parses unstructured user prompts into structured business fields. |
| `/api/agent/talk` | Route Handler | Public + IP Rate Limit | Conversational onboarding agent ("Mitra") with intent detection. |
| `/api/studio/ai-action` | Route Handler | Bearer Token + Rate Limit | Executes discrete canvas modifications (17 supported actions) via `gpt-4o-mini`. |
| `/api/public/submit-lead` | Route Handler | Public + Slug Verification | Ingests contact form submissions; invokes `submit_public_lead` RPC. |
| `/api/site-admin/[slug]` | Route Handler | Website Member Role | Back-office management for published site leads and member roles. |

### 2.2 End-to-End Request Lifecycle

```
[User enters prompt on Landing Page]
               │
               ▼
[Auth: /login -> /dashboard -> creates row in public.projects]
               │
               ▼
[Onboarding Wizard: /editor/[id] collects/extracts business parameters]
               │
               ▼
[Loading Page: /editor/[id]/loading orchestrates generation]
       ├──> POST /api/plan (generates 15 .md files -> project-workspaces bucket)
       └──> POST /api/generate (generates WebsiteData JSON -> projects.json_data)
               │
               ▼
[Studio Canvas: /editor/[id]/workspace hydrates useGeneratedWebsiteStore]
       ├──> User edits text/layout (autosaved to projects.json_data)
       ├──> AI edits via /api/studio/ai-action (updates canvas state)
       └──> Catalog edits via CatalogModal (writes to public.catalog_items)
               │
               ▼
[Publishing Flow: publishProject() calls publish_project_atomic RPC]
       ├──> Creates immutable snapshot in public.published_versions
       ├──> Strips customer leads via trigger
       └──> Site live at /p/[slug] and custom domain
```

---

## 3. AI Generation, Planning & Extraction Routes Deep Dive

WebsiteBanja operates five specialized AI execution routes. Each route encapsulates distinct prompt contracts, rate limit tiers, and validation boundaries.

### 3.1 `/api/generate` (`src/app/api/generate/route.ts:59-220`)
- **Authentication & Authorization**: Validates incoming Bearer token against `supabase.auth.getUser(token)`. Rejects unauthorized calls with HTTP 401 (`route.ts:63-72`).
- **Rate Limiting Engine**: Enforces sliding-window rate limiting via Upstash Redis (`route.ts:76-146`), falling back to in-memory tracking (`checkMemoryRateLimit`) if Redis credentials are unavailable:
  - *Free Tier*: 3 requests per 7 days per IP (`ai_usage_${ip}`) and per user (`ai_usage_${user.id}`).
  - *Paid Pro Tier*: 50 requests per 7 days per user (`ai_usage_${user.id}`).
  - *Admin Bypass*: Users in `ADMIN_EMAILS` or with `app_metadata.role` of `admin`/`superadmin` bypass limits (`route.ts:86-95`).
- **Input Validation**: `validateBusinessInputs(rawWebsiteData)` validates required fields (`businessName`, `category`, `description`) with strict length bounds (`route.ts:155`).
- **Prompt Assembly**: Calls `buildWebsitePrompt(websiteData, workspace)` (`src/lib/prompts.ts:9-104`).
  - Embeds hardcoded generation directives: *"Never invent another business"*, *"Write premium marketing copy"*, *"Generate content according to the business category"*, *"Return ONLY valid JSON"* (`src/lib/prompts.ts:49-58`).
  - Serializes all 15 workspace markdown documents from `project-workspaces` into the prompt (`route.ts:175`), contributing up to 25,000 characters of input context.
  - Hardcodes the default section order: `["hero", "about", "services", "features", "faq", "contact", "footer"]` (`src/lib/prompts.ts:64`, `route.ts:203`).
- **Model Execution**: Calls OpenAI `gpt-4.1-mini` with `response_format: { type: "json_object" }`.
- **Telemetry**: Records operational metrics via `trackAnalyticsEvent` (`ai_request`, `ai_success`, `ai_failure`).

### 3.2 `/api/plan` (`src/app/api/plan/route.ts:62-168`)
- **Authentication**: Requires valid Supabase user Bearer token (`route.ts:64-73`).
- **Rate Limiting**: Shares the 3 requests per 7 days rate limit tier (`route.ts:87-124`).
- **Prompt Assembly**: `buildPlanningPrompt(input, existingWorkspace)` (`src/lib/planningPrompts.ts:9-33`).
- **Output Schema Contract**: Generates a JSON mapping of exactly 15 markdown file paths conforming to `AI_WORKSPACE_FILES` (`src/types/aiWorkspace.ts:3-19`):
  1. `ai/memory.md`: Core memory and immutable project context.
  2. `ai/context.md`: Operating context and user preferences.
  3. `ai/decisions.md`: Architectural and technical decisions log.
  4. `ai/changelog.md`: Record of edits and version milestones.
  5. `ai/prompts.md`: History of user generation prompts.
  6. `ai/roadmap.md`: Planned features and expansion areas.
  7. `planning/prd.md`: Product Requirements Document.
  8. `planning/trd.md`: Technical Requirements Document.
  9. `planning/app-flow.md`: Page hierarchy and navigation paths.
  10. `planning/ui-ux.md`: Color palette, typography, and component styling.
  11. `planning/backend-schema.md`: Database entities and API endpoints.
  12. `planning/implementation-plan.md`: Step-by-step build milestones.
  13. `tasks/active.md`: Current backlog items.
  14. `tasks/completed.md`: Finished requirements.
  15. `tasks/bugs.md`: Identified defects.
- **Storage Target**: Files are uploaded to private Supabase Storage bucket `project-workspaces` at path `${projectId}/.websitebanja/${file}` (`src/lib/aiWorkspace.ts:77-112`).

### 3.3 `/api/extract` (`src/app/api/extract/route.ts:11-143`)
- **Authentication & Rate Limiting**: Requires authenticated user; enforces 30 requests per minute per user ID (`route.ts:16-28`).
- **Bounds**: Input prompt capped at `MAX_PROMPT_CHARS = 2000` (`route.ts:9`).
- **Extraction Strategy**:
  - *Fast Deterministic Parser*: `extractBusinessDetailsFast(prompt, safeCategory, safeFeatures)` (`src/lib/promptExtractor.ts:67-167`) executes regular expressions against `CATEGORY_KEYWORDS` (10 industries), `CATEGORY_SERVICES` (11 industries), and `CATEGORY_THEMES` (11 palettes).
  - *LLM Parser*: If fast extraction yields incomplete data, calls OpenAI `gpt-4.1-mini` at `temperature: 0.3` to extract structured fields: `businessName`, `category`, `description`, `services`, `targetAudience`, `location`, `style`, `primaryColor`, `secondaryColor`, `phone`, `email`, `whatsappNumber`.

### 3.4 `/api/agent/talk` (`src/app/api/agent/talk/route.ts:153-314`)
- **Authentication**: Public unauthenticated endpoint protected by in-memory rate limiting (60 requests/minute per IP, `route.ts:156`).
- **Persona & Prompt**: Defines conversational persona "Mitra" (`temperature: 0.7`), conducting a guided interview to collect business parameters.
- **Immediate Build Intent Trigger**: Regex check (`route.ts:62, 176`):
  `/generate|build|create my website|let's go|done|ready|yes.*generate|build now/i`
  When matched, triggers immediate transition with `isReadyToBuild: true`, `triggerImmediateBuild: true`, and `readinessScore: 100`.
- **Readiness Score Algorithm**: Evaluates completeness of 5 dimensions (name, category, description, contact, styling) mapping to scores between 20% and 100%.
- **Fallback Engine**: If OpenAI fails, executes deterministic fallback interview script (`route.ts:28-151`).

### 3.5 `/api/studio/ai-action` (`src/app/api/studio/ai-action/route.ts:25-198`)
- **Authentication & Rate Limiting**: Requires authenticated user; enforces 30 requests/minute per user ID (`route.ts:31-48`).
- **Payload Caps**: `MAX_PROMPT_CHARS = 2000`, `MAX_CONTEXT_CHARS = 12000` (`route.ts:11-12`).
- **Supported Studio Action Schemas (17 Actions)**:
  1. `update_text`: Modifies section heading, subtitle, or body text.
  2. `replace_image`: Replaces section image with high-resolution Unsplash URL.
  3. `update_button`: Modifies button label and action payload.
  4. `set_button_scroll_target`: Points button to in-page section ID.
  5. `set_button_page_target`: Points button to multi-page path.
  6. `set_button_whatsapp`: Configures WhatsApp direct chat.
  7. `set_button_external_url`: Links to external sanitized URL.
  8. `set_button_call`: Configures `tel:` protocol dialer.
  9. `add_section`: Inserts new section (`about`, `services`, `features`, `faq`, `contact`, `products`).
  10. `delete_section`: Removes section from layout.
  11. `reorder_sections`: Re-indexes section order array.
  12. `add_page`: Appends new page with slug and title.
  13. `delete_page`: Deletes non-home page.
  14. `set_page_seo`: Updates meta title, description, and OG tags.
  15. `toggle_admin_dashboard`: Enables/disables site back-office badge.
  16. `add_product`: Adds item to catalog.
  17. `update_product`: Updates catalog item fields.
  18. `delete_product`: Prunes catalog item.
- **Model Execution**: Calls OpenAI `gpt-4o-mini` with `temperature: 0.1` (`route.ts:164`). Includes multilingual intent normalization handling Hindi, Hinglish, and English commands.

---

## 4. Database & Storage Architecture

### 4.1 Supabase Schema Overview

```
+---------------------------------------------------------------------------------------------------+
|                                        public.projects                                            |
| id (PK, UUID) | user_id (FK->auth.users) | name | business_name | category | description          |
| style | primary_color | secondary_color | phone | email | website | instagram | facebook | address    |
| whatsapp_number | whatsapp_message | whatsapp_enabled | onboarding_mode | user_prompt                 |
| selected_features | custom_domain | is_published | public_slug | published_at | json_data (JSONB)   |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
         +----------------------------------------+------------------------------------+
         | 1:N                                    | 1:N                                | 1:N
         v                                        v                                    v
+-----------------------+     +-------------------------------+     +-------------------------------+
|  public.catalog_items |     |   public.published_versions   |     |     public.preview_links      |
| id (PK, UUID)         |     | id (PK, UUID)                 |     | id (PK, UUID)                 |
| project_id (FK)       |     | project_id (FK)               |     | project_id (FK)               |
| user_id (FK)          |     | version (INT)                 |     | json_data (JSONB)             |
| name, description     |     | snapshot_data (JSONB)         |     | expires_at (TIMESTAMPTZ)      |
| item_type, price      |     | published_at (TIMESTAMPTZ)    |     | created_at (TIMESTAMPTZ)      |
| images TEXT[]         |     +-------------------------------+     +-------------------------------+
| button_action (JSONB) |                                                                            
+-----------------------+                                                                            
         | 1:N                                    | 1:N                                | 1:N
         v                                        v                                    v
+-----------------------+     +-------------------------------+     +-------------------------------+
| public.website_members|     |    public.analytics_events    |     |     public.subscriptions      |
| project_id (FK)       |     | project_id (FK)               |     | user_id (FK->auth.users)      |
| user_id (FK)          |     | event_type (TEXT)             |     | status (TEXT)                 |
| role (OWNER/ADMIN...) |     | payload (JSONB)               |     | plan_id (paid_pro, etc.)      |
+-----------------------+     +-------------------------------+     +-------------------------------+
```

### 4.2 Detailed Entity Breakdown

#### 1. `public.projects`
- **Migrations**: `20260817000005_fix_rls_recursion.sql`, `20260830000000_security_hardening.sql`.
- **Columns**: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id UUID REFERENCES auth.users(id)`, `name TEXT`, `business_name TEXT`, `category TEXT`, `description TEXT`, `target_audience TEXT`, `style TEXT`, `primary_color TEXT`, `secondary_color TEXT`, `phone TEXT`, `email TEXT`, `website TEXT`, `instagram TEXT`, `facebook TEXT`, `address TEXT`, `whatsapp_number TEXT`, `whatsapp_message TEXT`, `whatsapp_enabled BOOLEAN`, `onboarding_mode TEXT`, `user_prompt TEXT`, `selected_features JSONB`, `custom_domain TEXT`, `custom_domain_status TEXT`, `custom_domain_verified_at TIMESTAMPTZ`, `backend_requirement TEXT`, `backend_config JSONB`, `is_published BOOLEAN`, `public_slug TEXT UNIQUE`, `published_at TIMESTAMPTZ`, `preview_expires_at TIMESTAMPTZ`, `json_data JSONB`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
- **Triggers**:
  - `projects_prevent_owner_reassignment` (`20260830000000_security_hardening.sql:318-322`): Prevents modifying `user_id` unless the caller is `service_role`.

#### 2. `public.catalog_items`
- **Migrations**: `20260817000001_create_catalog_items.sql`, `20260817000003_strict_project_isolation.sql`.
- **Columns**: `id UUID PRIMARY KEY`, `project_id UUID REFERENCES projects(id) ON DELETE CASCADE`, `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`, `name TEXT`, `description TEXT`, `item_type TEXT CHECK (item_type IN ('product', 'rental', 'service', 'showcase'))`, `category TEXT`, `status TEXT CHECK (status IN ('active', 'draft', 'out_of_stock'))`, `images TEXT[]`, `price NUMERIC(10,2)`, `original_price NUMERIC(10,2)`, `currency_code TEXT DEFAULT 'INR'`, `show_discount_badge BOOLEAN`, `hourly_price NUMERIC(10,2)`, `daily_price NUMERIC(10,2)`, `weekly_price NUMERIC(10,2)`, `monthly_price NUMERIC(10,2)`, `cta_text TEXT`, `cta_link TEXT`, `button_action JSONB`, `display_order INTEGER`, `badge TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.

#### 3. `public.published_versions`
- **Migrations**: `20260815000000_publish_project.sql`, `20260830000000_security_hardening.sql:342-359`.
- **Columns**: `id UUID PRIMARY KEY`, `project_id UUID REFERENCES projects(id) ON DELETE CASCADE`, `version INTEGER`, `snapshot_data JSONB NOT NULL`, `published_at TIMESTAMPTZ`.
- **Trigger**: `published_versions_strip_leads` automatically purges `snapshot_data->'leads'` `BEFORE INSERT OR UPDATE` to prevent leaking private customer inquiries.

#### 4. `public.preview_links`
- **Migrations**: `20260816000002_share_previews.sql`, `20260830000000_security_hardening.sql:221-249`.
- **Columns**: `id UUID PRIMARY KEY`, `project_id UUID REFERENCES projects(id) ON DELETE CASCADE`, `json_data JSONB NOT NULL`, `expires_at TIMESTAMPTZ NOT NULL`, `created_at TIMESTAMPTZ`.
- **Trigger**: `preview_links_strip_leads` automatically purges `json_data->'leads'` `BEFORE INSERT OR UPDATE`.

#### 5. `public.website_members`
- **Migrations**: `20260817000002_create_admin_and_publishing.sql`, `20260830000000_security_hardening.sql:289-292`.
- **Columns**: `id UUID PRIMARY KEY`, `project_id UUID REFERENCES projects(id) ON DELETE CASCADE`, `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`, `role TEXT CHECK (role IN ('OWNER', 'ADMIN', 'EDITOR', 'STAFF'))`, `created_at TIMESTAMPTZ`.
- **Partial Unique Index**: `website_members_one_owner_per_project` on `(project_id) WHERE role = 'OWNER'` guarantees strict single ownership.

#### 6. `public.analytics_events`
- **Migrations**: `20260816000000_analytics_and_monetization.sql`, `20260830000000_security_hardening.sql:142-212`.
- **Columns**: `id UUID PRIMARY KEY`, `project_id UUID REFERENCES projects(id) ON DELETE CASCADE`, `event_type TEXT`, `payload JSONB`, `created_at TIMESTAMPTZ`.
- **Telemetry Events**: `page_view`, `whatsapp_click`, `cta_click`, `catalog_view`, `lead_submit`, `ai_request`, `ai_success`, `ai_failure`.

### 4.3 Non-Recursive RLS Architecture
To avoid PostgreSQL infinite recursion errors during RLS evaluation, helper functions defined with `SECURITY DEFINER` bypass direct table cross-queries (`20260817000005_fix_rls_recursion.sql:19-58`):

```sql
-- Checks if caller is the authenticated project owner
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid()
  );
END;
$$;

-- Checks if caller has specified roles in website_members
CREATE OR REPLACE FUNCTION public.is_website_member(p_project_id UUID, p_roles TEXT[])
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.website_members
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role = ANY(p_roles)
  );
END;
$$;

-- Checks if project is published for public read access
CREATE OR REPLACE FUNCTION public.is_project_published(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND is_published = true
  );
END;
$$;
```

### 4.4 Supabase Storage Buckets
1. `project-workspaces` (Private):
   - Path structure: `${projectId}/.websitebanja/${file}`.
   - RLS Policy: Restricted to `auth.uid()` matching `projects.user_id` for `${projectId}`.
   - Files: The 15 markdown planning documents generated by `/api/plan`.
2. `project-assets` (Public):
   - Path structure: `${projectId}/uploads/${filename}`.
   - RLS Policy: Upload allowed only by project owner; read allowed publicly via CDN URLs.

### 4.5 Stored Database RPC Functions
- `publish_project_atomic(p_project_id UUID, p_slug TEXT, p_snapshot JSONB)`: Commits published snapshot, updates `projects.is_published`, `projects.public_slug`, increments version in `published_versions`.
- `get_published_project_by_slug(p_slug TEXT)`: Securely retrieves active published snapshot without requiring table grants.
- `get_preview_snapshot(p_preview_id UUID)`: Validates `expires_at > now()`, strips leads, and returns draft preview payload.
- `submit_public_lead(p_slug TEXT, p_lead JSONB)`: Validates payload schema via `is_valid_lead_payload`, caps leads array at 5,000 items, prepends to `projects.json_data->'leads'`, and writes telemetry record to `analytics_events`.

---

## 5. State Management & Client Hydration Matrix

WebsiteBanja synchronizes state across three client-side Zustand stores and server persistence layers:

```
+----------------------------------------------------------------------------------------------------+
|                                    Client-Side State Storage                                       |
+------------------------------------+---------------------------------------------------------------+
| useBuilderStore                    | Manages multi-step onboarding wizard form inputs:             |
| (src/store/builderStore.ts)        | - Business name, category, description, contact coordinates   |
|                                    | - Theme colors, selected features, onboarding mode            |
|                                    | - Hydrated from public.projects row via hydrateFromProject()  |
+------------------------------------+---------------------------------------------------------------+
| useGeneratedWebsiteStore           | Manages interactive Studio canvas state:                      |
| (src/store/generatedWebsiteStore.ts)| - WebsiteData JSON layout (pages, sections, components)      |
|                                    | - Active page ID, selected section, active viewport mode      |
|                                    | - In-memory undo/redo history stack (capped at 50 snapshots)  |
|                                    | - Catalog modal visibility and active editing item ID         |
+------------------------------------+---------------------------------------------------------------+
| useProjectAutosave                 | Debounced synchronization engine:                             |
| (src/hooks/useProjectAutosave.ts)  | - 600ms debounce interval                                     |
|                                    | - MD5/string fingerprint diffing against lastSavedRef         |
|                                    | - Persists dirty state via updateProject(id, updates)         |
+------------------------------------+---------------------------------------------------------------+
```

### 5.1 Storage Lifecycle Comparison

| Storage Location | Volatility | Scope | Mutation Rate | Primary Content |
|---|---|---|---|---|
| **Zustand (`useBuilderStore`)** | In-Memory (Session) | Active Tab | On user input | Onboarding form inputs, category choices, feature selections. |
| **Zustand (`useGeneratedWebsiteStore`)** | In-Memory (Session) | Active Tab | On canvas edit | WebsiteData JSON, undo/redo history stack (50 entries). |
| **`public.projects` Table Columns** | Persistent (Postgres) | Tenant Project | On autosave / step finish | Business metadata, slug, domain status, contact info. |
| **`public.projects.json_data`** | Persistent (Postgres) | Tenant Project | On autosave (600ms debounce) | Full draft website pages, section components, leads array. |
| **`public.catalog_items`** | Persistent (Postgres) | Tenant Project | Immediate on modal save | Products, services, rental items, pricing, images, CTA actions. |
| **`project-workspaces` Bucket** | Persistent (Object Storage) | Tenant Project | On generation (/api/plan) | 15 Markdown planning documents (`.websitebanja/*`). |
| **`public.published_versions`** | Immutable Snapshot | Public / Production | Explicit user publish action | Frozen WebsiteData JSON snapshot with `_project_meta`. |

---

## 6. Data Duplication & Synchronization Analysis (The 7 Duplication Points)

Direct forensic analysis reveals 7 critical points where business parameters and capabilities are duplicated across multiple storage tiers, leading to staleness, race conditions, and prompt bloat:

```
+====================================================================================================================+
|                                    CATALOG OF 7 CRITICAL DATA DUPLICATION POINTS                                   |
+====================================================================================================================+
| # | Duplication Point       | Primary Source             | Duplicated Stores                    | Severity |
|---|-------------------------|----------------------------|--------------------------------------|----------|
| 1 | Business Identity       | projects.business_name     | projects.name, json_data.hero.title, | HIGH     |
|   |                         |                            | json_data.footer.copyright, storage  |          |
| 2 | Contact & Coordinates   | projects.phone, email,     | json_data.contact.*, hero button,    | HIGH     |
|   |                         | projects.address           | storage (ai/memory.md)               |          |
| 3 | Visual Branding & Theme | projects.primary_color,    | _project_meta in snapshots,          | MEDIUM   |
|   |                         | projects.style             | json_data inline styles, ui-ux.md    |          |
| 4 | Catalog & Products      | public.catalog_items       | projects.json_data.products,         | CRITICAL |
|   |                         |                            | productsSection.products             |          |
| 5 | Customer Leads (PII)    | projects.json_data->'leads'| public.analytics_events              | CRITICAL |
| 6 | AI Architecture Docs    | projects columns &         | 15 Markdown files in Storage bucket  | MEDIUM   |
|   |                         | projects.json_data         | ('project-workspaces')               |          |
| 7 | Publish Snapshot Meta   | projects columns           | published_versions.snapshot_data     | MEDIUM   |
|   |                         |                            | (synthetic _project_meta)            |          |
+====================================================================================================================+
```

### Detailed Breakdown of Duplication Hazards

#### 1. Business Identity (`business_name`)
- **Primary Source**: `public.projects.business_name`.
- **Duplicated Copies**: `projects.name`, `projects.json_data.hero.title`, `projects.json_data.footer.copyright`, `project-workspaces` (`ai/memory.md`, `planning/prd.md`).
- **Hazard**: Updating the business name in Project Settings (`updateProject({ business_name: 'New Name' })`) updates the table column, but leaves `json_data.hero.title` and `json_data.footer.copyright` displaying the old name until manual canvas editing or re-generation.

#### 2. Contact & Coordinates (`phone`, `email`, `address`, `whatsapp_number`)
- **Primary Source**: Relational columns in `public.projects`.
- **Duplicated Copies**: `projects.json_data.contact.phone`, `projects.json_data.contact.email`, `projects.json_data.contact.address`, `projects.json_data.hero.buttonAction`, `.websitebanja/ai/memory.md`.
- **Hazard**: When a user modifies phone or WhatsApp coordinates in Onboarding (`/editor/[id]/contact`), only `projects` columns update via `useProjectAutosave`. The canvas contact section continues to show old numbers, causing visitors to call outdated lines.

#### 3. Visual Branding & Theme (`style`, `primary_color`, `secondary_color`)
- **Primary Source**: `public.projects` columns.
- **Duplicated Copies**: `published_versions.snapshot_data._project_meta`, `projects.json_data` theme injection, `.websitebanja/planning/ui-ux.md`.
- **Hazard**: If theme tokens are partially overridden in `json_data` sections, modifying brand colors in the Studio toolbar alters table columns but fails to recompute dependent section token classes, resulting in mismatched visual contrast.

#### 4. Catalog & Products
- **Primary Source**: `public.catalog_items` relational table (23 columns).
- **Duplicated Copies**: `projects.json_data.products`, `projects.json_data.productsSection.products`.
- **Hazard**: Dual-writing risk. A user editing price or stock in the Catalog Manager updates `catalog_items`. If `/api/studio/ai-action` or canvas autosave serializes the old `products` array back into `projects.json_data`, the live website or studio preview flips between conflicting prices.

#### 5. Customer Leads (PII Quarantine)
- **Primary Source**: `projects.json_data->'leads'` (JSONB array).
- **Duplicated Copies**: `public.analytics_events` (`event_type = 'lead_submit'`).
- **Hazard**: Storing customer inquiries inside the monolithic `projects.json_data` blob requires downloading all lead records every time the Studio editor mounts. Furthermore, if trigger stripping fails, customer personal data could be exposed in public preview links.

#### 6. AI Architecture Workspace vs Relational State
- **Primary Source**: `public.projects` columns and `projects.json_data`.
- **Duplicated Copies**: 15 Markdown files in Supabase Storage `project-workspaces`.
- **Hazard**: Prompt bloat. Passing all 15 markdown files to `/api/generate` (`src/app/api/generate/route.ts:175`) consumes 25,000+ characters of context window duplicating basic metadata already present in the database, increasing latency and token costs.

#### 7. Publish Snapshot Metadata
- **Primary Source**: `public.projects` columns (`business_name`, `phone`, `email`, `whatsapp_number`, `primary_color`, `style`).
- **Duplicated Copies**: Synthetic `_project_meta` injected into `published_versions.snapshot_data` during publish execution (`src/lib/projects.ts:177-188`).
- **Hazard**: If `publishProject()` does not re-fetch the latest `projects` row before constructing `_project_meta`, recently saved contact info is omitted from the live published site.

---

## 7. Embedded Platform Knowledge Audit (The Global Knowledge Baseline)

Platform knowledge is currently hardcoded across 8 distinct files without versioning, categorisation, or staleness validation:

```
+----------------------------------------------------------------------------------------------------+
|                             EMBEDDED PLATFORM KNOWLEDGE SOURCES                                   |
+----------------------------------------------------------------------------------------------------+
| 1. src/lib/prompts.ts               | System prompt instructions, persona constraints, default     |
|                                     | section ordering: [hero, about, services, features, faq, ...] |
+-------------------------------------+--------------------------------------------------------------+
| 2. src/lib/planningPrompts.ts       | 15 workspace document schemas, architecture guidelines       |
+-------------------------------------+--------------------------------------------------------------+
| 3. src/lib/promptExtractor.ts       | CATEGORY_KEYWORDS (10), CATEGORY_SERVICES (11),              |
|                                     | CATEGORY_THEMES (11 palettes)                                |
+-------------------------------------+--------------------------------------------------------------+
| 4. src/lib/featureRegistry.ts       | Category capability mappings: hasCatalog, hasLeads, labels   |
+-------------------------------------+--------------------------------------------------------------+
| 5. src/lib/backendDetection.ts      | Detection rules: managed_booking, managed_orders, static_edge|
+-------------------------------------+--------------------------------------------------------------+
| 6. src/lib/categoryImages.ts        | 400+ lines of hardcoded Unsplash image URLs (14 categories)  |
+-------------------------------------+--------------------------------------------------------------+
| 7. src/lib/websiteTheme.ts          | 18 CSS theme tokens, dark/light rules, font family pairings  |
+-------------------------------------+--------------------------------------------------------------+
| 8. src/app/api/studio/ai-action/... | 17 action schemas, section synonyms, Hinglish/Hindi intents |
+-------------------------------------+--------------------------------------------------------------+
```

### Mapping to the 7 Global Knowledge Base Categories

| Global KB Category | Current Source Files | Content Description | Target Module |
|---|---|---|---|
| **1. `website_types`** | `promptExtractor.ts`, `featureRegistry.ts`, `categoryImages.ts` | 15 industry taxonomies (restaurant, real_estate, dental, legal, fitness, salon, grocery, bakery, photography, consulting, tuition, fashion, clinic, cleaning, generic), default services, catalog capabilities. | `src/knowledge/global/website-types.ts` |
| **2. `components`** | `prompts.ts`, `studio/ai-action/route.ts`, `types/website.ts` | 9 section component schemas (`hero`, `about`, `services`, `features`, `faq`, `contact`, `footer`, `products`, `navbar`), component constraints, supported variants. | `src/knowledge/global/components.ts` |
| **3. `integrations`** | `buttonActions.ts`, `projects.ts`, `types/website.ts` | External connection specs: WhatsApp direct chat, Google Maps embed, Custom Domain DNS verification, Tel dialer, Mailto. | `src/knowledge/global/integrations.ts` |
| **4. `design_system`** | `websiteTheme.ts`, `categoryImages.ts` | 18 CSS token variables, Luminous Light vs Dark Luxury resolution formulas, contrast requirements, curated Unsplash hero images. | `src/knowledge/global/design-system.ts` |
| **5. `technical_constraints`** | `generate/route.ts`, `extract/route.ts`, `studio/ai-action/route.ts` | `MAX_PROMPT_CHARS = 2000`, `MAX_CONTEXT_CHARS = 12000`, rate limits (Free 3/7d, Pro 50/7d), 600ms autosave debounce, 50-state undo limit. | `src/knowledge/global/technical-constraints.ts` |
| **6. `generation_rules`** | `prompts.ts`, `planningPrompts.ts`, `studio/ai-action/route.ts` | System prompts, JSON schema enforcement, multi-page routing guidelines, multilingual synonym mapping (Hindi/Hinglish/English). | `src/knowledge/global/generation-rules.ts` |
| **7. `backend_capabilities`** | `backendDetection.ts`, `types/project.ts` | Rules for detecting managed booking, managed ordering, contact lead capture, and static edge CDN distribution. | `src/knowledge/global/backend-capabilities.ts` |

---

## 8. Architecture Migration Blueprint & Boundary Specifications

To resolve data duplication, eliminate prompt bloat, and protect tenant isolation, the target architecture separates knowledge into three distinct layers:

```
+----------------------------------------------------------------------------------------------------+
|                                    Knowledge Base Architecture                                     |
+------------------------------------+---------------------------------------------------------------+
| Layer 1: Global Knowledge Base     | File-based, code-resident in src/knowledge/global/*           |
|                                    | - Versioned with KnowledgeMetadata (version, status, source)  |
|                                    | - Strictly platform capabilities (zero tenant data)           |
|                                    | - Audited via automated staleness and schema checksums        |
+------------------------------------+---------------------------------------------------------------+
| Layer 2: Project Knowledge Base    | Relational table in Supabase: public.project_knowledge        |
|                                    | - Strictly isolated by project_id and user_id foreign keys    |
|                                    | - Non-recursive RLS: is_project_owner & is_website_member     |
|                                    | - Unique constraint on (project_id, category, key)            |
|                                    | - High-speed machine queryable structured JSONB               |
+------------------------------------+---------------------------------------------------------------+
| Layer 3: Retrieval Service Layer   | Unified abstraction facade in src/lib/knowledge/index.ts      |
|                                    | - Methods: getGlobalKnowledge, getProjectKnowledge,           |
|                                    |   getProjectContext, getKnowledgeByCategory                   |
|                                    | - Transparent fallback to projects columns for backward-compat|
|                                    | - Quarantines customer lead PII from prompt bundles           |
+------------------------------------+---------------------------------------------------------------+
```

### 8.1 Schema Specification: `public.project_knowledge`
```sql
CREATE TABLE public.project_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  content JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'user_input' CHECK (source IN ('user_input', 'ai_inference', 'system_default', 'catalog_sync')),
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_project_knowledge_key UNIQUE (project_id, category, key)
);

-- Indexing for high-speed retrieval
CREATE INDEX idx_project_knowledge_lookup ON public.project_knowledge (project_id, category);
CREATE INDEX idx_project_knowledge_user ON public.project_knowledge (user_id);
```

### 8.2 Non-Recursive RLS Policy for `public.project_knowledge`
```sql
ALTER TABLE public.project_knowledge ENABLE ROW LEVEL SECURITY;

-- Owner & Member Read Policy
CREATE POLICY "project_knowledge_select" ON public.project_knowledge
  FOR SELECT USING (
    public.is_project_owner(project_id) OR
    public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR', 'STAFF'])
  );

-- Owner & Admin Mutation Policy
CREATE POLICY "project_knowledge_insert" ON public.project_knowledge
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      public.is_project_owner(project_id) OR
      public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN'])
    )
  );

CREATE POLICY "project_knowledge_update" ON public.project_knowledge
  FOR UPDATE USING (
    public.is_project_owner(project_id) OR
    public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN'])
  );

CREATE POLICY "project_knowledge_delete" ON public.project_knowledge
  FOR DELETE USING (
    public.is_project_owner(project_id) OR
    public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN'])
  );
```

---

## 9. Implementation Checklist & Verification Protocols

### 9.1 Phase-by-Phase Implementation Checklist

- [ ] **Milestone M1 (Documentation)**: Complete authoritative architectural specifications in `docs/`:
  - `knowledge-base-audit.md` (Completed)
  - `knowledge-base-data-ownership.md` (Completed)
  - `knowledge-base-architecture.md` (Worker 1B)
  - `knowledge-base-update-process.md` (Worker 1B)
- [ ] **Milestone M2 (Global Knowledge Base)**:
  - Implement 7 category modules in `src/knowledge/global/` with `KnowledgeMetadata`.
  - Implement SHA-256 staleness and schema drift detector in `src/knowledge/staleness/audit.ts`.
  - Verify zero user or tenant references exist in `src/knowledge/global/`.
- [ ] **Milestone M3 (Project Knowledge Base & DB Schema)**:
  - Create Supabase migration `20260905000000_create_project_knowledge.sql`.
  - Apply non-recursive RLS helper functions to `public.project_knowledge`.
  - Implement TypeScript types and client accessors in `src/lib/knowledge/client.ts`.
- [ ] **Milestone M4 (Retrieval Layer Abstraction & Generation Integration)**:
  - Implement `IKnowledgeRetrievalService` in `src/lib/knowledge/retrieval.ts`.
  - Implement `getProjectContext` with automatic fallback to `projects` table columns.
  - Refactor `/api/generate` and `/api/plan` to consume `getProjectContext()`.
- [ ] **Milestone M5 (Verification & Non-Regression)**:
  - Verify 100% pass on existing tests: `node tests/project_isolation.test.mjs`.
  - Verify TypeScript compilation: `npx tsc --noEmit`.
  - Run comprehensive E2E test suite covering Tiers 1-4.

### 9.2 Invalidation Conditions
This audit specification shall be considered invalidated and require revision if:
1. Any generation route (`/api/generate`, `/api/plan`, `/api/studio/ai-action`) modifies its core JSON request/response contract.
2. The `public.projects` schema drops `json_data` or relational columns prior to Milestone M4.
3. RLS helper functions (`is_project_owner`, `is_website_member`) are refactored into direct recursive queries.
4. Tenant data is placed into any file within `src/knowledge/global/`.
