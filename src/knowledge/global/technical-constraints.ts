import type { GlobalKnowledgeEntry, TechnicalConstraintsPayload } from "./types";

export const technicalConstraintsEntry: GlobalKnowledgeEntry<TechnicalConstraintsPayload> = {
  metadata: {
    id: "wb:global:technical_constraints:v1",
    category: "technical_constraints",
    title: "Platform Technical Constraints, Rate Limits & Validation Rules",
    description: "Hard platform boundaries, rolling generation limits, string length caps, regex validation, and operational timeouts",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/technical-constraints.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["limits", "bounds", "validation", "timeouts", "security", "constraints"]
  },
  data: {
    key: "platform_limits",
    scope: "platform_limits",
    title: "WebsiteBanja Platform Operational Constraints",
    description: "System boundaries enforcing multi-tenant stability, input sanitization, and throughput limits",
    rateLimits: {
      freeGenerationsPer7Days: 3,
      proGenerationsPer7Days: 50,
      freeGenerationsPerWeek: 3,
      proGenerationsPerWeek: 50,
      studioAiActionsPerMinute: 30,
      studioActionRpm: 30,
      agentConversationsPerMinute: 30,
      agentTalkRpm: 30,
      leadSubmissionsPerHourPerIp: 10,
      catalogSyncsPerMinute: 60
    },
    payloadBounds: {
      maxPromptLengthChars: 2000,
      maxPromptLength: 2000,
      maxConversationContextChars: 12000,
      maxConversationContextLength: 12000,
      maxBusinessNameChars: 200,
      maxBusinessNameLength: 200,
      maxBusinessDescriptionChars: 3000,
      maxBusinessDescriptionLength: 3000,
      maxTargetAudienceLength: 500,
      maxAddressLength: 500,
      maxCustomCssChars: 10000,
      maxCatalogItemsPerProject: 500,
      maxImagesPerProductItem: 10,
      maxPagesPerWebsite: 20,
      maxUndoRedoStackStates: 50,
      maxLeadsPerProject: 5000
    },
    validationRules: {
      phoneFormat: "E.164",
      phoneMinDigits: 7,
      phoneMaxDigits: 15,
      defaultCountryCode: "+91",
      emailStandard: "RFC_5322",
      phoneRegex: "^\\+?[1-9]\\d{6,14}$",
      phoneIndianNormalization: {
        regex: "^[6-9]\\d{9}$",
        transform: "+91$1"
      },
      emailRegex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      hexColorRegex: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
      slugRegex: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      maxSlugLength: 64,
      forbiddenUrlProtocols: [
        "javascript:", "vbscript:", "data:text/html"
      ],
      blockedUrlProtocols: [
        "javascript:", "vbscript:", "data:text/html"
      ]
    },
    operationalTimeouts: {
      generationTimeoutMs: 45000,
      planningTimeoutMs: 60000,
      openAiGenerationMs: 45000,
      planningPipelineMs: 60000,
      studioAiActionMs: 25000,
      databaseQueryMs: 10000,
      clientAutosaveDebounceMs: 600
    }
  }
};

export const GLOBAL_TECHNICAL_CONSTRAINTS: GlobalKnowledgeEntry<TechnicalConstraintsPayload>[] = [
  technicalConstraintsEntry,
];
