import { hashActionPayload } from "../policies/canonicalPayloadHash";
import type { KnowledgeConcept } from "./semanticKnowledge";

export function researchReviewHash(row: Record<string, unknown>): string {
  return hashActionPayload({ id: row.id, tenantId: row.tenant_id, version: row.version,
    dossier: row.dossier, reviews: row.agent_trace });
}

/** Server-owned provenance captured when an approved concept is consumed. */
export interface ApprovedKnowledgeBinding {
  tenantId: string;
  researchId: string;
  versionId: string;
  reviewHash: string;
  conceptKey: string;
  concept: KnowledgeConcept;
}

export class KnowledgeApprovalInvalidError extends Error {
  readonly code = "KNOWLEDGE_APPROVAL_REVOKED";
  constructor() {
    super("Approved research or its active learning version changed. Fresh human review is required before generation can continue.");
  }
}

/** Historical versions may be reviewed for rollback, but not consumed while inactive. */
export function reviewedKnowledgeBinding(row: Record<string, unknown>): ApprovedKnowledgeBinding {
  const dossier = row.dossier as { reusableKnowledge?: unknown } | null;
  const regression = row.regression_report as { passed?: boolean } | null;
  if (row.status !== "APPROVED" || typeof row.id !== "string" || typeof row.tenant_id !== "string" || !row.tenant_id.trim() || row.reviewed_by !== row.tenant_id ||
      row.approved_by !== row.reviewed_by || regression?.passed !== true || !row.concept ||
      typeof row.reviewed_payload_hash !== "string" || researchReviewHash(row) !== row.reviewed_payload_hash ||
      !dossier?.reusableKnowledge || hashActionPayload(row.concept) !== hashActionPayload(dossier.reusableKnowledge) ||
      !/^[1-9]\d*$/.test(String(row.knowledge_version_id)) || typeof row.concept_key !== "string") {
    throw new KnowledgeApprovalInvalidError();
  }
  return { tenantId: String(row.tenant_id), researchId: String(row.id),
    versionId: String(row.knowledge_version_id), reviewHash: row.reviewed_payload_hash,
    conceptKey: row.concept_key, concept: row.concept as KnowledgeConcept };
}

export function approvedKnowledgeBinding(row: Record<string, unknown>): ApprovedKnowledgeBinding {
  if (row.active !== true) throw new KnowledgeApprovalInvalidError();
  return reviewedKnowledgeBinding(row);
}
