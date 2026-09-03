// Business data model — MySQL persistence layer
// Drop-in replacement for businessService.js with the same logical API.
// All data-access methods are async (MySQL queries).
// getMetrics() remains synchronous because it is pure calculation.

const { getPool } = require('../config/database');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeFloat(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

function safeInt(val) {
  const n = parseInt(val);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalise a MySQL row from the businesses table into the same
 * plain-object shape that businessService.js returns.
 */
function rowToBusiness(row, inventory) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    sales: safeFloat(row.sales),
    expenses: safeFloat(row.expenses),
    profit: safeFloat(row.profit),
    employees: safeInt(row.employees),
    products: [],
    inventory: inventory || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Normalise a MySQL row from inventory_items into the JS object
 * shape the rest of the app expects.
 */
function rowToInventoryItem(row) {
  return {
    id: row.id,
    name: row.name,
    quantity: safeInt(row.quantity),
    minStock: safeInt(row.min_stock),
    price: safeFloat(row.price),
    category: row.category,
  };
}

// Default sample inventory (same data as businessService.js)
const DEFAULT_INVENTORY = [
  { name: 'Widget A', quantity: 150, minStock: 20, price: 25.00, category: 'Electronics' },
  { name: 'Widget B', quantity: 8, minStock: 15, price: 45.00, category: 'Electronics' },
  { name: 'Gadget X', quantity: 75, minStock: 10, price: 120.00, category: 'Accessories' },
  { name: 'Gadget Y', quantity: 3, minStock: 10, price: 89.99, category: 'Accessories' },
  { name: 'Part Z', quantity: 200, minStock: 50, price: 8.50, category: 'Components' },
  { name: 'Part W', quantity: 12, minStock: 25, price: 15.00, category: 'Components' },
];

// ---------------------------------------------------------------------------
// Data-access methods (async — require MySQL pool)
// ---------------------------------------------------------------------------

/**
 * Get a business by ID. Returns null if not found.
 */
async function get(businessId) {
  const pool = getPool();
  if (!pool) return null;

  const [rows] = await pool.query('SELECT * FROM businesses WHERE id = ?', [businessId]);
  if (rows.length === 0) return null;

  const [invRows] = await pool.query(
    'SELECT * FROM inventory_items WHERE business_id = ? ORDER BY id',
    [businessId],
  );

  return rowToBusiness(rows[0], invRows.map(rowToInventoryItem));
}

/**
 * Create or update a business (upsert).
 */
async function save(businessId, data) {
  const pool = getPool();
  if (!pool) return null;

  const sales = safeFloat(data.sales);
  const expenses = safeFloat(data.expenses);
  let profit;
  if (data.profit !== undefined) {
    const rawProfit = parseFloat(data.profit);
    profit = Number.isFinite(rawProfit) ? rawProfit : (sales - expenses);
  } else {
    profit = sales - expenses;
  }
  const employees = safeInt(data.employees);
  const name = data.name || 'My Business';
  const category = data.category || 'General';

  await pool.query(
    `INSERT INTO businesses (id, name, category, sales, expenses, profit, employees)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       category = VALUES(category),
       sales = VALUES(sales),
       expenses = VALUES(expenses),
       profit = VALUES(profit),
       employees = VALUES(employees)`,
    [businessId, name, category, sales, expenses, profit, employees],
  );

  // If inventory data was provided, save it too
  if (Array.isArray(data.inventory) && data.inventory.length > 0) {
    await setInventory(businessId, data.inventory);
  }

  return get(businessId);
}

/**
 * Get the default business, creating it with sample data if it
 * does not exist yet.
 */
async function getOrCreateDefault() {
  const existing = await get('default');
  if (existing) return existing;

  return save('default', {
    name: 'Sample Business',
    category: 'Retail',
    sales: 45000,
    expenses: 18000,
    profit: 27000,
    employees: 5,
    inventory: DEFAULT_INVENTORY,
  });
}

/**
 * Pure calculation — identical to businessService.getMetrics.
 * Synchronous because it does not touch the database.
 */
function getMetrics(business) {
  if (!business) return null;

  const { sales, expenses, profit } = business;
  const profitMargin = sales > 0 ? ((profit / sales) * 100).toFixed(2) : 0;
  const expenseRatio = sales > 0 ? ((expenses / sales) * 100).toFixed(2) : 0;

  return {
    ...business,
    profitMargin: parseFloat(profitMargin),
    expenseRatio: parseFloat(expenseRatio),
  };
}

// ---------------------------------------------------------------------------
// Inventory methods
// ---------------------------------------------------------------------------

/**
 * Replace the entire inventory list for a business.
 * Uses a transaction: DELETE old rows, INSERT new ones.
 */
async function setInventory(businessId, inventory) {
  const pool = getPool();
  if (!pool) return null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Remove existing items
    await conn.query('DELETE FROM inventory_items WHERE business_id = ?', [businessId]);

    // Insert new items
    const normalised = inventory.map((item, idx) => {
      const rawQty = parseInt(item.quantity);
      const rawMin1 = parseInt(item.minStock);
      const rawMin2 = parseInt(item.min_stock);
      const rawPrice = parseFloat(item.price);
      return {
        name: (typeof item.name === 'string' && item.name.trim()) ? item.name.trim() : `Item ${idx + 1}`,
        quantity: Number.isFinite(rawQty) ? rawQty : 0,
        minStock: Number.isFinite(rawMin1) ? rawMin1 : (Number.isFinite(rawMin2) ? rawMin2 : 0),
        price: Number.isFinite(rawPrice) ? rawPrice : 0,
        category: (typeof item.category === 'string' && item.category.trim()) ? item.category.trim() : 'General',
      };
    });

    if (normalised.length > 0) {
      const placeholders = normalised.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const values = [];
      for (const item of normalised) {
        values.push(businessId, item.name, item.quantity, item.minStock, item.price, item.category);
      }
      await conn.query(
        `INSERT INTO inventory_items (business_id, name, quantity, min_stock, price, category)
         VALUES ${placeholders}`,
        values,
      );
    }

    await conn.commit();

    // Return the freshly inserted list
    const [rows] = await pool.query(
      'SELECT * FROM inventory_items WHERE business_id = ? ORDER BY id',
      [businessId],
    );
    return rows.map(rowToInventoryItem);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Get all inventory items for a business.
 */
async function getInventory(businessId) {
  const pool = getPool();
  if (!pool) return [];

  const [rows] = await pool.query(
    'SELECT * FROM inventory_items WHERE business_id = ? ORDER BY id',
    [businessId],
  );
  return rows.map(rowToInventoryItem);
}

/**
 * Get items where quantity <= min_stock.
 */
async function getLowStockItems(businessId) {
  const pool = getPool();
  if (!pool) return [];

  const [rows] = await pool.query(
    'SELECT * FROM inventory_items WHERE business_id = ? AND quantity <= min_stock ORDER BY id',
    [businessId],
  );
  return rows.map(rowToInventoryItem);
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
