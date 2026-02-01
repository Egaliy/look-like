import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewSet = await prisma.reviewSet.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        images: {
          select: {
            id: true,
            filePath: true,
            url: true,
            title: true,
            ratings: { select: { id: true, decision: true, clientId: true } },
          },
        },
        links: {
          select: {
            id: true,
            token: true,
            _count: { select: { ratings: true } },
          },
        },
      },
    });

    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    // Статистика по оценкам
    const totalRatings = reviewSet.images.reduce((sum, img) => sum + img.ratings.length, 0);
    const likes = reviewSet.images.reduce((sum, img) => sum + img.ratings.filter(r => r.decision === 'like').length, 0);
    const dislikes = reviewSet.images.reduce((sum, img) => sum + img.ratings.filter(r => r.decision === 'dislike').length, 0);

    // Распределение по количеству лайков (0, 1, 2+) + списки фото для каждой группы
    const bucketZero: Array<{ id: string; filePath: string | null; url: string | null; title: string | null }> = [];
    const bucketOne: typeof bucketZero = [];
    const bucketTwoPlus: typeof bucketZero = [];

    reviewSet.images.forEach(img => {
      const likeCount = img.ratings.filter(r => r.decision === 'like').length;
      const item = { id: img.id, filePath: img.filePath, url: img.url, title: img.title };
      if (likeCount === 0) bucketZero.push(item);
      else if (likeCount === 1) bucketOne.push(item);
      else bucketTwoPlus.push(item);
    });

    const uniqueClients = new Set(
      reviewSet.images.flatMap(img => img.ratings.map(r => r.clientId))
    ).size;

    return NextResponse.json({
      totalImages: reviewSet.images.length,
      totalLinks: reviewSet.links.length,
      totalRatings,
      likes,
      dislikes,
      uniqueClients,
      imagesByLikes: {
        zero: bucketZero.length,
        one: bucketOne.length,
        twoPlus: bucketTwoPlus.length,
      },
      imagesByLikesList: {
        zero: bucketZero,
        one: bucketOne,
        twoPlus: bucketTwoPlus,
      },
      linksStats: reviewSet.links.map(link => ({
        id: link.id,
        token: link.token,
        ratingsCount: link._count.ratings,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
