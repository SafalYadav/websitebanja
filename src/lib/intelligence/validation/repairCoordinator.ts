// src/lib/intelligence/validation/repairCoordinator.ts
/**
 * Repair Coordinator & Bounded Regeneration Engine
 * Applies evidence-preserving deterministic edits only. Independent employee
 * review belongs to the canonical generation pipeline, not synthetic task results.
 */

import crypto from "crypto";
import { randomUUID } from "crypto";
import type {
  ValidationReport,
  ValidationFailureItem,
  RepairInstruction,
  RepairResult,
  ValidationContext,
  CeoValidationAlert,
} from "./types";
import { placeContactAtEnd } from "../planning/sectionOrder";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

export class RepairCoordinator {
  private static instance: RepairCoordinator;

  private constructor() {}

  public static getInstance(): RepairCoordinator {
    if (!RepairCoordinator.instance) {
      RepairCoordinator.instance = new RepairCoordinator();
    }
    return RepairCoordinator.instance;
  }

  /**
   * Computes a deterministic fingerprint of a set of failures for loop detection.
   */
  public computeFailureFingerprint(failures: ValidationFailureItem[]): string {
    if (!failures || failures.length === 0) return "no_failures";
    const sigs = failures
      .map((f) => `${f.stage}:${f.ruleCode || f.failure}:${f.affectedElement}`)
      .sort()
      .join("|");
    return crypto.createHash("sha256").update(sigs).digest("hex").slice(0, 16);
  }

  /**
   * Detects the first repeated failure signature.
   */
  public detectLoop(currentFingerprint: string, previousFingerprints: string[] = []): boolean {
    if (!previousFingerprints || previousFingerprints.length === 0) return false;
    // Stop on the first repeated signature, not after another identical retry.
    const occurrences = previousFingerprints.filter((fp) => fp === currentFingerprint).length;
    return occurrences >= 1;
  }

  /**
   * Plans targeted repair instructions for blocking failures.
   */
  public planRepairs(report: ValidationReport, _websiteData: Record<string, unknown>): RepairInstruction[] {
    const instructions: RepairInstruction[] = [];
    const blocking = report.blockingFailures;

    // Group failures by stage and element
    const stageGroups = new Map<string, ValidationFailureItem[]>();
    for (const f of blocking) {
      const group = stageGroups.get(f.stage) || [];
      group.push(f);
      stageGroups.set(f.stage, group);
    }

    for (const [stage, failures] of stageGroups.entries()) {
      const repairId = `repair_${stage.toLowerCase()}_${randomUUID().slice(0, 8)}`;
      let scope: "targeted" | "full_regeneration" = "targeted";

      // If structural failure (e.g. missing sectionOrder or hero entirely), requires broader regeneration
      if (failures.some((f) => f.ruleCode === "SEM_TOO_FEW_SECTIONS" || f.ruleCode === "SEM_MISSING_HERO")) {
        scope = "full_regeneration";
      }

      instructions.push({
        repairId,
        validationId: report.validationId,
        projectId: report.projectId,
        stage: stage as any,
        scope,
        reason: `Stage ${stage} failed with ${failures.length} blocking issues: ${failures.map((f) => f.failure).join("; ")}`,
        instruction: failures.map((f) => f.suggestedFix).join(". "),
        blockingFailures: failures,
      });
    }

    return instructions;
  }

