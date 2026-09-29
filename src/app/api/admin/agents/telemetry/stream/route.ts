// src/app/api/admin/agents/telemetry/stream/route.ts
import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import {
  subscribeToTelemetry,
  getActiveAgentStatuses,
  getRecentEvents,
} from "@/lib/telemetry/agentTelemetry";
import type { AgentTelemetryEvent } from "@/lib/telemetry/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/agents/telemetry/stream
 *
 * Real-time Server-Sent Events (SSE) telemetry stream for the Admin Health Panel.
 * Emits live agent lifecycle events, provider calls, fallbacks, errors, and latency metrics.
 *
 * Access Control: Strictly restricted to verified administrators.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`sse_telemetry_${ip}`, 15, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many stream connection attempts. Please wait a moment." },
        { status: 429 }
      );
    }

    // Authenticate administrator via Authorization header or ?token= query parameter (for browser EventSource)
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");

    let authReq = req;
    if (queryToken && !req.headers.get("authorization")) {
      const clonedHeaders = new Headers(req.headers);
      clonedHeaders.set("authorization", `Bearer ${queryToken}`);
      authReq = new Request(req.url, {
        method: req.method,
        headers: clonedHeaders,
      });
    }

    const auth = await verifyAdminAuth(authReq);
    if (!auth.isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: auth.error || "Forbidden: Administrator clearance is required to view live telemetry.",
        },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        // 1. Send initial state snapshot upon connection
        const initialPayload = {
          agents: getActiveAgentStatuses(),
          recentEvents: getRecentEvents({ limit: 50 }),
        };
        const initChunk = `event: init\ndata: ${JSON.stringify(initialPayload)}\n\n`;
        controller.enqueue(encoder.encode(initChunk));

        // 2. Subscribe to real-time telemetry broadcaster
        const unsubscribe = subscribeToTelemetry((event: AgentTelemetryEvent) => {
          try {
            const eventChunk = `event: telemetry\ndata: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(eventChunk));
          } catch {
            // Controller closed or client disconnected
          }
        }, { isAdmin: true, userId: auth.userId });

        // 3. Heartbeat keepalive every 15 seconds to prevent gateway timeouts
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": keepalive\n\n"));
          } catch {
            clearInterval(heartbeatInterval);
          }
        }, 15_000);

        // 4. Handle client disconnection cleanly
        req.signal.addEventListener("abort", () => {
          clearInterval(heartbeatInterval);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform, no-store",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[API /api/admin/agents/telemetry/stream Error]:", err);
    return NextResponse.json(
      { success: false, message: "Failed to establish telemetry stream." },
      { status: 500 }
    );
  }
}
