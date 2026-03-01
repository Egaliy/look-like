import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureReviewSetColumns } from "@/lib/ensure-review-set-columns";

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const linkSelectWithMax = {
  expiresAt: true,
  reviewSet: {
    select: {
      id: true,
      title: true,
      maxImagesToRate: true,
      images: {
        orderBy: { order: "asc" as const },
        select: { id: true, url: true, filePath: true, title: true, order: true },
      },
    },
  },
} as const;

const linkSelectNoMax = {
  expiresAt: true,
  reviewSet: {
    select: {
      id: true,
      title: true,
      images: {
        orderBy: { order: "asc" as const },
        select: { id: true, url: true, filePath: true, title: true, order: true },
      },
    },
  },
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await ensureReviewSetColumns();
    let reviewLink: Awaited<ReturnType<typeof prisma.reviewLink.findUnique<{ where: { token: string }; select: typeof linkSelectWithMax }>>>;
    try {
      reviewLink = await prisma.reviewLink.findUnique({
        where: { token: params.token },
        select: linkSelectWithMax,
      });
    } catch (colErr: any) {
      if (String(colErr?.message ?? "").includes("maxImagesToRate")) {
        reviewLink = await prisma.reviewLink.findUnique({
          where: { token: params.token },
          select: linkSelectNoMax,
        }) as typeof reviewLink;
        if (reviewLink?.reviewSet) (reviewLink.reviewSet as { maxImagesToRate?: number | null }).maxImagesToRate = null;
      } else throw colErr;
    }

    if (!reviewLink) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (reviewLink.expiresAt && reviewLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    if (!reviewLink.reviewSet) {
      return NextResponse.json({ error: "Review set not found" }, { status: 404 });
    }

    let images = reviewLink.reviewSet.images.map((img) => ({
      id: img.id,
      url: img.url,
      filePath: img.filePath,
      title: img.title,
      order: img.order,
    }));

    const maxToRate = (reviewLink.reviewSet as { maxImagesToRate?: number | null }).maxImagesToRate;
    const limit = maxToRate == null ? undefined : Math.max(1, maxToRate);
    if (limit != null && images.length > limit) {
      images = shuffle(images).slice(0, limit);
    }

    return NextResponse.json({
      reviewSet: {
        id: reviewLink.reviewSet.id,
        title: reviewLink.reviewSet.title,
      },
      images,
    });
  } catch (error: any) {
    console.error("Error fetching review:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
