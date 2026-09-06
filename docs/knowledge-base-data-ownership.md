# WebsiteBanja Knowledge Base Data Ownership Specification

**Document Version**: 1.0.0  
**Milestone**: M1 (Architecture Documentation)  
**Status**: Authoritative Reference  
**Target Systems**: Next.js App Router, Supabase PostgreSQL, Supabase Storage, Client Stores  

---

## 1. Executive Summary & Core Principles

This document defines the canonical data ownership model, Single Source of Truth (SSOT) mappings, secondary projection rules, and synchronization protocols for all business and project parameters in the WebsiteBanja platform.

### 1.1 The Four Invariants of Data Ownership

Every component, background task, API route, and state store within WebsiteBanja must adhere strictly to these four architectural invariants:

1. **Single Authority Invariant**:  
   Every persistent business and project attribute has exactly one authoritative canonical owner (the Master Writer). Any other appearance of that parameter in memory, local storage, API caches, or document blobs is strictly a **secondary projection**, a **read-only cache**, or a **frozen point-in-time snapshot**. Secondary projections must never be modified directly; they must derive deterministically from the canonical owner.

2. **Strict Multi-Tenant Isolation Invariant**:  
   Tenant data belongs exclusively to the project and user who created it. Tenant data is isolated in Supabase PostgreSQL partitioned by `project_id` and `user_id` foreign keys, enforced at the database layer via non-recursive Row Level Security (RLS). Under no circumstances may tenant data cross project boundaries or be accessible to unauthenticated callers.

3. **Global / Project Decoupling Invariant**:  
   Platform capabilities (supported industries, component schemas, design tokens, generation rules, rate limits) describe what the platform *can do* and are stored exclusively in the immutable Global Knowledge Base (`src/knowledge/global/*`). Tenant parameters describe what a client's business *is* and reside strictly in the User/Project Knowledge Base. Tenant data must never leak into Global KB code files, and Global KB rules must never be stored in mutable tenant tables.

4. **PII Quarantine Invariant**:  
   Customer inquiries and leads submitted through public website forms contain Personally Identifiable Information (PII). Customer leads are strictly quarantined from public preview links, published website snapshots, and AI prompt contexts. Zero customer personal data may ever be passed to LLM endpoints or serialized into public web assets.

---

## 2. Master Canonical Data Ownership Matrix

The following matrix establishes the authoritative owner, secondary projections, and synchronization rules for all parameter groups across WebsiteBanja:

