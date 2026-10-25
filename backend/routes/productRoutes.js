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

function optionalImage(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) return next();
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({
      success: false,
      error: err.message || 'Image upload failed'
    });
  });
}

router.route('/')
  .get(getProducts)
  .post(optionalImage, createProduct);

router.route('/available')
  .get(getAvailableProducts);

router.route('/:id')
  .put(optionalImage, updateProduct)
  .delete(deleteProduct);

router.route('/:id/toggle')
  .patch(toggleAvailability);

module.exports = router;
