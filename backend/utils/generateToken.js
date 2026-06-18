'use strict';

const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────
// generateToken
//
// Single responsibility: sign a JWT containing
// the minimum payload needed for authorisation.
// All route handlers and controllers must call
// this utility — never jwt.sign() directly —
// so token configuration stays in one place.
// ─────────────────────────────────────────────

/**
 * Sign and return a JWT for the given user.
 *
 * @param {number} id   - users.id (primary key)
 * @param {string} role - users.role ('super_admin' | 'restaurant')
 * @returns {string} Signed JWT string
 *
 * @throws {Error} If JWT_SECRET is not configured
 */
const generateToken = (id, role) => {
  const secret  = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!secret) {
    throw new Error(
      '[generateToken] JWT_SECRET is not set. ' +
      'Add it to your .env file before starting the server.'
    );
  }

  // Minimal payload — keep tokens small.
  // Additional claims (name, email) live in the DB;
  // fetch them with UserModel.findById() when needed.
  const payload = { id, role };

  return jwt.sign(payload, secret, { expiresIn });
};

module.exports = generateToken;