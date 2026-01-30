import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { PrismaClient } = await import('@prisma/client');
  const prismaInstance = new PrismaClient();
  
  try {
    const reviewSet = await prismaInstance.reviewSet.findUnique({
      where: { id: params.id },
    });

    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    // Генерируем adminToken вручную, если БД не поддерживает default
    const adminToken = randomBytes(16).toString('hex');

    const link = await prismaInstance.reviewLink.create({
      data: {
        reviewSetId: params.id,
        adminToken: adminToken,
        maxSessions: 1,
        allowResume: true,
        expiresAt: null,
      },
    });

    return NextResponse.json({
      id: link.id,
      token: link.token,
      adminToken: (link as any).adminToken || adminToken,
      reviewSetId: link.reviewSetId,
      maxSessions: link.maxSessions,
      allowResume: link.allowResume,
      expiresAt: link.expiresAt?.toISOString() || null,
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating link:", error);
    
    // Если ошибка из-за отсутствия колонки, пробуем без adminToken
    if (error.message?.includes('adminToken')) {
      try {
        const link = await prismaInstance.reviewLink.create({
          data: {
            reviewSetId: params.id,
            maxSessions: 1,
            allowResume: true,
            expiresAt: null,
          },
        });
        return NextResponse.json({
          id: link.id,
          token: link.token,
          adminToken: null,
          reviewSetId: link.reviewSetId,
          maxSessions: link.maxSessions,
          allowResume: link.allowResume,
          expiresAt: link.expiresAt?.toISOString() || null,
          createdAt: link.createdAt.toISOString(),
          updatedAt: link.updatedAt.toISOString(),
        });
      } catch (e2: any) {
        return NextResponse.json(
          { error: e2.message || "Internal server error" },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prismaInstance.$disconnect();
  }
}
