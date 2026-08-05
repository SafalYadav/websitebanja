import type { WebsiteData } from "@/types/website";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  business_name?: string | null;
  category?: string | null;
  description?: string | null;
  target_audience?: string | null;
  style?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  address?: string | null;
  json_data?: WebsiteData | Record<string, unknown> | null;
  created_at?: string;
}
