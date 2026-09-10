#!/usr/bin/env bash
# ==============================================================================
# WebsiteBanja AI — Azure Container Apps Production Deployment Script
# Target: Azure Cloud Shell / Azure CLI
# Subscription: 5f99d086-da25-4807-b98b-76c7e114bf38 (Azure for Students)
# Resource Group: websitebanja-rg (Location: indiasouthcentral)
# Container Apps Environment: websitebanja-env (Location: centralindia)
# Registry: websitebanjacr.azurecr.io (Location: centralindia)
# Image: websitebanjacr.azurecr.io/websitebanja:latest (Built via GitHub Actions)
# ==============================================================================

set -euo pipefail

SUBSCRIPTION_ID="5f99d086-da25-4807-b98b-76c7e114bf38"
RESOURCE_GROUP="websitebanja-rg"
LOCATION="centralindia"
ACR_NAME="websitebanjacr"
REGISTRY_SERVER="${ACR_NAME}.azurecr.io"
CONTAINER_APP_ENV="websitebanja-env"
CONTAINER_APP_NAME="websitebanja-app"
STORAGE_ACCOUNT="websitebanjastorage"
IMAGE_NAME="websitebanja"
IMAGE_TAG="latest"
FULL_IMAGE="${REGISTRY_SERVER}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "================================================================================"
echo "WEBSITEBANJA AI — AZURE CONTAINER APPS DEPLOYMENT PIPELINE"
echo "================================================================================"

# 0. Select Subscription
echo -e "\n[0/5] Setting Azure Subscription to '$SUBSCRIPTION_ID'..."
az account set --subscription "$SUBSCRIPTION_ID"
echo "Active Subscription: $(az account show --query '{Name:name, Id:id}' -o tsv)"

# 1. Verify Resource Group (Preserve existing RG in its current region)
echo -e "\n[1/5] Verifying Resource Group '$RESOURCE_GROUP'..."
if az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
  RG_LOC=$(az group show --name "$RESOURCE_GROUP" --query location -o tsv)
  echo "Resource Group '$RESOURCE_GROUP' verified (Location: $RG_LOC)."
else
  echo "Creating Resource Group '$RESOURCE_GROUP' in $LOCATION..."
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
fi

# 2. Verify Container Registry and Image in ACR
echo -e "\n[2/5] Verifying Container Registry '$ACR_NAME'..."
if az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  ACR_LOC=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query location -o tsv)
  echo "Container Registry '$ACR_NAME' verified (Location: $ACR_LOC)."
else
  echo "Error: Azure Container Registry '$ACR_NAME' not found in '$RESOURCE_GROUP'."
  exit 1
fi

echo "Checking for image '$FULL_IMAGE' in ACR..."
if az acr repository show-tags --name "$ACR_NAME" --repository "$IMAGE_NAME" --output tsv 2>/dev/null | grep -q "$IMAGE_TAG"; then
  echo "Image '$FULL_IMAGE' verified in ACR."
else
  echo "Warning: Tag '$IMAGE_TAG' not found in ACR repository '$IMAGE_NAME'."
  echo "Please ensure the GitHub Actions build-and-push workflow completed successfully."
fi

# 3. Provision Container Apps Managed Environment in centralindia
echo -e "\n[3/5] Ensuring Container Apps Extension and Environment '$CONTAINER_APP_ENV' in '$LOCATION'..."
az extension add --name containerapp --upgrade --yes >/dev/null 2>&1 || true

if az containerapp env show --name "$CONTAINER_APP_ENV" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  ENV_LOC=$(az containerapp env show --name "$CONTAINER_APP_ENV" --resource-group "$RESOURCE_GROUP" --query location -o tsv)
  echo "Container Apps Environment '$CONTAINER_APP_ENV' exists (Location: $ENV_LOC)."
