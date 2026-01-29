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

    const result = reviewSets.map((set) => ({
      id: set.id,
      title: set.title,
      description: set.description,
      createdAt: set.createdAt.toISOString(),
      updatedAt: set.updatedAt.toISOString(),
      _count: {
        images: set._count.images,
        links: set._count.links,
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

    const reviewSet = await prisma.reviewSet.create({
      data: {
        title,
        description: description || null,
      },
    });

    return NextResponse.json({
      id: reviewSet.id,
      title: reviewSet.title,
      description: reviewSet.description,
      createdAt: reviewSet.createdAt.toISOString(),
      updatedAt: reviewSet.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating review set:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
