// Setup bizguard_ai database — execute schema and seed using multipleStatements
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

const PORT = 3307;

(async () => {
  console.log('=== BizGuard AI — MySQL Setup ===');

  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: PORT,
    user: 'root',
    password: '',
    multipleStatements: true,
  });
  console.log('Connected to MariaDB');

  const [ver] = await conn.query('SELECT VERSION() AS v');
  console.log('Version:', ver[0].v);

  // Create database
  await conn.query('CREATE DATABASE IF NOT EXISTS bizguard_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  console.log('Database bizguard_ai created');

  // Select the database
  await conn.query('USE bizguard_ai');
  console.log('Selected database bizguard_ai');

  // Execute schema
  const schemaPath = path.join(__dirname, 'database', 'schema.sql');
  const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
  await conn.query(schemaSQL);
  console.log('Schema executed');

  // Verify tables
  const [tables] = await conn.query('SHOW TABLES FROM bizguard_ai');
  console.log('Tables:', tables.map(t => Object.values(t)[0]).join(', '));

  // Describe businesses
  const [bizCols] = await conn.query('DESCRIBE bizguard_ai.businesses');
  console.log('\nbusinesses columns:');
  bizCols.forEach(c => console.log('  ', c.Field, c.Type, c.Null === 'YES' ? 'NULL' : 'NOT NULL', c.Key || '', c.Default || ''));

  // Describe inventory_items
  const [invCols] = await conn.query('DESCRIBE bizguard_ai.inventory_items');
  console.log('\ninventory_items columns:');
  invCols.forEach(c => console.log('  ', c.Field, c.Type, c.Null === 'YES' ? 'NULL' : 'NOT NULL', c.Key || '', c.Default || ''));

  // Check indexes on inventory_items
  const [indexes] = await conn.query('SHOW INDEXES FROM bizguard_ai.inventory_items');
  console.log('\ninventory_items indexes:', [...new Set(indexes.map(i => i.Key_name))].join(', '));

  // Check foreign keys
  const [fks] = await conn.query(
    "SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'bizguard_ai'"
  );
  console.log('\nForeign keys:', fks.map(fk => fk.TABLE_NAME + '.' + fk.CONSTRAINT_NAME + ' -> ' + fk.REFERENCED_TABLE_NAME).join(', ') || 'none');

  // Check constraints
  const [checks] = await conn.query(
    "SELECT CONSTRAINT_NAME, TABLE_NAME, CONSTRAINT_TYPE FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = 'bizguard_ai' AND CONSTRAINT_TYPE = 'CHECK'"
  );
  console.log('\nCHECK constraints:', checks.map(c => c.TABLE_NAME + '.' + c.CONSTRAINT_NAME).join(', ') || 'none');

  // Seed data
  const [existingBiz] = await conn.query("SELECT COUNT(*) AS cnt FROM bizguard_ai.businesses WHERE id = 'default'");
  if (existingBiz[0].cnt > 0) {
    console.log('\nDefault business already exists, skipping seed');
  } else {
    const seedPath = path.join(__dirname, 'database', 'seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    await conn.query(seedSQL);
    console.log('\nSeed data inserted');
  }

  // Verify data
  console.log('\n--- Data Verification ---');
  const [bizRows] = await conn.query('SELECT * FROM bizguard_ai.businesses');
  console.log('Businesses:', bizRows.length);
  bizRows.forEach(b => {
    console.log('  ID:', b.id, '| Name:', b.name, '| Sales:', b.sales, '| Expenses:', b.expenses, '| Profit:', b.profit, '| Employees:', b.employees);
  });

  const [invRows] = await conn.query('SELECT * FROM bizguard_ai.inventory_items ORDER BY id');
  console.log('Inventory items:', invRows.length);
  invRows.forEach(r => {
    console.log('  ', r.id, r.name, '| qty:', r.quantity, '| min:', r.min_stock, '| price:', r.price, '| cat:', r.category, '| biz:', r.business_id);
  });

  const [lowStock] = await conn.query('SELECT * FROM bizguard_ai.inventory_items WHERE quantity <= min_stock');
  console.log('Low stock items:', lowStock.length, '-', lowStock.map(r => r.name).join(', '));

  await conn.end();
  console.log('\n=== Setup Complete ===');
  console.log('Host: 127.0.0.1, Port:', PORT, ', DB: bizguard_ai, User: root');
})().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
