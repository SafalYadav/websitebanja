import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createJiti from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jiti = createJiti(__dirname, {
  alias: { "@": path.resolve(__dirname, "../src") },
  interopDefault: true,
});

const { normalizeCategoryKey } = jiti("@/lib/images/semanticImageSourcing.ts");
const { synthesizePhase10DesignInputs } = jiti("@/lib/audit/auditEngine.ts");
const { generatePersonalizedPreview } = jiti("@/lib/personalization/previewGenerator.ts");
const { validateCTA } = jiti("@/lib/intelligence/validation/ctaValidator.ts");
const { validateSemantics } = jiti("@/lib/intelligence/validation/semanticValidator.ts");
const { RepairCoordinator } = jiti("@/lib/intelligence/validation/repairCoordinator.ts");

console.log("================================================================================");
console.log("TEST: GENERIC CATEGORY PIPELINE ROOT CAUSE FIX & VALIDATION VERIFICATION");
console.log("================================================================================");

let totalPassed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`, err);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`, err);
    throw err;
  }
}

// 1. Normalization Matrix
runTest("Category Normalization: Car Rental / Self Drive", () => {
  const c1 = normalizeCategoryKey("Car Rental", "A1Carz Self Drive");
  assert.equal(c1, "car_rental", `Expected car_rental, got ${c1}`);

  const c2 = normalizeCategoryKey("Automobile", "Jaipur Self Drive Cars");
  assert.equal(c2, "car_rental", `Expected car_rental, got ${c2}`);

  const c3 = normalizeCategoryKey("Vehicle Hire", "Zoom Fleet");
  assert.equal(c3, "car_rental", `Expected car_rental, got ${c3}`);
});

runTest("Category Normalization: Gym / Fitness", () => {
  const g1 = normalizeCategoryKey("Fitness Center", "Gold's Gym");
  assert.equal(g1, "gym", `Expected gym, got ${g1}`);

  const g2 = normalizeCategoryKey("Crossfit Studio", "Iron Strength Fitness");
  assert.equal(g2, "gym", `Expected gym, got ${g2}`);
});

runTest("Category Normalization: Salon / Spa", () => {
  const s1 = normalizeCategoryKey("Hair Salon", "Looks Salon & Spa");
  assert.equal(s1, "salon", `Expected salon, got ${s1}`);

  const s2 = normalizeCategoryKey("Beauty Parlor", "Lakme Beauty Lounge");
  assert.equal(s2, "salon", `Expected salon, got ${s2}`);
});

runTest("Category Normalization: Dining / Food negative protection", () => {
  // Ensure non-food business with words like 'delight' or 'craft' does NOT become restaurant
  const carName = normalizeCategoryKey("Car Rental", "A1Carz Artisanal Fleet");
  assert.equal(carName, "car_rental", `Expected car_rental even with artisanal word, got ${carName}`);

  const rest = normalizeCategoryKey("Fine Dining", "Barbeque Nation");
  assert.equal(rest, "restaurant", `Expected restaurant, got ${rest}`);
});

// 2. Synthesize Phase 10 Design Inputs
runTest("Design Inputs Synthesis: Car Rental vs Restaurant vs Hotel", () => {
  const carInputs = synthesizePhase10DesignInputs(
    { businessName: "A1Carz Self Drive", city: "Jaipur" },
    "car_rental"
  );
  assert.match(carInputs.visualDirection, /automotive|mobility/i);
  assert.match(carInputs.ctaStrategy, /vehicle/i);
  assert.ok(!carInputs.ctaStrategy.includes("table"), "Car rental ctaStrategy must not include table");

  const diningInputs = synthesizePhase10DesignInputs(
    { businessName: "Royal Feast", city: "Jaipur" },
    "restaurant"
  );
  assert.match(diningInputs.ctaStrategy, /table/i);

  const hotelInputs = synthesizePhase10DesignInputs(
    { businessName: "Heritage Haveli", city: "Udaipur" },
    "hotel"
  );
  assert.match(hotelInputs.ctaStrategy, /suite|room/i);
});

