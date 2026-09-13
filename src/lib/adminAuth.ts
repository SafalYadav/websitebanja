import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase";

export interface AdminAuthResult {
  isAdmin: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

export interface AdminUserCandidate {
  id?: string;
  email?: string | null;
  app_metadata?: Record<string, unknown>;
}

/**
 * Authoritative server-side determination of whether a user is an administrator.
 * Evaluates:
 * 1. user.app_metadata.role === "admin" | "superadmin" (tamper-proof JWT claim)
 * 2. user.email matches ADMIN_EMAILS (comma-separated, case-insensitive)
 * 3. user.id matches ADMIN_USER_IDS (comma-separated)
 */
export function isUserAdmin(user: AdminUserCandidate | null | undefined): boolean {
  if (!user) return false;

  // 1. Check app_metadata for explicit admin/superadmin role
  const appRole = (user.app_metadata as Record<string, unknown> | undefined)?.role;
  if (appRole === "admin" || appRole === "superadmin") {
    return true;
  }

  // 2. Check against ADMIN_EMAILS environment variable (comma-separated list)
  if (user.email && typeof user.email === "string") {
    const userEmail = user.email.toLowerCase().trim();
    const rawAdminEmails = process.env.ADMIN_EMAILS || "";
    const adminEmailList = rawAdminEmails
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmailList.includes(userEmail)) {
      return true;
    }
  }

  // 3. Check against ADMIN_USER_IDS environment variable (comma-separated list)
  if (user.id && typeof user.id === "string") {
    const rawAdminUserIds = process.env.ADMIN_USER_IDS || "";
    const adminUserIdList = rawAdminUserIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (adminUserIdList.includes(user.id)) {
      return true;
    }
  }

  return false;
}

/**
 * Server-side Admin Authorization Verification.
 * Inspects incoming request authorization header, validates session with Supabase,
 * and confirms whether the user's email is explicitly listed in ADMIN_EMAILS
 * or contains an administrative role (admin/superadmin) in app_metadata.
 */
export async function verifyAdminAuth(req: Request): Promise<AdminAuthResult> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return { isAdmin: false, error: "Unauthorized: Missing Bearer authorization token." };
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return { isAdmin: false, error: "Unauthorized: Invalid authorization token." };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { isAdmin: false, error: "Unauthorized: Invalid or expired session." };
    }

    if (isUserAdmin(user)) {
      return {
        isAdmin: true,
        userId: user.id,
        email: user.email,
      };
    }

    return {
      isAdmin: false,
      userId: user.id,
      email: user.email,
      error: "Forbidden: You do not have administrative permissions to view this dashboard.",
    };
  } catch (err) {
    console.error("[Admin Auth Exception]", err);
    return { isAdmin: false, error: "Internal Authorization Error." };
  }
}
