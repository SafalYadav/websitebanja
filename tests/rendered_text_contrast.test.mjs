import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import sharp from "sharp";
import { auditRenderedTextContrast } from "../src/lib/intelligence/orchestration/renderedTextContrast.ts";

test("real desktop/mobile pixel audit measures relevant text over solid/image/gradient/alpha paints and restores DOM", async () => {
  const image = (await sharp({ create: { width: 2, height: 2, channels: 3, background: "#111111" } }).png().toBuffer()).toString("base64");
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      await page.setContent(`<style>body{margin:20px;background:white;color:#111;font:18px Arial}h1{font-size:40px}h2{font-size:28px}
        section{padding:20px}input{font:18px Arial;color:#111}input::placeholder{color:#333}
        .clip{background:linear-gradient(90deg,#111,#333);background-clip:text;-webkit-text-fill-color:transparent}svg{max-width:100%;display:block}</style>
        <h1>Evidence driven business</h1><p>Readable words <strong>and nested text</strong> remain visible.</p>
        <section style="background-image:url(data:image/png;base64,${image});color:white"><h2>Business photo background</h2></section>
        <section style="background:linear-gradient(90deg,#fff,#eee)"><p>Readable gradient background</p></section>
        <p style="color:rgba(0,0,0,.85);opacity:.9">Translucent but readable</p><h2 class="clip">Gradient ink</h2>
        <h2 class="clip"><span>Nested gradient ink</span></h2>
        <svg width="360" height="100" viewBox="0 0 180 50"><text x="8" y="30" fill="#333" font-size="14">Verified SVG labels</text></svg>
        <label>Name <input placeholder="Your name"></label>`);
      const before = await page.locator("body").innerHTML();
      const report = await auditRenderedTextContrast(page);
      assert.equal(report.status, "completed", JSON.stringify(report));
      assert.ok(report.checks.some(check => check.label.includes("Business photo")));
      assert.ok(report.checks.some(check => check.label.includes("Gradient ink")));
      assert.ok(report.checks.some(check => check.label.includes("Nested gradient")));
      assert.ok(report.checks.some(check => check.label.includes("Verified SVG")));
      assert.ok(report.checks.some(check => check.label === "Your name"));
      assert.ok(report.checks.every(check => check.corePixels >= 3 && check.minimumRatio >= check.requiredRatio));
      assert.equal(await page.locator("body").innerHTML(), before);
      assert.equal(await page.locator("html").getAttribute("data-wb-contrast-phase"), null);
      await page.close();
    }
  } finally { await browser.close(); }
});

test("real pixel audit rejects unreadable cream/image/gradient/opacity text including invisible headings", async () => {
  const image = (await sharp({ create: { width: 2, height: 2, channels: 3, background: "#ffffff" } }).png().toBuffer()).toString("base64");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1 });
    await page.setContent(`<style>body{background:white;font:18px Arial}h1{font-size:44px}h2{font-size:30px}section{padding:20px}</style>
      <h1 style="color:#fff7e7">Cream heading on white</h1>
      <section style="background-image:url(data:image/png;base64,${image});color:white"><h2>White text on actual image pixels</h2></section>
      <section style="background:linear-gradient(90deg,#111 0%,white 60%);color:white;text-align:right"><h2>Gradient loses contrast</h2></section>
      <p style="color:black;opacity:.2">Faint body text</p><h2 style="opacity:0">Invisible heading</h2>`);
    const report = await auditRenderedTextContrast(page);
    assert.equal(report.status, "rejected");
    for (const label of ["Cream heading", "White text", "Gradient loses", "Faint body", "Invisible heading"]) {
      assert.equal(report.checks.find(check => check.label.startsWith(label))?.passed, false, JSON.stringify(report));
    }
  } finally { await browser.close(); }
});

test("reserved attributes and nonstandard device scale fail closed without modifying the private candidate", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    await page.setContent('<h1 data-wb-contrast-target="original">Reserved marker</h1>');
    assert.equal((await auditRenderedTextContrast(page)).status, "unavailable");
    assert.equal(await page.locator("h1").getAttribute("data-wb-contrast-target"), "original");
    const scaled = await browser.newPage({ deviceScaleFactor: 2 });
    await scaled.setContent("<h1>Scaled viewport</h1>");
    assert.equal((await auditRenderedTextContrast(scaled)).status, "unavailable");
  } finally { await browser.close(); }
});
