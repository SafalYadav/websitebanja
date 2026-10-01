// azure-migration/bicep/production_infrastructure.bicep
// ==============================================================================
// WebsiteBanja AI — Complete Target Production Infrastructure as Code
// Target: Azure Container Apps, Azure PostgreSQL, Azure Blob Storage, Azure Key Vault
// Phase: Phase 24 (Production Infrastructure)
// ==============================================================================

@description('Azure region for all resources')
param location string = 'centralindia'

@description('Environment prefix/name')
param environmentName string = 'websitebanja-env'

@description('Container App name for WebsiteBanja Core')
param appName string = 'websitebanja-app'

@description('Container App name for Production n8n Ops Agent')
param n8nAppName string = 'n8n-app'

@description('Storage Account name for assets and workspaces')
param storageAccountName string = 'websitebanjastorage'

@description('Key Vault name for encrypted secrets')
param keyVaultName string = 'websitebanja-kv'

@description('Docker Image for WebsiteBanja Core (from ACR)')
param appImage string = 'websitebanjacr.azurecr.io/websitebanja:latest'

@description('Docker Image for Production n8n')
param n8nImage string = 'n8nio/n8n:latest'

// 1. Azure Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
  }
}

// 2. Azure Storage Account (Blob Storage)
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

resource workspacesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'project-workspaces'
  properties: {
    publicAccess: 'None'
  }
}

resource assetsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'project-assets'
  properties: {
    publicAccess: 'None'
  }
}

// 3. Azure Container Apps Managed Environment
resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {
    zoneRedundant: false
  }
}

// 4. WebsiteBanja Core Container App
resource websiteBanjaApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'websitebanja-core'
          image: appImage
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'HOSTNAME'
              value: '0.0.0.0'
            }
            {
              name: 'WEBSITEBANJA_RUNTIME_MODE'
              value: 'production'
            }
            {
              name: 'NEXT_PUBLIC_APP_URL'
              value: 'https://websitebanja.com'
            }
            {
              name: 'COMMUNICATION_DRY_RUN'
              value: 'false'
            }
            {
              name: 'AUTO_SEND_ENABLED'
              value: 'false'
            }
            {
              name: 'DB_PROVIDER'
              value: 'azure'
            }
            {
              name: 'STORAGE_PROVIDER'
              value: 'azure'
            }
            {
              name: 'AZURE_STORAGE_ACCOUNT_NAME'
              value: storageAccountName
            }
            {
              name: 'AZURE_STORAGE_USE_MANAGED_IDENTITY'
              value: 'true'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              initialDelaySeconds: 15
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              initialDelaySeconds: 10
              periodSeconds: 15
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// 5. Production n8n Ops Agent Container App
resource n8nApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: n8nAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 5678
        transport: 'auto'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'n8n-ops-agent'
          image: n8nImage
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          env: [
            {
              name: 'N8N_PORT'
              value: '5678'
            }
            {
              name: 'N8N_PROTOCOL'
              value: 'https'
            }
            {
              name: 'GENERIC_TIMEZONE'
              value: 'UTC'
            }
            {
              name: 'N8N_AI_ENABLED'
              value: 'true'
            }
            {
              name: 'N8N_DIAGNOSTICS_ENABLED'
              value: 'false'
            }
            {
              name: 'DB_TYPE'
              value: 'postgresdb'
            }
            {
              name: 'DB_POSTGRESDB_HOST'
              value: 'websitebanja-db.postgres.database.azure.com'
            }
            {
              name: 'DB_POSTGRESDB_PORT'
              value: '5432'
            }
            {
              name: 'DB_POSTGRESDB_DATABASE'
              value: 'n8n'
            }
            {
              name: 'DB_POSTGRESDB_USER'
              value: 'websitebanjaadmin'
            }
            {
              name: 'DB_POSTGRESDB_SCHEMA'
              value: 'public'
            }
            {
              name: 'DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED'
              value: 'true'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/healthz'
                port: 5678
              }
              initialDelaySeconds: 20
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
}

// 6. RBAC Role Assignments (Key Vault Secrets User & Storage Blob Data Contributor)
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'
var storageBlobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, websiteBanjaApp.id, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
    principalId: websiteBanjaApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource storageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, websiteBanjaApp.id, storageBlobDataContributorRoleId)
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleId)
    principalId: websiteBanjaApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output appFqdn string = websiteBanjaApp.properties.configuration.ingress.fqdn
output n8nFqdn string = n8nApp.properties.configuration.ingress.fqdn
output storageAccountName string = storageAccount.name
output keyVaultName string = keyVault.name
