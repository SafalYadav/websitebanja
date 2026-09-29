// src/lib/audit/auditService.ts
/**
 * Business Research & Website Audit Orchestration Service
 * Phase: Phase 9 (Business Research + Website Audit Agent)
 *
 * Coordinates:
 *   Lead Resolution -> Research Layer -> Safe Fetch & Bounded Crawl ->
 *   Multi-Dimensional Audit -> Opportunity Scoring -> Phase 10 Design Inputs ->
 *   Storage & Telemetry
 */

import crypto from "crypto";
import type {
  AuditLeadRequest,
  LeadAuditReport,
  ResearchSummary,
  AuditIssue,
} from "./types";
import { crawlWebsiteBounded } from "./crawler";
import { parseHtml, type ParsedHtmlDocument } from "./htmlParser";
import {
  evaluateTechnical,
  evaluateMobile,
  evaluateUx,
  evaluateSeo,
  evaluateConversion,
  evaluateAccessibility,
  calculateWebsiteOpportunityScore,
  synthesizePhase10DesignInputs,
  createSyntheticMissingWebsiteAudit,
} from "./auditEngine";
import { auditRepository } from "./auditRepository";
import { leadRepository } from "@/lib/discovery/leadRepository";
import type { BusinessLead } from "@/lib/discovery/types";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

