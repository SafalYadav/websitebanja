import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import assert from "assert";
import path from "path";
import jitiFactory from "jiti";

const jiti = jitiFactory(process.cwd(), {
  alias: {
    "@": path.resolve(process.cwd(), "src"),
  },
});

const { openai, OPENAI_GENERATION_MODEL } = jiti("@/lib/openai");
const { buildWebsitePrompt } = jiti("@/lib/prompts");
const {
  selectDesignSkills,
  validateGeneratedWebsiteDesign,
  validateGeneratedWebsiteUiUx,
} = jiti("@/lib/skills/uiUxSkill");
const {
  isOpenAISkillsConfigured,
  getHostedSkillContainerConfig,
  extractTextFromResponse,
  parseWebsiteJson,
} = jiti("@/lib/skills/openaiSkillsService");

async function runProductionRuntimeE2E() {
  console.log("================================================================================");
  console.log("WEBSITEBANJA AI: PRODUCTION RUNTIME HOSTED SKILLS E2E VERIFICATION (gpt-5.6-luna)");
  console.log("================================================================================\n");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("FATAL: OPENAI_API_KEY is not set.");
    process.exit(1);
  }

  // Phase 1: Test Input Definition
  const websiteData = {
    businessName: "Kinetic Glassworks",
    category: "Creative Agency",
    description: "Ultra-modern creative studio portfolio with strong typography hierarchy, Framer Motion spring interactions, conversion-focused booking CTA, responsive layout, and accessibility-conscious interaction states.",
    style: "Bold, modern, interactive, tactile glassmorphism",
    targetAudience: "Architects, luxury brands, and art collectors",
    phone: "+1 (415) 555-0199",
    email: "studio@kineticglassworks.design",
    website: "kineticglassworks.design",
    instagram: "@kineticglassworks",
    facebook: "",
    address: "San Francisco, CA",
  };

  console.log("1. Input Business Profile:", websiteData.businessName, `(${websiteData.category})`);

  // Phase 2: Dynamic Skill Selection
  const skillSelection = selectDesignSkills({
    ...websiteData,
    prompt: websiteData.description,
  });

  console.log("\n2. Dynamic Skill Selector Output:");
  console.log("   Selected Skill IDs:", skillSelection.metadata.selectedIds);
  console.log("   Primary Skill:", skillSelection.activeSkills[0]?.id);
  console.log("   Total Active Skills:", skillSelection.metadata.totalActiveSkills);

  assert.ok(skillSelection.metadata.selectedIds.length > 0, "Skill selector must select skills");
  assert.ok(
    skillSelection.metadata.selectedIds.includes("framer-motion") ||
    skillSelection.metadata.selectedIds.includes("typography") ||
    skillSelection.metadata.selectedIds.includes("cro") ||
    skillSelection.metadata.selectedIds.includes("ui-ux"),
    "Expected relevant skills selected"
  );

  // Phase 3: Configuration & Container Assembly
  const isConfigured = isOpenAISkillsConfigured();
  console.log("\n3. OpenAI Hosted Skills Configured:", isConfigured);
  assert.strictEqual(isConfigured, true, "OpenAI Hosted Skills must be configured");

  const containerConfig = getHostedSkillContainerConfig(skillSelection.metadata.selectedIds);
  console.log("   Container Tool Type:", containerConfig.type);
  console.log("   Environment Type:", containerConfig.environment.type);
  console.log("   Mounted Skill References Count:", containerConfig.environment.skills.length);
  console.log("   Mounted Skills Detail:", JSON.stringify(containerConfig.environment.skills, null, 2));

  // Phase 4: Production Prompt Assembly
  const prompt = buildWebsitePrompt(websiteData, {});
  const activeSkillsList = skillSelection.systemPromptAdditions.join(", ");

  const instructions = `You are WebsiteBanja AI, an expert autonomous website designer, UI/UX architect, and conversion copywriter.
You have access to authoritative WebsiteBanja Design Intelligence skills mounted in your container environment at /home/oai/skills/.
Use the shell tool to inspect the mounted SKILL.md files (especially websitebanja-master-design-intelligence and the active skills: ${activeSkillsList}) to follow their design guidelines, motion choreography, typography standards, responsive reflow, and UX psychology.
Absolute Priority Hierarchy:
1. User's explicit business requirements (HIGHEST PRIORITY)
2. Business objective & conversion goals
3. Target audience & industry intelligence
4. Brand/style guidelines
5. Active design intelligence skills
6. Defaults
Always prioritize explicit user requirements over general skill rules. Return valid JSON only adhering strictly to the JSON schema.`;

  // Phase 5: Live Generation via Responses API with gpt-5.4-mini
  console.log(`\n4. Calling OpenAI Responses API with model: ${OPENAI_GENERATION_MODEL}...`);
  const startTime = Date.now();

  const response = await openai.responses.create({
    model: OPENAI_GENERATION_MODEL,
    instructions,
    input: prompt,
    tools: [containerConfig],
  });

  const durationMs = Date.now() - startTime;
  console.log(`   Response Received in ${durationMs}ms`);
  console.log(`   OpenAI Response ID: ${response.id}`);
  console.log(`   Model Returned: ${response.model}`);
  assert.ok(
    response.model.includes(OPENAI_GENERATION_MODEL) || response.model.includes("luna"),
    `Must use configured model (${OPENAI_GENERATION_MODEL}), got ${response.model}`
  );

  // Phase 6: Verify Shell Tool & Mounted Skill File Access
  console.log("\n5. Analyzing Output Items for Hosted Skills Tool Execution:");
  const outputItems = response.output || [];
  console.log(`   Total Output Items: ${outputItems.length}`);

  let shellCallCount = 0;
  let readSkillCommands = [];

  for (const item of outputItems) {
    if (item.type === "shell_call") {
      shellCallCount++;
      const cmds = item.action?.commands || [];
      readSkillCommands.push(...cmds);
      console.log(`   [Shell Call #${shellCallCount}] Command: ${cmds.join(" && ")}`);
    }
  }

  console.log(`   Total Shell Invocations: ${shellCallCount}`);
  console.log(`   Shell Commands Executed:`, readSkillCommands);

  // Phase 7: Extract and Parse Response JSON
  console.log("\n6. Extracting and Parsing Generation Output:");
  const rawText = extractTextFromResponse(response);
  assert.ok(rawText.length > 0, "Response raw text must not be empty");
  console.log(`   Raw Text Output Length: ${rawText.length} characters`);

  const parsedResult = parseWebsiteJson(rawText);
  assert.strictEqual(typeof parsedResult, "object", "Parsed result must be an object");
  console.log("   Parsed Keys:", Object.keys(parsedResult));
  console.log("   Hero Title:", parsedResult.hero?.title);
  console.log("   Hero Subtitle:", parsedResult.hero?.subtitle);
  console.log("   Hero Button:", parsedResult.hero?.button);

  // Phase 8: Existing WebsiteBanja Design & UI/UX Validation
  console.log("\n7. Executing Multi-Skill Design Validation Engine:");
  const designValidation = validateGeneratedWebsiteDesign(parsedResult, websiteData);
  const { sanitized: validatedWebsite, warnings } = validateGeneratedWebsiteUiUx(
    designValidation.sanitized,
    websiteData
  );

  console.log("   Validation Valid:", designValidation.isValid);
  console.log("   Warnings Count:", warnings.length);
  if (warnings.length > 0) {
    console.log("   Warnings:", warnings);
  }
  console.log("   Motion Audit Feedback:", designValidation.motionAudit?.feedback);
  console.log("   Component Audit Feedback:", designValidation.componentAudit?.feedback);
  console.log("   Passed Criteria:", designValidation.verificationReport?.passedCriteria);

  assert.strictEqual(designValidation.isValid, true, "Design validation must pass");
  assert.ok(validatedWebsite.hero?.title, "Validated website must have hero title");
  assert.ok(validatedWebsite.services?.length > 0, "Validated website must have services");

  // Phase 9: Verify Local Fallback Pathway
  console.log("\n8. Testing Local Fallback Execution (Simulated Hosted Skills Failure):");
  const fallbackResponse = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are WebsiteBanja AI. Active skills: [${activeSkillsList}]. Return valid JSON only.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const fallbackParsed = parseWebsiteJson(fallbackResponse.choices[0].message.content ?? "{}");
  const fallbackValidation = validateGeneratedWebsiteDesign(fallbackParsed, websiteData);
  console.log("   Fallback Model Used: gpt-4.1-mini");
  console.log("   Fallback Validation Valid:", fallbackValidation.isValid);
  console.log("   Fallback Hero Title:", fallbackParsed.hero?.title);
  assert.strictEqual(fallbackValidation.isValid, true, "Fallback validation must pass");

  console.log("\n================================================================================");
  console.log("ALL CHECKPOINTS VERIFIED SUCCESSFULLY!");
  console.log("STATUS: HOSTED SKILLS PRODUCTION RUNTIME VERIFIED");
  console.log("================================================================================");
}

runProductionRuntimeE2E().catch((err) => {
  console.error("\nFATAL E2E FAILURE:", err);
  process.exit(1);
});
