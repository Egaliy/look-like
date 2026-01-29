-- Обновление схемы базы данных для новых функций
-- Выполните в Supabase SQL Editor

-- Добавить adminToken в review_links
ALTER TABLE "review_links" 
ADD COLUMN IF NOT EXISTS "adminToken" TEXT;

-- Создать уникальный индекс для adminToken
CREATE UNIQUE INDEX IF NOT EXISTS "review_links_adminToken_key" ON "review_links"("adminToken");

-- Добавить filePath в image_assets
ALTER TABLE "image_assets" 
ADD COLUMN IF NOT EXISTS "filePath" TEXT;

-- Изменить url на nullable (так как теперь может быть filePath)
ALTER TABLE "image_assets" 
ALTER COLUMN "url" DROP NOT NULL;

-- Добавить clientId в ratings
ALTER TABLE "ratings" 
ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- Удалить старый уникальный индекс
DROP INDEX IF EXISTS "ratings_reviewLinkId_imageId_key";

-- Создать новый уникальный индекс с clientId
CREATE UNIQUE INDEX IF NOT EXISTS "ratings_reviewLinkId_imageId_clientId_key" 
ON "ratings"("reviewLinkId", "imageId", "clientId");

-- Создать индекс для быстрого поиска по clientId
CREATE INDEX IF NOT EXISTS "ratings_reviewLinkId_imageId_clientId_idx" 
ON "ratings"("reviewLinkId", "imageId", "clientId");

-- Заполнить adminToken для существующих записей
UPDATE "review_links" 
SET "adminToken" = 'admin_' || "token" 
WHERE "adminToken" IS NULL;
