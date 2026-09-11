/**
 * WebsiteBanja AI — Design Intelligence Engine Master Verification Suite
 *
 * Validates:
 * 1. Physical presence and depth of all 19 Design Intelligence skills in `skills/`:
 *    - ui-ux, framer-motion, 21st-dev
 *    - design-systems, cro, typography, responsive-design, accessibility, ux-psychology
 *    - interaction-design, creative-art-direction, seo, performance, industry-intelligence
 *    - gsap, threejs, data-visualization, saas-ux, ecommerce-ux
 * 2. Complete unified skill registry with 19 skills and priority ordering
 * 3. Intelligent contextual skill selection across diverse scenarios:
 *    - Scenario A: Minimal static law firm
 *    - Scenario B: Futuristic interactive AI SaaS product
 *    - Scenario C: Emergency mobile-first plumber
 *    - Scenario D: Direct-to-Consumer e-commerce store
 * 4. Absolute Priority of User Overrides:
 *    - Explicit "no animation, static only" disables Framer Motion, GSAP, and Three.js
 *    - Explicit "ultra minimal" suppresses heavy 21st.dev bento/glow effects
 *    - Explicit 3D WebGL request activates Three.js
 *    - Explicit Scrollytelling request activates GSAP
 * 5. Prompt integration and dynamic directive generation
 * 6. Post-generation design validation, emoji sanitization, and verification report
 * 7. System extensibility (registering additional skills dynamically)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jitiFactory from "jiti";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const jiti = jitiFactory(process.cwd(), {
  alias: {
    "@": path.resolve(process.cwd(), "src"),
  },
});

const { selectSkillsForRequest } = jiti("@/lib/skills/skillSelector");
const { getRegisteredSkills, registerSkill, loadSkillContent } = jiti("@/lib/skills/skillRegistry");
const { validateGeneratedWebsiteDesign } = jiti("@/lib/skills/uiUxSkill");
const { buildWebsitePrompt } = jiti("@/lib/prompts");

console.log("================================================================================");
console.log("WEBSITEBANJA AI — MASTER DESIGN INTELLIGENCE ENGINE VERIFICATION SUITE");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function runTest(title, testFn) {
  try {
    testFn();
    console.log(`  ✔ [PASS] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(err);
    failed++;
  }
}

// -------------------------------------------------------------
// TEST 1: Physical Skill Files Existence & Substance (All 19 Skills)
// -------------------------------------------------------------
console.log("[Test 1] Verifying physical presence and content depth of all 19 skills...");
const all19Skills = [
  { id: "ui-ux", path: "skills/ui-ux/skill.md", minSize: 15000 },
  { id: "framer-motion", path: "skills/framer-motion/skill.md", minSize: 8000 },
  { id: "21st-dev", path: "skills/21st-dev/skill.md", minSize: 8000 },
  { id: "design-systems", path: "skills/design-systems/skill.md", minSize: 3000 },
  { id: "cro", path: "skills/cro/skill.md", minSize: 3000 },
  { id: "typography", path: "skills/typography/skill.md", minSize: 3000 },
  { id: "responsive-design", path: "skills/responsive-design/skill.md", minSize: 3000 },
  { id: "accessibility", path: "skills/accessibility/skill.md", minSize: 3000 },
  { id: "ux-psychology", path: "skills/ux-psychology/skill.md", minSize: 3000 },
  { id: "interaction-design", path: "skills/interaction-design/skill.md", minSize: 3000 },
  { id: "creative-art-direction", path: "skills/creative-art-direction/skill.md", minSize: 3000 },
  { id: "seo", path: "skills/seo/skill.md", minSize: 3000 },
  { id: "performance", path: "skills/performance/skill.md", minSize: 3000 },
  { id: "industry-intelligence", path: "skills/industry-intelligence/skill.md", minSize: 3500 },
  { id: "gsap", path: "skills/gsap/skill.md", minSize: 3000 },
  { id: "threejs", path: "skills/threejs/skill.md", minSize: 3000 },
  { id: "data-visualization", path: "skills/data-visualization/skill.md", minSize: 3000 },
  { id: "saas-ux", path: "skills/saas-ux/skill.md", minSize: 3000 },
  { id: "ecommerce-ux", path: "skills/ecommerce-ux/skill.md", minSize: 3000 },
  { id: "spatial-interaction", path: "skills/spatial-interaction/skill.md", minSize: 3000 },
];

assert.equal(all19Skills.length, 20, "Must have exactly 20 skills defined in test list");

for (const skill of all19Skills) {
  runTest(`Skill ${skill.id} exists and has substantive content (> ${skill.minSize} bytes)`, () => {
    const fullPath = path.resolve(ROOT, skill.path);
    assert.ok(fs.existsSync(fullPath), `File ${skill.path} does not exist`);
    const stat = fs.statSync(fullPath);
    assert.ok(
      stat.size >= skill.minSize,
      `File ${skill.path} size ${stat.size} is less than required minimum ${skill.minSize}`
    );
  });
}

// -------------------------------------------------------------
// TEST 2: Unified Skill Registry Registration (All 20 Skills)
// -------------------------------------------------------------
console.log("\n[Test 2] Verifying unified skill registry registration...");
runTest("Registry contains all 20 skills with metadata and category groups", () => {
  const registered = getRegisteredSkills();
  assert.equal(registered.length, 20, "Registry must register all 20 skills");
  const ids = registered.map((s) => s.id);

  for (const expected of all19Skills) {
    assert.ok(ids.includes(expected.id), `Registry missing skill: ${expected.id}`);
  }

  // Verify caching
  const rawUiUx = loadSkillContent("ui-ux");
  assert.ok(rawUiUx.length > 10000, "Cached loadSkillContent must return substantive markdown");
});

// -------------------------------------------------------------
// TEST 3: Intelligent Skill Selection Across Diverse Verticals
// -------------------------------------------------------------
console.log("\n[Test 3] Testing Intelligent Contextual Skill Selection...");

runTest("Scenario A: Minimal static law firm activates foundational skills and rejects animation", () => {
  const result = selectSkillsForRequest({
    category: "Corporate Legal Defense & Estate Planning",
    style: "Minimal, conservative, high trust",
    businessName: "Sterling & Croft LLP",
    description: "Experienced corporate defense counsel. Please provide a static layout with NO ANIMATIONS.",
  });

  const selectedIds = result.metadata.selectedIds;
  assert.ok(selectedIds.includes("ui-ux"), "Must include ui-ux");
  assert.ok(selectedIds.includes("design-systems"), "Must include design-systems");
  assert.ok(selectedIds.includes("typography"), "Must include typography");
  assert.ok(selectedIds.includes("accessibility"), "Must include accessibility");
  assert.ok(selectedIds.includes("seo"), "Must include seo");
  assert.ok(selectedIds.includes("industry-intelligence"), "Must include industry-intelligence");

  // Rejection check
  assert.ok(!selectedIds.includes("framer-motion"), "Must NOT include framer-motion");
  assert.ok(!selectedIds.includes("gsap"), "Must NOT include gsap");
  assert.ok(!selectedIds.includes("threejs"), "Must NOT include threejs");
  assert.equal(result.metadata.hasMotion, false, "hasMotion must be false");
  assert.equal(result.metadata.userOverrideDetected, "explicit_no_animation");
});

runTest("Scenario B: Futuristic AI SaaS activates 21st-dev, Framer Motion, and SaaS UX", () => {
  const result = selectSkillsForRequest({
    category: "AI Developer Platform SaaS",
    style: "Futuristic dark mode, ambient lighting",
    businessName: "CognitiveFlow AI",
    description: "Autonomous cloud rightsizing and code intelligence platform.",
  });

  const selectedIds = result.metadata.selectedIds;
  assert.ok(selectedIds.includes("ui-ux"), "Must include ui-ux");
  assert.ok(selectedIds.includes("21st-dev"), "Must include 21st-dev");
  assert.ok(selectedIds.includes("framer-motion"), "Must include framer-motion");
  assert.ok(selectedIds.includes("saas-ux"), "Must include saas-ux");
  assert.ok(result.metadata.hasMotion, "hasMotion must be true");
  assert.ok(result.metadata.has21stComponents, "has21stComponents must be true");
});

runTest("Scenario C: Fast mobile plumber activates local trades intelligence and avoids 3D/GSAP", () => {
  const result = selectSkillsForRequest({
    category: "Emergency 24/7 Plumber",
    style: "High trust, mobile-first",
    businessName: "Seattle Rapid Plumber",
    description: "Emergency burst pipe repair, water heater replacement, and drain clearing in King County.",
  });

  const selectedIds = result.metadata.selectedIds;
  assert.ok(selectedIds.includes("industry-intelligence"), "Must include industry-intelligence");
  assert.ok(selectedIds.includes("cro"), "Must include cro");
  assert.ok(selectedIds.includes("responsive-design"), "Must include responsive-design");
  assert.ok(selectedIds.includes("accessibility"), "Must include accessibility");

  assert.ok(!selectedIds.includes("threejs"), "Plumber must NOT include threejs");
  assert.ok(!selectedIds.includes("gsap"), "Plumber must NOT include gsap");
});

runTest("Scenario D: E-Commerce store activates E-Commerce UX and CRO", () => {
  const result = selectSkillsForRequest({
    category: "Direct-to-Consumer Organic Apparel E-Commerce Store",
    style: "Modern minimalist retail",
    businessName: "Linen & Thread",
    description: "Sustainable organic cotton basics, shopping cart, and rapid checkout.",
  });

  const selectedIds = result.metadata.selectedIds;
  assert.ok(selectedIds.includes("ecommerce-ux"), "Must include ecommerce-ux");
  assert.ok(selectedIds.includes("cro"), "Must include cro");
  assert.ok(result.guidanceBlock.includes("PDP Buy Box"), "Guidance must reference E-Commerce PDP architecture");
});

// -------------------------------------------------------------
// TEST 4: Explicit Positive Cues (3D, GSAP, Data Viz)
// -------------------------------------------------------------
console.log("\n[Test 4] Testing Explicit Positive Cues (3D, GSAP, Data Viz)...");

runTest("Explicit 3D WebGL request activates Three.js skill", () => {
  const result = selectSkillsForRequest({
    category: "Hardware Showcase",
    style: "Interactive 3D",
    businessName: "HoloLens Studio",
    description: "Interactive WebGL 3D model orbit viewer and holographic lighting.",
  });

  assert.ok(result.metadata.selectedIds.includes("threejs"), "Must include threejs");
  assert.ok(result.metadata.has3D, "has3D metadata must be true");
});

runTest("Explicit scrollytelling request activates GSAP skill", () => {
  const result = selectSkillsForRequest({
    category: "Interactive Agency Narrative",
    style: "Cinematic",
    businessName: "Velocity Stories",
    description: "Cinematic scrollytelling experience with pinned sections and ScrollTrigger timelines.",
  });

  assert.ok(result.metadata.selectedIds.includes("gsap"), "Must include gsap");
  assert.ok(result.metadata.hasAdvancedAnimation, "hasAdvancedAnimation metadata must be true");
});

runTest("Explicit dashboard analytics request activates Data Visualization skill", () => {
  const result = selectSkillsForRequest({
    category: "B2B Analytics Platform",
    style: "Data heavy",
    businessName: "MetricPulse",
    description: "Executive analytics dashboard with KPI cards, revenue charts, and conversion trends.",
  });

  assert.ok(result.metadata.selectedIds.includes("data-visualization"), "Must include data-visualization");
});

// -------------------------------------------------------------
// TEST 5: Prompt Integration Verification
// -------------------------------------------------------------
console.log("\n[Test 5] Testing buildWebsitePrompt dynamic assembly...");
runTest("buildWebsitePrompt injects dynamically selected skill directives", () => {
  const prompt = buildWebsitePrompt(
    {
      businessName: "Aura Dental Care",
      category: "Family & Cosmetic Dental Clinic",
      description: "Painless gentle dentistry, clean modern clinic, accepted insurance, online booking.",
      style: "Calm, hygienic, welcoming",
      targetAudience: "Families in Austin",
      phone: "(512) 555-0192",
      email: "hello@auradental.com",
      website: "auradental.com",
      instagram: "",
      facebook: "",
      address: "Austin, TX",
    },
    {}
  );

  assert.ok(prompt.includes("DESIGN INTELLIGENCE ENGINE"), "Prompt must include Design Intelligence header");
  assert.ok(prompt.includes("skills/ui-ux/skill.md"), "Prompt must cite UI/UX skill");
  assert.ok(prompt.includes("skills/accessibility/skill.md"), "Prompt must cite Accessibility skill");
  assert.ok(prompt.includes("Aura Dental Care"), "Prompt must include business name");
  assert.ok(prompt.includes("Family & Cosmetic Dental Clinic"), "Prompt must include category");
});

// -------------------------------------------------------------
// TEST 6: Post-Generation Design Validation & Verification Report
// -------------------------------------------------------------
console.log("\n[Test 6] Testing Post-Generation Design Validation & Verification Report...");
runTest("validateGeneratedWebsiteDesign outputs verificationReport and sanitizes output", () => {
  const mockResult = {
    hero: {
      title: "Painless Gentle Dentistry ✨",
      subtitle: "Comfortable family oral care in Austin.",
      button: "Book Appointment 📅",
    },
    services: [
      { title: "Teeth Whitening 🦷", description: "Brighten your smile safely." },
    ],
  };

  const validation = validateGeneratedWebsiteDesign(mockResult, {
    category: "Dental",
    prompt: "Painless gentle dentistry",
  });

  assert.equal(validation.sanitized.hero.title, "Painless Gentle Dentistry", "Emoji stripped from title");
  assert.equal(validation.sanitized.hero.button, "Book Appointment", "Emoji stripped from button");
  assert.equal(validation.sanitized.services[0].title, "Teeth Whitening", "Emoji stripped from service");
  assert.ok(Array.isArray(validation.verificationReport.passedCriteria), "verificationReport must exist");
  assert.ok(validation.verificationReport.passedCriteria.length >= 3, "Must report passed criteria");
});

// -------------------------------------------------------------
// TEST 7: Dynamic Registration Extensibility
// -------------------------------------------------------------
console.log("\n[Test 7] Testing Dynamic Extensibility for Future Skills...");
runTest("registerSkill dynamically registers a 20th skill without modifying core engine", () => {
  registerSkill({
    id: "web-audio-soundscapes",
    name: "Web Audio Soundscapes & Sonic Branding",
    description: "Interactive spatial sound feedback, ambient audio pads, and accessibility audio toggles.",
    filePath: path.resolve(ROOT, "skills/ui-ux/skill.md"), // Mock path
    version: "1.0.0",
    priority: 20,
    categoryGroup: "specialized",
    tags: ["audio", "sound", "sonic-branding"],
  });

  const registered = getRegisteredSkills();
  const audioSkill = registered.find((s) => s.id === "web-audio-soundscapes");
  assert.ok(audioSkill, "Newly registered skill must exist");
  assert.equal(audioSkill.name, "Web Audio Soundscapes & Sonic Branding");
});

console.log("\n================================================================================");
console.log(`ALL DESIGN INTELLIGENCE TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
