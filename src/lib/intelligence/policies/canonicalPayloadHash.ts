import { createHash } from "node:crypto";

/** Hash every nested JSON field without loading the policy/approval singletons. */
export function hashActionPayload(payload: unknown): string {
  const stable = JSON.stringify(payload, (_key, value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const object = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(object).sort().map(key => [key, object[key]]));
  });
  if (stable === undefined) throw new Error("Governance action must have a serializable payload");
  return createHash("sha256").update(stable).digest("hex");
}
