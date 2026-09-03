// BizGuard AI — Service-level tests (no HTTP, no server needed)
let passed = 0, failed = 0;
const failures = [];
function assert(name, condition, detail) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n--- ${t} ---`); }

// 1. LOAD SERVICES
section('1. SERVICE LOADING');
const Business = require('./services/businessService');
assert('businessService loads', typeof Business.save === 'function');
const analysisService = require('./services/analysisService');
assert('analysisService loads', typeof analysisService.analyzeBusiness === 'function');
assert('analyzeInventory exported', typeof analysisService.analyzeInventory === 'function');
const csvService = require('./services/csvService');
assert('csvService loads', typeof csvService.processCSV === 'function');
const aiService = require('./services/aiService');
assert('aiService loads', typeof aiService.askAI === 'function');

// 2. DEFAULT BUSINESS DATA
section('2. DEFAULT BUSINESS DATA');
const biz = Business.getOrCreateDefault();
assert('name = Sample Business', biz.name === 'Sample Business');
assert('sales = 45000', biz.sales === 45000);
assert('expenses = 18000', biz.expenses === 18000);
assert('profit = 27000', biz.profit === 27000);
assert('employees = 5', biz.employees === 5);
assert('has inventory', Array.isArray(biz.inventory) && biz.inventory.length === 6);

// 3. METRICS
section('3. METRICS CALCULATION');
const m = Business.getMetrics(biz);
assert('profitMargin = 60%', m.profitMargin === 60, `got ${m.profitMargin}`);
assert('expenseRatio = 40%', m.expenseRatio === 40, `got ${m.expenseRatio}`);

// Auto profit calc
const auto = Business.save('_auto', { name: 'A', sales: 50000, expenses: 20000 });
assert('auto profit = 30000', auto.profit === 30000, `got ${auto.profit}`);
const am = Business.getMetrics(auto);
assert('auto margin = 60%', am.profitMargin === 60, `got ${am.profitMargin}`);

// Loss scenario
const loss = Business.save('_loss', { name: 'L', sales: 10000, expenses: 15000 });
assert('loss profit = -5000', loss.profit === -5000, `got ${loss.profit}`);
const lm = Business.getMetrics(loss);
assert('loss margin = -50%', lm.profitMargin === -50, `got ${lm.profitMargin}`);

// Zero sales
const zero = Business.save('_zero', { name: 'Z', sales: 0, expenses: 0 });
const zm = Business.getMetrics(zero);
assert('zero margin = 0', zm.profitMargin === 0);
assert('zero expenseRatio = 0', zm.expenseRatio === 0);

// 4. INVENTORY
section('4. INVENTORY DATA');
// Reset inventory
Business.setInventory('default', [
  { id: 1, name: "Widget A", quantity: 150, minStock: 20, price: 25, category: "Electronics" },
  { id: 2, name: "Widget B", quantity: 8, minStock: 15, price: 45, category: "Electronics" },
  { id: 3, name: "Gadget X", quantity: 75, minStock: 10, price: 120, category: "Accessories" },
  { id: 4, name: "Gadget Y", quantity: 3, minStock: 10, price: 89.99, category: "Accessories" },
  { id: 5, name: "Part Z", quantity: 200, minStock: 50, price: 8.50, category: "Components" },
  { id: 6, name: "Part W", quantity: 12, minStock: 25, price: 15, category: "Components" },
]);
const inv = Business.getInventory('default');
assert('inventory has 6 items', inv.length === 6, `got ${inv.length}`);
assert('item has name', typeof inv[0].name === 'string');
assert('item has quantity', typeof inv[0].quantity === 'number');
assert('item has minStock', typeof inv[0].minStock === 'number');
assert('item has price', typeof inv[0].price === 'number');

// 5. LOW-STOCK DETECTION
section('5. LOW-STOCK DETECTION');
const low = Business.getLowStockItems('default');
assert('3 low-stock items', low.length === 3, `got ${low.length}: ${low.map(i=>i.name).join(', ')}`);
const lowNames = low.map(i => i.name);
assert('Widget B low (8<15)', lowNames.includes('Widget B'));
assert('Gadget Y low (3<10)', lowNames.includes('Gadget Y'));
assert('Part W low (12<25)', lowNames.includes('Part W'));
assert('Widget A NOT low (150>20)', !lowNames.includes('Widget A'));
assert('Gadget X NOT low (75>10)', !lowNames.includes('Gadget X'));
assert('Part Z NOT low (200>50)', !lowNames.includes('Part Z'));

// 6. CSV — VALID FINANCIAL
section('6. CSV — VALID FINANCIAL');
const fin = csvService.processCSV('sales,expenses,employees\n50000,22000,8\n65000,28000,10');
assert('success', fin.success === true);
assert('type = financial', fin.type === 'financial');
assert('sales = 65000', fin.businessData.sales === 65000, `got ${fin.businessData.sales}`);
assert('expenses = 28000', fin.businessData.expenses === 28000);
assert('employees = 10', fin.businessData.employees === 10);
assert('profit = 37000', fin.businessData.profit === 37000, `got ${fin.businessData.profit}`);
assert('no errors', fin.validation.errors.length === 0);

// Revenue alias
const rev = csvService.processCSV('revenue,total_costs,staff\n100000,60000,15');
assert('revenue alias works', rev.success && rev.businessData.sales === 100000);
assert('total_costs alias works', rev.businessData.expenses === 60000);

// 7. CSV — VALID INVENTORY
section('7. CSV — VALID INVENTORY');
const invCSV = csvService.processCSV('name,quantity,min_stock,price,category\nWA,150,20,25,Electronics\nWB,8,15,45,Electronics\nGX,75,10,120,Accessories');
assert('success', invCSV.success === true);
assert('type = inventory', invCSV.type === 'inventory');
assert('3 items', invCSV.inventoryData.length === 3);
assert('item name mapped', invCSV.inventoryData[0].name === 'WA');
assert('quantity mapped', invCSV.inventoryData[0].quantity === 150);
assert('min_stock mapped', invCSV.inventoryData[0].minStock === 20);
assert('price mapped', invCSV.inventoryData[0].price === 25);

// Column aliases
const alias = csvService.processCSV('product,stock,reorder_level,unit_price,type\nI1,100,20,15.50,CatA');
assert('alias: success', alias.success === true);
assert('alias: product→name', alias.inventoryData[0].name === 'I1');
assert('alias: stock→quantity', alias.inventoryData[0].quantity === 100);
assert('alias: reorder_level→minStock', alias.inventoryData[0].minStock === 20);

// Quoted fields
const quoted = csvService.processCSV('name,quantity,min_stock,price,category\n"Widget, Large",50,10,29.99,"Parts & Tools"');
assert('quoted: success', quoted.success === true);
assert('quoted: comma in name', quoted.inventoryData[0].name === 'Widget, Large', `got "${quoted.inventoryData[0].name}"`);

// 8. CSV — INVALID/EDGE CASES
section('8. CSV — INVALID/EDGE CASES');
assert('empty string fails', csvService.processCSV('').success === false);
assert('header only fails', csvService.processCSV('sales,expenses').success === false);
try { const r = csvService.processCSV(null); assert('null fails', r.success === false); }
catch(e) { assert('null throws safely', true); }
try { const r = csvService.processCSV(123); assert('number fails', r.success === false); }
catch(e) { assert('number throws safely', true); }
const unk = csvService.processCSV('foo,bar,baz\n1,2,3');
assert('unknown cols fails', unk.success === false);

// 8b. CSV — FINANCIAL WITH EXPLICIT PROFIT
section('8b. CSV — FINANCIAL WITH EXPLICIT PROFIT');
const finProfit = csvService.processCSV('sales,expenses,profit,employees\n100000,60000,35000,20');
assert('explicit profit: success', finProfit.success === true);
assert('explicit profit: sales=100000', finProfit.businessData.sales === 100000);
assert('explicit profit: expenses=60000', finProfit.businessData.expenses === 60000);
assert('explicit profit: profit=35000 (not 40000)', finProfit.businessData.profit === 35000, `got ${finProfit.businessData.profit}`);
assert('explicit profit: employees=20', finProfit.businessData.employees === 20);

// 8c. CSV — FINANCIAL WITH INVALID NUMERIC VALUES
section('8c. CSV — INVALID NUMERIC VALUES');
const invalidNum = csvService.processCSV('sales,expenses,employees\nabc,22000,8');
assert('invalid numeric: success (with warning)', invalidNum.success === true);
assert('invalid numeric: has warning', invalidNum.validation.warnings.some(w => w.includes('Invalid numeric value')),
  `warnings: ${invalidNum.validation.warnings.join('; ')}`);
assert('invalid numeric: sales=0 (fallback)', invalidNum.businessData.sales === 0, `got ${invalidNum.businessData.sales}`);
assert('invalid numeric: expenses=22000', invalidNum.businessData.expenses === 22000);

// 8d. CSV — INVENTORY WITH minStock CAMELCASE
section('8d. CSV — INVENTORY minStock CAMELCASE');
const camelInv = csvService.processCSV('name,quantity,minStock,price,category\nItem1,50,10,29.99,Test');
assert('camelCase minStock: success', camelInv.success === true);
assert('camelCase minStock: mapped', camelInv.inventoryData[0].minStock === 10, `got ${camelInv.inventoryData[0].minStock}`);
assert('camelCase minStock: quantity', camelInv.inventoryData[0].quantity === 50);

// 8e. CSV — INVENTORY WITH INVALID NUMERIC
section('8e. CSV — INVENTORY INVALID NUMERIC');
const invalidInv = csvService.processCSV('name,quantity,min_stock,price,category\nItem1,abc,10,29.99,Test');
assert('invalid inv numeric: success (with warning)', invalidInv.success === true);
assert('invalid inv numeric: has warning', invalidInv.validation.warnings.some(w => w.includes('Invalid numeric value')),
  `warnings: ${invalidInv.validation.warnings.join('; ')}`);
assert('invalid inv numeric: qty=0', invalidInv.inventoryData[0].quantity === 0);

// 8f. CSV — UNKNOWN COLUMNS WARNING
section('8f. CSV — UNKNOWN COLUMNS WARNING');
const unknownWarn = csvService.processCSV('sales,expenses,unknown_col\n50000,20000,xyz');
assert('unknown cols: success', unknownWarn.success === true);
assert('unknown cols: has warning', unknownWarn.validation.warnings.some(w => w.includes('Unknown columns')),
  `warnings: ${unknownWarn.validation.warnings.join('; ')}`);

// 8g. CSV — HEADER-ONLY AND EMPTY ERROR MESSAGES
section('8g. CSV — USEFUL ERROR MESSAGES');
const emptyErr = csvService.processCSV('');
assert('empty: has error message', emptyErr.validation.errors.length > 0 && emptyErr.validation.errors[0].length > 0);
const headerErr = csvService.processCSV('sales,expenses,employees');
assert('header-only: has error message', headerErr.validation.errors.length > 0 && headerErr.validation.errors[0].length > 0);

// 9. ANALYSIS — HEALTH SCORE
section('9. ANALYSIS — HEALTH SCORE');
const freshBiz = Business.getOrCreateDefault();
const analysis = analysisService.analyzeBusiness(freshBiz);
assert('healthScore is number', typeof analysis.healthScore === 'number');
assert('score in 0-100', analysis.healthScore >= 0 && analysis.healthScore <= 100);
assert('sample: Excellent', analysis.healthStatus === 'Excellent', `got ${analysis.healthStatus}(${analysis.healthScore})`);
assert('sample: score = 100', analysis.healthScore === 100, `got ${analysis.healthScore}`);

const lossA = analysisService.analyzeBusiness({ sales: 10000, expenses: 15000, profit: -5000 });
assert('loss: At Risk', lossA.healthStatus === 'At Risk', `got ${lossA.healthStatus}(${lossA.healthScore})`);
assert('loss: score < 30', lossA.healthScore < 30, `got ${lossA.healthScore}`);

const nullA = analysisService.analyzeBusiness(null);
assert('null: score = 0', nullA.healthScore === 0);

// 10. ANALYSIS — RISKS
section('10. ANALYSIS — RISKS');
assert('risks is array', Array.isArray(analysis.risks));
assert('has inventory risk', analysis.risks.some(r => r.title.includes('Stock')));
const lowMA = analysisService.analyzeBusiness({ sales: 100000, expenses: 95000, profit: 5000 });
assert('low margin risk', lowMA.risks.some(r => r.title.includes('Profit Margin')));

// 11. ANALYSIS — RECOMMENDATIONS
section('11. ANALYSIS — RECOMMENDATIONS');
assert('has recommendations', analysis.recommendations.length > 0);
assert('all have title', analysis.recommendations.every(r => typeof r.title === 'string'));
assert('all have priority', analysis.recommendations.every(r => ['high','medium','low','info'].includes(r.priority)));
assert('inventory rec exists', analysis.recommendations.some(r => r.title.includes('Restock') || r.title.includes('Inventory')));

// 12. ANALYSIS — INVENTORY
section('12. ANALYSIS — INVENTORY ANALYSIS');
assert('inventory in analysis', analysis.inventory !== null && analysis.inventory !== undefined);
assert('6 items', analysis.inventory.items.length === 6);
assert('3 low stock', analysis.inventory.lowStockItems.length === 3);
assert('totalValue > 0', analysis.inventory.totalValue > 0);
assert('totalItems > 0', analysis.inventory.totalItems > 0);
assert('3 alerts', analysis.inventory.alerts.length === 3, `got ${analysis.inventory.alerts.length}`);
const al = analysis.inventory.alerts[0];
assert('alert has severity', ['critical','high','medium','low'].includes(al.severity));
assert('alert has itemName', typeof al.itemName === 'string');
assert('alert has message', typeof al.message === 'string');

// 13. AI SERVICE (mock)
section('13. AI SERVICE — MOCK');
async function testAI() {
  const ctx = { name: 'Test', sales: 50000, expenses: 20000, profit: 30000 };
  const a1 = await aiService.askAI('How is my profit?', ctx);
  assert('AI returns string', typeof a1 === 'string' && a1.length > 0);
  assert('AI mentions profit', a1.toLowerCase().includes('profit'));
  const a2 = await aiService.askAI('What about expenses?', ctx);
  assert('AI handles expense query', typeof a2 === 'string' && a2.length > 0);
  const a3 = await aiService.askAI('Tell me about growth', ctx);
  assert('AI handles growth query', typeof a3 === 'string' && a3.length > 0);

  // 14. SECURITY CHECK
  section('14. SECURITY — NO API KEYS IN FRONTEND');
  const fs = require('fs');
  const path = require('path');
  const appJsx = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'App.jsx'), 'utf8');
  const hasKey = appJsx.match(/(API_KEY|SECRET_KEY|PASSWORD|AUTH_TOKEN)\s*[:=]\s*['"][^'"]{3,}['"]/i);
  assert('no API_KEY value in App.jsx', !hasKey);
  const hasQwen = appJsx.match(/(qwen|alibaba|dashscope)[_-]?(key|secret|token)\s*[:=]\s*['"]/i);
  assert('no Qwen/Alibaba key in App.jsx', !hasQwen);
  const envExists = fs.existsSync(path.join(__dirname, '..', 'frontend', '.env'));
  assert('no .env in frontend dir', !envExists);

  // 15. FRONTEND INTEGRITY
  section('15. FRONTEND FILE INTEGRITY');
  assert('has DashboardScreen', appJsx.includes('DashboardScreen'));
  assert('has CSVUploadScreen', appJsx.includes('CSVUploadScreen'));
  assert('has AssistantScreen', appJsx.includes('AssistantScreen'));
  assert('has WelcomeScreen', appJsx.includes('WelcomeScreen'));
  assert('has BusinessSetupScreen', appJsx.includes('BusinessSetupScreen'));
  assert('has inventory section', appJsx.includes('Inventory Monitor'));
  assert('has low-stock alerts', appJsx.includes('Low Stock'));
  assert('has CSV upload handler', appJsx.includes('handleCSVUpload'));
  assert('has API URL', appJsx.includes('localhost:5000'));
  assert('has export default', appJsx.includes('export default App'));
  assert('no onKeyPress (deprecated)', !appJsx.includes('onKeyPress'));

  // SUMMARY
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  PASSED: ${passed}`);
  console.log(`  FAILED: ${failed}`);
  console.log(`  TOTAL:  ${passed + failed}`);
  if (failures.length > 0) {
    console.log(`\n  FAILURES:`);
    failures.forEach(f => console.log(`    ✗ ${f}`));
  }
  console.log(`${'='.repeat(50)}`);
  process.exit(failed > 0 ? 1 : 0);
}

testAI().catch(e => { console.error('FATAL:', e); process.exit(1); });
