import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const reviewSets = await prisma.reviewSet.findMany({
      include: {
        _count: {
          select: {
            images: true,
            links: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(reviewSets);
  } catch (error) {
    console.error("Error fetching review sets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    const reviewSet = await prisma.reviewSet.create({
      data: {
        title,
        description: description || null,
      },
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
