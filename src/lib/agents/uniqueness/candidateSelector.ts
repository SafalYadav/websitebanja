// src/lib/agents/uniqueness/candidateSelector.ts
import { getPool } from "@/lib/db/queries";
import type { CandidateWebsite } from "./types";
import { extractDetailedDesignFingerprint } from "./fingerprint";

// In-memory bounded candidate cache for offline/dev environments (bounded to 20 items)
const localCandidateCache: CandidateWebsite[] = [];

export function recordLocalCandidate(candidate: CandidateWebsite): void {
  const existingIdx = localCandidateCache.findIndex((c) => c.id === candidate.id);
  if (existingIdx >= 0) {
    localCandidateCache[existingIdx] = candidate;
  } else {
    localCandidateCache.unshift(candidate);
    if (localCandidateCache.length > 20) {
      localCandidateCache.pop();
    }
  }
}

export function recordCandidateFromWebsite(
  id: string,
  businessName: string,
  category: string,
  websiteData: Record<string, unknown>
): void {
  const fp = extractDetailedDesignFingerprint(websiteData);
  recordLocalCandidate({
    id,
    businessName: businessName || "Generated Website",
    category,
    fingerprint: fp,
    sectionOrder: fp.sectionOrder,
    layoutType: fp.layoutType,
    primaryColor: fp.colorDirection,
    cardStyle: fp.cardStyle,
    images: fp.images,
  });
}

export function clearLocalCandidates(): void {
  localCandidateCache.length = 0;
}

export function getLocalCandidates(): CandidateWebsite[] {
  return [...localCandidateCache];
}

function getMatchingFromLocalCache(
  category: string,
  currentProjectId?: string,
  limit: number = 4
): CandidateWebsite[] {
  const matchingFromCache = localCandidateCache.filter((c) => {
    if (currentProjectId && c.id === currentProjectId) return false;
    if (category && category.trim()) {
      const catA = c.category.toLowerCase();
      const catB = category.trim().toLowerCase();
      return catA.includes(catB) || catB.includes(catA);
    }
    return true;
  });

  if (matchingFromCache.length > 0) {
    return matchingFromCache.slice(0, limit);
  }

  if (!category && localCandidateCache.length > 0) {
    return localCandidateCache
      .filter((c) => !currentProjectId || c.id !== currentProjectId)
      .slice(0, limit);
  }

  return [];
}

/**
 * Selects a bounded candidate set of relevant previous websites to compare against.
 * Performance guarantee: Queries at most `limit` rows using indexed category/updated_at filters.
 * Never executes full-database scans.
 */
export async function selectCandidateWebsites(
  category: string,
  currentProjectId?: string,
  limit: number = 4
): Promise<CandidateWebsite[]> {
  const candidates: CandidateWebsite[] = [];
  const boundedLimit = Math.min(Math.max(1, limit), 8); // hard bound between 1 and 8

  try {
    const pool = getPool();
    let query: string;
    let params: unknown[];

    if (category && category.trim()) {
      if (currentProjectId) {
        query = `
          SELECT id, business_name, category, design_fingerprint, json_data
          FROM public.projects
          WHERE category ILIKE $1 AND id != $2 AND json_data IS NOT NULL
          ORDER BY updated_at DESC
          LIMIT $3
        `;
        params = [`%${category.trim()}%`, currentProjectId, boundedLimit];
      } else {
        query = `
          SELECT id, business_name, category, design_fingerprint, json_data
          FROM public.projects
          WHERE category ILIKE $1 AND json_data IS NOT NULL
          ORDER BY updated_at DESC
          LIMIT $2
        `;
        params = [`%${category.trim()}%`, boundedLimit];
      }
    } else {
      if (currentProjectId) {
        query = `
          SELECT id, business_name, category, design_fingerprint, json_data
          FROM public.projects
          WHERE id != $1 AND json_data IS NOT NULL
          ORDER BY updated_at DESC
          LIMIT $2
        `;
        params = [currentProjectId, boundedLimit];
      } else {
        query = `
          SELECT id, business_name, category, design_fingerprint, json_data
          FROM public.projects
          WHERE json_data IS NOT NULL
          ORDER BY updated_at DESC
          LIMIT $1
        `;
        params = [boundedLimit];
      }
    }

    const res = await pool.query(query, params);

    for (const row of res.rows) {
      const rowData = (row.json_data && typeof row.json_data === "object" ? row.json_data : {}) as Record<string, unknown>;
      const fp = (row.design_fingerprint && typeof row.design_fingerprint === "object"
        ? row.design_fingerprint
        : extractDetailedDesignFingerprint(rowData)) as any;

      candidates.push({
        id: String(row.id),
        businessName: String(row.business_name || "Previous Website"),
        category: String(row.category || category),
        fingerprint: fp,
        sectionOrder: Array.isArray(fp.sectionOrder) ? fp.sectionOrder : [],
        layoutType: fp.layoutType,
        primaryColor: fp.colorDirection,
        cardStyle: fp.cardStyle,
        images: Array.isArray(fp.images) ? fp.images : (rowData ? extractDetailedDesignFingerprint(rowData).images : []),
      });
    }

    if (candidates.length > 0) {
      return candidates;
    }

    // If DB returned 0 rows, check local candidate cache
    return getMatchingFromLocalCache(category, currentProjectId, boundedLimit);
  } catch {
    // Non-blocking: If database is unreachable or unconfigured in local tests,
    // safely fallback to local candidate cache.
    return getMatchingFromLocalCache(category, currentProjectId, boundedLimit);
  }
}
