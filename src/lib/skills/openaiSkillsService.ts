// src/lib/skills/openaiSkillsService.ts
import fs from "fs";
import path from "path";
import type { SkillId, SkillSelectionContext, SelectedSkill } from "./types";
import { generateSkillGuidance } from "./skillRegistry";

export interface HostedSkillManifestItem {
  id: string;
  openaiName: string;
  description: string;
  localVersion: string;
  contentHash: string;
  zipPath: string;
  zipSizeBytes: number;
  hostedSkillId: string | null;
  hostedVersion: string | null;
  status: "packaged" | "synced" | "needs_sync" | "local_fallback";
  lastPackagedAt: string;
  lastSyncedAt: string | null;
}

export interface HostedSkillsManifest {
  schemaVersion: string;
  updatedAt: string | null;
  skills: Record<string, HostedSkillManifestItem>;
}

// WHY 5000ms cache TTL: The manifest is read on every skill resolution call during generation.
// Re-parsing JSON from disk on every call is wasteful, but we also need to pick up changes
// promptly when skills are re-synced. 5 seconds is short enough that a re-sync takes
// effect within one generation cycle, but avoids redundant IO during a single request.
let cachedManifest: HostedSkillsManifest | null = null;
let lastManifestCheck = 0;

/**
 * Loads the tracked OpenAI Skills Manifest from disk with caching.
 */
export function getOpenAiSkillsManifest(): HostedSkillsManifest {
  const now = Date.now();
  if (cachedManifest && now - lastManifestCheck < 5000) {
    return cachedManifest;
  }

  try {
    const manifestPath = path.resolve(process.cwd(), "skills", "openai-manifest.json");
    if (fs.existsSync(manifestPath)) {
      const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as HostedSkillsManifest;
      cachedManifest = data;
      lastManifestCheck = now;
      return data;
    }
  } catch (err) {
    console.warn("[OpenAISkillsService] Unable to read openai-manifest.json, operating in local fallback mode:", err);
  }

  return {
    schemaVersion: "1.0.0",
    updatedAt: null,
    skills: {},
  };
}

/**
 * Returns the hosted OpenAI skill ID if published, or null if operating in local fallback mode.
 */
export function getHostedSkillId(skillId: string): string | null {
  const manifest = getOpenAiSkillsManifest();
  return manifest.skills[skillId]?.hostedSkillId || null;
}

/**
 * Returns the hosted OpenAI skill version string if published.
 */
export function getHostedSkillVersion(skillId: string): string | null {
  const manifest = getOpenAiSkillsManifest();
  return manifest.skills[skillId]?.hostedVersion || null;
}

/**
 * Checks whether a given skill is hosted and synchronized on OpenAI.
 */
export function isHostedSkillActive(skillId: string): boolean {
  const manifest = getOpenAiSkillsManifest();
  const item = manifest.skills[skillId];
  return Boolean(item && item.hostedSkillId && (item.status === "synced" || item.status === "packaged"));
}

/**
 * Returns OpenAI Responses API compatible SkillReference objects for active skills.
 */
export function getHostedSkillReferences(skillIds: string[]): Array<{ type: "skill_reference"; skill_id: string; version?: string }> {
  const refs: Array<{ type: "skill_reference"; skill_id: string; version?: string }> = [];
  const manifest = getOpenAiSkillsManifest();

  for (const id of skillIds) {
    const item = manifest.skills[id];
    if (item && item.hostedSkillId) {
      refs.push({
        type: "skill_reference",
        skill_id: item.hostedSkillId,
        version: item.hostedVersion || undefined,
      });
    }
  }

  return refs;
}

/**
 * Formats system prompt telemetry linking hosted OpenAI skills to generation context.
 * Enables full traceability of hosted skill usage while preventing prompt bloat.
 */
export function formatHostedSkillSystemContext(selectedSkills: SelectedSkill[]): string {
  const manifest = getOpenAiSkillsManifest();
  const hostedDetails = selectedSkills
    .map((skill) => {
      const item = manifest.skills[skill.id];
      if (item && item.hostedSkillId) {
        return `${item.openaiName} [hosted:${item.hostedSkillId}:v${item.hostedVersion || "1"}]`;
      }
      return `${skill.id} [local-fallback]`;
    })
    .join(", ");

  const masterItem = manifest.skills["master-design-intelligence"];
  const masterRef = masterItem?.hostedSkillId
    ? `Master Orchestrator: ${masterItem.openaiName} (${masterItem.hostedSkillId})`
    : "Master Orchestrator: Local";

  return `[OpenAI Design Intelligence Architecture | ${masterRef} | Active Skills: ${hostedDetails}]`;
}

