import assert from "node:assert/strict";
import test from "node:test";

import {
  businessSemanticReasoner,
  containsSemanticPhrase,
} from "../src/lib/intelligence/semantic/businessSemanticReasoner.ts";
import {
  normalizeCategoryKey,
  resolveSemanticImage,
} from "../src/lib/images/semanticImageSourcing.ts";
import { getCategoryImages, resolveCategoryKey } from "../src/lib/categoryImages.ts";

test("Thai Spa Jaipur is wellness, never AI/SaaS", () => {
  assert.equal(containsSemanticPhrase("thai spa jaipur", "ai"), false);
  const profile = businessSemanticReasoner.analyzeBusiness({
    businessName: "Thai Spa Jaipur",
    category: "spa",
    types: ["spa", "massage_spa"],
    location: "Jaipur, Rajasthan",
  });

  assert.equal(profile.domain, "wellness_personal_care");
  assert.equal(profile.subdomain, "spa_and_massage");
  assert.equal(profile.primaryCta.intent, "book_wellness_treatment");
  assert.ok(profile.preferredImageryThemes.includes("thai_massage_wellness"));
  assert.ok(profile.recommendedServices.every((service) => !/telemetry|software|fine-tuning|haircut/i.test(service.title)));
});

test("complete AI token still classifies a software company as SaaS", () => {
  assert.equal(containsSemanticPhrase("AI software company", "ai"), true);
  const profile = businessSemanticReasoner.analyzeBusiness({
    businessName: "Orbit AI",
    category: "AI software company",
  });
  assert.equal(profile.domain, "software_technology");
});

test("substring lookalikes never classify as AI", () => {
  for (const businessName of ["Said & Sons", "Painting House", "Retail Corner"]) {
    assert.equal(containsSemanticPhrase(businessName.toLowerCase(), "ai"), false);
  }
});

test("unknown explicit business types require research despite hotel landmarks", () => {
  const profile = businessSemanticReasoner.analyzeBusiness({
    businessName: "G-Town Wines",
    category: "liquor_store",
    location: "adjacent to Bristol Hotel, Gurugram",
    description: "A local shop adjacent to Bristol Hotel",
  });
  assert.equal(profile.domain, "general_commercial");
  assert.ok(profile.confidence < 0.7);
  assert.notEqual(profile.primaryCta.label, "Reserve a Room");
});

test("location never changes business classification", () => {
  const base = { businessName: "Lotus Spa", category: "spa" };
  const expected = businessSemanticReasoner.analyzeBusiness(base);
  const besideHotel = businessSemanticReasoner.analyzeBusiness({ ...base, location: "Hotel Resort Inn Road" });
  assert.equal(besideHotel.domain, expected.domain);
  assert.equal(besideHotel.subdomain, expected.subdomain);
});

test("spa image sourcing stays in the wellness registry", () => {
  assert.equal(normalizeCategoryKey("spa_and_massage", "Thai Spa Jaipur", "wellness_personal_care"), "wellness_spa");
  const image = resolveSemanticImage({
    category: "spa_and_massage",
    businessName: "Thai Spa Jaipur",
    archetype: "wellness_personal_care",
    role: "hero",
    preferredSubjects: ["massage treatment room", "spa treatment bed"],
    forbiddenSubjects: ["server rack", "coffee beans", "hair cutting chair"],
  });
  assert.equal(image.category, "wellness_spa");
  assert.match(image.semanticIntent, /massage|spa|wellness/i);
  assert.doesNotMatch(image.semanticIntent, /server|coffee|hair salon/i);
});

test("renderer category fallback keeps wellness imagery and never uses general tech stock", () => {
  assert.equal(resolveCategoryKey("wellness_spa", "Thai Spa Jaipur", "massage and relaxation"), "spa");
  const images = getCategoryImages("wellness_spa", "Thai Spa Jaipur", "massage and relaxation");
  const allImages = [images.hero, images.about, ...images.services, ...images.features];
  assert.ok(allImages.every((image) => !image.includes("photo-1460925895917")));
});

test("representative categories remain separated", () => {
  const cases = [
    ["Lotus Massage Center", "massage", "wellness_personal_care"],
    ["Bella Hair Salon", "salon", "beauty_aesthetics"],
    ["Amber Restaurant", "restaurant", "food_dining"],
    ["Jaipur Bike Rental", "bike rental", "transportation_mobility"],
    ["Smile Dental Clinic", "dental clinic", "healthcare_clinical"],
    ["Sharma Law Firm", "legal counsel", "professional_services"],
    ["Bright Future Academy", "education", "education_training"],
  ];

  for (const [businessName, category, expectedDomain] of cases) {
    const profile = businessSemanticReasoner.analyzeBusiness({ businessName, category });
    assert.equal(profile.domain, expectedDomain, `${businessName} should resolve to ${expectedDomain}`);
  }
});
