# Миграции (если Prisma ругается на isDefault / maxImagesToRate)

Если при «Set standard» или при сохранении лимита фото появляется ошибка **Unknown argument 'isDefault'** (или про `maxImagesToRate`), в базе нет нужных колонок и/или не перегенерирован клиент Prisma.

## 1. Добавить колонки в БД

Выполните в своей БД (Supabase SQL Editor или `psql`) **один раз**:

```sql
-- Стандартная папка
ALTER TABLE review_sets ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Лимит фото на оценку (null = все)
ALTER TABLE review_sets ADD COLUMN IF NOT EXISTS "maxImagesToRate" INTEGER NULL;

-- Иконка проекта (эмодзи, как в Notion)
ALTER TABLE review_sets ADD COLUMN IF NOT EXISTS "icon" TEXT NULL;

-- Порядок проектов (перетаскивание)
ALTER TABLE review_sets ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
```

Либо из корня проекта:

```bash
npx prisma db push
```

## 2. Перегенерировать клиент Prisma

```bash
npx prisma generate
```

## 3. Перезапустить приложение

Перезапустите `npm run dev` (или сервер), чтобы подхватить новый клиент.

После этого кнопка «Set standard» и лимит фото должны работать.
