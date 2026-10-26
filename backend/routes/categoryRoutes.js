const express = require('express');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

router.route('/')
  .get(getCategories)
  .post(requireAdmin, createCategory);

router.route('/:id')
  .put(requireAdmin, updateCategory)
  .delete(requireAdmin, deleteCategory);

module.exports = router;
