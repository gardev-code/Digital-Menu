-- =============================================================
-- Digital Menu — Migration 003
-- Create categories table with multilingual support
--
-- Supports: English (en) + Amharic (am)
-- Run this AFTER dropping the old categories table:
--   DROP TABLE IF EXISTS categories;
-- =============================================================

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS categories (
  id              SERIAL        PRIMARY KEY,

  -- Tenant isolation — never populated from client
  restaurant_id   INTEGER       NOT NULL
                    REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Multilingual name fields
  name_en         VARCHAR(100)  NOT NULL,
  name_am         VARCHAR(200)  NOT NULL,

  -- Multilingual description fields (optional)
  description_en  VARCHAR(500),
  description_am  VARCHAR(500),

  -- Menu display ordering
  display_order   INTEGER       NOT NULL DEFAULT 0,

  -- Lifecycle status
  status          VARCHAR(10)   NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive')),

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────

-- Prevent duplicate English names within the same restaurant
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_en_restaurant
  ON categories (restaurant_id, LOWER(name_en));

-- Prevent duplicate Amharic names within the same restaurant
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_am_restaurant
  ON categories (restaurant_id, name_am);

-- Speed up tenant-scoped lookups
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id
  ON categories (restaurant_id);

-- Speed up ordered menu display
CREATE INDEX IF NOT EXISTS idx_categories_display_order
  ON categories (restaurant_id, display_order);

-- Speed up status filtering
CREATE INDEX IF NOT EXISTS idx_categories_status
  ON categories (restaurant_id, status);