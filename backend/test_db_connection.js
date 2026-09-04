// Verify DB connection using the configured .env credentials
require('dotenv').config();
const { getPool, isDBAvailable } = require('./config/database');

(async () => {
  console.log('=== DB Connection Verification ===');
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_PORT:', process.env.DB_PORT);
  console.log('DB_NAME:', process.env.DB_NAME);
  console.log('DB_USER:', process.env.DB_USER);
  console.log('DB_SSL:', process.env.DB_SSL);

  const pool = getPool();
  if (!pool) {
    console.log('FAIL: Pool is null - DB not configured');
    process.exit(1);
  }

  // Wait for connection
  await new Promise(r => setTimeout(r, 2000));

  if (!isDBAvailable()) {
    console.log('FAIL: DB not available after init');
    process.exit(1);
  }
  console.log('PASS: Pool created and connected');

  try {
    const [tables] = await pool.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      [process.env.DB_NAME]
    );
    console.log('Tables:', tables.map(t => t.TABLE_NAME).join(', '));

    const [bizCols] = await pool.execute('DESCRIBE businesses');
    console.log('\nbusinesses columns:', bizCols.map(c => c.Field).join(', '));

    const [invCols] = await pool.execute('DESCRIBE inventory_items');
    console.log('inventory_items columns:', invCols.map(c => c.Field).join(', '));

    const [fks] = await pool.execute(
      "SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ?",
      [process.env.DB_NAME]
    );
    console.log('\nForeign keys:', fks.map(fk => fk.TABLE_NAME + '.' + fk.CONSTRAINT_NAME + ' -> ' + fk.REFERENCED_TABLE_NAME).join(', ') || '(none)');

    const [indexes] = await pool.execute("SHOW INDEXES FROM inventory_items");
    console.log('inventory_items indexes:', [...new Set(indexes.map(i => i.Key_name))].join(', '));

    console.log('\n=== ALL CHECKS PASSED ===');
  } catch (err) {
    console.error('Query error:', err.message);
    process.exit(1);
  }

  const { closePool } = require('./config/database');
  await closePool();
  process.exit(0);
})();
