import { PrismaClient } from '@prisma/client'

// Сразу правим DATABASE_URL для PgBouncer/Supabase — иначе "prepared statement does not exist"
const raw = process.env.DATABASE_URL
if (raw && !raw.includes('pgbouncer=true')) {
  process.env.DATABASE_URL = raw.includes('?') ? `${raw}&pgbouncer=true` : `${raw}?pgbouncer=true`
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasources: { db: { url: process.env.DATABASE_URL } },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
