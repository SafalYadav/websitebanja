import type { WebsiteData } from "@/types/website";

export type CustomDomainStatus = "none" | "pending_verification" | "verified" | "failed";
export type BackendRequirement = "static" | "managed_booking" | "managed_orders" | "custom_api";
export type OnboardingMode = "prompt" | "details";

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
  whatsapp_number?: string | null;
  whatsapp_message?: string | null;
  whatsapp_enabled?: boolean | null;
  onboarding_mode?: OnboardingMode | null;
  user_prompt?: string | null;
  selected_features?: string[] | null;
  json_data?: WebsiteData | Record<string, unknown> | null;
  is_published?: boolean;
  public_slug?: string | null;
  published_at?: string | null;
  custom_domain?: string | null;
  custom_domain_status?: CustomDomainStatus | null;
  custom_domain_verified_at?: string | null;
  backend_requirement?: BackendRequirement | null;
  backend_config?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export type ProjectUpdates = Omit<Partial<Project>, "id" | "user_id" | "created_at" | "updated_at">;
