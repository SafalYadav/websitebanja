// scripts/normalize-uiux-data.mjs
import fs from "node:fs";
import path from "node:path";

const SOURCE_DIR = path.resolve(process.cwd(), "scratch/ui-ux-pro-max-skill/src/ui-ux-pro-max/data");
const TARGET_DIR = path.resolve(process.cwd(), "src/lib/ai/uiux-pro-max/data");

if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`Source directory not found: ${SOURCE_DIR}`);
  process.exit(1);
}

fs.mkdirSync(TARGET_DIR, { recursive: true });

/**
 * Robust CSV parser that handles quotes, escaped quotes, and newlines within fields.
 */
function parseCsv(content) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++; // skip newline after CR
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());
  const data = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c] ?? "";
    }
    data.push(obj);
  }

  return data;
}

const FILES_TO_CONVERT = [
  { csv: "products.csv", json: "products.json" },
  { csv: "styles.csv", json: "styles.json" },
  { csv: "colors.csv", json: "colors.json" },
  { csv: "typography.csv", json: "typography.json" },
  { csv: "landing.csv", json: "landing.json" },
  { csv: "ui-reasoning.csv", json: "uiReasoning.json" },
  { csv: "ux-guidelines.csv", json: "uxGuidelines.json" },
  { csv: "motion.csv", json: "motion.json" },
];

console.log("Normalizing upstream UI/UX Pro Max CSV data...");

for (const item of FILES_TO_CONVERT) {
  const csvPath = path.join(SOURCE_DIR, item.csv);
  if (!fs.existsSync(csvPath)) {
    console.warn(`Warning: CSV not found: ${csvPath}`);
    continue;
  }
  const content = fs.readFileSync(csvPath, "utf8");
  const parsed = parseCsv(content);
  const targetPath = path.join(TARGET_DIR, item.json);
  fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2), "utf8");
  console.log(`  ✓ ${item.csv} -> ${item.json} (${parsed.length} rows)`);
}

// Stacks conversion
const STACKS_DIR = path.join(SOURCE_DIR, "stacks");
if (fs.existsSync(STACKS_DIR)) {
  const stackFiles = ["nextjs.csv", "react.csv", "html-tailwind.csv", "shadcn.csv"];
  const stacksData = {};
  for (const sf of stackFiles) {
    const sPath = path.join(STACKS_DIR, sf);
    if (fs.existsSync(sPath)) {
      const stackName = sf.replace(".csv", "");
      stacksData[stackName] = parseCsv(fs.readFileSync(sPath, "utf8"));
    }
  }
  fs.writeFileSync(path.join(TARGET_DIR, "stacks.json"), JSON.stringify(stacksData, null, 2), "utf8");
  console.log(`  ✓ stacks (${Object.keys(stacksData).join(", ")}) -> stacks.json`);
}

console.log("Data normalization complete!");
