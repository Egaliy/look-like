import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureReviewSetColumns } from "@/lib/ensure-review-set-columns";

export async function GET() {
  try {
    await ensureReviewSetColumns();
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
    const listSelectNoOrder = {
      id: true,
      title: true,
      slug: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { images: true, links: true } },
      links: {
        take: 1,
        orderBy: { createdAt: "desc" as const },
        select: { token: true, adminToken: true, _count: { select: { ratings: true } } },
      },
    } as const;
    type SetRow = Awaited<ReturnType<typeof prisma.reviewSet.findMany<{ select: typeof listSelect; orderBy: [{ order: "asc" }, { createdAt: "desc" }] }>>>[number];
    type SetRowNoOrder = Awaited<ReturnType<typeof prisma.reviewSet.findMany<{ select: typeof listSelectNoOrder; orderBy: { createdAt: "desc" } }>>>[number];
    let reviewSets: SetRow[] | SetRowNoOrder[];
    let useOrder = true;
    try {
      reviewSets = await prisma.reviewSet.findMany({
        select: listSelect,
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      });
    } catch (orderErr: any) {
      if (orderErr?.message?.includes("order") || orderErr?.code === "P2009") {
        reviewSets = await prisma.reviewSet.findMany({
          select: listSelectNoOrder,
          orderBy: { createdAt: "desc" },
        });
        useOrder = false;
      } else throw orderErr;
    }

    const result = reviewSets.map((set) => {
      return {
      id: set.id,
      slug: set.slug ?? set.id,
      title: set.title,
      description: set.description,
      icon: null,
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

// Функция для создания slug из title (должна совпадать с фронтом)
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '-') // только буквы, цифры, подчёркивание, дефис
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    await ensureReviewSetColumns();
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
    let maxOrder = 0;
    try {
      const top = await prisma.reviewSet.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
      maxOrder = (top?.order ?? -1) + 1;
    } catch (_) {
      const count = await prisma.reviewSet.count();
      maxOrder = count;
    }

    type ReviewSetRow = { id: string; title: string; slug: string; description: string | null; order: number; createdAt: Date; updatedAt: Date };
    let reviewSet: ReviewSetRow;
    try {
      const created = await prisma.reviewSet.create({
        data: {
          title,
          slug: finalSlug,
          description: description || null,
          icon: icon || undefined,
          order: maxOrder,
        },
      });
      reviewSet = {
        id: created.id,
        title: created.title,
        slug: (created as { slug?: string }).slug ?? finalSlug,
        description: created.description,
        order: (created as { order?: number }).order ?? maxOrder,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    } catch (createErr: any) {
      const msg = String(createErr?.message ?? "");
      if (msg.includes("isDefault") && msg.includes("does not exist")) {
        const { randomBytes } = await import("crypto");
        const id = "c" + randomBytes(12).toString("hex");
        const now = new Date();
        await prisma.$executeRawUnsafe(
          `INSERT INTO review_sets (id, title, slug, description, "order", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $6)`,
          id,
          title,
          finalSlug,
          description ?? null,
          maxOrder,
          now
        );
        reviewSet = { id, title, slug: finalSlug, description: description || null, order: maxOrder, createdAt: now, updatedAt: now };
      } else if (msg.includes("icon") && msg.includes("does not exist")) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE review_sets ADD COLUMN IF NOT EXISTS icon TEXT`);
          const created = await prisma.reviewSet.create({
            data: { title, slug: finalSlug, description: description || null, icon: icon || undefined, order: maxOrder },
          });
          reviewSet = {
            id: created.id,
            title: created.title,
            slug: (created as { slug?: string }).slug ?? finalSlug,
            description: created.description,
            order: (created as { order?: number }).order ?? maxOrder,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
          };
        } catch (retryErr: any) {
          console.error("Error creating review set (retry):", retryErr);
          return NextResponse.json(
            { error: retryErr?.message || "Failed to create project" },
            { status: 500 }
          );
        }
      } else throw createErr;
    }

    return NextResponse.json({
      id: reviewSet.id,
      title: reviewSet.title,
      slug: reviewSet.slug,
      description: reviewSet.description,
      icon: null,
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
