const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const categories = await Category.find().sort({ order: 1 });
    const categoryOrder = {};
    categories.forEach((cat, index) => {
      categoryOrder[cat.id] = index;
    });

    let products = await Product.find();
    
    // Sort by category order, then by createdAt within each category
    products.sort((a, b) => {
      const catOrderA = categoryOrder[a.category] ?? 999;
      const catOrderB = categoryOrder[b.category] ?? 999;
      
      if (catOrderA !== catOrderB) {
        return catOrderA - catOrderB;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get available products only
// @route   GET /api/products/available
// @access  Public
const getAvailableProducts = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const categories = await Category.find().sort({ order: 1 });
    const categoryOrder = {};
    categories.forEach((cat, index) => {
      categoryOrder[cat.id] = index;
    });

    let products = await Product.find({ available: true });
    
    // Sort by category order, then by createdAt within each category
    products.sort((a, b) => {
      const catOrderA = categoryOrder[a.category] ?? 999;
      const catOrderB = categoryOrder[b.category] ?? 999;
      
      if (catOrderA !== catOrderB) {
        return catOrderA - catOrderB;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private
const createProduct = async (req, res) => {
  try {
    const productData = { ...req.body };
    
    // If image was uploaded, use Cloudinary URL
    if (req.file) {
      productData.image = req.file.path;
    }
    
    const product = await Product.create(productData);
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const updateData = { ...req.body };
    
    // If new image was uploaded, use Cloudinary URL
    if (req.file) {
      updateData.image = req.file.path;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Toggle product availability
// @route   PATCH /api/products/:id/toggle
// @access  Private
const toggleAvailability = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    product.available = !product.available;
    await product.save();

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getProducts,
  getAvailableProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleAvailability
};
