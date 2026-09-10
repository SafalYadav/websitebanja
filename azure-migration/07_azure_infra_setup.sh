#!/usr/bin/env bash
# ==============================================================================
# WebsiteBanja AI — Complete Azure Infrastructure Setup Script
# Target: Azure Cloud Shell / Azure CLI
# Subscription: Azure for Students
# Resource Group: websitebanja-rg (Region: centralindia)
# ==============================================================================

set -euo pipefail

SUBSCRIPTION="Azure for Students"
RESOURCE_GROUP="websitebanja-rg"
LOCATION="centralindia"
STORAGE_ACCOUNT="websitebanjastorage"
ACR_NAME="websitebanjacr"
CONTAINER_APP_ENV="websitebanja-env"

echo "================================================================================"
echo "WEBSITEBANJA AI — AZURE CLOUD INFRASTRUCTURE PROVISIONING"
echo "================================================================================"

# 0. Select Subscription
echo -e "\n[0/5] Selecting Azure Subscription '$SUBSCRIPTION'..."
if az account show --query name -o tsv 2>/dev/null | grep -q "$SUBSCRIPTION"; then
  echo "Already on subscription '$SUBSCRIPTION'."
else
  az account set --subscription "$SUBSCRIPTION"
  echo "Subscription set to '$SUBSCRIPTION'."
fi

# 1. Verify Resource Group (Do NOT delete or recreate)
echo -e "\n[1/5] Verifying Resource Group '$RESOURCE_GROUP'..."
if az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Resource Group '$RESOURCE_GROUP' exists in $(az group show --name "$RESOURCE_GROUP" --query location -o tsv)."
else
  echo "Creating Resource Group '$RESOURCE_GROUP' in $LOCATION..."
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
fi

# 2. Provision Azure Storage Account
echo -e "\n[2/5] Provisioning Azure Storage Account '$STORAGE_ACCOUNT' in $LOCATION..."
if az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Storage Account '$STORAGE_ACCOUNT' already exists."
else
  az storage account create \
    --name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --allow-blob-public-access false \
    --min-tls-version TLS1_2
  echo "Storage Account '$STORAGE_ACCOUNT' created."
fi

# Fetch connection string in memory (never written to disk or printed)
CONNECTION_STRING=$(az storage account show-connection-string \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query connectionString \
  --output tsv)

echo "Ensuring blob container 'project-workspaces' exists..."
az storage container create \
  --name "project-workspaces" \
  --connection-string "$CONNECTION_STRING" \
  --public-access off >/dev/null
echo "Container 'project-workspaces' verified (private)."

echo "Ensuring blob container 'project-assets' exists..."
az storage container create \
  --name "project-assets" \
  --connection-string "$CONNECTION_STRING" \
  --public-access off >/dev/null
echo "Container 'project-assets' verified (private)."

# 3. Provision Azure Container Registry (ACR)
echo -e "\n[3/5] Provisioning Azure Container Registry '$ACR_NAME' in $LOCATION..."
if az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Container Registry '$ACR_NAME' already exists."
else
  az acr create \
    --name "$ACR_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Basic \
    --admin-enabled true
  echo "Container Registry '$ACR_NAME' created."
fi

# 4. Provision Azure Container Apps Environment
echo -e "\n[4/5] Provisioning Azure Container Apps Environment '$CONTAINER_APP_ENV' in $LOCATION..."
# Ensure containerapp extension is installed
az extension add --name containerapp --upgrade --yes >/dev/null 2>&1 || true

if az containerapp env show --name "$CONTAINER_APP_ENV" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Container Apps Environment '$CONTAINER_APP_ENV' already exists."
else
  az containerapp env create \
    --name "$CONTAINER_APP_ENV" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION"
  echo "Container Apps Environment '$CONTAINER_APP_ENV' created."
fi

# 5. Infrastructure Verification & Audit Report
echo -e "\n================================================================================"
echo "INFRASTRUCTURE AUDIT & VERIFICATION REPORT"
echo "================================================================================"

az resource list \
  --resource-group "$RESOURCE_GROUP" \
  --query "[].{Name:name, Type:type, Region:location, Status:provisioningState, ResourceId:id}" \
  --output table

echo -e "\nBlob Containers in '$STORAGE_ACCOUNT':"
az storage container list \
  --connection-string "$CONNECTION_STRING" \
  --query "[].{ContainerName:name, PublicAccess:properties.publicAccess}" \
  --output table

echo -e "\n================================================================================"
echo "PROVISIONING COMPLETED SUCCESSFULLY — NO PRODUCTION TRAFFIC SWITCHED"
echo "================================================================================"

