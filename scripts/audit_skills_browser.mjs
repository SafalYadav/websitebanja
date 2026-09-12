import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, ".tempmediaStorage");
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const ALL_SKILLS = [
  "master-design-intelligence",
  "ui-ux",
  "framer-motion",
  "21st-dev",
  "design-systems",
  "cro",
  "typography",
  "responsive-design",
  "accessibility",
  "ux-psychology",
  "interaction-design",
  "creative-art-direction",
  "seo",
  "performance",
  "industry-intelligence",
  "gsap",
  "threejs",
  "data-visualization",
  "saas-ux",
  "ecommerce-ux",
  "spatial-interaction",
];

const REFERENCE_PATTERNS = [
  "bento-grid",
  "expandable-bento",
  "staggered-grid",
  "spotlight-glow-card",
  "testimonial-stack",
  "perspective-carousel",
  "cursor-card",
  "verse-card",
  "expandable-cards",
  "image-scatter",
  "scroll-driven-blur-header",
  "mouse-trail-particle",
  "page-transition-curtain",
  "webgl-shader-background",
  "kinetic-text-reveal",
  "physics-gravity-container",
  "magnetic-button",
  "command-palette",
];

const CARD_VARIANTS = [
  "bento-card",
  "expandable-card",
  "stack-card",
  "spotlight-card",
  "image-reveal-card",
  "perspective-card",
  "editorial-card",
  "horizontal-media-card",
  "project-showcase-card",
  "testimonial-stack-card",
  "comparison-card",
  "stat-card",
  "service-card",
  "feature-reveal-card",
  "floating-card",
];

