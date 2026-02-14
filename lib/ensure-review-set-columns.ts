import { prisma } from "@/lib/prisma";

let _done: boolean | null = null;

/**
 * Добавляет в review_sets колонки, которых может не быть в старых БД.
 * Вызывать в начале GET/POST /api/admin/review-sets и GET/PATCH/DELETE /api/admin/review-sets/[id].
 */
export async function ensureReviewSetColumns(): Promise<void> {
  if (_done) return;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE review_sets ADD COLUMN IF NOT EXISTS icon TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE review_sets ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0`);
    await prisma.$executeRawUnsafe(`ALTER TABLE review_sets ADD COLUMN IF NOT EXISTS "maxImagesToRate" INTEGER`);
    _done = true;
  } catch (e) {
    console.warn("ensureReviewSetColumns:", e);
  }
}
