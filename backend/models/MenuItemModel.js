'use strict';

const db = require('../config/db');

// ─────────────────────────────────────────────
// MenuItemModel
//
// All database interactions for the `menu_items`
// table. Multilingual: English + Amharic.
// Every query is scoped to restaurant_id so
// cross-tenant access is impossible at the
// data layer — not just the controller layer.
//
// No HTTP logic — only SQL.
// ─────────────────────────────────────────────

/**
 * @typedef {Object} MenuItem
 * @property {number}  id
 * @property {number}  restaurant_id
 * @property {number}  category_id
 * @property {string}  name_en
 * @property {string}  name_am
 * @property {string|null} description_en
 * @property {string|null} description_am
 * @property {number}  price
 * @property {string}  currency
 * @property {string|null} image_url
 * @property {boolean} is_available
 * @property {number}  display_order
 * @property {'active'|'inactive'} status
 * @property {Date}    created_at
 * @property {Date}    updated_at
 */

const MenuItemModel = {

  // ─────────────────────────────────────────
  // create
  // ─────────────────────────────────────────

  /**
   * Insert a new menu item.
   * restaurant_id always comes from the JWT — never from client.
   *
   * @param {Object} data
   * @param {number}      data.restaurant_id
   * @param {number}      data.category_id
   * @param {string}      data.name_en
   * @param {string}      data.name_am
   * @param {string|null} data.description_en
   * @param {string|null} data.description_am
   * @param {number}      data.price
   * @param {string}      data.currency
   * @param {number}      data.display_order
   * @returns {Promise<MenuItem>}
   */
  async create({
    restaurant_id,
    category_id,
    name_en,
    name_am,
    description_en,
    description_am,
    price,
    currency,
    display_order,
  }) {
    const text = `
      INSERT INTO menu_items (
        restaurant_id, category_id,
        name_en, name_am,
        description_en, description_am,
        price, currency,
        display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id, restaurant_id, category_id,
        name_en, name_am,
        description_en, description_am,
        price, currency,
        image_url, is_available,
        display_order, status,
        created_at, updated_at
    `;
    const values = [
      restaurant_id,
      category_id,
      name_en,
      name_am,
      description_en || null,
      description_am || null,
      price,
      currency,
      display_order,
    ];
    const { rows } = await db.query(text, values);
    return rows[0];
  },

  // ─────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────

  /**
   * Return menu items with optional filters.
   * When restaurant_id is provided results are
   * scoped to that tenant only.
   *
   * @param {Object}      filters
   * @param {number|null} filters.restaurant_id
   * @param {number|null} filters.category_id
   * @param {string|null} filters.status
   * @param {boolean|null} filters.is_available
   * @param {string|null} filters.search - matches name_en or name_am
   * @returns {Promise<MenuItem[]>}
   */
  async findAll({
    restaurant_id = null,
    category_id   = null,
    status        = null,
    is_available  = null,
    search        = null,
  } = {}) {
    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (restaurant_id !== null) {
      conditions.push(`m.restaurant_id = $${idx}`);
      values.push(restaurant_id);
      idx++;
    }

    if (category_id !== null) {
      conditions.push(`m.category_id = $${idx}`);
      values.push(category_id);
      idx++;
    }

    if (status !== null) {
      conditions.push(`m.status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (is_available !== null) {
      conditions.push(`m.is_available = $${idx}`);
      values.push(is_available);
      idx++;
    }

    if (search !== null) {
      // Search across both language name fields
      conditions.push(`(m.name_en ILIKE $${idx} OR m.name_am ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const text = `
      SELECT
        m.id,
        m.restaurant_id,
        m.category_id,
        m.name_en,
        m.name_am,
        m.description_en,
        m.description_am,
        m.price,
        m.currency,
        m.image_url,
        m.is_available,
        m.display_order,
        m.status,
        m.created_at,
        m.updated_at,
        r.name          AS restaurant_name,
        c.name_en       AS category_name_en,
        c.name_am       AS category_name_am
      FROM   menu_items   m
      JOIN   restaurants  r ON r.id = m.restaurant_id
      JOIN   categories   c ON c.id = m.category_id
      ${where}
      ORDER  BY m.display_order ASC, m.name_en ASC
    `;

    const { rows } = await db.query(text, values);
    return rows;
  },

  // ─────────────────────────────────────────
  // findById
  // ─────────────────────────────────────────

  /**
   * Fetch a single menu item by ID.
   * Pass restaurant_id to scope to a tenant.
   * Pass null for super_admin (no tenant filter).
   *
   * @param {number}      id
   * @param {number|null} restaurant_id
   * @returns {Promise<MenuItem|null>}
   */
  async findById(id, restaurant_id = null) {
    const conditions = [`m.id = $1`];
    const values     = [id];

    if (restaurant_id !== null) {
      conditions.push(`m.restaurant_id = $2`);
      values.push(restaurant_id);
    }

    const text = `
      SELECT
        m.id,
        m.restaurant_id,
        m.category_id,
        m.name_en,
        m.name_am,
        m.description_en,
        m.description_am,
        m.price,
        m.currency,
        m.image_url,
        m.is_available,
        m.display_order,
        m.status,
        m.created_at,
        m.updated_at,
        r.name          AS restaurant_name,
        c.name_en       AS category_name_en,
        c.name_am       AS category_name_am
      FROM   menu_items   m
      JOIN   restaurants  r ON r.id = m.restaurant_id
      JOIN   categories   c ON c.id = m.category_id
      WHERE  ${conditions.join(' AND ')}
      LIMIT  1
    `;

    const { rows } = await db.query(text, values);
    return rows[0] || null;
  },

  // ─────────────────────────────────────────
  // update
  // ─────────────────────────────────────────

  /**
   * Partially update a menu item.
   * restaurant_id guard prevents cross-tenant updates.
   *
   * @param {number} id
   * @param {number} restaurant_id
   * @param {Object} fields
   * @returns {Promise<MenuItem|null>}
   */
  async update(id, restaurant_id, fields) {
    const allowed = [
      'category_id',
      'name_en', 'name_am',
      'description_en', 'description_am',
      'price', 'currency',
      'image_url', 'is_available',
      'display_order', 'status',
    ];
    const updates = [];
    const values  = [];
    let   idx     = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }

    if (updates.length === 0) {
      return this.findById(id, restaurant_id);
    }

    // Always bump updated_at
    updates.push(`updated_at = NOW()`);

    values.push(id);
    values.push(restaurant_id);

    const text = `
      UPDATE menu_items
      SET    ${updates.join(', ')}
      WHERE  id            = $${idx}
        AND  restaurant_id = $${idx + 1}
      RETURNING
        id, restaurant_id, category_id,
        name_en, name_am,
        description_en, description_am,
        price, currency,
        image_url, is_available,
        display_order, status,
        created_at, updated_at
    `;

    const { rows } = await db.query(text, values);
    return rows[0] || null;
  },

  // ─────────────────────────────────────────
  // delete
  // ─────────────────────────────────────────

  /**
   * Delete a menu item scoped to a restaurant.
   * Returns true if deleted, false if not found.
   * Structured to support future image cleanup.
   *
   * @param {number} id
   * @param {number} restaurant_id
   * @returns {Promise<MenuItem|null>} deleted row (for future image cleanup)
   */
  async delete(id, restaurant_id) {
    const text = `
      DELETE FROM menu_items
      WHERE  id            = $1
        AND  restaurant_id = $2
      RETURNING id, image_url
    `;
    const { rows } = await db.query(text, [id, restaurant_id]);
    return rows[0] || null;
  },

  // ─────────────────────────────────────────
  // isDuplicateNameEn
  // ─────────────────────────────────────────

  /**
   * Check if an English name already exists within
   * the same restaurant (case-insensitive).
   *
   * @param {string}      name_en
   * @param {number}      restaurant_id
   * @param {number|null} excludeId
   * @returns {Promise<boolean>}
   */
  async isDuplicateNameEn(name_en, restaurant_id, excludeId = null) {
    let text, values;

    if (excludeId) {
      text = `
        SELECT 1 FROM menu_items
        WHERE  LOWER(name_en)  = LOWER($1)
          AND  restaurant_id   = $2
          AND  id             != $3
        LIMIT  1
      `;
      values = [name_en, restaurant_id, excludeId];
    } else {
      text = `
        SELECT 1 FROM menu_items
        WHERE  LOWER(name_en) = LOWER($1)
          AND  restaurant_id  = $2
        LIMIT  1
      `;
      values = [name_en, restaurant_id];
    }

    const { rowCount } = await db.query(text, values);
    return rowCount > 0;
  },

  // ─────────────────────────────────────────
  // isDuplicateNameAm
  // ─────────────────────────────────────────

  /**
   * Check if an Amharic name already exists within
   * the same restaurant (exact match).
   *
   * @param {string}      name_am
   * @param {number}      restaurant_id
   * @param {number|null} excludeId
   * @returns {Promise<boolean>}
   */
  async isDuplicateNameAm(name_am, restaurant_id, excludeId = null) {
    let text, values;

    if (excludeId) {
      text = `
        SELECT 1 FROM menu_items
        WHERE  name_am       = $1
          AND  restaurant_id = $2
          AND  id           != $3
        LIMIT  1
      `;
      values = [name_am, restaurant_id, excludeId];
    } else {
      text = `
        SELECT 1 FROM menu_items
        WHERE  name_am       = $1
          AND  restaurant_id = $2
        LIMIT  1
      `;
      values = [name_am, restaurant_id];
    }

    const { rowCount } = await db.query(text, values);
    return rowCount > 0;
  },
};

module.exports = MenuItemModel;