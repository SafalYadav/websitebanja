/**
 * WebsiteBanja Global Knowledge Base System - Central Registry Export
 * Milestone: M2 (Global Knowledge Base System)
 * Architectural Reference: docs/knowledge-base-architecture.md (Section 3)
 * Maintenance Reference: docs/knowledge-base-update-process.md (Section 1 & 2)
 *
 * Guarantees:
 * 1. Deep Runtime Immutability: Recursively frozen via deepFreeze() at module load.
 * 2. Zero Tenant/Project Data: Contains purely platform capabilities; 0 database calls.
 * 3. Strongly Typed Accessors: O(1) ID/category lookups with strict TypeScript generics.
 */

import type {
  GlobalKnowledgeCategory,
  GlobalKnowledgeEntry,
  GlobalCategoryPayloadMap,
  TypedGlobalKnowledgeEntry,
  KnowledgeStatus,
  WebsiteTypePayload,
  ComponentDefinitionPayload,
  IntegrationPayload,
  DesignSystemPayload,
  TechnicalConstraintsPayload,
  GenerationRulePayload,
  BackendCapabilityPayload,
  BackendRequirement,
} from "./types";

// Re-export all type definitions
export * from "./types";

// Import individual category data modules
import { GLOBAL_WEBSITE_TYPES } from "./website-types";
import { GLOBAL_COMPONENTS } from "./components";
import { GLOBAL_INTEGRATIONS } from "./integrations";
import { GLOBAL_DESIGN_SYSTEM } from "./design-system";
import { GLOBAL_TECHNICAL_CONSTRAINTS } from "./technical-constraints";
import { GLOBAL_GENERATION_RULES } from "./generation-rules";
import { GLOBAL_BACKEND_CAPABILITIES } from "./backend-capabilities";

// Re-export per-category arrays for direct consumption
export {
  GLOBAL_WEBSITE_TYPES,
  GLOBAL_COMPONENTS,
  GLOBAL_INTEGRATIONS,
  GLOBAL_DESIGN_SYSTEM,
  GLOBAL_TECHNICAL_CONSTRAINTS,
  GLOBAL_GENERATION_RULES,
  GLOBAL_BACKEND_CAPABILITIES,
};

// ---------------------------------------------------------------------------
// Deep Runtime Immutability Engine
// ---------------------------------------------------------------------------

/**
 * Recursively freezes an object and its nested properties.
 * Prevents any runtime mutation, property injection, or prototype poisoning.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Object.isFrozen(obj)) {
    return obj as Readonly<T>;
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      deepFreeze(obj[i]);
    }
    return Object.freeze(obj) as Readonly<T>;
  }

  // Handle Map instances
  if (obj instanceof Map) {
    for (const [key, val] of obj.entries()) {
      deepFreeze(key);
      deepFreeze(val);
    }
    return Object.freeze(obj) as Readonly<T>;
  }

  // Handle Set instances
  if (obj instanceof Set) {
    for (const val of obj.values()) {
      deepFreeze(val);
    }
    return Object.freeze(obj) as Readonly<T>;
  }

  // Handle Plain Objects
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = (obj as Record<string, unknown>)[name];
    if (value !== null && (typeof value === "object" || typeof value === "function")) {
      deepFreeze(value);
    }
  }

  return Object.freeze(obj) as Readonly<T>;
}

// ---------------------------------------------------------------------------
// Master Registry Aggregation & Indexing
// ---------------------------------------------------------------------------

/**
 * Master flat list of all global knowledge entries across all 7 categories.
 */
export const GLOBAL_KNOWLEDGE_REGISTRY: readonly TypedGlobalKnowledgeEntry[] = deepFreeze([
  ...GLOBAL_WEBSITE_TYPES,
  ...GLOBAL_COMPONENTS,
  ...GLOBAL_INTEGRATIONS,
  ...GLOBAL_DESIGN_SYSTEM,
  ...GLOBAL_TECHNICAL_CONSTRAINTS,
  ...GLOBAL_GENERATION_RULES,
  ...GLOBAL_BACKEND_CAPABILITIES,
] as TypedGlobalKnowledgeEntry[]);

/**
 * Fast O(1) index by canonical URN ID.
 */
const REGISTRY_BY_ID = new Map<string, TypedGlobalKnowledgeEntry>();
for (const entry of GLOBAL_KNOWLEDGE_REGISTRY) {
  REGISTRY_BY_ID.set(entry.metadata.id, entry);
}

/**
 * Fast O(1) index by category.
 */
const REGISTRY_BY_CATEGORY = new Map<GlobalKnowledgeCategory, TypedGlobalKnowledgeEntry[]>();
for (const entry of GLOBAL_KNOWLEDGE_REGISTRY) {
  const cat = entry.metadata.category;
  const list = REGISTRY_BY_CATEGORY.get(cat) || [];
  list.push(entry);
  REGISTRY_BY_CATEGORY.set(cat, list);
}

