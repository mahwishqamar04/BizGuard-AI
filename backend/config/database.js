// Database connection module
// Thin backward-compatible wrapper around config/db.js.
// All existing imports (require('../config/database')) continue to work.
// New code should prefer require('../config/db') directly.

const db = require('./db');

module.exports = {
  getPool: db.getPool,
  isDBAvailable: db.isDBAvailable,
  testConnection: db.testConnection,
  closePool: db.closePool,
};
