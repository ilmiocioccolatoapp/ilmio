require('dotenv').config();
const prisma = require('./config/prisma');

const categories = [
  { id: 'pastries', name: 'Pastries', icon: '🥐', order: 1 },
  { id: 'drinks', name: 'Drinks', icon: '☕', order: 2 },
  { id: 'desserts', name: 'Desserts', icon: '🍰', order: 3 },
  { id: 'specialties', name: 'Specialties', icon: '✨', order: 4 }
];

async function main() {
  try {
    console.log('Connected to PostgreSQL');

    for (const cat of categories) {
      await prisma.category.upsert({
        where: { id: cat.id },
        update: cat,
        create: cat
      });
      console.log('✓ Synced category:', cat.icon, cat.name);
    }

    const allCats = await prisma.category.findMany({ orderBy: { order: 'asc' } });
    console.log('\n📋 All categories in database:');
    allCats.forEach((c) => console.log('  ', c.icon, c.name, '(id:', `${c.id})`));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
