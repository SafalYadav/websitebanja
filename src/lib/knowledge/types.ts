/**
 * WebsiteBanja Knowledge Retrieval Layer - Types & Interfaces
 * Phase: Milestone M4 (Knowledge Retrieval Layer Abstraction)
 * References: docs/knowledge-base-architecture.md (Section 5), docs/knowledge-base-data-ownership.md
 *
 * Core Principles:
 * 1. Complete abstraction of storage (shields callers from direct DB/file specifics).
 * 2. Strict multi-tenant isolation.
 * 3. Transparent fallback to legacy public.projects columns for backwards compatibility.
 * 4. PII quarantine (zero customer lead data is ever exposed in knowledge context).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GlobalKnowledgeCategory,
  GlobalCategoryPayloadMap,
  GlobalKnowledgeEntry,
  TypedGlobalKnowledgeEntry,
  BackendRequirement,
} from "../../knowledge/global/types";
import type { RegistryFilterOptions } from "../../knowledge/global/index";
import type { StalenessReport, StalenessAuditOptions } from "../../knowledge/staleness/audit";

// Re-export global types for convenience
export type {
  GlobalKnowledgeCategory,
  GlobalCategoryPayloadMap,
  GlobalKnowledgeEntry,
  TypedGlobalKnowledgeEntry,
  RegistryFilterOptions,
  BackendRequirement,
  StalenessReport,
  StalenessAuditOptions,
};

/**
 * Standard categories partitioning User/Project Knowledge.
 */
export type ProjectKnowledgeCategory =
  | "business_info"
  | "target_audience"
  | "pages"
  | "features"
  | "design_preferences"
  | "brand_information"
  | "content_requirements"
  | "contact_info"
  | "social_links"
  | "user_decisions"
  | "agent_decisions"
  | "configuration"
  | "catalog_requirements";

/**
 * Strong TypeScript representation of a project_knowledge row in Supabase.
 */
export interface ProjectKnowledgeEntry<T = Record<string, unknown>> {
  id: string;
  projectId: string;
  userId: string;
  category: ProjectKnowledgeCategory | string;
  key: string;
  content: T;
  metadata: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Project contact details sanitized of any lead inquiry PII.
 */
export interface ProjectContactContext {
  phone?: string;
  email?: string;
  address?: string;
  whatsapp?: string;
}

/**
 * Unified context bundle consumed by generation, planning, studio actions, and future AI agents.
 */
export interface ProjectContextBundle {
  projectId: string;
  userId: string;
  businessName: string;
  category: string;
  websiteType: string;
  description: string;
  targetAudience: string[];
  contact: ProjectContactContext;
  socialLinks: Record<string, string>;
  designPreferences: {
    style?: string;
    primaryColor?: string;
    secondaryColor?: string;
    themeMode?: "light" | "dark" | "system";
  };
  pages: string[];
  features: string[];
  catalog: {
    hasCatalog: boolean;
    label?: string;
    itemCount: number;
    items?: unknown[];
  };
  backendRequirement: BackendRequirement;
  customContext: Record<string, unknown>;
  source: "project_knowledge" | "legacy_project_fallback" | "hybrid";
  loadedAt: string;
}

/**
 * Input payload when persisting or updating a project knowledge entry.
 */
export interface SetProjectKnowledgeInput<T = Record<string, unknown>> {
  projectId: string;
  userId: string;
  category: ProjectKnowledgeCategory | string;
  key: string;
  content: T;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

/**
 * Service contract for the Knowledge Retrieval Layer.
 */
export interface IKnowledgeRetrievalService {
  /**
   * Retrieves a single entry from the Global Knowledge Base by category and key.
   */
  getGlobalKnowledge<C extends GlobalKnowledgeCategory>(
    category: C,
    key: string
  ): GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]> | undefined;

  /**
   * Retrieves all global knowledge entries belonging to a specified category.
   */
  getKnowledgeByCategory<C extends GlobalKnowledgeCategory>(
    category: C,
    options?: RegistryFilterOptions
  ): readonly GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]>[];

  /**
   * Retrieves all global knowledge entries across all categories.
   */
  getAllGlobalKnowledge(
    options?: RegistryFilterOptions
  ): readonly TypedGlobalKnowledgeEntry[];

  /**
   * Retrieves a specific project knowledge entry from Supabase.
   */
  getProjectKnowledge<T = Record<string, unknown>>(
    projectId: string,
    category: string,
    key: string,
    client?: SupabaseClient
  ): Promise<ProjectKnowledgeEntry<T> | null>;

  /**
   * Retrieves all project knowledge entries under a category for a given project.
   */
  getProjectKnowledgeByCategory<T = Record<string, unknown>>(
    projectId: string,
    category: string,
    client?: SupabaseClient
  ): Promise<ProjectKnowledgeEntry<T>[]>;

  /**
   * Assembles a comprehensive project context bundle with automatic legacy column fallback.
   */
  getProjectContext(
    projectId: string,
    client?: SupabaseClient
  ): Promise<ProjectContextBundle | null>;

  /**
   * Creates or updates a project knowledge entry in Supabase with revision auditing.
   */
  setProjectKnowledgeEntry<T = Record<string, unknown>>(
    input: SetProjectKnowledgeInput<T>,
    client?: SupabaseClient
  ): Promise<ProjectKnowledgeEntry<T>>;

  /**
   * Runs the automated SHA-256 staleness and schema drift detection engine.
   */
  checkKnowledgeStaleness(options?: StalenessAuditOptions): Promise<StalenessReport>;
}
