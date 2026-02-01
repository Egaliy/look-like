import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Возвращает ссылку (token) на стандартный проект.
 * Стандартный = последняя папка в списке (максимальный order).
 * Главная страница / редиректит на /r/{token}.
 */
export async function GET() {
  try {
    let reviewSet: { links: { token: string }[] } | null = null;
    try {
      reviewSet = await prisma.reviewSet.findFirst({
        orderBy: [{ order: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          links: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { token: true },
          },
        },
      });
    } catch (orderErr: any) {
      if (orderErr?.message?.includes("order") || orderErr?.code === "P2009") {
        reviewSet = await prisma.reviewSet.findFirst({
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            links: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: { token: true },
            },
          },
        });
      } else throw orderErr;
    }

    if (!reviewSet || reviewSet.links.length === 0) {
      return NextResponse.json({ error: "No default project or link" }, { status: 404 });
    }

    return NextResponse.json({ token: reviewSet.links[0].token });
  } catch (error: any) {
    console.error("Error fetching default link:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
