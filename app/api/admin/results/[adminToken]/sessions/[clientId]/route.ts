import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { adminToken: string; clientId: string } }
) {
  const { PrismaClient } = await import('@prisma/client');
  const prismaInstance = new PrismaClient();
  
  try {
    await prismaInstance.$disconnect();
    await prismaInstance.$connect();
    
    // Находим ссылку по adminToken
    const reviewLink = await prismaInstance.reviewLink.findUnique({
      where: { adminToken: params.adminToken },
    });

    if (!reviewLink) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    // Удаляем все оценки этого клиента для этой ссылки
    const result = await prismaInstance.rating.deleteMany({
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
  } finally {
    await prismaInstance.$disconnect();
  }
}
