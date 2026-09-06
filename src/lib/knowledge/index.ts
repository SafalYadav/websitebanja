/**
 * WebsiteBanja Knowledge Retrieval Layer - Public API
 * Milestone: M4 (Knowledge Retrieval Layer Abstraction)
 */

export * from "./types";
export * from "./retrieval";

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
  projectId: string,
  key: string,
  value: any,
  userId: string = 'system',
  category: string = 'agent_decisions'
) => {
  const input = {
    projectId,
    userId,
    category,
    key,
    content: value,
  } as any;
  await knowledgeRetrievalService.setProjectKnowledgeEntry(input);
};

export const setProjectKnowledgeEntry = knowledgeRetrievalService.setProjectKnowledgeEntry.bind(
  knowledgeRetrievalService
);
export const checkKnowledgeStaleness = knowledgeRetrievalService.checkKnowledgeStaleness.bind(
  knowledgeRetrievalService
);
