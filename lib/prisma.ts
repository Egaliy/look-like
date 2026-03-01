import { PrismaClient } from "@prisma/client";

/**
 * Во время next build (NEXT_PHASE=phase-production-build) не создаём реальный клиент,
 * чтобы при "collect page data" на Vercel не было обращений к БД.
 * Роуты делают ранний return по NEXT_PHASE и не вызывают prisma; если что-то вызовет —
 * получит явную ошибку.
 */
const isBuild =
  typeof process !== "undefined" &&
  process.env.NEXT_PHASE === "phase-production-build";

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (raw && !raw.includes("pgbouncer=true")) {
    process.env.DATABASE_URL = raw.includes("?")
      ? `${raw}&pgbouncer=true`
      : `${raw}?pgbouncer=true`;
  }
  const dbUrl =
    process.env.DATABASE_URL?.trim() ||
    "postgresql://localhost:5432/__no_db_placeholder__";

  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
  };
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
    datasources: { db: { url: dbUrl } },
  });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

/** Заглушка на время сборки: любой доступ к prisma.* бросает ошибку (роуты не должны доходить до этого). */
const buildStub = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    throw new Error(
      `Prisma is disabled during Next.js production build. Route handlers must return early when process.env.NEXT_PHASE === "phase-production-build".`
    );
  },
});

export const prisma: PrismaClient = isBuild ? buildStub : createPrismaClient();
