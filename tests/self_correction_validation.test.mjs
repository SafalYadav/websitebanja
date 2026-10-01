// tests/self_correction_validation.test.mjs
/**
 * Self-Correction & Validation Comprehensive Test Suite
 * Requirement #21: Quality Gate + Bounded Repair Loop
 * Verifies all 32 required functional, safety, and governance criteria.
 */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createJiti from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jiti = createJiti(__dirname, {
  alias: { "@": path.resolve(__dirname, "../src") },
  interopDefault: true,
});

const {
  ORDERED_VALIDATION_STAGES,
  validateSemantics,
  validateVisual,
  validateCTA,
  validateNavigation,
  validateClaims,
  validateAccessibility,
  validatePerformance,
  validationOrchestrator,
  repairCoordinator,
  validationStore,
} = jiti("@/lib/intelligence/index.ts");


function createValidWebsiteData(name = "Apex Dental Clinic") {
  return {
    businessName: name,
    brand: {
      name,
      industry: "dental clinic",
      location: "Vadodara, Gujarat",
    },
    sectionOrder: ["hero", "services", "about", "contact", "footer"],
    hero: {
      title: `Welcome to ${name}`,
      subtitle: "Comprehensive dental care for your family",
      button: "Book Appointment",
      buttonAction: {
        type: "scroll",
        target: "contact",
        label: "Book Appointment",
      },
      image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5",
      imageAlt: "Modern dental office interior",
    },
    about: {
      title: "About Our Clinic",
      content: "Dedicated to providing high quality oral healthcare with modern equipment.",
    },
    services: [
      {
        title: "Teeth Cleaning",
        description: "Professional dental scaling and polishing.",
      },
      {
        title: "Dental Implants",
        description: "Permanent replacement for missing teeth.",
      },
    ],
    contact: {
      phone: "+91 9876543210",
      email: "contact@apexdental.com",
      address: "101 Health Care Tower, Vadodara, Gujarat",
    },
    navbar: {
      links: [
        { id: "nav-services", label: "Services", action: { type: "scroll", target: "services" } },
        { id: "nav-about", label: "About", action: { type: "scroll", target: "about" } },
        { id: "nav-contact", label: "Contact", action: { type: "scroll", target: "contact" } },
      ],
    },
    footer: {
      copyright: `© ${new Date().getFullYear()} ${name}. All rights reserved.`,
    },
  };
}

function createSampleGroundedProfile() {
  return {
    businessId: "biz_apex_dental",
    tenantId: "tenant_test",
    identity: {
      businessId: "biz_apex_dental",
      canonicalName: "Apex Dental Clinic",
      formattedAddress: "101 Health Care Tower, Vadodara, Gujarat",
      sourceReferences: {},
    },
    archetype: "dental_clinic",
    archetypeConfidence: "HIGH",
    industryFamily: "healthcare",
    industryConfidence: "HIGH",
    services: [
      {
        id: "srv_cleaning",
        name: "Teeth Cleaning",
        description: "Dental hygiene and scaling",
        confidence: "HIGH",
        sourceType: "google_places",
      },
      {
        id: "srv_implants",
        name: "Dental Implants",
        description: "Restorative dental implants",
        confidence: "HIGH",
        sourceType: "google_places",
      },
    ],
    audience: [],
    location: {
      city: "Vadodara",
      region: "Gujarat",
      country: "India",
      formattedAddress: "101 Health Care Tower, Vadodara, Gujarat",
      isServiceAreaOnly: false,
      confidence: "HIGH",
    },
    brandSignals: {
      colors: ["#0066cc"],
      tagline: "Quality dental care",
      tone: "professional",
      keywords: ["dentist", "implants"],
      confidence: "HIGH",
    },
    visualStyle: {
      palette: "ocean_calm",
      typography: "clean_sans",
      cardStyle: "soft-surface",
      confidence: "HIGH",
    },
    ctaStrategy: {
      primaryCta: "Book Appointment",
      secondaryCta: "Call Us",
      intent: "appointment_booking",
      confidence: "HIGH",
    },
    evidence: [],
    factsAndInferences: [],
    forbiddenClaims: [],
    conflicts: [],
    ambiguity: { hasAmbiguity: false, candidateCount: 1, reason: null },
    freshness: {
      fetchedAt: new Date().toISOString(),
      freshnessStatus: "FRESH",
      sourcesFetched: ["google_places"],
    },
    compositeConfidence: 0.95,
    compositeConfidenceLevel: "HIGH",
  };
}

