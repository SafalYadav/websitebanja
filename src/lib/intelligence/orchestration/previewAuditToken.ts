import { createHmac, timingSafeEqual } from "crypto";

function signingKey(): string {
  const key = process.env.WEBSITEBANJA_AUTOMATION_SECRET || process.env.AUTOMATION_SECRET;
  if (!key) throw new Error("Internal rendered QA signing key is not configured");
  return key;
}

export function createPreviewAuditToken(id: string): string {
  const expires = Date.now() + 5 * 60_000;
  const signature = createHmac("sha256", signingKey()).update(`${id}:${expires}`).digest("hex");
  return `${expires}.${signature}`;
}

export function verifyPreviewAuditToken(id: string, token?: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expires, signature] = parts;
  if (!/^\d+$/.test(expires || "") || Number(expires) < Date.now() || Number(expires) > Date.now() + 5 * 60_000 || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  try {
    const expected = createHmac("sha256", signingKey()).update(`${id}:${expires}`).digest();
    return timingSafeEqual(expected, Buffer.from(signature, "hex"));
  } catch { return false; }
}
