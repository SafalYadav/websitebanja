import { NextResponse } from "next/server";
import { authorizeAutomationTenant } from "@/lib/automation/automationApiIdentity";
import { getPool } from "@/lib/db/queries";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export const dynamic = "force-dynamic";

/** Read-only diagnostics: GET never runs migrations or write/delete lifecycle tests. */
export async function GET(req: Request) {
  const auth = await authorizeAutomationTenant(req);
  if (auth.response) return auth.response;
  const started = Date.now();
  try {
    const pool = getPool();
    const tables = await pool.query<{ table_name: string }>(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name IN
        ('autonomous_pipeline_runs','crm_leads_state','crm_conversations','crm_messages')
      ORDER BY table_name
    `);
    const runs = await pool.query<{
      pipeline_run_id: string; status: string; current_stage: string;
      created_at: string; updated_at: string;
    }>(`
      SELECT pipeline_run_id,status,current_stage,created_at,updated_at
      FROM public.autonomous_pipeline_runs WHERE tenant_id=$1
      ORDER BY created_at DESC LIMIT 10
    `, [auth.identity.tenantId]);
    const counts = await pool.query<{ count: number }>(`
      SELECT COUNT(*)::int AS count FROM public.autonomous_pipeline_runs WHERE tenant_id=$1
    `, [auth.identity.tenantId]);
    return NextResponse.json({
      success: true,
      database: { provider: "azure_postgresql", verifiedTables: tables.rows.map(row => row.table_name) },
      verification: {
        mode: "read_only",
        pipelineWriteReadLifecycle: "NOT_EXECUTED",
        crmWriteReadLifecycle: "NOT_EXECUTED",
        persistedRunsInPostgres: runs.rows,
        totalPersistedRunsCount: counts.rows[0]?.count ?? 0,
      },
      durationMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: unknown) {
    return NextResponse.json({
      success: false,
      error: { code: "DATABASE_DIAGNOSTICS_FAILED", message: sanitizeErrorOutput(error instanceof Error ? error.message : "Database diagnostics unavailable") },
    }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
