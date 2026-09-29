// src/app/api/integrations/gmail/sync/route.ts
/**
 * WebsiteBanja Inbound Gmail Sync & Ingestion API
 * Phase: Phase 16 (Google Places + Gmail + Inbound Gmail Replies)
 *
 * POST /api/integrations/gmail/sync
 * Polls Gmail inbox for replies or processes an explicit incoming message payload.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { GmailInboundService } from "@/lib/integrations/gmailInboundService";
import { isAuthorized } from "@/lib/automation/auth";

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
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
    // Empty body is acceptable for polling
  }

  // If specific message payload provided (e.g. test or webhook simulation)
  if (body.messageId && (body.bodyText || body.snippet)) {
    const result = await GmailInboundService.processRawIncomingMessage(
      {
        messageId: body.messageId,
        threadId: body.threadId || `thread_${body.messageId}`,
        from: body.from || "lead@localbusiness.com",
        to: "websitebanja@gmail.com",
        subject: body.subject || "Re: Website Preview",
        date: body.date || new Date().toISOString(),
        snippet: body.snippet || body.bodyText || "",
        bodyText: body.bodyText || body.snippet || "",
        matchedLeadId: body.leadId,
        matchedOutreachId: body.outreachId,
        matchType: body.leadId ? "thread_id" : "unknown",
      },
      body.userId
    );

    return NextResponse.json({ success: true, item: result }, { status: 200 });
  }

  // Otherwise perform inbox sync
  const syncResult = await GmailInboundService.syncInboxReplies(body.userId);
  return NextResponse.json(syncResult, { status: syncResult.success ? 200 : 500 });
}
