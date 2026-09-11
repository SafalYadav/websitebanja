import type { AiWorkspace, PlanningInput } from "@/types/aiWorkspace";
import { getUiUxSkillGuidance } from "@/lib/skills/uiUxSkill";
// Reference: skills/ui-ux/skill.md (UI/UX Design Intelligence Architecture)
import { generateDesignStrategy } from "@/lib/ai/designStrategy";

export type WebsitePromptData = Partial<Omit<PlanningInput, "projectId">> & {
  businessName: string;
  category: string;
  description: string;
};

export function buildWebsitePrompt(data: WebsitePromptData, workspace: AiWorkspace) {
  const strategy = generateDesignStrategy({
    category: data.category,
    businessName: data.businessName,
    description: data.description,
    targetAudience: data.targetAudience,
    style: data.style,
    primaryColor: data.primaryColor,
    secondaryColor: data.secondaryColor,
    prompt: data.description,
  });

  const uiUxGuidance = getUiUxSkillGuidance(data.category, data.style, {
    businessName: data.businessName,
    description: data.description,
    targetAudience: data.targetAudience,
    prompt: data.description,
  });

  const imageIntentSummary = Object.entries(strategy.imageIntents)
    .map(([sec, intent]) => `- ${sec}: ${intent.subject} (${intent.visualStyle}, aspect: ${intent.aspectRatio})`)
    .join("\n");

  return `
You are WebsiteBanja AI.

You are an expert Autonomous Website Designer, UI/UX Architect, and Conversion Copywriter.

Create a bespoke business website designed specifically for "${data.businessName}".
NEVER output a generic template. The design, sections, background, imagery, and interactions must directly serve this business.

==========================
BUSINESS & STRATEGY DIRECTIVES
==========================

Business Name: ${data.businessName}
Category: ${data.category}
Description: ${data.description}
Target Audience: ${data.targetAudience}

Visual Archetype: ${strategy.visualArchetype}
Hero Layout Variant: ${strategy.heroType}
Background Surface: ${strategy.backgroundStrategy.type} (${strategy.backgroundStrategy.color || "ambient"})
Spatial 3D Interaction: ${strategy.spatial3d.level} (Enabled: ${strategy.spatial3d.enabled}, Mobile fallback: ${strategy.spatial3d.mobileFallback})
Typography Scale: ${strategy.typographyTokens.headingFont} with tight tracking

Style: ${data.style}
Primary Color: ${strategy.colorSystem.primary}
Secondary Color: ${strategy.colorSystem.secondary}

Phone: ${data.phone}
Email: ${data.email}
Website: ${data.website}
Instagram: ${data.instagram}
Facebook: ${data.facebook}
Address: ${data.address}

==========================
IMAGE INTENT SPECIFICATIONS
==========================
${imageIntentSummary}

${uiUxGuidance ? `${uiUxGuidance}\n` : ""}
==========================
AI ENGINEERING WORKSPACE
==========================

Read and follow every planning document before producing website content:

${Object.entries(workspace).map(([path, content]) => `### ${path}\n${content}`).join("\n\n")}

==========================
DESIGN INTELLIGENCE RULES
==========================

- Never invent another business. Always use the provided business name.
- NEVER use a generic "Hero -> Features -> How It Works -> Testimonials" template.
- Purposeful Section Order: You MUST follow the industry-specific section sequence: ${JSON.stringify(strategy.sectionSequence)}
- Write bespoke, high-converting copy tailored to ${data.category}.
- Apply the Design Intelligence principles: clear visual hierarchy, tactile surfaces, purposeful motion, WCAG 2.2 contrast, and zero emojis in buttons or headers.
- Return ONLY valid JSON.
- Do NOT return markdown or code fences.
- Do NOT return HTML.
- Do NOT explain anything.

==========================
JSON FORMAT
==========================

{
  "sectionOrder": ${JSON.stringify(strategy.sectionSequence)},
  "designStrategy": {
    "visualArchetype": "${strategy.visualArchetype}",
    "heroType": "${strategy.heroType}",
    "colorMood": "${strategy.colorMood}",
    "typographyStyle": "${strategy.typographyStyle}",
    "cardTreatment": "${strategy.cardTreatment}",
    "backgroundStrategy": ${JSON.stringify(strategy.backgroundStrategy)},
    "spatial3d": ${JSON.stringify(strategy.spatial3d)}
  },
  "hero": {
    "title": "",
    "subtitle": "",
    "button": "",
    "layoutVariant": "${strategy.heroType}",
    "badges": ["${strategy.visualArchetype.toUpperCase().replace(/_/g, " ")}"]
  },
  "about": {
    "title": "",
    "content": ""
  },
  "services": [
    {
      "title": "",
      "description": ""
    }
  ],
  "features": [
    {
      "title": "",
      "description": ""
    }
  ],
  "faq": [
    {
      "question": "",
      "answer": ""
    }
  ],
  "contact": {
    "phone": "${data.phone ?? ""}",
    "email": "${data.email ?? ""}",
    "address": "${data.address ?? ""}"
  },
  "footer": {
    "copyright": "© ${new Date().getFullYear()} ${data.businessName}. All Rights Reserved."
  }
}

Return ONLY the JSON object.
`;
}
