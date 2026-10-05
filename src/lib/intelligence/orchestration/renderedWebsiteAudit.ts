import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { createPreviewAuditToken } from "./previewAuditToken";
import { auditSafeInteractions, type RenderedInteractionCheck } from "./renderedInteractionAudit";
import { auditRenderedTextContrast, type RenderedTextContrastAudit } from "./renderedTextContrast";

export interface RenderedViewportAudit {
  viewport: "desktop" | "mobile";
  screenshotPath: string;
  html: string;
  issues: string[];
  interactionChecks?: RenderedInteractionCheck[];
  textContrast?: RenderedTextContrastAudit;
  interactionStates?: Array<{ id: string; screenshotPath: string; textContrast: RenderedTextContrastAudit }>;
  imageEvidence: Array<{ id: string; screenshotPath: string; sourceUrl: string; alt: string; kind: "image" | "background" }>;
}

export interface RenderedWebsiteAudit {
  status: "completed" | "rejected" | "unavailable";
  viewports: RenderedViewportAudit[];
  errors: string[];
  durationMs: number;
}

/** Render the private candidate on this instance, never an arbitrary remote URL. */
export async function auditRenderedWebsite(previewId: string): Promise<RenderedWebsiteAudit> {
  const started = Date.now();
  const viewports: RenderedViewportAudit[] = [];
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    if (!/^prev_[a-z0-9_-]+$/.test(previewId)) throw new Error("Invalid preview audit identifier");
    const port = Number(process.env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid internal preview port");
    const url = `http://127.0.0.1:${port}/preview/${previewId}?qa=${createPreviewAuditToken(previewId)}`;
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, timeout: 20_000 });
    const directory = path.join(process.cwd(), "scratch", "rendered-audits", previewId);
    await fs.mkdir(directory, { recursive: true });
    for (const viewport of ["desktop", "mobile"] as const) {
      const page = await browser.newPage({ viewport: viewport === "desktop" ? { width: 1440, height: 1000 } : { width: 390, height: 844 }, deviceScaleFactor: 1 });
      const issues: string[] = [];
      page.on("pageerror", error => issues.push(`Browser error: ${error.message.slice(0, 200)}`));
      const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
      if (!response?.ok()) throw new Error(`Candidate render returned HTTP ${response?.status() ?? "unknown"}`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
          window.scrollTo(0, y);
          await new Promise(resolve => setTimeout(resolve, 80));
        }
        await Promise.all(Array.from(document.images).map(image => image.decode().catch(() => undefined)));
        window.scrollTo(0, 0);
      });
      issues.push(...await page.evaluate(() => {
        const failures: string[] = [];
        const visible = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        };
        const primaryHeading = document.querySelector("h1");
        if (!primaryHeading?.textContent?.trim() || !visible(primaryHeading)) failures.push("Missing visible rendered primary heading");
        if (document.documentElement.scrollWidth > window.innerWidth + 2) failures.push("Horizontal viewport overflow");
        for (const image of Array.from(document.images)) {
          if (visible(image) && (!image.complete || image.naturalWidth === 0)) failures.push(`Broken image: ${image.alt || "unlabelled"}`);
        }
        for (const anchor of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))) {
          const target = anchor.getAttribute("href")?.slice(1);
          if (!visible(anchor)) continue;
          try {
            if (!target || !document.getElementById(decodeURIComponent(target))) failures.push(`Missing navigation target: ${anchor.textContent?.trim()}`);
          } catch { failures.push(`Malformed navigation target: ${anchor.textContent?.trim()}`); }
        }
        const color = (value: string): number[] | undefined => {
          const match = value.match(/^rgba?\(([^)]+)\)$/);
          if (!match) return undefined;
          return match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        };
        const luminance = (rgb: number[]) => rgb.slice(0, 3).map(channel => {
          const value = channel / 255;
          return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4);
        }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        for (const element of Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,p,a,button,label,li"))) {
          if (!visible(element) || !element.textContent?.trim()) continue;
          const style = getComputedStyle(element);
          const foreground = color(style.color);
          let current: HTMLElement | null = element;
          let background: number[] | undefined;
          let complexBackground = false;
          while (current) {
            const ancestorStyle = getComputedStyle(current);
            if (ancestorStyle.backgroundImage !== "none") complexBackground = true;
            const candidate = color(ancestorStyle.backgroundColor);
            if (candidate && (candidate[3] ?? 1) === 1) { background = candidate; break; }
            current = current.parentElement;
          }
          // Image/gradient and translucent combinations require the separate pixel audit.
          if (!foreground || !background || complexBackground || (foreground[3] ?? 1) < 1 || Number(style.opacity) < 1) continue;
          const light = luminance(foreground), dark = luminance(background);
          const ratio = (Math.max(light, dark) + .05) / (Math.min(light, dark) + .05);
          const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 14 * 96 / 72 && Number(style.fontWeight) >= 700);
          if (ratio < (large ? 3 : 4.5)) failures.push(`Text contrast ${ratio.toFixed(2)}: ${element.textContent.trim().slice(0, 90)}`);
        }
        return failures;
      }));
      // Exercise real anchor behavior rather than declaring success from href text alone.
      const anchors = page.locator('a[href^="#"]');
      for (let index = 0; index < Math.min(await anchors.count(), 30); index++) {
        const anchor = anchors.nth(index);
        if (!await anchor.isVisible()) continue;
        const href = await anchor.getAttribute("href");
        if (!href || href === "#") continue;
        await anchor.click({ timeout: 5_000 });
        await page.waitForTimeout(650);
        const reached = await page.evaluate(targetId => {
          const target = document.getElementById(decodeURIComponent(targetId));
          if (!target) return false;
          const rect = target.getBoundingClientRect();
          return rect.top < window.innerHeight && rect.bottom > 0;
        }, href.slice(1));
        if (!reached) issues.push(`Anchor click did not reach target: ${href}`);
      }
      const interactionStates: NonNullable<RenderedViewportAudit["interactionStates"]> = [];
      const interactionChecks = await auditSafeInteractions(page, async id => {
        const contrast = await auditRenderedTextContrast(page);
        if (contrast.status !== "completed") issues.push(...contrast.errors.map(error => `Interactive state ${id} contrast: ${error}`));
        const statePath = path.join(directory, `${viewport}-${id}.png`);
        await page.screenshot({ path: statePath, fullPage: true, animations: "disabled" });
        interactionStates.push({ id, screenshotPath: statePath, textContrast: contrast });
      });
      issues.push(...interactionChecks.filter(check => !check.passed).map(check => `${check.kind}: ${check.label}: ${check.observation}`));
      await page.evaluate(() => window.scrollTo(0, 0));
      const textContrast = await auditRenderedTextContrast(page);
      if (textContrast.status !== "completed") issues.push(...textContrast.errors.map(error => `Rendered text contrast: ${error}`));
      const screenshotPath = path.join(directory, `${viewport}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
      const imageEvidence: RenderedViewportAudit["imageEvidence"] = [];
      // Stylesheets can define photos too; checking only inline styles skips them.
      await page.evaluate(() => {
        for (const node of document.querySelectorAll("body *")) {
          if (node instanceof HTMLImageElement || /url\(/.test(getComputedStyle(node).backgroundImage)) {
            node.setAttribute("data-wb-audit-photo", "true");
          }
        }
      });
      const photoElements = page.locator('[data-wb-audit-photo="true"]');
      for (let index = 0; index < await photoElements.count(); index++) {
        const element = photoElements.nth(index);
        if (!await element.isVisible()) continue;
        const metadata = await element.evaluate(node => {
          if (node instanceof HTMLImageElement) return { sourceUrl: node.currentSrc || node.src, alt: node.alt, kind: "image" as const };
          const background = getComputedStyle(node).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
          return background ? { sourceUrl: background[1], alt: "CSS background photo", kind: "background" as const } : null;
        });
        if (!metadata) continue;
        if (imageEvidence.length >= 24) { issues.push("Image evidence exceeds bounded audit capacity; no images may be skipped"); break; }
        const id = `${viewport}_image_${imageEvidence.length}`;
        const imagePath = path.join(directory, `${id}.png`);
        await element.screenshot({ path: imagePath, animations: "disabled", timeout: 10_000 });
        // Do not retain signed query tokens or credential-like photo parameters.
        const sourceUrl = metadata.sourceUrl.split("?")[0];
        imageEvidence.push({ id, screenshotPath: imagePath, sourceUrl, alt: metadata.alt, kind: metadata.kind });
      }
      viewports.push({ viewport, screenshotPath, html: await page.content(), issues, imageEvidence, interactionChecks, interactionStates, textContrast });
      await page.close();
    }
    const report: RenderedWebsiteAudit = { status: viewports.some(result => result.issues.length) ? "rejected" : "completed", viewports, errors: [], durationMs: Date.now() - started };
    await fs.writeFile(path.join(directory, "audit.json"), JSON.stringify(report, null, 2));
    return report;
  } catch (error) {
    return { status: "unavailable", viewports, errors: [error instanceof Error ? error.message : "Rendered audit unavailable"], durationMs: Date.now() - started };
  } finally { await browser?.close(); }
}
