/**
 * BizGuard AI — Step 13: End-to-End User Flow Test
 */
const BASE = 'http://localhost:5002/api/ai';
let p=0,f=0;
function ok(n,c,d){if(c){p++;console.log('  PASS:',n)}else{f++;console.log('  FAIL:',n,d?'— '+d:'')}}

async function main(){
  console.log('BizGuard AI — Step 13: End-to-End User Flow\n');

  // 1. Business Setup
  let r=await fetch(BASE+'/business',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'HackathonBiz',category:'Retail',sales:80000,expenses:35000,profit:45000,employees:15})});
  let d=await r.json();
  ok('1. Business Setup', d.success && d.data.profit===45000, `profit=${d.data?.profit}`);
  ok('   Profit Margin correct', Math.abs(d.data.profitMargin - 56.25) < 0.1, `margin=${d.data?.profitMargin}`);
  ok('   Expense Ratio correct', Math.abs(d.data.expenseRatio - 43.75) < 0.1, `ratio=${d.data?.expenseRatio}`);

  // 2. Dashboard Metrics
  r=await fetch(BASE+'/metrics'); d=await r.json();
  ok('2. Dashboard Metrics', d.success && d.data.sales===80000);

  // 3. Business Analysis
  r=await fetch(BASE+'/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessContext:{sales:80000,expenses:35000,profit:45000,employees:15}})});
  d=await r.json();
  ok('3. Analysis', d.success && d.data.healthScore>0);
  ok('   Has healthScore', typeof d.data.healthScore==='number' && d.data.healthScore>0 && d.data.healthScore<=100);
  ok('   Has recommendations', Array.isArray(d.data.recommendations) && d.data.recommendations.length>0);

  // 4. Financial CSV Upload
  r=await fetch(BASE+'/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csvData:'sales,expenses,profit\n100000,40000,60000'})});
  d=await r.json();
  ok('4. Financial CSV', d.success && d.type==='financial');
  ok('   CSV data applied', d.data.sales===100000);

  // 5. Inventory CSV Upload
  r=await fetch(BASE+'/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csvData:'name,quantity,min_stock,price,category\nLaptop,50,10,999.99,Electronics\nMouse,200,50,24.99,Accessories\nKeyboard,5,20,79.99,Accessories'})});
  d=await r.json();
  ok('5. Inventory CSV', d.success && d.type==='inventory' && d.data.length===3);

  // 6. Inventory GET
  r=await fetch(BASE+'/inventory'); d=await r.json();
  ok('6. Inventory GET', d.success && d.data.totalItems===3);
  ok('   Low stock detected', d.data.lowStockCount>=1, `lowStock=${d.data?.lowStockCount}`);

  // 7. Inventory POST (update with 4 items)
  r=await fetch(BASE+'/inventory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({inventory:[
    {name:'Laptop',quantity:45,minStock:10,price:999.99,category:'Electronics'},
    {name:'Mouse',quantity:180,minStock:50,price:24.99,category:'Accessories'},
    {name:'Keyboard',quantity:5,minStock:20,price:79.99,category:'Accessories'},
    {name:'Monitor',quantity:0,minStock:5,price:349.99,category:'Electronics'}
  ]})});
  d=await r.json();
  ok('7. Inventory Update', d.success && d.data.length===4);

  // 8. AI Assistant — valid question
  r=await fetch(BASE+'/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How is my profit margin?',businessContext:{sales:80000,expenses:35000,profit:45000}})});
  d=await r.json();
  ok('8. AI Assistant', d.success && d.answer.length>50);
  ok('   AI uses context', d.answer.includes('profit') || d.answer.includes('margin') || d.answer.includes('%'));

  // 9. AI Assistant — no context (should still work)
  r=await fetch(BASE+'/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'What should I focus on?'})});
  d=await r.json();
  ok('9. AI No Context', d.success && d.answer.length>20);

  // 10. Error handling — missing message
  r=await fetch(BASE+'/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});
  ok('10. Error: missing msg → 400', r.status===400);

  // 11. Error handling — invalid business data
  r=await fetch(BASE+'/business',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'X',sales:'abc',expenses:50})});
  ok('11. Error: NaN sales → 400', r.status===400);

  // 12. Error handling — empty CSV
  r=await fetch(BASE+'/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csvData:''})});
  ok('12. Error: empty CSV → 400', r.status===400);

  // 13. Financial calculations after CSV
  r=await fetch(BASE+'/business',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'CalcTest',category:'Test',sales:50000,expenses:20000,employees:5})});
  d=await r.json();
  ok('13. Calc: profit=30000', d.data.profit===30000, `got ${d.data?.profit}`);
  ok('    Calc: margin=60%', Math.abs(d.data.profitMargin-60)<0.1, `got ${d.data?.profitMargin}`);
  ok('    Calc: ratio=40%', Math.abs(d.data.expenseRatio-40)<0.1, `got ${d.data?.expenseRatio}`);

  // 14. Health endpoint
  r=await fetch('http://localhost:5002/health'); d=await r.json();
  ok('14. Health check', d.status==='ok' && d.database==='connected');

  // 15. Root endpoint
  r=await fetch('http://localhost:5002/'); d=await r.json();
  ok('15. Root endpoint', d.success!==false && typeof d.message==='string');

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  E2E RESULT: Passed=${p} Failed=${f} Total=${p+f}`);
  console.log(`${'='.repeat(50)}`);
  process.exit(f>0?1:0);
}
main().catch(e=>{console.error('FATAL:',e);process.exit(1)});
