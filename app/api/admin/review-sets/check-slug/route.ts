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

    const existing = await prismaInstance.reviewSet.findFirst({
      where: {
        slug: slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

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
