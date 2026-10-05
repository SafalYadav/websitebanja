// src/app/api/automation/outreach/route.ts
/**
 * WebsiteBanja Outreach Management API
 * Phase: Phase 11 (Personalized Outreach Foundation)
 *
 * Endpoints:
 *   GET   /api/automation/outreach — List stored outreach records with optional filters
 *   PATCH /api/automation/outreach — Update outreach status (review, approve, reject, simulate_send, edit)
 */

export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { outreachRepository } from "@/lib/outreach/outreachRepository";
import { localSimulationProvider } from "@/lib/outreach/simulationProvider";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type {
  ListOutreachFilter,
  UpdateOutreachStatusRequest,
  OutreachChannel,
  OutreachStatus,
} from "@/lib/outreach/types";
import { authorizeAutomationTenant } from "@/lib/automation/automationApiIdentity";
import { authorizeHumanApproval } from "@/lib/intelligence/pipeline/humanApprovalAuthorization";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { z } from "zod";

const UpdateSchema = z.object({ outreachId: z.string().min(1).max(200),
  status: z.enum(["draft","review","approved","rejected","cancelled","simulated_sent"]),
  editedSubject: z.string().max(1000).optional(), editedMessage: z.string().max(20000).optional(),
  recipientEmail: z.string().email().optional(), notes: z.string().max(5000).optional(),
  expectedReviewedMessage: z.string().max(20000).optional(),
  expectedReviewedSubject: z.string().max(1000).optional(),
  expectedReviewedRecipient: z.string().max(320).optional(),
}).refine(value => value.status !== "approved" ||
  (typeof value.expectedReviewedMessage === "string" && value.expectedReviewedMessage.length > 0 &&
    typeof value.expectedReviewedSubject === "string" && typeof value.expectedReviewedRecipient === "string" && value.expectedReviewedRecipient.length > 0),
{ message: "Approval requires the exact reviewed message, subject and recipient" });


export async function GET(req: Request) {
  const auth = await authorizeAutomationTenant(req);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const filter: ListOutreachFilter = {
      leadId: searchParams.get("leadId") || undefined,
      channel: (searchParams.get("channel") as OutreachChannel) || undefined,
      status: (searchParams.get("status") as OutreachStatus) || undefined,
      search: searchParams.get("search") || undefined,
      userId: auth.identity.userId || auth.identity.tenantId,
    };

    const records = await outreachRepository.listOutreachRecords(filter);

    return NextResponse.json(
      {
        success: true,
        count: records.length,
        records,
        handoffPhase: "phase12_reply_intelligence_crm",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const safeError = sanitizeErrorOutput(err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LIST_OUTREACH_FAILED",
          message: "Failed to list outreach records.",
          details: safeError,
        },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await authorizeAutomationTenant(req);
  if (auth.response) return auth.response;

  let body: UpdateOutreachStatusRequest;
  try {
    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Invalid outreach update" } }, { status: 400 });
    body = { ...parsed.data, userId: auth.identity.userId || auth.identity.tenantId };
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "MALFORMED_JSON", message: "Invalid JSON syntax." } },
      { status: 400 }
    );
  }

  if (!body.outreachId || !body.status) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_FAILED", message: "outreachId and status are required." },
      },
      { status: 400 }
    );
  }

  try {
    if (body.status === "simulated_sent") {
      const simRes = await localSimulationProvider.simulateDispatch(body.outreachId, body.userId);
      return NextResponse.json(
        {
          success: true,
          outreach: simRes.outreach,
          receipt: simRes.receipt,
          handoffToPhase12: simRes.handoffToPhase12,
          handoffPhase: "phase12_reply_intelligence_crm",
        },
        { status: 200 }
      );
    }

    let authorization;
    if (body.status === "approved") {
      const admin = await verifyAdminAuth(req);
      if (!admin.isAdmin || admin.userId !== auth.identity.tenantId) return NextResponse.json({ success: false, error: { code: "HUMAN_APPROVAL_REQUIRED", message: "Authenticated human owner must approve outreach" } }, { status: 403 });
      authorization = await authorizeHumanApproval(req, auth.identity.tenantId);
    }
    const updated = await outreachRepository.updateOutreachStatus(body, authorization);
    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: `Outreach record '${body.outreachId}' not found.` },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        outreach: updated,
        handoffPhase: "phase12_reply_intelligence_crm",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const safeError = sanitizeErrorOutput(err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPDATE_OUTREACH_FAILED",
          message: "Failed to update outreach record.",
          details: safeError,
        },
      },
      { status: 500 }
    );
  }
}
