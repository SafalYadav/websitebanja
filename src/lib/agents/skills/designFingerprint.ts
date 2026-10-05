import type { WebsiteData } from "@/types/website";
import type { DesignFingerprint } from "./types";
import { getPool } from "@/lib/db/queries";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(...values: unknown[]): string {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return "unknown";
}

/** Record observed design fields; missing fields are unknown, not fabricated defaults. */
export function extractDesignFingerprint(input: Partial<WebsiteData> | Record<string, unknown>): DesignFingerprint {
  const data = record(input), hero = record(data.hero), navbar = record(data.navbar);
  const brand = record(data.brand), theme = record(data.theme), typography = record(data.typography);
  const strategy = record(data.designStrategy), colors = record(strategy.colorSystem);
  const sectionOrder = Array.isArray(data.sectionOrder) ? data.sectionOrder.filter((key): key is string => typeof key === "string" && !!key.trim())
    : Array.isArray(strategy.sectionSequence) ? strategy.sectionSequence.filter((key): key is string => typeof key === "string" && !!key.trim())
    : Object.keys(data).filter(key => ["hero","services","about","products","features","testimonials","gallery","menu","contact","faq","footer"].includes(key));
  return {
    heroType: text(hero.layoutVariant, hero.layoutType, hero.heroType, strategy.heroType, data.heroType),
    navigationType: text(navbar.style, data.navigationType),
    layoutType: text(data.layoutType),
    sectionOrder,
    visualArchetype: text(strategy.visualArchetype, data.visualArchetype, data.style).toLowerCase(),
    typographyStyle: text(typography.headingFont, strategy.typographyStyle, data.typographyStyle, theme.fontFamily),
    colorDirection: text(colors.primary, brand.primaryColor, theme.primaryColor, data.primaryColor, data.colorDirection),
    cardStyle: text(strategy.cardTreatment, data.cardFamily, data.cardStyle),
    animationStyle: text(strategy.motionStrategy, data.animationStyle),
  };
}

/** Owned evidence only: database failure never substitutes a global scratch candidate cache. */
export async function getRecentDesignFingerprints(category?: string, limit = 3, userId?: string): Promise<DesignFingerprint[]> {
  if (!userId?.trim()) throw new Error("Trusted owner required for design comparisons");
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error("Design comparison limit must be 1–20");
  const result = await getPool().query<{ json_data: unknown }>(`
    SELECT json_data FROM public.projects
    WHERE user_id=$1 AND json_data IS NOT NULL AND ($2::text IS NULL OR LOWER(category)=LOWER($2))
    ORDER BY updated_at DESC LIMIT $3
  `, [userId, category?.trim() || null, limit]);
  return result.rows.flatMap(row => {
    const data = record(row.json_data);
    if (!Object.keys(data).length) return [];
    const fingerprint = extractDesignFingerprint(data);
    return fingerprint.sectionOrder.length && fingerprint.heroType !== "unknown" && fingerprint.visualArchetype !== "unknown" ? [fingerprint] : [];
  });
}
