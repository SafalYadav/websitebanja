# WebsiteBanja Knowledge Base Maintenance, Versioning & Evolution Process

- **Milestone**: M1 (Architecture Documentation) — Feature 4
- **Status**: APPROVED OPERATIONAL SPECIFICATION
- **Version**: 1.0.0
- **Authors**: Platform Engineering & Core Architecture Team
- **Target Audience**: Platform Engineers, Knowledge Maintainers, Integration Developers, QA & DevOps

---

## 1. Maintenance Protocols & Ownership Governance

To preserve the absolute boundary between platform capabilities and tenant data, WebsiteBanja defines distinct governance frameworks for the Global Knowledge Base versus the Project Knowledge Base.

### 1.1 Operational Responsibility Matrix

| Domain | Responsible Party | Storage Location | Change Frequency | Ingestion Mechanism | Security Boundary |
|---|---|---|---|---|---|
| **Global Knowledge Base** | Platform Engineering Team | Codebase (`src/knowledge/global/*`) | Release-driven (sprints / deployments) | Git Pull Requests, Code Review, CI/CD Automated Audits | Static in-memory modules; immutable at runtime; zero tenant data |
| **Project Knowledge Base** | Tenant / Project Owner | Supabase DB (`public.project_knowledge`) | Continuous runtime (user activity) | Authenticated REST endpoints, Studio Copilot actions, Onboarding agent | Scoped to `user_id` and `project_id`; isolated via PostgreSQL RLS |

### 1.2 Change Approval Workflow for Global Knowledge Base

Any addition, modification, or deprecation of an entry in the Global Knowledge Base must proceed through the five-stage Engineering Governance Lifecycle:

```
+-------------------+      +--------------------+      +--------------------+      +--------------------+      +--------------------+
| 1. RFC & Change   | ---> | 2. Codebase & Data | ---> | 3. Automated Drift | ---> | 4. Pull Request    | ---> | 5. Deployment &    |
|    Proposal       |      |    Implementation  |      |    & Parity Audit  |      |    & Code Review   |      |    Verification    |
+-------------------+      +--------------------+      +--------------------+      +--------------------+      +--------------------+
```

1. **Stage 1: RFC & Change Proposal**:
   - The maintainer creates an issue or RFC detailing the rationale: e.g. adding a new industry archetype (`automotive`), adding a new component section (`testimonials`), or updating prompt guardrails.
   - The proposed category, ID, and schema version are pre-registered.
2. **Stage 2: Codebase & Data Implementation**:
   - The engineer updates the corresponding file under `src/knowledge/global/`.
   - The entry's `metadata` header is incremented according to Semantic Versioning rules.
   - The entry is registered in `src/knowledge/global/index.ts`.
3. **Stage 3: Automated Drift & Parity Audit**:
   - The engineer runs the automated staleness engine:
     ```bash
     npm run kb:audit
     ```
   - The audit verifies SHA-256 payload integrity and checks static code parity against `src/types/website.ts`, `src/lib/featureRegistry.ts`, and `src/lib/categoryImages.ts`. Zero errors are permitted.
4. **Stage 4: Pull Request & Code Review**:
   - A pull request is submitted to GitHub.
   - Continuous Integration (CI) executes the test suite (`tests/project_isolation.test.mjs`), static TypeScript checks (`npx tsc --noEmit`), and the KB audit.
   - At least one Senior Platform Engineer must approve the PR.
5. **Stage 5: Deployment & Verification**:
   - Once merged to main, the updated knowledge base is deployed with the application bundle.
   - The runtime retrieval service immediately exposes the new capabilities to `/api/generate`, `/api/plan`, and the Studio Copilot.

---

## 2. Versioning Lifecycle & SemVer Rules

Every entry in the Global Knowledge Base includes a `version` field in its metadata conforming to **Semantic Versioning 2.0.0 (MAJOR.MINOR.PATCH)**.

### 2.1 Semantic Versioning Semantics for Knowledge Entries

```
                      +---------------------------------------+
                      |       VERSION FORMAT: X . Y . Z       |
                      +---------------------------------------+
                           |            |            |
                           v            |            v
               MAJOR BREAKING           v       PATCH REFINEMENT
             - Contract change       MINOR      - Copywriting tweaks
             - Field deletion      ADDITIVE     - Keyword additions
             - Removed type      - New type     - Unsplash URL fix
                                 - New section  - Typo corrections
                                 - New integration
```

