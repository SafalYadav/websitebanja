#!/usr/bin/env bash
# ==============================================================================
# WebsiteBanja AI — Azure Key Vault & Managed Identity Configuration
# Phase: Phase 24 (Production Infrastructure)
# Target: Azure Cloud Shell / Azure CLI
# Resource Group: websitebanja-rg (Region: centralindia)
# Key Vault: websitebanja-kv
# Storage Account: websitebanjastorage
# Container App: websitebanja-app
# ==============================================================================

set -euo pipefail

RESOURCE_GROUP="websitebanja-rg"
LOCATION="centralindia"
KEY_VAULT_NAME="websitebanja-kv"
STORAGE_ACCOUNT="websitebanjastorage"
CONTAINER_APP_NAME="websitebanja-app"

echo "================================================================================"
echo "WEBSITEBANJA AI — AZURE KEY VAULT & MANAGED IDENTITY CONFIGURATION"
echo "================================================================================"

# 1. Create or Verify Azure Key Vault
echo -e "\n[1/4] Ensuring Azure Key Vault '$KEY_VAULT_NAME' exists..."
if az keyvault show --name "$KEY_VAULT_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Key Vault '$KEY_VAULT_NAME' verified."
else
  echo "Creating Key Vault '$KEY_VAULT_NAME' in $LOCATION..."
  az keyvault create \
    --name "$KEY_VAULT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --enable-rbac-authorization true \
    --sku standard
  echo "Key Vault created with Azure RBAC authorization enabled."
fi

# 2. Enable System-Assigned Managed Identity on WebsiteBanja Container App
echo -e "\n[2/4] Enabling System-Assigned Managed Identity on '$CONTAINER_APP_NAME'..."
az containerapp identity assign \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --system-assigned

PRINCIPAL_ID=$(az containerapp identity show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "principalId" -o tsv)

echo "Managed Identity Principal ID: $PRINCIPAL_ID"

# 3. Grant RBAC Role on Key Vault: Key Vault Secrets User
echo -e "\n[3/4] Granting 'Key Vault Secrets User' RBAC role to Container App..."
KEYVAULT_ID=$(az keyvault show --name "$KEY_VAULT_NAME" --resource-group "$RESOURCE_GROUP" --query "id" -o tsv)

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Key Vault Secrets User" \
  --scope "$KEYVAULT_ID" || echo "Role assignment already exists or updated."

# 4. Grant RBAC Role on Blob Storage: Storage Blob Data Contributor
echo -e "\n[4/4] Granting 'Storage Blob Data Contributor' RBAC role on '$STORAGE_ACCOUNT'..."
STORAGE_ID=$(az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" --query "id" -o tsv)

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Storage Blob Data Contributor" \
  --scope "$STORAGE_ID" || echo "Storage role assignment already exists or updated."

echo -e "\n================================================================================"
echo "Azure Key Vault & Managed Identity Setup Complete!"
echo "WebsiteBanja Container App can now access Key Vault secrets and Blob Storage securely"
echo "via DefaultAzureCredential() without storing long-lived access keys!"
echo "================================================================================"
