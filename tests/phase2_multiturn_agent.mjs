// tests/phase2_multiturn_agent.mjs
// Phase 2 Multi-Turn Agent Sequential Modification Test Suite

import assert from "node:assert/strict";

const BASE = "http://localhost:3000";

let passed = 0;

async function runTurn(turnNum, description, userMsg, priorNeeds, history, assertionsFn) {
  console.log(`\n-------------------------------------------------------------`);
  console.log(`TURN ${turnNum}: "${userMsg}"`);
  console.log(`Goal: ${description}`);
  console.log(`Prior Needs:`, JSON.stringify(priorNeeds, null, 2));

  const newHistory = [...history, { role: "user", content: userMsg }];

  const res = await fetch(`${BASE}/api/agent/talk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: newHistory,
      currentNeeds: priorNeeds,
    }),
  });

  assert.equal(res.status, 200, `Turn ${turnNum} should return HTTP 200`);
  const json = await res.json();
  assert.ok(json.success, `Turn ${turnNum} success should be true`);
  assert.ok(json.data, `Turn ${turnNum} data should exist`);

  const { reply, speechText, extractedNeeds, readinessScore, isReadyToBuild } = json.data;
  console.log(`Mitra Reply: "${reply}"`);
  console.log(`Readiness Score: ${readinessScore} | Ready to build: ${isReadyToBuild}`);
  console.log(`Extracted Needs:`, JSON.stringify(extractedNeeds, null, 2));

  // Voice/Text canonical parity check
  assert.equal(reply, speechText, `Turn ${turnNum}: reply and speechText must be 100% identical`);

  // Run specific assertions
  assertionsFn(extractedNeeds, json.data);

  passed++;
  console.log(`✔ [PASS] TURN ${turnNum} VERIFIED!`);

  // Return updated state for next turn
  return {
    needs: extractedNeeds,
    history: [...newHistory, { role: "assistant", content: reply }],
  };
}

async function runAllTurns() {
  console.log("================================================================================");
  console.log("PHASE 2: LIVE MULTI-TURN SEQUENTIAL MODIFICATION TEST");
  console.log("================================================================================");

  let currentNeeds = {
    features: ["whatsapp", "contact_form", "testimonials", "google_maps"],
  };
  let history = [];

  // TURN 1
  const t1 = await runTurn(
    1,
    "Initial Business Intent -> Dental Clinic",
    "I want a website for my dental clinic.",
    currentNeeds,
    history,
    (needs) => {
      assert.equal(needs.category, "Clinic", "Category must be Clinic");
      assert.ok(needs.services && needs.services.length > 0, "Services should be suggested");
    }
  );
  currentNeeds = t1.needs;
  history = t1.history;

  // TURN 2
  const t2 = await runTurn(
    2,
    "Provide Business Name and City -> Apex Dental Care in Mumbai",
    "My clinic is called Apex Dental Care in Mumbai.",
    currentNeeds,
    history,
    (needs) => {
      assert.equal(needs.businessName, "Apex Dental Care", "Business name must be Apex Dental Care");
      assert.equal(needs.category, "Clinic", "Category must remain Clinic");
      assert.ok(needs.location?.toLowerCase().includes("mumbai"), "Location must be Mumbai");
    }
  );
  currentNeeds = t2.needs;
  history = t2.history;

  // TURN 3
  const t3 = await runTurn(
    3,
    "Modify Color -> Change primary color to dark green",
    "Actually change the primary color to dark green.",
    currentNeeds,
    history,
    (needs) => {
      assert.equal(needs.primaryColor, "#15803d", "Primary color must be dark green hex (#15803d)");
      assert.equal(needs.businessName, "Apex Dental Care", "Business name must NOT be lost on color change");
      assert.equal(needs.category, "Clinic", "Category must NOT be lost on color change");
      assert.ok(needs.location?.toLowerCase().includes("mumbai"), "Location must NOT be lost on color change");
    }
  );
  currentNeeds = t3.needs;
  history = t3.history;

  // TURN 4
  const t4 = await runTurn(
    4,
    "Add Feature -> Add WhatsApp booking",
    "Add WhatsApp booking.",
    currentNeeds,
    history,
    (needs) => {
      assert.ok(needs.features?.includes("whatsapp"), "WhatsApp must be in features");
      assert.equal(needs.primaryColor, "#15803d", "Dark green primary color must be preserved");
      assert.equal(needs.businessName, "Apex Dental Care", "Business name must be preserved");
    }
  );
  currentNeeds = t4.needs;
  history = t4.history;

  // TURN 5
  const t5 = await runTurn(
    5,
    "Remove Feature -> Remove the pricing section",
    "Remove the pricing section.",
    currentNeeds,
    history,
    (needs) => {
      assert.ok(!needs.features?.includes("pricing"), "'pricing' must NOT be in features");
      assert.ok(needs.features?.includes("whatsapp"), "WhatsApp must still be preserved");
      assert.equal(needs.primaryColor, "#15803d", "Dark green primary color must be preserved");
      assert.equal(needs.businessName, "Apex Dental Care", "Business name must be preserved");
    }
  );
  currentNeeds = t5.needs;
  history = t5.history;

  // TURN 6
  await runTurn(
    6,
    "Modify / Restore -> Wait, keep pricing but make it minimal",
    "Wait, keep pricing but make it minimal.",
    currentNeeds,
    history,
    (needs, data) => {
      assert.ok(needs.features?.includes("pricing"), "pricing must be restored in features");
      assert.equal(needs.businessName, "Apex Dental Care", "Business name preserved");
      assert.equal(needs.category, "Clinic", "Category preserved");
      assert.equal(needs.primaryColor, "#15803d", "Dark green preserved");
      assert.ok(data.readinessScore >= 70, "Readiness score must be >= 70");
      assert.ok(data.isReadyToBuild, "Should be ready to build");
    }
  );

  console.log("\n================================================================================");
  console.log(`ALL 6 MULTI-TURN MODIFICATION TESTS PASSED (${passed}/${passed})`);
  console.log("================================================================================\n");
}

runAllTurns().catch((err) => {
  console.error("\n✖ MULTI-TURN TEST FAILED:", err);
  process.exit(1);
});
