export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Preview ID is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const previewFile = path.join(process.cwd(), "scratch/previews", `${id}.json`);

    if (!fs.existsSync(previewFile)) {
      return NextResponse.json({ success: false, error: "Preview file not found" }, { status: 404 });
    }

    const currentData = JSON.parse(fs.readFileSync(previewFile, "utf-8"));

    if (body.websiteData) {
      // Direct whole-object replace
      fs.writeFileSync(previewFile, JSON.stringify(body.websiteData, null, 2), "utf-8");
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
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (target[part] === undefined) {
            target[part] = {};
          }
          target = target[part];
        }
        if (valid && target) {
          const lastKey = parts[parts.length - 1];
          target[lastKey] = body.url;
          updatedCount++;
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
