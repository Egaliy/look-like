import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function POST(request: NextRequest) {
  // Создаем новый клиент для этого запроса (избегаем проблем с pooling)
  const prisma = new PrismaClient();
  
  try {
    // Перезапускаем соединение
    await prisma.$connect();
    
    // Удаляем через SQL напрямую
    await prisma.$executeRawUnsafe('DELETE FROM "ratings";');
    await prisma.$executeRawUnsafe('DELETE FROM "review_links";');
    await prisma.$executeRawUnsafe('DELETE FROM "image_assets";');
    await prisma.$executeRawUnsafe('DELETE FROM "review_sets";');

    return NextResponse.json({ success: true, message: "All projects deleted" });
  } catch (error: any) {
    console.error("Error deleting projects:", error);
    
    // Пробуем через обычные методы
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
  } finally {
    await prisma.$disconnect();
  }
}
