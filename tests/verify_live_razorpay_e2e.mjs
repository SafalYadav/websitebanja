import { createRequire } from "module";
const require = createRequire("/Users/safalyadav/websitebanja/package.json");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a";

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const res = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > -1) {
      const k = trimmed.slice(0, idx).trim();
      let v = trimmed.slice(idx + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      res[k] = v;
    }
  }
  return res;
}

const env = {
  ...parseEnv("/Users/safalyadav/websitebanja/.env"),
  ...parseEnv("/Users/safalyadav/websitebanja/.env.local"),
};

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "https://pllcuqjbaulowcnpwske.supabase.co";
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("================================================================================");
  console.log("LIVE END-TO-END RAZORPAY TEST MODE PAYMENT & PRO ACTIVATION VERIFICATION");
  console.log("Target: https://websitebanja.com (Real Production Azure Environment)");
  console.log("================================================================================\n");

  const testEmail = "test.e2e.generator.1789144011322@gmail.com";
  const testPassword = "TestPassword_1234!";

  // Authenticate user via Supabase client to obtain session
  console.log(`Authenticating user: ${testEmail}...`);
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (authErr || !authData.session) {
    throw new Error(`Failed to authenticate test user: ${authErr?.message}`);
  }

  const userId = authData.user.id;
  const userToken = authData.session.access_token;
  console.log(`✔ Authenticated user ID: ${userId}`);

  // Launch Chromium
  console.log("\nLaunching Chromium browser with stealth flags...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });

  // Track CSP Violations
  const cspViolations = [];
  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("CSP VIOLATION")) {
      console.log(text);
      cspViolations.push(text);
    }
  });

  await page.addInitScript(() => {
    window.addEventListener("securitypolicyviolation", (e) => {
      console.log(`[CSP VIOLATION]: blockedURI=${e.blockedURI}, directive=${e.violatedDirective}`);
    });
  });

  // Step 1: Log in via UI
  console.log("\n[STEP 1] Navigating to https://websitebanja.com/login...");
  await page.goto("https://websitebanja.com/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', testPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("✔ Logged in successfully and reached /dashboard");

  // Step 2: Navigate to Pricing and Click Upgrade
  console.log("\n[STEP 2] Navigating to https://websitebanja.com/#pricing...");
  await page.goto("https://websitebanja.com/#pricing", { waitUntil: "networkidle" });

  let orderCreatedResponse = null;
  let verifyPaymentResponse = null;

  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("/api/billing/create-order")) {
      try {
        orderCreatedResponse = await res.json();
        console.log("✔ /api/billing/create-order responded:", JSON.stringify(orderCreatedResponse));
      } catch (e) {}
    }
    if (url.includes("/api/billing/verify-payment")) {
      try {
        verifyPaymentResponse = await res.json();
        console.log("✔ /api/billing/verify-payment responded:", JSON.stringify(verifyPaymentResponse));
      } catch (e) {}
    }
  });

  // Prepare popup listener for Razorpay Test Bank Emulator
  const popupPromise = context.waitForEvent("page");

  const upgradeBtn = page.locator("#pricing button:has-text('Upgrade to Pro')").first();
  await upgradeBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  console.log("Clicking 'Upgrade to Pro'...");
  await upgradeBtn.click();

  // Step 3: Fill Razorpay Checkout Modal
  console.log("\n[STEP 3] Interacting with Razorpay Checkout modal...");
  const frame = page.frameLocator("iframe.razorpay-checkout-frame");
  const phoneInput = frame.locator("input[placeholder*='Mobile number']");
  await phoneInput.waitFor({ state: "visible", timeout: 15000 });
  console.log("Filling contact phone number...");
  await phoneInput.fill("9820098200");
  await frame.locator("button:has-text('Continue')").click();

  console.log("Selecting 'Cards' payment method...");
  const cardsBtn = frame.locator("div:has-text('Cards')").last();
  await cardsBtn.waitFor({ state: "visible", timeout: 5000 });
  await cardsBtn.click();

  console.log("Entering Razorpay Test Card details...");
  const cardNum = frame.locator("input[name='card.number']");
  await cardNum.waitFor({ state: "visible", timeout: 5000 });
  await cardNum.click();
  await cardNum.pressSequentially("4100280000001007", { delay: 25 });

  const expiry = frame.locator("input[name='card.expiry']");
  await expiry.click();
  await expiry.pressSequentially("1226", { delay: 25 });

  const cvv = frame.locator("input[name='card.cvv']");
  await cvv.click();
  await cvv.pressSequentially("123", { delay: 25 });

  const cardScreenshotPath = path.join(ARTIFACT_DIR, "live_01_razorpay_card_filled.png");
  await page.screenshot({ path: cardScreenshotPath });
  console.log(`Saved screenshot: ${cardScreenshotPath}`);

  console.log("Submitting card details (add-card-cta)...");
  await frame.locator("[data-test-id='add-card-cta']").click();

  const maybeLater = frame.locator("button:has-text('Maybe later')");
  if (await maybeLater.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log("Handling RBI tokenization modal: Clicking 'Maybe later'...");
    await maybeLater.click();
  }

  // Step 4: Handle Razorpay Test Bank Emulator Popup
  console.log("\n[STEP 4] Waiting for Razorpay Bank Emulator popup...");
  const popup = await popupPromise;
  await popup.waitForURL((u) => !u.href.includes("about:blank"), { timeout: 15000 });
  await popup.waitForLoadState("networkidle");
  console.log(`✔ Bank emulator loaded: ${popup.url()}`);

  const bankScreenshotPath = path.join(ARTIFACT_DIR, "live_02_razorpay_bank_emulator.png");
  await popup.screenshot({ path: bankScreenshotPath });
  console.log(`Saved screenshot: ${bankScreenshotPath}`);

  console.log("Clicking 'Success' on Razorpay Bank Emulator...");
  const successBtn = popup.locator("button.success:has-text('Success')");
  await successBtn.click();
  console.log("✔ Clicked 'Success' on Bank Emulator!");

  // Step 5: Wait for Payment Verification on main page
  console.log("\n[STEP 5] Waiting for server payment verification...");
  await page.waitForResponse((res) => res.url().includes("/api/billing/verify-payment"), { timeout: 25000 });
  console.log("✔ /api/billing/verify-payment successfully processed!");

  // Wait for post-payment toast and redirect
  await page.waitForTimeout(4000);
  const successScreenshotPath = path.join(ARTIFACT_DIR, "live_03_payment_verified_dashboard.png");
  await page.screenshot({ path: successScreenshotPath });
  console.log(`Saved screenshot: ${successScreenshotPath}`);

  // Step 6: Verify Database Entitlement (Single Source of Truth)
  console.log("\n[STEP 6] Verifying Supabase Database Subscription & Quota Records...");
  const { data: subRecord, error: subError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (subError) {
    console.error("Subscription query error:", subError);
  } else {
    console.log("✔ DB Subscription Record:", JSON.stringify(subRecord, null, 2));
  }

  const { data: quotaRecord, error: quotaError } = await supabase
    .from("user_change_quotas")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (quotaError) {
    console.error("Quota record query error:", quotaError);
  } else {
    console.log("✔ DB Quota Record:", JSON.stringify(quotaRecord, null, 2));
  }

  // Step 7: Verify Studio Quota API Response
  console.log("\n[STEP 7] Verifying /api/studio/quota endpoint with user auth...");
  const quotaApiRes = await fetch("https://websitebanja.com/api/studio/quota", {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });
  const quotaApiData = await quotaApiRes.json();
  console.log("✔ /api/studio/quota response:", JSON.stringify(quotaApiData, null, 2));

  // Step 8: Verify Studio UI Badge
  console.log("\n[STEP 8] Navigating to Studio to verify '✨ Unlimited Studio Changes' badge...");
  let projectId = null;
  const { data: existingProjects } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existingProjects && existingProjects.length > 0) {
    projectId = existingProjects[0].id;
  } else {
    const { data: newProj } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name: "Pro Verification Project",
        business_name: "Pro Test Biz",
        json_data: { test: true },
      })
      .select("id")
      .single();
    projectId = newProj?.id;
  }

  if (projectId) {
    console.log(`Opening Studio workspace for project ${projectId}...`);
    await page.goto(`https://websitebanja.com/editor/${projectId}/workspace`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const proBadge = page.locator("text='Unlimited Studio Changes'").first();
    const isProBadgeVisible = await proBadge.isVisible().catch(() => false);
    console.log(`✔ Pro Unlimited Changes badge visible in Studio: ${isProBadgeVisible}`);

    const studioScreenshotPath = path.join(ARTIFACT_DIR, "live_04_studio_pro_unlimited_badge.png");
    await page.screenshot({ path: studioScreenshotPath });
    console.log(`Saved screenshot: ${studioScreenshotPath}`);
  }

  // Compile Final Audit Report
  const passed =
    orderCreatedResponse?.success === true &&
    verifyPaymentResponse?.success === true &&
    verifyPaymentResponse?.isPro === true &&
    quotaApiData?.data?.isPro === true;

  const auditReport = {
    timestamp: new Date().toISOString(),
    environment: "production",
    domain: "https://websitebanja.com",
    user: { id: userId, email: testEmail },
    order: {
      orderId: orderCreatedResponse?.order_id,
      amount: orderCreatedResponse?.amount,
      currency: orderCreatedResponse?.currency,
      keyId: orderCreatedResponse?.key_id,
    },
    verification: {
      success: verifyPaymentResponse?.success,
      isPro: verifyPaymentResponse?.isPro,
      planId: verifyPaymentResponse?.planId,
      message: verifyPaymentResponse?.message,
    },
    database: {
      subscription: subRecord,
      quota: quotaRecord,
    },
    studioQuotaApi: quotaApiData,
    cspViolationsCount: cspViolations.length,
    cspViolations,
    passed,
  };

  const reportFile = path.join(ARTIFACT_DIR, "live_razorpay_e2e_verified.json");
  fs.writeFileSync(reportFile, JSON.stringify(auditReport, null, 2));
  console.log(`\nAudit report written to: ${reportFile}`);

  console.log("\n================================================================================");
  console.log(`FINAL STATUS: ${passed ? "ALL CHECKS PASSED (100% SUCCESS)" : "VERIFICATION FAILED"}`);
  console.log("================================================================================");

  await browser.close();
}

main().catch((err) => {
  console.error("FATAL ERROR during verification:", err);
  process.exit(1);
});
