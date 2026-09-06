# WebsiteBanja Knowledge Base Architecture Specification

- **Milestone**: M1 (Architecture Documentation) — Feature 3
- **Status**: APPROVED ARCHITECTURE SPECIFICATION
- **Version**: 1.0.0
- **Authors**: Platform Engineering & Core Architecture Team
- **Target Audience**: Core Engineers, AI Agent Implementers, QA & Forensic Auditors

---

## 1. Executive Summary & Architectural Principles

WebsiteBanja is an intelligent website generation, planning, and visual customization platform built with Next.js (App Router), Supabase (PostgreSQL, Row Level Security, Auth, Storage), and OpenAI models (`gpt-4.1-mini`, `gpt-4o-mini`).

As the platform scales from single-shot prompt-based generation to multi-step agentic planning and continuous studio editing, maintaining a coherent knowledge boundary is essential. Without a rigorous boundary, two fatal architectural failures occur:
1. **Tenant Cross-Contamination**: One user's proprietary business requirements, client data, or brand decisions inadvertently leak into the generation context of another user.
2. **Platform Knowledge Fragmentation**: Platform capabilities (supported website categories, component layouts, integration schemas, design tokens, rate limits, prompt rules) become hardcoded and scattered across API handlers, client components, and unstructured markdown files, leading to silent prompt drift and AI hallucination.

To eliminate these vulnerabilities, WebsiteBanja establishes the **Dual-Domain Knowledge Base Paradigm**:

```
+---------------------------------------------------------------------------------------------------+
|                                  WEBSITEBANJA DUAL-DOMAIN ARCHITECTURE                            |
+-------------------------------------------------+-------------------------------------------------+
|               GLOBAL KNOWLEDGE BASE             |              PROJECT KNOWLEDGE BASE             |
|              (Platform Capabilities)            |                 (Tenant Context)                |
+-------------------------------------------------+-------------------------------------------------+
| - Codebase-resident (src/knowledge/global/*)    | - Database-resident (public.project_knowledge)  |
| - Immutable at runtime (Object.freeze)          | - Mutable via authenticated tenant sessions     |
| - Zero database queries at runtime              | - Strictly scoped to (project_id, user_id)      |
| - Strictly zero tenant or user data             | - Protected by non-recursive Supabase RLS       |
| - Versioned via SemVer and checksummed          | - Categorized (business_profile, brand, etc.)   |
| - Audited for code parity & drift in CI/CD      | - Automatic fallback to legacy projects columns |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                              KNOWLEDGE RETRIEVAL SERVICE FACADE                                   |
|                                   (src/lib/knowledge/index.ts)                                    |
|   Decoupled unified interface shielding generation routes and AI agents from physical storage    |
+---------------------------------------------------------------------------------------------------+
```

### Guiding Architectural Axioms

1. **Axiom 1: Zero Tenant Data in Global Knowledge Base**:
   The Global Knowledge Base contains solely platform capabilities, schemas, rules, design tokens, and technical constraints. It NEVER ingests, caches, stores, or reflects any user email, tenant identifier, business name, custom copy, or customer lead.
2. **Axiom 2: Strict Multi-Tenant Row-Level Security (RLS)**:
   Every record in the Project Knowledge Base is bound to a `project_id` and `user_id`. PostgreSQL Row Level Security is enabled and enforced unconditionally. Anonymous users and unauthorized tenants receive zero rows under all circumstances.
3. **Axiom 3: Non-Recursive RLS via SECURITY DEFINER Helpers**:
   To prevent PostgreSQL error `42P17` (`infinite recursion detected in policy for relation`), RLS policies on `public.project_knowledge` strictly invoke pre-compiled `SECURITY DEFINER` functions (`public.is_project_owner` and `public.is_website_member`) rather than performing nested relational subqueries.
4. **Axiom 4: Backward Compatibility & Zero Generation Regressions**:
   Existing generation routes (`/api/generate`, `/api/plan`), conversational onboarding (`/api/agent/talk`), and Visual Studio AI actions (`/api/studio/ai-action`) must continue operating without breaking changes. When querying project context for legacy projects that lack rows in `public.project_knowledge`, the retrieval layer automatically falls back to reading the canonical columns in `public.projects`.