```
+====================================================================================================================================================+
|                                                  MASTER CANONICAL DATA OWNERSHIP MATRIX                                                            |
+====================================================================================================================================================+
| PARAMETER GROUP         | AUTHORITATIVE CANONICAL OWNER     | SECONDARY PROJECTIONS / CACHES            | SYNCHRONIZATION & CONSISTENCY RULE             |
|-------------------------+-----------------------------------+-------------------------------------------+------------------------------------------------|
| 1. Global Platform      | Codebase Global KB                | - System Prompts (src/lib/prompts.ts)     | Versioned static TypeScript files;             |
|    Rules & Taxonomy     | (/src/knowledge/global/*)         | - Studio Action Registry                  | Git-tracked semver (e.g. 1.0.0);               |
|                         |                                   | - Input validation schemas                | Immutable at runtime; zero tenant data.        |
|-------------------------+-----------------------------------+-------------------------------------------+------------------------------------------------|
| 2. Business Identity    | public.project_knowledge          | - public.projects (table columns)         | Write-Through Dual Sync: updating identity     |
|    & Profile            | (category: 'business_profile')    | - projects.json_data (hero, footer)       | updates project_knowledge + projects columns.  |
|                         |                                   | - Zustand useBuilderStore                 | getProjectContext reads project_knowledge first.|
|                         |                                   | - Storage (ai/memory.md, prd.md)          | Dynamic render in WebsiteRenderer.             |
|-------------------------+-----------------------------------+-------------------------------------------+------------------------------------------------|
| 3. Brand Guidelines,    | public.project_knowledge          | - public.projects (style, primary_color)  | Write-Through Dual Sync: theme changes sync to |
|    Colors & Styling     | (category: 'brand_guidelines')    | - Computed WebsiteThemeTokens (18 tokens) | project_knowledge and projects columns.        |
|                         |                                   | - _project_meta in snapshots              | Tokens computed dynamically on canvas render.  |
|                         |                                   | - Storage (planning/ui-ux.md)             | Published snapshot retains frozen tokens.      |
|-------------------------+-----------------------------------+-------------------------------------------+------------------------------------------------|
| 4. Catalog & Commerce   | public.catalog_items              | - Studio canvas live query                | STRICT DE-DUPLICATION: projects.json_data      |
|    Items (Products,     | (Relational database table)       | - Public site live query (/p/[slug])      | MUST NOT embed item arrays. Studio and public  |
|    Rentals, Services)   |                                   | - Preview snapshot via RPC                | sites query catalog_items table dynamically.   |
|                         |                                   | - Zustand useGeneratedWebsiteStore        | Stale items pruned from json_data on load.     |
|-------------------------+-----------------------------------+-------------------------------------------+------------------------------------------------|
| 5. Client Onboarding    | public.project_knowledge          | - public.projects.user_prompt             | Saved during onboarding / extraction flow;     |
|    Intent & Requirements| (category: 'requirements')        | - Zustand useBuilderStore                 | Consumed by /api/generate prompt pipeline;     |
|                         |                                   | - Storage (ai/memory.md, ai/context.md)   | Read-only during live site serving.            |
|-------------------------+-----------------------------------+-------------------------------------------+------------------------------------------------|
| 6. Project Decisions    | public.project_knowledge          | - Storage: ai/decisions.md                | Written during /api/plan generation.           |
|    & Architecture Log   | (category: 'decisions')           | - Storage: ai/changelog.md                | Storage holds human-readable narrative;        |
|                         |                                   |                                           | project_knowledge holds queryable JSON.        |
|-------------------------+-----------------------------------+-------------------------------------------+------------------------------------------------|
| 7. Customer Leads       | public.projects.json_data->'leads'| - public.analytics_events                 | Appended strictly via submit_public_lead RPC.  |
|    & Inquiries (PII)    | (Atomic JSONB array, max 5,000)   |                                           | STRICT PII QUARANTINE: DB triggers strip       |
|                         |                                   |                                           | 'leads' from published_versions and previews.  |
|                         |                                   |                                           | Quarantined from AI prompt generation.         |
|-------------------------+-----------------------------------+-------------------------------------------+------------------------------------------------|
| 8. AI Workspace         | Supabase Storage bucket           | - None (raw markdown files)               | Written by /api/plan via writeAiWorkspace.     |
|    Planning Documents   | ('project-workspaces')            |                                           | Path: {projectId}/.websitebanja/*.md.          |
|                         |                                   |                                           | Isolated by storage RLS on project_id folder.  |
|-------------------------+-----------------------------------+-------------------------------------------+------------------------------------------------|
| 9. Active Draft Layout  | public.projects.json_data         | - Zustand useGeneratedWebsiteStore        | Debounced autosave (600ms) with fingerprint    |
|    & Studio Canvas      | (Excluding catalog items & leads) | - In-memory undo/redo history (50 states) | diffing. Hydrated on editor mount via getProject|
|-------------------------+-----------------------------------+-------------------------------------------+------------------------------------------------|
| 10. Published Live      | public.published_versions         | - Edge CDN cached HTML                    | Immutable historical snapshot created via      |
|     Website Snapshot    | (snapshot_data JSONB)             | - Live site route (/p/[slug])             | publish_project_atomic RPC. Draft edits never  |
|                         |                                   |                                           | mutate live site without explicit publishing.  |
|-------------------------+-----------------------------------+-------------------------------------------+------------------------------------------------|
| 11. Ephemeral Preview   | public.preview_links              | - Preview route (/preview/[id])           | Ephemeral draft snapshot with 2-day TTL.       |
|     Share Links         | (json_data JSONB)                 |                                           | Verified in SQL; leads stripped by trigger.    |
|-------------------------+-----------------------------------+-------------------------------------------+------------------------------------------------|
| 12. Project Roles       | public.website_members            | - Admin route (/api/site-admin/[slug])    | Relational table; unique index enforces 1 OWNER|
|     & Access Control    | (Relational table)                | - Non-recursive RLS is_website_member     | per project. RBAC: OWNER, ADMIN, EDITOR, STAFF |
+====================================================================================================================================================+
```

