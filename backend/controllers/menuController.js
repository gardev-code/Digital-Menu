'use strict';

const MenuItemModel  = require('../models/MenuItemModel');
const CategoryModel  = require('../models/CategoryModel');
const RestaurantModel = require('../models/RestaurantModel');
const { validateCreate, validateUpdate } = require('../validators/menuValidator');

// ─────────────────────────────────────────────
// menuController
//
// Handles all menu item management requests.
// Supports English + Amharic multilingual content.
//
// MULTI-TENANCY: restaurant_id is ALWAYS resolved
// server-side from the JWT — never trusted from
// the client under any circumstances.
//
// CATEGORY SECURITY: before creating or updating,
// the selected category is verified to belong to
// the same authenticated restaurant. A restaurant
// cannot use another restaurant's category.
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Internal helper — resolve restaurant from JWT
// ─────────────────────────────────────────────

/**
 * Find the restaurant linked to the authenticated user.
 * Uses users.id = restaurants.user_id relationship.
 *
 * @param {number} userId - req.user.id (from JWT)
 * @returns {Promise<Object|null>}
 */
const getRestaurantForUser = async (userId) => {
  const all = await RestaurantModel.getAllRestaurants();
  return all.find(r => r.user_id === userId) || null;
};

// ─────────────────────────────────────────────
// createMenuItem
// POST /api/menu-items
// ─────────────────────────────────────────────

/**
 * Create a new multilingual menu item for the
 * authenticated restaurant.
 * restaurant_id is resolved from JWT — never from client.
 * category is verified to belong to same restaurant.
 */
