#!/usr/bin/env bash
# ==============================================================================
# WebsiteBanja AI — GitHub Actions OIDC & Least-Privilege RBAC Setup
# Target: Azure Cloud Shell / Azure CLI
# Subscription: 5f99d086-da25-4807-b98b-76c7e114bf38 (Azure for Students)
# Resource Group: websitebanja-rg
# ACR: websitebanjacr (Region: centralindia)
# Container App: websitebanja-app (Region: centralindia)
# GitHub Repo: SafalYadav/websitebanja
# ==============================================================================

set -euo pipefail

SUBSCRIPTION_ID="5f99d086-da25-4807-b98b-76c7e114bf38"
RESOURCE_GROUP="websitebanja-rg"
ACR_NAME="websitebanjacr"
CONTAINER_APP_NAME="websitebanja-app"
GITHUB_REPO="SafalYadav/websitebanja"
APP_NAME="github-actions-websitebanja"

echo "================================================================================"
echo "WEBSITEBANJA AI — GITHUB ACTIONS OIDC & LEAST-PRIVILEGE RBAC SETUP"
echo "================================================================================"

# 1. Set Subscription
echo -e "\n[1/5] Verifying Subscription '$SUBSCRIPTION_ID'..."
az account set --subscription "$SUBSCRIPTION_ID"
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "Tenant ID: $TENANT_ID"

# 2. Check or Create Azure AD Application
echo -e "\n[2/5] Configuring Azure AD Application for GitHub Actions OIDC..."
CLIENT_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv 2>/dev/null || true)

if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "None" ]; then
  OBJECT_ID=$(az ad app show --id "$CLIENT_ID" --query id -o tsv)
  echo "Found existing Azure AD Application: $CLIENT_ID"
else
  echo "Creating Azure AD Application '$APP_NAME'..."
  CLIENT_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
  OBJECT_ID=$(az ad app show --id "$CLIENT_ID" --query id -o tsv)
  echo "Created Azure AD Application: $CLIENT_ID"
fi

# 3. Create Service Principal if not exists
echo -e "\n[3/5] Verifying Service Principal for Application..."
if ! az ad sp show --id "$CLIENT_ID" >/dev/null 2>&1; then
  echo "Creating Service Principal..."
  az ad sp create --id "$CLIENT_ID" >/dev/null
  echo "Service Principal created."
else
  echo "Service Principal exists."
fi

# 4. Configure Federated Identity Credential for GitHub Actions OIDC (branch: main)
echo -e "\n[4/5] Configuring Federated Identity Credential for GitHub Actions OIDC..."
FED_CRED_MAIN="websitebanja-gh-main"
FED_CRED_MAIN_ID="websitebanja-gh-main-id"

# Standard name format
if az ad app federated-credential show --id "$OBJECT_ID" --federated-credential-id "$FED_CRED_MAIN" >/dev/null 2>&1; then
  echo "Federated credential '$FED_CRED_MAIN' exists."
else
  echo "Creating federated credential for repo '$GITHUB_REPO' (main branch)..."
  az ad app federated-credential create \
    --id "$OBJECT_ID" \
    --parameters "{
      \"name\": \"$FED_CRED_MAIN\",
      \"issuer\": \"https://token.actions.githubusercontent.com\",
      \"subject\": \"repo:$GITHUB_REPO:ref:refs/heads/main\",
      \"description\": \"GitHub Actions OIDC for WebsiteBanja main branch\",
      \"audiences\": [\"api://AzureADTokenExchange\"]
    }" >/dev/null
  echo "Federated identity credential for '$FED_CRED_MAIN' created."
fi

# Enhanced ID format (GitHub Actions immutable claim subject: repo:owner@id/repo@id:ref:refs/heads/main)
SUBJECT_IMMUTABLE="repo:SafalYadav@250260430/websitebanja@1319331462:ref:refs/heads/main"
if az ad app federated-credential show --id "$OBJECT_ID" --federated-credential-id "$FED_CRED_MAIN_ID" >/dev/null 2>&1; then
  echo "Federated credential '$FED_CRED_MAIN_ID' exists."
else
  echo "Creating federated credential with immutable subject '$SUBJECT_IMMUTABLE'..."
  az ad app federated-credential create \
    --id "$OBJECT_ID" \
    --parameters "{
      \"name\": \"$FED_CRED_MAIN_ID\",
      \"issuer\": \"https://token.actions.githubusercontent.com\",
      \"subject\": \"$SUBJECT_IMMUTABLE\",
      \"description\": \"GitHub Actions OIDC with immutable IDs for WebsiteBanja main branch\",
      \"audiences\": [\"api://AzureADTokenExchange\"]
    }" >/dev/null
  echo "Federated identity credential for '$FED_CRED_MAIN_ID' created."
fi

# 5. Configure Least-Privilege Scoped RBAC Roles (NO Owner/Contributor at subscription level)
echo -e "\n[5/5] Assigning Least-Privilege Scoped Roles..."

# A. AcrPush role on websitebanjacr ONLY
ACR_ID=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
echo "Assigning 'AcrPush' on ACR '$ACR_NAME' to GitHub Actions identity..."
az role assignment create \
  --assignee "$CLIENT_ID" \
  --role "AcrPush" \
  --scope "$ACR_ID" >/dev/null 2>&1 || echo "AcrPush role already assigned."

# B. Contributor scoped STRICTLY to the Container App resource itself
APP_RESOURCE_ID=$(az containerapp show --name "$CONTAINER_APP_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
echo "Assigning 'Contributor' scoped strictly to Container App '$CONTAINER_APP_NAME'..."
az role assignment create \
  --assignee "$CLIENT_ID" \
  --role "Contributor" \
  --scope "$APP_RESOURCE_ID" >/dev/null 2>&1 || echo "Contributor role on Container App already assigned."

# C. Reader scoped to Resource Group (read-only context resolution for az containerapp commands)
RG_ID=$(az group show --name "$RESOURCE_GROUP" --query id -o tsv)
echo "Assigning 'Reader' scoped to Resource Group '$RESOURCE_GROUP'..."
az role assignment create \
  --assignee "$CLIENT_ID" \
  --role "Reader" \
  --scope "$RG_ID" >/dev/null 2>&1 || echo "Reader role on Resource Group already assigned."

echo -e "\n================================================================================"
echo "OIDC & LEAST-PRIVILEGE RBAC SETUP COMPLETE"
echo "================================================================================"
echo "Add these 3 secrets to your GitHub repository secrets:"
echo "URL: https://github.com/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "1. Secret Name:  AZURE_CLIENT_ID"
echo "   Secret Value: $CLIENT_ID"
echo ""
echo "2. Secret Name:  AZURE_TENANT_ID"
echo "   Secret Value: $TENANT_ID"
echo ""
echo "3. Secret Name:  AZURE_SUBSCRIPTION_ID"
echo "   Secret Value: $SUBSCRIPTION_ID"
echo "================================================================================"
echo "Once these 3 secrets are set in GitHub, every 'git push origin main' will"
echo "automatically build, push, deploy, and verify your Container App seamlessly!"
echo "================================================================================"
