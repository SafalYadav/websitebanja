/**
 * Catalog Client Operations & API Client
 *
 * WHY architecture split:
 * Client components (CatalogManager, ProductFullScreenEditor) execute in the browser.
 * They MUST NOT bundle server database drivers (pg).
 * All catalog mutations and queries are routed via Next.js API endpoints (/api/catalog/*)
 * authenticated via Supabase Auth Bearer tokens and persisted to Azure PostgreSQL.
 */

import { supabase } from "./supabase";
import type { CatalogItem, CatalogItemInsert, CatalogItemUpdate } from "@/types/catalog";

export type { CatalogItem, CatalogItemInsert, CatalogItemUpdate };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      };
    }
  } catch {
    // Fallback
  }
  return { "Content-Type": "application/json" };
}

/**
 * Get all catalog items for a project (ordered by display_order and created_at).
 */
export async function getCatalogItems(projectId: string): Promise<{ data: CatalogItem[] | null; error: Error | null }> {
  if (!projectId) return { data: null, error: new Error("Project ID is missing.") };
  if (!UUID_REGEX.test(projectId)) {
    return { data: [], error: null };
  }

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/catalog?projectId=${encodeURIComponent(projectId)}`, {
      method: "GET",
      headers,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { data: null, error: new Error(json.error || "Failed to fetch catalog items.") };
    }

    return { data: (json.data || []) as CatalogItem[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error("Failed to fetch catalog items.") };
  }
}

/**
 * Create a new catalog item.
 */
export async function createCatalogItem(item: CatalogItemInsert): Promise<{ data: CatalogItem | null; error: Error | null }> {
  if (!item.project_id) {
    return { data: null, error: new Error("Project ID is missing. Please reload the workspace.") };
  }

  try {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/catalog", {
      method: "POST",
      headers,
      body: JSON.stringify({ item }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { data: null, error: new Error(json.error || "Failed to save catalog item.") };
    }

    return { data: json.data as CatalogItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error("Failed to save catalog item.") };
  }
}

/**
 * Update an existing catalog item.
 */
export async function updateCatalogItem(
  itemId: string,
  updates: CatalogItemUpdate
): Promise<{ data: CatalogItem | null; error: Error | null }> {
  if (!itemId) return { data: null, error: new Error("Item ID is required") };

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/catalog/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ updates }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { data: null, error: new Error(json.error || "Failed to update catalog item.") };
    }

    return { data: json.data as CatalogItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error("Failed to update catalog item.") };
  }
}

/**
 * Delete a catalog item.
 */
export async function deleteCatalogItem(itemId: string): Promise<{ error: Error | null }> {
  if (!itemId) return { error: new Error("Item ID is required") };

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/catalog/${encodeURIComponent(itemId)}`, {
      method: "DELETE",
      headers,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { error: new Error(json.error || "Failed to delete catalog item.") };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error("Failed to delete catalog item.") };
  }
}

/**
 * Update display order of items.
 */
export async function updateCatalogOrder(
  updates: { id: string; display_order: number }[]
): Promise<{ error: Error | null }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/catalog", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ updates }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { error: new Error(json.error || "Failed to reorder catalog items.") };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error("Failed to reorder catalog items.") };
  }
}
