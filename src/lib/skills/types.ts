// src/lib/skills/types.ts
/**
 * Extensible Design Intelligence Skill System Types
 */

export type SkillId =
  | "ui-ux"
  | "framer-motion"
  | "21st-dev"
  | "design-systems"
  | "cro"
  | "typography"
  | "responsive-design"
  | "accessibility"
  | "ux-psychology"
  | "interaction-design"
  | "creative-art-direction"
  | "seo"
  | "performance"
  | "industry-intelligence"
  | "gsap"
  | "threejs"
  | "data-visualization"
  | "saas-ux"
  | "ecommerce-ux"
  | "spatial-interaction"
  | (string & {});

export type Spatial3dLevel = "NONE" | "SUBTLE_2_5D" | "ADVANCED_CSS_3D" | "RICH_SPATIAL";

export type SkillCategoryGroup =
  | "foundational"
  | "component"
  | "animation"
  | "optimization"
  | "domain"
  | "specialized";

export interface VerificationCriterion {
  id: string;
  description: string;
  severity: "critical" | "warning" | "advisory";
  checkType: "presence" | "absence" | "heuristic";
}

export interface SkillMetadata {
  id: SkillId;
  name: string;
  description: string;
  filePath: string;
  version: string;
  priority: number; // Lower number = higher foundational priority (e.g. ui-ux is 1)
  categoryGroup: SkillCategoryGroup;
  tags: string[];
  supportedCategories?: string[];
  supportedStyles?: string[];
  triggerKeywords?: string[];
  dependencies?: SkillId[];
  conflicts?: SkillId[];
  performanceSensitivity?: "low" | "medium" | "high" | "critical";
  accessibilitySensitivity?: "low" | "medium" | "high" | "critical";
  verificationCriteria?: VerificationCriterion[];
  hostedSkillId?: string;
  hostedVersion?: string;
  openaiName?: string;
}

export interface SkillSelectionContext {
  category?: string;
  style?: string;
  businessName?: string;
  description?: string;
  targetAudience?: string;
  requirements?: string;
  prompt?: string;
  requestedFeatures?: string[];
  isPaidPro?: boolean;
}

export interface SelectedSkill {
  id: SkillId;
  name: string;
  relevanceScore: number; // 0.0 to 1.0
  reason: string;
  guidance: string;
  appliedDirectives: string[];
  hostedSkillId?: string | null;
  hostedVersion?: string | null;
  isHosted?: boolean;
}

export interface SkillSelectionResult {
  activeSkills: SelectedSkill[];
  guidanceBlock: string;
  systemPromptAdditions: string[];
  metadata: {
    selectedIds: SkillId[];
    hasMotion: boolean;
    has21stComponents: boolean;
    has3D: boolean;
    hasAdvancedAnimation: boolean;
    userOverrideDetected?: string;
    totalActiveSkills: number;
    hostedSkillsCount?: number;
    masterSkillId?: string | null;
  };
}

export interface DesignValidationResult {
  isValid: boolean;
  warnings: string[];
  sanitized: Record<string, any>;
  motionAudit: {
    isAppropriate: boolean;
    feedback?: string;
  };
  componentAudit: {
    isModern: boolean;
    feedback?: string;
  };
  verificationReport: {
    passedCriteria: string[];
    flaggedWarnings: string[];
  };
}