/**
 * Resolves authoritative skill guidance for prompt generation, prioritizing hosted
 * skill telemetry and falling back seamlessly to local markdown guidance if hosted services
 * are unreachable.
 */
export function resolveSkillGuidanceWithFallback(
  skillId: SkillId,
  context: SkillSelectionContext
): { guidance: string; isHosted: boolean; hostedId: string | null } {
  const hostedId = getHostedSkillId(skillId);
  const localGuidance = generateSkillGuidance(skillId, context);

  if (hostedId) {
    const hostedVersion = getHostedSkillVersion(skillId) || "1";
    return {
      guidance: `[OPENAI HOSTED SKILL: ${skillId} (ID: ${hostedId}, v${hostedVersion})]\n${localGuidance}`,
      isHosted: true,
      hostedId,
    };
  }

  // Graceful Local Fallback
  return {
    guidance: localGuidance,
    isHosted: false,
    hostedId: null,
  };
}

/**
 * Checks whether OpenAI Hosted Skills are configured and available in manifest.
 */
export function isOpenAISkillsConfigured(): boolean {
  if (!process.env.OPENAI_API_KEY) return false;
  const manifest = getOpenAiSkillsManifest();
  const master = manifest.skills["master-design-intelligence"];
  return Boolean(master && master.hostedSkillId);
}

/**
 * Resolves the Master Design Intelligence Orchestrator skill reference.
 */
export function getMasterOrchestratorReference(): { type: "skill_reference"; skill_id: string; version?: string } | null {
  const manifest = getOpenAiSkillsManifest();
  const master = manifest.skills["master-design-intelligence"];
  if (master && master.hostedSkillId) {
    return {
      type: "skill_reference",
      skill_id: master.hostedSkillId,
      version: master.hostedVersion || undefined,
    };
  }
  return null;
}

/**
 * Assembles the tool configuration for the OpenAI Responses API mounting hosted skills
 * into an automated container environment via the shell tool.
 * Enforces the 4-6 active skill governance limit (Master Orchestrator + up to 5 top specialized skills).
 */
export function getHostedSkillContainerConfig(selectedSkillIds: string[]): {
  type: "shell";
  environment: {
    type: "container_auto";
    skills: Array<{ type: "skill_reference"; skill_id: string; version?: string }>;
  };
} {
  const masterRef = getMasterOrchestratorReference();
  // WHY 5-skill limit: OpenAI container_auto environments have resource and context limits.
  // Loading too many hosted skills degrades response quality and increases latency.
  // The master orchestrator is always included separately, so 5 specialized skills
  // give us 6 total — enough to cover foundational + contextual needs per request.
  const specializedRefs = getHostedSkillReferences(selectedSkillIds).slice(0, 5);
  const skills = masterRef ? [masterRef, ...specializedRefs] : specializedRefs;

  return {
    type: "shell",
    environment: {
      type: "container_auto",
      skills,
    },
  };
}

/**
 * Robust adapter extracting the assistant's final text content from an OpenAI Responses API object.
 */
export function extractTextFromResponse(response: any): string {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }
  if (Array.isArray(response?.output)) {
    for (const item of response.output) {
      if (item?.type === "message" && Array.isArray(item?.content)) {
        const textParts = item.content
          .filter((c: any) => c?.type === "output_text" && typeof c?.text === "string")
          .map((c: any) => c.text);
        if (textParts.length > 0) {
          return textParts.join("").trim();
        }
      }
    }
  }
  return "";
}

/**
 * Robust JSON parser that strips markdown code fences (```json ... ```) before parsing.
 */
export function parseWebsiteJson(rawContent: string): Record<string, unknown> {
  let cleaned = (rawContent || "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid AI website generation structure: expected JSON object.");
  }
  return parsed as Record<string, unknown>;
}
