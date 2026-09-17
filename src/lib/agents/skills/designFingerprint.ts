// src/lib/agents/skills/designFingerprint.ts
import type { WebsiteData } from "@/types/website";
import type { DesignFingerprint } from "./types";
import { getPool } from "@/lib/db/queries";

/**
 * Extracts a lightweight, deterministic DesignFingerprint from any website AST.
 * Compact representation (< 250 bytes) used for anti-repetition without dumping full websites.
 */
export function extractDesignFingerprint(data: Partial<WebsiteData> | Record<string, any>): DesignFingerprint {
  const hero = data.hero || {};
  const navbar = data.navbar || {};
  const style = data.style || "modern";
  const brand = data.brand || {};

  // Extract section order
  const sectionOrder: string[] = Array.isArray(data.sectionOrder) && data.sectionOrder.length > 0
    ? data.sectionOrder
    : Object.keys(data).filter((k) =>
        ["hero", "services", "about", "products", "features", "testimonials", "gallery", "menu", "contact", "faq", "footer"].includes(k)
      );

  const primary = brand.primaryColor || data.theme?.primaryColor || data.primaryColor || data.colorDirection;

  return {
    heroType: hero.layoutVariant || hero.layoutType || hero.heroType || "split_showcase",
    navigationType: navbar.style || "floating",
    layoutType: data.layoutType || (sectionOrder.includes("products") ? "catalog_grid" : "editorial_flow"),
    sectionOrder: sectionOrder.slice(0, 8),
    visualArchetype: String(style).toLowerCase(),
    typographyStyle: data.typography?.headingFont || data.theme?.fontFamily || "modern_sans",
    colorDirection: primary ? String(primary) : "default_palette",
    cardStyle: data.cardFamily || "tactile_bento",
    animationStyle: data.animationStyle || "subtle_reveal",
  };
}

/**
 * Safely fetches recent design fingerprints for a given category from Azure PostgreSQL.
 * Keeps query compact: only fetches last N projects and parses minimal fields.
 */
export async function getRecentDesignFingerprints(
  category?: string,
  limit: number = 3
): Promise<DesignFingerprint[]> {
  try {
    const pool = getPool();
    let query: string;
    let params: unknown[];

    if (category && category.trim()) {
      query = `
        SELECT json_data
        FROM public.projects
        WHERE category ILIKE $1 AND json_data IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT $2
      `;
      params = [`%${category.trim()}%`, limit];
    } else {
      query = `
        SELECT json_data
        FROM public.projects
        WHERE json_data IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT $1
      `;
      params = [limit];
    }

    const res = await pool.query(query, params);
    const fingerprints: DesignFingerprint[] = [];

    for (const row of res.rows) {
      if (row.json_data && typeof row.json_data === "object") {
        fingerprints.push(extractDesignFingerprint(row.json_data));
      }
    }

    if (fingerprints.length > 0) {
      return fingerprints;
    }

    // Dev/offline fallback: retrieve from in-memory local candidate cache
    try {
      const { getLocalCandidates } = require("../uniqueness/candidateSelector");
      const local = getLocalCandidates();
      return local
        .filter((c: any) => !category || c.category.toLowerCase().includes(category.toLowerCase()))
        .slice(0, limit)
        .map((c: any) => ({
          sectionOrder: c.sectionOrder || [],
          layoutType: c.layoutType || "split_showcase",
          colorDirection: c.primaryColor || "",
          typographyStyle: c.fingerprint?.typographyStyle || "",
          cardStyle: c.cardStyle || "",
        }));
    } catch {
      return [];
    }
  } catch {
    // Non-blocking: If database is unreachable, fallback to local candidate cache
    try {
      const { getLocalCandidates } = require("../uniqueness/candidateSelector");
      const local = getLocalCandidates();
      return local
        .filter((c: any) => !category || c.category.toLowerCase().includes(category.toLowerCase()))
        .slice(0, limit)
        .map((c: any) => ({
          sectionOrder: c.sectionOrder || [],
          layoutType: c.layoutType || "split_showcase",
          colorDirection: c.primaryColor || "",
          typographyStyle: c.fingerprint?.typographyStyle || "",
          cardStyle: c.cardStyle || "",
        }));
    } catch {
      return [];
    }
  }
}
