'use strict';

const { Router }    = require('express');
const authController = require('../controllers/authController');

// ─────────────────────────────────────────────
// Auth Routes
//
// Mount point: POST /api/auth
// Registered in app.js as:
//   app.use('/api/auth', require('./routes/authRoutes'));
//
// Public routes — no authMiddleware applied here.
// Token verification is handled inside controllers
// where it is contextually appropriate.
// ─────────────────────────────────────────────

const router = Router();

/**
 * POST /api/auth/login
 *
 * Authenticate a user and return a signed JWT.
 *
 * Body:
 *   { "email": "string", "password": "string" }
 *
 * Success 200:
 *   { success: true, token: "JWT", user: { id, name, email, role } }
 *
 * Failure 400: missing / invalid input
 * Failure 401: wrong credentials
 */
router.post('/login', authController.login);

module.exports = router;