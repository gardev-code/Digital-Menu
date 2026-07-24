'use strict';

// ─────────────────────────────────────────────
// menuValidator
//
// Pure input validation for menu item requests.
// No HTTP logic, no database calls.
// Returns an error message string or null.
// Follows the same pattern as categoryValidator.js.
// ─────────────────────────────────────────────

const MAX_NAME_EN_LEN  = 150;
const MAX_NAME_AM_LEN  = 300;
const MAX_DESC_LEN     = 1000;
const MAX_IMAGE_LEN    = 500;
const VALID_STATUSES   = ['active', 'inactive'];
const VALID_CURRENCIES = ['ETB', 'USD', 'EUR', 'GBP'];

/**
 * Validate fields for creating a menu item.
 * @param {Object} body - request body
 * @returns {string|null} error message or null if valid
 */
const validateCreate = (body) => {
  const {
    category_id,
    name_en,
    name_am,
    description_en,
    description_am,
    price,
    currency,
    availability,
    display_order,
  } = body;

  // ── category_id ───────────────────────────
  if (category_id === undefined || category_id === null) {
    return 'category_id is required.';
  }
  const parsedCategoryId = parseInt(category_id, 10);
  if (isNaN(parsedCategoryId) || parsedCategoryId < 1) {
    return 'category_id must be a valid positive integer.';
  }

  // ── name_en ───────────────────────────────
  if (!name_en || typeof name_en !== 'string' || !name_en.trim()) {
    return 'English item name (name_en) is required.';
  }
  if (name_en.trim().length > MAX_NAME_EN_LEN) {
    return `English item name must not exceed ${MAX_NAME_EN_LEN} characters.`;
  }

  // ── name_am ───────────────────────────────
  if (!name_am || typeof name_am !== 'string' || !name_am.trim()) {
    return 'Amharic item name (name_am) is required.';
  }
  if (name_am.trim().length > MAX_NAME_AM_LEN) {
    return `Amharic item name must not exceed ${MAX_NAME_AM_LEN} characters.`;
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

  // ── price ─────────────────────────────────
  if (price === undefined || price === null) {
    return 'Price is required.';
  }
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice)) {
    return 'Price must be a valid number.';
  }
  if (parsedPrice < 0) {
    return 'Price must not be negative.';
  }

  // ── currency (optional) ───────────────────
  if (currency !== undefined && currency !== null) {
    if (!VALID_CURRENCIES.includes(currency)) {
      return `Currency must be one of: ${VALID_CURRENCIES.join(', ')}.`;
    }
  }

  // ── image_url (optional) ──────────────────
  if (image_url !== undefined && image_url !== null) {
    if (typeof image_url !== 'string') {
      return 'image_url must be a string.';
    }
    if (image_url.trim().length > MAX_IMAGE_LEN) {
      return `image_url must not exceed ${MAX_IMAGE_LEN} characters.`;
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
 * Validate fields for updating a menu item.
 * All fields are optional but at least one must be present.
 * @param {Object} body - request body
 * @returns {string|null} error message or null if valid
 */
const validateUpdate = (body) => {
  const {
    category_id,
    name_en, name_am,
    description_en, description_am,
    price, currency,
    image_url, availability,
    display_order, status,
  } = body;

  const hasAnyField = [
    category_id, name_en, name_am,
    description_en, description_am,
    price, currency, image_url,
    availability, display_order, status,
  ].some(v => v !== undefined);

  if (!hasAnyField) {
    return 'No valid fields provided for update.';
  }

  // ── category_id ───────────────────────────
  if (category_id !== undefined) {
    const parsed = parseInt(category_id, 10);
    if (isNaN(parsed) || parsed < 1) {
      return 'category_id must be a valid positive integer.';
    }
  }

  // ── name_en ───────────────────────────────
  if (name_en !== undefined) {
    if (typeof name_en !== 'string' || !name_en.trim()) {
      return 'English item name (name_en) cannot be empty.';
    }
    if (name_en.trim().length > MAX_NAME_EN_LEN) {
      return `English item name must not exceed ${MAX_NAME_EN_LEN} characters.`;
    }
  }

  // ── name_am ───────────────────────────────
  if (name_am !== undefined) {
    if (typeof name_am !== 'string' || !name_am.trim()) {
      return 'Amharic item name (name_am) cannot be empty.';
    }
    if (name_am.trim().length > MAX_NAME_AM_LEN) {
      return `Amharic item name must not exceed ${MAX_NAME_AM_LEN} characters.`;
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

  // ── price ─────────────────────────────────
  if (price !== undefined) {
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      return 'Price must be a valid number.';
    }
    if (parsedPrice < 0) {
      return 'Price must not be negative.';
    }
  }

  // ── currency ──────────────────────────────
  if (currency !== undefined && !VALID_CURRENCIES.includes(currency)) {
    return `Currency must be one of: ${VALID_CURRENCIES.join(', ')}.`;
  }

  // ── image_url ─────────────────────────────
  if (image_url !== undefined && image_url !== null) {
    if (typeof image_url !== 'string') {
      return 'image_url must be a string.';
    }
    if (image_url.trim().length > MAX_IMAGE_LEN) {
      return `image_url must not exceed ${MAX_IMAGE_LEN} characters.`;
    }
  }

  // ── availability ──────────────────────────
if (availability !== undefined && availability !== null) {

  const allowedAvailability = [
    'available',
    'unavailable',
    'sold_out',
    'coming_soon',
    'temporarily_unavailable'
  ];

  if (!allowedAvailability.includes(availability)) {
    return `availability must be one of: ${allowedAvailability.join(', ')}`;
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