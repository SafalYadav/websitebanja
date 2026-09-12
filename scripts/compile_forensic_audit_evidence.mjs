// scripts/compile_forensic_audit_evidence.mjs
import fs from "fs";
import path from "path";

const SITES = [
  { id: "restaurant", name: "Botanica Hearth & Roastery", category: "Restaurant & Cafe", expectedArchetype: "warm_artisanal" },
  { id: "dental", name: "Lumina Smiles & Implant Center", category: "Dental Clinic", expectedArchetype: "clean_clinical" },
  { id: "saas", name: "VectorPulse AI", category: "SaaS & Technology", expectedArchetype: "dark_technical" },
  { id: "architecture", name: "Komorebi Spatial Atelier", category: "Architecture Studio", expectedArchetype: "minimal_editorial" },
  { id: "fashion", name: "Aethelgard High Atelier", category: "Luxury Fashion", expectedArchetype: "luxury_bespoke" },
  { id: "service", name: "VoltCraft Emergency Electricians", category: "Local Service Business", expectedArchetype: "high_trust_service" },
  { id: "ecommerce", name: "Ceramica Terra Artisans", category: "E-commerce Store", expectedArchetype: "warm_artisanal" },
  { id: "agency", name: "Monolith Brand Direction", category: "Creative Agency", expectedArchetype: "expressive_creative" },
];

const FORBIDDEN_TOKENS = [
  "skillExecutionPlan",
  "hostedSkill",
  "systemPrompt",
  "negativeKeywords",
  "antiRepetitionFingerprint",
  "visualConcept",
  "imageDirection",
  "21st-dev",
  "framer-motion",
  "threejs",
  "as an ai",
  "as an artificial intelligence",
];

const realGenDir = path.resolve(process.cwd(), "scratch/real_generations");
const previewDir = path.resolve(process.cwd(), "scratch/previews");
const qaResultsPath = path.resolve(process.cwd(), "scratch/audit_generations/browser_qa_results.json");

const qaResults = JSON.parse(fs.readFileSync(qaResultsPath, "utf-8"));
const qaMap = new Map(qaResults.map(r => [r.id, r]));

const siteAudits = [];

