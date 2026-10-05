import { createHash } from "crypto";
import { z } from "zod";
import { getPool } from "@/lib/db/queries";
import { modelRouter } from "@/lib/ai/router/modelRouter";
import { MODEL_CONFIG } from "@/lib/ai/router/modelConfig";
import type { GroundedBusinessProfile } from "../grounding/types";
import type { CanonicalGenerationRequest, CanonicalGenerationResponse } from "./types";
import { KnowledgeConceptSchema, verifyReusableKnowledge, readApprovedResearchKnowledge } from "./semanticKnowledge";
import { googleSearchGroundingSource } from "../grounding/sources/googleSearchGroundingSource";
import type { BusinessSemanticProfile } from "../semantic/businessSemanticReasoner";
import { bindPipelineResearch } from "./pipelineResearchContinuation";
import type { PipelineExecutionFence } from "@/lib/automation/pipelineExecutionLease";

export async function readResearchResume(id: string, tenantId: string) {
  await ensureResearchTables();
  const result = await getPool().query<{ status: string; result: CanonicalGenerationResponse | null }>(
    `SELECT q.status,q.result FROM public.generation_research_resumes q
     JOIN public.generation_research r ON r.id=q.research_id WHERE r.id=$1 AND r.tenant_id=$2`, [id, tenantId]);
  return result.rows[0] ?? null;
}

export interface AgentWorkProduct {
  agent: string;
  status: "completed" | "rejected" | "failed" | "unavailable";
  evidenceIds: string[];
  output: unknown;
  durationMs: number;
}

export const ResearchDossierSchema = z.object({
  reusableKnowledge: KnowledgeConceptSchema,
  domain: z.string().min(3),
  subdomain: z.string().min(3),
  businessModel: z.string().min(10),
  offerings: z.array(z.object({ title: z.string(), description: z.string(), evidenceIds: z.array(z.string()).min(1) })),
  primaryCta: z.string().min(3),
  preferredSubjects: z.array(z.string()).min(1),
  forbiddenSubjects: z.array(z.string()),
  regulatoryConstraints: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string()).min(1),
  contradictions: z.array(z.string()),
});
export type BusinessResearchDossier = z.infer<typeof ResearchDossierSchema>;

export function applyApprovedDossier(base: BusinessSemanticProfile, dossier: BusinessResearchDossier): BusinessSemanticProfile {
  return { ...base, domain: dossier.domain, subdomain: dossier.subdomain,
    confidence: dossier.confidence, confidenceLevel: "HIGH", customerIntent: dossier.businessModel,
    primaryObjects: dossier.preferredSubjects, forbiddenObjects: dossier.forbiddenSubjects,
    preferredImageryThemes: dossier.preferredSubjects, forbiddenImageryThemes: dossier.forbiddenSubjects,
    offerings: dossier.offerings.map(item => item.title),
    recommendedServices: dossier.offerings.map(({ title, description }) => ({ title, description })),
    primaryCta: { label: dossier.primaryCta, secondaryLabel: "Contact Us", intent: dossier.reusableKnowledge.primaryCta.intent },
    forbiddenClaims: [...base.forbiddenClaims, ...dossier.regulatoryConstraints],
  };
}

const ReviewSchema = z.object({
  approved: z.boolean(),
  reasons: z.array(z.string()).min(1),
  evidenceIds: z.array(z.string()).min(1),
});

export function researchKey(request: CanonicalGenerationRequest): string {
  return createHash("sha256").update(JSON.stringify([
    request.tenantId || request.userId || "automation", request.placeId || "",
    request.businessName.toLowerCase().trim(), request.category || "",
    request.leadId || "", request.pipelineRunId || "",
    request.source, request.location || "", request.websiteUrl || "", request.phone || "", request.email || "",
    request.requirements?.description || "", request.requirements?.targetAudience || "",
    request.requirements?.style || "", request.requirements?.primaryColor || "",
    request.requirements?.secondaryColor || "", request.requirements?.threeDPreference || "",
  ])).digest("hex");
}

