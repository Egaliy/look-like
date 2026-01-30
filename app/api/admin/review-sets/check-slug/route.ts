import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function POST(request: NextRequest) {
  const { PrismaClient } = await import('@prisma/client');
  const prismaInstance = new PrismaClient();
  
  try {
    await prismaInstance.$disconnect();
    await prismaInstance.$connect();
    
    const body = await request.json();
    const { slug, excludeId } = body;

    if (!slug) {
      return NextResponse.json({ available: false, error: "Slug is required" });
    }

    // Используем findUnique для slug, так как он уникален
    let existing = null;
    try {
      existing = await prismaInstance.reviewSet.findUnique({
        where: { slug: slug },
      });
      
      // Если нашли и нужно исключить определенный ID
      if (existing && excludeId && existing.id === excludeId) {
        existing = null; // Считаем что slug доступен для этого проекта
      }
    } catch (e) {
      // Если slug не найден, это нормально - значит доступен
      existing = null;
    }

    return NextResponse.json({
      available: !existing,
      slug,
    });
  } catch (error: any) {
    return NextResponse.json(
      { available: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prismaInstance.$disconnect();
  }
}