5. **Axiom 5: Deterministic Staleness and Drift Auditability**:
   The Global Knowledge Base must remain in 100% lockstep with platform source code. Automated static code reflection and cryptographic SHA-256 hashing run in CI/CD to detect any drift between registered knowledge entries and UI components, category mappings, or backend detection logic.

---

## 2. End-to-End System Architecture

The following diagram details the interaction between consumer routes, the retrieval service layer, and the two physical storage domains:

```
+----------------------------------------------------------------------------------------------------+
|                                         CALLING CLIENTS                                            |
|                                                                                                    |
|  +------------------------+  +---------------------+  +--------------------+  +-----------------+  |
|  | /api/generate          |  | /api/plan           |  | /api/studio/       |  | /api/agent/     |  |
|  | Full Website Generator |  | Multi-doc Planner   |  | ai-action (Copilot)|  | talk (Mitra)    |  |
|  +-----------+------------+  +----------+----------+  +---------+----------+  +--------+--------+  |
|              |                          |                       |                      |           |
|              +--------------------------+-----------+-----------+----------------------+           |
|                                                     |                                              |
+-----------------------------------------------------|----------------------------------------------+
                                                      v
+----------------------------------------------------------------------------------------------------+
|                                 KNOWLEDGE RETRIEVAL SERVICE FACADE                                 |
|                                    (src/lib/knowledge/index.ts)                                    |
|                                                                                                    |
|  Global Accessors:                                   Project Accessors (User JWT Scoped):          |
|  - getGlobalKnowledge(category?, options?)           - getProjectKnowledge(projectId, token)       |
|  - getGlobalKnowledgeById(id)                        - getProjectKnowledgeItem(proj, cat, key)     |
|  - getKnowledgeByCategory(category)                  - getProjectContext(projectId, token)         |
|  - checkKnowledgeStaleness()                         - setProjectKnowledge(proj, cat, key, data)   |
+------------------------------------+-----------------------------------------------+---------------+
                                     |                                               |
                                     v                                               v
+----------------------------------------------------+     +-----------------------------------------+
|               GLOBAL KNOWLEDGE BASE                |     |          PROJECT KNOWLEDGE BASE         |
|              (src/knowledge/global/*)              |     |       (Supabase PostgreSQL + RLS)       |
|                                                    |     |                                         |
|  Compiled In-Memory TypeScript Modules:            |     |  public.project_knowledge:              |
|  1. website-types.ts (15 Industry Archetypes)      |     |  - id: UUID (PK)                        |
|  2. components.ts (9 Sections & UI Primitives)     |     |  - project_id: UUID (FK -> projects)    |
|  3. integrations.ts (WhatsApp, Leads, Custom Dom)  |     |  - user_id: UUID (FK -> auth.users)     |
|  4. design-system.ts (Luminous, Dark, CSS Tokens)  |     |  - category: TEXT                       |
|  5. technical-constraints.ts (Rate Limits, Caps)   |     |  - key: TEXT                            |
|  6. generation-rules.ts (Prompts, Schemas, Guards) |     |  - content: JSONB                       |
|  7. backend-capabilities.ts (Booking, Orders, Edge)|     |  - source: TEXT                         |
|                                                    |     |  - version: INTEGER                     |
|  Storage Properties:                               |     |  - metadata: JSONB                      |
|  - 0 Network / Database Calls                      |     |  - created_at / updated_at: TIMESTAMPTZ |
|  - Read-Only (Object.freeze)                       |     |                                         |
|  - 100% Deterministic Access                       |     |  Indexes & Constraints:                 |
|  - Zero Cross-Tenant State                         |     |  - UNIQUE(project_id, category, key)    |
|  - Automatic Parity Verification                   |     |  - Non-Recursive RLS Enforcement        |
+----------------------------------------------------+     +--------------------+--------------------+
                                                                                | (Fallback on miss)
                                                                                v
                                                           +-----------------------------------------+
                                                           |             public.projects             |
                                                           |   (Canonical Legacy Column Fallback)    |
                                                           |  - business_name, category, description |
                                                           |  - phone, email, style, colors, features|
                                                           +-----------------------------------------+
```

### Comprehensive Data Flow Walkthrough

