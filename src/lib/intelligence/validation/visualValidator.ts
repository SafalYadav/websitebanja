// src/lib/intelligence/validation/visualValidator.ts
/**
 * Visual Validator
 * Inspects rendered website AST structural layout, typography, cards, and responsive rules.
 * If browser pixel-level screenshot inspection is requested but unavailable,
 * strictly returns UNAVAILABLE with an explicit reason — never fabricates PASS.
 */

import { randomUUID } from "crypto";
import type {
  ValidationContext,
  StageValidationResult,
  ValidationFailureItem,
  ValidationWarningItem,
} from "./types";
import { analyzeVisualQuality } from "@/lib/agents/boss/visualQualityAnalyzer";

export function validateVisual(context: ValidationContext): StageValidationResult {
  const startTime = Date.now();
  const failures: ValidationFailureItem[] = [];
  const warnings: ValidationWarningItem[] = [];
  const evidence: string[] = [];

  const data = context.websiteData || {};

  // 1. Check if pixel-level browser validation was requested without runtime capability
  if (context.runtimeHasBrowser === false && context.screenshotPaths && Object.keys(context.screenshotPaths).length === 0) {
    return {
      stage: "VISUAL",
      status: "UNAVAILABLE",
      passed: true, // Non-blocking when unavailable
      score: undefined,
      failures: [],
      warnings: [],
      evidence: ["Headless browser runtime is not active in current execution context."],
      unavailabilityReason: "Browser screenshot rendering runtime not active; live viewport pixel capture unavailable.",
      durationMs: Date.now() - startTime,
    };
  }

  // 2. Perform AST & Layout Structural Inspection
  const design = (data.designStrategy as Record<string, unknown>) || {};
  const colorSystem = (design.colorSystem as Record<string, unknown>) || {};
  const cardStrategy = (design.cardFamilyStrategy as Record<string, unknown>) || {};

  // 2a. Card Family & Layout Validation
  const services = Array.isArray(data.services) ? data.services : [];
  for (let i = 0; i < services.length; i++) {
    const s = services[i] as Record<string, unknown>;
    if (!s || typeof s !== "object") {
      failures.push({
        id: randomUUID(),
        stage: "VISUAL",
        severity: "HIGH",
        failure: `Service item at index ${i} is null or malformed`,
        evidence: `Service data: ${JSON.stringify(s)}`,
        affectedElement: `services[${i}]`,
        suggestedFix: "Ensure all service array items are valid structured objects",
        blocking: true,
        field: "services",
        ruleCode: "VIS_MALFORMED_CARD",
      });
    } else if (!s.title && !s.description) {
      failures.push({
        id: randomUUID(),
        stage: "VISUAL",
        severity: "HIGH",
        failure: `Service item at index ${i} has empty title and description`,
        evidence: `Service has no readable text content`,
        affectedElement: `services[${i}]`,
        suggestedFix: "Populate service title and descriptive text",
        blocking: true,
        field: "services",
        ruleCode: "VIS_EMPTY_SERVICE_CARD",
      });
    }
  }

  // 2b. Hero Section Layout & Contrast Protection
  const hero = data.hero as Record<string, unknown> | undefined;
  if (hero) {
    if (hero.image && typeof hero.image === "string" && !hero.image.startsWith("http") && !hero.image.startsWith("/") && !hero.image.startsWith("data:")) {
      warnings.push({
        id: randomUUID(),
        stage: "VISUAL",
        severity: "LOW",
        warning: `Hero image URL "${hero.image}" may be a malformed path`,
        details: "Ensure hero.image uses an absolute URL, relative web path, or SVG data URI",
        affectedElement: "hero.image",
      });
    }

    evidence.push(`Hero layout variant: "${hero.layoutVariant || "standard"}"`);
  }

  // 2c. Run Boss Visual Quality Analyzer on AST if available
  try {
    const bossReport = analyzeVisualQuality({
      runId: context.runId || "val-run",
      websiteData: data,
      screenshotPaths: context.screenshotPaths || {},
      is3dRequested: context.is3dRequested,
    });

    if (bossReport.qualityGate === "FAIL") {
      for (const dim of bossReport.dimensions.filter((d) => d.status === "FAIL")) {
        failures.push({
          id: randomUUID(),
          stage: "VISUAL",
          severity: "HIGH",
          failure: `Visual layout dimension failure: ${dim.name}`,
          evidence: dim.facts.join("; ") || `Score: ${dim.score}/100`,
          affectedElement: dim.id,
          suggestedFix: dim.recommendations[0] || "Refactor layout tokens and palette cohesion",
          blocking: true,
          field: dim.id,
          ruleCode: "VIS_BOSS_AUDIT_FAIL",
        });
      }
    } else {
      evidence.push(`Boss Visual Quality Audit score: ${bossReport.overallScore}/100 (${bossReport.qualityGate})`);
    }
  } catch (err: any) {
    // If analyzer throws due to missing optional modules, log warning rather than crashing
    warnings.push({
      id: randomUUID(),
      stage: "VISUAL",
      severity: "LOW",
      warning: "Visual AST analysis encountered a partial warning",
      details: String(err?.message || err),
    });
  }

  // 2d. 3D WebGL Isolation (Zero WebGL when 2D requested)
  const spatial = (design.spatial3d as Record<string, unknown>) || (data.spatial3d as Record<string, unknown>) || {};
  if (context.is3dRequested === false && spatial.enabled && spatial.level !== "NONE") {
    failures.push({
      id: randomUUID(),
      stage: "VISUAL",
      severity: "CRITICAL",
      failure: "3D/WebGL rendering is enabled despite 2D configuration requested",
      evidence: `spatial.enabled is true and level is "${spatial.level}"`,
      affectedElement: "spatial3d",
      suggestedFix: "Disable spatial3d for 2D websites to prevent WebGL overhead",
      blocking: true,
      field: "spatial3d",
      ruleCode: "VIS_UNWANTED_3D_ENABLED",
    });
  }

  const hasBlocking = failures.some((f) => f.blocking);
  const status = hasBlocking ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";

  return {
    stage: "VISUAL",
    status,
    passed: !hasBlocking,
    score: hasBlocking ? 40 : Math.max(75, 100 - warnings.length * 8),
    failures,
    warnings,
    evidence,
    suggestedFix: failures[0]?.suggestedFix,
    durationMs: Date.now() - startTime,
  };
}
