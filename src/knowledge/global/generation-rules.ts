import type { GlobalKnowledgeEntry, GenerationRulePayload } from "./types";

export const promptGuardrailsRule: GlobalKnowledgeEntry<GenerationRulePayload> = {
  metadata: {
    id: "wb:global:generation_rules:prompt_guardrails:v1",
    category: "generation_rules",
    title: "AI Generation Prompts, Behavioral Guardrails & JSON Schema Contracts",
    description: "Authoritative system prompt templates, forbidden LLM behaviors, required JSON schema structures, and few-shot examples",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/generation-rules.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["prompts", "guardrails", "json", "schema", "generation", "rules", "ai"]
  },
  data: {
    ruleKey: "prompt_guardrails",
    title: "Generation Prompts & Behavioral Guardrails",
    description: "Strict directives governing LLM generation behavior and preventing schema corruption",
    priority: "mandatory",
    systemPersona: "You are WebsiteBanja AI, an elite Website Designer, UI/UX Architect, Copywriter, and Commercial Branding Expert.",
    behavioralGuidelines: [
      "Produce engaging, conversion-optimized marketing copy tailored specifically to the user's business industry.",
      "Incorporate industry-appropriate terminology, value propositions, and customer trust signals.",
      "Strictly adopt the exact business name provided by the user. Never alter, abbreviate, or hallucinate an alternate business name.",
      "Ensure all required contact fields (phone, email, address) match user input exactly.",
      "Assign valid button actions (scroll, whatsapp, call, email) to interactive buttons."
    ],
    guardrails: [
      "Zero Markdown Wrappers: Return raw JSON object directly without code block markdown fences.",
      "Zero Preambles: Never output conversational introductions, pleasantries, or explanations.",
      "Complete Section Population: Always populate all 9 core section components with authentic data.",
      "Real Business Names: Use the precise business name supplied by the tenant without alterations.",
      "Valid Action Targets: Every interactive button must define a valid ButtonActionType and non-empty target."
    ],
    forbiddenOutputs: [
      "DO NOT wrap response in markdown code blocks (e.g. ```json or ```). Output raw JSON only.",
      "DO NOT include any conversational preamble, greetings, apologies, or explanations.",
      "DO NOT leave section arrays (services, features, faq) empty. Populate with at least 3-4 realistic items.",
      "DO NOT use placeholder text like 'Lorem ipsum', 'Coming soon', 'TBD', or '[Insert Phone Here]'.",
      "DO NOT invent fake telephone numbers, emails, or physical addresses when authentic values are provided.",
      "DO NOT return malicious or unescaped URLs (javascript:, data:)."
    ],
    forbiddenPatterns: [
      "^```json",
      "^```",
      "```$",
      "Lorem ipsum",
      "javascript:",
      "data:text/html"
    ],
    requiredSections: [
      "navbar",
      "hero",
      "about",
      "services",
      "features",
      "faq",
      "contact",
      "footer"
    ],
    outputRequirements: {
      format: "raw_json",
      disallowedWrappers: ["```json", "```"],
      requireValidActionTargets: true,
      enforceBrandFidelity: true
    },
    allowedButtonActions: [
      "scroll",
      "page",
      "url",
      "whatsapp",
      "call",
      "email",
      "none"
    ],
    systemPromptSnippet: "You are WebsiteBanja AI. Generate a complete, production-ready website for the specified business. Return raw JSON strictly matching the schema with zero markdown fences.",
    outputJsonSchema: {
      type: "object",
      required: [
        "sectionOrder", "hero", "about", "services", "features", "faq", "contact", "footer"
      ],
      properties: {
        sectionOrder: {
          type: "array",
          items: { type: "string" },
          description: "Ordered array of section keys defining page layout"
        },
        hero: {
          type: "object",
          required: ["title", "subtitle", "button"],
          properties: {
            title: { type: "string" },
            subtitle: { type: "string" },
            button: { type: "string" },
            image: { type: "string" },
            buttonAction: {
              type: "object",
              required: ["type", "target"],
              properties: {
                type: { type: "string", enum: ["scroll", "page", "url", "whatsapp", "call", "email", "none"] },
                target: { type: "string" },
                label: { type: "string" }
              }
            }
          }
        },
        about: {
          type: "object",
          required: ["title", "content"],
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            image: { type: "string" }
          }
        },
        services: {
          type: "array",
          items: {
            type: "object",
            required: ["title", "description"],
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              icon: { type: "string" },
              image: { type: "string" },
              buttonAction: { type: "object" }
            }
          }
        },
        features: {
          type: "array",
          items: {
            type: "object",
            required: ["title", "description"],
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              icon: { type: "string" }
            }
          }
        },
        faq: {
          type: "array",
          items: {
            type: "object",
            required: ["question", "answer"],
            properties: {
              question: { type: "string" },
              answer: { type: "string" }
            }
          }
        },
        contact: {
          type: "object",
          required: ["phone", "email", "address"],
          properties: {
            phone: { type: "string" },
            email: { type: "string" },
            address: { type: "string" }
          }
        },
        footer: {
          type: "object",
          required: ["copyright"],
          properties: {
            copyright: { type: "string" }
          }
        },
        productsSection: {
          type: "object",
          properties: {
            title: { type: "string" },
            subtitle: { type: "string" },
            products: { type: "array" }
          }
        }
      }
    },
    fewShotExample: {
      input: {
        businessName: "Royal Spice Bistro",
        category: "restaurant",
        description: "Authentic North Indian and Mughlai fine dining with a contemporary rooftop lounge in Indiranagar, Bangalore.",
        targetAudience: "Food enthusiasts and families looking for celebratory dining",
        phone: "+91 98765 43210",
        email: "reservations@royalspice.in",
        address: "100ft Road, Indiranagar, Bangalore"
      },
      outputSummary: "Generates rich culinary copy highlighting clay oven tandoors, slow-cooked gravies, curated mocktails, and table reservations via WhatsApp."
    }
  }
};

export const GLOBAL_GENERATION_RULES: GlobalKnowledgeEntry<GenerationRulePayload>[] = [
  promptGuardrailsRule,
];