// Deep freeze internal index maps
deepFreeze(REGISTRY_BY_ID);
deepFreeze(REGISTRY_BY_CATEGORY);

// ---------------------------------------------------------------------------
// Strongly-Typed Helper Accessors
// ---------------------------------------------------------------------------

export interface RegistryFilterOptions {
  /** Filter by status. Default is 'active'. Use 'all' for un-filtered retrieval. */
  status?: KnowledgeStatus | "all";
  /** Filter by category. */
  category?: GlobalKnowledgeCategory;
}

/**
 * Retrieves all registered global knowledge entries, optionally filtered by status and category.
 */
export function getGlobalKnowledgeRegistry(
  options: RegistryFilterOptions = { status: "active" }
): readonly TypedGlobalKnowledgeEntry[] {
  const targetStatus = options.status ?? "active";
  return GLOBAL_KNOWLEDGE_REGISTRY.filter((entry) => {
    const statusMatch = targetStatus === "all" || entry.metadata.status === targetStatus;
    const categoryMatch = !options.category || entry.metadata.category === options.category;
    return statusMatch && categoryMatch;
  });
}

/**
 * Retrieves all entries in a given category with fully inferred payload types.
 */
export function getGlobalKnowledgeByCategory<C extends GlobalKnowledgeCategory>(
  category: C,
  options: RegistryFilterOptions = { status: "active" }
): readonly GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]>[] {
  const entries = (REGISTRY_BY_CATEGORY.get(category) || []) as GlobalKnowledgeEntry<GlobalCategoryPayloadMap[C]>[];
  const targetStatus = options.status ?? "active";
  if (targetStatus === "all") {
    return entries;
  }
  return entries.filter((entry) => entry.metadata.status === targetStatus);
}

/**
 * Retrieves a single global knowledge entry by its canonical URN ID.
 */
export function getGlobalKnowledgeById<T = unknown>(
  id: string
): GlobalKnowledgeEntry<T> | undefined {
  return REGISTRY_BY_ID.get(id) as GlobalKnowledgeEntry<T> | undefined;
}

/**
 * Category-specific accessor: lookup website type by key (e.g. "restaurant").
 */
export function getWebsiteTypeByKey(
  key: string
): GlobalKnowledgeEntry<WebsiteTypePayload> | undefined {
  const normalized = key.trim().toLowerCase();
  return GLOBAL_WEBSITE_TYPES.find(
    (entry) => entry.data.key.toLowerCase() === normalized
  );
}

/**
 * Category-specific accessor: lookup component definition by componentKey (e.g. "hero").
 */
export function getComponentByKey(
  componentKey: string
): GlobalKnowledgeEntry<ComponentDefinitionPayload> | undefined {
  const normalized = componentKey.trim();
  return GLOBAL_COMPONENTS.find(
    (entry) => entry.data.componentKey === normalized
  );
}

/**
 * Category-specific accessor: lookup integration by integrationKey (e.g. "whatsapp").
 */
export function getIntegrationByKey(
  integrationKey: string
): GlobalKnowledgeEntry<IntegrationPayload> | undefined {
  const normalized = integrationKey.trim().toLowerCase();
  return GLOBAL_INTEGRATIONS.find(
    (entry) => entry.data.integrationKey.toLowerCase() === normalized
  );
}

/**
 * Category-specific accessor: lookup backend capability by requirementType.
 */
export function getBackendCapabilityByType(
  requirementType: BackendRequirement
): GlobalKnowledgeEntry<BackendCapabilityPayload> | undefined {
  return GLOBAL_BACKEND_CAPABILITIES.find(
    (entry) => entry.data.requirementType === requirementType
  );
}

/**
 * Category-specific accessor: lookup design system theme or token spec by key.
 */
export function getDesignSystemByKey(
  key: string
): GlobalKnowledgeEntry<DesignSystemPayload> | undefined {
  const normalized = key.trim().toLowerCase();
  return GLOBAL_DESIGN_SYSTEM.find(
    (entry) =>
      entry.data.key?.toLowerCase() === normalized ||
      entry.data.themes?.[normalized] !== undefined ||
      entry.metadata.id.toLowerCase().includes(normalized)
  );
}

/**
 * Category-specific accessor: lookup generation rule by ruleKey.
 */
export function getGenerationRuleByKey(
  ruleKey: string
): GlobalKnowledgeEntry<GenerationRulePayload> | undefined {
  const normalized = ruleKey.trim();
  return GLOBAL_GENERATION_RULES.find(
    (entry) => entry.data.ruleKey === normalized
  );
}

/**
 * Category-specific accessor: lookup technical constraints by key or scope.
 */
export function getTechnicalConstraintsByKey(
  key: string
): GlobalKnowledgeEntry<TechnicalConstraintsPayload> | undefined {
  const normalized = key.trim();
  return GLOBAL_TECHNICAL_CONSTRAINTS.find(
    (entry) => entry.data.key === normalized || entry.data.scope === normalized
  );
}
