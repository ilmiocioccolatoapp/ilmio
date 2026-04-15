const dotenv = require('dotenv');
const prisma = require('./config/prisma');

dotenv.config();

const categories = [
  { id: 'pastries', name: 'Pastries', icon: '🥐', order: 1 },
  { id: 'drinks', name: 'Drinks', icon: '☕', order: 2 },
  { id: 'desserts', name: 'Desserts', icon: '🍰', order: 3 },
  { id: 'specialties', name: 'Specialties', icon: '✨', order: 4 }
];

const seedCategories = async () => {
  try {
    await prisma.category.deleteMany();
    console.log('✅ Deleted all existing categories');

    const createdCategories = await prisma.category.createMany({
      data: categories
    });
    console.log(`✅ Inserted ${createdCategories.count} categories`);

    const all = await prisma.category.findMany({ orderBy: { order: 'asc' } });
    console.log('\n📦 Categories in database:');
    all.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.icon} ${cat.name} (${cat.id})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seedCategories();
