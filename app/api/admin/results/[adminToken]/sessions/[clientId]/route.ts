import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { adminToken: string; clientId: string } }
) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.json({ success: true }, { status: 200 });
  }
  try {
    // Находим ссылку по adminToken
    const reviewLink = await prisma.reviewLink.findUnique({
      where: { adminToken: params.adminToken },
    });

    if (!reviewLink) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    // Удаляем все оценки этого клиента для этой ссылки
    const result = await prisma.rating.deleteMany({
      where: {
        reviewLinkId: reviewLink.id,
        clientId: params.clientId,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error: any) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
