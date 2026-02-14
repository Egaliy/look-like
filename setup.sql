-- SQL для Supabase: схема совпадает с prisma/schema.prisma
-- Выполни в Supabase Dashboard → SQL Editor
--
-- Варианты:
-- • Новая БД — выполни весь скрипт.
-- • Таблицы уже есть (старая схема) — лучше выполни в проекте: npx prisma db push
--   (Prisma сам добавит недостающие колонки). Либо создай новую БД и выполни этот скрипт.

-- 1. review_sets
CREATE TABLE IF NOT EXISTS "review_sets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "maxImagesToRate" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_sets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "review_sets_slug_key" ON "review_sets"("slug");
CREATE INDEX IF NOT EXISTS "review_sets_slug_idx" ON "review_sets"("slug");

-- 2. AdminUser
CREATE TABLE IF NOT EXISTS "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email");

-- 3. image_assets
CREATE TABLE IF NOT EXISTS "image_assets" (
    "id" TEXT NOT NULL,
    "reviewSetId" TEXT NOT NULL,
    "url" TEXT,
    "filePath" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_assets_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "image_assets" DROP CONSTRAINT IF EXISTS "image_assets_reviewSetId_fkey";
ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_reviewSetId_fkey"
    FOREIGN KEY ("reviewSetId") REFERENCES "review_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "image_assets_reviewSetId_order_idx" ON "image_assets"("reviewSetId", "order");

-- 4. review_links
CREATE TABLE IF NOT EXISTS "review_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "adminToken" TEXT NOT NULL,
    "reviewSetId" TEXT NOT NULL,
    "maxSessions" INTEGER NOT NULL DEFAULT 1,
    "allowResume" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_links_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "review_links" DROP CONSTRAINT IF EXISTS "review_links_reviewSetId_fkey";
ALTER TABLE "review_links" ADD CONSTRAINT "review_links_reviewSetId_fkey"
    FOREIGN KEY ("reviewSetId") REFERENCES "review_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "review_links_token_key" ON "review_links"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "review_links_adminToken_key" ON "review_links"("adminToken");
CREATE INDEX IF NOT EXISTS "review_links_token_idx" ON "review_links"("token");
CREATE INDEX IF NOT EXISTS "review_links_adminToken_idx" ON "review_links"("adminToken");

-- 5. ratings
CREATE TABLE IF NOT EXISTS "ratings" (
    "id" TEXT NOT NULL,
    "reviewLinkId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userName" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderIndex" INTEGER NOT NULL,
    "sessionId" TEXT,
    "deviceInfo" JSONB,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ratings" DROP CONSTRAINT IF EXISTS "ratings_reviewLinkId_fkey";
ALTER TABLE "ratings" DROP CONSTRAINT IF EXISTS "ratings_imageId_fkey";
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewLinkId_fkey"
    FOREIGN KEY ("reviewLinkId") REFERENCES "review_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "image_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ratings_reviewLinkId_idx" ON "ratings"("reviewLinkId");
CREATE INDEX IF NOT EXISTS "ratings_imageId_idx" ON "ratings"("imageId");
CREATE INDEX IF NOT EXISTS "ratings_reviewLinkId_imageId_clientId_idx" ON "ratings"("reviewLinkId", "imageId", "clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "ratings_reviewLinkId_imageId_clientId_key" ON "ratings"("reviewLinkId", "imageId", "clientId");
