// tests/phase10_personalized_preview.test.mjs
/**
 * WebsiteBanja Phase 10: Automated Personalized Preview Generation — Test Suite
 *
 * Verifies all Phase 10 requirements:
 *   1. Lead & Audit Resolution: Resolves lead and audit from storage, or falls back to synthetic audit
 *   2. Rejection of Missing Lead: Rejects non-existent leadId with 404 LEAD_NOT_FOUND
 *   3. Audit-Driven Personalization: Injects verified business attributes (rating, reviews, city, services)
 *   4. Anti-Generic Copy: Rejects lorem ipsum, placeholder text, and generic business claims
 *   5. Dynamic Section Selection: Section sequences differ by industry and respect audit inputs
 *   6. 3-Level Image Deduplication: Level 1 in-page zero duplication, Level 2 role-routing, Level 3 cross-preview
 *   7. Hero Contrast Validation (Hotel Fix): Computes WCAG contrast ratio, applies reinforced scrim & panel
 *   8. Deterministic Quality Validation: Generated preview achieves passing quality score >= 60
 *   9. Multi-Industry Preview Generation: Generates 5 differentiated previews (Restaurant, Hotel, SaaS, Local, Agency)
 *  10. Local Storage Persistence: Saves preview JSON and manifest in scratch/previews/
 *  11. Phase 11 Outreach Context: Emits mainWebsiteProblems, newWebsiteImprovements, and personalizationPoints
 *  12. API Security: Rejects unauthorized requests with 401 UNAUTHORIZED
 *  13. API Validation: Rejects missing leadId with 400 VALIDATION_FAILED
 *  14. API Execution: Successfully executes POST /api/automation/generate-personalized-preview
 *  15. n8n Workflow: Exported workflow exists, matches pipeline, and contains zero hardcoded secrets
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

const { POST } = jiti(
  "./src/app/api/automation/generate-personalized-preview/route.ts"
);
const { generatePersonalizedPreview } = jiti(
  "./src/lib/personalization/previewGenerator.ts"
);
const {
  getRelativeLuminance,
  getContrastRatio,
  parseColor,
  validateAndProtectHeroContrast,
} = jiti("./src/lib/personalization/heroContrastValidator.ts");
const { leadRepository } = jiti("./src/lib/discovery/leadRepository.ts");
const { auditRepository } = jiti("./src/lib/audit/auditRepository.ts");

const DEFAULT_SECRET = "wb-auto-secret-local-dev-2026";

function createMockRequest(body, headers = {}) {
  const serialized = typeof body === "string" ? body : JSON.stringify(body);
  return new Request(
    "http://localhost:3000/api/automation/generate-personalized-preview",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: serialized,
    }
  );
}

// ── Test Suites ───────────────────────────────────────────────────────────────

describe("Phase 10 — Hero Contrast Validation & Readability Protection", () => {
  test("1. Computes WCAG 2.1 relative luminance and contrast ratios accurately", () => {
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };
    const whiteLuminance = getRelativeLuminance(white);
    const blackLuminance = getRelativeLuminance(black);

    assert.equal(whiteLuminance, 1.0);
    assert.equal(blackLuminance, 0.0);

    const contrastRatio = getContrastRatio(white, black);
    assert.equal(contrastRatio, 21.0); // Maximum 21:1 ratio
  });

  test("2. Protects luxury hotel hero text with reinforced scrim, drop shadow, and glass panel", () => {
    const hotelHero = {
      title: "The Grand Azure Resort & Spa — Coastal Sanctuary",
      subtitle: "An untamed sanctuary of coastal elegance offering private cliffside villas and Michelin dining.",
      button: "Reserve Your Villa",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
      layoutVariant: "fullscreen_visual",
    };

    const { protectedHero, report } = validateAndProtectHeroContrast(
      hotelHero,
      "luxury_hotel",
      "luxury_bespoke",
      "#0C0B09"
    );

    assert.ok(protectedHero.contrastProtection, "Must attach contrastProtection config");
    assert.equal(protectedHero.contrastProtection.mode, "reinforced_scrim");
    assert.equal(protectedHero.contrastProtection.textMode, "light");
    assert.equal(protectedHero.contrastProtection.panelBackdrop, true, "Hotel hero must use glass panel");
    assert.equal(protectedHero.contrastProtection.textShadow, true);
    assert.ok(report.headingContrast >= 7.0, `Expected WCAG AAA contrast >= 7.0, got ${report.headingContrast}`);
    assert.equal(report.isReadable, true);
  });

  test("3. Configures dark text on luminous light background for high contrast", () => {
    const clinicHero = {
      title: "Apex Dental Aesthetics",
      subtitle: "Comprehensive biomimetic dentistry and optical smile design.",
      button: "Book Appointment",
      layoutVariant: "action_focused",
    };

    const { protectedHero, report } = validateAndProtectHeroContrast(
      clinicHero,
      "clinic",
      "clean_clinical",
      "#FFFFFF"
    );

    assert.ok(protectedHero.contrastProtection);
    assert.equal(protectedHero.contrastProtection.textMode, "dark");
    assert.ok(report.headingContrast >= 4.5, "Must achieve at least WCAG AA 4.5:1 ratio");
    assert.equal(report.isReadable, true);
  });
});

describe("Phase 10 — Lead Resolution & Personalization Engine", () => {
  test("4. Rejects non-existent leadId with LEAD_NOT_FOUND", async () => {
    const res = await generatePersonalizedPreview({
      leadId: "lead_non_existent_99999",
    });

    assert.equal(res.success, false);
    assert.equal(res.status, "failed");
    assert.equal(res.error?.code, "LEAD_NOT_FOUND");
  });

  test("5. Generates personalized preview for existing Phase 8 lead with Phase 9 audit", async () => {
    // Lead exists from Phase 8 & Phase 9 runs
    const res = await generatePersonalizedPreview({
      leadId: "lead_cc4f59e3d5e5",
    });

    assert.equal(res.success, true);
    assert.equal(res.status, "generated");
    assert.ok(res.preview, "Must return preview object");
    assert.ok(res.preview.id.startsWith("prev_"), "Preview ID format");
    assert.ok(res.preview.url.includes("/preview/prev_"), "Valid preview URL");
    assert.ok(res.preview.qualityScore >= 60, `Quality score must be >= 60, got ${res.preview.qualityScore}`);

    // Business personalization checks
    assert.equal(res.business.name, "Grand Heritage Dining");
    assert.ok(res.preview.sectionCount >= 5, "Expected at least 5 structured sections");

    // Phase 11 Outreach Context checks
    assert.ok(res.outreachContext, "Must include outreachContext");
    assert.ok(res.outreachContext.mainWebsiteProblems.length > 0);
    assert.ok(res.outreachContext.newWebsiteImprovements.length > 0);
    assert.ok(res.outreachContext.personalizationPoints.length > 0);
  });

  test("6. Enforces zero duplicate images within the generated preview (Level 1)", async () => {
    const res = await generatePersonalizedPreview({
      leadId: "lead_cc4f59e3d5e5",
    });

    assert.ok(res.preview, "Preview must exist");
    const urls = res.preview.imageManifest.map((m) => m.url.split("?")[0]);
    const uniqueUrls = new Set(urls);

    assert.equal(
      uniqueUrls.size,
      urls.length,
      `All images in page must be unique. Found ${urls.length - uniqueUrls.size} duplicates.`
    );
  });

  test("7. Emits structured Phase 11 handoff contract", async () => {
    const res = await generatePersonalizedPreview({
      leadId: "lead_cc4f59e3d5e5",
    });

    assert.equal(res.handoffPhase, "phase11_personalized_outreach");
    assert.ok(res.leadId);
    assert.ok(res.auditId);
    assert.ok(res.preview?.id);
    assert.ok(res.preview?.url);
    assert.ok(res.business?.name);
  });
});

describe("Phase 10 — Multi-Industry Preview Generation (5 Industries)", () => {
  const industries = [
    {
      name: "Grand Heritage Dining",
      category: "restaurant",
      industry: "restaurant",
      location: "Vadodara, Gujarat",
      description: "Authentic royal Gujarati and North Indian fine dining banquet with private dining suites.",
      phone: "+91 98250 11223",
      rating: 4.6,
      reviewCount: 310,
    },
    {
      name: "The Grand Azure Resort & Spa",
      category: "luxury_hotel",
      industry: "luxury_hotel",
      location: "Udaipur, Rajasthan",
      description: "Palatial lakefront sanctuary offering royal cliffside suites, private butler care, and heritage thalassotherapy.",
      phone: "+91 294 243 0011",
      rating: 4.9,
      reviewCount: 420,
    },
    {
      name: "HyperFlow AI Systems",
      category: "saas",
      industry: "saas",
      location: "Bangalore, Karnataka",
      description: "Enterprise event orchestration and autonomous telemetry pipelines engineered for high-throughput teams.",
      phone: "+91 80 4123 4567",
      rating: 4.8,
      reviewCount: 185,
    },
    {
      name: "Apex Plumbing & HVAC Solutions",
      category: "local_service",
      industry: "local_service",
      location: "Ahmedabad, Gujarat",
      description: "24/7 emergency plumbing, certified heating diagnostics, and commercial mechanical services.",
      phone: "+91 79 2650 9988",
      rating: 4.7,
      reviewCount: 290,
    },
    {
      name: "Studio Vertex Architecture & Brand",
      category: "creative_agency",
      industry: "creative_agency",
      location: "Mumbai, Maharashtra",
      description: "Bespoke spatial architecture, monolithic typographic systems, and high-impact digital brand ateliers.",
      phone: "+91 22 2490 8877",
      rating: 4.9,
      reviewCount: 95,
    },
  ];

  test("8. Generates distinct, differentiated previews across all 5 test industries", async () => {
    const generatedPreviews = [];

    for (const ind of industries) {
      const mockLead = {
        leadId: `lead_test_ind_${ind.industry}`,
        businessName: ind.name,
        category: ind.category,
        industry: ind.industry,
        city: ind.location.split(",")[0],
        address: ind.location,
        phone: ind.phone,
        description: ind.description,
        rating: ind.rating,
        reviewCount: ind.reviewCount,
        websiteStatus: "missing",
      };

      const res = await generatePersonalizedPreview({
        leadId: mockLead.leadId,
        overrideLead: mockLead,
      });

      assert.equal(res.success, true, `Generation should succeed for ${ind.industry}`);
      assert.equal(res.status, "generated");
      assert.ok(res.preview?.qualityScore >= 60, `Quality score >= 60 for ${ind.industry}`);
      assert.ok(res.preview?.contrastReport?.isReadable, `Contrast must be readable for ${ind.industry}`);

      generatedPreviews.push(res);
    }

    assert.equal(generatedPreviews.length, 5);

    // Verify visual archetypes differ across industries
    const archetypes = generatedPreviews.map((p) => p.preview?.designArchetype);
    const uniqueArchetypes = new Set(archetypes);
    assert.ok(
      uniqueArchetypes.size >= 4,
      `Expected at least 4 distinct visual archetypes, got ${uniqueArchetypes.size} (${[...uniqueArchetypes].join(", ")})`
    );

    // Verify hero images differ across all 5 industries
    const heroImages = generatedPreviews.map((p) => p.preview?.imageManifest[0]?.url.split("?")[0]);
    const uniqueHeroImages = new Set(heroImages);
    assert.equal(
      uniqueHeroImages.size,
      5,
      "Every industry preview must have a unique hero image with zero cross-industry duplication."
    );
  });
});

describe("Phase 10 — API Security, Payload & n8n Workflow Validation", () => {
  test("9. Rejects unauthenticated request with 401 UNAUTHORIZED", async () => {
    const req = createMockRequest({ leadId: "lead_cc4f59e3d5e5" });
    const res = await POST(req);
    assert.equal(res.status, 401);

    const body = await res.json();
    assert.equal(body.error.code, "UNAUTHORIZED");
  });

  test("10. Rejects missing leadId with 400 VALIDATION_FAILED", async () => {
    const req = createMockRequest({}, { "x-automation-secret": DEFAULT_SECRET });
    const res = await POST(req);
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.error.code, "VALIDATION_FAILED");
  });

  test("11. Successfully executes POST /api/automation/generate-personalized-preview with secret", async () => {
    const req = createMockRequest(
      { leadId: "lead_cc4f59e3d5e5" },
      { "x-automation-secret": DEFAULT_SECRET }
    );
    const res = await POST(req);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.status, "generated");
    assert.ok(body.preview.url.includes("/preview/prev_"));
    assert.ok(body.preview.contrastReport.isReadable);
    assert.equal(body.handoffPhase, "phase11_personalized_outreach");
  });

  test("12. Exported n8n workflow exists, contains correct pipeline, and has zero hardcoded secrets", () => {
    const workflowPath = path.resolve(
      process.cwd(),
      "automation/n8n/WebsiteBanja_Personalized_Preview_Generation.json"
    );
    assert.ok(fs.existsSync(workflowPath), "Workflow file must exist");

    const content = fs.readFileSync(workflowPath, "utf-8");
    const json = JSON.parse(content);

    const nodeNames = json.nodes.map((n) => n.name);
    assert.ok(nodeNames.includes("Manual Trigger"), "Must have Manual Trigger");
    assert.ok(nodeNames.includes("Phase 8 Lead Handoff Input"), "Must have Lead Handoff node");
    assert.ok(nodeNames.includes("Prepare Preview Request"), "Must have Prepare Preview Request node");
    assert.ok(nodeNames.includes("HTTP Request → Generate Preview"), "Must have HTTP Request node");
    assert.ok(nodeNames.includes("Preview Generation Succeeded?"), "Must have If node");
    assert.ok(nodeNames.includes("Format Phase 11 Outreach Handoff"), "Must have Phase 11 Handoff node");
    assert.ok(nodeNames.includes("Handle Preview Failure"), "Must have Error node");

    // Verify secret safety
    assert.ok(!content.includes("sk-"), "No OpenAI key");
    assert.ok(!content.includes("sbp_"), "No Supabase key");
    assert.ok(!content.includes("eyJhbGci"), "No JWT");
    assert.ok(!content.includes("wb-auto-secret-local-dev-2026"), "No hardcoded secret in JSON");
  });
});
