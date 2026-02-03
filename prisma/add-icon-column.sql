-- Добавляет колонки icon, order, maxImagesToRate в review_sets, если их ещё нет.
-- Выполните один раз при ошибках про эти колонки:
--   psql "$DATABASE_URL" -f prisma/add-icon-column.sql
-- или: npx prisma db execute --file prisma/add-icon-column.sql
ALTER TABLE review_sets ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE review_sets ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;
ALTER TABLE review_sets ADD COLUMN IF NOT EXISTS "maxImagesToRate" INTEGER;