1. **Generation Request Initiation**:
   - A client initiates a generation or planning request at `/api/generate` or `/api/plan` providing a `projectId` and an authenticated Bearer JWT.
2. **Context Resolution**:
   - The route calls `getProjectContext(projectId, token)` on the Knowledge Retrieval Service facade.
   - The retrieval service instantiates a user-scoped Supabase client via `getUserScopedClient(token)`.
   - It queries `public.project_knowledge` for records belonging to `projectId`.
   - **Fallback Condition**: If no rows exist (e.g. legacy project), it queries `public.projects` directly for `business_name`, `category`, `description`, `phone`, `email`, `style`, `primary_color`, `secondary_color`, and `json_data->'features'`. It constructs the `ProjectContextBundle` and asynchronously seeds `public.project_knowledge` with `source = 'system_default'`.
3. **Global Capability Injection**:
   - The retrieval service matches the resolved project `category` against the Global Knowledge Base (`website_types`).
   - It retrieves recommended section components, default styles, required integrations, backend requirements, and generation prompt guardrails.
4. **Prompt Assembly & Guardrail Enforcement**:
   - The generation endpoint constructs the prompt bundle by injecting:
     - Tenant-specific business context from `ProjectContextBundle`.
     - System prompts and forbidden output rules from `generation_rules`.
     - Component schema constraints from `components`.
5. **Model Invocation & Sanitization**:
   - The OpenAI API (`gpt-4.1-mini`) executes the generation with `response_format: { type: "json_object" }`.
   - The response is parsed and validated against `WebsiteData` schema.
   - Any returned button actions or links are sanitized via `sanitizeActionUrl`.
6. **State Persistence**:
   - The generated website is saved into `public.projects.json_data`.
   - Any extracted business profile attributes are persisted into `public.project_knowledge` under `category: 'business_profile'` with `source: 'ai_inference'`.

---

## 3. Global Knowledge Base Specification (Requirement R2)

The Global Knowledge Base is organized into **7 discrete categories** implemented as strongly-typed, immutable TypeScript files under `src/knowledge/global/`.

### 3.1 Taxonomy of the 7 Core Categories

#### 1. `website_types` (`src/knowledge/global/website-types.ts`)
Defines the 15 supported industry archetypes recognized by WebsiteBanja:
- **Supported Categories**: `grocery`, `cafe`, `restaurant`, `gym`, `salon`, `clinic`, `architecture`, `real estate`, `hotel`, `agency`, `tech`, `e-commerce`, `education`, `portfolio`, `general`.
- **Payload Schema (`WebsiteTypePayload`)**:
  ```typescript
  export interface WebsiteTypePayload {
    key: string;                                    // e.g. "restaurant"
    displayName: string;                            // e.g. "Restaurant & Fine Dining"
    industryKeywords: string[];                     // e.g. ["dining", "food", "chef", "bistro", "menu"]
    recommendedSections: string[];                 // e.g. ["navbar", "hero", "about", "productsSection", "features", "faq", "contact", "footer"]
    defaultServices: string[];                      // e.g. ["Dine-In Experience", "Private Event Catering", "Online Table Booking"]
    defaultStyle: "clean" | "bold" | "modern" | "luxury" | "minimal";
    defaultPrimaryColor: string;                    // Hex color code, e.g. "#DC2626"
    defaultSecondaryColor: string;                  // Hex color code, e.g. "#1E293B"
    hasCatalog: boolean;                            // true for restaurant/grocery/cafe
    catalogLabel: string;                           // e.g. "Menu Highlights", "Product Catalog"
    defaultBackendRequirement: "static" | "managed_booking" | "managed_orders" | "custom_api";
    targetAudienceArchetypes: string[];             // e.g. ["Local food lovers", "Corporate event planners"]
  }
  ```

