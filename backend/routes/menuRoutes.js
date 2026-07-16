'use strict';

const { Router }     = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const menuController = require('../controllers/menuController');

// ─────────────────────────────────────────────
// Menu Item Routes
//
// Mount point: /api/menu-items
// Register in app.js:
//   app.use('/api/menu-items', require('./routes/menuRoutes'));
//
// Authorization per route:
//   POST       → restaurant only
//   GET /      → restaurant + super_admin
//   GET /:id   → restaurant + super_admin
//   PUT /:id   → restaurant only
//   DELETE /:id → restaurant only
//
// restaurant_id is NEVER sourced from the client.
// Always resolved server-side from the JWT.
// ─────────────────────────────────────────────

const router = Router();

// All routes require a valid JWT
router.use(authMiddleware);

/**
 * POST /api/menu-items
 * Create a new multilingual menu item.
 *
 * Body:
 *   { category_id, name_en, name_am,
 *     description_en?, description_am?,
 *     price, currency?, display_order? }
 */
router.post(
  '/',
  roleMiddleware('restaurant'),
  menuController.createMenuItem
);

/**
 * GET /api/menu-items
 * Restaurant: returns own items only.
 * Super Admin: returns all items.
 *
 * Supported filters:
 *   ?category_id=5
 *   ?status=active
 *   ?available=true
 *   ?search=burger
 *   ?restaurant_id=10  (super_admin only)
 */
router.get(
  '/',
  roleMiddleware('restaurant', 'super_admin'),
  menuController.getMenuItems
);

/**
 * GET /api/menu-items/:id
 * Restaurant: returns item only if it belongs to them.
 * Super Admin: returns any item by ID.
 */
router.get(
  '/:id',
  roleMiddleware('restaurant', 'super_admin'),
  menuController.getMenuItemById
);

/**
 * PUT /api/menu-items/:id
 * Update a menu item belonging to the authenticated restaurant.
 *
 * Body (all optional):
 *   { category_id, name_en, name_am,
 *     description_en, description_am,
 *     price, currency, image_url,
 *     is_available, display_order, status }
 */
router.put(
  '/:id',
  roleMiddleware('restaurant'),
  menuController.updateMenuItem
);

/**
 * DELETE /api/menu-items/:id
 * Delete a menu item belonging to the authenticated restaurant.
 */
router.delete(
  '/:id',
  roleMiddleware('restaurant'),
  menuController.deleteMenuItem
);

module.exports = router;