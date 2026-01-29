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

    const images = reviewLink.reviewSet.images.map((img) => ({
      id: img.id,
      url: img.url,
      filePath: img.filePath,
      ratings: img.ratings.map((r) => ({
        id: r.id,
        imageId: r.imageId,
        decision: r.decision,
        clientId: r.clientId,
        timestamp: r.timestamp.toISOString(),
      })),
    }));

    return NextResponse.json({
      images,
    });
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