const createMenuItem = async (req, res, next) => {
  try {
    // ── 1. Resolve restaurant ─────────────────
    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant account not found. Please contact your administrator.',
      });
    }

    // ── 2. Validate input ─────────────────────
    const validationError = validateCreate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const {
      category_id,
      name_en, name_am,
      description_en, description_am,
      price, currency,
      display_order,
    } = req.body;

    const parsedCategoryId = parseInt(category_id, 10);

    // ── 3. Verify category belongs to this restaurant ──
    // A restaurant cannot use another restaurant's category.
    const category = await CategoryModel.findById(parsedCategoryId, restaurant.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or does not belong to your restaurant.',
      });
    }

    const trimmedNameEn = name_en.trim();
    const trimmedNameAm = name_am.trim();
    const parsedPrice   = parseFloat(price);
    const order         = display_order !== undefined ? parseInt(display_order, 10) : 0;

    // ── 4. Duplicate name checks ──────────────
    const dupEn = await MenuItemModel.isDuplicateNameEn(trimmedNameEn, restaurant.id);
    if (dupEn) {
      return res.status(409).json({
        success: false,
        message: `A menu item with the English name "${trimmedNameEn}" already exists in your menu.`,
      });
    }

    const dupAm = await MenuItemModel.isDuplicateNameAm(trimmedNameAm, restaurant.id);
    if (dupAm) {
      return res.status(409).json({
        success: false,
        message: `A menu item with the Amharic name "${trimmedNameAm}" already exists in your menu.`,
      });
    }

    // ── 5. Create ─────────────────────────────
    const menuItem = await MenuItemModel.create({
      restaurant_id:  restaurant.id,       // server-resolved — never from client
      category_id:    parsedCategoryId,
      name_en:        trimmedNameEn,
      name_am:        trimmedNameAm,
      description_en: description_en ? description_en.trim() : null,
      description_am: description_am ? description_am.trim() : null,
      price:          parsedPrice,
      currency:       currency || 'ETB',
      display_order:  order,
    });

    return res.status(201).json({
      success: true,
      message: 'Menu item created successfully.',
      data:    menuItem,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// getMenuItems
// GET /api/menu-items
// GET /api/menu-items?category_id=5
// GET /api/menu-items?status=active
// GET /api/menu-items?available=true
// GET /api/menu-items?search=burger
// GET /api/menu-items?restaurant_id=10  (super_admin only)
// ─────────────────────────────────────────────

/**
 * Return menu items with optional filtering.
 *
 * Restaurant users → scoped to their own restaurant.
 *   Ignored params: restaurant_id (always overridden)
 *   Supported params: category_id, status, available, search
 *
 * Super admin → may filter by restaurant_id, plus all above.
 */
const getMenuItems = async (req, res, next) => {
  try {
    const { role } = req.user;
    let restaurant_id = null;
    const { category_id, status, available, search } = req.query;

    if (role === 'restaurant') {
      // Force restaurant_id from JWT — ignore any client value
      const restaurant = await getRestaurantForUser(req.user.id);
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant account not found.',
        });
      }
      restaurant_id = restaurant.id;

    } else if (role === 'super_admin') {
      // Super admin may optionally scope by restaurant
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

    // Validate optional category_id filter
    let parsedCategoryId = null;
    if (category_id) {
      parsedCategoryId = parseInt(category_id, 10);
      if (isNaN(parsedCategoryId) || parsedCategoryId < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category_id filter.',
        });
      }
    }

    // Validate optional status filter
    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'inactive'.",
      });
    }

    // Parse availability filter
    let isAvailable = null;
    if (available !== undefined) {
      if (available === 'true')       isAvailable = true;
      else if (available === 'false') isAvailable = false;
      else {
        return res.status(400).json({
          success: false,
          message: "available must be 'true' or 'false'.",
        });
      }
    }

    const menuItems = await MenuItemModel.findAll({
      restaurant_id: restaurant_id,
      category_id:   parsedCategoryId,
      status:        status       || null,
      is_available:  isAvailable,
      search:        search       || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Menu items retrieved successfully.',
      count:   menuItems.length,
      data:    menuItems,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// getMenuItemById
// GET /api/menu-items/:id
// ─────────────────────────────────────────────

/**
 * Return a single menu item by ID.
 * Restaurant users: verified against their own restaurant.
 * Super admin: may view any menu item.
 */
const getMenuItemById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID.',
      });
    }

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
    }
    // super_admin: restaurant_id stays null → no tenant filter

    const menuItem = await MenuItemModel.findById(id, restaurant_id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Menu item retrieved successfully.',
      data:    menuItem,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// updateMenuItem
// PUT /api/menu-items/:id
// ─────────────────────────────────────────────

/**
 * Partially update a menu item.
 * Restaurant users only — scoped to their own restaurant.
 * If category_id changes, new category is verified to
 * belong to the same restaurant.
 */
const updateMenuItem = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID.',
      });
    }

    // ── 1. Resolve restaurant ─────────────────
    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant account not found.',
      });
    }

    // ── 2. Verify ownership ───────────────────
    const existing = await MenuItemModel.findById(id, restaurant.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found.',
      });
    }

    // ── 3. Validate input ─────────────────────
    const validationError = validateUpdate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const {
      category_id,
      name_en, name_am,
      description_en, description_am,
      price, currency,
      image_url, is_available,
      display_order, status,
    } = req.body;

    const fields = {};

    // ── 4. Category change — verify ownership ─
    if (category_id !== undefined) {
      const parsedCatId = parseInt(category_id, 10);
      const category = await CategoryModel.findById(parsedCatId, restaurant.id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found or does not belong to your restaurant.',
        });
      }
      fields.category_id = parsedCatId;
    }

    // ── 5. Name duplicate checks ──────────────
    if (name_en !== undefined) {
      const trimmed = name_en.trim();
      const dup = await MenuItemModel.isDuplicateNameEn(trimmed, restaurant.id, id);
      if (dup) {
        return res.status(409).json({
          success: false,
          message: `A menu item with the English name "${trimmed}" already exists in your menu.`,
        });
      }
      fields.name_en = trimmed;
    }

    if (name_am !== undefined) {
      const trimmed = name_am.trim();
      const dup = await MenuItemModel.isDuplicateNameAm(trimmed, restaurant.id, id);
      if (dup) {
        return res.status(409).json({
          success: false,
          message: `A menu item with the Amharic name "${trimmed}" already exists in your menu.`,
        });
      }
      fields.name_am = trimmed;
    }

    // ── 6. Build remaining fields ─────────────
    if (description_en !== undefined) {
      fields.description_en = description_en ? description_en.trim() : null;
    }
    if (description_am !== undefined) {
      fields.description_am = description_am ? description_am.trim() : null;
    }
    if (price !== undefined) {
      fields.price = parseFloat(price);
    }
    if (currency !== undefined) {
      fields.currency = currency;
    }
    if (image_url !== undefined) {
      fields.image_url = image_url ? image_url.trim() : null;
    }
    if (is_available !== undefined) {
      fields.is_available = is_available;
    }
    if (display_order !== undefined) {
      fields.display_order = parseInt(display_order, 10);
    }
    if (status !== undefined) {
      fields.status = status;
    }

    // ── 7. Update ─────────────────────────────
    const updated = await MenuItemModel.update(id, restaurant.id, fields);

    return res.status(200).json({
      success: true,
      message: 'Menu item updated successfully.',
      data:    updated,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// deleteMenuItem
// DELETE /api/menu-items/:id
// ─────────────────────────────────────────────

/**
 * Delete a menu item belonging to the authenticated restaurant.
 * Returns the deleted row so future batches can clean up images.
 */
const deleteMenuItem = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID.',
      });
    }

    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant account not found.',
      });
    }

    const deleted = await MenuItemModel.delete(id, restaurant.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found.',
      });
    }

    // image_url is returned for future image cleanup batch
    return res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully.',
    });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  createMenuItem,
  getMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
};