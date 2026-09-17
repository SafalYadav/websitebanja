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

// In-memory dynamic admin store for granted administrators
const dynamicAdmins = new Set<string>();

// In-memory audit log ledger for quick retrieval & resilient fallback
export interface PrivilegeAuditEvent {
  id: string;
  actorAdminId: string;
  targetUserId: string;
  action: "ADMIN_GRANTED" | "ADMIN_REVOKED" | "PRO_GRANTED" | "PRO_REVOKED";
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  reason?: string;
  createdAt: string;
}

const memoryAuditLogs: PrivilegeAuditEvent[] = [];

/**
 * Checks whether a user is a primary bootstrap admin configured via environment variables.
 * Primary bootstrap admins are permanently protected against accidental revocation.
 */
export function isPrimaryBootstrapAdmin(emailOrIdentifier?: string | null, userId?: string | null): boolean {
  if (emailOrIdentifier && typeof emailOrIdentifier === "string") {
    const val = emailOrIdentifier.trim();
    const rawAdminEmails = process.env.ADMIN_EMAILS || "";
    const adminEmailList = rawAdminEmails
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmailList.includes(val.toLowerCase())) {
      return true;
    }

    const rawAdminUserIds = process.env.ADMIN_USER_IDS || "";
    const adminUserIdList = rawAdminUserIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (adminUserIdList.includes(val)) {
      return true;
    }
  }

  if (userId && typeof userId === "string") {
    const rawAdminUserIds = process.env.ADMIN_USER_IDS || "";
    const adminUserIdList = rawAdminUserIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (adminUserIdList.includes(userId.trim())) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a user has been dynamically granted admin clearance.
 */
export function isDynamicAdmin(userId: string): boolean {
  return dynamicAdmins.has(userId);
}

export const isDynamicallyGrantedAdmin = isDynamicAdmin;
export const getAdminAuditTrail = getRecentAuditLogs;

/**
 * Records a privilege change audit event in memory and Azure PostgreSQL.
 */
export async function recordPrivilegeAudit(event: {
  actorAdminId: string;
  targetUserId: string;
  action: "ADMIN_GRANTED" | "ADMIN_REVOKED" | "PRO_GRANTED" | "PRO_REVOKED";
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  reason?: string;
}): Promise<PrivilegeAuditEvent> {
  const auditEvent: PrivilegeAuditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    actorAdminId: event.actorAdminId,
    targetUserId: event.targetUserId,
    action: event.action,
    previousState: event.previousState,
    newState: event.newState,
    reason: event.reason,
    createdAt: new Date().toISOString(),
  };

  // 1. Record in memory buffer (capped at 200 most recent events)
  memoryAuditLogs.unshift(auditEvent);
  if (memoryAuditLogs.length > 200) {
    memoryAuditLogs.pop();
  }

  // 2. Persist to Azure PostgreSQL if available (non-blocking)
  try {
    const { getPool } = await import("@/lib/db/queries");
    const pool = getPool();
    await pool.query(
      `INSERT INTO public.analytics_events (event_type, user_id, metadata)
       VALUES ($1, $2, $3)`,
      [
        event.action,
        event.actorAdminId,
        JSON.stringify({
          targetUserId: event.targetUserId,
          action: event.action,
          previousState: event.previousState,
          newState: event.newState,
          reason: event.reason || null,
        }),
      ]
    ).catch(() => {});
  } catch {
    // Graceful fallback to memory ledger
  }

  return auditEvent;
}

/**
 * Retrieves recent privilege audit events.
 */
export function getRecentAuditLogs(limit: number = 50): PrivilegeAuditEvent[] {
  return memoryAuditLogs.slice(0, Math.min(limit, 100));
}

/**
 * Grants administrative role to a target user.
 */
export async function grantAdminRole(
  targetUserId: string,
  actorAdminId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  if (!targetUserId || typeof targetUserId !== "string") {
    throw new Error("Target user ID is required.");
  }

  const previousIsAdmin = dynamicAdmins.has(targetUserId);
  dynamicAdmins.add(targetUserId);

  await recordPrivilegeAudit({
    actorAdminId,
    targetUserId,
    action: "ADMIN_GRANTED",
    previousState: { isAdmin: previousIsAdmin },
    newState: { isAdmin: true },
    reason,
  });

  return { success: true, message: `Administrator clearance granted to user ${targetUserId}.` };
}

/**
 * Revokes administrative role from a target user with self-lockout & primary admin safeguards.
 */
export async function revokeAdminRole(
  targetUserId: string,
  actorAdminId: string,
  targetEmail?: string | null,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  if (!targetUserId || typeof targetUserId !== "string") {
    throw new Error("Target user ID is required.");
  }

  // Safeguard 1: Anti-self-lockout
  if (targetUserId === actorAdminId) {
    throw new Error("Administrators cannot revoke their own administrative clearance.");
  }

  // Safeguard 2: Protected primary bootstrap admin
  if (isPrimaryBootstrapAdmin(targetEmail, targetUserId)) {
    throw new Error("Cannot revoke privileges of the primary bootstrap administrator.");
  }

  const previousIsAdmin = dynamicAdmins.has(targetUserId);
  dynamicAdmins.delete(targetUserId);

  await recordPrivilegeAudit({
    actorAdminId,
    targetUserId,
    action: "ADMIN_REVOKED",
    previousState: { isAdmin: previousIsAdmin },
    newState: { isAdmin: false },
    reason,
  });

  return { success: true, message: `Administrator clearance revoked from user ${targetUserId}.` };
}

/**
 * Authoritative server-side determination of whether a user is an administrator.
 * Evaluates:
 * 1. user.app_metadata.role === "admin" | "superadmin" (tamper-proof JWT claim)
 * 2. user.email matches ADMIN_EMAILS (comma-separated, case-insensitive)
 * 3. user.id matches ADMIN_USER_IDS (comma-separated)
 * 4. user.id in dynamic admin registry
 */
export function isUserAdmin(user: AdminUserCandidate | null | undefined): boolean {
  if (!user) return false;

  // 1. Check app_metadata for explicit admin/superadmin role
  const appRole = (user.app_metadata as Record<string, unknown> | undefined)?.role;
  if (appRole === "admin" || appRole === "superadmin") {
    return true;
  }

  // 2. Check against dynamic admin registry
  if (user.id && dynamicAdmins.has(user.id)) {
    return true;
  }

  // 3. Check against ADMIN_EMAILS environment variable (comma-separated list)
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

  // 4. Check against ADMIN_USER_IDS environment variable (comma-separated list)
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