export async function ensureResearchTables(): Promise<void> {
  await getPool().query(`CREATE TABLE IF NOT EXISTS public.generation_research (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, status TEXT NOT NULL,
    request JSONB NOT NULL, dossier JSONB, agent_trace JSONB NOT NULL DEFAULT '[]',
    reviewed_by TEXT, reviewed_at TIMESTAMPTZ, rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1
  )`);
  await getPool().query(`CREATE TABLE IF NOT EXISTS public.generation_research_resumes (
    research_id TEXT PRIMARY KEY REFERENCES public.generation_research(id),
    status TEXT NOT NULL DEFAULT 'QUEUED', lease_until TIMESTAMPTZ,
    lease_token TEXT,
    result JSONB, attempts INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await getPool().query("ALTER TABLE public.generation_research_resumes ADD COLUMN IF NOT EXISTS lease_token TEXT");
  await getPool().query("ALTER TABLE public.generation_research ADD COLUMN IF NOT EXISTS reviewed_payload_hash TEXT");
  await getPool().query(`CREATE TABLE IF NOT EXISTS public.generation_pipeline_continuations (
    research_id TEXT PRIMARY KEY REFERENCES public.generation_research(id),
    pipeline_run_id TEXT NOT NULL,tenant_id TEXT NOT NULL,lead_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'WAITING_RESEARCH',lease_token TEXT,lease_until TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  ); CREATE INDEX IF NOT EXISTS idx_pipeline_continuations_recovery ON public.generation_pipeline_continuations(tenant_id,status,updated_at);
  REVOKE ALL ON TABLE public.generation_pipeline_continuations FROM PUBLIC`);
}

export async function researchUnknownBusiness(request: CanonicalGenerationRequest, profile: GroundedBusinessProfile, resumeResearchId?: string, pipelineFence?: PipelineExecutionFence) {
  await ensureResearchTables();
  const id = resumeResearchId || researchKey(request);
  const tenantId = request.tenantId || request.userId;
  if (!tenantId) throw new Error("Authenticated tenant identity required for durable research");
  // An interrupted researcher must not leave a permanent, fabricated running state.
  await getPool().query(`UPDATE public.generation_research SET status='RESEARCH_REQUIRED',updated_at=NOW(),
    agent_trace=agent_trace || $3::jsonb WHERE id=$1 AND tenant_id=$2 AND status='RESEARCHING'
      AND updated_at<NOW()-INTERVAL '15 minutes'`, [id, tenantId, JSON.stringify([{ agent: "research_recovery", status: "failed", evidenceIds: [], output: "Research execution lease expired; fresh evidence/provider recovery is required", durationMs: 0 }])]);
  const existing = await getPool().query<{status: string; dossier: BusinessResearchDossier | null}>(
    "SELECT status, dossier FROM public.generation_research WHERE id=$1 AND tenant_id=$2", [id, tenantId]);
  if (existing.rows[0]) {
    if (pipelineFence) await bindPipelineResearch(id, request, pipelineFence);
    if (existing.rows[0].status === "APPROVED") {
      const approved = await readApprovedResearchKnowledge(id, tenantId);
      return { id, status: "APPROVED", dossier: ResearchDossierSchema.parse(approved.dossier), knowledgeBinding: approved.binding };
    }
    if (existing.rows[0].status === "WAITING_HUMAN_APPROVAL" || existing.rows[0].status === "REJECTED") {
      return { id, ...existing.rows[0] };
    }
    if (existing.rows[0].status === "RESEARCHING") {
      return { id, status: "RESEARCHING", dossier: null };
    }
  }
  const claimed = await getPool().query(
    `INSERT INTO public.generation_research(id,tenant_id,status,request,updated_at)
     VALUES($1,$2,'RESEARCHING',$3,NOW())
     ON CONFLICT (id) DO UPDATE
       SET status='RESEARCHING', request=$3, updated_at=NOW()
       WHERE public.generation_research.tenant_id=$2
         AND public.generation_research.status='RESEARCH_REQUIRED'
     RETURNING id`,
    [id, tenantId, JSON.stringify(request)]);
  if (!claimed.rowCount) {
    const recheck = await getPool().query<{status: string; dossier: BusinessResearchDossier | null}>(
      "SELECT status, dossier FROM public.generation_research WHERE id=$1 AND tenant_id=$2", [id, tenantId]);
    return { id, status: recheck.rows[0]?.status || "RESEARCHING", dossier: recheck.rows[0]?.dossier || null };
  }
  if (pipelineFence) await bindPipelineResearch(id, request, pipelineFence);
  const evidence = profile.evidence.filter(item => item.verificationStatus === "verified" && !item.supports.startsWith("location"));
  const trace: AgentWorkProduct[] = [];
  try {
    // CEO research retrieves cited internet evidence; never generates uncited category knowledge.
    for (let attempt = 0; attempt < 2; attempt++) {
      const retrieved = await googleSearchGroundingSource.groundQuery({ businessName: request.businessName,
        location: request.location, category: profile.googlePrimaryType || request.category });
      if (retrieved.isAvailable && retrieved.citations.length && retrieved.evidence.length) {
        evidence.push(...retrieved.evidence);
        trace.push({ agent: "semantic_research", status: "completed", evidenceIds: retrieved.evidence.map(item => item.id),
          output: { citations: retrieved.citations, queries: retrieved.queriesRun, evidence: [...evidence] }, durationMs: 0 });
        break;
      }
      if (attempt === 1) throw new Error("RESEARCH_REQUIRED: cited internet research unavailable after two attempts");
    }
    if (!evidence.length) throw new Error("No verified category or offering evidence is available for research.");
    const started = Date.now();
    const ceo = await modelRouter.route({
      systemPrompt: "You are the WebsiteBanja CEO researcher. Interpret only the supplied verified research evidence. Address landmarks never identify business category. Cite evidence IDs for every offering. Do not invent specialist services, prices, licensing or medical claims. Report contradictions honestly. Return JSON.",
      userPrompt: JSON.stringify({ businessName: request.businessName, category: request.category, evidence,
        outputSchema: z.toJSONSchema(ResearchDossierSchema),
        knowledgeRequirements: "reusableKnowledge describes an abstract business concept only. No company name, addresses, contacts, private reviews or URLs. categoryTerms must be grounded category terms, not company names." }),
      zodSchema: ResearchDossierSchema, temperature: 0.1, metadata: { agent: "ceo", requestId: id },
    }, { ...MODEL_CONFIG.agentPolicies.boss(), maxTotalAttempts: 2, stopOnNonTransient: true });
    if (!ceo.success || !ceo.data) throw new Error(ceo.error?.message || "CEO research unavailable");
    const dossier = ceo.data;
    verifyReusableKnowledge(dossier.reusableKnowledge, request.businessName);
    if (dossier.domain !== dossier.reusableKnowledge.domain || dossier.subdomain !== dossier.reusableKnowledge.subdomain) throw new Error("Reusable learning contradicts the researched domain");
    const validIds = new Set(evidence.map(item => item.id));
    if (dossier.confidence < 0.8 || dossier.contradictions.length ||
      [...dossier.evidenceIds, ...dossier.offerings.flatMap(item => item.evidenceIds)].some(ref => !validIds.has(ref))) {
      throw new Error("CEO dossier contains unresolved uncertainty or unsupported evidence references.");
    }
    trace.push({ agent: "ceo", status: "completed", evidenceIds: dossier.evidenceIds, output: dossier, durationMs: Date.now() - started });
    const bossStart = Date.now();
    const boss = await modelRouter.route({
      systemPrompt: "You are an independent WebsiteBanja Boss reviewer. Verify the CEO dossier against supplied original evidence. Reject invented offerings, unsupported category, address-landmark classification and contradictions. Cite evidence IDs and reasons. You cannot give human approval. Return JSON.",
      userPrompt: JSON.stringify({ dossier, evidence, outputSchema: z.toJSONSchema(ReviewSchema) }), zodSchema: ReviewSchema,
      temperature: 0, metadata: { agent: "boss", requestId: id },
    }, { ...MODEL_CONFIG.agentPolicies.boss(), maxTotalAttempts: 2, stopOnNonTransient: true });
    if (!boss.success || !boss.data || !boss.data.approved || boss.data.evidenceIds.some(ref => !validIds.has(ref))) {
      throw new Error("Boss research verification rejected or unavailable.");
    }
    trace.push({ agent: "boss", status: "completed", evidenceIds: boss.data.evidenceIds, output: boss.data, durationMs: Date.now() - bossStart });
    await getPool().query("UPDATE public.generation_research SET status='WAITING_HUMAN_APPROVAL',dossier=$2,agent_trace=$3,updated_at=NOW() WHERE id=$1",
      [id, JSON.stringify(dossier), JSON.stringify(trace)]);
    return { id, status: "WAITING_HUMAN_APPROVAL", dossier };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research failed";
    trace.push({ agent: "research", status: "failed", evidenceIds: [], output: message, durationMs: 0 });
    await getPool().query("UPDATE public.generation_research SET status='RESEARCH_REQUIRED',agent_trace=$2,updated_at=NOW() WHERE id=$1", [id, JSON.stringify(trace)]);
    return { id, status: "RESEARCH_REQUIRED", dossier: null };
  }
}
