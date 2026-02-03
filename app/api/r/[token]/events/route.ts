import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { imageId, decision, orderIndex, sessionId, clientId, userName } = body;

    if (!imageId || !decision || typeof orderIndex !== "number" || !clientId) {
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

    // Upsert rating (update if exists, create if not) с учетом clientId
    await prisma.rating.upsert({
      where: {
        reviewLinkId_imageId_clientId: {
          reviewLinkId: reviewLink.id,
          imageId: imageId,
          clientId: clientId,
        },
      },
      update: {
        decision,
        orderIndex,
        sessionId: sessionId || null,
        userName: userName || null,
        timestamp: new Date(),
      },
      create: {
        reviewLinkId: reviewLink.id,
        imageId,
        decision,
        clientId,
        userName: userName || null,
        orderIndex,
        sessionId: sessionId || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving rating:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
