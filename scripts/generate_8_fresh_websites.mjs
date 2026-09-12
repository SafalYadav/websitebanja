// scripts/generate_8_fresh_websites.mjs
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
const { isOpenAISkillsConfigured, getHostedSkillContainerConfig, extractTextFromResponse, parseWebsiteJson } = jiti("@/lib/skills/openaiSkillsService");
const { normalizeWebsiteData } = jiti("@/lib/normalizeWebsite");
const { generateDesignStrategy } = jiti("@/lib/ai/designStrategy");

const FRESH_INDUSTRIES = [
  {
    id: "restaurant",
    category: "Restaurant & Cafe",
    businessName: "Botanica Hearth & Roastery",
    description: "An organic greenhouse cafe & wood-fired brunch eatery serving heirloom single-origin pour-overs, wild-fermented sourdough pastries, and botanical farm-to-table small plates in a lush glasshouse setting.",
    style: "Warm Earthy Artisanal",
    targetAudience: "Coffee connoisseurs, mindful brunch diners, and weekend foodies seeking tranquil botanical aesthetics",
    phone: "+1 (503) 555-0182",
    email: "hello@botanicahearth.com",
    address: "1420 SE Belmont St, Portland, OR",
    expectedArchetype: "warm_artisanal",
  },
  {
    id: "dental",
    category: "Dental Clinic",
    businessName: "Lumina Smiles & Implant Center",
    description: "A state-of-the-art restorative and aesthetic dental practice specializing in anxiety-free sedation dentistry, 3D digital smile design, porcelain veneers, and same-day dental implants in a calming spa atmosphere.",
    style: "Clean Clinical Modern",
    targetAudience: "Families, busy professionals, and dental-anxious patients seeking painless comprehensive care",
    phone: "+1 (312) 555-4920",
    email: "care@luminasmiles.com",
    address: "200 E Randolph St, Suite 4200, Chicago, IL",
    expectedArchetype: "clean_clinical",
  },
  {
    id: "saas",
    category: "SaaS & Technology",
    businessName: "VectorPulse AI",
    description: "High-throughput distributed vector database infrastructure and real-time semantic caching engine engineered for autonomous LLM agent systems and enterprise RAG pipelines with sub-millisecond retrieval.",
    style: "Dark Technical Modern",
    targetAudience: "AI engineers, LLM systems architects, and enterprise data engineering teams",
    phone: "+1 (800) 555-0911",
    email: "enterprise@vectorpulse.ai",
    address: "415 Mission St, San Francisco, CA",
    expectedArchetype: "dark_technical",
  },
  {
    id: "architecture",
    category: "Architecture Studio",
    businessName: "Komorebi Spatial Atelier",
    description: "A minimalist Japanese-Scandinavian architectural practice designing passive solar residences, mass timber cultural pavilions, and serene bioclimatic landscape installations that dissolve the boundary between indoors and nature.",
    style: "Minimal Editorial Modern",
    targetAudience: "High-net-worth estate commissioners, boutique eco-resort developers, and cultural foundations",
    phone: "+1 (206) 555-7301",
    email: "atelier@komorebispatial.com",
    address: "1101 Western Ave, Seattle, WA",
    expectedArchetype: "minimal_editorial",
  },
  {
    id: "fashion",
    category: "Luxury Fashion",
    businessName: "Aethelgard High Atelier",
    description: "A heritage luxury maison creating bespoke tailored cashmere coats, hand-embroidered evening cloaks, and zero-waste double-faced silk garments crafted by generational European master artisans.",
    style: "Luxury Bespoke Editorial",
    targetAudience: "Haute couture collectors, private clients, and discerning patrons of sustainable artisanal luxury",
    phone: "+1 (212) 555-8812",
    email: "concierge@aethelgard.com",
    address: "812 Madison Ave, New York, NY",
    expectedArchetype: "luxury_bespoke",
  },
  {
    id: "service",
    category: "Local Service Business",
    businessName: "VoltCraft Emergency Electricians",
    description: "Licensed and bonded master electricians providing rapid 30-minute emergency dispatch for electrical outages, residential panel upgrades, EV fast charger installations, and commercial surge protection.",
    style: "High Trust Clean",
    targetAudience: "Homeowners, residential property managers, and commercial building operators facing urgent electrical issues",
    phone: "+1 (415) 555-9822",
    email: "dispatch@voltcraftsf.com",
    address: "2450 Mission St, San Francisco, CA",
    expectedArchetype: "high_trust_service",
  },
  {
    id: "ecommerce",
    category: "E-commerce Store",
    businessName: "Ceramica Terra Artisans",
    description: "An artisanal online studio shop offering limited-batch wheel-thrown stoneware, terracotta tableware, and sculptural textured architectural ceramics handcrafted by master ceramicists in Portugal and Kyoto.",
    style: "Minimal Warm Contemporary",
    targetAudience: "Interior stylists, design-conscious culinary hosts, and collectors of wabi-sabi functional art",
    phone: "+1 (888) 555-3211",
    email: "orders@ceramicaterra.com",
    address: "Studio 4B, Lisbon Design District, Portugal",
    expectedArchetype: "minimal_editorial",
  },
  {
    id: "agency",
    category: "Creative Agency",
    businessName: "Monolith Brand Direction",
    description: "A boundary-defying multi-disciplinary brand consultancy crafting kinetic visual identities, typography-led digital campaigns, and immersive 3D spatial web experiences for venture-backed founders and cultural icons.",
    style: "Bold Expressive Dark",
    targetAudience: "Seed-to-IPO technology founders, venture capital funds, and forward-looking consumer lifestyle brands",
    phone: "+1 (310) 555-6620",
    email: "commissions@monolithbrand.studio",
    address: "9255 Sunset Blvd, West Hollywood, CA",
    expectedArchetype: "expressive_creative",
  },
];

