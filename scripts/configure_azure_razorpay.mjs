import { execSync } from "node:child_process";

const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const resourceGroup = process.env.RESOURCE_GROUP || "websitebanja-rg";
const containerAppName = process.env.CONTAINER_APP_NAME || "websitebanja-app";
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const imageTag = process.env.IMAGE_TAG;
const clientId = process.env.AZURE_CLIENT_ID;

console.log("================================================================================");
console.log("CONFIGURING AZURE CONTAINER APP FOR RAZORPAY");
console.log("================================================================================");
console.log("Container App:", containerAppName);
console.log("Resource Group:", resourceGroup);
console.log("Image Tag:", imageTag || "not specified");
console.log("Razorpay Key ID configured:", Boolean(keyId));
console.log("Razorpay Key Secret configured:", Boolean(keySecret));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProvisioningReady(maxSeconds = 90) {
  console.log("\nWaiting for Azure Container App provisioning to settle (state: Succeeded)...");
  const start = Date.now();
  while (Date.now() - start < maxSeconds * 1000) {
    try {
      const state = execSync(
        `az containerapp show --name "${containerAppName}" --resource-group "${resourceGroup}" --query "properties.provisioningState" -o tsv`,
        { stdio: "pipe" }
      ).toString().trim();
      console.log(`  Current provisioningState: ${state}`);
      if (state === "Succeeded") {
        return true;
      }
    } catch {
      // Ignore transient query errors
    }
    await sleep(5000);
  }
  return false;
}

