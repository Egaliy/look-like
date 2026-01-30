import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewSet = await prisma.reviewSet.findUnique({
      where: { id: params.id },
      include: {
        images: {
          orderBy: {
            order: "asc",
          },
        },
        links: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: reviewSet.id,
      title: reviewSet.title,
      slug: (reviewSet as any).slug || null,
      description: reviewSet.description,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewSet = await prisma.reviewSet.findUnique({
      where: { id: params.id },
      include: {
        images: true,
      },
    });

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

    // Удаляем проект (каскадно удалятся все связанные данные)
    await prisma.reviewSet.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting review set:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
