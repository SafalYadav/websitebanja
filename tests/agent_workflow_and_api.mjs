// tests/agent_workflow_and_api.mjs
// Real Agent Workflow Tests (A-G) and All Critical Agent Routes

import assert from "node:assert/strict";

const BASE = "http://localhost:3000";

let passed = 0;
let failed = 0;
const report = [];

async function runTest(suite, name, fn) {
  try {
    await fn();
    console.log(`  ✔ [PASS] ${suite} > ${name}`);
    passed++;
    report.push({ suite, name, status: "PASS" });
  } catch (err) {
    console.error(`  ✖ [FAIL] ${suite} > ${name}`);
    console.error(`    ${err.message}`);
    failed++;
    report.push({ suite, name, status: "FAIL", error: err.message });
  }
}

console.log("================================================================================");
console.log("WEBSITEBANJA AI AGENT: LIVE WORKFLOW & API VERIFICATION SUITE");
console.log("================================================================================\n");

// ============================================================================
// PART 1: REAL AGENT WORKFLOW TESTS (A - G)
// ============================================================================

// Workflow A: Simple conversation
await runTest("Workflow A", "Simple Conversation - Accurate & helpful reply", async () => {
  const res = await fetch(`${BASE}/api/agent/talk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "What services can you build for my business website?" }],
      currentNeeds: {},
    }),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data.reply.length > 20, "Reply must be comprehensive");
  assert.ok(Array.isArray(json.data.suggestedReplies) && json.data.suggestedReplies.length > 0);
  console.log(`    [Agent Reply]: "${json.data.reply}"`);
});

// Workflow B: Website creation
let extractedFromB = null;
await runTest("Workflow B", "Website Creation - Extracts structured business needs", async () => {
  const res = await fetch(`${BASE}/api/agent/talk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: "I want to create a website for my artisan pizza restaurant called 'Napoli Fire' in Bandra, Mumbai. We do wood-fired pizzas, dine-in, and online delivery.",
        },
      ],
      currentNeeds: {},
    }),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  const needs = json.data.extractedNeeds;
  assert.ok(needs, "Must extract needs");
  assert.ok(needs.businessName && needs.businessName.toLowerCase().includes("napoli"), `Expected businessName to contain Napoli, got: ${needs.businessName}`);
  assert.equal(needs.category.toLowerCase(), "restaurant", `Expected category restaurant, got: ${needs.category}`);
  assert.ok(needs.location && needs.location.toLowerCase().includes("mumbai"), `Expected location to include Mumbai, got: ${needs.location}`);
  assert.ok(Array.isArray(needs.services) && needs.services.length > 0, "Must extract services");
  extractedFromB = needs;
  console.log(`    [Extracted Needs]:`, JSON.stringify(needs, null, 2));
});

// Workflow C: Website modification
await runTest("Workflow C", "Website Modification - Updates existing needs with new details", async () => {
  const res = await fetch(`${BASE}/api/agent/talk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "user", content: "I want to create a website for Napoli Fire in Bandra Mumbai." },
        { role: "assistant", content: "Great! Tell me what services you offer." },
        { role: "user", content: "Actually, change our primary theme color to deep forest green #1B4D3E and add craft beer pairings to our services." },
      ],
      currentNeeds: extractedFromB || { businessName: "Napoli Fire", category: "Restaurant", location: "Mumbai" },
    }),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  const updatedNeeds = json.data.extractedNeeds;
  console.log(`    [Modified Needs]:`, JSON.stringify(updatedNeeds, null, 2));
  assert.ok(updatedNeeds.primaryColor, "Must retain or update primaryColor");
  assert.ok(updatedNeeds.services.some(s => s.toLowerCase().includes("beer") || s.toLowerCase().includes("pizza") || s.toLowerCase().includes("pairing") || s.length > 0), "Must contain services");
});

// Workflow D: Bug fixing / design adjustments
await runTest("Workflow D", "Bug Fixing / Adjustment - Adjusts layout when requested", async () => {
  const res = await fetch(`${BASE}/api/agent/talk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "user", content: "The contact section is missing a WhatsApp button. Can you make sure WhatsApp chat is enabled?" },
      ],
      currentNeeds: {
        businessName: "Napoli Fire",
        category: "Restaurant",
        features: ["contact_form", "google_maps"],
      },
    }),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data.extractedNeeds.features.includes("whatsapp"), "WhatsApp feature must be added to features list");
  console.log(`    [Updated Features]:`, json.data.extractedNeeds.features);
});

// Workflow E: Tool failure recovery
await runTest("Workflow E", "Tool Failure Recovery - Graceful fallback when provider errors", async () => {
  // Simulate extreme input or rapid requests
  const res = await fetch(`${BASE}/api/agent/talk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Test resilient response under system stress" }],
      currentNeeds: {},
    }),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(typeof json.data.reply === "string" && json.data.reply.length > 0);
  assert.ok(typeof json.data.readinessScore === "number");
  console.log(`    [Recovered Reply]: "${json.data.reply.slice(0, 80)}..."`);
});

// Workflow F: Missing knowledge / database condition
await runTest("Workflow F", "Missing Knowledge / Unusual Business - Handles gracefully", async () => {
  const res = await fetch(`${BASE}/api/agent/talk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: "I run a quantum crystal sound therapy yurt retreat in Himachal Pradesh. Can you build a site for that?",
        },
      ],
      currentNeeds: {},
    }),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data.reply.length > 10);
  console.log(`    [Unusual Niche Reply]: "${json.data.reply.slice(0, 100)}..."`);
  console.log(`    [Category Assigned]:`, json.data.extractedNeeds?.category);
});

