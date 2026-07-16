-- =============================================================
-- Digital Menu — Migration 004
-- Create menu_items table with multilingual support
--
-- Supports: English (en) + Amharic (am)
-- Currency default: ETB (Ethiopian Birr)
--
-- Run AFTER 003_create_categories.sql
-- =============================================================

CREATE TABLE IF NOT EXISTS menu_items (
  id              SERIAL          PRIMARY KEY,

  -- Tenant isolation — never populated from client
  restaurant_id   INTEGER         NOT NULL
                    REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Category relationship — restricted delete to prevent orphaned structure
  category_id     INTEGER         NOT NULL
                    REFERENCES categories(id) ON DELETE RESTRICT,

  -- Multilingual name fields
  name_en         VARCHAR(150)    NOT NULL,
  name_am         VARCHAR(300)    NOT NULL,

  -- Multilingual description fields (optional)
  description_en  VARCHAR(1000),
  description_am  VARCHAR(1000),

  -- Pricing
  price           NUMERIC(10, 2)  NOT NULL CHECK (price >= 0),
  currency        VARCHAR(10)     NOT NULL DEFAULT 'ETB',

  -- Image — URL only; actual upload handled in a future batch
  image_url       VARCHAR(500),

  -- Availability toggle (restaurant can toggle per item)
  is_available    BOOLEAN         NOT NULL DEFAULT TRUE,

  -- Display ordering within a category
  display_order   INTEGER         NOT NULL DEFAULT 0,

  -- Lifecycle status
  status          VARCHAR(10)     NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive')),

  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────

-- Prevent duplicate English names within the same restaurant
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_name_en_restaurant
  ON menu_items (restaurant_id, LOWER(name_en));

-- Prevent duplicate Amharic names within the same restaurant
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_name_am_restaurant
  ON menu_items (restaurant_id, name_am);

-- Speed up tenant-scoped lookups
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id
  ON menu_items (restaurant_id);

-- Speed up category-scoped lookups
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id
  ON menu_items (category_id);

-- Speed up ordered menu display per category
CREATE INDEX IF NOT EXISTS idx_menu_items_display_order
  ON menu_items (restaurant_id, category_id, display_order);

-- Speed up availability filtering
CREATE INDEX IF NOT EXISTS idx_menu_items_availability
  ON menu_items (restaurant_id, is_available);

-- Speed up status filtering
CREATE INDEX IF NOT EXISTS idx_menu_items_status
  ON menu_items (restaurant_id, status);