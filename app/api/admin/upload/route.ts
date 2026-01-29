import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import JSZip from "jszip";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const reviewSetId = formData.get("reviewSetId") as string;

    if (!file || !reviewSetId) {
      return NextResponse.json(
        { error: "File and reviewSetId are required" },
        { status: 400 }
      );
    }

    const uploadsDir = join(process.cwd(), "public", "uploads", reviewSetId);
    
    // Создаем директорию если не существует
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Проверяем, это ZIP файл или изображение
    const fileName = file.name.toLowerCase();
    const isZip = fileName.endsWith(".zip");

    if (isZip) {
      // Обрабатываем ZIP архив
      const files: string[] = [];
      
      try {
        // Распаковываем ZIP с помощью JSZip
        const zip = await JSZip.loadAsync(buffer);
        
        for (const [filename, file] of Object.entries(zip.files)) {
          if (file.dir) continue; // Пропускаем директории
          
          const entryName = filename.split("/").pop() || filename;
          const ext = entryName.toLowerCase().split(".").pop();
          
          // Проверяем, что это изображение
          if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
            const content = await file.async("nodebuffer");
            const safeFileName = entryName.replace(/[^a-zA-Z0-9._-]/g, "_");
            const filePath = join(uploadsDir, safeFileName);
            await writeFile(filePath, content);
            files.push(`/uploads/${reviewSetId}/${safeFileName}`);
          }
        }
      } catch (zipError) {
        console.error("Error extracting ZIP:", zipError);
        return NextResponse.json(
          { error: "Failed to extract ZIP file" },
          { status: 400 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        files,
        message: `Extracted ${files.length} images from ZIP` 
      });
    } else {
      // Обрабатываем одиночный файл
      const ext = fileName.split(".").pop();
      if (!["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
        return NextResponse.json(
          { error: "Invalid file type. Only images are allowed." },
          { status: 400 }
        );
      }

      const timestamp = Date.now();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileNameSafe = `${timestamp}_${safeFileName}`;
      const filePath = join(uploadsDir, fileNameSafe);
      await writeFile(filePath, buffer);

      return NextResponse.json({
        success: true,
        filePath: `/uploads/${reviewSetId}/${fileNameSafe}`,
      });
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
