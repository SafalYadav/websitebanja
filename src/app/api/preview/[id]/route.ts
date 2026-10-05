export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp, validateUserAuth } from "@/lib/supabaseServer";
import { isUserAdmin } from "@/lib/adminAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const PREVIEWS_DIR = path.resolve(process.cwd(), "scratch/previews");
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await validateUserAuth(request);
    if (!auth.user) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    const ip = getClientIp(request);
    const { success: allowed } = checkMemoryRateLimit(`preview_edit_${ip}`, 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const { id } = await context.params;
    if (!id || !SAFE_ID_REGEX.test(id)) {
      return NextResponse.json({ success: false, error: "Invalid preview ID" }, { status: 400 });
    }

    const previewFile = path.resolve(PREVIEWS_DIR, `${id}.json`);
    if (!previewFile.startsWith(PREVIEWS_DIR + path.sep)) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    if (!fs.existsSync(previewFile)) {
      return NextResponse.json({ success: false, error: "Preview file not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const currentData = JSON.parse(fs.readFileSync(previewFile, "utf-8"));
    if (currentData.generationOwnerId !== auth.user.id && !isUserAdmin(auth.user)) {
      return NextResponse.json({ success: false, error: "Preview ownership validation failed" }, { status: 403 });
    }
    const governed = Boolean(currentData.generationGate);
    if (governed) currentData.generationGate = "PENDING";

    if (body.websiteData) {
      // Direct whole-object replace
      const replacement = { ...body.websiteData, generationOwnerId: currentData.generationOwnerId,
        ...(governed ? { generationGate: "PENDING" } : {}) };
      fs.writeFileSync(previewFile, JSON.stringify(replacement, null, 2), "utf-8");
      return NextResponse.json({ success: true, message: "Website data saved" });
    }

    if (body.url) {
      let updatedCount = 0;

      // 1. Recursive finder & replacer for matching image URLs
      const replaceUrlDeep = (obj: any) => {
        if (!obj || typeof obj !== "object") return;
        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === "string" && body.oldUrl && obj[key] === body.oldUrl) {
            obj[key] = body.url;
            updatedCount++;
          } else if (typeof obj[key] === "object") {
            replaceUrlDeep(obj[key]);
          }
        }
      };

      if (body.oldUrl) {
        replaceUrlDeep(currentData);
      }

      // 2. Explicit path-based update if elementPath provided
      if (body.elementPath && !body.elementPath.startsWith("media.")) {
        const parts = body.elementPath.split(".");
        let target: any = currentData;
        let valid = true;

        for (const p of parts) {
          if (FORBIDDEN_KEYS.has(p) || p.startsWith("__")) {
            valid = false;
            break;
          }
        }

        if (valid) {
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (target[part] === undefined) {
              target[part] = {};
            }
            target = target[part];
            if (!target || typeof target !== "object") {
              valid = false;
              break;
            }
          }
          if (valid && target) {
            const lastKey = parts[parts.length - 1];
            if (!FORBIDDEN_KEYS.has(lastKey)) {
              target[lastKey] = body.url;
              updatedCount++;
            }
          }
        }
      }

      // 3. Persist image framing & focal metadata
      if (body.fit || body.focalPoint) {
        if (!currentData._imageMeta) currentData._imageMeta = {};
        const metaKey = body.elementPath || body.url;
        currentData._imageMeta[metaKey] = {
          fit: body.fit || "cover",
          focalPoint: body.focalPoint || "50% 50%",
        };
      }

      fs.writeFileSync(previewFile, JSON.stringify(currentData, null, 2), "utf-8");
      return NextResponse.json({ success: true, updatedCount });
    }

    return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
  } catch (err) {
    console.error("[POST /api/preview/[id]] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update preview" },
      { status: 500 }
    );
  }
}