// 3. Preview Generation End-to-End
await runAsyncTest("Preview Generation: A1Carz Self Drive (Zero Restaurant Leakage)", async () => {
  const lead = {
    leadId: "lead_a1carz_test",
    businessName: "A1Carz Self Drive",
    category: "Car Rental",
    industry: "car_rental",
    city: "Jaipur",
    state: "Rajasthan",
    phone: "+91 98290 12345",
  };

  const result = await generatePersonalizedPreview({
    leadId: lead.leadId,
    overrideLead: lead,
    requestId: "req_test_a1carz",
    options: { bypassCache: true },
  });

  if (!result.success) {
    console.error("Preview Generation Failed with:", JSON.stringify(result.error, null, 2));
  }
  assert.ok(result.success, "Preview generation should succeed");
  const data = result.preview;
  assert.ok(data, "Preview data must exist");

  // Read stored preview json
  const fs = await import("node:fs");
  const previewPath = path.join(process.cwd(), "scratch/previews", `${data.id}.json`);
  const websiteData = JSON.parse(fs.readFileSync(previewPath, "utf-8"));

  // Check CTA
  assert.equal(websiteData.hero.button, "Book a Vehicle", `Hero button should be 'Book a Vehicle', got ${websiteData.hero.button}`);
  assert.notEqual(websiteData.hero.button, "Reserve a Table", "Must NOT be 'Reserve a Table'");

  // Check Hero Image
  assert.ok(!websiteData.hero.image.includes("photo-1517248135467"), "Hero image must NOT be restaurant stock");
  assert.ok(!websiteData.hero.image.includes("photo-1552566626"), "Hero image must NOT be restaurant stock");
  const carRentalImageIds = [
    "photo-1449965408869",
    "photo-1549399542",
    "photo-1502877338",
    "photo-1563720223",
    "photo-1494976388",
    "photo-1503376780",
    "photo-1511919884",
    "photo-1552519507",
    "photo-1533473359",
    "photo-1542282088",
    "photo-1517524008",
    "photo-1506015391",
    "photo-1583121274",
    "photo-1514316454",
  ];
  assert.ok(
    carRentalImageIds.some((id) => websiteData.hero.image.includes(id)),
    `Hero image should be from automotive collection, got ${websiteData.hero.image}`
  );

  // Check Services
  const serviceTitles = websiteData.services.map((s) => s.title);
  assert.ok(serviceTitles.some((t) => t.includes("Fleet") || t.includes("Sedan") || t.includes("SUV")), "Services must reflect vehicles");
  assert.ok(!serviceTitles.some((t) => t.includes("Thali") || t.includes("Degustation")), "Services must NOT have food items");

  // Check Tagline and Email
  assert.match(websiteData.brand.tagline, /Vehicle Rental|Self-Drive/i);
  assert.match(websiteData.contact.email, /rentals@/i);
});

// 4. Preview Generation for Gym & Salon
await runAsyncTest("Preview Generation: Gym (Elite Fitness & Pass CTA)", async () => {
  const lead = {
    leadId: "lead_gym_test",
    businessName: "Olympus Power Gym",
    category: "Gym & Fitness",
    industry: "gym",
    city: "Mumbai",
  };

  const result = await generatePersonalizedPreview({
    leadId: lead.leadId,
    overrideLead: lead,
    requestId: "req_test_gym",
    options: { bypassCache: true },
  });

  const fs = await import("node:fs");
  const websiteData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scratch/previews", `${result.preview.id}.json`), "utf-8"));

  assert.equal(websiteData.hero.button, "Claim Free Pass");
  assert.match(websiteData.contact.email, /membership@/i);
  assert.ok(websiteData.services.some((s) => s.title.includes("Strength") || s.title.includes("Functional")));
});

await runAsyncTest("Preview Generation: Salon (Styling & Appointment CTA)", async () => {
  const lead = {
    leadId: "lead_salon_test",
    businessName: "Aura Luxury Salon",
    category: "Beauty Salon",
    industry: "salon",
    city: "Delhi",
  };

  const result = await generatePersonalizedPreview({
    leadId: lead.leadId,
    overrideLead: lead,
    requestId: "req_test_salon",
    options: { bypassCache: true },
  });

  const fs = await import("node:fs");
  const websiteData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scratch/previews", `${result.preview.id}.json`), "utf-8"));

  assert.equal(websiteData.hero.button, "Book Appointment");
  assert.match(websiteData.contact.email, /appointments@/i);
  assert.ok(websiteData.services.some((s) => s.title.includes("Hair") || s.title.includes("Bridal")));
});

