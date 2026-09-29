// tests/phase12_reply_intelligence_crm.test.mjs
/**
 * WebsiteBanja Phase 12: Reply Intelligence + CRM Foundation — Test Suite
 *
 * Verifies all 20 Phase 12 requirements:
 *   1. CRM repository creation & initialization
 *   2. Conversation creation & lifecycle metrics
 *   3. Inbound message creation & unread count tracking
 *   4. Reply normalization & text cleaning
 *   5. Positive reply classification (INTERESTED)
 *   6. Price inquiry classification (ASKING_PRICE)
 *   7. Demo request classification (ASKING_FOR_DEMO)
 *   8. Not interested classification (NOT_INTERESTED / ALREADY_HAS_WEBSITE)
 *   9. Do-not-contact classification (DO_NOT_CONTACT)
 *  10. Ambiguous reply handling (UNCLEAR)
 *  11. Low-confidence human review triggering
 *  12. Lead status transition & history audit log
 *  13. CRM timeline chronological events
 *  14. Next-action engine & null automatedAction safety lock
 *  15. Simulation endpoint POST /api/automation/simulate-reply
 *  16. Secret protection & 401 UNAUTHORIZED
 *  17. Malformed input rejection & validation
 *  18. Oversized request rejection (413 PAYLOAD_TOO_LARGE)
 *  19. n8n workflow file integrity & zero secrets
 *  20. Phase 11 → Phase 12 outreach handoff integration
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

const { crmRepository } = jiti("./src/lib/crm/crmRepository.ts");
const { classifyReplyDeterministically, analyzeInboundReply } = jiti(
  "./src/lib/crm/replyIntelligence.ts"
);
const { determineNextAction } = jiti("./src/lib/crm/nextActionEngine.ts");
const { simulateInboundReply } = jiti("./src/lib/crm/replySimulation.ts");
const { POST: simulateReplyHandler } = jiti(
  "./src/app/api/automation/simulate-reply/route.ts"
);
const { GET: getCrmListHandler } = jiti("./src/app/api/automation/crm/route.ts");
const { GET: getCrmLeadHandler } = jiti(
  "./src/app/api/automation/crm/[leadId]/route.ts"
);
const { POST: analyzeReplyHandler } = jiti(
  "./src/app/api/automation/crm/[leadId]/analyze/route.ts"
);
const { PATCH: patchStatusHandler } = jiti(
  "./src/app/api/automation/crm/[leadId]/status/route.ts"
);

const SECRET = "wb-auto-secret-local-dev-2026";
const TEST_LEAD_ID = "lead_cc4f59e3d5e5"; // Grand Heritage Dining

describe("Phase 12 — CRM Repository, Conversations & Messages", () => {
  test("1. CRM repository initializes and supports conversations, messages, and timeline", async () => {
    assert.ok(crmRepository, "CRM repository must be instantiated");
    const convs = crmRepository.getConversations();
    assert.ok(Array.isArray(convs), "Conversations must be an array");
    const msgs = crmRepository.getMessagesList();
    assert.ok(Array.isArray(msgs), "Messages must be an array");
    const timeline = crmRepository.getTimelineList();
    assert.ok(Array.isArray(timeline), "Timeline must be an array");
  });

  test("2. Conversation creation initializes valid schema, zero metrics, and OPEN status", async () => {
    const leadId = `lead_test_conv_${Date.now()}`;
    const conv = await crmRepository.createConversation({
      leadId,
      channel: "email",
      owner: "Test Operator",
    });

    assert.ok(conv.id.startsWith("conv_"), "Conversation ID must start with conv_");
    assert.equal(conv.leadId, leadId);
    assert.equal(conv.channel, "email");
    assert.equal(conv.status, "OPEN");
    assert.equal(conv.messageCount, 0);
    assert.equal(conv.unreadCount, 0);
    assert.ok(conv.createdAt);
  });

  test("3. Inbound message creation increments messageCount, unreadCount, and updates status to REPLIED", async () => {
    const leadId = `lead_test_msg_${Date.now()}`;
    const conv = await crmRepository.createConversation({ leadId, channel: "whatsapp" });

    const msg = await crmRepository.addMessage({
      leadId,
      conversationId: conv.id,
      channel: "whatsapp",
      direction: "inbound",
      messageText: "Hello, I got your concept!",
      source: "simulation",
    });

    assert.ok(msg.id.startsWith("msg_"), "Message ID must start with msg_");
    assert.equal(msg.direction, "inbound");
    assert.equal(msg.channel, "whatsapp");

    const updatedConv = await crmRepository.getConversation(conv.id);
    assert.ok(updatedConv);
    assert.equal(updatedConv.messageCount, 1);
    assert.equal(updatedConv.unreadCount, 1);
    assert.equal(updatedConv.status, "REPLIED");
  });

  test("4. Reply normalization trims whitespace and handles case insensitivity", () => {
    const rawText = "   CAN WE SCHEDULE A QUICK CALL?   \n\n";
    const res = classifyReplyDeterministically(rawText);
    assert.equal(res.intent, "ASKING_FOR_CALL");
    assert.equal(res.sentiment, "POSITIVE");
  });
});

describe("Phase 12 — Reply Intelligence Intent & Sentiment Classification", () => {
  test("5. Classifies positive commercial interest correctly (INTERESTED)", async () => {
    const reply = "This looks very impressive! We would like to proceed with this design.";
    const analysis = await analyzeInboundReply({
      messageText: reply,
      leadContext: { businessName: "Grand Heritage Dining" },
    });

    assert.equal(analysis.intent, "INTERESTED");
    assert.equal(analysis.sentiment, "POSITIVE");
    assert.ok(analysis.confidence >= 0.85);
    assert.equal(analysis.requiresHumanReview, false);
    assert.equal(analysis.recommendedAction, "HUMAN_REPLY_REQUIRED");
  });

  test("6. Classifies price inquiry with high urgency (ASKING_PRICE)", async () => {
    const reply = "Hi! How much does a website like this cost to launch for our business?";
    const analysis = await analyzeInboundReply({
      messageText: reply,
      leadContext: { businessName: "Grand Heritage Dining" },
    });

    assert.equal(analysis.intent, "ASKING_PRICE");
    assert.equal(analysis.sentiment, "POSITIVE");
    assert.equal(analysis.urgency, "HIGH");
    assert.ok(analysis.confidence >= 0.90);
    assert.equal(analysis.recommendedAction, "HUMAN_REPLY_REQUIRED");
  });

  test("7. Classifies portfolio demo request (ASKING_FOR_DEMO)", async () => {
    const reply = "Can you send a demo of other client websites you have built in our city?";
    const analysis = await analyzeInboundReply({
      messageText: reply,
      leadContext: { businessName: "Grand Heritage Dining" },
    });

    assert.equal(analysis.intent, "ASKING_FOR_DEMO");
    assert.equal(analysis.sentiment, "POSITIVE");
    assert.equal(analysis.recommendedAction, "SEND_DEMO_LINK");
  });

  test("8. Classifies polite rejection & existing site (NOT_INTERESTED / ALREADY_HAS_WEBSITE)", async () => {
    const reply1 = "No thank you, we are not interested in a new website.";
    const a1 = await analyzeInboundReply({ messageText: reply1 });
    assert.equal(a1.intent, "NOT_INTERESTED");
    assert.equal(a1.recommendedAction, "CLOSE_LEAD");

    const reply2 = "Thanks, but we already have our own website live.";
    const a2 = await analyzeInboundReply({ messageText: reply2 });
    assert.equal(a2.intent, "ALREADY_HAS_WEBSITE");
    assert.equal(a2.recommendedAction, "CLOSE_LEAD");
  });

  test("9. Classifies explicit opt-out with urgent priority (DO_NOT_CONTACT)", async () => {
    const reply = "Please unsubscribe us and do not contact me again.";
    const analysis = await analyzeInboundReply({ messageText: reply });

    assert.equal(analysis.intent, "DO_NOT_CONTACT");
    assert.equal(analysis.sentiment, "NEGATIVE");
    assert.equal(analysis.urgency, "HIGH");
    assert.equal(analysis.recommendedAction, "DO_NOT_CONTACT");
  });

  test("10. Classifies ambiguous single-token reply as UNCLEAR with low confidence", async () => {
    const reply = "k";
    const analysis = await analyzeInboundReply({ messageText: reply });

    assert.equal(analysis.intent, "UNCLEAR");
    assert.ok(analysis.confidence < 0.65, "Confidence must be low for single token");
    assert.equal(analysis.requiresHumanReview, true);
  });

  test("11. Low-confidence replies flag requiresHumanReview = true and recommend HUMAN_REVIEW", () => {
    const nextAction = determineNextAction({
      intent: "OTHER",
      sentiment: "UNKNOWN",
      urgency: "LOW",
      confidence: 0.45,
      requiresHumanReview: true,
      businessName: "Sample Cafe",
    });

    assert.equal(nextAction.recommendedAction, "HUMAN_REVIEW");
    assert.equal(nextAction.automatedAction, null);
    assert.ok(nextAction.reason.includes("operator inspection"));
  });
});

describe("Phase 12 — Lead Status Transitions & Next Action Engine", () => {
  test("12. Lead status transition records previousStatus, newStatus, reason, and source", async () => {
    const leadId = `lead_trans_${Date.now()}`;
    await crmRepository.updateLeadStatus(leadId, "OUTREACH_SENT", "Outreach dispatch", "simulation");
    const updated = await crmRepository.updateLeadStatus(
      leadId,
      "INTERESTED",
      "Prospect requested pricing",
      "ai_classification"
    );

    assert.ok(updated);
    assert.equal(updated.status, "INTERESTED");
    assert.equal(updated.statusHistory.length, 2);
    assert.equal(updated.statusHistory[1].previousStatus, "OUTREACH_SENT");
    assert.equal(updated.statusHistory[1].newStatus, "INTERESTED");
    assert.equal(updated.statusHistory[1].source, "ai_classification");
  });

  test("13. CRM timeline orders events chronologically and logs status changes", async () => {
    const leadId = `lead_timeline_${Date.now()}`;
    await crmRepository.createCRMEvent({
      leadId,
      type: "LEAD_CREATED",
      actor: "system",
      description: "Lead discovered in Vadodara",
    });

    await crmRepository.createCRMEvent({
      leadId,
      type: "OUTREACH_SIMULATED",
      actor: "simulation",
      description: "Outreach simulated to local outbox",
    });

    const timeline = await crmRepository.getTimeline(leadId);
    assert.equal(timeline.length, 2);
    assert.equal(timeline[0].type, "LEAD_CREATED");
    assert.equal(timeline[1].type, "OUTREACH_SIMULATED");
  });

  test("14. NextAction engine strictly enforces automatedAction: null in Phase 12", () => {
    const intents = [
      "INTERESTED",
      "ASKING_PRICE",
      "ASKING_FOR_CALL",
      "ASKING_FOR_DEMO",
      "NEEDS_TIME",
      "NOT_INTERESTED",
      "DO_NOT_CONTACT",
      "UNCLEAR",
    ];

    for (const intent of intents) {
      const na = determineNextAction({
        intent,
        sentiment: "POSITIVE",
        urgency: "HIGH",
        confidence: 0.9,
        requiresHumanReview: false,
      });

      assert.equal(
        na.automatedAction,
        null,
        `automatedAction must strictly be null for intent ${intent} in Phase 12`
      );
      assert.ok(na.recommendedAction, "Must provide recommendedAction");
    }
  });
});

describe("Phase 12 — Simulation Endpoint & API Security", () => {
  test("15. POST /api/automation/simulate-reply executes complete reply lifecycle", async () => {
    const req = new Request("http://localhost:3000/api/automation/simulate-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-automation-secret": SECRET,
      },
      body: JSON.stringify({
        leadId: TEST_LEAD_ID,
        channel: "email",
        messageText: "Hi, I checked the preview. Looks interesting. What would something like this cost?",
      }),
    });

    const res = await simulateReplyHandler(req);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.analysis.intent, "ASKING_PRICE");
    assert.equal(body.analysis.sentiment, "POSITIVE");
    assert.equal(body.leadStatus, "INTERESTED");
    assert.equal(body.nextAction.recommendedAction, "HUMAN_REPLY_REQUIRED");
    assert.equal(body.handoffPhase, "phase13_autonomous_lead_pipeline");
  });

  test("16. Rejects unauthenticated request with 401 UNAUTHORIZED", async () => {
    const req = new Request("http://localhost:3000/api/automation/simulate-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: TEST_LEAD_ID,
        messageText: "Test reply",
      }),
    });

    const res = await simulateReplyHandler(req);
    assert.equal(res.status, 401);
  });

  test("17. Rejects missing required leadId or messageText with 400 VALIDATION_FAILED", async () => {
    const req = new Request("http://localhost:3000/api/automation/simulate-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-automation-secret": SECRET,
      },
      body: JSON.stringify({
        leadId: "",
        messageText: "",
      }),
    });

    const res = await simulateReplyHandler(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error?.code, "VALIDATION_FAILED");
  });

  test("18. Rejects oversized request payload exceeding 256KB with 413", async () => {
    const hugeText = "X".repeat(300 * 1024);
    const req = new Request("http://localhost:3000/api/automation/simulate-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-automation-secret": SECRET,
        "content-length": String(hugeText.length),
      },
      body: JSON.stringify({
        leadId: TEST_LEAD_ID,
        messageText: hugeText,
      }),
    });

    const res = await simulateReplyHandler(req);
    assert.equal(res.status, 413);
  });

  test("19. n8n workflow file exists, has valid structure, and contains zero hardcoded secrets", () => {
    const workflowPath = path.resolve(
      process.cwd(),
      "automation/n8n/WebsiteBanja_Reply_Intelligence_CRM.json"
    );
    assert.ok(fs.existsSync(workflowPath), "n8n workflow file must exist");

    const content = fs.readFileSync(workflowPath, "utf-8");
    const json = JSON.parse(content);

    assert.equal(json.id, "WebsiteBanja_Reply_Intelligence_CRM");
    assert.equal(json.name, "WebsiteBanja — Reply Intelligence & CRM Processing");
    assert.ok(Array.isArray(json.nodes) && json.nodes.length >= 4);

    // Verify zero hardcoded secrets
    assert.ok(!content.includes("sk-"), "No OpenAI secret keys");
    assert.ok(!content.includes("AIzaSy"), "No Google Gemini API keys");

    // Must reference environment variable
    assert.ok(content.includes("WEBSITEBANJA_AUTOMATION_SECRET"));

    // Must target simulate-reply endpoint
    const httpNode = json.nodes.find((n) => n.type === "n8n-nodes-base.httpRequest");
    assert.ok(httpNode);
    assert.ok(httpNode.parameters?.url?.includes("/api/automation/simulate-reply"));
  });

  test("20. Phase 11 → Phase 12 handoff: Phase 11 simulated outreach is visible in CRM state", async () => {
    // Lead TEST_LEAD_ID has existing outreach from Phase 11
    const state = await crmRepository.getLeadCRMState(TEST_LEAD_ID);
    assert.ok(state, "CRM state must be resolved for existing Phase 11 lead");
    assert.equal(state.leadId, TEST_LEAD_ID);

    // Messages should contain outbound outreach with previewUrl
    const outboundMsg = state.messages.find((m) => m.direction === "outbound");
    assert.ok(outboundMsg, "Must include Phase 11 simulated outbound message");
    assert.ok(outboundMsg.metadata?.previewUrl, "Outbound message must contain previewUrl");

    // Timeline must contain OUTREACH_SIMULATED or OUTREACH_DRAFTED
    const hasOutreachEvt = state.timeline.some(
      (e) => e.type === "OUTREACH_SIMULATED" || e.type === "OUTREACH_DRAFTED"
    );
    assert.ok(hasOutreachEvt, "Timeline must contain Phase 11 outreach event");
  });
});
