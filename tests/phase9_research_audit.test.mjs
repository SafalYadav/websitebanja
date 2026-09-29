// tests/phase9_research_audit.test.mjs
/**
 * WebsiteBanja Phase 9: Business Research + Website Audit Agent — Test Suite
 *
 * Verifies all Phase 9 requirements:
 *   1. SSRF Guard: Blocks localhost, 127.0.0.1, RFC1918 subnets, cloud metadata, invalid protocols
 *   2. SSRF Guard: Allows valid public web URLs
 *   3. HTML Parser: Extracts title, meta description, viewport, headings (H1-H3), images with/without alt, CTAs
 *   4. Technical & Mobile Audit: Correctly detects missing viewport, SSL status, and calculates scores
 *   5. SEO & Accessibility Audit: Detects missing title, missing description, missing H1, images missing alt
 *   6. Conversion & UX Audit: Detects call/email/WhatsApp links, buttons, forms, and assesses conversion readiness
 *   7. Synthetic Audit: Creates research-backed audit for businesses with missing or unreachable websites
 *   8. Opportunity Scoring: Calculates website opportunity score (0-100) based on audit dimensions
 *   9. Phase 10 Synthesis: Generates complete Phase 10 design inputs (visual, layout, sections, CTAs, imagery)
 *  10. Repository Persistence: Saves audit reports to scratch/audits/ with tenant isolation by userId
 *  11. Audit Service Orchestration: End-to-end resolution of Phase 8 lead, research compilation, and audit storage
 *  12. API Security: Rejects unauthorized requests with 401 UNAUTHORIZED
 *  13. API Validation: Rejects missing lead payload with 400 VALIDATION_FAILED
 *  14. API Execution: Successfully executes audit via POST /api/automation/audit-lead with valid secret
 *  15. n8n Workflow: Exported JSON contains valid node pipeline and zero hardcoded secrets
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

const { POST } = jiti("./src/app/api/automation/audit-lead/route.ts");
const { validateAuditTargetUrl, isSafePublicUrl } = jiti(
  "./src/lib/audit/ssrfGuard.ts"
);
const { parseHtml } = jiti("./src/lib/audit/htmlParser.ts");
const {
  evaluateTechnical,
  evaluateMobile,
  evaluateUx,
  evaluateSeo,
  evaluateConversion,
  evaluateAccessibility,
  calculateWebsiteOpportunityScore,
  createSyntheticMissingWebsiteAudit,
  synthesizePhase10DesignInputs,
} = jiti("./src/lib/audit/auditEngine.ts");
const { auditRepository } = jiti("./src/lib/audit/auditRepository.ts");
const { auditQualifiedLead } = jiti("./src/lib/audit/auditService.ts");

const DEFAULT_SECRET = "wb-auto-secret-local-dev-2026";

function createMockRequest(body, headers = {}) {
  const serialized = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("http://localhost:3000/api/automation/audit-lead", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: serialized,
  });
}

// ── Test Suites ───────────────────────────────────────────────────────────────

describe("Phase 9 — SSRF Protection & URL Validation", () => {
  test("1. Blocks loopback addresses (127.0.0.1, localhost, ::1)", () => {
    assert.equal(validateAuditTargetUrl("http://127.0.0.1").safe, false);
    assert.equal(validateAuditTargetUrl("http://localhost:3000").safe, false);
    assert.equal(validateAuditTargetUrl("http://[::1]").safe, false);
    assert.equal(isSafePublicUrl("http://127.0.0.1"), false);
  });

  test("2. Blocks private RFC1918 subnets (10.x, 192.168.x, 172.16.x)", () => {
    assert.equal(validateAuditTargetUrl("http://10.0.0.1/admin").safe, false);
    assert.equal(validateAuditTargetUrl("http://192.168.1.1/router").safe, false);
    assert.equal(validateAuditTargetUrl("http://172.20.0.5").safe, false);
  });

  test("3. Blocks cloud metadata service (169.254.169.254)", () => {
    const res = validateAuditTargetUrl("http://169.254.169.254/latest/meta-data/");
    assert.equal(res.safe, false);
    assert.match(res.reason, /blocked host|metadata|ssrf/i);
  });

  test("4. Blocks non-HTTP protocols (file:, ftp:, javascript:)", () => {
    assert.equal(validateAuditTargetUrl("file:///etc/passwd").safe, false);
    assert.equal(validateAuditTargetUrl("ftp://ftp.example.com").safe, false);
    assert.equal(validateAuditTargetUrl("javascript:alert(1)").safe, false);
  });

  test("5. Blocks internal and local TLDs (.local, .internal, .test)", () => {
    assert.equal(validateAuditTargetUrl("https://server.local").safe, false);
    assert.equal(validateAuditTargetUrl("https://cluster.internal").safe, false);
    assert.equal(validateAuditTargetUrl("https://api.test").safe, false);
  });

  test("6. Allows valid public HTTPS URLs", () => {
    const res = validateAuditTargetUrl("https://example.com/menu");
    assert.equal(res.safe, true);
    assert.equal(res.normalizedUrl, "https://example.com/menu");
  });
});

describe("Phase 9 — HTML Parser & Content Extraction", () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gourmet Bistro | Artisan Dining in City Center</title>
        <meta name="description" content="Experience seasonal farm-to-table cuisine at Gourmet Bistro.">
        <link rel="canonical" href="https://gourmetbistro.example.com">
        <meta property="og:title" content="Gourmet Bistro">
      </head>
      <body>
        <header>
          <h1>Artisan Farm-to-Table Dining</h1>
          <p>Welcome to our culinary haven.</p>
        </header>
        <main>
          <h2>Our Seasonal Menu</h2>
          <p>Fresh ingredients sourced daily.</p>
          <img src="/images/steak.jpg" alt="Seared dry-aged ribeye steak">
          <img src="/images/dessert.jpg">
          <h3>Reserve Your Table</h3>
          <a href="tel:+919876543210">Call Us: +91 98765 43210</a>
          <a href="mailto:contact@gourmetbistro.com">Email Reservations</a>
          <a href="https://wa.me/919876543210">Chat on WhatsApp</a>
          <button type="submit">Book Table</button>
          <form action="/book" method="POST">
            <input type="text" name="name" placeholder="Your Name">
          </form>
        </main>
      </body>
    </html>
  `;

  test("7. Extracts title, description, viewport, and OpenGraph correctly", () => {
    const parsed = parseHtml(sampleHtml);
    assert.equal(parsed.title, "Gourmet Bistro | Artisan Dining in City Center");
    assert.equal(parsed.metaDescription, "Experience seasonal farm-to-table cuisine at Gourmet Bistro.");
    assert.ok(parsed.viewport && parsed.viewport.includes("width=device-width"));
    assert.equal(parsed.canonical, "https://gourmetbistro.example.com");
    assert.equal(parsed.ogTitle, "Gourmet Bistro");
  });

  test("8. Extracts heading hierarchy accurately", () => {
    const parsed = parseHtml(sampleHtml);
    assert.equal(parsed.h1List.length, 1);
    assert.equal(parsed.h1List[0], "Artisan Farm-to-Table Dining");
    assert.equal(parsed.h2List.length, 1);
    assert.equal(parsed.h3List.length, 1);
  });

  test("9. Accurately tracks image alt attributes and missing alts", () => {
    const parsed = parseHtml(sampleHtml);
    assert.equal(parsed.images.length, 2);
    assert.equal(parsed.images.filter((i) => i.hasAlt).length, 1);
    assert.equal(parsed.images.filter((i) => !i.hasAlt).length, 1);
  });

  test("10. Detects contact CTAs, phone, email, WhatsApp, and forms", () => {
    const parsed = parseHtml(sampleHtml);
    assert.ok(parsed.links.some((l) => l.isPhone));
    assert.ok(parsed.links.some((l) => l.isEmail));
    assert.ok(parsed.links.some((l) => l.isWhatsApp));
    assert.equal(parsed.buttons.length, 1);
    assert.equal(parsed.formsCount, 1);
  });
});

describe("Phase 9 — Multi-Dimensional Audit Evaluators", () => {
  const goodPage = {
    url: "https://artisancafe.example.com",
    finalUrl: "https://artisancafe.example.com",
    httpStatus: 200,
    headers: { "content-type": "text/html" },
    html: "",
    sizeBytes: 15000,
    isHttps: true,
    responseTimeMs: 250,
  };

  const goodParsed = {
    title: "Artisan Coffee House — Handcrafted Roast in Downtown",
    metaDescription: "Visit our artisanal roastery for specialty pour-over brew, organic beans, and handcrafted French pastries in Downtown.",
    viewport: "width=device-width, initial-scale=1.0",
    canonical: "https://artisancafe.example.com",
    ogTitle: "Artisan Coffee House",
    ogImage: "https://artisancafe.example.com/og.jpg",
    twitterCard: "summary_large_image",
    h1List: ["Fresh Artisan Coffee Daily in Downtown"],
    h2List: ["Our Menu", "Location & Hours"],
    h3List: ["Specialty Drinks"],
    images: [
      { src: "/1.jpg", alt: "Latte art", hasAlt: true },
      { src: "/2.jpg", alt: "Roaster", hasAlt: true },
    ],
    links: [
      { href: "tel:+919876543210", text: "Call Us", isPhone: true, isEmail: false, isWhatsApp: false },
      { href: "mailto:coffee@artisancafe.com", text: "Email", isPhone: false, isEmail: true, isWhatsApp: false },
      { href: "https://wa.me/919876543210", text: "WhatsApp", isPhone: false, isEmail: false, isWhatsApp: true },
    ],
    buttons: [{ text: "Order Online" }],
    formsCount: 1,
    inputsCount: 2,
    scriptsCount: 2,
    stylesheetsCount: 2,
    wordCount: 350,
    rawText: "Artisan coffee roastery fresh drinks and snacks in Downtown.",
  };

  test("11. Technical & Mobile audit grades responsive HTTPS site high", () => {
    const tech = evaluateTechnical([goodPage], [goodParsed]);
    assert.equal(tech.https, true);
    assert.equal(tech.viewportPresent, true);
    assert.equal(tech.canonicalPresent, true);

    const mobile = evaluateMobile([goodParsed]);
    assert.equal(mobile.viewportConfigured, true);
    assert.equal(mobile.hasClickablePhone, true);
  });

  test("12. SEO and Accessibility evaluators reward complete tags", () => {
    const seo = evaluateSeo([goodParsed], "Artisan Coffee House", "Downtown");
    assert.ok(seo.score >= 70, `Expected high SEO score, got ${seo.score}`);
    assert.equal(seo.singleH1Present, true);

    const a11y = evaluateAccessibility([goodParsed]);
    assert.ok(a11y.score >= 80, `Expected high accessibility score, got ${a11y.score}`);
    assert.equal(a11y.missingAltCount, 0);
  });

  test("13. Conversion & UX audits recognize strong CTA and navigation signals", () => {
    const conv = evaluateConversion([goodParsed]);
    assert.ok(conv.score >= 70, `Expected strong conversion score, got ${conv.score}`);
    assert.equal(conv.hasPhoneCta, true);
    assert.equal(conv.hasWhatsAppLink, true);

    const ux = evaluateUx([goodParsed], "cafe");
    assert.ok(ux.score >= 70, `Expected strong UX score, got ${ux.score}`);
    assert.equal(ux.hasPrimaryCtaAboveFold, true);
  });

  test("14. Poor website with missing meta, no SSL, and no CTAs receives low scores and flags issues", () => {
    const poorPage = {
      url: "http://poorsite.example.com",
      finalUrl: "http://poorsite.example.com",
      httpStatus: 200,
      headers: {},
      html: "",
      sizeBytes: 2000,
      isHttps: false,
      responseTimeMs: 3200,
    };

    const poorParsed = {
      title: "",
      metaDescription: "",
      viewport: "",
      canonical: "",
      h1List: [],
      h2List: [],
      h3List: [],
      images: [{ src: "/1.jpg", hasAlt: false }, { src: "/2.jpg", hasAlt: false }],
      links: [],
      buttons: [],
      formsCount: 0,
      inputsCount: 0,
      scriptsCount: 0,
      stylesheetsCount: 0,
      wordCount: 15,
      rawText: "Under construction",
    };

    const tech = evaluateTechnical([poorPage], [poorParsed]);
    assert.equal(tech.https, false);
    assert.equal(tech.viewportPresent, false);
    assert.ok(tech.issues.length >= 2, "Flags technical issues");

    const mobile = evaluateMobile([poorParsed]);
    assert.equal(mobile.viewportConfigured, false);
    assert.equal(mobile.hasClickablePhone, false);

    const seo = evaluateSeo([poorParsed], "Poor Site", "Vadodara");
    assert.ok(seo.score <= 35, `Expected low SEO score, got ${seo.score}`);

    const conv = evaluateConversion([poorParsed]);
    assert.ok(conv.score <= 30, `Expected low conversion score, got ${conv.score}`);
  });
});

describe("Phase 9 — Opportunity Scoring & Synthetic Fallback", () => {
  test("15. Generates high opportunity score for weak website", () => {
    const opp = calculateWebsiteOpportunityScore("present", {
      ux: 30,
      seo: 25,
      conversion: 20,
      accessibility: 40,
    }, [
      { category: "conversion", severity: "high", evidence: "No phone CTA", recommendation: "Add CTA" },
      { category: "ux", severity: "high", evidence: "No above fold CTA", recommendation: "Add Hero CTA" },
    ]);

    assert.ok(opp.score >= 70, `Expected high opportunity score for weak site, got ${opp.score}`);
    assert.ok(opp.reasons.length >= 2, "Emits explainable reason codes");
  });

  test("16. Generates synthetic audit for missing website without crashing", () => {
    const mockLead = {
      leadId: "lead-test-missing-web-01",
      userId: "test-user-001",
      businessName: "Astra Gourmet Roasters",
      category: "Coffee Shop & Roastery",
      industry: "cafe",
      location: "Vadodara, Gujarat",
      phone: "+91 98765 43210",
      rating: 4.8,
      reviewCount: 120,
      websiteStatus: "missing",
    };

    const synthetic = createSyntheticMissingWebsiteAudit(mockLead);
    assert.ok(synthetic, "Synthetic audit components must be created");
    assert.equal(synthetic.technical.https, false);
    assert.equal(synthetic.mobile.viewportConfigured, false);
    assert.ok(synthetic.technical.issues.length > 0, "Must identify critical missing website issues");

    const opp = calculateWebsiteOpportunityScore("missing", {
      ux: synthetic.ux.score,
      seo: synthetic.seo.score,
      conversion: synthetic.conversion.score,
      accessibility: synthetic.accessibility.score,
    });
    assert.ok(opp.score >= 85, "Opportunity score for missing website must be >= 85");
  });

  test("17. Synthesizes coherent Phase 10 design inputs based on business category", () => {
    const mockLead = {
      leadId: "lead-test-synth-02",
      businessName: "Royal Heritage Hotel",
      category: "Boutique Hotel & Resort",
      industry: "hospitality",
      location: "Jaipur, Rajasthan",
      phone: "+91 91234 56789",
    };

    const designInputs = synthesizePhase10DesignInputs(
      mockLead,
      mockLead.industry,
      [
        { category: "conversion", severity: "high", evidence: "Missing WhatsApp link", recommendation: "Add WhatsApp" },
      ]
    );

    assert.ok(designInputs.visualDirection, "Must specify visual direction");
    assert.ok(designInputs.layoutStrategy, "Must specify layout strategy");
    assert.ok(designInputs.requiredSections.includes("hero"), "Hero section required");
    assert.ok(designInputs.ctaStrategy.includes("WhatsApp"), "Must adapt CTA for WhatsApp issue");
    assert.ok(designInputs.contentPriorities.length > 0, "Must specify content priorities");
  });
});

describe("Phase 9 — Repository Persistence & Tenant Isolation", () => {
  const testUserId = "user-audit-test-999";
  const otherUserId = "user-audit-test-888";

  test("18. Saves audit report and reads it back by auditId and leadId", async () => {
    const mockReport = {
      auditId: "audit-test-repo-01",
      leadId: "lead-repo-test-01",
      auditedAt: new Date().toISOString(),
      business: {
        businessName: "Savory Bites Diner",
        category: "Casual Dining",
        industry: "restaurant",
        location: "Vadodara, Gujarat",
        phone: "+91 98765 43210",
      },
      research: {
        businessName: "Savory Bites Diner",
        category: "Casual Dining",
        industry: "restaurant",
        location: "Vadodara, Gujarat",
        summary: "Savory Bites Diner is an active dining business.",
        publicContact: { phone: "+91 98765 43210" },
        socialPresence: [],
        reputationSummary: "Unrated local business",
      },
      crawl: { status: "completed", auditedUrls: ["https://savorybites.example.com"], pagesFetched: 1, durationMs: 400 },
      scores: {
        technical: 75,
        mobile: 85,
        ux: 70,
        seo: 65,
        conversion: 70,
        accessibility: 80,
        websiteOpportunityScore: 65,
      },
      opportunityReasons: ["SUBOPTIMAL_CALL_TO_ACTIONS"],
      technical: { https: true, viewportPresent: true, canonicalPresent: true, issues: [] },
      mobile: { status: "static_analysis", viewportConfigured: true, responsiveMetaPresent: true, hasClickablePhone: true, hasMobileNavigation: true, issues: [] },
      ux: { score: 70, hasPrimaryCtaAboveFold: true, hasClearNavigation: true, hasTrustSignals: true, hasClearValueProposition: true, issues: [] },
      seo: { score: 65, titleOptimal: true, metaDescriptionOptimal: true, singleH1Present: true, hasOpenGraph: true, hasTwitterCard: false, hasLocationRelevance: true, issues: [] },
      conversion: { score: 70, hasPhoneCta: true, hasEmailCta: false, hasContactForm: true, hasBookingLink: false, hasWhatsAppLink: false, hasPhysicalAddress: true, hasTestimonials: false, issues: [] },
      performance: { status: "static_analysis", htmlSizeBytes: 12000, imageCount: 2, scriptCount: 1, stylesheetCount: 1, externalDomainCount: 1 },
      accessibility: { score: 80, missingAltCount: 0, hasLangAttribute: true, hasHeadingHierarchy: true, issues: [] },
      issues: [],
      recommendations: ["Enhance mobile reservations"],
      phase10DesignInputs: {
        visualDirection: "warm artisanal dining",
        layoutStrategy: "conversion-focused storytelling",
        requiredSections: ["hero", "menu", "contact"],
        ctaStrategy: "table reservation",
        imageryDirection: "warm lighting, artisan dishes",
        contentPriorities: ["menu", "location"],
      },
    };

    const saved = await auditRepository.saveAudit(mockReport, testUserId);
    assert.equal(saved.auditId, "audit-test-repo-01");

    const fetchedByAudit = await auditRepository.findAuditById("audit-test-repo-01", testUserId);
    assert.ok(fetchedByAudit, "Must find saved audit by auditId");
    assert.equal(fetchedByAudit.business.businessName, "Savory Bites Diner");

    const fetchedByLead = await auditRepository.findAuditByLeadId("lead-repo-test-01", testUserId);
    assert.ok(fetchedByLead, "Must find saved audit by leadId");
    assert.equal(fetchedByLead.auditId, "audit-test-repo-01");
  });

  test("19. Enforces tenant isolation — other user cannot access audit report", async () => {
    const fetched = await auditRepository.findAuditById("audit-test-repo-01", otherUserId);
    assert.equal(fetched, null, "Should return null for non-owner user ID");

    const fetchedLead = await auditRepository.findAuditByLeadId("lead-repo-test-01", otherUserId);
    assert.equal(fetchedLead, null, "Should return null for non-owner user ID query");
  });
});

describe("Phase 9 — API Security & Orchestration", () => {
  test("20. Rejects unauthenticated request with 401 UNAUTHORIZED", async () => {
    const req = createMockRequest({ leadId: "any-lead-id" });
    const res = await POST(req);
    assert.equal(res.status, 401);

    const body = await res.json();
    assert.equal(body.error.code, "UNAUTHORIZED");
  });

  test("21. Rejects missing payload with 400 VALIDATION_FAILED", async () => {
    const req = createMockRequest({}, { "x-automation-secret": DEFAULT_SECRET });
    const res = await POST(req);
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.error.code, "VALIDATION_FAILED");
  });

  test("22. Successfully audits inline lead and returns Phase 10 design inputs", async () => {
    const mockLead = {
      leadId: "lead-inline-test-99",
      businessName: "Artisan Crust Pizzeria",
      category: "Italian Restaurant & Pizzeria",
      industry: "restaurant",
      location: "Bangalore, Karnataka",
      city: "Bangalore",
      phone: "+91 98450 12345",
      website: "",
      websiteStatus: "missing",
      rating: 4.7,
      reviewCount: 340,
    };

    const req = createMockRequest(
      { lead: mockLead },
      { "x-automation-secret": DEFAULT_SECRET }
    );

    const res = await POST(req);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.report, "Must contain report object");
    assert.equal(body.report.business.businessName, "Artisan Crust Pizzeria");
    assert.ok(body.report.phase10DesignInputs, "Must contain phase10DesignInputs");
    assert.ok(body.report.phase10DesignInputs.requiredSections.length > 0);
    assert.ok(body.report.phase10DesignInputs.ctaStrategy.length > 0);
  });
});

describe("Phase 9 — Exported n8n Workflow Validation", () => {
  test("23. Exported n8n workflow exists and contains full pipeline with zero hardcoded secrets", () => {
    const workflowPath = path.resolve(
      process.cwd(),
      "automation/n8n/WebsiteBanja_Business_Research_Website_Audit.json"
    );
    assert.ok(fs.existsSync(workflowPath), "Workflow file must exist");

    const content = fs.readFileSync(workflowPath, "utf-8");
    const json = JSON.parse(content);

    const nodeNames = json.nodes.map((n) => n.name);
    assert.ok(nodeNames.includes("Manual Trigger"), "Must have Manual Trigger");
    assert.ok(nodeNames.includes("Lead Audit Input"), "Must have Lead Audit Input node");
    assert.ok(nodeNames.includes("Prepare Audit Request"), "Must have Prepare Audit Request node");
    assert.ok(nodeNames.includes("HTTP Request → Audit Lead"), "Must have HTTP Request node");
    assert.ok(nodeNames.includes("Audit Succeeded?"), "Must have If node");
    assert.ok(nodeNames.includes("Format Phase 10 Handoff"), "Must have Format Phase 10 Handoff node");

    // Zero secrets
    assert.ok(!content.includes("sk-"), "No OpenAI key");
    assert.ok(!content.includes("sbp_"), "No Supabase key");
    assert.ok(!content.includes("eyJhbGci"), "No JWT");
    assert.ok(!content.includes("wb-auto-secret-local-dev-2026"), "No hardcoded secret in JSON");
  });
});
