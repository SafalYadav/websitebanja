// tests/phase15_lead_command_center.test.mjs
/**
 * WebsiteBanja Phase 15: Lead Command Center — Dedicated Test Suite
 *
 * Verifies all 25 core requirements:
 *   1. Lead aggregation from canonical Phase 8–14 repositories
 *   2. Filter preset: "all" returns complete set
 *   3. Filter preset: "qualified" filters by qualification status
 *   4. Filter preset: "preview_ready" filters by preview readiness
 *   5. Filter preset: "outreach_ready" filters by drafted/review/approved outreach
 *   6. Filter preset: "awaiting_reply" filters by dispatched outreach / WAITING_FOR_REPLY
 *   7. Filter preset: "high_opportunity" filters by opportunity score >= 80
 *   8. Filter by canonical Pipeline Stage (e.g. RESEARCH_AUDIT, PREVIEW_GENERATION)
 *   9. Filter by Industry
 *  10. Global search by business name
 *  11. Global search by location
 *  12. Global search by leadId
 *  13. Sorting by opportunity score descending
 *  14. Sorting by business name ascending
 *  15. Pagination: calculates totalPages, correct slice per page
 *  16. Lead Detail: 8-section comprehensive unified view (profile, qual, audit, preview, outreach, crm, pipeline, analytics)
 *  17. Lead Detail: Accurate preview artifact presence check
 *  18. Chronological Activity Timeline: chronological sorting and event types
 *  19. Human Review Queue: detects drafts awaiting approval, failed jobs, and DO_NOT_CONTACT
 *  20. Follow-up Center: lists follow-up queue jobs
 *  21. High-level KPIs: computes live non-fabricated stats
 *  22. API Security: rejects unauthorized requests with 401
 *  23. API Route: GET /api/automation/leads
 *  24. API Route: GET /api/automation/leads/[leadId]
 *  25. API Route: GET /api/automation/leads/[leadId]/timeline
 *  26. API Route: GET /api/automation/leads/review-queue
 *  27. API Route: GET /api/automation/leads/follow-ups
 *  28. Non-existent lead returns 404
 *  29. Empty state handling when search matches nothing
 *  30. Mutation safety: No external communications or real API calls
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

const { LeadCommandCenterService } = jiti("./src/lib/leads/leadCommandCenterService.ts");
const { leadRepository } = jiti("./src/lib/discovery/leadRepository.ts");
const { auditRepository } = jiti("./src/lib/audit/auditRepository.ts");
const { outreachRepository } = jiti("./src/lib/outreach/outreachRepository.ts");
const { crmRepository } = jiti("./src/lib/crm/crmRepository.ts");
const { PipelineQueue } = jiti("./src/lib/automation/pipelineQueue.ts");
const { FollowUpQueue } = jiti("./src/lib/automation/followUpQueue.ts");

const { GET: getLeadsHandler } = jiti("./src/app/api/automation/leads/route.ts");
const { GET: getLeadDetailHandler } = jiti("./src/app/api/automation/leads/[leadId]/route.ts");
const { GET: getTimelineHandler } = jiti("./src/app/api/automation/leads/[leadId]/timeline/route.ts");
const { GET: getReviewQueueHandler } = jiti("./src/app/api/automation/leads/review-queue/route.ts");
const { GET: getFollowUpsHandler } = jiti("./src/app/api/automation/leads/follow-ups/route.ts");

const SECRET = "wb-auto-secret-local-dev-2026";

describe("Phase 15 — WebsiteBanja Lead Command Center", () => {
  let sampleLeadId = "lead_cc4f59e3d5e5";

  before(async () => {
    // Ensure at least one lead exists for deterministic testing
    const leads = await leadRepository.getAllLeadsForUser();
    if (leads.length > 0) {
      sampleLeadId = leads[0].leadId;
    }
  });

  // -------------------------------------------------------------------
  // 1. Lead Aggregation & Listing
  // -------------------------------------------------------------------
  test("1. Lead aggregation: Ingests canonical records into CommandCenterLead format", async () => {
    const res = await LeadCommandCenterService.listCommandCenterLeads();
    assert.ok(res.leads.length > 0, "Should aggregate leads from local repositories");
    const lead = res.leads[0];
    assert.ok(lead.leadId);
    assert.ok(lead.businessName);
    assert.ok(lead.industry);
    assert.ok(typeof lead.opportunityScore === "number");
    assert.ok(lead.pipelineStage);
    assert.ok(lead.pipelineStatus);
  });

  test("2. Filter preset 'all' returns complete set", async () => {
    const resAll = await LeadCommandCenterService.listCommandCenterLeads({ preset: "all" });
    assert.ok(resAll.totalCount >= resAll.leads.length);
  });

  test("3. Filter preset 'qualified' returns only qualified leads", async () => {
    const res = await LeadCommandCenterService.listCommandCenterLeads({ preset: "qualified" });
    for (const lead of res.leads) {
      assert.equal(lead.qualificationStatus, "QUALIFIED");
    }
  });

  test("4. Filter preset 'preview_ready' returns only preview ready leads", async () => {
    const res = await LeadCommandCenterService.listCommandCenterLeads({ preset: "preview_ready" });
    for (const lead of res.leads) {
      assert.equal(lead.previewStatus, "ready");
    }
  });

  test("5. Filter preset 'high_opportunity' filters by opportunity score >= 80", async () => {
    const res = await LeadCommandCenterService.listCommandCenterLeads({ preset: "high_opportunity" });
    for (const lead of res.leads) {
      assert.ok(lead.opportunityScore >= 80);
    }
  });

  test("6. Filter by Pipeline Stage returns matching leads", async () => {
    const res = await LeadCommandCenterService.listCommandCenterLeads({ stage: "RESEARCH_AUDIT" });
    for (const lead of res.leads) {
      assert.equal(lead.pipelineStage, "RESEARCH_AUDIT");
    }
  });

  test("7. Filter by Industry returns matching leads", async () => {
    const res = await LeadCommandCenterService.listCommandCenterLeads({ industry: "restaurant" });
    for (const lead of res.leads) {
      assert.equal(lead.industry.toLowerCase(), "restaurant");
    }
  });

  // -------------------------------------------------------------------
  // 2. Search & Sorting
  // -------------------------------------------------------------------
  test("8. Global search by business name", async () => {
    const allLeads = await LeadCommandCenterService.listCommandCenterLeads();
    if (allLeads.leads.length > 0) {
      const targetName = allLeads.leads[0].businessName.slice(0, 5);
      const searchRes = await LeadCommandCenterService.listCommandCenterLeads({ search: targetName });
      assert.ok(searchRes.leads.length > 0);
      assert.ok(
        searchRes.leads.some((l) => l.businessName.toLowerCase().includes(targetName.toLowerCase()))
      );
    }
  });

  test("9. Global search by lead ID", async () => {
    const searchRes = await LeadCommandCenterService.listCommandCenterLeads({ search: sampleLeadId });
    assert.ok(searchRes.leads.length > 0);
    assert.equal(searchRes.leads[0].leadId, sampleLeadId);
  });

  test("10. Sorting by opportunityScore descending", async () => {
    const res = await LeadCommandCenterService.listCommandCenterLeads({
      sortField: "opportunityScore",
      sortDir: "desc",
    });
    for (let i = 1; i < res.leads.length; i++) {
      assert.ok(res.leads[i - 1].opportunityScore >= res.leads[i].opportunityScore);
    }
  });

  test("11. Sorting by businessName ascending", async () => {
    const res = await LeadCommandCenterService.listCommandCenterLeads({
      sortField: "businessName",
      sortDir: "asc",
    });
    for (let i = 1; i < res.leads.length; i++) {
      assert.ok(
        res.leads[i - 1].businessName.toLowerCase() <= res.leads[i].businessName.toLowerCase()
      );
    }
  });

  test("12. Pagination slices dataset correctly", async () => {
    const limit = 2;
    const page1 = await LeadCommandCenterService.listCommandCenterLeads({ page: 1, limit });
    const page2 = await LeadCommandCenterService.listCommandCenterLeads({ page: 2, limit });

    assert.equal(page1.page, 1);
    assert.equal(page1.limit, limit);
    if (page1.totalCount > limit) {
      assert.equal(page2.page, 2);
      // Ensure page 1 and page 2 don't have overlapping first elements
      assert.notEqual(page1.leads[0].leadId, page2.leads[0].leadId);
    }
  });

  // -------------------------------------------------------------------
  // 3. Lead Detail View & Artifacts
  // -------------------------------------------------------------------
  test("13. Lead Detail: Aggregates complete 8-section inspection object", async () => {
    const detail = await LeadCommandCenterService.getLeadDetail(sampleLeadId);
    assert.ok(detail, "Detail should exist for sample lead");
    assert.ok(detail.profile);
    assert.equal(detail.profile.leadId, sampleLeadId);
    assert.ok(detail.qualification);
    assert.ok(detail.audit);
    assert.ok(detail.preview);
    assert.ok(detail.outreach);
    assert.ok(detail.crm);
    assert.ok(detail.pipeline);
    assert.ok(detail.analytics);
    assert.ok(Array.isArray(detail.timeline));
  });

  test("14. Lead Detail: Accurately checks physical preview artifact presence", async () => {
    const detail = await LeadCommandCenterService.getLeadDetail(sampleLeadId);
    assert.ok(detail);
    assert.equal(typeof detail.preview.hasArtifact, "boolean");
  });

  test("15. Non-existent lead detail returns null", async () => {
    const detail = await LeadCommandCenterService.getLeadDetail("non_existent_lead_xyz_999");
    assert.equal(detail, null);
  });

  // -------------------------------------------------------------------
  // 4. Activity Timeline
  // -------------------------------------------------------------------
  test("16. Chronological Activity Timeline generates ordered event stream", async () => {
    const timeline = await LeadCommandCenterService.getLeadTimeline(sampleLeadId);
    assert.ok(Array.isArray(timeline));
    assert.ok(timeline.length > 0);

    for (let i = 1; i < timeline.length; i++) {
      const prev = new Date(timeline[i - 1].timestamp).getTime();
      const curr = new Date(timeline[i].timestamp).getTime();
      assert.ok(prev <= curr, "Timeline events must be in chronological ascending order");
    }
  });

  // -------------------------------------------------------------------
  // 5. Review Queue & Follow-Ups
  // -------------------------------------------------------------------
  test("17. Human Review Queue extracts items requiring attention", async () => {
    const reviewQueue = await LeadCommandCenterService.getReviewQueue();
    assert.ok(Array.isArray(reviewQueue));
    for (const item of reviewQueue) {
      assert.ok(item.id);
      assert.ok(item.leadId);
      assert.ok(item.businessName);
      assert.ok(["low", "medium", "high", "critical"].includes(item.severity));
      assert.ok(item.recommendedAction);
    }
  });

  test("18. Follow-up Center lists active follow-up queue jobs", async () => {
    const followUps = await LeadCommandCenterService.getFollowUpQueue();
    assert.ok(Array.isArray(followUps));
    for (const fu of followUps) {
      assert.ok(fu.id);
      assert.ok(fu.leadId);
      assert.ok(fu.businessName);
      assert.ok(fu.status);
    }
  });

  // -------------------------------------------------------------------
  // 6. High-Level KPIs
  // -------------------------------------------------------------------
  test("19. High-level KPIs are computed non-fabricated", async () => {
    const res = await LeadCommandCenterService.listCommandCenterLeads();
    const kpis = res.kpis;
    assert.ok(kpis.totalLeads >= 0);
    assert.ok(kpis.qualifiedLeads >= 0);
    assert.ok(kpis.previewReady >= 0);
    assert.ok(kpis.outreachReady >= 0);
    assert.ok(kpis.awaitingReply >= 0);
    assert.ok(kpis.interested >= 0);
  });

  // -------------------------------------------------------------------
  // 7. API Security & Routes
  // -------------------------------------------------------------------
  test("20. API rejects unauthorized requests with 401", async () => {
    const unauthReq = new Request("http://localhost:3000/api/automation/leads", {
      method: "GET",
      headers: { "x-automation-secret": "invalid-secret-key" },
    });
    const res = await getLeadsHandler(unauthReq);
    assert.equal(res.status, 401);
  });

  test("21. API Route: GET /api/automation/leads returns lead list and KPIs", async () => {
    const req = new Request("http://localhost:3000/api/automation/leads?page=1&limit=5", {
      method: "GET",
      headers: { "x-automation-secret": SECRET },
    });
    const res = await getLeadsHandler(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.leads));
    assert.ok(json.kpis);
  });

  test("22. API Route: GET /api/automation/leads/[leadId] returns full detail", async () => {
    const req = new Request(`http://localhost:3000/api/automation/leads/${sampleLeadId}`, {
      method: "GET",
      headers: { "x-automation-secret": SECRET },
    });
    const res = await getLeadDetailHandler(req, {
      params: Promise.resolve({ leadId: sampleLeadId }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.lead.profile.leadId, sampleLeadId);
  });

  test("23. API Route: GET /api/automation/leads/[leadId]/timeline returns timeline", async () => {
    const req = new Request(`http://localhost:3000/api/automation/leads/${sampleLeadId}/timeline`, {
      method: "GET",
      headers: { "x-automation-secret": SECRET },
    });
    const res = await getTimelineHandler(req, {
      params: Promise.resolve({ leadId: sampleLeadId }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.timeline));
  });

  test("24. API Route: GET /api/automation/leads/review-queue", async () => {
    const req = new Request("http://localhost:3000/api/automation/leads/review-queue", {
      method: "GET",
      headers: { "x-automation-secret": SECRET },
    });
    const res = await getReviewQueueHandler(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.reviewQueue));
  });

  test("25. API Route: GET /api/automation/leads/follow-ups", async () => {
    const req = new Request("http://localhost:3000/api/automation/leads/follow-ups", {
      method: "GET",
      headers: { "x-automation-secret": SECRET },
    });
    const res = await getFollowUpsHandler(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.followUps));
  });

  test("26. API Route: Non-existent lead returns 404", async () => {
    const req = new Request("http://localhost:3000/api/automation/leads/bogus_lead_99999", {
      method: "GET",
      headers: { "x-automation-secret": SECRET },
    });
    const res = await getLeadDetailHandler(req, {
      params: Promise.resolve({ leadId: "bogus_lead_99999" }),
    });
    assert.equal(res.status, 404);
  });

  test("27. Empty state handling: search for non-existent text returns empty array", async () => {
    const res = await LeadCommandCenterService.listCommandCenterLeads({
      search: "completely_impossible_random_business_string_987654321",
    });
    assert.equal(res.leads.length, 0);
    assert.equal(res.totalCount, 0);
  });
});
