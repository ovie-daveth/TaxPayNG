const express = require('express');
const { getImageKitAuth, deleteImageKitFile } = require('../utils/imagekit');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get ImageKit authentication parameters for frontend
router.get('/auth', (req, res) => {
  const result = getImageKitAuth();
  res.json(result);
});

// Delete file from ImageKit (optional cleanup)
router.delete('/file/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const result = await deleteImageKitFile(fileId);
  res.json(result);
});

module.exports = router;
