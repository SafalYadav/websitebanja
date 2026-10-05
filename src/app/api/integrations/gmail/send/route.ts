// src/app/api/integrations/gmail/send/route.ts
/**
 * WebsiteBanja Controlled Gmail Send API
 * Phase: Phase 16 (Google Places + Gmail + Inbound Gmail Replies)
 *
 * POST /api/integrations/gmail/send
 * Dispatches an approved outreach draft via Gmail API subject to pre-flight gates.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { GmailEmailProvider } from "@/lib/integrations/gmailEmailProvider";
import { authorizeAutomationTenant } from "@/lib/automation/automationApiIdentity";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { z } from "zod";

const SendSchema = z.object({ outreachId: z.string().trim().min(1).max(200), forceSend: z.boolean().optional() });

export async function POST(req: Request) {
  const auth = await authorizeAutomationTenant(req);
  if (auth.response) return auth.response;

  let body: z.infer<typeof SendSchema>;
  try {
    const parsed = SendSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid send request." }, { status: 400 });
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }

  if (body.forceSend) {
    const admin = await verifyAdminAuth(req);
    if (!admin.isAdmin || admin.userId !== auth.identity.tenantId) {
      return NextResponse.json({ error: "Only the authenticated human owner may override automatic-send configuration." }, { status: 403 });
    }
  }

  try {
    const result = await GmailEmailProvider.sendOutreachEmail(body.outreachId, {
      forceSend: Boolean(body.forceSend),
      userId: auth.identity.userId || auth.identity.tenantId,
    });

    if (!result.success) return NextResponse.json(result, { status: 422 });

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: { code: "DISPATCH_UNAVAILABLE",
      message: "Dispatch verification is unavailable. Reload the original outreach; do not retry an uncertain delivery automatically." } }, { status: 503 });
  }
}
