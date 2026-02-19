const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2;

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
    // Convert any product with stored public id into generated URL (secure, no forced width)
    products = products.map(p => {
      const obj = p.toObject ? p.toObject() : p;
      if (obj.imagePublicId) {
        try {
          obj.image = cloudinary.url(obj.imagePublicId, { secure: true, fetch_format: 'auto', quality: 'auto' });
        } catch (e) {
          // keep original image if generation fails
        }
      }
      return obj;
    });
    
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
    products = products.map(p => {
      const obj = p.toObject ? p.toObject() : p;
      if (obj.imagePublicId) {
        try {
          obj.image = cloudinary.url(obj.imagePublicId, { secure: true, fetch_format: 'auto', quality: 'auto' });
        } catch (e) {}
      }
      return obj;
    });
    
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
      // store public id when available for future server-side URL generation
      productData.imagePublicId = req.file.filename || req.file.public_id || _extractPublicIdFromUrl(req.file.path);
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
      updateData.imagePublicId = req.file.filename || req.file.public_id || _extractPublicIdFromUrl(req.file.path);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }

      // Helper: extract public id from a Cloudinary URL when filename/public_id not provided
      function _extractPublicIdFromUrl(url) {
        try {
          const idx = url.indexOf('/upload/');
          if (idx === -1) return null;
          let after = url.substring(idx + 8); // after '/upload/'
          // remove any transformation segments (contain ',') and version like v123
          // split by '/' and find the segment that looks like a public id with extension
          const parts = after.split('/');
          // drop version if present
          if (parts.length > 1 && parts[0].startsWith('v') && /^v\d+$/.test(parts[0])) {
            parts.shift();
          }
          const last = parts.join('/');
          // remove extension
          const dotIdx = last.lastIndexOf('.');
          return dotIdx !== -1 ? last.substring(0, dotIdx) : last;
        } catch (e) {
          return null;
        }
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
