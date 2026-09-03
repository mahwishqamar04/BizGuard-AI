// Database connection module
// Creates a MySQL connection pool using environment variables.
// If DB credentials are not configured, the pool is null and the
// application falls back to in-memory storage (businessService.js).
//
// Supports both local MySQL and Alibaba Cloud RDS.
// Set DB_SSL=true to enable SSL (required for most cloud providers).

const mysql = require('mysql2/promise');

let pool = null;

/**
 * Initialise the MySQL connection pool.
 * Called once at startup. Safe to call multiple times — returns
 * the existing pool if it has already been created.
 *
 * Returns null when DB env vars are not configured so the rest
 * of the application can detect this and fall back gracefully.
 */
function getPool() {
  // Already initialised (or intentionally skipped)
  if (pool) return pool;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = parseInt(process.env.DB_PORT, 10) || 3306;

  // If essential vars are missing, DB mode is disabled
  if (!host || !user || !password || !database) {
    return null;
  }

  // Build pool configuration
  const poolConfig = {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Prevent crashes on idle connections
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // Connection timeout (ms) — important for cloud databases
    connectTimeout: 10000,
  };

  // SSL support for Alibaba Cloud RDS and other cloud providers
  // Enable by setting DB_SSL=true in .env
  if (process.env.DB_SSL === 'true') {
    poolConfig.ssl = {
      // rejectUnauthorized: true is the default and ensures the server
      // presents a valid certificate. Set to false ONLY for testing.
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    };
  }

  try {
    pool = mysql.createPool(poolConfig);

    // Verify connectivity immediately (non-fatal if it fails)
    pool.getConnection()
      .then((conn) => {
        // Log connection success without exposing any credentials
        console.log(`[DB] MySQL connected — host: ${host}, port: ${port}, db: ${database}`);
        conn.release();
      })
      .catch((err) => {
        // Log without exposing password or full connection details
        console.warn(`[DB] Initial connection failed: ${err.code || err.message}`);
        console.warn('[DB] Application will use in-memory storage as fallback');
        pool = null; // Reset so fallback is detected
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
  closePool,
};
