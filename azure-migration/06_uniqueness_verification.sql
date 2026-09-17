-- =====================================================================================
-- WebsiteBanja AI — Phase 3: Uniqueness Verification & Candidate Indexing
-- Target: PostgreSQL 15+ (Azure Database for PostgreSQL Flexible Server)
-- Generated: 2026-09-15
-- Description: Additive, non-destructive migration adding design_fingerprint to
--              public.projects and performance indexes for candidate selection.
-- =====================================================================================

-- 1. Add design_fingerprint column if not present
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS design_fingerprint JSONB DEFAULT NULL;

-- 2. Performance index for bounded category candidate selection
CREATE INDEX IF NOT EXISTS idx_projects_category_updated
ON public.projects (category, updated_at DESC);

-- 3. GIN index for JSON pattern queries on design_fingerprint
CREATE INDEX IF NOT EXISTS idx_projects_design_fingerprint
ON public.projects USING gin (design_fingerprint);

-- 4. Audit ledger index on agent_decisions for uniqueness checks
CREATE INDEX IF NOT EXISTS idx_agent_decisions_uniqueness
ON public.agent_decisions (agent_name, created_at DESC)
WHERE agent_name = 'uniqueness';
