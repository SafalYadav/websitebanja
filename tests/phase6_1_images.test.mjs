// tests/phase6_1_images.test.mjs
/**
 * WebsiteBanja Phase 6.1: Intelligent Image & Asset Differentiation — Test Suite
 *
 * Verifies all Phase 6.1 enhancements:
 *
 *  1.  normalizeCategoryKey maps SaaS / AI / engineering queries to "saas"
 *  2.  normalizeCategoryKey maps luxury hotel & resort queries to "luxury_hotel"
 *  3.  normalizeCategoryKey maps restaurant & fine dining queries to "restaurant"
 *  4.  normalizeCategoryKey maps real estate & architectural queries to "real_estate"
 *  5.  normalizeCategoryKey maps creative agency & studio queries to "creative_agency"
 *  6.  resolveSemanticImage returns high-tech infrastructure/telemetry image for SaaS (NEVER cafe/food)
 *  7.  SaaS hero image is strictly high-tech server/telemetry, never cafe
 *  8.  resolveSemanticImage enforces in-page deduplication via usedInPage set
 *  9.  resolveSemanticImage enforces cross-business deduplication via avoidImages
 * 10.  validateAssetDifferentiation verifies inPageDuplicateCount === 0
 * 11.  validateAssetDifferentiation verifies crossBusinessDuplicateCount === 0
 * 12.  validateAssetDifferentiation verifies heroDuplicateCount === 0
 * 13.  validateAssetDifferentiation verifies irrelevantIndustryImageCount === 0
 * 14.  validateAssetDifferentiation asserts isSaaSCafeFixed === true
 * 15.  No hardcoded cafe stock image (photo-1501339847302-ac426a4a7cbb) exists in CardVariants.tsx
 * 16.  No hardcoded stock image fallbacks exist in cardRendererRegistry.tsx
 * 17.  WebsiteRenderer correctly merges item images from services/features arrays
 * 18.  All 5 demo websites render with 100% unique in-page imagery
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

const {
  normalizeCategoryKey,
  resolveSemanticImage,
  canonicalizeImageUrl,
  REGISTRY,
} = jiti("./src/lib/images/semanticImageSourcing.ts");

const {
  DEMO_BUSINESS_SPECS,
  generateDemoWebsite,
  getAllDemoWebsites,
  validateAssetDifferentiation,
} = jiti("./src/lib/ai/phase6DemoData.ts");

const CAFE_STOCK_ID = "photo-1501339847302-ac426a4a7cbb";

// ── Test Suites ───────────────────────────────────────────────────────────────

describe("Phase 6.1 — Category & Semantic Normalization", () => {
  test("1. normalizeCategoryKey maps SaaS / AI / engineering queries to 'saas'", () => {
    assert.equal(normalizeCategoryKey("saas", "HyperFlow AI", "dark_technical"), "saas");
    assert.equal(normalizeCategoryKey("AI Workflow Platform", "NeuralOps", "dark_technical"), "saas");
    assert.equal(normalizeCategoryKey("Cloud Infrastructure", "KubeScale"), "saas");
  });

  test("2. normalizeCategoryKey maps luxury hotel & resort queries to 'luxury_hotel'", () => {
    assert.equal(normalizeCategoryKey("hotel", "The Grand Azure Resort & Spa", "luxury_bespoke"), "luxury_hotel");
    assert.equal(normalizeCategoryKey("Luxury Boutique Resort & Spa", "Villa Côte d'Azur"), "luxury_hotel");
  });

  test("3. normalizeCategoryKey maps restaurant & fine dining queries to 'restaurant'", () => {
    assert.equal(normalizeCategoryKey("restaurant", "L'Aura Epicure", "warm_artisanal"), "restaurant");
    assert.equal(normalizeCategoryKey("Modern Culinary Atelier", "Terroir Salon"), "restaurant");
    assert.equal(normalizeCategoryKey("Gastronomy Tasting Bistro", "Ember & Hearth"), "restaurant");
  });

  test("4. normalizeCategoryKey maps real estate & architectural queries to 'real_estate'", () => {
    assert.equal(normalizeCategoryKey("real_estate", "Aura & Stone Realty", "minimal_editorial"), "real_estate");
    assert.equal(normalizeCategoryKey("Luxury Architecture & Estates", "Geneva Private Brokerage"), "real_estate");
  });

  test("5. normalizeCategoryKey maps creative agency & studio queries to 'creative_agency'", () => {
    assert.equal(normalizeCategoryKey("creative_agency", "Studio Monochrome", "expressive_creative"), "creative_agency");
    assert.equal(normalizeCategoryKey("Digital Product & Brand Atelier", "Kvantum Design"), "creative_agency");
  });
});

describe("Phase 6.1 — Semantic Image Resolution & SaaS Café Bug Fix", () => {
  test("6. resolveSemanticImage for SaaS returns high-tech image and NEVER café image", () => {
    const heroImage = resolveSemanticImage({
      category: "saas",
      businessName: "HyperFlow AI",
      archetype: "dark_technical",
      role: "hero",
    });

    assert.ok(heroImage.imageUrl, "Must return image URL");
    assert.ok(!heroImage.imageUrl.includes(CAFE_STOCK_ID), "SaaS must NEVER receive café stock image");
    assert.equal(heroImage.category, "saas");
    assert.ok(
      heroImage.semanticIntent.toLowerCase().includes("telemetry") ||
      heroImage.semanticIntent.toLowerCase().includes("server") ||
      heroImage.semanticIntent.toLowerCase().includes("cyber") ||
      heroImage.semanticIntent.toLowerCase().includes("cloud"),
      "SaaS intent must be technical/cyber/telemetry"
    );
  });

  test("7. All images in SaaS registry are technical and none are café/culinary", () => {
    const saasImages = REGISTRY.saas;
    assert.ok(saasImages.length >= 10, "SaaS registry must have at least 10 entries");
    for (const item of saasImages) {
      assert.ok(!item.url.includes(CAFE_STOCK_ID), "SaaS registry must not contain cafe image");
      const intentLower = item.intent.toLowerCase();
      assert.ok(!intentLower.includes("coffee"), "SaaS image must not be coffee");
      assert.ok(!intentLower.includes("pastry"), "SaaS image must not be pastry");
      assert.ok(!intentLower.includes("dining"), "SaaS image must not be dining");
      assert.ok(!intentLower.includes("restaurant"), "SaaS image must not be restaurant");
    }
  });

  test("8. resolveSemanticImage enforces in-page deduplication via usedInPage", () => {
    const usedInPage = new Set();
    const resolvedImages = [];

    for (let i = 0; i < 8; i++) {
      const img = resolveSemanticImage({
        category: "saas",
        businessName: "HyperFlow AI",
        archetype: "dark_technical",
        role: i < 4 ? "services" : "features",
        itemIndex: i,
        usedInPage,
      });
      const canonical = canonicalizeImageUrl(img.imageUrl);
      assert.ok(!resolvedImages.includes(canonical), `Image ${canonical} was re-selected within page`);
      resolvedImages.push(canonical);
    }
    assert.equal(resolvedImages.length, 8, "Expected 8 unique images");
  });

  test("9. resolveSemanticImage avoids images on cross-business avoid lists", () => {
    const avoid = ["https://images.unsplash.com/photo-1550751827-4bd374c3f58b"];
    const img = resolveSemanticImage({
      category: "saas",
      businessName: "Different SaaS Co",
      role: "hero",
      avoidImages: avoid,
    });
    assert.notEqual(
      canonicalizeImageUrl(img.imageUrl),
      canonicalizeImageUrl(avoid[0]),
      "Image must not match avoided URL"
    );
  });
});

describe("Phase 6.1 — Asset Differentiation Audit & Full Pipeline Verification", () => {
  test("10. validateAssetDifferentiation() passes all criteria with 0 collisions", () => {
    const audit = validateAssetDifferentiation();

    assert.equal(audit.totalWebsitesAudited, 6, "Must audit all 6 demo websites");
    assert.equal(audit.inPageDuplicateCount, 0, "In-page duplicate count must be 0");
    assert.equal(audit.crossBusinessDuplicateCount, 0, "Cross-business duplicate count must be 0");
    assert.equal(audit.heroDuplicateCount, 0, "Hero duplicate count must be 0");
    assert.equal(audit.irrelevantIndustryImageCount, 0, "Irrelevant image count must be 0");
    assert.equal(audit.isSaaSCafeFixed, true, "isSaaSCafeFixed must be true");
  });

  test("11. Target 5 businesses each have 100% unique in-page images", () => {
    const audit = validateAssetDifferentiation();
    const targetSlugs = ["luxury-hotel", "saas", "restaurant", "real-estate", "creative-agency"];

    for (const slug of targetSlugs) {
      const details = audit.businessDetails[slug];
      assert.ok(details, `Details for ${slug} must exist`);
      assert.equal(
        details.uniqueImages.length,
        details.imageCount,
        `All images on ${slug} must be unique (got ${details.uniqueImages.length}/${details.imageCount})`
      );
      assert.equal(details.hasCafeImage, false, `${slug} must not have cafe image`);
      assert.equal(details.allImagesRelevant, true, `${slug} must have all relevant images`);
    }
  });

  test("12. CardVariants.tsx contains NO hardcoded cafe stock photo", () => {
    const cardVariantsPath = path.resolve(process.cwd(), "src/components/cards/CardVariants.tsx");
    const content = fs.readFileSync(cardVariantsPath, "utf-8");
    assert.ok(
      !content.includes(CAFE_STOCK_ID),
      "CardVariants.tsx must NOT contain hardcoded cafe fallback photo-1501339847302-ac426a4a7cbb"
    );
  });

  test("13. cardRendererRegistry.tsx contains NO hardcoded fallback stock images", () => {
    const registryPath = path.resolve(process.cwd(), "src/components/registry/cardRendererRegistry.tsx");
    const content = fs.readFileSync(registryPath, "utf-8");
    assert.ok(
      !content.includes("photo-1600585154340-be6161a56a0c"),
      "cardRendererRegistry.tsx must not contain hardcoded house photo"
    );
    assert.ok(
      !content.includes("photo-1579546929518-9e396f3cc809"),
      "cardRendererRegistry.tsx must not contain hardcoded gradient photo"
    );
  });

  test("14. WebsiteRenderer merges services/features images if raw items omit them", () => {
    const rendererPath = path.resolve(process.cwd(), "src/components/editor/WebsiteRenderer.tsx");
    const content = fs.readFileSync(rendererPath, "utf-8");
    assert.ok(
      content.includes("website.services?.[idx]?.image"),
      "WebsiteRenderer must merge website.services?.[idx]?.image"
    );
    assert.ok(
      content.includes("website.features?.[idx]?.image"),
      "WebsiteRenderer must merge website.features?.[idx]?.image"
    );
  });
});
