'use strict';

const db = require('../config/db');

// ─────────────────────────────────────────────
// RestaurantModel
//
// All database interactions for the `restaurants`
// table. Business logic lives in controllers;
// this model handles only data access.
// ─────────────────────────────────────────────

/**
 * @typedef {Object} Restaurant
 * @property {number} id
 * @property {number} user_id      - FK → users.id
 * @property {string} name
 * @property {string} owner_name
 * @property {string} email
 * @property {string} phone
 * @property {'active'|'inactive'} status
 * @property {Date}   created_at
 */

const RestaurantModel = {
  // ───────────────────────────────────────────
  // createRestaurant
  // ───────────────────────────────────────────

  /**
   * Insert a new restaurant row.
   * Typically called after creating the associated user account.
   *
   * @param {Object} data
   * @param {number} data.user_id
   * @param {string} data.name
   * @param {string} data.owner_name
   * @param {string} data.email
   * @param {string} data.phone
   * @returns {Promise<Restaurant>}
   */
  async createRestaurant({ user_id, name, owner_name, email, phone }) {
    const text = `
      INSERT INTO restaurants (user_id, name, owner_name, email, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, name, owner_name, email, phone, status, created_at
    `;
    const values = [user_id, name, owner_name, email, phone];

    const { rows } = await db.query(text, values);
    return rows[0];
  },

  // ───────────────────────────────────────────
  // getAllRestaurants
  // ───────────────────────────────────────────

  /**
   * Return every restaurant with its linked user's name and email.
   * Used by the super_admin dashboard.
   *
   * @returns {Promise<Restaurant[]>}
   */
  async getAllRestaurants() {
    const text = `
      SELECT
        r.id,
        r.user_id,
        r.name,
        r.owner_name,
        r.email,
        r.phone,
        r.status,
        r.created_at,
        u.name  AS user_name,
        u.email AS user_email
      FROM   restaurants r
      JOIN   users       u ON u.id = r.user_id
      ORDER  BY r.created_at DESC
    `;
    const { rows } = await db.query(text);
    return rows;
  },

  // ───────────────────────────────────────────
  // getRestaurantById
  // ───────────────────────────────────────────

  /**
   * Fetch a single restaurant by its primary key.
   * Returns null when no match is found.
   *
   * @param {number} id
   * @returns {Promise<Restaurant|null>}
   */
  async getRestaurantById(id) {
    const text = `
      SELECT
        r.id,
        r.user_id,
        r.name,
        r.owner_name,
        r.email,
        r.phone,
        r.status,
        r.created_at,
        u.name  AS user_name,
        u.email AS user_email
      FROM   restaurants r
      JOIN   users       u ON u.id = r.user_id
      WHERE  r.id = $1
      LIMIT  1
    `;
    const { rows } = await db.query(text, [id]);
    return rows[0] || null;
  },

  // ───────────────────────────────────────────
  // updateRestaurant
  // ───────────────────────────────────────────

  /**
   * Partially update a restaurant record.
   * Only the fields present in `fields` are changed;
   * unmentioned columns are left untouched.
   *
   * @param {number} id
   * @param {Partial<Pick<Restaurant, 'name'|'owner_name'|'email'|'phone'|'status'>>} fields
   * @returns {Promise<Restaurant|null>} Updated row, or null if not found
   */
  async updateRestaurant(id, fields) {
    // Build SET clause dynamically to avoid overwriting un-provided fields
    const allowed = ['name', 'owner_name', 'email', 'phone', 'status'];
    const updates = [];
    const values  = [];
    let   paramIndex = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(fields[key]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      // Nothing to update — return the current row unchanged
      return this.getRestaurantById(id);
    }

    values.push(id); // final placeholder for WHERE clause

    const text = `
      UPDATE restaurants
      SET    ${updates.join(', ')}
      WHERE  id = $${paramIndex}
      RETURNING id, user_id, name, owner_name, email, phone, status, created_at
    `;

    const { rows } = await db.query(text, values);
    return rows[0] || null;
  },

  // ───────────────────────────────────────────
  // deleteRestaurant
  // ───────────────────────────────────────────

  /**
   * Permanently remove a restaurant record.
   * The cascade in init.sql handles any child rows in future tables.
   *
   * @param {number} id
   * @returns {Promise<boolean>} true if a row was deleted, false if not found
   */
  async deleteRestaurant(id) {
    const text = `
      DELETE FROM restaurants
      WHERE id = $1
    `;
    const { rowCount } = await db.query(text, [id]);
    return rowCount > 0;
  },
};

module.exports = RestaurantModel;