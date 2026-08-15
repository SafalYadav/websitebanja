export const AI_WORKSPACE_FILES = [
  "ai/memory.md",
  "ai/context.md",
  "ai/decisions.md",
  "ai/changelog.md",
  "ai/prompts.md",
  "ai/roadmap.md",
  "planning/prd.md",
  "planning/trd.md",
  "planning/app-flow.md",
  "planning/ui-ux.md",
  "planning/backend-schema.md",
  "planning/implementation-plan.md",
  "tasks/active.md",
  "tasks/completed.md",
  "tasks/bugs.md",
] as const;

export type AiWorkspaceFile = (typeof AI_WORKSPACE_FILES)[number];
export type AiWorkspace = Record<AiWorkspaceFile, string>;

export interface PlanningInput {
  projectId: string;
  businessName: string;
  category: string;
  description: string;
  targetAudience: string;
  style: string;
  primaryColor: string;
  secondaryColor: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
  address: string;
}
