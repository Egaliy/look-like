import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { imageId, decision, orderIndex, sessionId } = body;

    if (!imageId || !decision || typeof orderIndex !== "number") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (decision !== "like" && decision !== "dislike") {
      return NextResponse.json(
        { error: "Invalid decision" },
        { status: 400 }
      );
    }

    const reviewLink = await prisma.reviewLink.findUnique({
      where: { token: params.token },
    });

    if (!reviewLink) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Upsert rating (update if exists, create if not)
    await prisma.rating.upsert({
      where: {
        reviewLinkId_imageId: {
          reviewLinkId: reviewLink.id,
          imageId: imageId,
        },
      },
      update: {
        decision,
        orderIndex,
        timestamp: new Date(),
        sessionId: sessionId || null,
      },
      create: {
        reviewLinkId: reviewLink.id,
        imageId,
        decision,
        orderIndex,
        sessionId: sessionId || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
