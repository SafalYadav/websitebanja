// src/app/api/agent/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabaseServer";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { mitraSessionManager, type MitraSessionStatus } from "@/lib/agents/mitra/sessionManager";
import { mitraToolRegistry } from "@/lib/agents/mitra/toolRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`mitra_session_${ip}`, 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many session operations. Please slow down." },
        { status: 429 }
      );
    }

    const authUser = await authenticateRequest(req);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const action = body?.action;

    // 1. Session Creation (requires authenticated user)
    if (action === "create") {
      if (!authUser) {
        return NextResponse.json(
          { success: false, error: "Authentication required to create a Mitra session." },
          { status: 401 }
        );
      }

      const session = mitraSessionManager.createSession({
        userId: authUser.id,
        projectId: body.projectId,
        mode: body.mode || "live",
        metadata: body.metadata,
      });

      return NextResponse.json({ success: true, session });
    }

    // 2. Tool Execution (requires authenticated user and active session)
    if (action === "tool_call") {
      if (!authUser) {
        return NextResponse.json(
          { success: false, error: "Authentication required to invoke tools." },
          { status: 401 }
        );
      }

      const { toolName, args, sessionId, projectId, confirmed } = body;
      if (!toolName || typeof toolName !== "string") {
        return NextResponse.json({ success: false, error: "Missing 'toolName' parameter" }, { status: 400 });
      }

      const result = await mitraToolRegistry.executeTool(
        toolName,
        args || {},
        {
          userId: authUser.id,
          projectId: projectId || body.projectId,
          sessionId: sessionId || "adhoc_session",
          confirmed: Boolean(confirmed),
        }
      );

      return NextResponse.json({ success: result.success, result });
    }

    // 3. Status Update
    if (action === "status") {
      const { sessionId, status, currentTool, error, mode } = body;
      if (!sessionId || !status) {
        return NextResponse.json({ success: false, error: "Missing sessionId or status" }, { status: 400 });
      }

      const updated = mitraSessionManager.updateSessionStatus(sessionId, status as MitraSessionStatus, {
        currentTool,
        error,
        mode,
      });

      if (!updated) {
        return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, session: updated });
    }

    // 4. Reconnect Recording
    if (action === "reconnect") {
      const { sessionId } = body;
      if (!sessionId) {
        return NextResponse.json({ success: false, error: "Missing sessionId" }, { status: 400 });
      }

      const result = mitraSessionManager.recordReconnect(sessionId);
      return NextResponse.json({ success: true, ...result });
    }

    // 5. Close Session
    if (action === "close") {
      const { sessionId } = body;
      if (sessionId) {
        mitraSessionManager.closeSession(sessionId);
      }
      return NextResponse.json({ success: true });
    }

    // 6. Get Session
    if (action === "get") {
      const { sessionId } = body;
      if (!sessionId) {
        return NextResponse.json({ success: false, error: "Missing sessionId" }, { status: 400 });
      }

      const session = mitraSessionManager.getSession(sessionId);
      if (!session) {
        return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, session });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: '${action}'` },
      { status: 400 }
    );
  } catch (err) {
    const safeError = sanitizeErrorOutput(err instanceof Error ? err.message : String(err));
    return NextResponse.json({ success: false, error: safeError }, { status: 500 });
  }
}
