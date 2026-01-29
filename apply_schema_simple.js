const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applySchemaUpdate() {
  try {
    console.log('Применение изменений схемы БД...');

    // Выполняем все изменения в одной транзакции
    const sql = `
      -- Добавить adminToken в review_links
      ALTER TABLE "review_links" ADD COLUMN IF NOT EXISTS "adminToken" TEXT;
      
      -- Создать уникальный индекс для adminToken
      CREATE UNIQUE INDEX IF NOT EXISTS "review_links_adminToken_key" ON "review_links"("adminToken");
      
      -- Добавить filePath в image_assets
      ALTER TABLE "image_assets" ADD COLUMN IF NOT EXISTS "filePath" TEXT;
      
      -- Изменить url на nullable
      ALTER TABLE "image_assets" ALTER COLUMN "url" DROP NOT NULL;
      
      -- Добавить clientId в ratings
      ALTER TABLE "ratings" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
      
      -- Удалить старый уникальный индекс (если существует)
      DROP INDEX IF EXISTS "ratings_reviewLinkId_imageId_key";
      
      -- Создать новый уникальный индекс с clientId
      CREATE UNIQUE INDEX IF NOT EXISTS "ratings_reviewLinkId_imageId_clientId_key" 
      ON "ratings"("reviewLinkId", "imageId", "clientId");
      
      -- Создать индекс для быстрого поиска
      CREATE INDEX IF NOT EXISTS "ratings_reviewLinkId_imageId_clientId_idx" 
      ON "ratings"("reviewLinkId", "imageId", "clientId");
      
      -- Заполнить adminToken для существующих записей
      UPDATE "review_links" SET "adminToken" = 'admin_' || "token" WHERE "adminToken" IS NULL;
    `;

    // Разбиваем на отдельные команды и выполняем по одной
    const commands = sql.split(';').filter(cmd => cmd.trim());
    
    for (const cmd of commands) {
      if (cmd.trim()) {
        try {
          await prisma.$executeRawUnsafe(cmd.trim());
        } catch (e) {
          // Игнорируем ошибки "already exists" и подобные
          if (!e.message.includes('already exists') && !e.message.includes('does not exist')) {
            console.error(`Ошибка при выполнении: ${cmd.substring(0, 50)}...`, e.message);
          }
        }
      }
    }

    console.log('\n✅ Все изменения применены!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applySchemaUpdate();
