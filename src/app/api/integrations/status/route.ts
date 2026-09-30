// src/app/api/integrations/status/route.ts
/**
 * WebsiteBanja Integrations Status API
 * Phase: Phase 16 (Google Places + Gmail + Inbound Gmail Replies)
 *
 * GET /api/integrations/status
 * Returns safe server-side configuration status for Google Places, Gmail, and WhatsApp.
 * Redacts all keys and secrets.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ConfigValidator } from "@/lib/integrations/configValidator";
import { isAuthorized } from "@/lib/automation/auth";

export async function GET(req: Request) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json(
        { error: "Unauthorized. Valid automation secret or admin session required." },
        { status: 401 }
      );
    }

    const status = ConfigValidator.getFullStatus();
    return NextResponse.json(status, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to resolve integrations status", message: err.message },
      { status: 500 }
    );
  }
}
