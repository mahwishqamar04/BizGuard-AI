/**
 * BizGuard AI — Step 11: Responsive & Mobile UI Audit
 */
const path = require('path');
const fs = require('fs');

let passed = 0, failed = 0;
const failures = [];
function assert(name, cond, detail) {
  if (cond) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n${'='.repeat(60)}\n  ${t}\n${'='.repeat(60)}`); }

const css = fs.readFileSync(path.join(__dirname,'..','frontend','src','App.css'), 'utf8');
const idxCss = fs.readFileSync(path.join(__dirname,'..','frontend','src','index.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname,'..','frontend','index.html'), 'utf8');
const jsx = fs.readFileSync(path.join(__dirname,'..','frontend','src','App.jsx'), 'utf8');

function main() {
  console.log('BizGuard AI — Step 11: Responsive & Mobile UI Audit\n');

  // 1. VIEWPORT
  section('1. VIEWPORT META TAG');
  assert('Has viewport meta', html.includes('name="viewport"'));
  assert('width=device-width', html.includes('width=device-width'));
  assert('initial-scale=1', html.includes('initial-scale=1'));

  // 2. GLOBAL
  section('2. GLOBAL BOX-SIZING & OVERFLOW');
  assert('box-sizing border-box', css.includes('box-sizing: border-box'));
  assert('body overflow-x hidden', /body\s*\{[^}]*overflow-x:\s*hidden/.test(css));
  assert('app overflow-x hidden', /\.app\s*\{[^}]*overflow-x:\s*hidden/.test(css));
  assert('width 100%', /html,\s*body\s*\{[^}]*width:\s*100%/.test(css));

  // 3. BREAKPOINTS
  section('3. RESPONSIVE BREAKPOINTS');
  assert('1024px', css.includes('max-width: 1024px'));
  assert('768px', css.includes('max-width: 768px'));
  assert('480px', css.includes('max-width: 480px'));
  assert('360px', css.includes('max-width: 360px'));

  // 4. NAV
  section('4. NAVIGATION RESPONSIVE');
  assert('nav-btn min-height 44px', /nav-btn[\s\S]*?min-height:\s*44px/.test(css));
  assert('nav flex-wrap at 768', /768[\s\S]*?nav-buttons[\s\S]*?flex-wrap/.test(css));
  assert('nav 50% at 480', /480[\s\S]*?nav-btn[\s\S]*?50%/.test(css));
  assert('nav 100% at 360', /360[\s\S]*?nav-btn[\s\S]*?100%/.test(css));

  // 5. DASHBOARD
  section('5. DASHBOARD RESPONSIVE');
  assert('metrics auto-fit', /metrics-grid[\s\S]*?auto-fit/.test(css));
  assert('metrics 2col@768', /768[\s\S]*?metrics-grid[\s\S]*?1fr 1fr/.test(css));
  assert('metrics 1col@480', /480[\s\S]*?metrics-grid[\s\S]*?grid-template-columns:\s*1fr/.test(css));
  assert('biz header stacks@768', /768[\s\S]*?business-header[\s\S]*?flex-direction:\s*column/.test(css));
  assert('health responsive', /480[\s\S]*?health-badge[\s\S]*?font-size/.test(css));

  // 6. WORKFLOW
  section('6. WORKFLOW RESPONSIVE');
  assert('workflow 4col', /workflow-container[\s\S]*?repeat\(4/.test(css));
  assert('workflow 2col@1024', /1024[\s\S]*?workflow-container[\s\S]*?repeat\(2/.test(css));
  assert('workflow 1col@768', /768[\s\S]*?workflow-container[\s\S]*?grid-template-columns:\s*1fr/.test(css));
  assert('arrows hidden@1024', /1024[\s\S]*?workflow-arrow[\s\S]*?display:\s*none/.test(css));

  // 7. FORMS
  section('7. FORMS RESPONSIVE');
  assert('form-row 3col', /form-row\s*\{[^}]*grid-template-columns:\s*1fr 1fr 1fr/.test(css));
  assert('form-row 1col@768', /768[\s\S]*?\.form-row[\s\S]*?1fr/.test(css));
  assert('inputs 100%', /form-group input[^}]*width:\s*100%/.test(css));
  assert('form-row-2 1col@768', /768[\s\S]*?form-row-2[\s\S]*?1fr/.test(css));

  // 8. ASSISTANT
  section('8. AI ASSISTANT RESPONSIVE');
  assert('container max-width', /assistant-container[\s\S]*?max-width/.test(css));
  assert('msg 70%', /message-content[\s\S]*?max-width:\s*70%/.test(css));
  assert('msg 85%@768', /768[\s\S]*?message-content[\s\S]*?85%/.test(css));
  assert('msg 90%@480', /480[\s\S]*?message-content[\s\S]*?90%/.test(css));
  assert('input responsive', /768[\s\S]*?input-area[\s\S]*?padding/.test(css));
  assert('send btn shrink', /480[\s\S]*?btn-send[\s\S]*?flex-shrink/.test(css));
  assert('word-wrap', /message-content[\s\S]*?word-wrap:\s*break-word/.test(css));

  // 9. INVENTORY MGMT
  section('9. INVENTORY MANAGEMENT RESPONSIVE');
  assert('table-wrap overflow-x', /inventory-table-wrap[\s\S]*?overflow-x:\s*auto/.test(css));
  assert('mgmt-wrap overflow-x', /inventory-mgmt-table-wrap[\s\S]*?overflow-x:\s*auto/.test(css));
  assert('table min-width', /inventory-table[\s\S]*?min-width/.test(css));
  assert('mgmt stacks@768', /768[\s\S]*?inventory-mgmt-header[\s\S]*?flex-direction:\s*column/.test(css));
  assert('actions 100%@768', /768[\s\S]*?inventory-mgmt-actions[\s\S]*?width:\s*100%/.test(css));
  assert('modal scrollable@768', /768[\s\S]*?inventory-modal[\s\S]*?overflow-y:\s*auto/.test(css));
  assert('modal footer stacks@480', /480[\s\S]*?inventory-modal-footer[\s\S]*?flex-direction:\s*column/.test(css));
  assert('modal btns 100%@480', /480[\s\S]*?inventory-modal-footer[\s\S]*?width:\s*100%/.test(css));

  // 10. CSV UPLOAD
  section('10. CSV UPLOAD RESPONSIVE');
  assert('setup max-width', /setup-container[\s\S]*?max-width/.test(css));
  assert('setup width 100%', /setup-container[\s\S]*?width:\s*100%/.test(css));
  assert('setup pad@768', /768[\s\S]*?setup-container[\s\S]*?padding:\s*24px/.test(css));
  assert('setup pad@480', /480[\s\S]*?setup-container[\s\S]*?padding:\s*16px/.test(css));
  assert('csv input 100%', /csv-file-input[\s\S]*?width:\s*100%/.test(css));
  assert('sample btns flexWrap', jsx.includes("flexWrap: 'wrap'"));
  assert('textarea resize', jsx.includes("resize: 'vertical'"));

  // 11. WELCOME
  section('11. WELCOME SCREEN RESPONSIVE');
  assert('features 2col', /features[\s\S]*?grid-template-columns:\s*1fr 1fr/.test(css));
  assert('features 1col@768', /768[\s\S]*?\.features[\s\S]*?1fr/.test(css));
  assert('welcome max-width', /welcome-content[\s\S]*?max-width/.test(css));
  assert('welcome pad@480', /480[\s\S]*?welcome-content[\s\S]*?padding/.test(css));

  // 12. TOUCH TARGETS
  section('12. TOUCH TARGETS & ACCESSIBILITY');
  assert('nav 44px', /nav-btn[\s\S]*?min-height:\s*44px/.test(css));
  assert('btn padding 12px', /btn-primary[^}]*padding:\s*12px/.test(css));
  assert('input padding 10px', /form-group input[^}]*padding:\s*10px/.test(css));
  assert('inv-btn 36px@768', /768[\s\S]*?inv-btn-edit[\s\S]*?min-height:\s*36px/.test(css));

  // 13. TEXT READABILITY
  section('13. TEXT READABILITY ON MOBILE');
  assert('h1 reduces@768', /768[\s\S]*?header-content h1[\s\S]*?22px/.test(css));
  assert('h1 reduces@480', /480[\s\S]*?header-content h1[\s\S]*?20px/.test(css));
  assert('metric-val@480', /480[\s\S]*?metric-value[\s\S]*?22px/.test(css));
  assert('alert word-break', /480[\s\S]*?alert-content p[\s\S]*?word-break/.test(css));
  assert('rec word-break', /480[\s\S]*?recommendation-item p[\s\S]*?word-break/.test(css));

  // 14. INVENTORY SUMMARY
  section('14. INVENTORY SUMMARY RESPONSIVE');
  assert('summary stacks@768', /768[\s\S]*?inventory-summary[\s\S]*?flex-direction:\s*column/.test(css));
  assert('table font@768', /768[\s\S]*?inventory-table\s*\{[\s\S]*?12px/.test(css));

  // 15. SECTION HEADERS
  section('15. SECTION HEADERS & BOXES');
  assert('section-header@480', /480[\s\S]*?section-header[\s\S]*?flex-direction:\s*column/.test(css));
  assert('box-header@480', /480[\s\S]*?box-header[\s\S]*?flex-direction:\s*column/.test(css));
  assert('rec-header@768', /768[\s\S]*?rec-header[\s\S]*?flex-direction:\s*column/.test(css));

  // 16. OVERFLOW PROTECTION
  section('16. HORIZONTAL OVERFLOW PROTECTION');
  assert('body overflow-x', /body\s*\{[^}]*overflow-x:\s*hidden/.test(css));
  assert('app overflow-x', /\.app\s*\{[^}]*overflow-x:\s*hidden/.test(css));
  assert('#root max-width', idxCss.includes('max-width: 100vw'));
  assert('tables scroll', /inventory-table-wrap[\s\S]*?overflow-x:\s*auto/.test(css));

  // 17. JSX PATTERNS
  section('17. FRONTEND JSX RESPONSIVE PATTERNS');
  assert('no fixed px widths', !jsx.match(/width:\s*['"]?\d{3,}px/));
  assert('uses className', jsx.includes('className='));
  assert('loading spinner', jsx.includes('loading-spinner'));
  assert('error handling', jsx.includes('setError('));

  // SUMMARY
  console.log(`\n${'='.repeat(60)}\n  SUMMARY\n${'='.repeat(60)}`);
  console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${passed+failed}`);
  if (failures.length > 0) { console.log('  FAILURES:'); failures.forEach(f => console.log(`    - ${f}`)); }
  console.log(`${'='.repeat(60)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
