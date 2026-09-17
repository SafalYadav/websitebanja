// tests/regression_boss_validation_60.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { createJiti } from "jiti";

const ROOT = process.cwd();
const jiti = createJiti(import.meta.url, {
  alias: {
    "@/": path.resolve(ROOT, "src") + "/",
  },
});

const { generateDesignStrategy } = jiti("@/lib/ai/designStrategy.ts");
const { normalizeWebsiteData } = jiti("@/lib/normalizeWebsite.ts");
const { evaluateCandidateSimilarities, DEFAULT_UNIQUENESS_CONFIG } = jiti("@/lib/agents/uniqueness/similarity.ts");
const { extractDetailedDesignFingerprint } = jiti("@/lib/agents/uniqueness/fingerprint.ts");
const { recordCandidateFromWebsite, clearLocalCandidates } = jiti("@/lib/agents/uniqueness/candidateSelector.ts");
const { analyzeVisualQuality } = jiti("@/lib/agents/boss/visualQualityAnalyzer.ts");
const { getBossResearchReport } = jiti("@/lib/agents/boss/research/researchRepository.ts");

const ARTIFACTS_DIR = "/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a";
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, "scratch/regression_final_boss_screenshots");
const PREVIEWS_DIR = path.resolve(ROOT, "scratch/previews");

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

