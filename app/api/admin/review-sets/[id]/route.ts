import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewSet = await prisma.reviewSet.findUnique({
      where: { id: params.id },
      include: {
        images: {
          orderBy: {
            order: "asc",
          },
        },
        links: {
          orderBy: {
            createdAt: "desc",
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

    return NextResponse.json({
      id: reviewSet.id,
      title: reviewSet.title,
      description: reviewSet.description,
      createdAt: reviewSet.createdAt.toISOString(),
      updatedAt: reviewSet.updatedAt.toISOString(),
      images: reviewSet.images.map((img) => ({
        id: img.id,
        reviewSetId: img.reviewSetId,
        url: img.url,
        order: img.order,
        title: img.title,
        metadata: img.metadata,
        createdAt: img.createdAt.toISOString(),
      })),
      links: reviewSet.links.map((link) => ({
        id: link.id,
        token: link.token,
        reviewSetId: link.reviewSetId,
        maxSessions: link.maxSessions,
        allowResume: link.allowResume,
        expiresAt: link.expiresAt?.toISOString() || null,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching review set:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
