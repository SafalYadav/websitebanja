/**
 * WebsiteBanja Global Knowledge Base System - Type Definitions & Metadata Schemas
 * Milestone: M2 (Global Knowledge Base System)
 * Architectural Reference: docs/knowledge-base-architecture.md (Section 3)
 * Maintenance Reference: docs/knowledge-base-update-process.md (Section 2)
 *
 * Guarantees:
 * 1. Strict Zero-Tenant-Data boundary: Platform capabilities only, zero user/project data.
 * 2. SemVer 2.0.0 compliance: Strict versioning headers on all entries.
 * 3. 7-Category Taxonomy: Fully partitioned schemas for platform capabilities.
 */

import type { ElementType, ButtonActionType } from "../../types/website";
import type { BackendRequirement } from "../../types/project";

// Re-export common primitive types for convenience
export type { ElementType, ButtonActionType, BackendRequirement };

/**
 * The 7 canonical categories partitioning the Global Knowledge Base.
 */
export type GlobalKnowledgeCategory =
  | "website_types"
  | "components"
  | "integrations"
  | "design_system"
  | "technical_constraints"
  | "generation_rules"
  | "backend_capabilities";

/**
 * Lifecycle status of a global knowledge entry.
 * Follows the 4-state lifecycle (draft -> active -> deprecated -> archived).
 */
export type KnowledgeStatus = "active" | "deprecated" | "draft" | "archived";

/**
 * Standardized metadata header required on EVERY global knowledge entry.
 * Enforces auditability, SemVer tracking, code parity, and provenance.
 */
export interface KnowledgeMetadata {
  /** Canonical URN, e.g. "wb:global:website_types:restaurant:v1" */
  id: string;
  /** One of the 7 discrete platform categories */
  category: GlobalKnowledgeCategory;
  /** Human-readable title */
  title: string;
  /** Functional description of the capability */
  description: string;
  /** Semantic Version (MAJOR.MINOR.PATCH), e.g. "1.0.0" */
  version: string;
  /** Operational lifecycle state */
  status: KnowledgeStatus;
  /** Source file path relative to repo root, e.g. "src/knowledge/global/website-types.ts" */
  source: string;
  /** Version of the payload schema contract, e.g. "1.0.0" */
  schemaVersion: string;
  /** ISO 8601 UTC timestamp of last update */
  updatedAt: string;
  /** Search and indexing keywords */
  tags?: string[];
  /** Optional pointer to replacement entry URN if status is deprecated */
  supersededBy?: string;
  /** Optional SHA-256 canonical payload checksum */
  checksum?: string;
}

/**
 * Core envelope wrapping every global knowledge entry.
 */
export interface GlobalKnowledgeEntry<T = unknown> {
  metadata: KnowledgeMetadata;
  data: T;
}

// ---------------------------------------------------------------------------
// 1. website_types Payload
// ---------------------------------------------------------------------------

export type WebsiteTypeStyle = "clean" | "bold" | "modern" | "luxury" | "minimal";

export interface WebsiteTypePayload {
  /** Unique category identifier matching CATEGORY_MAP key (e.g. "restaurant") */
  key: string;
  /** Human-readable display name (e.g. "Restaurant & Fine Dining") */
  displayName: string;
  /** Keywords for prompt categorization and AI classification */
  industryKeywords: string[];
  /** Standard section components recommended for this industry */
  recommendedSections: string[];
  /** Default sample services populated on initial generation */
  defaultServices: string[];
  /** Default design style preset */
  defaultStyle: WebsiteTypeStyle;
  /** Default primary brand hex color */
  defaultPrimaryColor: string;
  /** Default secondary brand hex color */
  defaultSecondaryColor: string;
  /** Whether this business type supports a product/menu catalog */
  hasCatalog: boolean;
  /** UI label for the catalog section (e.g. "Menu Highlights", "Product Catalog") */
  catalogLabel: string;
  /** Default backend infrastructure archetype */
  defaultBackendRequirement: BackendRequirement;
  /** Target audience demographic descriptions for AI copywriting */
  targetAudienceArchetypes: string[];
  /** Curated photography asset set for hero, about, services, features */
  imageSet?: {
    hero: string;
    about: string;
    services: string[];
    features: string[];
  };
}

// ---------------------------------------------------------------------------
// 2. components Payload
// ---------------------------------------------------------------------------