test("1. Validation Pipeline Ordering: Stages execute in exact deterministic order", () => {
  const expectedOrder = [
    "SEMANTIC",
    "VISUAL",
    "CTA",
    "NAVIGATION",
    "CLAIMS",
    "ACCESSIBILITY",
    "PERFORMANCE",
  ];
  assert.deepEqual(ORDERED_VALIDATION_STAGES, expectedOrder);
});

test("2. Semantic Validation: Valid website passes with no blocking failures", () => {
  const websiteData = createValidWebsiteData();
  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
    businessName: "Apex Dental Clinic",
  };

  const result = validateSemantics(context);
  assert.equal(result.stage, "SEMANTIC");
  assert.equal(result.passed, true);
  assert.equal(result.failures.length, 0);
  assert.equal(result.status, "PASS");
});

test("3. Semantic Validation: Detects missing business name as CRITICAL", () => {
  const websiteData = createValidWebsiteData();
  websiteData.businessName = "[Business Name]";
  websiteData.brand.name = "";
  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
    businessName: "",
  };

  const result = validateSemantics(context);
  assert.equal(result.passed, false);
  const nameFail = result.failures.find((f) => f.ruleCode === "SEM_MISSING_BUSINESS_NAME");
  assert.ok(nameFail);
  assert.equal(nameFail.severity, "CRITICAL");
  assert.equal(nameFail.blocking, true);
});

test("4. Semantic Validation: Grounded BI Archetype contradiction flagged as CRITICAL", () => {
  const websiteData = createValidWebsiteData("Mario Pizza Palace");
  websiteData.brand.industry = "Italian Restaurant & Pizza";
  websiteData.category = "Italian Restaurant";

  const groundedProfile = createSampleGroundedProfile(); // Archetype: dental_clinic
  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
    businessName: "Apex Dental Clinic",
    groundedProfile,
  };

  const result = validateSemantics(context);
  assert.equal(result.passed, false);
  const archFail = result.failures.find((f) => f.ruleCode === "SEM_GROUNDED_ARCHETYPE_CONTRADICTION");
  assert.ok(archFail);
  assert.equal(archFail.severity, "CRITICAL");
  assert.equal(archFail.blocking, true);
});

test("5. Semantic Validation: Grounded BI Location contradiction flagged as HIGH", () => {
  const websiteData = createValidWebsiteData();
  websiteData.contact.address = "742 Evergreen Terrace, Miami, Florida"; // Contradicts Vadodara

  const groundedProfile = createSampleGroundedProfile();
  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
    businessName: "Apex Dental Clinic",
    groundedProfile,
  };

  const result = validateSemantics(context);
  assert.equal(result.passed, false);
  const locFail = result.failures.find((f) => f.ruleCode === "SEM_GROUNDED_LOCATION_CONTRADICTION");
  assert.ok(locFail);
  assert.equal(locFail.severity, "HIGH");
  assert.equal(locFail.blocking, true);
});

test("6. Visual Validation Contract: Valid AST layout passes with no blocking errors", () => {
  const websiteData = createValidWebsiteData();
  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
    is3dRequested: false,
  };

  const result = validateVisual(context);
  assert.equal(result.stage, "VISUAL");
  assert.equal(result.passed, true);
  assert.equal(result.failures.length, 0);
});

