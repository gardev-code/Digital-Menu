'use strict';

const db = require('../config/db');

// ─────────────────────────────────────────────
// MenuItemModel
//
// All database interactions for the `menu_items`
// table. Multilingual: English + Amharic.
// Every query is scoped to restaurant_id so
// cross-tenant access is impossible at the
// data layer.
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
        image_url, availability,
        availability, is_featured,
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
  availability  = null,
  search        = null,
} = {}) {
  const conditions = [];
  const values     = [];
  let idx          = 1;

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

  if (availability !== null) {
    conditions.push(`m.availability = $${idx}`);
    values.push(availability);
    idx++;
  }

  if (search !== null) {
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
      m.availability,
      m.is_featured,
      m.display_order,
      m.status,
      m.created_at,
      m.updated_at,
      r.name AS restaurant_name,
      c.name_en AS category_name_en,
      c.name_am AS category_name_am
    FROM menu_items m
    JOIN restaurants r 
      ON r.id = m.restaurant_id
    JOIN categories c 
      ON c.id = m.category_id
    ${where}
    ORDER BY m.display_order ASC, m.name_en ASC
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
        m.image_url,   m.availability,
        m.availability, m.is_featured,
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
      'availability', 'is_featured',
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
        image_url, availability,
        availability, is_featured,
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
    const values = excludeId ? [name_en, restaurant_id, excludeId] : [name_en, restaurant_id];
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
    const values = excludeId ? [name_am, restaurant_id, excludeId] : [name_am, restaurant_id];
    const { rowCount } = await db.query(text, values);
    return rowCount > 0;
  },

  // ─────────────────────────────────────────
  // updateImage  (Phase 2 Batch 3)
  // ─────────────────────────────────────────

  async updateImage(id, restaurant_id, imageUrl) {
    const text = `
      UPDATE menu_items
      SET    image_url  = $1, updated_at = NOW()
      WHERE  id = $2 AND restaurant_id = $3
      RETURNING id, image_url
    `;
    const { rows } = await db.query(text, [imageUrl, id, restaurant_id]);
    return rows[0] || null;
  },

  // ─────────────────────────────────────────
  // removeImage  (Phase 2 Batch 3)
  // ─────────────────────────────────────────

  async removeImage(id, restaurant_id) {
    const text = `
      UPDATE menu_items
      SET    image_url = NULL, updated_at = NOW()
      WHERE  id = $1 AND restaurant_id = $2
      RETURNING id
    `;
    const { rows } = await db.query(text, [id, restaurant_id]);
    return rows[0] || null;
  },

  // ─────────────────────────────────────────
  // findImageById  (Phase 2 Batch 3)
  // ─────────────────────────────────────────

  async findImageById(id, restaurant_id = null) {
    const text = restaurant_id !== null
      ? `SELECT id, image_url FROM menu_items WHERE id=$1 AND restaurant_id=$2 LIMIT 1`
      : `SELECT id, image_url FROM menu_items WHERE id=$1 LIMIT 1`;
    const values = restaurant_id !== null ? [id, restaurant_id] : [id];
    const { rows } = await db.query(text, values);
    return rows[0] || null;
  },

  // ─────────────────────────────────────────
  // findByRestaurantId  (Phase 2 Batch 4)
  // Returns settings-focused view of menu items.
  // ─────────────────────────────────────────

  /**
   * Return all menu items for a restaurant with
   * settings fields, sorted by display_order.
   * Pass null to return all restaurants (super_admin).
   *
   * @param {number|null} restaurant_id
   * @returns {Promise<Object[]>}
   */
  async findByRestaurantId(restaurant_id = null) {
    const where  = restaurant_id !== null ? 'WHERE m.restaurant_id = $1' : '';
    const values = restaurant_id !== null ? [restaurant_id] : [];

    const text = `
      SELECT
        m.id,
        m.restaurant_id,
        m.category_id,
        m.name_en,
        m.name_am,
        m.price,
        m.currency,
        m.image_url,
        m.availability,
        m.is_featured,
        m.display_order,
        m.status,
        m.updated_at,
        r.name      AS restaurant_name,
        c.name_en   AS category_name_en,
        c.name_am   AS category_name_am
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
  // updateAvailability  (Phase 2 Batch 4)
  // ─────────────────────────────────────────

  /**
   * Update the availability field of one menu item.
   * Scoped to restaurant_id for tenant safety.
   *
   * @param {number} id
   * @param {number} restaurant_id
   * @param {string} availability - 'available'|'unavailable'|'hidden'
   * @returns {Promise<Object|null>}
   */
  async updateAvailability(id, restaurant_id, availability) {
    const text = `
      UPDATE menu_items
      SET    availability = $1, updated_at = NOW()
      WHERE  id = $2 AND restaurant_id = $3
      RETURNING id, name_en, name_am, availability, updated_at
    `;
    const { rows } = await db.query(text, [availability, id, restaurant_id]);
    return rows[0] || null;
  },

  // ─────────────────────────────────────────
  // updateFeaturedStatus  (Phase 2 Batch 4)
  // ─────────────────────────────────────────

  /**
   * Toggle the is_featured flag of one menu item.
   * Scoped to restaurant_id for tenant safety.
   *
   * @param {number}  id
   * @param {number}  restaurant_id
   * @param {boolean} is_featured
   * @returns {Promise<Object|null>}
   */
  async updateFeaturedStatus(id, restaurant_id, is_featured) {
    const text = `
      UPDATE menu_items
      SET    is_featured = $1, updated_at = NOW()
      WHERE  id = $2 AND restaurant_id = $3
      RETURNING id, name_en, name_am, is_featured, updated_at
    `;
    const { rows } = await db.query(text, [is_featured, id, restaurant_id]);
    return rows[0] || null;
  },

  // ─────────────────────────────────────────
  // updateDisplayOrder  (Phase 2 Batch 4)
  // ─────────────────────────────────────────

  /**
   * Update the display_order of one menu item.
   * Scoped to restaurant_id for tenant safety.
   *
   * @param {number} id
   * @param {number} restaurant_id
   * @param {number} display_order
   * @returns {Promise<Object|null>}
   */
  async updateDisplayOrder(id, restaurant_id, display_order) {
    const text = `
      UPDATE menu_items
      SET    display_order = $1, updated_at = NOW()
      WHERE  id = $2 AND restaurant_id = $3
      RETURNING id, name_en, name_am, display_order, updated_at
    `;
    const { rows } = await db.query(text, [display_order, id, restaurant_id]);
    return rows[0] || null;
  },

  // ─────────────────────────────────────────
  // bulkUpdateDisplayOrder  (Phase 2 Batch 4)
  // ─────────────────────────────────────────

  /**
   * Update display_order for multiple items in one transaction.
   * All items must belong to restaurant_id.
   * Rolls back entirely if any item is not found.
   *
   * @param {Array<{id: number, display_order: number}>} items
   * @param {number} restaurant_id
   * @returns {Promise<Object[]>} updated rows
   */
  async bulkUpdateDisplayOrder(items, restaurant_id) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const updated = [];
      for (const item of items) {
        const { rows } = await client.query(
          `UPDATE menu_items
           SET    display_order = $1, updated_at = NOW()
           WHERE  id = $2 AND restaurant_id = $3
           RETURNING id, name_en, name_am, display_order, updated_at`,
          [item.display_order, item.id, restaurant_id]
        );

        if (rows.length === 0) {
          // Item not found or belongs to another tenant — roll back all
          await client.query('ROLLBACK');
          const err = new Error(`Menu item ${item.id} not found.`);
          err.statusCode = 404;
          throw err;
        }

        updated.push(rows[0]);
      }

      await client.query('COMMIT');
      return updated;

    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },

  // ─────────────────────────────────────────
  // bulkUpdateAvailability  (Phase 2 Batch 4)
  // ─────────────────────────────────────────

  /**
   * Set the same availability for multiple items in one transaction.
   * All items must belong to restaurant_id.
   * Rolls back entirely if any item is not found.
   *
   * @param {number[]} ids
   * @param {number}   restaurant_id
   * @param {string}   availability
   * @returns {Promise<Object[]>} updated rows
   */
  async bulkUpdateAvailability(ids, restaurant_id, availability) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const updated = [];
      for (const id of ids) {
        const { rows } = await client.query(
          `UPDATE menu_items
           SET    availability = $1, updated_at = NOW()
           WHERE  id = $2 AND restaurant_id = $3
           RETURNING id, name_en, name_am, availability, updated_at`,
          [availability, id, restaurant_id]
        );

        if (rows.length === 0) {
          await client.query('ROLLBACK');
          const err = new Error(`Menu item ${id} not found.`);
          err.statusCode = 404;
          throw err;
        }

        updated.push(rows[0]);
      }

      await client.query('COMMIT');
      return updated;

    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = MenuItemModel;