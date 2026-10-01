#!/usr/bin/env bash
# ==============================================================================
# WebsiteBanja AI — Production n8n Ops Agent Deployment to Azure Container Apps
# Phase: Phase 24 (Production Infrastructure)
# Target: Azure Cloud Shell / Azure CLI
# Resource Group: websitebanja-rg (Region: centralindia)
# Container Apps Environment: websitebanja-env
# Container App: n8n-app
# ==============================================================================

set -euo pipefail

RESOURCE_GROUP="websitebanja-rg"
LOCATION="centralindia"
CONTAINER_APP_ENV="websitebanja-env"
CONTAINER_APP_NAME="n8n-app"
IMAGE="n8nio/n8n:latest"
DB_HOST="websitebanja-db.postgres.database.azure.com"
DB_NAME="n8n"
DB_USER="websitebanjaadmin"

echo "================================================================================"
echo "WEBSITEBANJA AI — PRODUCTION N8N OPS AGENT AZURE DEPLOYMENT"
echo "================================================================================"

# 1. Verify Resource Group & Container Apps Environment
echo -e "\n[1/4] Verifying Resource Group and Container Apps Environment..."
if ! az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Creating Resource Group '$RESOURCE_GROUP' in $LOCATION..."
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
fi

if ! az containerapp env show --name "$CONTAINER_APP_ENV" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Creating Container Apps Environment '$CONTAINER_APP_ENV'..."
  az containerapp env create \
    --name "$CONTAINER_APP_ENV" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION"
fi

# 2. Acquire Encryption Key & Database Password securely
echo -e "\n[2/4] Resolving n8n Production Secrets..."
AZURE_DB_PASSWORD="${AZURE_DB_PASSWORD:-}"
N8N_ENCRYPTION_KEY="${N8N_ENCRYPTION_KEY:-}"

if [ -z "$AZURE_DB_PASSWORD" ]; then
  read -s -r -p "Enter Azure PostgreSQL password for n8n database: " AZURE_DB_PASSWORD
  echo ""
fi

if [ -z "$N8N_ENCRYPTION_KEY" ]; then
  N8N_ENCRYPTION_KEY=$(openssl rand -hex 24)
  echo "Generated new random N8N_ENCRYPTION_KEY."
fi

# 3. Deploy n8n Container App
echo -e "\n[3/4] Deploying/Updating Production n8n Container App '$CONTAINER_APP_NAME'..."

if az containerapp show --name "$CONTAINER_APP_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Updating existing Container App '$CONTAINER_APP_NAME'..."
  az containerapp update \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "$IMAGE"
else
  echo "Creating Container App '$CONTAINER_APP_NAME' with ingress on port 5678..."
  az containerapp create \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CONTAINER_APP_ENV" \
    --image "$IMAGE" \
    --target-port 5678 \
    --ingress external \
    --cpu 0.5 \
    --memory 1.0Gi \
    --min-replicas 1 \
    --max-replicas 2 \
    --secrets \
      db-password="$AZURE_DB_PASSWORD" \
      encryption-key="$N8N_ENCRYPTION_KEY" \
    --env-vars \
      N8N_PORT="5678" \
      N8N_PROTOCOL="https" \
      GENERIC_TIMEZONE="UTC" \
      N8N_AI_ENABLED="true" \
      N8N_DIAGNOSTICS_ENABLED="false" \
      DB_TYPE="postgresdb" \
      DB_POSTGRESDB_HOST="$DB_HOST" \
      DB_POSTGRESDB_PORT="5432" \
      DB_POSTGRESDB_DATABASE="$DB_NAME" \
      DB_POSTGRESDB_USER="$DB_USER" \
      DB_POSTGRESDB_PASSWORD="secretref:db-password" \
      DB_POSTGRESDB_SCHEMA="public" \
      DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED="true" \
      N8N_ENCRYPTION_KEY="secretref:encryption-key"
fi

# 4. Display Production n8n FQDN and Webhook URL
N8N_FQDN=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

echo -e "\n[4/4] Production n8n Container App successfully deployed!"
echo "n8n FQDN: https://${N8N_FQDN}"
echo "n8n Webhook Base URL: https://${N8N_FQDN}/webhook/"
echo ""
echo "Next Step: Configure WEBSITEBANJA N8N_OPS_AGENT_WEBHOOK_URL in websitebanja-app:"
echo "az containerapp update --name websitebanja-app --resource-group $RESOURCE_GROUP --set-env-vars N8N_OPS_AGENT_WEBHOOK_URL=https://${N8N_FQDN}/webhook/wb-ops-agent"
echo "================================================================================"
