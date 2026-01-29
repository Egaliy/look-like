const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllProjects() {
  try {
    console.log('Удаление всех проектов...');

    // Удаляем все рейтинги
    const deletedRatings = await prisma.rating.deleteMany({});
    console.log(`✓ Удалено рейтингов: ${deletedRatings.count}`);

    // Удаляем все ссылки
    const deletedLinks = await prisma.reviewLink.deleteMany({});
    console.log(`✓ Удалено ссылок: ${deletedLinks.count}`);

    // Удаляем все изображения
    const deletedImages = await prisma.imageAsset.deleteMany({});
    console.log(`✓ Удалено изображений: ${deletedImages.count}`);

    // Удаляем все проекты
    const deletedSets = await prisma.reviewSet.deleteMany({});
    console.log(`✓ Удалено проектов: ${deletedSets.count}`);

    console.log('\n✅ Все проекты удалены!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllProjects();