---

## 3. Detailed Parameter Group Specifications

### 3.1 Global Platform Rules & Taxonomy
- **Canonical Owner**: Codebase modules in `src/knowledge/global/*`.
- **Governed Parameters**:
  - `website_types`: 15 industry classifications, keywords, default service offerings, feature capabilities (`hasCatalog`, `hasLeads`).
  - `components`: 9 core section schemas (`hero`, `about`, `services`, `features`, `faq`, `contact`, `footer`, `products`, `navbar`), component boundaries, and required fields.
  - `integrations`: Integration contracts for WhatsApp direct chat, Google Maps embed, Custom Domain DNS verification, Tel dialer, Mailto.
  - `design_system`: 18 theme tokens (`WebsiteThemeTokens`), Luminous Light vs Dark Luxury contrast rules, typography pairings.
  - `technical_constraints`: `MAX_PROMPT_CHARS = 2000`, `MAX_CONTEXT_CHARS = 12000`, sliding-window rate limits (Free 3/7d, Pro 50/7d), 600ms autosave debounce, 50-state undo limit.
  - `generation_rules`: System prompts, JSON schema enforcement directives, multi-page routing rules, multilingual synonym dictionary (English, Hindi, Hinglish).
  - `backend_capabilities`: Automated rules for detecting managed booking, managed ordering, and static edge CDN distribution.
- **Versioning Protocol**: All Global KB modules export an immutable `KnowledgeMetadata` record including `version` (semver), `status` (`active` | `deprecated`), `updatedAt` (ISO-8601), and `source`.
- **Tenant Integrity**: Absolutely zero tenant or project information may be written to or referenced by these modules.

### 3.2 Business Identity & Profile
- **Canonical Owner**: `public.project_knowledge` under `category = 'business_profile'`.
- **Governed Parameters**:
  - `name` / `business_name`: Official trade name of the business.
  - `category`: Primary industry taxonomy key (e.g. `restaurant`, `dental`, `clinic`).
  - `description`: Formal summary of business operations and value proposition.
  - `target_audience`: Description of target clientele or demographic.
  - `phone`, `email`, `website`, `address`: Primary contact coordinates.
  - `whatsapp_number`, `whatsapp_message`, `whatsapp_enabled`: WhatsApp messaging configuration.
  - `instagram`, `facebook`: Social media profiles.
- **Secondary Projections**:
  - `public.projects` table columns (`business_name`, `category`, `phone`, etc.): Maintained via Write-Through Dual Sync.
  - `projects.json_data.hero.title`, `projects.json_data.footer.copyright`, `projects.json_data.contact.*`: Render projections populated at build time.
  - `useBuilderStore`: In-memory onboarding store hydrated via `hydrateFromProject`.
  - `.websitebanja/ai/memory.md` & `planning/prd.md`: Human-readable storage documents.

