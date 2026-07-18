'use strict';

const fs   = require('fs');
const path = require('path');

const RestaurantModel          = require('../models/RestaurantModel');
const MenuItemModel            = require('../models/MenuItemModel');
const { validateImage }        = require('../validators/imageValidator');
const { UPLOAD_DIR }           = require('../config/upload');

// ─────────────────────────────────────────────
// menuImageController
//
// Handles all menu item image operations.
// Accessible only to authenticated restaurant users
// (enforced at the route layer).
//
// MULTI-TENANCY: ownership is always verified by
// checking menu_items.restaurant_id against the
// JWT-resolved restaurant before any file operation.
//
// FILE SAFETY: physical files are always deleted
// before database updates to prevent orphaned files.
// ─────────────────────────────────────────────

// ── Internal helpers ──────────────────────────

/**
 * Resolve the restaurant linked to the authenticated user.
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
const getRestaurantForUser = async (userId) => {
  const all = await RestaurantModel.getAllRestaurants();
  return all.find(r => r.user_id === userId) || null;
};

/**
 * Build the public-facing image URL from a filename.
 * @param {string} filename
 * @returns {string}
 */
const buildImageUrl = (filename) => {
  return `/uploads/menu-items/${filename}`;
};

/**
 * Delete a physical image file safely.
 * Does not throw if the file doesn't exist.
 * @param {string} imageUrl - stored image_url value
 */
const deletePhysicalFile = (imageUrl) => {
  if (!imageUrl) return;

  try {
    // Extract filename from stored URL path
    const filename = path.basename(imageUrl);
    const filePath = path.join(UPLOAD_DIR, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // Log but do not crash — file may already be missing
    console.error('[Image] Failed to delete physical file:', err.message);
  }
};

// ─────────────────────────────────────────────
// uploadMenuImage
// POST /api/menu-items/:id/image
// ─────────────────────────────────────────────

/**
 * Upload an image for a menu item that has no image yet.
 * Rejects if the menu item already has an image — use replace instead.
 */
const uploadMenuImage = async (req, res, next) => {
  try {
    // ── 1. Resolve restaurant ─────────────────
    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      // Clean up uploaded file if restaurant not found
      if (req.file) deletePhysicalFile(buildImageUrl(req.file.filename));
      return res.status(404).json({
        success: false,
        message: 'Restaurant account not found.',
      });
    }

    // ── 2. Validate uploaded file ─────────────
    const fileError = validateImage(req.file);
    if (fileError) {
      if (req.file) deletePhysicalFile(buildImageUrl(req.file.filename));
      return res.status(400).json({
        success: false,
        message: fileError,
      });
    }

    // ── 3. Find menu item + verify ownership ──
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      if (req.file) deletePhysicalFile(buildImageUrl(req.file.filename));
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID.',
      });
    }

    const menuItem = await MenuItemModel.findById(id, restaurant.id);
    if (!menuItem) {
      if (req.file) deletePhysicalFile(buildImageUrl(req.file.filename));
      return res.status(404).json({
        success: false,
        message: 'Menu item not found.',
      });
    }

    // ── 4. Reject if image already exists ─────
    if (menuItem.image_url) {
      if (req.file) deletePhysicalFile(buildImageUrl(req.file.filename));
      return res.status(409).json({
        success: false,
        message: 'This menu item already has an image. Use PUT to replace it.',
      });
    }

    // ── 5. Save to database ───────────────────
    const imageUrl = buildImageUrl(req.file.filename);
    const updated  = await MenuItemModel.updateImage(id, restaurant.id, imageUrl);

    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully.',
      data: {
        id:        updated.id,
        image_url: updated.image_url,
      },
    });

  } catch (err) {
    if (req.file) deletePhysicalFile(buildImageUrl(req.file.filename));
    next(err);
  }
};

// ─────────────────────────────────────────────
// replaceMenuImage
// PUT /api/menu-items/:id/image
// ─────────────────────────────────────────────

