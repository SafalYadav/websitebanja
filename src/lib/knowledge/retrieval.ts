/**
 * WebsiteBanja Knowledge Retrieval Service Implementation
 * Milestone: M4 (Knowledge Retrieval Layer Abstraction)
 *
 * Implements IKnowledgeRetrievalService:
 * - O(1) in-memory Global Knowledge accessors with zero database round-trips.
 * - Multi-tenant PostgreSQL project_knowledge retrieval under Supabase RLS.
 * - Automatic legacy fallback to public.projects for existing projects.
 * - Lead PII Quarantine (zero customer inquiry data in knowledge contexts).
 * - Full audit staleness and code reflection parity integration.
 */

import {
  getGlobalKnowledgeRegistry,
  getGlobalKnowledgeByCategory,
  getWebsiteTypeByKey,
  getComponentByKey,
  getIntegrationByKey,
  getDesignSystemByKey,
  getTechnicalConstraintsByKey,
  getGenerationRuleByKey,
  getBackendCapabilityByType,
  type RegistryFilterOptions,
} from "../../knowledge/global/index";
import type {
  GlobalKnowledgeCategory,
  GlobalCategoryPayloadMap,
  GlobalKnowledgeEntry,
  TypedGlobalKnowledgeEntry,
  BackendRequirement,
} from "../../knowledge/global/types";
import {
  auditKnowledgeStaleness,
  type StalenessReport,
  type StalenessAuditOptions,
} from "../../knowledge/staleness/audit";
import type {
  IKnowledgeRetrievalService,
  ProjectKnowledgeEntry,
  ProjectContextBundle,
  SetProjectKnowledgeInput,
} from "./types";
import {
  dbGetProjectKnowledge,
  dbGetProjectKnowledgeByCategory,
  dbSetProjectKnowledge,
  dbGetAllProjectKnowledge,
  dbGetProjectRecordById,
  dbGetCatalogItemsCount,
} from "../db/queries";

export class KnowledgeRetrievalService implements IKnowledgeRetrievalService {

  // ===========================================================================
  // 1. GLOBAL KNOWLEDGE BASE ACCESSORS (O(1), In-Memory, Immutable)
  // ===========================================================================

