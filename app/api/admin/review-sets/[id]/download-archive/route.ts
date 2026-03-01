import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const BUCKETS = ["zero", "one", "twoPlus"] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bucket = request.nextUrl.searchParams.get("bucket") as (typeof BUCKETS)[number] | null;
    if (!bucket || !BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: "Invalid bucket: zero | one | twoPlus" }, { status: 400 });
    }

    const reviewSet = await prisma.reviewSet.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        images: {
          select: {
            id: true,
            filePath: true,
            ratings: { select: { decision: true } },
          },
        },
      },
    });

    if (!reviewSet) {
      return NextResponse.json({ error: "Review set not found" }, { status: 404 });
    }

    const list: Array<{ filePath: string; id: string }> = [];
    reviewSet.images.forEach((img) => {
      const likeCount = img.ratings.filter((r) => r.decision === "like").length;
      let inBucket = false;
      if (bucket === "zero") inBucket = likeCount === 0;
      else if (bucket === "one") inBucket = likeCount === 1;
      else inBucket = likeCount >= 2;
      if (inBucket && img.filePath) list.push({ filePath: img.filePath, id: img.id });
    });

    const zip = new JSZip();
    const publicDir = join(process.cwd(), "public");

    for (let i = 0; i < list.length; i++) {
      const { filePath, id } = list[i];
      const fullPath = join(publicDir, filePath.replace(/^\//, ""));
      if (!existsSync(fullPath)) continue;
      const ext = filePath.split(".").pop() || "jpg";
      const name = `img_${i + 1}_${id.slice(-6)}.${ext}`;
      const buf = await readFile(fullPath);
      zip.file(name, buf);
    }

    const buf = await zip.generateAsync({ type: "nodebuffer" });
    const filename = `archive-${bucket}-${reviewSet.title.replace(/[^a-z0-9-_]/gi, "_")}.zip`;

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Download archive error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