/**
 * Replace an existing image with a new one.
 * Deletes the old physical file before saving the new one.
 */
const replaceMenuImage = async (req, res, next) => {
  try {
    // ── 1. Resolve restaurant ─────────────────
    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      if (req.file) deletePhysicalFile(buildImageUrl(req.file.filename));
      return res.status(404).json({
        success: false,
        message: 'Restaurant account not found.',
      });
    }

    // ── 2. Validate uploaded file ─────────────
    const fileError = validateImage(req.file);
    if (fileError) {
      if (req.file) deletePhysicalFile(buildImageUrl(req.file.filename));
      return res.status(400).json({
        success: false,
        message: fileError,
      });
    }

    // ── 3. Find menu item + verify ownership ──
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      if (req.file) deletePhysicalFile(buildImageUrl(req.file.filename));
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID.',
      });
    }

    const menuItem = await MenuItemModel.findById(id, restaurant.id);
    if (!menuItem) {
      if (req.file) deletePhysicalFile(buildImageUrl(req.file.filename));
      return res.status(404).json({
        success: false,
        message: 'Menu item not found.',
      });
    }

    // ── 4. Delete old physical file ───────────
    if (menuItem.image_url) {
      deletePhysicalFile(menuItem.image_url);
    }

    // ── 5. Save new image to database ─────────
    const imageUrl = buildImageUrl(req.file.filename);
    const updated  = await MenuItemModel.updateImage(id, restaurant.id, imageUrl);

    return res.status(200).json({
      success: true,
      message: 'Image replaced successfully.',
      data: {
        id:        updated.id,
        image_url: updated.image_url,
      },
    });

  } catch (err) {
    if (req.file) deletePhysicalFile(buildImageUrl(req.file.filename));
    next(err);
  }
};

// ─────────────────────────────────────────────
// deleteMenuImage
// DELETE /api/menu-items/:id/image
// ─────────────────────────────────────────────

/**
 * Delete a menu item's image.
 * Removes the physical file and sets image_url to NULL.
 */
const deleteMenuImage = async (req, res, next) => {
  try {
    // ── 1. Resolve restaurant ─────────────────
    const restaurant = await getRestaurantForUser(req.user.id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant account not found.',
      });
    }

    // ── 2. Find menu item + verify ownership ──
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID.',
      });
    }

    const menuItem = await MenuItemModel.findById(id, restaurant.id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found.',
      });
    }

    // ── 3. Check image exists ─────────────────
    if (!menuItem.image_url) {
      return res.status(404).json({
        success: false,
        message: 'This menu item has no image.',
      });
    }

    // ── 4. Delete physical file ───────────────
    deletePhysicalFile(menuItem.image_url);

    // ── 5. Clear database record ──────────────
    await MenuItemModel.removeImage(id, restaurant.id);

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully.',
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// getMenuImage
// GET /api/menu-items/:id/image
// ─────────────────────────────────────────────

/**
 * Return the image URL for a menu item.
 * Restaurant users: scoped to their own items.
 * Super admin: may view any item's image.
 */
const getMenuImage = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID.',
      });
    }

    const { role } = req.user;
    let restaurant_id = null;

    if (role === 'restaurant') {
      const restaurant = await getRestaurantForUser(req.user.id);
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant account not found.',
        });
      }
      restaurant_id = restaurant.id;
    }
    // super_admin: restaurant_id stays null → no tenant filter

    const imageData = await MenuItemModel.findImageById(id, restaurant_id);
    if (!imageData) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found.',
      });
    }

    if (!imageData.image_url) {
      return res.status(404).json({
        success: false,
        message: 'This menu item has no image.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Image retrieved successfully.',
      data: {
        id:        imageData.id,
        image_url: imageData.image_url,
      },
    });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadMenuImage,
  replaceMenuImage,
  deleteMenuImage,
  getMenuImage,
};