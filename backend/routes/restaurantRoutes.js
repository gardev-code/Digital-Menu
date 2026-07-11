'use strict';

const { Router }           = require('express');
const authMiddleware       = require('../middleware/authMiddleware');
const roleMiddleware       = require('../middleware/roleMiddleware');
const restaurantController = require('../controllers/restaurantController');

const router = Router();

// Auth required for all routes
router.use(authMiddleware);

// GET /api/restaurants/me — restaurant user fetches their own data
// MUST be before /:id so 'me' is not treated as an ID
router.get(
  '/me',
  roleMiddleware('restaurant'),
  restaurantController.getMyRestaurant
);

// All routes below are super_admin only
router.post(  '/',    roleMiddleware('super_admin'), restaurantController.createRestaurant);
router.get(   '/',    roleMiddleware('super_admin'), restaurantController.getAllRestaurants);
router.get(   '/:id', roleMiddleware('super_admin'), restaurantController.getRestaurantById);
router.put(   '/:id', roleMiddleware('super_admin'), restaurantController.updateRestaurant);
router.delete('/:id', roleMiddleware('super_admin'), restaurantController.deleteRestaurant);

module.exports = router;