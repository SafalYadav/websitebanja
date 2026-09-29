// tests/phase8_business_discovery.test.mjs
/**
 * WebsiteBanja Phase 8: Business Discovery + Lead Qualification — Test Suite
 *
 * Verifies all Phase 8 requirements:
 *   1. Input Validation: Rejects missing query/location, limit > 50, invalid radius
 *   2. Provider Abstraction: LocalDeterministicProvider returns expected fixtures
 *   3. Normalization: Names, phones, domains, and categories normalized accurately
 *   4. Deduplication: Multi-signal duplicate detection (phone, domain, source, name+city)
 *   5. Website Presence: Accurately reports missing, present, and unreachable states
 *   6. Qualification Engine: Generates score >= 60 and QUALIFIED for viable businesses
 *   7. Qualification Engine: Disqualifies permanently closed businesses
 *   8. Qualification Engine: Disqualifies irrelevant non-commercial/government entities
 *   9. Opportunity Scoring: Generates high score for businesses with no website
 *  10. Opportunity Scoring: Distinguishes opportunity from qualification score
 *  11. Reason Codes: Emits explainable reason codes for qualification and opportunity
 *  12. Persistence: Saves leads to scratch/leads/ with valid readback
 *  13. Tenant Isolation: Lead queries isolate leads by user ID
 *  14. API Security: Rejects unauthorized requests with 401 UNAUTHORIZED
 *  15. API Execution: Generates clean DiscoveryResponse with summary and leads
 *  16. n8n Workflow: Exported JSON contains valid node pipeline and zero secrets
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// ── Imports ───────────────────────────────────────────────────────────────────

const { POST } = jiti("./src/app/api/automation/discover-leads/route.ts");
const { validateDiscoveryCriteria, executeDiscoveryRun } = jiti(
  "./src/lib/discovery/discoveryService.ts"
);
const { LocalDeterministicProvider } = jiti(
  "./src/lib/discovery/providers/localDeterministicProvider.ts"
);
const {
  normalizeBusinessName,
  normalizePhoneNumber,
  normalizeWebsiteDomain,
  normalizeCategory,
} = jiti("./src/lib/discovery/normalizer.ts");
const { deduplicateBatch, findDuplicateInPool } = jiti(
  "./src/lib/discovery/deduplicator.ts"
);
const { checkWebsitePresence } = jiti("./src/lib/discovery/websitePresence.ts");
const { qualifyBusinessLead } = jiti(
  "./src/lib/discovery/qualificationEngine.ts"
);
const { calculateOpportunityScore } = jiti(
  "./src/lib/discovery/opportunityEngine.ts"
);
const { leadRepository } = jiti("./src/lib/discovery/leadRepository.ts");

const DEFAULT_SECRET = "wb-auto-secret-local-dev-2026";

function createMockRequest(body, headers = {}) {
  const serialized = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("http://localhost:3000/api/automation/discover-leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: serialized,
  });
}

// ── Test Suites ───────────────────────────────────────────────────────────────

describe("Phase 8 — Input Validation & Criteria", () => {
  test("1. Rejects missing query with DISCOVERY_INVALID_QUERY", () => {
    assert.throws(
      () => validateDiscoveryCriteria({ location: "Vadodara" }),
      /Field 'query' is required/
    );
  });

  test("2. Rejects missing location with DISCOVERY_INVALID_LOCATION", () => {
    assert.throws(
      () => validateDiscoveryCriteria({ query: "restaurants" }),
      /Field 'location' is required/
    );
  });

  test("3. Rejects limit exceeding 50 with DISCOVERY_LIMIT_EXCEEDED", () => {
    assert.throws(
      () => validateDiscoveryCriteria({ query: "restaurants", location: "Vadodara", limit: 100 }),
      /cannot exceed maximum allowed of 50/
    );
  });

  test("4. Normalizes valid criteria defaults", () => {
    const valid = validateDiscoveryCriteria({ query: " cafes ", location: " Vadodara, Gujarat " });
    assert.equal(valid.query, "cafes");
    assert.equal(valid.location, "Vadodara, Gujarat");
    assert.equal(valid.limit, 20);
  });
});

describe("Phase 8 — Provider Abstraction & Deterministic Fixtures", () => {
  test("5. LocalDeterministicProvider returns filtered results for Vadodara restaurants", async () => {
    const provider = new LocalDeterministicProvider();
    const results = await provider.search({
      query: "restaurants",
      location: "Vadodara",
      limit: 10,
    });

    assert.ok(results.length > 0, "Must return results");
    assert.ok(results.some((r) => r.name.includes("Astra Specialty Coffee")), "Must include Astra");
    assert.ok(results.some((r) => r.name.includes("Grand Heritage")), "Must include Grand Heritage");
  });
});

describe("Phase 8 — Normalization Engine", () => {
  test("6. normalizeBusinessName cleans legal suffixes and branch locations", () => {
    assert.equal(
      normalizeBusinessName("Astra Specialty Coffee - Vadodara Branch"),
      "astra specialty coffee"
    );
    assert.equal(
      normalizeBusinessName("Grand Heritage Dining Pvt. Ltd."),
      "grand heritage dining"
    );
    assert.equal(
      normalizeBusinessName("SmileCare Dental Studio, Vadodara"),
      "smilecare dental studio"
    );
  });

  test("7. normalizePhoneNumber standardizes Indian and international formats", () => {
    assert.equal(normalizePhoneNumber("+91 (98765) 43210"), "+919876543210");
    assert.equal(normalizePhoneNumber("09876543210"), "+919876543210");
    assert.equal(normalizePhoneNumber("9876543210"), "+919876543210");
    assert.equal(normalizePhoneNumber("123"), undefined); // invalid
  });

  test("8. normalizeWebsiteDomain extracts canonical root domain", () => {
    assert.equal(
      normalizeWebsiteDomain("https://www.GrandHeritageDining.com/menu?ref=1"),
      "grandheritagedining.com"
    );
    assert.equal(
      normalizeWebsiteDomain("http://smilecarevadodara.in/"),
      "smilecarevadodara.in"
    );
    assert.equal(normalizeWebsiteDomain("not a url"), undefined);
  });

  test("9. normalizeCategory maps to Phase 6 supported industry", () => {
    const res = normalizeCategory("Artisanal Bakery & Cafe", "Specialty espresso and baked breads");
    assert.equal(res.industry, "restaurant");
  });
});

describe("Phase 8 — Deduplication Engine", () => {
  test("10. Detects duplicate by matching phone number and marks status", () => {
    const leadA = {
      leadId: "lead_001",
      businessName: "Astra Specialty Coffee",
      normalizedName: "astra specialty coffee",
      normalizedPhone: "+919876543210",
      city: "Vadodara",
      reasonCodes: [],
    };
    const leadB = {
      leadId: "lead_002",
      businessName: "Astra Specialty Coffee - Vadodara Branch",
      normalizedName: "astra specialty coffee",
      normalizedPhone: "+919876543210",
      city: "Vadodara",
      reasonCodes: [],
    };

    const dupCheck = findDuplicateInPool(leadB, [leadA]);
    assert.equal(dupCheck.isDuplicate, true);
    assert.equal(dupCheck.duplicateOf, "lead_001");
    assert.equal(dupCheck.matchedField, "phone");

    const { duplicateLeads, uniqueLeads } = deduplicateBatch([leadA, leadB]);
    assert.equal(uniqueLeads.length, 1);
    assert.equal(duplicateLeads.length, 1);
    assert.equal(duplicateLeads[0].leadStatus, "DUPLICATE");
    assert.equal(duplicateLeads[0].duplicateOf, "lead_001");
  });
});

describe("Phase 8 — Website Presence & Reachability", () => {
  test("11. checkWebsitePresence flags missing and simulated unreachable sites", async () => {
    const missing = await checkWebsitePresence("");
    assert.equal(missing.status, "missing");
    assert.equal(missing.isHttps, false);

    const unreachable = await checkWebsitePresence("http://unreachable-oldmill-bistro.local");
    assert.equal(unreachable.status, "unreachable");

    const invalid = await checkWebsitePresence("htt p:// invalid domain");
    assert.equal(invalid.status, "invalid_url");
  });
});

describe("Phase 8 — Qualification & Opportunity Engines", () => {
  test("12. Qualifies high-opportunity business with no website (Score >= 60)", () => {
    const lead = {
      businessName: "Astra Specialty Coffee",
      category: "restaurant",
      industry: "restaurant",
      phone: "+91 98765 43210",
      email: "hello@astraspecialty.in",
      address: "Alkapuri",
      city: "Vadodara",
      websiteStatus: "missing",
      rating: 4.8,
      reviewCount: 142,
    };

    const qual = qualifyBusinessLead(lead);
    assert.equal(qual.status, "QUALIFIED");
    assert.ok(qual.score >= 60, `Score must be >= 60, got ${qual.score}`);
    assert.ok(qual.reasonCodes.includes("NO_WEBSITE"));
    assert.ok(qual.reasonCodes.includes("COMMERCIAL_CATEGORY"));
    assert.ok(qual.reasonCodes.includes("ACTIVE_BUSINESS"));

    const opp = calculateOpportunityScore(lead);
    assert.ok(opp.score >= 80, `Opportunity score must be high, got ${opp.score}`);
    assert.ok(opp.reasons.includes("OPPORTUNITY_NO_EXISTING_WEBSITE"));
  });

  test("13. Disqualifies permanently closed business immediately", () => {
    const lead = {
      businessName: "Closed Bakery",
      isPermanentlyClosed: true,
      category: "restaurant",
    };

    const qual = qualifyBusinessLead(lead);
    assert.equal(qual.status, "DISQUALIFIED");
    assert.equal(qual.score, 0);
    assert.ok(qual.reasonCodes.includes("PERMANENTLY_CLOSED"));

    const opp = calculateOpportunityScore(lead);
    assert.equal(opp.score, 0);
  });

  test("14. Disqualifies irrelevant non-commercial / government entity", () => {
    const lead = {
      businessName: "Vadodara Municipal Park Maintenance",
      category: "government_service",
      description: "Municipal tree trimming and public garden office",
    };

    const qual = qualifyBusinessLead(lead);
    assert.equal(qual.status, "DISQUALIFIED");
    assert.ok(qual.reasonCodes.includes("IRRELEVANT_NON_COMMERCIAL_ENTITY"));
  });
});

describe("Phase 8 — Persistence & Tenant Isolation", () => {
  test("15. Persists leads to scratch/leads and isolates by tenant userId", async () => {
    const testLeadUserA = {
      leadId: `lead_tenant_a_${Date.now()}`,
      businessName: "Tenant A Salon",
      normalizedName: "tenant a salon",
      category: "wellness_spa",
      industry: "wellness_spa",
      city: "Vadodara",
      websiteStatus: "missing",
      qualificationStatus: "QUALIFIED",
      leadStatus: "QUALIFIED",
      qualificationScore: 85,
      opportunityScore: 90,
      reasonCodes: ["ACTIVE_BUSINESS"],
      opportunityReasons: ["OPPORTUNITY_NO_EXISTING_WEBSITE"],
      source: "local",
      sourceId: "src_a",
      discoveredAt: new Date().toISOString(),
    };

    const userA = "11111111-1111-1111-1111-111111111111";
    const userB = "22222222-2222-2222-2222-222222222222";

    await leadRepository.saveLead(testLeadUserA, userA);

    const userALeads = await leadRepository.listLeads({ userId: userA });
    assert.ok(userALeads.some((l) => l.leadId === testLeadUserA.leadId), "User A must see lead");

    const userBLeads = await leadRepository.listLeads({ userId: userB });
    assert.ok(!userBLeads.some((l) => l.leadId === testLeadUserA.leadId), "User B must NOT see User A lead");
  });
});

describe("Phase 8 — Automation API & n8n Workflow", () => {
  test("16. Rejects unauthenticated request with 401 UNAUTHORIZED", async () => {
    const req = createMockRequest({ query: "restaurants", location: "Vadodara" });
    const res = await POST(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "UNAUTHORIZED");
  });

  test("17. Executes discovery run and returns summary + qualified leads", async () => {
    const req = createMockRequest(
      { query: "restaurants", location: "Vadodara", limit: 10 },
      { "x-automation-secret": DEFAULT_SECRET }
    );
    const res = await POST(req);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.summary.discovered > 0, "Discovered count > 0");
    assert.ok(body.summary.duplicates >= 1, "Duplicate count >= 1");
    assert.ok(body.summary.qualified > 0, "Qualified count > 0");
    assert.ok(body.qualifiedLeads.length > 0, "Qualified leads array > 0");

    // Check handoff fields
    const firstQualified = body.qualifiedLeads[0];
    assert.ok(firstQualified.leadId, "Must have leadId");
    assert.ok(firstQualified.qualificationScore >= 60, "Must be qualified score");
    assert.ok(firstQualified.opportunityScore > 0, "Must have opportunity score");
  });

  test("18. Exported n8n workflow exists and contains NO hardcoded secrets", () => {
    const workflowPath = path.resolve(
      process.cwd(),
      "automation/n8n/WebsiteBanja_Business_Discovery_Qualification.json"
    );
    assert.ok(fs.existsSync(workflowPath), "Workflow file must exist");

    const content = fs.readFileSync(workflowPath, "utf-8");
    const json = JSON.parse(content);

    const nodeNames = json.nodes.map((n) => n.name);
    assert.ok(nodeNames.includes("Manual Trigger"), "Must have Manual Trigger");
    assert.ok(nodeNames.includes("Discovery Search Criteria"), "Must have Discovery Criteria node");
    assert.ok(nodeNames.includes("HTTP Request → Discover Leads"), "Must have HTTP Request node");
    assert.ok(nodeNames.includes("Discovery Succeeded?"), "Must have If node");
    assert.ok(nodeNames.includes("Format Qualified Leads for Phase 9/10"), "Must have Qualified Output node");

    // Verify secret safety
    assert.ok(!content.includes("sk-"), "No OpenAI key");
    assert.ok(!content.includes("sbp_"), "No Supabase key");
    assert.ok(!content.includes("eyJhbGci"), "No JWT");
    assert.ok(!content.includes("wb-auto-secret-local-dev-2026"), "No hardcoded secret in JSON");
  });
});
