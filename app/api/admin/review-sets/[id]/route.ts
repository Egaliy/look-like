import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureReviewSetColumns } from "@/lib/ensure-review-set-columns";

/** Cuid обычно начинается с "c" и имеет фиксированную длину. Иначе считаем, что передан slug. */
function isCuid(value: string): boolean {
  return /^c[a-z0-9]{24}$/i.test(value);
}

/** select без icon — колонка icon может отсутствовать в БД */
const reviewSetSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  order: true,
  maxImagesToRate: true,
  createdAt: true,
  updatedAt: true,
  images: {
    orderBy: { order: "asc" as const },
    select: {
      id: true,
      reviewSetId: true,
      url: true,
      filePath: true,
      order: true,
      title: true,
      metadata: true,
      createdAt: true,
    },
  },
  links: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      token: true,
      adminToken: true,
      reviewSetId: true,
      maxSessions: true,
      allowResume: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

async function findReviewSetByIdOrSlug(idOrSlug: string) {
  if (isCuid(idOrSlug)) {
    const byId = await prisma.reviewSet.findUnique({
      where: { id: idOrSlug },
      select: reviewSetSelect,
    });
    if (byId) return byId;
  }
  return prisma.reviewSet.findUnique({
    where: { slug: idOrSlug },
    select: reviewSetSelect,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureReviewSetColumns();
    const reviewSet = await findReviewSetByIdOrSlug(params.id);
    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: reviewSet.id,
      title: reviewSet.title,
      slug: reviewSet.slug ?? null,
      description: reviewSet.description,
      icon: null as string | null,
      maxImagesToRate: reviewSet.maxImagesToRate ?? null,
      createdAt: reviewSet.createdAt.toISOString(),
      updatedAt: reviewSet.updatedAt.toISOString(),
      images: reviewSet.images.map((img) => ({
        id: img.id,
        reviewSetId: img.reviewSetId,
        url: img.url,
        filePath: img.filePath,
        order: img.order,
        title: img.title,
        metadata: img.metadata,
        createdAt: img.createdAt.toISOString(),
      })),
      links: reviewSet.links.map((link: any) => ({
        id: link.id,
        token: link.token,
        adminToken: link.adminToken || null,
        reviewSetId: link.reviewSetId,
        maxSessions: link.maxSessions,
        allowResume: link.allowResume,
        expiresAt: link.expiresAt?.toISOString() || null,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("Error fetching review set:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureReviewSetColumns();
    const reviewSet = await findReviewSetByIdOrSlug(params.id);
    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const updateData: { maxImagesToRate?: number | null; icon?: string | null } = {};
    if (Object.prototype.hasOwnProperty.call(body, "icon")) {
      const v = body.icon;
      updateData.icon = v === null || v === "" ? null : String(v).trim().slice(0, 20) || null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "maxImagesToRate")) {
      const v = body.maxImagesToRate;
      updateData.maxImagesToRate =
        v === null || v === "" ? null : Math.max(1, Math.min(Number.parseInt(String(v), 10) || 40, 9999));
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.reviewSet.update({
        where: { id: reviewSet.id },
        data: updateData,
      });
    }
    const updated = await prisma.reviewSet.findUnique({
      where: { id: reviewSet.id },
      select: { id: true, title: true, slug: true, description: true, order: true, maxImagesToRate: true, createdAt: true, updatedAt: true },
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      slug: updated.slug ?? null,
      description: updated.description ?? null,
      icon: null as string | null,
      maxImagesToRate: updated.maxImagesToRate ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error updating review set:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureReviewSetColumns();
    const reviewSet = await findReviewSetByIdOrSlug(params.id);
    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    // Удаляем файлы с диска
    const fs = await import('fs/promises');
    const path = await import('path');
    for (const img of reviewSet.images) {
      if (img.filePath) {
        try {
          const filePath = path.join(process.cwd(), 'public', img.filePath);
          await fs.unlink(filePath).catch(() => {});
        } catch (e) {
          // Игнорируем ошибки
        }
      }
    }

    const id = reviewSet.id;
    try {
      await prisma.reviewSet.delete({
        where: { id },
      });
    } catch (deleteErr: any) {
      if (String(deleteErr?.message ?? "").includes("isDefault") && String(deleteErr?.message ?? "").includes("does not exist")) {
        await prisma.$executeRawUnsafe(`DELETE FROM review_sets WHERE id = $1`, id);
      } else throw deleteErr;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting review set:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
