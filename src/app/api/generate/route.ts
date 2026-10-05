import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { validateUserAuth } from "@/lib/supabaseServer";
import { dbGetUserSubscription, getPool } from "@/lib/db/queries";
import { isUserAdmin } from "@/lib/adminAuth";
import { shouldBypassRateLimit, checkMemoryRateLimit } from "@/lib/rateLimit";
import { validateBusinessInputs } from "@/lib/validation";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { canonicalGenerationOrchestrator } from "@/lib/intelligence/orchestration/canonicalGenerationOrchestrator";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

let freeLimit: Ratelimit | undefined;
let proLimit: Ratelimit | undefined;
let ipLimit: Ratelimit | undefined;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
if (redisUrl?.startsWith("https://") && !redisUrl.includes("<") && process.env.UPSTASH_REDIS_REST_TOKEN && !process.env.UPSTASH_REDIS_REST_TOKEN.includes("<")) {
  const redis = Redis.fromEnv();
  freeLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "7 d"), prefix: "@upstash/ratelimit/user_free" });
  proLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(50, "7 d"), prefix: "@upstash/ratelimit/user_pro" });
  ipLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "7 d"), prefix: "@upstash/ratelimit/ip" });
}

/** Boundary only: canonical output cannot be changed by post-gate regeneration. */
export async function POST(request: Request) {
  try {
    const auth = await validateUserAuth(request);
    if (!auth.user) return NextResponse.json({ success: false, message: auth.error || "Authentication required" }, { status: auth.status });
    const user = auth.user;
    const subscription = await dbGetUserSubscription(user.id);
    const pro = subscription?.status === "active_paid" && subscription.plan_id === "paid_pro";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    if (!isUserAdmin(user) && !shouldBypassRateLimit(ip)) {
      let allowed: boolean;
      try {
        const limiter = pro ? proLimit : freeLimit;
        if (limiter) {
          const account = await limiter.limit(`ai_usage_${user.id}`);
          const address = !pro && ipLimit ? await ipLimit.limit(`ai_usage_${ip}`) : { success: true };
          allowed = account.success && address.success;
        } else allowed = checkMemoryRateLimit(`user_${user.id}`, pro ? 50 : 3).success && checkMemoryRateLimit(`ip_${ip}`, pro ? 50 : 3).success;
      } catch {
        allowed = checkMemoryRateLimit(`user_${user.id}`, pro ? 50 : 3).success && checkMemoryRateLimit(`ip_${ip}`, pro ? 50 : 3).success;
      }
      if (!allowed) return NextResponse.json({ success: false, message: `${pro ? "Paid Pro" : "Free"} plan limit reached (${pro ? 50 : 3} AI requests per 7 days).` }, { status: 429 });
    }
    const raw: unknown = await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return NextResponse.json({ success: false, message: "Invalid JSON request payload" }, { status: 400 });
    const payload = raw as Record<string, unknown>;
    const validation = validateBusinessInputs(payload);
    if (!validation.isValid || !validation.data) return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
    const text = (key: string) => typeof payload[key] === "string" ? payload[key] as string : undefined;
    if (text("projectId")) {
      const owned = await getPool().query("SELECT id FROM public.projects WHERE id=$1 AND user_id=$2", [text("projectId"), user.id]);
      if (!owned.rowCount) return NextResponse.json({ success: false, message: "Project ownership validation failed" }, { status: 403 });
    }
    await trackAnalyticsEvent({ eventType: "ai_request", userId: user.id, metadata: { category: validation.data.category, isPaidPro: pro } });
    const result = await canonicalGenerationOrchestrator.generateWebsite({
      businessName: validation.data.businessName, category: validation.data.category,
      location: text("location") || text("address") || text("city"),
      phone: text("phone"), email: text("email"), websiteUrl: text("website"), placeId: text("placeId"),
      source: "ui_builder", userId: user.id, tenantId: user.id, leadId: text("projectId"),
      requirements: {
        description: validation.data.description, targetAudience: validation.data.targetAudience,
        style: validation.data.style, primaryColor: validation.data.primaryColor,
        secondaryColor: validation.data.secondaryColor, threeDPreference: validation.data.threeDPreference,
      },
    });
    if (!result.success) return NextResponse.json({ success: false, status: result.status.toLowerCase(), researchId: result.researchId, correlationId: result.correlationId,
      projectId: text("projectId"), error: result.error, message: result.error?.message },
      { status: ["RESEARCH_REQUIRED", "WAITING_HUMAN_APPROVAL", "QUALITY_BLOCKED"].includes(result.status) ? 409 : 500 });
    await trackAnalyticsEvent({ eventType: "ai_success", userId: user.id, metadata: { category: validation.data.category, model: "canonical-generation-orchestrator" } });
    return NextResponse.json({ success: true, data: result.websiteData, preview: result.preview, correlationId: result.correlationId });
  } catch (error) {
    return NextResponse.json({ success: false, message: sanitizeErrorOutput(error) }, { status: 500 });
  }
}
