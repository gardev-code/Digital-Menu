'use strict';

const { Router }            = require('express');
const authMiddleware        = require('../middleware/authMiddleware');
const roleMiddleware        = require('../middleware/roleMiddleware');
const menuSettingsController = require('../controllers/menuSettingsController');

// ─────────────────────────────────────────────
// Menu Settings Routes
//
// Mount point: /api/menu-settings
// Register in app.js:
//   app.use('/api/menu-settings', require('./routes/menuSettingsRoutes'));
//
// IMPORTANT — static routes must be defined BEFORE
// parameterized routes to avoid Express treating
// 'order' or 'availability' as an :id value:
//
//   PUT /api/menu-settings/order        ← static, defined first
//   PUT /api/menu-settings/availability ← static, defined first
//   PUT /api/menu-settings/:id/...      ← parameterized, defined after
//
// Authorization:
//   GET /              → restaurant + super_admin
//   All PUT routes     → restaurant only
// ─────────────────────────────────────────────

const router = Router();

// All routes require a valid JWT
router.use(authMiddleware);

// ── Static bulk routes (must come before /:id routes) ────────

/**
 * PUT /api/menu-settings/order
 * Bulk update display_order for multiple items.
 * Body: { items: [{ id, display_order }] }
 */
router.put(
  '/order',
  roleMiddleware('restaurant'),
  menuSettingsController.bulkUpdateDisplayOrder
);

/**
 * PUT /api/menu-settings/availability
 * Bulk update availability for multiple items.
 * Body: { ids: [1,2,3], availability: 'hidden' }
 */
router.put(
  '/availability',
  roleMiddleware('restaurant'),
  menuSettingsController.bulkUpdateAvailability
);

// ── GET settings ─────────────────────────────

/**
 * GET /api/menu-settings
 * Restaurant: returns own items with settings.
 * Super Admin: returns all (supports ?restaurant_id).
 */
router.get(
  '/',
  roleMiddleware('restaurant', 'super_admin'),
  menuSettingsController.getMenuSettings
);

// ── Single-item update routes (parameterized) ─

/**
 * PUT /api/menu-settings/:id/availability
 * Update availability of one item.
 * Body: { availability: 'available' | 'unavailable' | 'hidden' }
 */
router.put(
  '/:id/availability',
  roleMiddleware('restaurant'),
  menuSettingsController.updateAvailability
);

/**
 * PUT /api/menu-settings/:id/featured
 * Toggle featured status of one item.
 * Body: { is_featured: true | false }
 */
router.put(
  '/:id/featured',
  roleMiddleware('restaurant'),
  menuSettingsController.updateFeaturedStatus
);

/**
 * PUT /api/menu-settings/:id/order
 * Update display_order of one item.
 * Body: { display_order: 3 }
 */
router.put(
  '/:id/order',
  roleMiddleware('restaurant'),
  menuSettingsController.updateDisplayOrder
);

module.exports = router;