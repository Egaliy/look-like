import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/localStorage";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const reviewLink = storage.getLinkByToken(params.token);

    if (!reviewLink) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (reviewLink.expiresAt && new Date(reviewLink.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    const reviewSet = storage.getReviewSet(reviewLink.reviewSetId);
    if (!reviewSet) {
      return NextResponse.json({ error: "Review set not found" }, { status: 404 });
    }

    const images = storage.getImages(reviewLink.reviewSetId).sort(
      (a, b) => a.order - b.order
    );

    return NextResponse.json({
      reviewSet: {
        id: reviewSet.id,
        title: reviewSet.title,
      },
      images: images.map((img) => ({
        id: img.id,
        url: img.url,
        title: img.title,
        order: img.order,
      })),
    });
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
