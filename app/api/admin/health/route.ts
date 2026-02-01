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

  // 1. База данных (без raw/prepared statements — совместимо с PgBouncer/Supabase pooler)
  try {
    const count = await prisma.reviewSet.count();
    checks.database = { ok: true, message: "Connected", detail: `Projects: ${count}` };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    const errStr = String(err);
    const isPgbouncer = /prepared statement .* does not exist/i.test(errStr);
    const isAllowList = /address not in tenant allow_list|allow_list/i.test(errStr);
    let detail = errStr;
    if (isPgbouncer) {
      detail = `${errStr}\n\nHint: add ?pgbouncer=true to the end of DATABASE_URL in .env (for Supabase/PgBouncer). Restart the server (npm run dev) after changing.`;
    } else if (isAllowList) {
      detail = `${errStr}\n\nFix: add this server's IP to the database allow list. In Supabase: Project → Settings → Database → Network → "Restrict connections" → add your IP or use 0.0.0.0/0 for development.`;
    }
    checks.database = {
      ok: false,
      message: "Error",
      detail,
    };
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
    message: envOk ? "Set" : "Missing variables",
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
    message: s3Configured ? "Configured" : "Not used",
    detail: s3Configured ? "Optional storage enabled" : "Uploads go to public/uploads",
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
    checks.uploads = { ok: true, message: "Writable", detail: uploadsRoot };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    checks.uploads = { ok: false, message: "No access", detail: err };
    allOk = false;
  }

  return NextResponse.json({
    ok: allOk,
    checks,
    timestamp: new Date().toISOString(),
  });
}
