'use strict';

const { upload } = require('../config/upload');

// ─────────────────────────────────────────────
// uploadMiddleware
//
// Wraps multer's single-file upload in an Express
// middleware that converts multer errors into
// consistent API error responses rather than
// crashing the server.
//
// Usage in routes:
//   router.post('/:id/image', uploadMiddleware, controller.uploadMenuImage);
// ─────────────────────────────────────────────

/**
 * Process a single image file upload.
 * Field name must be "image".
 *
 * Handles:
 *   - LIMIT_FILE_SIZE → 413 Payload Too Large
 *   - Invalid file type → 400 Bad Request
 *   - All other multer errors → 400 Bad Request
 *
 * @type {import('express').RequestHandler}
 */
const uploadMiddleware = (req, res, next) => {
  const singleUpload = upload.single('image');

  singleUpload(req, res, (err) => {
    if (!err) {
      // Upload processed (file may or may not be present)
      return next();
    }

    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum allowed size is 5MB.',
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field. Use "image" as the form field name.',
      });
    }

    // File type rejection from fileFilter
    if (err.message && err.message.startsWith('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Generic upload error
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed.',
    });
  });
};

module.exports = uploadMiddleware;