import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { auditSafeInteractions } from "../src/lib/intelligence/orchestration/renderedInteractionAudit.ts";
import { auditRenderedTextContrast } from "../src/lib/intelligence/orchestration/renderedTextContrast.ts";
import fs from "node:fs";
import ts from "typescript";

test("page CTA requires actual rendered destination and working return action, not merely an emitted event", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const { broken, viewport } of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]
      .flatMap(viewport => [false, true].map(broken => ({ broken, viewport })))) {
      const page = await browser.newPage({ viewport });
      await page.setContent(`<div class="wb-website-root" data-wb-page-id="home">
        <section id="wb-section-hero">Home</section><button data-wb-action="page" data-wb-action-target="services">Services</button></div>
        <script>
          const root=document.querySelector('.wb-website-root');
          root.dataset.wbPages=JSON.stringify([{id:'home',slug:'',isHome:true},{id:'services',slug:'services'}]);
          root.onclick=event=>{
            if(!event.target.closest('button'))return;
            if(${broken})return;
            const home=root.dataset.wbPageId==='services';
            root.dataset.wbPageId=home?'home':'services';
            root.innerHTML=home?'<section id="wb-section-hero">Home</section><button data-wb-action="page" data-wb-action-target="services">Services</button>':'<section id="wb-section-services">Service details</section><button data-wb-action="page" data-wb-action-target="home">Back home</button>';
          };
        </script>`);
      const captured = [];
      const result = await auditSafeInteractions(page, async id => {
        assert.equal(await page.locator('.wb-website-root').getAttribute('data-wb-page-id'), 'services');
        assert.equal(await page.locator('#wb-section-services').isVisible(), true);
        const contrast = await auditRenderedTextContrast(page);
        assert.equal(contrast.status, 'completed', JSON.stringify(contrast.errors));
        assert.ok(contrast.checks.length > 0 && contrast.checks.every(check => check.passed));
        captured.push(id);
      });
      assert.equal(result.length, broken ? 1 : 2);
      assert.equal(result.every(check => check.passed), !broken, JSON.stringify(result));
      assert.deepEqual(captured, broken ? [] : ['page-transition-0']);
      assert.equal(await page.locator('.wb-website-root').getAttribute('data-wb-page-id'), 'home');
      await page.close();
    }
  } finally { await browser.close(); }
});

