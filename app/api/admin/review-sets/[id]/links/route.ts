import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем, что review set существует
    const reviewSet = await prisma.reviewSet.findUnique({
      where: { id: params.id },
    });

    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    const link = await prisma.reviewLink.create({
      data: {
        reviewSetId: params.id,
        maxSessions: 1,
        allowResume: true,
        expiresAt: null,
      },
    });

    return NextResponse.json({
      id: link.id,
      token: link.token,
      adminToken: link.adminToken,
      reviewSetId: link.reviewSetId,
      maxSessions: link.maxSessions,
      allowResume: link.allowResume,
      expiresAt: link.expiresAt?.toISOString() || null,
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating link:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
