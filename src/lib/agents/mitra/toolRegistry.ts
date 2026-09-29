// src/lib/agents/mitra/toolRegistry.ts
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { dbCheckProjectExists, dbGetProject, dbUpdateProject } from "@/lib/db/queries";
import { getProjectKnowledge, setProjectKnowledge, getProjectContext } from "@/lib/knowledge";
import { createWebsitePlan, createDesignPlan, selectComponents } from "@/lib/ai/planner";
import { generateComponents } from "@/lib/ai/generation/generator";
import { buildAIContext } from "@/lib/ai/contextBuilder";
import { executeStudioActions, type StudioAiAction } from "@/lib/studioAiActions";
import type { WebsiteRequirement } from "@/lib/ai/requirementModel";
import type { WebsiteData } from "@/types/website";

export interface ToolContext {
  userId: string;
  projectId?: string;
  sessionId: string;
  userRole?: string;
  confirmed?: boolean;
  idempotencyKey?: string;
  abortSignal?: AbortSignal;
}

export type ToolErrorCode =
  | "AUTH_REQUIRED"
  | "PROJECT_ACCESS_DENIED"
  | "INVALID_TOOL_ARGUMENTS"
  | "TOOL_NOT_FOUND"
  | "CONFIRMATION_REQUIRED"
  | "PROJECT_NOT_FOUND"
  | "KNOWLEDGE_UPDATE_FAILED"
  | "PLAN_FAILED"
  | "GENERATION_FAILED"
  | "EDIT_FAILED"
  | "TOOL_TIMEOUT"
  | "TOOL_CANCELLED"
  | "INTERNAL_TOOL_ERROR";

export interface ToolErrorDetail {
  code: ToolErrorCode;
  message: string;
  details?: unknown;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  tool?: string;
  data?: T;
  message?: string;
  error?: string;
  errorDetail?: ToolErrorDetail;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
}

export interface ToolPermissionPolicy {
  requiresAuth: boolean;
  requiresProjectOwnership: boolean;
  requiresConfirmation: boolean;
  destructive: boolean;
}

export interface MitraTool<TArgs = any, TResult = any> {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  policy?: ToolPermissionPolicy;
  requiresConfirmation?: boolean;
  validateArgs?: (args: unknown) => { valid: boolean; error?: string };
  execute: (args: TArgs, context: ToolContext) => Promise<ToolResult<TResult>>;
}

/**
 * In-memory idempotency cache for high-impact actions (e.g., generate_website).
 * Tracks key -> { timestamp, result } with 10-minute TTL.
 */
interface IdempotencyRecord {
  timestamp: number;
  result: ToolResult;
}
const idempotencyCache = new Map<string, IdempotencyRecord>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

export function clearIdempotencyCacheForTesting(): void {
  idempotencyCache.clear();
}

