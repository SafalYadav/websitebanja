// scripts/audit_fresh_generation.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import fs from "node:fs";
import path from "node:path";
import jitiFactory from "jiti";

const jiti = jitiFactory(process.cwd(), {
  alias: {
    "@": path.resolve(process.cwd(), "src"),
  },
});

const { openai, OPENAI_GENERATION_MODEL } = jiti("@/lib/openai");
const { buildWebsitePrompt } = jiti("@/lib/prompts");
const { selectDesignSkills, validateGeneratedWebsiteDesign, validateGeneratedWebsiteUiUx } = jiti("@/lib/skills/uiUxSkill");
const { parseWebsiteJson } = jiti("@/lib/skills/openaiSkillsService");
const { normalizeWebsiteData } = jiti("@/lib/normalizeWebsite");

const AUDIT_INDUSTRIES = [
  {
    id: "restaurant",
    category: "Restaurant / Cafe",
    businessName: "Fable & Hearth Boulangerie & Bistro",
    description: "A rustic French-Nordic neighborhood bistro and artisan bakery in Montreal serving wild-fermented sourdough hearth loaves, juniper-braised heritage meats, natural biodynamic wines, and candlelit communal dining.",
    style: "Warm Earthy Artisanal",
    targetAudience: "Mindful foodies, natural wine lovers, and neighborhood diners seeking intimate, handcrafted hospitality.",
    phone: "+1 (514) 555-0192",
    email: "bonjour@fableandhearth.ca",
    address: "428 Rue Saint-Paul Ouest, Montreal, QC",
  },
  {
    id: "dental",
    category: "Dental Clinic",
    businessName: "Apex Orthodontics & Clear Studio",
    description: "A boutique aesthetic orthodontics and airway wellness practice in Austin offering custom clear aligner therapies, low-profile ceramic braces, 3D facial aesthetic mapping, and private tranquil treatment suites.",
    style: "Clean Clinical Modern",
    targetAudience: "Adults, teens, and professionals seeking discreet, comfortable teeth straightening and aesthetic smile transformations.",
    phone: "+1 (512) 555-8321",
    email: "concierge@apexorthostudio.com",
    address: "1601 S Congress Ave, Suite 300, Austin, TX",
  },
  {
    id: "saas",
    category: "SaaS / AI",
    businessName: "SynapseStream Data Engine",
    description: "Sub-millisecond real-time event streaming telemetry and edge anomaly detection infrastructure engineered for autonomous robotic fleets, industrial IoT clusters, and mission-critical AI pipelines.",
    style: "Dark Technical Modern",
    targetAudience: "Robotics infrastructure leads, data platform architects, and site reliability engineers operating distributed fleets.",
    phone: "+1 (888) 555-0144",
    email: "enterprise@synapsestream.io",
    address: "500 Howard St, San Francisco, CA",
  },
  {
    id: "architecture",
    category: "Architecture Studio",
    businessName: "Voxel & Stone Atelier",
    description: "A sustainable contemporary architectural practice in Zurich crafting rammed-earth cultural pavilions, alpine mass-timber residences, and regenerative zero-carbon bioclimatic structures.",
    style: "Minimal Editorial Modern",
    targetAudience: "Discerning estate commissioners, cultural institutions, and eco-resort developers seeking sculptural sustainability.",
    phone: "+41 44 555 9200",
    email: "atelier@voxelandstone.ch",
    address: "Neugasse 29, 8005 Zürich, Switzerland",
  },
  {
    id: "fashion",
    category: "Luxury Fashion",
    businessName: "Maison de L'Ombre",
    description: "A high-luxury Parisian maison creating bespoke hand-stitched leather goods, sculptural cashmere cloaks, and limited-edition tourbillon mechanical timepieces crafted by generational master artisans.",
    style: "Luxury Bespoke Editorial",
    targetAudience: "Haute couture collectors, horology connoisseurs, and private bespoke patrons seeking heirloom craftsmanship.",
    phone: "+33 1 42 68 55 00",
    email: "salon@maisondelombre.fr",
    address: "18 Place Vendôme, 75001 Paris, France",
  },
  {
    id: "service",
    category: "Emergency Electrician / Local Service",
    businessName: "VoltGuard Master Electricians",
    description: "Licensed 24/7 master electrical contractor serving Denver with guaranteed 30-minute rapid emergency dispatch for dangerous panel sparking, storm outage restorations, and commercial switchgear failures.",
    style: "High Trust Clean",
    targetAudience: "Homeowners, HOA property managers, and commercial building operators facing urgent electrical crises.",
    phone: "+1 (303) 555-9110",
    email: "dispatch@voltguardelectric.com",
    address: "1701 Wynkoop St, Denver, CO",
  },
  {
    id: "ecommerce",
    category: "Ceramics E-commerce",
    businessName: "Kintsugi Tableware Co.",
    description: "An artisanal e-commerce studio delivering limited-batch wheel-thrown speckled stoneware, raku tea bowls, and kintsugi gold-repaired heirloom dining sets handcrafted in Kyoto and Copenhagen.",
    style: "Minimal Warm Contemporary",
    targetAudience: "Design enthusiasts, culinary entertainers, and collectors of wabi-sabi functional art and heirloom tableware.",
    phone: "+1 (800) 555-4923",
    email: "orders@kintsugitableware.com",
    address: "Storegade 14, Copenhagen, Denmark",
  },
  {
    id: "agency",
    category: "Creative Agency",
    businessName: "Hyperion Visual Works",
    description: "A boundary-pushing kinetic brand design and motion lab in London crafting generative 3D visual identities, WebGL digital experiences, and bespoke typographic systems for global technology disruptors.",
    style: "Bold Expressive Dark",
    targetAudience: "Series A-to-Growth technology founders, venture capital funds, and visionary cultural institutions.",
    phone: "+44 20 7946 0912",
    email: "hello@hyperionworks.co.uk",
    address: "14 Clerkenwell Close, London EC1R 0AN, UK",
  },
];

