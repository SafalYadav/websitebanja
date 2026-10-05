export interface GenerationHold {
  status: "RESEARCH_REQUIRED" | "WAITING_HUMAN_APPROVAL";
  researchId: string;
  correlationId?: string;
}

export class GenerationHoldError extends Error {
  constructor(public readonly hold: GenerationHold) {
    super("Generation paused for independent business research and human approval");
    this.name = "GenerationHoldError";
  }
}

/** A hold is not a completed specialist work product or a retryable generation. */
export function readGenerationHold(value: unknown): GenerationHold | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.status !== "RESEARCH_REQUIRED" && record.status !== "WAITING_HUMAN_APPROVAL") return null;
  if (typeof record.researchId !== "string" || !/^[a-f0-9]{64}$/.test(record.researchId)) return null;
  return { status: record.status, researchId: record.researchId,
    correlationId: typeof record.correlationId === "string" ? record.correlationId : undefined };
}
