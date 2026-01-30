import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { PrismaClient } = await import('@prisma/client');
  const prismaInstance = new PrismaClient();
  
  try {
    const reviewSet = await prismaInstance.reviewSet.findUnique({
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
        filePath: img.filePath,
        order: img.order,
        title: img.title,
        metadata: img.metadata,
        createdAt: img.createdAt.toISOString(),
      })),
      links: reviewSet.links.map((link: any) => ({
        id: link.id,
        token: link.token,
        adminToken: link.adminToken || null,
        reviewSetId: link.reviewSetId,
        maxSessions: link.maxSessions,
        allowResume: link.allowResume,
        expiresAt: link.expiresAt?.toISOString() || null,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("Error fetching review set:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prismaInstance.$disconnect();
  }
}