### 3.3 Brand Guidelines, Colors & Styling
- **Canonical Owner**: `public.project_knowledge` under `category = 'brand_guidelines'`.
- **Governed Parameters**:
  - `style`: Aesthetic theme mode (`modern`, `minimal`, `vibrant`, `dark`, `playful`, `luxurious`).
  - `primary_color`: Hex brand color code (e.g. `#16A34A`).
  - `secondary_color`: Hex secondary accent code (e.g. `#F59E0B`).
  - `font_family`: Typography pairings (e.g. `inter`, `poppins`, `playfair`).
- **Secondary Projections**:
  - `public.projects` columns (`style`, `primary_color`, `secondary_color`).
  - Computed `WebsiteThemeTokens` (18 CSS custom property variables dynamically resolved via `resolveWebsiteTheme`).
  - Synthetic `_project_meta` injected into `published_versions.snapshot_data` during publication.
  - `.websitebanja/planning/ui-ux.md` in storage.

### 3.4 Catalog & Commerce Items
- **Canonical Owner**: `public.catalog_items` relational database table.
- **Governed Parameters**: 23 normalized schema columns including `id`, `project_id`, `user_id`, `name`, `description`, `item_type` (`product`, `rental`, `service`, `showcase`), `category`, `status` (`active`, `draft`, `out_of_stock`), `images TEXT[]`, `price`, `original_price`, `currency_code`, `show_discount_badge`, `hourly_price`, `daily_price`, `weekly_price`, `monthly_price`, `cta_text`, `cta_link`, `button_action JSONB`, `display_order`, `badge`.
- **Secondary Projections**:
  - Studio Canvas: Dynamic relational query on editor mount or modal close.
  - Public Website (`/p/[slug]`): Real-time query against `catalog_items` matching `project_id` and `status = 'active'`.
  - Ephemeral Preview: Read via `get_preview_catalog` RPC.
- **Strict Anti-Duplication Mandate**:
  - `projects.json_data` MUST NOT store arrays of catalog items.
  - `projects.json_data.productsSection` is restricted strictly to section layout presentation (`title`, `subtitle`, `badge`).
  - Any item arrays discovered in `json_data.products` during load or save are automatically pruned.

### 3.5 Client Onboarding Intent & Requirements
- **Canonical Owner**: `public.project_knowledge` under `category = 'requirements'`.
- **Governed Parameters**:
  - `initial_intent`: The raw, unmodified text prompt entered by the user.
  - `extracted_features`: Key-value map of features extracted via fast parser or LLM.
  - `selected_features`: JSON map of toggled platform capabilities.
  - `target_persona`: Clientele profile inferred during onboarding.
- **Secondary Projections**:
  - `public.projects.user_prompt` and `public.projects.selected_features`.
  - `useBuilderStore` client state.
  - `.websitebanja/ai/memory.md` in storage.

### 3.6 Project Decisions & Architecture Log
- **Canonical Owner**: `public.project_knowledge` under `category = 'decisions'`.
- **Governed Parameters**:
  - Architectural choices recorded by planning models (e.g. multi-page layout choice, form backend selection).
  - Modification changelog entries generated by AI actions.
- **Secondary Projections**:
  - Narrative storage documents: `.websitebanja/ai/decisions.md` and `ai/changelog.md`.

### 3.7 Customer Leads & Inquiries (PII Quarantine)
- **Canonical Owner**: `public.projects.json_data->'leads'` (JSONB array capped at 5,000 entries).
- **Governed Parameters**:
  - Visitor submissions: `id`, `name`, `email`, `phone`, `message`, `created_at`, `source_slug`.
- **Secondary Projections**:
  - `public.analytics_events` (`event_type = 'lead_submit'`).
- **PII Quarantine Mandates**:
  - Appended strictly via PostgreSQL RPC: `submit_public_lead(p_slug, p_lead)`.
  - Stripped automatically `BEFORE INSERT OR UPDATE` on `public.published_versions` via database trigger `published_versions_strip_leads`.
  - Stripped automatically `BEFORE INSERT OR UPDATE` on `public.preview_links` via database trigger `preview_links_strip_leads`.
  - The Knowledge Retrieval Service (`getProjectContext`) strictly filters out the `'leads'` key, ensuring zero PII enters AI prompt contexts.

