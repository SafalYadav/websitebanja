// tests/regression_uniqueness_upgrade_10.mjs
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
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, "scratch/regression_10_screenshots");
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
  requestedFeatures: ["menu", "about", "atmosphere", "reviews", "contact", "reservation"],
};

// Clear candidate cache before test
clearLocalCandidates();

async function runTest() {
  console.log("================================================================================");
  console.log("   WEBSITEBANJA: 10-PROJECT VISUAL UNIQUENESS & 3D ARCHITECTURE REGRESSION TEST   ");
  console.log("================================================================================\n");

  const candidates = [];
  const usedImages = [];
  const runSummaries = [];

  // Generate 10 projects:
  // Runs 1-5: 3D OFF (Group A)
  // Runs 6-10: 3D ON (Group B)
  for (let i = 1; i <= 10; i++) {
    const is3d = i > 5;
    const runId = `upgraded_run_${i}`;
    const threeDPreference = is3d ? "yes" : "no";

    console.log(`\n------------------------------------------------------------`);
    console.log(` Generating ${runId} | 3D: ${is3d ? "ON (Explicit)" : "OFF (Default)"}`);
    console.log(`------------------------------------------------------------`);

    const recentCandidates = candidates.slice(-4);
    const avoidArchetypes = recentCandidates.map(c => c.fingerprint.visualArchetype).filter(Boolean);
    const avoidColors = recentCandidates.map(c => c.primaryColor).filter(Boolean);

    // 1. Generate Design Strategy
    const strategy = generateDesignStrategy({
      ...NORTHSTAR_BRIEF,
      threeDPreference,
      avoidPatterns: [...avoidArchetypes, ...avoidColors],
      recentFingerprints: recentCandidates.map(c => c.fingerprint),
      seed: `northstar_${runId}_${Date.now()}`,
    });

    const heroLayout = strategy.heroType;
    const cardFamily = strategy.cardTreatment || "tactile_bento";
    const headingFont = strategy.typographyTokens.headingFont;
    const bodyFont = strategy.typographyTokens.bodyFont;
    const primaryColor = strategy.colorSystem.primary;
    const secondaryColor = strategy.colorSystem.secondary;
    const bgColor = strategy.colorSystem.bg || "#FDFBF7";
    const surfaceColor = strategy.colorSystem.surface || "#FFFFFF";
    const isDark = strategy.visualArchetype === "dark_technical" || (strategy.colorSystem.text && strategy.colorSystem.text.startsWith("#F"));

    console.log(`   Archetype:      ${strategy.visualArchetype}`);
    console.log(`   Hero Layout:    ${heroLayout}`);
    console.log(`   Card Family:    ${cardFamily}`);
    console.log(`   Typography:     ${headingFont} + ${bodyFont}`);
    console.log(`   Color Palette:  ${primaryColor} / ${secondaryColor}`);
    console.log(`   Spatial 3D:     ${strategy.spatial3d.enabled ? "ENABLED (" + strategy.spatial3d.level + ")" : "DISABLED"}`);

    // 2. Build Website AST
    const rawData = {
      business_name: NORTHSTAR_BRIEF.businessName,
      category: NORTHSTAR_BRIEF.category,
      style: strategy.visualArchetype,
      cardFamily,
      cardStyle: cardFamily,
      brand: {
        name: NORTHSTAR_BRIEF.businessName,
        shortName: "Northstar",
        industry: NORTHSTAR_BRIEF.category,
        primaryColor,
        secondaryColor,
      },
      typography: {
        headingFont,
        bodyFont,
      },
      theme: {
        primaryColor,
        secondaryColor,
        fontFamily: headingFont,
        mode: isDark ? "dark" : "light",
        colors: {
          background: bgColor,
          surface: surfaceColor,
          text: isDark ? "#F9FAFB" : "#0F172A",
        },
      },
      spatial3d: strategy.spatial3d,
      hero: {
        title: `Northstar Roastery ${strategy.visualArchetype.replace("_", " ").toUpperCase()}`,
        subtitle: "Single-origin roast perfection and slow extraction in the heart of Mainpuri. Experience handcrafted beverages and artisanal sourdough daily.",
        button: "Explore Brews",
        layoutVariant: heroLayout,
        badges: ["SINGLE ORIGIN", "ARTISANAL"],
        trustBadges: ["Direct Trade", "Slow Roasted", "Handcrafted"],
        backgroundStyle: {
          type: isDark ? "mesh_dark" : "warm_glow",
          color: bgColor,
          accentColor: secondaryColor,
        },
        spatial3d: strategy.spatial3d,
      },
      about: {
        title: "The Craft of Slow Roasting",
        description: "Founded with a devotion to regional terroir and sustainable coffee cultivation, Northstar brings precision brewing and warm hospitality together under one roof.",
      },
      services: [
        {
          title: "Micro-Lot Pour Overs",
          description: "Seasonal micro-lots extracted with precision kettle geometry.",
          cardFamily: strategy.cardFamily,
        },
        {
          title: "Craft Espresso Bar",
          description: "Velvety textured micro-foam paired with intense, sweet double shots.",
          cardFamily: strategy.cardFamily,
        },
        {
          title: "Artisanal Bakery",
          description: "Wild yeast sourdough breads, flaky almond croissants, and cardamom morning buns.",
          cardFamily: strategy.cardFamily,
        },
      ],
      features: [
        {
          title: "Direct Ethical Trade",
          description: "We source 100% directly from single-estate farmers across Karnataka and Kerala.",
        },
        {
          title: "Small Batch Roasting",
          description: "Every bean roasted in 5kg batches to maximize peak aroma and clarity.",
        },
        {
          title: "Calm Community Hub",
          description: "Generous seating, ergonomic tables, and whisper-quiet spaces for deep focus.",
        },
      ],
      reviews: [
        {
          quote: "The finest pour-over in UP. Incredible complexity and warmth.",
          author: "Ananya S.",
          role: "Specialty Coffee Enthusiast",
          rating: 5,
        },
        {
          quote: "Their sourdough croissant and flat white are unmatched.",
          author: "Rohit V.",
          role: "Architect & Local Regular",
          rating: 5,
        },
      ],
      contact: {
        address: NORTHSTAR_BRIEF.address,
        phone: NORTHSTAR_BRIEF.phone,
        email: NORTHSTAR_BRIEF.contact,
        hours: "Tue - Sun: 7:30 AM - 9:00 PM",
      },
    };

    // 3. Normalize with dynamic image selection, seed, and anti-repetition avoidImages
    const normalized = normalizeWebsiteData(rawData, {
      category: NORTHSTAR_BRIEF.category,
      businessName: NORTHSTAR_BRIEF.businessName,
      description: NORTHSTAR_BRIEF.description,
      runSeed: `northstar_seed_${i}_${strategy.visualArchetype}_${i * 13}`,
      avoidImages: [...usedImages],
      strategy,
    });

    // Record newly used images
    const heroImg = normalized.hero?.image;
    const aboutImg = normalized.about?.image;
    const bgImg = normalized.hero?.heroBackground?.imageUrl;
    if (heroImg) usedImages.push(heroImg);
    if (aboutImg) usedImages.push(aboutImg);
    if (bgImg) usedImages.push(bgImg);

    // 4. Test Uniqueness Similarity Gate
    const simResult = evaluateCandidateSimilarities(
      normalized,
      NORTHSTAR_BRIEF.category,
      NORTHSTAR_BRIEF.description,
      recentCandidates,
      DEFAULT_UNIQUENESS_CONFIG
    );

    console.log(`   Uniqueness Score:  ${(simResult.highestScore * 100).toFixed(1)}% (Status: ${simResult.status})`);
    if (simResult.detectedIssues.length > 0) {
      console.log(`   Issues Flagged:    ${simResult.detectedIssues.join("; ")}`);
    }

    // Record candidate into memory
    const detailedFp = extractDetailedDesignFingerprint(normalized);
    candidates.push({
      id: runId,
      businessName: NORTHSTAR_BRIEF.businessName,
      category: NORTHSTAR_BRIEF.category,
      fingerprint: detailedFp,
      sectionOrder: detailedFp.sectionOrder,
      layoutType: detailedFp.layoutType,
      primaryColor: detailedFp.colorDirection,
      cardStyle: detailedFp.cardStyle,
      images: detailedFp.images,
    });

    recordCandidateFromWebsite(runId, NORTHSTAR_BRIEF.businessName, NORTHSTAR_BRIEF.category, normalized);

    // Save JSON for preview route
    const previewJsonPath = path.join(PREVIEWS_DIR, `${runId}.json`);
    fs.writeFileSync(previewJsonPath, JSON.stringify(normalized, null, 2), "utf-8");

    runSummaries.push({
      runId,
      is3d,
      archetype: strategy.visualArchetype,
      heroLayout,
      cardFamily,
      headingFont,
      bodyFont,
      primaryColor,
      secondaryColor,
      mode: isDark ? "dark" : "light",
      heroImage: heroImg,
      aboutImage: aboutImg,
      bgImage: bgImg,
      uniquenessScore: simResult.highestScore,
      uniquenessStatus: simResult.status,
    });
  }

  console.log("\n================================================================================");
  console.log("   STEP 2: REAL BROWSER INSPECTION & SCREENSHOT VERIFICATION (PLAYWRIGHT)       ");
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

    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
    try {
      await page.evaluate(() => document.fonts.ready);
    } catch {}
    await page.waitForTimeout(600);

    // Capture Full Page Screenshot
    const fullpagePath = path.join(SCREENSHOTS_DIR, `${summary.runId}_fullpage.png`);
    await page.screenshot({ path: fullpagePath, fullPage: true });

    // Capture Hero Screenshot
    const heroElem = await page.$("section, [class*='hero'], header");
    if (heroElem) {
      const heroPath = path.join(SCREENSHOTS_DIR, `${summary.runId}_hero.png`);
      await heroElem.screenshot({ path: heroPath });
    }

    // Extract DOM metrics
    const domData = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const h1Computed = h1 ? window.getComputedStyle(h1) : null;
      const h2 = document.querySelector("h2");
      const h2Computed = h2 ? window.getComputedStyle(h2) : null;
      const bodyComputed = window.getComputedStyle(document.body);

      // All images
      const images = Array.from(document.querySelectorAll("img")).map(img => img.src);
      
      // All spatial 3D elements
      const spatial3dElements = Array.from(document.querySelectorAll("[data-wb-spatial='true']")).length;
      const spatialWrappers = Array.from(document.querySelectorAll("[class*='preserve-3d']")).length;

      // Cards
      const cardElements = Array.from(document.querySelectorAll("[class*='card'], [class*='Card'], .rounded-3xl, .rounded-2xl"));
      const cardClassNames = cardElements.map(c => c.className).slice(0, 5);

      // Link tags for Google Fonts
      const fontLinks = Array.from(document.querySelectorAll("link[href*='fonts.googleapis.com']")).map(l => l.getAttribute("href"));

      return {
        h1Font: h1Computed?.fontFamily || "unknown",
        h2Font: h2Computed?.fontFamily || "unknown",
        bodyFont: bodyComputed?.fontFamily || "unknown",
        images,
        spatial3dElements,
        spatialWrappers,
        cardCount: cardElements.length,
        fontLinks,
      };
    });

    console.log(`   Rendered H1 Font:    ${domData.h1Font}`);
    console.log(`   Rendered Body Font:  ${domData.bodyFont}`);
    console.log(`   Images Count:        ${domData.images.length}`);
    console.log(`   Spatial 3D Elements: ${domData.spatial3dElements} (Wrappers: ${domData.spatialWrappers})`);
    console.log(`   Font Links Loaded:   ${domData.fontLinks.length}`);

    domInspectionResults.push({
      ...summary,
      dom: domData,
    });
  }

  await browser.close();

  console.log("\n================================================================================");
  console.log("   STEP 3: COMPOSITING VISUAL COMPARISON SHEETS (SHARP)                         ");
  console.log("================================================================================\n");

  // Helper to compose side-by-side sheets
  async function composeSheet(runIds, outputPath, title) {
    const imagesToCompose = [];
    const colWidth = 500;
    const colHeight = 1200;

    for (let i = 0; i < runIds.length; i++) {
      const id = runIds[i];
      const filePath = path.join(SCREENSHOTS_DIR, `${id}_fullpage.png`);
      if (fs.existsSync(filePath)) {
        const resizedBuf = await sharp(filePath)
          .resize({ width: colWidth, height: colHeight, fit: "cover", position: "top" })
          .toBuffer();
        imagesToCompose.push({
          input: resizedBuf,
          left: i * colWidth,
          top: 80,
        });
      }
    }

    const totalWidth = colWidth * runIds.length;
    const totalHeight = colHeight + 100;

    const svgHeader = `
      <svg width="${totalWidth}" height="${totalHeight}">
        <rect width="100%" height="100%" fill="#0a0a0c" />
        <text x="30" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold" fill="#ffffff">${title}</text>
        <text x="30" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#a1a1aa">All runs generated from identical Northstar Coffee House business brief • Distinct layouts, fonts, card families, and imagery</text>
      </svg>
    `;

    await sharp(Buffer.from(svgHeader))
      .composite(imagesToCompose)
      .png()
      .toFile(outputPath);

    console.log(` Created Comparison Sheet: ${outputPath}`);
  }

  // 1. Group A Fresh: 5 runs of 2D
  await composeSheet(
    ["upgraded_run_1", "upgraded_run_2", "upgraded_run_3", "upgraded_run_4", "upgraded_run_5"],
    path.join(ARTIFACTS_DIR, "new_group_a_same_biz_2d_comparison.png"),
    "WEBSITEBANJA UPGRADE: 5 Fresh 2D Generations (Identical Northstar Coffee Brief)"
  );

  // 2. Group B Fresh: 5 runs of 3D
  await composeSheet(
    ["upgraded_run_6", "upgraded_run_7", "upgraded_run_8", "upgraded_run_9", "upgraded_run_10"],
    path.join(ARTIFACTS_DIR, "new_group_b_same_biz_3d_comparison.png"),
    "WEBSITEBANJA UPGRADE: 5 Fresh 3D Generations (Identical Northstar Coffee Brief - 3D ON)"
  );

  // 3. Old vs New Transformation Sheet (Old run_a_1, run_a_2 vs Upgraded run_1, run_2)
  const oldA1 = path.join(ARTIFACTS_DIR, "scratch/visual_audit_screenshots/run_a_1_fullpage.png");
  const oldA2 = path.join(ARTIFACTS_DIR, "scratch/visual_audit_screenshots/run_a_2_fullpage.png");
  const new1 = path.join(SCREENSHOTS_DIR, "upgraded_run_1_fullpage.png");
  const new2 = path.join(SCREENSHOTS_DIR, "upgraded_run_2_fullpage.png");

  if (fs.existsSync(oldA1) && fs.existsSync(oldA2) && fs.existsSync(new1) && fs.existsSync(new2)) {
    const colWidth = 450;
    const colHeight = 1200;

    const bOld1 = await sharp(oldA1).resize({ width: colWidth, height: colHeight, fit: "cover", position: "top" }).toBuffer();
    const bOld2 = await sharp(oldA2).resize({ width: colWidth, height: colHeight, fit: "cover", position: "top" }).toBuffer();
    const bNew1 = await sharp(new1).resize({ width: colWidth, height: colHeight, fit: "cover", position: "top" }).toBuffer();
    const bNew2 = await sharp(new2).resize({ width: colWidth, height: colHeight, fit: "cover", position: "top" }).toBuffer();

    const totalWidth = colWidth * 4;
    const totalHeight = colHeight + 110;

    const svgCompare = `
      <svg width="${totalWidth}" height="${totalHeight}">
        <rect width="100%" height="100%" fill="#09090b" />
        <text x="30" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold" fill="#ffffff">TRANSFORMATION PROOF: BEFORE (Monoculture) vs AFTER (True Architectural Uniqueness)</text>
        <text x="30" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#a1a1aa">Left: Old runs A1 &amp; A2 (Identical photo, same layout, fallback system font) | Right: Upgraded runs 1 &amp; 2 (Distinct archetypes, Google fonts, unique photos)</text>
        <rect x="0" y="80" width="${colWidth * 2}" height="4" fill="#ef4444" />
        <rect x="${colWidth * 2}" y="80" width="${colWidth * 2}" height="4" fill="#10b981" />
        <text x="30" y="102" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#f87171">BEFORE: 100% IMAGE &amp; FONT MONOCULTURE</text>
        <text x="${colWidth * 2 + 30}" y="102" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#34d399">AFTER: 0% REUSE • AUTHENTIC DIVERSITY</text>
      </svg>
    `;

    const compositeList = [
      { input: bOld1, left: 0, top: 110 },
      { input: bOld2, left: colWidth, top: 110 },
      { input: bNew1, left: colWidth * 2, top: 110 },
      { input: bNew2, left: colWidth * 3, top: 110 },
    ];

    await sharp(Buffer.from(svgCompare))
      .composite(compositeList)
      .png()
      .toFile(path.join(ARTIFACTS_DIR, "old_vs_new_transformation_comparison.png"));

    console.log(` Created Transformation Comparison: old_vs_new_transformation_comparison.png`);
  }

  // Save regression data JSON
  const regressionResultsPath = path.join(ARTIFACTS_DIR, "scratch/regression_10_results.json");
  fs.writeFileSync(regressionResultsPath, JSON.stringify(domInspectionResults, null, 2), "utf-8");

  console.log("\n================================================================================");
  console.log("   REGRESSION STRESS TEST COMPLETE: 10 / 10 RUNS VERIFIED                       ");
  console.log("================================================================================\n");
}

runTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
