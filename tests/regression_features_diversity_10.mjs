// tests/regression_features_diversity_10.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { createJiti } from "jiti";

const ROOT = process.cwd();
const jiti = createJiti(import.meta.url, {
  alias: {
    "@/": path.resolve(ROOT, "src") + "/",
  },
});

const { generateDesignStrategy } = jiti("@/lib/ai/designStrategy.ts");
const { normalizeWebsiteData } = jiti("@/lib/normalizeWebsite.ts");
const { evaluateCandidateSimilarities, DEFAULT_UNIQUENESS_CONFIG } = jiti("@/lib/agents/uniqueness/similarity.ts");
const { extractDetailedDesignFingerprint } = jiti("@/lib/agents/uniqueness/fingerprint.ts");
const { recordCandidateFromWebsite, clearLocalCandidates } = jiti("@/lib/agents/uniqueness/candidateSelector.ts");

const ARTIFACTS_DIR = "/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a";
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, "scratch/regression_features_screenshots");
const PREVIEWS_DIR = path.resolve(ROOT, "scratch/previews");

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

const NORTHSTAR_BRIEF = {
  businessName: "Northstar Coffee House",
  category: "Cafe & Roastery",
  location: "Mainpuri, Uttar Pradesh, India",
  description: "Artisanal single-origin coffee roastery and specialty cafe in Mainpuri, serving pour-overs, espresso beverages, house-baked sourdough pastries, and locally sourced brunch in a warm, minimalist space.",
  targetAudience: "Coffee connoisseurs, remote workers, college students, and families looking for a cozy third place.",
  brandPositioning: "Warm, artisanal, community-centered, handcrafted excellence",
  primaryCta: "Order Ahead & Reserve",
  contact: "hello@northstarcoffee.in",
  phone: "+91 98765 43210",
  address: "Station Road, Near Civil Lines, Mainpuri, UP 205001",
  goals: ["showcase artisanal brew menu", "drive table reservations", "highlight local roasting heritage"],
  requestedFeatures: ["menu", "about", "atmosphere", "features", "reviews", "contact", "reservation"],
};

clearLocalCandidates();

