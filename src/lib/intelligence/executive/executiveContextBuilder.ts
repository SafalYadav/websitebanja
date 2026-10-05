// src/lib/intelligence/executive/executiveContextBuilder.ts
import type { ExecutiveTaskRequest, ExecutiveContext, ExecutivePriority } from "./executiveTypes";
import { AgentRegistry } from "../agents/agentRegistry";
import { ToolRegistry } from "../tools/toolRegistry";

const KNOWN_DOMAINS: Array<{ name: string; keywords: string[] }> = [
  {
    name: "restaurant",
    keywords: ["restaurant", "dining", "cafe", "coffee", "food", "bar", "bistro", "bakery", "kitchen"],
  },
  {
    name: "retail",
    keywords: ["shop", "store", "boutique", "apparel", "clothing", "jewel", "gift", "market"],
  },
  {
    name: "hospitality",
    keywords: ["hotel", "resort", "stay", "homestay", "villa", "lodge", "travel", "tourism"],
  },
  {
    name: "healthcare",
    keywords: ["clinic", "doctor", "dental", "hospital", "physio", "pharmacy", "medical"],
  },
  {
    name: "automotive",
    keywords: ["bike", "car", "rental", "repair", "garage", "auto", "vehicle", "taxi", "cab"],
  },
  {
    name: "services",
    keywords: ["consulting", "agency", "plumber", "electrician", "cleaning", "legal", "accounting"],
  },
];

export function detectDomainFromObjective(objective: string): string {
  const lower = objective.toLowerCase();
  for (const domain of KNOWN_DOMAINS) {
    if (domain.keywords.some((kw) => lower.includes(kw))) {
      return domain.name;
    }
  }
  return "general_business";
}

export async function buildExecutiveContext(
  request: ExecutiveTaskRequest,
  runId: string
): Promise<ExecutiveContext> {
  const agentRegistry = AgentRegistry.getInstance();
  const toolRegistry = ToolRegistry.getInstance();

  const detectedDomain = detectDomainFromObjective(request.objective);

  const implicitConstraints = [
    "Strict adherence to anti-generic brand standards (zero template clones).",
    "WCAG AA accessible contrast ratio required for all previews.",
    "Mobile-first responsive layout architecture.",
    "WhatsApp automated messaging strictly forbidden.",
    "Outreach emails require explicit human approval before live sending.",
  ];

  const allConstraints = [
    ...(request.constraints || []),
    ...implicitConstraints,
  ];

  // Retrieve relevant verified long-term memory for domain and project
  let retrievedMemories: any[] = [];
  let activeStrategy: any = null;
  let relevantLessons: any[] = [];
  let businessContext: any = null;

  try {
    const { MemoryRetriever } = await import("../memory/memoryRetriever");
    const memResult = await MemoryRetriever.getInstance().retrieve({
      tenantId: request.tenantId || request.userId,
      domain: detectedDomain,
      projectId: request.projectId || undefined,
      userId: request.userId || undefined,
      minConfidence: 0.6,
      limit: 5,
    });
    retrievedMemories = memResult.memories;
    activeStrategy = memResult.activeStrategy;
    relevantLessons = memResult.relevantLessons;
    businessContext = memResult.businessContext;
  } catch {
    // Graceful fallback if memory layer encounters an issue
  }

  const retrievedMemory = {
    strategicMemory: relevantLessons.map((l: any) => ({
      id: l.lessonId,
      content: l.rule || l.statement,
      confidence: l.confidence,
      status: l.status,
    })),
    workingMemory: [],
    businessMemory: businessContext ? [businessContext] : [],
    experienceMemory: retrievedMemories,
  };

  return {
    runId,
    objective: request.objective,
    priority: request.priority || "medium",
    userId: request.userId,
    tenantId: request.tenantId || request.userId || "default_tenant",
    projectId: request.projectId,
    sessionId: request.sessionId,
    allowExternalWrite: request.allowExternalWrite ?? false,
    requireHumanApproval: request.requireHumanApproval ?? true,
    constraints: allConstraints,
    detectedDomain,
    availableAgents: agentRegistry.getAvailableAgents(),
    availableTools: toolRegistry.getAvailableTools(),
    history: [],
    startTime: Date.now(),
    retrievedMemories,
    activeStrategy,
    relevantLessons,
    businessContext,
    retrievedMemory,
  };
}

export class ExecutiveContextBuilder {
  public async buildContext(
    request: ExecutiveTaskRequest,
    runId?: string
  ): Promise<ExecutiveContext> {
    return buildExecutiveContext(request, runId || `run_ctx_${Date.now()}`);
  }
}

