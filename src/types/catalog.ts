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

export type CatalogItemInsert = Omit<
  CatalogItem,
  "id" | "user_id" | "created_at" | "updated_at" | "display_order"
> & {
  display_order?: number;
};

export type CatalogItemUpdate = Partial<CatalogItemInsert>;
