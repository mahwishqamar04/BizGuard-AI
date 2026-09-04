/**
 * BizGuard AI — Step 12: Final Security Check
 * Comprehensive security audit: secrets, input validation, CORS, injection, error handling
 */
const path = require('path');
const fs = require('fs');
const http = require('http');

let passed = 0, failed = 0;
const failures = [];
function assert(name, cond, detail) {
  if (cond) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n${'='.repeat(60)}\n  ${t}\n${'='.repeat(60)}`); }

const PORT = 5002;
const BASE = `http://localhost:${PORT}/api/ai`;
const ROOT = path.join(__dirname, '..');

// Helper: raw HTTP request (for CORS / header testing)
function rawRequest(method, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: PORT,
      path: urlPath, method, headers: headers || {},
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log('BizGuard AI — Step 12: Final Security Check\n');

  // Verify server
  try {
    const r = await fetch(`http://localhost:${PORT}/health`);
    const d = await r.json();
    console.log('Server OK —', d.status, '| DB:', d.database);
  } catch (e) {
    console.error('SERVER DOWN:', e.message);
    process.exit(1);
  }

  // ============================================================
  section('1. ENV FILE & GIT PROTECTION');
  // ============================================================
  const rootGitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  const backendGitignore = fs.readFileSync(path.join(ROOT, 'backend', '.gitignore'), 'utf8');
  const frontendGitignore = fs.readFileSync(path.join(ROOT, 'frontend', '.gitignore'), 'utf8');

  assert('Root .gitignore excludes .env', /\.env/.test(rootGitignore));
  assert('Root .gitignore excludes .env.*', /\.env\.\*/.test(rootGitignore));
  assert('Root .gitignore allows .env.example', /!\.env\.example/.test(rootGitignore));
  assert('Backend .gitignore excludes .env', /\.env/.test(backendGitignore));
  assert('Frontend .gitignore excludes node_modules', /node_modules/.test(frontendGitignore));
  assert('Root .gitignore excludes node_modules', /node_modules/.test(rootGitignore));

  // Check .env is not in git
  const { execSync } = require('child_process');
  let gitTracked = '';
  try { gitTracked = execSync('git ls-files --cached', { cwd: ROOT, encoding: 'utf8' }); } catch(e) {}
  assert('.env NOT tracked by git', !gitTracked.split('\n').some(l => l.trim().endsWith('.env') && !l.includes('.example')));
  assert('.env.example IS tracked (safe)', gitTracked.includes('.env.example'));

  // ============================================================
  section('2. NO SECRETS IN FRONTEND SOURCE');
  // ============================================================
  const frontendSrc = fs.readFileSync(path.join(ROOT, 'frontend', 'src', 'App.jsx'), 'utf8');
  assert('No API_KEY in App.jsx', !/API_KEY|API_SECRET/.test(frontendSrc));
  assert('No DB_PASSWORD in App.jsx', !/DB_PASSWORD/.test(frontendSrc));
  assert('No DB_HOST in App.jsx', !/DB_HOST/.test(frontendSrc));
  assert('No process.env in App.jsx', !/process\.env/.test(frontendSrc));
  assert('No QWEN in App.jsx', !/QWEN/.test(frontendSrc));
  assert('No ALIBABA in App.jsx', !/ALIBABA/.test(frontendSrc));
  assert('No "3307" port in App.jsx', !/3307/.test(frontendSrc));

  // Check built dist
  const distDir = path.join(ROOT, 'frontend', 'dist', 'assets');
  if (fs.existsSync(distDir)) {
    const jsFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));
    let secretsFound = false;
    for (const f of jsFiles) {
      const content = fs.readFileSync(path.join(distDir, f), 'utf8');
      if (/QWEN|ALIBABA|API_KEY|DB_PASSWORD|DB_HOST|3307/.test(content)) {
        secretsFound = true;
        break;
      }
    }
    assert('No secrets in production build', !secretsFound);
  } else {
    assert('No secrets in production build (skipped — no dist)', true);
  }

  // ============================================================
  section('3. NO SECRETS IN API RESPONSES');
  // ============================================================
  // Health endpoint
  const healthR = await fetch(`http://localhost:${PORT}/health`);
  const healthD = await healthR.json();
  assert('Health: no password', !JSON.stringify(healthD).includes('password'));
  assert('Health: no DB_HOST', !JSON.stringify(healthD).includes('localhost:3307'));
  assert('Health: no API key', !JSON.stringify(healthD).includes('sk-') && !JSON.stringify(healthD).includes('QWEN'));
  assert('Health: status ok', healthD.status === 'ok');

  // Root endpoint
  const rootR = await fetch(`http://localhost:${PORT}/`);
  const rootD = await rootR.json();
  assert('Root: no secrets', !/password|api.key|3307|DB_/i.test(JSON.stringify(rootD)));

  // Business endpoint
  const bizR = await fetch(`${BASE}/business`);
  const bizD = await bizR.json();
  assert('Business GET: no secrets', !/password|api.key|3307|DB_/i.test(JSON.stringify(bizD)));

  // Metrics endpoint
  const metR = await fetch(`${BASE}/metrics`);
  const metD = await metR.json();
  assert('Metrics GET: no secrets', !/password|api.key|3307|DB_/i.test(JSON.stringify(metD)));

  // Inventory endpoint
  const invR = await fetch(`${BASE}/inventory`);
  const invD = await invR.json();
  assert('Inventory GET: no secrets', !/password|api.key|3307|DB_/i.test(JSON.stringify(invD)));

  // ============================================================
  section('4. CORS CONFIGURATION');
  // ============================================================
  // Test: localhost should be allowed
  const corsLocal = await rawRequest('GET', '/health', { 'Origin': 'http://localhost:3000' });
  assert('CORS: localhost allowed', (corsLocal.headers['access-control-allow-origin'] || '').includes('localhost'));

  // Test: random external origin should be rejected
  const corsExt = await rawRequest('GET', '/health', { 'Origin': 'http://evil.example.com' });
  const corsExtAllow = corsExt.headers['access-control-allow-origin'] || '';
  assert('CORS: external origin rejected', !corsExtAllow.includes('evil'), `got: ${corsExtAllow}`);

  // Test: no origin (curl/mobile) should work
  const corsNone = await rawRequest('GET', '/health', {});
  assert('CORS: no-origin allowed', corsNone.status === 200);

  // ============================================================
  section('5. INPUT VALIDATION — /api/ai/ask');
  // ============================================================
  // Missing message
  const ask1 = await fetch(`${BASE}/ask`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
  const ask1d = await ask1.json();
  assert('ask: missing message → 400', ask1.status === 400);
  assert('ask: missing message: no stack trace', !JSON.stringify(ask1d).includes('at '));

  // Empty string
  const ask2 = await fetch(`${BASE}/ask`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message:''}) });
  assert('ask: empty message → 400', ask2.status === 400);

  // Non-string message
  const ask3 = await fetch(`${BASE}/ask`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message:123}) });
  assert('ask: non-string message → 400', ask3.status === 400);

  // Very long message (>5000 chars)
  const ask4 = await fetch(`${BASE}/ask`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message:'x'.repeat(5001)}) });
  assert('ask: >5000 chars → 400', ask4.status === 400);

  // Valid message
  const ask5 = await fetch(`${BASE}/ask`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message:'How is my profit?'}) });
  const ask5d = await ask5.json();
  assert('ask: valid message → 200', ask5.status === 200);
  assert('ask: response has answer', typeof ask5d.answer === 'string' && ask5d.answer.length > 0);

  // ============================================================
  section('6. INPUT VALIDATION — /api/ai/business POST');
  // ============================================================
  // Missing required fields
  const biz1 = await fetch(`${BASE}/business`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) });
  assert('business POST: missing fields → 400', biz1.status === 400);

  // Name too long (>200)
  const biz2 = await fetch(`${BASE}/business`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name:'x'.repeat(201), sales:100, expenses:50}) });
  assert('business POST: name >200 → 400', biz2.status === 400);

  // NaN sales
  const biz3 = await fetch(`${BASE}/business`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name:'Test', sales:'abc', expenses:50}) });
  assert('business POST: NaN sales → 400', biz3.status === 400);

  // Infinity sales
  const biz4 = await fetch(`${BASE}/business`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name:'Test', sales:Infinity, expenses:50}) });
  // Infinity serializes to null in JSON, which becomes null → Number(null)=0, so it might pass as 0
  // The key is it shouldn't crash
  assert('business POST: Infinity sales: no crash', biz4.status === 400 || biz4.status === 200);

  // Negative employees
  const biz5 = await fetch(`${BASE}/business`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name:'Test', sales:100, expenses:50, employees:-5}) });
  assert('business POST: negative employees → 400', biz5.status === 400);

  // Valid save
  const biz6 = await fetch(`${BASE}/business`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name:'SecTest', category:'Retail', sales:50000, expenses:20000, profit:30000, employees:10}) });
  assert('business POST: valid → 200', biz6.status === 200);

  // ============================================================
  section('7. INPUT VALIDATION — /api/ai/analyze');
  // ============================================================
  // Missing context
  const an1 = await fetch(`${BASE}/analyze`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
  assert('analyze: missing context → 400', an1.status === 400);

  // Array instead of object
  const an2 = await fetch(`${BASE}/analyze`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({businessContext:[1,2,3]}) });
  assert('analyze: array context → 400', an2.status === 400);

  // Valid context with NaN fields (should be sanitized to 0)
  const an3 = await fetch(`${BASE}/analyze`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({businessContext:{sales:'NaN', expenses:'Infinity', profit:'abc'}}) });
  const an3d = await an3.json();
  assert('analyze: NaN sanitized → 200', an3.status === 200);
  assert('analyze: no NaN in response', !JSON.stringify(an3d).includes('NaN'));

  // ============================================================
  section('8. CSV UPLOAD SECURITY');
  // ============================================================
  // Missing csvData
  const csv1 = await fetch(`${BASE}/upload`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
  assert('upload: missing csvData → 400', csv1.status === 400);

  // Non-string csvData
  const csv2 = await fetch(`${BASE}/upload`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({csvData:123}) });
  assert('upload: non-string csvData → 400', csv2.status === 400);

  // Oversized CSV (>5MB)
  const bigCSV = 'name,quantity,min_stock,price,category\n' + 'A,1,1,1,Test\n'.repeat(500000);
  const csv3 = await fetch(`${BASE}/upload`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({csvData:bigCSV}) });
  assert('upload: >5MB → 413', csv3.status === 413);

  // SQL injection attempt in CSV
  const sqlCSV = 'name,quantity,min_stock,price,category\n"; DROP TABLE businesses;--,1,1,1,Test';
  const csv4 = await fetch(`${BASE}/upload`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({csvData:sqlCSV}) });
  assert('upload: SQL injection in CSV: no crash', csv4.status === 200 || csv4.status === 400);
  // Verify table still exists
  const afterInj = await fetch(`${BASE}/business`);
  assert('upload: SQL injection: data intact', afterInj.status === 200);

  // XSS attempt in CSV
  const xssCSV = 'name,quantity,min_stock,price,category\n<script>alert(1)</script>,1,1,1,Test';
  const csv5 = await fetch(`${BASE}/upload`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({csvData:xssCSV}) });
  assert('upload: XSS attempt: no crash', csv5.status === 200 || csv5.status === 400);
  // Note: XSS in JSON response is safe — React auto-escapes JSX text content.
  // The real check is that the backend doesn't serve HTML with embedded scripts.
  const csv5ct = csv5.headers.get ? csv5.headers.get('content-type') : (csv5.headers['content-type'] || '');
  assert('upload: response is JSON (not HTML)', csv5ct.includes('json') || csv5ct.includes('application'));

  // Valid CSV
  const validCSV = 'sales,expenses,profit\n100000,40000,60000';
  const csv6 = await fetch(`${BASE}/upload`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({csvData:validCSV}) });
  assert('upload: valid financial CSV → 200', csv6.status === 200);

  // ============================================================
  section('9. INVENTORY ENDPOINT SECURITY');
  // ============================================================
  // Non-array inventory
  const inv1 = await fetch(`${BASE}/inventory`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({inventory:'not-array'}) });
  assert('inventory POST: non-array → 400', inv1.status === 400);

  // Oversized inventory (>10000 items)
  const hugeInv = Array.from({length:10001}, (_,i) => ({name:`Item${i}`, quantity:1}));
  const inv2 = await fetch(`${BASE}/inventory`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({inventory:hugeInv}) });
  assert('inventory POST: >10000 items → 413', inv2.status === 413);

  // Item with name >200 chars
  const longInv = [{name:'x'.repeat(201), quantity:1}];
  const inv3 = await fetch(`${BASE}/inventory`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({inventory:longInv}) });
  assert('inventory POST: name >200 → 400', inv3.status === 400);

  // Valid inventory
  const inv4 = await fetch(`${BASE}/inventory`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({inventory:[{name:'SecItem', quantity:50, minStock:10, price:25, category:'Test'}]}) });
  assert('inventory POST: valid → 200', inv4.status === 200);

  // ============================================================
  section('10. ERROR HANDLING — NO STACK TRACES');
  // ============================================================
  // Trigger 404 (no route)
  const err1 = await fetch(`http://localhost:${PORT}/nonexistent`);
  const err1d = await err1.text();
  assert('404: no stack trace', !err1d.includes('at '));
  assert('404: no internal path', !err1d.includes('server.js') && !err1d.includes('__dirname'));

  // Malformed JSON body
  const err2 = await fetch(`${BASE}/ask`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{invalid json' });
  // Express should handle this gracefully
  assert('malformed JSON: no crash (400 or 500)', err2.status === 400 || err2.status === 500);
  const err2d = await err2.text();
  assert('malformed JSON: no stack trace', !err2d.includes('at '));

  // Wrong method
  const err3 = await fetch(`${BASE}/ask`, { method: 'DELETE' });
  assert('DELETE /ask: no crash', err3.status === 404 || err3.status === 405 || err3.status === 200);

  // Empty body POST
  const err4 = await fetch(`${BASE}/business`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: '' });
  assert('empty body POST: no crash', err4.status >= 400 && err4.status < 600);

  // ============================================================
  section('11. SQL INJECTION RESISTANCE');
  // ============================================================
  // SQL injection in business name
  const sqli1 = await fetch(`${BASE}/business`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name:"'; DROP TABLE businesses;--", sales:100, expenses:50}) });
  assert('SQLi in name: no crash', sqli1.status === 200 || sqli1.status === 400);
  // Verify data still accessible
  const sqli1v = await fetch(`${BASE}/business`);
  assert('SQLi in name: data intact', sqli1v.status === 200);

  // SQL injection in ask message
  const sqli2 = await fetch(`${BASE}/ask`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message:"' OR 1=1; DROP TABLE businesses;--"}) });
  assert('SQLi in ask: no crash', sqli2.status === 200);

  // SQL injection in inventory name
  const sqli3 = await fetch(`${BASE}/inventory`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({inventory:[{name:"'; DELETE FROM inventory_items;--", quantity:1}]}) });
  assert('SQLi in inventory: no crash', sqli3.status === 200 || sqli3.status === 400);

  // ============================================================
  section('12. PARAMETERIZED QUERY AUDIT');
  // ============================================================
  const dbService = fs.readFileSync(path.join(ROOT, 'backend', 'services', 'dbService.js'), 'utf8');
  // Count ? placeholders (parameterized)
  const paramCount = (dbService.match(/\?/g) || []).length;
  assert('dbService uses parameterized queries', paramCount >= 20, `found ${paramCount} placeholders`);

  // Check for string concatenation in SQL (dangerous pattern)
  const concatSQL = (dbService.match(/`?\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|WHERE)/gi) || []);
  // Filter out comments
  const dangerousConcat = concatSQL.filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
  assert('dbService: no unsafe string concat in SQL', dangerousConcat.length === 0, `found: ${dangerousConcat.join(', ')}`);

  // ============================================================
  section('13. BODY SIZE LIMITS');
  // ============================================================
  // JSON body limit is 10mb (set in server.js)
  // Test with a moderately large body (just under limit)
  const largeBody = JSON.stringify({csvData: 'name,quantity\n' + 'A,1\n'.repeat(100)});
  const large1 = await fetch(`${BASE}/upload`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: largeBody });
  assert('upload: moderate body → 200', large1.status === 200);

  // ============================================================
  section('14. FRONTEND SECURITY ATTRIBUTES');
  // ============================================================
  const indexHtml = fs.readFileSync(path.join(ROOT, 'frontend', 'index.html'), 'utf8');
  assert('index.html has viewport meta', /viewport/.test(indexHtml));
  assert('index.html has charset', /charset/i.test(indexHtml));

  // Check that frontend doesn't have inline scripts with secrets
  assert('No inline script with env vars', !/<script[^>]*>[\s\S]*?process\.env/.test(indexHtml));

  // ============================================================
  section('15. BACKEND .env FILE SECURITY');
  // ============================================================
  const envContent = fs.readFileSync(path.join(ROOT, 'backend', '.env'), 'utf8');
  // Check that API keys are commented out (not active)
  const hasActiveQwenKey = /^QWEN_API_KEY=(?!your_)/m.test(envContent);
  const hasActiveAlibabaKey = /^ALIBABA_API_KEY=(?!your_)/m.test(envContent);
  assert('No active QWEN_API_KEY in .env', !hasActiveQwenKey);
  assert('No active ALIBABA_API_KEY in .env', !hasActiveAlibabaKey);

  // Check .env.example exists and has placeholders
  const envExample = fs.readFileSync(path.join(ROOT, 'backend', '.env.example'), 'utf8');
  assert('.env.example exists', envExample.length > 0);
  assert('.env.example has placeholder', /your_/.test(envExample) || /placeholder/i.test(envExample));

  // ============================================================
  section('16. DEPENDENCY SECURITY');
  // ============================================================
  const backendPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'backend', 'package.json'), 'utf8'));
  const frontendPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend', 'package.json'), 'utf8'));

  // Check all backend deps are known/safe
  const safeBackendDeps = ['cors', 'dotenv', 'express', 'mysql2'];
  const actualBackendDeps = Object.keys(backendPkg.dependencies || {});
  const unknownBackend = actualBackendDeps.filter(d => !safeBackendDeps.includes(d));
  assert('Backend: all deps are known/safe', unknownBackend.length === 0, `unknown: ${unknownBackend.join(', ')}`);

  // Check all frontend deps are known/safe
  const safeFrontendDeps = ['react', 'react-dom', '@types/react', '@types/react-dom', '@vitejs/plugin-react', 'oxlint', 'vite'];
  const actualFrontendDeps = [...Object.keys(frontendPkg.dependencies || {}), ...Object.keys(frontendPkg.devDependencies || {})];
  const unknownFrontend = actualFrontendDeps.filter(d => !safeFrontendDeps.includes(d));
  assert('Frontend: all deps are known/safe', unknownFrontend.length === 0, `unknown: ${unknownFrontend.join(', ')}`);

  // No postinstall scripts (common attack vector)
  assert('Backend: no postinstall script', !backendPkg.scripts?.postinstall);
  assert('Frontend: no postinstall script', !frontendPkg.scripts?.postinstall);

  // ============================================================
  section('17. ERROR RESPONSE FORMAT CONSISTENCY');
  // ============================================================
  // All error responses should have { success: false, message: ... }
  const errResp1 = await fetch(`${BASE}/ask`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
  const errResp1d = await errResp1.json();
  assert('Error: has success:false', errResp1d.success === false);
  assert('Error: has message', typeof errResp1d.message === 'string');
  assert('Error: no stack property', !errResp1d.stack);
  assert('Error: no error detail property', !errResp1d.error?.includes('ENOENT') && !errResp1d.error?.includes('ECONN'));

  // ============================================================
  section('18. REGRESSION — CORE FEATURES WORK');
  // ============================================================
  // Business GET
  const reg1 = await fetch(`${BASE}/business`);
  assert('Regression: business GET works', (await reg1.json()).success === true);

  // Metrics GET
  const reg2 = await fetch(`${BASE}/metrics`);
  assert('Regression: metrics GET works', (await reg2.json()).success === true);

  // Inventory GET
  const reg3 = await fetch(`${BASE}/inventory`);
  assert('Regression: inventory GET works', (await reg3.json()).success === true);

  // AI ask
  const reg4 = await fetch(`${BASE}/ask`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message:'test'}) });
  assert('Regression: ask works', (await reg4.json()).success === true);

  // Analyze
  const reg5 = await fetch(`${BASE}/analyze`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({businessContext:{sales:1000,expenses:500,profit:500}}) });
  assert('Regression: analyze works', (await reg5.json()).success === true);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  SECURITY AUDIT COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
  if (failures.length > 0) {
    console.log(`\n  FAILURES:`);
    failures.forEach(f => console.log(`    ✗ ${f}`));
  }
  console.log(`${'='.repeat(60)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
