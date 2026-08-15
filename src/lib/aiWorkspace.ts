import { supabase } from "@/lib/supabase";
import { AI_WORKSPACE_FILES, type AiWorkspace, type AiWorkspaceFile } from "@/types/aiWorkspace";

const AI_WORKSPACE_BUCKET = "project-workspaces";
const MAX_UPLOAD_ATTEMPTS = 3;

export class AiWorkspaceError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly diagnostic: string
  ) {
    super(userMessage);
    this.name = "AiWorkspaceError";
  }
}

function workspacePath(projectId: string, file: AiWorkspaceFile) {
  return `${projectId}/.websitebanja/${file}`;
}

function storageError(error: unknown, operation: "read" | "upload" | "verify", file?: AiWorkspaceFile) {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();
  const suffix = file ? ` (${file})` : "";

  if (lowerMessage.includes("bucket not found") || lowerMessage.includes("bucket does not exist")) {
    return new AiWorkspaceError("❌ Storage bucket missing", `Bucket '${AI_WORKSPACE_BUCKET}' was not found${suffix}: ${message}`);
  }
  if (lowerMessage.includes("row-level security") || lowerMessage.includes("permission denied") || lowerMessage.includes("not authorized")) {
    return new AiWorkspaceError(`❌ Storage RLS denied ${operation}`, `Storage ${operation} was denied${suffix}: ${message}`);
  }
  if (lowerMessage.includes("jwt") || lowerMessage.includes("session") || lowerMessage.includes("auth")) {
    return new AiWorkspaceError("❌ Authentication expired", `Storage ${operation} failed authentication${suffix}: ${message}`);
  }
  return new AiWorkspaceError(`❌ Workspace ${operation} failed`, `Storage ${operation} failed${suffix}: ${message}`);
}

function isTransient(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("network") || message.includes("timeout") || message.includes("fetch") || /\b(408|429|500|502|503|504)\b/.test(message);
}

async function retryUpload(file: AiWorkspaceFile, upload: () => Promise<void>) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      await upload();
      return;
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === MAX_UPLOAD_ATTEMPTS) break;
      await new Promise((resolve) => window.setTimeout(resolve, attempt * 300));
    }
  }
  throw storageError(lastError, "upload", file);
}

export async function assertAiWorkspaceAccess(projectId: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new AiWorkspaceError("❌ Authentication expired", `No authenticated Supabase user: ${userError?.message ?? "session is empty"}`);
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) {
    throw new AiWorkspaceError("❌ Project ownership validation failed", `Could not load project '${projectId}': ${projectError.message}`);
  }
  if (!project || project.user_id !== user.id) {
    throw new AiWorkspaceError("❌ Project ownership validation failed", `Authenticated user '${user.id}' does not own project '${projectId}'`);
  }
}

export async function writeAiWorkspace(projectId: string, workspace: AiWorkspace, existingWorkspace?: AiWorkspace) {
  await assertAiWorkspaceAccess(projectId);

  for (const file of AI_WORKSPACE_FILES) {
    if (existingWorkspace?.[file] === workspace[file]) continue;
    const path = workspacePath(projectId, file);
    await retryUpload(file, async () => {
      const { data, error } = await supabase.storage.from(AI_WORKSPACE_BUCKET).upload(
        path,
        new Blob([workspace[file]], { type: "text/markdown;charset=utf-8" }),
        { upsert: true, contentType: "text/markdown; charset=utf-8" }
      );
      if (error) throw error;
      if (data.path !== path) {
        throw new Error(`Upload acknowledgement path mismatch: expected '${path}', received '${data.path}'`);
      }
    });
  }
}

export async function readAiWorkspace(projectId: string): Promise<AiWorkspace> {
  await assertAiWorkspaceAccess(projectId);

  const entries = await Promise.all(
    AI_WORKSPACE_FILES.map(async (file) => {
      const { data, error } = await supabase.storage.from(AI_WORKSPACE_BUCKET).download(workspacePath(projectId, file));
      if (error) throw storageError(error, "read", file);
      const content = await data.text();
      if (!content.trim()) {
        throw new AiWorkspaceError("❌ Workspace verification failed", `Workspace file '${file}' exists but is empty.`);
      }
      return [file, content] as const;
    })
  );
  return Object.fromEntries(entries) as AiWorkspace;
}

export async function verifyAiWorkspace(projectId: string): Promise<AiWorkspace> {
  try {
    const workspace = await readAiWorkspace(projectId);
    if (!workspace["ai/memory.md"]) {
      throw new Error("memory.md was not returned by Storage.");
    }
    return workspace;
  } catch (error) {
    if (error instanceof AiWorkspaceError) throw error;
    throw storageError(error, "verify");
  }
}
