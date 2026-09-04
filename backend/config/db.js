// Reusable MySQL connection module for BizGuard AI
// Creates a single connection pool from environment variables.
// All credentials come from .env — nothing is hardcoded here.
//
// Required env vars:
//   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
//
// Usage:
//   const { getPool, isDBAvailable, testConnection } = require('./config/db');

const mysql = require('mysql2/promise');

let pool = null;

/**
 * Initialise (or return the existing) MySQL connection pool.
 * Safe to call multiple times — returns the same pool on subsequent calls.
 *
 * Returns null when required env vars are missing so the application
 * can fall back to in-memory storage.
 */
function getPool() {
  if (pool) return pool;

  const host     = process.env.DB_HOST;
  const user     = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port     = parseInt(process.env.DB_PORT, 10) || 3306;

  // password may be empty string (XAMPP default) — only reject when undefined/null
  if (!host || !user || password === undefined || password === null || !database) {
    return null;
  }

  const poolConfig = {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000,
  };

  // Enable SSL when configured (required for most cloud RDS instances)
  if (process.env.DB_SSL === 'true') {
    poolConfig.ssl = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    };
  }

  try {
    pool = mysql.createPool(poolConfig);

    // Verify connectivity (non-fatal if it fails — app falls back gracefully)
    pool.getConnection()
      .then((conn) => {
        console.log(`[DB] MySQL connected — ${host}:${port}/${database}`);
        conn.release();
      })
      .catch((err) => {
        console.warn(`[DB] Initial connection failed: ${err.code || err.message}`);
        console.warn('[DB] Application will use in-memory storage as fallback');
        pool = null;
      });
  } catch (err) {
    console.warn(`[DB] Could not create pool: ${err.code || err.message}`);
    console.warn('[DB] Application will use in-memory storage as fallback');
    pool = null;
  }

  return pool;
}

/**
 * Returns true when a live MySQL pool is available.
 */
function isDBAvailable() {
  return pool !== null;
}

/**
 * Execute a lightweight connectivity check: SELECT 1 AS test.
 * Returns { success, message, result } — never throws.
 */
async function testConnection() {
  const p = getPool();
  if (!p) {
    return { success: false, message: 'Pool not initialised — check DB env vars', result: null };
  }
  try {
    const [rows] = await p.query('SELECT 1 AS test');
    return { success: true, message: 'MySQL connection OK', result: rows[0] };
  } catch (err) {
    return { success: false, message: err.message, result: null };
  }
}

/**
 * Gracefully close the pool (used during shutdown / tests).
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Connection pool closed');
  }
}

module.exports = {
  getPool,
  isDBAvailable,
  testConnection,
  closePool,
};
