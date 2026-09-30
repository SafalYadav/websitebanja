// src/app/api/integrations/gmail/callback/route.ts
/**
 * WebsiteBanja Gmail OAuth Callback Route
 * Phase: Phase 16 (Google Places + Gmail + Inbound Gmail Replies)
 *
 * GET /api/integrations/gmail/callback
 * Handles OAuth callback, validates CSRF state, exchanges authorization code,
 * and securely persists refresh token in local storage.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { GmailOAuthManager } from "@/lib/integrations/gmailOAuth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectTarget = `${baseUrl}/admin?tab=integrations`;

  if (error) {
    return NextResponse.redirect(
      `${redirectTarget}&error=${encodeURIComponent(`Google OAuth denied: ${error}`)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${redirectTarget}&error=${encodeURIComponent("Missing authorization code or state parameter.")}`
    );
  }

  // Validate CSRF state
  const isValidState = GmailOAuthManager.verifyState(state);
  if (!isValidState) {
    return NextResponse.redirect(
      `${redirectTarget}&error=${encodeURIComponent("Invalid or expired OAuth CSRF state.")}`
    );
  }

  // Exchange code for tokens
  const exchangeResult = await GmailOAuthManager.exchangeCode(code);
  if (!exchangeResult.success) {
    return NextResponse.redirect(
      `${redirectTarget}&error=${encodeURIComponent(exchangeResult.error || "Token exchange failed.")}`
    );
  }

  return NextResponse.redirect(`${redirectTarget}&status=connected&provider=gmail`);
}