#### 2. `components` (`src/knowledge/global/components.ts`)
Defines the 9 core section components, 11 UI primitives, and 7 button actions supported by the renderer and visual editor:
- **Core Sections**: `navbar`, `hero`, `about`, `services`, `features`, `productsSection`, `faq`, `contact`, `footer`.
- **UI Primitives (`ElementType`)**: `heading`, `paragraph`, `button`, `image`, `badge`, `card`, `link`, `product`, `section`, `logo`, `page`.
- **Button Actions (`ButtonActionType`)**: `scroll`, `page`, `url`, `whatsapp`, `call`, `email`, `none`.
- **Payload Schema (`ComponentDefinitionPayload`)**:
  ```typescript
  export interface ComponentDefinitionPayload {
    componentKey: string;                           // e.g. "hero"
    displayName: string;                           // e.g. "Hero Banner"
    description: string;
    allowedElementTypes: ElementType[];
    requiredFields: string[];                       // e.g. ["title", "subtitle", "button"]
    optionalFields: string[];                       // e.g. ["image", "buttonAction"]
    supportsButtonAction: boolean;
    supportsImageFallback: boolean;
    defaultData: Record<string, unknown>;
  }
  ```

#### 3. `integrations` (`src/knowledge/global/integrations.ts`)
Defines platform-level integrations available to websites:
- **Supported Integrations**: `whatsapp`, `lead_capture`, `custom_domains`, `analytics_events`, `admin_portal`.
- **Payload Schema (`IntegrationPayload`)**:
  ```typescript
  export interface IntegrationPayload {
    integrationKey: string;                         // e.g. "whatsapp"
    name: string;                                   // e.g. "WhatsApp Direct Connect"
    description: string;
    configurationRequirements: string[];            // e.g. ["phone_number_e164", "default_message"]
    endpoint?: string;                              // e.g. "https://wa.me/{phone}"
    supportedActions: ButtonActionType[];          // e.g. ["whatsapp"]
    isProOnly: boolean;                             // Plan gating flag
  }
  ```

#### 4. `design_system` (`src/knowledge/global/design-system.ts`)
Defines design tokens, visual themes, color palettes, and contrast rules:
- **Themes**: `luminous_light` (clean, crisp, accessible), `dark_luxury` (high-contrast, deep slate/obsidian).
- **CSS Variable Tokens (18 Variables)**: `--wb-primary`, `--wb-secondary`, `--wb-bg`, `--wb-text-main`, `--wb-text-muted`, `--wb-card-bg`, `--wb-card-border`, `--wb-accent`, `--wb-nav-bg`, `--wb-footer-bg`, `--wb-btn-primary-bg`, `--wb-btn-primary-text`, `--wb-btn-secondary-bg`, `--wb-btn-secondary-text`, `--wb-radius-sm`, `--wb-radius-md`, `--wb-radius-lg`, `--wb-shadow`.
- **Accessibility Standards**: Contrast ratio >= 4.5:1 for normal text (WCAG AA), >= 3.0:1 for large text and UI components.
- **Dark Theme Activation Keywords**: `"dark"`, `"night"`, `"black"`, `"luxury"`, `"neon"`, `"cyber"`, `"obsidian"`.

#### 5. `technical_constraints` (`src/knowledge/global/technical-constraints.ts`)
Defines hard limits, rate limiting thresholds, input validation bounds, and operational boundaries:
- **Rate Limits**:
  - Free Plan: 3 website generations per 7 rolling days.
  - Pro Plan: 50 website generations per 7 rolling days.
  - Studio Copilot (`/api/studio/ai-action`): 30 requests per minute.
  - Conversational Agent (`/api/agent/talk`): 30 turns per minute.
- **Payload Bounds**:
  - Max prompt length: 2,000 characters.
  - Max conversation context: 12,000 characters.
  - Max business name length: 200 characters.
  - Max business description length: 3,000 characters.
- **Input Validation Standards**:
  - Phone validation: E.164 standard (+ followed by 7 to 15 digits; auto-normalizes 10-digit Indian numbers with +91).
  - Email validation: RFC 5322 compliant regex.
  - URL sanitization: Blocks `javascript:`, `vbscript:`, `data:text/html`.
- **Operational Timeouts**:
  - OpenAI Generation Timeout: 45,000 ms.
  - Planning Pipeline Timeout: 60,000 ms.

