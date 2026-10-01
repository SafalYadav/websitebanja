// src/lib/intelligence/executive/executiveVerifier.ts
import type {
  ExecutiveContext,
  ExecutiveDecision,
  ExecutiveVerificationResult,
} from "./executiveTypes";

export function verifyExecutiveExecution(
  decision: ExecutiveDecision,
  delegationResults: Array<{ agent: string; task: string; success: boolean; data?: unknown; error?: string }>,
  toolResults: Array<{ tool: string; success: boolean; data?: unknown; error?: string }>,
  context: ExecutiveContext
): ExecutiveVerificationResult[] {
  const verifications: ExecutiveVerificationResult[] = [];
  const domain = (context.detectedDomain || "general").toLowerCase();

  // 1. Category and Domain Coherence Check
  let categoryMismatch = false;
  let mismatchDetail: string | undefined;

  const combinedOutputString = JSON.stringify({
    decision,
    delegationResults,
    toolResults,
  }).toLowerCase();

  if (domain === "restaurant") {
    const conflictingTerms = ["bike rental", "scooter rental", "vehicle repair", "car rental", "dental clinic"];
    for (const term of conflictingTerms) {
      if (combinedOutputString.includes(term)) {
        categoryMismatch = true;
        mismatchDetail = `Detected conflicting domain keyword '${term}' while target objective domain is '${domain}'.`;
        break;
      }
    }
  } else if (domain === "automotive") {
    const conflictingTerms = ["appetizer", "chef's special", "menu tasting", "culinary delight", "dining room"];
    for (const term of conflictingTerms) {
      if (combinedOutputString.includes(term)) {
        categoryMismatch = true;
        mismatchDetail = `Detected conflicting culinary keyword '${term}' while target objective domain is '${domain}'.`;
        break;
      }
    }
  }

  verifications.push({
    rule: "domain_category_coherence",
    passed: !categoryMismatch,
    details: categoryMismatch ? mismatchDetail : `Execution verified consistent with domain '${domain}'.`,
    categoryMismatch,
    detectedCategory: domain,
    expectedCategory: domain,
  });

  // 2. Safety & Policy Compliance Check
  const invokedWhatsApp = toolResults.some(
    (t) => t.tool.toLowerCase().includes("whatsapp") && t.success
  ) || delegationResults.some(
    (d) => (d.agent.toLowerCase().includes("whatsapp") || d.task.toLowerCase().includes("send whatsapp")) && d.success
  );

  verifications.push({
    rule: "safety_whatsapp_prohibition",
    passed: !invokedWhatsApp,
    details: invokedWhatsApp
      ? "Violation detected: WhatsApp tool or delegation was executed."
      : "WhatsApp prohibition verified (zero WhatsApp actions executed).",
  });

  // 3. Human Approval Gate Compliance Check
  let unauthorizedSend = false;
  for (const t of toolResults) {
    if (t.tool.includes("send_outreach") && t.success && context.requireHumanApproval) {
      unauthorizedSend = true;
      break;
    }
  }
  verifications.push({
    rule: "safety_human_approval_gate",
    passed: !unauthorizedSend,
    details: unauthorizedSend
      ? "Violation detected: Outreach email dispatched without required human approval."
      : "Outreach human approval gate verified.",
  });

  // 4. Plan Execution Completeness Check
  const anyFailedDelegations = delegationResults.some((d) => !d.success);
  const anyFailedTools = toolResults.some((t) => !t.success);

  verifications.push({
    rule: "subagent_task_integrity",
    passed: !anyFailedDelegations,
    details: anyFailedDelegations
      ? "One or more sub-agent delegations failed during execution."
      : "All sub-agent delegations completed successfully.",
  });

  verifications.push({
    rule: "tool_execution_integrity",
    passed: !anyFailedTools,
    details: anyFailedTools
      ? "One or more tool calls failed during execution."
      : "All tool calls completed successfully.",
  });

  return verifications;
}
