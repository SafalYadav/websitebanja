import { z } from "zod";
import { getPool } from "@/lib/db/queries";
import { businessSemanticReasoner } from "../semantic/businessSemanticReasoner";
import { approvedKnowledgeBinding, KnowledgeApprovalInvalidError } from "./approvedKnowledgeBinding";

/** Reusable concepts deliberately exclude company names, reviews, photos and contacts. */
export const KnowledgeConceptSchema = z.object({
  domain: z.string().min(3), subdomain: z.string().min(3),
  categoryTerms: z.array(z.string().min(3)).min(1),
  businessModel: z.string().min(10),
  primaryCta: z.object({ label: z.string().min(3), intent: z.string().min(3) }),
  preferredSubjects: z.array(z.string().min(3)).min(1),
  forbiddenSubjects: z.array(z.string().min(3)),
  regulatoryConstraints: z.array(z.string()),
}).strict();
export type KnowledgeConcept = z.infer<typeof KnowledgeConceptSchema>;

export function verifyReusableKnowledge(value: unknown, businessName: string): KnowledgeConcept {
  const concept = KnowledgeConceptSchema.parse(value);
  const serialized = JSON.stringify(concept).toLowerCase();
  const name = businessName.trim().toLowerCase();
  if (name.length > 2 && serialized.includes(name)) throw new Error("Reusable learning contains private company identity");
  if (/https?:\/\/|\b[^\s@]+@[^\s@]+\.[a-z]{2,}\b|\+?\d[\d\s()-]{8,}\d/i.test(serialized)) throw new Error("Reusable learning contains company-specific contact or source data");
  if (concept.domain === "general_commercial" || concept.domain === "unknown") throw new Error("Unresolved knowledge cannot be activated");
  const genericTerms = new Set(["business", "store", "shop", "retail", "establishment", "point of interest"]);
  if (concept.categoryTerms.some(term => genericTerms.has(term.toLowerCase().replace(/[_-]+/g, " ").trim()))) throw new Error("Generic category terms cannot activate specialist learning");
  return concept;
}

export function evaluateKnowledgeRegression(concept: KnowledgeConcept) {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const checks = concept.categoryTerms.map(category => {
    const baseline = businessSemanticReasoner.analyzeBusiness({ businessName: "Regression business", category });
    return { name: `No contradiction with approved taxonomy: ${category}`,
      passed: baseline.domain === "general_commercial" || baseline.domain === concept.domain,
      observedDomain: baseline.domain, proposedDomain: concept.domain };
  });
  const probes = [
    { businessName: "Thai Spa Jaipur", category: "spa", domain: "wellness_personal_care" },
    { businessName: "Orbit AI", category: "AI software company", domain: "software_technology" },
    { businessName: "Lotus Massage Center", category: "massage", domain: "wellness_personal_care" },
    { businessName: "Bella Hair Salon", category: "salon", domain: "beauty_aesthetics" },
    { businessName: "Amber Restaurant", category: "restaurant", domain: "food_dining" },
    { businessName: "Jaipur Bike Rental", category: "bike rental", domain: "transportation_mobility" },
    { businessName: "Smile Dental Clinic", category: "dental clinic", domain: "healthcare_clinical" },
    { businessName: "Sharma Law Firm", category: "legal counsel", domain: "professional_services" },
    { businessName: "Bright Future Academy", category: "education", domain: "education_training" },
  ];
  for (const probe of probes) {
    const normalized = normalize(probe.category);
    const matched = concept.categoryTerms.some(term => normalize(term) === normalized);
    const baseline = businessSemanticReasoner.analyzeBusiness(probe);
    checks.push({ name: `Known regression preserved: ${probe.businessName}`, passed: baseline.domain === probe.domain && (!matched || concept.domain === probe.domain),
      observedDomain: baseline.domain, proposedDomain: matched ? concept.domain : baseline.domain });
  }
  checks.push({ name: "Preferred and forbidden visuals do not conflict", passed: !concept.preferredSubjects.some(subject => concept.forbiddenSubjects.some(forbidden => normalize(forbidden) === normalize(subject))),
    observedDomain: concept.domain, proposedDomain: concept.domain });
  return { scope: "semantic_knowledge_registration" as const, renderedWebsiteVerified: false,
    passed: checks.every(check => check.passed), checks, evaluatedAt: new Date().toISOString() };
}

export async function ensureKnowledgeTables(): Promise<void> {
  await getPool().query(`CREATE TABLE IF NOT EXISTS public.semantic_knowledge_versions (
    id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, concept_key TEXT NOT NULL,
    concept JSONB NOT NULL, research_id TEXT NOT NULL REFERENCES public.generation_research(id),
    approved_by TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT FALSE,
    regression_report JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await getPool().query("CREATE UNIQUE INDEX IF NOT EXISTS semantic_knowledge_active ON public.semantic_knowledge_versions(tenant_id,concept_key) WHERE active");
  await getPool().query(`CREATE TABLE IF NOT EXISTS public.semantic_knowledge_events (
    id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, concept_key TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('ACTIVATED','ROLLED_BACK')),
    actor_user_id TEXT NOT NULL, version_id BIGINT NOT NULL REFERENCES public.semantic_knowledge_versions(id),
    previous_version_ids JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

export async function findApprovedKnowledge(tenantId: string, category: string) {
  await ensureKnowledgeTables();
  const normalized = category.trim().toLowerCase().replace(/[_-]+/g, " ");
  const rows = await getPool().query(`SELECT r.*,k.id AS knowledge_version_id,k.concept_key,k.concept,k.approved_by,k.regression_report,k.active
    FROM public.semantic_knowledge_versions k JOIN public.generation_research r ON r.id=k.research_id AND r.tenant_id=k.tenant_id
    WHERE k.tenant_id=$1 AND k.active AND r.status='APPROVED' AND r.reviewed_payload_hash IS NOT NULL
    AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(k.concept->'categoryTerms') term
    WHERE lower(replace(replace(term,'_',' '),'-',' '))=$2) ORDER BY k.id DESC LIMIT 1`, [tenantId, normalized]);
  if (!rows.rows[0]) return null;
  const binding = approvedKnowledgeBinding(rows.rows[0]);
  return { concept: KnowledgeConceptSchema.parse(binding.concept), binding };
}

export async function readApprovedResearchKnowledge(researchId: string, tenantId: string) {
  await ensureKnowledgeTables();
  const rows = await getPool().query(`SELECT r.*,k.id AS knowledge_version_id,k.concept_key,k.concept,k.approved_by,k.regression_report,k.active
    FROM public.generation_research r JOIN public.semantic_knowledge_versions k ON k.research_id=r.id AND k.tenant_id=r.tenant_id
    WHERE r.id=$1 AND r.tenant_id=$2 AND k.active`, [researchId, tenantId]);
  if (rows.rows.length !== 1) throw new KnowledgeApprovalInvalidError();
  const binding = approvedKnowledgeBinding(rows.rows[0]);
  KnowledgeConceptSchema.parse(binding.concept);
  return { binding, dossier: rows.rows[0].dossier };
}
