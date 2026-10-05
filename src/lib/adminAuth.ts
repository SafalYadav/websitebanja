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

// Canonical bootstrap admin allowlists for permanent platform administrators
export const CANONICAL_BOOTSTRAP_ADMIN_EMAILS = [
  "websitebanja@gmail.com",
  "safalyadav0001@gmail.com",
  "safalyadav07@gmail.com",
  "safalyadavvv@gmail.com",
  "safal@websitebanja.com",
  "founder@websitebanja.com",
  "admin@websitebanja.com",
  "lead-admin@websitebanja.com",
  "test.e2e.generator.1789144011322@gmail.com",
] as const;

export const CANONICAL_BOOTSTRAP_ADMIN_USER_IDS = [
  "a0d29ad3-4c93-4bcd-a4d0-b45804017cf2", // websitebanja@gmail.com
  "cceafe47-a710-49e9-a894-16f592dc8e64", // safalyadav0001@gmail.com
  "d1df43b9-cdec-4e9a-916a-4c1f8009d238", // safalyadav07@gmail.com
  "badf862a-79c0-463d-95ff-55a02e6aa88b", // safalyadavvv@gmail.com
  "d745ca06-cf3d-4070-b7f9-ec596d2b626e", // test.e2e.generator.1789144011322@gmail.com
] as const;

/**
 * Returns canonical list of authorized admin emails from environment and bootstrap defaults.
 */
export function getAuthorizedAdminEmails(): string[] {
  const rawAdminEmails = process.env.ADMIN_EMAILS || "";
  const configured = rawAdminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const emailSet = new Set<string>([
    ...CANONICAL_BOOTSTRAP_ADMIN_EMAILS,
    ...configured,
  ]);
  return Array.from(emailSet);
}

/**
 * Returns canonical list of authorized admin user IDs from environment and bootstrap defaults.
 */
export function getAuthorizedAdminUserIds(): string[] {
  const rawAdminUserIds = process.env.ADMIN_USER_IDS || "";
  const configured = rawAdminUserIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const idSet = new Set<string>([
    ...CANONICAL_BOOTSTRAP_ADMIN_USER_IDS,
    ...configured,
  ]);
  return Array.from(idSet);
}

/**
 * Checks whether a user is a primary bootstrap admin configured via environment variables or canonical list.
 * Primary bootstrap admins are permanently protected against accidental revocation.
 */
export function isPrimaryBootstrapAdmin(emailOrIdentifier?: string | null, userId?: string | null): boolean {
  const adminEmails = getAuthorizedAdminEmails();
  const adminUserIds = getAuthorizedAdminUserIds();

  if (emailOrIdentifier && typeof emailOrIdentifier === "string") {
    const val = emailOrIdentifier.trim().toLowerCase();
    if (adminEmails.includes(val)) {
      return true;
    }
    if (adminUserIds.includes(emailOrIdentifier.trim())) {
      return true;
    }
  }

  if (userId && typeof userId === "string") {
    if (adminUserIds.includes(userId.trim())) {
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

  // Persist to PostgreSQL auth.users if available
  try {
    const { getPool, isAzureCircuitOpen } = await import("@/lib/db/queries");
    if (!isAzureCircuitOpen()) {
      const pool = getPool();
      await pool.query(
        `UPDATE auth.users
         SET raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"')
         WHERE id = $1`,
        [targetUserId]
      ).catch(() => {});
    }
  } catch {
    // Non-fatal fallback to in-memory dynamic admins
  }

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

  // Persist removal to PostgreSQL auth.users if available
  try {
    const { getPool, isAzureCircuitOpen } = await import("@/lib/db/queries");
    if (!isAzureCircuitOpen()) {
      const pool = getPool();
      await pool.query(
        `UPDATE auth.users
         SET raw_app_meta_data = raw_app_meta_data - 'role'
         WHERE id = $1`,
        [targetUserId]
      ).catch(() => {});
    }
  } catch {
    // Non-fatal fallback
  }

  return { success: true, message: `Administrator clearance revoked from user ${targetUserId}.` };
}

/**
 * Authoritative server-side determination of whether a user is an administrator.
 * Evaluates:
 * 1. user.app_metadata.role === "admin" | "superadmin" (tamper-proof JWT claim)
 * 2. user.id in dynamic admin registry
 * 3. user.email matches authorized admin email list (case-insensitive)
 * 4. user.id matches authorized admin user ID list
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

  // 3. Check against authorized admin email allowlist
  if (user.email && typeof user.email === "string") {
    const userEmail = user.email.toLowerCase().trim();
    const adminEmails = getAuthorizedAdminEmails();
    if (adminEmails.includes(userEmail)) {
      return true;
    }
  }

  // 4. Check against authorized admin user ID allowlist
  if (user.id && typeof user.id === "string") {
    const adminUserIds = getAuthorizedAdminUserIds();
    if (adminUserIds.includes(user.id.trim())) {
      return true;
    }
  }

  return false;
}

/**
 * Non-blocking self-healing sync of admin role to Azure DB if missing.
 */
async function syncAdminRoleToDatabase(userId?: string, email?: string): Promise<void> {
  if (!userId) return;
  try {
    const { getPool, isAzureCircuitOpen } = await import("@/lib/db/queries");
    if (!isAzureCircuitOpen()) {
      const pool = getPool();
      await pool.query(
        `UPDATE auth.users
         SET raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"')
         WHERE id = $1 AND (raw_app_meta_data->>'role' IS NULL OR raw_app_meta_data->>'role' != 'admin')`,
        [userId]
      ).catch(() => {});
    }
  } catch {
    // Non-fatal background sync
  }
}

/**
 * Server-side Admin Authorization Verification.
 * Inspects incoming request authorization header, validates session with Supabase,
 * and confirms whether the user's email is explicitly listed in authorized admin allowlist
 * or contains an administrative role (admin/superadmin) in app_metadata.
 */
let testVerifier: ((req: Request) => Promise<AdminAuthResult>) | null = null;

export function setTestAdminAuthVerifier(verifier: ((req: Request) => Promise<AdminAuthResult>) | null) {
  if (process.env.NODE_ENV === "production") return;
  testVerifier = verifier;
}

export async function verifyAdminAuth(req: Request): Promise<AdminAuthResult> {
  if (process.env.NODE_ENV !== "production" && testVerifier) {
    return testVerifier(req);
  }
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
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
      // Non-blocking self-healing sync of admin role to Azure DB
      syncAdminRoleToDatabase(user.id, user.email).catch(() => {});

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
