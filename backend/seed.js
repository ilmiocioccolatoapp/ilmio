const dotenv = require('dotenv');
const prisma = require('./config/prisma');

dotenv.config();

const categories = [
  { id: 'pastries', name: 'Pastries', icon: '🥐', order: 1 },
  { id: 'drinks', name: 'Drinks', icon: '☕', order: 2 },
  { id: 'desserts', name: 'Desserts', icon: '🍰', order: 3 },
  { id: 'specialties', name: 'Specialties', icon: '✨', order: 4 }
];

const products = [
  {
    title: 'Chocolate Croissant',
    category: 'pastries',
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    description: "Our signature chocolate croissant is made with pure Belgian chocolate and our special flaky pastry dough that's prepared fresh every morning. Each bite delivers a perfect balance of buttery crispiness and rich chocolate flavor.",
    ingredients: 'Flour, butter, Belgian chocolate, sugar, yeast, salt, eggs',
    price: '€3.50',
    available: true
  },
  {
    title: 'Hot Chocolate',
    category: 'drinks',
    image: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    description: 'Rich, creamy hot chocolate made with premium cocoa and steamed milk, topped with whipped cream and chocolate shavings.',
    ingredients: 'Premium cocoa, whole milk, sugar, whipped cream, chocolate shavings',
    price: '€4.00',
    available: true
  },
  {
    title: 'Chocolate Tiramisu',
    category: 'desserts',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    description: 'Our twist on the classic Italian dessert, with layers of coffee-soaked ladyfingers, mascarpone cream, and rich chocolate.',
    ingredients: 'Ladyfingers, mascarpone, espresso, cocoa powder, dark chocolate, eggs, sugar',
    price: '€5.50',
    available: true
  },
  {
    title: 'Chocolate Gelato',
    category: 'desserts',
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    description: 'Authentic Italian chocolate gelato made with premium cocoa and fresh milk. Creamy, rich, and intensely chocolatey.',
    ingredients: 'Whole milk, cream, sugar, premium cocoa, chocolate chips',
    price: '€3.50',
    available: true
  },
  {
    title: 'Chocolate Chip Cookie',
    category: 'pastries',
    image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    description: 'Freshly baked chocolate chip cookies with a perfect balance of crisp edges and chewy centers, loaded with chocolate chunks.',
    ingredients: 'Flour, butter, brown sugar, chocolate chunks, eggs, vanilla, baking soda',
    price: '€2.50',
    available: true
  },
  {
    title: 'Mocha Latte',
    category: 'drinks',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    description: 'The perfect blend of rich espresso, steamed milk, and premium chocolate, topped with foam and a dusting of cocoa.',
    ingredients: 'Espresso, steamed milk, chocolate syrup, cocoa powder',
    price: '€4.50',
    available: true
  },
  {
    title: 'Chocolate Fondant',
    category: 'specialties',
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    description: 'Warm chocolate cake with a molten chocolate center, served with a scoop of vanilla gelato and fresh berries.',
    ingredients: 'Dark chocolate, butter, eggs, sugar, flour, vanilla gelato, fresh berries',
    price: '€6.50',
    available: true
  },
  {
    title: 'Chocolate Brioche',
    category: 'pastries',
    image: 'https://images.unsplash.com/photo-1555507038-1d6ea43b99c1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    description: 'Soft, buttery brioche filled with rich chocolate cream, perfect with your morning coffee.',
    ingredients: 'Flour, butter, eggs, milk, sugar, chocolate cream, yeast',
    price: '€3.00',
    available: true
  }
];

const seedDatabase = async () => {
  try {
    for (const category of categories) {
      await prisma.category.upsert({
        where: { id: category.id },
        update: category,
        create: category
      });
    }
    console.log(`✅ Synced ${categories.length} categories`);

    await prisma.product.deleteMany();
    console.log('✅ Deleted all existing products');

    const createdProducts = await prisma.product.createMany({ data: products });
    console.log(`✅ Inserted ${createdProducts.count} products`);

    const all = await prisma.product.findMany({
      select: { title: true, category: true, price: true }
    });

    console.log('\n📦 Products in database:');
    all.forEach((product, index) => {
      console.log(`${index + 1}. ${product.title} (${product.category}) - ${product.price}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seedDatabase();
