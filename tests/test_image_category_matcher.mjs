import path from "node:path";
import jitiFactory from "jiti";

const jiti = jitiFactory(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

const { getCategoryImages, CATEGORY_MAP } = jiti("@/lib/categoryImages");

const tests = [
  { input: ["Architecture Studio", "Komorebi Spatial Atelier", "minimalist Japanese-Scandinavian architectural practice designing passive solar residences and spatial pavilions"], expectedNot: CATEGORY_MAP.salon, expected: CATEGORY_MAP.architecture, name: "Spatial Architecture != Salon && == Architecture" },
  { input: ["Local Service Business", "VoltCraft Emergency Electricians", "emergency dispatch for electrical outages, residential panel upgrades, EV fast charger installs"], expectedNot: CATEGORY_MAP.salon, expected: CATEGORY_MAP.electrician, name: "Emergency Dispatch != Salon && == Electrician" },
  { input: ["Creative Agency", "Monolith Brand Direction", "spatial web and kinetic brand identity studio"], expectedNot: CATEGORY_MAP.salon, expected: CATEGORY_MAP.agency, name: "Spatial Design Studio != Salon && == Agency" },
  { input: ["Dental Clinic", "Lumina Smiles & Implant Center", "calming spa atmosphere for dental implants, porcelain veneers, and sedation dentistry"], expectedNot: CATEGORY_MAP.salon, expected: CATEGORY_MAP.dental, name: "Dental with spa-like != Salon && == Dental" },
  { input: ["Day Spa & Wellness", "Serenity Spa", "luxury day spa facials and massage"], expected: CATEGORY_MAP.salon, name: "Day Spa == Salon" },
  { input: ["Medical Spa", "Radiance MedSpa", "aesthetic medical spa skin treatments"], expected: CATEGORY_MAP.salon, name: "Medical Spa == Salon" },
  { input: ["E-commerce", "Ceramica Terra Artisans", "handcrafted stoneware pottery ceramics and wheel-thrown clay"], expected: CATEGORY_MAP.ceramics, name: "Ceramics == Ceramics" },
  { input: ["Dental Clinic", "Lumina Smiles", "sedation dentistry smile design"], expected: CATEGORY_MAP.dental, name: "Dental == Dental" },
  { input: ["Emergency Electrician", "VoltCraft", "electrical panel upgrade"], expected: CATEGORY_MAP.electrician, name: "Electrician == Electrician" }
];

let failed = 0;
for (const t of tests) {
  const result = getCategoryImages(t.input[0], t.input[1], t.input[2]);
  if (t.expected && result !== t.expected) {
    console.error(`❌ FAIL: ${t.name}`);
    failed++;
  } else if (t.expectedNot && result === t.expectedNot) {
    console.error(`❌ FAIL: ${t.name} (matched forbidden category)`);
    failed++;
  } else {
    console.log(`✓ PASS: ${t.name}`);
  }
}

if (failed > 0) {
  console.error(`\nFAILED ${failed} tests!`);
  process.exit(1);
}
console.log("\nALL IMAGE MATCHER TESTS PASSED PERFECTLY! 🎯");