export interface ComponentDefinitionPayload {
  /** Unique component key matching WebsiteData property (e.g. "hero", "about") */
  componentKey: string;
  /** Human-readable display name (e.g. "Hero Banner") */
  displayName: string;
  /** Functional description of the component layout */
  description: string;
  /** Allowed UI primitive element types within this component */
  allowedElementTypes: ElementType[];
  /** Required top-level data fields */
  requiredFields: string[];
  /** Optional data fields */
  optionalFields: string[];
  /** Whether the component supports clickable CTA actions */
  supportsButtonAction: boolean;
  /** Whether the component integrates with Unsplash category fallback images */
  supportsImageFallback: boolean;
  /** Default skeleton structure for section creation */
  defaultData: Record<string, unknown> | Array<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// 3. integrations Payload
// ---------------------------------------------------------------------------

export interface IntegrationPayload {
  /** Unique integration key (e.g. "whatsapp", "lead_capture", "custom_domains") */
  integrationKey: string;
  /** Human-readable integration title */
  name: string;
  /** Functional summary of integration capabilities */
  description: string;
  /** Configuration parameters required to activate (e.g. ["phone_number_e164"]) */
  configurationRequirements: string[];
  /** Optional URL template or endpoint (e.g. "https://wa.me/{phone}") */
  endpoint?: string;
  /** Button actions that activate this integration */
  supportedActions: ButtonActionType[];
  /** Whether this integration requires a Pro tier subscription */
  isProOnly: boolean;
  /** Optional documentation link for configuration */
  documentationUrl?: string;
  /** Optional documentation link for configuration */
  setupGuideUrl?: string;
  /** Bullet list of platform integration capabilities */
  capabilities?: string[];
}

// ---------------------------------------------------------------------------
// 4. design_system Payload
// ---------------------------------------------------------------------------

export interface ContrastStandardSpec {
  normalTextMinRatio: number;
  largeTextMinRatio: number;
  wcagLevel: "AA" | "AAA";
}

export interface DesignTokenDefinition {
  cssVariable?: string;
  token?: string;
  description: string;
  defaultValue?: string;
  sampleDefault?: string;
  category?: "color" | "surface" | "radius" | "shadow" | "typography" | string;
}

export interface ThemePresetSpec {
  name: string;
  description: string;
  surface: string;
  surfaceHover: string;
  fg: string;
  muted: string;
  border: string;
  contrastRatioHeading?: string;
  contrastRatioBody?: string;
  isDark?: boolean;
}

export interface WcagComplianceSpec {
  standard: string;
  minimumNormalTextContrast: number;
  minimumLargeTextContrast: number;
  minimumUiElementContrast?: number;
  minimumTapTargetPx?: number;
  rules: string[];
}

export interface DesignSystemPayload {
  /** Unique theme or token system key (e.g. "luminous_light", "dark_luxury", "css_tokens") */
  key?: string;
  /** Display title */
  name?: string;
  /** Description of aesthetic design properties */
  description?: string;
  /** Classification of design entry */
  type?: "theme_preset" | "token_specification" | "typography_spec" | string;
  /** Whether this theme preset represents a dark mode */
  isDark?: boolean;
  /** Keywords that activate this theme if present in style or user prompt */
  activationKeywords?: string[];
  /** Map of CSS variable names to values (e.g. { "--wb-primary": "#2563EB" }) */
  cssVariables?: Record<string, string>;
  /** WCAG Accessibility contrast requirements */
  contrastRequirements?: ContrastStandardSpec;
  /** Formal token dictionary (for token_specification entries) */
  tokenDefinitions?: DesignTokenDefinition[];
  /** Themes bundle: Luminous Light, Dark Luxury */
  themes?: Record<string, ThemePresetSpec>;
  /** CSS Token dictionary list */
  cssTokens?: DesignTokenDefinition[];
  /** WCAG compliance parameters */
  wcagCompliance?: WcagComplianceSpec;
  /** Keywords activating dark theme */
  darkThemeKeywords?: string[];
}

// ---------------------------------------------------------------------------
// 5. technical_constraints Payload
// ---------------------------------------------------------------------------

export interface RateLimitSpec {
  freeGenerationsPerWeek?: number;
  proGenerationsPerWeek?: number;
  freeGenerationsPer7Days?: number;
  proGenerationsPer7Days?: number;
  studioActionRpm?: number;
  agentTalkRpm?: number;
  studioAiActionsPerMinute?: number;
  agentConversationsPerMinute?: number;
  leadSubmissionsPerHourPerIp?: number;
  catalogSyncsPerMinute?: number;
}

export interface PayloadBoundSpec {
  maxPromptLength?: number;
  maxConversationContextLength?: number;
  maxBusinessNameLength?: number;
  maxBusinessDescriptionLength?: number;
  maxTargetAudienceLength?: number;
  maxAddressLength?: number;
  maxPromptLengthChars?: number;
  maxConversationContextChars?: number;
  maxBusinessNameChars?: number;
  maxBusinessDescriptionChars?: number;
  maxCustomCssChars?: number;
  maxCatalogItemsPerProject?: number;
  maxImagesPerProductItem?: number;
  maxPagesPerWebsite?: number;
  maxUndoRedoStackStates?: number;
  maxLeadsPerProject?: number;
}

export interface ValidationStandardSpec {
  phoneFormat?: "E.164";
  phoneMinDigits?: number;
  phoneMaxDigits?: number;
  defaultCountryCode?: string;
  emailStandard?: "RFC_5322";
  blockedUrlProtocols?: string[];
  phoneRegex?: string;
  phoneIndianNormalization?: {
    regex: string;
    transform: string;
  };
  emailRegex?: string;
  hexColorRegex?: string;
  slugRegex?: string;
  maxSlugLength?: number;
  forbiddenUrlProtocols?: string[];
}

export interface OperationalTimeoutSpec {
  generationTimeoutMs?: number;
  planningTimeoutMs?: number;
  openAiGenerationMs?: number;
  planningPipelineMs?: number;
  studioAiActionMs?: number;
  databaseQueryMs?: number;
  clientAutosaveDebounceMs?: number;
}

export interface TechnicalConstraintsPayload {
  /** Constraint specification key (e.g. "platform_limits", "rate_limits", "validation") */
  key?: string;
  /** Human-readable title */
  title?: string;
  /** Scope of technical boundary */
  scope?: "rate_limits" | "payload_bounds" | "validation" | "timeouts" | "platform_limits" | string;
  /** Functional summary */
  description?: string;
  /** Rate limit numbers */
  rateLimits?: RateLimitSpec;
  /** Max character / length constraints */
  payloadBounds?: PayloadBoundSpec;
  /** Input validation regex and standards */
  validation?: ValidationStandardSpec;
  validationRules?: ValidationStandardSpec;
  /** Operational execution timeouts in milliseconds */
  timeouts?: OperationalTimeoutSpec;
  operationalTimeouts?: OperationalTimeoutSpec;
  /** Additional custom technical parameters */
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 6. generation_rules Payload
// ---------------------------------------------------------------------------

export interface OutputRequirementsSpec {
  format: "raw_json";
  disallowedWrappers: string[];
  requireValidActionTargets: boolean;
  enforceBrandFidelity: boolean;
}

export interface GenerationRulePayload {
  /** Unique rule key (e.g. "prompt_guardrails", "json_schema_enforcement") */
  ruleKey?: string;
  /** Rule name */
  title?: string;
  /** Functional objective of the rule */
  description?: string;
  /** Enforcement priority */
  priority?: "mandatory" | "recommended" | "fallback";
  /** Human-readable guardrail statements */
  guardrails?: string[];
  /** Patterns or structures strictly forbidden in LLM generation output */
  forbiddenPatterns?: string[];
  /** Section components that MUST be present in generated output */
  requiredSections?: string[];
  /** Output formatting specifications */
  outputRequirements?: OutputRequirementsSpec;
  /** System prompt instruction block injected into LLM contexts */
  systemPromptSnippet?: string;
  /** Persona description */
  systemPersona?: string;
  /** Behavioral guidelines */
  behavioralGuidelines?: string[];
  /** Forbidden LLM outputs */
  forbiddenOutputs?: string[];
  /** Schema definition */
  outputJsonSchema?: Record<string, unknown>;
  /** Few-shot examples */
  fewShotExample?: Record<string, unknown>;
  /** Allowed button action types */
  allowedButtonActions?: ButtonActionType[];
}

// ---------------------------------------------------------------------------
// 7. backend_capabilities Payload
// ---------------------------------------------------------------------------

export interface BackendOptionSpec {
  title: string;
  description: string;
  features: string[];
}

export interface BackendCapabilityPayload {
  /** Requirement archetype matching BackendRequirement */
  requirementType: BackendRequirement;
  /** Title of backend archetype */
  title: string;
  /** Architectural description */
  description: string;
  /** Whether dedicated cloud database/server infrastructure is needed */
  requiresBackend?: boolean;
  /** Business categories that map to this archetype */
  applicableCategories: string[];
  /** Platform capabilities provided by this archetype */
  capabilities: string[];
  /** Managed vs Custom backend configurations */
  options: {
    managed: BackendOptionSpec;
    custom: BackendOptionSpec;
  };
}

// ---------------------------------------------------------------------------
// Category-to-Payload Mapping & Discriminated Types
// ---------------------------------------------------------------------------

export interface GlobalCategoryPayloadMap {
  website_types: WebsiteTypePayload;
  components: ComponentDefinitionPayload;
  integrations: IntegrationPayload;
  design_system: DesignSystemPayload;
  technical_constraints: TechnicalConstraintsPayload;
  generation_rules: GenerationRulePayload;
  backend_capabilities: BackendCapabilityPayload;
}

/**
 * Discriminated union of strongly-typed global knowledge entries.
 */
export type TypedGlobalKnowledgeEntry = {
  [K in GlobalKnowledgeCategory]: GlobalKnowledgeEntry<GlobalCategoryPayloadMap[K]>;
}[GlobalKnowledgeCategory];
