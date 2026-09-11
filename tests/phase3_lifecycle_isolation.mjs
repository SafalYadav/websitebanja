import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import assert from "node:assert/strict";
import crypto from "crypto";

// 1. Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = (match[2] || "").replace(/^["']|["']$/g, "").trim();
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

// Separate client instances to prevent auth state cross-contamination
function createIsolatedClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const clientA = createIsolatedClient();
const clientB = createIsolatedClient();

const rand = () => crypto.randomBytes(4).toString("hex");
const userA_email = `phase3_userA_${rand()}@example.com`;
const userB_email = `phase3_userB_${rand()}@example.com`;
const testPassword = "TestPassword_Phase3!";

async function runPhase3TestSuite() {
  console.log("================================================================================");
  console.log("WEBSITEBANJA AI — PHASE 3 AUTOMATED VERIFICATION SUITE");
  console.log("Lifecycle, Database Persistence, Project Isolation, Publishing & Security");
  console.log("================================================================================\n");

  // Step 0: User Setup
  console.log("[Setup] Provisioning isolated test users...");
  const { data: authA, error: errAuthA } = await clientA.auth.signUp({
    email: userA_email,
    password: testPassword,
  });
  if (errAuthA || !authA.user) throw new Error("Failed to provision User A: " + errAuthA?.message);
  const userA_id = authA.user.id;
  console.log(`  ✓ User A created: ${userA_id} (${userA_email})`);

  const { data: authB, error: errAuthB } = await clientB.auth.signUp({
    email: userB_email,
    password: testPassword,
  });
  if (errAuthB || !authB.user) throw new Error("Failed to provision User B: " + errAuthB?.message);
  const userB_id = authB.user.id;
  console.log(`  ✓ User B created: ${userB_id} (${userB_email})`);

  // ==============================================================================
  // TEST A: Project Creation with Business Metadata
  // ==============================================================================
  console.log("\n[TEST A] Project Creation with Business Metadata...");
  const projectAName = `Apex Dental Care ${rand()}`;
  const { data: projA, error: errCreateA } = await clientA
    .from("projects")
    .insert({
      user_id: userA_id,
      name: projectAName,
      business_name: "Apex Dental Care",
      category: "Dental Clinic",
      style: "Modern",
      primary_color: "#15803d",
      secondary_color: "#0f766e",
      phone: "+91 9876543210",
      email: "info@apexdental.com",
      whatsapp_number: "9876543210",
      whatsapp_enabled: true,
      whatsapp_message: "Hello Apex Dental, I would like to book an appointment.",
      json_data: {
        hero: { title: "Painless Dental Treatments", subtitle: "World class dentistry in Mumbai" },
        services: [{ title: "Teeth Whitening", price: "₹2,500" }],
      },
    })
    .select()
    .single();

  if (errCreateA || !projA) {
    throw new Error("TEST A Failed to create project A: " + errCreateA?.message);
  }
  assert.equal(projA.user_id, userA_id, "Project owner must match User A");
  assert.equal(projA.business_name, "Apex Dental Care");
  assert.equal(projA.category, "Dental Clinic");
  assert.equal(projA.primary_color, "#15803d");
  assert.equal(projA.whatsapp_number, "9876543210");
  assert.equal(projA.whatsapp_enabled, true);
  console.log(`  ✓ Project created successfully with ID: ${projA.id}`);

  // ==============================================================================
  // TEST B: Database Persistence & Reload
  // ==============================================================================
  console.log("\n[TEST B] Database Persistence & Full Reload from Supabase...");
  const { data: reloadedA, error: errReloadA } = await clientA
    .from("projects")
    .select("*")
    .eq("id", projA.id)
    .single();

  if (errReloadA || !reloadedA) {
    throw new Error("TEST B Failed to reload project A: " + errReloadA?.message);
  }
  assert.equal(reloadedA.id, projA.id);
  assert.equal(reloadedA.business_name, "Apex Dental Care");
  assert.equal(reloadedA.primary_color, "#15803d");
  assert.equal(reloadedA.whatsapp_number, "9876543210");
  assert.deepEqual(reloadedA.json_data.hero.title, "Painless Dental Treatments");
  console.log("  ✓ All fields survived full reload with 100% attribute integrity");

  // ==============================================================================
  // TEST C: Modification Persistence (Backend Requirement & Configuration)
  // ==============================================================================
  console.log("\n[TEST C] Modification Persistence (Backend Requirement & Config)...");
  const backendConfig = {
    mode: "managed",
    title: "Real-time Booking & Appointment Engine",
    features: ["Calendar Slot Availability", "Automated Booking Confirmation"],
    updated_at: new Date().toISOString(),
  };

  const { data: updatedA, error: errUpdateA } = await clientA
    .from("projects")
    .update({
      backend_requirement: "managed_booking",
      backend_config: backendConfig,
      whatsapp_message: "Updated appointment booking message",
    })
    .eq("id", projA.id)
    .select()
    .single();

  if (errUpdateA || !updatedA) {
    throw new Error("TEST C Failed to update project A: " + errUpdateA?.message);
  }
  assert.equal(updatedA.backend_requirement, "managed_booking");
  assert.equal(updatedA.backend_config.mode, "managed");
  assert.equal(updatedA.whatsapp_message, "Updated appointment booking message");

  // Confirm directly in DB
  const { data: verifyC } = await clientA
    .from("projects")
    .select("backend_requirement, backend_config, whatsapp_message")
    .eq("id", projA.id)
    .single();
  assert.equal(verifyC.backend_requirement, "managed_booking");
  assert.equal(verifyC.backend_config.mode, "managed");
  console.log("  ✓ Backend requirement and backend_config persisted to database");

  // ==============================================================================
  // TEST D: Multi-Project Switching & Isolation for Same User
  // ==============================================================================
  console.log("\n[TEST D] Multi-Project Switching & State Isolation for Same User...");
  const { data: projA2, error: errCreateA2 } = await clientA
    .from("projects")
    .insert({
      user_id: userA_id,
      name: `Second Project ${rand()}`,
      business_name: "Urban Cafe & Bakery",
      category: "Restaurant",
      backend_requirement: "managed_orders",
      json_data: { hero: { title: "Fresh Artisan Coffee" } },
    })
    .select()
    .single();

  if (errCreateA2 || !projA2) throw new Error("Failed to create second project: " + errCreateA2?.message);

  // Modify Project A2
  await clientA
    .from("projects")
    .update({
      business_name: "Urban Cafe & Bakery (Downtown)",
      json_data: { hero: { title: "Specialty Roasted Espresso" } },
    })
    .eq("id", projA2.id);

  // Check Project A1 is untouched
  const { data: checkA1 } = await clientA.from("projects").select("*").eq("id", projA.id).single();
  assert.equal(checkA1.business_name, "Apex Dental Care");
  assert.equal(checkA1.backend_requirement, "managed_booking");
  assert.deepEqual(checkA1.json_data.hero.title, "Painless Dental Treatments");

  // Check Project A2 has its own state
  const { data: checkA2 } = await clientA.from("projects").select("*").eq("id", projA2.id).single();
  assert.equal(checkA2.business_name, "Urban Cafe & Bakery (Downtown)");
  assert.equal(checkA2.backend_requirement, "managed_orders");
  assert.deepEqual(checkA2.json_data.hero.title, "Specialty Roasted Espresso");
  console.log("  ✓ Zero cross-project leakage between multiple projects owned by same user");

  // ==============================================================================
  // TEST E: Strict Cross-Tenant Project Isolation & IDOR Protection
  // ==============================================================================
  console.log("\n[TEST E] Strict Cross-Tenant Project Isolation & IDOR Protection (User A vs User B)...");

  // 1. User B tries to SELECT User A's project
  const { data: bSelectA, error: errBSelectA } = await clientB
    .from("projects")
    .select("*")
    .eq("id", projA.id);

  assert.equal(bSelectA?.length ?? 0, 0, "User B must NOT be able to select User A's private project (RLS violation)");
  console.log("  ✓ User B read attempt on User A project blocked by RLS (0 rows returned)");

  // 2. User B tries to UPDATE User A's project
  const { data: bUpdateA, error: errBUpdateA } = await clientB
    .from("projects")
    .update({ business_name: "HACKED BY USER B" })
    .eq("id", projA.id)
    .select();

  assert.equal(bUpdateA?.length ?? 0, 0, "User B must NOT be able to update User A's project (RLS violation)");

  // Verify Project A unchanged
  const { data: untouchedA } = await clientA.from("projects").select("business_name").eq("id", projA.id).single();
  assert.equal(untouchedA.business_name, "Apex Dental Care", "User A project name must remain unchanged");
  console.log("  ✓ User B update attempt on User A project rejected (0 rows affected, data pristine)");

  // 3. User B tries to DELETE User A's project
  const { data: bDeleteA, error: errBDeleteA } = await clientB
    .from("projects")
    .delete()
    .eq("id", projA.id)
    .select();

  assert.equal(bDeleteA?.length ?? 0, 0, "User B must NOT be able to delete User A's project (RLS violation)");
  const { data: stillAliveA } = await clientA.from("projects").select("id").eq("id", projA.id).single();
  assert.ok(stillAliveA, "Project A must still exist");
  console.log("  ✓ User B delete attempt on User A project rejected (project intact)");

  // 4. User B tries to PUBLISH User A's project via atomic RPC
  const { error: errBPublishA } = await clientB.rpc("publish_project_atomic", {
    p_project_id: projA.id,
    p_slug: `hacked-slug-${rand()}`,
    p_snapshot_data: { hacked: true },
  });

  assert.ok(errBPublishA, "RPC must reject unauthorized publish attempt");
  assert.match(
    errBPublishA.message,
    /Unauthorized/i,
    "Error message must specify Unauthorized"
  );
  console.log("  ✓ User B atomic publish attempt on User A project rejected by PostgreSQL RPC security check");

  // ==============================================================================
  // TEST F: Publishing Flow & Atomic Snapshot Creation
  // ==============================================================================
  console.log("\n[TEST F] Publishing Flow & Atomic Snapshot Creation...");
  const publishSlug = `apex-care-${rand()}`;
  const snapshotData = {
    hero: { title: "Painless Dental Treatments", subtitle: "World class dentistry in Mumbai" },
    services: [{ title: "Teeth Whitening", price: "₹2,500" }],
    _project_meta: {
      business_name: "Apex Dental Care",
      category: "Dental Clinic",
      primary_color: "#15803d",
      backend_requirement: "managed_booking",
      whatsapp_number: "9876543210",
    },
  };

  const { error: errPublish } = await clientA.rpc("publish_project_atomic", {
    p_project_id: projA.id,
    p_slug: publishSlug,
    p_snapshot_data: snapshotData,
  });

  if (errPublish) throw new Error("TEST F Publish RPC failed: " + errPublish.message);

  // Verify Project table state
  const { data: publishedProjA } = await clientA
    .from("projects")
    .select("is_published, public_slug, published_at")
    .eq("id", projA.id)
    .single();

  assert.equal(publishedProjA.is_published, true, "is_published must be true");
  assert.equal(publishedProjA.public_slug, publishSlug, "public_slug must match");
  assert.ok(publishedProjA.published_at, "published_at timestamp must be set");

  // Verify published_versions record
  const { data: snapshotRecord, error: errSnapshot } = await clientA
    .from("published_versions")
    .select("*")
    .eq("project_id", projA.id)
    .order("published_at", { ascending: false })
    .limit(1)
    .single();

  if (errSnapshot || !snapshotRecord) throw new Error("Snapshot record not found: " + errSnapshot?.message);
  assert.equal(snapshotRecord.project_id, projA.id);
  assert.equal(snapshotRecord.snapshot_data._project_meta.backend_requirement, "managed_booking");
  console.log("  ✓ Atomic publication succeeded; immutable snapshot stored in published_versions");

  // ==============================================================================
  // TEST G: Duplicate Slug Rejection (No False-Success)
  // ==============================================================================
  console.log("\n[TEST G] Duplicate Slug Rejection & Collision Handling...");
  // User B tries to publish their own project with User A's already-taken slug
  const { data: projB } = await clientB
    .from("projects")
    .insert({
      user_id: userB_id,
      name: "User B Clinic",
      json_data: { test: "b" },
    })
    .select()
    .single();

  const { error: errDuplicateSlug } = await clientB.rpc("publish_project_atomic", {
    p_project_id: projB.id,
    p_slug: publishSlug, // Reusing User A's slug!
    p_snapshot_data: { test: "b" },
  });

  assert.ok(errDuplicateSlug, "Duplicate slug publish MUST fail");
  assert.match(
    errDuplicateSlug.message,
    /duplicate key|unique constraint/i,
    "Error must be unique constraint violation"
  );

  // Verify Project B was NOT marked as published
  const { data: checkProjB } = await clientB.from("projects").select("is_published, public_slug").eq("id", projB.id).single();
  assert.equal(checkProjB.is_published, false, "Project B must remain unpublished");
  assert.equal(checkProjB.public_slug, null, "Project B public slug must be null");
  console.log("  ✓ Duplicate slug rejected by database unique constraint; no false success reported");

  // ==============================================================================
  // TEST H: Public Route Lookup & Snapshot Recovery
  // ==============================================================================
  console.log("\n[TEST H] Public Route Lookup via get_published_project_by_slug RPC...");
  // Use unauthenticated client to test public viewer
  const anonClient = createIsolatedClient();
  const { data: publicProjectRows, error: errPublicLookup } = await anonClient.rpc(
    "get_published_project_by_slug",
    {
      p_slug: publishSlug,
      p_slug_decoded: publishSlug,
    }
  );

  if (errPublicLookup || !publicProjectRows || publicProjectRows.length === 0) {
    throw new Error("Failed to look up published project by slug: " + errPublicLookup?.message);
  }
  const publicProj = publicProjectRows[0];
  assert.equal(publicProj.id, projA.id);
  assert.equal(publicProj.public_slug, publishSlug);
  assert.equal(publicProj.is_published, true);
  assert.equal(publicProj.whatsapp_number, "9876543210");
  console.log("  ✓ Anonymous visitor can look up published project by slug without auth");

  // Retrieve published snapshot
  const { data: publicSnapshot } = await anonClient
    .from("published_versions")
    .select("snapshot_data")
    .eq("project_id", projA.id)
    .order("published_at", { ascending: false })
    .limit(1)
    .single();

  assert.ok(publicSnapshot?.snapshot_data, "Snapshot data must be recoverable by public viewer");
  assert.equal(publicSnapshot.snapshot_data._project_meta.business_name, "Apex Dental Care");
  console.log("  ✓ Public snapshot recovered cleanly from published_versions table");

  // ==============================================================================
  // TEST I: Unpublish Flow & Access Revocation
  // ==============================================================================
  console.log("\n[TEST I] Unpublish Flow & Instant Access Revocation...");
  const { data: unpublishedProj, error: errUnpublish } = await clientA
    .from("projects")
    .update({ is_published: false })
    .eq("id", projA.id)
    .select()
    .single();

  if (errUnpublish) throw new Error("Unpublish failed: " + errUnpublish.message);
  assert.equal(unpublishedProj.is_published, false);

  // Verify public lookup now returns 0 rows (404)
  const { data: afterUnpublishRows } = await anonClient.rpc(
    "get_published_project_by_slug",
    {
      p_slug: publishSlug,
      p_slug_decoded: publishSlug,
    }
  );
  assert.equal(afterUnpublishRows?.length ?? 0, 0, "Unpublished project must return 0 rows to anonymous users");
  console.log("  ✓ Unpublish immediately revoked public route access (verified 0 rows returned)");

  // Clean up test data
  console.log("\n[Cleanup] Cleaning up test project records...");
  await clientA.from("projects").delete().eq("id", projA.id);
  await clientA.from("projects").delete().eq("id", projA2.id);
  await clientB.from("projects").delete().eq("id", projB.id);
  console.log("  ✓ Test artifacts cleaned up.");

  console.log("\n================================================================================");
  console.log("ALL PHASE 3 BACKEND, PERSISTENCE, PUBLISHING & ISOLATION TESTS PASSED!");
  console.log("================================================================================");
}

runPhase3TestSuite().catch((err) => {
  console.error("\n❌ PHASE 3 SUITE FAILED:", err);
  process.exit(1);
});
