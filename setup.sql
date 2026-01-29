-- SQL скрипт для создания таблиц в Supabase
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Таблица review_sets
CREATE TABLE IF NOT EXISTS "review_sets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_sets_pkey" PRIMARY KEY ("id")
);

-- Таблица image_assets
CREATE TABLE IF NOT EXISTS "image_assets" (
    "id" TEXT NOT NULL,
    "reviewSetId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_assets_pkey" PRIMARY KEY ("id")
);

-- Таблица review_links
CREATE TABLE IF NOT EXISTS "review_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "reviewSetId" TEXT NOT NULL,
    "maxSessions" INTEGER NOT NULL DEFAULT 1,
    "allowResume" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_links_pkey" PRIMARY KEY ("id")
);

-- Таблица ratings
CREATE TABLE IF NOT EXISTS "ratings" (
    "id" TEXT NOT NULL,
    "reviewLinkId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderIndex" INTEGER NOT NULL,
    "sessionId" TEXT,
    "deviceInfo" JSONB,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- Таблица admin_users (опционально)
CREATE TABLE IF NOT EXISTS "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- Внешние ключи
ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_reviewSetId_fkey" FOREIGN KEY ("reviewSetId") REFERENCES "review_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "review_links" ADD CONSTRAINT "review_links_reviewSetId_fkey" FOREIGN KEY ("reviewSetId") REFERENCES "review_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewLinkId_fkey" FOREIGN KEY ("reviewLinkId") REFERENCES "review_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "image_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Индексы
CREATE INDEX IF NOT EXISTS "image_assets_reviewSetId_order_idx" ON "image_assets"("reviewSetId", "order");
CREATE INDEX IF NOT EXISTS "review_links_token_idx" ON "review_links"("token");
CREATE INDEX IF NOT EXISTS "ratings_reviewLinkId_idx" ON "ratings"("reviewLinkId");
CREATE INDEX IF NOT EXISTS "ratings_imageId_idx" ON "ratings"("imageId");

-- Уникальные ограничения
CREATE UNIQUE INDEX IF NOT EXISTS "review_links_token_key" ON "review_links"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "ratings_reviewLinkId_imageId_key" ON "ratings"("reviewLinkId", "imageId");
