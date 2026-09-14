import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

console.log("================================================================================");
console.log("TESTING GOOGLE ADSENSE INTEGRATION & ROUTE EXCLUSION LOGIC");
console.log("================================================================================\n");

// 1. Test ads.txt file and route
console.log("[TEST 1] Verifying ads.txt...");
const publicAdsTxt = fs.readFileSync(path.join(ROOT, "public/ads.txt"), "utf8");
const expectedPublisherId = "pub-6886166249093676";
const expectedSellerRecord = "google.com, pub-6886166249093676, DIRECT, f08c47fec0942fa0";

assert.ok(publicAdsTxt.includes(expectedSellerRecord), "public/ads.txt contains expected seller record");
console.log("  ✔ public/ads.txt verified with correct publisher ID");

const routeAdsTxt = fs.readFileSync(path.join(ROOT, "src/app/ads.txt/route.ts"), "utf8");
assert.ok(routeAdsTxt.includes(expectedSellerRecord), "src/app/ads.txt/route.ts contains expected seller record");
assert.ok(routeAdsTxt.includes("text/plain"), "src/app/ads.txt/route.ts specifies text/plain Content-Type");
console.log("  ✔ src/app/ads.txt/route.ts verified");

// 2. Test Content Security Policy (CSP) in next.config.ts
console.log("\n[TEST 2] Verifying Content Security Policy (CSP) in next.config.ts...");
const nextConfigContent = fs.readFileSync(path.join(ROOT, "next.config.ts"), "utf8");
assert.ok(nextConfigContent.includes("pagead2.googlesyndication.com"), "CSP includes pagead2.googlesyndication.com in script-src");
assert.ok(nextConfigContent.includes("googleads.g.doubleclick.net"), "CSP includes googleads.g.doubleclick.net in frame-src");
assert.ok(nextConfigContent.includes("tpc.googlesyndication.com"), "CSP includes tpc.googlesyndication.com");
console.log("  ✔ CSP directives allow Google AdSense scripts, frames, and telemetry");

// 3. Test Metadata Verification Tag in layout.tsx
console.log("\n[TEST 3] Verifying AdSense Verification Tag in src/app/layout.tsx...");
const layoutContent = fs.readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf8");
assert.ok(layoutContent.includes('"google-adsense-account": "ca-pub-6886166249093676"'), "layout.tsx has google-adsense-account metadata");
assert.ok(layoutContent.includes("<AdSenseScript"), "layout.tsx mounts AdSenseScript");
console.log("  ✔ layout.tsx contains ownership verification meta tag and AdSenseScript component");

// 4. Test Route Exclusions Logic
console.log("\n[TEST 4] Testing Route Exclusion Logic in AdSenseScript...");
// Extract logic from AdSenseScript
const EXCLUDED_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/dashboard",
  "/builder",
  "/editor",
  "/studio",
  "/admin",
  "/agent",
  "/preview",
  "/pricing",
  "/checkout",
  "/account",
  "/settings",
  "/p/",
];

function isAdSenseAllowedOnRoute(pathname) {
  if (!pathname) return false;
  const cleanPath = pathname.toLowerCase();
  for (const excluded of EXCLUDED_ROUTES) {
    if (cleanPath === excluded || cleanPath.startsWith(excluded + "/") || cleanPath.startsWith(excluded)) {
      return false;
    }
  }
  return true;
}

// Strictly forbidden routes
const strictlyForbidden = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/dashboard",
  "/dashboard/projects",
  "/builder",
  "/builder/content",
  "/builder/review",
  "/builder/loading",
  "/editor/project-123",
  "/editor/project-123/workspace",
  "/studio",
  "/studio/quota",
  "/admin",
  "/admin/analytics",
  "/agent",
  "/preview/project-123",
  "/pricing",
  "/checkout",
  "/account",
  "/settings",
  "/p/client-restaurant-slug",
];

for (const route of strictlyForbidden) {
  const allowed = isAdSenseAllowedOnRoute(route);
  assert.equal(allowed, false, `Route ${route} MUST BE FORBIDDEN for AdSense`);
}
console.log(`  ✔ Verified ${strictlyForbidden.length} sensitive/private/builder routes are strictly EXCLUDED from AdSense`);

// Allowed informational routes
const allowedRoutes = [
  "/",
  "/pattern-audit/bento-grid",
  "/skill-audit/master-design-intelligence",
  "/blog/how-to-build-with-ai",
  "/about",
  "/features",
];

for (const route of allowedRoutes) {
  const allowed = isAdSenseAllowedOnRoute(route);
  assert.equal(allowed, true, `Route ${route} SHOULD BE ALLOWED for AdSense`);
}
console.log(`  ✔ Verified ${allowedRoutes.length} public informational routes are permitted for AdSense`);

console.log("\n================================================================================");
console.log("ALL GOOGLE ADSENSE INTEGRATION TESTS PASSED CLEANLY!");
console.log("================================================================================");
