'use strict';

// ─────────────────────────────────────────────
// categoryValidator
//
// Pure input validation for category requests.
// No HTTP logic, no database calls.
// Returns an error message string or null.
// ─────────────────────────────────────────────

const MAX_NAME_LEN = 100;
const MAX_AM_LEN   = 200;  // Amharic can be longer in Unicode
const MAX_DESC_LEN = 500;
const VALID_STATUSES = ['active', 'inactive'];

/**
 * Validate fields for creating a category.
 * @param {Object} body - request body
 * @returns {string|null} error message or null if valid
 */
const validateCreate = (body) => {
  const { name_en, name_am, description_en, description_am, display_order } = body;

  // ── name_en ───────────────────────────────
  if (!name_en || typeof name_en !== 'string' || !name_en.trim()) {
    return 'English category name (name_en) is required.';
  }
  if (name_en.trim().length > MAX_NAME_LEN) {
    return `English category name must not exceed ${MAX_NAME_LEN} characters.`;
  }

  // ── name_am ───────────────────────────────
  if (!name_am || typeof name_am !== 'string' || !name_am.trim()) {
    return 'Amharic category name (name_am) is required.';
  }
  if (name_am.trim().length > MAX_AM_LEN) {
    return `Amharic category name must not exceed ${MAX_AM_LEN} characters.`;
  }

  // ── description_en (optional) ─────────────
  if (description_en !== undefined && description_en !== null) {
    if (typeof description_en !== 'string') {
      return 'English description must be a string.';
    }
    if (description_en.trim().length > MAX_DESC_LEN) {
      return `English description must not exceed ${MAX_DESC_LEN} characters.`;
    }
  }

  // ── description_am (optional) ─────────────
  if (description_am !== undefined && description_am !== null) {
    if (typeof description_am !== 'string') {
      return 'Amharic description must be a string.';
    }
    if (description_am.trim().length > MAX_DESC_LEN) {
      return `Amharic description must not exceed ${MAX_DESC_LEN} characters.`;
    }
  }

  // ── display_order (optional) ──────────────
  if (display_order !== undefined) {
    const order = parseInt(display_order, 10);
    if (isNaN(order) || order < 0) {
      return 'display_order must be a non-negative integer.';
    }
  }

  return null;
};

/**
 * Validate fields for updating a category.
 * All fields are optional but at least one must be present.
 * @param {Object} body - request body
 * @returns {string|null} error message or null if valid
 */
const validateUpdate = (body) => {
  const {
    name_en, name_am,
    description_en, description_am,
    display_order, status,
  } = body;

  const hasAnyField = [
    name_en, name_am, description_en, description_am,
    display_order, status,
  ].some(v => v !== undefined);

  if (!hasAnyField) {
    return 'No valid fields provided for update.';
  }

  // ── name_en ───────────────────────────────
  if (name_en !== undefined) {
    if (typeof name_en !== 'string' || !name_en.trim()) {
      return 'English category name (name_en) cannot be empty.';
    }
    if (name_en.trim().length > MAX_NAME_LEN) {
      return `English category name must not exceed ${MAX_NAME_LEN} characters.`;
    }
  }

  // ── name_am ───────────────────────────────
  if (name_am !== undefined) {
    if (typeof name_am !== 'string' || !name_am.trim()) {
      return 'Amharic category name (name_am) cannot be empty.';
    }
    if (name_am.trim().length > MAX_AM_LEN) {
      return `Amharic category name must not exceed ${MAX_AM_LEN} characters.`;
    }
  }

  // ── description_en (optional) ─────────────
  if (description_en !== undefined && description_en !== null) {
    if (typeof description_en !== 'string') {
      return 'English description must be a string.';
    }
    if (description_en.trim().length > MAX_DESC_LEN) {
      return `English description must not exceed ${MAX_DESC_LEN} characters.`;
    }
  }

  // ── description_am (optional) ─────────────
  if (description_am !== undefined && description_am !== null) {
    if (typeof description_am !== 'string') {
      return 'Amharic description must be a string.';
    }
    if (description_am.trim().length > MAX_DESC_LEN) {
      return `Amharic description must not exceed ${MAX_DESC_LEN} characters.`;
    }
  }

  // ── display_order ─────────────────────────
  if (display_order !== undefined) {
    const order = parseInt(display_order, 10);
    if (isNaN(order) || order < 0) {
      return 'display_order must be a non-negative integer.';
    }
  }

  // ── status ────────────────────────────────
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return `Status must be one of: ${VALID_STATUSES.join(', ')}.`;
  }

  return null;
};

module.exports = { validateCreate, validateUpdate };