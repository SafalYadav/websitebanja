// src/lib/automation/auth.ts
// Automation API Authentication Helper

import { verifyAdminAuth } from "@/lib/adminAuth";

const DEFAULT_LOCAL_AUTOMATION_SECRET = "wb-auto-secret-local-dev-2026";

export async function isAuthorized(req: Request): Promise<boolean> {
  const configuredSecret =
    process.env.WEBSITEBANJA_AUTOMATION_SECRET ||
    process.env.AUTOMATION_SECRET ||
    DEFAULT_LOCAL_AUTOMATION_SECRET;

  // 1. Direct automation secret header (for n8n, internal cron, background jobs, test suites)
  const headerSecret = req.headers.get("x-automation-secret");
  if (headerSecret) {
    const trimmed = headerSecret.trim();
    if (
      trimmed === configuredSecret ||
      (process.env.NODE_ENV !== "production" && trimmed === DEFAULT_LOCAL_AUTOMATION_SECRET)
    ) {
      return true;
    }
  }

  // 2. Authorization header (Bearer token)
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    // 2a. Direct secret via Bearer
    if (
      token === configuredSecret ||
      (process.env.NODE_ENV !== "production" && token === DEFAULT_LOCAL_AUTOMATION_SECRET)
    ) {
      return true;
    }

    // 2b. Authenticated Admin Session via Supabase JWT
    try {
      const adminResult = await verifyAdminAuth(req);
      if (adminResult.isAdmin) {
        return true;
      }
    } catch (err) {
      console.error("[Automation Auth] verifyAdminAuth check failed:", err);
    }
  }

  return false;
}
