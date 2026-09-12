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
Art Direction Concept: ${strategy.visualConcept || "Bespoke Modern Distinction"}
Art Direction Summary: ${strategy.artDirectionSummary || ""}
Background Surface: ${strategy.backgroundStrategy.type} (${strategy.backgroundStrategy.color || "ambient"})
Hero Atmosphere: ${strategy.heroBackground?.mode || "contextual_image"} (Opacity: ${strategy.heroBackground?.opacity ?? 0.14}, Blur: ${strategy.heroBackground?.blur ?? 4}px, Intent: ${strategy.heroBackground?.semanticIntent || ""})
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
CRITICAL ART DIRECTION & COPYWRITING RULES
==========================

- Never invent another business. Always use the provided business name "${data.businessName}".
- NEVER use a generic "Hero -> Features -> How It Works -> Testimonials" template.
- Purposeful Section Order: You MUST follow the industry-specific section sequence: ${JSON.stringify(strategy.sectionSequence)}
- STRICT INDUSTRY PURITY (NO CROSS-POLLINATION / CONTAMINATION):
  * For Ceramics / E-Commerce: NEVER output dining menus, culinary dishes, chef specials, or food recipes. Use handcrafted pottery collections, stoneware glaze series, kiln craft, and functional tableware.
  * For Creative Agency / Studio: NEVER output fashion ateliers, couture clothing, sartorial craft, or runway lookbooks. Use branding case studies, digital experiences, motion design, creative direction, and client impact.
  * For Dental Clinic / Healthcare: NEVER output pottery, tableware, dining, or shopping carts. Use clinical hygiene, dental implants, cosmetic aligners, board-certified doctors, and gentle patient care.
  * For Architecture: NEVER output food, fashion garments, or dental checkups. Use spatial design, master planning, sustainable materiality, and built project monographs.
  * For SaaS / AI Platforms: NEVER output physical craft, dining menus, or clinical exams. Use workflow automation, high-concurrency APIs, developer tools, telemetry, and bank-grade security.
  * For Luxury Fashion: NEVER output software APIs, dental exams, or cafe menus. Use haute couture, runway silhouettes, heirloom fabrics, master tailoring, and private atelier fittings.
  * For Electrician / Trades: NEVER output fashion collections or tech APIs. Use certified 24/7 electrical dispatch, licensed master technicians, transparent upfront pricing, and safety guarantees.
- FORBIDDEN SYSTEM STRINGS IN USER CONTENT:
  * NEVER use words like "AUTONOMOUS DESIGN DIRECTION", "DESIGN INTELLIGENCE", "HIGH_TRUST_SERVICE", "WARM_ARTISANAL", "DARK_TECHNICAL", "SKILL", "PROMPT", or internal metadata terms in badges, titles, or subtitles.
- WRITE AUTHENTIC, SENSORY HUMAN COPY: Write copy that feels like an experienced creative director wrote it specifically for ${data.businessName}.
- HERO COMPOSITION: Provide 3 domain-authentic "trustBadges" specifically relevant to ${data.category} (e.g. for Cafe: "Single-Origin Beans", "Fresh Roasted Daily", "Warm Garden Seating"; for Dental: "Board-Certified Specialists", "Gentle Care", "Digital 3D Scans").
- ABOUT HIGHLIGHTS: Provide 4 bespoke "highlights" that describe this business's specific craft or standards.
- CARD ARCHITECTURE: For each section, select an appropriate compositional card family from: "bento", "expandable", "stacked", "spotlight", "image-reveal", "perspective", "editorial", "horizontal-media", "project-showcase", "testimonial-stack", "comparison", "stat", "service", "feature-reveal", "floating".
- Return ONLY valid JSON adhering strictly to the JSON schema below.
- Do NOT return markdown or code fences.
- Do NOT return HTML.
- Do NOT explain anything.

==========================
JSON FORMAT
==========================

{
  "sectionOrder": ${JSON.stringify(strategy.sectionSequence)},
  "brand": {
    "name": "${data.businessName}",
    "shortName": "${data.businessName.split(" ")[0]}",
    "tagline": "",
    "industry": "${data.category}",
    "description": "${data.description}"
  },
  "navbar": {
    "logo": {
      "type": "text",
      "text": "${data.businessName}"
    },
    "links": [
      {
        "id": "nav-about",
        "label": "About",
        "action": { "type": "scroll", "target": "about" }
      },
      {
        "id": "nav-services",
        "label": "Services",
        "action": { "type": "scroll", "target": "services" }
      },
      {
        "id": "nav-contact",
        "label": "Contact",
        "action": { "type": "scroll", "target": "contact" }
      }
    ]
  },
  "designStrategy": {
    "visualArchetype": "${strategy.visualArchetype}",
    "heroType": "${strategy.heroType}",
    "visualConcept": "${strategy.visualConcept || ""}",
    "colorMood": "${strategy.colorMood}",
    "typographyStyle": "${strategy.typographyStyle}",
    "cardTreatment": "${strategy.cardTreatment}",
    "backgroundStrategy": ${JSON.stringify(strategy.backgroundStrategy)},
    "heroBackground": ${JSON.stringify(strategy.heroBackground)},
    "spatial3d": ${JSON.stringify(strategy.spatial3d)},
    "antiRepetitionFingerprint": "${strategy.antiRepetitionFingerprint || ""}",
    "skillExecutionPlan": ${JSON.stringify(strategy.skillExecutionPlan)}
  },
  "skillExecutionPlan": ${JSON.stringify(strategy.skillExecutionPlan)},
  "hero": {
    "title": "",
    "subtitle": "",
    "button": "",
    "layoutVariant": "${strategy.heroType}",
    "heroBackground": ${JSON.stringify(strategy.heroBackground)},
    "badges": ["${data.category.toUpperCase()}"],
    "trustBadges": [
      "",
      "",
      ""
    ]
  },
  "about": {
    "title": "",
    "content": "",
    "badge": "OUR STORY",
    "highlights": [
      "",
      "",
      "",
      ""
    ]
  },
  "services": [
    {
      "title": "",
      "description": "",
      "cardFamily": "service",
      "badge": ""
    }
  ],
  "features": [
    {
      "title": "",
      "description": "",
      "cardFamily": "bento",
      "metric": ""
    }
  ],
  "reviews": [
    {
      "author": "",
      "role": "",
      "text": "",
      "rating": 5
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
    "businessName": "${data.businessName}",
    "copyright": "© ${new Date().getFullYear()} ${data.businessName}. All Rights Reserved."
  }
}

Return ONLY the JSON object.
`;
}
