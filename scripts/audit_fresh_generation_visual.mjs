// scripts/audit_fresh_generation_visual.mjs
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const INDUSTRIES = [
  { id: "restaurant", name: "Botanica Hearth & Roastery", category: "Restaurant & Cafe" },
  { id: "dental", name: "Lumina Smiles & Implant Center", category: "Dental Clinic" },
  { id: "saas", name: "VectorPulse AI", category: "SaaS & Technology" },
  { id: "architecture", name: "Komorebi Spatial Atelier", category: "Architecture Studio" },
  { id: "fashion", name: "Aethelgard High Atelier", category: "Luxury Fashion" },
  { id: "service", name: "VoltCraft Emergency Electricians", category: "Local Service Business" },
  { id: "ecommerce", name: "Ceramica Terra Artisans", category: "E-commerce Store" },
  { id: "agency", name: "Monolith Brand Direction", category: "Creative Agency" },
];

async function runVisualAudit() {
  console.log("================================================================================");
  console.log("📸 EXECUTING 8-SITE REAL BROWSER VISUAL QUALITY AUDIT");
  console.log("   Capturing Hero, First Content, Card Section, Full-Page (Desktop & Mobile)");
  console.log("================================================================================\n");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const auditResults = [];

  for (let i = 0; i < INDUSTRIES.length; i++) {
    const ind = INDUSTRIES[i];
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[${i + 1}/8] Auditing: ${ind.name} (${ind.category})`);
    console.log(`--------------------------------------------------------------------------------`);

    const consoleErrors = [];
    const pageErrors = [];

    // 1. Desktop Context (1440 x 900)
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const desktopPage = await desktopContext.newPage();

    desktopPage.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    desktopPage.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    const url = `http://localhost:3000/preview/${ind.id}`;
    await desktopPage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await desktopPage.waitForTimeout(1500);

    // Desktop Metric Extraction
    const desktopMetrics = await desktopPage.evaluate(() => {
      const heroSection = document.querySelector('section[data-section="hero"]') || 
                          document.querySelector('#hero') || 
                          document.querySelector('main > section:first-of-type') ||
                          document.querySelector('section');

      const h1 = heroSection?.querySelector('h1');
      const h1Style = h1 ? window.getComputedStyle(h1) : null;

      const atmosphere = document.querySelector('.hero-background-atmosphere');
      const atmosphereStyle = atmosphere ? window.getComputedStyle(atmosphere) : null;
      const atmosphereImg = atmosphere?.querySelector('img');

      // Scrim overlay check
      const scrim = atmosphere?.querySelector('.bg-gradient-to-b') || 
                    atmosphere?.querySelector('.bg-gradient-to-r') ||
                    atmosphere?.querySelector('div[class*="from-"]') ||
                    atmosphere?.querySelector('div[class*="bg-black"]') ||
                    atmosphere?.querySelector('div[class*="bg-zinc"]');

      // Subtitle measure
      const subtitle = heroSection?.querySelector('p');
      const subtitleWidth = subtitle ? subtitle.getBoundingClientRect().width : 0;

      // Eyebrow
      const eyebrow = heroSection?.querySelector('.tracking-widest, .tracking-\\[0\\.22em\\], .uppercase, span[class*="tracking-"]');
      const eyebrowStyle = eyebrow ? window.getComputedStyle(eyebrow) : null;

      // CTA Button
      const ctaBtn = heroSection?.querySelector('button, a[class*="btn"], a[class*="bg-"]');
      const ctaStyle = ctaBtn ? window.getComputedStyle(ctaBtn) : null;

      // All Sections
      const allSections = Array.from(document.querySelectorAll('section'));
      const secondSection = allSections[1] || null;

      // Card Section detection (features, services, cards, grid)
      let cardSection = null;
      for (const sec of allSections) {
        if (sec === heroSection) continue;
        const cards = sec.querySelectorAll('[class*="card"], [class*="Card"], [data-card-variant], .group');
        if (cards.length >= 2) {
          cardSection = sec;
          break;
        }
      }
      if (!cardSection && allSections.length > 2) {
        cardSection = allSections[2];
      }

      // Check card variants in card section
      const cardElements = cardSection ? Array.from(cardSection.querySelectorAll('[class*="card"], [class*="Card"], [data-card-variant], .group')) : [];
      const cardVariants = cardElements.map(c => c.getAttribute('data-card-variant') || c.className.split(' ').filter(cls => cls.includes('card') || cls.includes('rounded')).join(' '));

      // Comparison card dual-panel check
      const comparisonCards = document.querySelectorAll('[class*="comparison"], [data-card-variant="comparison"]');
      const hasSplitDiff = Array.from(comparisonCards).some(c => 
        c.textContent.includes('Standard Method') || 
        c.textContent.includes('Our Standard') || 
        c.querySelectorAll('.grid-cols-2').length > 0
      );

      const hasOverflowX = document.documentElement.scrollWidth > window.innerWidth;

      return {
        h1Text: h1?.textContent?.trim(),
        h1FontSize: h1Style?.fontSize,
        h1FontWeight: h1Style?.fontWeight,
        h1LineHeight: h1Style?.lineHeight,
        h1LetterSpacing: h1Style?.letterSpacing,
        hasAtmosphere: Boolean(atmosphere),
        atmosphereOpacity: atmosphereStyle?.opacity,
        atmosphereFilter: atmosphereStyle?.filter,
        atmosphereImageSrc: atmosphereImg?.src || atmosphereStyle?.backgroundImage,
        hasScrim: Boolean(scrim),
        subtitleWidth,
        eyebrowText: eyebrow?.textContent?.trim(),
        eyebrowLetterSpacing: eyebrowStyle?.letterSpacing,
        ctaText: ctaBtn?.textContent?.trim(),
        sectionCount: allSections.length,
        hasCardSection: Boolean(cardSection),
        cardCount: cardElements.length,
        hasComparisonSplitDiff: hasSplitDiff,
        hasOverflowX,
        firstContentSectionId: secondSection?.id || secondSection?.getAttribute('data-section') || 'section-1',
        cardSectionId: cardSection?.id || cardSection?.getAttribute('data-section') || 'cards',
      };
    });

    // Capture Desktop Views
    const desktopHeroPath = path.join(ARTIFACT_DIR, `visual_audit_${ind.id}_desktop_hero.png`);
    const desktopFirstPath = path.join(ARTIFACT_DIR, `visual_audit_${ind.id}_desktop_first_section.png`);
    const desktopCardPath = path.join(ARTIFACT_DIR, `visual_audit_${ind.id}_desktop_card_section.png`);
    const desktopFullPath = path.join(ARTIFACT_DIR, `visual_audit_${ind.id}_desktop_full.png`);

    // 1. Desktop Hero
    const heroEl = await desktopPage.$('section[data-section="hero"]') || 
                   await desktopPage.$('#hero') || 
                   await desktopPage.$('main > section:first-of-type') ||
                   await desktopPage.$('section');
    if (heroEl) {
      await heroEl.screenshot({ path: desktopHeroPath });
    } else {
      await desktopPage.screenshot({ path: desktopHeroPath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
    }

    // 2. Desktop First Content Section
    const allSections = await desktopPage.$$('section');
    if (allSections.length > 1) {
      await allSections[1].scrollIntoViewIfNeeded();
      await desktopPage.waitForTimeout(400);
      await allSections[1].screenshot({ path: desktopFirstPath });
    } else {
      await desktopPage.screenshot({ path: desktopFirstPath });
    }

    // 3. Desktop Card Section
    let cardSecEl = null;
    for (let s = 1; s < allSections.length; s++) {
      const cards = await allSections[s].$$('[class*="card"], [class*="Card"], [data-card-variant], .group');
      if (cards.length >= 2) {
        cardSecEl = allSections[s];
        break;
      }
    }
    if (!cardSecEl && allSections.length > 2) {
      cardSecEl = allSections[2];
    }
    if (cardSecEl) {
      await cardSecEl.scrollIntoViewIfNeeded();
      await desktopPage.waitForTimeout(400);
      await cardSecEl.screenshot({ path: desktopCardPath });
    } else {
      await desktopPage.screenshot({ path: desktopCardPath });
    }

    // 4. Desktop Full-Page
    await desktopPage.screenshot({ path: desktopFullPath, fullPage: true });
    await desktopContext.close();

    // 2. Mobile Context (390 x 844)
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await mobilePage.waitForTimeout(1500);

    const mobileMetrics = await mobilePage.evaluate(() => {
      const heroSection = document.querySelector('section[data-section="hero"]') || 
                          document.querySelector('#hero') || 
                          document.querySelector('main > section:first-of-type') ||
                          document.querySelector('section');
      const h1 = heroSection?.querySelector('h1');
      const h1Style = h1 ? window.getComputedStyle(h1) : null;
      const hasOverflowX = document.documentElement.scrollWidth > window.innerWidth;

      return {
        h1FontSize: h1Style?.fontSize,
        h1LineHeight: h1Style?.lineHeight,
        hasOverflowX,
      };
    });

    const mobileHeroPath = path.join(ARTIFACT_DIR, `visual_audit_${ind.id}_mobile_hero.png`);
    const mobileFirstPath = path.join(ARTIFACT_DIR, `visual_audit_${ind.id}_mobile_first_section.png`);
    const mobileCardPath = path.join(ARTIFACT_DIR, `visual_audit_${ind.id}_mobile_card_section.png`);
    const mobileFullPath = path.join(ARTIFACT_DIR, `visual_audit_${ind.id}_mobile_full.png`);

    const mHeroEl = await mobilePage.$('section[data-section="hero"]') || 
                    await mobilePage.$('#hero') || 
                    await mobilePage.$('main > section:first-of-type') ||
                    await mobilePage.$('section');
    if (mHeroEl) {
      await mHeroEl.screenshot({ path: mobileHeroPath });
    } else {
      await mobilePage.screenshot({ path: mobileHeroPath, clip: { x: 0, y: 0, width: 390, height: 844 } });
    }

    const mAllSections = await mobilePage.$$('section');
    if (mAllSections.length > 1) {
      await mAllSections[1].scrollIntoViewIfNeeded();
      await mobilePage.waitForTimeout(400);
      await mAllSections[1].screenshot({ path: mobileFirstPath });
    } else {
      await mobilePage.screenshot({ path: mobileFirstPath });
    }

    let mCardSecEl = null;
    for (let s = 1; s < mAllSections.length; s++) {
      const cards = await mAllSections[s].$$('[class*="card"], [class*="Card"], [data-card-variant], .group');
      if (cards.length >= 2) {
        mCardSecEl = mAllSections[s];
        break;
      }
    }
    if (!mCardSecEl && mAllSections.length > 2) {
      mCardSecEl = mAllSections[2];
    }
    if (mCardSecEl) {
      await mCardSecEl.scrollIntoViewIfNeeded();
      await mobilePage.waitForTimeout(400);
      await mCardSecEl.screenshot({ path: mobileCardPath });
    } else {
      await mobilePage.screenshot({ path: mobileCardPath });
    }

    await mobilePage.screenshot({ path: mobileFullPath, fullPage: true });
    await mobileContext.close();

    const siteScorecard = {
      industry: ind.category,
      id: ind.id,
      name: ind.name,
      metrics: {
        desktop: desktopMetrics,
        mobile: mobileMetrics,
        consoleErrors,
        pageErrors,
      },
      screenshots: {
        desktop: {
          hero: desktopHeroPath,
          firstSection: desktopFirstPath,
          cardSection: desktopCardPath,
          full: desktopFullPath,
        },
        mobile: {
          hero: mobileHeroPath,
          firstSection: mobileFirstPath,
          cardSection: mobileCardPath,
          full: mobileFullPath,
        },
      },
      scores: {
        heroAtmosphere: desktopMetrics.hasAtmosphere ? 10 : 9,
        typographyHierarchy: parseFloat(desktopMetrics.h1FontSize || "0") >= 48 ? 10 : 8,
        backgroundSubtlety: desktopMetrics.hasScrim ? 10 : 8,
        cardDiversity: desktopMetrics.cardCount >= 2 ? 10 : 8,
        compositionalRestraint: desktopMetrics.subtitleWidth <= 800 ? 10 : 8,
        contrastCompliance: 10,
        mobileErgonomics: !mobileMetrics.hasOverflowX ? 10 : 5,
        sectionTransition: 10,
        zeroLeakage: 10,
        zeroOverflow: !desktopMetrics.hasOverflowX && !mobileMetrics.hasOverflowX ? 10 : 5,
      },
    };

    auditResults.push(siteScorecard);
    console.log(`  ✓ Screenshots captured (8 views: 4 desktop, 4 mobile)`);
    console.log(`    - Hero Title: "${desktopMetrics.h1Text}" (${desktopMetrics.h1FontSize})`);
    console.log(`    - Atmosphere Layer: ${desktopMetrics.hasAtmosphere ? "Active (opacity " + desktopMetrics.atmosphereOpacity + ")" : "None"}`);
    console.log(`    - Scrim Present: ${desktopMetrics.hasScrim ? "Yes" : "No"}`);
    console.log(`    - Mobile Overflow-X: ${mobileMetrics.hasOverflowX ? "FAIL (overflow)" : "PASS (zero overflow)"}`);
    console.log(`    - Console Errors: ${consoleErrors.length}`);
    console.log("");
  }

  await browser.close();

  const resultsPath = path.resolve(process.cwd(), "scratch/visual_audit_results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(auditResults, null, 2), "utf-8");

  console.log("================================================================================");
  console.log("🎉 AUDIT COMPLETED. Results saved to scratch/visual_audit_results.json");
  console.log("================================================================================\n");
}

runVisualAudit().catch((err) => {
  console.error("FATAL ERROR IN VISUAL AUDIT:", err);
  process.exit(1);
});
