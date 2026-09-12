/**
 * Project Client Operations & API Client
 *
 * WHY architecture split:
 * Client components and stores run in the browser and MUST NOT import Node.js native
 * modules like 'pg', 'net', 'tls', or 'fs'.
 * All project data mutations and reads are dispatched via Next.js API routes (/api/projects/*),
 * authenticated via Supabase Auth JWT Bearer tokens, and processed securely by Azure PostgreSQL
 * on the server.
 */

import { supabase } from "./supabase";
import { hydrateProjectMetadata } from "./projectHydration";
import type { Project, ProjectUpdates } from "@/types/project";

export { hydrateProjectMetadata };

export const VALID_PROJECT_COLUMNS = new Set([
  "name",
  "business_name",
  "category",
  "description",
  "target_audience",
  "style",
  "primary_color",
  "secondary_color",
  "phone",
  "email",
  "website",
  "instagram",
  "facebook",
  "address",
  "json_data",
  "is_published",
  "public_slug",
  "published_at",
  "custom_domain",
  "custom_domain_status",
  "custom_domain_verified_at",
  "backend_requirement",
  "backend_config",
  "whatsapp_number",
  "whatsapp_message",
  "whatsapp_enabled",
  "onboarding_mode",
  "user_prompt",
  "selected_features",
  "preview_expires_at",
]);

async function getAuthenticatedUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return session.user;
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

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
    // Ignore and return default json header
  }
  return { "Content-Type": "application/json" };
}

export async function createProject(name: string): Promise<{ data: Project | null; error: Error | null }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers,
      body: JSON.stringify({ name }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { data: null, error: new Error(json.error || "Failed to create project") };
    }

    return { data: hydrateProjectMetadata(json.data as Project), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getProjects(): Promise<{ data: Project[]; error: Error | null }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/projects", {
      method: "GET",
      headers,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      if (res.status === 401) {
        // Return empty array for unauthenticated / unauthorized without throwing
        return { data: [], error: null };
      }
      return { data: [], error: new Error(json.error || "Failed to fetch projects") };
    }

    const projects = (json.data || []).map((p: Project) => hydrateProjectMetadata(p)!);
    return { data: projects, error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getProject(projectId: string): Promise<{ data: Project | null; error: Error | null }> {
  if (!projectId) return { data: null, error: new Error("Project ID is missing.") };

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: "GET",
      headers,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { data: null, error: new Error(json.error || "Failed to fetch project") };
    }

    return { data: hydrateProjectMetadata(json.data as Project), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function updateProject(
  projectId: string,
  updates: ProjectUpdates
): Promise<{ data: Project | null; quota?: any; error: Error | null }> {
  if (!projectId) {
    return { data: null, error: new Error("Project ID is missing.") };
  }

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      const err = new Error(json.message || json.error || "Failed to update project") as any;
      err.code = json.code;
      err.status = res.status;
      err.quota = json.quota;
      err.subMessage = json.subMessage;
      err.cta = json.cta;
      return { data: null, quota: json.quota, error: err };
    }

    return { data: hydrateProjectMetadata(json.data as Project), quota: json.quota, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function publishProject(
  projectId: string,
  slug: string,
  latestJsonData?: Record<string, unknown>
): Promise<{ data: Project | null; error: Error | null }> {
  if (!projectId) return { data: null, error: new Error("Project ID is missing.") };

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/publish`, {
      method: "POST",
      headers,
      body: JSON.stringify({ slug, latestJsonData, action: "publish" }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { data: null, error: new Error(json.error || "Failed to publish project") };
    }

    return { data: hydrateProjectMetadata(json.data as Project), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function unpublishProject(projectId: string): Promise<{ data: Project | null; error: Error | null }> {
  if (!projectId) return { data: null, error: new Error("Project ID is missing.") };

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/publish`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "unpublish" }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { data: null, error: new Error(json.error || "Failed to unpublish project") };
    }

    return { data: json.data as Project | null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function deleteProject(projectId: string): Promise<{ error: Error | null }> {
  if (!projectId) return { error: new Error("Project ID is missing.") };

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: "DELETE",
      headers,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { error: new Error(json.error || "Failed to delete project") };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function deleteProjectWithStorage(projectId: string): Promise<{ error: Error | null }> {
  if (!projectId) return { error: new Error("Project ID is missing.") };

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}?storage=true`, {
      method: "DELETE",
      headers,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { error: new Error(json.error || "Failed to delete project and workspace storage") };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function duplicateProject(projectId: string): Promise<{ data: Project | null; error: Error | null }> {
  if (!projectId) return { data: null, error: new Error("Project ID is missing.") };

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/duplicate`, {
      method: "POST",
      headers,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { data: null, error: new Error(json.error || "Failed to duplicate project") };
    }

    return { data: hydrateProjectMetadata(json.data as Project), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function generatePreviewLink(
  projectId: string,
  jsonData: Record<string, unknown>
): Promise<{ previewId: string | null; error: Error | null }> {
  if (!projectId) return { previewId: null, error: new Error("Project ID is missing.") };

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/preview`, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonData }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { previewId: null, error: new Error(json.error || "Failed to generate preview link") };
    }

    return { previewId: json.previewId, error: null };
  } catch (err) {
    return { previewId: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
