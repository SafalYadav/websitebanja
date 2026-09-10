#!/usr/bin/env bash
# ==============================================================================
# WebsiteBanja AI — Azure Container Apps Environment & Secret Configuration
# Target: Azure Cloud Shell / Azure CLI
# Subscription: 5f99d086-da25-4807-b98b-76c7e114bf38 (Azure for Students)
# Resource Group: websitebanja-rg
# Container App: websitebanja-app
# ==============================================================================

set -euo pipefail

RESOURCE_GROUP="websitebanja-rg"
CONTAINER_APP_NAME="websitebanja-app"

echo "================================================================================"
echo "WEBSITEBANJA AI — CONTAINER APP ENVIRONMENT & SECRETS SETUP"
echo "================================================================================"

# 1. Verify Container App exists
if ! az containerapp show --name "$CONTAINER_APP_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Error: Container App '$CONTAINER_APP_NAME' not found in '$RESOURCE_GROUP'."
  echo "Please run 09_deploy_azure_container_app.sh first."
  exit 1
fi

# 2. Acquire Secrets (Without Echoing to Screen or Shell History)
echo -e "\n[1/4] Resolving Application Secrets..."

AZURE_DB_PASSWORD="${AZURE_DB_PASSWORD:-}"
OPENAI_API_KEY="${OPENAI_API_KEY:-}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
UPSTASH_REDIS_REST_TOKEN="${UPSTASH_REDIS_REST_TOKEN:-}"

# Check for local gitignored environment file
if [ -f ".env.production.local" ]; then
  echo "Loading secrets from .env.production.local..."
  set +u
  source .env.production.local
  set -u
elif [ -f ".env.local" ]; then
  echo "Loading secrets from .env.local..."
  set +u
  source .env.local
  set -u
fi

# If any secret is missing from env file, securely prompt without echo (zero history)
if [ -z "${AZURE_DB_PASSWORD:-}" ]; then
  read -s -r -p "Enter Azure PostgreSQL Password (input hidden): " AZURE_DB_PASSWORD
  echo ""
fi

if [ -z "${OPENAI_API_KEY:-}" ]; then
  read -s -r -p "Enter OpenAI API Key (input hidden): " OPENAI_API_KEY
  echo ""
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
  read -s -r -p "Enter Gemini API Key (input hidden): " GEMINI_API_KEY
  echo ""
fi

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  read -s -r -p "Enter Supabase Service Role Key (input hidden): " SUPABASE_SERVICE_ROLE_KEY
  echo ""
fi

if [ -z "${UPSTASH_REDIS_REST_TOKEN:-}" ]; then
  read -s -r -p "Enter Upstash Redis REST Token (input hidden): " UPSTASH_REDIS_REST_TOKEN
  echo ""
fi

# 3. Store Secrets securely in Azure Container Apps Secret Store
echo -e "\n[2/4] Registering encrypted secrets in Azure Container Apps Secret Store..."
az containerapp secret set \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --secrets \
    azure-db-password="$AZURE_DB_PASSWORD" \
    openai-api-key="$OPENAI_API_KEY" \
    gemini-api-key="$GEMINI_API_KEY" \
    supabase-service-role-key="$SUPABASE_SERVICE_ROLE_KEY" \
    upstash-redis-rest-token="$UPSTASH_REDIS_REST_TOKEN" >/dev/null

echo "Secrets successfully encrypted and stored in Container App."

# Clear local memory variables
unset AZURE_DB_PASSWORD OPENAI_API_KEY GEMINI_API_KEY SUPABASE_SERVICE_ROLE_KEY UPSTASH_REDIS_REST_TOKEN

# 4. Configure Standard & Secret-Reference Environment Variables
echo -e "\n[3/4] Updating Container App environment variables and secret references..."
az containerapp update \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    "NODE_ENV=production" \
    "PORT=3000" \
    "HOSTNAME=0.0.0.0" \
    "NEXT_TELEMETRY_DISABLED=1" \
    "DB_PROVIDER=azure" \
    "AZURE_DB_HOST=websitebanja-db.postgres.database.azure.com" \
    "AZURE_DB_USER=websitebanjaadmin" \
    "AZURE_DB_NAME=postgres" \
    "AZURE_DB_PORT=5432" \
    "DATABASE_SSL_REJECT_UNAUTHORIZED=false" \
    "STORAGE_PROVIDER=azure" \
    "AZURE_STORAGE_ACCOUNT_NAME=websitebanjastorage" \
    "AZURE_STORAGE_USE_MANAGED_IDENTITY=true" \
    "AUTH_PROVIDER=supabase" \
    "NEXT_PUBLIC_SUPABASE_URL=https://pllcuqjbaulowcnpwske.supabase.co" \
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbGN1cWpiYXVsb3djbnB3c2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTEwMzQsImV4cCI6MjEwMTQ4NzAzNH0.HtoZJjkzd87WR1qBwFavciLEqtbX8pZ0Be5Sbq3QRh0" \
    "ADMIN_EMAILS=websitebanja@gmail.com" \
    "UPSTASH_REDIS_REST_URL=https://brave-dinosaur-85711.upstash.io" \
    "AZURE_DB_PASSWORD=secretref:azure-db-password" \
    "OPENAI_API_KEY=secretref:openai-api-key" \
    "GEMINI_API_KEY=secretref:gemini-api-key" \
    "SUPABASE_SERVICE_ROLE_KEY=secretref:supabase-service-role-key" \
    "UPSTASH_REDIS_REST_TOKEN=secretref:upstash-redis-rest-token" >/dev/null

# 5. Verification of Environment Configuration (Names only, no secrets)
echo -e "\n[4/4] Verifying active configuration (Keys only, zero secrets displayed)..."
echo "Registered Secrets:"
az containerapp secret list \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[].name" -o tsv | sed 's/^/  - /'

echo -e "\nConfigured Environment Variables:"
az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.template.containers[0].env[].name" -o tsv | sed 's/^/  - /'

echo -e "\n================================================================================"
echo "ENVIRONMENT & SECRETS CONFIGURATION COMPLETE"
echo "================================================================================"
echo "Next step: Run the smoke test suite:"
echo "APP_URL=\$(az containerapp show --name websitebanja-app --resource-group websitebanja-rg --query properties.configuration.ingress.fqdn -o tsv)"
echo "node azure-migration/11_smoke_test_container_app.mjs \"https://\${APP_URL}\""
echo "================================================================================"
