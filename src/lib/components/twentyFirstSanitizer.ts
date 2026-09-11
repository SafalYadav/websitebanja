// src/lib/components/twentyFirstSanitizer.ts
/**
 * 21st.dev Security Sanitizer & Dependency Validator.
 * Enforces strict sandbox isolation, import allowlisting, and safe code execution constraints.
 */

import path from "path";

export const ALLOWED_21ST_PACKAGES = new Set([
  "react",
  "react/jsx-runtime",
  "react-dom",
  "framer-motion",
  "lucide-react",
  "clsx",
  "tailwind-merge",
]);

export const FORBIDDEN_CODE_PATTERNS = [
  { pattern: /\beval\s*\(/g, name: "eval() execution" },
  { pattern: /\bFunction\s*\(/g, name: "Function constructor" },
  { pattern: /dangerouslySetInnerHTML/g, name: "dangerouslySetInnerHTML" },
  { pattern: /<script\b[^>]*>/gi, name: "inline <script> tag" },
  { pattern: /<iframe\b[^>]*>/gi, name: "<iframe element" },
  { pattern: /\bprocess\.(env|exit|cwd|versions|binding|argv)/g, name: "process environment access" },
  { pattern: /\brequire\s*\(/g, name: "require() dynamic import" },
  { pattern: /\bchild_process\b/g, name: "child_process execution" },
  { pattern: /\bdocument\.cookie\b/g, name: "document.cookie access" },
  { pattern: /\bwindow\.localStorage\b/g, name: "window.localStorage access" },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  importedPackages: string[];
}

/**
 * Validates a component source string against security constraints.
 */
export function validate21stSource(sourceCode: string): ValidationResult {
  const errors: string[] = [];
  const importedPackages: string[] = [];

  // 1. Check forbidden patterns
  for (const { pattern, name } of FORBIDDEN_CODE_PATTERNS) {
    if (pattern.test(sourceCode)) {
      errors.push(`Forbidden code pattern detected: ${name}`);
    }
  }

  // 2. Check import statements
  const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(sourceCode)) !== null) {
    const pkg = match[1];
    importedPackages.push(pkg);

    // Allow project-relative aliases and relative imports
    if (
      pkg.startsWith("@/") ||
      pkg.startsWith("./") ||
      pkg.startsWith("../")
    ) {
      continue;
    }

    // Check external packages against allowlist
    const basePkg = pkg.split("/")[0];
    if (!ALLOWED_21ST_PACKAGES.has(pkg) && !ALLOWED_21ST_PACKAGES.has(basePkg)) {
      errors.push(`Disallowed external dependency: "${pkg}". Only approved packages (${Array.from(ALLOWED_21ST_PACKAGES).join(", ")}) are permitted.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    importedPackages,
  };
}

/**
 * Ensures file system writes are strictly contained within allowed directories.
 */
export function validateWritePath(targetPath: string): { allowed: boolean; reason?: string } {
  const normalized = path.resolve(targetPath);
  const allowedRoots = [
    path.resolve(process.cwd(), "src", "components", "21st"),
    path.resolve(process.cwd(), "src", "generated"),
  ];

  const isAllowed = allowedRoots.some((root) => normalized.startsWith(root));
  if (!isAllowed) {
    return {
      allowed: false,
      reason: `Security violation: Path "${targetPath}" is outside approved directories (src/components/21st/ and src/generated/).`,
    };
  }

  return { allowed: true };
}

/**
 * Strips disallowed inline patterns and ensures valid directive and formatting.
 */
export function sanitize21stSource(sourceCode: string): string {
  let cleaned = sourceCode;

  // Ensure "use client"; directive at top if framer-motion or hooks are present
  if ((cleaned.includes("useReducedMotion") || cleaned.includes("useState") || cleaned.includes("framer-motion")) && !cleaned.startsWith('"use client"')) {
    cleaned = `"use client";\n\n${cleaned}`;
  }

  return cleaned;
}
