// src/lib/storage/types.ts

export type StorageProvider = "supabase" | "azure";

export interface StorageUploadOptions {
  contentType?: string;
  upsert?: boolean;
  cacheControl?: string;
}

export interface StorageUploadResult {
  data: { path: string } | null;
  error: Error | null;
}

export interface StorageDownloadResult {
  data: {
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
    size: number;
  } | null;
  error: Error | null;
}

export interface StorageRemoveResult {
  data: { paths: string[] } | null;
  error: Error | null;
}

export interface StoragePublicUrlResult {
  data: {
    publicUrl: string;
  };
}

export interface IStorageClient {
  upload(
    path: string,
    body: Buffer | Blob | string,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult>;

  download(path: string): Promise<StorageDownloadResult>;

  remove(paths: string[]): Promise<StorageRemoveResult>;

  getPublicUrl(path: string): StoragePublicUrlResult;
}
