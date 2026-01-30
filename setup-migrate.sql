-- Миграция: добавить недостающие колонки к уже созданным таблицам
-- Выполните в Supabase SQL Editor, если таблицы уже созданы старым setup.sql

-- review_sets: slug
ALTER TABLE "review_sets" ADD COLUMN IF NOT EXISTS "slug" TEXT;
-- Заполнить slug для существующих строк (уникально по id)
UPDATE "review_sets" SET "slug" = "id" WHERE "slug" IS NULL OR "slug" = '';
ALTER TABLE "review_sets" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "review_sets_slug_key" ON "review_sets"("slug");
CREATE INDEX IF NOT EXISTS "review_sets_slug_idx" ON "review_sets"("slug");
ALTER TABLE "review_sets" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- image_assets: filePath, url сделать nullable
ALTER TABLE "image_assets" ADD COLUMN IF NOT EXISTS "filePath" TEXT;
ALTER TABLE "image_assets" ALTER COLUMN "url" DROP NOT NULL;

-- review_links: adminToken
ALTER TABLE "review_links" ADD COLUMN IF NOT EXISTS "adminToken" TEXT;
UPDATE "review_links" SET "adminToken" = "token" WHERE "adminToken" IS NULL;
ALTER TABLE "review_links" ALTER COLUMN "adminToken" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "review_links_adminToken_key" ON "review_links"("adminToken");
CREATE INDEX IF NOT EXISTS "review_links_adminToken_idx" ON "review_links"("adminToken");
ALTER TABLE "review_links" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- ratings: clientId; изменить уникальность
ALTER TABLE "ratings" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
UPDATE "ratings" SET "clientId" = "id" WHERE "clientId" IS NULL;
ALTER TABLE "ratings" ALTER COLUMN "clientId" SET NOT NULL;
DROP INDEX IF EXISTS "ratings_reviewLinkId_imageId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ratings_reviewLinkId_imageId_clientId_key" ON "ratings"("reviewLinkId", "imageId", "clientId");
CREATE INDEX IF NOT EXISTS "ratings_reviewLinkId_imageId_clientId_idx" ON "ratings"("reviewLinkId", "imageId", "clientId");

-- AdminUser: default для updatedAt
ALTER TABLE "AdminUser" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