else
  echo "Creating Container Apps Environment '$CONTAINER_APP_ENV' in $LOCATION..."
  az containerapp env create \
    --name "$CONTAINER_APP_ENV" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION"
  echo "Container Apps Environment '$CONTAINER_APP_ENV' created in $LOCATION."
fi

# 4. Deploy / Update Container App with System-Assigned Managed Identity
echo -e "\n[4/5] Deploying Container App '$CONTAINER_APP_NAME' in '$LOCATION'..."

if az containerapp show --name "$CONTAINER_APP_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Container App '$CONTAINER_APP_NAME' exists. Updating image to '$FULL_IMAGE'..."
  az containerapp update \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "$FULL_IMAGE"
else
  echo "Bootstrapping Container App '$CONTAINER_APP_NAME' with System-Assigned Managed Identity..."
  az containerapp create \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CONTAINER_APP_ENV" \
    --image "mcr.microsoft.com/k8se/quickstart:latest" \
    --target-port 3000 \
    --ingress external \
    --cpu 0.5 \
    --memory 1.0Gi \
    --min-replicas 1 \
    --max-replicas 3 \
    --system-assigned

  echo "Obtaining Managed Identity Principal ID..."
  PRINCIPAL_ID=$(az containerapp identity show \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query principalId -o tsv)
  echo "Container App Principal ID: $PRINCIPAL_ID"

  # Grant AcrPull role to Managed Identity
  ACR_ID=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
  echo "Granting AcrPull role on '$ACR_NAME' to Managed Identity..."
  az role assignment create \
    --assignee "$PRINCIPAL_ID" \
    --role "AcrPull" \
    --scope "$ACR_ID" >/dev/null 2>&1 || true

  # Configure registry to use system-assigned managed identity (passwordless)
  echo "Configuring Container App registry to use System-Assigned Managed Identity..."
  az containerapp registry set \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --server "$REGISTRY_SERVER" \
    --identity system

  echo "Deploying application image '$FULL_IMAGE'..."
  az containerapp update \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "$FULL_IMAGE"
fi

# 5. Ensure Managed Identity RBAC Roles
echo -e "\n[5/5] Ensuring Managed Identity and RBAC Role Assignments..."
az containerapp identity assign \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --system-assigned >/dev/null 2>&1 || true

PRINCIPAL_ID=$(az containerapp identity show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query principalId -o tsv)

ACR_ID=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "AcrPull" \
  --scope "$ACR_ID" >/dev/null 2>&1 || true

az containerapp registry set \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --server "$REGISTRY_SERVER" \
  --identity system >/dev/null 2>&1 || true

# Grant Storage Blob Data Contributor on Storage Account
if az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  STORAGE_ID=$(az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
  echo "Granting Storage Blob Data Contributor on '$STORAGE_ACCOUNT' to Managed Identity..."
  az role assignment create \
    --assignee "$PRINCIPAL_ID" \
    --role "Storage Blob Data Contributor" \
    --scope "$STORAGE_ID" >/dev/null 2>&1 || true
fi

# Deployment Status & FQDN Output
echo -e "\n================================================================================"
echo "WEBSITEBANJA AI — CONTAINER APP DEPLOYMENT SUCCESSFUL"
echo "================================================================================"
APP_FQDN=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

APP_URL="https://${APP_FQDN}"
PROVISIONING_STATE=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.provisioningState -o tsv)

echo "Container App Name: $CONTAINER_APP_NAME"
echo "Provisioning State: $PROVISIONING_STATE"
echo "Container App URL:  $APP_URL"
echo "Active Image:       $FULL_IMAGE"
echo "Managed Identity:   $PRINCIPAL_ID"
echo "Auth Provider:      Supabase Auth (Active)"
echo "DB Provider:        Azure PostgreSQL (websitebanja-db)"
echo "Storage Provider:   Azure Blob Storage (websitebanjastorage)"
echo "================================================================================"
echo "Next step: Run ./azure-migration/10_configure_container_app_env.sh"
echo "================================================================================"
