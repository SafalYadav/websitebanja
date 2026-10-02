// src/lib/db/pipelineCrmPersistence.ts
/**
 * WebsiteBanja AI — Production Azure PostgreSQL Persistence Layer for Pipeline & CRM
 * 
 * Directly reads & writes to Azure Database for PostgreSQL Flexible Server via connection pool.
 * Implements resilient fallback to local durable store if the database connection is degraded.
 */

import { getPool } from "./queries";
import type { PipelineRun } from "@/lib/automation/pipelineTypes";
import type { LeadCRMState, CRMConversation, CRMMessage } from "@/lib/crm/types";

let tablesInitialized = false;

/**
 * Ensures all required PostgreSQL tables for Pipeline and CRM exist in public schema.
 */
export async function ensurePipelineCrmTables(): Promise<{ success: boolean; tables: string[]; error?: string }> {
  if (tablesInitialized) {
    return { success: true, tables: ["autonomous_pipeline_runs", "crm_leads_state", "crm_conversations", "crm_messages"] };
  }

  const pool = getPool();
  try {
    const ddl = `
      CREATE TABLE IF NOT EXISTS public.autonomous_pipeline_runs (
        pipeline_run_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'PENDING',
        current_stage TEXT NOT NULL DEFAULT 'DISCOVERY',
        criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
        stats JSONB NOT NULL DEFAULT '{}'::jsonb,
        leads JSONB NOT NULL DEFAULT '{}'::jsonb,
        errors JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON public.autonomous_pipeline_runs(status);
      CREATE INDEX IF NOT EXISTS idx_pipeline_runs_created ON public.autonomous_pipeline_runs(created_at DESC);

      CREATE TABLE IF NOT EXISTS public.crm_leads_state (
        lead_id TEXT PRIMARY KEY,
        user_id TEXT,
        business_name TEXT,
        industry TEXT,
        city TEXT,
        email TEXT,
        phone TEXT,
        website TEXT,
        status TEXT NOT NULL DEFAULT 'DISCOVERED',
        status_history JSONB DEFAULT '[]'::jsonb,
        timeline JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_crm_leads_state_status ON public.crm_leads_state(status);

      CREATE TABLE IF NOT EXISTS public.crm_conversations (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'email',
        status TEXT NOT NULL DEFAULT 'OPEN',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_message_at TIMESTAMPTZ DEFAULT NOW(),
        message_count INT DEFAULT 0,
        unread_count INT DEFAULT 0,
        user_id TEXT,
        metadata JSONB DEFAULT '{}'::jsonb
      );

      CREATE INDEX IF NOT EXISTS idx_crm_conversations_lead ON public.crm_conversations(lead_id);

      CREATE TABLE IF NOT EXISTS public.crm_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        lead_id TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
        channel TEXT NOT NULL DEFAULT 'email',
        message_text TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'system',
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );

      CREATE INDEX IF NOT EXISTS idx_crm_messages_conv ON public.crm_messages(conversation_id);
    `;

    await pool.query(ddl);
    tablesInitialized = true;
    return {
      success: true,
      tables: ["autonomous_pipeline_runs", "crm_leads_state", "crm_conversations", "crm_messages"],
    };
  } catch (err) {
    console.error("[PostgreSQL Persistence] Failed to ensure Pipeline/CRM tables:", err);
    return {
      success: false,
      tables: [],
      error: (err as Error)?.message || String(err),
    };
  }
}

// =============================================================================
// PIPELINE RUNS PERSISTENCE
// =============================================================================

export async function savePipelineRunToPostgres(run: PipelineRun): Promise<boolean> {
  try {
    await ensurePipelineCrmTables();
    const pool = getPool();
    const query = `
      INSERT INTO public.autonomous_pipeline_runs (
        pipeline_run_id, status, current_stage, criteria, stats, leads, errors, created_at, updated_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (pipeline_run_id) DO UPDATE SET
        status = EXCLUDED.status,
        current_stage = EXCLUDED.current_stage,
        criteria = EXCLUDED.criteria,
        stats = EXCLUDED.stats,
        leads = EXCLUDED.leads,
        errors = EXCLUDED.errors,
        updated_at = EXCLUDED.updated_at,
        completed_at = EXCLUDED.completed_at;
    `;

    await pool.query(query, [
      run.id,
      run.status,
      run.currentStage,
      JSON.stringify(run.criteria || {}),
      JSON.stringify(run.stats || {}),
      JSON.stringify(run.leads || {}),
      JSON.stringify(run.errors || []),
      run.createdAt ? new Date(run.createdAt) : new Date(),
      run.updatedAt ? new Date(run.updatedAt) : new Date(),
      run.completedAt ? new Date(run.completedAt) : null,
    ]);

    return true;
  } catch (err) {
    console.warn(`[PostgreSQL Persistence] Failed to save PipelineRun ${run.id} to Azure PostgreSQL (falling back to durable file):`, (err as Error)?.message);
    return false;
  }
}

