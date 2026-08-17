import { supabase } from "./supabase";
import type { ButtonActionConfig } from "@/types/website";

export interface CatalogItem {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description?: string | null;
  item_type: "product" | "rental" | "service" | "showcase";
  category?: string | null;
  status: "active" | "draft" | "out_of_stock";
  images: string[];
  
  price?: number | null;
  original_price?: number | null;
  currency_code?: string;
  show_discount_badge?: boolean;
  
  hourly_price?: number | null;
  daily_price?: number | null;
  weekly_price?: number | null;
  monthly_price?: number | null;
  
  cta_text?: string | null;
  cta_link?: string | null;
  button_action?: ButtonActionConfig | null;
  
  display_order: number;
  badge?: string | null;
  
  created_at: string;
  updated_at: string;
}

export type CatalogItemInsert = Omit<CatalogItem, "id" | "user_id" | "created_at" | "updated_at" | "display_order"> & {
  display_order?: number;
};
export type CatalogItemUpdate = Partial<CatalogItemInsert>;

/**
 * Safe helper to execute promises with a timeout guard.
 */
async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 10000, errorMsg = "Operation timed out"): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

/**
 * Retrieves the current authenticated user safely without locking or hanging.
 */
async function getAuthUser() {
  try {
    // 1. Check local session storage first (instant, synchronous cache, no network/lock contention)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return session.user;

    // 2. Race getUser() with a 3-second timeout so it never hangs indefinitely
    const userPromise = supabase.auth.getUser().then(({ data }) => data.user ?? null).catch(() => null);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const user = await Promise.race([userPromise, timeoutPromise]);

    return user ?? session?.user ?? null;
  } catch {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  }
}

/**
 * Get all catalog items for a project (ordered by display_order and created_at).
 * Queries the real `public.catalog_items` table in Supabase.
 */
export async function getCatalogItems(projectId: string): Promise<{ data: CatalogItem[] | null; error: Error | null }> {
  if (!projectId) return { data: null, error: new Error("Project ID is missing.") };

  try {
    const query = supabase
      .from("catalog_items")
      .select("*")
      .eq("project_id", projectId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    const { data, error } = await withTimeout(query, 10000, "Fetching catalog timed out.");

    if (error) {
      console.error("[getCatalogItems Supabase Error]:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as CatalogItem[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error("Failed to fetch catalog items.") };
  }
}

/**
 * Create a new catalog item in `public.catalog_items`.
 */
export async function createCatalogItem(item: CatalogItemInsert): Promise<{ data: CatalogItem | null; error: Error | null }> {
  if (!item.project_id) {
    return { data: null, error: new Error("Project ID is missing. Please reload the workspace.") };
  }

  const user = await getAuthUser();
  if (!user) {
    return { data: null, error: new Error("Unauthorized: Please sign in to add catalog items.") };
  }

  try {
    const query = supabase
      .from("catalog_items")
      .insert({
        ...item,
        user_id: user.id,
      })
      .select()
      .single();

    const { data, error } = await withTimeout(query, 10000, "Catalog save timed out. Please check your network connection.");

    if (error) {
      console.error("[createCatalogItem Supabase Error]:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as CatalogItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error("Failed to save catalog item.") };
  }
}

/**
 * Update an existing catalog item in `public.catalog_items`.
 */
export async function updateCatalogItem(
  itemId: string,
  updates: CatalogItemUpdate
): Promise<{ data: CatalogItem | null; error: Error | null }> {
  const user = await getAuthUser();
  if (!user) {
    return { data: null, error: new Error("Unauthorized: Please sign in to update catalog items.") };
  }

  try {
    const query = supabase
      .from("catalog_items")
      .update(updates)
      .eq("id", itemId)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    const { data, error } = await withTimeout(query, 10000, "Catalog update timed out. Please check your network connection.");

    if (error) {
      console.error("[updateCatalogItem Supabase Error]:", error);
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: new Error("Item not found or unauthorized to edit.") };
    }

    return { data: data as CatalogItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error("Failed to update catalog item.") };
  }
}

/**
 * Delete a catalog item from `public.catalog_items`.
 */
export async function deleteCatalogItem(itemId: string): Promise<{ error: Error | null }> {
  const user = await getAuthUser();
  if (!user) {
    return { error: new Error("Unauthorized: Please sign in to delete catalog items.") };
  }

  try {
    const query = supabase
      .from("catalog_items")
      .delete()
      .eq("id", itemId)
      .eq("user_id", user.id);

    const { error } = await withTimeout(query, 10000, "Catalog delete timed out.");

    if (error) {
      console.error("[deleteCatalogItem Supabase Error]:", error);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error("Failed to delete catalog item.") };
  }
}

/**
 * Update display order of items in `public.catalog_items`.
 */
export async function updateCatalogOrder(
  updates: { id: string; display_order: number }[]
): Promise<{ error: Error | null }> {
  const user = await getAuthUser();
  if (!user) {
    return { error: new Error("Unauthorized: Please sign in.") };
  }

  try {
    const promises = updates.map((update) =>
      supabase
        .from("catalog_items")
        .update({ display_order: update.display_order })
        .eq("id", update.id)
        .eq("user_id", user.id)
    );

    const results = await withTimeout(Promise.all(promises), 10000, "Reordering catalog timed out.");
    const firstErr = results.find((r) => r.error)?.error;

    if (firstErr) {
      return { error: new Error(firstErr.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error("Failed to reorder catalog items.") };
  }
}
