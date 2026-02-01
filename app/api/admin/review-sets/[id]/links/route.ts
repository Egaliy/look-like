import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewSet = await prisma.reviewSet.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, title: true },
    });

    if (!reviewSet) {
      return NextResponse.json(
        { error: "Review set not found" },
        { status: 404 }
      );
    }

    const slug = reviewSet.slug;
    if (!slug) {
      // Если slug нет, генерируем из title
      const fallbackSlug = reviewSet.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      if (!fallbackSlug) {
        return NextResponse.json(
          { error: "Could not create slug from project name" },
          { status: 400 }
        );
      }
      
      // Используем fallback slug
      const existingLink = await prisma.reviewLink.findUnique({
        where: { token: fallbackSlug },
      });

      if (existingLink) {
        return NextResponse.json({
          id: existingLink.id,
          token: existingLink.token,
          adminToken: (existingLink as any).adminToken || null,
          reviewSetId: existingLink.reviewSetId,
          maxSessions: existingLink.maxSessions,
          allowResume: existingLink.allowResume,
          expiresAt: existingLink.expiresAt?.toISOString() || null,
          createdAt: existingLink.createdAt.toISOString(),
          updatedAt: existingLink.updatedAt.toISOString(),
        });
      }
      
      // Создаем ссылку с fallback slug
      const adminToken = randomBytes(16).toString('hex');
      try {
        const link = await prisma.reviewLink.create({
          data: {
            reviewSetId: params.id,
            token: fallbackSlug,
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
      } catch (createError: any) {
        if (createError.message?.includes('adminToken') || createError.message?.includes('admin_token')) {
          const link = await prisma.reviewLink.create({
            data: {
              reviewSetId: params.id,
              token: fallbackSlug,
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
        }
        throw createError;
      }
    }

    // Проверяем, не существует ли уже ссылка с таким token
    const existingLink = await prisma.reviewLink.findUnique({
      where: { token: slug },
    });

    if (existingLink) {
      // Если ссылка уже существует, возвращаем её
      return NextResponse.json({
        id: existingLink.id,
        token: existingLink.token,
        adminToken: (existingLink as any).adminToken || null,
        reviewSetId: existingLink.reviewSetId,
        maxSessions: existingLink.maxSessions,
        allowResume: existingLink.allowResume,
        expiresAt: existingLink.expiresAt?.toISOString() || null,
        createdAt: existingLink.createdAt.toISOString(),
        updatedAt: existingLink.updatedAt.toISOString(),
      });
    }

    const adminToken = randomBytes(16).toString('hex');

    try {
      const link = await prisma.reviewLink.create({
        data: {
          reviewSetId: params.id,
          token: slug, // Используем slug как token
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
    } catch (createError: any) {
      // Если ошибка из-за отсутствия колонки adminToken, пробуем без неё
      if (createError.message?.includes('adminToken') || createError.message?.includes('admin_token')) {
        console.warn("adminToken column missing, creating link without it");
        const link = await prisma.reviewLink.create({
          data: {
            reviewSetId: params.id,
            token: slug,
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
      }
      throw createError;
    }
  } catch (error: any) {
    console.error("Error creating link:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
