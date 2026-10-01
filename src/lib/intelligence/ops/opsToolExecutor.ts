// src/lib/intelligence/ops/opsToolExecutor.ts
import { randomUUID } from "crypto";
import type {
  OpsToolRequest,
  OpsToolResponse,
  OpsToolName,
} from "./opsToolTypes";
import { OpsToolRequestSchema } from "./opsToolTypes";
import { executeDiscoveryRun } from "@/lib/discovery/discoveryService";
import { qualifyBusinessLead } from "@/lib/discovery/qualificationEngine";
import { leadRepository } from "@/lib/discovery/leadRepository";
import { buildResearchSummary, auditQualifiedLead } from "@/lib/audit/auditService";
import { generatePersonalizedPreview } from "@/lib/personalization/previewGenerator";
import { validateWebsiteQuality } from "@/lib/ai/design/qualityValidator";
import { generateOutreachDraft } from "@/lib/outreach/personalizationEngine";
import { crmRepository } from "@/lib/crm/crmRepository";
import { analyzeInboundReply } from "@/lib/crm/replyIntelligence";
import { FollowUpQueue } from "@/lib/automation/followUpQueue";
import { MemoryStore } from "../memory/memoryStore";
import { redactSecretsInObject } from "../memory/memoryStore";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { groundedIntelligenceService } from "../grounding/groundedIntelligenceService";

export class OpsToolExecutor {
  private static instance: OpsToolExecutor;
  private idempotencyCache: Map<string, OpsToolResponse<any>> = new Map();

  private constructor() {}

  public static getInstance(): OpsToolExecutor {
    if (!OpsToolExecutor.instance) {
      OpsToolExecutor.instance = new OpsToolExecutor();
    }
    return OpsToolExecutor.instance;
  }

  /**
   * Dispatches and executes an Ops tool with schema validation, idempotency guards,
   * security barriers, and secret redaction.
   */
  public async executeTool(rawRequest: unknown): Promise<OpsToolResponse<any>> {
    const startTime = performance.now();

    // 1. Schema Validation
    const parseResult = OpsToolRequestSchema.safeParse(rawRequest);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(
        (i) => `Field '${i.path.join(".")}': ${i.message}`
      );
      return {
        success: false,
        tool: (rawRequest as any)?.tool || "report_to_ceo",
        requestId: (rawRequest as any)?.requestId || `req_err_${randomUUID().slice(0, 8)}`,
        taskId: (rawRequest as any)?.taskId || "unknown_task",
        result: null,
        errors: [`Invalid OpsToolRequest contract: ${errors.join("; ")}`],
        warnings: [],
        metadata: {
          durationMs: performance.now() - startTime,
          executedAt: new Date().toISOString(),
        },
      };
    }

    const request = parseResult.data as OpsToolRequest;

    // 2. Strict Security Invariant: WhatsApp remains unconditionally blocked
    const toolLower = String(request.tool).toLowerCase();
    if (toolLower.includes("whatsapp")) {
      return {
        success: false,
        tool: request.tool,
        requestId: request.requestId,
        taskId: request.taskId,
        result: null,
        errors: ["WhatsApp operations are strictly disabled across WebsiteBanja."],
        warnings: [],
        metadata: {
          durationMs: performance.now() - startTime,
          executedAt: new Date().toISOString(),
          tenantId: request.tenantId,
        },
      };
    }

    // 3. Idempotency Check
    const idempotencyKey =
      request.idempotencyKey ||
      `${request.tool}_${request.taskId}_${request.leadId || "global"}_${request.requestId}`;

