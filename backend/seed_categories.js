const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ilmio');

const categories = [
  { id: 'pastries', name: 'Pastries', icon: '🥐', order: 1 },
  { id: 'drinks', name: 'Drinks', icon: '☕', order: 2 },
  { id: 'desserts', name: 'Desserts', icon: '🍰', order: 3 },
  { id: 'specialties', name: 'Specialties', icon: '✨', order: 4 },
];

const seedCategories = async () => {
  try {
    await Category.deleteMany();
    console.log('✅ Deleted all existing categories');

    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ Inserted ${createdCategories.length} categories`);

    console.log('\n📦 Categories in database:');
    createdCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.icon} ${cat.name} (${cat.id})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
