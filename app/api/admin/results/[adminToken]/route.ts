import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { adminToken: string } }
) {
  try {
    const reviewLink = await prisma.reviewLink.findUnique({
      where: { adminToken: params.adminToken },
      include: {
        reviewSet: {
          include: {
            images: {
              include: {
                ratings: true,
              },
              orderBy: {
                order: "asc",
              },
            },
          },
        },
      },
    });

    if (!reviewLink) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    // Группируем оценки по clientId для получения информации о сессиях
    const clientSessions = new Map<string, {
      clientId: string;
      firstRating: Date;
      lastRating: Date;
      totalRatings: number;
      likes: number;
      dislikes: number;
    }>();

    reviewLink.reviewSet.images.forEach((img) => {
      img.ratings.forEach((r) => {
        if (!clientSessions.has(r.clientId)) {
          clientSessions.set(r.clientId, {
            clientId: r.clientId,
            firstRating: r.timestamp,
            lastRating: r.timestamp,
            totalRatings: 0,
            likes: 0,
            dislikes: 0,
          });
        }
        const session = clientSessions.get(r.clientId)!;
        if (r.timestamp < session.firstRating) session.firstRating = r.timestamp;
        if (r.timestamp > session.lastRating) session.lastRating = r.timestamp;
        session.totalRatings++;
        if (r.decision === 'like') session.likes++;
        else session.dislikes++;
      });
    });

    const images = reviewLink.reviewSet.images.map((img) => ({
      id: img.id,
      url: img.url,
      filePath: img.filePath,
      ratings: img.ratings.map((r) => ({
        id: r.id,
        imageId: r.imageId,
        decision: r.decision,
        clientId: r.clientId,
        sessionId: (r as any).sessionId || null,
        timestamp: r.timestamp.toISOString(),
      })),
    }));

    // Преобразуем Map в массив для отправки
    const sessions = Array.from(clientSessions.values()).map(s => ({
      clientId: s.clientId,
      firstRating: s.firstRating.toISOString(),
      lastRating: s.lastRating.toISOString(),
      totalRatings: s.totalRatings,
      likes: s.likes,
      dislikes: s.dislikes,
    }));

    return NextResponse.json({
      images,
      sessions,
    });
  } catch (error: any) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
