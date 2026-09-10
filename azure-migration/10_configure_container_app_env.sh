#!/usr/bin/env bash
# ==============================================================================
# WebsiteBanja AI — Azure Container Apps Environment & Secret Configuration
# Target: Azure Cloud Shell / Azure CLI
# ==============================================================================

set -euo pipefail

RESOURCE_GROUP="websitebanja-rg"
CONTAINER_APP_NAME="websitebanja-app"

echo "================================================================================"
echo "WEBSITEBANJA AI — CONTAINER APP ENVIRONMENT & SECRETS SETUP"
echo "================================================================================"

# Check Container App exists
if ! az containerapp show --name "$CONTAINER_APP_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Error: Container App '$CONTAINER_APP_NAME' not found in '$RESOURCE_GROUP'."
  echo "Please run 09_deploy_azure_container_app.sh first."
  exit 1
fi

echo "Setting standard environment variables on '$CONTAINER_APP_NAME'..."

az containerapp update \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    "NODE_ENV=production" \
    "PORT=3000" \
    "HOSTNAME=0.0.0.0" \
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
    "UPSTASH_REDIS_REST_URL=https://brave-dinosaur-85711.upstash.io"

echo -e "\nStandard environment variables configured."
echo -e "To configure secure secret references (Azure DB Password, OpenAI Key, Gemini Key, Supabase Service Role Key, Upstash Token), run:"
echo -e "az containerapp secret set --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --secrets <secret-name>=<secret-value>"
echo -e "\nExample:"
echo -e "az containerapp secret set --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --secrets \\"
echo -e "  azure-db-password=\"<your_db_password>\" \\"
echo -e "  openai-api-key=\"<your_openai_key>\" \\"
echo -e "  gemini-api-key=\"<your_gemini_key>\" \\"
echo -e "  supabase-service-role-key=\"<your_service_role_key>\" \\"
echo -e "  upstash-redis-rest-token=\"<your_upstash_token>\""
echo -e "\nThen bind secret references to environment variables:"
echo -e "az containerapp update --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --set-env-vars \\"
echo -e "  AZURE_DB_PASSWORD=secretref:azure-db-password \\"
echo -e "  OPENAI_API_KEY=secretref:openai-api-key \\"
echo -e "  GEMINI_API_KEY=secretref:gemini-api-key \\"
echo -e "  SUPABASE_SERVICE_ROLE_KEY=secretref:supabase-service-role-key \\"
echo -e "  UPSTASH_REDIS_REST_TOKEN=secretref:upstash-redis-rest-token"
echo "================================================================================"
