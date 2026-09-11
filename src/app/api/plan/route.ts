// WHY maxDuration = 120: Planning synthesizes deep architectural blueprints, design tokens,
// and specialized skill selections. Setting 120s ensures requests are never aborted prematurely
// by upstream proxy/ingress timeouts (e.g. Azure Container Apps HTTP ingress).
export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { validateUserAuth } from "@/lib/supabaseServer";
import { dbGetProjectOwnership } from "@/lib/db/queries";
import { openai } from "@/lib/openai";
import { buildPlanningPrompt } from "@/lib/planningPrompts";
import { shouldBypassRateLimit, checkMemoryRateLimit } from "@/lib/rateLimit";
import { validateBusinessInputs } from "@/lib/validation";
import { generateDesignTokens } from "@/lib/ai/design/designTokens";
import { generateDesignRules } from "@/lib/ai/design/designRules";
import type { WebsiteRequirement } from "@/lib/ai/requirementModel";
import { createWebsitePlan, createDesignPlan, selectComponents } from "@/lib/ai/planner";
import { generateComponents } from "@/lib/ai/generation/generator";
import { AI_WORKSPACE_FILES, type AiWorkspace, type PlanningInput } from "@/types/aiWorkspace";

interface PlanningRequest extends Omit<PlanningInput, "projectId"> {
  projectId?: string;
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
  const planStart = Date.now();
  console.log("[PLAN] request:start");
  try {
    const authStart = Date.now();
    console.log("[PLAN] auth:start");
    const auth = await validateUserAuth(request);
    if (!auth.user) {
      console.warn("[PLAN] auth:failed duration=" + (Date.now() - authStart) + "ms status=" + auth.status);
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: auth.status });
    }
    const user = auth.user;
    console.log("[PLAN] auth:success duration=" + (Date.now() - authStart) + "ms userId=" + user.id);

    const userEmail = user.email?.toLowerCase().trim() || "";
    const rawAdminEmails = process.env.ADMIN_EMAILS || "";
    const adminEmailList = rawAdminEmails
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const appRole = (user.app_metadata as Record<string, unknown> | undefined)?.role;
    const isAdmin = adminEmailList.includes(userEmail) || appRole === "admin" || appRole === "superadmin";

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
    const bypass = isAdmin || shouldBypassRateLimit(ip);

    // WHY key separation (`ai_plan_usage_*` vs `ai_usage_*`):
    // Planning is an intake and design exploration phase with a separate quota, allowing
    // users to refine structure before consuming their full generation allocation.
    if (userRatelimit && ipRatelimit && !bypass) {
      try {
        const ipResult = await ipRatelimit.limit(`ai_plan_usage_${ip}`);
        if (!ipResult.success) {
          return NextResponse.json(
            { success: false, message: "Free plan limit reached. Please upgrade to continue." },
            { status: 429 }
          );
        }

        const userResult = await userRatelimit.limit(`ai_plan_usage_${user.id}`);
        if (!userResult.success) {
          return NextResponse.json(
            { success: false, message: "Free plan limit reached. Please upgrade to continue." },
            { status: 429 }
          );
        }
      } catch (rateLimitErr) {
        console.warn("[RateLimit Execution ERROR] Proceeding gracefully:", rateLimitErr);
      }
    } else if (!bypass) {
      // In-memory rate limiting fallback for planning
      const ipCheck = checkMemoryRateLimit(`plan_ip_${ip}`, 10);
      if (!ipCheck.success) {
        return NextResponse.json(
          { success: false, message: "Planning limit reached. Please retry in a few moments." },
          { status: 429 }
        );
      }

      const userCheck = checkMemoryRateLimit(`plan_user_${user.id}`, 10);
      if (!userCheck.success) {
        return NextResponse.json(
          { success: false, message: "Planning limit reached. Please retry in a few moments." },
          { status: 429 }
        );
      }
    }

    const rawBody: unknown = await request.json();
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ success: false, message: "Invalid JSON request payload." }, { status: 400 });
    }

    const { existingWorkspace, projectId, ...rawInput } = rawBody as PlanningRequest;
    
    // Project Ownership & Isolation Enforcement:
    // If a project already exists in the database, only its rightful owner can generate or modify its plan.
    if (projectId && !projectId.startsWith("demo") && !projectId.startsWith("test") && projectId !== "preview") {
      const projRecord = await dbGetProjectOwnership(projectId);

      if (projRecord && projRecord.user_id !== user.id) {
        return NextResponse.json(
          { success: false, message: "Forbidden: You do not have permission to plan for this project." },
          { status: 403 }
        );
      }
    }
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

    const openaiStart = Date.now();
    console.log("[PLAN] openai:start model=gpt-4.1-mini");
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a senior software architect. Return valid JSON only." },
        { role: "user", content: buildPlanningPrompt(input, existingWorkspace) },
      ],
    });
    console.log("[PLAN] openai:success duration=" + (Date.now() - openaiStart) + "ms");
    const workspace: unknown = JSON.parse(response.choices[0].message.content ?? "{}");
    if (!isWorkspace(workspace)) throw new Error("The planning response was incomplete.");

    // Construct rich, strongly-typed requirement object
    const categoryLower = (input.category || "").toLowerCase();
    const requirement: WebsiteRequirement = {
      intent: "create",
      business: {
        name: input.businessName,
        type: input.category,
        industry: input.category,
      },
      audience: input.targetAudience,
      brand: {
        colors: {
          primary: input.primaryColor,
          secondary: input.secondaryColor,
        },
        style: input.style,
      },
      functionality: {
        booking: categoryLower.includes("clinic") || categoryLower.includes("dental") || categoryLower.includes("salon") || categoryLower.includes("rental"),
        ecommerce: categoryLower.includes("shop") || categoryLower.includes("store") || categoryLower.includes("ecommerce"),
      },
      designPreferences: {
        style: input.style,
      },
    };

    // Full Phase 3 + Phase 4 Pipeline Execution
    const designRules = generateDesignRules(requirement);
    const designTokens = generateDesignTokens(requirement);
    const websitePlan = createWebsitePlan(requirement);
    const designPlan = createDesignPlan(websitePlan, requirement);
    const componentPlan = selectComponents(designPlan, requirement);

    // Merge into workspace response
    (workspace as any).designRules = designRules;
    (workspace as any).designTokens = designTokens;
    (workspace as any).websitePlan = websitePlan;
    (workspace as any).designPlan = designPlan;
    (workspace as any).components = componentPlan;

    // Generate physical component files in src/generated
    const generationResult = generateComponents(requirement, componentPlan, websitePlan, designPlan);
    (workspace as any).generationResult = generationResult;

    console.log("[PLAN] total duration=" + (Date.now() - planStart) + "ms");
    return NextResponse.json({ success: true, data: workspace });
  } catch (err) {
    console.error("[PLAN] error duration=" + (Date.now() - planStart) + "ms error:", err);
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
