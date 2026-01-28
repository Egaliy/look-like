import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const reviewLink = await prisma.reviewLink.findUnique({
      where: { token: params.token },
      include: {
        reviewSet: {
          include: {
            images: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!reviewLink) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (reviewLink.expiresAt && reviewLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    return NextResponse.json({
      reviewSet: {
        id: reviewLink.reviewSet.id,
        title: reviewLink.reviewSet.title,
      },
      images: reviewLink.reviewSet.images.map((img) => ({
        id: img.id,
        url: img.url,
        title: img.title,
        order: img.order,
      })),
    });
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
