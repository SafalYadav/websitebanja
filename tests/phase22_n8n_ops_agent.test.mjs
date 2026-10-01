// tests/phase22_n8n_ops_agent.test.mjs
/**
 * Test Suite: Phase 22 — n8n OPS AGENT
 * Comprehensive verification of:
 * - 14 Security & Policy Invariants:
 *   1. Schema validation rejecting missing required fields
 *   2. Rejection of unauthorized / unknown tool names
 *   3. Strict WhatsApp disabled invariant (tool & channel blocked)
 *   4. Outreach email auto-send disabled (draft only, human approval required)
 *   5. Opt-out compliance (DO_NOT_CONTACT leads blocked from follow-up)
 *   6. Secret scrubbing (API keys, tokens, passwords redacted from results)
 *   7. Idempotency on repeated requests with same idempotencyKey
 *   8. Cross-tenant and RLS boundary preservation
 *   9. Malformed input error containment
 *   10. Dispatch contract validation (CeoN8nTaskDispatch)
 *   11. Callback contract validation (N8nCeoTaskCallback)
 *   12. Human approval flag propagation on outreach creation
 *   13. Local deterministic fallback loop when n8n webhook is not live
 *   14. Executive memory store persistence on CEO reporting
 * - 12 Operational Tools:
 *   A. discover_leads
 *   B. qualify_lead
 *   C. research_business
 *   D. audit_website
 *   E. generate_preview
 *   F. validate_preview
 *   G. create_outreach
 *   H. get_lead_status
 *   I. analyze_reply
 *   J. schedule_followup
 *   K. update_crm
 *   L. report_to_ceo
 * - 1 End-to-End Scenario:
 *   CEO Task Dispatch -> n8n Ops Agent Workflow -> Tools Execution -> CEO Callback & Memory
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// Import Phase 22 modules via jiti
const {
  opsToolExecutor,
  n8nOpsClient,
  OPS_TOOL_NAMES,
  MemoryStore,
} = jiti("./src/lib/intelligence/index.ts");

const {
  leadRepository,
} = jiti("./src/lib/discovery/leadRepository.ts");

const {
  crmRepository,
} = jiti("./src/lib/crm/crmRepository.ts");

describe("Phase 22 — n8n Ops Agent", () => {
  beforeEach(() => {
    opsToolExecutor.clearCache();
  });

  // ===========================================================================
  // SECTION 1: 14 SECURITY & POLICY INVARIANT TESTS
  // ===========================================================================
  describe("Security & Policy Invariants (14 Tests)", () => {
    it("Security 1: rejects request missing mandatory fields (taskId, requestId, tool)", async () => {
      const res = await opsToolExecutor.executeTool({});
      assert.equal(res.success, false);
      assert.ok(res.errors.length > 0);
      assert.ok(res.errors.some((e) => e.includes("tool") || e.includes("requestId")));
    });

    it("Security 2: rejects unknown or unregistered tool name", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "arbitrary_unauthorized_tool",
        requestId: "req_sec_02",
        taskId: "task_sec_02",
        input: {},
      });
      assert.equal(res.success, false);
      assert.ok(res.errors.some((e) => e.includes("tool")));
    });

    it("Security 3: WhatsApp is strictly disabled and rejected if requested in tool or channel", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "whatsapp_send",
        requestId: "req_sec_03",
        taskId: "task_sec_03",
        input: { channel: "whatsapp" },
      });
      assert.equal(res.success, false);
      assert.ok(res.errors.some((e) => e.toLowerCase().includes("whatsapp") || e.toLowerCase().includes("invalid")));
    });

    it("Security 4: Outreach generation is strictly draft-only and mandates human approval", async () => {
      const mockLead = {
        leadId: "lead_sec_outreach_01",
        businessName: "Jaipur Heritage Suites",
        category: "hotel",
        city: "Jaipur",
        qualificationStatus: "QUALIFIED",
        website: "https://jaipurheritage.com",
      };
      await leadRepository.saveLead(mockLead);

      const res = await opsToolExecutor.executeTool({
        tool: "create_outreach",
        requestId: "req_sec_04",
        taskId: "task_sec_04",
        leadId: mockLead.leadId,
        input: {
          leadId: mockLead.leadId,
          lead: mockLead,
        },
      });

      assert.equal(res.success, true);
      assert.equal(res.result.requiresHumanApproval, true);
      assert.equal(res.result.channel, "email");
      assert.ok(res.result.subject);
      assert.ok(res.result.body);
    });

    it("Security 5: Follow-up scheduling is blocked for leads with DO_NOT_CONTACT status", async () => {
      const optOutLeadId = "lead_optout_999";
      await crmRepository.updateLeadStatus(
        optOutLeadId,
        "DO_NOT_CONTACT",
        "Prospect requested to be unsubscribed",
        "admin"
      );

      const res = await opsToolExecutor.executeTool({
        tool: "schedule_followup",
        requestId: "req_sec_05",
        taskId: "task_sec_05",
        leadId: optOutLeadId,
        input: {
          leadId: optOutLeadId,
          delayDays: 3,
        },
      });

      assert.equal(res.success, false);
      assert.ok(res.errors.some((e) => e.includes("DO_NOT_CONTACT") || e.includes("opted out")));
    });

    it("Security 6: Sensitive API keys, passwords, and tokens are scrubbed from inputs and outputs", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "research_business",
        requestId: "req_sec_06",
        taskId: "task_sec_06",
        input: {
          apiKey: "AIzaSyD-SecretApiKey123456789",
          secretToken: "bearer_xyz_987654321",
          password: "mySuperSecretPassword!",
          lead: {
            leadId: "lead_scrub_01",
            businessName: "Clean Tech Corp",
            category: "technology",
            city: "Kathmandu",
          },
        },
      });

      assert.equal(res.success, true);
      const jsonStr = JSON.stringify(res);
      assert.ok(!jsonStr.includes("AIzaSyD-SecretApiKey123456789"));
      assert.ok(!jsonStr.includes("mySuperSecretPassword!"));
      assert.ok(jsonStr.includes("[REDACTED]") || !jsonStr.includes("bearer_xyz_987654321"));
    });

    it("Security 7: Idempotency is enforced when duplicate idempotencyKey is supplied", async () => {
      const idempotencyKey = "idemp_key_unique_test_123";
      const reqPayload = {
        tool: "qualify_lead",
        requestId: "req_sec_07_a",
        taskId: "task_sec_07",
        idempotencyKey,
        input: {
          lead: {
            leadId: "lead_idemp_01",
            businessName: "Everest Coffee Roasters",
            category: "cafe",
            city: "Kathmandu",
            phone: "+97714445555",
          },
        },
      };

      const firstRes = await opsToolExecutor.executeTool(reqPayload);
      assert.equal(firstRes.success, true);
      assert.equal(firstRes.metadata.cached, undefined);

      const secondRes = await opsToolExecutor.executeTool({
        ...reqPayload,
        requestId: "req_sec_07_b",
      });
      assert.equal(secondRes.success, true);
      assert.equal(secondRes.metadata.cached, true);
      assert.equal(secondRes.result.leadId, "lead_idemp_01");
    });

    it("Security 8: Cross-tenant metadata and tenant boundaries are preserved", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "qualify_lead",
        requestId: "req_sec_08",
        taskId: "task_sec_08",
        tenantId: "tenant_zenith_enterprise",
        input: {
          lead: {
            leadId: "lead_tenant_01",
            businessName: "Zenith Global",
            category: "law_firm",
            city: "Mumbai",
          },
        },
      });

      assert.equal(res.success, true);
      assert.equal(res.metadata.tenantId, "tenant_zenith_enterprise");
    });

    it("Security 9: Malformed inputs (e.g. invalid types) are handled without crashing", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "analyze_reply",
        requestId: "req_sec_09",
        taskId: "task_sec_09",
        input: {
          messageText: "", // Empty string fails
        },
      });

      assert.equal(res.success, false);
      assert.ok(res.errors.some((e) => e.includes("Missing reply messageText")));
    });

    it("Security 10: CeoN8nTaskDispatch contract validates mandatory fields", async () => {
      await assert.rejects(
        async () => {
          await n8nOpsClient.dispatchTask({
            taskId: "",
            objective: "",
            constraints: [],
            allowedTools: [],
            approvalRequired: false,
          });
        },
        /Invalid CeoN8nTaskDispatch contract/
      );
    });

    it("Security 11: Rejects dispatch if WhatsApp is requested in constraints or objective", async () => {
      const res = await n8nOpsClient.dispatchTask({
        taskId: "task_whatsapp_test",
        objective: "Send promotional WhatsApp message to restaurant",
        constraints: ["Must use WhatsApp"],
        allowedTools: ["create_outreach"],
        approvalRequired: false,
      });

      assert.equal(res.status, "blocked");
      assert.ok(res.failures.some((f) => f.includes("WhatsApp is strictly disabled")));
    });

    it("Security 12: Human approval flag is automatically required when outreach tool is executed", async () => {
      const res = await n8nOpsClient.dispatchTask({
        taskId: "task_approval_gate_01",
        objective: "Draft outreach for Himalayan Dental Clinic",
        constraints: [],
        allowedTools: ["create_outreach", "report_to_ceo"],
        approvalRequired: false, // will become true because outreach was executed
        input: {
          lead: {
            leadId: "lead_dental_01",
            businessName: "Himalayan Dental Clinic",
            category: "dental",
            city: "Kathmandu",
          },
        },
      });

      assert.equal(res.status, "completed");
      assert.equal(res.approvalRequired, true);
      assert.ok(res.nextAction?.includes("human approval"));
    });

    it("Security 13: Local deterministic fallback functions cleanly without remote n8n server", async () => {
      const res = await n8nOpsClient.dispatchTask({
        taskId: "task_fallback_01",
        objective: "Qualify and research prospective bakery",
        constraints: ["No external network calls"],
        allowedTools: ["qualify_lead", "research_business", "report_to_ceo"],
        approvalRequired: false,
        input: {
          lead: {
            leadId: "lead_bakery_01",
            businessName: "Kathmandu French Bakery",
            category: "bakery",
            city: "Kathmandu",
            phone: "+97715551234",
          },
        },
      });

      assert.equal(res.status, "completed");
      assert.ok(res.actions.length >= 2);
      assert.ok(res.summary.includes("completed"));
    });

    it("Security 14: CEO reporting persists decision and evidence in MemoryStore", async () => {
      const memoryStore = MemoryStore.getInstance();
      const taskId = `task_memory_persist_${Date.now()}`;

      const res = await opsToolExecutor.executeTool({
        tool: "report_to_ceo",
        requestId: `req_${taskId}`,
        taskId,
        input: {
          status: "completed",
          summary: "Discovered 5 high-converting leads and audited their websites",
          keyLearnings: [
            "Local dental clinics in Kathmandu respond best to mobile booking CTA previews",
          ],
        },
      });

      assert.equal(res.success, true);
      assert.equal(res.result.recorded, true);

      // Verify stored decision
      const decision = await memoryStore.getDecision(taskId);
      assert.ok(decision);
      assert.equal(decision?.runId, taskId);
      assert.ok(decision?.reasoningSummary.includes("Discovered 5 high-converting leads"));
    });
  });

  // ===========================================================================
  // SECTION 2: 12 OPERATIONAL TOOL TESTS (A THROUGH L)
  // ===========================================================================
  describe("12 Operational Tools (A through L)", () => {
    it("Tool A (discover_leads): discovers candidate businesses by location and niche", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "discover_leads",
        requestId: "req_tool_a",
        taskId: "task_tool_a",
        input: {
          query: "boutique hotel",
          location: "Jaipur",
          limit: 3,
        },
      });

      assert.equal(res.success, true);
      assert.ok(typeof res.result.totalDiscovered === "number");
      assert.ok(Array.isArray(res.result.leads));
    });

    it("Tool B (qualify_lead): scores and qualifies a business lead", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "qualify_lead",
        requestId: "req_tool_b",
        taskId: "task_tool_b",
        input: {
          lead: {
            leadId: "lead_qual_test_01",
            businessName: "Royal Spice Fine Dining",
            category: "restaurant",
            city: "Jaipur",
            phone: "+911412345678",
            rating: 4.8,
            reviewCount: 120,
          },
        },
      });

      assert.equal(res.success, true);
      assert.equal(res.result.qualified, true);
      assert.equal(res.result.status, "QUALIFIED");
      assert.ok(res.result.score > 0);
      assert.ok(Array.isArray(res.result.reasonCodes));
    });

    it("Tool C (research_business): extracts business background and research summary", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "research_business",
        requestId: "req_tool_c",
        taskId: "task_tool_c",
        input: {
          lead: {
            leadId: "lead_res_01",
            businessName: "Lotus Spa & Wellness",
            category: "wellness_spa",
            city: "Kathmandu",
            address: "Thamel, Kathmandu",
            phone: "+97714223344",
          },
        },
      });

      assert.equal(res.success, true);
      assert.equal(res.result.leadId, "lead_res_01");
      assert.equal(res.result.businessName, "Lotus Spa & Wellness");
      assert.ok(res.result.summary);
    });

    it("Tool D (audit_website): conducts website presence and conversion audit", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "audit_website",
        requestId: "req_tool_d",
        taskId: "task_tool_d",
        input: {
          lead: {
            leadId: "lead_audit_01",
            businessName: "Himalayan Treks & Expeditions",
            category: "car_rental",
            city: "Pokhara",
            website: "https://himalayantreks.example.com",
          },
        },
      });

      assert.equal(res.success, true);
      assert.ok(res.result.auditId);
      assert.ok(typeof res.result.auditScore === "number");
      assert.ok(Array.isArray(res.result.conversionOpportunities));
    });

    it("Tool E (generate_preview): generates personalized preview website", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "generate_preview",
        requestId: "req_tool_e",
        taskId: "task_tool_e",
        input: {
          leadId: "lead_prev_gen_01",
          lead: {
            leadId: "lead_prev_gen_01",
            businessName: "Pokhara Lakeside Cafe",
            category: "cafe",
            city: "Pokhara",
            rating: 4.7,
            reviewCount: 95,
          },
        },
      });

      assert.equal(res.success, true);
      assert.ok(res.result.previewId);
      assert.ok(res.result.previewUrl);
      assert.ok(typeof res.result.qualityScore === "number");
    });

    it("Tool F (validate_preview): verifies quality score, hero contrast, and anti-genericity", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "validate_preview",
        requestId: "req_tool_f",
        taskId: "task_tool_f",
        input: {
          previewId: "prev_val_01",
          businessName: "Annapurna Organic Coffee",
          websiteData: {
            businessName: "Annapurna Organic Coffee",
            sectionOrder: ["hero", "services", "about", "contact"],
            hero: {
              headline: "Authentic Single-Origin Himalayan Roast",
              subtitle: "Freshly roasted specialty coffee in Pokhara",
            },
          },
        },
      });

      assert.equal(res.success, true);
      assert.ok(typeof res.result.score === "number");
      assert.equal(typeof res.result.passed, "boolean");
      assert.ok(Array.isArray(res.result.issues));
    });

    it("Tool G (create_outreach): generates personalized email outreach draft", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "create_outreach",
        requestId: "req_tool_g",
        taskId: "task_tool_g",
        input: {
          leadId: "lead_outreach_gen_01",
          lead: {
            leadId: "lead_outreach_gen_01",
            businessName: "Thamel Boutique Hotel",
            category: "luxury_hotel",
            city: "Kathmandu",
            email: "stay@thamelhotel.com",
          },
        },
      });

      assert.equal(res.success, true);
      assert.equal(res.result.requiresHumanApproval, true);
      assert.ok(res.result.subject);
      assert.ok(res.result.body);
    });

    it("Tool H (get_lead_status): retrieves lead status and CRM state", async () => {
      const leadId = "lead_status_check_01";
      await leadRepository.saveLead({
        leadId,
        businessName: "Mountain Bikes Pokhara",
        category: "retail",
        city: "Pokhara",
        qualificationStatus: "QUALIFIED",
      });

      const res = await opsToolExecutor.executeTool({
        tool: "get_lead_status",
        requestId: "req_tool_h",
        taskId: "task_tool_h",
        leadId,
        input: { leadId },
      });

      assert.equal(res.success, true);
      assert.equal(res.result.leadId, leadId);
      assert.equal(res.result.qualificationStatus, "QUALIFIED");
    });

    it("Tool I (analyze_reply): parses inbound email intent, sentiment, and objections", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "analyze_reply",
        requestId: "req_tool_i",
        taskId: "task_tool_i",
        input: {
          messageText: "We loved the website preview you sent! Could you let us know what the monthly hosting cost is?",
          businessName: "Pokhara Lakeside Cafe",
          industry: "cafe",
        },
      });

      assert.equal(res.success, true);
      assert.equal(res.result.intent, "ASKING_PRICE");
      assert.ok(["POSITIVE", "NEUTRAL"].includes(res.result.sentiment));
      assert.ok(res.result.recommendedAction);
    });

    it("Tool J (schedule_followup): schedules smart cadence follow-up job", async () => {
      const leadId = "lead_followup_job_01";
      const res = await opsToolExecutor.executeTool({
        tool: "schedule_followup",
        requestId: "req_tool_j",
        taskId: "task_tool_j",
        leadId,
        input: {
          leadId,
          delayDays: 2,
        },
      });

      assert.equal(res.success, true);
      assert.equal(res.result.scheduled, true);
      assert.ok(res.result.jobId);
      assert.ok(res.result.dueAt);
    });

    it("Tool K (update_crm): updates CRM lead stage and appends timeline event", async () => {
      const leadId = "lead_crm_upd_01";
      const res = await opsToolExecutor.executeTool({
        tool: "update_crm",
        requestId: "req_tool_k",
        taskId: "task_tool_k",
        leadId,
        input: {
          leadId,
          newStatus: "MEETING_SCHEDULED",
          reason: "Prospect confirmed video call demo",
          notes: "Demo scheduled for Friday 3 PM",
        },
      });

      assert.equal(res.success, true);
      assert.equal(res.result.updated, true);
      assert.equal(res.result.status, "MEETING_SCHEDULED");
    });

    it("Tool L (report_to_ceo): submits structured execution summary to CEO memory", async () => {
      const res = await opsToolExecutor.executeTool({
        tool: "report_to_ceo",
        requestId: "req_tool_l",
        taskId: "task_tool_l",
        input: {
          status: "completed",
          summary: "All 5 leads successfully enriched with preview designs.",
          keyLearnings: ["Fine dining leads prefer dark luxury themes over playful themes"],
        },
      });

      assert.equal(res.success, true);
      assert.equal(res.result.recorded, true);
      assert.ok(res.result.timestamp);
    });
  });

  // ===========================================================================
  // SECTION 3: END-TO-END SCENARIO TEST (1 Test)
  // ===========================================================================
  describe("End-to-End Orchestration Scenario (1 Test)", () => {
    it("Scenario E2E: CEO dispatches approved tactical directive to n8n Ops Agent, executes workflow, respects approval gating, and delivers callback report to CEO", async () => {
      const taskId = `task_e2e_ops_${Date.now()}`;
      const dispatchRequest = {
        taskId,
        objective: "Execute tactical outreach sequence for Kathmandu dental clinics: qualify, audit, generate preview, draft outreach, and update CRM.",
        priority: "high",
        constraints: [
          "Do NOT send email automatically (human approval required)",
          "Strictly no WhatsApp communication",
          "Follow WebsiteBanja brand guidelines",
        ],
        allowedTools: [
          "qualify_lead",
          "research_business",
          "audit_website",
          "generate_preview",
          "validate_preview",
          "create_outreach",
          "update_crm",
          "report_to_ceo",
        ],
        approvalRequired: false,
        input: {
          lead: {
            leadId: "lead_e2e_dental_01",
            businessName: "Himalayan Smile Dental Care",
            category: "dental",
            city: "Kathmandu",
            phone: "+97714488990",
            rating: 4.9,
            reviewCount: 180,
          },
        },
      };

      // 1. Dispatch from CEO to n8n Ops Agent
      const callback = await n8nOpsClient.dispatchTask(dispatchRequest);

      // 2. Verify Execution Callback Contract
      assert.equal(callback.taskId, taskId);
      assert.equal(callback.status, "completed");
      assert.ok(callback.actions.length >= 4);

      // 3. Verify Human Approval Gating Invariant
      assert.equal(callback.approvalRequired, true);
      assert.ok(callback.nextAction?.includes("human approval"));

      // 4. Verify Evidence & Actions
      assert.ok(callback.evidence.length >= 1);
      assert.ok(callback.actions.some((a) => a.tool === "qualify_lead" && a.status === "success"));
      assert.ok(callback.actions.some((a) => a.tool === "create_outreach" && a.status === "success"));

      // 5. Verify Memory Persistence
      const memoryStore = MemoryStore.getInstance();
      const decision = await memoryStore.getDecision(taskId);
      assert.ok(decision);
      assert.equal(decision?.runId, taskId);
    });
  });
});
