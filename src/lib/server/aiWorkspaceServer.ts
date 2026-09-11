// WHY runtime = "nodejs": Azure Blob Storage SDK requires Node.js runtime.
import { getStorageClient } from "@/lib/storage";
import { dbGetProjectOwnership } from "@/lib/db/queries";
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

  if (lowerMessage.includes("bucket not found") || lowerMessage.includes("bucket does not exist") || lowerMessage.includes("container not found")) {
    return new AiWorkspaceError("❌ Storage container missing", `Container '${AI_WORKSPACE_BUCKET}' was not found${suffix}: ${message}`);
  }
  if (lowerMessage.includes("permission denied") || lowerMessage.includes("not authorized") || lowerMessage.includes("403")) {
    return new AiWorkspaceError(`❌ Storage access denied ${operation}`, `Storage ${operation} was denied${suffix}: ${message}`);
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
      await new Promise((resolve) => setTimeout(resolve, attempt * 300));
    }
  }
  throw storageError(lastError, "upload", file);
}

export async function serverAssertAiWorkspaceAccess(projectId: string, userId: string) {
  let project: { id: string; user_id: string } | null = null;
  try {
    project = await dbGetProjectOwnership(projectId);
  } catch (err) {
    throw new AiWorkspaceError(
      "❌ Project ownership validation failed",
      `Could not load project '${projectId}': ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!project || project.user_id !== userId) {
    throw new AiWorkspaceError(
      "❌ Project ownership validation failed",
      `User '${userId}' does not own project '${projectId}'`
    );
  }
}

export async function serverWriteAiWorkspace(
  projectId: string,
  workspace: AiWorkspace,
  existingWorkspace?: AiWorkspace
) {
  const storage = getStorageClient(AI_WORKSPACE_BUCKET);

  for (const file of AI_WORKSPACE_FILES) {
    if (existingWorkspace?.[file] === workspace[file]) continue;
    const path = workspacePath(projectId, file);
    await retryUpload(file, async () => {
      const { data, error } = await storage.upload(
        path,
        new Blob([workspace[file]], { type: "text/markdown;charset=utf-8" }),
        { upsert: true, contentType: "text/markdown; charset=utf-8" }
      );
      if (error) throw error;
      if (data?.path !== path) {
        throw new Error(`Upload acknowledgement path mismatch: expected '${path}', received '${data?.path}'`);
      }
    });
  }
}

export async function serverReadAiWorkspace(projectId: string): Promise<AiWorkspace> {
  const storage = getStorageClient(AI_WORKSPACE_BUCKET);

  const entries = await Promise.all(
    AI_WORKSPACE_FILES.map(async (file) => {
      const { data, error } = await storage.download(workspacePath(projectId, file));
      if (error || !data) throw storageError(error || new Error("No data returned"), "read", file);
      const content = await data.text();
      if (!content.trim()) {
        throw new AiWorkspaceError("❌ Workspace verification failed", `Workspace file '${file}' exists but is empty.`);
      }
      return [file, content] as const;
    })
  );
  return Object.fromEntries(entries) as AiWorkspace;
}

export async function serverVerifyAiWorkspace(projectId: string): Promise<AiWorkspace> {
  try {
    const workspace = await serverReadAiWorkspace(projectId);
    if (!workspace["ai/memory.md"]) {
      throw new Error("memory.md was not returned by Storage.");
    }
    return workspace;
  } catch (error) {
    if (error instanceof AiWorkspaceError) throw error;
    throw storageError(error, "verify");
  }
}
