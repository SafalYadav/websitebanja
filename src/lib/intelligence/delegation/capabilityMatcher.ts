// src/lib/intelligence/delegation/capabilityMatcher.ts
import type { AgentCapability, CapabilityMatchResult } from "./delegationTypes";

export const REGISTERED_AGENT_CAPABILITIES: AgentCapability[] = [
  // BOSS Agent Capabilities
  {
    name: "task_decomposition",
    agent: "boss",
    category: "supervision",
    description: "Decomposes strategic executive objectives into concrete specialized child tasks.",
    keywords: ["decompose", "subtask", "plan", "supervise", "breakdown", "manage", "coordinate"],
  },
  {
    name: "agent_orchestration",
    agent: "boss",
    category: "supervision",
    description: "Supervises execution of specialized agents, resolves operational conflicts, and consolidates deliverables.",
    keywords: ["orchestrate", "supervise", "aggregate", "conflict", "consolidate", "oversee", "review"],
  },
  {
    name: "health_diagnostics",
    agent: "boss",
    category: "supervision",
    description: "Performs systemic pipeline health diagnostics, monitors agent telemetry, and detects operational issues.",
    keywords: ["health", "diagnostics", "telemetry", "error_rate", "pipeline_monitoring", "system_status"],
  },

  // SKILLS Agent Capabilities
  {
    name: "ui_pattern_selection",
    agent: "skills",
    category: "design",
    description: "Selects optimal UI/UX component patterns, 8pt design systems, and visual styles for specific industries.",
    keywords: ["ui", "ux", "skills", "layout", "design_system", "typography", "color_palette", "hero", "bento_grid", "component"],
  },
  {
    name: "responsive_ergonomics",
    agent: "skills",
    category: "ux",
    description: "Ensures mobile-first touch ergonomics, accessibility compliance (WCAG 2.2 AA), and cross-device reflow.",
    keywords: ["responsive", "accessibility", "wcag", "mobile", "ergonomics", "viewport", "touch_targets"],
  },
  {
    name: "style_direction",
    agent: "skills",
    category: "design",
    description: "Recommends typography scales, color directions, and interaction strategies aligned with conversion goals.",
    keywords: ["style", "visual_direction", "theme", "aesthetic", "conversion_design", "palette"],
  },

  // UNIQUENESS Agent Capabilities
  {
    name: "differentiation_analysis",
    agent: "uniqueness",
    category: "validation",
    description: "Analyzes design similarity against competitor websites and previous tenant designs to prevent cookie-cutter outputs.",
    keywords: ["uniqueness", "differentiation", "anti_generic", "similarity", "plagiarism", "overlap", "fingerprint", "originality"],
  },
  {
    name: "ast_fingerprinting",
    agent: "uniqueness",
    category: "validation",
    description: "Calculates AST fingerprints, structural token hashes, and cosine layout similarity.",
    keywords: ["ast", "fingerprint", "hash", "structure_similarity", "token_distance", "layout_hash"],
  },
  {
    name: "redesign_directives",
    agent: "uniqueness",
    category: "design",
    description: "Generates actionable redesign directives when visual or structural repetition exceeds safety thresholds.",
    keywords: ["redesign", "directives", "diversification", "novelty", "differentiation_directive", "avoid_patterns"],
  },
];

export class CapabilityMatcher {
  private static instance: CapabilityMatcher;
  private capabilities: AgentCapability[] = [...REGISTERED_AGENT_CAPABILITIES];

  private constructor() {}

  public static getInstance(): CapabilityMatcher {
    if (!CapabilityMatcher.instance) {
      CapabilityMatcher.instance = new CapabilityMatcher();
    }
    return CapabilityMatcher.instance;
  }

  /**
   * Returns all registered capabilities.
   */
  public getCapabilities(): AgentCapability[] {
    return [...this.capabilities];
  }

  /**
   * Returns capabilities for a specific agent.
   */
  public getCapabilitiesForAgent(agent: string): AgentCapability[] {
    return this.capabilities.filter((c) => c.agent.toLowerCase() === agent.toLowerCase());
  }

  /**
   * Matches the required keywords/tasks to registered capabilities and ranks agents.
   */
  public matchCapabilities(
    requiredKeywords: string[],
    context?: { preferredCategory?: string; allowedAgents?: string[] }
  ): CapabilityMatchResult[] {
    const normalizedReqs = requiredKeywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
    const allowed = context?.allowedAgents?.map((a) => a.toLowerCase());

    const agentScores: Record<
      string,
      { score: number; matchedCapabilities: Set<string>; reasons: string[] }
    > = {
      boss: { score: 0, matchedCapabilities: new Set(), reasons: [] },
      skills: { score: 0, matchedCapabilities: new Set(), reasons: [] },
      uniqueness: { score: 0, matchedCapabilities: new Set(), reasons: [] },
    };

    for (const cap of this.capabilities) {
      if (allowed && !allowed.includes(cap.agent.toLowerCase())) {
        continue;
      }

      let capMatches = 0;
      for (const req of normalizedReqs) {
        // Direct capability name match
        if (cap.name.toLowerCase().includes(req) || req.includes(cap.name.toLowerCase())) {
          capMatches += 3;
        }
        // Category match
        if (context?.preferredCategory && cap.category === context.preferredCategory) {
          capMatches += 1;
        }
        // Keyword matches
        for (const kw of cap.keywords) {
          if (kw.toLowerCase().includes(req) || req.includes(kw.toLowerCase())) {
            capMatches += 2;
          }
        }
      }

      if (capMatches > 0) {
        const agentEntry = agentScores[cap.agent.toLowerCase()] || {
          score: 0,
          matchedCapabilities: new Set(),
          reasons: [],
        };
        agentEntry.score += capMatches;
        agentEntry.matchedCapabilities.add(cap.name);
        agentEntry.reasons.push(`Matched capability ${cap.name} (${cap.category})`);
        agentScores[cap.agent.toLowerCase()] = agentEntry;
      }
    }

    const results: CapabilityMatchResult[] = Object.entries(agentScores)
      .filter(([agent]) => !allowed || allowed.includes(agent))
      .map(([agent, data]) => ({
        agent,
        score: data.score,
        matchedCapabilities: Array.from(data.matchedCapabilities),
        rationale:
          data.reasons.length > 0
            ? data.reasons.slice(0, 3).join("; ")
            : "No specific keyword matches; default fallback ranking.",
      }))
      .sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Finds the single best agent for a given set of requirements.
   */
  public findBestAgent(
    requiredKeywords: string[],
    context?: { preferredCategory?: string; allowedAgents?: string[]; fallbackAgent?: string }
  ): CapabilityMatchResult {
    const matches = this.matchCapabilities(requiredKeywords, context);
    if (matches.length > 0 && matches[0].score > 0) {
      return matches[0];
    }
    const fallback = context?.fallbackAgent || "boss";
    return {
      agent: fallback,
      score: 0,
      matchedCapabilities: [],
      rationale: `No direct keyword match found. Defaulting to fallback agent '${fallback}'.`,
    };
  }
}

export const capabilityMatcher = CapabilityMatcher.getInstance();
