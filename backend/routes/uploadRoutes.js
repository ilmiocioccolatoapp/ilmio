const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');

// Browser uploads the photo straight to Cloudinary.
// The API only signs the upload so the secret stays on the server.
router.post('/sign', requireAdmin, (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({
      success: false,
      error: 'Image storage is not configured on the server.'
    });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'il-mio-cioccolato';
  const signatureAlgorithm = 'sha256';
  const signature = crypto
    .createHash('sha256')
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  res.json({
    success: true,
    data: {
      timestamp,
      signature,
      signature_algorithm: signatureAlgorithm,
      folder,
      cloudName,
      apiKey
    }
  });
});

module.exports = router;