#### MAJOR (`X.0.0`) — Breaking Changes
A MAJOR version increment is mandatory when a change requires modifications to consuming code or downstream parsers:
- Altering the required JSON schema structure returned by `/api/generate` or `/api/plan`.
- Renaming or deleting an existing field in a component definition (e.g. modifying `Hero` required props).
- Removing support for an existing website archetype (e.g. deprecating `general`).
- Changing button action types or eliminating an existing `ButtonActionType`.

#### MINOR (`x.Y.0`) — Additive Capabilities
A MINOR version increment is used when new platform features are introduced without breaking backward compatibility:
- Introducing a new website industry archetype (e.g. `automotive`, `logistics`).
- Adding a new section component (e.g. `testimonials`, `pricingTable`).
- Adding a new integration (e.g. `razorpay`, `stripe`, `calendly`).
- Adding optional attributes to an existing component schema.
- Introducing a new design system theme or style preset.

#### PATCH (`x.y.Z`) — Non-Breaking Refinements
A PATCH version increment is applied for iterative enhancements, copy improvements, and metadata fixes:
- Expanding industry keywords for better category matching in `/api/agent/talk` or `/api/extract`.
- Updating default Unsplash fallback image URLs.
- Refining system prompt guidelines to improve AI copywriting quality without changing schema structure.
- Correcting typographical errors in descriptions or tag lists.

### 2.2 Entry Lifecycle State Machine

Each global knowledge entry moves through four operational states defined by the `status` field:

```
                   Review & Verify                        Superseded by New Entry
  +--------------+ ----------------> +--------------+ -----------------------------> +----------------+
  |    DRAFT     |                   |    ACTIVE    |                              |   DEPRECATED   |
  +--------------+                   +--------------+                              +----------------+
         |                                                                                  |
         | Abandoned                                                        Sunset Period   |
         v                                                                  (>= 2 releases) v
  +--------------+                                                                 +----------------+
  |   ARCHIVED   | <-------------------------------------------------------------- |    ARCHIVED    |
  +--------------+                                                                 +----------------+
```

| State | Retrieval Behavior | Description & Usage |
|---|---|---|
| `draft` | Excluded from default retrieval (`getGlobalKnowledge({ status: 'active' })`). Accessible only when explicitly queried. | Capability currently under active development or behind a feature flag. Used for staging new components or experimental prompts. |
| `active` | Included by default in all generation, planning, and studio queries. | Production-grade, fully supported platform capability. Must have 100% code parity and pass all automated audits. |
| `deprecated` | Included in retrieval with deprecation warnings logged in audit reports. Contains `supersededBy` metadata pointer. | Capability slated for retirement. Maintained strictly for backward compatibility with existing websites. |
| `archived` | Excluded from all runtime retrieval queries. | Permanently retired capability. Retained in historical documentation for forensic auditing. |

### 2.3 Deprecation Grace Policy
To prevent runtime generation failures on older projects:
1. An `active` component or website type CANNOT be immediately `archived`.
2. It must first transition to `deprecated` and remain in that state for a **minimum of 2 minor releases (or 60 days)**.
3. The deprecated entry's metadata must specify the replacement entry ID in `supersededBy` (e.g. `"supersededBy": "wb:global:components:testimonials:v2"`).
4. During this grace period, the staleness audit flags deprecations as `severity: 'low'` warnings.

---

## 3. Step-by-Step Contribution Playbooks

### Playbook 1: Adding a New Website Type (e.g. `automotive`)

Follow this exact 6-step checklist when introducing a new business industry archetype:

#### Step 1: Define Entry in `src/knowledge/global/website-types.ts`
```typescript
export const automotiveType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:automotive:v1",
    category: "website_types",
    title: "Automotive & Car Dealerships",
    description: "Vehicle sales, leasing, test drives, and auto repair services",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["automotive", "dealership", "cars", "repairs", "vehicles", "leasing"]
  },
  data: {
    key: "automotive",
    displayName: "Automotive & Dealerships",
    industryKeywords: [
      "car", "auto", "vehicle", "dealership", "leasing", 
      "mechanic", "showroom", "used cars", "motor"
    ],
    recommendedSections: [
      "navbar", "hero", "services", "productsSection", 
      "about", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "New & Pre-Owned Vehicle Sales", 
      "Comprehensive Auto Servicing & Repair", 
      "Trade-In & Vehicle Valuation", 
      "Flexible Auto Financing & Insurance"
    ],
    defaultStyle: "clean",
    defaultPrimaryColor: "#0284C7",
    defaultSecondaryColor: "#0F172A",
    hasCatalog: true,
    catalogLabel: "Vehicle Inventory",
    defaultBackendRequirement: "managed_booking",
    targetAudienceArchetypes: [
      "Car buyers", "Fleet operators", "Vehicle owners seeking maintenance"
    ]
  }
};
```

