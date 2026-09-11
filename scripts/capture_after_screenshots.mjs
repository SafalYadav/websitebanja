import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { resolve } from "path";

const OUT_DIR = resolve(process.cwd(), "scratch_screenshots");
mkdirSync(OUT_DIR, { recursive: true });

async function captureDevice(browser, name, width, height) {
  console.log(`Capturing ${name} (${width}x${height})...`);
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Capture initial above-the-fold viewport screenshot
  await page.screenshot({
    path: resolve(OUT_DIR, `after_${name}.png`),
    fullPage: false,
  });

  // 2. Scroll through the page to trigger all in-view animations
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 60);
    });
  });
  await page.waitForTimeout(800);

  // 3. Capture full page screenshot
  await page.screenshot({
    path: resolve(OUT_DIR, `after_${name}_full.png`),
    fullPage: true,
  });

  await context.close();
}

async function capture() {
  const browser = await chromium.launch({ headless: true });

  await captureDevice(browser, "desktop", 1440, 900);
  await captureDevice(browser, "tablet", 768, 1024);
  await captureDevice(browser, "mobile", 375, 812);

  await browser.close();
  console.log("All screenshots successfully captured in", OUT_DIR);
}

capture().catch((err) => {
  console.error("Failed to capture screenshots:", err);
  process.exit(1);
});
