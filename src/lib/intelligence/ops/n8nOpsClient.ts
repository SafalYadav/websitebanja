// src/lib/intelligence/ops/n8nOpsClient.ts
import { randomUUID } from "crypto";
import type {
  CeoN8nTaskDispatch,
  N8nCeoTaskCallback,
  OpsToolName,
} from "./opsToolTypes";
import {
  CeoN8nTaskDispatchSchema,
  N8nCeoTaskCallbackSchema,
} from "./opsToolTypes";
import { opsToolExecutor } from "./opsToolExecutor";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

export class N8nOpsClient {
  private static instance: N8nOpsClient;

  private constructor() {}

  public static getInstance(): N8nOpsClient {
    if (!N8nOpsClient.instance) {
      N8nOpsClient.instance = new N8nOpsClient();
    }
    return N8nOpsClient.instance;
  }

  /**
   * Dispatches an approved operational task from WebsiteBanja CEO to the n8n Ops Agent.
   * If N8N_OPS_AGENT_WEBHOOK_URL is configured, dispatches via HTTP webhook.
   * Otherwise executes via the local deterministic operational decision router.
   */
  public async dispatchTask(
    dispatchInput: CeoN8nTaskDispatch
  ): Promise<N8nCeoTaskCallback> {
    const parseResult = CeoN8nTaskDispatchSchema.safeParse(dispatchInput);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(
        (i) => `Field '${i.path.join(".")}': ${i.message}`
      );
      throw new Error(`Invalid CeoN8nTaskDispatch contract: ${errors.join("; ")}`);
    }

    const dispatch = parseResult.data as CeoN8nTaskDispatch;
    const webhookUrl = process.env.N8N_OPS_AGENT_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    const secret =
      process.env.WEBSITEBANJA_AUTOMATION_SECRET ||
      process.env.AUTOMATION_SECRET ||
      "wb-auto-secret-local-dev-2026";

    emitAgentEvent({
      agent: "executive",
      event: "executive.delegating",
      requestId: dispatch.taskId,
      metadata: {
        taskId: dispatch.taskId,
        objective: dispatch.objective,
        allowedToolsCount: dispatch.allowedTools.length,
      },
    });

    const isProd = process.env.WEBSITEBANJA_RUNTIME_MODE === "production" || (process.env.NODE_ENV === "production" && !process.env.LOCAL_DEV_SIMULATION);
    const isLocalhost = Boolean(webhookUrl && /localhost|127\.0\.0\.1/i.test(webhookUrl));
    const allowRemote = Boolean(webhookUrl && !process.env.MOCK_N8N_OPS && !(isProd && isLocalhost));

    if (isProd && isLocalhost) {
      console.error("[N8nOpsClient] Security Violation: Production environment cannot connect to localhost n8n. Disallowing remote dispatch to localhost.");
    }

