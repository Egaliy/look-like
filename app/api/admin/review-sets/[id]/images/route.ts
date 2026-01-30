import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { PrismaClient } = await import('@prisma/client');
  const prismaInstance = new PrismaClient();
  
  try {
    await prismaInstance.$disconnect();
    await prismaInstance.$connect();
    
    const body = await request.json();
    const { filePath, url, title } = body;

    // Проверяем, что review set существует
    const reviewSet = await prismaInstance.reviewSet.findUnique({
      where: { id: params.id },
    });

    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    // Get current max order
    const maxOrderImage = await prismaInstance.imageAsset.findFirst({
      where: { reviewSetId: params.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const maxOrder = maxOrderImage?.order ?? -1;

    const image = await prismaInstance.imageAsset.create({
      data: {
        reviewSetId: params.id,
        url: url || null,
        filePath: filePath || null,
        title: title || null,
        order: maxOrder + 1,
      },
    });

    return NextResponse.json({
      id: image.id,
      reviewSetId: image.reviewSetId,
      url: image.url,
      filePath: image.filePath,
      order: image.order,
      title: image.title,
      metadata: image.metadata,
      createdAt: image.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error adding image:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prismaInstance.$disconnect();
  }
}