export async function getPipelineRunFromPostgres(runId: string): Promise<PipelineRun | null> {
  try {
    await ensurePipelineCrmTables();
    const pool = getPool();
    const res = await pool.query(
      `SELECT * FROM public.autonomous_pipeline_runs WHERE pipeline_run_id = $1`,
      [runId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    return {
      id: row.pipeline_run_id,
      status: row.status,
      currentStage: row.current_stage,
      criteria: typeof row.criteria === "string" ? JSON.parse(row.criteria) : row.criteria,
      stats: typeof row.stats === "string" ? JSON.parse(row.stats) : row.stats,
      leads: typeof row.leads === "string" ? JSON.parse(row.leads) : row.leads,
      errors: typeof row.errors === "string" ? JSON.parse(row.errors) : (row.errors || []),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
    } as PipelineRun;
  } catch (err) {
    console.warn(`[PostgreSQL Persistence] Failed to query PipelineRun ${runId} from Azure PostgreSQL:`, (err as Error)?.message);
    return null;
  }
}

export async function listPipelineRunsFromPostgres(): Promise<PipelineRun[]> {
  try {
    await ensurePipelineCrmTables();
    const pool = getPool();
    const res = await pool.query(
      `SELECT * FROM public.autonomous_pipeline_runs ORDER BY created_at DESC LIMIT 100`
    );

    return res.rows.map((row) => ({
      id: row.pipeline_run_id,
      status: row.status,
      currentStage: row.current_stage,
      criteria: typeof row.criteria === "string" ? JSON.parse(row.criteria) : row.criteria,
      stats: typeof row.stats === "string" ? JSON.parse(row.stats) : row.stats,
      leads: typeof row.leads === "string" ? JSON.parse(row.leads) : row.leads,
      errors: typeof row.errors === "string" ? JSON.parse(row.errors) : (row.errors || []),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
    })) as PipelineRun[];
  } catch (err) {
    console.warn("[PostgreSQL Persistence] Failed to list PipelineRuns from Azure PostgreSQL:", (err as Error)?.message);
    return [];
  }
}

// =============================================================================
// CRM LEADS STATE PERSISTENCE
// =============================================================================

export async function saveLeadCRMStateToPostgres(state: LeadCRMState): Promise<boolean> {
  try {
    await ensurePipelineCrmTables();
    const pool = getPool();
    const query = `
      INSERT INTO public.crm_leads_state (
        lead_id, user_id, business_name, industry, city, email, phone, website,
        status, status_history, timeline, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (lead_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        business_name = EXCLUDED.business_name,
        industry = EXCLUDED.industry,
        city = EXCLUDED.city,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        website = EXCLUDED.website,
        status = EXCLUDED.status,
        status_history = EXCLUDED.status_history,
        timeline = EXCLUDED.timeline,
        updated_at = EXCLUDED.updated_at;
    `;

    await pool.query(query, [
      state.leadId,
      state.userId || null,
      state.businessName || "Unknown Business",
      state.industry || "general",
      state.city || null,
      state.email || null,
      state.phone || null,
      state.website || null,
      state.status,
      JSON.stringify(state.statusHistory || []),
      JSON.stringify(state.timeline || []),
      state.updatedAt ? new Date(state.updatedAt) : new Date(),
    ]);

    return true;
  } catch (err) {
    console.warn(`[PostgreSQL Persistence] Failed to save CRM state for ${state.leadId} to Azure PostgreSQL:`, (err as Error)?.message);
    return false;
  }
}

export async function getLeadCRMStateFromPostgres(leadId: string): Promise<LeadCRMState | null> {
  try {
    await ensurePipelineCrmTables();
    const pool = getPool();
    const res = await pool.query(
      `SELECT * FROM public.crm_leads_state WHERE lead_id = $1`,
      [leadId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    return {
      leadId: row.lead_id,
      userId: row.user_id || undefined,
      businessName: row.business_name || "Unknown Business",
      industry: row.industry || "general",
      city: row.city || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      website: row.website || undefined,
      status: row.status,
      statusHistory: typeof row.status_history === "string" ? JSON.parse(row.status_history) : (row.status_history || []),
      messages: [],
      timeline: typeof row.timeline === "string" ? JSON.parse(row.timeline) : (row.timeline || []),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    } as LeadCRMState;
  } catch (err) {
    console.warn(`[PostgreSQL Persistence] Failed to query CRM state for ${leadId} from Azure PostgreSQL:`, (err as Error)?.message);
    return null;
  }
}

export async function listLeadCRMStatesFromPostgres(userId?: string): Promise<LeadCRMState[]> {
  try {
    await ensurePipelineCrmTables();
    const pool = getPool();
    const query = userId
      ? `SELECT * FROM public.crm_leads_state WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 200`
      : `SELECT * FROM public.crm_leads_state ORDER BY updated_at DESC LIMIT 200`;
    const params = userId ? [userId] : [];

    const res = await pool.query(query, params);

    return res.rows.map((row) => ({
      leadId: row.lead_id,
      userId: row.user_id || undefined,
      businessName: row.business_name || "Unknown Business",
      industry: row.industry || "general",
      city: row.city || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      website: row.website || undefined,
      status: row.status,
      statusHistory: typeof row.status_history === "string" ? JSON.parse(row.status_history) : (row.status_history || []),
      messages: [],
      timeline: typeof row.timeline === "string" ? JSON.parse(row.timeline) : (row.timeline || []),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    })) as LeadCRMState[];
  } catch (err) {
    console.warn("[PostgreSQL Persistence] Failed to list CRM states from Azure PostgreSQL:", (err as Error)?.message);
    return [];
  }
}

// =============================================================================
// CRM CONVERSATIONS PERSISTENCE
// =============================================================================

export async function saveCRMConversationToPostgres(conv: CRMConversation): Promise<boolean> {
  try {
    await ensurePipelineCrmTables();
    const pool = getPool();
    const query = `
      INSERT INTO public.crm_conversations (
        id, lead_id, channel, status, created_at, updated_at, last_message_at, message_count, unread_count, user_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        channel = EXCLUDED.channel,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at,
        last_message_at = EXCLUDED.last_message_at,
        message_count = EXCLUDED.message_count,
        unread_count = EXCLUDED.unread_count,
        user_id = EXCLUDED.user_id,
        metadata = EXCLUDED.metadata;
    `;

    await pool.query(query, [
      conv.id,
      conv.leadId,
      conv.channel,
      conv.status,
      conv.createdAt ? new Date(conv.createdAt) : new Date(),
      conv.updatedAt ? new Date(conv.updatedAt) : new Date(),
      conv.lastMessageAt ? new Date(conv.lastMessageAt) : new Date(),
      conv.messageCount || 0,
      conv.unreadCount || 0,
      conv.userId || null,
      JSON.stringify(conv.metadata || {}),
    ]);

    return true;
  } catch (err) {
    console.warn(`[PostgreSQL Persistence] Failed to save conversation ${conv.id} to Azure PostgreSQL:`, (err as Error)?.message);
    return false;
  }
}

// =============================================================================
// CRM MESSAGES PERSISTENCE
// =============================================================================

export async function saveCRMMessageToPostgres(msg: CRMMessage): Promise<boolean> {
  try {
    await ensurePipelineCrmTables();
    const pool = getPool();
    const query = `
      INSERT INTO public.crm_messages (
        id, conversation_id, lead_id, direction, channel, message_text, source, timestamp, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING;
    `;

    await pool.query(query, [
      msg.id,
      msg.conversationId,
      msg.leadId,
      msg.direction,
      msg.channel,
      msg.messageText,
      msg.source || "system",
      msg.timestamp ? new Date(msg.timestamp) : new Date(),
      JSON.stringify(msg.metadata || {}),
    ]);

    return true;
  } catch (err) {
    console.warn(`[PostgreSQL Persistence] Failed to save message ${msg.id} to Azure PostgreSQL:`, (err as Error)?.message);
    return false;
  }
}
