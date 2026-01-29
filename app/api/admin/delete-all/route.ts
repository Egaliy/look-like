import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function POST(request: NextRequest) {
  // Используем pooling connection (проблема с prepared statements решается перезапуском)
  const prisma = new PrismaClient();
  
  try {
    // Перезапускаем соединение для очистки prepared statements
    await prisma.$disconnect();
    await prisma.$connect();
    
    // Удаляем через обычные методы Prisma с задержками
    await new Promise(resolve => setTimeout(resolve, 100));
    await prisma.rating.deleteMany();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    await prisma.reviewLink.deleteMany();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    await prisma.imageAsset.deleteMany();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    await prisma.reviewSet.deleteMany();

    return NextResponse.json({ success: true, message: "All projects deleted" });
  } catch (error: any) {
    console.error("Error deleting projects:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete projects" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
