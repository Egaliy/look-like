const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllProjects() {
  try {
    console.log('Удаление всех проектов через SQL...');

    // Удаляем все через SQL напрямую
    await prisma.$executeRawUnsafe('DELETE FROM "ratings";');
    console.log('✓ Рейтинги удалены');

    await prisma.$executeRawUnsafe('DELETE FROM "review_links";');
    console.log('✓ Ссылки удалены');

    await prisma.$executeRawUnsafe('DELETE FROM "image_assets";');
    console.log('✓ Изображения удалены');

    await prisma.$executeRawUnsafe('DELETE FROM "review_sets";');
    console.log('✓ Проекты удалены');

    console.log('\n✅ Все проекты удалены!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllProjects();
