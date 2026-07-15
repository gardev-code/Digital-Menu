'use strict';

const CategoryModel      = require('../models/CategoryModel');
const RestaurantModel    = require('../models/RestaurantModel');
const { validateCreate, validateUpdate } = require('../validators/categoryValidator');

// ─────────────────────────────────────────────
// categoryController
//
// Handles all category management requests.
// Supports English + Amharic multilingual content.
//
// MULTI-TENANCY: restaurant_id is ALWAYS resolved
// server-side from the JWT. Never trusted from
// the client under any circumstances.
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
// createCategory
// POST /api/categories
// ─────────────────────────────────────────────

/**
 * Create a new multilingual category for the
 * authenticated restaurant.
 * restaurant_id is resolved from JWT — never from client.
 */
const createCategory = async (req, res, next) => {
  try {
    // ── 1. Resolve restaurant ─────────────────
    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant account not found. Please contact your administrator.',
      });
    }

    // ── 2. Validate input via validator ───────
    const validationError = validateCreate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const {
      name_en, name_am,
      description_en, description_am,
      display_order,
    } = req.body;

    const trimmedNameEn = name_en.trim();
    const trimmedNameAm = name_am.trim();
    const order = display_order !== undefined ? parseInt(display_order, 10) : 0;

    // ── 3. Duplicate name checks ──────────────
    const dupEn = await CategoryModel.isDuplicateNameEn(
      trimmedNameEn, restaurant.id
    );
    if (dupEn) {
      return res.status(409).json({
        success: false,
        message: `A category with the English name "${trimmedNameEn}" already exists in your menu.`,
      });
    }

    const dupAm = await CategoryModel.isDuplicateNameAm(
      trimmedNameAm, restaurant.id
    );
    if (dupAm) {
      return res.status(409).json({
        success: false,
        message: `A category with the Amharic name "${trimmedNameAm}" already exists in your menu.`,
      });
    }

    // ── 4. Create ─────────────────────────────
    const category = await CategoryModel.create({
      restaurant_id:  restaurant.id,   // server-resolved — never from client
      name_en:        trimmedNameEn,
      name_am:        trimmedNameAm,
      description_en: description_en ? description_en.trim() : null,
      description_am: description_am ? description_am.trim() : null,
      display_order:  order,
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data:    category,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// getCategories
// GET /api/categories
// GET /api/categories?status=active
// GET /api/categories?search=pizza
// GET /api/categories?restaurant_id=10  (super_admin only)
// ─────────────────────────────────────────────

/**
 * Return categories with optional filtering.
 *
 * Restaurant users → scoped to their own restaurant.
 *   Ignored params: restaurant_id (always overridden)
 *   Supported params: status, search
 *
 * Super admin → may filter by restaurant_id, status, search.
 */
const getCategories = async (req, res, next) => {
  try {
    const { role } = req.user;
    let restaurant_id = null;
    const { status, search } = req.query;

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

    // Validate status filter
    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'inactive'.",
      });
    }

    const categories = await CategoryModel.findAll({
      restaurant_id: restaurant_id,
      status:        status || null,
      search:        search || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully.',
      count:   categories.length,
      data:    categories,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// getCategoryById
// GET /api/categories/:id
// ─────────────────────────────────────────────

/**
 * Return a single category by ID.
 * Restaurant users: verified against their own restaurant.
 * Super admin: may view any category.
 */
const getCategoryById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID.',
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

    const category = await CategoryModel.findById(id, restaurant_id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Category retrieved successfully.',
      data:    category,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// updateCategory
// PUT /api/categories/:id
// ─────────────────────────────────────────────

/**
 * Partially update a category.
 * Restaurant users only — scoped to their own restaurant.
 */
const updateCategory = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID.',
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
    const existing = await CategoryModel.findById(id, restaurant.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
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
      name_en, name_am,
      description_en, description_am,
      display_order, status,
    } = req.body;

    const fields = {};

    // ── 4. Build update fields ────────────────
    if (name_en !== undefined) {
      const trimmed = name_en.trim();
      const dup = await CategoryModel.isDuplicateNameEn(trimmed, restaurant.id, id);
      if (dup) {
        return res.status(409).json({
          success: false,
          message: `A category with the English name "${trimmed}" already exists in your menu.`,
        });
      }
      fields.name_en = trimmed;
    }

    if (name_am !== undefined) {
      const trimmed = name_am.trim();
      const dup = await CategoryModel.isDuplicateNameAm(trimmed, restaurant.id, id);
      if (dup) {
        return res.status(409).json({
          success: false,
          message: `A category with the Amharic name "${trimmed}" already exists in your menu.`,
        });
      }
      fields.name_am = trimmed;
    }

    if (description_en !== undefined) {
      fields.description_en = description_en ? description_en.trim() : null;
    }

    if (description_am !== undefined) {
      fields.description_am = description_am ? description_am.trim() : null;
    }

    if (display_order !== undefined) {
      fields.display_order = parseInt(display_order, 10);
    }

    if (status !== undefined) {
      fields.status = status;
    }

    // ── 5. Update ─────────────────────────────
    const updated = await CategoryModel.update(id, restaurant.id, fields);

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      data:    updated,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// deleteCategory
// DELETE /api/categories/:id
// ─────────────────────────────────────────────

/**
 * Delete a category belonging to the authenticated restaurant.
 * Scoped DELETE prevents cross-tenant deletions.
 */
const deleteCategory = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID.',
      });
    }

    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant account not found.',
      });
    }

    const deleted = await CategoryModel.delete(id, restaurant.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully.',
    });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};