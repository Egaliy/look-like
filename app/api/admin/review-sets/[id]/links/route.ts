import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Generate a secure random token
    const token = randomBytes(32).toString("hex");

    const link = await prisma.reviewLink.create({
      data: {
        token,
        reviewSetId: params.id,
        maxSessions: 1,
        allowResume: true,
      },
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
