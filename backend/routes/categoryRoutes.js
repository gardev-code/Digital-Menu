'use strict';

const { Router }         = require('express');
const authMiddleware     = require('../middleware/authMiddleware');
const roleMiddleware     = require('../middleware/roleMiddleware');
const categoryController = require('../controllers/categoryController');

// ─────────────────────────────────────────────
// Category Routes
//
// Mount point: /api/categories
// Register in app.js:
//   app.use('/api/categories', require('./routes/categoryRoutes'));
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
 * POST /api/categories
 * Create a new multilingual category.
 * Body: { name_en, name_am, description_en?, description_am?, display_order? }
 */
router.post(
  '/',
  roleMiddleware('restaurant'),
  categoryController.createCategory
);

/**
 * GET /api/categories
 * Restaurant: returns own categories only.
 * Super Admin: returns all (supports ?restaurant_id, ?status, ?search).
 */
router.get(
  '/',
  roleMiddleware('restaurant', 'super_admin'),
  categoryController.getCategories
);

/**
 * GET /api/categories/:id
 * Restaurant: returns category only if it belongs to them.
 * Super Admin: returns any category by ID.
 */
router.get(
  '/:id',
  roleMiddleware('restaurant', 'super_admin'),
  categoryController.getCategoryById
);

/**
 * PUT /api/categories/:id
 * Update a category belonging to the authenticated restaurant.
 * Body (all optional): { name_en, name_am, description_en, description_am, display_order, status }
 */
router.put(
  '/:id',
  roleMiddleware('restaurant'),
  categoryController.updateCategory
);

/**
 * DELETE /api/categories/:id
 * Delete a category belonging to the authenticated restaurant.
 */
router.delete(
  '/:id',
  roleMiddleware('restaurant'),
  categoryController.deleteCategory
);

module.exports = router;