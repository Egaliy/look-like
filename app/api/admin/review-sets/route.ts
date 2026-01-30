import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function GET() {
  const { PrismaClient } = await import('@prisma/client');
  const prismaInstance = new PrismaClient();
  
  try {
    await prismaInstance.$disconnect();
    await prismaInstance.$connect();
    
    const reviewSets = await prismaInstance.reviewSet.findMany({
      include: {
        _count: {
          select: {
            images: true,
            links: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const result = reviewSets.map((set) => ({
      id: set.id,
      title: set.title,
      description: set.description,
      createdAt: set.createdAt.toISOString(),
      updatedAt: set.updatedAt.toISOString(),
      _count: {
        images: set._count.images,
        links: set._count.links,
      },
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching review sets:", error);
    return NextResponse.json([]);
  } finally {
    await prismaInstance.$disconnect();
  }
}

// Функция для создания slug из title
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, '-') // Заменяем все не-английские символы на дефис (кроме дефиса и подчеркивания)
    .replace(/-+/g, '-') // Убираем множественные дефисы
    .replace(/^-|-$/g, ''); // Убираем дефисы в начале и конце
}

export async function POST(request: NextRequest) {
  const { PrismaClient } = await import('@prisma/client');
  const prismaInstance = new PrismaClient();
  
  try {
    await prismaInstance.$disconnect();
    await prismaInstance.$connect();
    
    const body = await request.json();
    const { title, description, slug } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Используем переданный slug или создаем из title
    const finalSlug = slug || createSlug(title);

    if (!finalSlug) {
      return NextResponse.json(
        { error: "Название должно содержать хотя бы одну английскую букву или цифру" },
        { status: 400 }
      );
    }

    // Проверяем уникальность slug
    const existing = await prismaInstance.reviewSet.findUnique({
      where: { slug: finalSlug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Проект с таким названием уже существует" },
        { status: 400 }
      );
    }

    const reviewSet = await prismaInstance.reviewSet.create({
      data: {
        title,
        slug: finalSlug,
        description: description || null,
      },
    });

    return NextResponse.json({
      id: reviewSet.id,
      title: reviewSet.title,
      slug: (reviewSet as any).slug || finalSlug,
      description: reviewSet.description,
      createdAt: reviewSet.createdAt.toISOString(),
      updatedAt: reviewSet.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating review set:", error);
    
    // Если ошибка уникальности slug
    if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
      return NextResponse.json(
        { error: "Проект с таким названием уже существует" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prismaInstance.$disconnect();
  }
}
