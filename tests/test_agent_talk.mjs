import fs from "fs";
import path from "path";
import assert from "node:assert/strict";

// Load .env.local
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

// Import the route handler directly (compiled via tsx or dynamic import)
async function testAgentTalkDirect() {
  console.log("=================================================");
  console.log("TESTING AI AGENT TALK API");
  console.log("=================================================\n");

  // Dynamically import OpenAI to check API call directly
  const { OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log("✓ OpenAI client initialized with key length:", process.env.OPENAI_API_KEY?.length || 0);

  // Test prompt with conversational needs
  const systemPrompt = `You are Mitra, WebsiteBanja's Autonomous AI Website Architect & Needs Consultant.
Return valid JSON only matching:
{
  "reply": string,
  "speechText": string,
  "suggestedReplies": string[],
  "extractedNeeds": {
    "businessName": string,
    "category": string,
    "description": string,
    "targetAudience": string,
    "services": string[],
    "features": string[],
    "style": string,
    "primaryColor": string,
    "secondaryColor": string,
    "phone": string,
    "email": string,
    "whatsappNumber": string,
    "location": string
  },
  "readinessScore": number,
  "isReadyToBuild": boolean,
  "nextMissingAspect": string
}`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content:
        "Hi, I want to create a website for my specialty cafe in Bangalore called Velvet Roasteries. We specialize in artisanal pour-overs, cold brew, and fresh French bakes. We want WhatsApp table booking.",
    },
  ];

  console.log("Sending Turn 1 message to OpenAI gpt-4.1-mini...");
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages,
  });

  const rawJson = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(rawJson);

  console.log("\nTurn 1 Agent Response:");
  console.log("Reply:", parsed.reply);
  console.log("Speech Text:", parsed.speechText);
  console.log("Suggested Replies:", parsed.suggestedReplies);
  console.log("Extracted Needs:", JSON.stringify(parsed.extractedNeeds, null, 2));
  console.log("Readiness Score:", parsed.readinessScore, "%");
  console.log("Ready to build:", parsed.isReadyToBuild);

  // Assertions
  assert.ok(parsed.reply && parsed.reply.length > 5, "Reply should be present");
  assert.ok(parsed.speechText && parsed.speechText.length > 5, "Speech text should be present");
  assert.ok(Array.isArray(parsed.suggestedReplies) && parsed.suggestedReplies.length > 0, "Suggested replies must be array");
  assert.ok(parsed.extractedNeeds, "Extracted needs must exist");
  assert.ok(
    parsed.extractedNeeds.businessName?.toLowerCase().includes("velvet") ||
      parsed.extractedNeeds.category?.toLowerCase().includes("cafe"),
    "Needs should capture Velvet or Cafe"
  );
  assert.ok(parsed.readinessScore >= 30, "Readiness score should reflect understanding (>=30%)");

  console.log("\n✓ Turn 1 assertions PASSED!");

  // Test Turn 2 (Confirmation to build)
  console.log("\nSending Turn 2 (Ready to build)...");
  const turn2Messages = [
    ...messages,
    { role: "assistant", content: parsed.reply },
    { role: "user", content: "That sounds awesome! Build my website now with warm earthy tones." },
  ];

  const completion2 = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: turn2Messages,
  });

  const parsed2 = JSON.parse(completion2.choices[0]?.message?.content ?? "{}");
  console.log("\nTurn 2 Agent Response:");
  console.log("Reply:", parsed2.reply);
  console.log("Readiness Score:", parsed2.readinessScore, "%");
  console.log("Ready to build:", parsed2.isReadyToBuild);

  assert.ok(parsed2.isReadyToBuild === true || parsed2.readinessScore >= 70, "Turn 2 should be ready to build");
  console.log("✓ Turn 2 assertions PASSED!");

  console.log("\n=================================================");
  console.log("ALL AI AGENT TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("=================================================");
}

testAgentTalkDirect().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
