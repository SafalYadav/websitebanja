/**
 * WebsiteBanja Knowledge Retrieval Layer - Public API
 * Milestone: M4 (Knowledge Retrieval Layer Abstraction)
 */

export * from "./types";
export * from "./retrieval";
export * from "../ai/contextBuilder";

import { knowledgeRetrievalService } from "./retrieval";

// Direct convenience helpers matching architecture requirements
export const getGlobalKnowledge = knowledgeRetrievalService.getGlobalKnowledge.bind(
  knowledgeRetrievalService
);
export const getKnowledgeByCategory = knowledgeRetrievalService.getKnowledgeByCategory.bind(
  knowledgeRetrievalService
);
export const getAllGlobalKnowledge = knowledgeRetrievalService.getAllGlobalKnowledge.bind(
  knowledgeRetrievalService
);
export const getProjectKnowledge = knowledgeRetrievalService.getProjectKnowledge.bind(
  knowledgeRetrievalService
);
export const getProjectKnowledgeByCategory = knowledgeRetrievalService.getProjectKnowledgeByCategory.bind(
  knowledgeRetrievalService
);
export const getProjectContext = knowledgeRetrievalService.getProjectContext.bind(
  knowledgeRetrievalService
);
export const setProjectKnowledge = async (
  projectIdOrInput:
    | string
    | {
        projectId: string;
        key: string;
        content?: any;
        value?: any;
        userId?: string;
        category?: string;
        confidence?: number;
        source?: string;
      },
  key?: string,
  value?: any,
  userId: string = "system",
  category: string = "agent_decisions"
) => {
  let input: any;
  if (typeof projectIdOrInput === "object" && projectIdOrInput !== null) {
    input = {
      projectId: projectIdOrInput.projectId,
      userId: projectIdOrInput.userId || "system",
      category: projectIdOrInput.category || "agent_decisions",
      key: projectIdOrInput.key,
      content: projectIdOrInput.content ?? projectIdOrInput.value,
      confidence: projectIdOrInput.confidence,
      source: projectIdOrInput.source,
    };
  } else {
    input = {
      projectId: projectIdOrInput,
      userId,
      category,
      key: key!,
      content: value,
    };
  }
  try {
    await knowledgeRetrievalService.setProjectKnowledgeEntry(input);
  } catch (err) {
    console.debug("[Knowledge] Project knowledge persistence skipped:", err instanceof Error ? err.message : err);
  }
};

export const setProjectKnowledgeEntry = knowledgeRetrievalService.setProjectKnowledgeEntry.bind(
  knowledgeRetrievalService
);
export const checkKnowledgeStaleness = knowledgeRetrievalService.checkKnowledgeStaleness.bind(
  knowledgeRetrievalService
);

