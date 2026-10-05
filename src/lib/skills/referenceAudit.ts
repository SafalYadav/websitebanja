/** Reference demos are not evidence of a successful generated-site audit. */
export function referenceAudit(id: string, catalog: readonly string[]) {
  const registered = catalog.includes(id);
  return {
    status: registered ? "UNVERIFIED" as const : "NOT_FOUND" as const,
    reasons: [registered
      ? "Reference demo only. No generated-site screenshots, interaction results or specialist review are attached; runtime verification is required."
      : `Reference ${id} is not in this demonstration catalog.`],
    evidence: { kind: "reference_demo", registered, runtimeVerification: false },
  };
}
