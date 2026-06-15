'use strict';

const { Pool } = require('pg');

// ─────────────────────────────────────────────
// Neon PostgreSQL Connection Pool
//
// Neon is a serverless Postgres provider that
// requires SSL and benefits from a pool size
// tuned for serverless / low-concurrency usage.
// ─────────────────────────────────────────────

if (!process.env.DATABASE_URL) {
  throw new Error(
    '[DB] DATABASE_URL is not set. ' +
    'Copy .env.example to .env and provide your Neon connection string.'
  );
}

/**
 * Shared connection pool.
 * Re-used across the entire application — import this
 * instance everywhere rather than creating new pools.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Neon requires SSL in all environments.
  // rejectUnauthorized: false accepts Neon's self-signed cert
  // while still encrypting the connection in transit.
  ssl: {
    rejectUnauthorized: false,
  },

  // Keep the pool small for serverless / Neon's connection limits.
  // Increase max for dedicated instances with higher concurrency.
  max: 10,
  idleTimeoutMillis: 30_000,   // release idle clients after 30 s
  connectionTimeoutMillis: 5_000, // fail fast if Neon cold-start exceeds 5 s
});

// ─────────────────────────────────────────────
// Pool-level error handler
// Catches errors on idle clients so they never
// propagate as unhandled promise rejections.
// ─────────────────────────────────────────────
pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Execute a single parameterized query.
 *
 * @param {string}  text   - SQL string with $1, $2 … placeholders
 * @param {Array}   params - Bound parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Acquire a dedicated client from the pool.
 * Use for multi-statement transactions.
 * IMPORTANT: always call client.release() in a finally block.
 *
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = () => pool.connect();

/**
 * testConnection
 * Sends a lightweight query to verify the database is reachable.
 * Call on application boot to surface misconfiguration early.
 *
 * @returns {Promise<void>}
 */
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() AS connected_at');
    console.log(
      `[DB] Neon PostgreSQL connected — server time: ${result.rows[0].connected_at}`
    );
  } catch (err) {
    console.error('[DB] Connection test failed:', err.message);
    throw err; // Let the caller decide whether to abort boot
  } finally {
    if (client) client.release();
  }
};

module.exports = { query, getClient, pool, testConnection };