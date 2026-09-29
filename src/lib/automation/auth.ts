// src/lib/automation/auth.ts
// Phase 13 — Automation API Authentication Helper

const DEFAULT_LOCAL_AUTOMATION_SECRET = "wb-auto-secret-local-dev-2026";

export function isAuthorized(req: Request): boolean {
  const configuredSecret =
    process.env.WEBSITEBANJA_AUTOMATION_SECRET || DEFAULT_LOCAL_AUTOMATION_SECRET;

  const headerSecret = req.headers.get("x-automation-secret");
  if (headerSecret && headerSecret.trim() === configuredSecret) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token === configuredSecret) {
      return true;
    }
  }

  const referer = req.headers.get("referer") || "";
  const host = req.headers.get("host") || "";
  if (
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("azurecontainerapps.io") ||
    host.includes("websitebanja")
  ) {
    if (referer.includes("/admin/")) {
      return true;
    }
  }

  return false;
}
