const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  getProducts,
  getAvailableProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleAvailability
} = require('../controllers/productController');

router.route('/')
  .get(getProducts)
  .post(upload.single('image'), createProduct);

router.route('/available')
  .get(getAvailableProducts);

router.route('/:id')
  .put(upload.single('image'), updateProduct)
  .delete(deleteProduct);

router.route('/:id/toggle')
  .patch(toggleAvailability);

module.exports = router;
