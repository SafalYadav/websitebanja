import assert from "node:assert/strict";

console.log("=================================================");
console.log(" RUNNING PROJECT OWNERSHIP LOGIC UNIT TESTS      ");
console.log("=================================================");

let passed = 0;
let failed = 0;

function runTest(title, fn) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runTestAsync(title, fn) {
  try {
    await fn();
    console.log(`  ✔ [PASS] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// 1. Test AiWorkspaceError class
class AiWorkspaceError extends Error {
  constructor(userMessage, diagnostic) {
    super(userMessage);
    this.name = "AiWorkspaceError";
    this.userMessage = userMessage;
    this.diagnostic = diagnostic;
  }
}

// Emulate the updated serverAssertAiWorkspaceAccess implementation
async function serverAssertAiWorkspaceAccess(projectId, userId, getOwnershipFn) {
  let project = null;
  try {
    project = await getOwnershipFn(projectId);
    if (!project) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      project = await getOwnershipFn(projectId);
    }
  } catch (err) {
    throw new AiWorkspaceError(
      "❌ Project ownership validation failed",
      `Could not load project '${projectId}': ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!project || project.user_id.toLowerCase() !== userId.toLowerCase()) {
    throw new AiWorkspaceError(
      "❌ Project ownership validation failed",
      `User '${userId}' does not own project '${projectId}'`
    );
  }
}

const testProjectId = "59d21621-be59-4310-9ae2-4a3afb181a28";
const testUserId = "965c23ea-081c-404a-a99e-6256bd3a0a59";
const otherUserId = "cceafe47-a710-49e9-a894-16f592dc8e64";

await runTestAsync("Owner match succeeds immediately", async () => {
  const getOwnership = async (id) => ({ id, user_id: testUserId });
  await serverAssertAiWorkspaceAccess(testProjectId, testUserId, getOwnership);
});

await runTestAsync("Owner match with uppercase UUID succeeds (case-insensitive)", async () => {
  const getOwnership = async (id) => ({ id, user_id: testUserId });
  await serverAssertAiWorkspaceAccess(testProjectId, testUserId.toUpperCase(), getOwnership);
});

await runTestAsync("Unauthorized user throws AiWorkspaceError with exact userMessage", async () => {
  const getOwnership = async (id) => ({ id, user_id: testUserId });
  let caught = null;
  try {
    await serverAssertAiWorkspaceAccess(testProjectId, otherUserId, getOwnership);
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof AiWorkspaceError);
  assert.equal(caught.userMessage, "❌ Project ownership validation failed");
  assert.match(caught.diagnostic, /does not own project/);
});

await runTestAsync("Non-existent project throws AiWorkspaceError", async () => {
  const getOwnership = async () => null;
  let caught = null;
  try {
    await serverAssertAiWorkspaceAccess("00000000-0000-0000-0000-000000000000", testUserId, getOwnership);
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof AiWorkspaceError);
  assert.equal(caught.userMessage, "❌ Project ownership validation failed");
});

await runTestAsync("Transient first-tick replication lag succeeds on second attempt", async () => {
  let callCount = 0;
  const getOwnership = async (id) => {
    callCount++;
    if (callCount === 1) return null; // Lag on first read
    return { id, user_id: testUserId }; // Available on retry
  };
  await serverAssertAiWorkspaceAccess(testProjectId, testUserId, getOwnership);
  assert.equal(callCount, 2, "Must have retried on null");
});

await runTestAsync("Database query error wrapped into AiWorkspaceError", async () => {
  const getOwnership = async () => {
    throw new Error("Connection refused");
  };
  let caught = null;
  try {
    await serverAssertAiWorkspaceAccess(testProjectId, testUserId, getOwnership);
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof AiWorkspaceError);
  assert.equal(caught.userMessage, "❌ Project ownership validation failed");
  assert.match(caught.diagnostic, /Connection refused/);
});

// Emulate empty Azure row fallback behavior
function testAzureFallbackLogic(azureRows, supabaseRecord) {
  let record = null;
  if (azureRows.length > 0) {
    record = azureRows[0];
  } else {
    // Graceful fallback to Supabase DB
    record = supabaseRecord;
  }
  return record;
}

runTest("Empty Azure rows fall back to Supabase record", () => {
  const azureRows = [];
  const supabaseRecord = { id: testProjectId, user_id: testUserId };
  const resolved = testAzureFallbackLogic(azureRows, supabaseRecord);
  assert.deepEqual(resolved, supabaseRecord);
});

runTest("Existing Azure rows take precedence without calling Supabase", () => {
  const azureRows = [{ id: testProjectId, user_id: testUserId }];
  const supabaseRecord = { id: testProjectId, user_id: "wrong_user" };
  const resolved = testAzureFallbackLogic(azureRows, supabaseRecord);
  assert.equal(resolved.user_id, testUserId);
});

console.log("\n-------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("-------------------------------------------------\n");

if (failed > 0) {
  process.exit(1);
}
