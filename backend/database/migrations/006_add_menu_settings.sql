-- =============================================================
-- Digital Menu — Migration 006
-- Add menu settings fields to menu_items table.
--
-- Adds:
--   availability  — granular availability status
--   is_featured   — mark items for promotion
--
-- display_order already exists from Migration 004.
-- Run AFTER 004_create_menu_items.sql
-- =============================================================

-- Granular availability status
availability VARCHAR(30) NOT NULL DEFAULT 'available';
-- with a richer three-state field for future public menu display)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS availability VARCHAR(20)
    NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available', 'unavailable', 'hidden'));

-- Featured flag for highlighted/promoted items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Indexes ──────────────────────────────────────────────────

-- Speed up featured item queries
CREATE INDEX IF NOT EXISTS idx_menu_items_featured
  ON menu_items (restaurant_id, is_featured)
  WHERE is_featured = TRUE;

-- Speed up availability filtering
CREATE INDEX IF NOT EXISTS idx_menu_items_availability_status
  ON menu_items (restaurant_id, availability);