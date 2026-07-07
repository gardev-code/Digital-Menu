'use strict';

const { Router }            = require('express');
const authMiddleware        = require('../middleware/authMiddleware');
const roleMiddleware        = require('../middleware/roleMiddleware');
const restaurantController  = require('../controllers/restaurantController');

// ─────────────────────────────────────────────
// Restaurant Routes
//
// Mount point: /api/restaurants
// Register in app.js:
//   app.use('/api/restaurants', require('./routes/restaurantRoutes'));
//
// All routes are protected:
//   1. authMiddleware  — verifies the JWT is valid
//   2. roleMiddleware  — ensures the caller is super_admin
//
// No restaurant user may access any of these endpoints.
// ─────────────────────────────────────────────

const router = Router();

// Apply auth + role guard to every route on this router.
// Declaring them once here is cleaner than repeating on each
// route and guarantees no route can accidentally be left unprotected.
router.use(authMiddleware);
router.use(roleMiddleware('super_admin'));

/**
 * POST /api/restaurants
 * Create a new restaurant (user account + restaurant profile).
 *
 * Body: { name, owner_name, email, phone, password }
 */
router.post('/', restaurantController.createRestaurant);

/**
 * GET /api/restaurants
 * Return all restaurants, newest first.
 */
router.get('/', restaurantController.getAllRestaurants);

/**
 * GET /api/restaurants/:id
 * Return a single restaurant by ID.
 */
router.get('/:id', restaurantController.getRestaurantById);

/**
 * PUT /api/restaurants/:id
 * Partially update a restaurant record.
 *
 * Body (all optional): { name, owner_name, email, phone, status }
 */
router.put('/:id', restaurantController.updateRestaurant);

/**
 * DELETE /api/restaurants/:id
 * Permanently remove a restaurant and its linked user account.
 */
router.delete('/:id', restaurantController.deleteRestaurant);

module.exports = router;