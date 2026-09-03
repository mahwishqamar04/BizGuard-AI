const mysql = require('mysql2/promise');

(async () => {
  const passwords = ['', 'root', 'xampp', 'password', 'admin', 'mysql', '12345', 'wampp', 'test'];
  for (const pw of passwords) {
    try {
      const c = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: pw,
        connectTimeout: 3000,
      });
      console.log(`SUCCESS with password='${pw}'`);
      const [rows] = await c.query('SHOW DATABASES');
      console.log('Databases:', rows.map(r => r.Database));
      await c.end();
      process.exit(0);
    } catch (e) {
      console.log(`FAIL '${pw}': ${e.code || e.message}`);
    }
  }
  console.log('No working combination found.');
})();
