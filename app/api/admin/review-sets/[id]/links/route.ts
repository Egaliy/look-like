import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/localStorage";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем, что review set существует
    const reviewSet = storage.getReviewSet(params.id);
    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    const link = storage.createLink({
      reviewSetId: params.id,
      maxSessions: 1,
      allowResume: true,
      expiresAt: null,
    });

    return NextResponse.json(link);
  } catch (error) {
    console.error("Error creating link:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
