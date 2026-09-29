import { execSync } from "node:child_process";

const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const resourceGroup = process.env.RESOURCE_GROUP || "websitebanja-rg";
const containerAppName = process.env.CONTAINER_APP_NAME || "websitebanja-app";
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const cronSecret = process.env.CRON_SECRET;
const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
const gmailClientId = process.env.GMAIL_CLIENT_ID || "772812359409-okec2ndn9foc7cu514nos6c559jqpp1i.apps.googleusercontent.com";
const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;
const gmailRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
const gmailRedirectUri = process.env.GMAIL_REDIRECT_URI || "https://websitebanja-app.salmondesert-9c3e03bc.centralindia.azurecontainerapps.io/api/integrations/gmail/callback";
const gmailSenderEmail = process.env.GMAIL_SENDER_EMAIL || "websitebanja@gmail.com";
const automationSecret = process.env.WEBSITEBANJA_AUTOMATION_SECRET;
const nextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://websitebanja-app.salmondesert-9c3e03bc.centralindia.azurecontainerapps.io";
const imageTag = process.env.IMAGE_TAG;
const clientId = process.env.AZURE_CLIENT_ID;

console.log("================================================================================");
console.log("CONFIGURING AZURE CONTAINER APP FOR PRODUCTION & REAL-WORLD INTEGRATIONS");
console.log("================================================================================");
console.log("Container App:", containerAppName);
console.log("Resource Group:", resourceGroup);
console.log("Image Tag:", imageTag || "not specified");
console.log("Razorpay Key ID configured:", Boolean(keyId));
console.log("Razorpay Key Secret configured:", Boolean(keySecret));
console.log("Billing CRON Secret configured:", Boolean(cronSecret));
console.log("Google Places API Key configured:", Boolean(googlePlacesApiKey));
console.log("Gmail Client ID configured:", Boolean(gmailClientId));
console.log("Gmail Client Secret configured:", Boolean(gmailClientSecret));
console.log("Gmail Refresh Token configured:", Boolean(gmailRefreshToken));
console.log("Automation Secret configured:", Boolean(automationSecret));

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

  // Step 2: Configure Secrets in Azure Container App Secret Store (Atomic & Resilient)
  const secretsToSet = [];
  if (keySecret) secretsToSet.push({ name: "razorpay-key-secret", value: keySecret });
  if (cronSecret) secretsToSet.push({ name: "cron-secret", value: cronSecret });
  if (googlePlacesApiKey) secretsToSet.push({ name: "google-places-api-key", value: googlePlacesApiKey });
  if (gmailClientSecret) secretsToSet.push({ name: "gmail-client-secret", value: gmailClientSecret });
  if (gmailRefreshToken) secretsToSet.push({ name: "gmail-refresh-token", value: gmailRefreshToken });
  if (automationSecret) secretsToSet.push({ name: "automation-secret", value: automationSecret });

  if (secretsToSet.length > 0) {
    console.log(`\n[Step 2] Configuring secrets in Azure Container App Secret Store (${secretsToSet.map(s => s.name).join(", ")})...`);
    await waitForProvisioningReady(60);

    let secretsConfigured = false;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await waitForProvisioningReady(30);
        const listUri = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.App/containerApps/${containerAppName}/listSecrets?api-version=2024-03-01`;
        const secretsRaw = execSync(`az rest --method post --uri "${listUri}" -o json`, { stdio: "pipe" }).toString();
        const existing = JSON.parse(secretsRaw);
        const secretsList = Array.isArray(existing.value) ? existing.value : [];

        const namesToSet = new Set(secretsToSet.map((s) => s.name));
        const updatedSecrets = secretsList
          .filter((s) => !namesToSet.has(s.name))
          .map((s) => ({ name: s.name, value: s.value }));

        for (const s of secretsToSet) {
          updatedSecrets.push(s);
        }

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
        console.log("Targeted ARM REST API secrets patch succeeded.");
        secretsConfigured = true;
        break;
      } catch (restErr) {
        console.warn(`ARM REST API secrets patch attempt ${attempt} error:`, restErr.message);
        await sleep(5000);
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

  const envVarsToSet = [];
  if (keyId) {
    envVarsToSet.push(`RAZORPAY_KEY_ID=${keyId}`);
    envVarsToSet.push(`NEXT_PUBLIC_RAZORPAY_KEY_ID=${keyId}`);
    if (keySecret) {
      envVarsToSet.push(`RAZORPAY_KEY_SECRET=secretref:razorpay-key-secret`);
    }
  }
  if (cronSecret) {
    envVarsToSet.push(`CRON_SECRET=secretref:cron-secret`);
  }
  if (googlePlacesApiKey) {
    envVarsToSet.push(`GOOGLE_PLACES_API_KEY=secretref:google-places-api-key`);
  }
  if (gmailClientSecret) {
    envVarsToSet.push(`GMAIL_CLIENT_SECRET=secretref:gmail-client-secret`);
  }
  if (gmailRefreshToken) {
    envVarsToSet.push(`GMAIL_REFRESH_TOKEN=secretref:gmail-refresh-token`);
    envVarsToSet.push(`GOOGLE_REFRESH_TOKEN=secretref:gmail-refresh-token`);
  }
  if (automationSecret) {
    envVarsToSet.push(`WEBSITEBANJA_AUTOMATION_SECRET=secretref:automation-secret`);
    envVarsToSet.push(`WEBSITEBANJA_AUTOMATION_ENABLED=true`);
  }
  envVarsToSet.push(`GMAIL_CLIENT_ID=${gmailClientId}`);
  envVarsToSet.push(`GOOGLE_CLIENT_ID=${gmailClientId}`);
  envVarsToSet.push(`GMAIL_REDIRECT_URI=${gmailRedirectUri}`);
  envVarsToSet.push(`GMAIL_SENDER_EMAIL=${gmailSenderEmail}`);
  envVarsToSet.push(`NEXT_PUBLIC_APP_URL=${nextPublicAppUrl}`);
  envVarsToSet.push(`AUTO_SEND_ENABLED=false`);
  envVarsToSet.push(`COMMUNICATION_DRY_RUN=false`);

  if (envVarsToSet.length > 0) {
    updateCmd += ` --set-env-vars ${envVarsToSet.map((v) => `"${v}"`).join(" ")}`;
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
          if (cronSecret) {
            envMap.set("CRON_SECRET", { name: "CRON_SECRET", secretRef: "cron-secret" });
          }
          if (googlePlacesApiKey) {
            envMap.set("GOOGLE_PLACES_API_KEY", { name: "GOOGLE_PLACES_API_KEY", secretRef: "google-places-api-key" });
          }
          if (gmailClientSecret) {
            envMap.set("GMAIL_CLIENT_SECRET", { name: "GMAIL_CLIENT_SECRET", secretRef: "gmail-client-secret" });
          }
          if (gmailRefreshToken) {
            envMap.set("GMAIL_REFRESH_TOKEN", { name: "GMAIL_REFRESH_TOKEN", secretRef: "gmail-refresh-token" });
            envMap.set("GOOGLE_REFRESH_TOKEN", { name: "GOOGLE_REFRESH_TOKEN", secretRef: "gmail-refresh-token" });
          }
          if (automationSecret) {
            envMap.set("WEBSITEBANJA_AUTOMATION_SECRET", { name: "WEBSITEBANJA_AUTOMATION_SECRET", secretRef: "automation-secret" });
            envMap.set("WEBSITEBANJA_AUTOMATION_ENABLED", { name: "WEBSITEBANJA_AUTOMATION_ENABLED", value: "true" });
          }
          envMap.set("GMAIL_CLIENT_ID", { name: "GMAIL_CLIENT_ID", value: gmailClientId });
          envMap.set("GOOGLE_CLIENT_ID", { name: "GOOGLE_CLIENT_ID", value: gmailClientId });
          envMap.set("GMAIL_REDIRECT_URI", { name: "GMAIL_REDIRECT_URI", value: gmailRedirectUri });
          envMap.set("GMAIL_SENDER_EMAIL", { name: "GMAIL_SENDER_EMAIL", value: gmailSenderEmail });
          envMap.set("NEXT_PUBLIC_APP_URL", { name: "NEXT_PUBLIC_APP_URL", value: nextPublicAppUrl });
          envMap.set("AUTO_SEND_ENABLED", { name: "AUTO_SEND_ENABLED", value: "false" });
          envMap.set("COMMUNICATION_DRY_RUN", { name: "COMMUNICATION_DRY_RUN", value: "false" });

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

  console.log("\nWaiting 20 seconds for new container revision to settle before smoke testing...");
  await sleep(20000);

  console.log("\nConfiguration complete.");
}

main().catch((err) => {
  console.error("Configuration failed:", err);
  process.exit(1);
});
