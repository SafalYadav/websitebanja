import crypto from "node:crypto";
import {
  FREE_STUDIO_CHANGE_LIMIT,
  PRO_STUDIO_CHANGE_SAFETY_LIMIT,
  getStudioChangeLimit,
  isProUser,
} from "@/lib/plans";
import { dbGetUserSubscription, getPool } from "@/lib/db/queries";
import type { StudioQuotaStatus, PlanId, SubscriptionStatus } from "@/types/plans";


export { FREE_STUDIO_CHANGE_LIMIT, PRO_STUDIO_CHANGE_SAFETY_LIMIT };

interface QuotaRecord {
  userId: string;
  changesUsed: number;
  periodStart: Date;
  periodEnd: Date;
  lastMutationHash?: string;
  mutationHistory: Set<string>;
}

// In-memory quota cache and mutex per user to ensure atomic check-and-increment and high performance
const quotaStore = new Map<string, QuotaRecord>();
const userLocks = new Map<string, Promise<unknown>>();

/**
 * Sequential execution per user to prevent concurrent race-condition quota bypass
 */
export async function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = userLocks.get(userId) || Promise.resolve();
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  userLocks.set(userId, currentLock.then(() => nextLock));

  try {
    await currentLock;
    return await fn();
  } finally {
    release!();
    if (userLocks.get(userId) === nextLock) {
      userLocks.delete(userId);
    }
  }
}

/**
 * Computes a deterministic SHA-256 fingerprint for a JSON object or string
 */
export function computeContentHash(value: unknown): string {
  try {
    const serialized = typeof value === "string" ? value : JSON.stringify(value ?? null);
    return crypto.createHash("sha256").update(serialized).digest("hex");
  } catch {
    return "";
  }
}

/**
 * Normalizes website/project data to extract only meaningful content fields
 * (excluding ephemeral timestamps or auto-incremented counters)
 */
function extractMeaningfulContent(data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const cleaned: Record<string, unknown> = {};

  // Inspect json_data if present, otherwise inspect top-level data
  const target = (data.json_data && typeof data.json_data === "object" ? data.json_data : data) as Record<string, unknown>;

  // Structural sections
  if (target.hero) cleaned.hero = target.hero;
  if (target.about) cleaned.about = target.about;
  if (target.services) cleaned.services = target.services;
  if (target.features) cleaned.features = target.features;
  if (target.products) cleaned.products = target.products;
  if (target.contact) cleaned.contact = target.contact;
  if (target.footer) cleaned.footer = target.footer;
  if (target.faq) cleaned.faq = target.faq;
  if (target.sectionOrder) cleaned.sectionOrder = target.sectionOrder;
  if (target.pages) cleaned.pages = target.pages;
  if (target.palette || target.primary_color) cleaned.palette = target.palette || target.primary_color;
  if (target.businessName || target.business_name || target.name) {
    cleaned.businessName = target.businessName || target.business_name || target.name;
  }

  return cleaned;
}

/**
 * Evaluates whether a proposed project update constitutes a meaningful Studio change.
 *
 * DO NOT COUNT:
 * - Page open, preview, refresh, navigation, read operations
 * - No-op updates where content is identical
 * - Duplicate retries with the same content hash
 *
 * COUNT:
 * - Actual user-requested mutations to content, design, hero image, hero text, section order, or cards.
 */
export function isMeaningfulStudioMutation(
  existingProject: Record<string, unknown> | null | undefined,
  proposedUpdates: Record<string, unknown> | null | undefined
): { isMeaningful: boolean; mutationHash: string; reason?: string } {
  if (!proposedUpdates || Object.keys(proposedUpdates).length === 0) {
    return { isMeaningful: false, mutationHash: "", reason: "Empty update payload" };
  }

  // If update does not touch json_data or design/content columns, ignore
  const contentColumns = [
    "json_data",
    "name",
    "business_name",
    "style",
    "primary_color",
    "secondary_color",
    "description",
    "category",
    "target_audience",
    "whatsapp_number",
    "whatsapp_message",
  ];

  const hasContentField = contentColumns.some(
    (col) => col in proposedUpdates && proposedUpdates[col] !== undefined
  );

  if (!hasContentField) {
    return { isMeaningful: false, mutationHash: "", reason: "Non-content update" };
  }

  const existingContent = extractMeaningfulContent(existingProject);
  const newContent = extractMeaningfulContent({
    ...existingProject,
    ...proposedUpdates,
    json_data: proposedUpdates.json_data || existingProject?.json_data,
  });

  const existingHash = computeContentHash(existingContent);
  const proposedHash = computeContentHash(newContent);

  if (existingHash === proposedHash) {
    return { isMeaningful: false, mutationHash: proposedHash, reason: "No-op identical content" };
  }

  return { isMeaningful: true, mutationHash: proposedHash, reason: "Content modified" };
}

