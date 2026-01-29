import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function POST(request: NextRequest) {
  // Используем прямой connection string для удаления (без pooling)
  const directUrl = process.env.DATABASE_URL?.replace(
    'pooler.supabase.com:6543',
    'db.ihaeyegjabyzkvpxqwor.supabase.co:5432'
  )?.replace(
    'aws-1-eu-west-1.pooler',
    'db.ihaeyegjabyzkvpxqwor'
  ) || process.env.DATABASE_URL;

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: directUrl + '?sslmode=require',
      },
    },
  });
  
  try {
    await prisma.$connect();
    
    // Удаляем через обычные методы Prisma
    await prisma.rating.deleteMany();
    await prisma.reviewLink.deleteMany();
    await prisma.imageAsset.deleteMany();
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
