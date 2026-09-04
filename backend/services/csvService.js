// CSV parsing and data mapping service
// Handles SMB business data CSV files with built-in parser (no external dependencies)

/**
 * Parse CSV text into array of objects
 * Handles: quoted fields, commas in quotes, different line endings
 */
function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    throw new Error('CSV content must be a non-empty string');
  }

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));

  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // skip empty lines

    const values = parseCSVLine(line);
    const row = {};

    headers.forEach((header, idx) => {
      let value = (values[idx] || '').trim();
      // Try to convert numeric values
      if (value !== '' && !isNaN(value)) {
        value = parseFloat(value);
      }
      row[header] = value;
    });

    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

/**
 * Column name mapping: normalize various CSV column names to standard fields
 */
const COLUMN_ALIASES = {
  // Sales/revenue columns
  sales: ['sales', 'revenue', 'total_sales', 'total_revenue', 'monthly_sales', 'monthly_revenue'],
  // Expense columns
  expenses: ['expenses', 'expense', 'costs', 'total_expenses', 'total_costs', 'monthly_expenses', 'operating_expenses'],
  // Profit columns
  profit: ['profit', 'net_profit', 'monthly_profit', 'net_income', 'income'],
  // Employee columns
  employees: ['employees', 'employee_count', 'staff', 'staff_count', 'num_employees', 'headcount'],
  // Inventory columns
  name: ['name', 'product', 'item', 'product_name', 'item_name'],
  quantity: ['quantity', 'qty', 'stock', 'stock_quantity', 'count', 'units', 'on_hand'],
  minStock: ['min_stock', 'minstock', 'min_quantity', 'min_qty', 'reorder_level', 'minimum_stock', 'min_inventory', 'reorder_point'],
  price: ['price', 'unit_price', 'cost', 'unit_cost', 'item_price', 'selling_price'],
  category: ['category', 'type', 'product_category', 'item_category', 'group'],
};

/**
 * Map a CSV row's columns to standard field names using aliases
 */
function mapColumns(row) {
  const mapped = {};
  const rowKeys = Object.keys(row);

  for (const [standardName, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const foundKey = rowKeys.find(k => k === alias || k.replace(/[^a-z0-9]/g, '_') === alias);
      if (foundKey !== undefined && row[foundKey] !== '' && row[foundKey] !== undefined) {
        mapped[standardName] = row[foundKey];
        break;
      }
    }
  }

  return mapped;
}

/**
 * Detect CSV type: 'financial' or 'inventory' based on column names.
 * Uses COLUMN_ALIASES to recognise all supported column name variants.
 */
function detectCSVType(headers) {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

  // Build indicator sets from COLUMN_ALIASES for each field group
  const financialFields = ['sales', 'expenses', 'profit', 'employees'];
  const inventoryFields = ['name', 'quantity', 'minStock', 'price', 'category'];

  const financialIndicators = new Set();
  for (const field of financialFields) {
    if (COLUMN_ALIASES[field]) COLUMN_ALIASES[field].forEach(a => financialIndicators.add(a));
  }

  const inventoryIndicators = new Set();
  for (const field of inventoryFields) {
    if (COLUMN_ALIASES[field]) COLUMN_ALIASES[field].forEach(a => inventoryIndicators.add(a));
  }

  let inventoryScore = 0;
  let financialScore = 0;

  for (const h of normalizedHeaders) {
    if (inventoryIndicators.has(h)) inventoryScore++;
    if (financialIndicators.has(h)) financialScore++;
  }

  if (inventoryScore > financialScore) return 'inventory';
  if (financialScore > 0) return 'financial';
  return 'unknown';
}

/**
 * Process uploaded CSV and extract business data
 * Returns: { type, businessData, inventoryData, validation }
 */
