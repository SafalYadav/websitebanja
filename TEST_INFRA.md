# E2E Test Infra: WebsiteBanja Knowledge Base Architecture

## Test Philosophy
- Opaque-box, requirement-driven. Derived strictly from `ORIGINAL_REQUEST.md` and user-facing specifications.
- Complete isolation: User A cannot access User B's project knowledge under Supabase RLS.
- Zero contamination: Global Knowledge Base queries return strictly platform capabilities and never contain project-private or user-specific data.
- Non-regression: Existing endpoints (`/api/generate`, `/api/plan`) and existing test suites (`tests/project_isolation.test.mjs`) remain 100% operational.

## Feature Inventory
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 |
|---|---------|--------|:------:|:------:|:------:|
| 1 | Global KB Category Retrieval | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ |
| 2 | Global KB Metadata & Staleness | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ |
| 3 | Project KB Schema & CRUD | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ |
| 4 | Project KB Multi-Tenant RLS Isolation | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ |
| 5 | Knowledge Retrieval Service Abstraction | ORIGINAL_REQUEST § R4 | 5 | 5 | ✓ |
| 6 | Backward-Compatible Generation Pipeline | ORIGINAL_REQUEST § R5 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: Node.js runner (`node tests/e2e/knowledge_base.test.mjs`)
- Test case format: Automated assertions reporting passed/failed counts with exit code 0 on success.
- Location: `/Users/safalyadav/websitebanja/tests/e2e/`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Multi-Tenant Restaurant & Cafe Generation | F1, F3, F4, F5, F6 | High |
| 2 | Healthcare Clinic Lead Capture & Private Context | F3, F4, F5, F6 | High |
| 3 | Global Platform Drift & Staleness Detection | F1, F2, F5 | Medium |
| 4 | Non-Breaking /api/generate & /api/plan Invocation | F1, F3, F5, F6 | High |
| 5 | Cross-Tenant Modification Rejection Verification | F3, F4, F5 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature
- Tier 3: Pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
- Pre-existing tests (`tests/project_isolation.test.mjs`): 100% pass