### 3.8 AI Workspace Planning Documents
- **Canonical Owner**: Supabase Storage bucket `project-workspaces` at path `${projectId}/.websitebanja/${file}`.
- **Governed Parameters**: The 15 canonical markdown files generated by `/api/plan`.
- **Access Boundary**: Accessible only by authenticated project owners and members via storage RLS. Never serialized en-masse into generation prompts; structured context is retrieved from `public.project_knowledge` instead.

### 3.9 Active Draft Layout & Studio Canvas
- **Canonical Owner**: `public.projects.json_data` (excluding catalog items and customer leads).
- **Governed Parameters**: Multi-page website layout tree (`pages[]`, `sectionOrder[]`, section configurations for `hero`, `about`, `services`, `features`, `faq`, `contact`, `footer`, `navbar`).
- **Secondary Projections**:
  - Zustand `useGeneratedWebsiteStore`.
  - Undo/Redo history stack (in-memory, maximum 50 snapshots).

### 3.10 Published Live Website Snapshots
- **Canonical Owner**: `public.published_versions` table (`snapshot_data JSONB`).
- **Governed Parameters**: Frozen, immutable copy of `WebsiteData` representing production site at publication timestamp.
- **Secondary Projections**: Edge CDN cached HTML/JSON; served at `/p/[slug]` and custom domain routes.
- **Immutability Invariant**: Mutating active draft `json_data` or `project_knowledge` has zero effect on `published_versions` until the user explicitly executes `publishProject()` (which invokes `publish_project_atomic` RPC).

---

## 4. Parameter Synchronization, Drift Elimination & Consistency Protocols

To maintain consistency across relational tables, JSONB blobs, and client stores, WebsiteBanja enforces four consistency protocols:

```
+----------------------------------------------------------------------------------------------------+
|                                    FOUR CONSISTENCY PROTOCOLS                                      |
+------------------------------------+---------------------------------------------------------------+
| Protocol 1: Write-Through Dual     | Any update to identity or branding synchronizes to BOTH       |
| Synchronization                    | public.project_knowledge AND public.projects columns.         |
+------------------------------------+---------------------------------------------------------------+
| Protocol 2: Strict Catalog         | Catalog items reside solely in public.catalog_items.          |
| De-duplication                     | projects.json_data is pruned of item arrays on load & save.   |
+------------------------------------+---------------------------------------------------------------+
| Protocol 3: Customer Lead PII      | Customer inquiries are quarantined in json_data->'leads'.    |
| Quarantine                         | DB triggers strip leads from published snapshots & previews.  |
|                                    | getProjectContext excludes leads from all AI prompt payloads.  |
+------------------------------------+---------------------------------------------------------------+
| Protocol 4: Narrative Storage vs   | Storage bucket project-workspaces holds narrative markdown.   |
| Structured Knowledge Separation    | public.project_knowledge holds machine-queryable JSON context. |
|                                    | Eliminates multi-file storage downloads on prompt generation. |
+------------------------------------+---------------------------------------------------------------+
```

### 4.1 Protocol 1: Write-Through Dual Synchronization (Identity & Branding)
- **Problem**: Legacy UI views (`/dashboard`, `/editor/[id]/branding`) read and write `public.projects` table columns directly (`business_name`, `category`, `primary_color`). The new retrieval architecture introduces `public.project_knowledge`. Updating one without the other causes data drift.
- **Rule**:
  1. *Writing via Retrieval Service*: When calling `IKnowledgeRetrievalService.setProjectKnowledge(projectId, category, key, content)`, the service persists the record to `public.project_knowledge`. If the key matches a legacy column (`business_name`, `category`, `description`, `primary_color`, `secondary_color`, `style`, `phone`, `email`), the service automatically executes a write-through update to `public.projects`.
  2. *Writing via Project Helper*: When calling `updateProject(projectId, updates)` (`src/lib/projects.ts`), the helper updates `public.projects` and executes an upsert into `public.project_knowledge` for matching categories (`business_profile`, `brand_guidelines`).
  3. *Reading Precedence*: `getProjectContext` evaluates `public.project_knowledge` first. If no entry is present, it falls back to the `projects` table column.

