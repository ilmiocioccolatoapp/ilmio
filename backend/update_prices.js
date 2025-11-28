const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ilmio');

const priceMap = {
  'Chocolate Croissant': 'AED 12.00',
  'Hot Chocolate': 'AED 14.00',
  'Chocolate Tiramisu': 'AED 19.00',
  'Chocolate Gelato': 'AED 12.00',
  'Chocolate Chip Cookie': 'AED 9.00',
  'Mocha Latte': 'AED 16.00',
  'Chocolate Fondant': 'AED 23.00',
  'Chocolate Brioche': 'AED 11.00',
};

const updatePrices = async () => {
  try {
    for (const [title, price] of Object.entries(priceMap)) {
      await Product.updateOne({ title }, { $set: { price } });
      console.log(`✅ Updated ${title} to ${price}`);
    }
    console.log('\n✅ All prices updated to AED');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updatePrices();
