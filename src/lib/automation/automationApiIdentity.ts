import { NextResponse } from "next/server";
import { isAuthorized } from "./auth";
import { verifyAdminAuth } from "@/lib/adminAuth";

export async function authorizeAutomationTenant(request: Request): Promise<
  { identity: { tenantId: string; userId?: string }; response?: never } |
  { identity?: never; response: NextResponse }
> {
  if (!await isAuthorized(request)) return { response: NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authenticated automation identity required" } }, { status: 401 }) };
  const admin = await verifyAdminAuth(request);
  const tenantId = admin.isAdmin && admin.userId ? admin.userId : process.env.AUTOMATION_TENANT_ID;
  if (!tenantId?.trim()) return { response: NextResponse.json({ success: false, error: { code: "AUTOMATION_TENANT_REQUIRED", message: "Configure a trusted server automation tenant" } }, { status: 403 }) };
  return { identity: { tenantId, userId: admin.isAdmin ? admin.userId : undefined } };
}