// 60 Highly Diverse Industry Business Briefs
const BRIEFS_60 = [
  // 1-10
  { businessName: "Tandoor & Thali Heritage", category: "Restaurant", description: "Heritage North Indian tandoori restaurant and live clay-oven grill in Lucknow, serving slow-cooked dal makhani, Awadhi biryanis, and roomali rotis.", threeD: false },
  { businessName: "Artisan Roastery & Lab", category: "Cafe", description: "Third-wave micro-roastery and specialty pour-over cafe in Bengaluru, crafting single-origin Arabica brews and artisanal sourdough.", threeD: false },
  { businessName: "The Oberoi Palms Resort", category: "Resort", description: "Luxury beachfront Ayurvedic wellness resort in Goa with private plunge villas, oceanfront yoga shalas, and organic coastal dining.", threeD: false },
  { businessName: "Aura Imperial Boutique Hotel", category: "Hotel", description: "Contemporary heritage boutique hotel in Jaipur offering bespoke concierge tours, rooftop dining, and marble courtyard pools.", threeD: false },
  { businessName: "Apex Realty Partners", category: "Real estate", description: "High-end luxury residential and commercial advisory firm in Mumbai helping founders and HNIs acquire bespoke sea-facing estates.", threeD: false },
  { businessName: "Studio Vayu Interiors", category: "Interior design", description: "Bespoke residential interior architecture and furniture design studio in Delhi crafting warm minimalist sustainable living spaces.", threeD: false },
  { businessName: "Morphosis Atelier", category: "Architecture", description: "Contemporary tropical modernist architectural practice creating carbon-neutral villas, civic institutions, and biophilic office campuses.", threeD: true },
  { businessName: "CloudScale Analytics", category: "SaaS", description: "Enterprise cloud data pipeline optimization and cost-intelligence telemetry platform for high-growth engineering teams.", threeD: false },
  { businessName: "Synapse Neural Labs", category: "AI startup", description: "Autonomous multimodal AI agent operating system for real-time document reasoning, voice orchestration, and computer task automation.", threeD: true },
  { businessName: "RupeeFlow Payments", category: "Fintech", description: "Next-generation UPI-first cross-border payment gateway and multi-currency merchant treasury platform for Indian exporters.", threeD: false },

  // 11-20
  { businessName: "Pulse Precision Diagnostics", category: "Healthcare", description: "Accredited preventive diagnostic pathology labs and genomic screening centers across North India with 2-hour digital report dispatch.", threeD: false },
  { businessName: "Ironclad Strength Gym", category: "Fitness", description: "Elite strength and conditioning training facility in Chandigarh with Olympic lifting platforms, power cages, and certified athletic coaches.", threeD: false },
  { businessName: "Kavach Legal Associates", category: "Law firm", description: "Corporate legal counsel specializing in cross-border M&A, intellectual property litigation, tech regulation, and founder equity structuring.", threeD: false },
  { businessName: "Stratex Global Advisory", category: "Consulting", description: "C-suite strategic management consultancy guiding industrial enterprises through supply chain resilience and ESG transformation.", threeD: false },
  { businessName: "Vidyapeeth Academy", category: "Education", description: "Premier entrance coaching institute and STEM residential school mentoring aspiring engineers and medical researchers.", threeD: false },
  { businessName: "Pinnacle Leadership Coaching", category: "Coaching", description: "Executive performance coaching and board-level leadership transition retreats for scale-up founders and enterprise directors.", threeD: false },
  { businessName: "Wanderlust Himalayan Treks", category: "Travel", description: "Customized high-altitude trekking expeditions, eco-camping journeys, and cultural road trips across Himachal and Ladakh.", threeD: false },
  { businessName: "SwiftRide Premium Car Hire", category: "Car rental", description: "Luxury chauffeur-driven and self-drive electric vehicle fleet rental in Delhi NCR for executive travel and weddings.", threeD: false },
  { businessName: "Prism Lens Studios", category: "Photography", description: "Fine-art portrait, architecture, and commercial editorial photography studio working with global fashion houses and design brands.", threeD: false },
  { businessName: "Saat Phere Luxury Weddings", category: "Wedding", description: "Full-service destination wedding production house in Udaipur designing breathtaking palaces, royal decor, and seamless guest hospitality.", threeD: false },

  // 21-30
  { businessName: "Vastra Heritage Handlooms", category: "Fashion", description: "Slow-fashion sustainable apparel brand curating handwoven Chanderi silks, organic khadi shirts, and contemporary ethnic streetwear.", threeD: false },
  { businessName: "Zayka Gourmet Provisions", category: "E-commerce", description: "Direct-to-consumer artisanal spice blends, cold-pressed Himalayan honeys, and stone-ground organic condiments shipped worldwide.", threeD: false },
  { businessName: "BuildCraft Infrastructure", category: "Construction", description: "Tier-1 commercial construction contracting and turnkey industrial warehousing developer with 30 years of project delivery.", threeD: false },
  { businessName: "Annapurna Organic Farms", category: "Agriculture", description: "Regenerative farm collective producing certified chemical-free indigenous heirloom grains, millets, and farm-fresh dairy.", threeD: false },
  { businessName: "TransIndia Express Logistics", category: "Logistics", description: "Cold-chain pharmaceutical transport and multimodal freight fulfillment network across 450+ Indian commercial hubs.", threeD: false },
  { businessName: "Tress & Glow Organic Salon", category: "Beauty salon", description: "Eco-friendly luxury hair spa and organic skincare retreat in Pune offering botanical hair treatments and bespoke bridal beauty.", threeD: false },
  { businessName: "DentaPure Advanced Smile Clinic", category: "Dental clinic", description: "Modern painless cosmetic dentistry, 3D laser teeth whitening, and invisible orthodontic aligner studio.", threeD: false },
  { businessName: "Veloce Performance Auto Lab", category: "Automotive", description: "High-performance European automotive tuning, detailing, custom ceramic coating, and precision diagnostic workshop.", threeD: true },
  { businessName: "Utsav Grand Event Creators", category: "Event company", description: "High-profile corporate summits, musical festivals, and luxury celebratory gala productions with immersive stagecraft.", threeD: false },
  { businessName: "Karan Sen Design Portfolio", category: "Portfolio", description: "Personal portfolio of an award-winning digital product designer and design systems specialist based in Bengaluru.", threeD: true },

  // 31-40
  { businessName: "Hypershift Creative Agency", category: "Agency", description: "Full-funnel growth creative agency blending cinematic 3D visual campaigns, performance advertising, and viral brand strategy.", threeD: true },
  { businessName: "FixRight Home Services", category: "Local service business", description: "Reliable verified on-demand plumbing, electrical, and HVAC maintenance services for modern residential communities.", threeD: false },
  { businessName: "The Baker Table Artisan Boulangerie", category: "Bakery", description: "European-style slow-fermented sourdough bakery, hand-laminated viennoiserie, and French patisserie in Dehradun.", threeD: false },
  { businessName: "Nirvana Ayurvedic Sanctuary", category: "Spa & Wellness", description: "Holistic Panchakarma retreat and traditional therapeutic Ayurvedic wellness spa nestled amidst Kerala backwaters.", threeD: false },
  { businessName: "UrbanNest Luxury Penthouses", category: "Real estate", description: "Ultra-luxury high-rise penthouses and serviced residences in Gurugram featuring private sky gardens and concierge clubs.", threeD: false },
  { businessName: "Sovereign Wealth Management", category: "Fintech", description: "SEBI-registered portfolio management and private wealth stewardship firm serving business families across India.", threeD: false },
  { businessName: "CodeCraft Dev Academy", category: "Education", description: "Intensive full-stack software engineering bootcamp with guaranteed career apprenticeships at venture-backed startups.", threeD: false },
  { businessName: "CineCraft Film Productions", category: "Media Production", description: "Award-winning documentary, commercial video, and high-end brand film production house with RED & ARRI cinema camera gear.", threeD: false },
  { businessName: "Verdant Green Landscaping", category: "Landscape Architecture", description: "Biophilic urban rooftop gardens, ecological residential landscape design, and drip-irrigated outdoor living spaces.", threeD: false },
  { businessName: "Solaris Clean Energy Solutions", category: "Renewable Energy", description: "Commercial rooftop solar power installation and battery microgrid EPC contractor reducing industrial carbon footprints.", threeD: false },

  // 41-50
  { businessName: "Dharma Yoga & Meditation Ashram", category: "Fitness & Wellness", description: "Traditional classical Hatha yoga school and mindfulness meditation retreat center on the holy banks of Rishikesh.", threeD: false },
  { businessName: "Velvet & Vine Cocktail Bar", category: "Bar & Lounge", description: "Intimate speakeasy cocktail lounge and wine bar featuring house-infused botanical gins, mezcal flights, and jazz trios.", threeD: false },
  { businessName: "Apex Robotics Automation", category: "Robotics & Hardware", description: "Industrial autonomous mobile robots (AMRs) and automated warehouse sorting systems for large-scale e-commerce logistics.", threeD: true },
  { businessName: "Aarogya Family Polyclinic", category: "Healthcare", description: "Multi-specialty outpatient healthcare clinic offering pediatric care, cardiology checkups, and tele-consultation.", threeD: false },
  { businessName: "SilverOak Private School", category: "Education", description: "Progressive experiential learning international day boarding school with Olympic sports facilities and robotics labs.", threeD: false },
  { businessName: "Indus Maritime Shipping", category: "Logistics", description: "Ocean container shipping, customs clearance, and global freight forwarding bridging Indian ports to European trade lanes.", threeD: false },
  { businessName: "LuxeDwell Modular Kitchens", category: "Interior design", description: "German-engineered modular kitchens, quartz countertops, and smart soft-close storage cabinetry with a 10-year warranty.", threeD: false },
  { businessName: "TerraCraft Ceramic Studios", category: "Ceramics & Craft", description: "Handmade stoneware ceramic dinnerware and sculptural pottery studio conducting weekend masterclasses.", threeD: false },
  { businessName: "ProClean Commercial Facilities", category: "Local service business", description: "Enterprise facility management, corporate deep cleaning, and sanitization services for IT campuses and hospitals.", threeD: false },
  { businessName: "Glitz & Glam Bridal Studio", category: "Fashion", description: "Bespoke bridal lehengas, hand-embroidered zardozi ensembles, and royal groom sherwanis for destination nuptials.", threeD: false },

  // 51-60
  { businessName: "Samudra Seafood Kitchen", category: "Restaurant", description: "Coastal seafood dining experience showcasing fresh catch from the Arabian Sea, Mangalorean ghee roasts, and coconut curries.", threeD: false },
  { businessName: "Nomad Haven Co-Living Spaces", category: "Real estate", description: "Vibrant community-driven co-living and flexible workspace spaces designed for remote engineers and digital creators in Goa.", threeD: false },
  { businessName: "FinPulse Micro-Lending", category: "Fintech", description: "Fair low-interest working capital credit lines for small neighborhood kirana merchants and retail entrepreneurs.", threeD: false },
  { businessName: "Vigyan BioTech Research", category: "Biotechnology", description: "Agricultural biotechnology lab developing drought-resistant seed varietals and bio-organic pest repellents.", threeD: true },
  { businessName: "SoundStage Recording Studio", category: "Audio Production", description: "Acoustically isolated Dolby Atmos music mastering, podcast recording, and voiceover studio in Mumbai.", threeD: false },
  { businessName: "Heritage Royal Haveli", category: "Hotel", description: "18th-century restored palace hotel in Shekhawati adorned with fresco murals, courtyards, and authentic Rajasthani folk dinners.", threeD: false },
  { businessName: "Zenith Cloud Security", category: "SaaS", description: "Zero-trust identity access management and automated cloud infrastructure vulnerability scanner for compliance-first firms.", threeD: false },
  { businessName: "GreenThumb Nursery & Botanicals", category: "Agriculture", description: "Exotic indoor houseplants, rare tropical succulents, and organic vertical garden installations for modern homes.", threeD: false },
  { businessName: "TurboFleet Truck Logistics", category: "Logistics", description: "GPS-tracked temperature-controlled heavy freight carrier fleet connecting agricultural belts to metropolitan food terminals.", threeD: false },
  { businessName: "Kalyani Handcrafted Jewelry", category: "Fashion & Jewelry", description: "Ancestral 22K temple gold jewelry, certified polki diamonds, and hallmarked heritage bridal ornaments.", threeD: true }
];

