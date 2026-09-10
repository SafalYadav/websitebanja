# WebsiteBanja AI — Production Migration Walkthrough

## Executive Summary

WebsiteBanja AI has completed **Phase 4: Application Hosting Migration**, transitioning the full-stack Next.js web application from Vercel hosting to **Azure Container Apps (ACA)** on subscription `Azure for Students` (`5f99d086-da25-4807-b98b-76c7e114bf38`) in resource group `websitebanja-rg` (`indiasouthcentral`).

### Key Architectural Milestones Completed
1. **Database Layer (Azure PostgreSQL)**: Migrated 29 projects, 7 users, 5 catalog items, 3 published versions to `websitebanja-db.postgres.database.azure.com:5432` with 100% schema & referential parity.
2. **Storage Layer (Azure Blob Storage)**: Migrated 196 project workspace files to `websitebanjastorage` (`project-workspaces`) with 100% SHA-256 cryptographic parity.
3. **Container Packaging & CI/CD**: Next.js configured in `standalone` mode, packaged via multi-stage non-root Alpine container (`Dockerfile`), and built/pushed to Azure Container Registry (`websitebanjacr.azurecr.io/websitebanja:latest`) via GitHub Actions.
4. **Authentication (Supabase Auth Active)**: Preserved as current auth provider. Identity mapping layer retains 7 historical user mappings to ensure continuity.
5. **AI Core (Zero Regression)**: OpenAI primary generator, OpenAI/Gemini AI Architect, SSE streaming, and external Gemini Live voice interfaces fully preserved.
6. **Zero Risk Rollback**: Vercel production deployment and Supabase database remain completely untouched and active. Zero DNS cutover performed.

---

## 1. Container App Architecture & Specifications

| Component | Target Specification |
|---|---|
| **Azure Subscription** | `5f99d086-da25-4807-b98b-76c7e114bf38` (*Azure for Students*) |
| **Resource Group** | `websitebanja-rg` (Location: `indiasouthcentral`) |
| **Container Registry** | `websitebanjacr.azurecr.io` (Region: `centralindia`, Basic SKU) |
| **Image Tag** | `websitebanjacr.azurecr.io/websitebanja:latest` |
| **Environment** | `websitebanja-env` (Azure Container Apps Managed Environment, Region: `centralindia`) |
| **Container App** | `websitebanja-app` |
| **Compute & Memory** | 0.5 vCPU, 1.0 GiB RAM |
| **Scaling** | minReplicas = 1, maxReplicas = 3 |
| **Ingress** | External, Target Port 3000, HTTPS |
| **Identity & Security** | System-Assigned Managed Identity (`AcrPull` on ACR, `Storage Blob Data Contributor` on Storage) |

---

## 2. GitHub Actions CI/CD Pipeline

Because ACR Tasks is not allowed on Azure for Students subscriptions, container images are built and pushed using GitHub-hosted runners (`ubuntu-latest`):

- **Workflow File**: [`.github/workflows/deploy-azure.yml`](file:///Users/safalyadav/websitebanja/.github/workflows/deploy-azure.yml)
- **Required GitHub Secrets**:
  - `ACR_USERNAME`: Username for Azure Container Registry (e.g., `websitebanjacr`)
  - `ACR_PASSWORD`: Password/Access key obtained from `az acr credential show --name websitebanjacr`
- **Actions Executed**:
  1. Checks out codebase
  2. Sets up Docker Buildx with cache
  3. Logs in to `websitebanjacr.azurecr.io` via `docker/login-action@v3`
  4. Builds `Dockerfile`
  5. Pushes `websitebanjacr.azurecr.io/websitebanja:latest` and immutable commit tag

---

## 3. Automation Scripts

All deployment and verification operations have been automated into deterministic scripts:

1. [`azure-migration/09_deploy_azure_container_app.sh`](file:///Users/safalyadav/websitebanja/azure-migration/09_deploy_azure_container_app.sh):
   - Targets subscription `5f99d086-da25-4807-b98b-76c7e114bf38` in region `indiasouthcentral`
   - Verifies `websitebanjacr` and confirms image availability
   - Provisions `websitebanja-env`
   - Creates/updates `websitebanja-app` with 0.5 CPU / 1.0 GiB RAM and port 3000 ingress
   - Enables System-Assigned Managed Identity
   - Assigns `AcrPull` on ACR and `Storage Blob Data Contributor` on Storage Account
   - Configures the Container App registry to pull via System-Assigned Managed Identity (`--identity system`)

2. [`azure-migration/10_configure_container_app_env.sh`](file:///Users/safalyadav/websitebanja/azure-migration/10_configure_container_app_env.sh):
   - Sets non-secret environment variables (`DB_PROVIDER=azure`, `STORAGE_PROVIDER=azure`, `AUTH_PROVIDER=supabase`, etc.)
   - Outlines secret bindings via `az containerapp secret set` and `secretref:` references.

3. [`azure-migration/11_smoke_test_container_app.mjs`](file:///Users/safalyadav/websitebanja/azure-migration/11_smoke_test_container_app.mjs):
   - Probes 8 critical endpoints: landing page, login, signup, auth callback, protected API 401 unauthenticated check, public telemetry API, SSE agent route, and voice route.

---

## 4. Execution Guide (Azure Cloud Shell)

```bash
# 1. Open Azure Cloud Shell (Bash) at https://shell.azure.com
# 2. Clone repository or pull latest
git clone https://github.com/SafalYadav/websitebanja.git
cd websitebanja

# 3. Run the deployment pipeline
chmod +x azure-migration/09_deploy_azure_container_app.sh
./azure-migration/09_deploy_azure_container_app.sh

# 4. Configure application secrets (substitute your real secret values)
az containerapp secret set --name websitebanja-app --resource-group websitebanja-rg --secrets \
  azure-db-password="<AZURE_DB_PASSWORD>" \
  openai-api-key="<OPENAI_API_KEY>" \
  gemini-api-key="<GEMINI_API_KEY>" \
  supabase-service-role-key="<SUPABASE_SERVICE_ROLE_KEY>" \
  upstash-redis-rest-token="<UPSTASH_REDIS_REST_TOKEN>"

# 5. Run the environment configuration script
chmod +x azure-migration/10_configure_container_app_env.sh
./azure-migration/10_configure_container_app_env.sh

# 6. Bind secrets to container environment variables
az containerapp update --name websitebanja-app --resource-group websitebanja-rg --set-env-vars \
  AZURE_DB_PASSWORD=secretref:azure-db-password \
  OPENAI_API_KEY=secretref:openai-api-key \
  GEMINI_API_KEY=secretref:gemini-api-key \
  SUPABASE_SERVICE_ROLE_KEY=secretref:supabase-service-role-key \
  UPSTASH_REDIS_REST_TOKEN=secretref:upstash-redis-rest-token

# 7. Run live smoke tests against the Container App URL
APP_URL=$(az containerapp show --name websitebanja-app --resource-group websitebanja-rg --query properties.configuration.ingress.fqdn -o tsv)
node azure-migration/11_smoke_test_container_app.mjs "https://${APP_URL}"
```

---

## 5. Safety & Rollback Posture
- **Vercel Production Deployment**: Fully intact.
- **Supabase Auth**: Actively serving authentication.
- **DNS Records**: No DNS modifications made.
- **Zero Secret Exposure**: No credentials committed or logged.
