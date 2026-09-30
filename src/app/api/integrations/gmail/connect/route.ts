// src/app/api/integrations/gmail/connect/route.ts
/**
 * WebsiteBanja Gmail OAuth Connect Initiation Route
 * Phase: Phase 16 (Google Places + Gmail + Inbound Gmail Replies)
 *
 * GET /api/integrations/gmail/connect
 * Initiates Google OAuth 2.0 flow for websitebanja@gmail.com
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { GmailOAuthManager } from "@/lib/integrations/gmailOAuth";
import { isAuthorized } from "@/lib/automation/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secretParam = url.searchParams.get("secret") || url.searchParams.get("token");
  const configuredSecret =
    process.env.WEBSITEBANJA_AUTOMATION_SECRET ||
    process.env.AUTOMATION_SECRET ||
    "wb-auto-secret-local-dev-2026";
  const hasSecretParam = Boolean(secretParam && secretParam.trim() === configuredSecret);

  if (!(await isAuthorized(req)) && !hasSecretParam) {
    return NextResponse.json(
      { error: "Unauthorized. Valid automation secret or admin session required." },
      { status: 401 }
    );
  }
  const jsonMode = url.searchParams.get("json") === "true";
  const redirectUriOverride = url.searchParams.get("redirect_uri") || undefined;

  try {
    const { url: authUrl, state } = GmailOAuthManager.generateAuthorizationUrl(redirectUriOverride);

    if (jsonMode || req.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ url: authUrl, state }, { status: 200 });
    }

    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to generate authorization URL",
        details: err.message || "Missing OAuth credentials",
        hint: "Ensure GOOGLE_CLIENT_ID is set in .env.local",
      },
      { status: 400 }
    );
  }
}
