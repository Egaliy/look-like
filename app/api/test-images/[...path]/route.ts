import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMGS_DIR = path.join(process.cwd(), "imgs");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * Отдаёт файл из папки imgs по пути (без выхода за пределы imgs).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  if (!pathSegments?.length || pathSegments.some((p) => p === "..")) {
    return NextResponse.json({ error: "Bad path" }, { status: 400 });
  }
  const filePath = path.join(IMGS_DIR, ...pathSegments);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(IMGS_DIR))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const ext = path.extname(resolved).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const buf = fs.readFileSync(resolved);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e: any) {
    console.error("Error serving test image:", e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