#### 6. `generation_rules` (`src/knowledge/global/generation-rules.ts`)
Defines the system prompts, AI behavioral guardrails, and JSON schemas for LLM pipelines:
- **Core Guardrails**:
  - *No Markdown / HTML*: Never wrap output in ```json or markdown blocks; return raw JSON only.
  - *Brand Fidelity*: Never invent another business name; use the exact business name provided by the user.
  - *Completeness*: Always populate all 9 core section components. Never leave arrays empty.
  - *Valid Action Mapping*: Every button action must contain a valid `type` and non-empty `target`.
- **Schema Contracts**: Strict TypeScript interfaces mapping to `WebsiteData`.

#### 7. `backend_capabilities` (`src/knowledge/global/backend-capabilities.ts`)
Defines the backend infrastructure archetypes automatically detected from business categories:
- **Archetypes**:
  1. `managed_booking`: Real-time booking & appointment engine (Clinics, Salons, Hotels, Real Estate).
  2. `managed_orders`: Order processing, catalog sync, and menu management (Restaurants, Cafes, Grocery, Retail).
  3. `static`: High-speed global edge delivery with form lead capture (Portfolios, Agencies, Tech, General).
  4. `custom_api`: External webhook integration (Zapier, CRM, Custom endpoints).

### 3.2 Standardized Knowledge Metadata Header

Every global knowledge entry conforms to the `GlobalKnowledgeEntry<T>` contract:

```typescript
export type GlobalKnowledgeCategory =
  | 'website_types'
  | 'components'
  | 'integrations'
  | 'design_system'
  | 'technical_constraints'
  | 'generation_rules'
  | 'backend_capabilities';

export interface KnowledgeMetadata {
  id: string;                         // Canonical URN, e.g. "wb:global:website_types:restaurant:v1"
  category: GlobalKnowledgeCategory;
  title: string;                      // Human-readable title
  description: string;                // Functional description
  version: string;                    // Semantic Version (e.g. "1.0.0")
  status: 'active' | 'deprecated' | 'draft';
  source: string;                     // Relative file path, e.g. "src/knowledge/global/website-types.ts"
  schemaVersion: string;              // Schema standard version, e.g. "1.0.0"
  updatedAt: string;                  // ISO 8601 UTC timestamp
  tags?: string[];                    // Indexing and search keywords
}

export interface GlobalKnowledgeEntry<T = unknown> {
  metadata: KnowledgeMetadata;
  data: T;
}
```

### 3.3 Zero-Tenant-Data Guarantees

The Global Knowledge Base enforces four architectural guarantees against tenant data contamination:
1. **Physical Code Isolation**: All global knowledge definitions exist solely in TypeScript files under `src/knowledge/global/`. They are compiled into the static server bundle. They do not connect to Supabase or any external database.
2. **Zero Runtime Database Dependency**: Accessing global knowledge requires zero network round-trips and zero SQL queries. It is evaluated entirely in-memory.
3. **Runtime Immutability**: All global knowledge registry objects are frozen using `Object.freeze()` at application startup. No mutation methods (`set`, `update`, `delete`) exist in the global interface.
4. **Zero Secrets in Repository**: No API keys, JWT secrets, database connection strings, or tenant credentials exist within knowledge data files. All secrets are retrieved exclusively from process environment variables via server-only helpers.

---

## 4. Project Knowledge Base Specification (Requirement R3)

The Project Knowledge Base stores tenant-specific business information, client preferences, branding decisions, and custom domain parameters. It resides in Supabase PostgreSQL under the table `public.project_knowledge` and is protected by PostgreSQL Row Level Security.

### 4.1 Data Model & PostgreSQL DDL

```sql
-- =====================================================================================
-- Migration: Create public.project_knowledge
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.project_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  content JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'user_input',
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Composite unique constraint: exactly one canonical entry per (project_id, category, key)
  CONSTRAINT unique_project_knowledge_key UNIQUE (project_id, category, key)
);

-- =====================================================================================
-- High-Performance Lookup Indexes
-- =====================================================================================

CREATE INDEX IF NOT EXISTS idx_project_knowledge_project 
  ON public.project_knowledge(project_id);

CREATE INDEX IF NOT EXISTS idx_project_knowledge_category 
  ON public.project_knowledge(project_id, category);

CREATE INDEX IF NOT EXISTS idx_project_knowledge_user 
  ON public.project_knowledge(user_id);

CREATE INDEX IF NOT EXISTS idx_project_knowledge_composite 
  ON public.project_knowledge(project_id, category, key);
