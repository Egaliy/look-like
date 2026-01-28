import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/localStorage";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewSet = storage.getReviewSet(params.id);

    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    const images = storage.getImages(params.id).sort((a, b) => a.order - b.order);
    const links = storage.getLinks(params.id).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      ...reviewSet,
      images,
      links,
    });
  } catch (error) {
    console.error("Error fetching review set:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
