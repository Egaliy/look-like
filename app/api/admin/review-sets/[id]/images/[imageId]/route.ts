import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  const { PrismaClient } = await import('@prisma/client');
  const prismaInstance = new PrismaClient();
  
  try {
    // Проверяем, что изображение принадлежит проекту
    const image = await prismaInstance.imageAsset.findUnique({
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

    await prismaInstance.imageAsset.delete({
      where: { id: params.imageId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prismaInstance.$disconnect();
  }
}
