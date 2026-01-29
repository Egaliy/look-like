const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applySchemaUpdate() {
  try {
    console.log('Применение изменений схемы БД...');

    // Добавить adminToken в review_links
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "review_links" 
      ADD COLUMN IF NOT EXISTS "adminToken" TEXT;
    `);
    console.log('✓ Добавлен adminToken');

    // Создать уникальный индекс для adminToken
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "review_links_adminToken_key" 
      ON "review_links"("adminToken");
    `);
    console.log('✓ Создан индекс для adminToken');

    // Добавить filePath в image_assets
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "image_assets" 
      ADD COLUMN IF NOT EXISTS "filePath" TEXT;
    `);
    console.log('✓ Добавлен filePath');

    // Изменить url на nullable
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "image_assets" 
      ALTER COLUMN "url" DROP NOT NULL;
    `);
    console.log('✓ url теперь nullable');

    // Добавить clientId в ratings
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ratings" 
      ADD COLUMN IF NOT EXISTS "clientId" TEXT;
    `);
    console.log('✓ Добавлен clientId');

    // Удалить старый уникальный индекс
    try {
      await prisma.$executeRawUnsafe(`
        DROP INDEX IF EXISTS "ratings_reviewLinkId_imageId_key";
      `);
      console.log('✓ Удален старый индекс');
    } catch (e) {
      console.log('  (старый индекс не найден, пропускаем)');
    }

    // Создать новый уникальный индекс с clientId
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ratings_reviewLinkId_imageId_clientId_key" 
      ON "ratings"("reviewLinkId", "imageId", "clientId");
    `);
    console.log('✓ Создан новый уникальный индекс');

    // Создать индекс для быстрого поиска
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ratings_reviewLinkId_imageId_clientId_idx" 
      ON "ratings"("reviewLinkId", "imageId", "clientId");
    `);
    console.log('✓ Создан индекс для поиска');

    // Заполнить adminToken для существующих записей
    await prisma.$executeRawUnsafe(`
      UPDATE "review_links" 
      SET "adminToken" = 'admin_' || "token" 
      WHERE "adminToken" IS NULL;
    `);
    console.log('✓ Заполнены adminToken для существующих записей');

    console.log('\n✅ Все изменения применены успешно!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applySchemaUpdate();
