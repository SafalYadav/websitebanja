import { supabase } from "./supabase";

export async function createProject(name: string) {
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

  return { data, error };
}

export async function getProjects() {
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

  return { data, error };
}

export async function updateProject(
  projectId: string,
  updates: Record<string, any>
) {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select()
    .single();

  return { data, error };
}

export async function getProject(projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  return { data, error };
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  return { error };
}