// 5. Validation Rejection & Self-Correction
runTest("CTA Validator: Detects & Blocks Mismatch", () => {
  // Bad case: Car rental with dining CTA
  const badContext = {
    businessName: "A1Carz Self Drive",
    businessCategory: "car_rental",
    websiteData: {
      hero: {
        button: "Reserve a Table",
        buttonAction: { type: "scroll", target: "contact", label: "Reserve a Table" },
      },
    },
  };

  const stageResult = validateCTA(badContext);
  assert.equal(stageResult.passed, false, "Must fail validation when dining CTA is on car rental");
  assert.ok(stageResult.failures.some((f) => f.ruleCode === "CTA_INDUSTRY_MISMATCH"), "Must produce CTA_INDUSTRY_MISMATCH");

  // Good case: Car rental with vehicle CTA
  const goodContext = {
    businessName: "A1Carz Self Drive",
    businessCategory: "car_rental",
    websiteData: {
      hero: {
        button: "Book a Vehicle",
        buttonAction: { type: "scroll", target: "contact", label: "Book a Vehicle" },
      },
    },
  };

  const goodResult = validateCTA(goodContext);
  assert.equal(goodResult.passed, true, "Must pass validation when vehicle CTA is on car rental");
});

runTest("Semantic Validator: Detects Culinary Services on Car Rental", () => {
  const mismatchedData = {
    businessName: "A1Carz Self Drive",
    category: "car_rental",
    brand: { industry: "car_rental", name: "A1Carz" },
    sectionOrder: ["hero", "services", "contact"],
    hero: { title: "Welcome to A1Carz", buttonAction: { type: "scroll", target: "contact" } },
    contact: { phone: "1234567890", email: "rentals@test.com" },
    services: [
      { title: "Royal Thali & Degustation", description: "Culinary journey slow cooked in copper" },
    ],
  };

  const result = validateSemantics({ websiteData: mismatchedData });
  assert.equal(result.passed, false, "Must fail when services contradict car rental business");
  assert.ok(result.failures.some((f) => f.ruleCode === "SEM_SERVICE_INDUSTRY_MISMATCH"));
});

await runAsyncTest("RepairCoordinator: Deterministic Auto-Repair of Mismatch", async () => {
  const coordinator = RepairCoordinator.getInstance();

  const brokenWebsiteData = {
    businessName: "A1Carz Self Drive",
    category: "car_rental",
    brand: { industry: "car_rental", name: "A1Carz Self Drive" },
    sectionOrder: ["hero", "services", "contact"],
    hero: {
      title: "Welcome to A1Carz",
      button: "Reserve a Table",
      buttonAction: { type: "scroll", target: "contact", label: "Reserve a Table" },
    },
    services: [
      { title: "Signature Royal Thali", description: "Culinary journey" },
    ],
    contact: { phone: "+91 98290 12345", email: "rentals@test.com" },
  };

  const context = {
    businessName: "A1Carz Self Drive",
    businessCategory: "car_rental",
    websiteData: brokenWebsiteData,
    projectId: "proj_test_repair",
    runId: "run_test_repair",
    tenantId: "tenant_default",
  };

  const ctaCheck = validateCTA(context);
  const semCheck = validateSemantics(context);

  const combinedReport = {
    validationId: "val_test_report",
    projectId: "proj_test_repair",
    passed: false,
    blockingFailures: [...ctaCheck.failures, ...semCheck.failures],
    warnings: [],
    stageResults: [ctaCheck, semCheck],
  };

  const repairResult = await coordinator.executeRepair(context, combinedReport);
  assert.ok(repairResult.success, "Repair execution must succeed");

  const repaired = repairResult.repairedData;
  assert.equal(repaired.hero.button, "Book a Vehicle", "Repaired hero button must be 'Book a Vehicle'");
  assert.ok(repaired.services.some((s) => s.title.includes("Self-Drive Fleet")), "Repaired services must be vehicle services");
  assert.ok(!repaired.services.some((s) => s.title.includes("Thali")), "Repaired services must not have food items");
});

console.log("================================================================================");
console.log(`ALL ${totalPassed} REGRESSION & UNIT VERIFICATION TESTS PASSED CLEANLY!`);
console.log("================================================================================");
