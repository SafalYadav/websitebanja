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
import { MODEL_CONFIG, sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { buildWebsitePrompt } from "@/lib/prompts";
import { buildAIContext } from "@/lib/ai/contextBuilder";
import { shouldBypassRateLimit, checkMemoryRateLimit } from "@/lib/rateLimit";
import { isUserAdmin } from "@/lib/adminAuth";
import { validateBusinessInputs } from "@/lib/validation";
import type { SkillId } from "@/lib/skills/types";
import { runSkillsAgent, getRecentDesignFingerprints, buildDeterministicSkillsFallback } from "@/lib/agents/skills";
import {
  runUniquenessAgent,
  MAX_UNIQUENESS_REGENERATIONS,
  type UniquenessAgentOutput,
} from "@/lib/agents/uniqueness";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { AiWorkspace } from "@/types/aiWorkspace";
import {
  validateGeneratedWebsiteUiUx,
  validateGeneratedWebsiteDesign,
} from "@/lib/skills/uiUxSkill";
import {
  validateWebsiteQuality,
  formatQualityReport,
} from "@/lib/ai/design/qualityValidator";
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
  const requestId = `req_gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  console.log(`[GEN] request:start id=${requestId}`);
  let authenticatedUserId: string | undefined;

  emitAgentEvent({
    event: "agent.started",
    agent: "generator",
    requestId,
    metadata: { operation: "Full website generation" },
  });

  try {
    const authStart = Date.now();
    console.log("[GEN] auth:start");
    const auth = await validateUserAuth(req);
    if (!auth.user) {
      console.warn("[GEN] auth:failed duration=" + (Date.now() - authStart) + "ms status=" + auth.status);
      emitAgentEvent({
        event: "agent.failed",
        agent: "generator",
        requestId,
        status: "error",
        metadata: { error: auth.error || "Unauthorized" },
      });
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: auth.status });
    }
    const user = auth.user;
    authenticatedUserId = user.id;
    console.log("[GEN] auth:success duration=" + (Date.now() - authStart) + "ms userId=" + user.id);

    // Check user subscription status
    const subData = await dbGetUserSubscription(user.id);

    const isPaidPro = subData?.status === "active_paid" && subData?.plan_id === "paid_pro";
    const isAdmin = isUserAdmin(user);

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

    const skillsStart = Date.now();
    console.log("[GEN] skillsAgent:start");
    const recentFingerprints = await getRecentDesignFingerprints(websiteData.category, 3);
    const skillsAgentResult = await runSkillsAgent(
      {
        category: websiteData.category,
        businessName: websiteData.businessName,
        description: websiteData.description,
        targetAudience: websiteData.targetAudience,
        stylePreferences: websiteData.style ? [websiteData.style] : undefined,
        primaryColor: websiteData.primaryColor,
        recentProjects: recentFingerprints,
        threeDPreference: websiteData.threeDPreference,
      },
      {
        userId: user.id,
        sessionId: (rawBody as any)?.sessionId,
      }
    );
    console.log(
      `[GEN] skillsAgent:complete duration=${Date.now() - skillsStart}ms source=${skillsAgentResult.source} skills=${skillsAgentResult.data?.selectedSkills.map((s) => s.skillId).join(",") || ""}`
    );

    const skillsData =
      skillsAgentResult.success && skillsAgentResult.data
        ? skillsAgentResult.data
        : buildDeterministicSkillsFallback({
            category: websiteData.category,
            businessName: websiteData.businessName,
            description: websiteData.description,
            targetAudience: websiteData.targetAudience,
            stylePreferences: websiteData.style ? [websiteData.style] : undefined,
            primaryColor: websiteData.primaryColor,
            recentProjects: recentFingerprints,
            threeDPreference: websiteData.threeDPreference,
          });

    const activeSkillIds = skillsData.selectedSkills.map((s) => s.skillId as SkillId);
    const avoidPatterns = skillsData.variationStrategy?.avoidPatterns || [];
    const designDirection = `Layout: ${skillsData.designDirection.layoutStrategy}; Hero: ${skillsData.designDirection.heroStrategy}; Style: ${skillsData.designDirection.visualStyle}; Typography: ${skillsData.designDirection.typographyDirection}; Section: ${skillsData.designDirection.sectionStrategy}`;

    const projectId = typeof rawWebsiteData.projectId === "string" ? rawWebsiteData.projectId : undefined;

    const aiContext = await buildAIContext({
      projectId,
      userId: user.id,
      userPrompt: websiteData.description,
      websiteType: websiteData.category,
      taskType: "generation",
    });

    emitAgentEvent({
      event: "agent.thinking",
      agent: "generator",
      requestId,
      projectId,
      userId: user.id,
      metadata: {
        operation: "Synthesizing design context & knowledge",
        ...aiContext.telemetryMetadata,
      },
    });

    const prompt = buildWebsitePrompt(
      {
        ...websiteData,
        avoidPatterns,
        recentFingerprints,
        designDirection,
        selectedSkills: activeSkillIds,
        aiContext,
      },
      workspace ?? ({} as AiWorkspace)
    );

    const activeSkillsList = activeSkillIds.join(", ");

    let parsedResult: Record<string, unknown> | null = null;
    let generationModelUsed = OPENAI_GENERATION_MODEL;
    let isHostedExecution = false;

    // Primary: OpenAI Hosted Skills via Responses API with containerized shell tool
    if (isOpenAISkillsConfigured()) {
      try {
        const skillsStart = Date.now();
        console.log("[GEN] skills:start");
        const containerConfig = getHostedSkillContainerConfig(activeSkillIds);
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
        emitAgentEvent({
          event: "agent.provider_call",
          agent: "generator",
          requestId,
          userId: authenticatedUserId,
          provider: "openai",
          model: OPENAI_GENERATION_MODEL,
        });
        const response = await openai.responses.create({
          model: OPENAI_GENERATION_MODEL,
          instructions,
          input: prompt,
          tools: [containerConfig],
        });
        const latencyMs = Date.now() - openaiStart;
        console.log("[GEN] openai:success duration=" + latencyMs + "ms");
        console.log("[GEN] skills:success duration=" + (Date.now() - skillsStart) + "ms");
        emitAgentEvent({
          event: "agent.provider_success",
          agent: "generator",
          requestId,
          userId: authenticatedUserId,
          provider: "openai",
          model: OPENAI_GENERATION_MODEL,
          latencyMs,
          status: "success",
        });

        const rawText = extractTextFromResponse(response);
        parsedResult = parseWebsiteJson(rawText);
        console.log("[GEN] json:parsed length=" + rawText.length);
        isHostedExecution = true;
      } catch (hostedErr) {
        emitAgentEvent({
          event: "agent.provider_error",
          agent: "generator",
          requestId,
          userId: authenticatedUserId,
          provider: "openai",
          model: OPENAI_GENERATION_MODEL,
          status: "fallback",
          metadata: { error: sanitizeErrorOutput(hostedErr), fallback: true },
        });
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
      emitAgentEvent({
        event: "agent.fallback",
        agent: "generator",
        requestId,
        userId: authenticatedUserId,
        provider: "openai",
        model: generationModelUsed,
        metadata: { fromProvider: "openai-responses", toProvider: "openai-chat", fallbackCount: 1 },
      });
      emitAgentEvent({
        event: "agent.provider_call",
        agent: "generator",
        requestId,
        userId: authenticatedUserId,
        provider: "openai",
        model: generationModelUsed,
      });
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
        const fallbackLatency = Date.now() - fallbackStart;
        parsedResult = parseWebsiteJson(chatResponse.choices[0]?.message?.content ?? "{}");
        console.log("[GEN] openai:success duration=" + fallbackLatency + "ms");
        emitAgentEvent({
          event: "agent.provider_success",
          agent: "generator",
          requestId,
          userId: authenticatedUserId,
          provider: "openai",
          model: generationModelUsed,
          latencyMs: fallbackLatency,
          status: "success",
        });
      } catch (chatErr) {
        const fallbackModel = MODEL_CONFIG.defaults.generationFallbackModel;
        const safeErrorMsg = sanitizeErrorOutput(chatErr instanceof Error ? chatErr.message : String(chatErr));
        console.warn(`[GEN] ${generationModelUsed} failed, falling back to ${fallbackModel}:`, safeErrorMsg);
        emitAgentEvent({
          event: "agent.provider_error",
          agent: "generator",
          requestId,
          userId: authenticatedUserId,
          provider: "openai",
          model: generationModelUsed,
          status: "fallback",
          metadata: { error: safeErrorMsg, fallback: true },
        });
        emitAgentEvent({
          event: "agent.fallback",
          agent: "generator",
          requestId,
          userId: authenticatedUserId,
          provider: "openai",
          model: fallbackModel,
          metadata: { fromProvider: generationModelUsed, toProvider: fallbackModel, fallbackCount: 2, reason: safeErrorMsg },
        });
        generationModelUsed = fallbackModel;
        const secondFallbackStart = Date.now();
        emitAgentEvent({
          event: "agent.provider_call",
          agent: "generator",
          requestId,
          userId: authenticatedUserId,
          provider: "openai",
          model: fallbackModel,
        });
        const fallbackResponse = await openai.chat.completions.create({
          model: fallbackModel,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are WebsiteBanja AI. Return valid JSON only." },
            { role: "user", content: prompt },
          ],
        });
        const secondLatency = Date.now() - secondFallbackStart;
        parsedResult = parseWebsiteJson(fallbackResponse.choices[0]?.message?.content ?? "{}");
        emitAgentEvent({
          event: "agent.provider_success",
          agent: "generator",
          requestId,
          userId: authenticatedUserId,
          provider: "openai",
          model: fallbackModel,
          latencyMs: secondLatency,
          status: "success",
        });
      }
    }

    // Post-generation multi-skill design validation and sanitization
    const validationStart = Date.now();
    const designValidation = validateGeneratedWebsiteDesign(parsedResult, websiteData);
    const uiUxValidation = validateGeneratedWebsiteUiUx(designValidation.sanitized, websiteData);
    let result = uiUxValidation.sanitized;
    const uiUxWarnings = uiUxValidation.warnings;
    console.log("[GEN] validation:success duration=" + (Date.now() - validationStart) + "ms warnings=" + uiUxWarnings.length);

    // Phase 6: Deterministic Quality & Anti-Generic Validation
    const qualityReport = validateWebsiteQuality(
      result as Record<string, unknown>,
      websiteData.businessName,
      (result as any).designBrief
    );
    console.log("[GEN] " + formatQualityReport(qualityReport));
    if (qualityReport.sanitizedData) {
      result = qualityReport.sanitizedData;
    }

    if (uiUxWarnings.length > 0) {
      console.debug("[Design Intelligence Validation]", uiUxWarnings);
    }

    // Phase 3: Post-Generation Uniqueness & Verification Agent
    let uniquenessVerification: UniquenessAgentOutput | undefined;
    let regenerationCount = 0;

    try {
      let currentResult = result;
      let uniquenessCheck = await runUniquenessAgent(
        {
          newWebsite: currentResult as Record<string, unknown>,
          businessName: websiteData.businessName,
          category: websiteData.category,
          description: websiteData.description,
          explicitConstraints: (websiteData as any).prompt ? [(websiteData as any).prompt] : [],
          regenerationAttempt: regenerationCount,
          threeDPreference: websiteData.threeDPreference,
        },
        {
          userId: user.id,
        }
      );

      // Targeted Redesign & Regeneration Loop (Bounded: max 2 attempts, zero infinite loop)
      while (
        uniquenessCheck.data.status === "REGENERATE" &&
        regenerationCount < MAX_UNIQUENESS_REGENERATIONS
      ) {
        regenerationCount++;
        console.log(
          `[GEN] uniqueness:regenerate attempt=${regenerationCount} score=${uniquenessCheck.data.similarityScore} candidate=${uniquenessCheck.data.closestCandidateName || "unknown"}`
        );

        const redesignDirectivesPrompt = `
================================================================================
CRITICAL UNIQUENESS & ANTI-COLLISION REDESIGN DIRECTIVES:
================================================================================
The previous draft was flagged as overly similar to another website (${uniquenessCheck.data.closestCandidateName || "in this industry"}).
You MUST regenerate the website JSON with distinctive design differentiation:
${uniquenessCheck.data.redesignDirectives.map((d) => `- ${d}`).join("\n")}

Patterns to strictly avoid:
${uniquenessCheck.data.issues.map((i) => `- ${i}`).join("\n")}

Ensure a fresh visual rhythm, altered hero layout, different section sequencing, and distinctive card treatments while fulfilling all user business requirements.
`;

        const redesignPrompt = `${prompt}\n${redesignDirectivesPrompt}`;

        let regenParsed: Record<string, unknown> | null = null;
        try {
          const regenChatResponse = await openai.chat.completions.create({
            model: generationModelUsed,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are WebsiteBanja AI. You are redesigning this website to make it distinctly unique, avoiding all reported pattern collisions. Return valid JSON only.`,
              },
              { role: "user", content: redesignPrompt },
            ],
          });
          regenParsed = parseWebsiteJson(regenChatResponse.choices[0]?.message?.content ?? "{}");
        } catch (regenErr) {
          console.warn("[GEN] Uniqueness regeneration attempt failed; breaking loop:", regenErr);
          break;
        }

        if (regenParsed && Object.keys(regenParsed).length > 0) {
          const regenDesignVal = validateGeneratedWebsiteDesign(regenParsed, websiteData);
          const regenUiUxVal = validateGeneratedWebsiteUiUx(regenDesignVal.sanitized, websiteData);
          currentResult = regenUiUxVal.sanitized;
          result = currentResult;

          // Re-verify the redesigned website
          uniquenessCheck = await runUniquenessAgent(
            {
              newWebsite: currentResult as Record<string, unknown>,
              businessName: websiteData.businessName,
              category: websiteData.category,
              description: websiteData.description,
              explicitConstraints: (websiteData as any).prompt ? [(websiteData as any).prompt] : [],
              regenerationAttempt: regenerationCount,
              threeDPreference: websiteData.threeDPreference,
            },
            {
              userId: user.id,
            }
          );
        } else {
          break;
        }
      }

      uniquenessVerification = uniquenessCheck.data;
      console.log(
        `[GEN] uniqueness:complete status=${uniquenessCheck.data.status} score=${uniquenessCheck.data.similarityScore} regenerations=${regenerationCount}`
      );
    } catch (uniquenessErr) {
      console.warn("[GEN] Uniqueness verification error; proceeding safely:", uniquenessErr);
    }

    await trackAnalyticsEvent({
      eventType: "ai_success",
      userId: user.id,
      metadata: {
        category: websiteData.category,
        model: generationModelUsed,
        isHosted: isHostedExecution,
        uniquenessScore: uniquenessVerification?.similarityScore,
        uniquenessStatus: uniquenessVerification?.status,
        regenerationCount,
      },
    });

    emitAgentEvent({
      event: "agent.completed",
      agent: "generator",
      requestId,
      projectId,
      userId: user.id,
      provider: "openai",
      model: generationModelUsed,
      latencyMs: Date.now() - genStart,
      status: "success",
      metadata: {
        ...aiContext.telemetryMetadata,
      },
    });

    console.log("[GEN] total=" + (Date.now() - genStart) + "ms");
    return NextResponse.json({
      success: true,
      data: result,
      uniqueness: uniquenessVerification,
    });
  } catch (err) {
    emitAgentEvent({
      event: "agent.failed",
      agent: "generator",
      requestId,
      userId: authenticatedUserId,
      status: "error",
      latencyMs: Date.now() - genStart,
      metadata: { error: sanitizeErrorOutput(err) },
    });
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
