const express = require('express');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');

router.get('/me', requireAdmin, (req, res) => {
  res.json({
    success: true,
    data: req.adminUser
  });
});

module.exports = router;
