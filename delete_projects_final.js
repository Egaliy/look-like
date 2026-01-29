require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

// Создаем новый клиент с прямым подключением
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function deleteAll() {
  try {
    console.log('Удаление всех проектов...');
    
    // Используем транзакцию
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('DELETE FROM "ratings";');
      console.log('✓ Рейтинги удалены');
      
      await tx.$executeRawUnsafe('DELETE FROM "review_links";');
      console.log('✓ Ссылки удалены');
      
      await tx.$executeRawUnsafe('DELETE FROM "image_assets";');
      console.log('✓ Изображения удалены');
      
      await tx.$executeRawUnsafe('DELETE FROM "review_sets";');
      console.log('✓ Проекты удалены');
    });

    console.log('\n✅ Все проекты удалены!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAll();
