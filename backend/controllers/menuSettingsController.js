'use strict';

const MenuItemModel = require('../models/MenuItemModel');
const RestaurantModel = require('../models/RestaurantModel');
const {
  validateAvailability,
  validateFeatured,
  validateDisplayOrder,
  validateBulkDisplayOrder,
  validateBulkAvailability,
} = require('../validators/menuSettingsValidator');

// ─────────────────────────────────────────────
// menuSettingsController
//
// Manages menu item presentation settings:
//   - availability (available / unavailable / hidden)
//   - is_featured (boolean)
//   - display_order (integer)
//
// MULTI-TENANCY: restaurant_id always resolved
// from JWT — never trusted from the client.
//
// Bulk operations run inside transactions to
// guarantee atomicity — all succeed or all roll back.
// ─────────────────────────────────────────────

// ── Internal helper ───────────────────────────

/**
 * Resolve the restaurant linked to the authenticated user.
 * @param {number} userId - req.user.id (from JWT)
 * @returns {Promise<Object|null>}
 */
const getRestaurantForUser = async (userId) => {
  const all = await RestaurantModel.getAllRestaurants();
  return all.find(r => r.user_id === userId) || null;
};

// ─────────────────────────────────────────────
// getMenuSettings
// GET /api/menu-settings
// ─────────────────────────────────────────────

/**
 * Return all menu items for the authenticated restaurant
 * with their settings fields, sorted by display_order.
 *
 * Super admin may filter by ?restaurant_id=N.
 */
const getMenuSettings = async (req, res, next) => {
  try {
    const { role } = req.user;
    let restaurant_id = null;

    if (role === 'restaurant') {
      const restaurant = await getRestaurantForUser(req.user.id);
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant account not found.',
        });
      }
      restaurant_id = restaurant.id;

    } else if (role === 'super_admin') {
      if (req.query.restaurant_id) {
        const parsed = parseInt(req.query.restaurant_id, 10);
        if (isNaN(parsed) || parsed < 1) {
          return res.status(400).json({
            success: false,
            message: 'Invalid restaurant_id filter.',
          });
        }
        restaurant_id = parsed;
      }
    }

    const items = await MenuItemModel.findByRestaurantId(restaurant_id);

    return res.status(200).json({
      success: true,
      message: 'Menu settings retrieved successfully.',
      count:   items.length,
      data:    items,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// updateAvailability
// PUT /api/menu-settings/:id/availability
// ─────────────────────────────────────────────

/**
 * Update the availability status of a single menu item.
 * Allowed values: available | unavailable | hidden
 */
const updateAvailability = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
    }

    const validationError = validateAvailability(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant account not found.' });
    }

    // Verify ownership before update
    const existing = await MenuItemModel.findById(id, restaurant.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    const updated = await MenuItemModel.updateAvailability(
      id,
      restaurant.id,
      req.body.availability
    );

    return res.status(200).json({
      success: true,
      message: 'Availability updated successfully.',
      data:    updated,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// updateFeaturedStatus
// PUT /api/menu-settings/:id/featured
// ─────────────────────────────────────────────

/**
 * Toggle the featured status of a single menu item.
 */
const updateFeaturedStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
    }

    const validationError = validateFeatured(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant account not found.' });
    }

    const existing = await MenuItemModel.findById(id, restaurant.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    const updated = await MenuItemModel.updateFeaturedStatus(
      id,
      restaurant.id,
      req.body.is_featured
    );

    return res.status(200).json({
      success: true,
      message: `Menu item ${req.body.is_featured ? 'marked as featured' : 'removed from featured'}.`,
      data:    updated,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// updateDisplayOrder
// PUT /api/menu-settings/:id/order
// ─────────────────────────────────────────────

/**
 * Update the display_order of a single menu item.
 */
const updateDisplayOrder = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
    }

    const validationError = validateDisplayOrder(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant account not found.' });
    }

    const existing = await MenuItemModel.findById(id, restaurant.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    const updated = await MenuItemModel.updateDisplayOrder(
      id,
      restaurant.id,
      parseInt(req.body.display_order, 10)
    );

    return res.status(200).json({
      success: true,
      message: 'Display order updated successfully.',
      data:    updated,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// bulkUpdateDisplayOrder
// PUT /api/menu-settings/order
// ─────────────────────────────────────────────

/**
 * Update display_order for multiple items in one transaction.
 * All items must belong to the authenticated restaurant.
 * If any item is not found, the entire transaction rolls back.
 */
const bulkUpdateDisplayOrder = async (req, res, next) => {
  try {
    const validationError = validateBulkDisplayOrder(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant account not found.' });
    }

    const items = req.body.items.map(item => ({
      id:            parseInt(item.id, 10),
      display_order: parseInt(item.display_order, 10),
    }));

    const updated = await MenuItemModel.bulkUpdateDisplayOrder(
      items,
      restaurant.id
    );

    return res.status(200).json({
      success: true,
      message: `Display order updated for ${updated.length} item(s).`,
      data:    updated,
    });

  } catch (err) {
    // Pass through known errors from the model (e.g. item not found)
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────
// bulkUpdateAvailability
// PUT /api/menu-settings/availability
// ─────────────────────────────────────────────

/**
 * Set the same availability for multiple items in one transaction.
 * All items must belong to the authenticated restaurant.
 */
const bulkUpdateAvailability = async (req, res, next) => {
  try {
    const validationError = validateBulkAvailability(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant account not found.' });
    }

    const ids          = req.body.ids.map(id => parseInt(id, 10));
    const availability = req.body.availability;

    const updated = await MenuItemModel.bulkUpdateAvailability(
      ids,
      restaurant.id,
      availability
    );

    return res.status(200).json({
      success: true,
      message: `Availability set to "${availability}" for ${updated.length} item(s).`,
      data:    updated,
    });

  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

module.exports = {
  getMenuSettings,
  updateAvailability,
  updateFeaturedStatus,
  updateDisplayOrder,
  bulkUpdateDisplayOrder,
  bulkUpdateAvailability,
};