```

### 4.2 Allowed Project Knowledge Categories

To maintain strict schema consistency, entries in `public.project_knowledge` are partitioned into 6 standardized categories:

| Category | Description | Common Keys | Example Content |
|---|---|---|---|
| `business_profile` | Core business identity & narrative | `identity`, `story`, `contact` | `{ name: "Apex Dental", category: "clinic", tagline: "Gentle Dental Care" }` |
| `brand_guidelines` | Visual styling & color rules | `palette`, `typography`, `imagery` | `{ primaryColor: "#0284C7", secondaryColor: "#0F172A", style: "clean" }` |
| `target_audience` | Customer personas & demographics | `primary_demographic`, `pain_points` | `{ demographic: "Local families", painPoints: ["Fear of dentists", "Pricing transparency"] }` |
| `requirements` | Functional & feature selections | `feature_flags`, `page_structure` | `{ hasCatalog: false, whatsappBooking: true, multiPage: true }` |
| `decisions` | Architectural & layout decisions | `layout_choice`, `section_ordering` | `{ chosenHeroLayout: "split_image_right", navbarStyle: "sticky_blur" }` |
| `integrations` | Tenant integration credentials | `whatsapp_config`, `domain_config` | `{ phoneNumber: "+919876543210", customDomain: "apexdental.in" }` |

### 4.3 Non-Recursive Row Level Security (RLS) Policies

#### The Recursion Hazard in PostgreSQL RLS
In complex multi-tenant architectures, a common flaw occurs when a table's RLS policy queries `public.projects`, while `public.projects` has an RLS policy querying `public.website_members`, which in turn references `public.projects`. This creates a cyclic dependency that triggers PostgreSQL error `42P17`: `infinite recursion detected in policy for relation "projects"`.

#### Non-Recursive Solution via SECURITY DEFINER Helpers
WebsiteBanja completely eliminates RLS recursion by using pre-compiled, search-path-restricted `SECURITY DEFINER` functions established in migration `20260817000005_fix_rls_recursion.sql`:
1. `public.is_project_owner(project_uuid uuid) -> boolean`
2. `public.is_website_member(project_uuid uuid, required_roles public.admin_role[] DEFAULT NULL) -> boolean`

Because these functions run with the elevated privilege of the function owner (bypassing nested RLS evaluation on `projects` and `website_members` during the check), they evaluate in `O(1)` time without recursion.

#### Complete SQL RLS Policy Definitions

```sql
-- 1. Enable RLS on the table
ALTER TABLE public.project_knowledge ENABLE ROW LEVEL SECURITY;

-- 2. SELECT Policy: Project owner or authorized website member
CREATE POLICY "Project knowledge select policy"
ON public.project_knowledge FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_project_owner(project_id)
  OR public.is_website_member(project_id)
);

-- 3. INSERT Policy: Project owner or member with OWNER, ADMIN, or EDITOR role
CREATE POLICY "Project knowledge insert policy"
ON public.project_knowledge FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
  )
);

-- 4. UPDATE Policy: Project owner or member with OWNER, ADMIN, or EDITOR role
CREATE POLICY "Project knowledge update policy"
ON public.project_knowledge FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
  )
);

-- 5. DELETE Policy: Project owner or member with OWNER or ADMIN role
CREATE POLICY "Project knowledge delete policy"
ON public.project_knowledge FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN']::public.admin_role[])
  )
);
```

#### Zero Anonymous Access Guarantee
Notice that policies are granted strictly `TO authenticated`. There is NO policy granted to `anon`. Unauthenticated visitors browsing a published site (`/p/[slug]`) or preview (`/preview/[id]`) read only the pre-rendered snapshot in `published_versions` or public project metadata. They have zero direct read or write access to `public.project_knowledge`.

---

## 5. Knowledge Retrieval Layer Abstraction (Requirement R4)

The Knowledge Retrieval Layer provides a clean, decoupled service abstraction (`src/lib/knowledge/`) that isolates callers from underlying storage mechanics (static TypeScript modules vs Supabase PostgREST tables).

### 5.1 Service Interface Contract (`IKnowledgeRetrievalService`)

```typescript
import type { 
  GlobalKnowledgeCategory, 
  GlobalKnowledgeEntry 
} from "@/knowledge/global/types";

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

