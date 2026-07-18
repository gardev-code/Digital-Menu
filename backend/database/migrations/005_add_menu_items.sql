-- =============================================================
-- Digital Menu — Migration 005
-- Ensure image_url column exists on menu_items table.
--
-- Safe to run even if column already exists —
-- uses IF NOT EXISTS pattern.
-- =============================================================

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Index to support image presence checks
CREATE INDEX IF NOT EXISTS idx_menu_items_image_url
  ON menu_items (id)
  WHERE image_url IS NOT NULL;