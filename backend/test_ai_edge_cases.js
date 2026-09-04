/**
 * BizGuard AI — Step 9: AI Assistant Edge Cases & Error Handling
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

const { askAI, analyzeBusinessMetrics, detectIssues } = require('./services/aiService');
const PORT = process.env.PORT || 5001;
const BASE = `http://localhost:${PORT}/api/ai`;

async function main() {
  console.log('BizGuard AI — Step 9: AI Assistant Edge Cases & Error Handling\n');

  try { const r = await fetch(`http://localhost:${PORT}/health`); const d = await r.json(); console.log('Server OK —', d.status, '| DB:', d.database); }
  catch(e) { console.log('Server down:', e.message); process.exit(1); }

  const goodCtx = { name: 'TestBiz', category: 'Retail', sales: 50000, expenses: 20000, profit: 30000, employees: 10 };

  // 1. NORMAL AI QUESTIONS
  section('1. NORMAL AI QUESTIONS — VALID DATA');
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How is my business?',businessContext:goodCtx})}); const d=await r.json();
    assert('General: 200', r.status===200); assert('General: success', d.success===true);
    assert('General: has answer', typeof d.answer==='string' && d.answer.length>0);
    assert('General: mentions sales', /50,000|sales/i.test(d.answer));
  } catch(e) { assert('General question', false, e.message); }

  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'What about my expenses?',businessContext:goodCtx})}); const d=await r.json();
    assert('Expense: 200', r.status===200); assert('Expense: mentions', /expense|cost/i.test(d.answer));
  } catch(e) { assert('Expense question', false, e.message); }

  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How can I improve profit?',businessContext:goodCtx})}); const d=await r.json();
    assert('Profit: 200', r.status===200); assert('Profit: recommendations', /recommend|suggest|should/i.test(d.answer));
  } catch(e) { assert('Profit question', false, e.message); }

  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Tell me about revenue',businessContext:goodCtx})}); const d=await r.json();
    assert('Revenue: 200', r.status===200); assert('Revenue: mentions', /sales|revenue/i.test(d.answer));
  } catch(e) { assert('Revenue question', false, e.message); }

  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How to grow?',businessContext:goodCtx})}); const d=await r.json();
    assert('Growth: 200', r.status===200); assert('Growth: advice', /grow|growth|expand/i.test(d.answer));
  } catch(e) { assert('Growth question', false, e.message); }

  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'What are the risks?',businessContext:goodCtx})}); const d=await r.json();
    assert('Risk: 200', r.status===200); assert('Risk: mentions', /risk/i.test(d.answer));
  } catch(e) { assert('Risk question', false, e.message); }

  // 2. INCOMPLETE / MISSING BUSINESS DATA
  section('2. INCOMPLETE / MISSING BUSINESS DATA');
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How is my business?'})}); const d=await r.json();
    assert('No ctx: 200', r.status===200); assert('No ctx: answer', typeof d.answer==='string' && d.answer.length>0);
    assert('No ctx: no NaN', !/NaN/.test(d.answer)); assert('No ctx: no Infinity', !/Infinity/.test(d.answer));
  } catch(e) { assert('No context', false, e.message); }

  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How?',businessContext:{}})}); const d=await r.json();
    assert('Empty ctx: 200', r.status===200); assert('Empty ctx: no NaN', !/NaN/.test(d.answer));
  } catch(e) { assert('Empty ctx', false, e.message); }

  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How?',businessContext:{sales:10000}})}); const d=await r.json();
    assert('Partial ctx: 200', r.status===200); assert('Partial ctx: no NaN', !/NaN/.test(d.answer));
  } catch(e) { assert('Partial ctx', false, e.message); }

  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How?',businessContext:{sales:null,expenses:null,profit:null}})}); const d=await r.json();
    assert('Null vals: 200', r.status===200); assert('Null vals: no NaN', !/NaN/.test(d.answer));
  } catch(e) { assert('Null vals', false, e.message); }

  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How?',businessContext:{sales:NaN,expenses:Infinity,profit:-Infinity}})}); const d=await r.json();
    assert('NaN/Inf: 200', r.status===200); assert('NaN/Inf: no NaN', !/NaN/.test(d.answer)); assert('NaN/Inf: no Infinity', !/Infinity/.test(d.answer));
  } catch(e) { assert('NaN/Inf', false, e.message); }

  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How?',businessContext:{sales:'50000',expenses:'20000',profit:'30000'}})}); const d=await r.json();
    assert('String nums: 200', r.status===200); assert('String nums: parsed', /50,000|50000/.test(d.answer));
  } catch(e) { assert('String nums', false, e.message); }

  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How?',businessContext:{sales:10000,expenses:15000,profit:-5000}})}); const d=await r.json();
    assert('Loss: 200', r.status===200); assert('Loss: warns', /loss|negative|exceed|unsustainable/i.test(d.answer));
  } catch(e) { assert('Loss', false, e.message); }

  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Margin?',businessContext:{sales:0,expenses:5000,profit:-5000}})}); const d=await r.json();
    assert('Zero sales: 200', r.status===200); assert('Zero sales: mentions', /no sales|zero|N\/A/i.test(d.answer));
  } catch(e) { assert('Zero sales', false, e.message); }

  // 3. EMPTY / SHORT / IRRELEVANT
  section('3. EMPTY / SHORT / IRRELEVANT MESSAGES');
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:''})}); assert('Empty: 400', r.status===400); const d=await r.json(); assert('Empty: code', d.error==='EMPTY_MESSAGE'||d.error==='MISSING_MESSAGE'); } catch(e) { assert('Empty msg', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'   '})}); assert('Whitespace: 400', r.status===400); } catch(e) { assert('Whitespace', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'hi',businessContext:goodCtx})}); const d=await r.json(); assert('Short(2ch): 200', r.status===200); assert('Short: answer', d.answer.length>0); } catch(e) { assert('Short', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'a'.repeat(5001)})}); assert('TooLong: 400', r.status===400); const d=await r.json(); assert('TooLong: code', d.error==='MESSAGE_TOO_LONG'); } catch(e) { assert('TooLong', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'a'.repeat(5000),businessContext:goodCtx})}); assert('Exact5000: 200', r.status===200); } catch(e) { assert('Exact5000', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'What is the meaning of life?',businessContext:goodCtx})}); const d=await r.json(); assert('Irrelevant: 200', r.status===200); assert('Irrelevant: responds', d.answer.length>0); } catch(e) { assert('Irrelevant', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Write me a poem',businessContext:goodCtx})}); const d=await r.json(); assert('NonBiz: 200', r.status===200); assert('NonBiz: responds', d.answer.length>0); } catch(e) { assert('NonBiz', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'📊 Sales? 🚀',businessContext:goodCtx})}); const d=await r.json(); assert('Unicode: 200', r.status===200); assert('Unicode: responds', d.answer.length>0); } catch(e) { assert('Unicode', false, e.message); }

  // 4. INVALID REQUEST FORMATS
  section('4. INVALID REQUEST FORMATS');
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessContext:goodCtx})}); assert('Missing msg: 400', r.status===400); const d=await r.json(); assert('Missing msg: code', d.error==='MISSING_MESSAGE'); } catch(e) { assert('Missing msg', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:12345})}); assert('Num msg: 400', r.status===400); const d=await r.json(); assert('Num msg: code', d.error==='INVALID_MESSAGE_TYPE'); } catch(e) { assert('Num msg', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:['hi']})}); assert('Arr msg: 400', r.status===400); } catch(e) { assert('Arr msg', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:{text:'hi'}})}); assert('Obj msg: 400', r.status===400); } catch(e) { assert('Obj msg', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Hi',businessContext:'str'})}); const d=await r.json(); assert('Str ctx: 200', r.status===200); assert('Str ctx: responds', d.answer.length>0); } catch(e) { assert('Str ctx', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Hi',businessContext:[1,2]})}); const d=await r.json(); assert('Arr ctx: 200', r.status===200); } catch(e) { assert('Arr ctx', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(null)}); assert('Null body: 400', r.status===400); } catch(e) { assert('Null body', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})}); assert('Empty body: 400', r.status===400); } catch(e) { assert('Empty body', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`); assert('GET /ask: 404', r.status===404); } catch(e) { assert('GET /ask', false, e.message); }

  // 5. AI SERVICE DIRECT
  section('5. AI SERVICE — DIRECT FUNCTION TESTS');
  try { const ans=await askAI('How?',goodCtx); assert('askAI valid: string', typeof ans==='string'&&ans.length>0); assert('askAI valid: no NaN', !/NaN/.test(ans)); assert('askAI valid: no Inf', !/Infinity/.test(ans)); } catch(e) { assert('askAI valid', false, e.message); }
  try { const ans=await askAI('How?',{}); assert('askAI empty ctx: ok', typeof ans==='string'&&ans.length>0); assert('askAI empty ctx: no NaN', !/NaN/.test(ans)); } catch(e) { assert('askAI empty ctx', false, e.message); }
  try { const ans=await askAI('How?'); assert('askAI no ctx: ok', typeof ans==='string'&&ans.length>0); } catch(e) { assert('askAI no ctx', false, e.message); }
  try { const ans=await askAI('How?',null); assert('askAI null ctx: ok', typeof ans==='string'&&ans.length>0); } catch(e) { assert('askAI null ctx', false, e.message); }
  try { await askAI('',goodCtx); assert('askAI empty msg: throws', false); } catch(e) { assert('askAI empty msg: throws', true); }
  try { await askAI(null,goodCtx); assert('askAI null msg: throws', false); } catch(e) { assert('askAI null msg: throws', true); }
  try { await askAI(123,goodCtx); assert('askAI num msg: throws', false); } catch(e) { assert('askAI num msg: throws', true); }

  const m1=analyzeBusinessMetrics({sales:0,expenses:0,profit:0}); assert('Metrics zero: no NaN', !isNaN(m1.profitMargin)&&!isNaN(m1.expenseRatio)); assert('Metrics zero: health=0', m1.healthScore===0); assert('Metrics zero: isZeroSales', m1.isZeroSales===true);
  const m2=analyzeBusinessMetrics({sales:NaN,expenses:Infinity,profit:-Infinity}); assert('Metrics NaN: finite', Number.isFinite(m2.profitMargin)||m2.profitMargin===0);
  const m3=analyzeBusinessMetrics({sales:100000,expenses:10,profit:99990}); assert('Metrics healthy: high margin', m3.profitMargin>90); assert('Metrics healthy: not loss', m3.isLossMaking===false);

  const iss1=detectIssues({sales:10000,expenses:15000,profit:-5000},analyzeBusinessMetrics({sales:10000,expenses:15000,profit:-5000})); assert('Issues loss: detects', iss1.some(i=>/loss/i.test(i)));
  const iss2=detectIssues({sales:0,expenses:5000,profit:-5000},analyzeBusinessMetrics({sales:0,expenses:5000,profit:-5000})); assert('Issues zero: detects', iss2.some(i=>/no sales/i.test(i)));
  const iss3=detectIssues(goodCtx,analyzeBusinessMetrics(goodCtx)); assert('Issues healthy: none', iss3.length===0);

  // 6. ANALYZE ENDPOINT
  section('6. ANALYZE ENDPOINT — EDGE CASES');
  try { const r=await fetch(`${BASE}/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessContext:goodCtx})}); const d=await r.json();
    assert('Analyze valid: 200', r.status===200); assert('Analyze: healthScore', typeof d.data.healthScore==='number'); assert('Analyze: risks', Array.isArray(d.data.risks)); assert('Analyze: recs', Array.isArray(d.data.recommendations));
  } catch(e) { assert('Analyze valid', false, e.message); }
  try { const r=await fetch(`${BASE}/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})}); assert('Analyze no ctx: 400', r.status===400); } catch(e) { assert('Analyze no ctx', false, e.message); }
  try { const r=await fetch(`${BASE}/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessContext:[1,2]})}); assert('Analyze arr: 400', r.status===400); } catch(e) { assert('Analyze arr', false, e.message); }
  try { const r=await fetch(`${BASE}/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessContext:'bad'})}); assert('Analyze str: 400', r.status===400); } catch(e) { assert('Analyze str', false, e.message); }
  try { const r=await fetch(`${BASE}/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessContext:{sales:'NaN',expenses:NaN,profit:Infinity}})}); const d=await r.json();
    assert('Analyze NaN: 200', r.status===200); assert('Analyze NaN: healthScore ok', typeof d.data.healthScore==='number'&&!isNaN(d.data.healthScore));
  } catch(e) { assert('Analyze NaN', false, e.message); }

  // 7. ERROR MESSAGES
  section('7. ERROR MESSAGES & USER-FRIENDLINESS');
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:''})}); const d=await r.json();
    assert('Error: no stack', !d.stack); assert('Error: has message', typeof d.message==='string'); assert('Error: friendly', d.message.length>0&&d.message.length<200);
  } catch(e) { assert('Error format', false, e.message); }
  try { const r=await fetch(`${BASE}/business`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'',sales:'abc',expenses:'def'})}); const d=await r.json();
    assert('Bad biz: 400', r.status===400); assert('Bad biz: no internals', !JSON.stringify(d).includes('stack'));
  } catch(e) { assert('Bad biz', false, e.message); }

  // 8. FRONTEND LOADING & ERROR
  section('8. FRONTEND — LOADING & ERROR STATES');
  const jsx=fs.readFileSync(path.join(__dirname,'..','frontend','src','App.jsx'),'utf8');
  assert('FE: assistantLoading', jsx.includes('assistantLoading'));
  assert('FE: prevents duplicate', jsx.includes('if (assistantLoading) return'));
  assert('FE: setLoading true', jsx.includes('setAssistantLoading(true)'));
  assert('FE: setLoading false', jsx.includes('setAssistantLoading(false)'));
  assert('FE: error state', jsx.includes('setError'));
  assert('FE: catch block', jsx.includes('Error asking assistant'));
  assert('FE: network error', jsx.includes('Cannot connect'));
  assert('FE: MISSING_MESSAGE', jsx.includes('MISSING_MESSAGE'));
  assert('FE: EMPTY_MESSAGE', jsx.includes('EMPTY_MESSAGE'));
  assert('FE: MESSAGE_TOO_LONG', jsx.includes('MESSAGE_TOO_LONG'));
  assert('FE: AI_SERVICE_UNAVAILABLE', jsx.includes('AI_SERVICE_UNAVAILABLE'));
  assert('FE: AI_PROCESSING_ERROR', jsx.includes('AI_PROCESSING_ERROR'));
  assert('FE: default fallback', jsx.includes('could not answer'));
  assert('FE: empty input check', jsx.includes('assistantInput.trim()'));
  assert('FE: max length', jsx.includes('MAX_MESSAGE_LENGTH'));
  assert('FE: empty warning', jsx.includes('Please enter a message'));
  assert('FE: too-long warning', jsx.includes('too long'));
  assert('FE: no-context note', jsx.includes('No business data'));

  // 9. NO SECRET EXPOSURE
  section('9. NO API KEY / ENV EXPOSURE');
  assert('FE: no QWEN_API_KEY', !jsx.includes('QWEN_API_KEY'));
  assert('FE: no ALIBABA_API_KEY', !jsx.includes('ALIBABA_API_KEY'));
  assert('FE: no DB_PASSWORD', !jsx.includes('DB_PASSWORD'));
  assert('FE: no DB_HOST', !jsx.includes('DB_HOST'));
  assert('FE: no process.env', !jsx.includes('process.env'));
  const distDir=path.join(__dirname,'..','frontend','dist','assets');
  if (fs.existsSync(distDir)) {
    const jsFiles=fs.readdirSync(distDir).filter(f=>f.endsWith('.js'));
    let found=false; for (const f of jsFiles) { const c=fs.readFileSync(path.join(distDir,f),'utf8'); if (/QWEN_API_KEY|ALIBABA_API_KEY|DB_PASSWORD|DB_HOST|3307/i.test(c)) { found=true; break; } }
    assert('FE dist: no secrets', !found);
  } else { assert('FE dist: no secrets (no dist)', true); }
  const feEnv=fs.readFileSync(path.join(__dirname,'..','frontend','.env.example'),'utf8');
  assert('FE .env.example: no DB', !feEnv.includes('DB_PASSWORD')&&!feEnv.includes('DB_HOST'));
  assert('FE .env.example: no API key', !feEnv.includes('QWEN_API_KEY'));
  const gi=fs.readFileSync(path.join(__dirname,'..','.gitignore'),'utf8');
  assert('.gitignore: .env', gi.includes('.env'));

  // 10. AI CONTEXT CORRECTNESS
  section('10. AI USES CORRECT BUSINESS CONTEXT');
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Sales?',businessContext:{name:'Big',sales:500000,expenses:100000,profit:400000}})}); const d=await r.json();
    assert('High-rev: mentions 500,000', /500,000/.test(d.answer));
  } catch(e) { assert('High-rev', false, e.message); }
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How?',businessContext:{name:'Losing',sales:5000,expenses:10000,profit:-5000}})}); const d=await r.json();
    assert('Loss: warns', /loss|exceed|unsustainable|negative/i.test(d.answer));
  } catch(e) { assert('Loss', false, e.message); }
  try { const r1=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How?',businessContext:{sales:100000,expenses:10000,profit:90000}})}); const d1=await r1.json();
    const r2=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'How?',businessContext:{sales:1000,expenses:50000,profit:-49000}})}); const d2=await r2.json();
    assert('Diff ctx: diff responses', d1.answer!==d2.answer);
  } catch(e) { assert('Diff ctx', false, e.message); }

  // 11. REGRESSION
  section('11. REGRESSION — FINANCIAL & INVENTORY');
  try { const r=await fetch(`${BASE}/business`); const d=await r.json(); assert('GET /business: ok', r.status===200&&d.success&&typeof d.data.sales==='number'); } catch(e) { assert('GET /business', false, e.message); }
  try { const r=await fetch(`${BASE}/metrics`); const d=await r.json(); assert('GET /metrics: ok', r.status===200&&d.success); } catch(e) { assert('GET /metrics', false, e.message); }
  try { const r=await fetch(`${BASE}/inventory`); const d=await r.json(); assert('GET /inventory: ok', r.status===200&&d.success&&typeof d.data.totalItems==='number'); } catch(e) { assert('GET /inventory', false, e.message); }
  try { const r=await fetch(`${BASE}/upload`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csvData:'sales,expenses,employees\n80000,30000,12'})}); const d=await r.json(); assert('Fin CSV: ok', r.status===200&&d.type==='financial'); } catch(e) { assert('Fin CSV', false, e.message); }
  try { const r=await fetch(`${BASE}/upload`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csvData:'name,quantity,min_stock,price,category\nT,50,10,29.99,T'})}); const d=await r.json(); assert('Inv CSV: ok', r.status===200&&d.type==='inventory'); } catch(e) { assert('Inv CSV', false, e.message); }
  try { const r=await fetch(`${BASE}/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessContext:{sales:50000,expenses:20000,profit:30000}})}); const d=await r.json(); assert('Analyze: ok', r.status===200&&d.success&&typeof d.data.healthScore==='number'); } catch(e) { assert('Analyze', false, e.message); }
  try { const r=await fetch(`http://localhost:${PORT}/health`); const d=await r.json(); assert('Health: ok', d.status==='ok'); assert('Health: timestamp', typeof d.timestamp==='string'); assert('Health: database', typeof d.database==='string'); } catch(e) { assert('Health', false, e.message); }

  // 12. GLOBAL ERROR HANDLER
  section('12. GLOBAL ERROR HANDLER');
  try { const r=await fetch(`${BASE}/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad json}'}); assert('Bad JSON: 400', r.status===400); const d=await r.json(); assert('Bad JSON: no stack', !d.stack); assert('Bad JSON: safe msg', typeof d.message==='string'); } catch(e) { assert('Bad JSON', false, e.message); }
  try { const r=await fetch(`${BASE}/nonexistent`); assert('404: 404', r.status===404); } catch(e) { assert('404', false, e.message); }

  // SUMMARY
  console.log(`\n${'='.repeat(60)}\n  SUMMARY\n${'='.repeat(60)}`);
  console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${passed+failed}`);
  if (failures.length>0) { console.log('  FAILURES:'); failures.forEach(f=>console.log(`    - ${f}`)); }
  console.log(`${'='.repeat(60)}\n`);
  process.exit(failed>0?1:0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
