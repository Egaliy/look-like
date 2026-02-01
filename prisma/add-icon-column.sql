-- Добавляет колонку icon в review_sets, если её ещё нет.
-- Выполните один раз, если при создании проектов появляется ошибка про колонку icon:
--   psql "$DATABASE_URL" -f prisma/add-icon-column.sql
-- или через Prisma: npx prisma db execute --file prisma/add-icon-column.sql
ALTER TABLE review_sets ADD COLUMN IF NOT EXISTS icon TEXT;
