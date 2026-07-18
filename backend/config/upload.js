'use strict';

const path   = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// ─────────────────────────────────────────────
// Upload Configuration
//
// Configures multer disk storage for menu item
// images. Original filenames are NEVER used —
// a UUID-based name is always generated to
// prevent path traversal and filename collisions.
//
// Future cloud migration: replace diskStorage
// with memoryStorage + cloud SDK upload here.
// ─────────────────────────────────────────────

// ── Allowed file types ────────────────────────

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// ── Upload destination ────────────────────────

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'menu-items');

// ── Storage engine ────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (_req, file, cb) => {
    // Generate a unique, safe filename
    // Format: menu-item-<timestamp>-<uuid>.<ext>
    const ext      = path.extname(file.originalname).toLowerCase();
    const safeName = `menu-item-${Date.now()}-${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

// ── File filter ───────────────────────────────

const fileFilter = (_req, file, cb) => {
  const ext      = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  if (
    ALLOWED_EXTENSIONS.includes(ext) &&
    ALLOWED_MIME_TYPES.includes(mimeType)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}.`
      ),
      false
    );
  }
};

// ── Multer instance ───────────────────────────

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = {
  upload,
  UPLOAD_DIR,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
};