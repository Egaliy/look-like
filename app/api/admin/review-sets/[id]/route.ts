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
          orderBy: { order: "asc" },
        },
        links: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(reviewSet);
  } catch (error) {
    console.error("Error fetching review set:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
