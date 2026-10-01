// src/lib/intelligence/executive/executiveReporter.ts
import type {
  ExecutiveDecision,
  ExecutiveExecutionResult,
  ExecutiveVerificationResult,
  ExecutiveEscalation,
} from "./executiveTypes";

export function generateExecutiveReport(
  decision: ExecutiveDecision,
  delegations: Array<{ agent: string; task: string; success: boolean; data?: unknown; error?: string }>,
  tools: Array<{ tool: string; success: boolean; data?: unknown; error?: string }>,
  verifications: ExecutiveVerificationResult[],
  escalations: ExecutiveEscalation[],
  durationMs: number
): string {
  const parts: string[] = [];

  parts.push(`EXECUTIVE BRIEFING — ${decision.objective.toUpperCase()}`);
  parts.push(`Priority: ${decision.priority.toUpperCase()} | Duration: ${durationMs}ms`);
  parts.push("");

  parts.push("STRATEGIC PLAN:");
  decision.plan.forEach((step, idx) => {
    parts.push(`  ${idx + 1}. ${step}`);
  });
  parts.push("");

  parts.push("SUB-AGENT DELEGATIONS:");
  if (delegations.length === 0) {
    parts.push("  None executed.");
  } else {
    delegations.forEach((d) => {
      const icon = d.success ? "✓" : "✗";
      parts.push(`  [${icon}] Agent: ${d.agent} — Task: ${d.task}`);
      if (d.error) parts.push(`      Error: ${d.error}`);
    });
  }
  parts.push("");

  parts.push("TOOL EXECUTIONS:");
  if (tools.length === 0) {
    parts.push("  None executed.");
  } else {
    tools.forEach((t) => {
      const icon = t.success ? "✓" : "✗";
      parts.push(`  [${icon}] Tool: ${t.tool}`);
      if (t.error) parts.push(`      Error: ${t.error}`);
    });
  }
  parts.push("");

  parts.push("VERIFICATION & INTEGRITY:");
  verifications.forEach((v) => {
    const icon = v.passed ? "PASSED" : "FAILED";
    parts.push(`  [${icon}] Rule: ${v.rule} — ${v.details || ""}`);
  });
  parts.push("");

  if (escalations.length > 0) {
    parts.push("ESCALATIONS (HUMAN ATTENTION REQUIRED):");
    escalations.forEach((e) => {
      parts.push(`  [${e.severity.toUpperCase()}] ${e.reason} (${e.timestamp})`);
    });
    parts.push("");
  }

  parts.push(`NEXT RECOMMENDED ACTION: ${decision.next_action}`);

  return parts.join("\n");
}
