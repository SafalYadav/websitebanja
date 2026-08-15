import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { openai } from "@/lib/openai";
import { buildWebsitePrompt } from "@/lib/prompts";
import { shouldBypassRateLimit } from "@/lib/rateLimit";
import { validateBusinessInputs } from "@/lib/validation";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { AiWorkspace } from "@/types/aiWorkspace";

// Create rate limiters for Free Tier: 3 requests per 7 days
let userRatelimitFree: Ratelimit | undefined;
let userRatelimitPro: Ratelimit | undefined;
let ipRatelimit: Ratelimit | undefined;

function isValidUpstashUrl(url?: string): boolean {
  if (!url || url.includes("<") || url.includes(">") || url.includes("your-database")) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

if (
  isValidUpstashUrl(process.env.UPSTASH_REDIS_REST_URL) &&
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  !process.env.UPSTASH_REDIS_REST_TOKEN.includes("<")
) {
  try {
    const redis = Redis.fromEnv();
    userRatelimitFree = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "7 d"),
      analytics: true,
      prefix: "@upstash/ratelimit/user_free",
    });
    userRatelimitPro = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, "7 d"),
      analytics: true,
      prefix: "@upstash/ratelimit/user_pro",
    });
    ipRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "7 d"),
      analytics: true,
      prefix: "@upstash/ratelimit/ip",
    });
  } catch (err) {
    console.warn("[RateLimit] Upstash Redis init error in generate:", err);
  }
}

export async function POST(req: Request) {
  let authenticatedUserId: string | undefined;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    authenticatedUserId = user.id;

    // Check user subscription status
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("plan_id, status")
      .eq("user_id", user.id)
      .single();

    const isPaidPro = subData?.status === "active_paid" && subData?.plan_id === "paid_pro";

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
    const bypass = shouldBypassRateLimit(ip);

    if (!bypass) {
      try {
        if (isPaidPro && userRatelimitPro) {
          const proResult = await userRatelimitPro.limit(`ai_usage_${user.id}`);
          if (!proResult.success) {
            return NextResponse.json(
              { success: false, message: "Paid Pro limit reached (50 AI requests per 7 days)." },
              { status: 429 }
            );
          }
        } else if (userRatelimitFree && ipRatelimit) {
          // Free plan anti-abuse: check both IP limit and User Account limit
          const ipResult = await ipRatelimit.limit(`ai_usage_${ip}`);
          if (!ipResult.success) {
            return NextResponse.json(
              { success: false, message: "Free plan limit reached (3 AI requests per 7 days). Please upgrade to Paid Pro for higher limits." },
              { status: 429 }
            );
          }

          const userResult = await userRatelimitFree.limit(`ai_usage_${user.id}`);
          if (!userResult.success) {
            return NextResponse.json(
              { success: false, message: "Free plan limit reached (3 AI requests per 7 days). Please upgrade to Paid Pro for higher limits." },
              { status: 429 }
            );
          }
        }
      } catch (rateLimitErr) {
        console.warn("[RateLimit Execution ERROR in generate] Proceeding gracefully:", rateLimitErr);
      }
    }

    const rawBody: unknown = await req.json();
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ success: false, message: "Invalid JSON request payload." }, { status: 400 });
    }

    const { workspace, ...rawWebsiteData } = rawBody as { workspace?: AiWorkspace; [key: string]: unknown };

    const inputValidation = validateBusinessInputs(rawWebsiteData);
    if (!inputValidation.isValid || !inputValidation.data) {
      return NextResponse.json({ success: false, message: inputValidation.error }, { status: 400 });
    }

    await trackAnalyticsEvent({
      eventType: "ai_request",
      userId: user.id,
      metadata: { category: inputValidation.data.category, isPaidPro },
    });

    const websiteData = inputValidation.data;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, message: "OpenAI API key is missing. Please configure OPENAI_API_KEY in server environment variables." },
        { status: 500 }
      );
    }

    const prompt = buildWebsitePrompt(websiteData, workspace ?? ({} as AiWorkspace));

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "You are WebsiteBanja AI. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const result = JSON.parse(
      response.choices[0].message.content ?? "{}"
    ) as Record<string, unknown>;

    if (!result || typeof result !== "object") {
      throw new Error("Invalid AI website generation structure: expected JSON object.");
    }

    const DEFAULT_SECTION_ORDER = ["hero", "about", "services", "features", "faq", "contact", "footer"];

    if (!Array.isArray(result.sectionOrder) || result.sectionOrder.length === 0) {
      const existingSections = DEFAULT_SECTION_ORDER.filter((key) => key in result && result[key] !== null);
      result.sectionOrder = existingSections.length > 0 ? existingSections : DEFAULT_SECTION_ORDER;
    }

    await trackAnalyticsEvent({
      eventType: "ai_success",
      userId: user.id,
      metadata: { category: websiteData.category },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("API /api/generate error:", err);

    if (authenticatedUserId) {
      void trackAnalyticsEvent({
        eventType: "ai_failure",
        userId: authenticatedUserId,
        metadata: { error: err instanceof Error ? err.message : "Unknown error" },
      });
    }

    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        success: false,
        message: isDev && err instanceof Error ? err.message : "Failed to generate website. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}
