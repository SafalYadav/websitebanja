import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==================================================");
console.log("   WebsiteBanja Production SEO & Discoverability  ");
console.log("                 Audit Test Suite                 ");
console.log("==================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// 1. Robots.ts verification
test("robots.ts specifies valid crawler directives and sitemap", async () => {
  const robotsModule = await import("../src/app/robots.ts");
  const robotsFn = robotsModule.default;
  assert.ok(typeof robotsFn === "function", "robots must export a default function");

  const result = robotsFn();
  assert.equal(result.host, "https://websitebanja.com");
  assert.equal(result.sitemap, "https://websitebanja.com/sitemap.xml");

  const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
  const wildcardRule = rules.find((r) => r.userAgent === "*");
  assert.ok(wildcardRule, "Must have wildcard userAgent rule");

  const allowed = wildcardRule.allow || [];
  const disallowed = wildcardRule.disallow || [];

  assert.ok(allowed.includes("/"), "Must allow root path");
  assert.ok(allowed.includes("/agent"), "Must allow agent path");
  assert.ok(allowed.includes("/p/"), "Must allow public published path");

  assert.ok(disallowed.includes("/dashboard/"), "Must disallow dashboard");
  assert.ok(disallowed.includes("/editor/"), "Must disallow editor");
  assert.ok(disallowed.includes("/builder/"), "Must disallow builder");
  assert.ok(disallowed.includes("/api/"), "Must disallow api");
  assert.ok(disallowed.includes("/login"), "Must disallow login");
});

// 2. Sitemap.ts verification
test("sitemap.ts returns canonical URLs with valid priorities", async () => {
  const sitemapModule = await import("../src/app/sitemap.ts");
  const sitemapFn = sitemapModule.default;
  assert.ok(typeof sitemapFn === "function", "sitemap must export a default function");

  const entries = await sitemapFn();
  assert.ok(Array.isArray(entries), "Sitemap must return an array of entries");
  assert.ok(entries.length >= 2, "Sitemap must contain at least root and agent entries");

  const home = entries.find((e) => e.url === "https://websitebanja.com");
  assert.ok(home, "Sitemap must include root canonical URL");
  assert.equal(home.priority, 1.0, "Root URL should have priority 1.0");
  assert.equal(home.changeFrequency, "daily");

  const agent = entries.find((e) => e.url === "https://websitebanja.com/agent");
  assert.ok(agent, "Sitemap must include agent canonical URL");
  assert.equal(agent.priority, 0.9, "Agent URL should have priority 0.9");
});

// 3. Structured Data (JSON-LD) verification
test("JsonLd schemas define valid WebSite, Organization, SoftwareApplication, and FAQPage", async () => {
  const jsonLdModule = await import("../src/lib/seo/schemaData.ts");
  const { websiteJsonLd, organizationJsonLd, softwareApplicationJsonLd, faqPageJsonLd, authenticFaqs } = jsonLdModule;

  // WebSite
  assert.equal(websiteJsonLd["@type"], "WebSite");
  assert.equal(websiteJsonLd.url, "https://websitebanja.com");
  assert.ok(websiteJsonLd.potentialAction, "WebSite must contain SearchAction");

  // Organization
  assert.equal(organizationJsonLd["@type"], "Organization");
  assert.equal(organizationJsonLd.url, "https://websitebanja.com");
  assert.equal(organizationJsonLd.logo.url, "https://websitebanja.com/logo.png");

  // SoftwareApplication
  assert.equal(softwareApplicationJsonLd["@type"], "SoftwareApplication");
  assert.equal(softwareApplicationJsonLd.applicationCategory, "DesignApplication");
  assert.equal(softwareApplicationJsonLd.offers.price, "0");
  assert.ok(softwareApplicationJsonLd.featureList.length >= 4, "Must list core features");

  // FAQPage
  assert.equal(faqPageJsonLd["@type"], "FAQPage");
  assert.equal(faqPageJsonLd.mainEntity.length, 5, "Must have exactly 5 authentic FAQs");
  assert.equal(authenticFaqs.length, 5);

  const firstQuestion = faqPageJsonLd.mainEntity[0];
  assert.equal(firstQuestion["@type"], "Question");
  assert.equal(firstQuestion.acceptedAnswer["@type"], "Answer");
  assert.ok(firstQuestion.name.includes("coding or design skills"));
});

// 4. LLMs.txt AI Discoverability file verification
test("public/llms.txt exists with structured documentation for AI crawlers", () => {
  const llmsPath = path.join(rootDir, "public", "llms.txt");
  assert.ok(fs.existsSync(llmsPath), "public/llms.txt must exist");

  const content = fs.readFileSync(llmsPath, "utf-8");
  assert.ok(content.includes("# WebsiteBanja AI"), "Must contain title header");
  assert.ok(content.includes("Mitra"), "Must mention Mitra AI Architect");
  assert.ok(content.includes("https://websitebanja.com"), "Must mention canonical URL");
  assert.ok(content.includes("https://websitebanja.com/agent"), "Must mention agent URL");
  assert.ok(content.includes("Azure Container Apps"), "Must accurately specify infrastructure");
});

// 5. IndexNow verification key file
test("IndexNow verification key file exists and matches key string", () => {
  const key = "54c0e643e26f4f269a844da04791336d";
  const keyPath = path.join(rootDir, "public", `${key}.txt`);
  assert.ok(fs.existsSync(keyPath), `public/${key}.txt must exist`);

  const content = fs.readFileSync(keyPath, "utf-8").trim();
  assert.equal(content, key, "Key file content must exactly match key");
});

// 6. Middleware and Route Protection verification
test("middleware.ts properly enforces www-to-apex redirection and X-Robots-Tag", () => {
  const middlewarePath = path.join(rootDir, "src", "middleware.ts");
  assert.ok(fs.existsSync(middlewarePath), "src/middleware.ts must exist");

  const content = fs.readFileSync(middlewarePath, "utf-8");
  assert.ok(content.includes("www.websitebanja.com"), "Must detect www host");
  assert.ok(content.includes("308"), "Must use 308 permanent redirect");
  assert.ok(content.includes("X-Robots-Tag"), "Must set X-Robots-Tag header");
  assert.ok(content.includes("noindex, nofollow, noarchive"), "Must set strict crawler restrictions");
  assert.ok(content.includes("/dashboard"), "Must protect /dashboard");
  assert.ok(content.includes("/editor"), "Must protect /editor");
});

// 7. Root layout metadataBase & canonical verification
test("src/app/layout.tsx configures metadataBase and canonical URLs", () => {
  const layoutPath = path.join(rootDir, "src", "app", "layout.tsx");
  const content = fs.readFileSync(layoutPath, "utf-8");
  assert.ok(content.includes("metadataBase: new URL(\"https://websitebanja.com\")"), "Must configure metadataBase");
  assert.ok(content.includes("canonical: \"https://websitebanja.com\""), "Must configure canonical URL");
  assert.ok(content.includes("openGraph:"), "Must configure OpenGraph");
  assert.ok(content.includes("twitter:"), "Must configure Twitter cards");
  assert.ok(content.includes("websiteJsonLd"), "Must render WebSite JSON-LD");
});

console.log(`\n==================================================`);
console.log(`Summary: ${passed}/${total} SEO audit tests passed.`);
console.log(`==================================================\n`);
