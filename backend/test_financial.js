/**
 * BizGuard AI — Step 7: Financial Features Test
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let passed = 0, failed = 0;
const failures = [];

function assert(name, condition, detail) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n${'='.repeat(60)}\n  ${t}\n${'='.repeat(60)}`); }

const Business = require('./services/businessService');
const analysisService = require('./services/analysisService');
const csvService = require('./services/csvService');
const aiService = require('./services/aiService');
const { isDBAvailable } = require('./config/database');

async function main() {
  console.log('BizGuard AI — Step 7: Financial Features Test');
  console.log(`Data layer: ${isDBAvailable() ? 'MySQL' : 'in-memory'}\n`);

  // 1. FINANCIAL CALCULATIONS
  section('1. FINANCIAL CALCULATIONS');
  const b1 = Business.save('f1', { name: 'T', sales: 100000, expenses: 60000 });
  assert('Profit = sales - expenses', b1.profit === 40000, `got ${b1.profit}`);
  const b2 = Business.save('f2', { name: 'T', sales: 100000, expenses: 60000, profit: 35000 });
  assert('Explicit profit preserved', b2.profit === 35000);
  const b3 = Business.save('f3', { name: 'T', sales: 10000, expenses: 15000 });
  assert('Loss: negative profit', b3.profit === -5000);
  const b4 = Business.save('f4', { name: 'T', sales: 0, expenses: 0 });
  assert('Zero sales: profit=0', b4.profit === 0);
  const m1 = Business.getMetrics(b1);
  assert('Margin=40%', m1.profitMargin === 40, `got ${m1.profitMargin}`);
  assert('Expense ratio=60%', m1.expenseRatio === 60, `got ${m1.expenseRatio}`);
  const m3 = Business.getMetrics(b3);
  assert('Loss margin=-50%', m3.profitMargin === -50, `got ${m3.profitMargin}`);
  const m4 = Business.getMetrics(b4);
  assert('Zero margin=0', m4.profitMargin === 0);

  // 2. FINANCIAL CSV — VALID
  section('2. FINANCIAL CSV — VALID');
  const c1 = csvService.processCSV('sales,expenses,employees\n50000,20000,5');
  assert('CSV: success', c1.success && c1.type === 'financial');
  assert('CSV: sales=50000', c1.businessData.sales === 50000);
  assert('CSV: expenses=20000', c1.businessData.expenses === 20000);
  assert('CSV: profit=30000', c1.businessData.profit === 30000);
  const c2 = csvService.processCSV('revenue,total_costs,staff\n100000,60000,15');
  assert('Alias: sales=100000', c2.businessData.sales === 100000);
  const c3 = csvService.processCSV('sales,expenses,profit\n100000,60000,35000');
  assert('Explicit profit=35000', c3.businessData.profit === 35000);

  // 3. FINANCIAL CSV — INVALID
  section('3. FINANCIAL CSV — INVALID');
  assert('Empty: fails', csvService.processCSV('').success === false);
  assert('Header-only: fails', csvService.processCSV('sales,expenses').success === false);
  try { assert('Null: fails', csvService.processCSV(null).success === false); } catch { assert('Null: throws', true); }
  const cInv = csvService.processCSV('sales,expenses\nabc,22000');
  assert('Invalid num: warning', cInv.validation.warnings.some(w => w.includes('Invalid')));
  assert('Invalid num: sales=0', cInv.businessData.sales === 0);

  // 4. ANALYSIS — FINANCIAL METRICS
  section('4. ANALYSIS — FINANCIAL METRICS');
  const a1 = analysisService.analyzeBusiness({ sales: 100000, expenses: 40000, profit: 60000 });
  assert('Healthy: score>70', a1.healthScore > 70, `got ${a1.healthScore}`);
  assert('Healthy: metrics.profitMargin=60', a1.metrics.profitMargin === 60);
  assert('Healthy: metrics.expenseRatio=40', a1.metrics.expenseRatio === 40);
  const a2 = analysisService.analyzeBusiness({ sales: 10000, expenses: 15000, profit: -5000 });
  assert('Loss: score<30', a2.healthScore < 30);
  assert('Loss: At Risk', a2.healthStatus === 'At Risk');
  assert('Loss: critical risk', a2.risks.some(r => r.severity === 'critical'));
  const a3 = analysisService.analyzeBusiness(null);
  assert('Null: score=0', a3.healthScore === 0);

  // 5. RISK DETECTION
  section('5. RISK DETECTION');
  const r1 = analysisService.analyzeBusiness({ sales: 100000, expenses: 90000, profit: 10000 });
  assert('High expenses: risk', r1.risks.some(r => /expense/i.test(r.title)));
  const r2 = analysisService.analyzeBusiness({ sales: 100000, expenses: 95000, profit: 5000 });
  assert('Low margin: risk', r2.risks.some(r => /margin/i.test(r.title)));
  const r3 = analysisService.analyzeBusiness({ sales: 5000, expenses: 3000, profit: 2000 });
  assert('Low sales: risk', r3.risks.some(r => /sales/i.test(r.title)));

  // 6. RECOMMENDATIONS
  section('6. RECOMMENDATIONS');
  const rec = analysisService.analyzeBusiness({ sales: 30000, expenses: 25000, profit: 5000 });
  assert('Has recs', rec.recommendations.length > 0);
  assert('Recs have title', rec.recommendations.every(r => r.title?.length > 0));
  assert('Recs have priority', rec.recommendations.every(r => ['high','medium','low','info'].includes(r.priority)));

  // 7. AI SERVICE
  section('7. AI SERVICE — FINANCIAL CONTEXT');
  const ctx = { name: 'Test', sales: 50000, expenses: 20000, profit: 30000 };
  const ai1 = await aiService.askAI('How is my profit?', ctx);
  assert('AI profit: responds', ai1?.length > 0);
  assert('AI profit: mentions profit', ai1.toLowerCase().includes('profit'));
  const ai2 = await aiService.askAI('What about expenses?', ctx);
  assert('AI expense: responds', ai2?.length > 0);
  const ai3 = await aiService.askAI('How is my business?', { sales: 10000, expenses: 15000, profit: -5000 });
  assert('AI loss: responds', ai3?.length > 0);
  const ai4 = await aiService.askAI('Margin?', { sales: 0, expenses: 0, profit: 0 });
  assert('AI zero: responds', ai4?.length > 0);
  const ai5 = await aiService.askAI('Advice?', {});
  assert('AI no ctx: responds', ai5?.length > 0);
  const ai6 = await aiService.askAI('Test', { sales: 'NaN', expenses: Infinity, profit: NaN });
  assert('AI NaN: no crash', ai6?.length > 0);
  assert('AI NaN: no NaN in output', !ai6.includes('NaN') && !ai6.includes('Infinity'));

  // 8. HTTP ENDPOINTS
  section('8. HTTP ENDPOINTS');
  const BASE = 'http://localhost:5000/api/ai';

  try {
    const r = await fetch(`${BASE}/business`); const d = await r.json();
    assert('GET /business: 200', r.status === 200);
    assert('GET /business: has sales', typeof d.data.sales === 'number');
    assert('GET /business: has profit', typeof d.data.profit === 'number');
    assert('GET /business: has profitMargin', typeof d.data.profitMargin === 'number');
  } catch (e) { assert('GET /business', false, e.message); }

  try {
    const r = await fetch(`${BASE}/metrics`); const d = await r.json();
    assert('GET /metrics: 200', r.status === 200);
    assert('GET /metrics: profitMargin', typeof d.data.profitMargin === 'number');
    assert('GET /metrics: expenseRatio', typeof d.data.expenseRatio === 'number');
  } catch (e) { assert('GET /metrics', false, e.message); }

  try {
    const r = await fetch(`${BASE}/business`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name:'HT',sales:75000,expenses:30000,employees:8}) });
    const d = await r.json();
    assert('POST /business: 200', r.status === 200);
    assert('POST /business: profit=45000', d.data.profit === 45000, `got ${d.data.profit}`);
    assert('POST /business: margin=60', d.data.profitMargin === 60, `got ${d.data.profitMargin}`);
  } catch (e) { assert('POST /business', false, e.message); }

  try {
    const r = await fetch(`${BASE}/business`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name:'X'}) });
    assert('POST /business (missing): 400', r.status === 400);
  } catch (e) { assert('POST /business (missing)', false, e.message); }

  try {
    const r = await fetch(`${BASE}/analyze`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({businessContext:{sales:100000,expenses:40000,profit:60000}}) });
    const d = await r.json();
    assert('POST /analyze: 200', r.status === 200);
    assert('POST /analyze: healthScore', typeof d.data.healthScore === 'number');
    assert('POST /analyze: metrics', d.data.metrics?.profitMargin === 60);
  } catch (e) { assert('POST /analyze', false, e.message); }

  try {
    const r = await fetch(`${BASE}/upload`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({csvData:'sales,expenses,employees\n80000,30000,12'}) });
    const d = await r.json();
    assert('POST /upload (fin): 200', r.status === 200);
    assert('POST /upload (fin): type', d.type === 'financial');
    assert('POST /upload (fin): profit=50000', d.data.profit === 50000, `got ${d.data.profit}`);
  } catch (e) { assert('POST /upload (fin)', false, e.message); }

  try {
    const r = await fetch(`${BASE}/upload`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({csvData:''}) });
    assert('POST /upload (empty): 400', r.status === 400);
  } catch (e) { assert('POST /upload (empty)', false, e.message); }

  try {
    const r = await fetch(`${BASE}/ask`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message:'Profit?',businessContext:ctx}) });
    const d = await r.json();
    assert('POST /ask: 200', r.status === 200);
    assert('POST /ask: answer', d.answer?.length > 0);
  } catch (e) { assert('POST /ask', false, e.message); }

  try {
    const r = await fetch(`${BASE}/ask`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) });
    assert('POST /ask (no msg): 400', r.status === 400);
  } catch (e) { assert('POST /ask (no msg)', false, e.message); }

  // 9. FRONTEND DISPLAY
  section('9. FRONTEND FINANCIAL DISPLAY');
  const fs = require('fs');
  const jsx = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'App.jsx'), 'utf8');
  assert('FE: sales display', jsx.includes('Monthly Sales'));
  assert('FE: expenses display', jsx.includes('Monthly Expenses'));
  assert('FE: profit display', jsx.includes('Monthly Profit'));
  assert('FE: profit margin', jsx.includes('Profit Margin'));
  assert('FE: expense ratio', jsx.includes('expenseRatio'));
  assert('FE: margin calc', jsx.includes('profit / sales'));
  assert('FE: expense ratio calc', jsx.includes('expenses / sales'));
  assert('FE: health score', jsx.includes('healthScore'));
  assert('FE: risks display', jsx.includes('risks'));
  assert('FE: recommendations', jsx.includes('recommendations'));
  assert('FE: loading state', jsx.includes('loading'));
  assert('FE: error state', jsx.includes('error'));

  // SUMMARY
  console.log(`\n${'='.repeat(60)}\n  SUMMARY\n${'='.repeat(60)}`);
  console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${passed+failed}`);
  if (failures.length > 0) { console.log('  FAILURES:'); failures.forEach(f => console.log(`    - ${f}`)); }
  console.log(`${'='.repeat(60)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
