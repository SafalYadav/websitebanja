import { createClient } from "@supabase/supabase-js";

export interface AdminAuthResult {
  isAdmin: boolean;
  userId?: string;
  email?: string;
  error?: string;
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { isAdmin: false, error: "Server Configuration Error: Missing Supabase credentials." };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user || !user.email) {
      return { isAdmin: false, error: "Unauthorized: Invalid or expired session." };
    }

    const userEmail = user.email.toLowerCase().trim();

    // 1. Check against ADMIN_EMAILS environment variable (comma-separated list)
    const rawAdminEmails = process.env.ADMIN_EMAILS || "";
    const adminEmailList = rawAdminEmails
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // 2. Check app_metadata for explicit admin role
    const appRole = (user.app_metadata as Record<string, unknown> | undefined)?.role;
    const isRoleAdmin = appRole === "admin" || appRole === "superadmin";

    const isEmailInList = adminEmailList.includes(userEmail);

    if (isEmailInList || isRoleAdmin) {
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