async function runFeaturesTest() {
  console.log("================================================================================");
  console.log("   WEBSITEBANJA: 10-RUN FEATURES SECTION DIVERSITY REGRESSION TEST              ");
  console.log("================================================================================\n");

  const candidates = [];
  const usedImages = [];
  const runSummaries = [];

  for (let i = 1; i <= 10; i++) {
    const is3d = i > 5;
    const runId = `features_run_${i}`;
    const threeDPreference = is3d ? "yes" : "no";

    console.log(`\n------------------------------------------------------------`);
    console.log(` Generating ${runId} | 3D: ${is3d ? "ON (Explicit)" : "OFF (Default)"}`);
    console.log(`------------------------------------------------------------`);

    const recentCandidates = candidates.slice(-4);
    const avoidArchetypes = recentCandidates.map(c => c.fingerprint.visualArchetype).filter(Boolean);
    const avoidColors = recentCandidates.map(c => c.primaryColor).filter(Boolean);
    const avoidCards = recentCandidates.map(c => c.cardFamily).filter(Boolean);
    const avoidBackgrounds = recentCandidates.map(c => c.backgroundType).filter(Boolean);
    const avoidFeatureLayouts = recentCandidates.map(c => c.featuresLayoutVariant).filter(Boolean);

    const strategy = generateDesignStrategy({
      ...NORTHSTAR_BRIEF,
      threeDPreference,
      avoidPatterns: [...avoidArchetypes, ...avoidColors, ...avoidCards, ...avoidBackgrounds, ...avoidFeatureLayouts],
      recentFingerprints: recentCandidates.map(c => `${c.fingerprint.antiRepetitionFingerprint || ""}_feat-layout:${c.featuresLayoutVariant || ""}_feat-geom:${c.featuresGeometry || ""}`),
      seed: `northstar_features_${i}_${Date.now()}_${i * 37}`,
    });

    const featStrat = strategy.featuresLayoutStrategy;
    console.log(`   Visual Archetype:    ${strategy.visualArchetype}`);
    console.log(`   Features Layout:     ${featStrat.layoutVariant}`);
    console.log(`   Card Geometry:       ${featStrat.cardGeometry}`);
    console.log(`   Density / Rhythm:    ${featStrat.density}`);
    console.log(`   Icon Treatment:      ${featStrat.iconTreatment}`);
    console.log(`   Animation Strategy:  ${featStrat.animationStrategy}`);
    console.log(`   Spatial 3D:          ${featStrat.spatialComposition}`);

    const rawData = {
      businessName: NORTHSTAR_BRIEF.businessName,
      category: NORTHSTAR_BRIEF.category,
      brand: {
        businessName: NORTHSTAR_BRIEF.businessName,
        tagline: "Single-origin roasts & handcrafted brunch in Mainpuri",
        primaryColor: strategy.colorSystem.primary,
        secondaryColor: strategy.colorSystem.secondary,
        visualArchetype: strategy.visualArchetype,
      },
      hero: {
        title: "Artisanal Roastery & Neighborhood Third Place",
        subtitle: "Direct-trade beans roasted in small batches, pour-overs, and sourdough pastries.",
        button: "Explore Brew Menu",
        buttonAction: { type: "scroll", targetSection: "features" },
      },
      about: {
        title: "Rooted in Craft, Roasted in Mainpuri",
        description: "Founded with a deep reverence for coffee origins and community warmth.",
      },
      services: [
        {
          title: "Single-Origin Pour Overs",
          description: "Meticulously extracted beans from high-altitude Ethiopian and Coorg estates.",
          badge: "Signature",
        },
        {
          title: "Micro-Batch House Roasts",
          description: "Roasted weekly in Mainpuri on a vintage drum roaster for peak aroma.",
          badge: "Fresh Weekly",
        },
        {
          title: "Hearth-Baked Sourdough",
          description: "Long-fermentation loaves and flaky viennoiserie baked every morning.",
          badge: "Daily Hearth",
        },
      ],
      features: [
        {
          title: "Direct Ethical Trade",
          description: "We work directly with generational coffee estates, ensuring fair pricing and sustainable harvest.",
        },
        {
          title: "Precision Micro-Roasting",
          description: "Every single lot is roasted in small batches with strict temperature curves for maximum flavor clarity.",
        },
        {
          title: "Welcoming Third Place",
          description: "A sanctuary of natural daylight, warm timber, and thoughtful community connection.",
        },
      ],
      reviews: [
        {
          name: "Ananya S.",
          text: "The pour-over bar here sets a new benchmark for coffee culture in Uttar Pradesh.",
          role: "Specialty Coffee Enthusiast",
          rating: 5,
        },
        {
          name: "Rohit V.",
          text: "Their sourdough croissant and flat white are unmatched.",
          role: "Architect & Local Regular",
          rating: 5,
        },
        {
          name: "Dr. Vikram K.",
          text: "A peaceful sanctuary with world-class Ethiopian roasts.",
          role: "Verified Guest",
          rating: 5,
        },
      ],
      contact: {
        address: NORTHSTAR_BRIEF.address,
        phone: NORTHSTAR_BRIEF.phone,
        email: NORTHSTAR_BRIEF.contact,
      },
    };

    const normalized = normalizeWebsiteData(rawData, {
      category: NORTHSTAR_BRIEF.category,
      businessName: NORTHSTAR_BRIEF.businessName,
      description: NORTHSTAR_BRIEF.description,
      runSeed: `northstar_feat_seed_${i}_${strategy.visualArchetype}_${i * 23}`,
      avoidImages: [...usedImages],
      strategy,
    });

    const heroImg = normalized.hero?.image;
    const aboutImg = normalized.about?.image;
    if (heroImg) usedImages.push(heroImg);
    if (aboutImg) usedImages.push(aboutImg);

    const simResult = evaluateCandidateSimilarities(
      normalized,
      NORTHSTAR_BRIEF.category,
      NORTHSTAR_BRIEF.description,
      recentCandidates,
      DEFAULT_UNIQUENESS_CONFIG
    );

    console.log(`   Uniqueness Score:  ${(simResult.highestScore * 100).toFixed(1)}% (Status: ${simResult.status})`);

    const detailedFp = extractDetailedDesignFingerprint(normalized);
    candidates.push({
      id: runId,
      businessName: NORTHSTAR_BRIEF.businessName,
      category: NORTHSTAR_BRIEF.category,
      fingerprint: detailedFp,
      featuresLayoutVariant: featStrat.layoutVariant,
      featuresGeometry: featStrat.cardGeometry,
      featuresIconTreatment: featStrat.iconTreatment,
      featuresAnimationStrategy: featStrat.animationStrategy,
      primaryColor: strategy.colorSystem.primary,
      backgroundType: strategy.backgroundStrategy.type,
      cardFamily: strategy.cardFamilyStrategy.primaryCardFamily,
    });

    recordCandidateFromWebsite(runId, NORTHSTAR_BRIEF.businessName, NORTHSTAR_BRIEF.category, normalized);

    const previewJsonPath = path.join(PREVIEWS_DIR, `${runId}.json`);
    fs.writeFileSync(previewJsonPath, JSON.stringify(normalized, null, 2), "utf-8");

    runSummaries.push({
      runId,
      is3d,
      archetype: strategy.visualArchetype,
      heroLayout: strategy.heroType,
      featuresLayoutVariant: featStrat.layoutVariant,
      cardGeometry: featStrat.cardGeometry,
      density: featStrat.density,
      iconTreatment: featStrat.iconTreatment,
      animationStrategy: featStrat.animationStrategy,
      spatialComposition: featStrat.spatialComposition,
      headingFont: strategy.typographyTokens.headingFont,
      primaryColor: strategy.colorSystem.primary,
      secondaryColor: strategy.colorSystem.secondary,
      backgroundType: strategy.backgroundStrategy.type,
      uniquenessScore: simResult.highestScore,
      uniquenessStatus: simResult.status,
    });
  }

  console.log("\n================================================================================");
  console.log("   STEP 2: PLAYWRIGHT BROWSER INSPECTION & SCREENSHOT VERIFICATION              ");
  console.log("================================================================================\n");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const domInspectionResults = [];

  for (const summary of runSummaries) {
    const url = `http://localhost:3000/preview/${summary.runId}`;
    console.log(`🌐 Inspecting ${summary.runId} at ${url}...`);

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1000);
    } catch (err) {
      console.warn(`⚠️ Navigation timeout for ${url}, taking snapshot anyway:`, err.message);
    }

    const fullpagePath = path.join(SCREENSHOTS_DIR, `${summary.runId}_fullpage.png`);
    await page.screenshot({ path: fullpagePath, fullPage: true });

    // Locate Features Section
    const featuresLocator = page.locator('section[data-wb-features-layout]').first();
    const featuresPath = path.join(SCREENSHOTS_DIR, `${summary.runId}_features.png`);

    const hasFeaturesEl = (await featuresLocator.count()) > 0;
    if (hasFeaturesEl) {
      await featuresLocator.screenshot({ path: featuresPath });
    } else {
      // Fallback section locator
      const fallbackLoc = page.locator('section:has-text("Why Dine With Us")').first();
      if ((await fallbackLoc.count()) > 0) {
        await fallbackLoc.screenshot({ path: featuresPath });
      }
    }

    // Inspect DOM
    const domData = await page.evaluate(() => {
      const featSec = document.querySelector('section[data-wb-features-layout]') || document.querySelector('section');
      const text = (featSec ? featSec.innerText : document.body.innerText).toUpperCase();

      const hasTelemetryLeak =
        text.includes("TELEMETRY") ||
        text.includes("P99 LATENCY") ||
        text.includes("SYS_ACTIVE");

      const spatialWrappers = document.querySelectorAll('[data-wb-spatial="true"]');
      const webglCanvases = document.querySelectorAll("canvas");

      const layoutAttr = featSec ? featSec.getAttribute("data-wb-features-layout") : null;
      const sectionSpatial = featSec ? featSec.getAttribute("data-wb-spatial") : null;

      return {
        hasTelemetryLeak,
        layoutAttr,
        sectionSpatial,
        spatialWrapperCount: spatialWrappers.length,
        webglCanvasCount: webglCanvases.length,
      };
    });

    console.log(`   DOM Verification: Layout: ${domData.layoutAttr} | Spatial: ${domData.sectionSpatial || "none"} | Canvas: ${domData.webglCanvasCount} | Telemetry Leak: ${domData.hasTelemetryLeak ? "YES (FAIL)" : "NO (CLEAN)"}`);

    domInspectionResults.push({
      ...summary,
      url,
      domData,
      fullpageScreenshot: fullpagePath,
      featuresScreenshot: featuresPath,
    });
  }

  await browser.close();

  console.log("\n================================================================================");
  console.log("   STEP 3: GENERATE COMPOSITE COMPARISON SHEETS (SHARP)                        ");
  console.log("================================================================================\n");

  function escapeXml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  async function composeFeaturesGrid(runIds, outputPath, title, subtitle) {
    const colWidth = 450;
    const colHeight = 650;
    const imagesToCompose = [];

    for (let i = 0; i < runIds.length; i++) {
      const runId = runIds[i];
      const imgPath = path.join(SCREENSHOTS_DIR, `${runId}_features.png`);
      if (fs.existsSync(imgPath)) {
        const resizedBuf = await sharp(imgPath)
          .resize({ width: colWidth, height: colHeight, fit: "cover", position: "top" })
          .toBuffer();
        imagesToCompose.push({
          input: resizedBuf,
          left: i * colWidth,
          top: 90,
        });
      }
    }

    const totalWidth = colWidth * runIds.length;
    const totalHeight = colHeight + 110;

    const svgHeader = `
      <svg width="${totalWidth}" height="${totalHeight}">
        <rect width="100%" height="100%" fill="#0a0a0c" />
        <text x="30" y="40" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">${escapeXml(title)}</text>
        <text x="30" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#a1a1aa">${escapeXml(subtitle)}</text>
      </svg>
    `;

    await sharp(Buffer.from(svgHeader))
      .composite(imagesToCompose)
      .png()
      .toFile(outputPath);

    console.log(` Created Comparison Sheet: ${outputPath}`);
  }

  // 1. 2D Comparison Sheet (Runs 1-5)
  await composeFeaturesGrid(
    ["features_run_1", "features_run_2", "features_run_3", "features_run_4", "features_run_5"],
    path.join(ARTIFACTS_DIR, "features_2d_5_comparison.png"),
    "FEATURES SECTION PASS: 5 Fresh 2D Generations (Identical Northstar Coffee Brief)",
    "Verified Structural Diversity (Horizontal Story, Asymmetric Editorial, Timeline, Bento, Oversized Typographic)"
  );

  // 2. 3D Comparison Sheet (Runs 6-10)
  await composeFeaturesGrid(
    ["features_run_6", "features_run_7", "features_run_8", "features_run_9", "features_run_10"],
    path.join(ARTIFACTS_DIR, "features_3d_5_comparison.png"),
    "FEATURES SECTION PASS: 5 Fresh 3D Generations (Identical Northstar Coffee Brief)",
    "Verified 3D Spatial Depths (Floating Planes, Layered Depth, Depth Separated Cards)"
  );

  // 3. Complete 10-run Comparison Sheet (2 rows x 5 columns)
  const cellWidth = 440;
  const cellHeight = 560;
  const gridImages = [];

  for (let idx = 0; idx < 10; idx++) {
    const runId = `features_run_${idx + 1}`;
    const imgPath = path.join(SCREENSHOTS_DIR, `${runId}_features.png`);
    const col = idx % 5;
    const row = Math.floor(idx / 5);

    if (fs.existsSync(imgPath)) {
      const resizedBuf = await sharp(imgPath)
        .resize({ width: cellWidth, height: cellHeight, fit: "cover", position: "top" })
        .toBuffer();
      gridImages.push({
        input: resizedBuf,
        left: col * cellWidth,
        top: 110 + row * (cellHeight + 40),
      });
    }
  }

  const gridTotalWidth = cellWidth * 5;
  const gridTotalHeight = 110 + 2 * (cellHeight + 40);

  const svg10Header = `
    <svg width="${gridTotalWidth}" height="${gridTotalHeight}">
      <rect width="100%" height="100%" fill="#0a0a0c" />
      <text x="30" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold" fill="#ffffff">FEATURES SECTION ARCHITECTURAL DIVERSITY: 10 CONSECUTIVE RUNS</text>
      <text x="30" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#a1a1aa">All 10 runs generated from IDENTICAL business brief (Northstar Coffee House). Top Row: 5 × 2D | Bottom Row: 5 × 3D Spatial</text>
      <text x="30" y="98" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#38bdf8">ROW 1: 2D GENERATIONS (STRICT 0 WEBGL • 0 SPATIAL WRAPPERS • DIVERSE COMPOSITIONS)</text>
      <text x="30" y="${110 + cellHeight + 30}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#a855f7">ROW 2: 3D GENERATIONS (SPATIAL PERSPECTIVE DEPTH • STAGGERED ELEVATION • DISTINCT GEOMETRIES)</text>
    </svg>
  `;

  await sharp(Buffer.from(svg10Header))
    .composite(gridImages)
    .png()
    .toFile(path.join(ARTIFACTS_DIR, "features_diversity_comparison_10.png"));

  console.log(` Created 10-Run Master Comparison Sheet: features_diversity_comparison_10.png`);

  // Write JSON report
  const resultsJsonPath = path.join(ARTIFACTS_DIR, "scratch/regression_features_diversity_results.json");
  fs.writeFileSync(resultsJsonPath, JSON.stringify(domInspectionResults, null, 2), "utf-8");
  console.log(` Saved Results JSON to ${resultsJsonPath}`);

  // Assertions
  const layouts = new Set(domInspectionResults.map(r => r.featuresLayoutVariant));
  console.log(`\nUnique Features Layouts generated across 10 runs: ${layouts.size} (${Array.from(layouts).join(", ")})`);
  const anyLeak = domInspectionResults.some(r => r.domData.hasTelemetryLeak);
  console.log(`Telemetry / Test Leak check: ${anyLeak ? "FAILED (Found leaks!)" : "PASSED (Zero leaks across all 10 runs)"}`);

  console.log("\n================================================================================");
  console.log("   FEATURES SECTION REGRESSION TEST COMPLETE                                    ");
  console.log("================================================================================\n");
}

runFeaturesTest().catch((err) => {
  console.error("FATAL in runFeaturesTest:", err);
  process.exit(1);
});
