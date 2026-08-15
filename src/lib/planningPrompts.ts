import type { AiWorkspace, PlanningInput } from "@/types/aiWorkspace";

export type PlanningPromptData = Partial<PlanningInput> & {
  businessName: string;
  category: string;
  description: string;
};

export function buildPlanningPrompt(data: PlanningPromptData, existingWorkspace?: AiWorkspace) {
  return `You are WebsiteBanja's software architect. Think and plan before implementation. Return a JSON object whose keys exactly match the requested .websitebanja Markdown paths. Each value must be complete Markdown.

Business details:
- Name: ${data.businessName}
- Category: ${data.category}
- Description: ${data.description}
- Audience: ${data.targetAudience}
- Style: ${data.style}; colors: ${data.primaryColor}, ${data.secondaryColor}
- Contact: ${data.phone}, ${data.email}, ${data.website}, ${data.instagram}, ${data.facebook}, ${data.address}

Create these documents:
- ai/memory.md: project vision, business goal, brand identity, coding style, architecture, preferred libraries, user preferences and prior decisions.
- ai/context.md: concise product context and constraints.
- ai/decisions.md: dated architecture decisions with reasons.
- ai/changelog.md: initial planning entry.
- ai/prompts.md: record the planning prompt and component-generation prompt intent.
- ai/roadmap.md: staged roadmap.
- planning/prd.md, planning/trd.md, planning/app-flow.md, planning/ui-ux.md, planning/backend-schema.md, planning/implementation-plan.md.
- tasks/active.md, tasks/completed.md, tasks/bugs.md.

${existingWorkspace ? `Existing workspace (read every document, preserve valid decisions, and update only what the new project context affects):\n${Object.entries(existingWorkspace).map(([path, content]) => `### ${path}\n${content}`).join("\n\n")}` : "This is a new workspace."}

Do not produce website code. Make reasonable assumptions explicit and preserve the document paths exactly.`;
}
