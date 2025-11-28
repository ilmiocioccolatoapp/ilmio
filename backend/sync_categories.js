const mongoose = require('mongoose');
require('dotenv').config();

const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String, required: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

const categories = [
  { id: 'pastries', name: 'Pastries', icon: '🥐', order: 1 },
  { id: 'drinks', name: 'Drinks', icon: '☕', order: 2 },
  { id: 'desserts', name: 'Desserts', icon: '🍰', order: 3 },
  { id: 'specialties', name: 'Specialties', icon: '✨', order: 4 }
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  for (const cat of categories) {
    await Category.findOneAndUpdate(
      { id: cat.id },
      cat,
      { upsert: true, new: true }
    );
    console.log('✓ Synced category:', cat.icon, cat.name);
  }
  
  const allCats = await Category.find().sort({ order: 1 });
  console.log('\n📋 All categories in database:');
  allCats.forEach(c => console.log('  ', c.icon, c.name, '(id:', c.id + ')'));
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
