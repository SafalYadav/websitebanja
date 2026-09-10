// src/lib/storage/config.ts

import type { StorageProvider } from "./types";

export interface StorageConfig {
  provider: StorageProvider;
  azureConnectionString?: string;
  azureAccountName?: string;
  azureAccountKey?: string;
  azureContainerPrefix?: string;
  isAzureConfigured: boolean;
  useManagedIdentity: boolean;
}

export function getStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER?.toLowerCase() === "azure"
    ? "azure"
    : "supabase") as StorageProvider;

  const azureConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const azureAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || "websitebanjastorage";
  const azureAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const azureContainerPrefix = process.env.AZURE_STORAGE_CONTAINER_PREFIX || "";
  const useManagedIdentity = process.env.AZURE_STORAGE_USE_MANAGED_IDENTITY === "true" ||
    Boolean(process.env.CONTAINER_APP_NAME || process.env.MSI_ENDPOINT || process.env.IDENTITY_ENDPOINT);

  const isAzureConfigured = Boolean(
    azureConnectionString ||
    (azureAccountName && azureAccountKey) ||
    (azureAccountName && useManagedIdentity)
  );

  return {
    provider,
    azureConnectionString,
    azureAccountName,
    azureAccountKey,
    azureContainerPrefix,
    isAzureConfigured,
    useManagedIdentity,
  };
}
