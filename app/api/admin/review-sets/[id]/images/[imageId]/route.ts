import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    // Проверяем, что изображение принадлежит проекту
    const image = await prisma.imageAsset.findUnique({
      where: { id: params.imageId },
    });

    if (!image || image.reviewSetId !== params.id) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Удаляем файл с диска, если есть
    if (image.filePath) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', image.filePath);
        await fs.unlink(filePath).catch(() => {}); // Игнорируем ошибки удаления файла
      } catch (e) {
        // Игнорируем ошибки файловой системы
      }
    }

    await prisma.imageAsset.delete({
      where: { id: params.imageId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
