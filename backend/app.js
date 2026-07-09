'use strict';

const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
const path = require('path');

// Load environment variables as early as possible
dotenv.config();

const app = express();

// ─────────────────────────────────────────────
// Core Middleware
// ─────────────────────────────────────────────

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded form data (e.g. HTML form submissions)
app.use(express.urlencoded({ extended: true }));

// CORS — allow all origins in development; lock down in production via env
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─────────────────────────────────────────────
// Health Check Route
// ─────────────────────────────────────────────

/**
 * GET /
 * Quick liveness probe — used by load balancers and uptime monitors.
 */
app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Digital Menu API Running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// ─────────────────────────────────────────────
// API Routes (mounted in future batches)
// ─────────────────────────────────────────────

app.use('/api/auth', require('./routes/authRoutes'));

// Example mount points — uncomment as each batch is delivered:
// app.use('/api/v1/auth',        require('./routes/auth.routes'));
// app.use('/api/v1/admin',       require('./routes/admin.routes'));
 app.use('/api/restaurants', require('./routes/restaurantRoutes'));
// app.use('/api/v1/menus',       require('./routes/menu.routes'));
// app.use('/api/v1/qr',          require('./routes/qr.routes'));

// ─────────────────────────────────────────────
// 404 Handler — catches unmatched routes
// ─────────────────────────────────────────────

app.use((req, res, _next) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─────────────────────────────────────────────
// Centralized Error Middleware
// Must be defined last, after all routes.
// ─────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;

  // Log full error in development only
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    // Stack trace only in development
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

module.exports = app;
