import { PrismaClient } from '@prisma/client'

// Сразу правим DATABASE_URL для PgBouncer/Supabase — иначе "prepared statement does not exist"
const raw = process.env.DATABASE_URL
if (raw && !raw.includes('pgbouncer=true')) {
  process.env.DATABASE_URL = raw.includes('?') ? `${raw}&pgbouncer=true` : `${raw}?pgbouncer=true`
}

// Чтобы приложение не падало при старте без .env — подставляем заглушку (запросы к БД потом упадут, но старт пройдёт)
const dbUrl = process.env.DATABASE_URL?.trim() || 'postgresql://localhost:5432/__no_db_placeholder__'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasources: { db: { url: dbUrl } },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
