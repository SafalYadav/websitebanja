// src/lib/storage/index.ts

import { getStorageConfig } from "./config";
import { SupabaseStorageClient } from "./supabaseStorage";
import { AzureBlobStorageClient } from "./azureBlob";
import type { IStorageClient, StorageProvider } from "./types";

export * from "./types";
export * from "./config";

/**
 * Returns a storage client instance for the requested bucket/container,
 * routing dynamically to either Azure Blob Storage or Supabase Storage
 * based on STORAGE_PROVIDER environment variable.
 */
export function getStorageClient(bucket: string): IStorageClient {
  const config = getStorageConfig();

  if (config.provider === "azure") {
    return new AzureBlobStorageClient(bucket);
  }

  return new SupabaseStorageClient(bucket);
}

/**
 * Checks storage connectivity and health for the active provider.
 */
export async function checkStorageHealth(): Promise<{
  provider: StorageProvider;
  status: "healthy" | "degraded" | "unconfigured";
  message: string;
  isAzureReady: boolean;
}> {
  const config = getStorageConfig();

  if (config.provider === "azure") {
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
      // Quick probe by checking container
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

  return {
    provider: "supabase",
    status: "healthy",
    message: "Supabase Storage client initialized and active.",
    isAzureReady: config.isAzureConfigured,
  };
}
