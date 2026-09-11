import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const ROOT_DIR = process.cwd();

describe("WebsiteBanja AI — Product UI/UX, Pricing & Flow Verification", () => {
  // 1. PRICING VERIFICATION
  describe("Part 1 & 11: Pricing Must Be INR Only (₹500/mo & ₹0)", () => {
    it("should verify PLANS configuration has priceINR: 500 for Pro and 0 for Free", () => {
      const plansContent = readFileSync(resolve(ROOT_DIR, "src/lib/plans.ts"), "utf-8");
      assert.match(plansContent, /priceINR:\s*500/, "Pro plan must be 500 INR in plans.ts");
      assert.match(plansContent, /priceINR:\s*0/, "Free plan must be 0 INR in plans.ts");
      assert.doesNotMatch(plansContent, /priceINR:\s*2000/, "2000 priceINR must be removed");
    });

    it("should verify src/components/Pricing.tsx contains ₹500/mo and NO dollar pricing", () => {
      const pricingContent = readFileSync(resolve(ROOT_DIR, "src/components/Pricing.tsx"), "utf-8");
      assert.match(pricingContent, /formatINR\(proPlan\.priceINR\)/, "Must format pro plan price with formatINR");
      assert.match(pricingContent, /Upgrade to Pro \(\{formatINR\(proPlan\.priceINR\)\}\/mo\)/, "CTA button must show (₹500/mo)");
      assert.match(pricingContent, /Paid Pro Tier \(₹500\/month\)/, "Comment must reflect ₹500/month");
      assert.doesNotMatch(pricingContent, /2,000/, "No ₹2,000 or 2,000 allowed in Pricing.tsx");
      assert.doesNotMatch(pricingContent, /\$[0-9]+/, "No dollar pricing ($X) allowed in Pricing.tsx");
    });

    it("should verify 21st.dev adapted pricing table contains INR pricing and NO dollar pricing", () => {
      const pricing21stContent = readFileSync(resolve(ROOT_DIR, "src/components/21st/PricingTable21st.tsx"), "utf-8");
      assert.match(pricing21stContent, /price:\s*"₹500"/, "Must have ₹500 price in default tiers");
      assert.match(pricing21stContent, /price:\s*"₹0"/, "Must have ₹0 price in default tiers");
      assert.doesNotMatch(pricing21stContent, /\$29|\$79|\$199/, "Dollar amounts $29, $79, $199 must be removed");
      assert.doesNotMatch(pricing21stContent, /price:\s*"\$[0-9]+"/, "No dollar prices allowed in PricingTable21st default tiers");
    });

    it("should verify BeforeAfterComparison contains INR quotes rather than dollar quotes", () => {
      const compContent = readFileSync(resolve(ROOT_DIR, "src/components/landing/BeforeAfterComparison.tsx"), "utf-8");
      assert.match(compContent, /₹50,000 – ₹2,00,000\+/, "Must use INR quote in agency comparison");
      assert.doesNotMatch(compContent, /\$2,500 – \$10,000\+/, "Dollar quote must be eliminated");
    });
  });

  // 2. BUILD CHOICE FLOW VERIFICATION
  describe("Parts 2, 3, 4, 8: Neutral 2-Choice Build Flow & Prompt Mode Removal", () => {
    it("should verify 'Start with a Prompt' is completely removed from editor page", () => {
      const editorPageContent = readFileSync(resolve(ROOT_DIR, "src/app/editor/[id]/page.tsx"), "utf-8");
      assert.doesNotMatch(editorPageContent, /Start with a Prompt/i, "'Start with a Prompt' must be removed");
      assert.doesNotMatch(editorPageContent, /prompt-mode/i, "prompt-mode container must be removed");
      assert.doesNotMatch(editorPageContent, /handlePromptSubmit/i, "handlePromptSubmit handler must be removed");
      assert.doesNotMatch(editorPageContent, /wb_pending_prompt/i, "wb_pending_prompt storage logic must be removed");
    });

    it("should verify 'Recommended' badge is completely removed from Talk with AI Agent", () => {
      const editorPageContent = readFileSync(resolve(ROOT_DIR, "src/app/editor/[id]/page.tsx"), "utf-8");
      assert.doesNotMatch(editorPageContent, /Recommended/i, "'Recommended' badge must be removed from editor build flow");
    });

    it("should verify exactly 2 choices are offered with neutral user choice", () => {
      const editorPageContent = readFileSync(resolve(ROOT_DIR, "src/app/editor/[id]/page.tsx"), "utf-8");
      assert.match(editorPageContent, /Talk with AI Agent/, "Must include 'Talk with AI Agent' choice");
      assert.match(editorPageContent, /Use Business Details/, "Must include 'Use Business Details' choice");
      assert.match(editorPageContent, /grid-cols-1 md:grid-cols-2/, "Must use 2-column grid layout for equal visual weight");
      assert.match(editorPageContent, /role="radiogroup"/, "Must use accessible radiogroup semantics");
    });

    it("should verify builderStore defaults onboardingMode to 'agent' and gracefully maps legacy 'prompt'", () => {
      const builderStoreContent = readFileSync(resolve(ROOT_DIR, "src/store/builderStore.ts"), "utf-8");
      assert.match(builderStoreContent, /onboardingMode:\s*"agent"/, "Default onboarding mode must be 'agent'");
      assert.match(builderStoreContent, /onboardingMode:\s*\(project\.onboarding_mode === "details" \? "details" : "agent"\)/, "Must map legacy modes gracefully to valid choices");
    });
  });

  // 3. DASHBOARD LOADING PERFORMANCE & BACK NAVIGATION CACHE
  describe("Parts 5, 6, 7: Dashboard Loading Performance & Back Navigation Cache", () => {
    it("should verify useProjectsStore provides persistent in-memory caching and SWR", () => {
      const storeContent = readFileSync(resolve(ROOT_DIR, "src/store/projectsStore.ts"), "utf-8");
      assert.match(storeContent, /create<ProjectsState>/, "Zustand store must be created");
      assert.match(storeContent, /isInitialLoaded/, "Store must track initial load state");
      assert.match(storeContent, /lastFetchedAt/, "Store must track fetch timestamps for cache freshness");
      assert.match(storeContent, /updateProjectInList/, "Store must support direct in-place updates");
      assert.match(storeContent, /removeProjectFromList/, "Store must support direct removals");
    });

    it("should verify getProjects avoids unnecessary blocking auth network roundtrips", () => {
      const projectsContent = readFileSync(resolve(ROOT_DIR, "src/lib/projects.ts"), "utf-8");
      assert.match(projectsContent, /const user = await getAuthenticatedUser\(\);/, "getProjects must use getAuthenticatedUser");
      assert.match(projectsContent, /const \{ data: \{ session \} \} = await supabase\.auth\.getSession\(\);/, "getAuthenticatedUser must check session first");
    });

    it("should verify Dashboard renders immediately from cache on back navigation", () => {
      const dashboardContent = readFileSync(resolve(ROOT_DIR, "src/app/dashboard/page.tsx"), "utf-8");
      assert.match(dashboardContent, /useProjectsStore/, "Dashboard must consume useProjectsStore");
      assert.match(dashboardContent, /isInitialLoading = storeLoading && !isInitialLoaded/, "Must only show full loading skeleton when no cached projects exist");
      assert.match(dashboardContent, /Create New Website/, "Must retain prominent primary CTA");
      assert.match(dashboardContent, /aria-label="All Websites"/, "Must have accessible landmark label");
    });

    it("should verify useProjectAutosave updates projectsStore in background", () => {
      const autosaveContent = readFileSync(resolve(ROOT_DIR, "src/hooks/useProjectAutosave.ts"), "utf-8");
      assert.match(autosaveContent, /useProjectsStore\.getState\(\)\.updateProjectInList/, "Autosave must synchronize with projectsStore");
    });
  });

  // 4. DESIGN INTELLIGENCE REAL PRODUCT APPLICATION & SHOWCASE REMOVAL
  describe("Parts 9-19: Complete Showcase Removal & Modern Studio Experience", () => {
    it("should verify Showcase section and Templates component are completely removed", () => {
      assert.equal(existsSync(resolve(ROOT_DIR, "src/components/Templates.tsx")), false, "Templates.tsx must be completely deleted");
      const navbarContent = readFileSync(resolve(ROOT_DIR, "src/components/Navbar.tsx"), "utf-8");
      assert.doesNotMatch(navbarContent, /#showcase/i, "Navbar must not reference #showcase");
      const footerContent = readFileSync(resolve(ROOT_DIR, "src/components/Footer.tsx"), "utf-8");
      assert.doesNotMatch(footerContent, /#showcase/i, "Footer must not reference #showcase");
    });

    it("should verify InteractiveDemo workbench highlights industry diversity and respects reduced motion", () => {
      const demoContent = readFileSync(resolve(ROOT_DIR, "src/components/landing/InteractiveDemo.tsx"), "utf-8");
      assert.match(demoContent, /Nordic Roast Works/, "Artisan coffee industry represented");
      assert.match(demoContent, /Synapse Pulse AI/, "Cloud telemetry SaaS industry represented");
      assert.match(demoContent, /Lumina Studio Dental/, "Healthcare/dental industry represented");
      assert.match(demoContent, /Aura Prime Estates/, "Real Estate industry represented");
      assert.match(demoContent, /useReducedMotion/, "Must respect user reduced motion preference");
    });

    it("should verify BuildChoiceSection implements 2 neutral creation paths with zero recommended badge", () => {
      const choiceContent = readFileSync(resolve(ROOT_DIR, "src/components/landing/BuildChoiceSection.tsx"), "utf-8");
      assert.match(choiceContent, /Talk with AI Agent/, "Must include Talk with AI Agent path");
      assert.match(choiceContent, /Use Business Details/, "Must include Use Business Details path");
      assert.doesNotMatch(choiceContent, /Recommended/i, "Must not have 'Recommended' badge");
    });

    it("should verify Pricing component implements CRO & accessibility tokens", () => {
      const pricingContent = readFileSync(resolve(ROOT_DIR, "src/components/Pricing.tsx"), "utf-8");
      assert.match(pricingContent, /useReducedMotion/, "Pricing must respect reduced motion");
      assert.match(pricingContent, /aria-label="Pricing Plans"/, "Pricing must have accessible section label");
    });
  });
});
