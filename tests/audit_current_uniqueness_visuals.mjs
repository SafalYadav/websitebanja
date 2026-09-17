// tests/audit_current_uniqueness_visuals.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const ROOT = process.cwd();
const ARTIFACTS_DIR = "/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a";
const AUDIT_SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, "scratch/visual_audit_screenshots");
fs.mkdirSync(AUDIT_SCREENSHOTS_DIR, { recursive: true });

const TARGET_RUNS = [
  // 2D same-business (A)
  "run_a_1", "run_a_2", "run_a_3", "run_a_4", "run_a_5",
  // 3D same-business (B)
  "run_b_1", "run_b_2", "run_b_5", "run_b_7",
  // 2D repeat (C)
  "run_c_1", "run_c_5", "run_c_10",
  // 2D comparison for 3D
  "run_a_7",
  // Cross-business (D)
  "run_d_1", "run_d_2", "run_d_3", "run_d_5", "run_d_8", "run_d_14"
];

async function main() {
  console.log("================================================================================");
  console.log("   WEBSITEBANJA: CRITICAL VISUAL UNIQUENESS & IMAGE REUSE AUDIT               ");
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

  const auditData = {};

  for (const runId of TARGET_RUNS) {
    const url = `http://localhost:3000/preview/${runId}`;
    console.log(`📸 Capturing full-page audit for ${runId} at ${url}...`);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(400);

    const screenshotPath = path.join(AUDIT_SCREENSHOTS_DIR, `${runId}_fullpage.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Extract DOM inspection
    const domData = await page.evaluate(() => {
      // 1. All images
      const images = Array.from(document.querySelectorAll("img")).map(img => ({
        src: img.src,
        alt: img.alt || "",
        section: img.closest("section, footer, header")?.id || img.closest("section, footer, header")?.tagName || "unknown"
      }));

      // 2. All background images
      const bgElements = Array.from(document.querySelectorAll("*")).filter(el => {
        const bg = window.getComputedStyle(el).backgroundImage;
        return bg && bg !== "none" && bg.includes("url(");
      }).map(el => ({
        bg: window.getComputedStyle(el).backgroundImage,
        tag: el.tagName,
        className: el.className
      }));

      // 3. Typography
      const h1 = document.querySelector("h1");
      const h1Style = h1 ? window.getComputedStyle(h1) : null;
      const h2 = document.querySelector("h2");
      const h2Style = h2 ? window.getComputedStyle(h2) : null;
      const p = document.querySelector("p");
      const pStyle = p ? window.getComputedStyle(p) : null;

      // 4. Sections
      const sections = Array.from(document.querySelectorAll("section, footer")).map(s => {
        const heading = s.querySelector("h1, h2, h3")?.textContent?.trim() || "";
        return {
          id: s.id || s.tagName.toLowerCase(),
          heading,
        };
      });

      // 5. Cards
      const cards = Array.from(document.querySelectorAll(".rounded-3xl, .rounded-2xl, [class*='card'], [class*='Card']")).map(c => {
        const style = window.getComputedStyle(c);
        return {
          bg: style.backgroundColor,
          border: style.border,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
        };
      }).slice(0, 10);

      // 6. 3D Elements
      const canvases = document.querySelectorAll("canvas").length;
      const spatialContainers = document.querySelectorAll(".wb-spatial-container").length;
      const spatialStages = document.querySelectorAll(".wb-spatial-stage").length;

      return {
        images,
        bgElements,
        typography: {
          h1: {
            text: h1?.textContent?.trim() || "",
            fontFamily: h1Style?.fontFamily || "",
            fontSize: h1Style?.fontSize || "",
            fontWeight: h1Style?.fontWeight || "",
            lineHeight: h1Style?.lineHeight || "",
            color: h1Style?.color || "",
          },
          h2: {
            text: h2?.textContent?.trim() || "",
            fontFamily: h2Style?.fontFamily || "",
            fontSize: h2Style?.fontSize || "",
            fontWeight: h2Style?.fontWeight || "",
          },
          body: {
            fontFamily: pStyle?.fontFamily || "",
            fontSize: pStyle?.fontSize || "",
            color: pStyle?.color || "",
          }
        },
        sections,
        cards,
        threeD: {
          canvases,
          spatialContainers,
          spatialStages,
        }
      };
    });

    auditData[runId] = {
      runId,
      screenshotPath,
      dom: domData,
    };
  }

  await browser.close();

  // Save audit JSON
  const auditJsonPath = path.join(ARTIFACTS_DIR, "scratch/visual_audit_data.json");
  fs.writeFileSync(auditJsonPath, JSON.stringify(auditData, null, 2));
  console.log(`\nAudit data saved to: ${auditJsonPath}`);

  // Create Side-by-Side Comparison Sheets using Sharp
  console.log("\n🖼️ Generating Side-by-Side Comparison Sheets...");

  // Helper to compose comparison image
  async function createComparisonSheet(runIds, outputPath, title) {
    console.log(`   Generating sheet: ${outputPath} (${runIds.join(" vs ")})`);
    const resizedImages = [];
    const targetWidth = 480;

    for (const id of runIds) {
      const srcPath = auditData[id].screenshotPath;
      // Resize fullpage screenshot to fixed width 480
      const resizedBuf = await sharp(srcPath)
        .resize({ width: targetWidth, withoutEnlargement: false })
        .toBuffer();
      
      const meta = await sharp(resizedBuf).metadata();
      resizedImages.push({ id, buf: resizedBuf, width: meta.width, height: meta.height });
    }

    // Determine max height, capped at 3200px to avoid enormous images
    const maxHeight = Math.min(3200, Math.max(...resizedImages.map(img => img.height)));

    // Crop each image to maxHeight
    const croppedImages = [];
    for (const item of resizedImages) {
      const cropped = await sharp(item.buf)
        .extract({ left: 0, top: 0, width: targetWidth, height: Math.min(item.height, maxHeight) })
        .resize(targetWidth, maxHeight, { fit: "cover", position: "top" })
        .toBuffer();
      croppedImages.push(cropped);
    }

    // Create composite canvas
    const totalWidth = targetWidth * runIds.length;
    const canvas = sharp({
      create: {
        width: totalWidth,
        height: maxHeight,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 },
      }
    });

    const composites = croppedImages.map((buf, i) => ({
      input: buf,
      left: i * targetWidth,
      top: 0,
    }));

    await canvas.composite(composites).png().toFile(outputPath);
    console.log(`   ✅ Created: ${outputPath}`);
  }

  // 1. Sheet A: run_a_1 vs run_a_2 vs run_a_3 vs run_a_4 vs run_a_5
  await createComparisonSheet(
    ["run_a_1", "run_a_2", "run_a_3", "run_a_4", "run_a_5"],
    path.join(ARTIFACTS_DIR, "comparison_sheet_group_a_same_biz_2d.png"),
    "Group A: Same Business (Northstar Coffee) 2D Runs 1 to 5"
  );

  // 2. Sheet B1: run_a_1 vs run_b_1 (2D vs 3D)
  await createComparisonSheet(
    ["run_a_1", "run_b_1"],
    path.join(ARTIFACTS_DIR, "comparison_sheet_2d_vs_3d_run1.png"),
    "2D vs 3D Comparison: Run A1 (2D) vs Run B1 (3D)"
  );

  // 3. Sheet B2: run_a_7 vs run_b_7 (2D Dark vs 3D Dark)
  await createComparisonSheet(
    ["run_a_7", "run_b_7"],
    path.join(ARTIFACTS_DIR, "comparison_sheet_2d_vs_3d_dark.png"),
    "2D vs 3D Comparison: Run A7 (2D Dark) vs Run B7 (3D Dark)"
  );

  // 4. Sheet C: run_c_1 vs run_c_5 vs run_c_10 (2D Repeat Group)
  await createComparisonSheet(
    ["run_c_1", "run_c_5", "run_c_10"],
    path.join(ARTIFACTS_DIR, "comparison_sheet_group_c_repeat_2d.png"),
    "Group C: 2D Repeat Audit (Runs C1, C5, C10)"
  );

  // 5. Sheet D: Cross-business (run_d_1 vs run_d_2 vs run_d_5 vs run_d_14)
  await createComparisonSheet(
    ["run_d_1", "run_d_2", "run_d_5", "run_d_14"],
    path.join(ARTIFACTS_DIR, "comparison_sheet_cross_business.png"),
    "Cross-Business Comparison: Dental vs Law vs AI vs Architecture"
  );

  console.log("\n🎉 Visual Audit and Comparison Sheets generation complete!");
}

main().catch(err => {
  console.error("FATAL ERROR in audit script:", err);
  process.exit(1);
});
