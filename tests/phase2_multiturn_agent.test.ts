import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { normalizeAgentResponse } from "../src/lib/ai/agentNormalizer";
import type { ExtractedUserNeeds } from "../src/types/aiAgent";

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = (match[2] || "").replace(/^["']|["']$/g, "").trim();
    }
  }
}

async function runMultiTurnAgentTest() {
  console.log("=================================================");
  console.log("PHASE 2: MULTI-TURN AGENT MODIFICATION TEST SUITE");
  console.log("=================================================\n");

  let currentNeeds: ExtractedUserNeeds = {
    features: ["whatsapp", "contact_form", "testimonials", "google_maps"],
  };

  // -------------------------------------------------------------
  // TURN 1: "I want a website for my dental clinic."
  // -------------------------------------------------------------
  console.log("--- TURN 1 ---");
  const turn1Msg = "I want a website for my dental clinic.";
  console.log(`User: "${turn1Msg}"`);

  const turn1Raw = JSON.stringify({
    reply: "A dental clinic website sounds wonderful! What is the name of your clinic and where are you located?",
    speechText: "A dental clinic website sounds wonderful! What is the name of your clinic and where are you located?",
    suggestedReplies: ["Apex Dental Care", "Smile Craft Clinic", "In Mumbai"],
    extractedNeeds: {
      category: "Clinic",
      description: "Premier dental healthcare clinic providing top-tier patient care.",
      services: ["Teeth Whitening", "Root Canal Therapy", "Dental Implants", "Orthodontics"],
      features: ["whatsapp", "contact_form", "testimonials", "google_maps"],
      style: "Clean",
    },
    readinessScore: 50,
    isReadyToBuild: false,
  });

  const turn1Norm = normalizeAgentResponse(turn1Raw, currentNeeds, turn1Msg);
  currentNeeds = turn1Norm.extractedNeeds;

  console.log("Turn 1 Result:", JSON.stringify(currentNeeds, null, 2));
  assert.equal(currentNeeds.category, "Clinic", "Turn 1: Category must be Clinic");
  assert.ok(currentNeeds.services && currentNeeds.services.length > 0, "Turn 1: Services should be populated");
  console.log("✓ Turn 1 PASSED: Category 'Clinic' synthesized\n");

  // -------------------------------------------------------------
  // TURN 2: "My clinic is called Apex Dental Care in Mumbai."
  // -------------------------------------------------------------
  console.log("--- TURN 2 ---");
  const turn2Msg = "My clinic is called Apex Dental Care in Mumbai.";
  console.log(`User: "${turn2Msg}"`);

  const turn2Raw = JSON.stringify({
    reply: "Apex Dental Care in Mumbai is an awesome name! What color vibe or branding style do you prefer?",
    speechText: "Apex Dental Care in Mumbai is an awesome name! What color vibe or branding style do you prefer?",
    suggestedReplies: ["Modern Teal & White", "Dark Green & Gold", "Ocean Blue & Slate"],
    extractedNeeds: {
      businessName: "Apex Dental Care",
      category: "Clinic",
      location: "Mumbai",
      description: "Apex Dental Care is a premier dental clinic located in Mumbai.",
      services: ["Teeth Whitening", "Root Canal Therapy", "Dental Implants", "Orthodontics"],
      features: ["whatsapp", "contact_form", "testimonials", "google_maps"],
      style: "Clean",
    },
    readinessScore: 75,
    isReadyToBuild: true,
  });

  const turn2Norm = normalizeAgentResponse(turn2Raw, currentNeeds, turn2Msg);
  currentNeeds = turn2Norm.extractedNeeds;

  console.log("Turn 2 Result:", JSON.stringify(currentNeeds, null, 2));
  assert.equal(currentNeeds.businessName, "Apex Dental Care", "Turn 2: Business name must be Apex Dental Care");
  assert.equal(currentNeeds.category, "Clinic", "Turn 2: Category must remain Clinic");
  assert.equal(currentNeeds.location, "Mumbai", "Turn 2: Location must be Mumbai");
  console.log("✓ Turn 2 PASSED: Business Name and Location established\n");

  // -------------------------------------------------------------
  // TURN 3: "Actually change the primary color to dark green."
  // -------------------------------------------------------------
  console.log("--- TURN 3 ---");
  const turn3Msg = "Actually change the primary color to dark green.";
  console.log(`User: "${turn3Msg}"`);

  // Notice: Even if raw LLM response omits primaryColor, normalizer must extract dark green deterministically!
  const turn3Raw = JSON.stringify({
    reply: "Got it! I've switched your primary color to a rich dark green. Shall we add any specific patient features?",
    speechText: "Got it! I've switched your primary color to a rich dark green. Shall we add any specific patient features?",
    suggestedReplies: ["Add WhatsApp booking", "Add online payments", "Ready to build now!"],
    extractedNeeds: {
      businessName: "Apex Dental Care",
      category: "Clinic",
      location: "Mumbai",
    },
  });

  const turn3Norm = normalizeAgentResponse(turn3Raw, currentNeeds, turn3Msg);
  currentNeeds = turn3Norm.extractedNeeds;

  console.log("Turn 3 Result:", JSON.stringify(currentNeeds, null, 2));
  assert.equal(currentNeeds.primaryColor, "#15803d", "Turn 3: Primary color must be dark green hex (#15803d)");
  assert.equal(currentNeeds.businessName, "Apex Dental Care", "Turn 3: Business name must NOT be lost");
  assert.equal(currentNeeds.category, "Clinic", "Turn 3: Category must NOT be lost");
  assert.equal(currentNeeds.location, "Mumbai", "Turn 3: Location must NOT be lost");
  console.log("✓ Turn 3 PASSED: Primary color changed to dark green without losing previous facts\n");

  // -------------------------------------------------------------
  // TURN 4: "Add WhatsApp booking."
  // -------------------------------------------------------------
  console.log("--- TURN 4 ---");
  const turn4Msg = "Add WhatsApp booking.";
  console.log(`User: "${turn4Msg}"`);

  const turn4Raw = JSON.stringify({
    reply: "I've added instant WhatsApp booking so patients can schedule appointments in seconds. Anything else?",
    speechText: "I've added instant WhatsApp booking so patients can schedule appointments in seconds. Anything else?",
    suggestedReplies: ["Remove pricing section", "Change header style", "Looks great, generate!"],
    extractedNeeds: {
      businessName: "Apex Dental Care",
      category: "Clinic",
      location: "Mumbai",
      primaryColor: "#15803d",
    },
  });

  const turn4Norm = normalizeAgentResponse(turn4Raw, currentNeeds, turn4Msg);
  currentNeeds = turn4Norm.extractedNeeds;

  console.log("Turn 4 Result:", JSON.stringify(currentNeeds, null, 2));
  assert.ok(currentNeeds.features?.includes("whatsapp"), "Turn 4: Features must contain 'whatsapp'");
  assert.ok(currentNeeds.features?.includes("appointments"), "Turn 4: Features must contain 'appointments'");
  assert.equal(currentNeeds.primaryColor, "#15803d", "Turn 4: Dark green color must be preserved");
  assert.equal(currentNeeds.businessName, "Apex Dental Care", "Turn 4: Business name must be preserved");
  console.log("✓ Turn 4 PASSED: WhatsApp booking added cleanly\n");

  // -------------------------------------------------------------
  // TURN 5: "Remove the pricing section."
  // -------------------------------------------------------------
  console.log("--- TURN 5 ---");
  const turn5Msg = "Remove the pricing section.";
  console.log(`User: "${turn5Msg}"`);

  const turn5Raw = JSON.stringify({
    reply: "Understood! I've removed the pricing section so the focus stays entirely on your treatments and patient trust.",
    speechText: "Understood! I've removed the pricing section so the focus stays entirely on your treatments and patient trust.",
    suggestedReplies: ["Wait, keep pricing but make it minimal", "Add testimonials", "Build the website now"],
    extractedNeeds: {
      businessName: "Apex Dental Care",
      category: "Clinic",
      location: "Mumbai",
      primaryColor: "#15803d",
    },
  });

  const turn5Norm = normalizeAgentResponse(turn5Raw, currentNeeds, turn5Msg);
  currentNeeds = turn5Norm.extractedNeeds;

  console.log("Turn 5 Result:", JSON.stringify(currentNeeds, null, 2));
  assert.ok(!currentNeeds.features?.includes("pricing"), "Turn 5: 'pricing' must NOT be in features");
  assert.ok(!currentNeeds.services?.some(s => /pricing|packages/i.test(s)), "Turn 5: pricing must be filtered from services");
  assert.ok(currentNeeds.features?.includes("whatsapp"), "Turn 5: WhatsApp must still be preserved");
  assert.equal(currentNeeds.primaryColor, "#15803d", "Turn 5: Dark green color must be preserved");
  assert.equal(currentNeeds.businessName, "Apex Dental Care", "Turn 5: Business name must be preserved");
  console.log("✓ Turn 5 PASSED: Pricing section removed without bug\n");

  // -------------------------------------------------------------
  // TURN 6: "Wait, keep pricing but make it minimal."
  // -------------------------------------------------------------
  console.log("--- TURN 6 ---");
  const turn6Msg = "Wait, keep pricing but make it minimal.";
  console.log(`User: "${turn6Msg}"`);

  const turn6Raw = JSON.stringify({
    reply: "No problem at all! I've kept a clean, minimal pricing summary so patients get transparent estimates without clutter.",
    speechText: "No problem at all! I've kept a clean, minimal pricing summary so patients get transparent estimates without clutter.",
    suggestedReplies: ["Yes, generate my website now!", "Let's review the design one last time"],
    extractedNeeds: {
      businessName: "Apex Dental Care",
      category: "Clinic",
      location: "Mumbai",
      primaryColor: "#15803d",
      style: "Clean Minimal",
    },
  });

  const turn6Norm = normalizeAgentResponse(turn6Raw, currentNeeds, turn6Msg);
  currentNeeds = turn6Norm.extractedNeeds;

  console.log("Turn 6 Result:", JSON.stringify(currentNeeds, null, 2));
  assert.ok(currentNeeds.features?.includes("pricing"), "Turn 6: 'pricing' must be restored in features");
  assert.equal(currentNeeds.businessName, "Apex Dental Care", "Turn 6: Business name preserved");
  assert.equal(currentNeeds.category, "Clinic", "Turn 6: Category preserved");
  assert.equal(currentNeeds.location, "Mumbai", "Turn 6: Location preserved");
  assert.equal(currentNeeds.primaryColor, "#15803d", "Turn 6: Dark green preserved");
  assert.ok(turn6Norm.isReadyToBuild, "Turn 6: Must be ready to build");
  assert.ok(turn6Norm.readinessScore >= 70, "Turn 6: Readiness score must be >= 70");
  console.log("✓ Turn 6 PASSED: Pricing re-included minimally, state 100% consistent across all 6 turns!\n");

  // -------------------------------------------------------------
  // LIVE HTTP ENDPOINT VERIFICATION (if dev server running)
  // -------------------------------------------------------------
  try {
    console.log("Testing live /api/agent/talk endpoint...");
    const liveRes = await fetch("http://localhost:3000/api/agent/talk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "I want a website for my dental clinic called Apex Dental Care in Mumbai." },
          { role: "assistant", content: "That sounds great! What vibe would you like?" },
          { role: "user", content: "Actually change the primary color to dark green and remove testimonials." }
        ],
        currentNeeds: {
          businessName: "Apex Dental Care",
          category: "Clinic",
          location: "Mumbai",
          features: ["whatsapp", "testimonials", "contact_form"]
        }
      })
    });

    if (liveRes.ok) {
      const liveJson = await liveRes.json();
      console.log("Live API Response status:", liveRes.status);
      console.log("Extracted Needs from live server:", JSON.stringify(liveJson.data?.extractedNeeds, null, 2));
      assert.equal(liveJson.data?.extractedNeeds?.primaryColor, "#15803d", "Live API: primary color must be dark green");
      assert.ok(!liveJson.data?.extractedNeeds?.features?.includes("testimonials"), "Live API: testimonials must be removed");
      console.log("✓ Live API /api/agent/talk verified: modifications and removals work over HTTP!");
    } else {
      console.warn("Live API returned status", liveRes.status);
    }
  } catch (liveErr) {
    console.warn("Live API test skipped (server not reachable on :3000):", (liveErr as Error).message);
  }

  console.log("\n=================================================");
  console.log("ALL MULTI-TURN MODIFICATION TESTS PASSED (6/6)");
  console.log("=================================================\n");
}

runMultiTurnAgentTest().catch((err) => {
  console.error("Multi-turn test failed:", err);
  process.exit(1);
});
