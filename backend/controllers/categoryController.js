const prisma = require('../config/prisma');

function _mapCategory(category, count = 0) {
  return {
    ...category,
    _id: category.dbId,
    count
  };
}

function _validateCategoryInput(payload, { partial = false } = {}) {
  const errors = [];

  if (!partial || payload.id !== undefined) {
    if (!payload.id || String(payload.id).trim() === '') {
      errors.push('Please add a category ID');
    }
  }

  if (!partial || payload.name !== undefined) {
    if (!payload.name || String(payload.name).trim() === '') {
      errors.push('Please add a category name');
    }
    if (payload.name && String(payload.name).length > 50) {
      errors.push('Name cannot be more than 50 characters');
    }
  }

  if (!partial || payload.icon !== undefined) {
    if (!payload.icon || String(payload.icon).trim() === '') {
      errors.push('Please add an icon');
    }
  }

  return errors;
}

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' }
    });

    const grouped = await prisma.product.groupBy({
      by: ['category'],
      _count: {
        _all: true
      }
    });

    const countMap = Object.fromEntries(grouped.map((row) => [row.category, row._count._all]));

    const categoriesWithCount = categories.map((cat) => _mapCategory(cat, countMap[cat.id] || 0));

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

const createCategory = async (req, res) => {
  try {
    const data = {
      id: req.body.id ? String(req.body.id).trim().toLowerCase() : req.body.id,
      name: req.body.name ? String(req.body.name).trim() : req.body.name,
      icon: req.body.icon ? String(req.body.icon).trim() : req.body.icon,
      order: req.body.order === undefined ? 0 : Number(req.body.order)
    };

    const validationErrors = _validateCategoryInput(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: validationErrors
      });
    }

    const category = await prisma.category.create({
      data
    });

    res.status(201).json({
      success: true,
      data: _mapCategory(category)
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Category ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    if (req.body.id && req.body.id !== category.id) {
      const productsCount = await prisma.product.count({
        where: { category: category.id }
      });

      if (productsCount > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot change category ID. ${productsCount} products are using this category.`
        });
      }
    }

    const data = {};
    if (req.body.id !== undefined) data.id = String(req.body.id).trim().toLowerCase();
    if (req.body.name !== undefined) data.name = String(req.body.name).trim();
    if (req.body.icon !== undefined) data.icon = String(req.body.icon).trim();
    if (req.body.order !== undefined) data.order = Number(req.body.order);

    const validationErrors = _validateCategoryInput(data, { partial: true });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: validationErrors
      });
    }

    const updatedCategory = await prisma.category.update({
      where: { id: req.params.id },
      data
    });

    res.status(200).json({
      success: true,
      data: _mapCategory(updatedCategory)
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Category ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const productsCount = await prisma.product.count({
      where: { category: category.id }
    });

    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. ${productsCount} products are using this category. Please reassign or delete those products first.`
      });
    }

    await prisma.category.delete({
      where: { id: req.params.id }
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

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