  /**
   * Executes bounded deterministic repair without impersonating an employee review.
   */
  public async executeRepair(
    context: ValidationContext,
    report: ValidationReport
  ): Promise<RepairResult> {
    const startTime = Date.now();
    const repairId = `rep_${randomUUID().slice(0, 8)}`;
    const appliedPatches: string[] = [];
    const patchedData: Record<string, any> = JSON.parse(JSON.stringify(context.websiteData || {}));

    emitAgentEvent({
      agent: "repair_coordinator",
      event: "agent.started",
      status: "running",
      metadata: {
        action: "validation_repair_started",
        validationId: report.validationId,
        projectId: context.projectId,
        blockingCount: report.blockingFailures.length,
        retryCount: context.retryCount || 0,
        tenantId: context.tenantId,
      },
      projectId: context.projectId,
    });


    try {
      if (!context.semanticProfile?.domain || ["general", "general_commercial", "unknown"].includes(context.semanticProfile.domain) ||
        !Number.isFinite(context.semanticProfile.confidence) || context.semanticProfile.confidence < 0.7) {
        throw new Error("Repair requires a resolved approved semantic profile; research or specialist review required");
      }
      if ((context.retryCount || 0) > 1 || report.isLoopDetected) throw new Error("Repair limit or repeated failure signature reached");
      // 1. Apply targeted patches for each blocking failure
      for (const failure of report.blockingFailures) {
        const patchDesc = this.applyTargetedPatch(patchedData, failure, context);
        if (patchDesc) {
          appliedPatches.push(patchDesc);
        }
      }

      // Deterministic edits are not an independent Boss review. The canonical
      // publication pipeline must perform the real review after revalidation.
      if (!appliedPatches.length) throw new Error("No evidence-preserving deterministic repair is available; specialist regeneration required");

      emitAgentEvent({
        agent: "repair_coordinator",
        event: "agent.completed",
        status: "success",
        metadata: {
          action: "validation_repair_completed",
          repairId,
          appliedPatchesCount: appliedPatches.length,
          durationMs: Date.now() - startTime,
          tenantId: context.tenantId,
        },
        projectId: context.projectId,
      });

      return {
        repairId,
        validationId: report.validationId,
        projectId: context.projectId,
        success: true,
        repairedData: patchedData,
        appliedPatches,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      emitAgentEvent({
        agent: "repair_coordinator",
        event: "agent.failed",
        status: "error",
        error: String(err?.message || err),
        metadata: {
          action: "validation_repair_failed",
          tenantId: context.tenantId,
        },
        projectId: context.projectId,
      });


      return {
        repairId,
        validationId: report.validationId,
        projectId: context.projectId,
        success: false,
        repairedData: context.websiteData,
        appliedPatches,
        error: String(err?.message || err),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Applies deterministic targeted repair patch based on failure rule code.
   */
  private applyTargetedPatch(
    data: Record<string, any>,
    failure: ValidationFailureItem,
    context: ValidationContext
  ): string | null {
    const grounded = context.groundedProfile;
    const verifiedName =
      grounded?.identity?.canonicalName ||
      context.businessName ||
      data.businessName;

    switch (failure.ruleCode) {
      // 1. Semantic Repairs
      case "SEM_MISSING_BUSINESS_NAME":
      case "SEM_GROUNDED_NAME_CONTRADICTION": {
        if (typeof verifiedName !== "string" || !verifiedName.trim()) return null;
        data.businessName = verifiedName;
        if (!data.brand) data.brand = {};
        data.brand.name = verifiedName;
        return `Corrected business name to "${verifiedName}"`;
      }

      case "SEM_GROUNDED_ARCHETYPE_CONTRADICTION": {
        if (context.semanticProfile?.domain) {
          if (!data.brand) data.brand = {};
          data.brand.industry = context.semanticProfile.domain;
          data.category = context.semanticProfile.domain;
          return "Realigned industry to the approved semantic profile";
        }
        return null;
      }

      case "SEM_GROUNDED_LOCATION_CONTRADICTION": {
        if (grounded?.location?.city) {
          if (!data.contact) data.contact = {};
          data.contact.address =
            grounded.location.formattedAddress ||
            grounded.location.city;
          return `Updated contact address to Grounded BI location "${data.contact.address}"`;
        }
        return null;
      }

      case "SEM_TOO_FEW_SECTIONS":
      case "SEM_MISSING_HERO":
      case "SEM_FORBIDDEN_BOILERPLATE_TEXT":
      case "SEM_LEAKED_INTERNAL_SLOGANS":
      case "A11Y_MISSING_H1":
        return null; // Requires accountable specialist content/layout regeneration.

      case "SEM_MISSING_CONTACT_SECTION": {
        if (!grounded?.identity?.phone && !grounded?.location?.formattedAddress) return null;
        data.contact = {
          phone: grounded?.identity?.phone,
          email: undefined,
          address: grounded?.location?.formattedAddress,
        };
        return "Added contact section with contact details";
      }


      case "SEM_FABRICATED_CONTACT_DATA": {
        if (data.contact) {
          if (data.contact.phone && String(data.contact.phone).includes("98250")) {
            data.contact.phone = grounded?.identity?.phone || undefined;
          }
          if (data.contact.email && String(data.contact.email).includes("websitebanja.local")) {
            data.contact.email = undefined;
          }
        }
        return "Sanitized fabricated phone/email from contact information";
      }

      case "SEM_CITY_LEAK_CONTRADICTION": {
        const targetCity = grounded?.location?.city || context.businessLocation || "";
        let jsonStr = JSON.stringify(data);
        jsonStr = jsonStr.replace(/\bvadodara\b/gi, targetCity || "the local area");
        const repairedObj = JSON.parse(jsonStr);
        Object.assign(data, repairedObj);
        return `Replaced leaked city references with verified location "${targetCity}"`;
      }

      case "SEM_DUPLICATE_CONTACT_SECTIONS": {
        if (Array.isArray(data.sectionOrder)) {
          let hasFoundContact = false;
          data.sectionOrder = data.sectionOrder.filter((s: string) => {
            const isContact = ["contact", "booking", "reservation", "inquiry", "appointment", "lead_capture", "get_in_touch"].includes(s.toLowerCase().trim());
            if (isContact) {
              if (hasFoundContact) return false;
              hasFoundContact = true;
            }
            return true;
          });
          data.sectionOrder = placeContactAtEnd(data.sectionOrder);
        }
        return "Deduplicated redundant contact and booking sections into a single primary contact section";
      }

      case "SEM_CONTACT_NOT_LAST": {
        if (Array.isArray(data.sectionOrder)) {
          data.sectionOrder = placeContactAtEnd(data.sectionOrder);
          if (Array.isArray(data.pages)) {
            data.pages = data.pages.map((page: { sectionOrder?: string[] }) => ({
              ...page,
              sectionOrder: placeContactAtEnd(page.sectionOrder || data.sectionOrder),
            }));
          }
          return "Moved the contact/conversion section to the final position before the footer";
        }
        return null;
      }

      case "SEM_IRRELEVANT_DEVELOPER_IMAGE": {
        if (data.hero) {
          delete data.hero.image;
        }
        if (Array.isArray(data.features)) {
          data.features.forEach((f: any) => delete f.image);
        }
        return "Removed irrelevant software developer images in favor of neutral design layout";
      }

      case "SEM_SERVICE_INDUSTRY_MISMATCH": {
        if (!context.semanticProfile) return null;
        data.services = (grounded?.services || []).filter(service => service.isObserved && service.description)
          .map(service => ({ title: service.name, description: service.description }));
        return "Removed unsupported services; restored only observed offerings with grounded descriptions";
      }

      case "SEM_IMAGE_INDUSTRY_MISMATCH": {
        if (!context.semanticProfile) return null;
        if (data.hero) delete data.hero.image;
        if (data.about) delete data.about.image;
        for (const service of data.services || []) delete service.image;
        return "Removed contradictory imagery; preserved intentional non-photographic fallback";
      }

      // 2. CTA Repairs
      case "CTA_MISSING_PRIMARY":
      case "CTA_GENERIC_TEXT": {
        if (!data.hero) data.hero = {};
        if (!context.semanticProfile) return null;
        data.hero.button = context.semanticProfile.primaryCta.label;
        data.hero.buttonAction = {
          type: "scroll",
          target: "contact",
          label: context.semanticProfile.primaryCta.label,
        };
        return "Restored approved primary CTA targeting contact";
      }

      case "CTA_INDUSTRY_MISMATCH": {
        if (!context.semanticProfile) return null;
        const fixCta = context.semanticProfile.primaryCta.label;
        if (!data.hero) data.hero = {};
        data.hero.button = fixCta;
        if (data.hero.buttonAction) {
          data.hero.buttonAction.label = fixCta;
        }
        return `Realigned mismatched CTA to industry-appropriate copy "${fixCta}"`;
      }

      case "CTA_BROKEN_DESTINATION":
      case "CTA_TARGET_SECTION_NOT_FOUND": {
        if (data.hero && data.hero.buttonAction) {
          data.hero.buttonAction.type = "scroll";
          data.hero.buttonAction.target = "contact";
          return "Repointed broken CTA destination to '#contact'";
        }
        return null;
      }

      // 3. Navigation Repairs
      case "NAV_EMPTY_LINK_LABEL":
      case "NAV_MISSING_ACTION_TARGET":
      case "NAV_BROKEN_INTERNAL_ANCHOR": {
        if (data.navbar && Array.isArray(data.navbar.links)) {
          data.navbar.links = [
            { id: "nav-services", label: "Services", action: { type: "scroll", target: "services" } },
            { id: "nav-about", label: "About", action: { type: "scroll", target: "about" } },
            { id: "nav-contact", label: "Contact", action: { type: "scroll", target: "contact" } },
          ];
          return "Sanitized navbar links to point to verified section anchors";
        }
        return null;
      }

      case "NAV_MISSING_HOME_PAGE": {
        if (Array.isArray(data.pages)) {
          data.pages.unshift({
            id: "page-home",
            slug: "",
            title: "Home",
            isHome: true,
            sectionOrder: data.sectionOrder || ["hero", "services", "contact"],
          });
          return "Designated root home page (slug: '')";
        }
        return null;
      }

      // 4. Claims Repairs (Strip unsupported superlatives, awards, guarantees)
      case "CLM_UNSUPPORTED_AWARD":
      case "CLM_UNSUPPORTED_CERTIFICATION":
      case "CLM_FABRICATED_STATISTIC":
      case "CLM_UNSUPPORTED_EXPERIENCE_YEARS":
      case "CLM_UNSUPPORTED_GUARANTEE":
      case "CLM_FABRICATED_PARTNERSHIP":
      case "CLM_UNSUPPORTED_RANKING": {
        this.stripForbiddenClaimsFromData(data);
        return `Sanitized content to remove ungrounded claim (${failure.ruleCode})`;
      }

      // 5. Accessibility Repairs
      case "A11Y_EMPTY_BUTTON_LABEL": {
        if (data.hero) {
          data.hero.button = context.semanticProfile?.primaryCta.label;
          if (data.hero.buttonAction) data.hero.buttonAction.label = context.semanticProfile?.primaryCta.label;
          return "Added accessible button label to hero CTA";
        }
        return null;
      }

      // 6. Visual & 3D Repairs
      case "VIS_UNWANTED_3D_ENABLED": {
        if (data.spatial3d) data.spatial3d.enabled = false;
        if (data.designStrategy?.spatial3d) data.designStrategy.spatial3d.enabled = false;
        return "Disabled spatial3d WebGL rendering to satisfy 2D constraint";
      }

      default: {
        return null;
      }
    }
  }

  /**
   * Sanitizes text strings across website data removing common ungrounded phrases.
   */
  private stripForbiddenClaimsFromData(data: Record<string, any>): void {
    const sanitizeStr = (str: string): string => {
      return str
        .replace(/\b(award[- ]winning|won\s+the\s+.*award|best\s+[\w\s]{3,20}\s+202\d)\b/gi, "trusted")
        .replace(/\b(iso[- ]\d{4,5}|certified\s+by\s+the\s+board)\b/gi, "professional")
        .replace(/\b(\d{1,3}(,\d{3})*\+\s*(happy\s*clients|satisfied\s*customers|projects\s*completed))\b/gi, "our valued clients")
        .replace(/\b(100%\s*money[- ]back\s*guarantee|lifetime\s*warranty)\b/gi, "quality service")
        .replace(/\b(official\s+partner\s+of\s+(google|microsoft|apple|amazon))\b/gi, "industry standard")
        .replace(/\b(#[1|one]\s+rated|voted\s+#1)\b/gi, "highly recommended");
    };

    if (data.hero) {
      if (data.hero.title) data.hero.title = sanitizeStr(data.hero.title);
      if (data.hero.subtitle) data.hero.subtitle = sanitizeStr(data.hero.subtitle);
      if (Array.isArray(data.hero.badges)) data.hero.badges = data.hero.badges.map(sanitizeStr);
      if (Array.isArray(data.hero.trustBadges)) data.hero.trustBadges = data.hero.trustBadges.map(sanitizeStr);
    }
    if (data.about) {
      if (data.about.content) data.about.content = sanitizeStr(data.about.content);
      if (Array.isArray(data.about.highlights)) data.about.highlights = data.about.highlights.map(sanitizeStr);
    }
    if (Array.isArray(data.services)) {
      data.services.forEach((s: any) => {
        if (s.description) s.description = sanitizeStr(s.description);
      });
    }
  }

  /**
   * Formats a structured diagnostic alert for the CEO when validation fails or retries exhaust.
   */
  public createCeoAlert(report: ValidationReport): CeoValidationAlert {
    const failedStages = Object.entries(report.stageResults)
      .filter(([_, res]) => res.status === "FAIL")
      .map(([st]) => st as any);

    let highestSeverity = "LOW" as any;
    for (const f of report.blockingFailures) {
      if (f.severity === "CRITICAL") {
        highestSeverity = "CRITICAL";
        break;
      }
      if (f.severity === "HIGH") highestSeverity = "HIGH";
    }

    let recommendedAction = "Boss delegates targeted self-correction repair to specialized skill agent";
    if (report.isLoopDetected) {
      recommendedAction = "HALT_REPAIR_LOOP: Repeated failure signature detected. Escalate to CEO for human intervention.";
    } else if (report.remainingRetries <= 0) {
      recommendedAction = "EXHAUSTED_RETRIES: Maximum retry limit reached. Escalate to CEO for manual decision.";
    }

    return {
      alertId: `ceo_alert_${randomUUID().slice(0, 8)}`,
      projectId: report.projectId,
      validationId: report.validationId,
      runId: report.runId,
      tenantId: report.tenantId,
      decision: report.decision,
      failedStages,
      highestSeverity,
      blockingFailures: report.blockingFailures.map((f) => ({
        stage: f.stage,
        failure: f.failure,
        evidence: f.evidence,
        suggestedFix: f.suggestedFix,
        severity: f.severity,
      })),
      retryCount: report.retryCount,
      remainingRetries: report.remainingRetries,
      isLoopDetected: report.isLoopDetected,
      timestamp: new Date().toISOString(),
      recommendedAction,
    };
  }
}

export const repairCoordinator = RepairCoordinator.getInstance();
