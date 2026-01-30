import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { adminToken: string } }
) {
  const { PrismaClient } = await import('@prisma/client');
  const prismaInstance = new PrismaClient();
  
  try {
    await prismaInstance.$disconnect();
    await prismaInstance.$connect();
    
    const reviewLink = await prismaInstance.reviewLink.findUnique({
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
  } catch (error: any) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prismaInstance.$disconnect();
  }
}
