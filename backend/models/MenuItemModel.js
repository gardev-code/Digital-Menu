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

const MenuItemModel = {

  // ─────────────────────────────────────────
  // create
  // ─────────────────────────────────────────

  async create({
    restaurant_id, category_id,
    name_en, name_am,
    description_en, description_am,
    price, currency, display_order,
  }) {
    const text = `
      INSERT INTO menu_items (
        restaurant_id, category_id,
        name_en, name_am,
        description_en, description_am,
        price, currency, display_order
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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
      restaurant_id, category_id,
      name_en, name_am,
      description_en || null, description_am || null,
      price, currency, display_order,
    ];
    const { rows } = await db.query(text, values);
    return rows[0];
  },

  // ─────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────

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
      conditions.push(`m.restaurant_id = $${idx}`); values.push(restaurant_id); idx++;
    }
    if (category_id !== null) {
      conditions.push(`m.category_id = $${idx}`); values.push(category_id); idx++;
    }
    if (status !== null) {
      conditions.push(`m.status = $${idx}`); values.push(status); idx++;
    }
    if (is_available !== null) {
      conditions.push(`m.is_available = $${idx}`); values.push(is_available); idx++;
    }
    if (search !== null) {
      conditions.push(`(m.name_en ILIKE $${idx} OR m.name_am ILIKE $${idx})`);
      values.push(`%${search}%`); idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const text = `
      SELECT
        m.id, m.restaurant_id, m.category_id,
        m.name_en, m.name_am,
        m.description_en, m.description_am,
        m.price, m.currency,
        m.image_url, m.is_available,
        m.display_order, m.status,
        m.created_at, m.updated_at,
        r.name        AS restaurant_name,
        c.name_en     AS category_name_en,
        c.name_am     AS category_name_am
      FROM   menu_items  m
      JOIN   restaurants r ON r.id = m.restaurant_id
      JOIN   categories  c ON c.id = m.category_id
      ${where}
      ORDER  BY m.display_order ASC, m.name_en ASC
    `;
    const { rows } = await db.query(text, values);
    return rows;
  },

  // ─────────────────────────────────────────
  // findById
  // ─────────────────────────────────────────

  async findById(id, restaurant_id = null) {
    const conditions = [`m.id = $1`];
    const values     = [id];

    if (restaurant_id !== null) {
      conditions.push(`m.restaurant_id = $2`);
      values.push(restaurant_id);
    }

    const text = `
      SELECT
        m.id, m.restaurant_id, m.category_id,
        m.name_en, m.name_am,
        m.description_en, m.description_am,
        m.price, m.currency,
        m.image_url, m.is_available,
        m.display_order, m.status,
        m.created_at, m.updated_at,
        r.name        AS restaurant_name,
        c.name_en     AS category_name_en,
        c.name_am     AS category_name_am
      FROM   menu_items  m
      JOIN   restaurants r ON r.id = m.restaurant_id
      JOIN   categories  c ON c.id = m.category_id
      WHERE  ${conditions.join(' AND ')}
      LIMIT  1
    `;
    const { rows } = await db.query(text, values);
    return rows[0] || null;
  },

  // ─────────────────────────────────────────
  // update
  // ─────────────────────────────────────────

  async update(id, restaurant_id, fields) {
    const allowed = [
      'category_id', 'name_en', 'name_am',
      'description_en', 'description_am',
      'price', 'currency', 'image_url',
      'is_available', 'display_order', 'status',
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

    if (updates.length === 0) return this.findById(id, restaurant_id);

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

  async isDuplicateNameEn(name_en, restaurant_id, excludeId = null) {
    const text = excludeId
      ? `SELECT 1 FROM menu_items WHERE LOWER(name_en)=LOWER($1) AND restaurant_id=$2 AND id!=$3 LIMIT 1`
      : `SELECT 1 FROM menu_items WHERE LOWER(name_en)=LOWER($1) AND restaurant_id=$2 LIMIT 1`;
    const values = excludeId
      ? [name_en, restaurant_id, excludeId]
      : [name_en, restaurant_id];
    const { rowCount } = await db.query(text, values);
    return rowCount > 0;
  },

  // ─────────────────────────────────────────
  // isDuplicateNameAm
  // ─────────────────────────────────────────

  async isDuplicateNameAm(name_am, restaurant_id, excludeId = null) {
    const text = excludeId
      ? `SELECT 1 FROM menu_items WHERE name_am=$1 AND restaurant_id=$2 AND id!=$3 LIMIT 1`
      : `SELECT 1 FROM menu_items WHERE name_am=$1 AND restaurant_id=$2 LIMIT 1`;
    const values = excludeId
      ? [name_am, restaurant_id, excludeId]
      : [name_am, restaurant_id];
    const { rowCount } = await db.query(text, values);
    return rowCount > 0;
  },

  // ─────────────────────────────────────────
  // updateImage  (Phase 2 Batch 3)
  // ─────────────────────────────────────────

  /**
   * Set the image_url for a menu item.
   * Scoped to restaurant_id for tenant safety.
   *
   * @param {number} id
   * @param {number} restaurant_id
   * @param {string} imageUrl
   * @returns {Promise<{id: number, image_url: string}|null>}
   */
  async updateImage(id, restaurant_id, imageUrl) {
    const text = `
      UPDATE menu_items
      SET    image_url  = $1,
             updated_at = NOW()
      WHERE  id            = $2
        AND  restaurant_id = $3
      RETURNING id, image_url
    `;
    const { rows } = await db.query(text, [imageUrl, id, restaurant_id]);
    return rows[0] || null;
  },

  // ─────────────────────────────────────────
  // removeImage  (Phase 2 Batch 3)
  // ─────────────────────────────────────────

  /**
   * Set image_url to NULL for a menu item.
   * Scoped to restaurant_id for tenant safety.
   *
   * @param {number} id
   * @param {number} restaurant_id
   * @returns {Promise<{id: number}|null>}
   */
  async removeImage(id, restaurant_id) {
    const text = `
      UPDATE menu_items
      SET    image_url  = NULL,
             updated_at = NOW()
      WHERE  id            = $1
        AND  restaurant_id = $2
      RETURNING id
    `;
    const { rows } = await db.query(text, [id, restaurant_id]);
    return rows[0] || null;
  },

  // ─────────────────────────────────────────
  // findImageById  (Phase 2 Batch 3)
  // ─────────────────────────────────────────

  /**
   * Fetch only the image_url for a menu item.
   * Pass null restaurant_id for super_admin lookups.
   *
   * @param {number}      id
   * @param {number|null} restaurant_id
   * @returns {Promise<{id: number, image_url: string|null}|null>}
   */
  async findImageById(id, restaurant_id = null) {
    let text, values;

    if (restaurant_id !== null) {
      text   = `SELECT id, image_url FROM menu_items WHERE id=$1 AND restaurant_id=$2 LIMIT 1`;
      values = [id, restaurant_id];
    } else {
      text   = `SELECT id, image_url FROM menu_items WHERE id=$1 LIMIT 1`;
      values = [id];
    }

    const { rows } = await db.query(text, values);
    return rows[0] || null;
  },
};

module.exports = MenuItemModel;