clearLocalCandidates();

async function runFull60WebsiteValidation() {
  console.log("================================================================================");
  console.log("   WEBSITEBANJA: FINAL PRE-PRODUCTION VALIDATION                                 ");
  console.log(`   Executing 60 Real Website Generations Across 34+ Industries                  `);
  console.log("================================================================================\n");

  const candidates = [];
  const globalUsedImages = new Set();
  const runDataList = [];

  const featuresVariantCounts = {};
  const paletteCounts = {};
  const archetypeCounts = {};
  const cardFamilyCounts = {};

  let total2D = 0;
  let total3D = 0;

  // ---------------------------------------------------------------------------
  // STEP 1: GENERATE & UNIQUENESS VERIFY ALL 60 WEBSITES
  // ---------------------------------------------------------------------------
  for (let idx = 0; idx < BRIEFS_60.length; idx++) {
    const brief = BRIEFS_60[idx];
    const runNum = idx + 1;
    const runId = `val_60_run_${runNum}`;
    const threeDPreference = brief.threeD ? "yes" : "no";

    if (brief.threeD) total3D++;
    else total2D++;

    const recentCandidates = candidates.slice(-5);
    const avoidArchetypes = recentCandidates.map((c) => c.fingerprint?.visualArchetype).filter(Boolean);
    const avoidColors = recentCandidates.map((c) => c.primaryColor).filter(Boolean);
    const avoidPalettes = recentCandidates.map((c) => c.paletteName).filter(Boolean);
    const avoidCards = recentCandidates.map((c) => c.cardFamily).filter(Boolean);
    const avoidBackgrounds = recentCandidates.map((c) => c.backgroundType).filter(Boolean);
    const avoidFeatureLayouts = recentCandidates.map((c) => c.featuresLayoutVariant).filter(Boolean);

    let strategy = generateDesignStrategy({
      category: brief.category,
      businessName: brief.businessName,
      description: brief.description,
      threeDPreference,
      avoidPatterns: [
        ...avoidArchetypes,
        ...avoidColors,
        ...avoidPalettes,
        ...avoidCards,
        ...avoidBackgrounds,
        ...avoidFeatureLayouts,
      ],
      recentFingerprints: recentCandidates.map((c) => ({
        visualArchetype: c.fingerprint?.visualArchetype,
        colorDirection: c.paletteName || c.primaryColor,
        primaryColor: c.primaryColor,
        paletteName: c.paletteName,
        cardFamily: c.cardFamily,
        featuresLayoutVariant: c.featuresLayoutVariant,
        featuresGeometry: c.featuresGeometry,
        antiRepetitionFingerprint: c.fingerprint?.antiRepetitionFingerprint,
      })),
      seed: `${brief.businessName}_${runNum}_${Date.now()}`,
    });

    const rawData = {
      businessName: brief.businessName,
      category: brief.category,
      description: brief.description,
      brand: {
        businessName: brief.businessName,
        tagline: brief.description.split(",")[0],
        primaryColor: strategy.colorSystem.primary,
        secondaryColor: strategy.colorSystem.secondary,
        visualArchetype: strategy.visualArchetype,
      },
      hero: {
        title: `Welcome to ${brief.businessName}`,
        subtitle: brief.description,
        button: "Explore More",
        layoutVariant: strategy.heroType,
      },
      about: {
        title: `About ${brief.businessName}`,
        story: `${brief.businessName} is committed to bringing unmatched excellence and craftsmanship in ${brief.category}.`,
        mission: `Delivering premier solutions with unwavering focus on trust, precision, and client satisfaction.`,
      },
      services: {
        title: "Our Core Offerings",
        subtitle: "Bespoke services tailored to exceed your expectations.",
        items: [
          { title: "Signature Experience", description: "Tailored directly to your unique preferences with expert care." },
          { title: "Standard Consultation", description: "In-depth discovery, diagnostic assessment, and custom roadmap." },
          { title: "Executive Program", description: "Comprehensive turnkey engagement designed for high-impact results." }
        ],
      },
      features: {
        title: "Why Partner With Us",
        subtitle: "Built upon verifiable standards and craftsmanship.",
        items: [
          { title: "Uncompromising Quality", description: "Verified standards and meticulous attention to detail.", metric: "100%", metricLabel: "Satisfaction" },
          { title: "Experienced Specialists", description: "Over two decades of proven mastery in our craft.", metric: "25+", metricLabel: "Years Mastery" },
          { title: "Personalized Care", description: "Every engagement receives direct, founder-level oversight.", metric: "24/7", metricLabel: "Availability" },
        ],
      },
      contact: {
        title: "Connect With Our Team",
        subtitle: "Schedule a private consultation or visit our office.",
        phone: "+91 98765 43210",
        email: `contact@${brief.businessName.toLowerCase().replace(/[^a-z0-9]/g, "")}.in`,
      },
      footer: {
        tagline: `${brief.businessName} • Elevating ${brief.category} across India`,
      },
      sectionOrder: strategy.sectionSequence || ["hero", "about", "services", "features", "contact", "footer"],
      designStrategy: strategy,
    };

    let normalized = normalizeWebsiteData(rawData, {
      category: brief.category,
      businessName: brief.businessName,
      description: brief.description,
      avoidImages: Array.from(globalUsedImages),
      strategy,
    });

    if (normalized.hero?.image) globalUsedImages.add(normalized.hero.image);
    if (normalized.about?.image) globalUsedImages.add(normalized.about.image);

    let simResult = evaluateCandidateSimilarities(
      normalized,
      brief.category,
      brief.description,
      recentCandidates,
      DEFAULT_UNIQUENESS_CONFIG
    );

    if (simResult.status === "REGENERATE" || simResult.highestScore >= 0.70) {
      strategy = generateDesignStrategy({
        category: brief.category,
        businessName: brief.businessName,
        description: brief.description,
        threeDPreference,
        avoidPatterns: [
          ...avoidArchetypes,
          strategy.colorSystem.primary,
          strategy.colorSystem.paletteName,
          strategy.cardFamilyStrategy.primaryCardFamily,
          strategy.featuresLayoutStrategy.layoutVariant,
        ],
        seed: `${brief.businessName}_regen_${Date.now()}`,
      });
      rawData.designStrategy = strategy;
      rawData.brand.primaryColor = strategy.colorSystem.primary;
      rawData.brand.secondaryColor = strategy.colorSystem.secondary;
      rawData.brand.visualArchetype = strategy.visualArchetype;
      rawData.hero.layoutVariant = strategy.heroType;

      normalized = normalizeWebsiteData(rawData, {
        category: brief.category,
        businessName: brief.businessName,
        description: brief.description,
        avoidImages: Array.from(globalUsedImages),
        strategy,
      });

      simResult = evaluateCandidateSimilarities(
        normalized,
        brief.category,
        brief.description,
        recentCandidates,
        DEFAULT_UNIQUENESS_CONFIG
      );
    }

    const detailedFp = extractDetailedDesignFingerprint(normalized, strategy);
    candidates.push({
      runId,
      businessName: brief.businessName,
      category: brief.category,
      fingerprint: detailedFp,
      primaryColor: strategy.colorSystem.primary,
      paletteName: strategy.colorSystem.paletteName,
      featuresLayoutVariant: strategy.featuresLayoutStrategy.layoutVariant,
      featuresGeometry: strategy.featuresLayoutStrategy.cardGeometry,
      backgroundType: strategy.backgroundStrategy.type,
      cardFamily: strategy.cardFamilyStrategy.primaryCardFamily,
    });

    recordCandidateFromWebsite(runId, brief.businessName, brief.category, normalized);

    const previewJsonPath = path.join(PREVIEWS_DIR, `${runId}.json`);
    fs.writeFileSync(previewJsonPath, JSON.stringify(normalized, null, 2), "utf-8");

    const featVar = strategy.featuresLayoutStrategy.layoutVariant;
    const pal = strategy.colorSystem.paletteName;
    const arch = strategy.visualArchetype;
    const cardF = strategy.cardFamilyStrategy.primaryCardFamily;

    featuresVariantCounts[featVar] = (featuresVariantCounts[featVar] || 0) + 1;
    paletteCounts[pal] = (paletteCounts[pal] || 0) + 1;
    archetypeCounts[arch] = (archetypeCounts[arch] || 0) + 1;
    cardFamilyCounts[cardF] = (cardFamilyCounts[cardF] || 0) + 1;

    runDataList.push({
      runId,
      brief,
      is3d: brief.threeD,
      normalized,
      strategy,
      simResult,
      detailedFp,
    });

    console.log(`[Generated ${runNum}/60] ${runId}: "${brief.businessName}" (${brief.category}) | Mode: ${brief.threeD ? "3D" : "2D"} | Arch: ${arch} | Pal: ${pal} | Feat: ${featVar} | Uniq: ${((1 - simResult.highestScore) * 100).toFixed(0)}%`);
  }

  // ---------------------------------------------------------------------------
  // STEP 2: PLAYWRIGHT BROWSER SCREENSHOT VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("   STEP 2: PLAYWRIGHT REAL BROWSER SCREENSHOT AUDIT (60 WEBSITES)               ");
  console.log("================================================================================\n");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const desktopPage = await desktopContext.newPage();

  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 1,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  const bossReports = [];
  const capturedScreenshots = [];

  for (let idx = 0; idx < runDataList.length; idx++) {
    const item = runDataList[idx];
    const { runId, brief, is3d, normalized, strategy, simResult } = item;
    const url = `http://localhost:3000/preview/${runId}`;

    const fullPath = path.join(SCREENSHOTS_DIR, `${runId}_fullpage.png`);
    const heroPath = path.join(SCREENSHOTS_DIR, `${runId}_hero.png`);
    const featuresPath = path.join(SCREENSHOTS_DIR, `${runId}_features.png`);
    const servicesPath = path.join(SCREENSHOTS_DIR, `${runId}_services.png`);
    const mobilePath = path.join(SCREENSHOTS_DIR, `${runId}_mobile.png`);

    try {
      await desktopPage.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      await desktopPage.waitForTimeout(300);

      // Desktop fullpage
      await desktopPage.screenshot({ path: fullPath, fullPage: true });

      // Desktop hero
      const heroEl = await desktopPage.$('section[data-section-type="hero"], section#hero, div[data-section="hero"], header, section:first-of-type');
      if (heroEl) {
        await heroEl.screenshot({ path: heroPath });
      } else {
        await desktopPage.screenshot({ path: heroPath, clip: { x: 0, y: 0, width: 1440, height: 750 } });
      }

      // Desktop features
      const featuresEl = await desktopPage.$('section[data-section-type="features"], section#features, section[id*="features"]');
      if (featuresEl) {
        await featuresEl.screenshot({ path: featuresPath });
      }

      // Mobile
      await mobilePage.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      await mobilePage.waitForTimeout(300);
      await mobilePage.screenshot({ path: mobilePath, fullPage: true });

      capturedScreenshots.push({ runId, fullPath, heroPath, featuresPath, mobilePath });
    } catch (browserErr) {
      console.warn(`Browser capture warning for ${runId}:`, browserErr.message);
    }

    // Step 3: Boss Visual Quality Analysis
    const bossAudit = analyzeVisualQuality({
      runId,
      websiteData: normalized,
      screenshotPaths: {
        fullpage: fullPath,
        hero: heroPath,
        features: featuresPath,
        mobile: mobilePath,
      },
      is3dRequested: is3d,
      uniquenessReport: {
        highestScore: simResult.highestScore,
        status: simResult.status,
        detectedIssues: simResult.detectedIssues || [],
      },
    });

    bossReports.push(bossAudit);
    if ((idx + 1) % 10 === 0 || idx === 59) {
      console.log(`[Boss Audit ${idx + 1}/60] Verified ${runId}: Score ${bossAudit.overallScore}/100 | Gate: ${bossAudit.qualityGate} | 3D: ${is3d ? "3D Active" : "Strict 2D"}`);
    }
  }

  await browser.close();

  // ---------------------------------------------------------------------------
  // STEP 4: AGGREGATE RESULTS & COMPOSE SUMMARY SHEETS
  // ---------------------------------------------------------------------------
  const totalRuns = bossReports.length;
  const passCount = bossReports.filter((r) => r.qualityGate === "PASS").length;
  const reviewCount = bossReports.filter((r) => r.qualityGate === "REVIEW").length;
  const failCount = bossReports.filter((r) => r.qualityGate === "FAIL").length;
  const avgScore = Math.round(bossReports.reduce((acc, r) => acc + r.overallScore, 0) / totalRuns);

  console.log("\n================================================================================");
  console.log("   FINAL BOSS VALIDATION SUMMARY (60 WEBSITES)                                  ");
  console.log("================================================================================");
  console.log(`Total Websites Audited:   ${totalRuns}`);
  console.log(`Strict 2D Mode:           ${total2D}`);
  console.log(`Explicit 3D Mode:         ${total3D}`);
  console.log(`PASS Gate:                ${passCount} (${((passCount / totalRuns) * 100).toFixed(1)}%)`);
  console.log(`REVIEW Gate:              ${reviewCount}`);
  console.log(`FAIL Gate:                ${failCount}`);
  console.log(`Average Quality Score:    ${avgScore}/100`);
  console.log(`Features Variants Used:   ${Object.keys(featuresVariantCounts).length} distinct layouts`);
  console.log(`Color Palettes Used:      ${Object.keys(paletteCounts).length} distinct palettes`);
  console.log(`Card Families Used:       ${Object.keys(cardFamilyCounts).length} distinct card families`);
  console.log(`Unique Image Sourced:     ${globalUsedImages.size} images across 60 sites`);
  console.log("================================================================================\n");

  const researchReport = getBossResearchReport();

  const finalOutput = {
    pipelineStatus: "COMPLETED",
    executedAt: new Date().toISOString(),
    totalRuns,
    twoDRunsCount: total2D,
    threeDRunsCount: total3D,
    overallAverageScore: avgScore,
    qualityGateStatus: failCount === 0 ? "PASS" : "FAIL",
    passCount,
    reviewCount,
    failCount,
    featuresVariantDistribution: featuresVariantCounts,
    paletteDistribution: paletteCounts,
    archetypeDistribution: archetypeCounts,
    cardFamilyDistribution: cardFamilyCounts,
    uniqueImagesSourcedCount: globalUsedImages.size,
    bossResearchReport: {
      totalTopicsCovered: researchReport.totalTopicsCovered,
      totalDiscoveries: researchReport.totalDiscoveries,
      classificationCounts: researchReport.classificationCounts,
      adminDecisionCounts: researchReport.adminDecisionCounts,
      discoveries: researchReport.discoveries,
    },
    bossReports: bossReports.map((r) => ({
      runId: r.runId,
      businessName: r.businessName,
      category: r.category,
      overallScore: r.overallScore,
      qualityGate: r.qualityGate,
      is3d: r.is3d,
      metadata: r.metadata,
      summary: r.summary,
    })),
  };

  const resultsPath = path.join(ARTIFACTS_DIR, "scratch/regression_60_validation_results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(finalOutput, null, 2), "utf-8");
  console.log(`Saved comprehensive validation report to: ${resultsPath}`);
}

runFull60WebsiteValidation().catch((err) => {
  console.error("Critical error running 60 website validation:", err);
  process.exit(1);
});
