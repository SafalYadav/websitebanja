// src/app/api/admin/intelligence/production/route.ts
// Phase 28 — Autonomous Production Admin API Route
// Authenticated, rate-limited, tenant-isolated endpoint for managing and monitoring
// governed autonomous production jobs.

import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import {
  autonomousProductionOrchestrator,
  productionJobStore,
  type ProductionJobState,
} from "@/lib/intelligence";
import { z } from "zod";
import { authorizeHumanApproval } from "@/lib/intelligence/pipeline/humanApprovalAuthorization";

export const dynamic = "force-dynamic";

const ProductionActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    businessName: z.string().min(1),
    location: z.string().min(1),
    niche: z.string().min(1),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
    objective: z.string().optional(),
    tenantId: z.string().nullable().optional(),
    idempotencyKey: z.string().optional(),
    budget: z
      .object({
        maxTimeMs: z.number().positive().optional(),
        maxRetries: z.number().int().nonnegative().optional(),
        maxModelCalls: z.number().int().positive().optional(),
      })
      .optional(),
  }),
  z.object({
    action: z.literal("step"),
    jobId: z.string().min(1),
    tenantId: z.string().nullable().optional(),
  }),
  z.object({
    action: z.literal("execute"),
    jobId: z.string().min(1),
    tenantId: z.string().nullable().optional(),
    maxSteps: z.number().int().positive().max(50).optional(),
  }),
  z.object({
    action: z.literal("approve"),
    jobId: z.string().min(1),
    approver: z.string().min(1).default("human_admin"),
    tenantId: z.string().nullable().optional(),
  }),
  z.object({
    action: z.literal("reject"),
    jobId: z.string().min(1),
    rejector: z.string().min(1).default("human_admin"),
    reason: z.string().min(1),
    tenantId: z.string().nullable().optional(),
  }),
  z.object({
    action: z.literal("pause"),
    jobId: z.string().min(1),
    reason: z.string().min(1),
    tenantId: z.string().nullable().optional(),
  }),
  z.object({
    action: z.literal("resume"),
    jobId: z.string().min(1),
    tenantId: z.string().nullable().optional(),
  }),
  z.object({
    action: z.literal("escalate"),
    jobId: z.string().min(1),
    reason: z.string().min(1),
    tenantId: z.string().nullable().optional(),
  }),
  z.object({
    action: z.literal("recover"),
    tenantId: z.string().nullable().optional(),
  }),
]);

/**
 * GET /api/admin/intelligence/production
 * Query params:
 * - ?jobId=xxx : get single production job
 * - ?state=xxx : filter jobs by state
 * - ?tenantId=xxx : filter jobs by tenant
 * - ?limit=xx : limit result size
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_prod_get_${ip}`, 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator access required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const state = searchParams.get("state") as ProductionJobState | null;
    const tenantId = auth.userId;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    if (jobId) {
      const job = productionJobStore.getJob(jobId, tenantId);
      if (!job) {
        return NextResponse.json(
          { success: false, message: `Production job '${jobId}' not found.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, job });
    }

    const jobs = productionJobStore.listJobs(tenantId, {
      state: state || undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: sanitizeErrorOutput(error?.message || "Internal server error") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/intelligence/production
 * Dispatches production job operations: start, step, execute, approve, reject, pause, resume, escalate, recover.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_prod_post_${ip}`, 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator access required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const body = await req.json();
    const parsed = ProductionActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: parsed.error.issues },
        { status: 400 }
      );
    }

    const cmd = parsed.data;
    // Client-supplied scope never confers access to another tenant's production jobs.
    cmd.tenantId = auth.userId;

    switch (cmd.action) {
      case "start": {
        const job = await autonomousProductionOrchestrator.startProductionJob({
          businessName: cmd.businessName,
          location: cmd.location,
          niche: cmd.niche,
          contactEmail: cmd.contactEmail,
          contactPhone: cmd.contactPhone,
          objective: cmd.objective,
          tenantId: cmd.tenantId,
          idempotencyKey: cmd.idempotencyKey,
          budget: cmd.budget,
        });
        return NextResponse.json({ success: true, job }, { status: 201 });
      }

      case "step": {
        const stepResult = await autonomousProductionOrchestrator.stepJob(cmd.jobId, cmd.tenantId);
        return NextResponse.json({ success: true, stepResult });
      }

      case "execute": {
        const job = await autonomousProductionOrchestrator.executeProductionPipeline(
          cmd.jobId,
          cmd.tenantId,
          { maxSteps: cmd.maxSteps }
        );
        return NextResponse.json({ success: true, job });
      }

      case "approve": {
        const job = await autonomousProductionOrchestrator.approveJob(
          cmd.jobId,
          auth.userId,
          auth.userId,
          await authorizeHumanApproval(req, auth.userId)
        );
        return NextResponse.json({ success: true, job });
      }

      case "reject": {
        const job = await autonomousProductionOrchestrator.rejectJob(
          cmd.jobId,
          auth.userId,
          cmd.reason,
          auth.userId,
          await authorizeHumanApproval(req, auth.userId)
        );
        return NextResponse.json({ success: true, job });
      }

      case "pause": {
        const job = await autonomousProductionOrchestrator.pauseJob(
          cmd.jobId,
          cmd.reason,
          cmd.tenantId
        );
        return NextResponse.json({ success: true, job });
      }

      case "resume": {
        const job = await autonomousProductionOrchestrator.resumeJob(cmd.jobId, cmd.tenantId);
        return NextResponse.json({ success: true, job });
      }

      case "escalate": {
        const job = await autonomousProductionOrchestrator.escalateJob(
          cmd.jobId,
          cmd.reason,
          cmd.tenantId
        );
        return NextResponse.json({ success: true, job });
      }

      case "recover": {
        const recovered = await autonomousProductionOrchestrator.recoverInterruptedJobs(
          cmd.tenantId
        );
        return NextResponse.json({ success: true, count: recovered.length, recovered });
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: sanitizeErrorOutput(error?.message || "Internal server error") },
      { status: 500 }
    );
  }
}