export interface StalenessIssue {
  itemId?: string;
  category: GlobalKnowledgeCategory;
  severity: 'low' | 'medium' | 'high';
  code: 'HASH_MISMATCH' | 'SCHEMA_DRIFT' | 'MISSING_CODE_PARITY' | 'EXPIRED_TTL';
  message: string;
  remediation: string;
}

export interface StalenessReport {
  timestamp: string;
  totalEntries: number;
  staleCount: number;
  healthy: boolean;
  issues: StalenessIssue[];
}

export interface ProjectContextBundle {
  projectId: string;
  businessName: string;
  category: string;
  description: string;
  targetAudience: string;
  style: string;
  primaryColor: string;
  secondaryColor: string;
  contact: {
    phone: string;
    email: string;
    address: string;
    whatsappNumber?: string;
  };
  features: string[];
  backendRequirement: string;
  catalogSummary?: {
    totalItems: number;
    itemTypes: string[];
  };
  workspaceDocuments?: Record<string, string>;
  globalCapabilities: {
    recommendedSections: string[];
    allowedComponents: string[];
    integrationOptions: string[];
  };
}

export interface IKnowledgeRetrievalService {
  // Global Knowledge Accessors
  getGlobalKnowledge(options?: {
    category?: GlobalKnowledgeCategory;
    status?: 'active' | 'deprecated' | 'all';
  }): Promise<GlobalKnowledgeEntry[]>;

  getGlobalKnowledgeById<T = unknown>(id: string): Promise<GlobalKnowledgeEntry<T> | null>;
  getKnowledgeByCategory<T = unknown>(category: GlobalKnowledgeCategory): Promise<GlobalKnowledgeEntry<T>[]>;

  // Project Knowledge Accessors (Tenant-Scoped via JWT)
  getProjectKnowledge(projectId: string, token?: string): Promise<ProjectKnowledgeRecord[]>;
  getProjectKnowledgeItem<T = unknown>(
    projectId: string, 
    category: string, 
    key: string, 
    token?: string
  ): Promise<T | null>;

  // Context Aggregation for AI Pipelines
  getProjectContext(projectId: string, token?: string): Promise<ProjectContextBundle>;

  // Mutation Method for Tenant Knowledge
  setProjectKnowledge(
    projectId: string,
    category: string,
    key: string,
    content: Record<string, unknown>,
    source?: 'user_input' | 'ai_inference' | 'system_default' | 'catalog_sync',
    token?: string
  ): Promise<ProjectKnowledgeRecord>;

  // System Health & Drift Auditing
  checkKnowledgeStaleness(): Promise<StalenessReport>;
}
```

### 5.2 Backward-Compatible Fallback Engine

A critical requirement of Milestone M1 and M4 is **zero regression for existing projects**. When `getProjectContext(projectId, token)` is called, the service executes a graceful two-tier resolution strategy:

```
                  getProjectContext(projectId, token)
                                   |
                                   v
             Query public.project_knowledge for projectId
                                   |
                     +-------------+-------------+
                     |                           |
             Records Found (> 0)          No Records Found (0)
                     |                           |
                     v                           v
         Synthesize bundle from          Query public.projects
         project_knowledge rows           (Legacy DB columns)
                     |                           |
                     |                   Synthesize bundle from
                     |                   name, category, phone, etc.
                     |                           |
                     |                   Asynchronously seed
                     |                   public.project_knowledge
                     |                   (source: 'system_default')
                     |                           |
                     +-------------+-------------+
                                   |
                                   v
                      Merge Global Capabilities
                      (website_types, components)
                                   |
                                   v
                      Return ProjectContextBundle