### 4.2 Protocol 2: Strict Catalog De-duplication
- **Problem**: If product items are stored in both `public.catalog_items` and `projects.json_data.products`, updating an item in the Catalog Manager leaves `json_data` displaying stale prices and descriptions.
- **Rule**:
  1. `projects.json_data` is strictly forbidden from holding catalog item arrays.
  2. The `productsSection` within `projects.json_data` holds only layout metadata:
     ```json
     {
       "title": "Our Signature Menu",
       "subtitle": "Fresh organic ingredients daily",
       "badge": "Popular"
     }
     ```
  3. Both the Studio canvas (`WebsiteRenderer.tsx`) and the live site (`/p/[slug]`) dynamically query `public.catalog_items` (or `get_preview_catalog` for previews).
  4. On project hydration and before autosave, `pruneCatalogFromLayout(jsonData)` strips any nested `products` or `items` arrays from `jsonData`.

### 4.3 Protocol 3: Customer Lead PII Quarantine
- **Problem**: Inquiries submitted through public contact forms contain user names, phone numbers, and emails. If included in published snapshots, preview links, or AI prompts, customer data is leaked.
- **Rule**:
  1. Public submissions enter strictly via `submit_public_lead(p_slug, p_lead)` RPC, appending to `projects.json_data->'leads'`.
  2. Database triggers `published_versions_strip_leads` and `preview_links_strip_leads` automatically strip the `'leads'` key `BEFORE INSERT OR UPDATE` on `public.published_versions` and `public.preview_links`.
  3. The Knowledge Retrieval Service (`getProjectContext`) unconditionally excludes customer leads from context bundles passed to AI prompt builders.

### 4.4 Protocol 4: Narrative Storage vs Structured Knowledge Separation
- **Problem**: Supabase Storage bucket `project-workspaces` contains 15 markdown planning documents. Serializing 15 markdown files on every generation call creates severe latency (up to 5 seconds of storage download time) and consumes 25,000+ characters of context window.
- **Rule**:
  1. Storage bucket `project-workspaces` is the authoritative repository for **human-readable narrative documentation** (`prd.md`, `trd.md`, `app-flow.md`, `memory.md`).
  2. `public.project_knowledge` is the authoritative repository for **machine-queryable, structured parameters** (`requirements`, `business_profile`, `brand_guidelines`, `decisions`).
  3. `/api/plan` writes the 15 markdown files to storage and simultaneously indexes structured parameters into `public.project_knowledge` using `source = 'ai_inference'`.
  4. `/api/generate` retrieves structured context via `getProjectContext()`, eliminating expensive multi-file storage downloads on prompt generation.

---

## 5. Retrieval Precedence & Fallback Resolution

When calling `getProjectContext(projectId)` to construct the context bundle for AI generation, rendering, or API inspection, the retrieval engine follows a deterministic 4-step precedence hierarchy:

```
[getProjectContext(projectId) Invoked]
                  │
                  ▼
   +------------------------------+
   | Step 1: Query                |  Found?
   | public.project_knowledge     | ───────> [Return project_knowledge Value]
   +------------------------------+
                  │ (Not Found)
                  ▼
   +------------------------------+
   | Step 2: Query                |  Found?
   | public.projects Column       | ───────> [Return projects Column Value]
   +------------------------------+
                  │ (Not Found)
                  ▼
   +------------------------------+
   | Step 3: Query                |  Found?
   | projects.json_data Attribute | ───────> [Return json_data Value]
   +------------------------------+
                  │ (Not Found)
                  ▼
   +------------------------------+
   | Step 4: Resolve Global KB    |
   | Default for Category         | ───────> [Return Global KB Default]
   +------------------------------+
```

