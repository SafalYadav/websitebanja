// src/lib/automation/types.ts
/**
 * WebsiteBanja Automation Foundation — Types & Contracts
 * Phase: Phase 7 (n8n Automation Foundation + Preview Integration)
 */

export interface AutomationContactInput {
  phone?: string;
  email?: string;
  whatsapp?: string;
}

export interface AutomationPreviewRequest {
  businessName: string;
  placeId?: string;
  industry?: string;
  category?: string;
  description?: string;
  location?: string;
  services?: string[];
  contact?: AutomationContactInput;
  website?: string;
  requirements?: string[];
  style?: string;
  ctaText?: string;
  idempotencyKey?: string;
}

export interface AutomationPreviewResponse {
  success: boolean;
  status: "preview";
  cached?: boolean;
  business: {
    name: string;
    industry: string;
    category?: string;
    location?: string;
  };
  preview: {
    id: string;
    slug: string;
    url: string;
  };
  design?: {
    archetype: string;
    heroType: string;
    colorMood: string;
    sectionCount: number;
    qualityScore: number;
  };
  generation: {
    requestId: string;
    model: string;
    durationMs: number;
  };
}

export interface AutomationErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
}
