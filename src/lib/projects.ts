import { supabase } from "./supabase";
import type { Project, ProjectUpdates } from "@/types/project";

export async function createProject(name: string): Promise<{ data: Project | null; error: Error | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not logged in");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
    })
    .select()
    .single();

  return { data: data as Project | null, error };
}

export async function getProjects(): Promise<{ data: Project[]; error: Error | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return { data: (data ?? []) as Project[], error };
}

const VALID_PROJECT_COLUMNS = new Set([
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
]);

async function getAuthenticatedUser() {
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

export async function updateProject(
  projectId: string,
  updates: ProjectUpdates
): Promise<{ data: Project | null; error: Error | null }> {
  if (!projectId) {
    return { data: null, error: new Error("Project ID is missing.") };
  }

  const user = await getAuthenticatedUser();
  if (!user) return { data: null, error: new Error("Authentication session expired. Please refresh or sign in again.") };

  // Filter updates to only contain valid database columns
  const cleanUpdates: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(updates)) {
    if (VALID_PROJECT_COLUMNS.has(key) && val !== undefined) {
      cleanUpdates[key] = val;
    }
  }

  if (Object.keys(cleanUpdates).length === 0) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from("projects")
    .update(cleanUpdates)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: (data && data.length > 0 ? data[0] : null) as Project | null, error: null };
}

export async function getProject(projectId: string): Promise<{ data: Project | null; error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Unauthorized") };

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  return { data: data as Project | null, error };
}

export async function getProjectBySlug(slug: string): Promise<{ data: Project | null; error: Error | null }> {
  const decoded = decodeURIComponent(slug).trim().toLowerCase();
  const raw = slug.trim().toLowerCase();

  const { data, error } = await supabase.rpc("get_published_project_by_slug", {
    p_slug: raw,
    p_slug_decoded: decoded,
  });

  if (error || !data || data.length === 0) {
    return { data: null, error };
  }

  return { data: data[0] as Project, error: null };
}

export async function getPublishedSnapshot(projectId: string): Promise<{ snapshot_data: Record<string, unknown> | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("published_versions")
    .select("snapshot_data")
    .eq("project_id", projectId)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { snapshot_data: data?.snapshot_data || null, error };
}

export async function publishProject(
  projectId: string,
  slug: string,
  latestJsonData?: Record<string, unknown>
): Promise<{ data: Project | null; error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Unauthorized") };

  // Fetch current project to get json_data and metadata for snapshot (ensure ownership)
  const { data: currentProject, error: fetchError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !currentProject) {
    return { data: null, error: fetchError ?? new Error("Project not found or unauthorized") };
  }

  const snapshotToSave = (latestJsonData || currentProject.json_data || {}) as Record<string, unknown>;
  snapshotToSave._project_meta = {
    primary_color: currentProject.primary_color,
    secondary_color: currentProject.secondary_color,
    style: currentProject.style,
    category: currentProject.category,
    business_name: currentProject.business_name,
    name: currentProject.name,
    whatsapp_number: currentProject.whatsapp_number,
    phone: currentProject.phone,
    whatsapp_message: currentProject.whatsapp_message,
    whatsapp_enabled: currentProject.whatsapp_enabled,
  };

  // Execute atomic publish transaction via RPC
  const { error: rpcError } = await supabase.rpc("publish_project_atomic", {
    p_project_id: projectId,
    p_slug: slug,
    p_snapshot_data: snapshotToSave,
  });

  if (rpcError) {
    return { data: null, error: new Error(`Atomic publish failed: ${rpcError.message}`) };
  }

  // Fetch the updated project state to return it
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Project | null, error: null };
}

export async function unpublishProject(projectId: string): Promise<{ data: Project | null; error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Unauthorized") };

  const { data, error } = await supabase
    .from("projects")
    .update({
      is_published: false,
    })
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data: data as Project | null, error };
}

export async function deleteProject(projectId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Unauthorized") };

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  return { error };
}

import { readAiWorkspace, writeAiWorkspace } from "./aiWorkspace";
import { AI_WORKSPACE_FILES } from "@/types/aiWorkspace";

export async function deleteProjectWithStorage(projectId: string) {
  // Step 1: Delete all potential files in the storage bucket for this project
  const paths = AI_WORKSPACE_FILES.map((file) => `${projectId}/.websitebanja/${file}`);
  await supabase.storage.from("project-workspaces").remove(paths);

  // Step 2: Delete the project record from the database
  return deleteProject(projectId);
}

export async function duplicateProject(projectId: string): Promise<{ data: Project | null; error: Error | null }> {
  const { data: original, error: getError } = await getProject(projectId);
  if (getError || !original) return { data: null, error: getError ?? new Error("Project not found") };

  // Step 1: Create a new project with the copied details
  const { data: newProject, error: createError } = await supabase
    .from("projects")
    .insert({
      user_id: original.user_id,
      name: `Copy of ${original.name}`,
      business_name: original.business_name,
      category: original.category,
      description: original.description,
      target_audience: original.target_audience,
      style: original.style,
      primary_color: original.primary_color,
      secondary_color: original.secondary_color,
      phone: original.phone,
      email: original.email,
      website: original.website,
      instagram: original.instagram,
      facebook: original.facebook,
      address: original.address,
      json_data: original.json_data, // Clone website data
    })
    .select()
    .single();

  if (createError || !newProject) return { data: null, error: createError ?? new Error("Failed to duplicate") };

  // Step 2: Try to copy AI workspace if it exists
  try {
    const workspace = await readAiWorkspace(projectId);
    if (workspace) {
      await writeAiWorkspace(newProject.id, workspace);
    }
  } catch {
    // If it fails (e.g. because no workspace exists for an un-generated project), just ignore
  }

  return { data: newProject as Project, error: null };
}

export async function generatePreviewLink(projectId: string, jsonData: Record<string, unknown>): Promise<{ previewId: string | null; error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { previewId: null, error: new Error("Unauthorized") };

  // First verify the project belongs to the user
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single();
  if (!project) return { previewId: null, error: new Error("Project not found or unauthorized") };

  const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("preview_links")
    .insert({
      project_id: projectId,
      json_data: jsonData,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  return { previewId: data?.id || null, error };
}

export async function getPreviewLinkData(previewId: string): Promise<{ data: Record<string, unknown> | null; error: Error | null; expired: boolean; projectId: string | null }> {
  const { data, error } = await supabase
    .from("preview_links")
    .select("json_data, expires_at, project_id")
    .eq("id", previewId)
    .single();

  if (error || !data) return { data: null, error, expired: false, projectId: null };

  const isExpired = new Date() > new Date(data.expires_at);
  if (isExpired) {
    return { data: null, error: new Error("Preview link has expired"), expired: true, projectId: null };
  }

  return { data: data.json_data, error: null, expired: false, projectId: data.project_id };
}

export async function getPreviewProject(previewId: string): Promise<{ data: Project | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("get_preview_project", {
    p_preview_id: previewId,
  });

  if (error || !data || data.length === 0) {
    return { data: null, error: error || new Error("Project not found for preview") };
  }

  return { data: data[0] as Project, error: null };
}
