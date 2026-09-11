/**
 * AI Workspace Client Operations & API Client
 *
 * WHY architecture split:
 * Client components (e.g. Editor Loading Screen) execute in browser runtimes.
 * They MUST NOT import Node.js native libraries (pg, @azure/storage-blob, fs, net, tls).
 * All AI workspace reads, writes, and verification are dispatched via Next.js API endpoints
 * (/api/projects/[id]/workspace) authenticated via Supabase Auth Bearer tokens and persisted to
 * Azure Blob Storage on the server.
 */

import { supabase } from "@/lib/supabase";
import type { AiWorkspace } from "@/types/aiWorkspace";

export class AiWorkspaceError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly diagnostic: string
  ) {
    super(userMessage);
    this.name = "AiWorkspaceError";
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
    // Fallback
  }
  return { "Content-Type": "application/json" };
}

export async function assertAiWorkspaceAccess(_projectId: string): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new AiWorkspaceError("❌ Authentication expired", `No authenticated Supabase user: ${userError?.message ?? "session is empty"}`);
  }
}

export async function readAiWorkspace(projectId: string): Promise<AiWorkspace> {
  await assertAiWorkspaceAccess(projectId);

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/workspace`, {
      method: "GET",
      headers,
    });

    const json = await res.json();
    if (!res.ok || !json.success || !json.data) {
      throw new AiWorkspaceError("❌ Workspace read failed", json.error || `HTTP ${res.status}`);
    }

    return json.data as AiWorkspace;
  } catch (err) {
    if (err instanceof AiWorkspaceError) throw err;
    throw new AiWorkspaceError("❌ Workspace read failed", err instanceof Error ? err.message : String(err));
  }
}

export async function writeAiWorkspace(
  projectId: string,
  workspace: AiWorkspace,
  existingWorkspace?: AiWorkspace
): Promise<void> {
  await assertAiWorkspaceAccess(projectId);

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/workspace`, {
      method: "POST",
      headers,
      body: JSON.stringify({ workspace, existingWorkspace }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new AiWorkspaceError("❌ Workspace save failed", json.error || `HTTP ${res.status}`);
    }
  } catch (err) {
    if (err instanceof AiWorkspaceError) throw err;
    throw new AiWorkspaceError("❌ Workspace save failed", err instanceof Error ? err.message : String(err));
  }
}

export async function verifyAiWorkspace(projectId: string): Promise<AiWorkspace> {
  try {
    const workspace = await readAiWorkspace(projectId);
    if (!workspace["ai/memory.md"]) {
      throw new AiWorkspaceError("❌ Workspace verification failed", "ai/memory.md was not found in storage.");
    }
    return workspace;
  } catch (err) {
    if (err instanceof AiWorkspaceError) throw err;
    throw new AiWorkspaceError("❌ Workspace verification failed", err instanceof Error ? err.message : String(err));
  }
}
