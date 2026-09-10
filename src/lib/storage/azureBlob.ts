// src/lib/storage/azureBlob.ts

import { getStorageConfig } from "./config";
import type {
  IStorageClient,
  StorageUploadOptions,
  StorageUploadResult,
  StorageDownloadResult,
  StorageRemoveResult,
  StoragePublicUrlResult,
} from "./types";

export class AzureBlobStorageClient implements IStorageClient {
  private blobServiceClient: any = null;
  private containerClient: any = null;
  private containerEnsured = false;

  constructor(private readonly containerName: string) {}

  private async getServiceClient(): Promise<any> {
    if (this.blobServiceClient) return this.blobServiceClient;

    if (typeof window !== "undefined") {
      throw new Error("Azure Blob Storage direct client cannot be used in browser context.");
    }

    const azureBlob = await import("@azure/storage-blob");
    const BlobServiceClient = azureBlob.BlobServiceClient;
    const StorageSharedKeyCredential = (azureBlob as any).StorageSharedKeyCredential;

    const config = getStorageConfig();
    if (config.azureConnectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        config.azureConnectionString
      );
      return this.blobServiceClient;
    }

    if (config.azureAccountName && config.azureAccountKey && StorageSharedKeyCredential) {
      const credential = new StorageSharedKeyCredential(
        config.azureAccountName,
        config.azureAccountKey
      );
      this.blobServiceClient = new BlobServiceClient(
        `https://${config.azureAccountName}.blob.core.windows.net`,
        credential
      );
      return this.blobServiceClient;
    }

    // Managed Identity (Container Apps / Production)
    if (config.azureAccountName && config.useManagedIdentity) {
      try {
        const { DefaultAzureCredential } = await import("@azure/identity");
        const credential = new DefaultAzureCredential();
        this.blobServiceClient = new BlobServiceClient(
          `https://${config.azureAccountName}.blob.core.windows.net`,
          credential
        );
        return this.blobServiceClient;
      } catch (_e) {
        // Fall through to error below
      }
    }

    throw new Error(
      "Azure Blob Storage is not configured. Please set AZURE_STORAGE_CONNECTION_STRING, AZURE_STORAGE_ACCOUNT_KEY, or configure Managed Identity."
    );
  }

  private async getContainer(): Promise<any> {
    if (this.containerClient && this.containerEnsured) {
      return this.containerClient;
    }

    const service = await this.getServiceClient();
    const client = service.getContainerClient(this.containerName);

    if (!this.containerEnsured) {
      try {
        await client.createIfNotExists();
        this.containerEnsured = true;
      } catch (_err) {
        // If already exists or permission denied on create, proceed
        this.containerEnsured = true;
      }
    }

    this.containerClient = client;
    return client;
  }

  async upload(
    path: string,
    body: Buffer | Blob | string,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const container = await this.getContainer();
      const blockBlobClient = container.getBlockBlobClient(path);

      let buffer: Buffer;
      if (typeof body === "string") {
        buffer = Buffer.from(body, "utf8");
      } else if (Buffer.isBuffer(body)) {
        buffer = body;
      } else {
        // Blob / File
        buffer = Buffer.from(await (body as Blob).arrayBuffer());
      }

      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: options?.contentType || "text/plain; charset=utf-8",
          blobCacheControl: options?.cacheControl || "public, max-age=3600",
        },
      });

      return { data: { path }, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  async download(path: string): Promise<StorageDownloadResult> {
    try {
      const container = await this.getContainer();
      const blockBlobClient = container.getBlockBlobClient(path);

      const exists = await blockBlobClient.exists();
      if (!exists) {
        return { data: null, error: new Error(`Blob not found: ${path}`) };
      }

      const buffer = await blockBlobClient.downloadToBuffer();
      return {
        data: {
          text: async () => buffer.toString("utf8"),
          arrayBuffer: async () => {
            const ab = new ArrayBuffer(buffer.length);
            const view = new Uint8Array(ab);
            view.set(buffer);
            return ab;
          },
          size: buffer.length,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  async remove(paths: string[]): Promise<StorageRemoveResult> {
    try {
      const container = await this.getContainer();
      const deletedPaths: string[] = [];

      for (const p of paths) {
        const blockBlobClient = container.getBlockBlobClient(p);
        await blockBlobClient.deleteIfExists();
        deletedPaths.push(p);
      }

      return { data: { paths: deletedPaths }, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  getPublicUrl(path: string): StoragePublicUrlResult {
    const config = getStorageConfig();
    const account = config.azureAccountName || "websitebanjastorage";
    return {
      data: {
        publicUrl: `https://${account}.blob.core.windows.net/${this.containerName}/${path}`,
      },
    };
  }
}