### Detailed Resolution Order:
1. **Primary Authority (`public.project_knowledge`)**:
   Query `public.project_knowledge` for `(project_id, category, key)`. If a valid record exists, its `content` is authoritative.
2. **First Fallback (`public.projects` Relational Column)**:
   If no record exists in `project_knowledge`, inspect the corresponding column in `public.projects` (e.g. `primary_color`, `style`, `business_name`, `phone`).
3. **Second Fallback (`projects.json_data` Attribute)**:
   If the column is null or empty, inspect matching attributes inside `projects.json_data` (e.g. `json_data.contact.phone`).
4. **Third Fallback (Global Knowledge Base Defaults)**:
   If no project-level data exists, look up the platform default for the project's industry category from `src/knowledge/global/` (e.g., category-specific color palette or default services list).

---

## 6. Prohibited Anti-Patterns & Invariant Violations

To protect architectural integrity, the following implementation anti-patterns are strictly prohibited:

| Anti-Pattern | Description of Violation | Consequence / Hazard |
|---|---|---|
| **AP-1: Catalog in JSON** | Serializing full item arrays into `projects.json_data.products` or `productsSection.products`. | Causes catalog desynchronization when items are updated via Catalog Manager. |
| **AP-2: Tenant in Global KB** | Storing client names, custom styles, or user IDs inside `src/knowledge/global/*`. | Cross-tenant data leakage; violates tenant isolation invariant. |
| **AP-3: Orphaned Secondary Write** | Modifying secondary projections (`projects` columns or `json_data`) without updating canonical owner (`project_knowledge`). | Data drift; retrieval service returns stale data on subsequent reads. |
| **AP-4: PII in AI Prompts** | Passing `projects.json_data->'leads'` or customer contact records into `/api/generate` or `/api/plan`. | Violates user privacy; leaks customer contact data to external AI model providers. |
| **AP-5: RLS Bypass in Tenant Routes** | Utilizing Supabase `service_role` client in tenant-facing API routes instead of user-scoped client. | Allows malicious users to forge `project_id` and tamper with other tenants' data. |

---

## 7. Verification & Audit Checklist

Engineers, automated CI pipelines, and auditors must verify data ownership compliance against this checklist:

### 7.1 Database Verification Checklist
- [ ] `public.project_knowledge` exists with composite unique constraint `UNIQUE (project_id, category, key)`.
- [ ] RLS is enabled on `public.project_knowledge` using non-recursive helper functions (`is_project_owner`, `is_website_member`).
- [ ] Trigger `published_versions_strip_leads` is active on `public.published_versions`.
- [ ] Trigger `preview_links_strip_leads` is active on `public.preview_links`.
- [ ] Trigger `projects_prevent_owner_reassignment` is active on `public.projects`.
- [ ] `public.catalog_items` is the sole repository of catalog products; no catalog item objects exist in `projects.json_data`.

### 7.2 Retrieval Layer Verification Checklist
- [ ] `getGlobalKnowledge` queries return strictly platform capabilities and never contain `project_id` or `user_id`.
- [ ] `getProjectKnowledge` returns records scoped strictly to the authenticated tenant.
- [ ] `getProjectContext` executes the 4-step fallback sequence and excludes customer leads from returned bundles.
- [ ] `setProjectKnowledge` executes write-through updates to `public.projects` for matching legacy columns.

### 7.3 Automated Test Verification Commands
```bash
# Verify CTA actions, snapshot immutability, 10-step catalog persistence, and 3-project tenant isolation
node tests/project_isolation.test.mjs

# Verify strict TypeScript type compliance across all models and accessors
npx tsc --noEmit
```
