import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/localStorage";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { url, title } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Проверяем, что review set существует
    const reviewSet = storage.getReviewSet(params.id);
    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    // Get current max order
    const images = storage.getImages(params.id);
    const maxOrder = images.length > 0 
      ? Math.max(...images.map(img => img.order))
      : -1;

    const image = storage.createImage({
      reviewSetId: params.id,
      url,
      title: title || null,
      order: maxOrder + 1,
    });

    return NextResponse.json(image);
  } catch (error) {
    console.error("Error adding image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
