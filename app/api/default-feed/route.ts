import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureReviewSetColumns } from "@/lib/ensure-review-set-columns";

const DEFAULT_MAX_IMAGES = 40;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type DefaultFeedRow = {
  id: string;
  title: string;
  maxImagesToRate?: number | null;
  images: { id: string; url: string | null; filePath: string | null; title: string | null; order: number }[];
  links: { token: string; expiresAt: Date | null }[];
};

const defaultFeedSelect = {
  id: true,
  title: true,
  maxImagesToRate: true,
  images: {
    orderBy: { order: "asc" as const },
    select: { id: true, url: true, filePath: true, title: true, order: true },
  },
  links: {
    take: 1,
    orderBy: { createdAt: "desc" as const },
    select: { token: true, expiresAt: true },
  },
} as const;

/**
 * Возвращает данные ленты последнего проекта по order (или по createdAt).
 * Главная страница рендерит их без редиректа.
 */
export async function GET() {
  try {
    await ensureReviewSetColumns();
    let reviewSetWithLink: DefaultFeedRow | null = null;

    try {
      reviewSetWithLink = await prisma.reviewSet.findFirst({
        orderBy: [{ order: "desc" }, { createdAt: "desc" }],
        select: defaultFeedSelect,
      }) as DefaultFeedRow | null;
    } catch (orderErr: any) {
      const msg = String(orderErr?.message ?? "");
      if (msg.includes("order") || msg.includes("maxImagesToRate") || orderErr?.code === "P2009") {
        const selectNoOptional = {
          id: true,
          title: true,
          images: {
            orderBy: { order: "asc" as const },
            select: { id: true, url: true, filePath: true, title: true, order: true },
          },
          links: {
            take: 1,
            orderBy: { createdAt: "desc" as const },
            select: { token: true, expiresAt: true },
          },
        } as const;
        reviewSetWithLink = await prisma.reviewSet.findFirst({
          orderBy: { createdAt: "desc" },
          select: selectNoOptional,
        }) as DefaultFeedRow | null;
        if (reviewSetWithLink) (reviewSetWithLink as DefaultFeedRow).maxImagesToRate = null;
      } else throw orderErr;
    }

    if (!reviewSetWithLink || reviewSetWithLink.links.length === 0) {
      return NextResponse.json({ error: "No default project or link" }, { status: 404 });
    }

    const link = reviewSetWithLink.links[0];
    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({ error: "Default link expired" }, { status: 410 });
    }

    let images = reviewSetWithLink.images.map((img) => ({
      id: img.id,
      url: img.url,
      filePath: img.filePath,
      title: img.title,
      order: img.order,
    }));

    const limit =
      reviewSetWithLink.maxImagesToRate == null
        ? undefined
        : Math.max(1, reviewSetWithLink.maxImagesToRate);
    if (limit != null && images.length > limit) {
      images = shuffle(images).slice(0, limit);
    }

    return NextResponse.json({
      reviewSet: { id: reviewSetWithLink.id, title: reviewSetWithLink.title },
      images,
      token: link.token,
    });
  } catch (error: any) {
    console.error("Error fetching default feed:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
