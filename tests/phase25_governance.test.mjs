// tests/phase25_governance.test.mjs
// Phase 25 — Governance & Action Authority
// 25 deterministic tests covering all required scenarios.
// Uses node:test + node:assert/strict + jiti for TypeScript imports.

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createJiti from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jiti = createJiti(__dirname, {
  alias: { "@": path.resolve(__dirname, "../src") },
  interopDefault: true,
});

// Lazily import governance modules
const {
  PolicyEngine,
  policyEngine,
  GovernanceViolationError,
  hashActionPayload,
} = jiti("@/lib/intelligence/policies/policyEngine");

const {
  GovernanceAuditLog,
  governanceAuditLog,
} = jiti("@/lib/intelligence/policies/governanceAuditLog");

const {
  GovernanceApprovalStore,
  governanceApprovalStore,
} = jiti("@/lib/intelligence/policies/governanceApprovalStore");

const {
  AUTHORITY_LEVEL_ORDER,
  authorityIndex,
} = jiti("@/lib/intelligence/policies/governanceTypes");

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Builds a minimal governance request */
function makeRequest(overrides = {}) {
  return {
    action: "discover_leads",
    tool: "discover_leads",
    requestingAgent: "n8n_ops_agent",
    authorityLevel: "READ",
    riskLevel: "low",
    tenantId: "tenant_test_1",
    taskId: "task_test_1",
    ...overrides,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("Phase 25 — Governance & Action Authority", () => {

  // ─── 1. WhatsApp is permanently blocked ────────────────────────────────────
  test("1. WhatsApp tool call is permanently BLOCKED", () => {
    const decision = policyEngine.evaluateAction(
      makeRequest({ action: "send_whatsapp_message", tool: "send_whatsapp_message", authorityLevel: "HIGH_RISK_ACTION" })
    );
    assert.equal(decision.decision, "BLOCK");
    assert.equal(decision.policyId, "BLOCK_WHATSAPP");
  });

  test("2. WhatsApp channel param is blocked regardless of tool name", () => {
    const decision = policyEngine.evaluateAction(
      makeRequest({ action: "outreach", channel: "whatsapp", authorityLevel: "WRITE_EXTERNAL" })
    );
    assert.equal(decision.decision, "BLOCK");
    assert.equal(decision.policyId, "BLOCK_WHATSAPP");
  });

  test("3. WhatsApp platform param is blocked regardless of tool name", () => {
    const decision = policyEngine.evaluateAction(
      makeRequest({ action: "notify", platform: "whatsapp", authorityLevel: "WRITE_EXTERNAL" })
    );
    assert.equal(decision.decision, "BLOCK");
    assert.equal(decision.policyId, "BLOCK_WHATSAPP");
  });

  // ─── 4. Telegram is blocked (not yet implemented) ─────────────────────────
  test("4. Telegram channel is BLOCKED (not yet implemented)", () => {
    const decision = policyEngine.evaluateAction(
      makeRequest({ action: "send_telegram_message", tool: "send_telegram_message", authorityLevel: "WRITE_EXTERNAL" })
    );
    assert.equal(decision.decision, "BLOCK");
    assert.equal(decision.policyId, "BLOCK_TELEGRAM_PREMATURE");
  });

  // ─── 5. External email requires human approval ────────────────────────────
  test("5. send_outreach_email requires HUMAN approval (REQUIRE_APPROVAL decision)", () => {
    const decision = policyEngine.evaluateAction(
      makeRequest({
        action: "send_outreach_email",
        tool: "send_outreach_email",
        authorityLevel: "WRITE_EXTERNAL",
        riskLevel: "high",
      })
    );
    assert.equal(decision.decision, "REQUIRE_APPROVAL");
    assert.equal(decision.requiresHumanApproval, true);
  });

  test("6. WRITE_EXTERNAL authority level triggers REQUIRE_APPROVAL", () => {
    const decision = policyEngine.evaluateAction(
      makeRequest({
        action: "some_external_action",
        tool: "some_external_action",
        authorityLevel: "WRITE_EXTERNAL",
        riskLevel: "high",
      })
    );
    assert.equal(decision.decision, "REQUIRE_APPROVAL");
    assert.equal(decision.requiresHumanApproval, true);
  });

  // ─── 7. Auto-allowed internal tools ──────────────────────────────────────
  test("7. discover_leads is auto-ALLOWED (READ level)", () => {
    const decision = policyEngine.evaluateAction(makeRequest({ action: "discover_leads", tool: "discover_leads" }));
    assert.equal(decision.decision, "ALLOW");
    assert.equal(decision.requiresHumanApproval, false);
  });

  test("8. audit_website is auto-ALLOWED (ANALYZE level)", () => {
    const decision = policyEngine.evaluateAction(
      makeRequest({ action: "audit_website", tool: "audit_website", authorityLevel: "ANALYZE" })
    );
    assert.equal(decision.decision, "ALLOW");
  });

  test("9. update_crm is auto-ALLOWED (WRITE_INTERNAL level)", () => {
    const decision = policyEngine.evaluateAction(
      makeRequest({ action: "update_crm", tool: "update_crm", authorityLevel: "WRITE_INTERNAL" })
    );
    assert.equal(decision.decision, "ALLOW");
  });

  test("10. report_to_ceo is auto-ALLOWED (WRITE_INTERNAL level)", () => {
    const decision = policyEngine.evaluateAction(
      makeRequest({ action: "report_to_ceo", tool: "report_to_ceo", authorityLevel: "WRITE_INTERNAL" })
    );
    assert.equal(decision.decision, "ALLOW");
  });

  // ─── 11. READ authority level is always allowed ───────────────────────────
  test("11. READ authority level is ALLOWED for any non-blocked action", () => {
    const decision = policyEngine.evaluateAction(
      makeRequest({ action: "read_something", tool: "read_something", authorityLevel: "READ" })
    );
    assert.equal(decision.decision, "ALLOW");
  });

  // ─── 12. PLAN authority level is allowed (no external side effect) ────────
  test("12. PLAN authority level is ALLOWED", () => {
    const decision = policyEngine.evaluateAction(
      makeRequest({ action: "plan_campaign", authorityLevel: "PLAN", riskLevel: "low" })
    );
    assert.equal(decision.decision, "ALLOW");
    assert.equal(decision.requiresHumanApproval, false);
  });

  // ─── 13. Default-deny: unknown action is BLOCKED ──────────────────────────
  test("13. Unknown action with HIGH_RISK_ACTION and no approval → BLOCK", () => {
    const decision = policyEngine.evaluateAction(
      makeRequest({
        action: "unknown_dangerous_action",
        tool: "unknown_dangerous_action",
        authorityLevel: "HIGH_RISK_ACTION",
        approvalState: undefined,
      })
    );
    assert.equal(decision.decision, "BLOCK");
  });

  // ─── 14. AI cannot self-approve ──────────────────────────────────────────
  test("14. GovernanceApprovalStore rejects 'ai' as approver", () => {
    const store = GovernanceApprovalStore.getInstance();
    store._clearForTest();
    const record = store.createApproval({
      action: "send_outreach_email",
      requestedBy: "n8n_agent",
      tenantId: "t1",
      actionPayload: { email: "test@example.com" },
    });
    assert.throws(
      () => store.approve({ approvalId: record.approvalId, approvedBy: "ai", tenantId: "t1" }),
      { message: /not a valid human approver/ }
    );
  });

  test("15. GovernanceApprovalStore rejects 'system' as approver", () => {
    const store = GovernanceApprovalStore.getInstance();
    store._clearForTest();
    const record = store.createApproval({
      action: "send_outreach_email",
      requestedBy: "n8n_agent",
      actionPayload: { email: "test@example.com" },
    });
    assert.throws(
      () => store.approve({ approvalId: record.approvalId, approvedBy: "system" }),
      { message: /not a valid human approver/ }
    );
  });

  test("16. GovernanceApprovalStore rejects 'CEO' (case insensitive) as approver", () => {
    const store = GovernanceApprovalStore.getInstance();
    store._clearForTest();
    const record = store.createApproval({
      action: "send_outreach_email",
      requestedBy: "n8n_agent",
      actionPayload: { email: "test@example.com" },
    });
    assert.throws(
      () => store.approve({ approvalId: record.approvalId, approvedBy: "CEO" }),
      { message: /not a valid human approver/ }
    );
  });

  // ─── 17. Human approval works correctly ──────────────────────────────────
  test("17. Valid human approver succeeds", () => {
    const store = GovernanceApprovalStore.getInstance();
    store._clearForTest();
    const record = store.createApproval({
      action: "send_outreach_email",
      requestedBy: "n8n_agent",
      tenantId: "t1",
      actionPayload: { email: "client@example.com" },
    });
    const approved = store.approve({
      approvalId: record.approvalId,
      approvedBy: "admin@websitebanja.com",
      tenantId: "t1",
    });
    assert.equal(approved.status, "APPROVED");
    assert.equal(approved.approvedBy, "admin@websitebanja.com");
  });

  // ─── 18. Expired approval cannot authorize ────────────────────────────────
  test("18. Expired approval is rejected on validateForExecution", async () => {
    const store = GovernanceApprovalStore.getInstance();
    store._clearForTest();
    const payload = { email: "x@example.com" };

    // Create with a very short TTL so it expires quickly
    const record = store.createApproval({
      action: "send_email",
      requestedBy: "agent",
      tenantId: "t1",
      actionPayload: payload,
      ttlMs: 50, // 50ms
    });

    // Approve immediately (before expiry)
    store.approve({ approvalId: record.approvalId, approvedBy: "human@example.com", tenantId: "t1" });

    // Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Now validation should fail with expiry
    const validation = store.validateForExecution({
      approvalId: record.approvalId,
      actionPayload: payload,
      tenantId: "t1",
    });
    assert.equal(validation.valid, false);
    assert.match(validation.reason ?? "", /expired/);
  });

  // ─── 19. One-time approval: consumed record cannot re-authorize ───────────
  test("19. Consumed approval cannot be reused (one-time use only)", () => {
    const store = GovernanceApprovalStore.getInstance();
    store._clearForTest();
    const payload = { email: "client@example.com" };
    const record = store.createApproval({
      action: "send_email",
      requestedBy: "agent",
      tenantId: "t1",
      actionPayload: payload,
    });
    store.approve({ approvalId: record.approvalId, approvedBy: "human@example.com", tenantId: "t1" });
    store.consume(record.approvalId);

    const validation = store.validateForExecution({
      approvalId: record.approvalId,
      actionPayload: payload,
      tenantId: "t1",
    });
    assert.equal(validation.valid, false);
    assert.match(validation.reason ?? "", /already been consumed/);
  });

  // ─── 20. Cross-tenant approval is impossible ──────────────────────────────
  test("20. Cross-tenant approval is rejected", () => {
    const store = GovernanceApprovalStore.getInstance();
    store._clearForTest();
    const record = store.createApproval({
      action: "send_email",
      requestedBy: "agent",
      tenantId: "tenant_A",
      actionPayload: { email: "a@example.com" },
    });
    assert.throws(
      () =>
        store.approve({
          approvalId: record.approvalId,
          approvedBy: "human@example.com",
          tenantId: "tenant_B", // different tenant
        }),
      { message: /Cross-tenant approval is forbidden/ }
    );
  });

  // ─── 21. Modified payload requires re-approval (hash check) ──────────────
  test("21. Modified action payload fails hash check — re-approval required", () => {
    const store = GovernanceApprovalStore.getInstance();
    store._clearForTest();
    const originalPayload = { email: "client@example.com", subject: "Original Subject" };
    const record = store.createApproval({
      action: "send_email",
      requestedBy: "agent",
      tenantId: "t1",
      actionPayload: originalPayload,
    });
    store.approve({ approvalId: record.approvalId, approvedBy: "human@example.com", tenantId: "t1" });

    const modifiedPayload = { email: "client@example.com", subject: "Modified Subject — DIFFERENT" };
    const validation = store.validateForExecution({
      approvalId: record.approvalId,
      actionPayload: modifiedPayload,
      tenantId: "t1",
    });
    assert.equal(validation.valid, false);
    assert.match(validation.reason ?? "", /modified/);
  });

  // ─── 22. Rejected approval cannot authorize ───────────────────────────────
  test("22. Rejected approval record is invalid for execution", () => {
    const store = GovernanceApprovalStore.getInstance();
    store._clearForTest();
    const payload = { email: "x@example.com" };
    const record = store.createApproval({
      action: "send_email",
      requestedBy: "agent",
      actionPayload: payload,
    });
    store.reject({ approvalId: record.approvalId, rejectedBy: "reviewer", rejectionReason: "Not approved" });

    const validation = store.validateForExecution({
      approvalId: record.approvalId,
      actionPayload: payload,
    });
    assert.equal(validation.valid, false);
    assert.match(validation.reason ?? "", /REJECTED/);
  });

  // ─── 23. Secrets never written to governance audit log ────────────────────
  test("23. Audit log sanitizes secret-like content", () => {
    const log = GovernanceAuditLog.getInstance();
    log._clearForTest();
    log.record({
      action: "send_email password=supersecret123",
      requestingAgent: "agent",
      decision: "BLOCK",
      authorityLevel: "WRITE_EXTERNAL",
      riskLevel: "high",
      policyId: "TEST_RULE",
      reason: "token=abc123 should be redacted",
      requiresHumanApproval: false,
    });
    const recent = log.getRecent(1);
    assert.equal(recent.length, 1);
    // Must not contain raw secret values
    assert.doesNotMatch(recent[0].action, /supersecret123/);
    assert.doesNotMatch(recent[0].reason, /abc123/);
  });

  // ─── 24. Authority level ordering is correct ─────────────────────────────
  test("24. Authority level ordering is READ < ANALYZE < PLAN < WRITE_INTERNAL < WRITE_EXTERNAL < HIGH_RISK_ACTION", () => {
    assert.ok(authorityIndex("READ") < authorityIndex("ANALYZE"));
    assert.ok(authorityIndex("ANALYZE") < authorityIndex("PLAN"));
    assert.ok(authorityIndex("PLAN") < authorityIndex("WRITE_INTERNAL"));
    assert.ok(authorityIndex("WRITE_INTERNAL") < authorityIndex("WRITE_EXTERNAL"));
    assert.ok(authorityIndex("WRITE_EXTERNAL") < authorityIndex("HIGH_RISK_ACTION"));
  });

  // ─── 25. Audit log summary counts correctly ───────────────────────────────
  test("25. Governance audit log summary counts are accurate", () => {
    const log = GovernanceAuditLog.getInstance();
    log._clearForTest();

    // Record some decisions
    for (let i = 0; i < 3; i++) {
      log.record({ action: "allow_action", requestingAgent: "agent", decision: "ALLOW", authorityLevel: "READ", riskLevel: "low", policyId: "ALLOW_READ", reason: "allowed", requiresHumanApproval: false });
    }
    for (let i = 0; i < 2; i++) {
      log.record({ action: "block_action", requestingAgent: "agent", decision: "BLOCK", authorityLevel: "HIGH_RISK_ACTION", riskLevel: "critical", policyId: "BLOCK_WHATSAPP", reason: "blocked", requiresHumanApproval: false });
    }
    log.record({ action: "approval_action", requestingAgent: "agent", decision: "REQUIRE_APPROVAL", authorityLevel: "WRITE_EXTERNAL", riskLevel: "high", policyId: "REQUIRE_HUMAN_APPROVAL_EXTERNAL_WRITE", reason: "needs approval", requiresHumanApproval: true });

    const summary = log.getSummary();
    assert.equal(summary.total, 6);
    assert.equal(summary.allowed, 3);
    assert.equal(summary.blocked, 2);
    assert.equal(summary.requireApproval, 1);
  });
});
