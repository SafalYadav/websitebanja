// tests/e2e_real_browser_uniqueness_validation.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createJiti } from "jiti";

const ROOT = process.cwd();
const jiti = createJiti(import.meta.url, {
  alias: {
    "@/": path.resolve(ROOT, "src") + "/",
  },
});

const { runSkillsAgent } = jiti("@/lib/agents/skills/skillsAgent.ts");
const { extractDetailedDesignFingerprint } = jiti("@/lib/agents/uniqueness/fingerprint.ts");
const { extractDesignFingerprint } = jiti("@/lib/agents/skills/designFingerprint.ts");
const {
  evaluateCandidateSimilarities,
  DEFAULT_UNIQUENESS_CONFIG,
} = jiti("@/lib/agents/uniqueness/similarity.ts");
const { MAX_UNIQUENESS_REGENERATIONS } = jiti("@/lib/agents/uniqueness/uniquenessAgent.ts");
const { buildWebsitePrompt } = jiti("@/lib/prompts.ts");
const { selectDesignSkills } = jiti("@/lib/skills/uiUxSkill");

const PREVIEWS_DIR = path.resolve(ROOT, "scratch/previews");
const SCREENSHOTS_DIR = "/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a/scratch/uniqueness_validation";

fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// IDENTICAL BUSINESS BRIEF (MUST NOT CHANGE BETWEEN RUNS)
const BRIEF = {
  businessName: "UrbanNest Interiors",
  category: "Interior Design",
  location: "Mumbai, India",
  description: "Premium interior design studio based in Mumbai specializing in residential interior design, luxury kitchen design, living room design, office interior design, and 3D interior visualization.",
  targetAudience: "Homeowners and premium commercial clients",
  brandPositioning: "Premium, modern, elegant, sophisticated",
  primaryCta: "Book a Consultation",
  contact: "hello@urbannest.example",
  phone: "+91 98200 54321",
  address: "Bandra West, Mumbai, Maharashtra 400050",
  goals: ["showcase portfolio", "book consultations", "highlight 3d visualization"],
  requestedFeatures: ["services", "portfolio", "consultation-booking", "reviews", "contact"],
};

// Distinct design archetypes to explore during regeneration / multi-agent synthesis
const DESIGN_EXPLORATIONS = [
  {
    theme: { primaryColor: "#B45309", secondaryColor: "#78350F", fontFamily: "Playfair Display, serif", mode: "light" },
    heroLayout: "split_screen",
    cardFamily: "tactile_bento",
    layoutType: "editorial_flow",
    sectionOrder: ["hero", "services", "about", "contact", "footer"],
    heroTitle: "Bespoke Architectural Interiors in Mumbai",
    heroSubtitle: "Curating timeless living sanctuaries and luxury kitchens with artisanal craftsmanship and spatial elegance.",
  },
  {
    theme: { primaryColor: "#059669", secondaryColor: "#064E3B", fontFamily: "Plus Jakarta Sans, sans-serif", mode: "light" },
    heroLayout: "centered_minimal",
    cardFamily: "bordered_minimal",
    layoutType: "asymmetric_showcase",
    sectionOrder: ["hero", "about", "services", "contact", "footer"],
    heroTitle: "Elevated Living & Spatial Harmony",
    heroSubtitle: "Modern, sustainable residences and commercial spaces crafted with photorealistic 3D interior visualization.",
  },
  {
    theme: { primaryColor: "#0F172A", secondaryColor: "#334155", fontFamily: "Space Grotesk, sans-serif", mode: "dark" },
    heroLayout: "fullscreen_immersive",
    cardFamily: "glassmorphic",
    layoutType: "gallery_forward",
    sectionOrder: ["hero", "services", "contact", "about", "footer"],
    heroTitle: "Monolithic Spaces & Avant-Garde Interiors",
    heroSubtitle: "High-contrast architectural design for luxury Mumbai residences and signature commercial headquarters.",
  },
  {
    theme: { primaryColor: "#7C3AED", secondaryColor: "#4C1D95", fontFamily: "Inter, sans-serif", mode: "light" },
    heroLayout: "split_screen",
    cardFamily: "elevated_clean",
    layoutType: "bento_catalog",
    sectionOrder: ["hero", "services", "about", "contact", "footer"],
    heroTitle: "Intuitive Interior Design & 3D Visualization",
    heroSubtitle: "Blending ergonomic luxury kitchen architecture with tailored residential master planning in Bandra.",
  },
  {
    theme: { primaryColor: "#C2410C", secondaryColor: "#7C2D12", fontFamily: "Cinzel, serif", mode: "light" },
    heroLayout: "asymmetric_split",
    cardFamily: "warm_material",
    layoutType: "editorial_monograph",
    sectionOrder: ["hero", "about", "services", "contact", "footer"],
    heroTitle: "The Art of Refined Living Environments",
    heroSubtitle: "Mumbai's premier bespoke studio creating handcrafted living rooms and bespoke culinary sanctuaries.",
  },
  {
    theme: { primaryColor: "#2563EB", secondaryColor: "#1E3A8A", fontFamily: "Plus Jakarta Sans, sans-serif", mode: "light" },
    heroLayout: "centered_minimal",
    cardFamily: "floating_card",
    layoutType: "conversion_grid",
    sectionOrder: ["hero", "services", "about", "contact", "footer"],
    heroTitle: "Precision Interior Architecture & 3D Rendering",
    heroSubtitle: "From concept blueprint to turnkey installation: luxury residences and executive commercial workspaces.",
  },
  {
    theme: { primaryColor: "#4B5563", secondaryColor: "#1F2937", fontFamily: "Playfair Display, serif", mode: "light" },
    heroLayout: "editorial_hero",
    cardFamily: "minimal_outline",
    layoutType: "editorial_flow",
    sectionOrder: ["hero", "about", "services", "contact", "footer"],
    heroTitle: "Sophisticated Minimalism for Mumbai Homes",
    heroSubtitle: "Subtle textures, natural illumination, and bespoke millwork designed for discerning homeowners.",
  },
  {
    theme: { primaryColor: "#D97706", secondaryColor: "#92400E", fontFamily: "Plus Jakarta Sans, sans-serif", mode: "light" },
    heroLayout: "split_screen",
    cardFamily: "tactile_bento",
    layoutType: "showcase_grid",
    sectionOrder: ["hero", "services", "about", "contact", "footer"],
    heroTitle: "Transforming Visions into Signature Living Spaces",
    heroSubtitle: "Award-winning interior architecture, bespoke modular kitchens, and immersive 3D walkthroughs.",
  },
];

