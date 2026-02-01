import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const listSelect = {
      id: true,
      title: true,
      slug: true,
      description: true,
      order: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { images: true, links: true } },
      links: {
        take: 1,
        orderBy: { createdAt: "desc" as const },
        select: { token: true, adminToken: true, _count: { select: { ratings: true } } },
      },
    } as const;
    let reviewSets: Awaited<ReturnType<typeof prisma.reviewSet.findMany<{ select: typeof listSelect; orderBy: unknown }>>>;
    try {
      reviewSets = await prisma.reviewSet.findMany({
        select: listSelect,
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      });
    } catch (orderErr: any) {
      if (orderErr?.message?.includes("order") || orderErr?.code === "P2009") {
        reviewSets = await prisma.reviewSet.findMany({
          select: listSelect,
          orderBy: { createdAt: "desc" },
        });
      } else throw orderErr;
    }

    const maxOrder =
      reviewSets.length > 0 ? Math.max(...reviewSets.map((s) => s.order ?? 0)) : -1;
    const result = reviewSets.map((set) => {
      const order = set.order ?? 0;
      return {
      id: set.id,
      slug: set.slug ?? set.id,
      title: set.title,
      description: set.description,
      icon: null,
      isDefault: order === maxOrder,
      createdAt: set.createdAt.toISOString(),
      updatedAt: set.updatedAt.toISOString(),
      _count: {
        images: set._count.images,
        links: set._count.links,
        ratings: set.links.reduce((s, l) => s + (l._count?.ratings ?? 0), 0),
      },
      firstLink: set.links.length > 0 ? {
        token: set.links[0].token,
        adminToken: (set.links[0] as { adminToken?: string | null }).adminToken ?? null,
      } : null,
    };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching review sets:", error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
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
  try {
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
        { error: "Name must contain at least one letter or number" },
        { status: 400 }
      );
    }

    // Проверяем уникальность slug (select только id — колонка icon может отсутствовать в БД)
    const existing = await prisma.reviewSet.findUnique({
      where: { slug: finalSlug },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A project with this name already exists" },
        { status: 400 }
      );
    }

    const icon = body.icon != null ? String(body.icon).trim().slice(0, 20) || null : null;
    const top = await prisma.reviewSet.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
    const maxOrder = (top?.order ?? -1) + 1;
    const reviewSet = await prisma.reviewSet.create({
      data: {
        title,
        slug: finalSlug,
        description: description || null,
        icon: icon || undefined,
        order: maxOrder,
      },
    });

    return NextResponse.json({
      id: reviewSet.id,
      title: reviewSet.title,
      slug: (reviewSet as any).slug || finalSlug,
      description: reviewSet.description,
      icon: (reviewSet as any).icon ?? null,
      createdAt: reviewSet.createdAt.toISOString(),
      updatedAt: reviewSet.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating review set:", error);

    if (error.code === "P2002" && error.meta?.target?.includes("slug")) {
      return NextResponse.json(
        { error: "A project with this name already exists" },
        { status: 400 }
      );
    }

    const msg = String(error?.message ?? "");
    if (msg.includes("icon") && msg.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "В базе нет колонки icon. Выполните один раз: npx prisma db execute --file prisma/add-icon-column.sql",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
