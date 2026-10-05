import type { WebsiteData } from "@/types/website";
import { generationResearchRoute } from "./editorRoutes";

export interface ResearchStatusResponse {
  status: string;
  result?: { success: boolean; websiteData?: WebsiteData; error?: { message?: string } };
}

export async function waitForApprovedResearch(input: {
  researchId: string;
  getAccessToken: () => Promise<string>;
  onStatus: (status: string) => void;
  signal?: AbortSignal;
}): Promise<WebsiteData> {
  if (!/^[a-f0-9]{64}$/.test(input.researchId)) throw new Error("Invalid research identifier");
  for (let attempt = 0; attempt < 240; attempt++) {
    if (input.signal?.aborted) throw new Error("Research observation cancelled");
    const response = await fetch(generationResearchRoute(input.researchId), {
      headers: { Authorization: `Bearer ${await input.getAccessToken()}` }, cache: "no-store", signal: input.signal,
    });
    if (response.status === 401) throw new Error("Your session expired; sign in to resume business research");
    if (!response.ok) throw new Error(`Authenticated research status unavailable (${response.status})`);
    const status = await response.json() as ResearchStatusResponse;
    input.onStatus(status.status);
    if (["REJECTED", "FAILED", "QUALITY_BLOCKED"].includes(status.status)) throw new Error(status.result?.error?.message || `Business research ${status.status.toLowerCase()}`);
    if (["READY", "REPAIRED"].includes(status.status) && status.result?.success && status.result.websiteData) return status.result.websiteData;
    await new Promise<void>((resolve, reject) => {
      const cancel = () => { clearTimeout(timer); reject(new Error("Research observation cancelled")); };
      const timer = setTimeout(() => { input.signal?.removeEventListener("abort", cancel); resolve(); }, 5000);
      input.signal?.addEventListener("abort", cancel, { once: true });
      if (input.signal?.aborted) { input.signal.removeEventListener("abort", cancel); cancel(); }
    });
  }
  throw new Error("Research approval is still pending. Your project is preserved; resume after administrator review.");
}

export function pendingResearchStorageKey(userId: string, projectId: string): string {
  return `websitebanja:pending-research:${userId}:${projectId}`;
}
