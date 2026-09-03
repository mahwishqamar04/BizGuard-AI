// BizGuard AI — Complete P0 MVP Verification Test
// Tests all backend services, calculations, CSV parsing, inventory, and API endpoints

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function section(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}`);
}

// ============================================================
// LOAD ALL SERVICES
// ============================================================
section('1. SERVICE LOADING');

let Business, analysisService, csvService, aiService;

try {
  Business = require('./services/businessService');
  assert('businessService loads', true);
} catch (e) {
  assert('businessService loads', false, e.message);
}

try {
  analysisService = require('./services/analysisService');
  assert('analysisService loads', true);
} catch (e) {
  assert('analysisService loads', false, e.message);
}

try {
  csvService = require('./services/csvService');
  assert('csvService loads', true);
} catch (e) {
  assert('csvService loads', false, e.message);
}

try {
  aiService = require('./services/aiService');
  assert('aiService loads', true);
} catch (e) {
  assert('aiService loads', false, e.message);
}

// ============================================================
// TEST BUSINESS SERVICE
// ============================================================
section('2. BUSINESS SERVICE — Default Data');

const defaultBiz = Business.getOrCreateDefault();
assert('Default business has name', defaultBiz.name === 'Sample Business');
assert('Default business has category', defaultBiz.category === 'Retail');
assert('Default business has sales', defaultBiz.sales === 45000);
assert('Default business has expenses', defaultBiz.expenses === 18000);
assert('Default business has profit', defaultBiz.profit === 27000);
assert('Default business has employees', defaultBiz.employees === 5);
assert('Default business has inventory array', Array.isArray(defaultBiz.inventory) && defaultBiz.inventory.length > 0);
assert('Default inventory has 6 items', defaultBiz.inventory.length === 6, `got ${defaultBiz.inventory.length}`);

// ============================================================
// TEST METRICS CALCULATION
// ============================================================
section('3. METRICS CALCULATION');

const metrics = Business.getMetrics(defaultBiz);
assert('Metrics returns profitMargin', metrics.profitMargin !== undefined);
assert('Profit margin = 60%', metrics.profitMargin === 60.00, `got ${metrics.profitMargin}`);
assert('Expense ratio = 40%', metrics.expenseRatio === 40.00, `got ${metrics.expenseRatio}`);

// Test with custom data
const customBiz = Business.save('test', { name: 'Test', sales: 100000, expenses: 75000 });
const customMetrics = Business.getMetrics(customBiz);
assert('Custom profit = 25000', customBiz.profit === 25000, `got ${customBiz.profit}`);
assert('Custom margin = 25%', customMetrics.profitMargin === 25.00, `got ${customMetrics.profitMargin}`);
assert('Custom expense ratio = 75%', customMetrics.expenseRatio === 75.00, `got ${customMetrics.expenseRatio}`);

// Test zero sales edge case
const zeroBiz = Business.save('zero', { name: 'Zero', sales: 0, expenses: 0 });
const zeroMetrics = Business.getMetrics(zeroBiz);
assert('Zero sales margin = 0', zeroMetrics.profitMargin === 0);
assert('Zero sales expense ratio = 0', zeroMetrics.expenseRatio === 0);

// ============================================================
// TEST CALCULATIONS: Sales, Expenses, Profit, Margin
// ============================================================
section('4. CALCULATION VERIFICATION');

// Test profit auto-calculation
const autoBiz = Business.save('auto', { name: 'Auto', sales: 50000, expenses: 20000 });
assert('Auto profit = sales - expenses', autoBiz.profit === 30000, `got ${autoBiz.profit}`);

// Test explicit profit
const explicitBiz = Business.save('explicit', { name: 'Explicit', sales: 50000, expenses: 20000, profit: 25000 });
assert('Explicit profit preserved', explicitBiz.profit === 25000, `got ${explicitBiz.profit}`);

// Test negative profit (loss)
const lossBiz = Business.save('loss', { name: 'Loss', sales: 10000, expenses: 15000 });
assert('Loss: profit is negative', lossBiz.profit === -5000, `got ${lossBiz.profit}`);

// Profit margin for loss
const lossMetrics = Business.getMetrics(lossBiz);
assert('Loss margin is negative', lossMetrics.profitMargin === -50.00, `got ${lossMetrics.profitMargin}`);

// ============================================================
// TEST INVENTORY SERVICE
// ============================================================
section('5. INVENTORY DATA');

const inventory = Business.getInventory('default');
assert('Inventory returns array', Array.isArray(inventory));
assert('Inventory has 6 items', inventory.length === 6, `got ${inventory.length}`);

// Check inventory item structure
const item = inventory[0];
assert('Item has name', typeof item.name === 'string' && item.name.length > 0);
assert('Item has quantity', typeof item.quantity === 'number');
assert('Item has minStock', typeof item.minStock === 'number');
assert('Item has price', typeof item.price === 'number');
assert('Item has category', typeof item.category === 'string');

// ============================================================
// TEST LOW-STOCK DETECTION
// ============================================================
section('6. LOW-STOCK ALERTS');

const lowStock = Business.getLowStockItems('default');
assert('Low stock returns array', Array.isArray(lowStock));
assert('Low stock detects 3 items', lowStock.length === 3, `got ${lowStock.length}: ${lowStock.map(i => i.name).join(', ')}`);

// Verify specific low-stock items
const lowNames = lowStock.map(i => i.name);
assert('Widget B is low stock (8 < 15)', lowNames.includes('Widget B'));
assert('Gadget Y is low stock (3 < 10)', lowNames.includes('Gadget Y'));
assert('Part W is low stock (12 < 25)', lowNames.includes('Part W'));

// Verify non-low items are NOT included
assert('Widget A NOT low stock (150 > 20)', !lowNames.includes('Widget A'));
assert('Gadget X NOT low stock (75 > 10)', !lowNames.includes('Gadget X'));
assert('Part Z NOT low stock (200 > 50)', !lowNames.includes('Part Z'));

// Save original inventory before modifying (defaultBiz.inventory is a reference — must deep-copy)
const ORIGINAL_INVENTORY = JSON.parse(JSON.stringify(defaultBiz.inventory));

// Test setInventory
const newInv = Business.setInventory('default', [
  { name: 'TestA', quantity: 5, minStock: 10, price: 20, category: 'X' },
  { name: 'TestB', quantity: 50, minStock: 10, price: 30, category: 'Y' },
]);
assert('setInventory returns array', Array.isArray(newInv));
assert('setInventory has 2 items', newInv.length === 2);
const newLow = Business.getLowStockItems('default');
assert('New low stock = 1 (TestA)', newLow.length === 1 && newLow[0].name === 'TestA', `got ${newLow.length}`);

// Restore default inventory from saved copy
Business.setInventory('default', ORIGINAL_INVENTORY);

// ============================================================
// TEST CSV PARSING — VALID DATA
// ============================================================
section('7. CSV PARSING — VALID FINANCIAL DATA');

const finCSV = `sales,expenses,employees
50000,22000,8
65000,28000,10`;

const finResult = csvService.processCSV(finCSV);
assert('Financial CSV: success', finResult.success === true);
assert('Financial CSV: type = financial', finResult.type === 'financial');
assert('Financial CSV: sales = 65000', finResult.businessData.sales === 65000, `got ${finResult.businessData.sales}`);
assert('Financial CSV: expenses = 28000', finResult.businessData.expenses === 28000);
assert('Financial CSV: employees = 10', finResult.businessData.employees === 10);
assert('Financial CSV: profit = 37000', finResult.businessData.profit === 37000, `got ${finResult.businessData.profit}`);
assert('Financial CSV: rowCount = 2', finResult.rowCount === 2);
assert('Financial CSV: no errors', finResult.validation.errors.length === 0);

// Test with revenue alias
const revCSV = `revenue,total_costs,staff
100000,60000,15`;
const revResult = csvService.processCSV(revCSV);
assert('Revenue alias: success', revResult.success === true);
assert('Revenue alias: sales = 100000', revResult.businessData.sales === 100000);
assert('Revenue alias: expenses = 60000', revResult.businessData.expenses === 60000);

section('8. CSV PARSING — VALID INVENTORY DATA');

const invCSV = `name,quantity,min_stock,price,category
Widget A,150,20,25.00,Electronics
Widget B,8,15,45.00,Electronics
Gadget X,75,10,120.00,Accessories`;

const invResult = csvService.processCSV(invCSV);
assert('Inventory CSV: success', invResult.success === true);
assert('Inventory CSV: type = inventory', invResult.type === 'inventory');
assert('Inventory CSV: 3 items', invResult.inventoryData.length === 3);
assert('Item 1 name = Widget A', invResult.inventoryData[0].name === 'Widget A');
assert('Item 1 quantity = 150', invResult.inventoryData[0].quantity === 150);
assert('Item 1 minStock = 20', invResult.inventoryData[0].minStock === 20);
assert('Item 1 price = 25', invResult.inventoryData[0].price === 25);
assert('Item 2 is low stock flagged', invResult.inventoryData[1].quantity < invResult.inventoryData[1].minStock);

// Test with stock/qty aliases
const aliasCSV = `product,stock,reorder_level,unit_price,type
Item1,100,20,15.50,CatA`;
const aliasResult = csvService.processCSV(aliasCSV);
assert('Column aliases: success', aliasResult.success === true);
assert('Column aliases: name mapped', aliasResult.inventoryData[0].name === 'Item1');
assert('Column aliases: quantity mapped', aliasResult.inventoryData[0].quantity === 100);
assert('Column aliases: minStock mapped', aliasResult.inventoryData[0].minStock === 20);

// ============================================================
// TEST CSV PARSING — INVALID / EDGE CASES
// ============================================================
section('9. CSV PARSING — INVALID & EDGE CASES');

// Empty string
const emptyResult = csvService.processCSV('');
assert('Empty string: fails safely', emptyResult.success === false);
assert('Empty string: has error', emptyResult.validation.errors.length > 0);

// Header only (no data rows)
const headerOnly = csvService.processCSV('sales,expenses,employees');
assert('Header only: fails safely', headerOnly.success === false);

// Null input
try {
  const nullResult = csvService.processCSV(null);
  assert('Null input: fails safely', nullResult.success === false);
} catch (e) {
  assert('Null input: handled (exception)', true);
}

// Non-string input
try {
  const numResult = csvService.processCSV(12345);
  assert('Non-string: fails safely', numResult.success === false);
} catch (e) {
  assert('Non-string: handled (exception)', true);
}

// Unknown columns
const unknownCSV = `foo,bar,baz\n1,2,3`;
const unknownResult = csvService.processCSV(unknownCSV);
assert('Unknown columns: fails or warns', unknownResult.success === false || unknownResult.validation.warnings.length > 0);

// CSV with quoted fields
const quotedCSV = `name,quantity,min_stock,price,category
"Widget, Large",50,10,29.99,"Parts & Tools"`;
const quotedResult = csvService.processCSV(quotedCSV);
assert('Quoted fields: success', quotedResult.success === true);
assert('Quoted fields: comma in name preserved', quotedResult.inventoryData[0].name === 'Widget, Large', `got "${quotedResult.inventoryData[0].name}"`);

// Financial CSV with explicit profit
const finExplicitProfit = csvService.processCSV('sales,expenses,profit,employees\n100000,60000,35000,20');
assert('Financial explicit profit: success', finExplicitProfit.success === true);
assert('Financial explicit profit: profit=35000', finExplicitProfit.businessData.profit === 35000, `got ${finExplicitProfit.businessData.profit}`);

// Financial CSV with invalid numeric value
const finInvalid = csvService.processCSV('sales,expenses,employees\nabc,22000,8');
assert('Financial invalid numeric: success with warning', finInvalid.success === true);
assert('Financial invalid numeric: has warning', finInvalid.validation.warnings.some(w => w.includes('Invalid numeric value')));
assert('Financial invalid numeric: sales=0', finInvalid.businessData.sales === 0);

// Inventory CSV with minStock camelCase header
const camelCSV = csvService.processCSV('name,quantity,minStock,price,category\nItem1,50,10,29.99,Test');
assert('Inventory camelCase minStock: success', camelCSV.success === true);
assert('Inventory camelCase minStock: mapped correctly', camelCSV.inventoryData[0].minStock === 10, `got ${camelCSV.inventoryData[0].minStock}`);

// Inventory CSV with invalid numeric
const invInvalid = csvService.processCSV('name,quantity,min_stock,price,category\nItem1,abc,10,29.99,Test');
assert('Inventory invalid numeric: success with warning', invInvalid.success === true);
assert('Inventory invalid numeric: has warning', invInvalid.validation.warnings.some(w => w.includes('Invalid numeric value')));

// Unknown columns produce warning
const unknownWarnCSV = csvService.processCSV('sales,expenses,unknown_col\n50000,20000,xyz');
assert('Unknown columns: warning produced', unknownWarnCSV.validation.warnings.some(w => w.includes('Unknown columns')));

// ============================================================
// TEST ANALYSIS SERVICE
// ============================================================
section('10. ANALYSIS SERVICE — HEALTH SCORE');

// Recreate default for analysis test
const analysisBiz = Business.getOrCreateDefault();
// Restore inventory from saved copy
Business.setInventory('default', ORIGINAL_INVENTORY);
const freshBiz = Business.getOrCreateDefault();
const analysis = analysisService.analyzeBusiness(freshBiz);

assert('Analysis returns healthScore', typeof analysis.healthScore === 'number');
assert('Health score 0-100 range', analysis.healthScore >= 0 && analysis.healthScore <= 100);
assert('Health status is string', typeof analysis.healthStatus === 'string');
assert('Health status color is valid', ['success', 'info', 'warning', 'danger'].includes(analysis.healthStatusColor));

// Sample biz: sales=45000, expenses=18000, profit=27000 → margin=60%
assert('Sample biz health = Excellent', analysis.healthStatus === 'Excellent', `got ${analysis.healthStatus} (${analysis.healthScore})`);
assert('Sample biz score = 100', analysis.healthScore === 100, `got ${analysis.healthScore}`);

// Test with loss-making business
const lossAnalysis = analysisService.analyzeBusiness({ sales: 10000, expenses: 15000, profit: -5000 });
assert('Loss biz: score < 30', lossAnalysis.healthScore < 30, `got ${lossAnalysis.healthScore}`);
assert('Loss biz: status = At Risk', lossAnalysis.healthStatus === 'At Risk', `got ${lossAnalysis.healthStatus}`);

// Test null input
const nullAnalysis = analysisService.analyzeBusiness(null);
assert('Null biz: returns default', nullAnalysis.healthScore === 0);

section('11. ANALYSIS SERVICE — RISK DETECTION');

assert('Analysis has risks array', Array.isArray(analysis.risks));
assert('Risks include inventory alerts', analysis.risks.some(r => r.title.includes('Stock')), `risks: ${analysis.risks.map(r=>r.title).join(', ')}`);

// Test risk detection for low margin
const lowMarginAnalysis = analysisService.analyzeBusiness({ sales: 100000, expenses: 95000, profit: 5000 });
assert('Low margin risk detected', lowMarginAnalysis.risks.some(r => r.title.includes('Profit Margin')), `risks: ${lowMarginAnalysis.risks.map(r=>r.title).join(', ')}`);

section('12. ANALYSIS SERVICE — RECOMMENDATIONS');

assert('Analysis has recommendations', Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0);
assert('Recommendations have title', analysis.recommendations.every(r => typeof r.title === 'string'));
assert('Recommendations have priority', analysis.recommendations.every(r => ['high', 'medium', 'low', 'info'].includes(r.priority)));

// Check inventory recommendation exists
assert('Inventory restock recommendation', analysis.recommendations.some(r => r.title.includes('Restock') || r.title.includes('Inventory')),
  `recs: ${analysis.recommendations.map(r=>r.title).join(', ')}`);

section('13. ANALYSIS SERVICE — INVENTORY ANALYSIS');

assert('Analysis includes inventory object', analysis.inventory !== null && analysis.inventory !== undefined);
assert('Inventory has items', analysis.inventory.items.length === 6);
assert('Inventory has lowStockItems', analysis.inventory.lowStockItems.length === 3);
assert('Inventory has totalValue', typeof analysis.inventory.totalValue === 'number' && analysis.inventory.totalValue > 0);
assert('Inventory has totalItems', typeof analysis.inventory.totalItems === 'number' && analysis.inventory.totalItems > 0);
assert('Inventory has alerts', analysis.inventory.alerts.length === 3, `got ${analysis.inventory.alerts.length}`);

// Verify alert structure
const alert = analysis.inventory.alerts[0];
assert('Alert has severity', ['critical', 'high', 'medium', 'low'].includes(alert.severity));
assert('Alert has itemName', typeof alert.itemName === 'string');
assert('Alert has message', typeof alert.message === 'string');

// ============================================================
// TEST AI SERVICE (mock mode)
// ============================================================
section('14. AI SERVICE — MOCK MODE');

async function testAI() {
  const ctx = { name: 'Test Biz', sales: 50000, expenses: 20000, profit: 30000 };
  
  try {
    const answer = await aiService.askAI('How is my profit?', ctx);
    assert('AI returns answer', typeof answer === 'string' && answer.length > 0);
    assert('AI answer mentions profit', answer.toLowerCase().includes('profit'), 'Answer should discuss profit');
    assert('AI follows Analyze workflow', answer.includes('Analyzing') || answer.includes('profit') || answer.includes('margin'));
  } catch (e) {
    assert('AI askAI works', false, e.message);
  }

  try {
    const answer2 = await aiService.askAI('What about my expenses?', ctx);
    assert('AI handles expense query', typeof answer2 === 'string' && answer2.length > 0);
  } catch (e) {
    assert('AI handles expense query', false, e.message);
  }

  // ============================================================
  // TEST HTTP ENDPOINTS
  // ============================================================
  section('15. HTTP ENDPOINT TESTS');

  const BASE = 'http://localhost:5000/api/ai';

  // GET /business
  try {
    const res = await fetch(`${BASE}/business`);
    const data = await res.json();
    assert('GET /business: 200', res.status === 200);
    assert('GET /business: success=true', data.success === true);
    assert('GET /business: has data', data.data !== null);
    assert('GET /business: has sales', typeof data.data.sales === 'number');
    assert('GET /business: has inventory', Array.isArray(data.data.inventory));
  } catch (e) {
    assert('GET /business', false, e.message);
  }

  // GET /metrics
  try {
    const res = await fetch(`${BASE}/metrics`);
    const data = await res.json();
    assert('GET /metrics: 200', res.status === 200);
    assert('GET /metrics: has profitMargin', typeof data.data.profitMargin === 'number');
    assert('GET /metrics: has expenseRatio', typeof data.data.expenseRatio === 'number');
  } catch (e) {
    assert('GET /metrics', false, e.message);
  }

  // GET /inventory
  try {
    const res = await fetch(`${BASE}/inventory`);
    const data = await res.json();
    assert('GET /inventory: 200', res.status === 200);
    assert('GET /inventory: has inventory array', Array.isArray(data.data.inventory));
    assert('GET /inventory: has lowStockItems', Array.isArray(data.data.lowStockItems));
    assert('GET /inventory: has totalItems', typeof data.data.totalItems === 'number');
    assert('GET /inventory: has lowStockCount', typeof data.data.lowStockCount === 'number');
  } catch (e) {
    assert('GET /inventory', false, e.message);
  }

  // POST /analyze
  try {
    const biz = Business.getOrCreateDefault();
    const res = await fetch(`${BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessContext: biz }),
    });
    const data = await res.json();
    assert('POST /analyze: 200', res.status === 200);
    assert('POST /analyze: success=true', data.success === true);
    assert('POST /analyze: has healthScore', typeof data.data.healthScore === 'number');
    assert('POST /analyze: has risks', Array.isArray(data.data.risks));
    assert('POST /analyze: has recommendations', Array.isArray(data.data.recommendations));
    assert('POST /analyze: has inventory', data.data.inventory !== undefined);
  } catch (e) {
    assert('POST /analyze', false, e.message);
  }

  // POST /upload — financial CSV
  try {
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData: 'sales,expenses,employees\n80000,30000,12' }),
    });
    const data = await res.json();
    assert('POST /upload (financial): 200', res.status === 200);
    assert('POST /upload (financial): success=true', data.success === true);
    assert('POST /upload (financial): type=financial', data.type === 'financial');
    assert('POST /upload (financial): data has sales', data.data.sales === 80000);
  } catch (e) {
    assert('POST /upload (financial)', false, e.message);
  }

  // POST /upload — inventory CSV
  try {
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData: 'name,quantity,min_stock,price,category\nTestItem,5,10,29.99,Test' }),
    });
    const data = await res.json();
    assert('POST /upload (inventory): 200', res.status === 200);
    assert('POST /upload (inventory): success=true', data.success === true);
    assert('POST /upload (inventory): type=inventory', data.type === 'inventory');
    assert('POST /upload (inventory): 1 item', data.data.length === 1);
  } catch (e) {
    assert('POST /upload (inventory)', false, e.message);
  }

  // POST /upload — invalid CSV
  try {
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData: '' }),
    });
    assert('POST /upload (empty): 400', res.status === 400);
  } catch (e) {
    assert('POST /upload (empty)', false, e.message);
  }

  // POST /upload — no csvData field
  try {
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert('POST /upload (missing): 400', res.status === 400);
  } catch (e) {
    assert('POST /upload (missing)', false, e.message);
  }

  // POST /upload — financial CSV with explicit profit
  try {
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData: 'sales,expenses,profit,employees\n100000,60000,35000,20' }),
    });
    const data = await res.json();
    assert('POST /upload (explicit profit): 200', res.status === 200);
    assert('POST /upload (explicit profit): profit=35000', data.data.profit === 35000, `got ${data.data.profit}`);
  } catch (e) {
    assert('POST /upload (explicit profit)', false, e.message);
  }

  // POST /upload — invalid numeric CSV (should succeed with warnings)
  try {
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData: 'sales,expenses,employees\nabc,22000,8' }),
    });
    const data = await res.json();
    assert('POST /upload (invalid numeric): 200', res.status === 200);
    assert('POST /upload (invalid numeric): has warnings', data.validation && data.validation.warnings.length > 0);
  } catch (e) {
    assert('POST /upload (invalid numeric)', false, e.message);
  }

  // POST /upload — header-only CSV (should fail with useful error)
  try {
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData: 'sales,expenses,employees' }),
    });
    assert('POST /upload (header-only): 400', res.status === 400);
    const data = await res.json();
    assert('POST /upload (header-only): has error message', data.validation && data.validation.errors && data.validation.errors.length > 0);
  } catch (e) {
    assert('POST /upload (header-only)', false, e.message);
  }

  // POST /ask — AI chat
  try {
    const res = await fetch(`${BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How is my profit?',
        businessContext: { name: 'Test', sales: 50000, expenses: 20000, profit: 30000 },
      }),
    });
    const data = await res.json();
    assert('POST /ask: 200', res.status === 200);
    assert('POST /ask: success=true', data.success === true);
    assert('POST /ask: has answer', typeof data.answer === 'string' && data.answer.length > 0);
  } catch (e) {
    assert('POST /ask', false, e.message);
  }

  // POST /ask — missing message
  try {
    const res = await fetch(`${BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessContext: {} }),
    });
    assert('POST /ask (no message): 400', res.status === 400);
  } catch (e) {
    assert('POST /ask (no message)', false, e.message);
  }

  // POST /inventory
  try {
    const res = await fetch(`${BASE}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inventory: [
          { name: 'A', quantity: 100, minStock: 20, price: 10, category: 'X' },
          { name: 'B', quantity: 5, minStock: 10, price: 20, category: 'Y' },
        ],
      }),
    });
    const data = await res.json();
    assert('POST /inventory: 200', res.status === 200);
    assert('POST /inventory: success=true', data.success === true);
    assert('POST /inventory: 2 items', data.data.length === 2);
  } catch (e) {
    assert('POST /inventory', false, e.message);
  }

  // Restore default inventory after HTTP tests
  Business.setInventory('default', ORIGINAL_INVENTORY);

  // ============================================================
  // SECURITY CHECK — API keys in frontend
  // ============================================================
  section('16. SECURITY — API KEY CHECK');

  const fs = require('fs');
  const path = require('path');

  const frontendFiles = [
    path.join(__dirname, '..', 'frontend', 'src', 'App.jsx'),
    path.join(__dirname, '..', 'frontend', 'src', 'main.jsx'),
    path.join(__dirname, '..', 'frontend', 'src', 'index.css'),
    path.join(__dirname, '..', 'frontend', 'src', 'App.css'),
    path.join(__dirname, '..', 'frontend', 'index.html'),
  ];

  const sensitivePatterns = [/API_KEY/i, /SECRET/i, /PASSWORD/i, /TOKEN/i, /qwen/i, /alibaba/i, /dashscope/i];
  let keyFound = false;

  for (const file of frontendFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of sensitivePatterns) {
        if (pattern.test(content)) {
          // Check if it's just a variable name reference vs actual key value
          const lines = content.split('\n');
          for (const line of lines) {
            if (pattern.test(line) && (line.includes('= "') || line.includes("= '") || line.includes('="') || line.includes("='"))) {
              console.log(`  WARN: Potential key in ${path.basename(file)}: ${line.trim()}`);
              keyFound = true;
            }
          }
        }
      }
    } catch (e) {
      // File might not exist
    }
  }

  assert('No API keys in frontend code', !keyFound);

  // Check .env is not in frontend
  const envInFrontend = fs.existsSync(path.join(__dirname, '..', 'frontend', '.env'));
  assert('No .env file in frontend', !envInFrontend);

  // ============================================================
  // FRONTEND FILE CHECKS
  // ============================================================
  section('17. FRONTEND FILE INTEGRITY');

  const appJsx = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'App.jsx'), 'utf8');
  assert('App.jsx has DashboardScreen', appJsx.includes('DashboardScreen'));
  assert('App.jsx has CSVUploadScreen', appJsx.includes('CSVUploadScreen'));
  assert('App.jsx has AssistantScreen', appJsx.includes('AssistantScreen'));
  assert('App.jsx has WelcomeScreen', appJsx.includes('WelcomeScreen'));
  assert('App.jsx has BusinessSetupScreen', appJsx.includes('BusinessSetupScreen'));
  assert('App.jsx has inventory section', appJsx.includes('Inventory Monitor') || appJsx.includes('inventory-section'));
  assert('App.jsx has low-stock alerts', appJsx.includes('Low Stock') || appJsx.includes('lowStock'));
  assert('App.jsx has CSV upload handler', appJsx.includes('handleCSVUpload'));
  assert('App.jsx connects to API', appJsx.includes('VITE_API_URL') || appJsx.includes('/api/ai'));
  assert('App.jsx has export default', appJsx.includes('export default App'));

  // Check no API keys in App.jsx
  assert('App.jsx: no API_KEY value', !appJsx.match(/API_KEY\s*[:=]\s*['"][^'"]+['"]/));
  assert('App.jsx: no hardcoded secret', !appJsx.match(/(qwen|alibaba|dashscope)[_-]?key\s*[:=]\s*['"]/i));

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  TEST SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  if (failures.length > 0) {
    console.log(`\n  FAILURES:`);
    failures.forEach(f => console.log(`    - ${f}`));
  }
  console.log(`${'='.repeat(60)}\n`);

  // Stop the server and exit
  stopServer().then(() => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

// Require server (starts automatically) and wait for it to be listening
const { waitForServer, stopServer } = require('./server.js');
waitForServer().then(() => {
  console.log('  Server is ready — starting tests...\n');
  testAI().catch(e => {
    console.error('Test runner error:', e);
    stopServer().then(() => process.exit(1));
  });
}).catch(err => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
