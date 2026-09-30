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
import { isAuthorized } from "@/lib/automation/auth";

export async function POST(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { error: "Unauthorized. Valid automation secret or admin session required." },
      { status: 401 }
    );
  }

  let body: any = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }

  if (!body.outreachId || typeof body.outreachId !== "string") {
    return NextResponse.json({ error: "Parameter 'outreachId' is required." }, { status: 400 });
  }

  const result = await GmailEmailProvider.sendOutreachEmail(body.outreachId, {
    forceSend: Boolean(body.forceSend),
    userId: body.userId,
  });

  if (!result.success) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json(result, { status: 200 });
}
