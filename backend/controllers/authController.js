'use strict';

const bcrypt        = require('bcrypt');
const UserModel     = require('../models/UserModel');
const generateToken = require('../utils/generateToken');

// ─────────────────────────────────────────────
// authController
//
// Handles all authentication actions.
// Validation → DB lookup → credential check →
// token generation → response. No business logic
// lives here beyond the auth workflow itself.
// ─────────────────────────────────────────────

/**
 * POST /api/auth/login
 *
 * Accepts email + password, verifies credentials
 * against the users table, and returns a signed JWT.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ── 1. Input validation ──────────────────
    // Keep error messages vague at this layer to
    // avoid leaking which field is missing to bots.
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Basic email format check before hitting the DB
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // ── 2. Fetch user from database ──────────
    // findByEmail returns the hashed password so
    // we can run bcrypt.compare() below.
    const user = await UserModel.findByEmail(email.trim().toLowerCase());

    if (!user) {
      // Use the same message as a wrong password to
      // prevent user-enumeration via different responses.
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // ── 3. Verify password ───────────────────
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // ── 4. Generate token ────────────────────
    const token = generateToken(user.id, user.role);

    // ── 5. Respond ───────────────────────────
    // Never include the hashed password in the response.
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });

  } catch (err) {
    // Delegate to centralized error middleware (app.js)
    next(err);
  }
};

module.exports = { login };