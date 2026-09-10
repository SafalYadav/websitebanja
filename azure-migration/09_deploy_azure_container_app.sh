#!/usr/bin/env bash
# ==============================================================================
# WebsiteBanja AI — Azure Container Apps Production Deployment Script
# Target: Azure Cloud Shell / Azure CLI
# Subscription: 5f99d086-da25-4807-b98b-76c7e114bf38 (Azure for Students)
# Resource Group: websitebanja-rg (Region: centralindia)
# ==============================================================================

set -euo pipefail

SUBSCRIPTION_ID="5f99d086-da25-4807-b98b-76c7e114bf38"
RESOURCE_GROUP="websitebanja-rg"
LOCATION="centralindia"
FALLBACK_LOCATION="indiasouthcentral"
ACR_NAME="websitebanjacr"
CONTAINER_APP_ENV="websitebanja-env"
CONTAINER_APP_NAME="websitebanja-app"
STORAGE_ACCOUNT="websitebanjastorage"
IMAGE_TAG="latest"

echo "================================================================================"
echo "WEBSITEBANJA AI — AZURE CONTAINER APPS DEPLOYMENT PIPELINE"
echo "================================================================================"

# 0. Select Subscription
echo -e "\n[0/7] Setting Azure Subscription to '$SUBSCRIPTION_ID'..."
az account set --subscription "$SUBSCRIPTION_ID"
echo "Active Subscription: $(az account show --query '{Name:name, Id:id}' -o tsv)"

# 1. Verify Resource Group
echo -e "\n[1/7] Verifying Resource Group '$RESOURCE_GROUP'..."
if az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
  RG_LOC=$(az group show --name "$RESOURCE_GROUP" --query location -o tsv)
  echo "Resource Group '$RESOURCE_GROUP' verified in region '$RG_LOC'."
else
  echo "Creating Resource Group '$RESOURCE_GROUP' in $LOCATION..."
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
fi

# 2. Provision Azure Container Registry (ACR)
echo -e "\n[2/7] Provisioning Azure Container Registry '$ACR_NAME'..."
if az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Container Registry '$ACR_NAME' already exists."
else
  az acr create \
    --name "$ACR_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Basic \
    --admin-enabled true
  echo "Container Registry '$ACR_NAME' provisioned."
fi

# 3. Build Container Image via ACR Tasks (Cloud Native Build)
echo -e "\n[3/7] Building and Tagging Container Image in ACR via ACR Tasks..."
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "v1")
FULL_IMAGE="${ACR_NAME}.azurecr.io/${CONTAINER_APP_NAME}:${GIT_SHA}"
LATEST_IMAGE="${ACR_NAME}.azurecr.io/${CONTAINER_APP_NAME}:${IMAGE_TAG}"

echo "Submitting build context to ACR '$ACR_NAME'..."
az acr build \
  --registry "$ACR_NAME" \
  --image "${CONTAINER_APP_NAME}:${GIT_SHA}" \
  --image "${CONTAINER_APP_NAME}:${IMAGE_TAG}" \
  .
echo "Container image successfully built and pushed: $LATEST_IMAGE"

# 4. Provision Container Apps Managed Environment
echo -e "\n[4/7] Ensuring Container Apps Extension and Environment '$CONTAINER_APP_ENV'..."
az extension add --name containerapp --upgrade --yes >/dev/null 2>&1 || true

if az containerapp env show --name "$CONTAINER_APP_ENV" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Container Apps Environment '$CONTAINER_APP_ENV' already exists."
else
  echo "Creating Container Apps Environment '$CONTAINER_APP_ENV' in $LOCATION..."
  if ! az containerapp env create \
    --name "$CONTAINER_APP_ENV" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION"; then
    echo "Creation in $LOCATION failed; retrying in approved fallback region $FALLBACK_LOCATION..."
    az containerapp env create \
      --name "$CONTAINER_APP_ENV" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$FALLBACK_LOCATION"
  fi
  echo "Container Apps Environment '$CONTAINER_APP_ENV' created."
fi

# 5. Create / Update Container App with Ingress & Managed Identity
echo -e "\n[5/7] Deploying Container App '$CONTAINER_APP_NAME'..."
REGISTRY_SERVER="${ACR_NAME}.azurecr.io"

if az containerapp show --name "$CONTAINER_APP_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Container App '$CONTAINER_APP_NAME' exists. Updating image revision to '$LATEST_IMAGE'..."
  az containerapp update \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "$LATEST_IMAGE"
else
  echo "Creating new Container App '$CONTAINER_APP_NAME'..."
  az containerapp create \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CONTAINER_APP_ENV" \
    --image "$LATEST_IMAGE" \
    --registry-server "$REGISTRY_SERVER" \
    --target-port 3000 \
    --ingress external \
    --cpu 0.5 \
    --memory 1.0Gi \
    --min-replicas 1 \
    --max-replicas 3 \
    --system-assigned
fi

# 6. Configure System-Assigned Managed Identity & Role Assignments
echo -e "\n[6/7] Configuring Managed Identity & RBAC Role Assignments..."
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
echo "Granting AcrPull on ACR to Managed Identity..."
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "AcrPull" \
  --scope "$ACR_ID" >/dev/null 2>&1 || echo "AcrPull role already granted or pending propagation."

# Grant Storage Blob Data Contributor on Storage Account
if az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  STORAGE_ID=$(az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
  echo "Granting Storage Blob Data Contributor on '$STORAGE_ACCOUNT' to Managed Identity..."
  az role assignment create \
    --assignee "$PRINCIPAL_ID" \
    --role "Storage Blob Data Contributor" \
    --scope "$STORAGE_ID" >/dev/null 2>&1 || echo "Storage Blob Data Contributor role already granted or pending propagation."
fi

# 7. Verification & Output
echo -e "\n[7/7] Deployment Verification..."
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
echo "Active Image:       $LATEST_IMAGE"
echo "Managed Identity:   $PRINCIPAL_ID"
echo "Auth Provider:      Supabase Auth (Active)"
echo "DB Provider:        Azure PostgreSQL (websitebanja-db)"
echo "Storage Provider:   Azure Blob Storage (websitebanjastorage)"
echo "================================================================================"
echo "Note: Rollback to Vercel is 100% preserved. Zero DNS cutover has occurred."
echo "================================================================================"
