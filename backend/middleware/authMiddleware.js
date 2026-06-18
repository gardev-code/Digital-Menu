'use strict';

const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────
// authMiddleware
//
// Verifies the JWT on every protected route.
// On success, attaches { id, role } to req.user
// so downstream middleware and controllers can
// read identity without re-querying the database.
//
// Usage in a route file:
//   router.get('/protected', authMiddleware, handler);
// ─────────────────────────────────────────────

/**
 * Express middleware that enforces JWT authentication.
 *
 * Reads the token from the Authorization header:
 *   Authorization: Bearer <token>
 *
 * @param {import('express').Request}      req
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 */
const authMiddleware = (req, res, next) => {
  try {
    // ── 1. Extract token from Authorization header ──
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // Strip the 'Bearer ' prefix
    const token = authHeader.split(' ')[1];

    if (!token || !token.trim()) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token is missing.',
      });
    }

    // ── 2. Verify signature and expiry ───────
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      // Server misconfiguration — don't leak details to the client
      console.error('[authMiddleware] JWT_SECRET is not configured.');
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
      });
    }

    const decoded = jwt.verify(token.trim(), secret);

    // ── 3. Attach minimal identity to request ─
    // Controllers must NOT use decoded.name or decoded.email —
    // those live in the DB. Only id and role are in the payload.
    req.user = {
      id:   decoded.id,
      role: decoded.role,
    };

    next();

  } catch (err) {
    // jwt.verify() throws JsonWebTokenError, TokenExpiredError, etc.
    // Treat all verification failures as a generic "invalid token"
    // to avoid leaking information about the failure reason.
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

module.exports = authMiddleware;