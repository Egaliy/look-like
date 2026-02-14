import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMGS_DIR = path.join(process.cwd(), "imgs");

/**
 * Список тестовых фото из папки imgs — для главной и для проектов без фото.
 */
export async function GET() {
  try {
    if (!fs.existsSync(IMGS_DIR)) {
      return NextResponse.json({ images: [] });
    }
    const files = fs.readdirSync(IMGS_DIR);
    const images = files
      .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map((f, i) => ({
        id: `test-${i}-${f}`,
        title: `Reference #${i + 1}`,
        url: `/api/test-images/${encodeURIComponent(f)}`,
      }));
    return NextResponse.json({ images });
  } catch (e: any) {
    console.error("Error listing test images:", e);
    return NextResponse.json({ images: [] });
  }
}