async function callOpenAiPipeline(industry, activeSkillsList, prompt) {
  const modelToUse = OPENAI_GENERATION_MODEL || "gpt-5.6-luna";

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
    const parsedResult = parseWebsiteJson(content);
    return { parsedResult, modelUsed: modelToUse, isHosted: false };
  } catch (err) {
    console.warn(`  [Model Notice] ${modelToUse} call failed (${err.message}). Trying standard fallback.`);
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
    const parsedResult = parseWebsiteJson(fallbackResponse.choices[0]?.message?.content ?? "{}");
    return { parsedResult, modelUsed: "gpt-4.1-mini", isHosted: false };
  }
}

async function generateAll() {
  console.log("================================================================================");
  console.log("🚀 GENERATING 8 FRESH WEBSITES VIA REAL OPENAI PIPELINE");
  console.log("================================================================================\n");

  const previewDir = path.resolve(process.cwd(), "scratch/previews");
  const genDir = path.resolve(process.cwd(), "scratch/real_generations");
  fs.mkdirSync(previewDir, { recursive: true });
  fs.mkdirSync(genDir, { recursive: true });

  for (let i = 0; i < FRESH_INDUSTRIES.length; i++) {
    const ind = FRESH_INDUSTRIES[i];
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[${i + 1}/8] Generating ${ind.category}: "${ind.businessName}"`);
    console.log(`--------------------------------------------------------------------------------`);

    // 1. Skill Selection
    const skillSelection = selectDesignSkills({ ...ind, prompt: ind.description });
    const selectedIds = skillSelection.metadata.selectedIds;
    console.log(`  1. Skills: [${selectedIds.join(", ")}]`);

    // 2. Build Prompt
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

    // 3. Call OpenAI
    const t0 = Date.now();
    console.log(`  2. Calling OpenAI (${OPENAI_GENERATION_MODEL})...`);
    const { parsedResult, modelUsed, isHosted } = await callOpenAiPipeline(ind, selectedIds.join(", "), prompt);
    const duration = Date.now() - t0;
    console.log(`  ✓ Received response in ${duration}ms (Model: ${modelUsed}, Hosted: ${isHosted})`);

    // 4. Validate & Normalize
    const designValidation = validateGeneratedWebsiteDesign(parsedResult, ind);
    const uiUxValidation = validateGeneratedWebsiteUiUx(designValidation.sanitized, ind);
    const normalized = normalizeWebsiteData(uiUxValidation.sanitized, ind.category, ind.businessName, ind.description);

    // 5. Persist to preview and generation dirs with forensic metadata
    const previewFile = path.join(previewDir, `${ind.id}.json`);
    const genFile = path.join(genDir, `${ind.id}.json`);
    const metaFile = path.join(genDir, `${ind.id}.meta.json`);

    const meta = {
      id: ind.id,
      industry: ind.category,
      businessName: ind.businessName,
      modelUsed,
      generationDurationMs: duration,
      timestamp: new Date().toISOString(),
      skillsSelected: selectedIds,
      archetype: normalized.designStrategy?.visualArchetype,
      heroVariant: normalized.hero?.layoutVariant,
      heroBackground: normalized.hero?.heroBackground,
      background: normalized.designStrategy?.backgroundStrategy?.type,
      spatial3dLevel: normalized.designStrategy?.spatial3d?.level,
      sections: normalized.sectionOrder,
      skillExecutionPlan: normalized.skillExecutionPlan,
    };

    fs.writeFileSync(previewFile, JSON.stringify(normalized, null, 2), "utf-8");
    fs.writeFileSync(genFile, JSON.stringify(normalized, null, 2), "utf-8");
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), "utf-8");

    console.log(`  ✓ Persisted to ${previewFile}`);
    console.log(`    - Hero Title: "${normalized.hero?.title}"`);
    console.log(`    - Hero Variant: ${normalized.hero?.layoutVariant}`);
    console.log(`    - Archetype: ${normalized.designStrategy?.visualArchetype}`);
    console.log(`    - Background: ${normalized.designStrategy?.backgroundStrategy?.type}`);
    console.log(`    - 3D Level: ${normalized.designStrategy?.spatial3d?.level}`);
    console.log(`    - Sections: ${normalized.sectionOrder?.join(" → ")}`);
    console.log(`    - Card Families: ${normalized.skillExecutionPlan?.sections?.map(s => `${s.sectionType}:${s.cardFamily}`).join(", ")}`);
    console.log("");
  }

  console.log("================================================================================");
  console.log("🎉 ALL 8 FRESH WEBSITES GENERATED & SAVED TO scratch/previews/ WITH gpt-5.6-luna");
  console.log("================================================================================\n");
}

generateAll().catch((err) => {
  console.error("FATAL ERROR GENERATING WEBSITES:", err);
  process.exit(1);
});
