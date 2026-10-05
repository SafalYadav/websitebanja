-- Migration: 20261005_tenant_memory_records.sql
-- Description: Unified, tenant-scoped record store with optimistic concurrency.
-- Authoritative persistent store for private memory, lessons, decisions, runs, and strategies.

CREATE TABLE IF NOT EXISTS public.tenant_memory_records (
  tenant_id TEXT NOT NULL CHECK (length(trim(tenant_id)) > 0),
  record_kind TEXT NOT NULL CHECK (length(trim(record_kind)) > 0),
  record_id TEXT NOT NULL CHECK (length(trim(record_id)) > 0),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, record_kind, record_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_memory_records_kind_updated
  ON public.tenant_memory_records (tenant_id, record_kind, updated_at DESC);

ALTER TABLE public.tenant_memory_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tenant_memory_records FROM PUBLIC;

