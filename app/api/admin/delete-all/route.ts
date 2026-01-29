import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Удаляем все через транзакцию
    await prisma.$transaction(async (tx) => {
      await tx.rating.deleteMany();
      await tx.reviewLink.deleteMany();
      await tx.imageAsset.deleteMany();
      await tx.reviewSet.deleteMany();
    });

    return NextResponse.json({ success: true, message: "All projects deleted" });
  } catch (error: any) {
    console.error("Error deleting projects:", error);
    
    // Если транзакция не работает, пробуем по отдельности
    try {
      await prisma.rating.deleteMany();
      await prisma.reviewLink.deleteMany();
      await prisma.imageAsset.deleteMany();
      await prisma.reviewSet.deleteMany();
      return NextResponse.json({ success: true, message: "All projects deleted" });
    } catch (e2: any) {
      return NextResponse.json(
        { error: e2.message || "Failed to delete projects" },
        { status: 500 }
      );
    }
  }
}
