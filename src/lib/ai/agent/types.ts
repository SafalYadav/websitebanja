// src/lib/ai/agent/types.ts

/**
 * Unique identifier for an Agent session.
 */
export type AgentSessionId = string;

/**
 * Message exchanged between the Agent and the LLM.
 */
export interface AgentMessage {
  role: 'system' | 'assistant' | 'user' | 'tool';
  content: string;
  // Optional tool name when role === 'tool'
  toolName?: string;
}

/**
 * Decision returned by the Agent after each turn.
 */
export interface AgentDecision {
  /**
   * If true, the Agent has gathered enough information to build a specification.
   */
  ready: boolean;
  /**
   * Human‑readable question to ask the user when more information is required.
   */
  question?: string;
  /**
   * Optional partial website specification when ready is true.
   */
  spec?: WebsiteSpecification;
}

/**
 * A single extracted requirement from the conversation.
 */
export interface ExtractedRequirement {
  key: string;
  value: any;
  /**
   * Whether this field is critical for the website type.
   */
  critical: boolean;
}

/**
 * Overall status for a requirement.
 */
export enum RequirementStatus {
  MISSING = 'missing',
  PROVIDED = 'provided',
  INVALID = 'invalid',
}

/**
 * Completeness analysis of the collected requirements.
 */
export interface RequirementCompleteness {
  totalCritical: number;
  providedCritical: number;
  missingCritical: number;
  status: RequirementStatus;
}

/**
 * Final website specification derived from the gathered requirements.
 */
export interface WebsiteSpecification {
  projectId: string;
  websiteType: string;
  businessName: string;
  description?: string;
  pages: string[];
  features: string[];
  designPreferences: {
    style: string;
    primaryColor: string;
    secondaryColor: string;
    themeMode: 'light' | 'dark' | 'system';
  };
  contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
    whatsapp?: string;
  };
  socialLinks: Record<string, string>;
  targetAudience: string[];
  backendRequirement: string;
  catalog?: {
    hasCatalog: boolean;
    label?: string;
    itemCount?: number;
  };
  // Arbitrary additional context that the Agent may embed
  customContext?: Record<string, any>;
}
