// src/app/api/automation/pipeline/verify-db/route.ts
/**
 * WebsiteBanja AI — Production Database Persistence Verification Endpoint
 * 
 * Directly tests Azure PostgreSQL DDL and DML operations for Pipeline & CRM tables:
 * - Table verification in information_schema
 * - Dual-write sync of existing pipeline runs
 * - Real live write + read-back lifecycle
 * - Direct SQL telemetry & row counts
 */

import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { getPool } from "@/lib/db/queries";
import {
  ensurePipelineCrmTables,
  savePipelineRunToPostgres,
  getPipelineRunFromPostgres,
  saveLeadCRMStateToPostgres,
  getLeadCRMStateFromPostgres,
} from "@/lib/db/pipelineCrmPersistence";
import { PipelineQueue } from "@/lib/automation/pipelineQueue";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Missing or invalid automation secret." },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const pool = getPool();

  try {
    // 1. Ensure all Pipeline and CRM tables exist
    const ddlResult = await ensurePipelineCrmTables();

    // 2. Query information_schema for actual registered tables in Azure PostgreSQL
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('autonomous_pipeline_runs', 'crm_leads_state', 'crm_conversations', 'crm_messages')
      ORDER BY table_name;
    `);
    const liveTables = tablesRes.rows.map((r) => r.table_name);

    // 3. Sync existing local runs into Azure PostgreSQL if not already present
    const localRuns = await PipelineQueue.listPipelineRuns();
    let syncedRunsCount = 0;
    for (const run of localRuns) {
      const existing = await getPipelineRunFromPostgres(run.id);
      if (!existing) {
        await savePipelineRunToPostgres(run);
        syncedRunsCount++;
      }
    }

    // 4. Test Write + Read-Back Lifecycle in public.autonomous_pipeline_runs
    const testRunId = `test_pg_verify_${Date.now()}`;
    const testRunData = {
      id: testRunId,
      status: "COMPLETED" as const,
      currentStage: "HUMAN_APPROVAL" as const,
      criteria: { industry: "test-industry", city: "Bengaluru", limit: 1 },
      stats: {
        discovered: 1,
        qualified: 1,
        audited: 1,
        previewsGenerated: 1,
        outreachDrafted: 1,
        outreachDispatched: 0,
        repliesReceived: 0,
        interested: 0,
        followUpsScheduled: 0,
        failed: 0,
      },
      leads: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      errors: [],
    };

    const writeOk = await savePipelineRunToPostgres(testRunData);
    const readBack = await getPipelineRunFromPostgres(testRunId);
    const writeReadLifecycleSuccess = Boolean(writeOk && readBack && readBack.id === testRunId);

    // Clean up test verification record
    await pool.query(`DELETE FROM public.autonomous_pipeline_runs WHERE pipeline_run_id = $1`, [testRunId]);

    // 5. Test Write + Read-Back Lifecycle in public.crm_leads_state
    const testLeadId = `test_lead_pg_${Date.now()}`;
    const testLeadData = {
      leadId: testLeadId,
      businessName: "Test Enterprise",
      industry: "Hospitality",
      city: "Bengaluru",
      status: "QUALIFIED" as const,
      statusHistory: [],
      messages: [],
      timeline: [],
      updatedAt: new Date().toISOString(),
    };

    const crmWriteOk = await saveLeadCRMStateToPostgres(testLeadData);
    const crmReadBack = await getLeadCRMStateFromPostgres(testLeadId);
    const crmLifecycleSuccess = Boolean(crmWriteOk && crmReadBack && crmReadBack.leadId === testLeadId);

    // Clean up test verification CRM record
    await pool.query(`DELETE FROM public.crm_leads_state WHERE lead_id = $1`, [testLeadId]);

    // 6. Direct SQL query for active runs in Azure PostgreSQL
    const activeRunsRes = await pool.query(`
      SELECT pipeline_run_id, status, current_stage, created_at, updated_at
      FROM public.autonomous_pipeline_runs
      ORDER BY created_at DESC
      LIMIT 10;
    `);

    const crmCountRes = await pool.query(`SELECT COUNT(*)::int AS count FROM public.crm_leads_state;`);

    const totalDurationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      database: {
        provider: "azure_postgresql",
        verifiedTables: liveTables,
        ddlSuccess: ddlResult.success,
      },
      verification: {
        pipelineWriteReadLifecycle: writeReadLifecycleSuccess ? "PASSED" : "FAILED",
        crmWriteReadLifecycle: crmLifecycleSuccess ? "PASSED" : "FAILED",
        syncedRunsCount,
        persistedRunsInPostgres: activeRunsRes.rows,
        totalPersistedRunsCount: activeRunsRes.rowCount,
        totalCrmLeadsCount: crmCountRes.rows[0]?.count || 0,
      },
      durationMs: totalDurationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error)?.message || String(err),
      },
      { status: 500 }
    );
  }
}
