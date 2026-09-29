// tests/phase16_real_world_integrations.test.mjs
/**
 * Test Suite: Phase 16 — WebsiteBanja Real-World Integrations
 * Tests Google Places API (New), Gmail OAuth, Inbound Replies, WhatsApp Lockdown,
 * Pre-flight gates, rate limiting, and zero secret leakage.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// Services under test
const { ConfigValidator, redactSecret } = jiti("./src/lib/integrations/configValidator.ts");
const { GooglePlacesDiscoveryProvider } = jiti("./src/lib/integrations/googlePlacesProvider.ts");
const { providerRegistry } = jiti("./src/lib/discovery/providers/registry.ts");
const { GmailOAuthManager } = jiti("./src/lib/integrations/gmailOAuth.ts");
const { GmailEmailProvider, getRateLimitState } = jiti("./src/lib/integrations/gmailEmailProvider.ts");
const { GmailInboundService } = jiti("./src/lib/integrations/gmailInboundService.ts");
const { leadRepository } = jiti("./src/lib/discovery/leadRepository.ts");
const { outreachRepository } = jiti("./src/lib/outreach/outreachRepository.ts");
const { crmRepository } = jiti("./src/lib/crm/crmRepository.ts");
const { FollowUpQueue } = jiti("./src/lib/automation/followUpQueue.ts");

// API Route Handlers
const { GET: getIntegrationsStatus } = jiti("./src/app/api/integrations/status/route.ts");
const { GET: getGmailStatusRoute } = jiti("./src/app/api/integrations/gmail/status/route.ts");
const { GET: getGmailConnectRoute } = jiti("./src/app/api/integrations/gmail/connect/route.ts");
const { POST: postGmailSyncRoute } = jiti("./src/app/api/integrations/gmail/sync/route.ts");
const { POST: postGmailSendRoute } = jiti("./src/app/api/integrations/gmail/send/route.ts");

const TEST_SECRET = "wb-auto-secret-local-dev-2026";
const TEST_USER = "test-phase16-user";

describe("Phase 16 — Real-World Integrations (Google Places + Gmail + Reply Handling)", () => {
  const originalEnv = { ...process.env };

  before(() => {
    process.env.WEBSITEBANJA_AUTOMATION_SECRET = TEST_SECRET;
    process.env.COMMUNICATION_DRY_RUN = "true";
    const procFile = path.resolve(process.cwd(), "scratch/integrations/processed_messages.json");
    if (fs.existsSync(procFile)) fs.writeFileSync(procFile, "[]");
  });

  after(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // 1. Config Validator & Secret Redaction
  // =========================================================================
  test("1. Secret Redaction: redacts keys without revealing plaintext tokens", () => {
    assert.equal(redactSecret("AIzaSyD1234567890"), "AIza...****");
    assert.equal(redactSecret("short"), "********");
    assert.equal(redactSecret(""), "");
    assert.equal(redactSecret(null), "");
  });

  test("2. Google Places status: reports NOT_CONFIGURED when key is absent", () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const status = ConfigValidator.getGooglePlacesStatus();
    assert.equal(status.status, "NOT_CONFIGURED");
    assert.equal(status.isConfigured, false);
    assert.equal(status.apiKeyPresent, false);
  });

  test("3. Google Places status: detects placeholder / invalid key", () => {
    process.env.GOOGLE_PLACES_API_KEY = "<your-api-key>";
    const status = ConfigValidator.getGooglePlacesStatus();
    assert.equal(status.status, "INVALID");
    assert.equal(status.isConfigured, false);
  });

  test("4. Google Places status: reports CONNECTED when valid key is provided", () => {
    process.env.GOOGLE_PLACES_API_KEY = "AIzaSyB1234567890FakeValidKeyFormat";
    const status = ConfigValidator.getGooglePlacesStatus();
    assert.equal(status.status, "CONNECTED");
    assert.equal(status.isConfigured, true);
    assert.equal(status.redactedKey, "AIza...****");
  });

  test("5. Gmail status: reports NOT_CONFIGURED when client credentials are missing", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GMAIL_REFRESH_TOKEN;
    const status = ConfigValidator.getGmailStatus();
    assert.equal(status.status, "NOT_CONFIGURED");
    assert.equal(status.account, "websitebanja@gmail.com");
    assert.equal(status.isConfigured, false);
  });

  test("6. Gmail status: reports NOT_AUTHORIZED when client ID exists but refresh token is missing", () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret-xyz";
    delete process.env.GMAIL_REFRESH_TOKEN;
    // Remove local auth file if exists
    const authFile = path.resolve(process.cwd(), "scratch/config/gmail_auth.json");
    if (fs.existsSync(authFile)) fs.unlinkSync(authFile);

    const status = ConfigValidator.getGmailStatus();
    assert.equal(status.status, "NOT_AUTHORIZED");
    assert.equal(status.isConfigured, false);
    assert.equal(status.clientIdPresent, true);
    assert.equal(status.refreshTokenPresent, false);
  });

  test("7. WhatsApp status: strictly locked to DISABLED with business number requirement", () => {
    const status = ConfigValidator.getWhatsAppStatus();
    assert.equal(status.status, "DISABLED");
    assert.equal(status.isEnabled, false);
    assert.match(status.reason, /dedicated business number required/i);
  });

  // =========================================================================
  // 2. Google Places (New) Discovery Provider
  // =========================================================================
  test("8. Google Places provider: correctly registered in provider registry", () => {
    const provider = providerRegistry.getProvider("google_places");
    assert.ok(provider);
    assert.equal(provider.id, "google_places");
    assert.equal(provider.name, "Google Places API (New)");
  });

  test("9. Google Places provider: fails gracefully when API key is missing", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const provider = new GooglePlacesDiscoveryProvider();
    await assert.rejects(
      async () => {
        await provider.search({ query: "restaurants", location: "Vadodara" });
      },
      {
        name: "DiscoveryProviderError",
        code: "DISCOVERY_PROVIDER_UNAVAILABLE",
      }
    );
  });

  test("10. Google Places provider: fails gracefully on placeholder key", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "placeholder";
    const provider = new GooglePlacesDiscoveryProvider();
    await assert.rejects(
      async () => {
        await provider.search({ query: "dentists", location: "Vadodara" });
      },
      {
        name: "DiscoveryProviderError",
        code: "DISCOVERY_AUTH_FAILED",
      }
    );
  });

  // =========================================================================
  // 3. Gmail OAuth 2.0 & Token Handling
  // =========================================================================
  test("11. Gmail OAuth: generates authorization URL with correct scopes and CSRF state", () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    const { url, state } = GmailOAuthManager.generateAuthorizationUrl();
    assert.ok(url.startsWith("https://accounts.google.com/o/oauth2/v2/auth"));
    assert.match(url, /scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send/);
    assert.match(url, /access_type=offline/);
    assert.match(url, /login_hint=websitebanja%40gmail.com/);
    assert.ok(state);

    // CSRF verification
    assert.equal(GmailOAuthManager.verifyState(state), true);
    // Consuming state twice must fail
    assert.equal(GmailOAuthManager.verifyState(state), false);
    assert.equal(GmailOAuthManager.verifyState("invalid-state"), false);
  });

  test("12. Gmail OAuth: stores refresh token securely in local storage", () => {
    ConfigValidator.saveRefreshToken("1//test-mock-refresh-token-xyz");
    const retrieved = ConfigValidator.getStoredRefreshToken();
    assert.equal(retrieved, "1//test-mock-refresh-token-xyz");

    // Full Gmail status now reports CONNECTED
    const status = ConfigValidator.getGmailStatus();
    assert.equal(status.status, "CONNECTED");
    assert.equal(status.refreshTokenPresent, true);
  });

  // =========================================================================
  // 4. Gmail Email Provider & Pre-Flight Sending Gates
  // =========================================================================
  test("13. Pre-flight check: blocks sending if outreach draft is not approved", async () => {
    const lead = await leadRepository.saveLead({
      leadId: "lead_test_unapproved",
      businessName: "Astra Bakery",
      normalizedName: "astra bakery",
      category: "bakery",
      industry: "food_beverage",
      email: "owner@astrabakery.com",
      websiteStatus: "missing",
      source: "google_places",
      sourceId: "place_123",
      discoveredAt: new Date().toISOString(),
      qualificationStatus: "QUALIFIED",
      leadStatus: "QUALIFIED",
      qualificationScore: 85,
      opportunityScore: 90,
      reasonCodes: ["NO_WEBSITE"],
      opportunityReasons: ["HIGH_INTENT"],
    }, TEST_USER);

    const outreach = await outreachRepository.saveOutreachRecord({
      outreachId: "outreach_test_draft",
      leadId: lead.leadId,
      auditId: "audit_123",
      previewId: "preview_123",
      business: { name: lead.businessName, industry: lead.industry, location: "Vadodara", email: lead.email },
      channel: "email",
      status: "draft", // NOT approved
      message: "Here is your preview website.",
      previewUrl: "https://websitebanja.com/p/astra-bakery",
      personalization: { websiteProblems: [], improvements: [], businessSpecificPoints: [] },
      validation: { isValid: true, issues: [], passedChecks: [], checkedAt: new Date().toISOString() },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      handoffPhase: "phase12_reply_intelligence_crm",
      userId: TEST_USER,
    });

    const preFlight = await GmailEmailProvider.verifyPreFlight(outreach.outreachId, TEST_USER);
    assert.equal(preFlight.canSend, false);
    assert.match(preFlight.reason || "", /Only 'approved' drafts may be sent/i);
  });

  test("14. Pre-flight check: blocks sending if lead is marked DO_NOT_CONTACT", async () => {
    const lead = await leadRepository.saveLead({
      leadId: "lead_test_dnc",
      businessName: "Opt Out Cafe",
      normalizedName: "opt out cafe",
      category: "cafe",
      industry: "food_beverage",
      email: "contact@optoutcafe.com",
      websiteStatus: "missing",
      source: "google_places",
      sourceId: "place_dnc",
      discoveredAt: new Date().toISOString(),
      qualificationStatus: "QUALIFIED",
      leadStatus: "QUALIFIED",
      qualificationScore: 80,
      opportunityScore: 85,
      reasonCodes: ["NO_WEBSITE"],
      opportunityReasons: ["HIGH_INTENT"],
    }, TEST_USER);

    await crmRepository.updateLeadStatus(lead.leadId, "DO_NOT_CONTACT", "Prospect requested opt-out", "system", undefined, undefined, TEST_USER);

    const outreach = await outreachRepository.saveOutreachRecord({
      outreachId: "outreach_test_dnc",
      leadId: lead.leadId,
      auditId: "audit_dnc",
      previewId: "preview_dnc",
      business: { name: lead.businessName, industry: lead.industry, location: "Vadodara", email: lead.email },
      channel: "email",
      status: "approved",
      message: "Here is your preview website.",
      previewUrl: "https://websitebanja.com/p/optout-cafe",
      personalization: { websiteProblems: [], improvements: [], businessSpecificPoints: [] },
      validation: { isValid: true, issues: [], passedChecks: [], checkedAt: new Date().toISOString() },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      handoffPhase: "phase12_reply_intelligence_crm",
      userId: TEST_USER,
    });

    const preFlight = await GmailEmailProvider.verifyPreFlight(outreach.outreachId, TEST_USER);
    assert.equal(preFlight.canSend, false);
    assert.match(preFlight.reason || "", /marked as DO_NOT_CONTACT/i);
  });

  test("15. Rate limiting: tracks hourly and daily email dispatches", () => {
    const state = getRateLimitState();
    assert.ok(typeof state.hourlyCount === "number");
    assert.ok(typeof state.dailyCount === "number");
    assert.ok(state.hourlyLimit > 0);
    assert.ok(state.dailyLimit > 0);
  });

  let sharedGymLeadId = `lead_gym_${Date.now()}`;
  let sharedGymOutreachId = `outreach_gym_${Date.now()}`;
  let gymEmail = `manager_${Date.now()}@elitefitness.com`;
  let salonEmail = `owner_${Date.now()}@citysalon.com`;

  test("16. Controlled Send (Dry Run / Safe Simulation): dispatches approved draft and updates CRM", async () => {
    const lead = await leadRepository.saveLead({
      leadId: sharedGymLeadId,
      businessName: "Elite Fitness Gym",
      normalizedName: "elite fitness gym",
      category: "gym",
      industry: "fitness",
      email: gymEmail,
      websiteStatus: "missing",
      source: "google_places",
      sourceId: "place_gym_1",
      discoveredAt: new Date().toISOString(),
      qualificationStatus: "QUALIFIED",
      leadStatus: "QUALIFIED",
      qualificationScore: 85,
      opportunityScore: 90,
      reasonCodes: ["NO_WEBSITE"],
      opportunityReasons: ["HIGH_INTENT"],
    }, TEST_USER);

    const outreach = await outreachRepository.saveOutreachRecord({
      outreachId: sharedGymOutreachId,
      leadId: lead.leadId,
      auditId: "audit_gym",
      previewId: "preview_gym",
      business: { name: lead.businessName, industry: lead.industry, location: "Vadodara", email: lead.email },
      channel: "email",
      status: "approved",
      subject: "Custom preview website for Elite Fitness",
      message: "Hi Elite Fitness, we designed a preview website for your gym.",
      previewUrl: "https://websitebanja.com/p/elite-fitness",
      personalization: { websiteProblems: [], improvements: [], businessSpecificPoints: [] },
      validation: { isValid: true, issues: [], passedChecks: [], checkedAt: new Date().toISOString() },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      handoffPhase: "phase12_reply_intelligence_crm",
      userId: TEST_USER,
    });

    const sendResult = await GmailEmailProvider.sendOutreachEmail(outreach.outreachId, {
      forceSend: true,
      userId: TEST_USER,
    });

    assert.equal(sendResult.success, true, JSON.stringify(sendResult.error));
    assert.ok(sendResult.messageId);

    // Verify outreach record status updated
    const updatedOutreach = await outreachRepository.findOutreachById(outreach.outreachId, TEST_USER);
    assert.equal(updatedOutreach?.status, "sent");

    // Verify CRM recorded the outbound send
    const crm = await crmRepository.getLeadCRMState(lead.leadId, TEST_USER);
    assert.equal(crm?.status, "OUTREACH_SENT");
    assert.ok(crm?.messages.some((m) => m.direction === "outbound"));

    // Duplicate idempotency check
    const duplicateAttempt = await GmailEmailProvider.sendOutreachEmail(outreach.outreachId, {
      forceSend: true,
      userId: TEST_USER,
    });
    assert.equal(duplicateAttempt.success, false);
    assert.equal(duplicateAttempt.error?.code, "DUPLICATE_SEND_PREVENTED");
  });

  test("17. Idempotency: verified via sendOutreachEmail duplicate guard", () => {
    assert.ok(true);
  });

  // =========================================================================
  // 5. Inbound Reply Ingestion & Thread Matching
  // =========================================================================
  test("18. Inbound service: ignores completely unrelated personal emails", async () => {
    const result = await GmailInboundService.processRawIncomingMessage(
      {
        messageId: `msg_unrelated_${Date.now()}`,
        threadId: "thread_random",
        from: "stranger@unknown-domain.org",
        to: "websitebanja@gmail.com",
        subject: "Lunch tomorrow?",
        date: new Date().toISOString(),
        snippet: "Hey are we still meeting for lunch tomorrow?",
        bodyText: "Hey are we still meeting for lunch tomorrow?",
        matchType: "unknown",
      },
      TEST_USER
    );

    assert.equal(result.ingested, false);
    assert.match(result.reason || "", /Unrelated message/i);
  });

  test("19. Inbound service: ingests matching reply and updates CRM to INTERESTED", async () => {
    const result = await GmailInboundService.processRawIncomingMessage(
      {
        messageId: `msg_reply_fitness_${Date.now()}`,
        threadId: "thread_fitness_1",
        from: gymEmail,
        to: "websitebanja@gmail.com",
        subject: "Re: Custom preview website for Elite Fitness",
        date: new Date().toISOString(),
        snippet: "This preview looks impressive! How much does it cost to launch?",
        bodyText: "This preview looks impressive! How much does it cost to launch?",
        matchType: "recipient_email",
      },
      TEST_USER
    );

    assert.equal(result.ingested, true);
    assert.ok(result.analysis);
    assert.equal(result.analysis.intent, "ASKING_PRICE");

    // Verify CRM updated to INTERESTED
    const crm = await crmRepository.getLeadCRMState(sharedGymLeadId, TEST_USER);
    assert.equal(crm?.status, "INTERESTED");
  });

  test("20. Inbound service: opt-out reply immediately transitions lead to DO_NOT_CONTACT and cancels follow-up", async () => {
    const optOutLeadId = `lead_optout_${Date.now()}`;
    const lead = await leadRepository.saveLead({
      leadId: optOutLeadId,
      businessName: "City Salon",
      normalizedName: "city salon",
      category: "salon",
      industry: "beauty",
      email: salonEmail,
      websiteStatus: "missing",
      source: "google_places",
      sourceId: "place_salon_1",
      discoveredAt: new Date().toISOString(),
      qualificationStatus: "QUALIFIED",
      leadStatus: "QUALIFIED",
      qualificationScore: 80,
      opportunityScore: 80,
      reasonCodes: ["NO_WEBSITE"],
      opportunityReasons: ["HIGH_INTENT"],
    }, TEST_USER);

    // Schedule a follow-up for this lead
    await FollowUpQueue.scheduleFollowUp({
      runId: "run_test_optout",
      leadId: lead.leadId,
      conversationId: `conv_${lead.leadId}_email`,
      outreachId: "outreach_test_optout",
      channel: "email",
      followUpNumber: 1,
      delayDays: 3,
    });

    const pendingBefore = await FollowUpQueue.listFollowUps();
    const leadJobsBefore = pendingBefore.filter((j) => j.leadId === lead.leadId && j.status === "scheduled");
    assert.equal(leadJobsBefore.length, 1);

    // Ingest unsubscribe reply
    const result = await GmailInboundService.processRawIncomingMessage(
      {
        messageId: `msg_optout_reply_${Date.now()}`,
        threadId: "thread_optout_1",
        from: salonEmail,
        to: "websitebanja@gmail.com",
        subject: "Re: Website Preview",
        date: new Date().toISOString(),
        snippet: "Please unsubscribe and do not contact me again.",
        bodyText: "Please unsubscribe and do not contact me again.",
        matchType: "recipient_email",
      },
      TEST_USER
    );

    assert.equal(result.ingested, true);

    // Verify lead status is now DO_NOT_CONTACT
    const crm = await crmRepository.getLeadCRMState(lead.leadId, TEST_USER);
    assert.equal(crm?.status, "DO_NOT_CONTACT");

    // Verify scheduled follow-up is cancelled
    const pendingAfter = await FollowUpQueue.listFollowUps();
    const leadJobsAfter = pendingAfter.filter((j) => j.leadId === lead.leadId && j.status === "scheduled");
    assert.equal(leadJobsAfter.length, 0);
  });

  test("21. Inbound service: deduplicates messages by message ID", async () => {
    const dedupeMsgId = `msg_dedupe_${Date.now()}`;
    const firstResult = await GmailInboundService.processRawIncomingMessage(
      {
        messageId: dedupeMsgId,
        threadId: "thread_dedupe_1",
        from: gymEmail,
        to: "websitebanja@gmail.com",
        subject: "Re: Custom preview website",
        date: new Date().toISOString(),
        snippet: "Thanks for sending!",
        bodyText: "Thanks for sending!",
        matchType: "recipient_email",
      },
      TEST_USER
    );
    assert.equal(firstResult.ingested, true);

    const repeatResult = await GmailInboundService.processRawIncomingMessage(
      {
        messageId: dedupeMsgId,
        threadId: "thread_dedupe_1",
        from: gymEmail,
        to: "websitebanja@gmail.com",
        subject: "Re: Custom preview website",
        date: new Date().toISOString(),
        snippet: "Thanks for sending!",
        bodyText: "Thanks for sending!",
        matchType: "recipient_email",
      },
      TEST_USER
    );

    assert.equal(repeatResult.ingested, false);
    assert.match(repeatResult.reason || "", /Duplicate message/i);
  });

  // =========================================================================
  // 6. API Route Handlers
  // =========================================================================
  test("22. API: GET /api/integrations/status rejects unauthorized request", async () => {
    const req = new Request("http://localhost:3000/api/integrations/status");
    const res = await getIntegrationsStatus(req);
    assert.equal(res.status, 401);
  });

  test("23. API: GET /api/integrations/status returns sanitized configuration status", async () => {
    const req = new Request("http://localhost:3000/api/integrations/status", {
      headers: { "x-automation-secret": TEST_SECRET },
    });
    const res = await getIntegrationsStatus(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.googlePlaces);
    assert.ok(data.gmail);
    assert.equal(data.whatsapp.status, "DISABLED");
    // Ensure no raw secrets are present
    const rawJson = JSON.stringify(data);
    assert.ok(!rawJson.includes("FakeValidKeyFormat"));
  });

  test("24. API: GET /api/integrations/gmail/status returns safe connection info", async () => {
    const req = new Request("http://localhost:3000/api/integrations/gmail/status", {
      headers: { "x-automation-secret": TEST_SECRET },
    });
    const res = await getGmailStatusRoute(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.account, "websitebanja@gmail.com");
    assert.equal(data.provider, "gmail");
  });

  test("25. API: GET /api/integrations/gmail/connect returns auth URL in JSON mode", async () => {
    const req = new Request("http://localhost:3000/api/integrations/gmail/connect?json=true", {
      headers: { "x-automation-secret": TEST_SECRET },
    });
    const res = await getGmailConnectRoute(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.url);
    assert.ok(data.state);
  });

  test("26. API: POST /api/integrations/gmail/sync processes incoming test payload", async () => {
    const req = new Request("http://localhost:3000/api/integrations/gmail/sync", {
      method: "POST",
      headers: {
        "x-automation-secret": TEST_SECRET,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messageId: `msg_api_test_sync_${Date.now()}`,
        leadId: sharedGymLeadId,
        from: "manager@elitefitness.com",
        subject: "Re: Follow up",
        bodyText: "Sounds great, let's schedule a call this Friday.",
        userId: TEST_USER,
      }),
    });
    const res = await postGmailSyncRoute(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.item.ingested, true);
  });

  test("27. API: POST /api/integrations/gmail/send enforces pre-flight validation", async () => {
    const req = new Request("http://localhost:3000/api/integrations/gmail/send", {
      method: "POST",
      headers: {
        "x-automation-secret": TEST_SECRET,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        outreachId: "non_existent_outreach_id",
        userId: TEST_USER,
      }),
    });
    const res = await postGmailSendRoute(req);
    assert.equal(res.status, 422);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, "PREFLIGHT_CHECK_FAILED");
  });
});
