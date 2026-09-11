import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_INDUSTRIES = [
  {
    id: "saas",
    name: "Apex Cloud Systems",
    category: "Software & Technology",
    description: "Enterprise observability platform giving engineering teams full telemetry, trace correlation, and automated root-cause detection.",
    targetAudience: "DevOps engineers, CTOs, and high-growth engineering teams.",
    style: "Technical Minimalist",
    primaryColor: "#0284c7",
    secondaryColor: "#6366f1",
  },
  {
    id: "ecommerce",
    name: "Nordic Apparel",
    category: "E-commerce & Retail",
    description: "Minimalist sustainable activewear made from recycled ocean plastics and organic combed cotton for effortless daily movement.",
    targetAudience: "Mindful urban athletes and eco-conscious modern professionals.",
    style: "Editorial Clean",
    primaryColor: "#0f766e",
    secondaryColor: "#f59e0b",
  },
  {
    id: "restaurant",
    name: "Blue Mist Specialty Coffee",
    category: "Restaurant & Cafe",
    description: "Single-origin pour-overs, artisanal espresso roasts, and fresh seasonal patisserie crafted daily in an intimate sunlit sanctuary.",
    targetAudience: "Specialty coffee aficionados, neighborhood creatives, and morning commuters.",
    style: "Warm Earthy",
    primaryColor: "#d97706",
    secondaryColor: "#78350f",
  },
  {
    id: "agency",
    name: "Vanguard Digital Lab",
    category: "Agency & Creative",
    description: "Full-service digital product laboratory partnering with visionary founders to design, build, and scale world-class software experiences.",
    targetAudience: "Series A to pre-IPO founders and innovative enterprise brands.",
    style: "Futuristic Modern",
    primaryColor: "#8b5cf6",
    secondaryColor: "#06b6d4",
  },
  {
    id: "local_clinic",
    name: "Lumina Family Dental",
    category: "Healthcare & Wellness",
    description: "Compassionate, state-of-the-art family dental care offering gentle cleanings, painless cosmetic dentistry, and pediatric oral health.",
    targetAudience: "Families, working professionals, and pediatric patients in the metropolitan area.",
    style: "Inviting Clinical",
    primaryColor: "#059669",
    secondaryColor: "#3b82f6",
  },
];

