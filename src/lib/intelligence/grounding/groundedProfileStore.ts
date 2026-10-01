// src/lib/intelligence/grounding/groundedProfileStore.ts
// Grounded Business Intelligence — Profile Storage & Freshness Ledger
// Enforces:
// 1. Google Places Data Compliance: Never stores raw review text, photos, or raw payload dumps.
//    Retains only Place ID references, internal derived archetypes, services, and evidence.
// 2. Strict Tenant Isolation: Stores and queries are scoped to tenantId.
// 3. Freshness Tracking: Computes FRESH (<24h), STALE (24h-7d), and EXPIRED (>7d).

import fs from "fs";
import path from "path";
import type { GroundedBusinessProfile } from "./types";
import { GroundedBusinessProfileSchema } from "./schemas";
import { redactSecretsInObject } from "../memory/memoryStore";

const FRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class GroundedProfileStore {
  private static instance: GroundedProfileStore;
  private profiles: Map<string, GroundedBusinessProfile> = new Map();
  private localDir: string;

  private constructor() {
    this.localDir = path.join(process.cwd(), "scratch", "grounded_profiles");
    this.ensureLocalStorage();
  }

  public static getInstance(): GroundedProfileStore {
    if (!GroundedProfileStore.instance) {
      GroundedProfileStore.instance = new GroundedProfileStore();
    }
    return GroundedProfileStore.instance;
  }

  private ensureLocalStorage() {
    try {
      if (!fs.existsSync(this.localDir)) {
        fs.mkdirSync(this.localDir, { recursive: true });
      }
    } catch {
      // In-memory fallback
    }
  }

  public calculateFreshness(fetchedAt: string): "FRESH" | "STALE" | "EXPIRED" {
    const ageMs = Date.now() - new Date(fetchedAt).getTime();
    if (isNaN(ageMs) || ageMs > STALE_THRESHOLD_MS) return "EXPIRED";
    if (ageMs > FRESH_THRESHOLD_MS) return "STALE";
    return "FRESH";
  }

  /**
   * Saves a validated grounded business profile.
   * Redacts any secrets and conforms to Google Places persistence policy.
   */
  public async saveProfile(profile: GroundedBusinessProfile): Promise<GroundedBusinessProfile> {
    const parseResult = GroundedBusinessProfileSchema.safeParse(profile);
    if (!parseResult.success) {
      const errs = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid GroundedBusinessProfile schema: ${errs}`);
    }

    const sanitizedProfile = redactSecretsInObject(profile) as GroundedBusinessProfile;

    // Refresh freshness status
    sanitizedProfile.freshness.freshnessStatus = this.calculateFreshness(
      sanitizedProfile.freshness.fetchedAt
    );

    this.profiles.set(sanitizedProfile.businessId, sanitizedProfile);

    // Save to local disk scratch
    try {
      this.ensureLocalStorage();
      const filePath = path.join(this.localDir, `${sanitizedProfile.businessId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(sanitizedProfile, null, 2), "utf-8");
    } catch {
      // In-memory fallback
    }

    return sanitizedProfile;
  }

  /**
   * Retrieves a grounded profile by businessId, enforcing tenant isolation.
   */
  public async getProfile(
    businessId: string,
    tenantId?: string | null
  ): Promise<GroundedBusinessProfile | undefined> {
    let profile = this.profiles.get(businessId);

    if (!profile) {
      try {
        const filePath = path.join(this.localDir, `${businessId}.json`);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          profile = JSON.parse(content) as GroundedBusinessProfile;
          if (profile) {
            this.profiles.set(profile.businessId, profile);
          }
        }
      } catch {
        // Fallback
      }
    }

    if (!profile) return undefined;

    // Tenant isolation verification
    if (tenantId && profile.tenantId && profile.tenantId !== tenantId) {
      return undefined; // Cross-tenant data concealed
    }

    // Dynamic freshness update
    profile.freshness.freshnessStatus = this.calculateFreshness(profile.freshness.fetchedAt);
    return profile;
  }

  /**
   * Retrieves a grounded profile associated with a leadId, enforcing tenant isolation.
   */
  public async getProfileByLeadId(
    leadId: string,
    tenantId?: string | null
  ): Promise<GroundedBusinessProfile | undefined> {
    const direct = await this.getProfile(leadId, tenantId);
    if (direct) return direct;

    const list = await this.listProfiles(tenantId);
    return list.find(
      (p) =>
        p.businessId === leadId ||
        p.identity.sourceReferences?.["leadId"] === leadId
    );
  }

  /**
   * Lists all profiles for a given tenant.
   */
  public async listProfiles(tenantId?: string | null): Promise<GroundedBusinessProfile[]> {
    let list = Array.from(this.profiles.values());
    if (tenantId) {
      list = list.filter((p) => !p.tenantId || p.tenantId === tenantId);
    }
    return list.map((p) => {
      p.freshness.freshnessStatus = this.calculateFreshness(p.freshness.fetchedAt);
      return p;
    });
  }

  public _clearForTest(): void {
    this.profiles.clear();
    try {
      if (fs.existsSync(this.localDir)) {
        const files = fs.readdirSync(this.localDir);
        for (const file of files) {
          if (file.endsWith(".json")) {
            fs.unlinkSync(path.join(this.localDir, file));
          }
        }
      }
    } catch {
      // Ignored
    }
  }
}

export const groundedProfileStore = GroundedProfileStore.getInstance();
