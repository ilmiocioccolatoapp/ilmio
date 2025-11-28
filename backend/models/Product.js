const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a product title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Please add an image URL']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  ingredients: {
    type: String,
    required: [true, 'Please add ingredients']
  },
  price: {
    type: String,
    required: [true, 'Please add a price'],
    match: [/^(AED|€)\s?\d+\.\d{2}$/, 'Price must be in format AED X.XX or €X.XX']
  },
  available: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
