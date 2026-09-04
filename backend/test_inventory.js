/**
 * BizGuard AI — Step 8: Inventory Features Test
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let passed = 0, failed = 0;
const failures = [];
function assert(name, cond, detail) {
  if (cond) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n${'='.repeat(60)}\n  ${t}\n${'='.repeat(60)}`); }

const Business = require('./services/businessService');
const analysisService = require('./services/analysisService');
const csvService = require('./services/csvService');
const aiService = require('./services/aiService');
const BASE = 'http://localhost:5000/api/ai';

const ORIG = [
  { name: 'Widget A', quantity: 150, minStock: 20, price: 25.00, category: 'Electronics' },
  { name: 'Widget B', quantity: 8, minStock: 15, price: 45.00, category: 'Electronics' },
  { name: 'Gadget X', quantity: 75, minStock: 10, price: 120.00, category: 'Accessories' },
  { name: 'Gadget Y', quantity: 3, minStock: 10, price: 89.99, category: 'Accessories' },
  { name: 'Part Z', quantity: 200, minStock: 50, price: 8.50, category: 'Components' },
  { name: 'Part W', quantity: 12, minStock: 25, price: 15.00, category: 'Components' },
];

async function restore() {
  await fetch(`${BASE}/inventory`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({inventory:ORIG}) });
}

async function main() {
  console.log('BizGuard AI — Step 8: Inventory Features Test\n');

  try { const r = await fetch(`${BASE}/inventory`); const d = await r.json(); if (!d.success) { console.log('Server not ready'); process.exit(1); } console.log('Server OK —', d.data.totalItems, 'items'); }
  catch(e) { console.log('Server down:', e.message); process.exit(1); }

  // 1. SERVICE DEFAULT DATA
  section('1. INVENTORY SERVICE — DEFAULT DATA');
  Business.setInventory('default', ORIG);
  const def = Business.getOrCreateDefault();
  assert('Default has inventory array', Array.isArray(def.inventory));
  assert('Default has 6 items', def.inventory.length === 6);
  const it = def.inventory[0];
  assert('Item: name is string', typeof it.name === 'string' && it.name.length > 0);
  assert('Item: quantity is number', typeof it.quantity === 'number');
  assert('Item: minStock is number', typeof it.minStock === 'number');
  assert('Item: price is number', typeof it.price === 'number');
  assert('Item: category is string', typeof it.category === 'string');

  // 2. LOW-STOCK DETECTION
  section('2. LOW-STOCK DETECTION');
  const low = Business.getLowStockItems('default');
  assert('Low stock: 3 items', low.length === 3, `got ${low.length}`);
  const ln = low.map(i=>i.name);
  assert('Widget B low (8<15)', ln.includes('Widget B'));
  assert('Gadget Y low (3<10)', ln.includes('Gadget Y'));
  assert('Part W low (12<25)', ln.includes('Part W'));
  assert('Widget A NOT low', !ln.includes('Widget A'));
  assert('Gadget X NOT low', !ln.includes('Gadget X'));
  assert('Part Z NOT low', !ln.includes('Part Z'));

  Business.setInventory('default', [{ name:'Exact', quantity:10, minStock:10, price:5, category:'T' }]);
  assert('At-minStock flagged (10<=10)', Business.getLowStockItems('default').length === 1);

  Business.setInventory('default', [{ name:'Zero', quantity:0, minStock:10, price:5, category:'T' }]);
  assert('Zero qty flagged', Business.getLowStockItems('default').length === 1);

  Business.setInventory('default', []);
  assert('Empty: no low stock', Business.getLowStockItems('default').length === 0);
  assert('Empty: returns []', Business.getInventory('default').length === 0);
  Business.setInventory('default', ORIG);

  // 3. HTTP CRUD
  section('3. INVENTORY CRUD — HTTP');
  try {
    const r = await fetch(`${BASE}/inventory`); const d = await r.json();
    assert('GET: 200', r.status === 200);
    assert('GET: success', d.success === true);
    assert('GET: inventory array', Array.isArray(d.data.inventory));
    assert('GET: lowStockItems', Array.isArray(d.data.lowStockItems));
    assert('GET: totalItems', typeof d.data.totalItems === 'number');
    assert('GET: lowStockCount', typeof d.data.lowStockCount === 'number');
    assert('GET: totalItems matches', d.data.totalItems === d.data.inventory.length);
    assert('GET: lowStockCount matches', d.data.lowStockCount === d.data.lowStockItems.length);
  } catch(e) { assert('GET /inventory', false, e.message); }

  // CREATE
  try {
    const items = [
      { name:'InvA', quantity:100, minStock:20, price:25.50, category:'Test' },
      { name:'InvB', quantity:5, minStock:10, price:45.00, category:'Test' },
      { name:'InvC', quantity:0, minStock:5, price:10.00, category:'Empty' },
    ];
    const r = await fetch(`${BASE}/inventory`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({inventory:items}) });
    const d = await r.json();
    assert('CREATE: 200', r.status === 200);
    assert('CREATE: success', d.success === true);
    assert('CREATE: 3 items', d.data.length === 3);
    assert('CREATE: name ok', d.data[0].name === 'InvA');
    assert('CREATE: qty ok', d.data[0].quantity === 100);
    assert('CREATE: price ok', d.data[0].price === 25.50);
  } catch(e) { assert('CREATE', false, e.message); }

  // Verify via GET
  try {
    const r = await fetch(`${BASE}/inventory`); const d = await r.json();
    assert('GET after CREATE: 3 items', d.data.totalItems === 3);
    assert('GET after CREATE: 2 low', d.data.lowStockCount === 2);
  } catch(e) { assert('GET after CREATE', false, e.message); }

  // UPDATE (replace)
  try {
    const upd = [ { name:'InvA', quantity:200, minStock:30, price:30, category:'Upd' }, { name:'InvD', quantity:50, minStock:10, price:15, category:'New' } ];
    const r = await fetch(`${BASE}/inventory`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({inventory:upd}) });
    const d = await r.json();
    assert('UPDATE: 200', r.status === 200);
    assert('UPDATE: 2 items', d.data.length === 2);
    assert('UPDATE: qty changed', d.data[0].quantity === 200);
    assert('UPDATE: old removed', !d.data.some(i=>i.name==='InvB'));
    assert('UPDATE: new added', d.data.some(i=>i.name==='InvD'));
  } catch(e) { assert('UPDATE', false, e.message); }

  // DELETE ALL
  try {
    const r = await fetch(`${BASE}/inventory`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({inventory:[]}) });
    const d = await r.json();
    assert('DELETE ALL: 200', r.status === 200);
    assert('DELETE ALL: 0 items', d.data.length === 0);
  } catch(e) { assert('DELETE ALL', false, e.message); }

  try {
    const r = await fetch(`${BASE}/inventory`); const d = await r.json();
    assert('GET after DELETE: 0 items', d.data.totalItems === 0);
    assert('GET after DELETE: 0 low', d.data.lowStockCount === 0);
  } catch(e) { assert('GET after DELETE', false, e.message); }

  // Validation
  try { const r = await fetch(`${BASE}/inventory`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({}) }); assert('No field: 400', r.status===400); } catch(e) { assert('No field', false, e.message); }
  try { const r = await fetch(`${BASE}/inventory`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({inventory:'bad'}) }); assert('Non-array: 400', r.status===400); } catch(e) { assert('Non-array', false, e.message); }
  try { const r = await fetch(`${BASE}/inventory`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({inventory:[null,'x']}) }); assert('Bad items: 400', r.status===400); } catch(e) { assert('Bad items', false, e.message); }

  await restore();

  // 4. CSV IMPORT — VALID
  section('4. INVENTORY CSV — VALID');
  const c1 = csvService.processCSV('name,quantity,min_stock,price,category\nWA,150,20,25,Electronics\nWB,8,15,45,Electronics');
  assert('CSV: success', c1.success && c1.type === 'inventory');
  assert('CSV: 2 items', c1.inventoryData.length === 2);
  assert('CSV: name', c1.inventoryData[0].name === 'WA');
  assert('CSV: qty', c1.inventoryData[0].quantity === 150);
  assert('CSV: minStock', c1.inventoryData[0].minStock === 20);
  assert('CSV: price', c1.inventoryData[0].price === 25);
  assert('CSV: category', c1.inventoryData[0].category === 'Electronics');

  const c2 = csvService.processCSV('product,stock,reorder_level,unit_price,type\nI1,100,20,15.5,CatA');
  assert('Alias: name', c2.inventoryData[0].name === 'I1');
  assert('Alias: qty', c2.inventoryData[0].quantity === 100);
  assert('Alias: minStock', c2.inventoryData[0].minStock === 20);
  assert('Alias: price', c2.inventoryData[0].price === 15.5);

  const c3 = csvService.processCSV('name,quantity,minStock,price,category\nI1,50,10,29.99,T');
  assert('camelCase: ok', c3.success && c3.inventoryData[0].minStock === 10);

  const c4 = csvService.processCSV('name,quantity,min_stock,price,category\n"Widget, Large",50,10,29.99,"Parts & Tools"');
  assert('Quoted: comma name', c4.inventoryData[0].name === 'Widget, Large');
  assert('Quoted: special cat', c4.inventoryData[0].category === 'Parts & Tools');

  try {
    const r = await fetch(`${BASE}/upload`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({csvData:'name,quantity,min_stock,price,category\nTI,5,10,29.99,T'}) });
    const d = await r.json();
    assert('HTTP upload: 200', r.status === 200);
    assert('HTTP upload: type=inventory', d.type === 'inventory');
    assert('HTTP upload: 1 item', d.data.length === 1);
  } catch(e) { assert('HTTP upload', false, e.message); }
  await restore();

  // 5. CSV IMPORT — INVALID
  section('5. INVENTORY CSV — INVALID');
  assert('Empty: fails', csvService.processCSV('').success === false);
  assert('Header-only: fails', csvService.processCSV('name,quantity,min_stock,price,category').success === false);
  try { assert('Null: fails', csvService.processCSV(null).success === false); } catch { assert('Null: throws', true); }

  const bad = csvService.processCSV('name,quantity,min_stock,price,category\nI1,abc,10,29.99,T');
  assert('Bad num: warning', bad.validation.warnings.some(w=>w.includes('Invalid')));
  assert('Bad num: qty=0', bad.inventoryData[0].quantity === 0);

  const noNm = csvService.processCSV('name,quantity,min_stock,price,category\n,50,10,29.99,T');
  assert('No name: skipped/warned', noNm.success === false || (noNm.inventoryData && noNm.inventoryData.length === 0) || noNm.validation.warnings.length > 0);

  const allNoNm = csvService.processCSV('name,quantity,min_stock,price,category\n,50,10,29.99,T\n,20,5,10,O');
  assert('All no-name: fails', allNoNm.success === false);

  const dup = csvService.processCSV('name,quantity,min_stock,price,category\nI1,50,10,29.99,T\nI1,20,5,10,T');
  assert('Duplicates: allowed', dup.success && dup.inventoryData.length === 2);

  try { const r = await fetch(`${BASE}/upload`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({csvData:''}) }); assert('HTTP empty: 400', r.status===400); } catch(e) { assert('HTTP empty', false, e.message); }
  try { const r = await fetch(`${BASE}/upload`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({csvData:'name,quantity,min_stock,price,category'}) }); assert('HTTP header-only: 400', r.status===400); } catch(e) { assert('HTTP header-only', false, e.message); }
  try { const r = await fetch(`${BASE}/upload`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({}) }); assert('HTTP missing: 400', r.status===400); } catch(e) { assert('HTTP missing', false, e.message); }

  // 6. CALCULATIONS
  section('6. INVENTORY CALCULATIONS');
  const inv = [
    { name:'A', quantity:100, minStock:20, price:25, category:'X' },
    { name:'B', quantity:50, minStock:10, price:40, category:'Y' },
    { name:'C', quantity:0, minStock:5, price:10, category:'Z' },
  ];
  const an = analysisService.analyzeInventory(inv);
  assert('totalItems=150', an.totalItems === 150, `got ${an.totalItems}`);
  assert('totalValue=4500', an.totalValue === 4500, `got ${an.totalValue}`);
  assert('lowStock=1 (only C)', an.lowStockItems.length === 1, `got ${an.lowStockItems.length}`);
  assert('alerts=1 (only C out-of-stock)', an.alerts.length === 1, `got ${an.alerts.length}`);
  assert('Critical: out-of-stock', an.alerts.some(a=>a.severity==='critical'));
  assert('No high alert (B not low)', !an.alerts.some(a=>a.severity==='high'));

  assert('Empty: totalItems=0', analysisService.analyzeInventory([]).totalItems === 0);
  assert('Empty: totalValue=0', analysisService.analyzeInventory([]).totalValue === 0);
  assert('Null: defaults', analysisService.analyzeInventory(null).totalItems === 0);

  const dec = analysisService.analyzeInventory([{ name:'D', quantity:3, minStock:5, price:19.99, category:'T' }]);
  assert('Decimal: 59.97', dec.totalValue === 59.97, `got ${dec.totalValue}`);

  // 7. AI + INVENTORY
  section('7. AI ANALYSIS WITH INVENTORY');
  const full = { sales:50000, expenses:20000, profit:30000, inventory:ORIG };
  const fa = analysisService.analyzeBusiness(full);
  assert('Full: has inventory', fa.inventory !== null);
  assert('Full: 6 items', fa.inventory.items.length === 6);
  assert('Full: 3 low stock', fa.inventory.lowStockItems.length === 3);
  assert('Full: totalValue>0', fa.inventory.totalValue > 0);
  assert('Full: 3 alerts', fa.inventory.alerts.length === 3);
  assert('Full: stock risk', fa.risks.some(r=>/stock/i.test(r.title)));
  assert('Full: restock rec', fa.recommendations.some(r=>/restock|inventory/i.test(r.title)));

  const ai = await aiService.askAI('What about my inventory?', full);
  assert('AI inv query: responds', typeof ai === 'string' && ai.length > 0);

  const noInv = analysisService.analyzeBusiness({ sales:50000, expenses:20000, profit:30000 });
  assert('No inv: null', noInv.inventory === null);

  try {
    const r = await fetch(`${BASE}/analyze`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({businessContext:full}) });
    const d = await r.json();
    assert('POST /analyze (inv): 200', r.status === 200);
    assert('POST /analyze (inv): has inventory', d.data.inventory !== null);
  } catch(e) { assert('POST /analyze (inv)', false, e.message); }

  // 8. FRONTEND DISPLAY
  section('8. FRONTEND INVENTORY DISPLAY');
  const jsx = fs.readFileSync(path.join(__dirname,'..','frontend','src','App.jsx'), 'utf8');
  assert('Dashboard: inventory section', jsx.includes('Inventory Monitor'));
  assert('Dashboard: low stock', jsx.includes('Low Stock'));
  assert('Dashboard: out of stock', jsx.includes('Out of Stock'));
  assert('Dashboard: table', jsx.includes('inventory-table'));
  assert('Dashboard: quantity', jsx.includes('item.quantity'));
  assert('Dashboard: minStock', jsx.includes('item.minStock'));
  assert('Dashboard: price', jsx.includes('item.price'));
  assert('Dashboard: stock status', jsx.includes('stock-status'));
  assert('Dashboard: totalValue', jsx.includes('totalValue'));
  assert('Dashboard: totalItems', jsx.includes('totalItems'));
  assert('InvMgmt: screen', jsx.includes('InventoryManagementScreen'));
  assert('InvMgmt: add', jsx.includes('Add Item'));
  assert('InvMgmt: edit', jsx.includes('Edit'));
  assert('InvMgmt: delete', jsx.includes('Delete'));
  assert('InvMgmt: modal', jsx.includes('inventory-modal'));
  assert('InvMgmt: empty state', jsx.includes('No Inventory Items'));
  assert('InvMgmt: loading', jsx.includes('Loading inventory'));
  assert('InvMgmt: error', jsx.includes('setError'));
  assert('CSV: inv sample', jsx.includes('sampleInventoryCSV'));
  assert('CSV: inv template btn', jsx.includes('Inventory Data Sample'));

  // 9. EXISTING FEATURES
  section('9. EXISTING FEATURES NOT BROKEN');
  try { const r=await fetch(`${BASE}/business`); const d=await r.json(); assert('GET /business: ok', r.status===200 && d.success && typeof d.data.sales==='number'); } catch(e) { assert('GET /business', false, e.message); }
  try { const r=await fetch(`${BASE}/metrics`); const d=await r.json(); assert('GET /metrics: ok', r.status===200 && d.success); } catch(e) { assert('GET /metrics', false, e.message); }
  try {
    const r=await fetch(`${BASE}/upload`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csvData:'sales,expenses,employees\n80000,30000,12'})});
    const d=await r.json(); assert('Fin CSV: ok', r.status===200 && d.type==='financial');
  } catch(e) { assert('Fin CSV', false, e.message); }
  try {
    const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How?',businessContext:{sales:50000,expenses:20000,profit:30000}})});
    const d=await r.json(); assert('AI chat: ok', r.status===200 && d.success);
  } catch(e) { assert('AI chat', false, e.message); }

  await restore();

  // SUMMARY
  console.log(`\n${'='.repeat(60)}\n  SUMMARY\n${'='.repeat(60)}`);
  console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${passed+failed}`);
  if (failures.length > 0) { console.log('  FAILURES:'); failures.forEach(f=>console.log(`    - ${f}`)); }
  console.log(`${'='.repeat(60)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