/**
 * Retrieves the current Studio change quota status for the authenticated user.
 */
export async function getStudioQuota(userId: string): Promise<StudioQuotaStatus> {
  if (!userId) {
    return {
      planId: "free",
      isPro: false,
      changesUsed: 0,
      limit: FREE_STUDIO_CHANGE_LIMIT,
      remainingChanges: FREE_STUDIO_CHANGE_LIMIT,
      isBlocked: false,
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // 1. Fetch user's subscription entitlement
  const sub = await dbGetUserSubscription(userId);
  const planId: PlanId = sub?.plan_id === "paid_pro" ? "paid_pro" : "free";
  const status: SubscriptionStatus = (sub?.status as SubscriptionStatus) || "free";
  const pro = isProUser(planId, status);

  const limit = getStudioChangeLimit(planId, status);

  // 2. Retrieve or initialize user quota record
  let record = quotaStore.get(userId);
  const now = new Date();

  if (!record) {
    const periodStart = new Date();
    const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    record = {
      userId,
      changesUsed: 0,
      periodStart,
      periodEnd,
      mutationHistory: new Set(),
    };
    quotaStore.set(userId, record);
  } else {
    // Check if billing period has expired -> auto-roll monthly period
    if (now > record.periodEnd) {
      record.periodStart = now;
      record.periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      record.changesUsed = 0;
      record.mutationHistory.clear();
      record.lastMutationHash = undefined;
    }
  }

  const remainingChanges = Math.max(0, limit - record.changesUsed);
  const isBlocked = record.changesUsed >= limit;

  return {
    planId,
    isPro: pro,
    changesUsed: record.changesUsed,
    limit,
    remainingChanges,
    isBlocked,
    periodStart: record.periodStart.toISOString(),
    periodEnd: record.periodEnd.toISOString(),
  };
}

/**
 * Atomically checks and increments quota for a meaningful mutation.
 * Handles race conditions and rejects when limit is exceeded.
 */
export async function consumeStudioQuota(
  userId: string,
  mutationHash: string
): Promise<{
  success: boolean;
  quota: StudioQuotaStatus;
  blocked: boolean;
  message?: string;
  subMessage?: string;
  cta?: string;
}> {
  return withUserLock(userId, async () => {
    const quota = await getStudioQuota(userId);

    // Duplicate retry check: if this exact mutation was already recorded, do not double-count
    const record = quotaStore.get(userId);
    if (record && mutationHash && record.mutationHistory.has(mutationHash)) {
      return {
        success: true,
        quota,
        blocked: false,
      };
    }

    // Quota boundary check
    if (quota.isBlocked) {
      return {
        success: false,
        quota,
        blocked: true,
        message: quota.isPro
          ? "You've reached your current Studio change limit."
          : "You've reached your Free Plan Studio change limit.",
        subMessage: quota.isPro
          ? "Please contact support for high-volume enterprise quota."
          : "Upgrade to Pro to continue editing your website.",
        cta: quota.isPro ? undefined : "Upgrade to Pro — ₹500/month",
      };
    }

    // Increment change count
    if (record) {
      record.changesUsed += 1;
      record.lastMutationHash = mutationHash;
      if (mutationHash) {
        record.mutationHistory.add(mutationHash);
      }
    }

    const updatedQuota = await getStudioQuota(userId);

    return {
      success: true,
      quota: updatedQuota,
      blocked: false,
    };
  });
}

/**
 * Elevates user to Pro entitlement quota immediately upon successful payment verification.
 */
export async function elevateQuotaToPro(userId: string): Promise<StudioQuotaStatus> {
  return withUserLock(userId, async () => {
    const now = new Date();
    const record = quotaStore.get(userId) || {
      userId,
      changesUsed: 0,
      periodStart: now,
      periodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      mutationHistory: new Set(),
    };

    // Reset usage for the fresh Pro billing cycle
    record.periodStart = now;
    record.periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    record.changesUsed = 0;
    record.mutationHistory.clear();
    record.lastMutationHash = undefined;
    quotaStore.set(userId, record);

    return getStudioQuota(userId);
  });
}

/**
 * Resets quota store for testing or development
 */
export function resetQuotaStoreForTesting(userId?: string): void {
  if (userId) {
    quotaStore.delete(userId);
  } else {
    quotaStore.clear();
  }
}