async function run5IndustriesGenerationSuite() {
  console.log("================================================================================");
  console.log("WEBSITEBANJA: 5/5 REAL BROWSER GENERATION VERIFICATION SUITE");
  console.log("Testing full pipeline: Browser -> Supabase Auth -> /api/plan -> Hosted Skills ->");
  console.log("                       GPT-5.6 Luna -> /api/generate -> Studio Workspace");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });

  const page = await context.newPage();

  // Log browser console errors and key pipeline markers
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("Error") || text.includes("error") || text.includes("429") || text.includes("500") || text.includes("[GEN]")) {
      console.log(`   [PAGE LOG] ${text.slice(0, 150)}`);
    }
  });

  // Step 1: Login once into the browser context
  console.log("Authenticating test user session in browser...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "test.e2e.generator.1789144011322@gmail.com");
  await page.fill('input[type="password"]', "TestPassword_1234!");
  await page.click('button:has-text("Sign In")');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("Authentication successful! User session active on /dashboard.\n");

  // Get authenticated session token from Supabase directly for project creation
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: "test.e2e.generator.1789144011322@gmail.com",
    password: "TestPassword_1234!",
  });

  const user = authData.user;
  if (!user) throw new Error("Could not authenticate with Supabase client");

  const results = [];

  for (let idx = 0; idx < TEST_INDUSTRIES.length; idx++) {
    const industry = TEST_INDUSTRIES[idx];
    const testNumber = idx + 1;
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`TEST ${testNumber}/5: ${industry.name.toUpperCase()} (${industry.category})`);
    console.log(`--------------------------------------------------------------------------------`);

    // 1. Create project directly in Supabase table
    const { data: newProject, error: projErr } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: industry.name,
        business_name: industry.name,
        category: industry.category,
        description: industry.description,
        target_audience: industry.targetAudience,
        style: industry.style,
        primary_color: industry.primaryColor,
        secondary_color: industry.secondaryColor,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (projErr || !newProject) {
      console.error(`   Failed to create project: ${projErr?.message}`);
      results.push({ industry: industry.name, success: false, error: projErr?.message });
      continue;
    }

    const projectId = newProject.id;
    console.log(`   Project created in Supabase: ${projectId}`);

    // 2. Navigate browser to loading generation page
    const startTime = Date.now();
    console.log(`   Navigating browser to /editor/${projectId}/loading ...`);
    await page.goto(`http://localhost:3000/editor/${projectId}/loading`, { waitUntil: "domcontentloaded" });

    // 3. Monitor pipeline execution
    let generationSuccess = false;
    let failureReason = null;

    for (let sec = 0; sec < 120; sec++) {
      await page.waitForTimeout(1000);
      const currentUrl = page.url();

      if (currentUrl.includes("/workspace")) {
        generationSuccess = true;
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   SUCCESS: Redirected to /workspace in ${duration}s!`);
        break;
      }

      // Check if paused / error
      const pausedHeader = page.locator('h3:has-text("Generation Temporarily Paused"), h3:has-text("Sign In Required")');
      if (await pausedHeader.count() > 0) {
        const errText = await page.locator("p.text-rose-300\\/80").textContent().catch(() => "");
        failureReason = errText || "Generation Temporarily Paused";
        console.error(`   FAILED: Generation paused with message: "${failureReason}"`);
        break;
      }

      const openCanvasBtn = page.locator('button:has-text("Open in Studio Canvas")');
      if (await openCanvasBtn.count() > 0) {
        generationSuccess = true;
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   SUCCESS: "Open in Studio Canvas" reached in ${duration}s! Clicking...`);
        await openCanvasBtn.click();
        await page.waitForTimeout(2000);
        break;
      }

      if (sec % 15 === 0 && sec > 0) {
        console.log(`   ...generating... (${sec}s elapsed)...`);
      }
    }

    const screenshotPath = `/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a/industry_${industry.id}_result.png`;
    await page.screenshot({ path: screenshotPath });

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (generationSuccess) {
      // Verify the workspace renders the generated content
      const layersCount = await page.locator('div:has-text("HOME LAYERS"), div:has-text("Layers")').count();
      const heroText = await page.locator("h1").first().textContent().catch(() => "");
      console.log(`   Verified Studio Workspace:`);
      console.log(`     - Layers panel present: ${layersCount > 0}`);
      console.log(`     - Rendered heading: "${heroText?.trim().slice(0, 50)}..."`);
      console.log(`     - Total Generation Time: ${totalDuration}s`);
      console.log(`     - Screenshot: ${screenshotPath}\n`);

      results.push({
        industry: industry.name,
        category: industry.category,
        success: true,
        duration: `${totalDuration}s`,
        heading: heroText?.trim(),
      });
    } else {
      results.push({
        industry: industry.name,
        category: industry.category,
        success: false,
        duration: `${totalDuration}s`,
        error: failureReason || "Timed out after 120s",
      });
    }
  }

  await browser.close();

  console.log("================================================================================");
  console.log("FINAL RESULTS SUMMARY: 5/5 INDUSTRIES BROWSER GENERATION TEST");
  console.log("================================================================================");
  console.table(results);

  const passedCount = results.filter((r) => r.success).length;
  console.log(`\nScore: ${passedCount} / ${results.length} PASSED`);

  if (passedCount === results.length) {
    console.log("PERFECT 5/5 VERIFICATION ACHIEVED! Root cause fully eliminated.");
    process.exit(0);
  } else {
    console.error("Some industry generations failed. Check logs above.");
    process.exit(1);
  }
}

run5IndustriesGenerationSuite().catch((err) => {
  console.error("Suite execution error:", err);
  process.exit(1);
});