test("7. Visual Validation: Reports UNAVAILABLE when browser runtime is requested but absent", () => {
  const websiteData = createValidWebsiteData();
  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
    runtimeHasBrowser: false,
    screenshotPaths: {},
  };

  const result = validateVisual(context);
  assert.equal(result.stage, "VISUAL");
  assert.equal(result.status, "UNAVAILABLE");
  assert.ok(result.unavailabilityReason?.includes("Browser screenshot rendering runtime not active"));
});

test("8. Visual Validation: Unwanted 3D/WebGL rendering on 2D project flagged as CRITICAL", () => {
  const websiteData = createValidWebsiteData();
  websiteData.spatial3d = { enabled: true, level: "ADVANCED_CSS_3D" };
  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
    is3dRequested: false, // Explicitly 2D
  };

  const result = validateVisual(context);
  assert.equal(result.passed, false);
  const threedFail = result.failures.find((f) => f.ruleCode === "VIS_UNWANTED_3D_ENABLED");
  assert.ok(threedFail);
  assert.equal(threedFail.severity, "CRITICAL");
});

test("9. CTA Validation: Valid primary CTA passes", () => {
  const websiteData = createValidWebsiteData();
  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateCTA(context);
  assert.equal(result.stage, "CTA");
  assert.equal(result.passed, true);
  assert.equal(result.status, "PASS");
});

test("10. CTA Validation: Missing hero button flagged as CRITICAL", () => {
  const websiteData = createValidWebsiteData();
  websiteData.hero.button = "";
  websiteData.hero.buttonAction = undefined;

  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateCTA(context);
  assert.equal(result.passed, false);
  const ctaFail = result.failures.find((f) => f.ruleCode === "CTA_MISSING_PRIMARY");
  assert.ok(ctaFail);
  assert.equal(ctaFail.severity, "CRITICAL");
  assert.equal(ctaFail.blocking, true);
});

test("11. CTA Validation: Broken destination ('#') flagged as CRITICAL", () => {
  const websiteData = createValidWebsiteData();
  websiteData.hero.buttonAction = { type: "scroll", target: "#", label: "Book Now" };

  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateCTA(context);
  assert.equal(result.passed, false);
  const brokenFail = result.failures.find((f) => f.ruleCode === "CTA_BROKEN_DESTINATION");
  assert.ok(brokenFail);
  assert.equal(brokenFail.severity, "CRITICAL");
});

test("12. CTA Validation: Scroll CTA targeting non-existent section flagged as HIGH", () => {
  const websiteData = createValidWebsiteData();
  websiteData.hero.buttonAction = { type: "scroll", target: "non_existent_section", label: "Book" };

  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateCTA(context);
  assert.equal(result.passed, false);
  const targetFail = result.failures.find((f) => f.ruleCode === "CTA_TARGET_SECTION_NOT_FOUND");
  assert.ok(targetFail);
  assert.equal(targetFail.severity, "HIGH");
});

test("13. Navigation Validation: Valid internal navbar links pass", () => {
  const websiteData = createValidWebsiteData();
  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateNavigation(context);
  assert.equal(result.stage, "NAVIGATION");
  assert.equal(result.passed, true);
  assert.equal(result.failures.length, 0);
});

test("14. Navigation Validation: Broken internal anchor link flagged as HIGH", () => {
  const websiteData = createValidWebsiteData();
  websiteData.navbar.links.push({
    id: "nav-broken",
    label: "Pricing",
    action: { type: "scroll", target: "#pricing_missing_section" },
  });

  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateNavigation(context);
  assert.equal(result.passed, false);
  const navFail = result.failures.find((f) => f.ruleCode === "NAV_BROKEN_INTERNAL_ANCHOR");
  assert.ok(navFail);
  assert.equal(navFail.severity, "HIGH");
});