  public getGlobalKnowledge<C extends GlobalKnowledgeCategory>(
    category: C,
    key: string
  ): GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]> | undefined {
    switch (category) {
      case "website_types":
        return getWebsiteTypeByKey(key) as unknown as GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]>;
      case "components":
        return getComponentByKey(key) as unknown as GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]>;
      case "integrations":
        return getIntegrationByKey(key) as unknown as GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]>;
      case "design_system":
        return getDesignSystemByKey(key) as unknown as GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]>;
      case "technical_constraints":
        return getTechnicalConstraintsByKey(key) as unknown as GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]>;
      case "generation_rules":
        return getGenerationRuleByKey(key) as unknown as GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]>;
      case "backend_capabilities":
        return getBackendCapabilityByType(key as BackendRequirement) as unknown as GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]>;
      default:
        return undefined;
    }
  }

  public getKnowledgeByCategory<C extends GlobalKnowledgeCategory>(
    category: C,
    options?: RegistryFilterOptions
  ): readonly GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]>[] {
    return getGlobalKnowledgeByCategory(category, options);
  }

  public getAllGlobalKnowledge(
    options?: RegistryFilterOptions
  ): readonly TypedGlobalKnowledgeEntry[] {
    return getGlobalKnowledgeRegistry(options);
  }

  // ===========================================================================
  // 2. PROJECT KNOWLEDGE BASE ACCESSORS (Multi-Tenant, PostgreSQL)
  // ===========================================================================

  public async getProjectKnowledge<T = Record<string, unknown>>(
    projectId: string,
    category: string,
    key: string,
    _client?: unknown
  ): Promise<ProjectKnowledgeEntry<T> | null> {
    try {
      const data = (await dbGetProjectKnowledge(projectId, category, key)) as any;
      if (!data) return null;

      return {
        id: data.id,
        projectId: data.project_id,
        userId: data.user_id,
        category: data.category,
        key: data.key,
        content: data.content as T,
        metadata: data.metadata || {},
        version: data.version,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error(
        `[KnowledgeRetrievalService] Failed to retrieve project knowledge (${projectId}, ${category}, ${key}):`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  public async getProjectKnowledgeByCategory<T = Record<string, unknown>>(
    projectId: string,
    category: string,
    _client?: unknown
  ): Promise<ProjectKnowledgeEntry<T>[]> {
    try {
      const rows = (await dbGetProjectKnowledgeByCategory(projectId, category)) as any[];

      return (rows || []).map((row) => ({
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        category: row.category,
        key: row.key,
        content: row.content as T,
        metadata: row.metadata || {},
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error(
        `[KnowledgeRetrievalService] Failed to retrieve category knowledge (${projectId}, ${category}):`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  public async setProjectKnowledgeEntry<T = Record<string, unknown>>(
    input: SetProjectKnowledgeInput<T>,
    _client?: unknown
  ): Promise<ProjectKnowledgeEntry<T>> {
    try {
      const data = (await dbSetProjectKnowledge({
        projectId: input.projectId,
        userId: input.userId,
        category: input.category,
        key: input.key,
        content: input.content,
        metadata: input.metadata || {},
        changeReason: input.changeReason || "content_update",
      })) as any;

      return {
        id: data.id,
        projectId: data.project_id,
        userId: data.user_id,
        category: data.category,
        key: data.key,
        content: data.content as T,
        metadata: data.metadata || {},
        version: data.version,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error(
        `[KnowledgeRetrievalService] Failed to persist project knowledge entry:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  // ===========================================================================
  // 3. CONTEXT BUNDLE RESOLUTION & LEGACY FALLBACK
  // ===========================================================================

  public async getProjectContext(
    projectId: string,
    _client?: unknown
  ): Promise<ProjectContextBundle | null> {
    // 1. Fetch all project_knowledge records for this project via Azure PostgreSQL
    let knowledgeRows: any[] = [];
    try {
      knowledgeRows = (await dbGetAllProjectKnowledge(projectId)) as any[];
    } catch (kbError) {
      console.warn(
        `[KnowledgeRetrievalService] project_knowledge query warning, falling back to projects table:`,
        kbError instanceof Error ? kbError.message : String(kbError)
      );
    }

    // 2. Fetch base projects record via Azure PostgreSQL
    let project: any = null;
    try {
      project = await dbGetProjectRecordById(projectId);
    } catch (projError) {
      console.error(
        `[KnowledgeRetrievalService] Failed to query projects table (${projectId}):`,
        projError instanceof Error ? projError.message : String(projError)
      );
      throw projError;
    }

    if (!project) {
      return null;
    }

    // Also fetch catalog items count via Azure PostgreSQL
    const catalogCount = await dbGetCatalogItemsCount(projectId).catch(() => 0);

    const hasKbRows = knowledgeRows && knowledgeRows.length > 0;
    const kbMap = new Map<string, any>();
    if (hasKbRows) {
      for (const row of knowledgeRows) {
        kbMap.set(`${row.category}:${row.key}`, row.content);
      }
    }

    // Legacy json_data parsing
    const jsonData = (project.json_data as Record<string, any>) || {};

    // -------------------------------------------------------------------------
    // Resolve Canonical Business Identity
    // -------------------------------------------------------------------------
    const kbIdentity = kbMap.get("business_info:identity") || {};
    const businessName =
      kbIdentity.businessName || project.business_name || jsonData.businessName || "Untitled Project";
    const category =
      kbIdentity.category || project.category || jsonData.category || "general";
    const websiteType =
      kbIdentity.websiteType || jsonData.websiteType || category;
    const description =
      kbIdentity.description ||
      project.prompt ||
      jsonData.description ||
      jsonData.hero?.subtitle ||
      "";

    // -------------------------------------------------------------------------
    // Resolve Target Audience
    // -------------------------------------------------------------------------
    const kbAudience = kbMap.get("target_audience:segments");
    let targetAudience: string[] = [];
    if (Array.isArray(kbAudience)) {
      targetAudience = kbAudience;
    } else if (kbAudience?.segments && Array.isArray(kbAudience.segments)) {
      targetAudience = kbAudience.segments;
    } else if (Array.isArray(jsonData.targetAudience)) {
      targetAudience = jsonData.targetAudience;
    } else if (typeof jsonData.targetAudience === "string") {
      targetAudience = [jsonData.targetAudience];
    }

    // -------------------------------------------------------------------------
    // Resolve Contact Information (Strict PII Quarantine: NO customer leads!)
    // -------------------------------------------------------------------------
    const kbContact = kbMap.get("contact_info:primary") || {};
    const contact = {
      phone: kbContact.phone || jsonData.contact?.phone || "",
      email: kbContact.email || jsonData.contact?.email || "",
      address: kbContact.address || jsonData.contact?.address || "",
      whatsapp:
        kbContact.whatsapp ||
        project.whatsapp_number ||
        jsonData.contact?.whatsapp ||
        "",
    };

    // -------------------------------------------------------------------------
    // Resolve Social Links
    // -------------------------------------------------------------------------
    const socialLinks =
      kbMap.get("social_links:profiles") || jsonData.contact?.socialLinks || {};

    // -------------------------------------------------------------------------
    // Resolve Design Preferences
    // -------------------------------------------------------------------------
    const kbDesign = kbMap.get("design_preferences:tokens") || {};
    const designPreferences = {
      style: kbDesign.style || jsonData.style || "clean",
      primaryColor:
        kbDesign.primaryColor ||
        project.primary_color ||
        jsonData.primaryColor ||
        "#3B82F6",
      secondaryColor:
        kbDesign.secondaryColor || jsonData.secondaryColor || "#10B981",
      themeMode: (kbDesign.themeMode ||
        jsonData.themeMode ||
        "light") as "light" | "dark" | "system",
    };

    // -------------------------------------------------------------------------
    // Resolve Pages & Features
    // -------------------------------------------------------------------------
    const kbPages = kbMap.get("pages:inventory");
    const pages = Array.isArray(kbPages)
      ? kbPages
      : Array.isArray(jsonData.pages)
      ? jsonData.pages.map((p: any) => (typeof p === "string" ? p : p.name || p.path))
      : ["Home"];

    const kbFeatures = kbMap.get("features:activated");
    const features = Array.isArray(kbFeatures)
      ? kbFeatures
      : Array.isArray(jsonData.features)
      ? jsonData.features
      : [];

    // -------------------------------------------------------------------------
    // Resolve Catalog
    // -------------------------------------------------------------------------
    const kbCatalog = kbMap.get("catalog_requirements:settings") || {};
    const itemCount = catalogCount || 0;
    const hasCatalog =
      kbCatalog.hasCatalog !== undefined
        ? Boolean(kbCatalog.hasCatalog)
        : itemCount > 0 || Boolean(jsonData.hasCatalog);

    // -------------------------------------------------------------------------
    // Resolve Backend Requirement
    // -------------------------------------------------------------------------
    const kbConfig = kbMap.get("configuration:backend") || {};
    const backendRequirement: BackendRequirement =
      kbConfig.requirementType ||
      jsonData.backendRequirement ||
      (hasCatalog ? "managed_orders" : "static");

    // -------------------------------------------------------------------------
    // Determine Canonical Source
    // -------------------------------------------------------------------------
    let source: "project_knowledge" | "legacy_project_fallback" | "hybrid" =
      "legacy_project_fallback";
    if (hasKbRows && kbMap.size >= 4) {
      source = "project_knowledge";
    } else if (hasKbRows) {
      source = "hybrid";
    }

    return {
      projectId: project.id,
      userId: project.user_id,
      businessName,
      category,
      websiteType,
      description,
      targetAudience,
      contact,
      socialLinks,
      designPreferences,
      pages,
      features,
      catalog: {
        hasCatalog,
        label: kbCatalog.label || jsonData.catalogLabel || "Featured Products",
        itemCount,
      },
      backendRequirement,
      customContext: kbMap.get("user_decisions:custom") || {},
      source,
      loadedAt: new Date().toISOString(),
    };
  }

  // ===========================================================================
  // 4. AUTOMATED STALENESS & DRIFT AUDIT ENGINE
  // ===========================================================================

  public async checkKnowledgeStaleness(
    options?: StalenessAuditOptions
  ): Promise<StalenessReport> {
    return auditKnowledgeStaleness(options);
  }
}

// Export singleton instance
export const knowledgeRetrievalService = new KnowledgeRetrievalService();