#### Step 2: Register in Global Index (`src/knowledge/global/index.ts`)
```typescript
import { automotiveType } from "./website-types";

export const GLOBAL_WEBSITE_TYPES = [
  // ... existing 15 types
  automotiveType,
];
```

#### Step 3: Register Image Assets in `src/lib/categoryImages.ts`
Add default high-resolution Unsplash images for `automotive`:
```typescript
automotive: {
  hero: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
  about: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1000&q=80",
  catalog: [
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=600&q=80"
  ]
}
```

#### Step 4: Register Feature Recommendations in `src/lib/featureRegistry.ts`
Add automotive default feature recommendations:
```typescript
automotive: ["online_booking", "catalog_inventory", "whatsapp_connect", "lead_capture"]
```

#### Step 5: Run Automated Staleness & Parity Audit
```bash
npm run kb:audit
```
Verify that all 4 parity checks report zero issues.

#### Step 6: Verify Extraction & Generation
Test prompt categorization using `src/lib/promptExtractor.ts` to ensure prompts like *"Build a website for City Motors auto dealership"* resolve to category `automotive`.

---

### Playbook 2: Adding a New Section Component (e.g. `testimonials`)

Follow this 6-step checklist when introducing a new section component:

#### Step 1: Define Component Schema in `src/knowledge/global/components.ts`
```typescript
export const testimonialsComponent: GlobalKnowledgeEntry<ComponentDefinitionPayload> = {
  metadata: {
    id: "wb:global:components:testimonials:v1",
    category: "components",
    title: "Customer Testimonials & Reviews",
    description: "Social proof cards displaying client testimonials, ratings, and avatar photos",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/components.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["testimonials", "reviews", "social_proof", "ratings"]
  },
  data: {
    componentKey: "testimonials",
    displayName: "Testimonials & Reviews",
    description: "Client reviews with ratings, quotes, and author info",
    allowedElementTypes: ["heading", "paragraph", "card", "image", "badge", "section"],
    requiredFields: ["title", "reviews"],
    optionalFields: ["subtitle"],
    supportsButtonAction: false,
    supportsImageFallback: true,
    defaultData: {
      title: "What Our Clients Say",
      subtitle: "Trusted by hundreds of satisfied customers",
      reviews: [
        {
          quote: "Outstanding service and impeccable quality.",
          author: "Sarah Jenkins",
          role: "Verified Client",
          rating: 5
        }
      ]
    }
  }
};
```

#### Step 2: Update TypeScript Interfaces in `src/types/website.ts`
```typescript
export interface TestimonialItem {
  id?: string;
  quote: string;
  author: string;
  role?: string;
  avatarUrl?: string;
  rating?: number;
}

export interface TestimonialsSectionData {
  title: string;
  subtitle?: string;
  reviews: TestimonialItem[];
}

// In WebsiteData interface:
export interface WebsiteData {
  // ... existing sections
  testimonials?: TestimonialsSectionData;
}
```

#### Step 3: Implement Visual Renderer (`src/components/editor/TestimonialsSection.tsx`)
Create the React renderer adhering to the design system CSS variables (`--wb-card-bg`, `--wb-text-main`, etc.).

#### Step 4: Register in `WebsiteRenderer.tsx` and `SectionEditor.tsx`
Ensure the renderer mounts when `data.testimonials` is present or when `testimonials` is in `data.sectionOrder`.

#### Step 5: Add AI Action Handlers in `src/lib/studioAiActions.ts`
Add handlers for `add_testimonial`, `edit_testimonial`, `delete_testimonial`.

#### Step 6: Verify Build & Parity
```bash
npx tsc --noEmit
npm run kb:audit
```

---

### Playbook 3: Adding a New Platform Integration (e.g. `razorpay`)

Follow this 5-step checklist when introducing a payment or third-party service integration:

