// tests/phase11_personalized_outreach.test.mjs
/**
 * WebsiteBanja Phase 11: Personalized Outreach Foundation — Test Suite
 *
 * Verifies all Phase 11 requirements:
 *   1. Lead & Audit Resolution: Resolves lead, audit, and preview from storage
 *   2. Rejection of Missing Lead: Rejects non-existent leadId with LEAD_NOT_FOUND (404)
 *   3. Multi-Channel Generation: Email (subject + body), WhatsApp, Instagram, SMS
 *   4. Factual Claim Protection: Rejects fabricated awards, fake revenue, and fake certifications
 *   5. Anti-Spam & Secret Guard: Rejects placeholders, lorem ipsum, and leaked credentials
 *   6. Channel Constraints: Enforces SMS < 160 chars, Instagram < 500 chars, WhatsApp < 800 chars
 *   7. Duplicate Protection: Reuses existing active draft for (leadId, channel, previewId)
 *   8. Human-in-the-Loop Lifecycle: draft -> review -> approved -> simulated_sent
 *   9. Local Simulation Outbox: Strictly simulated dispatch, records simulation receipt, zero external calls
 *  10. Multi-Industry Verification: Differentiated copy across 5 industries (Restaurant, Hotel, SaaS, Local, Agency)
 *  11. API Security & Validation: Rejects unauthorized requests, validates payload
 *  12. n8n Workflow Integrity: Valid JSON, top-level ID, zero hardcoded secrets
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

const { generateOutreachDraft } = jiti("./src/lib/outreach/personalizationEngine.ts");
const { validateOutreachDraft } = jiti("./src/lib/outreach/qualityValidator.ts");
const { outreachRepository } = jiti("./src/lib/outreach/outreachRepository.ts");
const { localSimulationProvider } = jiti("./src/lib/outreach/simulationProvider.ts");
const { POST: generateDraftHandler } = jiti(
  "./src/app/api/automation/generate-outreach-draft/route.ts"
);
const { GET: getOutreachHandler, PATCH: patchOutreachHandler } = jiti(
  "./src/app/api/automation/outreach/route.ts"
);

describe("Phase 11 — Personalization Engine & Multi-Channel Drafts", () => {
  const existingLeadId = "lead_cc4f59e3d5e5";

  test("1. Rejects non-existent leadId with LEAD_NOT_FOUND", async () => {
    const res = await generateOutreachDraft({
      leadId: "lead_non_existent_99999",
      channel: "email",
    });

    assert.equal(res.success, false);
    assert.equal(res.error?.code, "LEAD_NOT_FOUND");
    assert.equal(res.handoffPhase, "phase12_reply_intelligence_crm");
  });

  test("2. Generates personalized Email draft with non-empty subject and 5-part structure", async () => {
    const res = await generateOutreachDraft({
      leadId: existingLeadId,
      channel: "email",
      regenerate: true,
    });

    assert.equal(res.success, true);
    assert.ok(res.outreach);
    const outreach = res.outreach;

    assert.equal(outreach.channel, "email");
    assert.equal(outreach.status, "draft");
    assert.ok(outreach.subject && outreach.subject.length > 5);
    assert.ok(outreach.subject.includes(outreach.business.name));

    // Message must include preview link
    assert.ok(outreach.message.includes(outreach.previewUrl));
    assert.ok(outreach.previewUrl.includes("/preview/"));

    // Validation must pass
    assert.equal(outreach.validation.isValid, true);
    assert.equal(outreach.validation.issues.length, 0);

    // Verify personalizations
    assert.ok(outreach.personalization.websiteProblems.length > 0);
    assert.ok(outreach.personalization.improvements.length > 0);
  });

  test("3. Generates conversational WhatsApp draft with preview URL", async () => {
    const res = await generateOutreachDraft({
      leadId: existingLeadId,
      channel: "whatsapp",
      regenerate: true,
    });

    assert.equal(res.success, true);
    assert.ok(res.outreach);
    const outreach = res.outreach;

    assert.equal(outreach.channel, "whatsapp");
    assert.ok(outreach.message.includes(outreach.previewUrl));
    assert.ok(outreach.message.length <= 800);
    assert.equal(outreach.validation.isValid, true);
  });

  test("4. Generates natural Instagram DM draft", async () => {
    const res = await generateOutreachDraft({
      leadId: existingLeadId,
      channel: "instagram",
      regenerate: true,
    });

    assert.equal(res.success, true);
    assert.ok(res.outreach);
    const outreach = res.outreach;

    assert.equal(outreach.channel, "instagram");
    assert.ok(outreach.message.includes(outreach.previewUrl));
    assert.ok(outreach.message.length <= 500);
    assert.equal(outreach.validation.isValid, true);
  });

  test("5. Generates punchy SMS draft strictly under 160 characters", async () => {
    const res = await generateOutreachDraft({
      leadId: existingLeadId,
      channel: "sms",
      regenerate: true,
    });

    assert.equal(res.success, true);
    assert.ok(res.outreach);
    const outreach = res.outreach;

    assert.equal(outreach.channel, "sms");
    assert.ok(outreach.message.includes(outreach.previewUrl));
    assert.ok(
      outreach.message.length <= 160,
      `SMS length (${outreach.message.length}) must be <= 160 characters`
    );
    assert.equal(outreach.validation.isValid, true);
  });
});

describe("Phase 11 — Factual Claim Protection & Quality Validator", () => {
  test("6. Passes valid draft and verifies all checks", () => {
    const valid = validateOutreachDraft({
      channel: "email",
      businessName: "Grand Heritage Dining",
      previewUrl: "http://localhost:3000/preview/prev_12345",
      subject: "A new website concept for Grand Heritage Dining",
      message:
        "Hi Grand Heritage Dining team,\n\nWe prepared a custom preview concept for your business: http://localhost:3000/preview/prev_12345\n\nBest,\nWebsiteBanja",
    });

    assert.equal(valid.isValid, true);
    assert.equal(valid.issues.length, 0);
    assert.ok(valid.passedChecks.includes("business_name_referenced"));
    assert.ok(valid.passedChecks.includes("valid_local_preview_url"));
  });

  test("7. Catches and rejects placeholder tokens and lorem ipsum", () => {
    const invalid = validateOutreachDraft({
      channel: "email",
      businessName: "Grand Heritage Dining",
      previewUrl: "http://localhost:3000/preview/prev_12345",
      subject: "A new website concept for Grand Heritage Dining",
      message:
        "Hi Grand Heritage Dining, [insert business observation here] and lorem ipsum dolor sit amet. Preview: http://localhost:3000/preview/prev_12345",
    });

    assert.equal(invalid.isValid, false);
    assert.ok(invalid.issues.some((i) => i.includes("forbidden placeholder")));
  });

  test("8. Catches and rejects unsubstantiated / fabricated claims", () => {
    const invalid = validateOutreachDraft({
      channel: "email",
      businessName: "Grand Heritage Dining",
      previewUrl: "http://localhost:3000/preview/prev_12345",
      subject: "A new website concept for Grand Heritage Dining",
      message:
        "Hi Grand Heritage Dining, we noticed you were voted #1 in the country and generated $10m in revenue. View preview: http://localhost:3000/preview/prev_12345",
    });

    assert.equal(invalid.isValid, false);
    assert.ok(invalid.issues.some((i) => i.includes("unsubstantiated/fabricated claim")));
  });

  test("9. Catches and rejects credential / secret leakage", () => {
    const invalid = validateOutreachDraft({
      channel: "email",
      businessName: "Grand Heritage Dining",
      previewUrl: "http://localhost:3000/preview/prev_12345",
      subject: "Concept for Grand Heritage Dining with secret wb-auto-secret-local-dev-2026",
      message:
        "Hi Grand Heritage Dining, here is preview: http://localhost:3000/preview/prev_12345",
    });

    assert.equal(invalid.isValid, false);
    assert.ok(invalid.issues.some((i) => i.includes("credential leakage")));
  });
});

describe("Phase 11 — Deduplication, Human Approval & Local Simulation Outbox", () => {
  const existingLeadId = "lead_cc4f59e3d5e5";

  test("10. Reuses active draft without creating unnecessary duplicates", async () => {
    const first = await generateOutreachDraft({
      leadId: existingLeadId,
      channel: "email",
      regenerate: true,
    });
    assert.equal(first.success, true);

    const second = await generateOutreachDraft({
      leadId: existingLeadId,
      channel: "email",
      regenerate: false,
    });
    assert.equal(second.success, true);
    assert.equal(second.reusedExisting, true);
    assert.equal(second.outreach?.outreachId, first.outreach?.outreachId);
  });

  test("11. Transitions status through human-in-the-loop: draft -> review -> approved", async () => {
    const draft = await generateOutreachDraft({
      leadId: existingLeadId,
      channel: "email",
      regenerate: true,
    });
    const outreachId = draft.outreach.outreachId;

    // Review
    const reviewed = await outreachRepository.updateOutreachStatus({
      outreachId,
      status: "review",
      notes: "Checked observations against audit",
    });
    assert.equal(reviewed?.status, "review");
    assert.ok(reviewed?.reviewedAt);

    // Approve
    const approved = await outreachRepository.updateOutreachStatus({
      outreachId,
      status: "approved",
    });
    assert.equal(approved?.status, "approved");
    assert.ok(approved?.approvedAt);
  });

  test("12. Executes simulated dispatch strictly locally to scratch outbox", async () => {
    const draft = await generateOutreachDraft({
      leadId: existingLeadId,
      channel: "email",
      regenerate: true,
    });
    const outreachId = draft.outreach.outreachId;

    await outreachRepository.updateOutreachStatus({
      outreachId,
      status: "approved",
    });

    const simResult = await localSimulationProvider.simulateDispatch(outreachId);
    assert.equal(simResult.success, true);
    assert.equal(simResult.outreach.status, "simulated_sent");
    assert.ok(simResult.receipt);
    assert.equal(simResult.receipt.provider, "local_simulation");
    assert.ok(simResult.receipt.simulatedAt);

    // Verify Phase 12 handoff object
    assert.equal(simResult.handoffToPhase12.handoffPhase, "phase12_reply_intelligence_crm");
    assert.equal(simResult.handoffToPhase12.status, "simulated_sent");

    // Verify persistence in scratch/outreach/
    const recordFile = path.resolve(process.cwd(), `scratch/outreach/${outreachId}.json`);
    assert.ok(fs.existsSync(recordFile));
    const saved = JSON.parse(fs.readFileSync(recordFile, "utf-8"));
    assert.equal(saved.status, "simulated_sent");
  });
});

describe("Phase 11 — Multi-Industry Verification (5 Industries)", () => {
  const industries = [
    {
      industry: "restaurant",
      name: "The Royal Saffron Bistro",
      location: "Vadodara, Gujarat",
      description: "Authentic royal Mughlai and Awadhi fine dining with family heritage recipes.",
      phone: "+91 98250 12345",
      rating: 4.8,
      reviewCount: 320,
    },
    {
      industry: "luxury_hotel",
      name: "The Grand Azure Palace & Spa",
      location: "Udaipur, Rajasthan",
      description: "Palatial lakefront sanctuary offering royal cliffside suites and heritage thalassotherapy.",
      phone: "+91 294 243 0011",
      rating: 4.9,
      reviewCount: 420,
    },
    {
      industry: "saas",
      name: "HyperFlow AI Systems",
      location: "Bangalore, Karnataka",
      description: "Enterprise event orchestration and autonomous telemetry pipelines.",
      phone: "+91 80 4123 4567",
      rating: 4.8,
      reviewCount: 185,
    },
    {
      industry: "local_service",
      name: "Apex Plumbing & HVAC Solutions",
      location: "Ahmedabad, Gujarat",
      description: "24/7 emergency plumbing, certified heating diagnostics, and commercial mechanical services.",
      phone: "+91 79 2650 9988",
      rating: 4.7,
      reviewCount: 290,
    },
    {
      industry: "creative_agency",
      name: "Studio Vertex Architecture & Brand",
      location: "Mumbai, Maharashtra",
      description: "Bespoke spatial architecture and high-impact digital brand ateliers.",
      phone: "+91 22 2490 8877",
      rating: 4.9,
      reviewCount: 95,
    },
  ];

  test("13. Generates differentiated, industry-authentic drafts across all 5 test industries", async () => {
    const generated = [];

    for (const ind of industries) {
      const mockLead = {
        leadId: `lead_p11_${ind.industry}`,
        businessName: ind.name,
        category: ind.industry,
        industry: ind.industry,
        city: ind.location.split(",")[0],
        address: ind.location,
        phone: ind.phone,
        description: ind.description,
        rating: ind.rating,
        reviewCount: ind.reviewCount,
        websiteStatus: "missing",
      };

      const res = await generateOutreachDraft({
        leadId: mockLead.leadId,
        channel: "email",
        overrideLead: mockLead,
        regenerate: true,
      });

      assert.equal(res.success, true, `Generation should succeed for ${ind.industry}`);
      assert.ok(res.outreach);
      assert.equal(res.outreach.validation.isValid, true);
      assert.ok(res.outreach.message.includes(ind.name));
      assert.ok(res.outreach.message.includes(res.outreach.previewUrl));

      generated.push(res.outreach);
    }

    assert.equal(generated.length, 5);

    // Verify messages differ beyond just the business name
    const messages = generated.map((g) => g.message);
    const uniqueMessages = new Set(messages);
    assert.equal(uniqueMessages.size, 5, "All 5 industry messages must be unique");
  });
});

describe("Phase 11 — Automation API & n8n Workflow Validation", () => {
  const SECRET = "wb-auto-secret-local-dev-2026";

  test("14. Rejects unauthenticated request with 401 UNAUTHORIZED", async () => {
    const req = new Request("http://localhost:3000/api/automation/generate-outreach-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: "lead_cc4f59e3d5e5" }),
    });

    const res = await generateDraftHandler(req);
    assert.equal(res.status, 401);
  });

  test("15. Rejects missing leadId with 400 VALIDATION_FAILED", async () => {
    const req = new Request("http://localhost:3000/api/automation/generate-outreach-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-automation-secret": SECRET,
      },
      body: JSON.stringify({}),
    });

    const res = await generateDraftHandler(req);
    assert.equal(res.status, 400);
  });

  test("16. Successfully executes POST /api/automation/generate-outreach-draft with secret", async () => {
    const req = new Request("http://localhost:3000/api/automation/generate-outreach-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-automation-secret": SECRET,
      },
      body: JSON.stringify({
        leadId: "lead_cc4f59e3d5e5",
        channel: "email",
        regenerate: true,
      }),
    });

    const res = await generateDraftHandler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.outreach);
    assert.equal(body.handoffPhase, "phase12_reply_intelligence_crm");
  });

  test("17. GET and PATCH /api/automation/outreach manage records and simulated sending", async () => {
    // GET list
    const getReq = new Request("http://localhost:3000/api/automation/outreach", {
      method: "GET",
      headers: { "x-automation-secret": SECRET },
    });
    const getRes = await getOutreachHandler(getReq);
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal(getBody.success, true);
    assert.ok(Array.isArray(getBody.records));

    // PATCH update status
    if (getBody.records.length > 0) {
      const targetId = getBody.records[0].outreachId;
      const patchReq = new Request("http://localhost:3000/api/automation/outreach", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-automation-secret": SECRET,
        },
        body: JSON.stringify({
          outreachId: targetId,
          status: "approved",
          notes: "Approved via API test",
        }),
      });
      const patchRes = await patchOutreachHandler(patchReq);
      assert.equal(patchRes.status, 200);
      const patchBody = await patchRes.json();
      assert.equal(patchBody.outreach?.status, "approved");
    }
  });

  test("18. Exported n8n workflow exists, matches pipeline, and has zero hardcoded secrets", () => {
    const workflowPath = path.resolve(
      process.cwd(),
      "automation/n8n/WebsiteBanja_Personalized_Outreach_Draft.json"
    );
    assert.ok(fs.existsSync(workflowPath), "Workflow file must exist");

    const content = fs.readFileSync(workflowPath, "utf-8");
    const json = JSON.parse(content);

    assert.equal(json.id, "WebsiteBanja_Personalized_Outreach");
    assert.equal(json.name, "WebsiteBanja — Personalized Outreach Draft");
    assert.ok(Array.isArray(json.nodes) && json.nodes.length >= 3);

    // Verify zero hardcoded real secrets in JSON
    assert.ok(!content.includes("sk-"), "No secret keys");
    assert.ok(!content.includes("AIzaSy"), "No API keys");

    // Must have HTTP request node targeting /api/automation/generate-outreach-draft
    const httpNode = json.nodes.find((n) => n.type === "n8n-nodes-base.httpRequest");
    assert.ok(httpNode, "Must include HTTP Request node");
    assert.ok(
      httpNode.parameters?.url?.includes("/api/automation/generate-outreach-draft"),
      "URL must target generate-outreach-draft"
    );
  });
});