for (const site of SITES) {
  const jsonPath = path.join(previewDir, `${site.id}.json`);
  const metaPath = path.join(realGenDir, `${site.id}.meta.json`);

  if (!fs.existsSync(jsonPath) || !fs.existsSync(metaPath)) {
    throw new Error(`Missing generated file for ${site.id}`);
  }

  const websiteData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const metaData = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  const qa = qaMap.get(site.id) || {};

  // Check prompt leakage in user-visible fields
  const userVisibleText = [
    websiteData.brand?.tagline,
    websiteData.brand?.description,
    websiteData.hero?.title,
    websiteData.hero?.subtitle,
    websiteData.about?.title,
    websiteData.about?.content,
    ...(websiteData.services || []).map(s => `${s.title} ${s.description}`),
    ...(websiteData.features || []).map(f => `${f.title} ${f.description}`),
    ...(websiteData.reviews || []).map(r => `${r.name} ${r.text || r.comment}`),
    ...(websiteData.faq || []).map(q => `${q.question} ${q.answer}`),
  ].filter(Boolean).join(" ");

  const detectedLeaks = [];
  for (const token of FORBIDDEN_TOKENS) {
    if (userVisibleText.toLowerCase().includes(token.toLowerCase())) {
      detectedLeaks.push(token);
    }
  }

  // Check card families
  const cardFamiliesUsed = new Set();
  const planSections = [
    ...(websiteData.skillExecutionPlan?.sections || []),
    ...(websiteData.skillExecutionPlan?.sectionPlans || []),
    ...(websiteData.designStrategy?.skillExecutionPlan?.sections || []),
    ...(websiteData.designStrategy?.skillExecutionPlan?.sectionPlans || []),
  ];
  for (const plan of planSections) {
    if (plan.cardFamily) cardFamiliesUsed.add(plan.cardFamily);
  }
  if (websiteData.designStrategy?.sectionCards) {
    for (const card of Object.values(websiteData.designStrategy.sectionCards)) {
      if (typeof card === "string") cardFamiliesUsed.add(card);
    }
  }
  if (websiteData.signatureDishes?.cardFamily) cardFamiliesUsed.add(websiteData.signatureDishes.cardFamily);
  if (websiteData.atmosphereStory?.cardFamily) cardFamiliesUsed.add(websiteData.atmosphereStory.cardFamily);
  for (const s of (websiteData.services || [])) {
    if (s.cardFamily) cardFamiliesUsed.add(s.cardFamily);
  }
  for (const f of (websiteData.features || [])) {
    if (f.cardFamily) cardFamiliesUsed.add(f.cardFamily);
  }
  for (const p of (websiteData.products || [])) {
    if (p.cardFamily) cardFamiliesUsed.add(p.cardFamily);
  }

  const galleryItems = Array.isArray(websiteData.gallery)
    ? websiteData.gallery
    : (websiteData.gallery?.items && Array.isArray(websiteData.gallery.items) ? websiteData.gallery.items : []);

  const imageSources = [
    websiteData.hero?.image,
    websiteData.about?.image,
    ...(websiteData.services || []).map(s => s.image),
    ...(websiteData.features || []).map(f => f.image),
    ...galleryItems.map(g => (typeof g === "string" ? g : (g.url || g.image))),
  ].filter(Boolean);

  siteAudits.push({
    id: site.id,
    name: site.name,
    category: site.category,
    modelUsed: metaData.modelUsed,
    generationDurationMs: metaData.generationDurationMs,
    archetype: websiteData.designStrategy?.visualArchetype || metaData.archetype,
    heroVariant: websiteData.designStrategy?.heroType || metaData.heroVariant,
    heroTitle: websiteData.hero?.title,
    heroSubtitle: websiteData.hero?.subtitle,
    background: websiteData.designStrategy?.backgroundStrategy?.type || metaData.background,
    spatial3dLevel: websiteData.designStrategy?.spatial3d?.level || metaData.spatial3dLevel,
    sections: websiteData.sectionOrder || metaData.sections,
    skillsSelected: metaData.skillsSelected,
    cardFamiliesUsed: Array.from(cardFamiliesUsed),
    promptLeaks: detectedLeaks,
    imageCount: imageSources.length,
    qa: {
      sectionsCount: qa.sectionsCount,
      desktopOverflow: qa.desktopOverflow,
      mobileOverflow: qa.mobileOverflow,
      brokenImagesCount: qa.brokenImagesCount,
      consoleErrorsCount: qa.consoleErrorsCount,
      has3dWrapper: qa.has3dWrapper,
      desktopHeroShot: qa.desktopHeroShot,
      desktopFirstSectionsShot: qa.desktopFirstSectionsShot,
      desktopFullShot: qa.desktopFullShot,
      mobileHeroShot: qa.mobileHeroShot,
      mobileFullShot: qa.mobileFullShot,
    },
  });
}

const finalReportPath = path.resolve(process.cwd(), "scratch/audit_generations/comprehensive_audit_evidence.json");
fs.writeFileSync(finalReportPath, JSON.stringify(siteAudits, null, 2), "utf-8");

console.log("================================================================================");
console.log("📊 FORENSIC AUDIT EVIDENCE COMPILATION COMPLETE");
console.log("================================================================================");
console.log(`Saved comprehensive audit report to: ${finalReportPath}\n`);

console.table(
  siteAudits.map(s => ({
    Site: s.name,
    Model: s.modelUsed,
    Duration: `${(s.generationDurationMs / 1000).toFixed(1)}s`,
    Archetype: s.archetype,
    "Hero Layout": s.heroVariant,
    "3D Level": s.spatial3dLevel,
    "Prompt Leaks": s.promptLeaks.length === 0 ? "0 (Clean)" : s.promptLeaks.join(", "),
    "Desk Overflow": s.qa.desktopOverflow ? "FAIL" : "PASS",
    "Mob Overflow": s.qa.mobileOverflow ? "FAIL" : "PASS",
    "Console Errs": s.qa.consoleErrorsCount,
  }))
);
