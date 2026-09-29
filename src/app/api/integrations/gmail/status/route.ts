// src/app/api/integrations/gmail/status/route.ts
/**
 * WebsiteBanja Gmail Integration Status API
 * Phase: Phase 16 (Google Places + Gmail + Inbound Gmail Replies)
 *
 * GET /api/integrations/gmail/status
 * Returns safe connection and operational status for websitebanja@gmail.com
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ConfigValidator } from "@/lib/integrations/configValidator";
import { isAuthorized } from "@/lib/automation/auth";

export async function GET(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { error: "Unauthorized. Valid automation secret or admin session required." },
        { status: 401 }
      );
    }

    const gmail = ConfigValidator.getGmailStatus();
    return NextResponse.json(
      {
        connected: gmail.isConfigured,
        account: gmail.account,
        provider: "gmail",
        sendingEnabled: gmail.sendingEnabled,
        receivingEnabled: gmail.receivingEnabled,
        clientIdPresent: gmail.clientIdPresent,
        refreshTokenPresent: gmail.refreshTokenPresent,
        lastSyncAt: gmail.lastSyncAt,
        lastSendAt: gmail.lastSendAt,
        lastError: gmail.lastError,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to resolve gmail status", message: err.message },
      { status: 500 }
    );
  }
}
