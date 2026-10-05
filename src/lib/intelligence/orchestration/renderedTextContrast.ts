import sharp from "sharp";
import type { Page } from "playwright";

interface PixelRectangle { left: number; top: number; right: number; bottom: number }
interface TextTarget { id: string; label: string; requiredRatio: number; rectangles: PixelRectangle[] }
interface Raster { data: Buffer; width: number; height: number; channels: number }
export interface RenderedTextContrastCheck {
  id: string;
  label: string;
  requiredRatio: number;
  minimumRatio: number | null;
  corePixels: number;
  passed: boolean;
  error?: string;
}
export interface RenderedTextContrastAudit {
  status: "completed" | "rejected" | "unavailable";
  method: "rendered-glyph-background-differential";
  checks: RenderedTextContrastCheck[];
  errors: string[];
}

const MAX_TEXT_TARGETS = 200;
const MAX_PIXELS = 16_000_000;
function contrast(first: number[], second: number[]): number {
  const luminance = (rgb: number[]) => rgb.map(value => value / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
async function raster(png: Buffer): Promise<Raster> {
  const decoded = await sharp(png, { limitInputPixels: MAX_PIXELS }).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  return { data: decoded.data, ...decoded.info };
}
function rgb(image: Raster, offset: number): number[] { return [image.data[offset], image.data[offset + 1], image.data[offset + 2]]; }

/** Actual raster evidence supplements CSS/token WCAG checks; it is not a WCAG certification. */
export function measureRenderedText(targets: TextTarget[], frames: { actual: Raster; hidden: Raster; black: Raster; white: Raster; hiddenAgain: Raster }): RenderedTextContrastCheck[] {
  const { actual, hidden, black, white, hiddenAgain } = frames;
  if (Object.values(frames).some(frame => frame.width !== actual.width || frame.height !== actual.height || frame.channels !== 3)) {
    throw new Error("Rendered contrast screenshot dimensions changed; measurement unavailable");
  }
  const scanArea = targets.reduce((total, target) => total + target.rectangles.reduce((area, box) => area +
    Math.max(0, Math.min(actual.width, box.right) - Math.max(0, box.left)) * Math.max(0, Math.min(actual.height, box.bottom) - Math.max(0, box.top)), 0), 0);
  if (!Number.isFinite(scanArea) || scanArea > 8_000_000) throw new Error("Text regions exceed bounded glyph measurement capacity; no text may be skipped");
  return targets.map(target => {
    const offsets = new Set<number>();
    for (const box of target.rectangles) {
      for (let y = Math.max(0, Math.floor(box.top)); y < Math.min(actual.height, Math.ceil(box.bottom)); y++) {
        for (let x = Math.max(0, Math.floor(box.left)); x < Math.min(actual.width, Math.ceil(box.right)); x++) {
          offsets.add((y * actual.width + x) * actual.channels);
        }
      }
    }
    // Black/white ink calibration isolates strongest glyph interiors, not AA edges
    // or arbitrary adjacent background pixels. Ancestor opacity remains intact.
    const delta = (offset: number) => Math.max(...rgb(white, offset).map((value, channel) => Math.abs(value - black.data[offset + channel])));
    let strongest = 0;
    for (const offset of offsets) strongest = Math.max(strongest, delta(offset));
    const core = [...offsets].filter(offset => delta(offset) >= Math.max(8, strongest * .9));
    const base = { id: target.id, label: target.label, requiredRatio: target.requiredRatio, minimumRatio: null, corePixels: core.length, passed: false };
    if (core.length < 3) return { ...base, error: "Visible text has no measurable glyph interiors; hidden, clipped or unsupported text paint" };
    if (core.some(offset => rgb(hidden, offset).some((value, channel) => Math.abs(value - hiddenAgain.data[offset + channel]) > 3))) {
      return { ...base, error: "Background changed during glyph measurement; stable pixel evidence is required" };
    }
    let minimumRatio = Number.POSITIVE_INFINITY;
    for (const offset of core) minimumRatio = Math.min(minimumRatio, contrast(rgb(actual, offset), rgb(hidden, offset)));
    return { ...base, minimumRatio, passed: minimumRatio >= target.requiredRatio,
      ...(minimumRatio < target.requiredRatio ? { error: `Rendered pixel contrast ${minimumRatio.toFixed(2)} is below ${target.requiredRatio}` } : {}) };
  });
}

/** Five whole-page captures bound cost independently of the number of text nodes. */
export async function auditRenderedTextContrast(page: Page): Promise<RenderedTextContrastAudit> {
  const checks: RenderedTextContrastCheck[] = [];
  let style: Awaited<ReturnType<Page["addStyleTag"]>> | undefined;
  let ownsMarkers = false;
  try {
    if (await page.evaluate(() => window.devicePixelRatio) !== 1) throw new Error("Contrast audit requires explicit device scale factor 1");
    if (await page.locator("[data-wb-contrast-target],[data-wb-contrast-clipped],[data-wb-contrast-svg],html[data-wb-contrast-phase]").count()) throw new Error("Reserved contrast audit attributes already present; measurement unavailable");
    ownsMarkers = true;
    style = await page.addStyleTag({ content: `
      * { animation-play-state:paused!important; transition:none!important; caret-color:transparent!important; }
      html[data-wb-contrast-phase="hidden"] [data-wb-contrast-target],
      html[data-wb-contrast-phase="hidden"] [data-wb-contrast-target]::placeholder {
        -webkit-text-fill-color:transparent!important; text-shadow:none!important;
      }
      html[data-wb-contrast-phase="hidden"] [data-wb-contrast-clipped="true"] {
        background-image:none!important; background-color:transparent!important;
      }
      html[data-wb-contrast-phase="black"] [data-wb-contrast-target],
      html[data-wb-contrast-phase="black"] [data-wb-contrast-target]::placeholder {
        -webkit-text-fill-color:#000!important; text-shadow:none!important;
      }
      html[data-wb-contrast-phase="white"] [data-wb-contrast-target],
      html[data-wb-contrast-phase="white"] [data-wb-contrast-target]::placeholder {
        -webkit-text-fill-color:#fff!important; text-shadow:none!important;
      }
      html[data-wb-contrast-phase="hidden"] [data-wb-contrast-svg] {fill:transparent!important;stroke:transparent!important;}
      html[data-wb-contrast-phase="black"] [data-wb-contrast-svg] {fill:#000!important;}
      html[data-wb-contrast-phase="white"] [data-wb-contrast-svg] {fill:#fff!important;}
    ` });
    const collected = await page.evaluate(({ maxTargets, maxPixels }) => {
      window.scrollTo(0, 0);
      if (document.documentElement.scrollWidth * document.documentElement.scrollHeight > maxPixels) throw new Error("Page exceeds bounded pixel audit capacity; no text may be skipped");
      const targets: TextTarget[] = [];
      const errors: string[] = [];
      const owners = new Map<HTMLElement | SVGElement, { label: string; rectangles: PixelRectangle[] }>();
      const clipped = (element: Element, box: DOMRect): PixelRectangle | null => {
        let left = Math.max(0, box.left), right = Math.min(window.innerWidth, box.right), top = Math.max(0, box.top), bottom = box.bottom;
        for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
          const css = getComputedStyle(ancestor);
          if (css.display === "none" || css.visibility === "hidden" || css.visibility === "collapse") return null;
          const bounds = ancestor.getBoundingClientRect();
          if (/(hidden|clip|scroll|auto)/.test(css.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
          if (/(hidden|clip|scroll|auto)/.test(css.overflowY) && ancestor !== document.body && ancestor !== document.documentElement) {
            top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom);
          }
        }
        return right > left && bottom > top ? { left, right, top, bottom } : null;
      };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const owner: Element | null = node.parentNode instanceof Element ? node.parentNode : null;
        const label = node.textContent?.trim() || "";
        if (!(owner instanceof HTMLElement || (owner instanceof SVGElement && ["text", "tspan", "textPath"].includes(owner.localName))) ||
          !/[\p{L}\p{N}\p{Sc}]/u.test(label) || owner.closest("script,style,noscript,template,textarea,option")) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        const rectangles = Array.from(range.getClientRects()).map(box => clipped(owner, box)).filter((box): box is PixelRectangle => box !== null);
        if (!rectangles.length) continue;
        const previous = owners.get(owner);
        owners.set(owner, { label: `${previous?.label || ""} ${label}`.trim().slice(0, 100), rectangles: [...(previous?.rectangles || []), ...rectangles] });
      }
      for (const control of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input,textarea,select")) {
        if (control instanceof HTMLInputElement && ["hidden", "checkbox", "radio", "range", "color", "file"].includes(control.type)) continue;
        const label = control instanceof HTMLSelectElement ? control.selectedOptions[0]?.textContent : control.value || control.placeholder;
        const box = clipped(control, control.getBoundingClientRect());
        if (label?.trim() && box) owners.set(control, { label: label.trim().slice(0, 100), rectangles: [box] });
      }
      if (owners.size > maxTargets) throw new Error("Visible text exceeds bounded contrast audit capacity; no text may be skipped");
      for (const [owner, content] of owners) {
        const css = getComputedStyle(owner);
        let transform = new DOMMatrix();
        let zoom = 1;
        for (let ancestor: Element | null = owner; ancestor; ancestor = ancestor.parentElement) {
          const paint = getComputedStyle(ancestor);
          const clip = paint.backgroundClip.split(",").map(value => value.trim());
          if (clip.includes("text")) {
            if (clip.some(value => value !== "text")) errors.push(`Unsupported mixed text/background paint: ${content.label}`);
            // Parent background-clip:text can paint descendant glyphs too.
            ancestor.setAttribute("data-wb-contrast-clipped", "true");
          }
          if (paint.transform !== "none") transform = new DOMMatrix(paint.transform).multiply(transform);
          const cssZoom = parseFloat(paint.zoom);
          if (Number.isFinite(cssZoom) && cssZoom > 0) zoom *= cssZoom;
        }
        const id = `text_${targets.length}`;
        owner.setAttribute("data-wb-contrast-target", id);
        if (owner instanceof SVGElement) owner.setAttribute("data-wb-contrast-svg", "true");
        // A scaled-down heading is not large text merely because its CSS token is
        // large. SVG screen matrices include viewBox/CSS scaling; non-2D HTML
        // transforms conservatively retain the ordinary-text ratio.
        const screen = owner instanceof SVGGraphicsElement ? owner.getScreenCTM() : transform;
        const scale = screen && (owner instanceof SVGElement || transform.is2D)
          ? Math.min(Math.hypot(screen.a, screen.b), Math.hypot(screen.c, screen.d)) * (owner instanceof SVGElement ? 1 : zoom) : 0;
        const fontSize = parseFloat(css.fontSize) * scale;
        const large = fontSize >= 24 || (fontSize >= 14 * 96 / 72 && Number(css.fontWeight) >= 700);
        targets.push({ id, label: content.label, rectangles: content.rectangles, requiredRatio: large ? 3 : 4.5 });
      }
      return { targets, errors };
    }, { maxTargets: MAX_TEXT_TARGETS, maxPixels: MAX_PIXELS });
    if (!collected.targets.length) throw new Error("No visible text was available for rendered pixel measurement");
    if (collected.errors.length) return { status: "unavailable", method: "rendered-glyph-background-differential", checks, errors: collected.errors };
    const capture = async (phase: string) => {
      await page.evaluate(value => document.documentElement.setAttribute("data-wb-contrast-phase", value), phase);
      // Our temporary stylesheet hides carets. Disable Playwright's separate
      // caret mutation, which otherwise leaves empty inline style attributes.
      return raster(await page.screenshot({ fullPage: true, animations: "allow", caret: "initial" }));
    };
    const actual = await capture("actual"), hidden = await capture("hidden"), black = await capture("black"), white = await capture("white"), hiddenAgain = await capture("hidden");
    checks.push(...measureRenderedText(collected.targets, { actual, hidden, black, white, hiddenAgain }));
    return { status: checks.every(check => check.passed) ? "completed" : "rejected", method: "rendered-glyph-background-differential", checks,
      errors: checks.filter(check => !check.passed).map(check => `${check.label}: ${check.error}`) };
  } catch (error) {
    return { status: "unavailable", method: "rendered-glyph-background-differential", checks, errors: [error instanceof Error ? error.message : "Rendered contrast unavailable"] };
  } finally {
    if (ownsMarkers) await page.evaluate(() => {
      document.documentElement.removeAttribute("data-wb-contrast-phase");
      for (const element of document.querySelectorAll("[data-wb-contrast-target]")) {
        element.removeAttribute("data-wb-contrast-target"); element.removeAttribute("data-wb-contrast-svg");
      }
      for (const element of document.querySelectorAll("[data-wb-contrast-clipped]")) element.removeAttribute("data-wb-contrast-clipped");
    });
    await style?.evaluate(element => element.parentNode?.removeChild(element));
  }
}