```

1. **Tier 1 (Project Knowledge Table)**:
   The service queries `public.project_knowledge` where `project_id = projectId`. If records exist for `business_profile`, `brand_guidelines`, and `requirements`, they are assembled into the `ProjectContextBundle`.
2. **Tier 2 (Legacy Columns Fallback)**:
   If zero records are returned, the service queries `public.projects` for columns `name`, `business_name`, `category`, `description`, `phone`, `email`, `style`, `primary_color`, `secondary_color`, and `json_data->'features'`.
3. **Automatic Knowledge Seeding**:
   The legacy attributes are mapped into canonical `project_knowledge` records and saved asynchronously with `source = 'system_default'`. Subsequent calls hit Tier 1 directly.
4. **Global Capability Enrichment**:
   The synthesized context is merged with the matching `website_types` entry from the Global Knowledge Base to inject `recommendedSections`, `allowedComponents`, and `integrationOptions`.

---

## 6. Security, Threat Modeling & Anti-Contamination Rules

### 6.1 Threat Modeling Matrix

| Threat ID | Threat Description | Attack Vector | Architectural Mitigation | Residual Risk |
|---|---|---|---|---|
| **THREAT-1** | **Cross-Tenant Context Contamination** | Malicious Tenant B calls `/api/generate` supplying Tenant A's `projectId`. | PostgREST client is initialized with Tenant B's JWT via `getUserScopedClient(token)`. Supabase RLS policy `user_id = auth.uid() OR is_project_owner(project_id)` evaluates to false. Query returns empty set or 403 Forbidden. | Zero. Enforced at PostgreSQL engine level. |
| **THREAT-2** | **Global Knowledge Base Poisoning** | Attacker attempts to inject custom business data into Global Knowledge Base. | Global KB is composed of static, read-only TypeScript modules compiled into server memory. `IKnowledgeRetrievalService` provides no mutation API for global entries. Runtime mutations throw errors due to `Object.freeze()`. | Zero. Static code cannot be modified via HTTP requests. |
| **THREAT-3** | **Customer Lead PII Leakage** | Public visitor queries project knowledge or public snapshots to extract customer inquiries. | 1. Table `public.project_knowledge` permits zero access to `anon` role.<br>2. Customer leads are isolated in `projects.json_data->'leads'`.<br>3. Snapshot trigger `published_versions_strip_leads` automatically purges leads before publishing. | Zero. Enforced by database trigger and RLS. |
| **THREAT-4** | **API Key & Credential Leakage** | Platform engineer or automated process accidentally commits OpenAI or Supabase service keys into KB files. | 1. Knowledge Base entries accept only structural metadata.<br>2. Service role keys are restricted to server-side helper `getServiceRoleClient()`.<br>3. Automated Git pre-commit hooks and CI/CD secret scanners block API keys. | Negligible. |
| **THREAT-5** | **PostgreSQL RLS Infinite Recursion (DoS)** | Complex queries trigger Postgres error `42P17`, locking worker threads and exhausting database connections. | All RLS policies on `public.project_knowledge` utilize `SECURITY DEFINER` functions (`is_project_owner`, `is_website_member`) with `SET search_path = public`, avoiding recursive self-joins. | Zero. Formally verified in migration test suite. |

### 6.2 Blast Radius & Defense-in-Depth Analysis

WebsiteBanja enforces defense-in-depth across three architectural tiers:
1. **Network & API Route Boundary**:
   - Routes validate authentication tokens before invoking retrieval services.
   - User input parameters are validated against length caps (`src/lib/validation.ts`).
2. **Retrieval Layer Abstraction Boundary**:
   - Tenant requests are strictly parameterized by `projectId`.
   - Caller JWT is passed directly through to the Supabase client.
3. **Database Engine Boundary**:
   - Row Level Security acts as the ultimate immutable gate. Even if an application route has a logic vulnerability, the database rejects unauthorized queries.

---

## 7. Architecture Signoff & Verification Criteria

This architecture is considered verified and production-ready when the following conditions are met:
- [x] All 7 Global Knowledge Base categories are fully specified with strongly-typed schemas.
- [x] Zero tenant data guarantees are architecturally established and documented.
- [x] PostgreSQL DDL for `public.project_knowledge` includes composite unique constraint `(project_id, category, key)`.
- [x] RLS policies use non-recursive `SECURITY DEFINER` functions (`is_project_owner`, `is_website_member`).
- [x] `IKnowledgeRetrievalService` interface decouples calling endpoints from storage implementations.
- [x] Backward compatibility fallback to `public.projects` legacy columns is designed.
- [x] Security threat modeling addresses cross-tenant contamination, lead leakage, and credential security.
