'use strict';

const bcrypt           = require('bcrypt');
const UserModel        = require('../models/UserModel');
const RestaurantModel  = require('../models/RestaurantModel');
const { getClient }    = require('../config/db');

// ─────────────────────────────────────────────
// restaurantController
//
// All restaurant management actions.
// Only accessible to authenticated super_admin
// users (enforced at the route layer).
//
// createRestaurant uses a DB transaction to
// guarantee that the linked user row and the
// restaurant row are always created together or
// not at all — no orphaned records.
// ─────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;

// ── Shared validation helpers ────────────────

/**
 * Basic email format check.
 * @param {string} email
 * @returns {boolean}
 */
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Collect missing / blank required fields and return
 * a human-readable message, or null if all present.
 *
 * @param {Object}   body
 * @param {string[]} fields
 * @returns {string|null}
 */
const missingFields = (body, fields) => {
  const missing = fields.filter(
    (f) => !body[f] || (typeof body[f] === 'string' && !body[f].trim())
  );
  return missing.length
    ? `Missing required fields: ${missing.join(', ')}.`
    : null;
};

// ─────────────────────────────────────────────
// createRestaurant
// POST /api/restaurants
// ─────────────────────────────────────────────

/**
 * Create a restaurant user account and its restaurant
 * profile inside a single DB transaction.
 *
 * Steps:
 *   1. Validate input
 *   2. Check for duplicate email (users + restaurants tables)
 *   3. Hash password
 *   4. INSERT user  (role = 'restaurant')
 *   5. INSERT restaurant linked to that user
 *   6. COMMIT and return the new restaurant
 */
const createRestaurant = async (req, res, next) => {
  const client = await getClient(); // transaction client

  try {
    const { name, owner_name, email, phone, password } = req.body;

    // ── 1. Input validation ──────────────────
    const missing = missingFields(req.body, [
      'name', 'owner_name', 'email', 'phone', 'password',
    ]);
    if (missing) {
      return res.status(400).json({ success: false, message: missing });
    }

    if (!isValidEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.',
      });
    }

    // ── 2. Duplicate email check ─────────────
    // Check both tables: a super_admin could share an
    // email with a restaurant contact, which citext would block.
    const existingUser = await UserModel.findByEmail(email.trim());
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // ── 3. Hash password ─────────────────────
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // ── 4 & 5. Atomic insert (transaction) ───
    await client.query('BEGIN');

    // Insert user account
    const userResult = await client.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'restaurant')
       RETURNING id, name, email, role, created_at`,
      [owner_name.trim(), email.trim().toLowerCase(), hashedPassword]
    );
    const newUser = userResult.rows[0];

    // Insert restaurant profile linked to the new user
    const restaurantResult = await client.query(
      `INSERT INTO restaurants (user_id, name, owner_name, email, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, name, owner_name, email, phone, status, created_at`,
      [
        newUser.id,
        name.trim(),
        owner_name.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
      ]
    );
    const newRestaurant = restaurantResult.rows[0];

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Restaurant created successfully.',
      data: {
        restaurant: newRestaurant,
        user: {
          id:         newUser.id,
          name:       newUser.name,
          email:      newUser.email,
          role:       newUser.role,
          created_at: newUser.created_at,
        },
      },
    });

  } catch (err) {
    await client.query('ROLLBACK');

    // PostgreSQL unique-violation code
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A restaurant with this email already exists.',
      });
    }

    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────
// getAllRestaurants
// GET /api/restaurants
// ─────────────────────────────────────────────

/**
 * Return all restaurants joined with their owner user,
 * sorted newest first.
 */
const getAllRestaurants = async (req, res, next) => {
  try {
    const restaurants = await RestaurantModel.getAllRestaurants();

    return res.status(200).json({
      success: true,
      message: 'Restaurants retrieved successfully.',
      count: restaurants.length,
      data: restaurants,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// getRestaurantById
// GET /api/restaurants/:id
// ─────────────────────────────────────────────

/**
 * Return a single restaurant by primary key.
 * Responds 404 when no record matches.
 */
const getRestaurantById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid restaurant ID.',
      });
    }

    const restaurant = await RestaurantModel.getRestaurantById(id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Restaurant retrieved successfully.',
      data: restaurant,
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// updateRestaurant
// PUT /api/restaurants/:id
// ─────────────────────────────────────────────

/**
 * Partially update a restaurant record.
 * Only fields provided in the request body are changed.
 * Allowed: name, owner_name, email, phone, status.
 */
const updateRestaurant = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid restaurant ID.',
      });
    }

    // Confirm the record exists before attempting update
    const existing = await RestaurantModel.getRestaurantById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found.',
      });
    }

    // Whitelist updatable fields
    const { name, owner_name, email, phone, status } = req.body;
    const fields = {};

    if (name       !== undefined) fields.name       = name.trim();
    if (owner_name !== undefined) fields.owner_name = owner_name.trim();
    if (phone      !== undefined) fields.phone      = phone.trim();

    if (email !== undefined) {
      if (!isValidEmail(email.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.',
        });
      }
      fields.email = email.trim().toLowerCase();
    }

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be 'active' or 'inactive'.",
        });
      }
      fields.status = status;
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update.',
      });
    }

    const updated = await RestaurantModel.updateRestaurant(id, fields);

    return res.status(200).json({
      success: true,
      message: 'Restaurant updated successfully.',
      data: updated,
    });

  } catch (err) {
    // Unique constraint on email
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A restaurant with this email already exists.',
      });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────
// deleteRestaurant
// DELETE /api/restaurants/:id
// ─────────────────────────────────────────────

/**
 * Delete a restaurant and its linked user account.
 *
 * The ON DELETE CASCADE on restaurants.user_id means
 * deleting the user row also removes the restaurant row.
 * We therefore delete the user — one clean operation.
 *
 * Wrapped in a transaction so both tables stay consistent
 * if an unexpected error occurs mid-delete.
 */
const deleteRestaurant = async (req, res, next) => {
  const client = await getClient();

  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid restaurant ID.',
      });
    }

    // Fetch the restaurant to get its linked user_id
    const restaurant = await RestaurantModel.getRestaurantById(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found.',
      });
    }

    await client.query('BEGIN');

    // Deleting the user cascades to the restaurant row automatically
    // (ON DELETE CASCADE defined in init.sql).
    await client.query('DELETE FROM users WHERE id = $1', [restaurant.user_id]);

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Restaurant deleted successfully.',
    });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};


const getMyRestaurant = async (req, res, next) => {
  try {
    const all = await RestaurantModel.getAllRestaurants();
    const restaurant = all.find(r => r.user_id === req.user.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────

module.exports = {
  createRestaurant,
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  getMyRestaurant,
};