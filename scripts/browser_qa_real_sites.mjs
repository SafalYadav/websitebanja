import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, ".tempmediaStorage");
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const SITES = [
  { id: "restaurant", name: "L’Aroma Specialty Coffee & Bistro", category: "Restaurant & Cafe" },
  { id: "dental", name: "Aura Dental Suite", category: "Dental Clinic" },
  { id: "saas", name: "SynapseTelemetry AI", category: "SaaS & Technology" },
  { id: "architecture", name: "Atelier Form & Void", category: "Architecture Studio" },
  { id: "fashion", name: "Maison Vérité", category: "Luxury Fashion" },
  { id: "service", name: "Apex Emergency Plumbing", category: "Local Service Business" },
  { id: "ecommerce", name: "Nordic Living Essentials", category: "E-commerce & Retail" },
  { id: "agency", name: "Kinetic Studio", category: "Creative Agency" },
];

async function runBrowserQa() {
  console.log("================================================================================");
  console.log("🎭 WEBSITEBANJA AI: PLAYWRIGHT BROWSER VISUAL QA FOR 8 REAL GENERATED WEBSITES");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const site of SITES) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`🔍 Testing [${site.category}] ${site.name} (/preview/${site.id})`);
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
        consoleErrors.push(`[Desktop] ${msg.text()}`);
      }
    });
    desktopPage.on("pageerror", (err) => {
      consoleErrors.push(`[Desktop PageError] ${err.message}`);
    });

    const targetUrl = `http://localhost:3000/preview/${site.id}`;
    await desktopPage.goto(targetUrl, { waitUntil: "networkidle", timeout: 20000 });
    await desktopPage.waitForTimeout(1000);

    // Verify sections rendered
    const sectionsCount = await desktopPage.evaluate(() => {
      return document.querySelectorAll("section").length;
    });

    // Check desktop horizontal overflow
    const desktopOverflow = await desktopPage.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth > window.innerWidth;
    });

    // Scroll down to test full-page rendering
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
    await desktopPage.waitForTimeout(500);

    // Scroll back to top for hero screenshot
    await desktopPage.evaluate(() => window.scrollTo(0, 0));
    await desktopPage.waitForTimeout(300);

    const desktopHeroShotPath = path.join(SCREENSHOT_DIR, `qa_${site.id}_desktop_hero.png`);
    await desktopPage.screenshot({ path: desktopHeroShotPath, fullPage: false });
    console.log(`  ✓ Desktop Hero Captured: ${desktopHeroShotPath}`);

    const desktopFullShotPath = path.join(SCREENSHOT_DIR, `qa_${site.id}_desktop_full.png`);
    await desktopPage.screenshot({ path: desktopFullShotPath, fullPage: true });
    console.log(`  ✓ Desktop Full Page Captured: ${desktopFullShotPath}`);

    // Check spatial 3D wrapper presence if applicable
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
        consoleErrors.push(`[Mobile] ${msg.text()}`);
      }
    });
    mobilePage.on("pageerror", (err) => {
      consoleErrors.push(`[Mobile PageError] ${err.message}`);
    });

    await mobilePage.goto(targetUrl, { waitUntil: "networkidle", timeout: 20000 });
    await mobilePage.waitForTimeout(800);

    // Check mobile horizontal overflow
    const mobileOverflow = await mobilePage.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth > window.innerWidth;
    });

    // Check minimum touch target on primary buttons (>= 44px)
    const touchTargetAudit = await mobilePage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button, a.btn, a[class*='button']"));
      const smallButtons = buttons.filter((b) => {
        const rect = b.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 40 || rect.height < 40);
      });
      return {
        totalButtons: buttons.length,
        smallButtonsCount: smallButtons.length,
      };
    });

    const mobileHeroShotPath = path.join(SCREENSHOT_DIR, `qa_${site.id}_mobile_hero.png`);
    await mobilePage.screenshot({ path: mobileHeroShotPath, fullPage: false });
    console.log(`  ✓ Mobile Hero Captured: ${mobileHeroShotPath}`);

    await mobileContext.close();

    console.log(`  • Sections rendered: ${sectionsCount}`);
    console.log(`  • Desktop horizontal overflow: ${desktopOverflow ? "FAIL (Overflow detected)" : "PASS (Zero overflow)"}`);
    console.log(`  • Mobile horizontal overflow: ${mobileOverflow ? "FAIL (Overflow detected)" : "PASS (Zero overflow)"}`);
    console.log(`  • Console errors: ${consoleErrors.length === 0 ? "0 (Clean)" : `${consoleErrors.length} errors`}`);
    console.log(`  • Spatial 3D elements active: ${has3dWrapper ? "Yes" : "Flat / No"}`);

    results.push({
      id: site.id,
      name: site.name,
      category: site.category,
      sectionsCount,
      desktopOverflow,
      mobileOverflow,
      consoleErrorsCount: consoleErrors.length,
      has3dWrapper,
      desktopHeroShot: desktopHeroShotPath,
      desktopFullShot: desktopFullShotPath,
      mobileHeroShot: mobileHeroShotPath,
    });
  }

  await browser.close();

  console.log("\n================================================================================");
  console.log("🏁 PLAYWRIGHT BROWSER QA MATRIX SUMMARY");
  console.log("================================================================================");
  console.table(
    results.map((r) => ({
      Industry: r.category,
      Sections: r.sectionsCount,
      "Desktop Overflow": r.desktopOverflow ? "FAIL" : "PASS",
      "Mobile Overflow": r.mobileOverflow ? "FAIL" : "PASS",
      "Console Errors": r.consoleErrorsCount,
      "Spatial 3D": r.has3dWrapper ? "Active" : "Flat",
    }))
  );

  const anyFailures = results.some((r) => r.desktopOverflow || r.mobileOverflow || r.consoleErrorsCount > 0);
  if (anyFailures) {
    console.error("\n❌ BROWSER QA FOUND ISSUES!");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL 8 WEBSITES PASSED COMPLETE BROWSER QA (DESKTOP & MOBILE)!");
  }
}

runBrowserQa().catch((err) => {
  console.error("Browser QA Fatal Error:", err);
  process.exit(1);
});
