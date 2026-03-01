#!/usr/bin/env node
/**
 * Проверка подключения к БД и основных таблиц.
 * Запуск из корня: node scripts/check-db.mjs
 * Подхватывает .env из текущей директории.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}
const raw = process.env.DATABASE_URL;
if (raw && !raw.includes("pgbouncer=true")) {
  process.env.DATABASE_URL = raw.includes("?") ? `${raw}&pgbouncer=true` : `${raw}?pgbouncer=true`;
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const checks = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: "Подключение", ok: true });
  } catch (e) {
    checks.push({ name: "Подключение", ok: false, error: String(e?.message || e) });
    console.log(JSON.stringify(checks, null, 2));
    process.exit(1);
  }

  try {
    const count = await prisma.reviewSet.count();
    checks.push({ name: "review_sets", ok: true, count });
  } catch (e) {
    checks.push({ name: "review_sets", ok: false, error: String(e?.message || e) });
  }

  try {
    const count = await prisma.reviewLink.count();
    checks.push({ name: "review_links", ok: true, count });
  } catch (e) {
    checks.push({ name: "review_links", ok: false, error: String(e?.message || e) });
  }

  try {
    const count = await prisma.imageAsset.count();
    checks.push({ name: "image_assets", ok: true, count });
  } catch (e) {
    checks.push({ name: "image_assets", ok: false, error: String(e?.message || e) });
  }

  try {
    const count = await prisma.rating.count();
    checks.push({ name: "ratings", ok: true, count });
  } catch (e) {
    checks.push({ name: "ratings", ok: false, error: String(e?.message || e) });
  }

  try {
    const count = await prisma.adminUser.count();
    checks.push({ name: "AdminUser", ok: true, count });
  } catch (e) {
    checks.push({ name: "AdminUser", ok: false, error: String(e?.message || e) });
  }

  console.log(JSON.stringify(checks, null, 2));
  const failed = checks.filter((c) => !c.ok);
  if (failed.length) process.exit(1);
}

main()
  .finally(() => prisma.$disconnect());