class MitraToolRegistry {
  private tools: Map<string, MitraTool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  public registerTool(tool: MitraTool): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): MitraTool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): MitraTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Returns function declarations formatted for Gemini Live / GenAI tool calling.
   */
  public getFunctionDeclarations(): Array<{
    name: string;
    description: string;
    parameters: unknown;
  }> {
    return this.getAllTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Executes a registered tool safely with argument validation, authentication,
   * tenant authorization, confirmation checks, idempotency, and telemetry emissions.
   */
  public async executeTool(
    name: string,
    rawArgs: unknown,
    context: ToolContext
  ): Promise<ToolResult> {
    const tStart = performance.now();
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        success: false,
        tool: name,
        error: `Tool '${sanitizeErrorOutput(name)}' is not registered.`,
        errorDetail: {
          code: "TOOL_NOT_FOUND",
          message: `Tool '${sanitizeErrorOutput(name)}' is not registered.`,
        },
      };
    }

    // 1. Authentication check
    if (!context.userId || typeof context.userId !== "string" || !context.userId.trim()) {
      return {
        success: false,
        tool: name,
        error: "Authentication required to invoke tools.",
        errorDetail: {
          code: "AUTH_REQUIRED",
          message: "Authentication required to invoke tools.",
        },
      };
    }

    // 2. Validate arguments
    const args = (rawArgs && typeof rawArgs === "object" ? rawArgs : {}) as Record<string, any>;
    if (tool.validateArgs) {
      const validation = tool.validateArgs(args);
      if (!validation.valid) {
        return {
          success: false,
          tool: name,
          error: `Argument validation failed for ${name}: ${validation.error || "Invalid parameters"}`,
          errorDetail: {
            code: "INVALID_TOOL_ARGUMENTS",
            message: validation.error || "Invalid parameters",
          },
        };
      }
    }

    // 3. Emit tool_call telemetry
    emitAgentEvent({
      event: "agent.tool_call",
      agent: "mitra",
      requestId: context.sessionId,
      userId: context.userId,
      projectId: context.projectId,
      metadata: {
        toolName: name,
        sessionId: context.sessionId,
        parameters: JSON.parse(sanitizeErrorOutput(JSON.stringify(args))),
      },
    });

    // 4. AbortSignal check before execution
    if (context.abortSignal?.aborted) {
      const latencyMs = Math.round(performance.now() - tStart);
      emitAgentEvent({
        event: "agent.tool_result",
        agent: "mitra",
        requestId: context.sessionId,
        userId: context.userId,
        projectId: context.projectId,
        latencyMs,
        status: "error",
        error: "Tool execution was cancelled.",
        metadata: { toolName: name, cancelled: true },
      });
      return {
        success: false,
        tool: name,
        error: "Tool execution was cancelled.",
        errorDetail: { code: "TOOL_CANCELLED", message: "Operation was aborted." },
      };
    }

    // 5. Execute with timeout and error handling
    const TOOL_TIMEOUT_MS = 10000;
    try {
      let abortListener: (() => void) | undefined;
      const abortPromise = new Promise<never>((_, reject) => {
        if (context.abortSignal) {
          abortListener = () => reject(new Error("TOOL_CANCELLED: Execution aborted by client signal"));
          context.abortSignal.addEventListener("abort", abortListener, { once: true });
        }
      });

      const execPromise = tool.execute(args, context);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`TOOL_TIMEOUT: Tool execution timed out after ${TOOL_TIMEOUT_MS}ms`)),
          TOOL_TIMEOUT_MS
        )
      );

      const result = await Promise.race([execPromise, timeoutPromise, abortPromise]).finally(() => {
        if (context.abortSignal && abortListener) {
          context.abortSignal.removeEventListener("abort", abortListener);
        }
      });

      const latencyMs = Math.round(performance.now() - tStart);

      // Emit tool_result telemetry
      emitAgentEvent({
        event: "agent.tool_result",
        agent: "mitra",
        requestId: context.sessionId,
        userId: context.userId,
        projectId: context.projectId,
        latencyMs,
        status: result.success ? "success" : "error",
        error: result.error ? sanitizeErrorOutput(result.error) : undefined,
        metadata: {
          toolName: name,
          sessionId: context.sessionId,
          requiresConfirmation: result.requiresConfirmation,
        },
      });

      if (!result.tool) {
        result.tool = name;
      }
      return result;
    } catch (err) {
      const latencyMs = Math.round(performance.now() - tStart);
      const rawMsg = err instanceof Error ? err.message : String(err);
      const isTimeout = rawMsg.includes("TOOL_TIMEOUT") || rawMsg.includes("timed out");
      const isCancelled = rawMsg.includes("TOOL_CANCELLED") || rawMsg.includes("aborted");

      const errorCode: ToolErrorCode = isTimeout
        ? "TOOL_TIMEOUT"
        : isCancelled
        ? "TOOL_CANCELLED"
        : "INTERNAL_TOOL_ERROR";

      const safeErrorMsg = sanitizeErrorOutput(rawMsg);

      emitAgentEvent({
        event: "agent.tool_result",
        agent: "mitra",
        requestId: context.sessionId,
        userId: context.userId,
        projectId: context.projectId,
        latencyMs,
        status: "error",
        error: safeErrorMsg,
        metadata: {
          toolName: name,
          sessionId: context.sessionId,
          timeout: isTimeout,
          cancelled: isCancelled,
        },
      });

      return {
        success: false,
        tool: name,
        error: `Execution error in ${name}: ${safeErrorMsg}`,
        errorDetail: {
          code: errorCode,
          message: safeErrorMsg,
        },
      };
    }
  }

  private registerDefaultTools(): void {
    // ──────────────────────────────────────────────────────────────────────────
    // Tool 1: get_project_knowledge
    // ──────────────────────────────────────────────────────────────────────────
    this.registerTool({
      name: "get_project_knowledge",
      description: "Retrieves verified project knowledge and facts stored for this project.",
      policy: {
        requiresAuth: true,
        requiresProjectOwnership: true,
        requiresConfirmation: false,
        destructive: false,
      },
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Optional category filter like 'business_info' or 'brand'" },
          limit: { type: "number", description: "Maximum number of facts to return (default 15)" },
        },
      },
      execute: async (args, context) => {
        const targetProjectId = context.projectId;
        if (!targetProjectId) {
          return {
            success: false,
            tool: "get_project_knowledge",
            error: "No active project associated with this session.",
            errorDetail: { code: "PROJECT_NOT_FOUND", message: "No active project associated with this session." },
          };
        }

        const isOwner = await dbCheckProjectExists(targetProjectId, context.userId);
        if (!isOwner) {
          return {
            success: false,
            tool: "get_project_knowledge",
            error: `Unauthorized: User cannot access project ${targetProjectId}`,
            errorDetail: { code: "PROJECT_ACCESS_DENIED", message: `User cannot access project ${targetProjectId}` },
          };
        }

        try {
          const knowledge = await getProjectKnowledge(targetProjectId, args.category, context.userId);
          const limit = typeof args.limit === "number" && args.limit > 0 ? Math.min(args.limit, 50) : 15;
          const items = Array.isArray(knowledge) ? knowledge.slice(0, limit) : knowledge;

          return {
            success: true,
            tool: "get_project_knowledge",
            data: items,
            message: `Retrieved knowledge for project ${targetProjectId}`,
          };
        } catch (err) {
          const safeMsg = sanitizeErrorOutput(String(err));
          return {
            success: false,
            tool: "get_project_knowledge",
            error: safeMsg,
            errorDetail: { code: "INTERNAL_TOOL_ERROR", message: safeMsg },
          };
        }
      },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Tool 2: update_project_knowledge
    // ──────────────────────────────────────────────────────────────────────────
    const ALLOWED_CATEGORIES = new Set([
      "business_info",
      "brand",
      "preferences",
      "services",
      "features",
      "extracted_needs",
      "planning",
      "agent_decisions",
    ]);

    this.registerTool({
      name: "update_project_knowledge",
      description: "Persists a verified piece of business information or preference into project knowledge.",
      policy: {
        requiresAuth: true,
        requiresProjectOwnership: true,
        requiresConfirmation: false,
        destructive: false,
      },
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "The identifier for the fact" },
          value: { type: "object", description: "The structured value or string data" },
          category: { type: "string", description: "Knowledge category" },
        },
        required: ["key", "value"],
      },
      validateArgs: (args: any) => {
        if (!args.key || typeof args.key !== "string" || !args.key.trim()) {
          return { valid: false, error: "Missing or invalid 'key' property." };
        }
        if (args.value === undefined) {
          return { valid: false, error: "Missing 'value' property." };
        }
        if (args.category && typeof args.category === "string" && !ALLOWED_CATEGORIES.has(args.category)) {
          return {
            valid: false,
            error: `Invalid category '${args.category}'. Allowed categories: ${Array.from(ALLOWED_CATEGORIES).join(", ")}`,
          };
        }
        return { valid: true };
      },
      execute: async (args, context) => {
        const targetProjectId = context.projectId;
        if (!targetProjectId) {
          return {
            success: false,
            tool: "update_project_knowledge",
            error: "No active project associated with this session.",
            errorDetail: { code: "PROJECT_NOT_FOUND", message: "No active project associated with this session." },
          };
        }

        const isOwner = await dbCheckProjectExists(targetProjectId, context.userId);
        if (!isOwner) {
          return {
            success: false,
            tool: "update_project_knowledge",
            error: `Unauthorized: User cannot modify project ${targetProjectId}`,
            errorDetail: { code: "PROJECT_ACCESS_DENIED", message: `User cannot modify project ${targetProjectId}` },
          };
        }

        const category = args.category || "business_info";
        try {
          await setProjectKnowledge(targetProjectId, args.key.trim(), args.value, context.userId, category);
          return {
            success: true,
            tool: "update_project_knowledge",
            data: { updated: true, key: args.key, category },
            message: `Knowledge '${args.key}' saved successfully in ${category}.`,
          };
        } catch (err) {
          const safeMsg = sanitizeErrorOutput(String(err));
          return {
            success: false,
            tool: "update_project_knowledge",
            error: safeMsg,
            errorDetail: { code: "KNOWLEDGE_UPDATE_FAILED", message: safeMsg },
          };
        }
      },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Tool 3: get_project_state
    // ──────────────────────────────────────────────────────────────────────────
    this.registerTool({
      name: "get_project_state",
      description: "Retrieves current website project state including layout, pages, and components.",
      policy: {
        requiresAuth: true,
        requiresProjectOwnership: true,
        requiresConfirmation: false,
        destructive: false,
      },
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Optional project ID if different from session" },
        },
      },
      execute: async (args, context) => {
        const targetProjectId = args.projectId || context.projectId;
        if (!targetProjectId) {
          return {
            success: false,
            tool: "get_project_state",
            error: "No project ID provided or linked to session.",
            errorDetail: { code: "PROJECT_NOT_FOUND", message: "No project ID provided or linked to session." },
          };
        }

        const isOwner = await dbCheckProjectExists(targetProjectId, context.userId);
        if (!isOwner) {
          return {
            success: false,
            tool: "get_project_state",
            error: `Unauthorized: User cannot access project ${targetProjectId}`,
            errorDetail: { code: "PROJECT_ACCESS_DENIED", message: `User cannot access project ${targetProjectId}` },
          };
        }

        try {
          const bundle = await getProjectContext(targetProjectId, context.userId);
          const rawProject = await dbGetProject(targetProjectId, context.userId);

          // Return clean, safe subset of project state
          // ProjectContextBundle has flat fields: businessName, category, description, pages, designPreferences
          const cleanState = {
            id: targetProjectId,
            name: rawProject?.name || bundle?.businessName || "Untitled Project",
            businessName: bundle?.businessName || rawProject?.business_name || "Untitled Project",
            category: bundle?.category || rawProject?.category || "general",
            description: bundle?.description || rawProject?.description || "",
            isPublished: Boolean(rawProject?.is_published),
            publicSlug: rawProject?.public_slug || null,
            sectionOrder: Array.isArray(rawProject?.section_order) ? rawProject.section_order : [],
            pageCount: Array.isArray(bundle?.pages) ? bundle.pages.length : 1,
            designPreferences: bundle?.designPreferences || {},
            hasJsonData: Boolean(rawProject?.json_data),
          };

          return {
            success: true,
            tool: "get_project_state",
            data: cleanState,
            message: `Retrieved state for project ${targetProjectId}`,
          };
        } catch (err) {
          const safeMsg = sanitizeErrorOutput(String(err));
          return {
            success: false,
            tool: "get_project_state",
            error: safeMsg,
            errorDetail: { code: "INTERNAL_TOOL_ERROR", message: safeMsg },
          };
        }
      },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Tool 4: create_or_update_plan
    // ──────────────────────────────────────────────────────────────────────────
    this.registerTool({
      name: "create_or_update_plan",
      description: "Creates or updates an intelligent website architectural plan and section structure.",
      policy: {
        requiresAuth: true,
        requiresProjectOwnership: false,
        requiresConfirmation: false,
        destructive: false,
      },
      parameters: {
        type: "object",
        properties: {
          businessName: { type: "string" },
          category: { type: "string" },
          description: { type: "string" },
          services: { type: "array", items: { type: "string" } },
          features: { type: "array", items: { type: "string" } },
          style: { type: "string" },
        },
        required: ["businessName", "category"],
      },
      validateArgs: (args: any) => {
        if (!args.businessName || typeof args.businessName !== "string" || !args.businessName.trim()) {
          return { valid: false, error: "'businessName' must be a non-empty string." };
        }
        if (!args.category || typeof args.category !== "string" || !args.category.trim()) {
          return { valid: false, error: "'category' must be a non-empty string." };
        }
        return { valid: true };
      },
      execute: async (args, context) => {
        try {
          const req: WebsiteRequirement = {
            intent: "create",
            business: {
              name: args.businessName.trim(),
              type: args.category.trim(),
              industry: args.category.trim(),
            },
            services: Array.isArray(args.services) ? args.services : [],
            brand: {
              style: args.style || "modern",
            },
          };

          // Leverage Phase 3 Context Builder
          const aiContext = await buildAIContext({
            taskType: "planning",
            userPrompt: `${args.businessName} ${args.category} ${args.description || ""}`,
            projectId: context.projectId,
            userId: context.userId,
            maxCharsBudget: 6000,
          });

          const plan = createWebsitePlan(req, aiContext);

          // If linked to a project owned by user, persist the architectural plan
          if (context.projectId) {
            try {
              const isOwner = await dbCheckProjectExists(context.projectId, context.userId);
              if (isOwner) {
                await setProjectKnowledge(
                  context.projectId,
                  "architecture_plan",
                  plan,
                  context.userId,
                  "planning"
                );
              }
            } catch {
              // Non-blocking persistence
            }
          }

          return {
            success: true,
            tool: "create_or_update_plan",
            data: plan,
            message: `Architectural plan created for "${args.businessName}".`,
          };
        } catch (err) {
          const safeMsg = sanitizeErrorOutput(String(err));
          return {
            success: false,
            tool: "create_or_update_plan",
            error: safeMsg,
            errorDetail: { code: "PLAN_FAILED", message: safeMsg },
          };
        }
      },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Tool 5: generate_website (Real execution + confirmation + idempotency)
    // ──────────────────────────────────────────────────────────────────────────
    this.registerTool({
      name: "generate_website",
      description: "Triggers real full generation of the website for the project.",
      requiresConfirmation: true,
      policy: {
        requiresAuth: true,
        requiresProjectOwnership: true,
        requiresConfirmation: true,
        destructive: true,
      },
      parameters: {
        type: "object",
        properties: {
          businessName: { type: "string" },
          category: { type: "string" },
          description: { type: "string" },
          services: { type: "array", items: { type: "string" } },
          style: { type: "string" },
          confirmed: { type: "boolean", description: "Explicit user confirmation to initiate generation" },
          idempotencyKey: { type: "string", description: "Unique key to prevent duplicate runs" },
        },
        required: ["businessName", "category"],
      },
      validateArgs: (args: any) => {
        if (!args.businessName || typeof args.businessName !== "string" || !args.businessName.trim()) {
          return { valid: false, error: "Missing or invalid 'businessName'." };
        }
        if (!args.category || typeof args.category !== "string" || !args.category.trim()) {
          return { valid: false, error: "Missing or invalid 'category'." };
        }
        return { valid: true };
      },
      execute: async (args, context) => {
        // Enforce Destructive Action Confirmation
        const isConfirmed = args.confirmed === true || context.confirmed === true;
        if (!isConfirmed) {
          return {
            success: false,
            tool: "generate_website",
            requiresConfirmation: true,
            confirmationPrompt: `I am ready to generate the website for "${args.businessName}". Would you like me to proceed with building the sections now?`,
            error: "Confirmation required to generate website.",
            errorDetail: {
              code: "CONFIRMATION_REQUIRED",
              message: "Confirmation required to generate website.",
            },
          };
        }

        const targetProjectId = context.projectId ?? null;

        // Ownership check only applies when a project is linked
        if (targetProjectId) {
          const isOwner = await dbCheckProjectExists(targetProjectId, context.userId);
          if (!isOwner) {
            return {
              success: false,
              tool: "generate_website",
              error: `Unauthorized: User cannot modify project ${targetProjectId}`,
              errorDetail: { code: "PROJECT_ACCESS_DENIED", message: `User cannot modify project ${targetProjectId}` },
            };
          }
        }

        // Idempotency check
        const idempKey = args.idempotencyKey || context.idempotencyKey;
        if (idempKey) {
          const cacheKey = `${context.userId}:${targetProjectId}:${idempKey}`;
          const cached = idempotencyCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < IDEMPOTENCY_TTL_MS) {
            return cached.result;
          }
        }

        try {
          const bName = args.businessName.trim();
          const bCat = args.category.trim();

          const req: WebsiteRequirement = {
            intent: "create",
            business: {
              name: bName,
              type: bCat,
              industry: bCat,
              // NOTE: 'description' is not on the business sub-type; store in content instead
            },
            services: Array.isArray(args.services) ? args.services : [],
            brand: {
              style: args.style || "modern",
            },
          };

          // 1. Build context & generate architecture plan
          const aiContext = await buildAIContext({
            taskType: "generation",
            userPrompt: `${bName} ${bCat} ${args.description || ""}`,
            projectId: targetProjectId ?? undefined, // buildAIContext expects string | undefined
            userId: context.userId,
            maxCharsBudget: 6000,
          });

          const websitePlan = createWebsitePlan(req, aiContext);
          const designPlan = createDesignPlan(websitePlan, req); // createDesignPlan(plan, req)
          const componentPlan = selectComponents(designPlan, req);

          // 2. Generate component code / structure in-memory (no disk write for agent runtime safety)
          const genResult = generateComponents(req, componentPlan, websitePlan, designPlan, {
            writeToDisk: false,
          });

          // 3. Construct canonical WebsiteData payload for project
          const serviceList = (req.services ?? []).length > 0
            ? (req.services ?? [])
            : ["Core Offering", "Premium Service"];
          const generatedWebsiteData: WebsiteData = {
            businessName: bName,
            brand: {
              name: bName,
              industry: bCat,
              description: args.description || `${bName} - ${bCat}`,
            },
            hero: {
              title: `Welcome to ${bName}`,
              subtitle: args.description || `Excellence in ${bCat}`,
              button: "Get Started",   // Hero.button is the correct field name
            },
            about: {
              title: `About ${bName}`,
              content: `${bName} is dedicated to delivering industry-leading ${bCat} solutions.`,
            },
            services: serviceList.map((s) => ({
              title: s,
              description: `Professional ${s.toLowerCase()} tailored to your needs.`,
            })),
            features: [
              { title: "Quality Guarantee", description: "Top-tier standards on every delivery." },
              { title: "24/7 Dedicated Support", description: "We are always here when you need us." },
              { title: "Fast Turnaround", description: "Prompt and reliable service delivery." },
            ],
            faq: [
              { question: `What services does ${bName} offer?`, answer: `We specialize in ${bCat} solutions.` },
              { question: "How can I get in touch?", answer: "Reach out via our contact form or phone." },
            ],
            contact: {
              phone: "+91 98765 43210",
              email: `contact@${bName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
              address: "Mumbai, Maharashtra, India",
            },
            footer: {
              copyright: `© ${new Date().getFullYear()} ${bName}. All rights reserved.`,
            },
            sectionOrder: componentPlan.components,
            pages: [
              {
                id: "page_home",
                slug: "",
                title: "Home",
                isHome: true,
                sectionOrder: componentPlan.components,
              },
            ],
          };

          // 4. Persist real website state to project record (only when a project is linked)
          if (targetProjectId) {
            await dbUpdateProject(targetProjectId, context.userId, {
              business_name: bName,
              category: bCat,
              description: args.description || "",
              json_data: generatedWebsiteData,
            });

            // 5. Store generation decision in project knowledge
            try {
              await setProjectKnowledge(
                targetProjectId,
                "last_generation",
                {
                  timestamp: new Date().toISOString(),
                  components: componentPlan.components,
                  tokensApplied: genResult.tokensApplied,
                },
                context.userId,
                "agent_decisions"
              );
            } catch {
              // Non-blocking knowledge save
            }
          }

          const responseResult: ToolResult = {
            success: true,
            tool: "generate_website",
            data: {
              action: "launch_generator",
              businessName: bName,
              category: bCat,
              status: targetProjectId ? "completed" : "preview",
              componentsGenerated: componentPlan.components,
              tokensApplied: genResult.tokensApplied,
              website: generatedWebsiteData,
            },
            message: targetProjectId
              ? `Website successfully generated and saved for "${bName}".`
              : `Website preview generated for "${bName}" (no project linked — not saved).`,
          };

          // Cache idempotency record
          if (idempKey) {
            const cacheKey = `${context.userId}:${targetProjectId ?? "preview"}:${idempKey}`;
            idempotencyCache.set(cacheKey, { timestamp: Date.now(), result: responseResult });
          }

          return responseResult;
        } catch (err) {
          const safeMsg = sanitizeErrorOutput(String(err));
          return {
            success: false,
            tool: "generate_website",
            error: safeMsg,
            errorDetail: { code: "GENERATION_FAILED", message: safeMsg },
          };
        }
      },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Tool 6: edit_website (Real StudioAiAction execution + confirmation)
    // ──────────────────────────────────────────────────────────────────────────
    this.registerTool({
      name: "edit_website",
      description: "Applies real edits or modifications to an existing website section or style.",
      requiresConfirmation: true,
      policy: {
        requiresAuth: true,
        requiresProjectOwnership: true,
        requiresConfirmation: true,
        destructive: true,
      },
      parameters: {
        type: "object",
        properties: {
          sectionId: { type: "string" },
          action: { type: "string", enum: ["update", "delete", "replace", "add", "reorder"] },
          changes: { type: "object", description: "Fields or properties to update" },
          actions: { type: "array", description: "Array of StudioAiAction modifications" },
          confirmed: { type: "boolean" },
        },
        required: ["sectionId", "action"],
      },
      validateArgs: (args: any) => {
        if (!args.sectionId || typeof args.sectionId !== "string" || !args.sectionId.trim()) {
          return { valid: false, error: "Missing or invalid sectionId." };
        }
        const validActions = ["update", "delete", "replace", "add", "reorder"];
        if (!validActions.includes(args.action)) {
          return { valid: false, error: `Action must be one of: ${validActions.join(", ")}.` };
        }
        return { valid: true };
      },
      execute: async (args, context) => {
        const isDestructive = args.action === "delete" || args.action === "replace";
        const isConfirmed = args.confirmed === true || context.confirmed === true;

        if (isDestructive && !isConfirmed) {
          return {
            success: false,
            tool: "edit_website",
            requiresConfirmation: true,
            confirmationPrompt: `Are you sure you want to ${args.action} section "${args.sectionId}"? This will modify the current design.`,
            error: "Confirmation required for destructive edit.",
            errorDetail: {
              code: "CONFIRMATION_REQUIRED",
              message: `Confirmation required to ${args.action} section "${args.sectionId}".`,
            },
          };
        }

        const targetProjectId = context.projectId;
        if (!targetProjectId) {
          return {
            success: false,
            tool: "edit_website",
            error: "No active project linked to this session.",
            errorDetail: { code: "PROJECT_NOT_FOUND", message: "No active project linked to this session." },
          };
        }

        const isOwner = await dbCheckProjectExists(targetProjectId, context.userId);
        if (!isOwner) {
          return {
            success: false,
            tool: "edit_website",
            error: `Unauthorized: User cannot modify project ${targetProjectId}`,
            errorDetail: { code: "PROJECT_ACCESS_DENIED", message: `User cannot modify project ${targetProjectId}` },
          };
        }

        try {
          // 1. Fetch current project website JSON
          const rawProject = await dbGetProject(targetProjectId, context.userId);
          if (!rawProject) {
            return {
              success: false,
              tool: "edit_website",
              error: `Project ${targetProjectId} not found.`,
              errorDetail: { code: "PROJECT_NOT_FOUND", message: `Project ${targetProjectId} not found.` },
            };
          }

          const currentWebsite = (rawProject.json_data as WebsiteData) || {
            hero: { title: "Welcome", subtitle: "Website", button: "Get Started" },
            about: { title: "About", content: "About us" },
            services: [],
            features: [],
            faq: [],
            contact: { phone: "", email: "", address: "" },
            footer: { copyright: "" },
            sectionOrder: ["hero", "about", "services", "contact"],
          };

          // 2. Prepare StudioAiActions from request
          const studioActions: StudioAiAction[] = [];
          if (Array.isArray(args.actions) && args.actions.length > 0) {
            studioActions.push(...args.actions);
          } else {
            if (args.action === "delete") {
              studioActions.push({
                action: "delete_section",
                payload: { sectionId: args.sectionId },
                summary: `Deleted section ${args.sectionId}`,
              });
            } else if (args.action === "update" && args.changes) {
              for (const [key, val] of Object.entries(args.changes)) {
                studioActions.push({
                  action: "update_text",
                  payload: { path: `${args.sectionId}.${key}`, text: String(val) },
                  summary: `Updated ${args.sectionId}.${key}`,
                });
              }
            } else if (args.action === "replace") {
              studioActions.push({
                action: "delete_section",
                payload: { sectionId: args.sectionId },
                summary: `Removed old ${args.sectionId}`,
              });
              studioActions.push({
                action: "add_section",
                payload: { sectionType: args.sectionId, ...args.changes },
                summary: `Replaced section ${args.sectionId}`,
              });
            }
          }

          // 3. Execute Studio Actions safely
          const { updatedWebsite, appliedSummaries } = executeStudioActions(currentWebsite, studioActions);

          // 4. Persist updated website state back to database
          await dbUpdateProject(targetProjectId, context.userId, {
            json_data: updatedWebsite,
          });

          return {
            success: true,
            tool: "edit_website",
            data: {
              sectionId: args.sectionId,
              action: args.action,
              applied: true,
              appliedSummaries,
              sectionOrder: updatedWebsite.sectionOrder,
            },
            message: `Successfully executed edit action '${args.action}' on section '${args.sectionId}'.`,
          };
        } catch (err) {
          const safeMsg = sanitizeErrorOutput(String(err));
          return {
            success: false,
            tool: "edit_website",
            error: safeMsg,
            errorDetail: { code: "EDIT_FAILED", message: safeMsg },
          };
        }
      },
    });
  }
}

export const mitraToolRegistry = new MitraToolRegistry();

