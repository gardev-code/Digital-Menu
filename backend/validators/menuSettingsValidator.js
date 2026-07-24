'use strict';

// ─────────────────────────────────────────────
// menuSettingsValidator
//
// Pure input validation for menu settings requests.
// No HTTP logic, no database calls.
// Returns an error message string or null.
// Follows the same pattern as categoryValidator.js
// and menuValidator.js.
// ─────────────────────────────────────────────

const VALID_AVAILABILITY = ['available', 'unavailable', 'hidden'];

/**
 * Validate availability update.
 * @param {Object} body
 * @returns {string|null}
 */
const validateAvailability = (body) => {
  const { availability } = body;

  if (availability === undefined || availability === null) {
    return 'availability is required.';
  }

  if (typeof availability !== 'string' || !availability.trim()) {
    return 'availability must be a string.';
  }

  if (!VALID_AVAILABILITY.includes(availability)) {
    return `availability must be one of: ${VALID_AVAILABILITY.join(', ')}.`;
  }

  return null;
};

/**
 * Validate featured status update.
 * @param {Object} body
 * @returns {string|null}
 */
const validateFeatured = (body) => {
  const { is_featured } = body;

  if (is_featured === undefined || is_featured === null) {
    return 'is_featured is required.';
  }

  if (typeof is_featured !== 'boolean') {
    return 'is_featured must be a boolean (true or false).';
  }

  return null;
};

/**
 * Validate display order update for a single item.
 * @param {Object} body
 * @returns {string|null}
 */
const validateDisplayOrder = (body) => {
  const { display_order } = body;

  if (display_order === undefined || display_order === null) {
    return 'display_order is required.';
  }

  const parsed = parseInt(display_order, 10);
  if (isNaN(parsed)) {
    return 'display_order must be an integer.';
  }

  if (parsed < 0) {
    return 'display_order must be a positive number (0 or greater).';
  }

  return null;
};

/**
 * Validate bulk display order update.
 * Expects: { items: [{ id, display_order }] }
 * @param {Object} body
 * @returns {string|null}
 */
const validateBulkDisplayOrder = (body) => {
  const { items } = body;

  if (!items || !Array.isArray(items)) {
    return 'items must be an array.';
  }

  if (items.length === 0) {
    return 'items array cannot be empty.';
  }

  if (items.length > 200) {
    return 'items array cannot exceed 200 entries per request.';
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (typeof item !== 'object' || item === null) {
      return `items[${i}] must be an object.`;
    }

    const id = parseInt(item.id, 10);
    if (isNaN(id) || id < 1) {
      return `items[${i}].id must be a valid positive integer.`;
    }

    const order = parseInt(item.display_order, 10);
    if (isNaN(order) || order < 0) {
      return `items[${i}].display_order must be a non-negative integer.`;
    }
  }

  return null;
};

/**
 * Validate bulk availability update.
 * Expects: { ids: [1,2,3], availability: 'hidden' }
 * @param {Object} body
 * @returns {string|null}
 */
const validateBulkAvailability = (body) => {
  const { ids, availability } = body;

  // ── ids ───────────────────────────────────
  if (!ids || !Array.isArray(ids)) {
    return 'ids must be an array.';
  }

  if (ids.length === 0) {
    return 'ids array cannot be empty.';
  }

  if (ids.length > 200) {
    return 'ids array cannot exceed 200 entries per request.';
  }

  for (let i = 0; i < ids.length; i++) {
    const id = parseInt(ids[i], 10);
    if (isNaN(id) || id < 1) {
      return `ids[${i}] must be a valid positive integer.`;
    }
  }

  // ── availability ──────────────────────────
  if (availability === undefined || availability === null) {
    return 'availability is required.';
  }

  if (!VALID_AVAILABILITY.includes(availability)) {
    return `availability must be one of: ${VALID_AVAILABILITY.join(', ')}.`;
  }

  return null;
};

module.exports = {
  validateAvailability,
  validateFeatured,
  validateDisplayOrder,
  validateBulkDisplayOrder,
  validateBulkAvailability,
};