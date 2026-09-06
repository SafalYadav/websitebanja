const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** Max depth for a dotted path, to bound work on hostile input. */
const MAX_PATH_SEGMENTS = 32;

/**
 * Immutably sets `value` at a dotted/bracketed `path` inside a plain-object tree,
 * returning a deep copy with the change applied. Supports `a.b[0].c` syntax.
 *
 * SECURITY: paths reaching this function are not always trustworthy — the Studio AI
 * copilot derives them from LLM output, which in turn reflects user instructions.
 * Walking a path containing `__proto__`, `constructor`, or `prototype` would let a
 * crafted path write onto `Object.prototype`, corrupting every object in the process
 * (on the server that means every subsequent request on the same instance). Such
 * paths are rejected outright rather than sanitized, and the returned object is
 * created with a null prototype at each level we create.
 *
 * Returns the input unchanged (deep-copied) when the path is empty or unsafe.
 */
export function setDeepValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const root = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;

  const keys = path
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .filter((k) => k.length > 0);

  if (keys.length === 0 || keys.length > MAX_PATH_SEGMENTS) {
    return root;
  }

  if (keys.some((key) => FORBIDDEN_KEYS.has(key))) {
    console.warn("[setDeepValue] rejected unsafe path:", path);
    return root;
  }

  let current: Record<string, unknown> = root;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!Object.prototype.hasOwnProperty.call(current, key) || !current[key] || typeof current[key] !== "object") {
      current[key] = isNaN(Number(keys[i + 1])) ? {} : [];
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return root;
}
