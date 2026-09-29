// src/lib/discovery/discoveryService.ts
/**
 * Business Discovery & Lead Qualification Orchestrator
 * Phase: Phase 8 (Business Discovery + Lead Qualification)
 *
 * Coordinates the entire discovery lifecycle:
 *   Criteria Validation -> Provider Search -> Normalization ->
 *   Deduplication -> Website Presence -> Qualification ->
 *   Opportunity Scoring -> Persistence -> Telemetry
 */

import crypto from "crypto";
import type {
  DiscoveryCriteria,
  DiscoveryResponse,
  BusinessLead,
} from "./types";
import { providerRegistry } from "./providers/registry";
import {
  normalizeBusinessName,
  normalizePhoneNumber,
  normalizeWebsiteDomain,
  normalizeCategory,
} from "./normalizer";
import { deduplicateBatch } from "./deduplicator";
import { checkWebsitePresence } from "./websitePresence";
import { qualifyBusinessLead } from "./qualificationEngine";
import { calculateOpportunityScore } from "./opportunityEngine";
import { leadRepository } from "./leadRepository";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

export class DiscoveryValidationError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code = "DISCOVERY_INVALID_QUERY", statusCode = 400) {
    super(message);
    this.name = "DiscoveryValidationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Validates discovery input criteria against safety limits
 */
export function validateDiscoveryCriteria(criteria: unknown): DiscoveryCriteria {
  if (!criteria || typeof criteria !== "object") {
    throw new DiscoveryValidationError("Request body must be a JSON object");
  }

  const c = criteria as Record<string, unknown>;

  const query = typeof c.query === "string" ? c.query.trim() : "";
  if (!query) {
    throw new DiscoveryValidationError("Field 'query' is required and cannot be blank", "DISCOVERY_INVALID_QUERY");
  }

  const location = typeof c.location === "string" ? c.location.trim() : "";
  if (!location) {
    throw new DiscoveryValidationError("Field 'location' is required and cannot be blank", "DISCOVERY_INVALID_LOCATION");
  }

  let limit = 20;
  if (c.limit !== undefined) {
    const parsedLimit = Number(c.limit);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      throw new DiscoveryValidationError("Field 'limit' must be a positive integer", "DISCOVERY_LIMIT_EXCEEDED");
    }
    if (parsedLimit > 50) {
      throw new DiscoveryValidationError("Field 'limit' cannot exceed maximum allowed of 50", "DISCOVERY_LIMIT_EXCEEDED");
    }
    limit = parsedLimit;
  }

  let radiusKm: number | undefined = undefined;
  if (c.radiusKm !== undefined) {
    const parsedRadius = Number(c.radiusKm);
    if (isNaN(parsedRadius) || parsedRadius < 1 || parsedRadius > 100) {
      throw new DiscoveryValidationError("Field 'radiusKm' must be between 1 and 100", "DISCOVERY_INVALID_QUERY");
    }
    radiusKm = parsedRadius;
  }

  let categories: string[] | undefined = undefined;
  if (c.categories !== undefined) {
    if (!Array.isArray(c.categories)) {
      throw new DiscoveryValidationError("Field 'categories' must be an array of strings", "DISCOVERY_INVALID_QUERY");
    }
    categories = c.categories.filter((cat): cat is string => typeof cat === "string" && cat.trim().length > 0);
  }

  return {
    query,
    location,
    limit,
    radiusKm,
    categories,
    provider: typeof c.provider === "string" ? c.provider.trim() : undefined,
    minRating: typeof c.minRating === "number" ? c.minRating : undefined,
  };
}

/**
 * Executes end-to-end discovery and qualification
 */
