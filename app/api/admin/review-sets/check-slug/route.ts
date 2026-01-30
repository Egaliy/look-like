import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, excludeId } = body;

    if (!slug) {
      return NextResponse.json({ available: false, error: "Slug is required" });
    }

    // Используем findUnique для slug, так как он уникален
    let existing = null;
    try {
      existing = await prisma.reviewSet.findUnique({
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
  }
}
