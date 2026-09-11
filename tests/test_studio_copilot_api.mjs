// tests/test_studio_copilot_api.mjs
import assert from "node:assert";

console.log("=== TESTING LIVE /api/studio/ai-action ENDPOINT ===");

const sampleWebsite = {
  businessName: "Luxe Smile Clinic",
  category: "Dentistry",
  hero: {
    title: "Affordable Dental Care for Everyone",
    subtitle: "Book your appointment today with Dr. Sharma.",
    button: "Contact Us",
    buttonAction: {
      type: "scroll",
      target: "contact"
    }
  },
  about: {
    title: "About Our Clinic",
    story: "Providing care since 2015."
  },
  contact: {
    phone: "+919876543210",
    email: "care@luxesmile.com"
  },
  sectionOrder: ["hero", "about", "contact"],
  pages: [
    {
      id: "home",
      slug: "",
      title: "Home",
      isHome: true,
      sectionOrder: ["hero", "about", "contact"]
    }
  ]
};

async function callAiAction(payload) {
  const res = await fetch("http://localhost:3000/api/studio/ai-action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  // Test 1: Invalid prompt returns 400
  console.log("\n[TEST 1] Testing invalid / empty prompt validation...");
  const invalidRes = await callAiAction({ prompt: "" });
  assert.strictEqual(invalidRes.status, 400, "Empty prompt must return status 400");
  assert.strictEqual(invalidRes.data.error, "Instruction prompt is required.");
  console.log("✓ TEST 1 PASSED: Empty prompt rejected with 400 Bad Request.");

  // Test 2: "Make the hero headline more premium & punchy"
  console.log("\n[TEST 2] Testing 'Make the hero headline more premium & punchy'...");
  const t2Res = await callAiAction({
    prompt: "Make the hero headline more premium & punchy",
    currentWebsite: sampleWebsite,
    businessName: sampleWebsite.businessName,
    category: sampleWebsite.category
  });
  console.log("Response status:", t2Res.status);
  console.log("Summary:", t2Res.data.summary);
  console.log("Actions:", JSON.stringify(t2Res.data.actions, null, 2));

  assert.strictEqual(t2Res.status, 200, "Must return 200 OK");
  assert.strictEqual(t2Res.data.success, true, "Must have success: true");
  assert.ok(Array.isArray(t2Res.data.actions) && t2Res.data.actions.length > 0, "Must return at least 1 action");
  const headlineAction = t2Res.data.actions.find(a => a.action === "update_text" && a.payload?.path?.includes("hero"));
  assert.ok(headlineAction, "Must contain an update_text action targeting hero title");
  console.log("✓ TEST 2 PASSED: Successfully generated premium headline edit.");

  // Test 3: "Change the hero button to Book on WhatsApp"
  console.log("\n[TEST 3] Testing 'Change the hero button to Book on WhatsApp'...");
  const t3Res = await callAiAction({
    prompt: "Change the hero button to Book on WhatsApp",
    currentWebsite: sampleWebsite,
    businessName: sampleWebsite.businessName,
    category: sampleWebsite.category
  });
  console.log("Response status:", t3Res.status);
  console.log("Summary:", t3Res.data.summary);
  console.log("Actions:", JSON.stringify(t3Res.data.actions, null, 2));

  assert.strictEqual(t3Res.status, 200, "Must return 200 OK");
  assert.strictEqual(t3Res.data.success, true, "Must have success: true");
  assert.ok(Array.isArray(t3Res.data.actions) && t3Res.data.actions.length > 0, "Must return at least 1 action");
  const waAction = t3Res.data.actions.find(a => a.action === "set_button_whatsapp" || a.action === "update_button");
  assert.ok(waAction, "Must contain WhatsApp button action or update_button");
  console.log("✓ TEST 3 PASSED: Successfully generated WhatsApp button configuration.");

  // Test 4: Custom natural-language edit
  console.log("\n[TEST 4] Testing custom natural-language prompt...");
  const t4Res = await callAiAction({
    prompt: "Rewrite the about story to highlight over 15 years of painless laser dentistry",
    currentWebsite: sampleWebsite,
    businessName: sampleWebsite.businessName,
    category: sampleWebsite.category
  });
  console.log("Response status:", t4Res.status);
  console.log("Summary:", t4Res.data.summary);
  console.log("Actions:", JSON.stringify(t4Res.data.actions, null, 2));

  assert.strictEqual(t4Res.status, 200, "Must return 200 OK");
  assert.strictEqual(t4Res.data.success, true, "Must have success: true");
  assert.ok(Array.isArray(t4Res.data.actions) && t4Res.data.actions.length > 0, "Must return at least 1 action");
  console.log("✓ TEST 4 PASSED: Custom natural-language edit generated.");

  console.log("\n=== ALL LIVE /api/studio/ai-action TESTS PASSED SUCCESSFULLY ===");
}

run().catch(err => {
  console.error("FATAL ERROR in studio copilot API test:", err);
  process.exit(1);
});