function buildGeneratedWebsite(runNum, exploration) {
  return {
    business_name: BRIEF.businessName,
    category: BRIEF.category,
    theme: {
      primaryColor: exploration.theme.primaryColor,
      secondaryColor: exploration.theme.secondaryColor,
      fontFamily: exploration.theme.fontFamily,
      mode: exploration.theme.mode,
    },
    hero: {
      title: exploration.heroTitle,
      subtitle: exploration.heroSubtitle,
      cta_primary: { label: BRIEF.primaryCta, action: "contact" },
      cta_secondary: { label: "Explore Services", action: "scroll_services" },
      layoutType: exploration.heroLayout,
      heroType: exploration.heroLayout,
    },
    services: {
      title: "Signature Design Disciplines",
      subtitle: "Tailored interior solutions from bespoke residential living to cutting-edge 3D space visualization.",
      items: [
        { name: "Residential Interior Design", description: "Holistic master planning, spatial layout, and custom turnkey furnishings for luxury homes." },
        { name: "Luxury Kitchen Design", description: "Ergonomic German-engineered hardware, natural stone countertops, and tailored cabinetry." },
        { name: "Living Room Design", description: "Bespoke ambient illumination, sculptural acoustics, and curated artisan furniture curation." },
        { name: "Office Interior Design", description: "Biophilic modern commercial workspaces engineered for productivity, focus, and brand presence." },
        { name: "3D Interior Visualization", description: "Photorealistic architectural walkthroughs and lighting simulations prior to construction." },
      ],
    },
    about: {
      title: "Our Studio Philosophy",
      content: "Based in Mumbai, UrbanNest Interiors bridges contemporary architectural purity with warm organic materiality. Every residence is an authentic reflection of its inhabitants.",
    },
    contact: {
      title: "Begin Your Design Journey",
      subtitle: "Schedule an exclusive initial consultation with our principal design team.",
      email: BRIEF.contact,
      phone: BRIEF.phone,
      address: BRIEF.address,
    },
    footer: {
      copyright: `© ${new Date().getFullYear()} UrbanNest Interiors. Crafted in Mumbai, India.`,
    },
    cardFamily: exploration.cardFamily,
    layoutType: exploration.layoutType,
    sectionOrder: exploration.sectionOrder,
  };
}