async function generateSingleWebsite(ind) {
  const skillSelection = selectDesignSkills({ ...ind, prompt: ind.description });
  const activeSkillsList = skillSelection.metadata.selectedIds.join(", ");

  const prompt = buildWebsitePrompt({
    category: ind.category,
    businessName: ind.businessName,
    description: ind.description,
    style: ind.style,
    targetAudience: ind.targetAudience,
    phone: ind.phone,
    email: ind.email,
    address: ind.address,
  }, {});

  const modelToUse = OPENAI_GENERATION_MODEL || "gpt-5.6-luna";
  console.log(`  [AI] Invoking model: ${modelToUse}...`);

  const t0 = Date.now();
  let parsedResult = null;
  let modelUsed = modelToUse;

  try {
    const response = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: "system",
          content: `You are WebsiteBanja AI, an expert autonomous website designer, UI/UX architect, and conversion copywriter. Apply authoritative principles from UI/UX, Framer Motion, and 21st.dev [Active: ${activeSkillsList}] to generate world-class, accessible, conversion-focused websites adhering strictly to user requirements. Return valid JSON only.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    parsedResult = parseWebsiteJson(content);
    modelUsed = modelToUse;
  } catch (err) {
    console.warn(`  [Model Warning] ${modelToUse} failed (${err.message}). Trying gpt-4.1-mini fallback.`);
    const fallbackResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are WebsiteBanja AI, an expert autonomous website designer, UI/UX architect, and conversion copywriter. Return valid JSON only.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });
    parsedResult = parseWebsiteJson(fallbackResponse.choices[0]?.message?.content ?? "{}");
    modelUsed = "gpt-4.1-mini";
  }

  const duration = Date.now() - t0;
  console.log(`  ✓ Generation completed in ${duration}ms via ${modelUsed}`);

  const designValidation = validateGeneratedWebsiteDesign(parsedResult, ind);
  const uiUxValidation = validateGeneratedWebsiteUiUx(designValidation.sanitized, ind);
  const normalized = normalizeWebsiteData(uiUxValidation.sanitized, ind.category, ind.businessName, ind.description);

  return { normalized, modelUsed, duration };
}

async function run() {
  console.log("================================================================================");
  console.log("🚀 STARTING 100% FRESH REAL PIPELINE GENERATION FOR 8 AUDIT WEBSITES");
  console.log(`   Configured Model: ${OPENAI_GENERATION_MODEL}`);
  console.log("================================================================================\n");

  const previewDir = path.resolve(process.cwd(), "scratch/previews");
  const auditDir = path.resolve(process.cwd(), "scratch/audit_generations");
  fs.mkdirSync(previewDir, { recursive: true });
  fs.mkdirSync(auditDir, { recursive: true });

  const summary = [];

  for (let i = 0; i < AUDIT_INDUSTRIES.length; i++) {
    const ind = AUDIT_INDUSTRIES[i];
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[${i + 1}/8] Generating: ${ind.businessName} (${ind.category})`);
    console.log(`--------------------------------------------------------------------------------`);

    const { normalized, modelUsed, duration } = await generateSingleWebsite(ind);

    const previewPath = path.join(previewDir, `${ind.id}.json`);
    const auditPath = path.join(auditDir, `${ind.id}.json`);
    fs.writeFileSync(previewPath, JSON.stringify(normalized, null, 2), "utf-8");
    fs.writeFileSync(auditPath, JSON.stringify(normalized, null, 2), "utf-8");

    summary.push({
      index: i + 1,
      id: ind.id,
      name: ind.businessName,
      category: ind.category,
      modelUsed,
      durationMs: duration,
      heroTitle: normalized.hero?.title,
      heroLayout: normalized.hero?.layoutVariant,
      backgroundType: normalized.designStrategy?.backgroundStrategy?.type,
      spatial3dLevel: normalized.designStrategy?.spatial3d?.level,
      sections: normalized.sectionOrder?.join(" → "),
    });

    console.log(`  ✓ Saved: ${previewPath}`);
    console.log(`    • Hero: "${normalized.hero?.title}" [${normalized.hero?.layoutVariant}]`);
    console.log(`    • Background: ${normalized.designStrategy?.backgroundStrategy?.type}`);
    console.log(`    • Spatial 3D: ${normalized.designStrategy?.spatial3d?.level}`);
    console.log(`    • Sections: ${normalized.sectionOrder?.join(" → ")}\n`);
  }

  const manifestPath = path.join(auditDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(summary, null, 2), "utf-8");

  console.log("================================================================================");
  console.log("🎉 ALL 8 FRESH WEBSITES GENERATED CLEANLY");
  console.log("================================================================================\n");
  console.table(summary.map(s => ({
    Category: s.category,
    Name: s.name,
    Model: s.modelUsed,
    HeroVariant: s.heroLayout,
    Background: s.backgroundType,
    Spatial3D: s.spatial3dLevel,
  })));
}

run().catch((err) => {
  console.error("FATAL ERROR IN AUDIT GENERATION:", err);
  process.exit(1);
});
