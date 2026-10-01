// src/lib/intelligence/memory/memoryRetriever.ts
import { MemoryStore } from "./memoryStore";
import type {
  MemoryQuery,
  MemoryRetrievalResult,
  RetrievedMemoryItem,
  AgentStrategyRecord,
  AgentLessonRecord,
  BusinessMemoryItem,
} from "./memoryTypes";

export class MemoryRetriever {
  private static instance: MemoryRetriever;
  private store: MemoryStore;

  private constructor() {
    this.store = MemoryStore.getInstance();
  }

  public static getInstance(): MemoryRetriever {
    if (!MemoryRetriever.instance) {
      MemoryRetriever.instance = new MemoryRetriever();
    }
    return MemoryRetriever.instance;
  }

  /**
   * Retrieves relevance-scoped verified memory for the CEO or agent execution.
   */
  public async retrieve(query: MemoryQuery): Promise<MemoryRetrievalResult> {
    const domain = (query.domain || "general").toLowerCase();
    const minConfidence = query.minConfidence ?? 0.6;
    const limit = query.limit ?? 10;

    const retrievedItems: RetrievedMemoryItem[] = [];

    // 1. STRATEGIC MEMORY (Active, promoted domain strategies)
    let activeStrategy: AgentStrategyRecord | undefined;
    if (!query.level || query.level === "STRATEGIC_MEMORY") {
      activeStrategy = await this.store.getActiveStrategyForDomain(domain);
      if (activeStrategy) {
        retrievedItems.push({
          id: activeStrategy.strategyId,
          level: "STRATEGIC_MEMORY",
          title: activeStrategy.name,
          content: {
            description: activeStrategy.description,
            directives: activeStrategy.directives,
            avoidPatterns: activeStrategy.avoidPatterns,
            version: activeStrategy.version,
          },
          domain: activeStrategy.domain,
          confidence: activeStrategy.confidence,
          evidence: [],
          sourceReference: `agent_strategies:${activeStrategy.version}`,
          status: activeStrategy.status,
        });
      }
    }

    // 2. EXPERIENCE MEMORY (Verified / Promoted Lessons only — reject candidates or deprecated items)
    let relevantLessons: AgentLessonRecord[] = [];
    if (!query.level || query.level === "EXPERIENCE_MEMORY") {
      const allLessons = await this.store.listLessons(domain);
      relevantLessons = allLessons.filter((l) => {
        // Strict evidence filter: Only PROMOTED or VERIFIED lessons with confidence >= threshold
        const isVerified = l.status === "PROMOTED" || l.status === "VERIFIED";
        return isVerified && l.confidence >= minConfidence;
      });

      for (const lesson of relevantLessons.slice(0, limit)) {
        retrievedItems.push({
          id: lesson.lessonId,
          level: "EXPERIENCE_MEMORY",
          title: lesson.title,
          content: lesson.statement,
          domain: lesson.domain,
          confidence: lesson.confidence,
          evidence: lesson.evidence,
          sourceReference: `agent_lessons:${lesson.lessonId}`,
          status: lesson.status,
        });
      }
    }

    // 3. BUSINESS MEMORY (Strictly isolated by projectId and userId)
    let businessContext: BusinessMemoryItem | null = null;
    if (query.projectId && (!query.level || query.level === "BUSINESS_MEMORY")) {
      const bMem = await this.store.getBusinessMemory(query.projectId, query.userId);
      if (bMem) {
        businessContext = bMem;
        retrievedItems.push({
          id: bMem.id,
          level: "BUSINESS_MEMORY",
          title: `Business Profile: ${bMem.businessName}`,
          content: {
            category: bMem.category,
            preferences: bMem.validatedPreferences,
            verifiedFacts: bMem.verifiedFacts,
          },
          domain: bMem.category,
          confidence: 0.95,
          evidence: [],
          sourceReference: `business_memory:${query.projectId}`,
        });
      }
    }

    // 4. EXPERIENCE SUMMARY (Aggregated from past runs & failures for domain)
    const domainRuns = await this.store.listRuns(50, domain);
    const domainFailures = await this.store.listFailures(50, domain);

    const successfulRuns = domainRuns.filter((r) => r.success).length;
    const successRate = domainRuns.length > 0 ? Math.round((successfulRuns / domainRuns.length) * 100) : 100;
    const knownFailurePatterns = Array.from(new Set(domainFailures.map((f) => f.failureType)));

    // Calculate highest confidence
    const highestConfidence = retrievedItems.reduce((max, item) => Math.max(max, item.confidence), 0);

    const workingMemory = retrievedItems.filter((i) => i.level === "WORKING_MEMORY");
    const businessMemory = retrievedItems.filter((i) => i.level === "BUSINESS_MEMORY");
    const experienceMemory = retrievedItems.filter((i) => i.level === "EXPERIENCE_MEMORY");
    const strategicMemory = retrievedItems.filter((i) => i.level === "STRATEGIC_MEMORY");

    return {
      memories: retrievedItems.slice(0, limit),
      totalFound: retrievedItems.length,
      highestConfidence,
      activeStrategy: activeStrategy || null,
      relevantLessons,
      businessContext,
      workingMemory,
      businessMemory,
      experienceMemory,
      strategicMemory,
      experienceSummary: {
        pastRunsCount: domainRuns.length,
        successRate,
        knownFailurePatterns,
      },
    } as any;
  }
}
