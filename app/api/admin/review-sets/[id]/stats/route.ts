import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { PrismaClient } = await import('@prisma/client');
  const prismaInstance = new PrismaClient();
  
  try {
    await prismaInstance.$disconnect();
    await prismaInstance.$connect();
    
    const reviewSet = await prismaInstance.reviewSet.findUnique({
      where: { id: params.id },
      include: {
        images: {
          include: {
            ratings: true,
          },
        },
        links: {
          include: {
            _count: {
              select: {
                ratings: true,
              },
            },
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

    // Распределение по количеству лайков (0, 1, 2+)
    const imagesByLikes: { [key: number]: number } = { 0: 0, 1: 0, 2: 0 };
    reviewSet.images.forEach(img => {
      const likeCount = img.ratings.filter(r => r.decision === 'like').length;
      if (likeCount === 0) imagesByLikes[0]++;
      else if (likeCount === 1) imagesByLikes[1]++;
      else imagesByLikes[2]++;
    });

    // Уникальные клиенты
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
        zero: imagesByLikes[0],
        one: imagesByLikes[1],
        twoPlus: imagesByLikes[2],
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
  } finally {
    await prismaInstance.$disconnect();
  }
}
