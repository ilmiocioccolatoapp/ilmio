const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1 });
    const products = await Product.find();
    
    // Add product count to each category
    const categoriesWithCount = categories.map(cat => {
      const count = products.filter(p => p.category === cat.id).length;
      return {
        ...cat.toObject(),
        count
      };
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categoriesWithCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Category ID already exists'
      });
    }
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

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ id: req.params.id });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Don't allow changing the ID if products exist with this category
    if (req.body.id && req.body.id !== category.id) {
      const productsCount = await Product.countDocuments({ category: category.id });
      if (productsCount > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot change category ID. ${productsCount} products are using this category.`
        });
      }
    }

    const updatedCategory = await Category.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: updatedCategory
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

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ id: req.params.id });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if any products are using this category
    const productsCount = await Product.countDocuments({ category: category.id });
    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. ${productsCount} products are using this category. Please reassign or delete those products first.`
      });
    }

    await Category.findOneAndDelete({ id: req.params.id });

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

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
