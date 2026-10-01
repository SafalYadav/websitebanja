// src/app/api/automation/ops/dispatch/route.ts
import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { n8nOpsClient } from "@/lib/intelligence/ops/n8nOpsClient";
import { CeoN8nTaskDispatchSchema } from "@/lib/intelligence/ops/opsToolTypes";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * POST /api/automation/ops/dispatch
 * Secure endpoint to dispatch an approved operational task from CEO to n8n Ops Agent.
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

  const parseResult = CeoN8nTaskDispatchSchema.safeParse(body);
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return NextResponse.json(
      { success: false, error: `Invalid dispatch contract: ${errors.join("; ")}` },
      { status: 400 }
    );
  }

  try {
    const callback = await n8nOpsClient.dispatchTask(parseResult.data);
    return NextResponse.json({
      success: true,
      callback,
    });
  } catch (err: unknown) {
    const safeError = sanitizeErrorOutput(err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { success: false, error: `Ops dispatch failed: ${safeError}` },
      { status: 500 }
    );
  }
}
