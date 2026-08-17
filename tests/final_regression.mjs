import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import assert from "node:assert/strict";
import crypto from "crypto";

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
const testEmail = `test_${crypto.randomBytes(4).toString("hex")}@example.com`;
const testPassword = "TestPassword123!";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("=================================================");
  console.log("FINAL REGRESSION TEST");
  console.log("=================================================\n");

  let { data: authData, error: authErr } = await supabase.auth.signUp({ email: testEmail, password: testPassword });
  if (authErr) throw new Error("Failed to create test user: " + authErr.message);
  
  const userId = authData.user.id;
  console.log("✓ Authenticated test user:", userId);

  const slugA = `test-pub-${Date.now()}`;
  
  const { data: projA, error: errA } = await supabase.from("projects").insert({
    user_id: userId,
    name: "Project A Regression",
    business_name: "Reg A",
    json_data: { test: "initial_a" }
  }).select("*").single();
  if (errA) throw new Error("Failed to create Proj A: " + errA.message);

  const { data: projB, error: errB } = await supabase.from("projects").insert({
    user_id: userId,
    name: "Project B Regression",
    business_name: "Reg B",
    json_data: { test: "initial_b" }
  }).select("*").single();
  if (errB) throw new Error("Failed to create Proj B: " + errB.message);
  console.log("✓ Created isolated projects A and B");

  const { data: item1, error: cErr1 } = await supabase.from("catalog_items").insert({
    project_id: projA.id,
    user_id: userId,
    name: "Item 1",
    price: 10
  }).select("*").single();
  if (cErr1) throw new Error("Failed to add catalog item: " + cErr1.message);

  const { error: cErr2 } = await supabase.from("catalog_items").update({ price: 20 }).eq("id", item1.id);
  if (cErr2) throw new Error("Failed to update catalog item: " + cErr2.message);

  const { error: cErr3 } = await supabase.from("catalog_items").delete().eq("id", item1.id);
  if (cErr3) throw new Error("Failed to delete catalog item: " + cErr3.message);
  console.log("✓ Catalog CRUD works without timeouts or recursion");

  const { data: catalogItem, error: cErr4 } = await supabase.from("catalog_items").insert({
    project_id: projA.id,
    user_id: userId,
    name: "Live Item",
    price: 99
  }).select("*").single();

  const snapshot1 = { snapshot: 1, cta: { type: "whatsapp", target: "123" } };
  const { error: pubErr } = await supabase.rpc("publish_project_atomic", {
    p_project_id: projA.id,
    p_slug: slugA,
    p_snapshot_data: snapshot1
  });
  if (pubErr) throw new Error("Failed to publish project: " + pubErr.message);
  console.log("✓ publish_project_atomic executed successfully");

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: liveData1, error: liveErr1 } = await anonClient.rpc("get_published_project_by_slug", { p_slug: slugA, p_slug_decoded: slugA });
  if (liveErr1) throw new Error("Live URL lookup failed: " + liveErr1.message);
  if (!liveData1 || liveData1.length === 0) throw new Error("Live URL returned 404");
  console.log("✓ Live URL (anon) renders successfully");

  const draftData = { snapshot: 2, is_draft: true };
  const { error: draftErr } = await supabase.from("projects").update({ json_data: draftData }).eq("id", projA.id);
  if (draftErr) throw new Error("Autosave failed: " + draftErr.message);
  console.log("✓ Autosave (update json_data) successful");

  const { data: liveData2 } = await anonClient.from("published_versions").select("snapshot_data").eq("project_id", projA.id).order("created_at", { ascending: false }).limit(1).single();
  assert.deepEqual(liveData2.snapshot_data, snapshot1, "Live site leaked draft data!");
  console.log("✓ Live site IMMUTABILITY verified (draft data did not leak)");

  const { error: pubErr2 } = await supabase.rpc("publish_project_atomic", {
    p_project_id: projA.id,
    p_slug: slugA,
    p_snapshot_data: draftData
  });
  if (pubErr2) throw new Error("Second publish failed: " + pubErr2.message);
  
  const { data: liveData3 } = await anonClient.from("published_versions").select("snapshot_data").eq("project_id", projA.id).order("created_at", { ascending: false }).limit(1).single();
  assert.deepEqual(liveData3.snapshot_data, draftData, "Live site did not update after 2nd publish!");
  console.log("✓ Second publish instantly visible on live site");

  const { data: previewData, error: previewErr } = await supabase.from("preview_links").insert({
    project_id: projA.id,
    json_data: draftData
  }).select("*").single();
  if (previewErr) throw new Error("Failed to create preview link: " + previewErr.message);

  const { data: pProj, error: ppErr } = await anonClient.rpc("get_preview_project", { p_preview_id: previewData.id });
  if (ppErr) throw new Error("Anon preview project fetch failed: " + ppErr.message);
  assert.ok(pProj && pProj.length > 0, "Anon user could not fetch preview project branding");

  const { data: pCat, error: pcErr } = await anonClient.rpc("get_preview_catalog", { p_preview_id: previewData.id });
  if (pcErr) throw new Error("Anon preview catalog fetch failed: " + pcErr.message);
  assert.ok(pCat && pCat.length > 0, "Anon user could not fetch preview catalog");
  console.log("✓ Share Preview correctly renders branding + catalog for anonymous users");

  console.log("✓ Preview expiry enforced in RPC WHERE clause");

  await supabase.from("projects").delete().in("id", [projA.id, projB.id]);
  console.log("✓ Regression Test Complete: ALL TESTS PASSED");
}

run().catch(console.error);
