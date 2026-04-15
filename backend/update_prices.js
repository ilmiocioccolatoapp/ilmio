const dotenv = require('dotenv');
const prisma = require('./config/prisma');

dotenv.config();

const priceMap = {
  'Chocolate Croissant': 'AED 12.00',
  'Hot Chocolate': 'AED 14.00',
  'Chocolate Tiramisu': 'AED 19.00',
  'Chocolate Gelato': 'AED 12.00',
  'Chocolate Chip Cookie': 'AED 9.00',
  'Mocha Latte': 'AED 16.00',
  'Chocolate Fondant': 'AED 23.00',
  'Chocolate Brioche': 'AED 11.00'
};

const updatePrices = async () => {
  try {
    for (const [title, price] of Object.entries(priceMap)) {
      await prisma.product.updateMany({
        where: { title },
        data: { price }
      });
      console.log(`✅ Updated ${title} to ${price}`);
    }
    console.log('\n✅ All prices updated to AED');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

updatePrices();