function processCSV(csvText) {
  const validation = { errors: [], warnings: [] };

  let parsed;
  try {
    parsed = parseCSV(csvText);
  } catch (err) {
    validation.errors.push(err.message);
    return { success: false, validation };
  }

  const { headers, rows } = parsed;

  if (rows.length === 0) {
    validation.errors.push('CSV file has no data rows');
    return { success: false, validation };
  }

  const csvType = detectCSVType(headers);

  // Warn about unrecognized columns
  const knownAliases = new Set();
  for (const aliases of Object.values(COLUMN_ALIASES)) {
    aliases.forEach(a => knownAliases.add(a));
  }
  const unknownCols = headers.filter(h => {
    if (knownAliases.has(h)) return false;
    // Also check normalized form (strip underscores for camelCase comparison)
    const normalized = h.replace(/_/g, '');
    return ![...knownAliases].some(a => a.replace(/_/g, '') === normalized);
  });
  if (unknownCols.length > 0) {
    validation.warnings.push(`Unknown columns ignored: ${unknownCols.join(', ')}`);
  }

  if (csvType === 'inventory') {
    return processInventoryCSV(rows, validation);
  } else if (csvType === 'financial') {
    return processFinancialCSV(rows, validation);
  } else {
    validation.errors.push(
      `Could not detect CSV type. Expected columns like: sales/revenue/expenses (financial) or name/quantity/stock (inventory). Found: ${headers.join(', ')}`
    );
    return { success: false, validation };
  }
}

/**
 * Process financial/business summary CSV
 */
function processFinancialCSV(rows, validation) {
  // Use the last row (or sum/average depending on data)
  const row = rows[rows.length - 1]; // Use latest/last row
  const mapped = mapColumns(row);

  // Validate and parse numeric fields
  const sales = parseNumericField(mapped.sales, 'sales', validation);
  const expenses = parseNumericField(mapped.expenses, 'expenses', validation);
  const employees = parseNumericField(mapped.employees, 'employees', validation, true);

  // Profit: use provided value if present, otherwise calculate
  let profit;
  if (mapped.profit !== undefined && mapped.profit !== '') {
    profit = parseNumericField(mapped.profit, 'profit', validation);
  } else {
    profit = (sales || 0) - (expenses || 0);
  }

  if ((sales || 0) === 0 && (expenses || 0) === 0) {
    validation.warnings.push('No sales or expense data found. Check column names.');
  }

  if ((sales || 0) < 0 || (expenses || 0) < 0) {
    validation.warnings.push('Negative values detected in sales or expenses.');
  }

  return {
    success: true,
    type: 'financial',
    businessData: {
      sales: sales || 0,
      expenses: expenses || 0,
      profit: profit !== undefined ? profit : (sales || 0) - (expenses || 0),
      employees: employees || 0,
    },
    rowCount: rows.length,
    validation,
  };
}

/**
 * Process inventory CSV
 */
function processInventoryCSV(rows, validation) {
  const inventory = [];

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapColumns(rows[i]);

    if (!mapped.name || (typeof mapped.name === 'string' && !mapped.name.trim())) {
      validation.warnings.push(`Row ${i + 2}: Missing item name, skipping.`);
      continue;
    }

    const qty = parseNumericField(mapped.quantity, `quantity (row ${i + 2})`, validation, true);
    const minStock = parseNumericField(mapped.minStock, `minStock (row ${i + 2})`, validation, true);
    const price = parseNumericField(mapped.price, `price (row ${i + 2})`, validation, true);

    inventory.push({
      id: i + 1,
      name: String(mapped.name).trim(),
      quantity: qty || 0,
      minStock: minStock || 0,
      price: price || 0,
      category: mapped.category || 'General',
    });
  }

  if (inventory.length === 0) {
    validation.errors.push('No valid inventory items found in CSV.');
    return { success: false, validation };
  }

  return {
    success: true,
    type: 'inventory',
    inventoryData: inventory,
    rowCount: rows.length,
    validation,
  };
}

/**
 * Safely parse a numeric field, adding a validation warning if the value is not a valid number.
 * @param {*} value - The raw value from the CSV
 * @param {string} fieldName - Name of the field for error messages
 * @param {object} validation - The validation object to push warnings to
 * @param {boolean} [allowZero=true] - Whether zero is an acceptable fallback
 * @returns {number|undefined} The parsed number, or undefined if completely invalid
 */
function parseNumericField(value, fieldName, validation, allowZero) {
  if (value === undefined || value === null || value === '') return undefined;

  // If already a number (from parseCSV auto-conversion), return it
  if (typeof value === 'number' && !isNaN(value)) return value;

  const str = String(value).trim();
  if (str === '') return undefined;

  const parsed = Number(str);
  if (isNaN(parsed)) {
    validation.warnings.push(`Invalid numeric value "${value}" for ${fieldName}, using 0.`);
    return 0;
  }
  return parsed;
}

module.exports = {
  parseCSV,
  processCSV,
  detectCSVType,
  mapColumns,
  parseNumericField,
};