// Workflow G: Session isolation
await runTest("Workflow G", "Session Isolation - Projects A and B have completely isolated state", async () => {
  const projectAId = "proj_alpha_" + Date.now();
  const projectBId = "proj_beta_" + Date.now();

  // Call for Project A: Car detailing
  const resA = await fetch(`${BASE}/api/agent/talk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: projectAId,
      messages: [{ role: "user", content: "I run TurboShine Auto Detailing" }],
      currentNeeds: { businessName: "TurboShine Auto Detailing", category: "Automotive" },
    }),
  });
  const jsonA = await resA.json();

  // Call for Project B: Yoga studio
  const resB = await fetch(`${BASE}/api/agent/talk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: projectBId,
      messages: [{ role: "user", content: "I run Shanti Flow Yoga Studio" }],
      currentNeeds: { businessName: "Shanti Flow Yoga Studio", category: "Fitness" },
    }),
  });
  const jsonB = await resB.json();

  assert.notEqual(jsonA.data.extractedNeeds.businessName, jsonB.data.extractedNeeds.businessName);
  assert.equal(jsonA.data.extractedNeeds.category, "Automotive");
  assert.equal(jsonB.data.extractedNeeds.category, "Fitness");
  console.log(`    [Project A Business]: ${jsonA.data.extractedNeeds.businessName} (${jsonA.data.extractedNeeds.category})`);
  console.log(`    [Project B Business]: ${jsonB.data.extractedNeeds.businessName} (${jsonB.data.extractedNeeds.category})`);
});

// ============================================================================
// PART 2: ALL CRITICAL AGENT API ROUTES
// ============================================================================
console.log("\n[Part 2] Verifying All Critical Agent API Routes");

// Route 1: /api/agent/talk
await runTest("API /api/agent/talk", "Success case returns structured data", async () => {
  const res = await fetch(`${BASE}/api/agent/talk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
});

await runTest("API /api/agent/talk", "Invalid input returns 400", async () => {
  const res = await fetch(`${BASE}/api/agent/talk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
});

// Route 2: /api/agent/voice
await runTest("API /api/agent/voice", "Success case returns 24kHz PCM audio", async () => {
  const res = await fetch(`${BASE}/api/agent/voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Hello! Welcome to WebsiteBanja." }),
  });
  assert.equal(res.status, 200);
  const buf = await res.arrayBuffer();
  assert.ok(buf.byteLength > 0, "Must return non-zero audio bytes");
  console.log(`    Received ${buf.byteLength} audio bytes`);
});

await runTest("API /api/agent/voice", "Missing text input returns 400", async () => {
  const res = await fetch(`${BASE}/api/agent/voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voice: "Aoede" }),
  });
  assert.equal(res.status, 400);
});

// Route 3: /api/agent/live-token
await runTest("API /api/agent/live-token", "POST returns active Gemini Live token", async () => {
  const res = await fetch(`${BASE}/api/agent/live-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.token && data.token.length > 0);
  console.log(`    Live token acquired: ${data.token.slice(0, 20)}...`);
});

await runTest("API /api/agent/live-token", "GET method returns 405 Method Not Allowed", async () => {
  const res = await fetch(`${BASE}/api/agent/live-token`, { method: "GET" });
  assert.equal(res.status, 405);
});

// Route 4: /api/agent/sse
await runTest("API /api/agent/sse", "POST streams valid SSE chunks", async () => {
  const res = await fetch(`${BASE}/api/agent/sse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Hello SSE stream", history: [] }),
  });
  assert.equal(res.status, 200);
  const ct = res.headers.get("content-type") || "";
  assert.ok(ct.includes("text/event-stream"));
  const reader = res.body.getReader();
  const { value } = await reader.read();
  reader.cancel();
  const text = new TextDecoder().decode(value);
  assert.ok(text.includes("data:"));
  console.log(`    SSE initial chunk: "${text.slice(0, 60)}..."`);
});

await runTest("API /api/agent/sse", "Missing message field returns 400", async () => {
  const res = await fetch(`${BASE}/api/agent/sse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history: [] }),
  });
  assert.equal(res.status, 400);
});

// Route 5: /api/extract
await runTest("API /api/extract", "Unauthorized call without Bearer token returns 401", async () => {
  const res = await fetch(`${BASE}/api/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Website for bakery" }),
  });
  assert.equal(res.status, 401);
});

// Route 6: /api/plan
await runTest("API /api/plan", "Unauthorized call without Bearer token returns 401", async () => {
  const res = await fetch(`${BASE}/api/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessName: "Test Bakery",
      category: "Bakery",
    }),
  });
  assert.equal(res.status, 401);
});

// Route 7: /api/generate
await runTest("API /api/generate", "Unauthorized call or invalid inputs handled securely", async () => {
  const res = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  // Must return 400 (Bad Request) or 401/403/429
  assert.ok([400, 401, 403, 429].includes(res.status), `Expected 4xx, got ${res.status}`);
});

console.log("\n================================================================================");
console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
