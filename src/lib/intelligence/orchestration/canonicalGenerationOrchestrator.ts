// src/lib/intelligence/orchestration/canonicalGenerationOrchestrator.ts
/**
 * Canonical Generation Orchestrator
 * Requirement #3: Create One Canonical Generation Orchestrator
 *
 * All generation entry points converge here:
 * 1. Build authoritative BusinessContext & Grounded Intelligence
 * 2. Analyze existing website if available
 * 3. Perform semantic business reasoning & intent extraction
 * 4. Ingest active learning strategy & directives
 * 5. Plan bespoke information architecture & non-redundant sections
 * 6. Synthesize initial WebsiteData AST
 * 7. Map & apply verified Google Places assets (photos, authentic reviews)
 * 8. Apply visual contrast protection
 * 9. Execute 7-stage deterministic ValidationOrchestrator quality gate
 * 10. Execute bounded self-correction RepairCoordinator if any stage fails
 * 11. Return verified, customer-ready website result
 */

import crypto from "crypto";
import path from "path";
import fs from "fs";
import type { WebsiteData } from "@/types/website";
import type {
  CanonicalGenerationRequest,
  CanonicalGenerationResponse,
} from "./types";
import { GroundedIntelligenceService } from "../grounding/groundedIntelligenceService";
import { GroundedAssetSelector } from "../grounding/groundedAssetSelector";
import { BusinessSemanticReasoner } from "../semantic/businessSemanticReasoner";
import { StrategyManager } from "../learning/strategyManager";
import { businessSectionPlanner } from "../planning/businessSectionPlanner";
import { ValidationOrchestrator } from "../validation/validationOrchestrator";
import { RepairCoordinator } from "../validation/repairCoordinator";
import { applyGroundedAssetsToWebsite } from "../grounding/groundedWebsiteGenerator";
import { generatePersonalizedPreview } from "@/lib/personalization/previewGenerator";
import { auditRenderedWebsite } from "./renderedWebsiteAudit";
import { reviewRenderedCandidate, renderedRepairRequirements } from "./renderedPublishReview";
import { selectOwnedComparisonWebsites } from "@/lib/agents/uniqueness/candidateSelector";
import { auditQualifiedLead } from "@/lib/audit/auditService";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { leadRepository } from "@/lib/discovery/leadRepository";
import { runGenerationEmployees } from "./generationEmployees";
import type { ExecutiveGenerationBrief } from "./types";
import { researchUnknownBusiness, readResearchResume, researchKey, applyApprovedDossier } from "./researchGovernance";
import { findApprovedKnowledge } from "./semanticKnowledge";
import { beginGenerationTrace, appendGenerationEvidence, finishGenerationTrace } from "./generationTraceStore";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { KnowledgeApprovalInvalidError, type ApprovedKnowledgeBinding } from "./approvedKnowledgeBinding";

const PREVIEW_DIR = path.join(process.cwd(), "scratch", "previews");

function ensurePreviewStorage(): void {
  if (!fs.existsSync(PREVIEW_DIR)) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  }
}

export class CanonicalGenerationOrchestrator {
  private static instance: CanonicalGenerationOrchestrator;
  private groundingService: GroundedIntelligenceService;
  private assetSelector: GroundedAssetSelector;
  private semanticReasoner: BusinessSemanticReasoner;
  private strategyManager: StrategyManager;
  private validator: ValidationOrchestrator;
  private repairCoordinator: RepairCoordinator;

  private constructor() {
    this.groundingService = GroundedIntelligenceService.getInstance();
    this.assetSelector = GroundedAssetSelector.getInstance();
    this.semanticReasoner = BusinessSemanticReasoner.getInstance();
    this.strategyManager = StrategyManager.getInstance();
    this.validator = ValidationOrchestrator.getInstance();
    this.repairCoordinator = RepairCoordinator.getInstance();
  }

  public static getInstance(): CanonicalGenerationOrchestrator {
    if (!CanonicalGenerationOrchestrator.instance) {
      CanonicalGenerationOrchestrator.instance = new CanonicalGenerationOrchestrator();
    }
    return CanonicalGenerationOrchestrator.instance;
  }