#### Step 1: Define Integration in `src/knowledge/global/integrations.ts`
```typescript
export const razorpayIntegration: GlobalKnowledgeEntry<IntegrationPayload> = {
  metadata: {
    id: "wb:global:integrations:razorpay:v1",
    category: "integrations",
    title: "Razorpay Payment Gateway",
    description: "Accept UPI, Cards, Netbanking, and Wallets for orders and bookings",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/integrations.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["payments", "upi", "checkout", "razorpay"]
  },
  data: {
    integrationKey: "razorpay",
    name: "Razorpay Payments",
    description: "Accept instant payments via UPI and credit cards",
    configurationRequirements: ["key_id", "key_secret"],
    supportedActions: ["url"],
    isProOnly: true
  }
};
```

#### Step 2: Configure Plan Gating
Ensure `isProOnly: true` is enforced by API route middleware before allowing keys to be saved.

#### Step 3: Add UI Settings Panel in `/editor/[id]/integrations/page.tsx`
Render the configuration form with masked secret inputs.

#### Step 4: Implement Secure Server-Side Route
Implement server-side webhook validation in `src/app/api/integrations/razorpay/webhook/route.ts`. Never expose `key_secret` to client components.

#### Step 5: Audit & Validation
Execute `npm run kb:audit` to verify schema compliance.

---

### Playbook 4: Updating Generation Rules & Guardrails

Follow this 4-step checklist when tuning OpenAI prompts and safety guardrails:

#### Step 1: Update Rule in `src/knowledge/global/generation-rules.ts`
Modify prompt instructions, formatting guards, or few-shot examples.

#### Step 2: Increment Version Metadata
- If refining prompt wording: increment `PATCH` (e.g. `1.0.0` -> `1.0.1`).
- If adding a new mandatory field to output JSON: increment `MAJOR` (e.g. `1.0.0` -> `2.0.0`).

#### Step 3: Validate Downstream Parsers
Check that `/api/generate`, `/api/plan`, and `useGeneratedWebsiteStore` handle the updated format without runtime errors.

#### Step 4: Run Test Suite
```bash
node tests/project_isolation.test.mjs
```

---

## 4. Automated Staleness & Schema Drift Detection Engine

### 4.1 The Staleness Dilemma
As platforms evolve, engineers frequently add UI components, modify database columns, or add new business categories without updating knowledge files. This results in **Knowledge Drift**:
- AI agents propose components that do not exist in code, causing generation crashes.
- AI agents fail to utilize newly released components or integrations because the knowledge base was never updated.
- Prompt schemas become out of sync with client store parsers.

### 4.2 Dual-Verification Architecture

WebsiteBanja solves this through an automated two-tier audit engine:

```
+----------------------------------------------------------------------------------------------------+
|                                    STALENESS DETECTION ENGINE                                      |
|                                     (src/knowledge/staleness/)                                     |
+-------------------------------------------------+--------------------------------------------------+
|          TIER 1: CRYPTOGRAPHIC CHECKSUM         |         TIER 2: STATIC CODE REFLECTION           |
+-------------------------------------------------+--------------------------------------------------+
| - Computes SHA-256 over canonical JSON of data  | - Reflects over codebase TypeScript AST / exports|
| - Compares against recorded checksum in registry| - Validates 4 Parity Invariants:                 |
| - Detects unversioned source code mutations     |   1. website_types <-> categoryImages.ts         |
| - Prevents silent modification of rules         |   2. components <-> WebsiteData (website.ts)     |
|                                                 |   3. generation_rules <-> studioAiActions.ts     |
|                                                 |   4. backend_capabilities <-> backendDetect.ts   |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                   STALENESS AUDIT REPORT                                           |
|  - healthy: boolean                                                                                |
|  - totalEntries: number                                                                            |
|  - staleCount: number                                                                              |
|  - issues: StalenessIssue[] (severity: 'high' | 'medium' | 'low')                                  |
+----------------------------------------------------------------------------------------------------+
```

### 4.3 Static Code Parity Checks

The engine evaluates four concrete parity invariants:

1. **Parity Check 1: `website_types` Parity**:
   Every `key` in `website_types` must exist as a recognized category key in:
   - `src/lib/categoryImages.ts` (`CATEGORY_IMAGES`)
   - `src/lib/featureRegistry.ts` (`CATEGORY_FEATURES`)
   If a category exists in the KB but lacks image assets or feature definitions, a `SCHEMA_DRIFT` issue is flagged (`severity: 'high'`).
