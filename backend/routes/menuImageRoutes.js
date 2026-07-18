'use strict';

const { Router }          = require('express');
const authMiddleware      = require('../middleware/authMiddleware');
const roleMiddleware      = require('../middleware/roleMiddleware');
const uploadMiddleware    = require('../middleware/uploadMiddleware');
const menuImageController = require('../controllers/menuImageController');

// ─────────────────────────────────────────────
// Menu Image Routes
//
// Mount point: /api/menu-items
// Register in app.js BEFORE menuRoutes so these
// specific paths don't conflict with /:id:
//   app.use('/api/menu-items', require('./routes/menuImageRoutes'));
//   app.use('/api/menu-items', require('./routes/menuRoutes'));
//
// Authorization:
//   POST   → restaurant only
//   PUT    → restaurant only
//   DELETE → restaurant only
//   GET    → restaurant + super_admin
//
// uploadMiddleware must run BEFORE the controller
// so req.file is populated when the controller runs.
// ─────────────────────────────────────────────

const router = Router();

// All routes require a valid JWT
router.use(authMiddleware);

/**
 * POST /api/menu-items/:id/image
 * Upload an image for a menu item (item must have no image).
 * Form-data field: image
 */
router.post(
  '/:id/image',
  roleMiddleware('restaurant'),
  uploadMiddleware,
  menuImageController.uploadMenuImage
);

/**
 * PUT /api/menu-items/:id/image
 * Replace an existing image (old file is deleted).
 * Form-data field: image
 */
router.put(
  '/:id/image',
  roleMiddleware('restaurant'),
  uploadMiddleware,
  menuImageController.replaceMenuImage
);

/**
 * DELETE /api/menu-items/:id/image
 * Delete a menu item's image and clear image_url.
 */
router.delete(
  '/:id/image',
  roleMiddleware('restaurant'),
  menuImageController.deleteMenuImage
);

/**
 * GET /api/menu-items/:id/image
 * Return the image URL for a menu item.
 */
router.get(
  '/:id/image',
  roleMiddleware('restaurant', 'super_admin'),
  menuImageController.getMenuImage
);

module.exports = router;