test("15. Navigation Validation: Multi-page site missing home page flagged as CRITICAL", () => {
  const websiteData = createValidWebsiteData();
  websiteData.pages = [
    { id: "p1", slug: "about", title: "About", isHome: false, sectionOrder: ["about"] },
    { id: "p2", slug: "contact", title: "Contact", isHome: false, sectionOrder: ["contact"] },
  ];

  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateNavigation(context);
  assert.equal(result.passed, false);
  const homeFail = result.failures.find((f) => f.ruleCode === "NAV_MISSING_HOME_PAGE");
  assert.ok(homeFail);
  assert.equal(homeFail.severity, "CRITICAL");
});

test("16. Claims Validation: Content without forbidden superlatives passes", () => {
  const websiteData = createValidWebsiteData();
  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateClaims(context);
  assert.equal(result.stage, "CLAIMS");
  assert.equal(result.passed, true);
  assert.equal(result.failures.length, 0);
});

test("17. Claims Validation: Unsupported award claim flagged as CRITICAL", () => {
  const websiteData = createValidWebsiteData();
  websiteData.hero.subtitle = "We are an award-winning clinic serving patients.";

  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateClaims(context);
  assert.equal(result.passed, false);
  const awardFail = result.failures.find((f) => f.ruleCode === "CLM_UNSUPPORTED_AWARD");
  assert.ok(awardFail);
  assert.equal(awardFail.severity, "CRITICAL");
  assert.equal(awardFail.blocking, true);
});

test("18. Claims Validation: Unsupported regulatory certification flagged as CRITICAL", () => {
  const websiteData = createValidWebsiteData();
  websiteData.about.content = "All procedures follow ISO-9001 certified dental protocols.";

  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateClaims(context);
  assert.equal(result.passed, false);
  const certFail = result.failures.find((f) => f.ruleCode === "CLM_UNSUPPORTED_CERTIFICATION");
  assert.ok(certFail);
  assert.equal(certFail.severity, "CRITICAL");
});

test("19. Claims Validation: Fabricated customer statistics flagged as HIGH", () => {
  const websiteData = createValidWebsiteData();
  websiteData.hero.subtitle = "Trusted by 10,000+ satisfied clients across the city.";

  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateClaims(context);
  assert.equal(result.passed, false);
  const statFail = result.failures.find((f) => f.ruleCode === "CLM_FABRICATED_STATISTIC");
  assert.ok(statFail);
  assert.equal(statFail.severity, "HIGH");
});

test("20. Claims Validation: Unsupported contractual guarantee flagged as CRITICAL", () => {
  const websiteData = createValidWebsiteData();
  websiteData.services[0].description = "Teeth cleaning with 100% money-back guarantee if not satisfied.";

  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateClaims(context);
  assert.equal(result.passed, false);
  const guarFail = result.failures.find((f) => f.ruleCode === "CLM_UNSUPPORTED_GUARANTEE");
  assert.ok(guarFail);
  assert.equal(guarFail.severity, "CRITICAL");
});

test("21. Accessibility Validation: Valid headings and buttons pass", () => {
  const websiteData = createValidWebsiteData();
  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateAccessibility(context);
  assert.equal(result.stage, "ACCESSIBILITY");
  assert.equal(result.passed, true);
  assert.equal(result.failures.length, 0);
});

test("22. Accessibility Validation: Missing h1 heading flagged as HIGH", () => {
  const websiteData = createValidWebsiteData();
  websiteData.hero.title = "";

  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validateAccessibility(context);
  assert.equal(result.passed, false);
  const h1Fail = result.failures.find((f) => f.ruleCode === "A11Y_MISSING_H1");
  assert.ok(h1Fail);
  assert.equal(h1Fail.severity, "HIGH");
  assert.equal(h1Fail.blocking, true);
});

test("23. Performance Validation: Normal payload passes and honest UNAVAILABLE reported for live CWV", () => {
  const websiteData = createValidWebsiteData();
  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validatePerformance(context);
  assert.equal(result.stage, "PERFORMANCE");
  assert.equal(result.passed, true);
  assert.ok(result.evidence.some((e) => e.includes("Lighthouse/CWV") && e.includes("UNAVAILABLE")));
});

