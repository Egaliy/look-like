import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Проверка без БД: приложение запущено и отвечает.
 * Вызов: GET /api/ping
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    step: "app",
    message: "Приложение запущено, БД не проверялась",
    ts: new Date().toISOString(),
  });
}
