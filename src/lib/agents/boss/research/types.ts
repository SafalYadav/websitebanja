// src/lib/agents/boss/research/types.ts
/**
 * Boss Agent Internet Research & Skill Discovery Types
 */

export type ResearchTopicId =
  | "modern-web-design-trends"
  | "premium-ui-ux-patterns"
  | "responsive-web-design"
  | "typography-design-systems"
  | "layout-composition-systems"
  | "card-component-design"
  | "hero-section-patterns"
  | "navigation-header-patterns"
  | "micro-interactions"
  | "motion-design"
  | "scroll-interactions"
  | "css-techniques"
  | "modern-animation-techniques"
  | "3d-spatial-web-experiences"
  | "2d-visual-design"
  | "accessibility"
  | "performance"
  | "image-media-sourcing"
  | "commercial-image-libraries"
  | "opensource-ui-libraries"
  | "web-design-inspiration"
  | "ai-website-generation"
  | "modern-frontend-techniques"
  | "industry-specific-patterns";

export type DiscoveryClassification =
  | "NEW"
  | "IMPROVEMENT"
  | "DUPLICATE"
  | "NOT_RELEVANT"
  | "EXPERIMENTAL";

export type AdminDecisionState = "YES" | "NO"; // YES = ADD, NO = DROP

export type AssetLicensingCategory =
  | "inspiration-reference-only"
  | "technically-reusable-code"
  | "commercially-reusable-cc0-mit"
  | "attribution-required"
  | "unclear-prohibited-scraping";

export interface DiscoveredPatternItem {
  id: string; // Hash fingerprint
  fingerprint: string;
  topicId: ResearchTopicId;
  topicTitle: string;
  techniqueName: string;
  sourceUrl: string;
  sourceName: string;
  discoveryDate: string;
  lastUpdated: string;
  
  // Mandatory deep-dive analysis fields
  whatItIs: string;
  whyItMatters: string;
  whereUseful: string;
  suitableIndustries: string[];
  doesItImproveOutput: boolean;
  performanceImplications: string;
  accessibilityImplications: string;
  licensingCategory: AssetLicensingCategory;
  licensingNotes: string;
  
  // Skill system comparison
  classification: DiscoveryClassification;
  equivalentExistingSkillId?: string;
  equivalentExistingSkillName?: string;
  overlapNotes: string;
  
  // Proposed candidate details (required for NEW or meaningful IMPROVEMENT)
  proposedCandidate?: {
    skillName: string;
    problemSolved: string;
    proposedResponsibility: string;
    inputs: string[];
    outputs: string[];
    generationStageIntegrationPoint: string;
    expectedBenefit: string;
    risk: string;
    performanceCost: string;
    accessibilityConsiderations: string;
    licensingConsiderations: string;
  };
  
  // Boss recommendation & Admin Decision
  bossRecommendation: "RECOMMEND_ADD" | "RECOMMEND_DROP" | "MONITOR_EXPERIMENTAL";
  adminDecision: AdminDecisionState; // YES = ADD, NO = DROP
  decisionReason: string;
  confidence: number; // 0.0 to 1.0
  implementationStatus: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "DEFERRED";
}

export interface BossResearchReport {
  generatedAt: string;
  totalTopicsCovered: number;
  totalDiscoveries: number;
  classificationCounts: Record<DiscoveryClassification, number>;
  adminDecisionCounts: {
    YES_ADD: number;
    NO_DROP: number;
  };
  discoveries: DiscoveredPatternItem[];
  summary: string;
}