  /**
   * Synthesizes executive CEO/Boss strategic positioning directives to guide generation.
   */
  public synthesizeExecutiveDirectives(params: {
    businessName: string;
    domain: string;
    hasAudit: boolean;
    hasPlacesProfile: boolean;
    transactionType: string;
  }): {
    strategicPositioning: string;
    targetAudienceFocus: string;
    primaryConversionObjective: string;
    frictionToEliminate: string[];
    keyProofRequirements: string[];
  } {
    const domain = params.domain.toLowerCase();
    let positioning = `Authoritative and friction-free digital presence for ${params.businessName}`;
    let target = "Local customers seeking reliable, immediate services";
    let objective = "Direct consultation inquiry";
    let friction = ["Unclear offerings", "Hidden pricing", "Difficult contact points"];
    let proof = ["Transparent verified standards", "Authentic customer experiences"];

    if (domain.includes("wellness") || domain.includes("personal_care")) {
      positioning = `Calm, trust-first wellness booking experience for ${params.businessName}`;
      target = "Local customers comparing treatments, availability, and verified guest experiences";
      objective = "Direct treatment booking or consultation";
      friction = ["Unclear treatment options", "Unverified claims", "Difficult appointment booking"];
      proof = ["Authentic business imagery", "Verified reviews and contact details"];
    } else if (params.transactionType === "direct_booking") {
      positioning = `High-converting, transparent booking engine for ${params.businessName}`;
      target = "Travelers, commuters, and patrons seeking immediate vehicle/slot availability";
      objective = "Direct instant booking with zero hesitation";
      friction = ["Opaque deposits", "Unknown vehicle/room condition", "Cumbersome phone tag"];
      proof = ["Verified fleet/inventory imagery", "Clear transparent hourly/daily pricing"];
    } else if (params.transactionType === "direct_purchase") {
      positioning = `Trust-first ecommerce showcase for ${params.businessName}`;
      target = "Direct buyers looking for authentic quality and fast shipping";
      objective = "Direct product purchase and repeat orders";
      friction = ["Payment mistrust", "Vague product specifications", "Return policy uncertainty"];
      proof = ["Clear product specifications", "Buyer protection guarantees"];
    } else if (params.transactionType === "quote_request") {
      positioning = `Elite craftsmanship and verified contractor authority for ${params.businessName}`;
      target = "Homeowners and enterprise clients requiring dependable professional execution";
      objective = "Fast quote and estimate submission";
      friction = ["Unreliable quotes", "Unlicensed ambiguity", "Delayed response times"];
      proof = ["Verified completed projects", "Transparent scope of work"];
    }

    return {
      strategicPositioning: positioning,
      targetAudienceFocus: target,
      primaryConversionObjective: objective,
      frictionToEliminate: friction,
      keyProofRequirements: proof,
    };
  }