    if (this.idempotencyCache.has(idempotencyKey)) {
      const cached = this.idempotencyCache.get(idempotencyKey)!;
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          cached: true,
          durationMs: performance.now() - startTime,
        },
      };
    }

    // 4. Scrub Incoming Inputs
    const sanitizedInput = redactSecretsInObject(request.input);

    emitAgentEvent({
      agent: "n8n_automation",
      event: "agent.tool_call",
      requestId: request.requestId,
      metadata: {
        tool: request.tool,
        taskId: request.taskId,
        tenantId: request.tenantId,
      },
    });

    try {
      let resultData: any = null;
      const warnings: string[] = [];

      switch (request.tool) {
        case "discover_leads": {
          const query = String(sanitizedInput.query || sanitizedInput.category || "business").trim();
          const location = String(sanitizedInput.location || sanitizedInput.city || "Vadodara").trim();
          const limit = typeof sanitizedInput.limit === "number" ? sanitizedInput.limit : 10;
          const radiusKm = typeof sanitizedInput.radiusKm === "number" ? sanitizedInput.radiusKm : undefined;
          const provider = typeof sanitizedInput.provider === "string" ? sanitizedInput.provider : undefined;

          const discResult = await executeDiscoveryRun(
            { query, location, limit, radiusKm, provider },
            request.userId || request.tenantId || undefined
          );

          if (!discResult.success) {
            throw new Error((discResult as any).error?.message || "Discovery run failed");
          }

          resultData = {
            runId: discResult.runId,
            criteria: { query, location, limit, radiusKm, provider },
            totalDiscovered: discResult.summary.discovered,
            qualifiedCount: discResult.summary.qualified,
            leads: discResult.leads,
          };
          break;
        }

        case "qualify_lead": {
          let lead = sanitizedInput.lead as any;
          if (!lead && sanitizedInput.leadId) {
            lead = await leadRepository.findLeadById(
              String(sanitizedInput.leadId),
              request.userId || request.tenantId || undefined
            );
          }

          if (!lead) {
            throw new Error(`Lead not found for qualification: ${sanitizedInput.leadId}`);
          }

          const qual = qualifyBusinessLead(lead);
          resultData = {
            leadId: lead.leadId,
            qualified: qual.status === "QUALIFIED",
            status: qual.status,
            score: qual.score,
            reasonCodes: qual.reasonCodes,
            lead: {
              ...lead,
              qualificationStatus: qual.status,
              qualificationScore: qual.score,
            },
          };
          break;
        }

        case "research_business": {
          let lead = sanitizedInput.lead as any;
          if (!lead && sanitizedInput.leadId) {
            lead = await leadRepository.findLeadById(
              String(sanitizedInput.leadId),
              request.userId || request.tenantId || undefined
            );
          }

          if (!lead) {
            throw new Error(`Lead not found for research: ${sanitizedInput.leadId}`);
          }

          const summary = buildResearchSummary(lead);

          // Phase 20 / Grounded Business Intelligence enrichment
          let groundedProfile = null;
          try {
            const researchResult = await groundedIntelligenceService.researchBusiness({
              businessName: lead.businessName || summary.businessName || "Unknown Business",
              website: lead.website || (lead as any).websiteUrl,
              location: lead.city ? `${lead.city}, ${lead.country || "IN"}` : summary.location,
              category: lead.category || summary.category || summary.industry,
              placeId: (lead as any).placeId,
              tenantId: request.tenantId || request.userId || "default",
            });
            groundedProfile = researchResult.profile;
          } catch (researchErr) {
            // Non-blocking fallback to preserve workflow execution
          }

          resultData = {
            leadId: lead.leadId,
            ...summary,
            groundedProfile,
          };
          break;
        }

        case "audit_website": {
          let lead = sanitizedInput.lead as any;
          if (!lead && sanitizedInput.leadId) {
            lead = await leadRepository.findLeadById(
              String(sanitizedInput.leadId),
              request.userId || request.tenantId || undefined
            );
          }

          const report = await auditQualifiedLead(
            { leadId: sanitizedInput.leadId ? String(sanitizedInput.leadId) : undefined, lead },
            request.userId || request.tenantId || undefined
          );

          resultData = {
            auditId: report.auditId,
            leadId: report.leadId,
            websiteUrl: report.website.url,
            websiteStatus: report.website.status,
            auditScore: report.opportunity.score,
            technicalFindings: report.technical.issues,
            conversionOpportunities: report.opportunity.reasons,
            summary: report.opportunity.reasons.join("; ") || "Website audit completed.",
            passed: report.opportunity.score < 60,
          };
          break;
        }

        case "generate_preview": {
          const previewResponse = await generatePersonalizedPreview({
            leadId: String(sanitizedInput.leadId || "lead_preview"),
            overrideLead: sanitizedInput.lead as any,
            userId: request.userId || request.tenantId || undefined,
          });

          resultData = {
            previewId: previewResponse.preview?.id,
            previewUrl: previewResponse.preview?.url,
            status: previewResponse.status,
            qualityScore: previewResponse.preview?.qualityScore || 0,
            business: previewResponse.business,
            auditId: previewResponse.auditId,
          };
          break;
        }

        case "validate_preview": {
          const previewId = sanitizedInput.previewId as string;
          const lead = sanitizedInput.lead as any;
          const businessName = String(sanitizedInput.businessName || lead?.businessName || "Business");
          const websiteData = (sanitizedInput.websiteData as Record<string, unknown>) || {
            businessName,
            sectionOrder: ["hero", "services", "about", "contact"],
            hero: { headline: `Welcome to ${businessName}`, subtitle: "Quality service" },
          };

          const qualityReport = validateWebsiteQuality(
            websiteData,
            businessName
          );

          resultData = {
            previewId,
            passed: qualityReport.passed,
            score: qualityReport.score,
            issues: qualityReport.issues,
            warnings: qualityReport.warnings,
            genericityScore: qualityReport.genericityScore,
            isGeneric: qualityReport.isGeneric,
          };
          break;
        }

        case "create_outreach": {
          const leadId = String(sanitizedInput.leadId || "");
          if (!leadId) throw new Error("Missing required leadId for outreach draft creation");

          const draftResult = await generateOutreachDraft({
            leadId,
            previewId: sanitizedInput.previewId as string,
            channel: "email",
            userId: request.userId || request.tenantId || undefined,
            overrideLead: sanitizedInput.lead as any,
            overrideAudit: sanitizedInput.audit as any,
            overridePreview: sanitizedInput.preview as any,
          });

          resultData = {
            outreachId: draftResult.outreach?.outreachId,
            leadId: draftResult.outreach?.leadId,
            subject: draftResult.outreach?.subject,
            body: draftResult.outreach?.message,
            status: draftResult.outreach?.status || "draft_created",
            requiresHumanApproval: true, // Invariant: always approval-gated
            previewUrl: draftResult.outreach?.previewUrl,
            channel: "email",
          };
          break;
        }

        case "get_lead_status": {
          const leadId = String(sanitizedInput.leadId || "");
          if (!leadId) throw new Error("Missing required leadId");

          const crmState = await crmRepository.getLeadCRMState(
            leadId,
            request.userId || request.tenantId || undefined
          );
          const lead = await leadRepository.findLeadById(
            leadId,
            request.userId || request.tenantId || undefined
          );

          resultData = {
            leadId,
            leadStatus: lead?.leadStatus || "UNKNOWN",
            crmStatus: crmState?.status || "UNKNOWN",
            qualificationStatus: lead?.qualificationStatus || "NEEDS_REVIEW",
            lastContactAt: crmState?.updatedAt,
            nextAction: crmState?.nextAction,
            messagesCount: crmState?.messages?.length || 0,
            timelineCount: crmState?.timeline?.length || 0,
          };
          break;
        }

        case "analyze_reply": {
          const messageText = String(sanitizedInput.messageText || sanitizedInput.replyText || "");
          if (!messageText) throw new Error("Missing reply messageText to analyze");

          const analysis = await analyzeInboundReply({
            messageText,
            leadContext: {
              businessName: sanitizedInput.businessName as string,
              industry: sanitizedInput.industry as string,
            },
          });

          resultData = {
            intent: analysis.intent,
            sentiment: analysis.sentiment,
            urgency: analysis.urgency,
            confidence: analysis.confidence,
            keySignals: analysis.keySignals,
            recommendedAction: analysis.recommendedAction,
            humanReviewRequired: analysis.requiresHumanReview,
          };
          break;
        }

        case "schedule_followup": {
          const leadId = String(sanitizedInput.leadId || "");
          if (!leadId) throw new Error("Missing required leadId");

          // Check if lead opted out (DO_NOT_CONTACT)
          const crmState = await crmRepository.getLeadCRMState(
            leadId,
            request.userId || request.tenantId || undefined
          );
          if (crmState && crmState.status === "DO_NOT_CONTACT") {
            return {
              success: false,
              tool: "schedule_followup",
              requestId: request.requestId,
              taskId: request.taskId,
              result: null,
              errors: ["Cannot schedule follow-up: lead has explicitly opted out (DO_NOT_CONTACT)."],
              warnings: [],
              metadata: {
                durationMs: performance.now() - startTime,
                executedAt: new Date().toISOString(),
                tenantId: request.tenantId,
              },
            };
          }

          const job = await FollowUpQueue.scheduleFollowUp({
            runId: request.taskId,
            leadId,
            conversationId: String(sanitizedInput.conversationId || `conv_${leadId}_email`),
            outreachId: String(sanitizedInput.outreachId || `outreach_${Date.now()}`),
            channel: "email",
            delayDays: typeof sanitizedInput.delayDays === "number" ? sanitizedInput.delayDays : 3,
          });

          resultData = {
            scheduled: Boolean(job),
            jobId: job?.id,
            scheduledAt: job?.scheduledAt,
            dueAt: job?.dueAt,
            followUpNumber: job?.followUpNumber,
            status: job?.status,
          };
          break;
        }

        case "update_crm": {
          const leadId = String(sanitizedInput.leadId || "");
          if (!leadId) throw new Error("Missing required leadId");

          const newStatus = sanitizedInput.newStatus as any;
          const reason = String(sanitizedInput.reason || "Updated via n8n Ops Agent");
          const source = (sanitizedInput.source as any) || "n8n";

          if (newStatus) {
            await crmRepository.updateLeadStatus(
              leadId,
              newStatus,
              reason,
              source,
              undefined,
              undefined,
              request.userId || request.tenantId || undefined
            );
          }

          if (sanitizedInput.notes) {
            await crmRepository.createCRMEvent({
              leadId,
              type: "STATUS_CHANGED",
              actor: "system",
              description: String(sanitizedInput.notes),
              metadata: { agent: "n8n_ops_agent" },
            });
          }

          const updatedState = await crmRepository.getLeadCRMState(
            leadId,
            request.userId || request.tenantId || undefined
          );

          resultData = {
            updated: true,
            leadId,
            status: updatedState?.status,
            historyCount: updatedState?.statusHistory?.length || 0,
          };
          break;
        }

        case "report_to_ceo": {
          const report = {
            taskId: request.taskId,
            status: sanitizedInput.status || "completed",
            summary: sanitizedInput.summary || "n8n Ops Agent execution completed",
            completedActions: sanitizedInput.completedActions || [],
            failedActions: sanitizedInput.failedActions || [],
            requiresApproval: Boolean(sanitizedInput.requiresApproval),
            nextAction: sanitizedInput.nextAction,
            evidence: sanitizedInput.evidence || [],
            timestamp: new Date().toISOString(),
          };

          // Save into Phase 18 Memory
          await MemoryStore.getInstance().saveDecision({
            decisionId: `dec_ops_${request.taskId}`,
            runId: request.taskId,
            agentName: "n8n_ops_agent",
            objective: `n8n Ops Execution: ${report.summary}`,
            chosenAction: String(sanitizedInput.status),
            reasoningSummary: report.summary,
            confidence: 0.95,
            metadata: {
              completedActionsCount: Array.isArray(report.completedActions) ? report.completedActions.length : 0,
              requiresApproval: report.requiresApproval,
            },
          });

          emitAgentEvent({
            agent: "executive",
            event: "agent.completed",
            requestId: request.requestId,
            status: "success",
            metadata: { report },
          });

          resultData = {
            recorded: true,
            received: true,
            taskId: request.taskId,
            acknowledgedAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            strategicEscalationRequired: report.status === "failed" || report.status === "blocked",
          };
          break;
        }

        default: {
          throw new Error(`Unknown Ops tool: ${(request as any).tool}`);
        }
      }

      const response: OpsToolResponse<any> = {
        success: true,
        tool: request.tool,
        requestId: request.requestId,
        taskId: request.taskId,
        result: redactSecretsInObject(resultData),
        errors: [],
        warnings,
        metadata: {
          durationMs: performance.now() - startTime,
          executedAt: new Date().toISOString(),
          tenantId: request.tenantId,
        },
      };

      // Store in idempotency cache
      this.idempotencyCache.set(idempotencyKey, response);

      emitAgentEvent({
        agent: "n8n_automation",
        event: "agent.tool_result",
        requestId: request.requestId,
        status: "success",
        metadata: { tool: request.tool, taskId: request.taskId },
      });

      return response;
    } catch (err: unknown) {
      const durationMs = performance.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

      emitAgentEvent({
        agent: "n8n_automation",
        event: "agent.failed",
        requestId: request.requestId,
        status: "error",
        error: errorMsg,
        metadata: { tool: request.tool, taskId: request.taskId },
      });

      return {
        success: false,
        tool: request.tool,
        requestId: request.requestId,
        taskId: request.taskId,
        result: null,
        errors: [errorMsg],
        warnings: [],
        metadata: {
          durationMs,
          executedAt: new Date().toISOString(),
          tenantId: request.tenantId,
        },
      };
    }
  }

  /**
   * Resets the in-memory idempotency cache (useful for testing).
   */
  public clearCache(): void {
    this.idempotencyCache.clear();
  }
}

export const opsToolExecutor = OpsToolExecutor.getInstance();
