import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type {
  IStorageClient,
  StorageUploadOptions,
  StorageUploadResult,
  StorageDownloadResult,
  StorageRemoveResult,
  StoragePublicUrlResult,
} from "./types";

export class SupabaseStorageClient implements IStorageClient {
  constructor(private readonly bucket: string) {}

  private getClient() {
    if (
      typeof window === "undefined" &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ) {
      try {
        return createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { persistSession: false } }
        );
      } catch {
        return supabase;
      }
    }
    return supabase;
  }

  async upload(
    path: string,
    body: Buffer | Blob | string,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const client = this.getClient();
      const payload =
        typeof body === "string"
          ? new Blob([body], { type: options?.contentType || "text/plain;charset=utf-8" })
          : body;

      const { data, error } = await client.storage.from(this.bucket).upload(path, payload, {
        upsert: options?.upsert ?? true,
        contentType: options?.contentType,
        cacheControl: options?.cacheControl,
      });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: { path: data?.path || path }, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  async download(path: string): Promise<StorageDownloadResult> {
    try {
      const client = this.getClient();
      const { data, error } = await client.storage.from(this.bucket).download(path);
      if (error || !data) {
        return { data: null, error: error ? new Error(error.message) : new Error("File not found") };
      }

      return {
        data: {
          text: () => data.text(),
          arrayBuffer: () => data.arrayBuffer(),
          size: data.size,
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  async remove(paths: string[]): Promise<StorageRemoveResult> {
    try {
      const client = this.getClient();
      const { data, error } = await client.storage.from(this.bucket).remove(paths);
      if (error) {
        return { data: null, error: new Error(error.message) };
      }
      return { data: { paths: (data || []).map((d: { name: string }) => d.name) }, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  getPublicUrl(path: string): StoragePublicUrlResult {
    const client = this.getClient();
    const { data } = client.storage.from(this.bucket).getPublicUrl(path);
    return { data: { publicUrl: data.publicUrl } };
  }
}
