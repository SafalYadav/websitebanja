import type { Locator, Page } from "playwright";

export interface RenderedInteractionCheck {
  kind: "contact_link" | "form_validation" | "section_navigation" | "navigation_menu" | "page_navigation" | "button_action";
  label: string;
  passed: boolean;
  observation: string;
  stateId?: string;
  phase?: "open" | "restore";
}

/** Exercise hit targets and native validation without delivering real inquiries. */
export async function auditSafeInteractions(page: Page, captureOpenState?: (id: string) => Promise<void>): Promise<RenderedInteractionCheck[]> {
  const checks: RenderedInteractionCheck[] = [];
  const menus: { control: Locator; panelId: string; expanded: boolean }[] = [];
  const controls = page.locator('nav button[aria-controls][aria-expanded],header button[aria-controls][aria-expanded]');
  if (await controls.count() > 8) return [{ kind: "navigation_menu", label: "Menu audit capacity", passed: false, observation: "More than eight disclosure controls exceeds bounded navigation verification" }];
  for (let index = 0; index < await controls.count(); index++) {
    const control = controls.nth(index);
    if (!await control.isVisible()) continue;
    const panelId = await control.getAttribute("aria-controls") || "";
    const expanded = await control.getAttribute("aria-expanded") === "true";
    const label = await control.getAttribute("aria-label") || "Navigation menu";
    menus.push({ control, panelId, expanded });
    try {
      if (!panelId || /\s/.test(panelId)) throw new Error("Missing unique menu target");
      if (!expanded) await control.click({ timeout: 1500 });
      if (await control.getAttribute("aria-expanded") !== "true") throw new Error("Disclosure state not updated");
      await page.waitForFunction(id => {
        const panel = document.getElementById(id);
        if (!panel) return false;
        const bounds = panel.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && getComputedStyle(panel).visibility !== "hidden" &&
          Array.from(panel.querySelectorAll("a,button")).some(item => item.getBoundingClientRect().width > 0);
      }, panelId, { timeout: 1500 });
      const stateId = `navigation-menu-${index}`;
      await captureOpenState?.(stateId);
      checks.push({ kind: "navigation_menu", label, phase: "open", stateId, passed: true, observation: "Menu disclosure opened with visible interactive navigation" });
    } catch { checks.push({ kind: "navigation_menu", label, passed: false, observation: "Menu disclosure or controlled navigation panel failed to open" }); }
  }
  const revealNavigation = async (link: Locator): Promise<boolean> => {
    if (await link.isVisible()) return true;
    for (const menu of menus) {
      if (await link.evaluate((node, id) => document.getElementById(id)?.contains(node) || false, menu.panelId)) {
        try { await menu.control.click({ timeout: 1500 }); await link.waitFor({ state: "visible", timeout: 1500 }); return true; }
        catch {
          checks.push({ kind: "navigation_menu", label: "Navigation link disclosure", passed: false,
            observation: "A controlled navigation link could not be revealed; hidden links are not verified" });
          return false;
        }
      }
    }
    return false;
  };
  const sectionLinks = page.locator('a[href^="#"]');
  const sectionCount = await sectionLinks.count();
  if (sectionCount > 30) return [{ kind: "section_navigation", label: "Navigation audit capacity", passed: false,
    observation: "More than 30 section links exceeds bounded interactive verification" }];
  for (let index = 0; index < sectionCount; index++) {
    const link = sectionLinks.nth(index);
    if (!await revealNavigation(link)) continue;
    const href = await link.getAttribute("href") || "";
    const label = (await link.innerText()).trim() || href;
    let id: string;
    try { id = decodeURIComponent(href.slice(1)); } catch {
      checks.push({ kind: "section_navigation", label, passed: false, observation: "Malformed section destination" }); continue;
    }
    if (!id || !await page.evaluate(target => !!document.getElementById(target), id)) {
      checks.push({ kind: "section_navigation", label, passed: false, observation: "Section target is absent" }); continue;
    }
    try {
      await link.scrollIntoViewIfNeeded({ timeout: 1500 });
      const before = await page.evaluate(() => ({ y: scrollY, hash: location.hash }));
      await link.click({ timeout: 1500 });
      // A real native/handler click must bring the destination into the viewport.
      // Do not substitute scrollIntoView here: that would repair a broken handler during QA.
      await page.waitForFunction(({ target, initial }) => {
        const section = document.getElementById(target);
        if (!section) return false;
        const box = section.getBoundingClientRect(), css = getComputedStyle(section);
        return (location.hash !== initial.hash || Math.abs(scrollY - initial.y) > 1) &&
          box.width > 0 && box.height > 0 && box.top < innerHeight * .75 && box.bottom > 0 &&
          css.display !== "none" && css.visibility !== "hidden" && Number(css.opacity) > 0;
      }, { target: id, initial: before }, { timeout: 1500 });
      checks.push({ kind: "section_navigation", label, passed: true, observation: "Real section link click brought its destination into view" });
    } catch {
      checks.push({ kind: "section_navigation", label, passed: false, observation: "Section link is not clickable or its destination did not enter view" });
    }
  }
  const actionButtons = page.locator("button[data-wb-action]");
  if (await actionButtons.count() > 24) return [...checks, { kind: "button_action", label: "CTA audit capacity", passed: false, observation: "More than 24 configured buttons exceeds bounded verification" }];
  for (let index = 0; index < await actionButtons.count(); index++) {
    const button = actionButtons.nth(index);
    if (!await revealNavigation(button)) continue;
    const label = (await button.innerText()).trim() || "CTA";
    const action = await button.getAttribute("data-wb-action");
    const target = await button.getAttribute("data-wb-action-target") || "";
    if (action === "page") {
      const root = page.locator(".wb-website-root[data-wb-page-id]");
      const original = await root.count() === 1 ? await root.getAttribute("data-wb-page-id") : null;
      let destination: string | undefined;
      try {
        const raw: unknown = JSON.parse(original ? await root.getAttribute("data-wb-pages") || "null" : "null");
        if (Array.isArray(raw)) {
          const entries = raw.filter(item => item && typeof item === "object" &&
            typeof item.id === "string" && (item.id === target || item.slug === target || (target === "home" && item.isHome === true)));
          if (entries.length === 1) destination = entries[0].id;
        }
      } catch { /* Malformed page metadata cannot establish a destination. */ }
      if (original && destination === original && await button.isDisabled() &&
        await button.evaluate(node => !!node.closest("nav"))) {
        checks.push({ kind: "button_action", label, passed: true, observation: "Current-page navigation is explicitly disabled" });
        continue;
      }
      if (!original || !destination || destination === original) {
        checks.push({ kind: "button_action", label, passed: false, observation: "Page destination missing, ambiguous or already active" });
        continue;
      }
      const guarded = await page.evaluate(() => {
        const scope = window as unknown as { __wbPageNavigationBlock?: EventListener };
        if (scope.__wbPageNavigationBlock) return false;
        scope.__wbPageNavigationBlock = event => event.preventDefault();
        document.addEventListener("websitebanja:external-navigation", scope.__wbPageNavigationBlock, true);
        return true;
      });
      if (!guarded) {
        checks.push({ kind: "button_action", label, passed: false, observation: "Private page navigation guard unavailable" });
        continue;
      }
      try {
        await button.click({ timeout: 1500 });
        await page.waitForFunction(id => {
          const node = document.querySelector('.wb-website-root[data-wb-page-id]');
          return node?.getAttribute("data-wb-page-id") === id &&
            Array.from(node.querySelectorAll('section,[id^="wb-section-"]')).some(section => {
              const bounds = section.getBoundingClientRect();
              return bounds.width > 0 && bounds.height > 0 && getComputedStyle(section).visibility !== "hidden";
            });
        }, destination, { timeout: 1500 });
        const stateId = `page-transition-${index}`;
        await captureOpenState?.(stateId);
        checks.push({ kind: "page_navigation", label, phase: "open", stateId, passed: true,
          observation: "Real CTA rendered visible destination-page content for visual inspection" });
        const returnButtons = page.locator('button[data-wb-action="page"]');
        let restored = false;
        for (let returnIndex = 0; returnIndex < await returnButtons.count(); returnIndex++) {
          const back = returnButtons.nth(returnIndex);
          const backTarget = await back.getAttribute("data-wb-action-target") || "";
          const matches = await root.evaluate((node, args) => {
            const entries: unknown = JSON.parse(node.getAttribute("data-wb-pages") || "null");
            return Array.isArray(entries) && entries.some(item => item?.id === args.original &&
              (item.id === args.target || item.slug === args.target || (args.target === "home" && item.isHome === true)));
          }, { original, target: backTarget });
          if (!matches || !await back.isVisible()) continue;
          await back.click({ timeout: 1500 });
          await page.waitForFunction(id => document.querySelector('.wb-website-root')?.getAttribute("data-wb-page-id") === id, original, { timeout: 1500 });
          restored = true;
          break;
        }
        if (!restored) throw new Error("No working return-page action");
        checks.push({ kind: "page_navigation", label, phase: "restore", stateId, passed: true, observation: "Return action restored the original rendered page" });
      } catch {
        checks.push({ kind: "button_action", label, passed: false, observation: "Page CTA failed to render its destination or restore the original page" });
        if (await root.getAttribute("data-wb-page-id").catch(() => null) !== original) return checks;
      } finally {
        await page.evaluate(() => {
          const scope = window as unknown as { __wbPageNavigationBlock?: EventListener };
          if (scope.__wbPageNavigationBlock) document.removeEventListener("websitebanja:external-navigation", scope.__wbPageNavigationBlock, true);
          delete scope.__wbPageNavigationBlock;
        });
      }
      continue;
    }
    if (["call", "email", "whatsapp", "url"].includes(action || "")) {
      const installed = await page.evaluate(() => {
        const scope = window as unknown as { __wbNavigationAudit?: { listener: EventListener; destinations: { url: string; mode: string }[] } };
        if (scope.__wbNavigationAudit) return false;
        const destinations: { url: string; mode: string }[] = [];
        const listener: EventListener = event => {
          event.preventDefault();
          const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
          if (detail && typeof detail === "object" && "url" in detail && "mode" in detail && typeof detail.url === "string" && typeof detail.mode === "string") destinations.push({ url: detail.url, mode: detail.mode });
        };
        scope.__wbNavigationAudit = { listener, destinations };
        document.addEventListener("websitebanja:external-navigation", listener, true);
        return true;
      });
      if (!installed) { checks.push({ kind: "button_action", label, passed: false, observation: "External navigation instrumentation unavailable" }); continue; }
      try {
        await button.click({ timeout: 1500 });
        const destinations = await page.evaluate(() => (window as unknown as { __wbNavigationAudit: { destinations: { url: string; mode: string }[] } }).__wbNavigationAudit.destinations);
        const destination = destinations.length === 1 ? destinations[0] : undefined;
        let valid = false;
        if (destination) {
          if (action === "call") valid = destination.mode === "same_tab" && destination.url === `tel:${target.replace(/[^0-9+]/g, "")}` && /^tel:\+?\d{7,15}$/.test(destination.url);
          if (action === "email") valid = destination.mode === "same_tab" && destination.url === `mailto:${target.trim()}` && /^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(destination.url);
          if (action === "whatsapp") {
            const url = new URL(destination.url);
            valid = destination.mode === "new_tab" && url.origin === "https://wa.me" && url.pathname === `/${target.replace(/[^0-9]/g, "")}` && /^\/[1-9]\d{6,14}$/.test(url.pathname);
          }
          if (action === "url") {
            const requested = target.trim();
            const expected = new URL(/^[a-z][a-z\d+.-]*:/i.test(requested) || requested.startsWith("/") ? requested : `https://${requested}`, page.url());
            const actual = new URL(destination.url, page.url());
            valid = destination.mode === "new_tab" && ["http:", "https:"].includes(actual.protocol) && !actual.username && !actual.password && actual.href === expected.href;
          }
        }
        checks.push({ kind: "button_action", label, passed: valid, observation: valid ? "Actual CTA routing matched its destination; external launch suppressed" : "CTA routing absent, duplicated, unsafe or inconsistent with configured destination" });
      } catch { checks.push({ kind: "button_action", label, passed: false, observation: "Guarded external CTA verification failed" }); }
      finally {
        await page.evaluate(() => {
          const scope = window as unknown as { __wbNavigationAudit?: { listener: EventListener } };
          if (scope.__wbNavigationAudit) document.removeEventListener("websitebanja:external-navigation", scope.__wbNavigationAudit.listener, true);
          delete scope.__wbNavigationAudit;
        });
      }
      continue;
    }
    if (action !== "scroll") {
      checks.push({ kind: "button_action", label, passed: false, observation: action === "none" ? "CTA has no configured action" : "Configured CTA requires guarded external/page verification" });
      continue;
    }
    const clean = target.replace(/^#/, "").replace(/^wb-section-/, "");
    const id = await page.evaluate(key => {
      const exact = document.getElementById(`wb-section-${key}`) || document.getElementById(key);
      return exact?.id || Array.from(document.querySelectorAll("[id]")).find(node =>
        node.id.startsWith(`wb-section-${key}_`) || node.id.startsWith(`wb-section-${key}-`))?.id;
    }, clean);
    if (!clean || !id) { checks.push({ kind: "button_action", label, passed: false, observation: "CTA destination section missing" }); continue; }
    try {
      await button.scrollIntoViewIfNeeded({ timeout: 1500 });
      const before = await page.evaluate(() => ({ y: scrollY, canvas: document.getElementById("canvas-scroll-container")?.scrollTop || 0 }));
      await button.click({ timeout: 1500 });
      await page.waitForFunction(({ targetId, initial }) => {
        const section = document.getElementById(targetId);
        if (!section) return false;
        const box = section.getBoundingClientRect();
        const moved = Math.abs(scrollY - initial.y) > 1 || Math.abs((document.getElementById("canvas-scroll-container")?.scrollTop || 0) - initial.canvas) > 1;
        return moved && box.width > 0 && box.height > 0 && box.top < innerHeight * .75 && box.bottom > 0;
      }, { targetId: id, initial: before }, { timeout: 1500 });
      checks.push({ kind: "button_action", label, passed: true, observation: "Real CTA click scrolled to its configured destination" });
    } catch { checks.push({ kind: "button_action", label, passed: false, observation: "CTA click did not reach its configured section" }); }
  }
  const contacts = page.locator('a[href^="tel:"],a[href^="mailto:"],a[href*="wa.me/"]');
  if (await contacts.count() > 40) return [{ kind: "contact_link", label: "Contact audit capacity", passed: false,
    observation: "Too many contact links for bounded verification; publication requires a smaller candidate" }];
  for (let index = 0; index < await contacts.count(); index++) {
    const link = contacts.nth(index);
    if (!await revealNavigation(link)) continue;
    const href = await link.getAttribute("href") || "";
    const label = (await link.innerText()).trim() || href;
    const valid = href.startsWith("tel:") ? /^tel:\+?[\d ()-]{7,}$/.test(href)
      : href.startsWith("mailto:") ? /^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+(?:\?.*)?$/.test(href)
      : /^https:\/\/wa\.me\/[1-9]\d{6,14}(?:\?.*)?$/.test(href);
    await link.evaluate(node => {
      node.removeAttribute("data-wb-audit-activated");
      node.addEventListener("click", event => {
        // Native contact links need no script to activate. Do not launch an app
        // or send a WhatsApp message during generation verification.
        event.preventDefault(); event.stopImmediatePropagation();
        node.setAttribute("data-wb-audit-activated", "true");
      }, { capture: true, once: true });
    });
    try {
      await link.click({ timeout: 5000 });
      const activated = await link.getAttribute("data-wb-audit-activated") === "true";
      checks.push({ kind: "contact_link", label, passed: valid && activated,
        observation: !valid ? "Invalid contact destination" : activated ? "Contact link activated; external delivery intentionally suppressed" : "Contact hit target did not activate" });
    } catch {
      checks.push({ kind: "contact_link", label, passed: false, observation: "Contact link could not be clicked" });
    }
  }
  const forms = page.locator("form");
  if (await forms.count() > 12) return [...checks, { kind: "form_validation", label: "Form audit capacity", passed: false,
    observation: "Too many forms for bounded verification; publication requires a smaller candidate" }];
  for (let index = 0; index < await forms.count(); index++) {
    const form = forms.nth(index);
    if (!await form.isVisible()) continue;
    const label = await form.getAttribute("aria-label") || `Form ${index + 1}`;
    // Empty fields first; never fill plausible customer data or allow submit.
    const fields = form.locator('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]),textarea');
    for (let field = 0; field < await fields.count(); field++) {
      const control = fields.nth(field);
      if (await control.isVisible() && await control.isEditable()) await control.fill("");
    }
    await form.evaluate(node => {
      node.addEventListener("submit", event => { event.preventDefault(); event.stopImmediatePropagation(); }, { capture: true, once: true });
    });
    const submit = form.locator('button[type="submit"],input[type="submit"],button:not([type])').first();
    const invalid = await form.evaluate(node => node instanceof HTMLFormElement && !node.noValidate && !node.checkValidity());
    try {
      if (!await submit.count()) throw new Error("Missing submit control");
      await submit.click({ timeout: 5000 });
      const focusedInvalid = await form.evaluate(node => {
        const active = document.activeElement;
        return (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement)
          && node.contains(active) && !active.validity.valid;
      });
      checks.push({ kind: "form_validation", label, passed: invalid && focusedInvalid,
        observation: invalid && focusedInvalid ? "Empty required form submission blocked and invalid field focused; no inquiry sent" : "Required-field validation or focus behavior missing" });
    } catch {
      checks.push({ kind: "form_validation", label, passed: false, observation: "Form submit control unavailable or not clickable" });
    }
  }
  for (const menu of menus) {
    try {
      if ((await menu.control.getAttribute("aria-expanded") === "true") !== menu.expanded) await menu.control.click({ timeout: 1500 });
      const restored = (await menu.control.getAttribute("aria-expanded") === "true") === menu.expanded;
      checks.push({ kind: "navigation_menu", phase: "restore", label: "Menu restoration", passed: restored, observation: restored ? "Original disclosure state restored" : "Menu did not restore its original state" });
    } catch { checks.push({ kind: "navigation_menu", label: "Menu restoration", passed: false, observation: "Menu disclosure could not restore original state" }); }
  }
  return checks;
}
