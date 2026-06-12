# Digital Menu

> **SaaS Platform** — Give every restaurant a stunning digital menu, managed by a central admin.

---

## Overview

**Digital Menu** is a multi-tenant SaaS platform that lets a central administrator onboard restaurants, build and manage their menus, and generate QR codes that customers scan to browse the menu in their browser — no app required.

Each restaurant gets its own branded public page. The admin controls everything.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Runtime    | Node.js ≥ 18                        |
| Framework  | Express.js                          |
| Database   | Neon PostgreSQL (serverless Postgres)|
| Auth       | JWT (JSON Web Tokens)               |
| Architecture | MVC                               |

---

## Getting Started

### 1. Clone & install

```bash
git clone <repo-url>
cd Digital-Menu
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=<your-neon-connection-string>
JWT_SECRET=<strong-random-string>
```

### 3. Run — development

```bash
npm run dev
```

Starts the server with **nodemon** (auto-restarts on file changes).

### 4. Run — production

```bash
npm start
```

---

## Health Check

```
GET http://localhost:3000/
```

```json
{
  "message": "Digital Menu API Running",
  "version": "1.0.0",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## Folder Structure — Batch 1

```
Digital-Menu/
├── backend/
│   ├── app.js          # Express app: middleware, routes, error handling
│   └── server.js       # HTTP server: boots app, graceful shutdown
├── .env.example        # Environment variable template
├── .gitignore          # Files excluded from version control
├── package.json        # Dependencies & npm scripts
└── README.md           # You are here
```

As new batches are delivered the structure will grow:

```
Digital-Menu/
├── backend/
│   ├── config/         # DB connection, environment config
│   ├── controllers/    # Route handler logic (MVC — C)
│   ├── middleware/     # Auth guards, validators, rate limiters
│   ├── models/         # PostgreSQL query helpers (MVC — M)
│   ├── routes/         # Express routers (MVC — V-facing)
│   ├── utils/          # Helpers: JWT, QR generation, etc.
│   ├── app.js
│   └── server.js
├── frontend/           # Admin panel & public menu pages
│   ├── admin/
│   └── public/
└── ...
```

---

## Roadmap

| Batch | Feature Area          | Description                                                    |
|-------|-----------------------|----------------------------------------------------------------|
| 2     | **Database**          | Neon PostgreSQL connection, schema, migrations                 |
| 3     | **Authentication**    | JWT login/register, role-based access (admin / restaurant)     |
| 4     | **Restaurant Mgmt**   | CRUD for restaurant profiles, branding, settings               |
| 5     | **Menu Management**   | Categories, items, prices, images, dietary tags                |
| 6     | **QR Codes**          | Per-restaurant QR generation, download, tracking               |
| 7     | **Public Pages**      | Customer-facing menu browser, search & filter, mobile-first    |
| 8     | **Admin Dashboard**   | Central analytics, restaurant oversight, billing hooks         |

---

## Scripts

| Command       | Description                              |
|---------------|------------------------------------------|
| `npm run dev` | Development server (nodemon, hot reload) |
| `npm start`   | Production server                        |

---

## License

ISC