import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = "/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a";

async function run() {
  console.log("================================================================================");
  console.log("SMOKE TEST: RAZORPAY LIVE CHECKOUT MODAL VERIFICATION (NO PAYMENT)");
  console.log("================================================================================");

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  const cspViolations = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && msg.text().includes("Content Security Policy")) {
      cspViolations.push(msg.text());
    }
  });

  let createOrderResponse = null;
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/api/billing/create-order") || url.includes("/api/create-order")) {
      try {
        createOrderResponse = await response.json();
        console.log("\n[Intercepted create-order response]:", JSON.stringify(createOrderResponse, null, 2));
      } catch (err) {
        console.warn("Could not parse create-order response:", err.message);
      }
    }
  });

  try {
    // 1. Authenticate user
    console.log("\n[Step 1] Logging in user to https://websitebanja.com...");
    await page.goto("https://websitebanja.com/login", { waitUntil: "networkidle", timeout: 30000 });
    await page.fill('input[type="email"]', "test.e2e.generator.1789144011322@gmail.com");
    await page.fill('input[type="password"]', "TestPassword_1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 20000 });
    console.log("User logged in, currently at dashboard.");

    // 2. Navigate to Pricing
    console.log("\n[Step 2] Navigating to https://websitebanja.com/#pricing...");
    await page.goto("https://websitebanja.com/#pricing", { waitUntil: "networkidle", timeout: 30000 });

    const upgradeBtn = page.locator('#pricing button:has-text("Upgrade to Pro"), #pricing button:has-text("Pro")').first();
    await upgradeBtn.waitFor({ state: "visible", timeout: 15000 });
    console.log("Found Pro upgrade button, clicking...");
    await upgradeBtn.click();

    // 3. Wait for Razorpay Checkout iframe to render
    console.log("\n[Step 3] Waiting for Razorpay Checkout iframe...");
    const iframeLocator = page.locator("iframe.razorpay-checkout-frame");
    await iframeLocator.waitFor({ state: "visible", timeout: 25000 });
    console.log("Razorpay Checkout iframe is visible in the DOM!");

    await page.waitForTimeout(3000);

    // 4. Capture screenshot of opened modal
    const screenshotPath = path.join(ARTIFACTS_DIR, "live_razorpay_modal_opened.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log("Screenshot saved to:", screenshotPath);

    // 5. Inspect iframe frame and verify LIVE mode
    const frame = page.frameLocator("iframe.razorpay-checkout-frame");
    const frameContent = await page.evaluate(() => {
      const el = document.querySelector("iframe.razorpay-checkout-frame");
      return el ? el.getAttribute("src") : null;
    });
    console.log("Razorpay iframe src:", frameContent);

    // Verify assertions
    const keyId = createOrderResponse?.key_id;
    const amount = createOrderResponse?.amount;
    const isLiveKey = typeof keyId === "string" && keyId.startsWith("rzp_live_");
    const isExact500 = amount === 50000;

    console.log("\n================================================================================");
    console.log("VERIFICATION METRICS:");
    console.log("  Key ID Received:", keyId);
    console.log("  Is Live Key (rzp_live_...):", isLiveKey);
    console.log("  Amount in Paise:", amount, "(₹" + (amount / 100) + ")");
    console.log("  Is Exact ₹500:", isExact500);
    console.log("  CSP Violations:", cspViolations.length);
    console.log("================================================================================");

    // Close the checkout modal by clicking Razorpay close button or pressing Escape
    console.log("\n[Step 5] Closing Razorpay checkout modal without payment...");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);

    const report = {
      timestamp: new Date().toISOString(),
      domain: "https://websitebanja.com",
      environment: "production",
      liveKeyId: keyId,
      isLiveMode: isLiveKey,
      orderId: createOrderResponse?.order_id,
      amountPaise: amount,
      amountINR: amount ? amount / 100 : null,
      cspViolationsCount: cspViolations.length,
      cspViolations,
      paymentInitiatedOnly: true,
      realPaymentCompleted: false,
      passed: isLiveKey && isExact500 && cspViolations.length === 0,
    };

    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "smoke_test_live_razorpay_verified.json"),
      JSON.stringify(report, null, 2)
    );
    console.log("Report saved to smoke_test_live_razorpay_verified.json");

    await browser.close();
    process.exit(report.passed ? 0 : 1);
  } catch (err) {
    console.error("Smoke test error:", err);
    await browser.close();
    process.exit(1);
  }
}

run();
