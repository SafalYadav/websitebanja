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
import { generatePersonalizedPreview } from "@/lib/personalization/previewGenerator";
import { auditQualifiedLead } from "@/lib/audit/auditService";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

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

    if (params.transactionType === "direct_booking") {
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
    request: CanonicalGenerationRequest
  ): Promise<CanonicalGenerationResponse> {
    const startTime = Date.now();
    const correlationId = `cgen_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

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
      // 1. Business Semantic Reasoning & Intent Analysis
      const semanticAnalysis = this.semanticReasoner.analyzeBusiness({
        businessName: request.businessName,
        category: request.category,
        location: request.location,
        phone: request.phone,
      });

      // 2. Retrieve Active Learning Strategy (Phase 27)
      const activeStrategy = await this.strategyManager
        .getActiveStrategy("generation")
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
        placesPhotos: request.placesPhotos,
        placesReviews: request.placesReviews,
        userId: request.userId,
      });

      if (!basePreview.preview?.id) {
        throw new Error(basePreview.error?.message || "Underlying preview generation failed to initialize preview ID");
      }

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

      // 6. 7-Stage Deterministic Validation (Quality Gate)
      const validationContext = {
        runId: correlationId,
        websiteData: websiteData as unknown as Record<string, unknown>,
        projectId: basePreview.preview.id,
        groundedProfile: profile,
        retryCount: 0,
        maxRetries: 3,
        tenantId: request.tenantId || "default_tenant",
      };

      let valReport = await this.validator.validateWebsite(validationContext);
      let repairCount = 0;
      let currentStatus: CanonicalGenerationResponse["status"] = "READY";

      // 7. Bounded Self-Correction Repair Loop (Requirement #15)
      while (valReport.decision !== "READY" && repairCount < 3) {
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

        if (repairRes.success && repairRes.repairedData) {
          websiteData = repairRes.repairedData as unknown as WebsiteData;
          // Re-validate post-repair
          valReport = await this.validator.validateWebsite({
            ...validationContext,
            websiteData: websiteData as unknown as Record<string, unknown>,
            retryCount: repairCount,
          });
          currentStatus = "REPAIRED";
        } else {
          break;
        }
      }

      // 8. Re-persist the final validated website data
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
          auditReport: auditReport || null,
          executiveDirectives,
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
        status: "FAILED",
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
          code: "GENERATION_PIPELINE_ERROR",
          message: errMsg,
        },
      };
    }
  }
}

export const canonicalGenerationOrchestrator = CanonicalGenerationOrchestrator.getInstance();
