'use strict';

const db = require('../config/db');

// ─────────────────────────────────────────────
// UserModel
//
// All database interactions for the `users` table.
// Controllers must NOT write raw SQL — use this
// model as the single source of truth for user data.
// ─────────────────────────────────────────────

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {string} password  - bcrypt hash
 * @property {'super_admin'|'restaurant'} role
 * @property {Date}   created_at
 */

const UserModel = {
  // ───────────────────────────────────────────
  // createUser
  // ───────────────────────────────────────────

  /**
   * Insert a new user row.
   * The password must already be hashed by the caller (bcrypt).
   *
   * @param {Object} userData
   * @param {string} userData.name
   * @param {string} userData.email
   * @param {string} userData.password  - pre-hashed value
   * @param {'super_admin'|'restaurant'} userData.role
   * @returns {Promise<User>} The newly created user (without password)
   */
  async createUser({ name, email, password, role }) {
    const text = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at
    `;
    const values = [name, email, password, role];

    const { rows } = await db.query(text, values);
    return rows[0];
  },

  // ───────────────────────────────────────────
  // findByEmail
  // ───────────────────────────────────────────

  /**
   * Look up a user by email address.
   * Returns the hashed password so the auth layer can verify credentials.
   * Callers must strip the password before returning data to clients.
   *
   * @param {string} email
   * @returns {Promise<User|null>}
   */
  async findByEmail(email) {
    const text = `
      SELECT id, name, email, password, role, created_at
      FROM   users
      WHERE  email = $1
      LIMIT  1
    `;
    const { rows } = await db.query(text, [email]);
    return rows[0] || null;
  },

  // ───────────────────────────────────────────
  // findById
  // ───────────────────────────────────────────

  /**
   * Look up a user by primary key.
   * Password is intentionally excluded — safe to pass to response layer.
   *
   * @param {number} id
   * @returns {Promise<User|null>}
   */
  async findById(id) {
    const text = `
      SELECT id, name, email, role, created_at
      FROM   users
      WHERE  id = $1
      LIMIT  1
    `;
    const { rows } = await db.query(text, [id]);
    return rows[0] || null;
  },

  // ───────────────────────────────────────────
  // getAllUsers
  // ───────────────────────────────────────────

  /**
   * Return all users ordered by most recently created.
   * Used by the super_admin dashboard. Passwords excluded.
   *
   * @returns {Promise<User[]>}
   */
  async getAllUsers() {
    const text = `
      SELECT id, name, email, role, created_at
      FROM   users
      ORDER  BY created_at DESC
    `;
    const { rows } = await db.query(text);
    return rows;
  },
};

module.exports = UserModel;