test("24. Performance Validation: Oversized embedded base64 image (>250KB) flagged as HIGH", () => {
  const websiteData = createValidWebsiteData();
  // Inject a 300KB dummy base64 string
  const largeBase64 = "data:image/png;base64," + "A".repeat(300 * 1024);
  websiteData.hero.image = largeBase64;

  const context = {
    projectId: "proj_1",
    runId: "run_1",
    tenantId: "tenant_test",
    websiteData,
  };

  const result = validatePerformance(context);
  assert.equal(result.passed, false);
  const uriFail = result.failures.find((f) => f.ruleCode === "PERF_UNOPTIMIZED_DATA_URI");
  assert.ok(uriFail);
  assert.equal(uriFail.severity, "HIGH");
});

test("25. Validation Orchestrator: Valid website completes 7 stages and outputs READY", async () => {
  const websiteData = createValidWebsiteData();
  const context = {
    projectId: "proj_valid_e2e",
    runId: "run_val_1",
    tenantId: "tenant_test",
    websiteData,
    businessName: "Apex Dental Clinic",
  };

  const report = await validationOrchestrator.validateWebsite(context);
  assert.equal(report.decision, "READY");
  assert.equal(report.blockingFailures.length, 0);
  assert.ok(report.overallScore && report.overallScore >= 70);
  assert.equal(Object.keys(report.stageResults).length, 7);
});

test("26. Failure Structure: Blocking failure creates complete structured diagnostic", async () => {
  const websiteData = createValidWebsiteData();
  websiteData.hero.button = ""; // triggers missing CTA
  websiteData.hero.buttonAction = undefined;

  const context = {
    projectId: "proj_fail_struct",
    runId: "run_val_2",
    tenantId: "tenant_test",
    websiteData,
  };

  const report = await validationOrchestrator.validateWebsite(context);
  assert.equal(report.decision, "REPAIR_REQUIRED");
  assert.ok(report.blockingFailures.length > 0);

  const fail = report.blockingFailures[0];
  assert.ok(fail.id);
  assert.ok(fail.stage);
  assert.ok(fail.severity);
  assert.ok(fail.failure);
  assert.ok(fail.evidence);
  assert.ok(fail.affectedElement);
  assert.ok(fail.suggestedFix);
  assert.equal(fail.blocking, true);
});

test("27. CEO Alert Creation: Structured diagnostic alert without chain-of-thought", async () => {
  const websiteData = createValidWebsiteData();
  websiteData.hero.button = "";
  websiteData.hero.buttonAction = undefined;

  const context = {
    projectId: "proj_ceo_alert",
    runId: "run_val_3",
    tenantId: "tenant_test",
    websiteData,
  };

  const report = await validationOrchestrator.validateWebsite(context);
  const alert = repairCoordinator.createCeoAlert(report);

  assert.ok(alert.alertId.startsWith("ceo_alert_"));
  assert.equal(alert.projectId, "proj_ceo_alert");
  assert.equal(alert.decision, "REPAIR_REQUIRED");
  assert.ok(alert.blockingFailures.length > 0);
  assert.ok(alert.recommendedAction);
});

test("28. Boss Correction Delegation: Synthesizes valid Depth 1 TaskEnvelope", async () => {
  const websiteData = createValidWebsiteData();
  websiteData.hero.button = "";
  websiteData.hero.buttonAction = undefined;

  const context = {
    projectId: "proj_boss_deleg",
    runId: "run_val_4",
    tenantId: "tenant_test",
    websiteData,
  };

  const report = await validationOrchestrator.validateWebsite(context);
  const repairResult = await repairCoordinator.executeRepair(context, report);

  assert.equal(repairResult.success, true);
  assert.ok(repairResult.delegationTask);
  assert.equal(repairResult.delegationTask.agent, "Boss");
  assert.equal(repairResult.delegationTask.depth, 1);
  assert.equal(repairResult.delegationTask.riskLevel, "low");
  assert.equal(repairResult.delegationTask.status, "COMPLETED");
});

