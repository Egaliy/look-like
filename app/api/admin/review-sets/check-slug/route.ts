import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with JSON body: { slug: string }" },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.json({ available: true, slug: "" }, { status: 200 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { available: false, error: "DATABASE_URL is not set. Add it in Vercel environment variables." },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const { slug, excludeId } = body;

    if (!slug) {
      return NextResponse.json({ available: false, error: "Slug is required" });
    }

    // Используем findUnique для slug; select только нужных полей (колонка icon может отсутствовать в БД)
    let existing = null;
    try {
      existing = await prisma.reviewSet.findUnique({
        where: { slug: slug },
        select: { id: true, slug: true },
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