export async function executeDiscoveryRun(
  rawCriteria: unknown,
  userId?: string
): Promise<DiscoveryResponse> {
  const startTime = Date.now();
  const criteria = validateDiscoveryCriteria(rawCriteria);
  const runId = `run_disc_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

  emitAgentEvent({
    event: "business.discovery.started",
    agent: "n8n_automation",
    requestId: runId,
    metadata: {
      query: criteria.query,
      location: criteria.location,
      limit: criteria.limit,
      provider: criteria.provider || "local_deterministic",
    },
  });

  // 1. Get Provider and Fetch Records
  const provider = providerRegistry.getProvider(criteria.provider);

  emitAgentEvent({
    event: "business.discovery.provider_call",
    agent: "n8n_automation",
    requestId: runId,
    provider: provider.id,
    metadata: { providerName: provider.name },
  });

  let rawRecords;
  try {
    rawRecords = await provider.search(criteria);
    emitAgentEvent({
      event: "business.discovery.provider_success",
      agent: "n8n_automation",
      requestId: runId,
      provider: provider.id,
      metadata: { count: rawRecords.length },
    });
  } catch (err: unknown) {
    emitAgentEvent({
      event: "business.discovery.provider_error",
      agent: "n8n_automation",
      requestId: runId,
      provider: provider.id,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  // 2. Normalization & Lead Skeleton Construction
  const unverifiedLeads: BusinessLead[] = [];
  for (const raw of rawRecords) {
    const normalizedName = normalizeBusinessName(raw.name);
    const normalizedPhone = normalizePhoneNumber(raw.phone);
    const normalizedDomain = normalizeWebsiteDomain(raw.website);
    const { category, industry } = normalizeCategory(raw.category, raw.description);

    const leadId = `lead_${crypto
      .createHash("sha256")
      .update(`${raw.source}:${raw.sourceId}:${normalizedName}`)
      .digest("hex")
      .slice(0, 12)}`;

    unverifiedLeads.push({
      leadId,
      businessName: raw.name,
      normalizedName,
      category,
      industry,
      description: raw.description,
      address: raw.address,
      city: raw.city || criteria.location.split(",")[0].trim(),
      state: raw.state,
      country: raw.country || "India",
      postalCode: raw.postalCode,
      latitude: raw.latitude,
      longitude: raw.longitude,
      phone: raw.phone,
      normalizedPhone,
      email: raw.email,
      website: raw.website,
      normalizedDomain,
      websiteStatus: "missing", // updated in next step
      socialLinks: raw.socialLinks,
      rating: raw.rating,
      reviewCount: raw.reviewCount,
      source: raw.source,
      sourceId: raw.sourceId,
      discoveredAt: new Date().toISOString(),
      qualificationStatus: "NEEDS_REVIEW",
      leadStatus: "DISCOVERED",
      qualificationScore: 0,
      opportunityScore: 0,
      reasonCodes: [],
      opportunityReasons: [],
      notes: [],
      metadata: raw.rawMetadata,
    });
  }

  emitAgentEvent({
    event: "business.discovery.normalized",
    agent: "n8n_automation",
    requestId: runId,
    metadata: { count: unverifiedLeads.length },
  });

  // 3. Deduplication against both current batch and existing repository leads
  const existingLeads = await leadRepository.getAllLeadsForUser(userId);
  const { allProcessed, duplicateLeads } = deduplicateBatch(unverifiedLeads, existingLeads);

  if (duplicateLeads.length > 0) {
    emitAgentEvent({
      event: "business.discovery.duplicate",
      agent: "n8n_automation",
      requestId: runId,
      metadata: {
        duplicateCount: duplicateLeads.length,
        duplicateIds: duplicateLeads.map((d) => d.leadId),
      },
    });
  }

  // 4. Website Presence, Qualification & Opportunity Scoring
  const completedLeads: BusinessLead[] = [];

  for (const lead of allProcessed) {
    // If already marked as duplicate, skip live HTTP checks
    if (lead.leadStatus === "DUPLICATE") {
      completedLeads.push(lead);
      continue;
    }

    // A. Website Presence Check
    const presence = await checkWebsitePresence(lead.website);
    lead.websiteStatus = presence.status;

    // B. Qualification
    const isClosed = rawRecords.find((r) => r.sourceId === lead.sourceId)?.isPermanentlyClosed;
    const qual = qualifyBusinessLead({ ...lead, isPermanentlyClosed: isClosed });
    lead.qualificationScore = qual.score;
    lead.qualificationStatus = qual.status;
    lead.reasonCodes = qual.reasonCodes;

    // Set lead lifecycle status
    if (qual.status === "QUALIFIED") {
      lead.leadStatus = "QUALIFIED";
      emitAgentEvent({
        event: "business.qualification.completed",
        agent: "n8n_automation",
        requestId: runId,
        metadata: { leadId: lead.leadId, score: qual.score },
      });
    } else if (qual.status === "DISQUALIFIED") {
      lead.leadStatus = "DISQUALIFIED";
      emitAgentEvent({
        event: "business.qualification.disqualified",
        agent: "n8n_automation",
        requestId: runId,
        metadata: { leadId: lead.leadId, score: qual.score, reasons: qual.reasonCodes },
      });
    } else {
      lead.leadStatus = "NEEDS_REVIEW";
    }

    // C. Opportunity Scoring
    const opp = calculateOpportunityScore({ ...lead, isPermanentlyClosed: isClosed });
    lead.opportunityScore = opp.score;
    lead.opportunityReasons = opp.reasons;

    completedLeads.push(lead);
  }

  // 5. Persist Leads to Storage
  await leadRepository.saveLeads(completedLeads, userId);

  for (const lead of completedLeads) {
    emitAgentEvent({
      event: "business.lead.created",
      agent: "n8n_automation",
      requestId: runId,
      metadata: {
        leadId: lead.leadId,
        businessName: lead.businessName,
        status: lead.leadStatus,
        qualificationScore: lead.qualificationScore,
        opportunityScore: lead.opportunityScore,
      },
    });
  }

  const durationMs = Date.now() - startTime;
  const qualifiedLeads = completedLeads.filter((l) => l.qualificationStatus === "QUALIFIED");
  const disqualifiedLeads = completedLeads.filter((l) => l.qualificationStatus === "DISQUALIFIED");
  const needsReviewLeads = completedLeads.filter((l) => l.qualificationStatus === "NEEDS_REVIEW");

  return {
    success: true,
    runId,
    summary: {
      runId,
      query: criteria.query,
      location: criteria.location,
      discovered: rawRecords.length,
      newLeads: completedLeads.length - duplicateLeads.length,
      duplicates: duplicateLeads.length,
      qualified: qualifiedLeads.length,
      disqualified: disqualifiedLeads.length,
      needsReview: needsReviewLeads.length,
      durationMs,
      provider: provider.id,
    },
    leads: completedLeads,
    qualifiedLeads,
  };
}
