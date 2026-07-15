'use strict';

const db = require('../config/db');

// ─────────────────────────────────────────────
// CategoryModel
//
// All database interactions for the `categories`
// table. Multilingual: English + Amharic.
// Every query is scoped to restaurant_id so
// cross-tenant access is impossible at the
// data layer.
//
// No HTTP logic — only SQL.
// ─────────────────────────────────────────────

/**
 * @typedef {Object} Category
 * @property {number} id
 * @property {number} restaurant_id
 * @property {string} name_en
 * @property {string} name_am
 * @property {string|null} description_en
 * @property {string|null} description_am
 * @property {number} display_order
 * @property {'active'|'inactive'} status
 * @property {Date} created_at
 * @property {Date} updated_at
 */

const CategoryModel = {

  // ─────────────────────────────────────────
  // create
  // ─────────────────────────────────────────

  /**
   * Insert a new category.
   * restaurant_id always comes from the JWT — never from client.
   *
   * @param {Object} data
   * @param {number} data.restaurant_id
   * @param {string} data.name_en
   * @param {string} data.name_am
   * @param {string|null} data.description_en
   * @param {string|null} data.description_am
   * @param {number} data.display_order
   * @returns {Promise<Category>}
   */
  async create({
    restaurant_id,
    name_en,
    name_am,
    description_en,
    description_am,
    display_order,
  }) {
    const text = `
      INSERT INTO categories
        (restaurant_id, name_en, name_am, description_en, description_am, display_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id, restaurant_id,
        name_en, name_am,
        description_en, description_am,
        display_order, status,
        created_at, updated_at
    `;
    const values = [
      restaurant_id,
      name_en,
      name_am,
      description_en || null,
      description_am || null,
      display_order,
    ];
    const { rows } = await db.query(text, values);
    return rows[0];
  },

  // ─────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────

  /**
   * Return categories with optional filters.
   * When restaurant_id is provided results are
   * scoped to that tenant only.
   *
   * @param {Object} filters
   * @param {number|null} filters.restaurant_id
   * @param {string|null} filters.status
   * @param {string|null} filters.search  - matches name_en or name_am
   * @returns {Promise<Category[]>}
   */
  async findAll({ restaurant_id = null, status = null, search = null } = {}) {
    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (restaurant_id !== null) {
      conditions.push(`c.restaurant_id = $${idx}`);
      values.push(restaurant_id);
      idx++;
    }

    if (status !== null) {
      conditions.push(`c.status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (search !== null) {
      // Search across both language name fields
      conditions.push(`(c.name_en ILIKE $${idx} OR c.name_am ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const text = `
      SELECT
        c.id,
        c.restaurant_id,
        c.name_en,
        c.name_am,
        c.description_en,
        c.description_am,
        c.display_order,
        c.status,
        c.created_at,
        c.updated_at,
        r.name AS restaurant_name
      FROM   categories    c
      JOIN   restaurants   r ON r.id = c.restaurant_id
      ${where}
      ORDER  BY c.display_order ASC, c.name_en ASC
    `;

    const { rows } = await db.query(text, values);
    return rows;
  },

  // ─────────────────────────────────────────
  // findById
  // ─────────────────────────────────────────

  /**
   * Fetch a single category by ID.
   * Pass restaurant_id to scope to a tenant.
   * Pass null for super_admin (no tenant filter).
   *
   * @param {number} id
   * @param {number|null} restaurant_id
   * @returns {Promise<Category|null>}
   */
  async findById(id, restaurant_id = null) {
    const conditions = [`c.id = $1`];
    const values     = [id];

    if (restaurant_id !== null) {
      conditions.push(`c.restaurant_id = $2`);
      values.push(restaurant_id);
    }

    const text = `
      SELECT
        c.id,
        c.restaurant_id,
        c.name_en,
        c.name_am,
        c.description_en,
        c.description_am,
        c.display_order,
        c.status,
        c.created_at,
        c.updated_at,
        r.name AS restaurant_name
      FROM   categories    c
      JOIN   restaurants   r ON r.id = c.restaurant_id
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
   * Partially update a category.
   * restaurant_id guard prevents cross-tenant updates.
   *
   * @param {number} id
   * @param {number} restaurant_id
   * @param {Object} fields
   * @returns {Promise<Category|null>}
   */
  async update(id, restaurant_id, fields) {
    const allowed = [
      'name_en', 'name_am',
      'description_en', 'description_am',
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

    updates.push(`updated_at = NOW()`);
    values.push(id);
    values.push(restaurant_id);

    const text = `
      UPDATE categories
      SET    ${updates.join(', ')}
      WHERE  id            = $${idx}
        AND  restaurant_id = $${idx + 1}
      RETURNING
        id, restaurant_id,
        name_en, name_am,
        description_en, description_am,
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
   * Delete a category scoped to a restaurant.
   * Returns true if deleted, false if not found.
   *
   * @param {number} id
   * @param {number} restaurant_id
   * @returns {Promise<boolean>}
   */
  async delete(id, restaurant_id) {
    const text = `
      DELETE FROM categories
      WHERE  id            = $1
        AND  restaurant_id = $2
    `;
    const { rowCount } = await db.query(text, [id, restaurant_id]);
    return rowCount > 0;
  },

  // ─────────────────────────────────────────
  // isDuplicateNameEn
  // ─────────────────────────────────────────

  /**
   * Check if an English name already exists within
   * the same restaurant (case-insensitive).
   *
   * @param {string} name_en
   * @param {number} restaurant_id
   * @param {number|null} excludeId - exclude self during updates
   * @returns {Promise<boolean>}
   */
  async isDuplicateNameEn(name_en, restaurant_id, excludeId = null) {
    let text, values;

    if (excludeId) {
      text = `
        SELECT 1 FROM categories
        WHERE  LOWER(name_en)  = LOWER($1)
          AND  restaurant_id   = $2
          AND  id             != $3
        LIMIT  1
      `;
      values = [name_en, restaurant_id, excludeId];
    } else {
      text = `
        SELECT 1 FROM categories
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
   * @param {string} name_am
   * @param {number} restaurant_id
   * @param {number|null} excludeId
   * @returns {Promise<boolean>}
   */
  async isDuplicateNameAm(name_am, restaurant_id, excludeId = null) {
    let text, values;

    if (excludeId) {
      text = `
        SELECT 1 FROM categories
        WHERE  name_am       = $1
          AND  restaurant_id = $2
          AND  id           != $3
        LIMIT  1
      `;
      values = [name_am, restaurant_id, excludeId];
    } else {
      text = `
        SELECT 1 FROM categories
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

module.exports = CategoryModel;