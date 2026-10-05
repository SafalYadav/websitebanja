import { verifyAdminAuth } from "@/lib/adminAuth";

/** Opaque, process-local proof. Serialized payloads and agent-provided names cannot recreate it. */
export interface HumanApprovalAuthorization { readonly kind: "authenticated_human_approval" }
const identities = new WeakMap<object, { tenantId: string; userId: string }>();

export async function authorizeHumanApproval(request: Request, tenantId: string): Promise<HumanApprovalAuthorization> {
  const admin = await verifyAdminAuth(request);
  if (!tenantId.trim() || !admin.isAdmin || !admin.userId || admin.userId !== tenantId) {
    throw new Error("Authenticated human tenant administrator required");
  }
  const capability = Object.freeze({ kind: "authenticated_human_approval" as const });
  identities.set(capability, { tenantId, userId: admin.userId });
  return capability;
}

export function requireHumanApproval(capability: unknown, tenantId: string | null | undefined): string {
  const identity = capability && typeof capability === "object" ? identities.get(capability) : undefined;
  if (!identity || !tenantId || identity.tenantId !== tenantId) throw new Error("Verified human approval authorization required");
  return identity.userId;
}
