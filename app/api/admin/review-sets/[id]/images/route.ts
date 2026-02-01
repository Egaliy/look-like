import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { filePath, url, title } = body;

    const reviewSet = await prisma.reviewSet.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    // Get current max order
    const maxOrderImage = await prisma.imageAsset.findFirst({
      where: { reviewSetId: params.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const maxOrder = maxOrderImage?.order ?? -1;

    const image = await prisma.imageAsset.create({
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
  }
}
