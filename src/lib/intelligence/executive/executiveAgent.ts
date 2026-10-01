// src/lib/intelligence/executive/executiveAgent.ts
import { ModelRouter } from "@/lib/ai/router/modelRouter";
import type { RoutingPolicy } from "@/lib/ai/router/types";
import {
  type ExecutiveContext,
  type ExecutiveDecision,
  ExecutiveDecisionSchema,
} from "./executiveTypes";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export class ExecutiveAgent {
  private router: ModelRouter;

  constructor(customRouter?: ModelRouter) {
    this.router = customRouter || new ModelRouter();
  }

  /**
   * Generates a deterministic fallback decision if LLM router encounters errors or in tests.
   */
  public generateDeterministicDecision(context: ExecutiveContext): ExecutiveDecision {
    const domain = context.detectedDomain || "general";
    const objective = context.objective;

    // Craft intelligent plan & delegations tailored to the objective
    const delegations = [];
    const toolCalls = [];

    if (objective.toLowerCase().includes("lead") || objective.toLowerCase().includes("discover")) {
      toolCalls.push({
        tool: "lead_discovery",
        parameters: { query: domain, location: "Vadodara", limit: 5 },
        status: "pending" as const,
      });
      delegations.push({
        agent: "auditor",
        task: `Validate technical and qualification criteria for discovered ${domain} leads`,
        priority: context.priority,
        parameters: { category: domain },
      });
    } else if (objective.toLowerCase().includes("outreach") || objective.toLowerCase().includes("campaign")) {
      delegations.push({
        agent: "copywriter",
        task: `Draft high-converting value proposition for ${domain} outreach`,
        priority: context.priority,
        parameters: { domain },
      });
      toolCalls.push({
        tool: "outreach_draft",
        parameters: { businessName: "Target Lead", category: domain },
        status: "pending" as const,
      });
    } else {
      // Default website development / preview executive plan
      delegations.push(
        {
          agent: "skills",
          task: `Extract industry UI/UX skills and design patterns for ${domain}`,
          priority: context.priority,
          parameters: { category: domain },
        },
        {
          agent: "designer",
          task: `Architect mobile-first responsive layout and color scheme for ${domain}`,
          priority: context.priority,
          parameters: { category: domain },
        },
        {
          agent: "uniqueness",
          task: `Verify brand fingerprint and anti-generic visual diversity for ${domain}`,
          priority: context.priority,
          parameters: { category: domain },
        }
      );
      toolCalls.push({
        tool: "preview_generation",
        parameters: { businessName: "Client Project", category: domain },
        status: "pending" as const,
      });
    }

    return {
      objective: context.objective,
      priority: context.priority,
      plan: [
        `1. Analyze requirement and verify ${domain} domain context.`,
        `2. Delegate specialized tasks to sub-agents (Skills, Designer, Uniqueness).`,
        `3. Execute tailored tool operations with safety policy enforcement.`,
        `4. Run verification and contrast integrity audit.`,
        `5. Generate executive briefing and next actionable steps.`,
      ],
      delegations,
      tool_calls: toolCalls,
      constraints: context.constraints,
      risk: [
        "WhatsApp channel prohibited by policy.",
        "External email dispatch gated on human approval.",
      ],
      approval_required: !context.allowExternalWrite,
      next_action: "execute_plan",
      report: `Executive strategy formulated for '${objective}' within '${domain}' sector.`,
    };
  }

  /**
   * Plans and returns structured executive decision.
   */
  public async plan(
    context: ExecutiveContext,
    options?: { policy?: Partial<RoutingPolicy> }
  ): Promise<ExecutiveDecision> {
    const systemPrompt = `You are the Executive CEO Agent for WebsiteBanja.
WebsiteBanja is an AI-powered agency platform that discovers, audits, previews, and builds high-converting modern websites for local businesses.

Your responsibilities:
- OBSERVE & UNDERSTAND the business objective and sector domain.
- Formulate a sequenced, actionable PLAN.
- DELEGATE to registered sub-agents: boss, uniqueness, skills, mitra, designer, copywriter, auditor.
- INVOKE allowlisted tools: lead_discovery, website_audit, preview_generation, preview_validation, crm_lookup, outreach_draft, system_health_check.
- ENFORCE SAFETY: Never use WhatsApp. Never auto-send outreach without human approval.
- RETURN STRICT JSON matching this schema:
{
  "objective": string,
  "priority": "low" | "medium" | "high" | "critical",
  "plan": string[],
  "delegations": [{"agent": string, "task": string, "priority": string, "parameters": object}],
  "tool_calls": [{"tool": string, "parameters": object}],
  "constraints": string[],
  "risk": string[],
  "approval_required": boolean,
  "next_action": string,
  "report": string
}
OUTPUT ONLY RAW JSON. NO MARKDOWN CODEBLOCKS.`;

    const userPrompt = `OBJECTIVE: ${context.objective}
PRIORITY: ${context.priority}
DETECTED DOMAIN: ${context.detectedDomain || "general"}
CONSTRAINTS: ${JSON.stringify(context.constraints)}
AVAILABLE AGENTS: ${JSON.stringify(context.availableAgents)}
AVAILABLE TOOLS: ${JSON.stringify(context.availableTools)}
ALLOW EXTERNAL WRITE: ${context.allowExternalWrite}
REQUIRE HUMAN APPROVAL: ${context.requireHumanApproval}`;

    try {
      const response = await this.router.route<ExecutiveDecision>(
        {
          userPrompt,
          systemPrompt,
          temperature: 0.2,
          metadata: {
            agent: "executive",
            requestId: context.runId,
          },
        },
        options?.policy
      );

      if (response.success && response.data) {
        // Parse and validate with Zod
        let parsed = response.data;
        if (typeof parsed === "string") {
          const cleaned = (parsed as string)
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();
          parsed = JSON.parse(cleaned);
        }

        const validated = ExecutiveDecisionSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data as ExecutiveDecision;
        }
      }
    } catch {
      // Graceful fallback to deterministic logic below
    }

    return this.generateDeterministicDecision(context);
  }
}
