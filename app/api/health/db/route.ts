import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Проверка только БД. Вызов: GET /api/health/db
 * Если 200 — БД доступна. Если 500 — смотри body.error
 */
export async function GET() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.json({ ok: true, build: "skip" });
  }
  const hasUrl = !!process.env.DATABASE_URL?.trim();
  if (!hasUrl) {
    return NextResponse.json(
      { ok: false, step: "db", error: "DATABASE_URL не задан в .env" },
      { status: 500 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      step: "db",
      message: "Подключение к БД успешно",
      ts: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    const hint =
      /prepared statement/i.test(String(err))
        ? "Добавь ?pgbouncer=true в конец DATABASE_URL (Supabase)."
        : /allow_list|address not in/i.test(String(err))
          ? "Добавь IP сервера в Supabase → Settings → Database → Network restrictions."
          : "";
    return NextResponse.json(
      {
        ok: false,
        step: "db",
        error: err,
        hint: hint || undefined,
        ts: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
