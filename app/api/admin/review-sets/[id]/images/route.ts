import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { url, title } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Get current max order
    const maxOrder = await prisma.imageAsset.findFirst({
      where: { reviewSetId: params.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const image = await prisma.imageAsset.create({
      data: {
        reviewSetId: params.id,
        url,
        title: title || null,
        order: (maxOrder?.order ?? -1) + 1,
      },
    });

    return NextResponse.json(image);
  } catch (error) {
    console.error("Error adding image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