2. **Parity Check 2: `components` Parity**:
   Every `componentKey` in `components` must correspond to an optional or required property on `WebsiteData` in `src/types/website.ts`. Any component defined in knowledge that is missing from TypeScript types is flagged (`severity: 'high'`).
3. **Parity Check 3: `generation_rules` Action Parity**:
   All button action targets and UI actions referenced in generation prompts must exist in `src/lib/studioAiActions.ts` and `ButtonActionType` in `src/types/website.ts`.
4. **Parity Check 4: `backend_capabilities` Parity**:
   Every backend archetype (`managed_booking`, `managed_orders`, `static`, `custom_api`) must match the return types of `detectBackendRequirement` in `src/lib/backendDetection.ts`.

### 4.4 Staleness Audit Data Contracts

```typescript
export interface StalenessIssue {
  itemId?: string;
  category: GlobalKnowledgeCategory;
  severity: 'low' | 'medium' | 'high';
  code: 'HASH_MISMATCH' | 'SCHEMA_DRIFT' | 'MISSING_CODE_PARITY' | 'EXPIRED_TTL';
  message: string;
  remediation: string;
}

export interface StalenessReport {
  timestamp: string;               // ISO 8601 UTC
  totalEntries: number;            // Total global knowledge items audited
  staleCount: number;              // Count of items requiring remediation
  healthy: boolean;                // true if staleCount === 0 and highSeverityCount === 0
  issues: StalenessIssue[];        // Granular diagnostic issue list
}
```

### 4.5 CI/CD Integration & Build Gate

The staleness engine is integrated directly into the deployment pipeline:
- **Command**: `npm run kb:audit` (executes `src/knowledge/staleness/audit.ts`).
- **Gate Policy**:
  - If any issue with `severity: 'high'` or `severity: 'medium'` is detected, the script exits with code `1`.
  - GitHub Actions / Vercel Build halts immediately, preventing pull requests with stale knowledge from merging.
  - Low severity warnings (e.g. deprecated entries approaching TTL) are logged to the console without blocking builds.

---

## 5. Operational Recovery & Cache Invalidation Playbook

In the event that an error, hallucination pattern, or corrupted knowledge entry is discovered in production, follow this incident response playbook.

### 5.1 Immediate Triage & Entry Deactivation
1. **Identify the Affected Entry**:
   Obtain the entry ID from generation telemetry (e.g. `wb:global:components:faq:v1`).
2. **Switch Status to `deprecated` or `draft`**:
   In `src/knowledge/global/<file>.ts`, immediately update:
   ```typescript
   status: "deprecated",
   metadata: {
     ...metadata,
     description: "EMERGENCY OVERRIDE: Temporarily deactivated due to schema issue."
   }
   ```
3. **Deploy Expedited Hotfix**:
   Commit with message `hotfix(kb): deactive <entry-id>` and push to main.

### 5.2 In-Memory Cache Invalidation Protocols
Because the Global Knowledge Base is resident in server memory:
- **Standard Next.js Serverless Environment**: Deploying a new Vercel / container release immediately spawns fresh worker instances with updated in-memory registries. Zero stale memory persists.
- **Persistent Server Environments**: The `IKnowledgeRetrievalService` provides an administrative method `clearCache()` callable via a secured internal endpoint `/api/admin/kb/cache-clear` protected by `SUPABASE_SERVICE_ROLE_KEY`.

### 5.3 Rollback Procedures
If a new release causes widespread generation regressions:
1. Revert the commit via Git:
   ```bash
   git revert HEAD -m 1
   git push origin main
   ```
2. The backward-compatibility fallback engine ensures that running projects will continue to resolve their context from `public.projects` legacy columns without interruption.

---

## 6. Process Signoff & Governance Checklist

- [x] Operational ownership boundary between Platform Engineering (Global KB) and Tenants (Project KB) defined.
- [x] Semantic Versioning semantics (MAJOR, MINOR, PATCH) formally specified for knowledge entries.
- [x] Four-state lifecycle (`draft`, `active`, `deprecated`, `archived`) and grace policy documented.
- [x] Detailed step-by-step contribution playbooks written for website types, components, integrations, and prompt rules.
- [x] Automated dual-tier staleness engine (SHA-256 + Static AST Parity) specified with `StalenessReport` interface.
- [x] CI/CD build gate and operational recovery protocols established.
