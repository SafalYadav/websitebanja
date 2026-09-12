// tests/verify_atomic_publish_e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import dotenv from "dotenv";
import jitiFactory from "jiti";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const jiti = jitiFactory(process.cwd(), {
  alias: {
    "@": path.resolve(process.cwd(), "src"),
  },
});

const { getPool, dbCreateProject, dbPublishProjectAtomic, dbGetPublishedVersionBySlug, dbDeleteProject } = jiti("@/lib/db/queries");

async function runAtomicPublishVerification() {
  console.log("\n=======================================================");
  console.log("🧪 VERIFYING ATOMIC PUBLISH END-TO-END (POSTGRESQL)");
  console.log("=======================================================\n");

  const pool = getPool();
  // 1. Verify DB connectivity
  console.log("▶ [Step 1] Connecting to Azure PostgreSQL...");
  const connCheck = await pool.query("SELECT current_user, current_database(), version()");
  console.log("  ✓ Connected as user:", connCheck.rows[0].current_user);
  console.log("  ✓ Connected to DB:", connCheck.rows[0].current_database);

  // 2. Find or create a test user ID and project
  const testUserId = "00000000-0000-0000-0000-000000000001";
  const testSlug = `e2e-publish-test-${Date.now()}`;
  const testProjectName = `Publish Verification ${Date.now()}`;

  console.log(`▶ [Step 2] Creating draft project "${testProjectName}" for user ${testUserId}...`);
  const project = await dbCreateProject(testUserId, testProjectName);
  assert.ok(project, "Project creation should succeed");
  const projectId = project.id;
  console.log("  ✓ Created project with ID:", projectId);

  // 3. Test dbPublishProjectAtomic
  console.log(`▶ [Step 3] Calling dbPublishProjectAtomic with slug "${testSlug}"...`);
  const sampleWebsiteData = {
    hero: {
      title: "Artisanal Coffee & Roastery",
      subtitle: "Freshly roasted single-origin espresso and organic pastries.",
      button: "Reserve Table",
      layoutVariant: "fullscreen_visual",
      trustBadges: ["Single Origin", "Direct Trade", "Daily Roasted"],
      eyebrow: "Specialty Coffee Roasters",
    },
    about: {
      title: "Our Coffee Heritage",
      content: "Crafting sustainable roasting techniques since 2018.",
      badge: "The Roastery",
      highlights: ["Direct Farm Sourcing", "Micro-Batch Roasts", "Zero Carbon Footprint", "Artisan Baristas"],
    },
    services: [
      { title: "Pour Over Bar", description: "Rotating single-origin microlots." },
      { title: "Espresso Tasting", description: "Flight of 3 seasonal roasts." },
    ],
    features: [
      { title: "Artisan Sourcing", description: "Direct relationships with family farms." },
    ],
    sectionOrder: ["hero", "about", "services", "features", "contact"],
  };

  const publishResult = await dbPublishProjectAtomic(projectId, testUserId, testSlug, sampleWebsiteData);
  if (publishResult.error) {
    console.error("  ❌ Atomic publish failed:", publishResult.error);
    throw publishResult.error;
  }
  console.log("  ✓ dbPublishProjectAtomic returned success (no syntax error at or near $1)!");

  // 4. Verify public.published_versions
  console.log("▶ [Step 4] Checking public.published_versions table...");
  const pubRes = await pool.query(
    "SELECT project_id, slug, version_number, json_data, published_at FROM public.published_versions WHERE slug = $1",
    [testSlug]
  );
  assert.equal(pubRes.rows.length, 1, "Should find exactly 1 row in published_versions");
  const publishedRow = pubRes.rows[0];
  console.log("  ✓ Published row exists in DB!");
  console.log("  ✓ Version Number:", publishedRow.version_number);
  console.log("  ✓ Slug:", publishedRow.slug);
  assert.equal(publishedRow.project_id, projectId);

  // 5. Test dbGetPublishedVersionBySlug (Public reader query)
  console.log("▶ [Step 5] Querying public reader via dbGetPublishedVersionBySlug...");
  const publicData = await dbGetPublishedVersionBySlug(testSlug);
  assert.ok(publicData, "Public version should be fetchable by slug");
  console.log("  ✓ Public data fetched successfully!");
  console.log("  ✓ Hero Title:", publicData.data?.hero?.title);
  console.log("  ✓ Hero trustBadges:", publicData.data?.hero?.trustBadges);
  assert.equal(publicData.data?.hero?.title, "Artisanal Coffee & Roastery");

  // 6. Clean up
  console.log("▶ [Step 6] Cleaning up test project and published versions...");
  await pool.query("DELETE FROM public.published_versions WHERE slug = $1", [testSlug]);
  await dbDeleteProject(projectId, testUserId);
  console.log("  ✓ Cleanup complete.");

  console.log("\n=======================================================");
  console.log("🎉 ATOMIC PUBLISH E2E TEST PASSED COMPLETELY!");
  console.log("=======================================================\n");
  process.exit(0);
}

runAtomicPublishVerification().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
