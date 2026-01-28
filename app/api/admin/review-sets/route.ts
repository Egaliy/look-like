import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/localStorage";

export async function GET() {
  try {
    const reviewSets = storage.getReviewSets();
    const images = storage.getImages("");
    const links = storage.getLinks("");

    // Группируем по reviewSetId для подсчета
    const imagesBySet: Record<string, number> = {};
    const linksBySet: Record<string, number> = {};

    images.forEach((img) => {
      imagesBySet[img.reviewSetId] = (imagesBySet[img.reviewSetId] || 0) + 1;
    });

    links.forEach((link) => {
      linksBySet[link.reviewSetId] = (linksBySet[link.reviewSetId] || 0) + 1;
    });

    const result = reviewSets.map((set) => ({
      ...set,
      _count: {
        images: imagesBySet[set.id] || 0,
        links: linksBySet[set.id] || 0,
      },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching review sets:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const reviewSet = storage.createReviewSet({
      title,
      description: description || null,
    });

    return NextResponse.json(reviewSet);
  } catch (error) {
    console.error("Error creating review set:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
