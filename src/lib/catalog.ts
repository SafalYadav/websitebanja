import { supabase } from "./supabase";
// Authentication handled via supabase.auth.getUser()

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
  button_action?: any; // ButtonActionConfig
  
  display_order: number;
  badge?: string | null;
  
  created_at: string;
  updated_at: string;
}

export type CatalogItemInsert = Omit<CatalogItem, "id" | "user_id" | "created_at" | "updated_at" | "display_order"> & { display_order?: number };
export type CatalogItemUpdate = Partial<CatalogItemInsert>;

export async function getCatalogItems(projectId: string): Promise<{ data: CatalogItem[] | null; error: Error | null }> {
  if (!projectId) return { data: null, error: new Error("Project ID is missing.") };

  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as CatalogItem[], error: null };
}

export async function createCatalogItem(item: CatalogItemInsert): Promise<{ data: CatalogItem | null; error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Unauthorized") };

  const { data, error } = await supabase
    .from("catalog_items")
    .insert({
      ...item,
      user_id: user.id
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as CatalogItem, error: null };
}

export async function updateCatalogItem(itemId: string, updates: CatalogItemUpdate): Promise<{ data: CatalogItem | null; error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Unauthorized") };

  const { data, error } = await supabase
    .from("catalog_items")
    .update(updates)
    .eq("id", itemId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as CatalogItem, error: null };
}

export async function deleteCatalogItem(itemId: string): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Unauthorized") };

  const { error } = await supabase
    .from("catalog_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function updateCatalogOrder(updates: { id: string; display_order: number }[]): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Unauthorized") };

  // Supabase doesn't support bulk update cleanly without RPC, so we'll do promises for now.
  const promises = updates.map((update) => 
    supabase
      .from("catalog_items")
      .update({ display_order: update.display_order })
      .eq("id", update.id)
      .eq("user_id", user.id)
  );

  const results = await Promise.all(promises);
  const error = results.find(r => r.error)?.error;

  if (error) return { error: new Error(error.message) };
  return { error: null };
}