export class AuditServiceError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code = "AUDIT_EXECUTION_FAILED", statusCode = 400) {
    super(message);
    this.name = "AuditServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Compiles a structured research summary from verified lead attributes
 */
export function buildResearchSummary(lead: BusinessLead): ResearchSummary {
  const parts: string[] = [];
  if (lead.description) parts.push(lead.description);
  if (lead.rating && lead.reviewCount) {
    parts.push(`Maintains a verified ${lead.rating}/5.0 rating across ${lead.reviewCount} customer reviews in ${lead.city || "Vadodara"}.`);
  }
  if (lead.address) parts.push(`Operates from physical commercial premises at ${lead.address}.`);

  const socialList = Object.entries(lead.socialLinks || {}).map(
    ([platform, url]) => `${platform}: ${url}`
  );

  return {
    businessName: lead.businessName,
    industry: lead.industry,
    category: lead.category,
    location: lead.city || lead.address || "Vadodara, Gujarat",
    summary: parts.join(" ") || `${lead.businessName} is an active commercial enterprise operating in ${lead.city || "Vadodara"}.`,
    publicContact: {
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
    },
    socialPresence: socialList,
    reputationSummary:
      lead.rating && lead.reviewCount
        ? `High customer satisfaction: ${lead.rating}/5.0 (${lead.reviewCount} reviews)`
        : "Unrated / emerging local business",
  };
}

/**
 * Executes a full business research and website audit on a qualified lead
 */
export async function auditQualifiedLead(
  request: AuditLeadRequest,
  userId?: string
): Promise<LeadAuditReport> {
  const startTime = Date.now();
  const auditId = `audit_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

  // 1. Resolve Lead Data
  let lead: BusinessLead | null = null;

  if (request.lead) {
    lead = request.lead;
  } else if (request.leadId) {
    lead = await leadRepository.findLeadById(request.leadId, userId);
  }

  if (!lead) {
    throw new AuditServiceError(
      `Lead not found: '${request.leadId || "unspecified"}'`,
      "LEAD_NOT_FOUND",
      404
    );
  }

  emitAgentEvent({
    event: "business.research.started",
    agent: "n8n_automation",
    requestId: auditId,
    metadata: {
      leadId: lead.leadId,
      businessName: lead.businessName,
      category: lead.category,
    },
  });

  // 2. Perform Research Layer
  const research = buildResearchSummary(lead);

  emitAgentEvent({
    event: "business.research.completed",
    agent: "n8n_automation",
    requestId: auditId,
    metadata: { leadId: lead.leadId },
  });

  emitAgentEvent({
    event: "website.resolve.started",
    agent: "n8n_automation",
    requestId: auditId,
    metadata: { leadId: lead.leadId, website: lead.website },
  });

  const websiteUrl = lead.website ? lead.website.trim() : "";
  const isWebsiteMissing = !websiteUrl || lead.websiteStatus === "missing";

  emitAgentEvent({
    event: "website.resolve.completed",
    agent: "n8n_automation",
    requestId: auditId,
    metadata: {
      leadId: lead.leadId,
      status: isWebsiteMissing ? "missing" : "present",
    },
  });

  emitAgentEvent({
    event: "website.audit.started",
    agent: "n8n_automation",
    requestId: auditId,
    metadata: { leadId: lead.leadId, websiteUrl },
  });

  let technicalResult;
  let mobileResult;
  let uxResult;
  let seoResult;
  let conversionResult;
  let accessibilityResult;
  let performanceSignals;
  let auditedUrls: string[] = [];
  let websiteStatus: "present" | "missing" | "unreachable" | "unknown" = "missing";

  if (isWebsiteMissing) {
    // Lead has no website -> Generate synthetic baseline audit
    const synthetic = createSyntheticMissingWebsiteAudit(lead);
    technicalResult = synthetic.technical;
    mobileResult = synthetic.mobile;
    uxResult = synthetic.ux;
    seoResult = synthetic.seo;
    conversionResult = synthetic.conversion;
    performanceSignals = synthetic.performance;
    accessibilityResult = synthetic.accessibility;
    websiteStatus = "missing";
  } else {
    // Lead has a website -> Execute safe crawl
    emitAgentEvent({
      event: "website.fetch.started",
      agent: "n8n_automation",
      requestId: auditId,
      metadata: { rootUrl: websiteUrl },
    });

    const maxPages = Math.min(request.maxPages || 8, 12);
    const maxDepth = Math.min(request.maxDepth || 2, 3);
    const crawl = await crawlWebsiteBounded(websiteUrl, maxPages, maxDepth);

    if (crawl.pages.length === 0) {
      emitAgentEvent({
        event: "website.fetch.failed",
        agent: "n8n_automation",
        requestId: auditId,
        metadata: { rootUrl: websiteUrl, error: crawl.error || "Unreachable" },
      });

      // Website was unreachable -> Generate synthetic unreachable audit
      const synthetic = createSyntheticMissingWebsiteAudit(lead);
      synthetic.technical.issues.push({
        category: "technical",
        severity: "high",
        evidence: `Website at ${websiteUrl} could not be reached: ${crawl.error || "Connection timed out"}.`,
        recommendation: "Replace with reliable, high-performance WebsiteBanja infrastructure.",
      });
      technicalResult = synthetic.technical;
      mobileResult = synthetic.mobile;
      uxResult = synthetic.ux;
      seoResult = synthetic.seo;
      conversionResult = synthetic.conversion;
      performanceSignals = synthetic.performance;
      accessibilityResult = synthetic.accessibility;
      websiteStatus = "unreachable";
    } else {
      emitAgentEvent({
        event: "website.fetch.completed",
        agent: "n8n_automation",
        requestId: auditId,
        metadata: { rootUrl: websiteUrl, pagesFetched: crawl.pages.length },
      });

      websiteStatus = "present";
      auditedUrls = crawl.pages.map((p) => p.url);
      const parsedPages: ParsedHtmlDocument[] = crawl.pages.map((p) => parseHtml(p.html));

      technicalResult = evaluateTechnical(crawl.pages, parsedPages);
      mobileResult = evaluateMobile(parsedPages);
      uxResult = evaluateUx(parsedPages, lead.category);
      seoResult = evaluateSeo(parsedPages, lead.businessName, lead.city || "Vadodara");
      conversionResult = evaluateConversion(parsedPages);
      accessibilityResult = evaluateAccessibility(parsedPages);

      const homeDoc = parsedPages[0] || ({} as Partial<ParsedHtmlDocument>);
      performanceSignals = {
        status: "static_analysis" as const,
        htmlSizeBytes: crawl.pages[0]?.sizeBytes || 0,
        imageCount: homeDoc.images ? homeDoc.images.length : 0,
        scriptCount: homeDoc.scriptsCount || 0,
        stylesheetCount: homeDoc.stylesheetsCount || 0,
        externalDomainCount: 1,
      };
    }
  }

  // 3. Collect All Issues
  const allIssues: AuditIssue[] = [
    ...technicalResult.issues,
    ...mobileResult.issues,
    ...uxResult.issues,
    ...seoResult.issues,
    ...conversionResult.issues,
    ...accessibilityResult.issues,
  ];

  // 4. Calculate Dedicated websiteOpportunityScore
  const opportunity = calculateWebsiteOpportunityScore(
    websiteStatus,
    {
      ux: uxResult.score,
      seo: seoResult.score,
      conversion: conversionResult.score,
      accessibility: accessibilityResult.score,
    },
    allIssues
  );

  // 5. Synthesize Phase 10 Design Inputs
  const phase10DesignInputs = synthesizePhase10DesignInputs(
    lead,
    lead.industry,
    allIssues
  );

  emitAgentEvent({
    event: "phase10.handoff.created",
    agent: "n8n_automation",
    requestId: auditId,
    metadata: {
      leadId: lead.leadId,
      visualDirection: phase10DesignInputs.visualDirection,
      requiredSections: phase10DesignInputs.requiredSections,
    },
  });

  const recommendations = allIssues.map(
    (i) => `[${i.category.toUpperCase()} / ${i.severity.toUpperCase()}] ${i.recommendation}`
  );

  const report: LeadAuditReport = {
    auditId,
    leadId: lead.leadId,
    auditedAt: new Date().toISOString(),
    business: {
      businessName: lead.businessName,
      category: lead.category,
      industry: lead.industry,
      location: lead.city || lead.address || "Vadodara, Gujarat",
      phone: lead.phone,
      email: lead.email,
      website: lead.website,
    },
    research,
    website: {
      status: websiteStatus,
      url: websiteUrl || undefined,
      pagesAudited: auditedUrls.length,
      auditedUrls,
    },
    technical: technicalResult,
    mobile: mobileResult,
    ux: uxResult,
    seo: seoResult,
    conversion: conversionResult,
    performance: performanceSignals,
    accessibility: accessibilityResult,
    opportunity,
    recommendations,
    phase10DesignInputs,
    handoffPhase: "phase10_automated_preview_generation",
  };

  // 6. Save Audit Report
  await auditRepository.saveAudit(report, userId);

  emitAgentEvent({
    event: "website.audit.completed",
    agent: "n8n_automation",
    requestId: auditId,
    metadata: {
      leadId: lead.leadId,
      auditId,
      opportunityScore: opportunity.score,
      totalIssues: allIssues.length,
      durationMs: Date.now() - startTime,
    },
  });

  return report;
}
