import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { openai } from "@/lib/openai";
import { buildPlanningPrompt } from "@/lib/planningPrompts";
import { shouldBypassRateLimit } from "@/lib/rateLimit";
import { validateBusinessInputs } from "@/lib/validation";
import { AI_WORKSPACE_FILES, type AiWorkspace, type PlanningInput } from "@/types/aiWorkspace";

interface PlanningRequest extends PlanningInput {
  existingWorkspace?: AiWorkspace;
}

function isWorkspace(value: unknown): value is AiWorkspace {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return AI_WORKSPACE_FILES.every((file) => typeof candidate[file] === "string");
}

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

// Create rate limiters for 3 requests per 7 days
let userRatelimit: Ratelimit | undefined;
let ipRatelimit: Ratelimit | undefined;

if (
  isValidUpstashUrl(process.env.UPSTASH_REDIS_REST_URL) &&
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  !process.env.UPSTASH_REDIS_REST_TOKEN.includes("<")
) {
  try {
    const redis = Redis.fromEnv();
    userRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "7 d"),
      analytics: true,
      prefix: "@upstash/ratelimit/user",
    });
    ipRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "7 d"),
      analytics: true,
      prefix: "@upstash/ratelimit/ip",
    });
  } catch (err) {
    console.warn("[RateLimit] Upstash Redis init error:", err);
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
    const bypass = shouldBypassRateLimit(ip);

    if (userRatelimit && ipRatelimit && !bypass) {
      try {
        const ipResult = await ipRatelimit.limit(`ai_usage_${ip}`);
        if (!ipResult.success) {
          return NextResponse.json(
            { success: false, message: "Free plan limit reached (3 AI requests per 7 days). Please upgrade to continue." },
            { status: 429 }
          );
        }

        const userResult = await userRatelimit.limit(`ai_usage_${user.id}`);
        if (!userResult.success) {
          return NextResponse.json(
            { success: false, message: "Free plan limit reached (3 AI requests per 7 days). Please upgrade to continue." },
            { status: 429 }
          );
        }
      } catch (rateLimitErr) {
        console.warn("[RateLimit Execution ERROR] Proceeding gracefully:", rateLimitErr);
      }
    }

    const rawBody: unknown = await request.json();
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ success: false, message: "Invalid JSON request payload." }, { status: 400 });
    }

    const { existingWorkspace, ...rawInput } = rawBody as PlanningRequest;
    const inputValidation = validateBusinessInputs(rawInput);
    if (!inputValidation.isValid || !inputValidation.data) {
      return NextResponse.json({ success: false, message: inputValidation.error }, { status: 400 });
    }

    const input = inputValidation.data;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, message: "OpenAI API key is missing. Please configure OPENAI_API_KEY in server environment variables." },
        { status: 500 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a senior software architect. Return valid JSON only." },
        { role: "user", content: buildPlanningPrompt(input, existingWorkspace) },
      ],
    });
    const workspace: unknown = JSON.parse(response.choices[0].message.content ?? "{}");
    if (!isWorkspace(workspace)) throw new Error("The planning response was incomplete.");
    return NextResponse.json({ success: true, data: workspace });
  } catch (err) {
    console.error("API /api/plan error:", err);
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        success: false,
        message: isDev && err instanceof Error ? err.message : "Failed to create AI planning documents. Please try again.",
      },
      { status: 500 }
    );
  }
}
