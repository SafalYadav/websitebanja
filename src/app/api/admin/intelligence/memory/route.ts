// src/app/api/admin/intelligence/memory/route.ts
import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import {
  MemoryStore,
  MemoryRetriever,
  LessonEngine,
  LessonEvaluator,
  ExperimentManager,
} from "@/lib/intelligence";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/intelligence/memory
 * Returns long-term memories, lessons, active strategies, failures, and experiments.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_mem_get_${ip}`, 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ success: false, message: "Too many requests." }, { status: 429 });
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator clearance required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const url = new URL(req.url);
    const domain = url.searchParams.get("domain") || undefined;
    const store = MemoryStore.getInstance();

    const tenantId = auth.userId;
    const [strategies, lessons, runs, failures, experiments] = await Promise.all([
      store.listStrategies(tenantId, domain),
      store.listLessons(tenantId, domain),
      store.listRuns(tenantId, 20, domain),
      store.listFailures(tenantId, 20, domain),
      store.listExperiments(tenantId, domain),
    ]);

    return NextResponse.json({
      success: true,
      strategies,
      lessons,
      runs,
      failures,
      experiments,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: sanitizeErrorOutput(err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/intelligence/memory
 * Handles human feedback, lesson evaluations, promotions, and experiment management.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_mem_post_${ip}`, 30, 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ success: false, message: "Rate limit exceeded." }, { status: 429 });
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator clearance required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const tenantId = auth.userId;
    const body = await req.json();
    const action = body.action as string;

    const store = MemoryStore.getInstance();
    const lessonEngine = LessonEngine.getInstance();
    const experimentManager = ExperimentManager.getInstance();

    switch (action) {
      case "record_feedback": {
        const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await store.saveFeedback(tenantId, {
          id: feedbackId,
          feedbackId,
          runId: body.runId || "manual_review",
          projectId: body.projectId || null,
          userId: auth.userId,
          feedbackType: body.feedbackType || "human_approval",
          source: "admin_console",
          sentiment: body.sentiment || "positive",
          rating: body.rating || 5,
          correctionText: body.correctionText ? sanitizeErrorOutput(body.correctionText) : null,
          metadata: body.metadata || {},
          createdAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, feedbackId });
      }

      case "evaluate_lesson": {
        const lesson = await store.getLesson(tenantId, body.lessonId);
        if (!lesson) {
          return NextResponse.json({ success: false, message: "Lesson not found." }, { status: 404 });
        }
        const evalResult = LessonEvaluator.evaluateForPromotion(lesson);
        return NextResponse.json({ success: true, evaluation: evalResult });
      }

      case "promote_lesson": {
        const lesson = await store.getLesson(tenantId, body.lessonId);
        if (!lesson) {
          return NextResponse.json({ success: false, message: "Lesson not found." }, { status: 404 });
        }
        const evalResult = LessonEvaluator.evaluateForPromotion(lesson);
        if (!evalResult.canPromote && !body.forceAdminOverride) {
          return NextResponse.json(
            { success: false, message: evalResult.reason, evaluation: evalResult },
            { status: 400 }
          );
        }

        const updated = await lessonEngine.updateStatus(tenantId, body.lessonId, "PROMOTED");
        return NextResponse.json({ success: true, lesson: updated });
      }

      case "create_experiment": {
        const exp = await experimentManager.createExperiment({
          tenantId,
          hypothesis: body.hypothesis,
          domain: body.domain || "general",
          strategyA: body.strategyA,
          strategyB: body.strategyB,
          sampleSize: body.sampleSize ?? 10,
        });
        return NextResponse.json({ success: true, experiment: exp });
      }

      case "activate_strategy": {
        return NextResponse.json({ success: false, code: "GOVERNED_APPROVAL_REQUIRED",
          message: "Direct legacy activation is retired. Submit this strategy as a learning candidate, complete evidence evaluation and regression verification, then request authenticated human approval.",
          requiredFlow: ["create_candidate", "evaluate", "benchmark", "request_approval", "promote"],
        }, { status: 409 });
      }

      default:
        return NextResponse.json({ success: false, message: `Unknown action '${action}'` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: sanitizeErrorOutput(err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
