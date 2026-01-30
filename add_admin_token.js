const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAdminToken() {
  try {
    console.log('Добавление колонки adminToken...');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE review_links 
      ADD COLUMN IF NOT EXISTS "adminToken" TEXT;
    `);
    console.log('✓ Колонка добавлена');
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS review_links_adminToken_idx 
      ON review_links("adminToken");
    `);
    console.log('✓ Индекс создан');
    
    await prisma.$executeRawUnsafe(`
      UPDATE review_links 
      SET "adminToken" = gen_random_uuid()::text 
      WHERE "adminToken" IS NULL;
    `);
    console.log('✓ Существующие записи обновлены');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE review_links 
      ALTER COLUMN "adminToken" SET DEFAULT gen_random_uuid()::text;
    `);
    console.log('✓ Default значение установлено');
    
    console.log('\n✅ Готово!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addAdminToken();
