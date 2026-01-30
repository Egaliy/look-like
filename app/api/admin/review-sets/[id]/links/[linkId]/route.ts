import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; linkId: string } }
) {
  const { PrismaClient } = await import('@prisma/client');
  const prismaInstance = new PrismaClient();
  
  try {
    // Проверяем, что ссылка принадлежит проекту
    const link = await prismaInstance.reviewLink.findUnique({
      where: { id: params.linkId },
    });

    if (!link || link.reviewSetId !== params.id) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    await prismaInstance.reviewLink.delete({
      where: { id: params.linkId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting link:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prismaInstance.$disconnect();
  }
}