test("29. Targeted Repair: Resolves missing CTA without regenerating entire project", async () => {
  const websiteData = createValidWebsiteData();
  websiteData.hero.button = ""; // broken CTA
  websiteData.hero.buttonAction = undefined;

  const context = {
    projectId: "proj_targeted_rep",
    runId: "run_val_5",
    tenantId: "tenant_test",
    websiteData,
  };

  const report = await validationOrchestrator.validateWebsite(context);
  assert.equal(report.decision, "REPAIR_REQUIRED");

  const repairResult = await repairCoordinator.executeRepair(context, report);
  assert.equal(repairResult.success, true);
  assert.ok(repairResult.repairedData.hero.button);
  assert.equal(repairResult.repairedData.hero.buttonAction.target, "contact");

  // Re-validating repaired data passes CTA stage
  const reval = await validationOrchestrator.validateWebsite({
    ...context,
    websiteData: repairResult.repairedData,
  });
  assert.equal(reval.stageResults.CTA.passed, true);
  assert.equal(reval.decision, "READY");
});

test("30. Loop Protection: Repeated failure fingerprint halts repair loop and escalates", () => {
  const failures = [
    {
      id: "f1",
      stage: "CTA",
      severity: "CRITICAL",
      failure: "Broken CTA",
      evidence: "target #",
      affectedElement: "hero.buttonAction.target",
      suggestedFix: "fix target",
      blocking: true,
      ruleCode: "CTA_BROKEN_DESTINATION",
    },
  ];

  const fp = repairCoordinator.computeFailureFingerprint(failures);
  assert.ok(fp);

  // If fingerprint appeared twice before in history, detectLoop returns true
  const history = [fp, fp];
  const isLoop = repairCoordinator.detectLoop(fp, history);
  assert.equal(isLoop, true);
});

test("31. Maximum Retry Cap: Server-side bounded limit prevents infinite loops", async () => {
  // Website with a malformed service item that targeted patches do not silently auto-repair
  const unrepairableData = createValidWebsiteData();
  unrepairableData.services = [null]; // triggers VIS_MALFORMED_CARD which is not auto-patched

  const context = {
    projectId: "proj_max_retries",
    runId: "run_val_6",
    tenantId: "tenant_test",
    websiteData: unrepairableData,
    maxRetries: 2, // Low bound for test speed
  };

  const loopResult = await validationOrchestrator.executeSelfCorrectionLoop(context);
  assert.equal(loopResult.repaired, false);
  assert.ok(loopResult.cycles <= 3); // bounded
  assert.ok(loopResult.ceoAlert);
  assert.equal(loopResult.finalReport.decision, "FAILED");
});

test("32. Tenant Isolation & Secret Redaction: Reports preserved by tenant and scrubbed", async () => {
  validationStore._clearForTest();

  const websiteData = createValidWebsiteData();
  const context = {
    projectId: "proj_tenant_iso",
    runId: "run_val_7",
    tenantId: "tenant_alpha",
    websiteData,
    businessName: "Secret AI AIzaSy1234567890abcdef1234567890 sk-proj-1234567890abcdef1234567890",
  };

  const report = await validationOrchestrator.validateWebsite(context);
  assert.ok(report.validationId);

  // Tenant Alpha can access
  const alphaReport = validationStore.getReport(report.validationId, "tenant_alpha");
  assert.ok(alphaReport);

  // Tenant Beta is blocked
  const betaReport = validationStore.getReport(report.validationId, "tenant_beta");
  assert.equal(betaReport, null);

  // Verify secret tokens were scrubbed
  const rawReportJson = JSON.stringify(alphaReport);
  assert.equal(rawReportJson.includes("AIzaSy1234567890abcdef1234567890"), false);
  assert.equal(rawReportJson.includes("sk-proj-1234567890abcdef1234567890"), false);
  assert.ok(rawReportJson.includes("[REDACTED_API_KEY]"));
  assert.ok(rawReportJson.includes("[REDACTED_TOKEN]"));
});