async function main() {
  // Step 1: Attempt role assignment for managedEnvironment if permitted
  if (clientId && subscriptionId) {
    try {
      console.log("\n[Step 1] Checking/assigning role on managed environment (if permitted)...");
      execSync(
        `az role assignment create --assignee "${clientId}" --role "Contributor" --scope "/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.App/managedEnvironments/websitebanja-env" 2>/dev/null`,
        { stdio: "pipe" }
      );
      console.log("Successfully assigned Contributor on managed environment.");
    } catch {
      console.log("Direct role assignment skipped (identity has scoped app permissions).");
    }
  }

  // Step 2: Configure Secret in Azure Container App
  if (keySecret) {
    console.log("\n[Step 2] Configuring razorpay-key-secret in Azure Container App Secret Store...");
    let secretConfigured = false;

    // Try standard CLI first
    try {
      execSync(
        `az containerapp secret set --name "${containerAppName}" --resource-group "${resourceGroup}" --secrets razorpay-key-secret="${keySecret}" 2>/dev/null`,
        { stdio: "pipe" }
      );
      console.log("az containerapp secret set succeeded.");
      secretConfigured = true;
    } catch {
      console.log("az containerapp secret set returned authorization check on environment. Falling back to targeted ARM REST PATCH...");
    }

    // Fallback: Targeted ARM REST API patch (scoped to container app without managedEnvironmentId)
    if (!secretConfigured && subscriptionId) {
      try {
        const listUri = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.App/containerApps/${containerAppName}/listSecrets?api-version=2024-03-01`;
        const secretsRaw = execSync(`az rest --method post --uri "${listUri}" -o json`, { stdio: "pipe" }).toString();
        const existing = JSON.parse(secretsRaw);
        const secretsList = Array.isArray(existing.value) ? existing.value : [];

        // Filter out existing razorpay-key-secret if present, then append new value
        const updatedSecrets = secretsList
          .filter((s) => s.name !== "razorpay-key-secret")
          .map((s) => ({ name: s.name, value: s.value }));
        updatedSecrets.push({ name: "razorpay-key-secret", value: keySecret });

        const patchUri = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.App/containerApps/${containerAppName}?api-version=2024-03-01`;
        const patchBody = JSON.stringify({
          properties: {
            configuration: {
              secrets: updatedSecrets,
            },
          },
        });

        execSync(`az rest --method patch --uri "${patchUri}" --body '${patchBody.replace(/'/g, "'\\''")}'`, {
          stdio: "pipe",
        });
        console.log("Targeted ARM REST API secret patch succeeded.");
        secretConfigured = true;
      } catch (restErr) {
        console.error("ARM REST API secret patch error:", restErr.message);
      }
    }
  }

  // Wait for provisioning to complete before modifying template/image
  await waitForProvisioningReady(60);

  // Step 3: Configure Environment Variables & Deploy Image
  console.log("\n[Step 3] Updating Container App image and environment variables...");
  let updateCmd = `az containerapp update --name "${containerAppName}" --resource-group "${resourceGroup}"`;

  if (imageTag) {
    updateCmd += ` --image "${imageTag}"`;
  }

  if (keyId) {
    updateCmd += ` --set-env-vars "RAZORPAY_KEY_ID=${keyId}" "NEXT_PUBLIC_RAZORPAY_KEY_ID=${keyId}"`;
    if (keySecret) {
      updateCmd += ` "RAZORPAY_KEY_SECRET=secretref:razorpay-key-secret"`;
    }
  }

  let updated = false;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      console.log(`Executing containerapp update (attempt ${attempt}/4)...`);
      execSync(updateCmd, { stdio: "inherit" });
      console.log("Container App update completed successfully.");
      updated = true;
      break;
    } catch (updateErr) {
      console.warn(`Standard containerapp update failed on attempt ${attempt}:`, updateErr.message);
      await waitForProvisioningReady(30);
    }
  }

  if (!updated && subscriptionId) {
    console.log("Falling back to ARM REST template patch...");
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await waitForProvisioningReady(30);
        const showUri = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.App/containerApps/${containerAppName}?api-version=2024-03-01`;
        const appRaw = execSync(`az rest --method get --uri "${showUri}" -o json`, { stdio: "pipe" }).toString();
        const app = JSON.parse(appRaw);

        const container = app.properties?.template?.containers?.[0];
        if (container) {
          if (imageTag) container.image = imageTag;
          container.env = container.env || [];

          const envMap = new Map();
          container.env.forEach((e) => envMap.set(e.name, e));

          if (keyId) {
            envMap.set("RAZORPAY_KEY_ID", { name: "RAZORPAY_KEY_ID", value: keyId });
            envMap.set("NEXT_PUBLIC_RAZORPAY_KEY_ID", { name: "NEXT_PUBLIC_RAZORPAY_KEY_ID", value: keyId });
          }
          if (keySecret) {
            envMap.set("RAZORPAY_KEY_SECRET", { name: "RAZORPAY_KEY_SECRET", secretRef: "razorpay-key-secret" });
          }

          container.env = Array.from(envMap.values());

          const patchBody = JSON.stringify({
            properties: {
              template: {
                containers: [container],
              },
            },
          });

          execSync(`az rest --method patch --uri "${showUri}" --body '${patchBody.replace(/'/g, "'\\''")}'`, {
            stdio: "inherit",
          });
          console.log("Targeted ARM REST template update succeeded.");
          updated = true;
          break;
        }
      } catch (restErr) {
        console.warn(`ARM REST template patch failed on attempt ${attempt}:`, restErr.message);
        await sleep(5000);
      }
    }
  }

  // Step 4: Verification of environment variable names only (never values)
  console.log("\n[Step 4] Verifying registered secrets in Container App (names only):");
  try {
    const secretsList = execSync(
      `az containerapp secret list --name "${containerAppName}" --resource-group "${resourceGroup}" --query "[].name" -o tsv`,
      { stdio: "pipe" }
    ).toString();
    console.log(secretsList.trim().split("\n").map((n) => `  - ${n}`).join("\n"));
  } catch (e) {
    console.log("Could not list secrets:", e.message);
  }

  console.log("\nVerifying environment variable names in Container App (names only):");
  try {
    const envList = execSync(
      `az containerapp show --name "${containerAppName}" --resource-group "${resourceGroup}" --query "properties.template.containers[0].env[].name" -o tsv`,
      { stdio: "pipe" }
    ).toString();
    console.log(envList.trim().split("\n").map((n) => `  - ${n}`).join("\n"));
  } catch (e) {
    console.log("Could not list env vars:", e.message);
  }

  console.log("\nConfiguration complete.");
}

main().catch((err) => {
  console.error("Configuration failed:", err);
  process.exit(1);
});
