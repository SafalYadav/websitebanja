#!/usr/bin/env bash
# ==============================================================================
# WebsiteBanja AI — Azure Container Apps Production Deployment Script
# Target: Azure Cloud Shell / Azure CLI
# Subscription: 5f99d086-da25-4807-b98b-76c7e114bf38 (Azure for Students)
# Resource Group: websitebanja-rg (Region: indiasouthcentral)
# Registry: websitebanjacr.azurecr.io
# Image: websitebanjacr.azurecr.io/websitebanja:latest (Built via GitHub Actions)
# ==============================================================================

set -euo pipefail

SUBSCRIPTION_ID="5f99d086-da25-4807-b98b-76c7e114bf38"
RESOURCE_GROUP="websitebanja-rg"
LOCATION="indiasouthcentral"
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
echo -e "\n[0/6] Setting Azure Subscription to '$SUBSCRIPTION_ID'..."
az account set --subscription "$SUBSCRIPTION_ID"
echo "Active Subscription: $(az account show --query '{Name:name, Id:id}' -o tsv)"

# 1. Verify Resource Group
echo -e "\n[1/6] Verifying Resource Group '$RESOURCE_GROUP' in '$LOCATION'..."
if az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
  RG_LOC=$(az group show --name "$RESOURCE_GROUP" --query location -o tsv)
  echo "Resource Group '$RESOURCE_GROUP' verified (Location: $RG_LOC)."
else
  echo "Creating Resource Group '$RESOURCE_GROUP' in $LOCATION..."
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
fi

# 2. Verify Container Registry and Image in ACR
echo -e "\n[2/6] Verifying Container Registry '$ACR_NAME'..."
if ! az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Creating Azure Container Registry '$ACR_NAME'..."
  az acr create \
    --name "$ACR_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Basic \
    --admin-enabled true
fi

# Ensure admin user is enabled for bootstrap registry access
az acr update --name "$ACR_NAME" --admin-enabled true >/dev/null 2>&1 || true

echo "Checking for image '$FULL_IMAGE' in ACR..."
if az acr repository show-tags --name "$ACR_NAME" --repository "$IMAGE_NAME" --output tsv 2>/dev/null | grep -q "$IMAGE_TAG"; then
  echo "Image '$FULL_IMAGE' found in registry."
else
  echo "Warning: Tag '$IMAGE_TAG' not yet found in repository '$IMAGE_NAME'."
  echo "Please verify that the GitHub Actions build-and-push workflow has completed successfully."
fi

# Retrieve ACR credentials for initial container app registry linkage
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

# 3. Provision Container Apps Managed Environment
echo -e "\n[3/6] Ensuring Container Apps Extension and Environment '$CONTAINER_APP_ENV'..."
az extension add --name containerapp --upgrade --yes >/dev/null 2>&1 || true

if az containerapp env show --name "$CONTAINER_APP_ENV" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Container Apps Environment '$CONTAINER_APP_ENV' exists."
else
  echo "Creating Container Apps Environment '$CONTAINER_APP_ENV' in $LOCATION..."
  az containerapp env create \
    --name "$CONTAINER_APP_ENV" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION"
  echo "Container Apps Environment '$CONTAINER_APP_ENV' created."
fi

# 4. Create / Update Container App
echo -e "\n[4/6] Deploying Container App '$CONTAINER_APP_NAME' with image '$FULL_IMAGE'..."
if az containerapp show --name "$CONTAINER_APP_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Container App '$CONTAINER_APP_NAME' exists. Updating image to '$FULL_IMAGE'..."
  az containerapp update \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "$FULL_IMAGE"
else
  echo "Creating new Container App '$CONTAINER_APP_NAME'..."
  az containerapp create \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CONTAINER_APP_ENV" \
    --image "$FULL_IMAGE" \
    --registry-server "$REGISTRY_SERVER" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD" \
    --target-port 3000 \
    --ingress external \
    --cpu 0.5 \
    --memory 1.0Gi \
    --min-replicas 1 \
    --max-replicas 3 \
    --system-assigned
fi

# 5. Configure System-Assigned Managed Identity & RBAC
echo -e "\n[5/6] Ensuring System-Assigned Managed Identity and RBAC Role Assignments..."
az containerapp identity assign \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --system-assigned >/dev/null 2>&1 || true

PRINCIPAL_ID=$(az containerapp identity show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query principalId -o tsv)

echo "Container App Principal ID: $PRINCIPAL_ID"

# Grant AcrPull on ACR
ACR_ID=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
echo "Granting AcrPull role on ACR to Managed Identity..."
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "AcrPull" \
  --scope "$ACR_ID" >/dev/null 2>&1 || echo "AcrPull role already active."

# Configure registry to use system-assigned managed identity
echo "Configuring Container App registry to use System-Assigned Managed Identity..."
az containerapp registry set \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --server "$REGISTRY_SERVER" \
  --identity system >/dev/null 2>&1 || echo "Registry already configured with system identity."

# Grant Storage Blob Data Contributor on Storage Account
if az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  STORAGE_ID=$(az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
  echo "Granting Storage Blob Data Contributor on '$STORAGE_ACCOUNT' to Managed Identity..."
  az role assignment create \
    --assignee "$PRINCIPAL_ID" \
    --role "Storage Blob Data Contributor" \
    --scope "$STORAGE_ID" >/dev/null 2>&1 || echo "Storage role already active."
fi

# 6. Deployment Status & FQDN Output
echo -e "\n[6/6] Deployment Verification..."
APP_FQDN=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

APP_URL="https://${APP_FQDN}"
PROVISIONING_STATE=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.provisioningState -o tsv)

echo -e "\n================================================================================"
echo "WEBSITEBANJA AI — CONTAINER APP DEPLOYMENT SUCCESSFUL"
echo "================================================================================"
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
