// src/lib/intelligence/planning/types.ts
/**
 * Business Section Planning & Semantic Purpose Types
 * Prevents duplicate-purpose sections and dynamically orders sections
 * based on customer transaction journey and verified business offerings.
 */

export type SectionPurpose =
  | "HERO"
  | "VALUE_PROP"
  | "OFFERINGS"
  | "TRANSACTION"
  | "PROOF"
  | "CREDENTIALS"
  | "STORY"
  | "FAQ"
  | "CONTACT"
  | "NAVIGATION";

export interface SectionDescriptor {
  sectionKey: string;
  purpose: SectionPurpose;
  required: boolean;
  priority: number; // 1 (highest) to 100 (lowest)
  rationale: string;
}

export interface BusinessSectionPlan {
  businessDomain: string;
  primaryTransactionType: "direct_booking" | "inquiry_consultation" | "direct_purchase" | "quote_request" | "general_contact";
  requiredSections: string[];
  optionalSections: string[];
  omittedSections: string[];
  sectionOrder: string[];
  purposeMap: Record<string, SectionPurpose>;
  rationale: string;
}
