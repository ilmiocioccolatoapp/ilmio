const express = require('express');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');
const upload = require('../middleware/upload');
const { logError, uploadErrorMessage } = require('../utils/errors');
const {
  getProducts,
  getAvailableProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleAvailability
} = require('../controllers/productController');

function optionalImage(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) return next();
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    logError('Product image upload failed', err);
    return res.status(400).json({
      success: false,
      error: uploadErrorMessage(err)
    });
  });
}

router.route('/')
  .get(requireAdmin, getProducts)
  .post(requireAdmin, optionalImage, createProduct);

router.route('/available')
  .get(getAvailableProducts);

router.route('/:id')
  .put(requireAdmin, optionalImage, updateProduct)
  .delete(requireAdmin, deleteProduct);

router.route('/:id/toggle')
  .patch(requireAdmin, toggleAvailability);

module.exports = router;
