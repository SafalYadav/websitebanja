// src/app/api/automation/outreach/reconcile/route.ts
/**
 * WebsiteBanja Human Admin Outreach Dispatch Reconciliation API
 *
 * Provides an authorized, server-verified recovery path for uncertain email dispatches.
 * Strictly requires authenticated human administrator session.
 */

export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { GmailEmailProvider } from "@/lib/integrations/gmailEmailProvider";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { z } from "zod";

const ReconcileSchema = z.object({
  outreachId: z.string().min(1).max(200),
  action: z.enum(["confirm_provider_accepted", "reset_to_approved", "mark_failed"]),
  reason: z.string().min(10, { message: "Audit reason must be at least 10 characters" }).max(5000),
  verifiedExternalMessageId: z.string().max(300).optional(),
  certifiedNotDispatched: z.boolean().optional(),
  serverVerificationEvidence: z.record(z.string(), z.unknown()).optional(),
  isHuman: z.literal(true, {
    message: "Only authenticated human administrators can authorize dispatch reconciliation.",
  }),
});

export async function POST(req: Request) {
  // 1. Authoritative server-side verification of human administrator
  const admin = await verifyAdminAuth(req);
  if (!admin.isAdmin || !admin.userId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: admin.error || "Authenticated human administrator credentials required.",
        },
      },
      { status: 403 }
    );
  }

  // 2. Validate request body
  let parsedBody: z.infer<typeof ReconcileSchema>;
  try {
    const raw = await req.json();
    const result = ReconcileSchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: result.error.issues.map((e: { message: string }) => e.message).join("; "),
          },
        },
        { status: 400 }
      );
    }
    parsedBody = result.data;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MALFORMED_JSON", message: "Invalid JSON syntax." },
      },
      { status: 400 }
    );
  }

  // 3. Construct tamper-proof HumanAdminContext bound to the verified caller
  const adminContext = {
    adminUserId: admin.userId,
    tenantId: admin.userId,
    isAdmin: true as const,
    isHuman: true as const,
    email: admin.email,
  };

  try {
    const outcome = await GmailEmailProvider.reconcileOutreachDispatch(
      parsedBody.outreachId,
      parsedBody.action,
      {
        adminContext,
        reason: parsedBody.reason,
        verifiedExternalMessageId: parsedBody.verifiedExternalMessageId,
        serverVerificationEvidence: parsedBody.serverVerificationEvidence,
        certifiedNotDispatched: parsedBody.certifiedNotDispatched,
      }
    );

    if (!outcome.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RECONCILIATION_REJECTED",
            message: outcome.error || "Reconciliation could not be performed.",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        outreach: outcome.outreach,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const safeError = sanitizeErrorOutput(err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RECONCILIATION_FAILED",
          message: "Internal reconciliation failure.",
          details: safeError,
        },
      },
      { status: 500 }
    );
  }
}
