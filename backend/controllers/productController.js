const prisma = require('../config/prisma');
const cloudinary = require('cloudinary').v2;

function _extractPublicIdFromUrl(url) {
  try {
    const idx = url.indexOf('/upload/');
    if (idx === -1) return null;
    const after = url.substring(idx + 8);
    const parts = after.split('/');
    if (parts.length > 1 && parts[0].startsWith('v') && /^v\d+$/.test(parts[0])) {
      parts.shift();
    }
    const last = parts.join('/');
    const dotIdx = last.lastIndexOf('.');
    return dotIdx !== -1 ? last.substring(0, dotIdx) : last;
  } catch (e) {
    return null;
  }
}

function _mapProduct(product) {
  return {
    ...product,
    _id: product.dbId
  };
}

function _parseBoolean(value, defaultValue = undefined) {
  if (value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return Boolean(value);
}

function _validateProductInput(payload, { partial = false } = {}) {
  const errors = [];
  const requiredFields = ['title', 'category', 'description', 'ingredients', 'price'];

  if (!partial) {
    for (const field of requiredFields) {
      if (!payload[field] || String(payload[field]).trim() === '') {
        errors.push(`Please add a product ${field}`);
      }
    }

    if (!payload.image || String(payload.image).trim() === '') {
      errors.push('Please add an image URL');
    }
  }

  if (payload.title && String(payload.title).length > 100) {
    errors.push('Title cannot be more than 100 characters');
  }

  if (payload.description && String(payload.description).length > 500) {
    errors.push('Description cannot be more than 500 characters');
  }

  if (payload.price && !/^(AED|€)\s?\d+\.\d{2}$/.test(String(payload.price).trim())) {
    errors.push('Price must be in format AED X.XX or €X.XX');
  }

  return errors;
}

async function _getCategoryOrderMap() {
  const categories = await prisma.category.findMany({
    select: { id: true },
    orderBy: { order: 'asc' }
  });

  const categoryOrder = {};
  categories.forEach((cat, index) => {
    categoryOrder[cat.id] = index;
  });

  return categoryOrder;
}

const getProducts = async (req, res) => {
  try {
    const categoryOrder = await _getCategoryOrderMap();

    let products = await prisma.product.findMany();
    products = products.map((p) => {
      const obj = { ...p };
      if (obj.imagePublicId) {
        try {
          obj.image = cloudinary.url(obj.imagePublicId, { secure: true, fetch_format: 'auto', quality: 'auto' });
        } catch (e) {}
      }
      return obj;
    });

    products.sort((a, b) => {
      const catOrderA = categoryOrder[a.category] ?? 999;
      const catOrderB = categoryOrder[b.category] ?? 999;
      if (catOrderA !== catOrderB) return catOrderA - catOrderB;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const mapped = products.map(_mapProduct);

    res.status(200).json({
      success: true,
      count: mapped.length,
      data: mapped
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const getAvailableProducts = async (req, res) => {
  try {
    const categoryOrder = await _getCategoryOrderMap();

    let products = await prisma.product.findMany({
      where: { available: true }
    });

    products = products.map((p) => {
      const obj = { ...p };
      if (obj.imagePublicId) {
        try {
          obj.image = cloudinary.url(obj.imagePublicId, { secure: true, fetch_format: 'auto', quality: 'auto' });
        } catch (e) {}
      }
      return obj;
    });

    products.sort((a, b) => {
      const catOrderA = categoryOrder[a.category] ?? 999;
      const catOrderB = categoryOrder[b.category] ?? 999;
      if (catOrderA !== catOrderB) return catOrderA - catOrderB;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const mapped = products.map(_mapProduct);

    res.status(200).json({
      success: true,
      count: mapped.length,
      data: mapped
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const productData = { ...req.body };

    if (req.file) {
      productData.image = req.file.path;
      productData.imagePublicId = req.file.filename || req.file.public_id || _extractPublicIdFromUrl(req.file.path);
    }

    const validationErrors = _validateProductInput(productData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: validationErrors
      });
    }

    const created = await prisma.product.create({
      data: {
        title: String(productData.title).trim(),
        category: String(productData.category).trim(),
        image: String(productData.image).trim(),
        imagePublicId: productData.imagePublicId || null,
        description: String(productData.description).trim(),
        ingredients: String(productData.ingredients).trim(),
        price: String(productData.price).trim(),
        available: _parseBoolean(productData.available, true)
      }
    });

    res.status(201).json({
      success: true,
      data: _mapProduct(created)
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Invalid category. Please select a valid category.'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { dbId: req.params.id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = req.file.path;
      updateData.imagePublicId = req.file.filename || req.file.public_id || _extractPublicIdFromUrl(req.file.path);
    }

    const validationErrors = _validateProductInput(updateData, { partial: true });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: validationErrors
      });
    }

    const data = {};
    const fields = ['title', 'category', 'image', 'imagePublicId', 'description', 'ingredients', 'price'];
    fields.forEach((field) => {
      if (updateData[field] !== undefined) {
        data[field] = typeof updateData[field] === 'string' ? updateData[field].trim() : updateData[field];
      }
    });

    if (updateData.available !== undefined) {
      data.available = _parseBoolean(updateData.available);
    }

    const updatedProduct = await prisma.product.update({
      where: { dbId: req.params.id },
      data
    });

    res.status(200).json({
      success: true,
      data: _mapProduct(updatedProduct)
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Invalid category. Please select a valid category.'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { dbId: req.params.id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    await prisma.product.delete({
      where: { dbId: req.params.id }
    });

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

const toggleAvailability = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { dbId: req.params.id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const updated = await prisma.product.update({
      where: { dbId: req.params.id },
      data: { available: !product.available }
    });

    res.status(200).json({
      success: true,
      data: _mapProduct(updated)
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
