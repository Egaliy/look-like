import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { PrismaClient } = await import('@prisma/client');
  const prismaInstance = new PrismaClient();
  
  try {
    await prismaInstance.$disconnect();
    await prismaInstance.$connect();
    
    const reviewLink = await prismaInstance.reviewLink.findUnique({
      where: { token: params.token },
      include: {
        reviewSet: {
          include: {
            images: {
              orderBy: {
                order: "asc",
              },
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

    if (!reviewLink.reviewSet) {
      return NextResponse.json({ error: "Review set not found" }, { status: 404 });
    }

    return NextResponse.json({
      reviewSet: {
        id: reviewLink.reviewSet.id,
        title: reviewLink.reviewSet.title,
      },
      images: reviewLink.reviewSet.images.map((img) => ({
        id: img.id,
        url: img.url,
        filePath: img.filePath,
        title: img.title,
        order: img.order,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching review:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prismaInstance.$disconnect();
  }
}
