// src/lib/discovery/deduplicator.ts
/**
 * Deterministic Lead Deduplication Engine
 * Phase: Phase 8 (Business Discovery + Lead Qualification)
 *
 * Prevents multiple records for the same physical/commercial business across discovery runs.
 * Evaluates:
 *   1. Normalized Source ID (source:sourceId)
 *   2. Normalized Phone number (canonical E.164)
 *   3. Normalized Domain (canonical root domain)
 *   4. Normalized Business Name + Location / City similarity
 */

import type { BusinessLead } from "./types";

/**
 * Calculates string similarity using Levenshtein Distance (0.0 to 1.0)
 */
export function calculateStringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const longer = s1.length >= s2.length ? s1 : s2;
  const shorter = s1.length < s2.length ? s1 : s2;

  if (longer.length === 0) return 1.0;

  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    costs[i] = i;
  }

  for (let i = 1; i <= shorter.length; i++) {
    let nw = costs[0];
    costs[0] = i;
    for (let j = 1; j <= longer.length; j++) {
      const cj = Math.min(
        1 + Math.min(costs[j], costs[j - 1]),
        shorter[i - 1] === longer[j - 1] ? nw : nw + 1
      );
      nw = costs[j];
      costs[j] = cj;
    }
  }

  return (longer.length - costs[longer.length]) / longer.length;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  duplicateOf?: string;
  matchReason?: string;
  matchedField?: "source_id" | "phone" | "domain" | "name_and_location";
}

/**
 * Checks if a candidate lead matches any existing lead in the target pool.
 */
export function findDuplicateInPool(
  candidate: BusinessLead,
  pool: BusinessLead[]
): DuplicateDetectionResult {
  for (const existing of pool) {
    if (existing.leadId === candidate.leadId) continue;

    // 1. Exact Source Identity match
    if (
      candidate.source &&
      candidate.sourceId &&
      candidate.source === existing.source &&
      candidate.sourceId === existing.sourceId
    ) {
      return {
        isDuplicate: true,
        duplicateOf: existing.leadId,
        matchReason: `Exact source record match (${candidate.source}:${candidate.sourceId})`,
        matchedField: "source_id",
      };
    }

    // 2. Canonical Phone match
    if (
      candidate.normalizedPhone &&
      existing.normalizedPhone &&
      candidate.normalizedPhone === existing.normalizedPhone
    ) {
      return {
        isDuplicate: true,
        duplicateOf: existing.leadId,
        matchReason: `Matching telephone number (${candidate.normalizedPhone})`,
        matchedField: "phone",
      };
    }

    // 3. Canonical Domain match
    if (
      candidate.normalizedDomain &&
      existing.normalizedDomain &&
      candidate.normalizedDomain === existing.normalizedDomain
    ) {
      return {
        isDuplicate: true,
        duplicateOf: existing.leadId,
        matchReason: `Matching website domain (${candidate.normalizedDomain})`,
        matchedField: "domain",
      };
    }

    // 4. Normalized Business Name + Location / City similarity
    if (candidate.normalizedName && existing.normalizedName) {
      const nameSim = calculateStringSimilarity(
        candidate.normalizedName,
        existing.normalizedName
      );

      // Check if location or city matches
      const candCity = (candidate.city || "").toLowerCase().trim();
      const existCity = (existing.city || "").toLowerCase().trim();
      const cityMatches = candCity && existCity && (candCity === existCity || candCity.includes(existCity) || existCity.includes(candCity));

      // If exact normalized name match and city matches
      if (candidate.normalizedName === existing.normalizedName && cityMatches) {
        return {
          isDuplicate: true,
          duplicateOf: existing.leadId,
          matchReason: `Identical business name in ${candCity}`,
          matchedField: "name_and_location",
        };
      }

      // If high similarity (> 0.88) and city matches
      if (nameSim >= 0.88 && cityMatches) {
        return {
          isDuplicate: true,
          duplicateOf: existing.leadId,
          matchReason: `High name similarity (${Math.round(nameSim * 100)}%) in ${candCity}`,
          matchedField: "name_and_location",
        };
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Deduplicates a list of leads, marking duplicates with leadStatus="DUPLICATE",
 * attaching duplicateOf pointer and explanation notes, while preserving non-duplicates.
 */
export function deduplicateBatch(
  incoming: BusinessLead[],
  existingPool: BusinessLead[] = []
): { uniqueLeads: BusinessLead[]; duplicateLeads: BusinessLead[]; allProcessed: BusinessLead[] } {
  const masterPool: BusinessLead[] = [...existingPool];
  const uniqueLeads: BusinessLead[] = [];
  const duplicateLeads: BusinessLead[] = [];
  const allProcessed: BusinessLead[] = [];

  for (const lead of incoming) {
    const dupResult = findDuplicateInPool(lead, masterPool);

    if (dupResult.isDuplicate) {
      const markedLead: BusinessLead = {
        ...lead,
        leadStatus: "DUPLICATE",
        qualificationStatus: "DISQUALIFIED",
        duplicateOf: dupResult.duplicateOf,
        reasonCodes: [...lead.reasonCodes, "DUPLICATE_LEAD"],
        notes: [
          ...(lead.notes || []),
          `Duplicate detected: ${dupResult.matchReason} (Original: ${dupResult.duplicateOf})`,
        ],
      };
      duplicateLeads.push(markedLead);
      allProcessed.push(markedLead);
    } else {
      uniqueLeads.push(lead);
      allProcessed.push(lead);
      masterPool.push(lead);
    }
  }

  return { uniqueLeads, duplicateLeads, allProcessed };
}
