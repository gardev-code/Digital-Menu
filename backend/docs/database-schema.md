# Digital Menu — Database Schema

> **Target database:** Neon PostgreSQL (PostgreSQL 15+)
> **Initialisation script:** `backend/database/init.sql`

---

## Database Overview

The Digital Menu database follows a simple, deliberate hierarchy:

- A **user** record holds credentials and a role.
- A **restaurant** record holds operational data and links back to exactly one user.
- The super_admin user has no restaurant row — they manage all other records directly.

Every table uses `SERIAL` primary keys, `TIMESTAMPTZ` timestamps in UTC, and `CITEXT` for email columns to enforce case-insensitive uniqueness at the database level.

---

## Table: `users`

Central identity table. Every account in the system has exactly one row here.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing surrogate key |
| `name` | `VARCHAR(100)` | `NOT NULL` | Display name |
| `email` | `CITEXT` | `NOT NULL`, `UNIQUE` | Login email — case-insensitive unique |
| `password` | `VARCHAR(60)` | `NOT NULL` | bcrypt hash (always 60 chars) |
| `role` | `VARCHAR(20)` | `NOT NULL`, `CHECK` | Either `super_admin` or `restaurant` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Account creation timestamp (UTC) |

### Constraints

| Constraint | Details |
|---|---|
| `PK` | `id` |
| `UNIQUE` | `email` (case-insensitive via `CITEXT`) |
| `CHECK` | `role IN ('super_admin', 'restaurant')` |

### Indexes

| Index name | Column(s) | Purpose |
|---|---|---|
| `idx_users_email` | `email` | Fast login lookup and JWT validation |
| `idx_users_role` | `role` | Admin dashboard filtering by role |

---

## Table: `restaurants`

One row per restaurant. Linked 1-to-1 with a `users` row whose `role = 'restaurant'`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing surrogate key |
| `user_id` | `INTEGER` | `NOT NULL`, `FK → users.id` | Owner user account |
| `name` | `VARCHAR(150)` | `NOT NULL` | Restaurant trading name |
| `owner_name` | `VARCHAR(100)` | `NOT NULL` | Contact person's full name |
| `email` | `CITEXT` | `NOT NULL`, `UNIQUE` | Restaurant contact email |
| `phone` | `VARCHAR(20)` | — | Contact phone number (optional) |
| `status` | `VARCHAR(10)` | `NOT NULL`, `DEFAULT 'active'`, `CHECK` | Operational status |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Onboarding timestamp (UTC) |

### Constraints

| Constraint | Details |
|---|---|
| `PK` | `id` |
| `FK` | `user_id → users(id) ON DELETE CASCADE` |
| `UNIQUE` | `email` (case-insensitive via `CITEXT`) |
| `CHECK` | `status IN ('active', 'inactive')` |

### Indexes

| Index name | Column(s) | Purpose |
|---|---|---|
| `idx_restaurants_user_id` | `user_id` | JOIN path from users → restaurants |
| `idx_restaurants_status` | `status` | Admin dashboard status filtering |
| `idx_restaurants_email` | `email` | Public-page lookup by contact email |

---

## Entity Relationship Diagram

```
users
├── id              PK
├── name
├── email           UNIQUE
├── password
├── role            ENUM: super_admin | restaurant
└── created_at
        │
        │ 1
        │
        ▼ 0..1
restaurants
├── id              PK
├── user_id         FK → users.id  (CASCADE DELETE)
├── name
├── owner_name
├── email           UNIQUE
├── phone
├── status          ENUM: active | inactive
└── created_at
```

**Cardinality:** one `users` row may own zero or one `restaurants` row. The `super_admin` role will always have zero. The `restaurant` role will always have exactly one.

---

## Foreign Keys

| Table | Column | References | On Delete |
|---|---|---|---|
| `restaurants` | `user_id` | `users(id)` | `CASCADE` |

Cascade delete ensures that removing a user automatically removes their restaurant record, preventing orphaned rows.

---

## Role Reference

| Role value | Description |
|---|---|
| `super_admin` | Full platform access. Manages all restaurants, users, and settings. No associated restaurant row. |
| `restaurant` | Scoped to their own restaurant. Can manage their own menus and settings. |

---

## Status Reference

| Status value | Description |
|---|---|
| `active` | Restaurant is live. Public menu page is accessible. |
| `inactive` | Restaurant is hidden from public pages. Login still permitted. |

---

## Future Tables (planned)

As new batches are delivered the schema will grow. Anticipated additions:

| Table | Depends on | Batch |
|---|---|---|
| `menus` | `restaurants` | 5 |
| `categories` | `menus` | 5 |
| `menu_items` | `categories` | 5 |
| `qr_codes` | `restaurants` | 6 |
| `subscriptions` | `restaurants` | 8 |
| `analytics_events` | `restaurants` | 8 |

---

## Setup Instructions

1. Provision a Neon project at [neon.tech](https://neon.tech)
2. Copy the connection string into `.env` as `DATABASE_URL`
3. Run the schema against your database:

```bash
psql "$DATABASE_URL" -f backend/database/init.sql
```

Or via the Neon SQL editor — paste the contents of `init.sql` and execute.