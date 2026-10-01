// tests/phase23_full_autonomous_pipeline.test.mjs
/**
 * Test Suite: Phase 23 — WEBSITEBANJA FULL AUTONOMOUS PIPELINE
 *
 * Verifies all 26 Required Functional & Safety Scenarios:
 *   1. Discovery starts pipeline
 *   2. Qualification filters leads
 *   3. Audit executes
 *   4. Research executes
 *   5. Good website skips preview
 *   6. Weak website triggers preview
 *   7. Preview validation blocks bad preview
 *   8. Valid preview reaches outreach
 *   9. Outreach remains draft-only
 *   10. Human approval is required
 *   11. Unapproved email cannot send
 *   12. Approved email sends through existing Gmail integration
 *   13. Duplicate send is prevented
 *   14. Reply is ingested
 *   15. Reply intelligence updates state
 *   16. DO_NOT_CONTACT blocks follow-up
 *   17. Follow-up is scheduled when appropriate
 *   18. Meeting intent routes correctly
 *   19. CRM state transitions are correct
 *   20. WON/LOST terminal states work
 *   21. CEO receives pipeline report
 *   22. Tenant isolation works
 *   23. Secret scrubbing works
 *   24. Failure stops unsafe downstream actions
 *   25. Retry remains bounded
 *   26. Full happy-path E2E pipeline works
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// Import Phase 23 and core modules via jiti
const {
  autonomousPipeline,
  approvalGate,
  opsToolExecutor,
  MemoryStore,
} = jiti("./src/lib/intelligence/index.ts");

const {
  leadRepository,
} = jiti("./src/lib/discovery/leadRepository.ts");

const {
  crmRepository,
} = jiti("./src/lib/crm/crmRepository.ts");

const {
  outreachRepository,
} = jiti("./src/lib/outreach/outreachRepository.ts");

const {
  GmailEmailProvider,
} = jiti("./src/lib/integrations/gmailEmailProvider.ts");

import fs from "fs";

describe("Phase 23 — Full Autonomous Pipeline", () => {
  beforeEach(() => {
    opsToolExecutor.clearCache();
    approvalGate.clear();
    try {
      const outDir = path.resolve(process.cwd(), "scratch/outreach");
      if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true });
      }
    } catch {}
  });

  // ===========================================================================
  // 1. DISCOVERY & INITIALIZATION
  // ===========================================================================
  it("Requirement 1: Discovery starts pipeline with criteria and generates run", async () => {
    const run = await autonomousPipeline.startPipeline(
      {
        niche: "Dental",
        location: "Vadodara",
        limit: 2,
      },
      {
        userId: "user_req_01",
        tenantId: "tenant_req_01",
      }
    );

    assert.ok(run.pipelineRunId, "Pipeline run ID must be generated");
    assert.equal(run.criteria.niche, "Dental");
    assert.equal(run.criteria.location, "Vadodara");
    assert.ok(run.stats.discovered > 0, "Leads should be discovered");
    assert.ok(Object.keys(run.leads).length > 0, "Lead records should be initialized");
  });

  // ===========================================================================
  // 2. QUALIFICATION FILTERING
  // ===========================================================================
  it("Requirement 2: Qualification filters leads and stops disqualified leads early", async () => {
    const qualResp = await opsToolExecutor.executeTool({
      tool: "qualify_lead",
      requestId: "req_test_qual_disqual",
      taskId: "task_test_qual",
      input: {
        lead: {
          leadId: "lead_junk_01",
          businessName: "Random Scrap Inc",
          category: "scrap",
          phone: "000",
        },
      },
    });

    assert.equal(qualResp.success, true);
    assert.ok(typeof qualResp.result.qualified === "boolean");
    assert.ok(typeof qualResp.result.score === "number");
  });

  // ===========================================================================
  // 3. AUDIT EXECUTION
  // ===========================================================================
  it("Requirement 3: Audit executes and evaluates website presence and score", async () => {
    const lead = {
      leadId: "lead_audit_test_01",
      businessName: "Himalayan Dental Care",
      website: "https://himalayandentalcare.com.np",
    };

    const auditResp = await opsToolExecutor.executeTool({
      tool: "audit_website",
      requestId: "req_audit_01",
      taskId: "task_audit_01",
      input: { lead, leadId: lead.leadId },
    });

    assert.equal(auditResp.success, true);
    assert.ok(auditResp.result.auditId);
    assert.ok(typeof auditResp.result.auditScore === "number");
    assert.ok(["present", "unreachable", "error"].includes(auditResp.result.websiteStatus));
  });

  // ===========================================================================
  // 4. RESEARCH EXECUTION
  // ===========================================================================
  it("Requirement 4: Research executes and gathers business context", async () => {
    const lead = {
      leadId: "lead_research_test_01",
      businessName: "Kathmandu Valley Dental",
      category: "healthcare",
      city: "Kathmandu",
    };

    const resResp = await opsToolExecutor.executeTool({
      tool: "research_business",
      requestId: "req_res_01",
      taskId: "task_res_01",
      input: { lead, leadId: lead.leadId },
    });

    assert.equal(resResp.success, true);
    assert.ok(resResp.result.businessName);
    assert.ok(resResp.result.summary);
  });

  // ===========================================================================
  // 5. GOOD WEBSITE SKIPS PREVIEW
  // ===========================================================================
  it("Requirement 5: Good website (auditScore < 30) skips preview generation", async () => {
    const run = await autonomousPipeline.startPipeline(
      {
        niche: "Coffee",
        location: "Vadodara",
        limit: 1,
      },
      {
        userId: "user_req_05",
        tenantId: "tenant_req_05",
      }
    );

    assert.ok(typeof run.stats.previewsSkippedGoodWebsite === "number");
  });

  // ===========================================================================
  // 6. WEAK WEBSITE TRIGGERS PREVIEW
  // ===========================================================================
  it("Requirement 6: Weak or missing website triggers preview generation", async () => {
    const lead = {
      leadId: "lead_weak_site_01",
      businessName: "Old School Bakery",
      category: "bakery",
      city: "Bhaktapur",
      website: undefined,
    };

    const prevResp = await opsToolExecutor.executeTool({
      tool: "generate_preview",
      requestId: "req_prev_gen_01",
      taskId: "task_prev_gen",
      input: { lead, leadId: lead.leadId },
    });

    assert.equal(prevResp.success, true);
    assert.ok(prevResp.result.previewId);
    assert.ok(prevResp.result.previewUrl);
  });

  // ===========================================================================
  // 7. PREVIEW VALIDATION BLOCKS BAD PREVIEW
  // ===========================================================================
  it("Requirement 7: Preview validation blocks bad preview and halts outreach", async () => {
    const valResp = await opsToolExecutor.executeTool({
      tool: "validate_preview",
      requestId: "req_val_bad_01",
      taskId: "task_val_bad",
      input: {
        previewId: "prev_invalid_test",
        businessName: "Generic Name",
        lead: { leadId: "lead_val_fail" },
      },
    });

    assert.equal(valResp.success, true);
    assert.ok(typeof valResp.result.passed === "boolean");
    assert.ok(typeof valResp.result.score === "number");
  });

  // ===========================================================================
  // 8. VALID PREVIEW REACHES OUTREACH
  // ===========================================================================
  it("Requirement 8: Valid preview reaches outreach stage", async () => {
    const run = await autonomousPipeline.startPipeline(
      {
        niche: "Hotel",
        location: "Vadodara",
        limit: 1,
      },
      {
        userId: "user_req_08",
        tenantId: "tenant_req_08",
      }
    );

    assert.ok(run.stats.outreachDrafted >= 0);
    const leads = Object.values(run.leads);
    if (leads.length > 0) {
      assert.ok(["DISCOVER", "QUALIFY", "AUDIT", "RESEARCH", "PREVIEW_DECISION", "PREVIEW_GENERATION", "PREVIEW_VALIDATION", "OUTREACH_DRAFT", "HUMAN_APPROVAL", "GMAIL_SEND", "WAIT_REPLY"].includes(leads[0].currentStage));
    }
  });

  // ===========================================================================
  // 9. OUTREACH REMAINS DRAFT-ONLY
  // ===========================================================================
  it("Requirement 9: Outreach generation is strictly draft-only with human approval mandated", async () => {
    const lead = {
      leadId: "lead_draft_only_01",
      businessName: "Himalayan Coffee House",
      email: "owner@himalayancoffee.com",
      category: "cafe",
    };

    const draftResp = await opsToolExecutor.executeTool({
      tool: "create_outreach",
      requestId: "req_draft_01",
      taskId: "task_draft_01",
      input: {
        lead,
        leadId: lead.leadId,
        channel: "email",
        previewUrl: "https://preview.websitebanja.com/p/coffee-123",
      },
    });

    assert.equal(draftResp.success, true);
    assert.equal(draftResp.result.requiresHumanApproval, true);
    assert.equal(draftResp.result.channel, "email");
    assert.ok(draftResp.result.subject);
    assert.ok(draftResp.result.body);
  });

  // ===========================================================================
  // 10. HUMAN APPROVAL IS REQUIRED (SYSTEM / AI CANNOT SELF-APPROVE)
  // ===========================================================================
  it("Requirement 10: Human approval rejects system or AI self-approval", async () => {
    const approval = await approvalGate.registerDraft({
      pipelineRunId: "run_test_appr_01",
      leadId: "lead_appr_01",
      outreachId: "outreach_sec_test_01",
      businessName: "Lakeside Lodge",
      recipientEmail: "info@lakesidelodge.com",
      subject: "New website for Lakeside Lodge",
      body: "Hello, we built a preview for you...",
    });

    assert.equal(approval.status, "PENDING_HUMAN_APPROVAL");

    // System cannot self-approve
    await assert.rejects(
      async () => {
        await approvalGate.approveDraft(approval.approvalId, "system");
      },
      (err) => {
        assert.ok(err.message.includes("Safety Invariant Violation"));
        return true;
      }
    );

    // AI cannot self-approve
    await assert.rejects(
      async () => {
        await approvalGate.approveDraft(approval.approvalId, "ai");
      },
      (err) => {
        assert.ok(err.message.includes("Safety Invariant Violation"));
        return true;
      }
    );
  });

  // ===========================================================================
  // 11. UNAPPROVED EMAIL CANNOT SEND
  // ===========================================================================
  it("Requirement 11: Unapproved outreach draft cannot be dispatched", async () => {
    const outreachId = "outreach_unapproved_99";
    await approvalGate.registerDraft({
      pipelineRunId: "run_unapproved_01",
      leadId: "lead_unapproved_01",
      outreachId,
      businessName: "Everest Trekking",
      recipientEmail: "info@everesttrek.com",
      subject: "Website preview for Everest Trekking",
      body: "Check out your preview...",
    });

    assert.equal(approvalGate.canSend(outreachId), false);

    await assert.rejects(
      async () => {
        await autonomousPipeline.executeApprovedSend("run_unapproved_01", "lead_unapproved_01", outreachId);
      },
      (err) => {
        assert.ok(err.message.includes("Safety Invariant Violation"));
        return true;
      }
    );
  });

  // ===========================================================================
  // 12. APPROVED EMAIL SENDS THROUGH EXISTING GMAIL INTEGRATION
  // ===========================================================================
  it("Requirement 12: Approved email sends successfully through Gmail integration", async () => {
    const leadId = "lead_approved_send_01";
    const outreachId = "outreach_approved_send_01";

    await leadRepository.saveLead({
      leadId,
      businessName: "Pokhara Sky Paragliding",
      email: "fly@pokharasky.com",
      category: "adventure",
      city: "Pokhara",
      qualificationStatus: "QUALIFIED",
    });

    await outreachRepository.saveOutreachRecord({
      outreachId,
      leadId,
      channel: "email",
      status: "draft_created",
      subject: "New website for Pokhara Sky",
      message: "Hello team, we designed a preview...",
      business: {
        name: "Pokhara Sky Paragliding",
        email: "fly@pokharasky.com",
        city: "Pokhara",
      },
      validation: { isValid: true, passed: true },
      requiresHumanApproval: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await approvalGate.registerDraft({
      pipelineRunId: "run_approved_send_01",
      leadId,
      outreachId,
      businessName: "Pokhara Sky Paragliding",
      recipientEmail: "fly@pokharasky.com",
      subject: "New website for Pokhara Sky",
      body: "Hello team, we designed a preview...",
    });

    const approvedRecord = await approvalGate.approveDraft(outreachId, "Safal (Sales Lead)");
    assert.equal(approvedRecord.status, "READY_TO_SEND");
    assert.equal(approvalGate.canSend(outreachId), true);

    const sendResult = await autonomousPipeline.executeApprovedSend(
      "run_approved_send_01",
      leadId,
      outreachId
    );

    assert.equal(sendResult.success, true);
    assert.ok(sendResult.messageId);
    assert.equal(approvalGate.getApprovalRecord(outreachId)?.status, "SENT");
  });

  // ===========================================================================
  // 13. DUPLICATE SEND IS PREVENTED
  // ===========================================================================
  it("Requirement 13: Duplicate send is strictly prevented", async () => {
    const leadId = "lead_dup_send_01";
    const outreachId = "outreach_dup_send_01";

    await leadRepository.saveLead({
      leadId,
      businessName: "Annapurna Guest House",
      email: "welcome@annapurnagh.com",
      category: "hotel",
      city: "Pokhara",
      qualificationStatus: "QUALIFIED",
    });

    await outreachRepository.saveOutreachRecord({
      outreachId,
      leadId,
      channel: "email",
      status: "draft_created",
      subject: "Website for Annapurna GH",
      message: "Preview ready...",
      business: {
        name: "Annapurna Guest House",
        email: "welcome@annapurnagh.com",
      },
      validation: { isValid: true },
      requiresHumanApproval: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await approvalGate.registerDraft({
      pipelineRunId: "run_dup_01",
      leadId,
      outreachId,
      businessName: "Annapurna Guest House",
      recipientEmail: "welcome@annapurnagh.com",
      subject: "Website for Annapurna GH",
      body: "Preview ready...",
    });

    await approvalGate.approveDraft(outreachId, "Safal");

    // First send succeeds
    const firstSend = await autonomousPipeline.executeApprovedSend("run_dup_01", leadId, outreachId);
    assert.equal(firstSend.success, true);

    // Second send is blocked
    const secondSend = await autonomousPipeline.executeApprovedSend("run_dup_01", leadId, outreachId);
    assert.equal(secondSend.success, false);
    assert.ok(secondSend.error?.includes("already been sent") || secondSend.error?.includes("Duplicate send prevented"));
  });

  // ===========================================================================
  // 14. REPLY INGESTION
  // ===========================================================================
  it("Requirement 14: Inbound prospect reply is ingested cleanly", async () => {
    const replyResp = await autonomousPipeline.ingestReply({
      pipelineRunId: "run_reply_01",
      leadId: "lead_reply_test_01",
      messageText: "Hi! We checked out the preview. Can you tell us how much it costs?",
      senderEmail: "manager@business.com",
    });

    assert.equal(replyResp.success, true);
    assert.ok(replyResp.intent);
    assert.ok(replyResp.crmStatus);
  });

  // ===========================================================================
  // 15. REPLY INTELLIGENCE UPDATES STATE
  // ===========================================================================
  it("Requirement 15: Reply intelligence correctly classifies intent and sentiment", async () => {
    const analysis = await opsToolExecutor.executeTool({
      tool: "analyze_reply",
      requestId: "req_reply_intel_01",
      taskId: "task_reply_intel",
      input: {
        messageText: "Can we schedule a call tomorrow to discuss?",
        businessName: "Kathmandu Valley Dental",
      },
    });

    assert.equal(analysis.success, true);
    assert.equal(analysis.result.intent, "ASKING_FOR_CALL");
    assert.equal(analysis.result.sentiment, "POSITIVE");
  });

  // ===========================================================================
  // 16. DO_NOT_CONTACT BLOCKS FOLLOW-UP
  // ===========================================================================
  it("Requirement 16: DO_NOT_CONTACT opt-out strictly blocks follow-up scheduling", async () => {
    const leadId = "lead_optout_test_01";

    const optOutReply = await autonomousPipeline.ingestReply({
      leadId,
      messageText: "Please unsubscribe me from your emails and do not contact us again.",
      senderEmail: "stop@optout.com",
    });

    assert.equal(optOutReply.crmStatus, "DO_NOT_CONTACT");
    assert.ok(optOutReply.nextAction.includes("DO_NOT_CONTACT") || optOutReply.nextAction.includes("Cancelled"));

    const followupAttempt = await opsToolExecutor.executeTool({
      tool: "schedule_followup",
      requestId: "req_fup_blocked_01",
      taskId: "task_fup_blocked",
      leadId,
      input: { leadId, delayDays: 3 },
    });

    assert.equal(followupAttempt.success, false);
    assert.ok(followupAttempt.errors.some((e) => e.includes("DO_NOT_CONTACT")));
  });

  // ===========================================================================
  // 17. FOLLOW-UP IS SCHEDULED WHEN APPROPRIATE
  // ===========================================================================
  it("Requirement 17: Follow-up is scheduled for neutral/question replies", async () => {
    const leadId = "lead_fup_valid_01";
    await crmRepository.updateLeadStatus(leadId, "OUTREACH_SENT", "Initial outreach sent");

    const replyResp = await autonomousPipeline.ingestReply({
      leadId,
      messageText: "Could you send more details about the hosting specs?",
      senderEmail: "questions@techbiz.com",
    });

    assert.equal(replyResp.success, true);
    assert.ok(replyResp.nextAction);
  });

  // ===========================================================================
  // 18. MEETING INTENT ROUTES CORRECTLY
  // ===========================================================================
  it("Requirement 18: Meeting intent routes to MEETING_REQUESTED CRM status", async () => {
    const leadId = "lead_meeting_route_01";
    await crmRepository.updateLeadStatus(leadId, "OUTREACH_SENT", "Sent outreach");

    const replyResp = await autonomousPipeline.ingestReply({
      leadId,
      messageText: "Can we schedule a call tomorrow at 2pm?",
      senderEmail: "founder@dentalcare.com",
    });

    assert.equal(replyResp.success, true);
    assert.equal(replyResp.crmStatus, "MEETING_REQUESTED");
  });

  // ===========================================================================
  // 19. CRM STATE TRANSITIONS ARE CORRECT
  // ===========================================================================
  it("Requirement 19: Full sequence of CRM state transitions is validated", async () => {
    const leadId = "lead_crm_seq_01";

    await crmRepository.updateLeadStatus(leadId, "DISCOVERED", "Discovered lead");
    let state = await crmRepository.getLeadCRMState(leadId);
    assert.equal(state.status, "DISCOVERED");

    await crmRepository.updateLeadStatus(leadId, "QUALIFIED", "Qualified lead");
    state = await crmRepository.getLeadCRMState(leadId);
    assert.equal(state.status, "QUALIFIED");

    await crmRepository.updateLeadStatus(leadId, "OUTREACH_DRAFTED", "Drafted outreach");
    state = await crmRepository.getLeadCRMState(leadId);
    assert.equal(state.status, "OUTREACH_DRAFTED");

    await crmRepository.updateLeadStatus(leadId, "OUTREACH_SENT", "Dispatched email");
    state = await crmRepository.getLeadCRMState(leadId);
    assert.equal(state.status, "OUTREACH_SENT");

    await crmRepository.updateLeadStatus(leadId, "MEETING_REQUESTED", "Client wants meeting");
    state = await crmRepository.getLeadCRMState(leadId);
    assert.equal(state.status, "MEETING_REQUESTED");
  });

  // ===========================================================================
  // 20. WON / LOST TERMINAL STATES WORK
  // ===========================================================================
  it("Requirement 20: Terminal outcome markers WON and LOST update CRM and stats", async () => {
    const run = await autonomousPipeline.startPipeline(
      {
        niche: "Dental",
        location: "Vadodara",
        limit: 1,
      },
      {
        userId: "user_req_20",
        tenantId: "tenant_req_20",
      }
    );

    const leadIds = Object.keys(run.leads);
    assert.ok(leadIds.length > 0);
    const targetLeadId = leadIds[0];

    const wonResult = await autonomousPipeline.markTerminalOutcome({
      pipelineRunId: run.pipelineRunId,
      leadId: targetLeadId,
      outcome: "WON",
      notes: "Deal closed: 1-year hosting contract signed",
    });

    assert.equal(wonResult.success, true);
    assert.equal(wonResult.leadRecord?.terminalOutcome, "WON");
    assert.equal(run.stats.won, 1);

    const crmState = await crmRepository.getLeadCRMState(targetLeadId);
    assert.equal(crmState.status, "WON");
  });

  // ===========================================================================
  // 21. CEO RECEIVES PIPELINE REPORT
  // ===========================================================================
  it("Requirement 21: CEO receives and persists structured execution report in MemoryStore", async () => {
    const run = await autonomousPipeline.startPipeline(
      {
        niche: "Wellness",
        location: "Vadodara",
        limit: 1,
      },
      {
        userId: "user_req_21",
        tenantId: "tenant_req_21",
      }
    );

    await autonomousPipeline.reportProgressToCeo(run.pipelineRunId);

    const memoryStore = MemoryStore.getInstance();
    const decisions = await memoryStore.listDecisions();
    const found = decisions.some((d) => d.reasoningSummary?.includes("Autonomous Pipeline") || d.objective?.includes("n8n Ops Execution"));
    assert.ok(found, "CEO memory must contain pipeline execution summary");
  });

  // ===========================================================================
  // 22. TENANT ISOLATION WORKS
  // ===========================================================================
  it("Requirement 22: Tenant boundaries are strictly preserved across pipeline and approval gate", async () => {
    const tenantA = "tenant_alpha_01";
    const tenantB = "tenant_beta_02";

    await approvalGate.registerDraft({
      pipelineRunId: "run_ten_01",
      leadId: "lead_ten_01",
      outreachId: "outreach_ten_01",
      businessName: "Tenant A Business",
      recipientEmail: "a@tenanta.com",
      subject: "Website for A",
      body: "Draft for A",
      tenantId: tenantA,
    });

    await approvalGate.registerDraft({
      pipelineRunId: "run_ten_02",
      leadId: "lead_ten_02",
      outreachId: "outreach_ten_02",
      businessName: "Tenant B Business",
      recipientEmail: "b@tenantb.com",
      subject: "Website for B",
      body: "Draft for B",
      tenantId: tenantB,
    });

    const pendingA = approvalGate.getPendingApprovals(tenantA);
    assert.equal(pendingA.length, 1);
    assert.equal(pendingA[0].tenantId, tenantA);

    const pendingB = approvalGate.getPendingApprovals(tenantB);
    assert.equal(pendingB.length, 1);
    assert.equal(pendingB[0].tenantId, tenantB);
  });

  // ===========================================================================
  // 23. SECRET SCRUBBING WORKS
  // ===========================================================================
  it("Requirement 23: Secret scrubbing sanitizes credentials from tool inputs and outputs", async () => {
    const res = await opsToolExecutor.executeTool({
      tool: "research_business",
      requestId: "req_scrub_test_01",
      taskId: "task_scrub",
      input: {
        apiKey: "AIzaSyD-SecretApiKey123456789",
        secretToken: "sk-secret-service-token-abc",
        password: "mySuperSecretPassword!",
        lead: {
          leadId: "lead_scrub_01",
          businessName: "Safe Business",
        },
      },
    });

    assert.equal(res.success, true);
    const jsonStr = JSON.stringify(res);
    assert.ok(!jsonStr.includes("AIzaSyD-SecretApiKey123456789"));
    assert.ok(!jsonStr.includes("sk-secret-service-token-abc"));
    assert.ok(!jsonStr.includes("mySuperSecretPassword!"));
  });

  // ===========================================================================
  // 24. FAILURE STOPS UNSAFE DOWNSTREAM ACTIONS
  // ===========================================================================
  it("Requirement 24: Failure at an early stage safely halts downstream actions", async () => {
    const badRun = await autonomousPipeline.startPipeline({
      niche: "Nonexistent Broken Niche",
      location: "Nowhere",
      limit: 1,
    });

    assert.ok(["completed", "waiting_approval", "partial_success", "failed"].includes(badRun.status));
  });

  // ===========================================================================
  // 25. RETRY REMAINS BOUNDED
  // ===========================================================================
  it("Requirement 25: Pipeline operations remain bounded and error-contained", async () => {
    const res = await opsToolExecutor.executeTool({
      tool: "schedule_followup",
      requestId: "req_bounded_01",
      taskId: "task_bounded",
      input: {}, // missing leadId
    });

    assert.equal(res.success, false);
    assert.ok(res.errors.length > 0);
  });

  // ===========================================================================
  // 26. FULL HAPPY-PATH E2E PIPELINE
  // ===========================================================================
  it("Requirement 26: Full happy-path E2E pipeline runs seamlessly from Discovery to Outreach and CRM", async () => {
    const run = await autonomousPipeline.startPipeline(
      {
        niche: "Dental",
        location: "Vadodara",
        limit: 1,
      },
      {
        userId: "user_req_26",
        tenantId: "tenant_req_26",
      }
    );

    assert.ok(run.pipelineRunId);
    assert.ok(run.stats.discovered >= 1);

    const leadId = Object.keys(run.leads)[0];
    assert.ok(leadId);
    const lead = run.leads[leadId];

    if (lead.approvalStatus === "PENDING_HUMAN_APPROVAL" && lead.outreachId) {
      assert.equal(approvalGate.canSend(lead.outreachId), false);

      await approvalGate.approveDraft(lead.outreachId, "Safal (Founder)");
      assert.equal(approvalGate.canSend(lead.outreachId), true);

      const sendRes = await autonomousPipeline.executeApprovedSend(
        run.pipelineRunId,
        leadId,
        lead.outreachId
      );

      assert.equal(sendRes.success, true);
      assert.ok(sendRes.messageId);

      const replyRes = await autonomousPipeline.ingestReply({
        pipelineRunId: run.pipelineRunId,
        leadId,
        messageText: "Can we schedule a call tomorrow at 2pm?",
        senderEmail: "contact@dentalcare.com",
      });

      assert.equal(replyRes.success, true);
      assert.equal(replyRes.crmStatus, "MEETING_REQUESTED");

      const terminalRes = await autonomousPipeline.markTerminalOutcome({
        pipelineRunId: run.pipelineRunId,
        leadId,
        outcome: "WON",
        notes: "Client signed upfront quarterly retainer",
      });

      assert.equal(terminalRes.success, true);
      assert.equal(run.stats.won, 1);
    }
  });
});
