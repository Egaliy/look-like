import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    // Проверяем, что ссылка принадлежит проекту
    const link = await prisma.reviewLink.findUnique({
      where: { id: params.linkId },
    });

    if (!link || link.reviewSetId !== params.id) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    await prisma.reviewLink.delete({
      where: { id: params.linkId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting link:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