async function runFullAudit() {
  console.log("================================================================================");
  console.log("🚀 STARTING 100% RE-AUDIT: 21 SKILLS, 18 PATTERNS, 15 CARD ARCHITECTURES");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const auditReport = {
    timestamp: new Date().toISOString(),
    skills: {},
    patterns: {},
    cards: {},
    summary: {
      totalSkills: ALL_SKILLS.length,
      workingSkills: 0,
      partialSkills: 0,
      failingSkills: 0,
      totalPatterns: REFERENCE_PATTERNS.length,
      workingPatterns: 0,
      partialPatterns: 0,
      missingPatterns: 0,
      totalCards: CARD_VARIANTS.length,
      distinctCards: 0,
    },
  };

  // ---------------------------------------------------------------------------
  // 1. AUDITING ALL 21 SKILLS
  // ---------------------------------------------------------------------------
  console.log(">>> [AUDIT PART 1] AUDITING ALL 21 SKILLS IN ISOLATED BROWSER HARNESS");
  for (const skill of ALL_SKILLS) {
    const consoleErrors = [];
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(`[Page Error] ${err.message}`);
    });

    const url = `http://localhost:3000/skill-audit/${skill}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(600);

    // Desktop Screenshot
    const desktopScreenshotPath = path.join(SCREENSHOT_DIR, `skill_${skill}_desktop.png`);
    await page.screenshot({ path: desktopScreenshotPath });

    // Interactions
    await page.hover("#audit-fixture-container");
    await page.click("#audit-fixture-container");

    // Reduced Motion Test
    await page.click("#toggle-reduced-motion");
    await page.waitForTimeout(200);

    // Mobile Viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);

    // Mobile Screenshot
    const mobileScreenshotPath = path.join(SCREENSHOT_DIR, `skill_${skill}_mobile.png`);
    await page.screenshot({ path: mobileScreenshotPath });

    const diagnostics = await page.evaluate(() => {
      const diagEl = document.getElementById("audit-diagnostics");
      const statusBadge = document.getElementById("audit-status-badge");
      const reasonsEl = document.getElementById("audit-reasons");
      const evidenceEl = document.getElementById("audit-evidence");

      return {
        status: statusBadge?.textContent?.trim() || "UNKNOWN",
        skill: diagEl?.getAttribute("data-skill"),
        reasons: reasonsEl?.textContent?.trim() || "",
        evidence: evidenceEl?.textContent?.trim() || "",
        hasOverflowX: document.documentElement.scrollWidth > window.innerWidth,
      };
    });

    auditReport.skills[skill] = {
      id: skill,
      status: diagnostics.status,
      reasons: diagnostics.reasons,
      evidence: diagnostics.evidence,
      hasOverflowX: diagnostics.hasOverflowX,
      consoleErrors,
      desktopScreenshot: desktopScreenshotPath,
      mobileScreenshot: mobileScreenshotPath,
    };

    if (diagnostics.status === "PASS") auditReport.summary.workingSkills++;
    else if (diagnostics.status === "PARTIAL") auditReport.summary.partialSkills++;
    else auditReport.summary.failingSkills++;

    console.log(`  Skill [${skill}]: Verdict=${diagnostics.status} | Overflow=${diagnostics.hasOverflowX} | Errors=${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log(`    Errors: ${consoleErrors.join(" | ")}`);
    }
    await context.close();
  }

  // ---------------------------------------------------------------------------
  // 2. AUDITING ALL 18 REFERENCE PATTERNS
  // ---------------------------------------------------------------------------
  console.log("\n>>> [AUDIT PART 2] AUDITING ALL 18 REFERENCE PATTERNS");
  for (const pattern of REFERENCE_PATTERNS) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    const url = `http://localhost:3000/pattern-audit/${pattern}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(500);

    const screenshotPath = path.join(SCREENSHOT_DIR, `pattern_${pattern}.png`);
    await page.screenshot({ path: screenshotPath });

    const patternDiag = await page.evaluate(() => {
      const badge = document.getElementById("pattern-status-badge");
      const diag = document.getElementById("pattern-diagnostics");
      const verdict = document.getElementById("pattern-verdict");
      const features = document.getElementById("pattern-features");

      return {
        status: badge?.textContent?.trim() || "UNKNOWN",
        implemented: diag?.getAttribute("data-implemented") === "true",
        verdict: verdict?.textContent?.trim() || "",
        features: features?.textContent?.trim() || "",
      };
    });

    auditReport.patterns[pattern] = {
      id: pattern,
      ...patternDiag,
      screenshot: screenshotPath,
    };

    if (patternDiag.status === "PASS") auditReport.summary.workingPatterns++;
    else if (patternDiag.status === "PARTIAL") auditReport.summary.partialPatterns++;
    else auditReport.summary.missingPatterns++;

    console.log(`  Pattern [${pattern}]: Status=${patternDiag.status} | Implemented=${patternDiag.implemented}`);
    await context.close();
  }

  // ---------------------------------------------------------------------------
  // 3. AUDITING ALL 15 CARD ARCHITECTURES (STRUCTURAL INTEGRITY)
  // ---------------------------------------------------------------------------
  console.log("\n>>> [AUDIT PART 3] AUDITING ALL 15 CARD ARCHITECTURES");
  for (const card of CARD_VARIANTS) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const url = `http://localhost:3000/pattern-audit/${card}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(400);

    const cardInfo = await page.evaluate(() => {
      const container = document.getElementById("pattern-render-container");
      const cardEl = container?.querySelector("article, [data-card-primitive], .group") || container?.firstElementChild;
      if (!cardEl) return null;
      const comp = window.getComputedStyle(cardEl);
      const childCount = cardEl.childElementCount;
      const innerHtml = cardEl.innerHTML;

      return {
        tag: cardEl.tagName,
        className: cardEl.className,
        display: comp.display,
        padding: comp.padding,
        borderRadius: comp.borderRadius,
        childCount,
        hasSpotlight: innerHtml.includes("radial-gradient") || innerHtml.includes("var(--mouse-x"),
        hasPerspective: comp.perspective !== "none" || innerHtml.includes("perspective"),
        hasMedia: Boolean(cardEl.querySelector("img, svg, canvas")),
        hasExpandable: innerHtml.includes("layoutId") || innerHtml.includes("dialog") || innerHtml.includes("inspect"),
      };
    });

    auditReport.cards[card] = cardInfo;
    if (cardInfo) auditReport.summary.distinctCards++;

    console.log(`  Card [${card}]: Tag=${cardInfo?.tag} Display=${cardInfo?.display} Radius=${cardInfo?.borderRadius} Padding=${cardInfo?.padding} Media=${cardInfo?.hasMedia} Spotlight=${cardInfo?.hasSpotlight}`);
    await context.close();
  }

  await browser.close();

  // Save report
  const reportPath = path.resolve(process.cwd(), "scratch/forensic_skill_audit_results.json");
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), "utf-8");

  console.log("\n================================================================================");
  console.log("🎉 AUDIT VERIFICATION COMPLETE. REPORT SAVED TO: scratch/forensic_skill_audit_results.json");
  console.log(`  • Skills: ${auditReport.summary.workingSkills} PASS | ${auditReport.summary.partialSkills} PARTIAL | ${auditReport.summary.failingSkills} FAIL`);
  console.log(`  • Patterns: ${auditReport.summary.workingPatterns} PASS | ${auditReport.summary.partialPatterns} PARTIAL | ${auditReport.summary.missingPatterns} MISSING`);
  console.log(`  • Card Architectures: ${auditReport.summary.distinctCards}/15 Verified`);
  console.log("================================================================================\n");
}

runFullAudit().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
