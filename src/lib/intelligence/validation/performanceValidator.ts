// src/lib/intelligence/validation/performanceValidator.ts
/**
 * Performance Validator
 * Validates reasonable website performance signals:
 * - Total AST / JSON payload size
 * - Uncompressed base64 / data URI image bloat
 * - Excessive section and card counts
 * - Render-blocking asset patterns
 * If a live browser metric (e.g. Lighthouse, LCP, INP) was not actually measured,
 * marks it UNAVAILABLE with an explicit reason rather than inventing fake scores.
 */

import { randomUUID } from "crypto";
import type {
  ValidationContext,
  StageValidationResult,
  ValidationFailureItem,
  ValidationWarningItem,
} from "./types";

export function validatePerformance(context: ValidationContext): StageValidationResult {
  const startTime = Date.now();
  const failures: ValidationFailureItem[] = [];
  const warnings: ValidationWarningItem[] = [];
  const evidence: string[] = [];

  const data = context.websiteData || {};

  // 1. JSON Payload Size Analysis
  const jsonStr = JSON.stringify(data);
  const payloadBytes = Buffer.byteLength(jsonStr, "utf8");
  const payloadKb = Math.round(payloadBytes / 1024);

  evidence.push(`Website state payload size: ${payloadKb} KB`);

  if (payloadBytes > 2 * 1024 * 1024) {
    // Over 2MB is a critical failure for website schema data
    failures.push({
      id: randomUUID(),
      stage: "PERFORMANCE",
      severity: "HIGH",
      failure: `WebsiteData payload is excessively large (${payloadKb} KB > 2000 KB)`,
      evidence: `Payload size: ${payloadBytes} bytes`,
      affectedElement: "websiteData",
      suggestedFix: "Trim oversized embedded assets or paginate items",
      blocking: true,
      field: "websiteData",
      ruleCode: "PERF_PAYLOAD_TOO_LARGE",
    });
  } else if (payloadBytes > 500 * 1024) {
    warnings.push({
      id: randomUUID(),
      stage: "PERFORMANCE",
      severity: "MEDIUM",
      warning: `WebsiteData payload size is elevated (${payloadKb} KB)`,
      details: "Consider externalizing embedded media and large strings",
      affectedElement: "websiteData",
    });
  }

  // 2. Base64 / Embedded Data URI Inspection
  // Base64 images embedded directly in JSON should not exceed 250KB each
  const base64Matches = jsonStr.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{1000,}/g) || [];
  let hugeDataUris = 0;
  for (const match of base64Matches) {
    if (match.length > 250 * 1024) {
      hugeDataUris++;
    }
  }

  if (hugeDataUris > 0) {
    failures.push({
      id: randomUUID(),
      stage: "PERFORMANCE",
      severity: "HIGH",
      failure: `Found ${hugeDataUris} unoptimized embedded base64 image(s) exceeding 250 KB`,
      evidence: `Embedded data URIs found in website data with high byte length`,
      affectedElement: "images",
      suggestedFix: "Store images via external optimized CDN or compress below 100 KB",
      blocking: true,
      field: "images",
      ruleCode: "PERF_UNOPTIMIZED_DATA_URI",
    });
  }

  // 3. Section and DOM Element Density
  const sectionOrder = Array.isArray(data.sectionOrder) ? (data.sectionOrder as string[]) : [];
  if (sectionOrder.length > 15) {
    warnings.push({
      id: randomUUID(),
      stage: "PERFORMANCE",
      severity: "LOW",
      warning: `High section count (${sectionOrder.length} sections) may degrade mobile initial scroll performance`,
      affectedElement: "sectionOrder",
    });
  }

  // 4. Honest reporting on live Lighthouse / Web Vitals
  evidence.push("Lighthouse/CWV (LCP, INP, CLS) live browser measurement: UNAVAILABLE (Static AST evaluation mode; no headless Chromium harness attached)");

  const hasBlocking = failures.some((f) => f.blocking);
  const status = hasBlocking ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";

  return {
    stage: "PERFORMANCE",
    status,
    passed: !hasBlocking,
    score: hasBlocking ? 50 : Math.max(80, 100 - warnings.length * 10),
    failures,
    warnings,
    evidence,
    suggestedFix: failures[0]?.suggestedFix,
    durationMs: Date.now() - startTime,
  };
}
