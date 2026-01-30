import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

interface CheckResult {
  ok: boolean;
  message?: string;
  detail?: string;
}

export async function GET() {
  const checks: Record<string, CheckResult> = {};
  let allOk = true;

  // 1. База данных
  try {
    await prisma.$queryRaw`SELECT 1`;
    const count = await prisma.reviewSet.count().catch(() => 0);
    checks.database = { ok: true, message: "Подключена", detail: `Проектов: ${count}` };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    checks.database = { ok: false, message: "Ошибка", detail: err };
    allOk = false;
  }

  // 2. Переменные окружения (только факт наличия, без значений)
  const envVars = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"] as const;
  const envStatus: string[] = [];
  let envOk = true;
  for (const key of envVars) {
    const val = process.env[key];
    if (val && val.length > 0) envStatus.push(`${key}=✓`);
    else {
      envStatus.push(`${key}=✗`);
      if (key === "DATABASE_URL") envOk = false;
    }
  }
  checks.env = {
    ok: envOk,
    message: envOk ? "Настроены" : "Не хватает переменных",
    detail: envStatus.join(", "),
  };
  if (!envOk) allOk = false;

  // 3. S3 (опционально) — только проверка наличия ключей
  const s3Keys = ["S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET_NAME"];
  const s3Configured = s3Keys.every((k) => {
    const v = process.env[k];
    return v != null && v.length > 0;
  });
  checks.s3 = {
    ok: true,
    message: s3Configured ? "Настроен (ключи заданы)" : "Не используется",
    detail: s3Configured ? "Опциональное хранилище включено" : "Загрузки идут в public/uploads",
  };

  // 4. Директория загрузок (доступ на запись)
  const uploadsRoot = join(process.cwd(), "public", "uploads");
  try {
    if (!existsSync(uploadsRoot)) {
      mkdirSync(uploadsRoot, { recursive: true });
    }
    const testFile = join(uploadsRoot, ".health-check");
    writeFileSync(testFile, "ok", "utf8");
    unlinkSync(testFile);
    checks.uploads = { ok: true, message: "Доступна для записи", detail: uploadsRoot };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    checks.uploads = { ok: false, message: "Нет доступа", detail: err };
    allOk = false;
  }

  return NextResponse.json({
    ok: allOk,
    checks,
    timestamp: new Date().toISOString(),
  });
}
