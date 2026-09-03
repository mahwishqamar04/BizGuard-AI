// =============================================================
// BizGuard AI — Cloud Database Setup Script
// =============================================================
// Applies schema.sql and optionally seed.sql to a MySQL database.
// Works with both local MySQL and Alibaba Cloud RDS.
//
// USAGE:
//   1. Copy .env.example to .env and fill in your DB credentials.
//   2. Run: node setup_cloud.js
//
// SAFETY:
//   - Never prints passwords or secrets.
//   - Uses IF NOT EXISTS for tables (safe to re-run).
//   - Will NOT overwrite existing data (seed uses INSERT, not REPLACE).
// =============================================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  console.log('=== BizGuard AI — Cloud Database Setup ===\n');

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const useSSL = process.env.DB_SSL === 'true';

  // Validate that credentials are configured
  if (!host || !user || !password || !database) {
    console.error('ERROR: Database credentials not configured.');
    console.error('Please copy .env.example to .env and fill in your DB credentials.');
    console.error('');
    console.error('Required variables:');
    console.error('  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
    console.error('');
    console.error('For Alibaba Cloud RDS, also set:');
    console.error('  DB_SSL=true');
    process.exit(1);
  }

  // Show connection info (never show password)
  console.log('Connection settings:');
  console.log(`  Host:     ${host}`);
  console.log(`  Port:     ${port}`);
  console.log(`  User:     ${user}`);
  console.log(`  Database: ${database}`);
  console.log(`  SSL:      ${useSSL ? 'enabled' : 'disabled'}`);
  console.log('');

  // Build connection config
  const connConfig = {
    host,
    port,
    user,
    password,
    multipleStatements: true,
    connectTimeout: 15000,
  };

  // SSL for cloud databases
  if (useSSL) {
    connConfig.ssl = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    };
  }

  let conn;
  try {
    console.log('Connecting to MySQL server...');
    conn = await mysql.createConnection(connConfig);
    console.log('Connected successfully.\n');
  } catch (err) {
    console.error(`Connection failed: ${err.code || err.message}`);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  - Check that your DB_HOST and DB_PORT are correct.');
    console.error('  - Verify DB_USER and DB_PASSWORD in .env.');
    console.error('  - For Alibaba Cloud RDS, ensure your IP is whitelisted.');
    console.error('  - For Alibaba Cloud RDS, ensure DB_SSL=true is set.');
    process.exit(1);
  }

  try {
    // Show MySQL version
    const [ver] = await conn.query('SELECT VERSION() AS v');
    console.log(`MySQL version: ${ver[0].v}\n`);

    // Create database
    console.log(`Creating database "${database}"...`);
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('Database created (or already exists).\n');

    // Select the database
    await conn.query(`USE \`${database}\``);

    // Apply schema
    console.log('Applying schema...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    await conn.query(schemaSQL);
    console.log('Schema applied.\n');

    // Verify tables
    const [tables] = await conn.query(`SHOW TABLES FROM \`${database}\``);
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(`Tables found: ${tableNames.join(', ')}`);

    if (!tableNames.includes('businesses')) {
      console.error('ERROR: businesses table not found!');
      process.exit(1);
    }
    if (!tableNames.includes('inventory_items')) {
      console.error('ERROR: inventory_items table not found!');
      process.exit(1);
    }
    console.log('Required tables verified.\n');

    // Describe businesses
    const [bizCols] = await conn.query(`DESCRIBE \`${database}\`.businesses`);
    console.log('businesses columns:');
    bizCols.forEach(c => console.log(`  ${c.Field.padEnd(15)} ${c.Type.padEnd(20)} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}  ${c.Key || ''}  ${c.Default || ''}`));

    // Describe inventory_items
    const [invCols] = await conn.query(`DESCRIBE \`${database}\`.inventory_items`);
    console.log('\ninventory_items columns:');
    invCols.forEach(c => console.log(`  ${c.Field.padEnd(15)} ${c.Type.padEnd(20)} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}  ${c.Key || ''}  ${c.Default || ''}`));

    // Check indexes
    const [indexes] = await conn.query(`SHOW INDEXES FROM \`${database}\`.inventory_items`);
    const indexNames = [...new Set(indexes.map(i => i.Key_name))];
    console.log(`\ninventory_items indexes: ${indexNames.join(', ')}`);

    // Check foreign keys
    const [fks] = await conn.query(
      "SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ?",
      [database]
    );
    console.log(`Foreign keys: ${fks.map(fk => `${fk.TABLE_NAME}.${fk.CONSTRAINT_NAME} -> ${fk.REFERENCED_TABLE_NAME}`).join(', ') || 'none'}`);

    // Seed data (only if businesses table is empty)
    const [countRows] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${database}\`.businesses`);
    if (countRows[0].cnt > 0) {
      console.log(`\nBusinesses table already has ${countRows[0].cnt} row(s) — skipping seed.`);
    } else {
      console.log('\nInserting seed data...');
      const seedPath = path.join(__dirname, 'database', 'seed.sql');
      const seedSQL = fs.readFileSync(seedPath, 'utf8');
      await conn.query(seedSQL);
      console.log('Seed data inserted.');
    }

    // Verify data
    console.log('\n--- Data Verification ---');
    const [bizRows] = await conn.query(`SELECT * FROM \`${database}\`.businesses`);
    console.log(`Businesses: ${bizRows.length}`);
    bizRows.forEach(b => {
      console.log(`  ID: ${b.id} | Name: ${b.name} | Sales: ${b.sales} | Expenses: ${b.expenses} | Profit: ${b.profit} | Employees: ${b.employees}`);
    });

    const [invRows] = await conn.query(`SELECT * FROM \`${database}\`.inventory_items ORDER BY id`);
    console.log(`Inventory items: ${invRows.length}`);
    invRows.forEach(r => {
      console.log(`  ${r.id} ${r.name} | qty: ${r.quantity} | min: ${r.min_stock} | price: ${r.price} | cat: ${r.category}`);
    });

    const [lowStock] = await conn.query(
      `SELECT * FROM \`${database}\`.inventory_items WHERE quantity <= min_stock`
    );
    console.log(`Low stock items: ${lowStock.length} — ${lowStock.map(r => r.name).join(', ')}`);

    console.log('\n=== Setup Complete ===');
    console.log(`Host: ${host}, Port: ${port}, DB: ${database}, User: ${user}`);
    console.log('SSL:', useSSL ? 'enabled' : 'disabled');

  } catch (err) {
    console.error(`\nSetup error: ${err.code || err.message}`);
    // Never expose full error details that might contain credentials
    if (err.sqlState) {
      console.error(`SQL State: ${err.sqlState}`);
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
