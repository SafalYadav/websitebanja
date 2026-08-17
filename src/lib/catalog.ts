import { supabase } from "./supabase";
import type { ButtonActionConfig, WebsiteData } from "@/types/website";

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
 * Checks if a Supabase error is due to missing table or unrefreshed schema cache.
 */
function isSchemaMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code || "";
  const msg = error.message || "";
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("Could not find the table") ||
    msg.includes("schema cache")
  );
}

/**
 * Retrieves the current authenticated user with session fallback.
 */
async function getAuthUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  } catch {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  }
}

/**
 * Get all catalog items for a project (ordered by display_order and created_at).
 * Automatically falls back to project JSON if the database table is unmigrated.
 */
export async function getCatalogItems(projectId: string): Promise<{ data: CatalogItem[] | null; error: Error | null }> {
  if (!projectId) return { data: null, error: new Error("Project ID is missing.") };

  try {
    const { data, error } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("project_id", projectId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      if (isSchemaMissing(error)) {
        // Fallback to project json_data
        const { data: project, error: projErr } = await supabase
          .from("projects")
          .select("json_data")
          .eq("id", projectId)
          .maybeSingle();

        if (projErr) return { data: null, error: new Error(projErr.message) };
        const jsonData = (project?.json_data || {}) as WebsiteData & { catalog_items?: CatalogItem[] };
        const items = (jsonData.catalog_items || jsonData.products || []) as CatalogItem[];
        return { data: items, error: null };
      }
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as CatalogItem[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error("Failed to fetch catalog items.") };
  }
}

/**
 * Create a new catalog item.
 * Persists to public.catalog_items or project json_data seamlessly.
 */
export async function createCatalogItem(item: CatalogItemInsert): Promise<{ data: CatalogItem | null; error: Error | null }> {
  if (!item.project_id) {
    return { data: null, error: new Error("Project ID is missing. Please reload the workspace.") };
  }

  const user = await getAuthUser();
  const userId = user?.id || "anonymous";

  try {
    const { data, error } = await supabase
      .from("catalog_items")
      .insert({
        ...item,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      if (isSchemaMissing(error)) {
        // Fallback: create in project json_data
        const newItem: CatalogItem = {
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          project_id: item.project_id,
          user_id: userId,
          name: item.name,
          description: item.description ?? null,
          item_type: item.item_type || "product",
          category: item.category ?? "General",
          status: item.status || "active",
          images: Array.isArray(item.images) ? item.images : [],
          price: item.price ?? null,
          original_price: item.original_price ?? null,
          currency_code: item.currency_code || "INR",
          show_discount_badge: item.show_discount_badge ?? true,
          hourly_price: item.hourly_price ?? null,
          daily_price: item.daily_price ?? null,
          weekly_price: item.weekly_price ?? null,
          monthly_price: item.monthly_price ?? null,
          cta_text: item.cta_text || "Order on WhatsApp",
          cta_link: item.cta_link ?? null,
          button_action: item.button_action ?? null,
          display_order: item.display_order ?? 0,
          badge: item.badge ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: project, error: fetchErr } = await supabase
          .from("projects")
          .select("json_data")
          .eq("id", item.project_id)
          .single();

        if (fetchErr || !project) {
          return { data: null, error: new Error(fetchErr?.message || "Project not found") };
        }

        const jsonData = (project.json_data || {}) as WebsiteData & { catalog_items?: CatalogItem[] };
        const existingItems = (jsonData.catalog_items || jsonData.products || []) as CatalogItem[];
        const updatedItems = [newItem, ...existingItems];

        const updatedJsonData = {
          ...jsonData,
          catalog_items: updatedItems,
          products: updatedItems,
        };

        const { error: updateErr } = await supabase
          .from("projects")
          .update({ json_data: updatedJsonData })
          .eq("id", item.project_id);

        if (updateErr) return { data: null, error: new Error(updateErr.message) };
        return { data: newItem, error: null };
      }

      console.error("[createCatalogItem Supabase Error]:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as CatalogItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error("Failed to save catalog item.") };
  }
}

/**
 * Update an existing catalog item.
 */
export async function updateCatalogItem(
  itemId: string,
  updates: CatalogItemUpdate,
  projectId?: string
): Promise<{ data: CatalogItem | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("catalog_items")
      .update(updates)
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      if (isSchemaMissing(error)) {
        const effectiveProjectId = updates.project_id || projectId;
        if (!effectiveProjectId) {
          return { data: null, error: new Error("Project ID is missing for catalog update.") };
        }

        const { data: project, error: fetchErr } = await supabase
          .from("projects")
          .select("json_data")
          .eq("id", effectiveProjectId)
          .single();

        if (fetchErr || !project) {
          return { data: null, error: new Error(fetchErr?.message || "Project not found") };
        }

        const jsonData = (project.json_data || {}) as WebsiteData & { catalog_items?: CatalogItem[] };
        const existingItems = (jsonData.catalog_items || jsonData.products || []) as CatalogItem[];
        
        let updatedItem: CatalogItem | null = null;
        const updatedItems = existingItems.map((item) => {
          if (item.id === itemId) {
            updatedItem = {
              ...item,
              ...updates,
              images: Array.isArray(updates.images) ? updates.images : item.images,
              updated_at: new Date().toISOString(),
            } as CatalogItem;
            return updatedItem;
          }
          return item;
        });

        if (!updatedItem) {
          return { data: null, error: new Error("Item not found to update.") };
        }

        const updatedJsonData = {
          ...jsonData,
          catalog_items: updatedItems,
          products: updatedItems,
        };

        const { error: updateErr } = await supabase
          .from("projects")
          .update({ json_data: updatedJsonData })
          .eq("id", effectiveProjectId);

        if (updateErr) return { data: null, error: new Error(updateErr.message) };
        return { data: updatedItem, error: null };
      }

      return { data: null, error: new Error(error.message) };
    }

    return { data: data as CatalogItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error("Failed to update catalog item.") };
  }
}

/**
 * Delete a catalog item.
 */
export async function deleteCatalogItem(itemId: string, projectId?: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from("catalog_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      if (isSchemaMissing(error)) {
        if (!projectId) {
          return { error: new Error("Project ID is required to delete item.") };
        }

        const { data: project, error: fetchErr } = await supabase
          .from("projects")
          .select("json_data")
          .eq("id", projectId)
          .single();

        if (fetchErr || !project) {
          return { error: new Error(fetchErr?.message || "Project not found") };
        }

        const jsonData = (project.json_data || {}) as WebsiteData & { catalog_items?: CatalogItem[] };
        const existingItems = (jsonData.catalog_items || jsonData.products || []) as CatalogItem[];
        const updatedItems = existingItems.filter((item) => item.id !== itemId);

        const updatedJsonData = {
          ...jsonData,
          catalog_items: updatedItems,
          products: updatedItems,
        };

        const { error: updateErr } = await supabase
          .from("projects")
          .update({ json_data: updatedJsonData })
          .eq("id", projectId);

        if (updateErr) return { error: new Error(updateErr.message) };
        return { error: null };
      }

      return { error: new Error(error.message) };
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
  updates: { id: string; display_order: number }[],
  projectId?: string
): Promise<{ error: Error | null }> {
  try {
    const promises = updates.map((update) =>
      supabase
        .from("catalog_items")
        .update({ display_order: update.display_order })
        .eq("id", update.id)
    );

    const results = await Promise.all(promises);
    const firstErr = results.find((r) => r.error)?.error;

    if (firstErr) {
      if (isSchemaMissing(firstErr)) {
        if (!projectId) return { error: null };

        const { data: project } = await supabase
          .from("projects")
          .select("json_data")
          .eq("id", projectId)
          .single();

        if (!project) return { error: null };

        const jsonData = (project.json_data || {}) as WebsiteData & { catalog_items?: CatalogItem[] };
        const existingItems = (jsonData.catalog_items || jsonData.products || []) as CatalogItem[];
        
        const orderMap = new Map(updates.map((u) => [u.id, u.display_order]));
        const updatedItems = existingItems.map((item) => ({
          ...item,
          display_order: orderMap.has(item.id) ? orderMap.get(item.id)! : item.display_order,
        }));

        await supabase
          .from("projects")
          .update({ json_data: { ...jsonData, catalog_items: updatedItems, products: updatedItems } })
          .eq("id", projectId);

        return { error: null };
      }
      return { error: new Error(firstErr.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error("Failed to reorder catalog items.") };
  }
}
