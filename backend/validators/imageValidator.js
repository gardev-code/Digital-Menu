'use strict';

const path = require('path');
const { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES } = require('../config/upload');

// ─────────────────────────────────────────────
// imageValidator
//
// Pure validation for uploaded image files.
// No HTTP logic, no database calls.
// Returns an error message string or null.
// ─────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validate an uploaded file from req.file.
 * Call after uploadMiddleware has processed the request.
 *
 * @param {Express.Multer.File|undefined} file - req.file
 * @returns {string|null} error message or null if valid
 */
const validateImage = (file) => {
  // ── File presence ─────────────────────────
  if (!file) {
    return 'No image file provided. Include a file under the "image" field.';
  }

  // ── Extension ─────────────────────────────
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Invalid file extension "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}.`;
  }

  // ── MIME type ─────────────────────────────
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    return `Invalid file type "${file.mimetype}". Allowed types: JPEG, PNG, WebP.`;
  }

  // ── File size ─────────────────────────────
  if (file.size > MAX_FILE_SIZE) {
    return `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds the 5MB limit.`;
  }

  // ── Filename safety ───────────────────────
  // Multer already generates a safe name, but double-check
  // the original name doesn't contain path traversal attempts
  if (file.originalname.includes('..') || file.originalname.includes('/')) {
    return 'Invalid filename.';
  }

  return null;
};

module.exports = { validateImage };