    if (allowRemote && webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-automation-secret": secret,
          },
          body: JSON.stringify(dispatch),
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          const rawCallback = await response.json();
          const parsed = N8nCeoTaskCallbackSchema.safeParse(rawCallback);
          if (parsed.success) {
            return parsed.data;
          }
        }
      } catch (err) {
        console.warn("[N8nOpsClient] Live n8n webhook failed, falling back to local operational executor:", err);
      }
    }

    // Local deterministic operational decision router (used in test/offline/simulated modes)
    return await this.executeLocalOpsAgentLoop(dispatch);
  }

  /**
   * Deterministic AI Ops Agent execution loop for operational workflow orchestration.
   * Evaluates operational routing rules:
   *   1. If lead discovery requested -> runs discover_leads
   *   2. If lead needs qualification -> runs qualify_lead
   *   3. If business research needed -> runs research_business
   *   4. If website needs analysis -> runs audit_website
   *   5. If qualified & website opportunity exists -> runs generate_preview
   *   6. Validates generated preview -> runs validate_preview
   *   7. Creates personalized outreach draft -> runs create_outreach (always approval-gated)
   *   8. Reports consolidated result back to CEO -> runs report_to_ceo
   */
  public async executeLocalOpsAgentLoop(
    dispatch: CeoN8nTaskDispatch
  ): Promise<N8nCeoTaskCallback> {
    const startTime = performance.now();
    const executedActions: N8nCeoTaskCallback["actions"] = [];
    const resultsMap: Record<string, unknown> = {};
    const failures: string[] = [];
    const evidence: N8nCeoTaskCallback["evidence"] = [];

    const lowerObj = dispatch.objective.toLowerCase();
    const hasWhatsappRequest =
      (lowerObj.includes("whatsapp") && !lowerObj.includes("no whatsapp") && !lowerObj.includes("without whatsapp")) ||
      dispatch.constraints.some((c) => {
        const clow = c.toLowerCase();
        return (
          clow.includes("must use whatsapp") ||
          clow.includes("send whatsapp") ||
          clow.includes("via whatsapp") ||
          clow.includes("channel: whatsapp") ||
          (clow.includes("whatsapp") && !clow.includes("no whatsapp") && !clow.includes("disabled"))
        );
      }) ||
      (dispatch.allowedTools as string[]).includes("whatsapp");

    if (hasWhatsappRequest) {
      return {
        taskId: dispatch.taskId,
        status: "blocked",
        summary: "Execution blocked: WhatsApp is strictly disabled across WebsiteBanja.",
        actions: [],
        results: {},
        failures: ["Security Policy Invariant: WhatsApp is strictly disabled across WebsiteBanja."],
        approvalRequired: false,
        evidence: [],
        timestamp: new Date().toISOString(),
      };
    }

    const allowed = new Set(dispatch.allowedTools);

    const callTool = async (tool: OpsToolName, input: Record<string, unknown>) => {
      if (!allowed.has(tool)) {
        throw new Error(`Ops Agent attempted to call unauthorized tool '${tool}'. Permitted tools: ${Array.from(allowed).join(", ")}`);
      }

      const reqId = `req_${tool}_${randomUUID().slice(0, 8)}`;
      const resp = await opsToolExecutor.executeTool({
        tool,
        input,
        requestId: reqId,
        taskId: dispatch.taskId,
        tenantId: dispatch.tenantId,
        projectId: dispatch.projectId,
        leadId: dispatch.leadId,
      });

      if (!resp.success) {
        executedActions.push({
          tool,
          status: "failed",
          details: resp.errors.join("; "),
          timestamp: new Date().toISOString(),
        });
        failures.push(`${tool}: ${resp.errors.join("; ")}`);
        return null;
      }

      executedActions.push({
        tool,
        status: "success",
        timestamp: new Date().toISOString(),
      });

      resultsMap[tool] = resp.result;
      return resp.result;
    };

    const objLower = dispatch.objective.toLowerCase();

    // 1. Discovery phase
    let activeLead: any = dispatch.input?.lead || null;
    let leadId: string | null = dispatch.leadId || activeLead?.leadId || null;

    if (allowed.has("discover_leads") && (!leadId || objLower.includes("discover"))) {
      const disc = await callTool("discover_leads", {
        query: dispatch.input?.query || dispatch.input?.category || "business",
        location: dispatch.input?.location || dispatch.input?.city || "Vadodara",
        limit: (dispatch.input?.limit as number) || 5,
      });

      if (disc && Array.isArray(disc.leads) && disc.leads.length > 0) {
        activeLead = disc.leads[0];
        leadId = activeLead.leadId;
        evidence.push({
          source: "google_places_discovery",
          description: `Discovered ${disc.totalDiscovered} leads in ${dispatch.input?.location || "Vadodara"}`,
          verified: true,
        });
      }
    }

    // 2. Qualification phase
    if (allowed.has("qualify_lead") && activeLead) {
      const qual = await callTool("qualify_lead", {
        leadId,
        lead: activeLead,
      });

      if (qual) {
        evidence.push({
          source: "qualification_engine",
          description: `Lead qualification status: ${qual.status} (score: ${qual.score})`,
          verified: true,
        });
      }
    }

    // 3. Research & Audit phase
    let auditReport: any = null;
    if (allowed.has("research_business") && activeLead) {
      await callTool("research_business", { leadId, lead: activeLead });
    }

    if (allowed.has("audit_website") && (activeLead || leadId)) {
      auditReport = await callTool("audit_website", { leadId, lead: activeLead });
      if (auditReport) {
        evidence.push({
          source: "website_audit_crawler",
          description: `Website audit completed with score: ${auditReport.auditScore}`,
          verified: true,
        });
      }
    }

    // 4. Preview Generation & Validation phase
    let previewData: any = null;
    if (allowed.has("generate_preview") && (activeLead || leadId)) {
      previewData = await callTool("generate_preview", {
        leadId,
        lead: activeLead,
        businessName: activeLead?.businessName || dispatch.input?.businessName || "Business",
        category: activeLead?.category || dispatch.input?.category || "business",
        city: activeLead?.city || dispatch.input?.city || "Vadodara",
        auditSummary: auditReport?.summary,
        previousAuditId: auditReport?.auditId,
      });

      if (previewData && allowed.has("validate_preview")) {
        const val = await callTool("validate_preview", {
          previewId: previewData.previewId,
          lead: activeLead,
        });

        if (val) {
          evidence.push({
            source: "preview_quality_validator",
            description: `Preview validation ${val.passed ? "passed" : "failed"} (score: ${val.score})`,
            verified: true,
          });
        }
      }
    }

    // 5. Outreach Draft phase (Always approval gated)
    let outreachData: any = null;
    if (allowed.has("create_outreach") && leadId) {
      outreachData = await callTool("create_outreach", {
        leadId,
        previewId: previewData?.previewId,
        templateStyle: dispatch.input?.templateStyle || "direct_value",
      });

      if (outreachData) {
        evidence.push({
          source: "outreach_personalization_engine",
          description: `Personalized outreach draft created (Requires Human Approval before send)`,
          verified: true,
        });
      }
    }

    // 6. Final CEO Callback Report
    let finalStatus: N8nCeoTaskCallback["status"] = "completed";
    if (failures.length > 0) {
      finalStatus = executedActions.some((a) => a.status === "success") ? "partial" : "failed";
    }

    const summary = `Ops Agent completed ${executedActions.length} operational actions (${failures.length} failures).`;

    if (allowed.has("report_to_ceo")) {
      await callTool("report_to_ceo", {
        taskId: dispatch.taskId,
        status: finalStatus,
        summary,
        completedActions: executedActions.filter((a) => a.status === "success"),
        failedActions: failures,
        requiresApproval: true, // Always true when outreach draft created
        nextAction: "human_outreach_approval",
        evidence,
      });
    }

    const callbackPayload: N8nCeoTaskCallback = {
      taskId: dispatch.taskId,
      status: finalStatus,
      summary,
      actions: executedActions,
      results: resultsMap,
      failures,
      approvalRequired: Boolean(dispatch.approvalRequired || outreachData),
      nextAction: outreachData ? "Awaiting human approval of outreach draft before Gmail dispatch." : undefined,
      evidence,
      report: `OPS AGENT EXECUTION REPORT\nTask: ${dispatch.objective}\nStatus: ${finalStatus.toUpperCase()}\nActions Completed: ${executedActions.length}\nHuman Approval Required: ${Boolean(dispatch.approvalRequired || outreachData)}`,
      timestamp: new Date().toISOString(),
    };

    return callbackPayload;
  }
}

export const n8nOpsClient = N8nOpsClient.getInstance();