  /**
   * Universal generation entry point.
   */
  public async generateWebsite(
    request: CanonicalGenerationRequest,
    internalResume?: { researchId: string; leaseToken: string },
    pipelineFence?: import("@/lib/automation/pipelineExecutionLease").PipelineExecutionFence,
  ): Promise<CanonicalGenerationResponse> {
    const id = `cgen_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const started = Date.now();
    const knowledgeBindings: ApprovedKnowledgeBinding[] = [];
    try {
      if (pipelineFence) {
        if (pipelineFence.tenantId !== (request.tenantId || request.userId) || request.source !== "autonomous_pipeline") throw new Error("Pipeline generation owner/source mismatch");
        request = { ...request, pipelineRunId: pipelineFence.runId };
      } else if (request.pipelineRunId && !internalResume) throw new Error("Parent pipeline identity requires a server-owned execution fence");
      await beginGenerationTrace(id, request);
      const result = await this.executeGeneration(request, internalResume, id, pipelineFence, knowledgeBindings);
      result.correlationId = id;
      if (result.success) {
        if (!/^prev_[a-z0-9_-]+$/.test(result.preview.id) || !/^[a-z0-9_-]+$/.test(result.preview.slug)) throw new Error("Invalid reviewed preview identifiers");
        (result.websiteData as unknown as Record<string, unknown>).generationGate = "READY";
        (result.websiteData as unknown as Record<string, unknown>).correlationId = id;
      }
      await finishGenerationTrace(id, result, internalResume ? { ...internalResume, request } : undefined, pipelineFence, knowledgeBindings);
      // Approved previews are served from durable trace results, not ephemeral instance files.
      return result;
    } catch (error) {
      const code = error instanceof KnowledgeApprovalInvalidError ? error.code : error instanceof Error && "code" in error && typeof error.code === "string"
        && ["PIPELINE_PARENT_PAUSED", "PIPELINE_PARENT_CANCELLED", "PIPELINE_PARENT_INVALID"].includes(error.code) ? error.code : "DURABLE_GENERATION_STORAGE_FAILED";
      return { success: false, status: code === "PIPELINE_PARENT_PAUSED" ? "WAITING_HUMAN_APPROVAL" : code === "PIPELINE_PARENT_CANCELLED" ? "REJECTED" : "FAILED", correlationId: id,
        researchId: internalResume?.researchId,
        websiteData: {} as WebsiteData, preview: { id: "", url: "", slug: "" },
        businessContext: { businessName: request.businessName, domain: "unknown", location: request.location || "" },
        repairCount: 0, durationMs: Date.now() - started,
        error: { code, message: sanitizeErrorOutput(error) } };
    }
  }

  private async executeGeneration(
    request: CanonicalGenerationRequest,
    internalResume: { researchId: string; leaseToken: string } | undefined,
    correlationId: string,
    pipelineFence?: import("@/lib/automation/pipelineExecutionLease").PipelineExecutionFence,
    knowledgeBindings: ApprovedKnowledgeBinding[] = [],
  ): Promise<CanonicalGenerationResponse> {
    const startTime = Date.now();

    emitAgentEvent({
      event: "automation.website_generation_started",
      agent: "canonical_orchestrator",
      requestId: correlationId,
      metadata: {
        businessName: request.businessName,
        source: request.source,
      },
    });

    try {
      // Resolve the stored lead before grounding so automation retains its exact
      // Google identity even when the caller supplies only leadId.
      const lead = request.overrideLead || (request.leadId
        ? await leadRepository.findLeadById(request.leadId, request.userId)
        : null);
      request = {
        ...request,
        overrideLead: lead || undefined,
        businessName: lead?.businessName || request.businessName,
        category: request.category || lead?.industry || lead?.category,
        location: request.location || lead?.address || lead?.city,
        phone: request.phone || lead?.phone,
        email: request.email || lead?.email,
        websiteUrl: request.websiteUrl || lead?.website,
        placeId: request.placeId || (lead?.source === "google_places" ? lead.sourceId : undefined),
        tenantId: request.tenantId || request.userId,
      };
      // 1. Business Semantic Reasoning & Intent Analysis
      let semanticAnalysis = this.semanticReasoner.analyzeBusiness({
        businessName: request.businessName,
        category: request.category,
        location: request.location,
        phone: request.phone,
      });

      // 2. Retrieve Active Learning Strategy (Phase 27)
      const activeStrategy = await this.strategyManager
        .getActiveStrategy("generation", request.tenantId)
        .catch(() => null);

      // 3. Grounded Business Intelligence Resolution
      let profile = request.groundedProfile;
      if (!profile) {
        const biResult = await this.groundingService.researchBusiness({
          businessName: request.businessName,
          location: request.location,
          category: request.category || semanticAnalysis.domain,
          placeId: request.placeId,
          website: request.websiteUrl,
          tenantId: request.tenantId,
        });
        if (biResult.success && biResult.profile) {
          profile = biResult.profile;
        } else {
          throw new Error(biResult.errors?.join("; ") || "Business research failed before generation.");
        }
      }
      if (request.placeId && profile.identity.placeId !== request.placeId) {
        throw new Error("Grounded profile does not match the requested Google Place ID.");
      }
      if (profile.tenantId !== (request.tenantId ?? null)) {
        throw new Error("Grounded profile belongs to a different workspace.");
      }
      await appendGenerationEvidence(correlationId, { stage: "GROUNDING", profile });

      // Reconcile semantics after grounding. Google evidence and observed services
      // are authoritative over a guess made from the business name alone.
      semanticAnalysis = this.semanticReasoner.analyzeBusiness({
        businessName: profile.identity.canonicalName || request.businessName,
        category: profile.googlePrimaryType || request.category,
        types: profile.googlePlaceTypes || [],
        description: profile.evidence.filter(item => !item.supports.startsWith("location")).map((item) => item.observation).join(" ").slice(0, 4000),
        location: profile.location.city || request.location,
        phone: profile.identity.phone || request.phone,
      });

      // Unknown domains cannot enter synthesis. Research must establish an
      // approved business model before content, imagery, or CTAs are selected.
      const categoryUnderstanding = this.semanticReasoner.analyzeBusiness({
        businessName: profile.identity.canonicalName || request.businessName,
        category: profile.googlePrimaryType || request.category,
        types: profile.googlePlaceTypes || [],
      });
      const unknownDomain = categoryUnderstanding.domain === "general_commercial" || categoryUnderstanding.confidence < 0.7;
      const pendingResearchId = internalResume?.researchId || researchKey(request);
      if (internalResume?.researchId !== pendingResearchId && (request.tenantId || request.userId)) {
        const originalResume = await readResearchResume(pendingResearchId, request.tenantId || request.userId || "");
        if (originalResume?.result) return originalResume.result;
        if (originalResume) return {
          success: false, status: "WAITING_HUMAN_APPROVAL", researchId: pendingResearchId,
          websiteData: {} as WebsiteData, preview: { id: "", url: "", slug: "" },
          businessContext: { businessName: request.businessName, domain: categoryUnderstanding.domain, location: request.location || "" },
          repairCount: 0, durationMs: Date.now() - startTime,
          error: { code: "APPROVED_GENERATION_QUEUED", message: "Research approved. Original generation is queued or running." },
        };
      }
      // Resume consumes the original reviewed company dossier, not only reusable category learning.
      const approvedKnowledgeResult = unknownDomain && !internalResume && (request.tenantId || request.userId)
        ? await findApprovedKnowledge(request.tenantId || request.userId || "", profile.googlePrimaryType || request.category || "") : null;
      const approvedKnowledge = approvedKnowledgeResult?.concept;
      if (approvedKnowledge && approvedKnowledgeResult) {
        knowledgeBindings.push(approvedKnowledgeResult.binding);
        await appendGenerationEvidence(correlationId, { stage: "APPROVED_KNOWLEDGE", binding: approvedKnowledgeResult.binding });
        semanticAnalysis = { ...categoryUnderstanding,
          domain: approvedKnowledge.domain, subdomain: approvedKnowledge.subdomain,
          confidence: .85, confidenceLevel: "HIGH",
          primaryObjects: approvedKnowledge.preferredSubjects, forbiddenObjects: approvedKnowledge.forbiddenSubjects,
          preferredImageryThemes: approvedKnowledge.preferredSubjects, forbiddenImageryThemes: approvedKnowledge.forbiddenSubjects,
          customerIntent: approvedKnowledge.businessModel,
          primaryCta: { label: approvedKnowledge.primaryCta.label, secondaryLabel: "Contact Us", intent: approvedKnowledge.primaryCta.intent },
          forbiddenClaims: approvedKnowledge.regulatoryConstraints,
          // Reusable knowledge never carries another company's service claims.
          recommendedServices: [], offerings: [],
        };
      }
      if ((unknownDomain && !approvedKnowledge) || internalResume) {
        const research = await researchUnknownBusiness(request, profile, internalResume?.researchId, pipelineFence);
        if (research.status === "APPROVED" && internalResume?.researchId !== research.id) {
          const resume = await readResearchResume(research.id, request.tenantId || request.userId || "");
          if (resume?.result) return resume.result;
          if (resume) return {
            success: false, status: "WAITING_HUMAN_APPROVAL", researchId: research.id,
            websiteData: {} as WebsiteData, preview: { id: "", url: "", slug: "" },
            businessContext: { businessName: request.businessName, domain: "unknown", location: request.location || "" },
            repairCount: 0, durationMs: Date.now() - startTime,
            error: { code: "APPROVED_GENERATION_QUEUED", message: "Research approved. The original generation is queued or running." },
          };
        }
        if (research.status === "APPROVED" && research.dossier) {
          if (!("knowledgeBinding" in research) || !research.knowledgeBinding) throw new KnowledgeApprovalInvalidError();
          knowledgeBindings.push(research.knowledgeBinding);
          await appendGenerationEvidence(correlationId, { stage: "APPROVED_KNOWLEDGE", binding: research.knowledgeBinding });
          const dossier = research.dossier;
          semanticAnalysis = applyApprovedDossier(categoryUnderstanding, dossier);
        } else {
        return {
          success: false,
          status: research.status === "WAITING_HUMAN_APPROVAL" ? "WAITING_HUMAN_APPROVAL" : research.status === "REJECTED" ? "REJECTED" : "RESEARCH_REQUIRED",
          researchId: research.id,
          websiteData: {} as WebsiteData,
          preview: { id: "", url: "", slug: "" },
          businessContext: {
            businessName: request.businessName,
            domain: "unknown",
            location: profile.location.city || request.location || "",
            semanticProfile: categoryUnderstanding,
          },
          groundedProfile: profile,
          repairCount: 0,
          durationMs: Date.now() - startTime,
          error: {
            code: "RESEARCH_REQUIRED",
            message: "Research required for this business. Its business model must be verified and approved before website generation.",
          },
        };
        }
      }

      // 3B. Automatic Existing Website Crawl & Audit (Rule 2)
      let auditReport = request.overrideAudit;
      const targetWebsite = request.websiteUrl || request.overrideLead?.website;
      if (!auditReport && targetWebsite && typeof targetWebsite === "string" && targetWebsite.trim().length > 3) {
        try {
          const leadId = request.leadId || `lead_${crypto.randomBytes(4).toString("hex")}`;
          auditReport = await auditQualifiedLead(
            {
              leadId,
              lead: {
                leadId,
                businessName: request.businessName,
                normalizedName: request.businessName.toLowerCase(),
                category: request.category || semanticAnalysis.domain,
                industry: request.category || semanticAnalysis.domain,
                website: targetWebsite.trim(),
                websiteStatus: "present",
                city: request.location?.split(",")[0]?.trim() || "Local Area",
                phone: request.phone,
                source: "manual",
                sourceId: request.placeId || leadId,
                discoveredAt: new Date().toISOString(),
                qualificationStatus: "QUALIFIED",
                leadStatus: "QUALIFIED",
                qualificationScore: 100,
                opportunityScore: 80,
                reasonCodes: [],
                opportunityReasons: [],
              },
            },
            request.userId
          );
        } catch (auditErr) {
          console.warn("[CanonicalOrchestrator] Automatic website audit skipped or failed:", auditErr);
        }
      }

      // 4. Bespoke Information Architecture & Section Planning (Rules 3, 9, 10)
      const hasReviews = (profile?.placesReviews && profile.placesReviews.length > 0) || (request.placesReviews && request.placesReviews.length > 0);
      const sectionPlan = businessSectionPlanner.planSections({
        semanticAnalysis,
        profile,
        hasReviews: Boolean(hasReviews),
        hasServices: true,
      });

      const deterministicExecutiveBrief: ExecutiveGenerationBrief = {
        approvedDomain: semanticAnalysis.domain,
        approvedSubdomain: semanticAnalysis.subdomain,
        designDirection: semanticAnalysis.tone.join(", "),
        offeringConstraints: semanticAnalysis.forbiddenClaims,
        preferredImageSubjects: semanticAnalysis.primaryObjects,
        forbiddenImageSubjects: semanticAnalysis.forbiddenObjects,
        sectionOrder: sectionPlan.sectionOrder,
        primaryCta: {
          label: semanticAnalysis.primaryCta.label,
          intent: semanticAnalysis.primaryCta.intent,
        },
        uniquenessDirectives: activeStrategy?.directives || [],
        confidence: semanticAnalysis.confidence,
        evidence: [
          ...semanticAnalysis.evidenceSummary.factsObserved,
          ...semanticAnalysis.evidenceSummary.inferencesDeducted,
        ],
      };

      let employees: Awaited<ReturnType<typeof runGenerationEmployees>>;
      try {
        employees = await runGenerationEmployees(semanticAnalysis, profile, correlationId, request.requirements, product => appendGenerationEvidence(correlationId, product));
      } catch (employeeError) {
        if (!(employeeError instanceof Error) || !employeeError.message.startsWith("RESEARCH_REQUIRED")) throw employeeError;
        const research = await researchUnknownBusiness(request, profile, internalResume?.researchId, pipelineFence);
        if (research.status !== "APPROVED" || !research.dossier) {
          return {
            success: false, status: research.status === "WAITING_HUMAN_APPROVAL" ? "WAITING_HUMAN_APPROVAL" : research.status === "REJECTED" ? "REJECTED" : "RESEARCH_REQUIRED",
            researchId: research.id, websiteData: {} as WebsiteData, preview: { id: "", url: "", slug: "" },
            groundedProfile: profile,
            businessContext: { businessName: request.businessName, domain: semanticAnalysis.domain, location: request.location || "" },
            repairCount: 0, durationMs: Date.now() - startTime,
            error: { code: "SEMANTIC_RESEARCH_REQUIRED", message: "CEO/Boss semantic disagreement requires research and human approval. " + employeeError.message },
          };
        }
        // One controlled re-evaluation against human-approved evidence; never a silent template fallback.
        if (!("knowledgeBinding" in research) || !research.knowledgeBinding) throw new KnowledgeApprovalInvalidError();
        knowledgeBindings.push(research.knowledgeBinding);
        await appendGenerationEvidence(correlationId, { stage: "APPROVED_KNOWLEDGE", binding: research.knowledgeBinding });
        semanticAnalysis = applyApprovedDossier(semanticAnalysis, research.dossier);
        try {
          employees = await runGenerationEmployees(semanticAnalysis, profile, correlationId, request.requirements, product => appendGenerationEvidence(correlationId, product));
        } catch {
          throw new Error("QUALITY_BLOCKED: approved research did not resolve CEO/Boss semantic disagreement");
        }
      }
      semanticAnalysis = employees.profile;
      const executiveBrief: ExecutiveGenerationBrief = { ...deterministicExecutiveBrief,
        approvedDomain: semanticAnalysis.domain,
        approvedSubdomain: semanticAnalysis.subdomain,
        offeringConstraints: semanticAnalysis.forbiddenClaims,
        preferredImageSubjects: semanticAnalysis.primaryObjects,
        forbiddenImageSubjects: semanticAnalysis.forbiddenObjects,
        primaryCta: { label: semanticAnalysis.primaryCta.label, intent: semanticAnalysis.primaryCta.intent },
        confidence: semanticAnalysis.confidence,
        evidence: [...semanticAnalysis.evidenceSummary.factsObserved, ...semanticAnalysis.evidenceSummary.inferencesDeducted],
        designDirection: employees.design.direction, sectionOrder: employees.design.sectionOrder };

      // 4B. Executive CEO/Boss Directives (Rule 5)
      const executiveDirectives = this.synthesizeExecutiveDirectives({
        businessName: request.businessName,
        domain: semanticAnalysis.domain,
        hasAudit: Boolean(auditReport),
        hasPlacesProfile: Boolean(profile),
        transactionType: sectionPlan.primaryTransactionType,
      });

      // 5. Generate Base Website Data via Core Generator Pipeline
      const basePreview = await generatePersonalizedPreview({
        deferPublication: true,
        leadId: request.leadId || `lead_${crypto.randomBytes(4).toString("hex")}`,
        overrideLead: request.overrideLead || {
          leadId: request.leadId || `lead_${crypto.randomBytes(4).toString("hex")}`,
          businessName: request.businessName,
          category: request.category || semanticAnalysis.domain,
          industry: request.category || semanticAnalysis.domain,
          city: request.location?.split(",")[0]?.trim() || "Local Area",
          phone: request.phone,
          email: request.email,
          website: request.websiteUrl,
          source: request.placeId ? "google_places" : "manual",
          sourceId: request.placeId,
        },
        overrideAudit: auditReport,
        groundedProfile: profile,
        semanticProfile: semanticAnalysis,
        executiveBrief,
        placesPhotos: request.placesPhotos,
        placesReviews: request.placesReviews,
        userId: request.userId,
      });

      if (!basePreview.preview?.id) {
        throw new Error(basePreview.error?.message || "Underlying preview generation failed to initialize preview ID");
      }
      const generatedPreviewId = basePreview.preview.id;

      // Load generated website data
      ensurePreviewStorage();
      const previewFilePath = path.join(PREVIEW_DIR, `${basePreview.preview.id}.json`);
      let websiteData: WebsiteData;
      if (fs.existsSync(previewFilePath)) {
        websiteData = JSON.parse(fs.readFileSync(previewFilePath, "utf-8"));
      } else {
        throw new Error(`Generated preview file ${previewFilePath} not found on disk`);
      }

      // Enforce the Section Planner's non-redundant sequence
      websiteData.sectionOrder = sectionPlan.sectionOrder;
      if (websiteData.pages && websiteData.pages[0]) {
        websiteData.pages[0].sectionOrder = sectionPlan.sectionOrder;
      }

      // Re-apply Grounded Business Intelligence and 5-tier safe assets if profile exists
      if (profile) {
        const assetSelection = this.assetSelector.selectAssets(profile, {
          category: request.category || semanticAnalysis.domain,
          photos: request.placesPhotos,
          reviews: request.placesReviews,
          semanticProfile: semanticAnalysis,
        });
        websiteData = applyGroundedAssetsToWebsite(websiteData, assetSelection, profile);
      }

      // Approved employee content is authoritative after legacy generation/grounding.
      const applyEmployeeOutput = () => {
        websiteData.hero.title = employees.content.title;
        websiteData.hero.subtitle = employees.content.subtitle;
        websiteData.hero.button = employees.content.cta;
        websiteData.hero.buttonAction = { type: "scroll", target: "contact", label: employees.content.cta };
        websiteData.hero.layoutVariant = employees.design.heroLayout;
        websiteData.about.title = employees.content.aboutTitle;
        websiteData.about.content = employees.content.aboutContent;
        websiteData.services = employees.content.services.map(({ title, description }) => ({ title, description }));
        websiteData.features = employees.content.features.map(({ title, description }) => ({ title, description }));
        websiteData.sectionOrder = employees.design.sectionOrder;
        for (const page of websiteData.pages || []) if (page.isHome) page.sectionOrder = employees.design.sectionOrder;
        if (websiteData.designStrategy) websiteData.designStrategy.colorSystem = employees.design.colors;
        if (websiteData.brand) websiteData.brand.industry = semanticAnalysis.domain;
        const metadata = websiteData as unknown as Record<string, unknown>;
        metadata.category = semanticAnalysis.domain;
        metadata.employeeTrace = employees.trace;
        metadata.approvedTypography = {
          headingFont: employees.design.headingFont, bodyFont: employees.design.bodyFont,
        };
      };
      applyEmployeeOutput();

      // 6. 7-Stage Deterministic Validation (Quality Gate)
      const validationContext = {
        runId: correlationId,
        websiteData: websiteData as unknown as Record<string, unknown>,
        projectId: basePreview.preview.id,
        groundedProfile: profile,
        retryCount: 0,
        maxRetries: 1,
        tenantId: request.tenantId || "default_tenant",
        businessName: request.businessName,
        businessCategory: request.category || semanticAnalysis.domain,
        semanticProfile: semanticAnalysis,
        executiveBrief,
        businessLocation: request.location,
      };

      let valReport = await this.validator.validateWebsite(validationContext);
      let repairCount = 0;
      let currentStatus: CanonicalGenerationResponse["status"] = "READY";
      let regenerated = false;
      const regenerateWithEmployees = async (stage: "validation" | "rendered", failures: string[]) => {
        if (regenerated || !failures.length) throw new Error("QUALITY_BLOCKED: controlled regeneration already exhausted or missing diagnostics");
        regenerated = true;
        const approvedProfile = structuredClone(semanticAnalysis);
        const repairedEmployees = await runGenerationEmployees(approvedProfile, profile, correlationId, request.requirements,
          product => appendGenerationEvidence(correlationId, product), {
            attempt: 1, stage, failures: failures.slice(0, 12).map(item => item.slice(0, 2000)),
            previousOutput: { design: employees.design, content: employees.content },
          });
        if (JSON.stringify(repairedEmployees.profile) !== JSON.stringify(approvedProfile)) {
          throw new Error("QUALITY_BLOCKED: regeneration changed the approved business profile");
        }
        employees = repairedEmployees;
        applyEmployeeOutput();
        await appendGenerationEvidence(correlationId, { stage: "SPECIALIST_REGENERATION", report: {
          attempt: 1, sourceStage: stage, failures: failures.slice(0, 12), approvedDomain: approvedProfile.domain,
        } });
      };

      // 7. Bounded Self-Correction Repair Loop (Requirement #15)
      while (valReport.decision !== "READY" && repairCount < 1) {
        repairCount++;
        emitAgentEvent({
          event: "agent.thinking",
          agent: "repair_coordinator",
          requestId: correlationId,
          metadata: {
            attempt: repairCount,
            blockingCount: valReport.blockingFailures.length,
          },
        });

        const repairRes = await this.repairCoordinator.executeRepair(
          {
            ...validationContext,
            websiteData: websiteData as unknown as Record<string, unknown>,
            retryCount: repairCount,
          },
          valReport
        );
        await appendGenerationEvidence(correlationId, { stage: "REPAIR", report: {
          attempt: repairCount, failureFingerprint: valReport.failureFingerprint,
          appliedPatches: repairRes.appliedPatches, success: repairRes.success,
          error: repairRes.error || null,
        } });

        if (repairRes.success && repairRes.repairedData) {
          websiteData = repairRes.repairedData as unknown as WebsiteData;
          // Re-validate post-repair
          valReport = await this.validator.validateWebsite({
            ...validationContext,
            websiteData: websiteData as unknown as Record<string, unknown>,
            retryCount: repairCount,
            previousFingerprints: [valReport.failureFingerprint],
          });
          currentStatus = "REPAIRED";
        } else {
          await regenerateWithEmployees("validation", valReport.blockingFailures.map(item => `${item.ruleCode || item.stage}: ${item.failure}`));
          valReport = await this.validator.validateWebsite({ ...validationContext,
            websiteData: websiteData as unknown as Record<string, unknown>, retryCount: repairCount,
            previousFingerprints: [valReport.failureFingerprint],
          });
          currentStatus = "REPAIRED";
        }
      }

      // 8. Re-persist the final validated website data
      if (valReport.decision !== "READY") {
        throw new Error("Website quality validation failed after bounded repairs; preview is not ready.");
      }
      (websiteData as unknown as Record<string, unknown>).generationGate = "PENDING";
      (websiteData as unknown as Record<string, unknown>).generationOwnerId = request.userId || null;
      fs.writeFileSync(previewFilePath, JSON.stringify(websiteData, null, 2), "utf-8");
      let renderedAudit = await auditRenderedWebsite(basePreview.preview.id);
      await appendGenerationEvidence(correlationId, { stage: "RENDERED_QA", report: renderedAudit });
      const renderRegeneratedCandidate = async () => {
        valReport = await this.validator.validateWebsite({ ...validationContext,
          websiteData: websiteData as unknown as Record<string, unknown>, retryCount: repairCount,
        });
        if (valReport.decision !== "READY") throw new Error("QUALITY_BLOCKED: specialist render repair failed deterministic validation");
        fs.writeFileSync(previewFilePath, JSON.stringify(websiteData, null, 2), "utf-8");
        renderedAudit = await auditRenderedWebsite(generatedPreviewId);
        await appendGenerationEvidence(correlationId, { stage: "RENDERED_QA_REPAIR", report: renderedAudit });
        (websiteData as unknown as Record<string, unknown>).renderedAudit = renderedAudit;
        currentStatus = "REPAIRED";
      };
      if (renderedAudit.status === "rejected" && repairCount === 0) {
        repairCount = 1;
        await regenerateWithEmployees("rendered", [...renderedAudit.errors, ...renderedAudit.viewports.flatMap(view => view.issues)]);
        await renderRegeneratedCandidate();
      }
      (websiteData as unknown as Record<string, unknown>).renderedAudit = renderedAudit;
      if (renderedAudit.status !== "completed") {
        throw new Error(`Rendered verification ${renderedAudit.status}: ${[...renderedAudit.errors, ...renderedAudit.viewports.flatMap(view => view.issues)].slice(0, 12).join("; ")}`);
      }
      const candidateMetadata = websiteData as unknown as Record<string, unknown>;
      const comparisons = await selectOwnedComparisonWebsites(request.userId);
      const reviewCurrentCandidate = () => reviewRenderedCandidate({ correlationId, profile: semanticAnalysis,
        website: websiteData, audit: renderedAudit, employeeTrace: employees.trace, skillDocuments: employees.skillDocuments,
        comparisons });
      let publishReview = await reviewCurrentCandidate();
      await appendGenerationEvidence(correlationId, { stage: "PUBLISH_REVIEW", report: publishReview });
      const redesign = renderedRepairRequirements(publishReview);
      if (!publishReview.approved && repairCount === 0 && redesign.length) {
        repairCount = 1;
        await regenerateWithEmployees("rendered", redesign);
        await renderRegeneratedCandidate();
        if (renderedAudit.status !== "completed") throw new Error("QUALITY_BLOCKED: final specialist repair failed rendered QA");
        publishReview = await reviewCurrentCandidate();
        await appendGenerationEvidence(correlationId, { stage: "PUBLISH_REVIEW_REPAIR", report: publishReview });
      }
      candidateMetadata.publishReview = publishReview;
      fs.writeFileSync(previewFilePath, JSON.stringify(websiteData, null, 2), "utf-8");
      if (!publishReview.approved) {
        throw new Error("QUALITY_BLOCKED: independent rendered specialist/executive review rejected or unavailable");
      }
      candidateMetadata.generationGate = "PENDING";
      fs.writeFileSync(previewFilePath, JSON.stringify(websiteData, null, 2), "utf-8");
      if (basePreview.preview.slug) {
        const slugFilePath = path.join(PREVIEW_DIR, `${basePreview.preview.slug}.json`);
        fs.writeFileSync(slugFilePath, JSON.stringify(websiteData, null, 2), "utf-8");
      }

      const totalDuration = Date.now() - startTime;
      emitAgentEvent({
        event: "automation.website_generation_completed",
        agent: "canonical_orchestrator",
        requestId: correlationId,
        metadata: {
          status: currentStatus,
          repairCount,
          durationMs: totalDuration,
        },
      });

      return {
        success: true,
        status: currentStatus,
        websiteData,
        previewDetails: basePreview.preview,
        preview: {
          id: basePreview.preview.id,
          url: basePreview.preview.url,
          slug: basePreview.preview.slug,
        },
        businessContext: {
          businessName: request.businessName,
          domain: semanticAnalysis.domain,
          location: request.location || "Local Area",
          phone: profile?.identity?.phone || request.phone,
          existingWebsiteStatus: auditReport ? "audited" : targetWebsite ? "present" : "none",
          existingWebsiteUrl: targetWebsite || null,
          placeId: request.placeId || profile?.identity?.placeId,
          tenantId: request.tenantId || null,
          auditReport: auditReport || null,
          executiveDirectives,
          semanticProfile: semanticAnalysis,
          executiveBrief,
        },
        groundedProfile: profile,
        validationReport: valReport,
        repairCount,
        durationMs: totalDuration,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      emitAgentEvent({
        event: "automation.website_generation_failed",
        agent: "canonical_orchestrator",
        requestId: correlationId,
        metadata: { error: errMsg },
      });

      return {
        success: false,
        status: err instanceof KnowledgeApprovalInvalidError ? "RESEARCH_REQUIRED" : errMsg.startsWith("QUALITY_BLOCKED") || errMsg.startsWith("Rendered verification") ? "QUALITY_BLOCKED" : errMsg.startsWith("RESEARCH_REQUIRED") ? "RESEARCH_REQUIRED" : "FAILED",
        websiteData: {} as WebsiteData,
        preview: { id: "", url: "", slug: "" },
        businessContext: {
          businessName: request.businessName,
          domain: "unknown",
          location: request.location || "unknown",
        },
        repairCount: 0,
        durationMs: Date.now() - startTime,
        error: {
          code: err instanceof KnowledgeApprovalInvalidError ? err.code : errMsg.startsWith("QUALITY_BLOCKED") || errMsg.startsWith("Rendered verification") ? "QUALITY_BLOCKED" : errMsg.startsWith("RESEARCH_REQUIRED") ? "RESEARCH_REQUIRED" : "GENERATION_PIPELINE_ERROR",
          message: errMsg,
        },
      };
    }
  }
}

export const canonicalGenerationOrchestrator = CanonicalGenerationOrchestrator.getInstance();
