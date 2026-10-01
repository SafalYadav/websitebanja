// src/app/api/automation/ops/callback/route.ts
import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { N8nCeoTaskCallbackSchema } from "@/lib/intelligence/ops/opsToolTypes";
import { MemoryStore } from "@/lib/intelligence/memory/memoryStore";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/automation/ops/callback
 * Secure endpoint for n8n Ops Agent reporting back to WebsiteBanja CEO.
 */
export async function POST(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid or missing automation secret." },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Malformed JSON payload." },
      { status: 400 }
    );
  }

  const parseResult = N8nCeoTaskCallbackSchema.safeParse(body);
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return NextResponse.json(
      { success: false, error: `Invalid callback contract: ${errors.join("; ")}` },
      { status: 400 }
    );
  }

  const callback = parseResult.data;

  // Record in Phase 18 Memory
  await MemoryStore.getInstance().saveDecision({
    decisionId: `dec_n8n_cb_${callback.taskId}`,
    runId: callback.taskId,
    agentName: "n8n_ops_agent",
    objective: callback.summary,
    chosenAction: callback.status,
    reasoningSummary: callback.report || callback.summary,
    confidence: callback.status === "completed" ? 0.95 : 0.6,
    metadata: {
      actionsCount: callback.actions.length,
      failuresCount: callback.failures.length,
      approvalRequired: callback.approvalRequired,
    },
  });

  emitAgentEvent({
    agent: "executive",
    event: "executive.completed",
    requestId: callback.taskId,
    status: callback.status === "completed" ? "success" : "fallback",
    metadata: {
      taskId: callback.taskId,
      status: callback.status,
      actionsCount: callback.actions.length,
    },
  });

  return NextResponse.json({
    success: true,
    acknowledged: true,
    taskId: callback.taskId,
    timestamp: new Date().toISOString(),
  });
}
