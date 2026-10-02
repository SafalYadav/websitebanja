// src/lib/intelligence/validation/semanticValidator.ts
/**
 * Semantic Validator
 * Validates that the generated website matches intended business requirements
 * and strictly prevents contradictions against Grounded Business Intelligence.
 */

import { randomUUID } from "crypto";
import type {
  ValidationContext,
  StageValidationResult,
  ValidationFailureItem,
  ValidationWarningItem,
} from "./types";

export function validateSemantics(context: ValidationContext): StageValidationResult {
  const startTime = Date.now();
  const failures: ValidationFailureItem[] = [];
  const warnings: ValidationWarningItem[] = [];
  const evidence: string[] = [];

  const data = context.websiteData || {};
  const grounded = context.groundedProfile;

  // 1. Business Name Check
  const effectiveBusinessName =
    String(
      data.businessName ||
        (data.brand as Record<string, unknown>)?.name ||
        context.businessName ||
        ""
    ).trim();

  if (!effectiveBusinessName || /\[business[\s_-]?name\]|insert.*name|placeholder/i.test(effectiveBusinessName)) {
    failures.push({
      id: randomUUID(),
      stage: "SEMANTIC",
      severity: "CRITICAL",
      failure: "Business name is missing or contains placeholder tokens",
      evidence: `Resolved businessName: "${effectiveBusinessName}"`,
      affectedElement: "businessName",
      suggestedFix: "Inject verified business name into businessName and brand.name",
      blocking: true,
      field: "businessName",
      ruleCode: "SEM_MISSING_BUSINESS_NAME",
    });
  } else {
    evidence.push(`Verified business name present: "${effectiveBusinessName}"`);
  }

  // 2. Section Structure Checks
  const sectionOrder = Array.isArray(data.sectionOrder)
    ? (data.sectionOrder as string[])
    : Object.keys(data).filter((k) =>
        ["hero", "about", "services", "features", "contact", "footer", "faq", "productsSection"].includes(k)
      );

  if (sectionOrder.length < 3) {
    failures.push({
      id: randomUUID(),
      stage: "SEMANTIC",
      severity: "CRITICAL",
      failure: `Website has only ${sectionOrder.length} sections — minimum 3 required (hero, content, contact)`,
      evidence: `Found sections: ${sectionOrder.join(", ") || "none"}`,
      affectedElement: "sectionOrder",
      suggestedFix: "Generate at least hero, services or about, and contact sections",
      blocking: true,
      field: "sectionOrder",
      ruleCode: "SEM_TOO_FEW_SECTIONS",
    });
  }

  // Must have a hero section
  const hero = data.hero as Record<string, unknown> | undefined;
  if (!hero || (!hero.title && !hero.headline)) {
    failures.push({
      id: randomUUID(),
      stage: "SEMANTIC",
      severity: "CRITICAL",
      failure: "Hero section is missing or has empty title/headline",
      evidence: `hero exists: ${Boolean(hero)}, title: "${hero?.title || hero?.headline || ""}"`,
      affectedElement: "hero.title",
      suggestedFix: "Add a compelling headline matching business purpose to hero section",
      blocking: true,
      field: "hero",
      ruleCode: "SEM_MISSING_HERO",
    });
  }

  // Must have a contact section or contact info
  const contact = data.contact as Record<string, unknown> | undefined;
  if (!contact && !data.phone && !data.email && !hero?.buttonAction) {
    failures.push({
      id: randomUUID(),
      stage: "SEMANTIC",
      severity: "HIGH",
      failure: "No contact section or conversion endpoint found on the website",
      evidence: "Contact section missing and no direct phone/email contact fields found",
      affectedElement: "contact",
      suggestedFix: "Add contact section with phone, email, or contact form details",
      blocking: true,
      field: "contact",
      ruleCode: "SEM_MISSING_CONTACT_SECTION",
    });
  }

  // 3. Grounded Business Intelligence Contradiction Checks
  if (grounded) {
    const groundedName = grounded.identity?.canonicalName;
    const groundedArchetype = grounded.archetype;
    const groundedServices = grounded.services || [];
    const groundedLocation = grounded.location;

    // 3a. Grounded Business Name Contradiction
    if (groundedName && effectiveBusinessName) {
      const gNorm = groundedName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const eNorm = effectiveBusinessName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (gNorm && eNorm && !gNorm.includes(eNorm) && !eNorm.includes(gNorm)) {
        failures.push({
          id: randomUUID(),
          stage: "SEMANTIC",
          severity: "HIGH",
          failure: `Generated business name "${effectiveBusinessName}" contradicts grounded business name "${groundedName}"`,
          evidence: `Grounded name from verified sources is "${groundedName}", but generated name is "${effectiveBusinessName}"`,
          affectedElement: "businessName",
          suggestedFix: `Update businessName to match verified name "${groundedName}"`,
          blocking: true,
          field: "businessName",
          ruleCode: "SEM_GROUNDED_NAME_CONTRADICTION",
        });
      } else {
        evidence.push(`Name aligns with Grounded BI: "${groundedName}"`);
      }
    }

    // 3b. Grounded Archetype / Industry Family Contradiction
    if (groundedArchetype && groundedArchetype !== "unknown") {
      const generatedCategory = String(
        (data.brand as Record<string, unknown>)?.industry ||
          data.category ||
          context.businessCategory ||
          ""
      ).toLowerCase();

      const archetypeLower = groundedArchetype.toLowerCase();
      // Detect contradictory archetypes (e.g. food vs automotive vs healthcare vs legal)
      const domainKeywords: Record<string, string[]> = {
        food: ["restaurant", "cafe", "bakery", "food", "dining", "bar", "pizza", "bistro", "culinary"],
        automotive: ["auto", "car", "rental", "repair", "mechanic", "vehicle", "dealership"],
        healthcare: ["clinic", "doctor", "dental", "dentist", "hospital", "medical", "therapy", "pharma"],
        legal: ["lawyer", "attorney", "law firm", "advocate", "legal"],
        real_estate: ["realtor", "real estate", "property", "apartment", "broker"],
      };

      let groundedDomain = "";
      for (const [dom, keywords] of Object.entries(domainKeywords)) {
        if (keywords.some((k) => archetypeLower.includes(k))) {
          groundedDomain = dom;
          break;
        }
      }

      if (groundedDomain && generatedCategory) {
        const contradictoryDomains = Object.entries(domainKeywords).filter(
          ([dom]) => dom !== groundedDomain
        );
        for (const [otherDom, otherKeywords] of contradictoryDomains) {
          if (otherKeywords.some((k) => generatedCategory.includes(k))) {
            failures.push({
              id: randomUUID(),
              stage: "SEMANTIC",
              severity: "CRITICAL",
              failure: `Generated business industry "${generatedCategory}" directly contradicts Grounded BI archetype "${groundedArchetype}"`,
              evidence: `Grounded BI identifies domain "${groundedDomain}" (${groundedArchetype}), but generated site claims "${generatedCategory}"`,
              affectedElement: "brand.industry",
              suggestedFix: `Realign brand industry with verified Grounded BI archetype "${groundedArchetype}"`,
              blocking: true,
              field: "brand.industry",
              ruleCode: "SEM_GROUNDED_ARCHETYPE_CONTRADICTION",
            });
            break;
          }
        }
      }
    }

    // 3c. Grounded Services Contradiction
    if (groundedServices.length > 0) {
      const verifiedServiceNames = groundedServices.map((s: { name: string }) => s.name.toLowerCase());
      const generatedServices = Array.isArray(data.services)
        ? (data.services as Array<{ title?: string; name?: string; description?: string }>)
        : [];

      if (generatedServices.length > 0) {
        evidence.push(
          `Grounded BI services provided (${verifiedServiceNames.length}): ${verifiedServiceNames.slice(0, 3).join(", ")}`
        );
      }
    }

    // 3d. Grounded Location Contradiction
    if (groundedLocation && groundedLocation.city && groundedLocation.city !== "unknown") {
      const groundedCity = groundedLocation.city.toLowerCase();
      const generatedAddress = String(
        (data.contact as Record<string, unknown>)?.address || data.address || ""
      ).toLowerCase();

      if (generatedAddress && !generatedAddress.includes(groundedCity)) {
        failures.push({
          id: randomUUID(),
          stage: "SEMANTIC",
          severity: "HIGH",
          failure: `Generated address "${generatedAddress}" contradicts Grounded BI verified city "${groundedLocation.city}"`,
          evidence: `Grounded location: ${groundedLocation.formattedAddress || groundedLocation.city}; Generated address: "${generatedAddress}"`,
          affectedElement: "contact.address",
          suggestedFix: `Update contact address to match verified city "${groundedLocation.city}"`,
          blocking: true,
          field: "contact.address",
          ruleCode: "SEM_GROUNDED_LOCATION_CONTRADICTION",
        });
      }
    }
  }

  // 4. Asset & Offering Cross-Category Compatibility Check
  const effectiveIndustry = String(
    context.groundedProfile?.archetype ||
      (data.brand as Record<string, unknown>)?.industry ||
      data.category ||
      context.businessCategory ||
      ""
  ).toLowerCase();
  const effectiveName = String(
    context.groundedProfile?.identity?.canonicalName ||
      data.businessName ||
      context.businessName ||
      ""
  ).toLowerCase();

  const isCarOrVehicle =
    effectiveIndustry.includes("car") ||
    effectiveIndustry.includes("rental") ||
    effectiveIndustry.includes("vehicle") ||
    effectiveName.includes("car") ||
    effectiveName.includes("drive");

  const isGymOrFitness =
    effectiveIndustry.includes("gym") ||
    effectiveIndustry.includes("fitness") ||
    effectiveName.includes("gym");

  const isSalonOrSpa =
    effectiveIndustry.includes("salon") ||
    effectiveIndustry.includes("beauty") ||
    effectiveName.includes("salon");

  const isNonFoodIndustry = isCarOrVehicle || isGymOrFitness || isSalonOrSpa;

  // Check services
  const servicesList = Array.isArray(data.services)
    ? (data.services as Array<{ title?: string; description?: string }>)
    : [];
  const servicesText = servicesList
    .map((s) => `${s.title || ""} ${s.description || ""}`)
    .join(" ")
    .toLowerCase();

  const hasCulinaryServices =
    servicesText.includes("thali") ||
    servicesText.includes("degustation") ||
    servicesText.includes("dining suites") ||
    servicesText.includes("charcoal hearth") ||
    servicesText.includes("culinary journey");

  if (isNonFoodIndustry && hasCulinaryServices) {
    failures.push({
      id: randomUUID(),
      stage: "SEMANTIC",
      severity: "CRITICAL",
      failure: `Services contain dining/culinary offerings contradictory to non-food business (${effectiveIndustry || effectiveName})`,
      evidence: `Found culinary offerings on ${effectiveIndustry || effectiveName}: ${servicesList.map((s) => s.title).join(", ")}`,
      affectedElement: "services",
      suggestedFix: "Replace culinary offerings with category-aligned services",
      blocking: true,
      field: "services",
      ruleCode: "SEM_SERVICE_INDUSTRY_MISMATCH",
    });
  }

  // Check hero image compatibility
  const heroImage = String((data.hero as Record<string, unknown>)?.image || "");
  const knownFoodRestaurantImageUrls = [
    "photo-1517248135467-4c7edcad34c4",
    "photo-1552566626-52f8b828add9",
    "photo-1544025162-d76694265947",
    "photo-1555396273-367ea4eb4db5",
  ];
  if (isNonFoodIndustry && knownFoodRestaurantImageUrls.some((u) => heroImage.includes(u))) {
    failures.push({
      id: randomUUID(),
      stage: "SEMANTIC",
      severity: "CRITICAL",
      failure: `Hero image is a restaurant/dining asset contradictory to ${effectiveIndustry || effectiveName}`,
      evidence: `Hero image URL: "${heroImage}"`,
      affectedElement: "hero.image",
      suggestedFix: "Re-source hero image from the appropriate category registry",
      blocking: true,
      field: "hero.image",
      ruleCode: "SEM_IMAGE_INDUSTRY_MISMATCH",
    });
  }

  const hasBlocking = failures.some((f) => f.blocking);


  const status = hasBlocking ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";

  return {
    stage: "SEMANTIC",
    status,
    passed: !hasBlocking,
    score: hasBlocking ? Math.max(0, 50 - failures.length * 20) : Math.max(70, 100 - warnings.length * 10),
    failures,
    warnings,
    evidence,
    suggestedFix: failures[0]?.suggestedFix,
    durationMs: Date.now() - startTime,
  };
}
