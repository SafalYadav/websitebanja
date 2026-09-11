import { chromium } from "playwright";

async function testRealBrowserGeneration() {
  console.log("================================================================================");
  console.log("WEBSITEBANJA: REAL BROWSER AUTHENTICATED GENERATION E2E TEST");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });

  const page = await context.newPage();

  // Listen to all console logs from browser
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[GEN]") || text.includes("[PLAN]") || text.includes("[AUTH]") || text.includes("error") || text.includes("Error") || text.includes("Loading")) {
      console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${text}`);
    }
  });

  // Listen to all network requests & responses
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/") || url.includes("/auth/v1/")) {
      console.log(`[NETWORK REQ] ${req.method()} ${url}`);
    }
  });

  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("/api/") || url.includes("/auth/v1/")) {
      console.log(`[NETWORK RES] ${res.status()} ${url}`);
      if (!res.ok()) {
        try {
          const body = await res.text();
          console.log(`   --> ERROR BODY: ${body.slice(0, 300)}`);
        } catch {}
      }
    }
  });

  try {
    // 1. Navigate to login
    console.log("1. Navigating to /login...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // 2. Fill login form
    console.log("2. Filling login credentials...");
    await page.fill('input[type="email"]', "test.e2e.generator.1789144011322@gmail.com");
    await page.fill('input[type="password"]', "TestPassword_1234!");
    await page.click('button:has-text("Sign In")');

    // 3. Wait for redirect to dashboard
    console.log("3. Waiting for dashboard navigation...");
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    console.log("   Successfully reached /dashboard!");
    await page.waitForTimeout(2000);

    // 4. Click "New Website" or create project button
    console.log("4. Clicking create new website button...");
    const createBtn = page.locator('button:has-text("New Website"), button:has-text("Create New Project"), button:has-text("Create Website")').first();
    await createBtn.click();

    // 5. Wait for onboarding start page (/editor/[id])
    console.log("5. Waiting for editor onboarding...");
    await page.waitForURL(/\/editor\/[a-zA-Z0-9-]+\/?$/, { timeout: 15000 });
    const editorUrl = page.url();
    console.log(`   Reached editor onboarding: ${editorUrl}`);
    await page.waitForTimeout(1500);

    const match = editorUrl.match(/\/editor\/([a-zA-Z0-9-]+)/);
    const projectId = match ? match[1] : null;
    console.log(`   Active Project ID: ${projectId}`);

    if (projectId) {
      console.log("6. Navigating to generation loading screen...");
      await page.goto(`http://localhost:3000/editor/${projectId}/loading`, { waitUntil: "domcontentloaded" });

      console.log("7. Monitoring generation execution (waiting up to 90s)...");
      const startTime = Date.now();

      // Wait for either workspace redirect or error card
      let generationSuccess = false;
      let generationPaused = false;

      for (let i = 0; i < 120; i++) {
        await page.waitForTimeout(1000);
        const currentUrl = page.url();

        if (currentUrl.includes("/workspace")) {
          generationSuccess = true;
          console.log(`\n🎉 GENERATION COMPLETE! Redirected to studio workspace in ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
          break;
        }

        const pausedHeading = page.locator('h3:has-text("Generation Temporarily Paused"), h3:has-text("Sign In Required")');
        if (await pausedHeading.count() > 0) {
          generationPaused = true;
          const text = await pausedHeading.first().textContent();
          console.error(`\n❌ GENERATION PAUSED! Visible error: "${text}" at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
          break;
        }

        const successBanner = page.locator('button:has-text("Open in Studio Canvas"), button:has-text("Enter Studio Workspace")');
        if (await successBanner.count() > 0) {
          generationSuccess = true;
          console.log(`\n🎉 GENERATION COMPLETE! "Open in Studio Canvas" button visible in ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
          await successBanner.click();
          await page.waitForTimeout(1500);
          break;
        }

        if (i % 10 === 0) {
          console.log(`   ...still generating (${i}s elapsed)...`);
        }
      }

      await page.screenshot({ path: "/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a/e2e_real_browser_result.png" });

      if (!generationSuccess && !generationPaused) {
        console.log(`   Timed out waiting for generation result after 90s.`);
      }
    }
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await browser.close();
  }
}

testRealBrowserGeneration();