test("real desktop/mobile browser activates contact links and blocks invalid form without external delivery", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.setContent(`<a href="tel:+919876543210">Call</a><a href="mailto:owner@example.com">Email</a>
        <a href="https://wa.me/919876543210">WhatsApp</a>
        <form aria-label="Contact"><input aria-label="Name" required><input aria-label="Email" type="email" required><button type="submit">Send</button></form>
        <script>window.sent=0;document.querySelector('form').addEventListener('submit',()=>window.sent++);</script>`);
      const result = await auditSafeInteractions(page);
      assert.equal(result.length, 4);
      assert.ok(result.every(check => check.passed), JSON.stringify(result));
      assert.equal(await page.evaluate(() => window.sent), 0);
      assert.equal(page.url(), "about:blank");
      await page.close();
    }
  } finally { await browser.close(); }
});
test("real browser rejects malformed contact destinations and a form without validation", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<a href="tel:abc">Call</a><a href="mailto:not-an-email">Email</a><a href="https://wa.me/abc">WhatsApp</a>
      <form><input aria-label="Name"><button type="submit">Send</button></form>`);
    const result = await auditSafeInteractions(page);
    assert.equal(result.length, 4);
    assert.ok(result.every(check => !check.passed));
  } finally { await browser.close(); }
});
test("real desktop/mobile section links scroll through native and application handlers; dead links reject", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.setContent(`<nav style="position:fixed;top:0;background:white;z-index:10"><a href="#story">Story</a>
        <a href="#faq" id="faq-link">FAQ</a><a href="#faq" onclick="event.preventDefault()">Visible target, dead action</a><a href="#contact" id="dead-link">Dead CTA</a>
        <a href="#missing">Missing</a><a href="#%ZZ">Malformed</a></nav>
        <div style="height:1800px"></div><section id="story" style="height:600px">Our story</section>
        <section id="faq" style="height:600px">FAQ</section><div style="height:1800px"></div>
        <section id="contact" style="height:600px">Get in touch</section>
        <script>document.getElementById('faq-link').onclick=e=>{e.preventDefault();document.getElementById('faq').scrollIntoView()};
        document.getElementById('dead-link').onclick=e=>e.preventDefault();</script>`);
      const result = await auditSafeInteractions(page);
      assert.equal(result.length, 6);
      assert.deepEqual(result.map(check => check.passed), [true, true, false, false, false, false]);
      assert.ok(result.every(check => check.kind === "section_navigation"));
      await page.close();
    }
  } finally { await browser.close(); }
});
test("real mobile disclosure reopens for each link, restores state and rejects fake expanded controls", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const fixture = broken => `<nav style="position:fixed;top:0;z-index:10;background:white;width:100%">
      <button id="toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobile-nav">Menu</button>
      <div id="mobile-nav" style="display:none"><a href="#story">Story</a><a href="#faq">FAQ</a></div></nav>
      <div style="height:1800px"></div><section id="story" style="height:600px">Story</section><section id="faq" style="height:600px">FAQ</section>
      <script>const toggle=document.getElementById('toggle'),panel=document.getElementById('mobile-nav');
      toggle.onclick=()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));panel.style.display=${broken ? "'none'" : "open?'block':'none'"}};
      panel.onclick=e=>{if(e.target.closest('a')){toggle.setAttribute('aria-expanded','false');panel.style.display='none'}};</script>`;
    await page.setContent(fixture(false));
    const captured = [];
    const good = await auditSafeInteractions(page, async id => {
      assert.equal(await page.locator("#mobile-nav").isVisible(), true);
      const contrast = await auditRenderedTextContrast(page);
      assert.equal(contrast.status, "completed", JSON.stringify(contrast.errors));
      captured.push(id);
    });
    assert.ok(good.every(check => check.passed), JSON.stringify(good));
    assert.equal(good.filter(check => check.kind === "section_navigation").length, 2);
    assert.deepEqual(captured, ["navigation-menu-0"]);
    assert.equal(await page.locator("#toggle").getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("#mobile-nav").isVisible(), false);
    await page.setContent(fixture(true));
    const bad = await auditSafeInteractions(page);
    assert.ok(bad.some(check => check.kind === "navigation_menu" && !check.passed));
    await page.close();
  } finally { await browser.close(); }
});
test("real generated CTA handler reaches booking alias; dead and missing destination buttons reject", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const compile = relative => ts.transpileModule(fs.readFileSync(new URL(`../src/lib/${relative}.ts`, import.meta.url), "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.setContent(`<div style="position:fixed;top:0;z-index:10;background:white">
        <button id="real">Book a visit</button><button data-wb-action="scroll" data-wb-action-target="about">Dead action</button>
        <button data-wb-action="scroll" data-wb-action-target="missing">Missing section</button></div>
        <div style="height:1800px"></div><section id="wb-section-booking" style="height:600px">Get in touch</section>
        <div style="height:1800px"></div><section id="wb-section-about" style="height:600px">Story</section>`);
      await page.addScriptTag({ content: `(()=>{const sections={exports:{}};
        ((module,exports)=>{${compile("intelligence/planning/sectionOrder")}})(sections,sections.exports);
        const actions={exports:{}};((module,exports,require)=>{${compile("buttonActions")}})(actions,actions.exports,()=>sections.exports);
        const button=document.getElementById('real'), context={sectionOrder:['hero','about','booking','footer']};
        const attrs=actions.exports.buttonActionAttributes(undefined,'contact',context.sectionOrder);
        for(const [key,value] of Object.entries(attrs))button.setAttribute(key,value);
        button.onclick=e=>actions.exports.handleButtonActionClick(undefined,'contact',e,context);})();` });
      const result = await auditSafeInteractions(page);
      assert.deepEqual(result.map(check => check.passed), [true, false, false]);
      assert.ok(result.every(check => check.kind === "button_action"));
      assert.equal(await page.locator("#real").getAttribute("data-wb-action-target"), "booking");
      await page.close();
    }
  } finally { await browser.close(); }
});
test("real external CTA handlers match configured destinations without launching apps/pages; unsafe and dishonest actions reject", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const compile = relative => ts.transpileModule(fs.readFileSync(new URL(`../src/lib/${relative}.ts`, import.meta.url), "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    await page.setContent(`<div id="buttons"></div>`);
    await page.addScriptTag({ content: `(()=>{const sections={exports:{}};
      ((module,exports)=>{${compile("intelligence/planning/sectionOrder")}})(sections,sections.exports);
      const actions={exports:{}};((module,exports,require)=>{${compile("buttonActions")}})(actions,actions.exports,()=>sections.exports);
      window.launched=0;window.open=()=>{window.launched++;throw new Error('External launch forbidden')};
      const configurations=[{type:'call',target:'+91 9876543210'},{type:'email',target:'owner@example.com'},
        {type:'whatsapp',target:'+91 9876543210'},{type:'url',target:'https://example.com/products'},
        {type:'url',target:'java\\nscript:alert(1)'},{type:'call',target:'+919876543210'},
        {type:'email',target:'owner@example.com'},{type:'url',target:'https://example.com'}];
      configurations.forEach((action,index)=>{const button=document.createElement('button');button.textContent='Action '+index;
        for(const [key,value]of Object.entries(actions.exports.buttonActionAttributes(action,'contact')))button.setAttribute(key,value);
        if(index===5)button.onclick=()=>{};
        else if(index===6)button.onclick=e=>actions.exports.handleButtonActionClick({type:'email',target:'wrong@example.com'},'contact',e);
        else if(index===7)button.onclick=e=>{actions.exports.handleButtonActionClick(action,'contact',e);actions.exports.handleButtonActionClick(action,'contact',e)};
        else button.onclick=e=>actions.exports.handleButtonActionClick(action,'contact',e);
        document.getElementById('buttons').append(button);});
      window.safeActionUrls=['javascript:alert(1)','data:text/html,x','vbscript:alert(1)','https://user:password@example.com','java\\nscript:alert(1)'].map(actions.exports.sanitizeActionUrl);
      })();` });
    const result = await auditSafeInteractions(page);
    assert.deepEqual(result.map(check => check.passed), [true, true, true, true, false, false, false, false]);
    assert.equal(await page.evaluate(() => window.launched), 0);
    assert.equal(page.url(), "about:blank");
    assert.equal(await page.evaluate(() => typeof window.__wbNavigationAudit), "undefined");
    assert.deepEqual(await page.evaluate(() => window.safeActionUrls), ["#", "#", "#", "#", "#"]);
  } finally { await browser.close(); }
});
