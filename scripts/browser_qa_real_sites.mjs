import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, ".tempmediaStorage");
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const SITES = [
  { id: "restaurant", name: "Botanica Hearth & Roastery", category: "Restaurant & Cafe" },
  { id: "dental", name: "Lumina Smiles & Implant Center", category: "Dental Clinic" },
  { id: "saas", name: "VectorPulse AI", category: "SaaS & Technology" },
  { id: "architecture", name: "Komorebi Spatial Atelier", category: "Architecture Studio" },
  { id: "fashion", name: "Aethelgard High Atelier", category: "Luxury Fashion" },
  { id: "service", name: "VoltCraft Emergency Electricians", category: "Local Service Business" },
  { id: "ecommerce", name: "Ceramica Terra Artisans", category: "E-commerce Store" },
  { id: "agency", name: "Monolith Brand Direction", category: "Creative Agency" },
];

async function runBrowserQa() {
  console.log("================================================================================");
  console.log("🎭 WEBSITEBANJA AI: PLAYWRIGHT BROWSER VISUAL AUDIT (8 REAL SITES)");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const site of SITES) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`🔍 Auditing [${site.category}] ${site.name} (/preview/${site.id})`);
    console.log(`--------------------------------------------------------------------------------`);

    const consoleErrors = [];

    // --- 1. DESKTOP VIEWPORT (1440x900) ---
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const desktopPage = await desktopContext.newPage();

    desktopPage.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(`[Desktop Console] ${msg.text()}`);
      }
    });
    desktopPage.on("pageerror", (err) => {
      consoleErrors.push(`[Desktop PageError] ${err.message}`);
    });

    const targetUrl = `http://localhost:3000/preview/${site.id}`;
    await desktopPage.goto(targetUrl, { waitUntil: "networkidle", timeout: 25000 });
    await desktopPage.waitForTimeout(1000);

    // Verify sections rendered
    const sectionsInfo = await desktopPage.evaluate(() => {
      const sections = Array.from(document.querySelectorAll("section"));
      return {
        count: sections.length,
        ids: sections.map(s => s.id || s.getAttribute("data-section") || "unnamed"),
      };
    });

    // Check broken images
    const brokenImages = await desktopPage.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      return imgs
        .filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.src || img.getAttribute("src"));
    });

    // Check desktop horizontal overflow
    const desktopOverflow = await desktopPage.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth > window.innerWidth;
    });

    // Capture desktop hero
    const desktopHeroShotPath = path.join(SCREENSHOT_DIR, `qa_${site.id}_desktop_hero.png`);
    await desktopPage.screenshot({ path: desktopHeroShotPath, fullPage: false });
    console.log(`  ✓ Desktop Hero Captured: ${desktopHeroShotPath}`);

    // Scroll down 800px to capture first major sections
    await desktopPage.evaluate(() => window.scrollBy(0, 800));
    await desktopPage.waitForTimeout(600);
    const desktopFirstSectionsPath = path.join(SCREENSHOT_DIR, `qa_${site.id}_desktop_first_sections.png`);
    await desktopPage.screenshot({ path: desktopFirstSectionsPath, fullPage: false });
    console.log(`  ✓ Desktop First Sections Captured: ${desktopFirstSectionsPath}`);

    // Smooth scroll through entire page to trigger lazy loading / animations
    await desktopPage.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 400;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
      });
    });
    await desktopPage.waitForTimeout(600);

    // Scroll back to top before full page capture
    await desktopPage.evaluate(() => window.scrollTo(0, 0));
    await desktopPage.waitForTimeout(400);

    // Capture desktop full page
    const desktopFullShotPath = path.join(SCREENSHOT_DIR, `qa_${site.id}_desktop_full.png`);
    await desktopPage.screenshot({ path: desktopFullShotPath, fullPage: true });
    console.log(`  ✓ Desktop Full Page Captured: ${desktopFullShotPath}`);

    // Check spatial 3D wrapper presence
    const has3dWrapper = await desktopPage.evaluate(() => {
      const wrapper = document.querySelector(".preserve-3d, [style*='perspective']");
      return !!wrapper;
    });

    await desktopContext.close();

    // --- 2. MOBILE VIEWPORT (390x844 - iPhone 14) ---
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const mobilePage = await mobileContext.newPage();

    mobilePage.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(`[Mobile Console] ${msg.text()}`);
      }
    });
    mobilePage.on("pageerror", (err) => {
      consoleErrors.push(`[Mobile PageError] ${err.message}`);
    });

    await mobilePage.goto(targetUrl, { waitUntil: "networkidle", timeout: 25000 });
    await mobilePage.waitForTimeout(800);

    // Check mobile horizontal overflow
    const mobileOverflow = await mobilePage.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth > window.innerWidth;
    });

    // Capture mobile hero
    const mobileHeroShotPath = path.join(SCREENSHOT_DIR, `qa_${site.id}_mobile_hero.png`);
    await mobilePage.screenshot({ path: mobileHeroShotPath, fullPage: false });
    console.log(`  ✓ Mobile Hero Captured: ${mobileHeroShotPath}`);

    // Scroll through mobile page
    await mobilePage.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 350;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
      });
    });
    await mobilePage.waitForTimeout(500);

    await mobilePage.evaluate(() => window.scrollTo(0, 0));
    await mobilePage.waitForTimeout(300);

    // Capture mobile full page
    const mobileFullShotPath = path.join(SCREENSHOT_DIR, `qa_${site.id}_mobile_full.png`);
    await mobilePage.screenshot({ path: mobileFullShotPath, fullPage: true });
    console.log(`  ✓ Mobile Full Page Captured: ${mobileFullShotPath}`);

    await mobileContext.close();

    console.log(`  • Sections rendered: ${sectionsInfo.count}`);
    console.log(`  • Broken images: ${brokenImages.length}`);
    console.log(`  • Desktop horizontal overflow: ${desktopOverflow ? "FAIL (Overflow detected)" : "PASS (Zero overflow)"}`);
    console.log(`  • Mobile horizontal overflow: ${mobileOverflow ? "FAIL (Overflow detected)" : "PASS (Zero overflow)"}`);
    console.log(`  • Console errors: ${consoleErrors.length === 0 ? "0 (Clean)" : `${consoleErrors.length} errors`}`);

    results.push({
      id: site.id,
      name: site.name,
      category: site.category,
      sectionsCount: sectionsInfo.count,
      desktopOverflow,
      mobileOverflow,
      brokenImagesCount: brokenImages.length,
      brokenImagesList: brokenImages,
      consoleErrorsCount: consoleErrors.length,
      consoleErrors,
      has3dWrapper,
      desktopHeroShot: desktopHeroShotPath,
      desktopFirstSectionsShot: desktopFirstSectionsPath,
      desktopFullShot: desktopFullShotPath,
      mobileHeroShot: mobileHeroShotPath,
      mobileFullShot: mobileFullShotPath,
    });
  }

  await browser.close();

  const auditResultsPath = path.join(path.resolve(process.cwd(), "scratch/audit_generations"), "browser_qa_results.json");
  fs.mkdirSync(path.dirname(auditResultsPath), { recursive: true });
  fs.writeFileSync(auditResultsPath, JSON.stringify(results, null, 2), "utf-8");

  console.log("\n================================================================================");
  console.log("🏁 PLAYWRIGHT BROWSER AUDIT MATRIX SUMMARY");
  console.log("================================================================================");
  console.table(
    results.map((r) => ({
      Industry: r.category,
      Sections: r.sectionsCount,
      "Desk Overflow": r.desktopOverflow ? "FAIL" : "PASS",
      "Mob Overflow": r.mobileOverflow ? "FAIL" : "PASS",
      "Broken Imgs": r.brokenImagesCount,
      "Console Errs": r.consoleErrorsCount,
      "3D Effect": r.has3dWrapper ? "Active" : "Flat",
    }))
  );
  console.log(`Audit results saved to: ${auditResultsPath}`);
}

runBrowserQa().catch((err) => {
  console.error("Browser QA Fatal Error:", err);
  process.exit(1);
});
