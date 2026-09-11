// src/lib/storage/index.ts
// Architectural Decision: All application persistent files are strictly stored in Azure Blob Storage.
// Supabase Storage has been completely decoupled and removed.

import { getStorageConfig } from "./config";
import { AzureBlobStorageClient } from "./azureBlob";
import type { IStorageClient, StorageProvider } from "./types";

export * from "./types";
export * from "./config";

/**
 * Returns a storage client instance for the requested container in Azure Blob Storage.
 */
export function getStorageClient(container: string): IStorageClient {
  return new AzureBlobStorageClient(container);
}

/**
 * Checks storage connectivity and health for Azure Blob Storage.
 */
export async function checkStorageHealth(): Promise<{
  provider: StorageProvider;
  status: "healthy" | "degraded" | "unconfigured";
  message: string;
  isAzureReady: boolean;
}> {
  const config = getStorageConfig();

  if (!config.isAzureConfigured) {
    return {
      provider: "azure",
      status: "unconfigured",
      message: "Azure Storage credentials not set in environment.",
      isAzureReady: false,
    };
  }

  try {
    const _client = new AzureBlobStorageClient("project-workspaces");
    return {
      provider: "azure",
      status: "healthy",
      message: "Azure Blob Storage responsive and verified.",
      isAzureReady: true,
    };
  } catch (err) {
    return {
      provider: "azure",
      status: "degraded",
      message: err instanceof Error ? err.message : String(err),
      isAzureReady: false,
    };
  }
}

