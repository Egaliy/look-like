const { PrismaClient } = require('@prisma/client');

// Используем прямой connection string без pooling
const directUrl = process.env.DATABASE_URL?.replace('pooler.supabase.com:6543', 'db.ihaeyegjabyzkvpxqwor.supabase.co:5432') || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl,
    },
  },
});

async function deleteAll() {
  try {
    console.log('Удаление всех проектов через прямое подключение...');
    
    // Выполняем по одной команде с задержкой
    await new Promise(resolve => setTimeout(resolve, 1000));
    await prisma.$executeRawUnsafe('DELETE FROM "ratings";');
    console.log('✓ Рейтинги удалены');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    await prisma.$executeRawUnsafe('DELETE FROM "review_links";');
    console.log('✓ Ссылки удалены');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    await prisma.$executeRawUnsafe('DELETE FROM "image_assets";');
    console.log('✓ Изображения удалены');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    await prisma.$executeRawUnsafe('DELETE FROM "review_sets";');
    console.log('✓ Проекты удалены');

    console.log('\n✅ Все проекты удалены!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    // Пробуем через обычные методы Prisma
    try {
      console.log('Пробуем через Prisma методы...');
      await prisma.rating.deleteMany();
      await prisma.reviewLink.deleteMany();
      await prisma.imageAsset.deleteMany();
      await prisma.reviewSet.deleteMany();
      console.log('✅ Удалено через Prisma методы!');
    } catch (e2) {
      console.error('Ошибка и через Prisma:', e2.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAll();
