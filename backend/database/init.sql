-- =============================================================
-- Digital Menu — Database Initialisation Script
-- Target: Neon PostgreSQL (PostgreSQL 15+)
--
-- Run this script once against a fresh database to build
-- the complete schema. Re-running is safe: all statements
-- use IF NOT EXISTS / DO NOTHING patterns.
-- =============================================================


-- -------------------------------------------------------------
-- Extensions
-- -------------------------------------------------------------

-- citext enables case-insensitive text comparisons for emails
-- so 'User@Example.com' and 'user@example.com' are treated as equal.
CREATE EXTENSION IF NOT EXISTS citext;


-- =============================================================
-- TABLE: users
--
-- Central identity table. Every account in the system — whether
-- a super_admin or a restaurant operator — has a row here.
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
    id         SERIAL      PRIMARY KEY,
    name       VARCHAR(100)  NOT NULL,

    -- citext ensures the UNIQUE constraint is case-insensitive
    email      CITEXT        NOT NULL UNIQUE,

    -- Always store bcrypt hashes, never plain text.
    -- bcrypt output is always 60 characters.
    password   VARCHAR(60)   NOT NULL,

    -- Enumerated role values enforced at the DB layer
    role       VARCHAR(20)   NOT NULL
                   CHECK (role IN ('super_admin', 'restaurant')),

    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index: speed up lookup-by-email (login, JWT validation)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Index: filter users by role (admin listing)
CREATE INDEX IF NOT EXISTS idx_users_role  ON users (role);


-- =============================================================
-- TABLE: restaurants
--
-- One row per restaurant. Linked 1-to-1 with a `users` row
-- whose role = 'restaurant'. The super_admin creates both
-- records together during onboarding.
-- =============================================================

CREATE TABLE IF NOT EXISTS restaurants (
    id         SERIAL      PRIMARY KEY,

    -- Owning user account; cascade delete keeps the DB consistent
    -- if the associated user is ever removed.
    user_id    INTEGER       NOT NULL
                   REFERENCES users (id) ON DELETE CASCADE,

    name       VARCHAR(150)  NOT NULL,
    owner_name VARCHAR(100)  NOT NULL,

    -- Separate contact email; may differ from the user login email
    email      CITEXT        NOT NULL UNIQUE,

    phone      VARCHAR(20),

    -- 'active'  → restaurant is live and visible
    -- 'inactive' → hidden from public pages, login still allowed
    status     VARCHAR(10)   NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive')),

    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index: join from users → restaurants (very common query path)
CREATE INDEX IF NOT EXISTS idx_restaurants_user_id ON restaurants (user_id);

-- Index: admin lists filtered by status
CREATE INDEX IF NOT EXISTS idx_restaurants_status  ON restaurants (status);

-- Index: public-page lookup by contact email
CREATE INDEX IF NOT EXISTS idx_restaurants_email   ON restaurants (email);