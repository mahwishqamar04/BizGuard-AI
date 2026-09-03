// Unified business data service
// Automatically selects MySQL (dbService) when a database connection
// is available, otherwise falls back to in-memory (businessService).
//
// All data-access methods are async.  getMetrics() is synchronous
// because it is pure calculation in both implementations.

const { isDBAvailable } = require('../config/database');
const memService = require('./businessService');   // in-memory singleton
const dbService = require('./dbService');           // MySQL

/**
 * Return the active service module.
 * Evaluated on every call so a runtime DB reconnect is picked up.
 */
function active() {
  return isDBAvailable() ? dbService : memService;
}

// ---- Business methods ----

async function get(businessId) {
  return active().get(businessId);
}

async function save(businessId, data) {
  return active().save(businessId, data);
}

async function getOrCreateDefault() {
  return active().getOrCreateDefault();
}

// Synchronous — pure calculation, no I/O
function getMetrics(business) {
  // Both implementations use the same logic; use memService's version
  return memService.getMetrics(business);
}

// ---- Inventory methods ----

async function setInventory(businessId, inventory) {
  return active().setInventory(businessId, inventory);
}

async function getInventory(businessId) {
  return active().getInventory(businessId);
}

async function getLowStockItems(businessId) {
  return active().getLowStockItems(businessId);
}

module.exports = {
  get,
  save,
  getOrCreateDefault,
  getMetrics,
  setInventory,
  getInventory,
  getLowStockItems,
};