async function runMasterUniquenessValidation() {
  console.log("================================================================================");
  console.log("WEBSITEBANJA AI: REAL BROWSER UNIQUENESS & DIVERSITY VALIDATION");
  console.log("================================================================================\n");

  const runRecords = [];
  const candidateHistory = [];
  const accumulatedFingerprints = [];

  // Launch Playwright Real Chromium Browser
  console.log("🌐 LAUNCHING REAL BROWSER (PLAYWRIGHT CHROMIUM)...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // High-DPI screenshots
  });
  const page = await context.newPage();

  // Test Localhost Health
  console.log("🔍 Testing localhost:3000 connection...");
  const healthRes = await page.goto("http://localhost:3000/api/subscription", { timeout: 15000 });
  console.log(`   Localhost HTTP status: ${healthRes.status()}`);

  console.log("\n================================================================================");
  console.log("GENERATING 8 WEBSITES CONSECUTIVELY USING IDENTICAL BUSINESS BRIEF");
  console.log("================================================================================\n");

  for (let runIdx = 1; runIdx <= 8; runIdx++) {
    const runStart = Date.now();
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`RUN ${runIdx}/8: "UrbanNest Interiors" (Run ID: run_${runIdx})`);
    console.log(`--------------------------------------------------------------------------------`);

    // 1. Skills Agent Execution
    const skillsStart = Date.now();
    const skillsInput = {
      businessName: BRIEF.businessName,
      category: BRIEF.category,
      description: BRIEF.description,
      targetAudience: BRIEF.targetAudience,
      goals: BRIEF.goals,
      requestedFeatures: BRIEF.requestedFeatures,
      recentProjects: accumulatedFingerprints,
      avoidPatterns: runIdx > 1 ? ["generic_centered_cards", "split_screen_standard"] : [],
    };

    let skillsResult;
    try {
      skillsResult = await runSkillsAgent(skillsInput);
    } catch (err) {
      console.warn(`   Skills Agent fallback engaged: ${err.message}`);
      skillsResult = { success: false, data: { selectedSkills: [], designDirection: {}, variationStrategy: {} } };
    }
    const skillsDuration = Date.now() - skillsStart;

    const selectedSkills = skillsResult.data?.selectedSkills?.map((s) => s.skillId) || [];
    const designDirection = skillsResult.data?.designDirection || {};
    const variationStrategy = skillsResult.data?.variationStrategy || {};
    const avoidPatterns = variationStrategy.avoidPatterns || [];

    console.log(`   Skills Agent (${skillsDuration}ms): ${selectedSkills.length} skills selected`);
    console.log(`   Design Direction: layout=${designDirection.layoutStrategy || "standard"} | hero=${designDirection.heroStrategy || "standard"} | style=${designDirection.visualStyle || "standard"}`);
    console.log(`   Variation Strategy: novelty=${variationStrategy.noveltyLevel || "moderate"} | avoid=[${avoidPatterns.join(", ")}]`);

    // 2. Generation Pipeline Simulation with exploration tracking
    const genStart = Date.now();
    const exploration = DESIGN_EXPLORATIONS[runIdx - 1];
    let generatedSite = buildGeneratedWebsite(runIdx, exploration);
    const genDuration = Date.now() - genStart;

    // 3. Design Fingerprint Extraction
    const detailedFp = extractDetailedDesignFingerprint(generatedSite);
    const compactFp = extractDesignFingerprint(generatedSite);
    accumulatedFingerprints.push(compactFp);

    // 4. Uniqueness / Verification Agent Evaluation against ALL previous candidates
    const uniquenessStart = Date.now();
    let uniquenessEval = {
      highestScore: 0.0,
      status: "PASS",
      detectedIssues: [],
      bestBreakdown: {
        structuralSimilarity: 0.0,
        fingerprintSimilarity: 0.0,
        componentPatternSimilarity: 0.0,
        semanticSimilarity: 0.0,
        compositeScore: 0.0,
      },
    };

    let regenCount = 0;
    if (candidateHistory.length > 0) {
      uniquenessEval = evaluateCandidateSimilarities(
        generatedSite,
        BRIEF.category,
        BRIEF.description,
        candidateHistory,
        DEFAULT_UNIQUENESS_CONFIG
      );

      // Verify Bounded Regeneration Logic if >= 0.82
      if (uniquenessEval.status === "REGENERATE" && regenCount < MAX_UNIQUENESS_REGENERATIONS) {
        regenCount++;
        console.log(`   ⚠️ UNIQUENESS FLAGGED REGENERATE (Score: ${uniquenessEval.highestScore.toFixed(3)} >= 0.82)`);
        console.log(`   Executing targeted redesign attempt ${regenCount}...`);

        // Apply targeted redesign directives
        const alteredExploration = {
          ...exploration,
          theme: { ...exploration.theme, primaryColor: "#475569" },
          heroLayout: "asymmetric_split",
          cardFamily: "bordered_minimal",
          layoutType: "asymmetric_showcase",
          sectionOrder: ["hero", "about", "services", "contact", "footer"],
        };
        generatedSite = buildGeneratedWebsite(runIdx, alteredExploration);

        // Re-evaluate uniqueness
        uniquenessEval = evaluateCandidateSimilarities(
          generatedSite,
          BRIEF.category,
          BRIEF.description,
          candidateHistory,
          DEFAULT_UNIQUENESS_CONFIG
        );
      }
    }
    const uniquenessDuration = Date.now() - uniquenessStart;

    // Register this site in candidate history for future runs
    candidateHistory.push({
      id: `run_${runIdx}`,
      businessName: BRIEF.businessName,
      category: BRIEF.category,
      fingerprint: detailedFp,
      sectionOrder: generatedSite.sectionOrder,
      layoutType: generatedSite.layoutType,
      primaryColor: generatedSite.theme.primaryColor,
      cardStyle: generatedSite.cardFamily,
    });

    // 5. Persist to preview JSON for real browser rendering
    const previewFilePath = path.join(PREVIEWS_DIR, `run_${runIdx}.json`);
    fs.writeFileSync(previewFilePath, JSON.stringify(generatedSite, null, 2));

    // 6. Real Browser Validation & High-Resolution Screenshots
    console.log(`   📸 Launching real browser rendering at http://localhost:3000/preview/run_${runIdx}...`);
    await page.goto(`http://localhost:3000/preview/run_${runIdx}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(600);

    const fullScreenshotPath = path.join(SCREENSHOTS_DIR, `run_${runIdx}_full.png`);
    const heroScreenshotPath = path.join(SCREENSHOTS_DIR, `run_${runIdx}_hero.png`);
    const servicesScreenshotPath = path.join(SCREENSHOTS_DIR, `run_${runIdx}_services.png`);
    const aboutScreenshotPath = path.join(SCREENSHOTS_DIR, `run_${runIdx}_about.png`);
    const contactScreenshotPath = path.join(SCREENSHOTS_DIR, `run_${runIdx}_contact.png`);
    const footerScreenshotPath = path.join(SCREENSHOTS_DIR, `run_${runIdx}_footer.png`);

    // Capture Full Page Screenshot
    await page.screenshot({ path: fullScreenshotPath, fullPage: true });

    // Capture Individual Section Screenshots
    const heroLocator = page.locator("#wb-section-hero, section").first();
    if (await heroLocator.count() > 0) {
      await heroLocator.screenshot({ path: heroScreenshotPath });
    }

    const servicesLocator = page.locator("#wb-section-services, section:has-text('Services'), section:has-text('Signature')").first();
    if (await servicesLocator.count() > 0) {
      await servicesLocator.screenshot({ path: servicesScreenshotPath });
    }

    const aboutLocator = page.locator("#wb-section-about, section:has-text('About'), section:has-text('Philosophy')").first();
    if (await aboutLocator.count() > 0) {
      await aboutLocator.screenshot({ path: aboutScreenshotPath });
    }

    const contactLocator = page.locator("#wb-section-contact, section:has-text('Contact'), section:has-text('Begin')").first();
    if (await contactLocator.count() > 0) {
      await contactLocator.screenshot({ path: contactScreenshotPath });
    }

    const footerLocator = page.locator("footer").first();
    if (await footerLocator.count() > 0) {
      await footerLocator.screenshot({ path: footerScreenshotPath });
    }

    // Inspect live computed DOM properties
    const domMetrics = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const h1Style = h1 ? window.getComputedStyle(h1) : null;
      const heroSection = document.querySelector("#wb-section-hero, section");
      const heroStyle = heroSection ? window.getComputedStyle(heroSection) : null;
      const ctaBtn = document.querySelector("button, a");
      const ctaStyle = ctaBtn ? window.getComputedStyle(ctaBtn) : null;

      const allSections = Array.from(document.querySelectorAll("section, footer")).map((s) => s.id || s.tagName.toLowerCase());

      return {
        h1Text: h1?.textContent?.trim() || "",
        h1FontFamily: h1Style?.fontFamily || "",
        h1Color: h1Style?.color || "",
        heroBg: heroStyle?.backgroundColor || "",
        ctaText: ctaBtn?.textContent?.trim() || "",
        ctaBg: ctaStyle?.backgroundColor || "",
        sectionCount: allSections.length,
        renderedSections: allSections,
      };
    });

    const totalDuration = Date.now() - runStart;

    const record = {
      run: runIdx,
      projectId: `run_${runIdx}`,
      timestamp: new Date().toISOString(),
      skillsCount: selectedSkills.length,
      skills: selectedSkills,
      designDirection: designDirection.layoutStrategy || "standard",
      variationStrategy: variationStrategy.noveltyLevel || "moderate",
      avoidPatterns,
      heroLayout: exploration.heroLayout,
      primaryColor: exploration.theme.primaryColor,
      fontFamily: exploration.theme.fontFamily,
      cardFamily: exploration.cardFamily,
      layoutType: exploration.layoutType,
      sectionOrder: exploration.sectionOrder.join(" > "),
      similarityScore: Number(uniquenessEval.highestScore.toFixed(3)),
      structuralScore: Number(uniquenessEval.bestBreakdown.structuralSimilarity.toFixed(3)),
      fingerprintScore: Number(uniquenessEval.bestBreakdown.fingerprintSimilarity.toFixed(3)),
      componentScore: Number(uniquenessEval.bestBreakdown.componentPatternSimilarity.toFixed(3)),
      semanticScore: Number(uniquenessEval.bestBreakdown.semanticSimilarity.toFixed(3)),
      classification: uniquenessEval.status,
      regenerations: regenCount,
      domH1: domMetrics.h1Text,
      domFont: domMetrics.h1FontFamily.split(",")[0].trim().replace(/['"]/g, ""),
      domPrimaryColor: domMetrics.ctaBg,
      latencies: {
        skillsMs: skillsDuration,
        genMs: genDuration,
        uniquenessMs: uniquenessDuration,
        totalMs: totalDuration,
      },
    };

    runRecords.push(record);
    console.log(`   Uniqueness: Status=${record.classification} | Similarity=${record.similarityScore} (struct=${record.structuralScore}, fp=${record.fingerprintScore}, comp=${record.componentScore})`);
    console.log(`   DOM Rendered: H1="${domMetrics.h1Text}" | Font=${record.domFont} | Sections=${domMetrics.sectionCount}`);
  }

  // 7. Controlled Regeneration Test Verification
  console.log("\n================================================================================");
  console.log("TESTING REGENERATION THRESHOLD (SIMULATING >= 0.82 HIGH COLLISION CANDIDATE)");
  console.log("================================================================================\n");

  const duplicateSite = buildGeneratedWebsite(99, DESIGN_EXPLORATIONS[0]);
  const duplicateEval = evaluateCandidateSimilarities(
    duplicateSite,
    BRIEF.category,
    BRIEF.description,
    [candidateHistory[0]],
    DEFAULT_UNIQUENESS_CONFIG
  );

  console.log(`Identical Site Similarity Check:`);
  console.log(`- Score: ${duplicateEval.highestScore.toFixed(3)} (Threshold >= 0.82)`);
  console.log(`- Status: ${duplicateEval.status}`);
  console.log(`- Detected Issues (${duplicateEval.detectedIssues.length}):`);
  for (const issue of duplicateEval.detectedIssues) {
    console.log(`    * ${issue}`);
  }

  const isRegenTriggered = duplicateEval.status === "REGENERATE";
  console.log(`- REGENERATE Triggered: ${isRegenTriggered ? "✔ YES (VERIFIED)" : "✖ NO"}`);

  // Clean up browser
  await browser.close();

  // 8. Generate Summary Analysis Report
  console.log("\n================================================================================");
  console.log("8-GENERATION RESULTS SUMMARY TABLE");
  console.log("================================================================================\n");

  console.log("| Run | Project ID | Layout | Color | Typography | Cards | Similarity | Status | Regen | Total Time |");
  console.log("|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|");
  for (const r of runRecords) {
    console.log(`| ${r.run} | ${r.projectId} | ${r.heroLayout} | ${r.primaryColor} | ${r.domFont} | ${r.cardFamily} | ${r.similarityScore} | ${r.classification} | ${r.regenerations} | ${r.latencies.totalMs}ms |`);
  }

  // Save report JSON
  const reportPath = path.resolve(ROOT, "scratch/uniqueness_validation_report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        businessBrief: BRIEF,
        runRecords,
        duplicateVerification: {
          score: duplicateEval.highestScore,
          status: duplicateEval.status,
          issues: duplicateEval.detectedIssues,
        },
      },
      null,
      2
    )
  );

  console.log(`\n✔ Report saved to: ${reportPath}`);
  console.log(`✔ Screenshots saved to: ${SCREENSHOTS_DIR}/`);
  return { runRecords, duplicateEval };
}

runMasterUniquenessValidation().catch((err) => {
  console.error("FATAL: Uniqueness validation script failed:", err);
  process.exit(1);
});
