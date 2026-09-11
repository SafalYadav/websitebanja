/**
 * Server-only helpers for public website rendering and preview viewing.
 *
 * Direct Azure PostgreSQL queries via pg.Pool — never bundled into client chunks.
 */

import {
  dbGetProjectBySlug,
  dbGetPublishedSnapshot,
  dbGetCatalogItems,
  dbGetPreviewLinkData,
  dbGetPreviewProject,
  dbGetPreviewCatalogItems,
} from "@/lib/db/queries";
import { hydrateProjectMetadata } from "@/lib/projectHydration";
import type { Project } from "@/types/project";
import type { CatalogItem } from "@/types/catalog";

export async function getPublicProjectBySlug(slug: string): Promise<{ data: Project | null; error: Error | null }> {
  const decoded = decodeURIComponent(slug).trim().toLowerCase();
  const raw = slug.trim().toLowerCase();

  try {
    const row = await dbGetProjectBySlug(raw, decoded);
    if (!row) return { data: null, error: null };
    return { data: hydrateProjectMetadata(row as unknown as Project), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getPublicPublishedSnapshot(projectId: string): Promise<{
  snapshot_data: Record<string, unknown> | null;
  error: Error | null;
}> {
  try {
    const row = await dbGetPublishedSnapshot(projectId);
    return { snapshot_data: (row?.snapshot_data as Record<string, unknown>) || null, error: null };
  } catch (err) {
    return { snapshot_data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getPublicCatalogItems(projectId: string): Promise<{ data: CatalogItem[] | null; error: Error | null }> {
  try {
    const rows = await dbGetCatalogItems(projectId);
    return { data: rows as unknown as CatalogItem[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getPublicPreviewLinkData(previewId: string): Promise<{
  data: Record<string, unknown> | null;
  error: Error | null;
  expired: boolean;
  projectId: string | null;
}> {
  try {
    const row = await dbGetPreviewLinkData(previewId);
    if (!row) return { data: null, error: null, expired: false, projectId: null };

    const isExpired = new Date() > new Date(row.expires_at);
    if (isExpired) {
      return { data: null, error: new Error("Preview link has expired"), expired: true, projectId: null };
    }

    return { data: row.json_data as Record<string, unknown>, error: null, expired: false, projectId: row.project_id };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)), expired: false, projectId: null };
  }
}

export async function getPublicPreviewProject(previewId: string): Promise<{ data: Project | null; error: Error | null }> {
  try {
    const row = await dbGetPreviewProject(previewId);
    if (!row) return { data: null, error: new Error("Project not found for preview") };
    return { data: hydrateProjectMetadata(row as unknown as Project), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getPublicPreviewCatalogItems(previewId: string): Promise<{ data: CatalogItem[] | null; error: Error | null }> {
  try {
    const rows = await dbGetPreviewCatalogItems(previewId);
    return { data: rows as unknown as CatalogItem[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
