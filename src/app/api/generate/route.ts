// WHY maxDuration = 120: Full website code synthesis via GPT-5.6 Luna with hosted skills context,
// specialized design intelligence, and post-generation AST/UI-UX validation can require 45-90s.
// Setting 120s accommodates this without triggering upstream proxy timeouts (Azure Container Apps).
export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { validateUserAuth } from "@/lib/supabaseServer";
import { dbGetUserSubscription } from "@/lib/db/queries";
import { openai, OPENAI_GENERATION_MODEL } from "@/lib/openai";
import { buildWebsitePrompt } from "@/lib/prompts";
import { shouldBypassRateLimit, checkMemoryRateLimit } from "@/lib/rateLimit";
import { validateBusinessInputs } from "@/lib/validation";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { AiWorkspace } from "@/types/aiWorkspace";
import {
  validateGeneratedWebsiteUiUx,
  validateGeneratedWebsiteDesign,
  selectDesignSkills,
} from "@/lib/skills/uiUxSkill";
import {
  isOpenAISkillsConfigured,
  getHostedSkillContainerConfig,
  extractTextFromResponse,
  parseWebsiteJson,
} from "@/lib/skills/openaiSkillsService";

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
  const genStart = Date.now();
  console.log("[GEN] request:start");
  let authenticatedUserId: string | undefined;

  try {
    const authStart = Date.now();
    console.log("[GEN] auth:start");
    const auth = await validateUserAuth(req);
    if (!auth.user) {
      console.warn("[GEN] auth:failed duration=" + (Date.now() - authStart) + "ms status=" + auth.status);
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: auth.status });
    }
    const user = auth.user;
    authenticatedUserId = user.id;
    console.log("[GEN] auth:success duration=" + (Date.now() - authStart) + "ms userId=" + user.id);

    // Check user subscription status
    const subData = await dbGetUserSubscription(user.id);

    const isPaidPro = subData?.status === "active_paid" && subData?.plan_id === "paid_pro";

    const userEmail = user.email?.toLowerCase().trim() || "";
    const rawAdminEmails = process.env.ADMIN_EMAILS || "";
    const adminEmailList = rawAdminEmails
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const appRole = (user.app_metadata as Record<string, unknown> | undefined)?.role;
    const isAdmin = adminEmailList.includes(userEmail) || appRole === "admin" || appRole === "superadmin";

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
    const bypass = isAdmin || shouldBypassRateLimit(ip);

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
        } else {
          // In-memory rate limiting fallback
          const limit = isPaidPro ? 50 : 3;
          const ipCheck = checkMemoryRateLimit(`ip_${ip}`, limit);
          if (!ipCheck.success) {
            return NextResponse.json(
              { success: false, message: `${isPaidPro ? "Paid Pro" : "Free"} plan limit reached (${limit} AI requests per 7 days).` },
              { status: 429 }
            );
          }

          const userCheck = checkMemoryRateLimit(`user_${user.id}`, limit);
          if (!userCheck.success) {
            return NextResponse.json(
              { success: false, message: `${isPaidPro ? "Paid Pro" : "Free"} plan limit reached (${limit} AI requests per 7 days).` },
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

    const selectorStart = Date.now();
    console.log("[GEN] selector:start");
    const skillSelection = selectDesignSkills({
      ...websiteData,
      prompt: (websiteData as any).prompt || websiteData.description,
    });
    console.log("[GEN] selector:success duration=" + (Date.now() - selectorStart) + "ms activeSkills=" + skillSelection.metadata.selectedIds.join(","));

    const prompt = buildWebsitePrompt(websiteData, workspace ?? ({} as AiWorkspace));

    const activeSkillsList = skillSelection.systemPromptAdditions.join(", ");

    let parsedResult: Record<string, unknown> | null = null;
    let generationModelUsed = OPENAI_GENERATION_MODEL;
    let isHostedExecution = false;

    // Primary: OpenAI Hosted Skills via Responses API with containerized shell tool
    if (isOpenAISkillsConfigured()) {
      try {
        const skillsStart = Date.now();
        console.log("[GEN] skills:start");
        const containerConfig = getHostedSkillContainerConfig(skillSelection.metadata.selectedIds);
        const instructions = `You are WebsiteBanja AI, an expert autonomous website designer, UI/UX architect, and conversion copywriter.
You have access to authoritative WebsiteBanja Design Intelligence skills mounted in your container environment at /home/oai/skills/.
Use the shell tool to inspect the mounted SKILL.md files (especially websitebanja-master-design-intelligence and the active skills: ${activeSkillsList}) to follow their design guidelines, motion choreography, typography standards, responsive reflow, and UX psychology.
Absolute Priority Hierarchy:
1. User's explicit business requirements (HIGHEST PRIORITY)
2. Business objective & conversion goals
3. Target audience & industry intelligence
4. Brand/style guidelines
5. Active design intelligence skills
6. Defaults
Always prioritize explicit user requirements over general skill rules. Return valid JSON only adhering strictly to the JSON schema.`;

        const openaiStart = Date.now();
        console.log("[GEN] openai:start model=" + OPENAI_GENERATION_MODEL);
        const response = await openai.responses.create({
          model: OPENAI_GENERATION_MODEL,
          instructions,
          input: prompt,
          tools: [containerConfig],
        });
        console.log("[GEN] openai:success duration=" + (Date.now() - openaiStart) + "ms");
        console.log("[GEN] skills:success duration=" + (Date.now() - skillsStart) + "ms");

        const rawText = extractTextFromResponse(response);
        parsedResult = parseWebsiteJson(rawText);
        console.log("[GEN] json:parsed length=" + rawText.length);
        isHostedExecution = true;
      } catch (hostedErr) {
        // Safe server-side diagnostic logging (never exposes API keys or sensitive details)
        console.warn(
          "[OpenAI Skills Runtime] Hosted skills Responses API execution failed; executing graceful local fallback:",
          hostedErr instanceof Error ? hostedErr.message : "Unknown error"
        );
      }
    }

    // Fallback: Local skill prompt injection via standard Chat Completions
    if (!parsedResult) {
      generationModelUsed = OPENAI_GENERATION_MODEL || "gpt-5.6-luna";
      const fallbackStart = Date.now();
      console.log(`[GEN] openai:start model=${generationModelUsed} (chat completion)`);
      try {
        const chatResponse = await openai.chat.completions.create({
          model: generationModelUsed,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content: `You are WebsiteBanja AI, an expert autonomous website designer, UI/UX architect, and conversion copywriter. You apply authoritative principles from UI/UX, Framer Motion, and 21st.dev [Active: ${activeSkillsList}] to generate world-class, accessible, conversion-focused websites adhering strictly to the user's explicit business requirements. Return valid JSON only.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });
        parsedResult = parseWebsiteJson(chatResponse.choices[0]?.message?.content ?? "{}");
        console.log("[GEN] openai:success duration=" + (Date.now() - fallbackStart) + "ms");
      } catch (chatErr) {
        console.warn(`[GEN] ${generationModelUsed} failed, falling back to gpt-4.1-mini:`, chatErr);
        generationModelUsed = "gpt-4.1-mini";
        const fallbackResponse = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are WebsiteBanja AI. Return valid JSON only." },
            { role: "user", content: prompt },
          ],
        });
        parsedResult = parseWebsiteJson(fallbackResponse.choices[0]?.message?.content ?? "{}");
      }
    }

    // Post-generation multi-skill design validation and sanitization
    const validationStart = Date.now();
    const designValidation = validateGeneratedWebsiteDesign(parsedResult, websiteData);
    const { sanitized: result, warnings: uiUxWarnings } = validateGeneratedWebsiteUiUx(
      designValidation.sanitized,
      websiteData
    );
    console.log("[GEN] validation:success duration=" + (Date.now() - validationStart) + "ms warnings=" + uiUxWarnings.length);

    if (uiUxWarnings.length > 0) {
      console.debug("[Design Intelligence Validation]", uiUxWarnings);
    }

    await trackAnalyticsEvent({
      eventType: "ai_success",
      userId: user.id,
      metadata: { category: websiteData.category, model: generationModelUsed, isHosted: isHostedExecution },
    });

    console.log("[GEN] total=" + (Date.now() - genStart) + "ms");
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[GEN] error duration=" + (Date.now() - genStart) + "ms error:", err);

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
