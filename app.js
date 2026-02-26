// Helm — Personal Finance PWA
const SUPABASE_URL = 'https://ulrdmnzeoswlzuyxxzbx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yWV0O6uMKoc7E3BHmKPmiw_dIqDsN21';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'helm-auth' }
});

let authToken = null;
let currentUserId = null;
let _currentApp = 'finance';
let _privacyMode = false;

const ACCOUNT_TYPES = ['401k','Roth IRA','Traditional IRA','Brokerage','HSA','Crypto','Savings Bond','Other'];

// ─── Daily Quote ─────────────────────────────────────────────────────────────

const DAILY_QUOTES = [
  'Small steps, big wealth.',
  'Save today, live better.',
  'Every dollar counts.',
  'Budget now, freedom later.',
  'Your future self thanks you.',
  'Wealth is built daily.',
  'Spend with intention.',
  'Goals don\'t wait.',
  'Track it to stack it.',
  'Discipline today, options tomorrow.',
  'Invest in yourself.',
  'Make money work for you.',
  'Progress, not perfection.',
  'Rich is a mindset first.',
  'Consistency wins.',
  'Know where it goes.',
  'Build wealth, not debt.',
  'Save first, spend the rest.',
  'Dream big, plan smart.',
  'Control your money.',
  'Decide. Act. Repeat.',
  'Small cuts, big gains.',
  'Money saved is power.',
  'Stay the course.',
  'Habits shape wealth.',
  'Think long term.',
  'Automate good habits.',
  'Patience compounds wealth.',
  'Debt-free is freedom.',
  'Own your choices.',
  'Winners track spending.',
  'Keep going.',
  'One budget at a time.',
  'Today\'s savings, tomorrow\'s options.',
  'Earn more, spend less.',
  'Time in market beats timing.',
  'A goal without a plan is a wish.',
  'Slow and steady builds wealth.',
  'Financial clarity is freedom.',
  'Spend less than you earn.',
  'Invest before you spend.',
  'Make it automatic.',
  'Net worth over net image.',
  'Cut waste, not joy.',
  'Every cent has a job.',
  'Future you is watching.',
  'Start before you\'re ready.',
  'One decision at a time.',
  'Money follows attention.',
  'Done is better than perfect.',
];

function setDailyQuote() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((new Date() - start) / 86400000);
  const quote = DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
  const el = document.getElementById('daily-quote');
  if (el) el.textContent = quote;
}

// ─── Privacy Mode ────────────────────────────────────────────────────────────

const EYE_OPEN = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF  = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function privVal(str) { return _privacyMode ? '••••' : str; }

function togglePrivacy() {
  _privacyMode = !_privacyMode;
  localStorage.setItem('helm-privacy', _privacyMode ? '1' : '0');
  updatePrivacyBtn();
  const activeTab = document.querySelector('.tab.active')?.dataset.tab;
  if (activeTab) loadPage(activeTab);
}

function updatePrivacyBtn() {
  const btn = document.getElementById('privacy-btn');
  if (!btn) return;
  btn.innerHTML = _privacyMode ? EYE_OFF : EYE_OPEN;
  btn.classList.toggle('active', _privacyMode);
}

// ─── Auth ────────────────────────────────────────────────────────────────────

async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    authToken = session.access_token;
    currentUserId = session.user.id;
    showApp();
  } else {
    showLogin();
  }
  sb.auth.onAuthStateChange((event, session) => {
    if (session) {
      authToken = session.access_token;
      currentUserId = session.user.id;
    } else {
      authToken = null;
      currentUserId = null;
      showLogin();
    }
  });
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-header').style.display = 'none';
  document.getElementById('tab-bar-finance').style.display = 'none';
  document.getElementById('tab-bar-invest').style.display = 'none';
  document.getElementById('content').style.display = 'none';
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-header').style.display = '';
  document.getElementById('content').style.display = '';
  document.getElementById('header-right').innerHTML =
    `<button id="privacy-btn" class="privacy-btn" onclick="togglePrivacy()"></button>
     <button class="logout-btn" onclick="doLogout()">Logout</button>`;
  setDailyQuote();
  _privacyMode = localStorage.getItem('helm-privacy') === '1';
  updatePrivacyBtn();
  const savedApp = localStorage.getItem('helm-app') || 'finance';
  _currentApp = savedApp;
  document.getElementById('tab-bar-finance').style.display = savedApp === 'finance' ? '' : 'none';
  document.getElementById('tab-bar-invest').style.display = savedApp === 'invest' ? '' : 'none';
  // Force correct icon-only content (guards against stale cached HTML)
  document.getElementById('opt-finance').innerHTML = '$';
  document.getElementById('opt-invest').innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;
  document.getElementById('opt-finance').classList.toggle('active', savedApp === 'finance');
  document.getElementById('opt-invest').classList.toggle('active', savedApp === 'invest');
  const savedTab = savedApp === 'invest'
    ? (localStorage.getItem('helm-invest-tab')   || 'portfolio')
    : (localStorage.getItem('helm-finance-tab')  || 'dashboard');
  activateTab(savedTab);
}

function toggleAppSwitcher() {
  document.getElementById('app-switcher').classList.toggle('hidden');
}

function switchApp(app) {
  _currentApp = app;
  localStorage.setItem('helm-app', app);
  document.getElementById('app-switcher').classList.add('hidden');
  document.getElementById('opt-finance').classList.toggle('active', app === 'finance');
  document.getElementById('opt-invest').classList.toggle('active', app === 'invest');
  document.getElementById('tab-bar-finance').style.display = app === 'finance' ? '' : 'none';
  document.getElementById('tab-bar-invest').style.display = app === 'invest' ? '' : 'none';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (app === 'finance') {
    activateTab(localStorage.getItem('helm-finance-tab') || 'dashboard');
  } else {
    activateTab(localStorage.getItem('helm-invest-tab') || 'portfolio');
  }
}

document.addEventListener('click', e => {
  if (!e.target.closest('#app-switcher') && !e.target.closest('#logo-switch-btn')) {
    document.getElementById('app-switcher')?.classList.add('hidden');
  }
});

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pw    = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('login-btn');

  if (!email || !pw) {
    errEl.textContent = 'Enter email and password';
    errEl.classList.remove('hidden');
    return;
  }
  btn.disabled = true; btn.textContent = 'Signing in...';
  errEl.classList.add('hidden');

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
  btn.disabled = false; btn.textContent = 'Sign In';

  if (error) {
    errEl.textContent = error.message || 'Login failed';
    errEl.classList.remove('hidden');
    return;
  }
  authToken = data.session.access_token;
  currentUserId = data.user.id;
  showApp();
}

async function doLogout() {
  await sb.auth.signOut();
  authToken = null; currentUserId = null;
  showLogin();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('login-screen').classList.contains('hidden')) doLogin();
});

// ─── API ─────────────────────────────────────────────────────────────────────

async function api(method, table, query = '', body = null) {
  if (!authToken) {
    const { data: { session } } = await sb.auth.getSession();
    if (session) { authToken = session.access_token; currentUserId = session.user.id; }
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${authToken || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (resp.status === 401) { showLogin(); throw new Error('Session expired — please log in again'); }
  const text = await resp.text();
  if (!resp.ok) {
    const err = text ? JSON.parse(text) : {};
    throw new Error(err.message || `API error ${resp.status}`);
  }
  return text ? JSON.parse(text) : [];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n)      { return '$' + Math.abs(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtS(n)     { return '$' + Math.abs(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
function fmtDate(d)  { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function pct(a, b)   { return b ? Math.min(100, Math.round((a / b) * 100)) : 0; }
function txnDesc(t)  { if (!t.description) return t.category; try { return JSON.parse(t.description).d || t.category; } catch { return t.description; } }
function txnCard(t)  { if (!t.description) return 'Debit'; try { return JSON.parse(t.description).pm || 'Debit'; } catch { return 'Debit'; } }

// Budget cycle: 25th of prev month → 24th of this month.
// If today is the 25th or later, we're already in next month's cycle.
// Uses local date math (no toISOString) to avoid UTC timezone shifting.
function currMonth() {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1; // 1-indexed
  if (now.getDate() >= 25) {
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

// Returns the Supabase date filter for a budget cycle month (YYYY-MM).
// Cycle runs from the 25th of the previous month through the 24th of ym.
// e.g. "2026-03" → date >= 2026-02-25 AND date <= 2026-03-24
function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  const prevYear  = m === 1 ? y - 1 : y;
  const prevMon   = m === 1 ? 12 : m - 1;
  const startStr  = `${prevYear}-${String(prevMon).padStart(2, '0')}-25`;
  const endStr    = `${ym}-24`;
  return `date=gte.${startStr}&date=lte.${endStr}`;
}

function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return `${py}-${String(pm).padStart(2, '0')}`;
}
function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✗', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || icons.info}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.remove(); }, 3000);
}

function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

// ─── Smart Categorization (keyword-based) ────────────────────────────────────

const CAT_KEYWORDS = {
  'Rent':           ['rent', 'landlord', 'lease', 'apartment', 'condo'],
  'Groceries':      ['grocery', 'groceries', 'walmart', 'kroger', 'whole foods', 'trader joe', 'aldi', 'publix', 'safeway', 'costco', 'sams club', 'target', 'food', 'market', 'wegmans', 'meijer', 'sprouts'],
  'Phone Bill':     ['phone bill', 'verizon', 'at&t', 'att', 't-mobile', 'tmobile', 'sprint', 'mint mobile', 'cricket', 'boost', 'metropcs', 'wireless'],
  'Electric Bill':  ['electric', 'electricity', 'power bill', 'utility', 'utilities', 'duke energy', 'fpl', 'con ed'],
  'Sara Allowance': ['sara'],
  'Baba Allowance': ['baba'],
  'Savings':        ['savings', 'saving'],
  'Auto Insurance': ['car insurance', 'auto insurance', 'geico', 'progressive', 'state farm', 'allstate', 'nationwide', 'usaa'],
  'Subscriptions':  ['netflix', 'spotify', 'hulu', 'disney', 'amazon prime', 'apple tv', 'youtube', 'gym', 'membership', 'subscription', 'hbo', 'paramount', 'peacock', 'crunchyroll', 'twitch', 'patreon', 'dropbox', 'adobe', 'microsoft 365', 'office 365'],
};

function suggestCategory(val) {
  if (!val || val.trim().length < 2) return null;
  const lower = val.trim().toLowerCase();
  for (const [cat, keywords] of Object.entries(CAT_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return null;
}

let _catDebounce;
let _autoSuggestedCat = null;
let _catCorrections = {};

function normalizeDesc(val) {
  return val.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function loadCatCorrections() {
  try {
    const rows = await api('GET', 'category_corrections',
      `user_id=eq.${currentUserId}&select=description_key,category&order=created_at.desc`);
    _catCorrections = {};
    rows.forEach(r => {
      if (!_catCorrections[r.description_key]) _catCorrections[r.description_key] = r.category;
    });
  } catch (_) {}
}

function suggestFromHistory(val) {
  const key = normalizeDesc(val);
  if (_catCorrections[key]) return _catCorrections[key];
  for (const [storedKey, cat] of Object.entries(_catCorrections)) {
    if (key.includes(storedKey) || storedKey.includes(key)) return cat;
  }
  return null;
}

function debounceCat(val) {
  clearTimeout(_catDebounce);
  const hint = document.getElementById('cat-hint');
  if (!val || val.trim().length < 2) { if (hint) hint.textContent = ''; _autoSuggestedCat = null; return; }
  _catDebounce = setTimeout(() => {
    const suggestion = suggestFromHistory(val) || suggestCategory(val);
    if (suggestion) {
      const sel = document.getElementById('t-cat');
      if (sel) sel.value = suggestion;
      _autoSuggestedCat = suggestion;
      if (hint) hint.textContent = `→ ${suggestion}`;
    } else {
      _autoSuggestedCat = null;
      if (hint) hint.textContent = '';
    }
  }, 400);
}

// ─── Budget Insights (calculated) ────────────────────────────────────────────

let _dashData = null;

function generateInsights() {
  const el = document.getElementById('insights-content');
  if (!el || !_dashData) return;
  const d = _dashData;
  const lines = [];

  // Income & overall spending
  if (d.incomeGoalAmt) {
    const spentPct = Math.round((d.expenses / d.incomeGoalAmt) * 100);
    const remaining = d.incomeGoalAmt - d.expenses;
    lines.push(`You've spent ${fmtS(d.expenses)} (${spentPct}% of your ${fmtS(d.incomeGoalAmt)} income) this month. ${remaining >= 0 ? fmtS(remaining) + ' remaining.' : fmtS(Math.abs(remaining)) + ' over income.'}`);
  }

  // Available flex budget
  if (d.flexRemaining != null) {
    lines.push(d.flexRemaining >= 0
      ? `Flexible budget (Normal Spending + Groceries + Sara Allowance): ${fmtS(d.flexRemaining)} left to spend.`
      : `You're ${fmtS(Math.abs(d.flexRemaining))} over your flexible budget.`);
  }

  // Over-budget categories
  const overBudget = BUDGET_ITEMS.filter(cat => {
    const budget = d.budgetMap[cat] || 0;
    return budget > 0 && (d.byCat[cat] || 0) > budget;
  });
  if (overBudget.length) {
    overBudget.forEach(cat => {
      const over = (d.byCat[cat] || 0) - (d.budgetMap[cat] || 0);
      lines.push(`${cat} is over budget by ${fmtS(over)}.`);
    });
  } else {
    lines.push('No categories are over budget.');
  }

  // Biggest spending category
  const topCat = Object.entries(d.byCat).filter(([k]) => k !== '__card_payment__').sort((a,b) => b[1]-a[1])[0];
  if (topCat) lines.push(`Biggest expense category: ${topCat[0]} at ${fmtS(topCat[1])}.`);

  // Card utilization
  const coUtil = Math.round((d.coBalance / 7000) * 100);
  const secUtil = Math.round((d.secBalance / 1000) * 100);
  lines.push(`Capital One: ${fmtS(d.coBalance)} (${coUtil}% utilization). Secure: ${fmtS(d.secBalance)} (${secUtil}% utilization).`);

  el.innerHTML = lines.map(l => `<div style="margin-bottom:8px;font-size:13px;color:var(--text);line-height:1.5">${l}</div>`).join('');
}

function hideFab() {
  const fab = document.getElementById('txn-fab');
  if (fab) fab.style.display = 'none';
}
function showFab() {
  let fab = document.getElementById('txn-fab');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'txn-fab';
    fab.className = 'fab';
    fab.innerHTML = '+';
    fab.onclick = openAddTxn;
    document.body.appendChild(fab);
  }
  fab.style.display = '';
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    activateTab(tab);
    localStorage.setItem('mybudget-tab', tab);
    if (['dashboard','transactions','budget','savings'].includes(tab)) {
      localStorage.setItem('helm-finance-tab', tab);
    } else {
      localStorage.setItem('helm-invest-tab', tab);
    }
  });
});

function activateTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  const page = document.getElementById('page-' + tab);
  if (page) page.classList.add('active');
  loadPage(tab);
}

function loadPage(tab) {
  if (tab !== 'markets') { clearTimeout(_marketsTimer); _marketsTimer = null; }
  switch (tab) {
    case 'dashboard':    loadDashboard();    break;
    case 'transactions': loadTransactions(); break;
    case 'budget':       loadBudget();       break;
    case 'savings':      loadSavings();      break;
    case 'portfolio':    loadPortfolio();    break;
    case 'markets':      loadMarkets();      break;
    case 'picks':        loadPicks();        break;
  }
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

let _activeMonth = currMonth();

async function loadDashboard() {
  showFab();
  const el = document.getElementById('dash-content');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const mr = monthRange(_activeMonth);
    const [txns, budgets, goals, snapshots, allIncomeGoals, allCardTxns] = await Promise.all([
      api('GET', 'transactions', `user_id=eq.${currentUserId}&${mr}&type=eq.expense&category=neq.__card_payment__&select=*&order=date.desc,created_at.desc`),
      api('GET', 'budgets',      `user_id=eq.${currentUserId}&month=eq.${_activeMonth}&category=neq.__income_goal__&select=*`),
      api('GET', 'savings_goals', `user_id=eq.${currentUserId}&select=*`),
      api('GET', 'investment_snapshots', `user_id=eq.${currentUserId}&select=*&order=date.desc`),
      api('GET', 'budgets', `user_id=eq.${currentUserId}&category=eq.__income_goal__&select=*&order=created_at.desc`),
      api('GET', 'transactions', `user_id=eq.${currentUserId}&type=eq.expense&select=amount,description,category`),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const activeGoal = allIncomeGoals.find(g => {
      if (!g.month.includes('_')) return false;
      const [s, e] = g.month.split('_');
      return today >= s && today <= e;
    }) || allIncomeGoals[0] || null;

    let cycleStart = null, cycleEnd = null;
    if (activeGoal && activeGoal.month.includes('_')) {
      [cycleStart, cycleEnd] = activeGoal.month.split('_');
    }

    const expenses       = txns.reduce((s, t) => s + parseFloat(t.amount), 0);
    const incomeGoalAmt  = activeGoal ? parseFloat(activeGoal.limit_amount) : null;
    const remaining      = incomeGoalAmt != null ? incomeGoalAmt - expenses : null;

    // Card balances (all-time)
    let coBalance = 0, secBalance = 0;
    allCardTxns.forEach(t => {
      const card = txnCard(t);
      if (t.category === '__card_payment__') {
        if (card === 'Capital One') coBalance  -= parseFloat(t.amount);
        if (card === 'Secure')      secBalance -= parseFloat(t.amount);
      } else {
        if (card === 'Capital One') coBalance  += parseFloat(t.amount);
        if (card === 'Secure')      secBalance += parseFloat(t.amount);
      }
    });

    // Spending by category
    const byCat = {};
    txns.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + parseFloat(t.amount); });

    // Budget map
    const budgetMap = {};
    budgets.forEach(b => { budgetMap[b.category] = parseFloat(b.limit_amount); });

    // Available to spend: Normal Spending + Groceries + Sara Allowance remaining
    const totalBudgeted  = BUDGET_ITEMS.reduce((s, cat) => s + (budgetMap[cat] || 0), 0);
    const nsBudget       = incomeGoalAmt != null ? incomeGoalAmt - totalBudgeted : null;
    const nsRemaining    = nsBudget != null ? nsBudget - (byCat['Normal Spending'] || 0) : null;
    const grocRemaining  = (budgetMap['Groceries'] || 0) - (byCat['Groceries'] || 0);
    const saraRemaining  = (budgetMap['Sara Allowance'] || 0) - (byCat['Sara Allowance'] || 0);
    const flexRemaining  = nsRemaining != null ? nsRemaining + grocRemaining + saraRemaining : null;

    // Budget alerts (only items actually over their limit)
    const alerts = budgets.filter(b => {
      const limit = parseFloat(b.limit_amount);
      return limit > 0 && (byCat[b.category] || 0) > limit;
    });

    const recentTxns = txns.slice(0, 5);

    let html = `
      <div class="month-bar">
        <button class="month-nav" onclick="_activeMonth=prevMonth(_activeMonth);loadDashboard()">&#8249;</button>
        <span class="month-label">${monthLabel(_activeMonth)}</span>
        <button class="month-nav" onclick="_activeMonth=nextMonth(_activeMonth);loadDashboard()">&#8250;</button>
      </div>
      <div class="nw-banner">
        <div class="nw-label">Available to Spend</div>
        <div class="nw-value" style="color:${flexRemaining == null ? 'inherit' : flexRemaining >= 0 ? 'var(--green)' : 'var(--red)'}">
          ${_privacyMode ? '••••' : flexRemaining != null ? (flexRemaining < 0 ? '-' : '') + fmtS(Math.abs(flexRemaining)) : '—'}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">Normal Spending · Groceries · Sara Allowance</div>
      </div>
      <div class="stat-row two" style="margin-bottom:8px">
        <div class="stat-card" onclick="openCardPayment('Capital One',${coBalance})" style="cursor:pointer">
          <div class="stat-label">Capital One</div>
          <div class="stat-value" style="color:${coBalance/7000>=0.6?'var(--red)':coBalance/7000>=0.3?'var(--orange)':'var(--green)'}">${privVal(fmt(coBalance))}</div>
        </div>
        <div class="stat-card" onclick="openCardPayment('Secure',${secBalance})" style="cursor:pointer">
          <div class="stat-label">Secure</div>
          <div class="stat-value" style="color:${secBalance/1000>=0.6?'var(--red)':secBalance/1000>=0.3?'var(--orange)':'var(--green)'}">${privVal(fmt(secBalance))}</div>
        </div>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${activeGoal ? '10px' : '0'}">
          <div>
            <div class="card-title" style="margin-bottom:2px">Income</div>
            ${activeGoal
              ? `<div style="font-size:22px;font-weight:800;color:var(--green)">${privVal(fmtS(activeGoal.limit_amount))}</div>
                 ${cycleStart && cycleEnd ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">${fmtDate(cycleStart)} – ${fmtDate(cycleEnd)}</div>` : ''}`
              : `<div style="font-size:13px;color:var(--muted)">Not set — tap to add your income cycle</div>`}
          </div>
          <button class="btn btn-sm btn-secondary" onclick="openSetIncome('${activeGoal ? activeGoal.id : ''}',${activeGoal ? activeGoal.limit_amount : 0},'${cycleStart || ''}','${cycleEnd || ''}')">${activeGoal ? 'Edit' : 'Set Income'}</button>
        </div>
        ${activeGoal && incomeGoalAmt ? `
        <div class="progress-bar"><div class="progress-fill ${pct(expenses, incomeGoalAmt) >= 100 ? 'over' : pct(expenses, incomeGoalAmt) >= 80 ? 'warn' : 'safe'}" style="width:${pct(expenses, incomeGoalAmt)}%"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-top:4px">
          <span>Spent: ${privVal(fmtS(expenses))}</span>
          <span>${pct(expenses, incomeGoalAmt)}% of income</span>
        </div>` : ''}
      </div>`;

    if (alerts.length) {
      html += `<div class="card" style="border-color:var(--red)">
        <div class="card-title" style="color:var(--red)">⚠ Budget Alerts</div>`;
      alerts.forEach(b => {
        const spent = byCat[b.category] || 0;
        const p = pct(spent, parseFloat(b.limit_amount));
        html += `<div class="list-item">
          <div class="list-item-left"><div class="list-item-title">${b.category}</div></div>
          <span class="badge ${p >= 100 ? 'badge-red' : 'badge-yellow'}">${p >= 100 ? 'Over budget' : p + '% used'}</span>
        </div>`;
      });
      html += `</div>`;
    }

    if (recentTxns.length) {
      html += `<div class="card"><div class="card-title">Recent Spending</div>`;
      recentTxns.forEach(t => {
        html += `<div class="list-item">
          <div class="list-item-left">
            <div class="list-item-title">${txnDesc(t)}</div>
            <div class="list-item-sub"><span class="cat-tag">${t.category}</span>${txnCard(t) !== 'Debit' ? ` · <span class="cat-tag">${txnCard(t)}</span>` : ''} · ${fmtDate(t.date)}</div>
          </div>
          <span class="amount-expense">-${fmt(t.amount)}</span>
        </div>`;
      });
      html += `</div>`;
    }

    if (goals.length) {
      html += `<div class="card"><div class="card-title">Savings Goals</div>`;
      goals.slice(0, 3).forEach(g => {
        const p = pct(parseFloat(g.current_amount || 0), parseFloat(g.target_amount));
        html += `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:13px;color:var(--text)">${g.name}</span>
            <span style="font-size:12px;color:var(--muted)">${privVal(fmtS(g.current_amount))} / ${privVal(fmtS(g.target_amount))}</span>
          </div>
          <div class="progress-bar"><div class="progress-fill safe" style="width:${p}%"></div></div>
        </div>`;
      });
      html += `</div>`;
    }

    if (!txns.length && !goals.length) {
      html += `<div class="empty-state">
        <div class="empty-state-icon">💰</div>
        <div class="empty-state-text">No data yet.<br>Add your first expense to get started.</div>
      </div>`;
    }

    // Cache data for AI insights
    _dashData = { byCat, budgetMap, expenses, incomeGoalAmt, flexRemaining, nsBudget,
                  grocRemaining, saraRemaining, coBalance, secBalance, month: _activeMonth };

    html += `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="card-title">AI Insights</div>
          <button id="insights-btn" class="btn btn-sm btn-secondary" onclick="generateInsights()">Generate</button>
        </div>
        <div id="insights-content" style="margin-top:8px;font-size:13px;color:var(--muted)">
          Tap Generate to get AI insights on your spending.
        </div>
      </div>`;

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error loading dashboard</div></div>`;
    showToast(e.message, 'error');
  }
}

// ─── Transactions ─────────────────────────────────────────────────────────────


async function loadTransactions() {
  hideFab();
  const el = document.getElementById('txn-content');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const [txns, allIncomeGoals] = await Promise.all([
      api('GET', 'transactions', `user_id=eq.${currentUserId}&${monthRange(_activeMonth)}&type=eq.expense&category=neq.__card_payment__&select=*&order=date.desc,created_at.desc`),
      api('GET', 'budgets',      `user_id=eq.${currentUserId}&category=eq.__income_goal__&select=*&order=created_at.desc`),
    ]);

    const totalSpent = txns.reduce((s, t) => s + parseFloat(t.amount), 0);

    const today = new Date().toISOString().slice(0, 10);
    const activeGoal = allIncomeGoals.find(g => {
      if (!g.month.includes('_')) return false;
      const [s, e] = g.month.split('_');
      return today >= s && today <= e;
    }) || allIncomeGoals[0] || null;
    const incomeGoalAmt = activeGoal ? parseFloat(activeGoal.limit_amount) : null;
    const remaining     = incomeGoalAmt != null ? incomeGoalAmt - totalSpent : null;

    let html = `
      <div class="month-bar"><span class="month-label">${monthLabel(_activeMonth)}</span></div>
      <div class="stat-row two" style="margin-bottom:12px">
        <div class="stat-card"><div class="stat-label">Spent</div><div class="stat-value red">${privVal(fmtS(totalSpent))}</div></div>
        <div class="stat-card"><div class="stat-label">Remaining</div><div class="stat-value ${remaining != null && remaining >= 0 ? 'green' : 'red'}">${remaining != null ? privVal(fmtS(remaining)) : '—'}</div></div>
      </div>`;

    if (txns.length) {
      const byDate = {};
      txns.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });
      Object.entries(byDate).forEach(([date, items]) => {
        const label = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        html += `<div style="font-size:11px;color:var(--muted);margin:8px 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
          <div class="card" style="padding:0 14px">`;
        items.forEach(t => {
          html += `<div class="list-item">
            <div class="list-item-left">
              <div class="list-item-title">${txnDesc(t)}</div>
              <div class="list-item-sub"><span class="cat-tag">${t.category}</span>${txnCard(t) !== 'Debit' ? ` · <span class="cat-tag">${txnCard(t)}</span>` : ''}</div>
            </div>
            <div class="list-item-right" style="display:flex;align-items:center;gap:8px">
              <span class="amount-expense">${privVal('-' + fmt(t.amount))}</span>
              <button class="btn btn-sm btn-danger" onclick="deleteTxn('${t.id}')">✕</button>
            </div>
          </div>`;
        });
        html += `</div>`;
      });
    } else {
      html += `<div class="empty-state"><div class="empty-state-icon">💸</div><div class="empty-state-text">No expenses this month.<br>Tap + to add one.</div></div>`;
    }

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error loading</div></div>`;
    showToast(e.message, 'error');
  }
}

function openAddTxn() {
  _autoSuggestedCat = null;
  loadCatCorrections();
  const today = new Date().toISOString().slice(0, 10);
  const cats  = ['Normal Spending', ...BUDGET_ITEMS, 'Other'];
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">Add Expense</div>
        <div class="field"><label>Amount</label><input type="number" id="t-amount" placeholder="0.00" step="0.01" min="0" inputmode="decimal"></div>
        <div class="field"><label>Description (optional)</label><input type="text" id="t-desc" placeholder="e.g. Grocery run, Netflix" oninput="debounceCat(this.value)"></div>
        <div class="field"><label>Category <span id="cat-hint" style="font-size:11px;color:var(--muted)"></span></label><select id="t-cat">${cats.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Date</label><input type="date" id="t-date" value="${today}"></div>
        <div class="field"><label>Card</label><select id="t-pm"><option>Debit</option><option>Capital One</option><option>Secure</option></select></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitTxn()">Add</button>
        </div>
      </div>
    </div>`;
}

async function submitTxn() {
  const amount = parseFloat(document.getElementById('t-amount').value);
  const category = document.getElementById('t-cat').value;
  const date = document.getElementById('t-date').value;
  const d  = document.getElementById('t-desc').value.trim();
  const pm = document.getElementById('t-pm').value;
  if (!amount || !date) { showToast('Enter amount and date', 'error'); return; }
  const description = JSON.stringify({ d, pm });
  try {
    await api('POST', 'transactions', '', { user_id: currentUserId, type: 'expense', amount, category, date, description });
    // Save to correction history if user overrode the suggestion, or picked manually with no suggestion
    if (d) {
      const key = normalizeDesc(d);
      const shouldSave = (_autoSuggestedCat && category !== _autoSuggestedCat) ||
                         (!_autoSuggestedCat && category !== 'Normal Spending');
      if (shouldSave) {
        api('POST', 'category_corrections', '', { user_id: currentUserId, description_key: key, category }).catch(() => {});
      }
    }
    closeModal();
    showToast('Expense added', 'success');
    loadDashboard();
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteTxn(id) {
  if (!confirm('Delete this transaction?')) return;
  try {
    await api('DELETE', 'transactions', `id=eq.${id}`);
    showToast('Deleted', 'success');
    loadTransactions();
  } catch (e) { showToast(e.message, 'error'); }
}

function openCardPayment(card, balance) {
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">${card}</div>
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:13px;color:var(--muted)">Current Balance</div>
          <div style="font-size:28px;font-weight:800;color:${balance > 0 ? 'var(--red)' : 'var(--green)'}">$${Math.abs(balance).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>
        <div class="field">
          <label>Payment Amount</label>
          <input type="number" id="cp-amount" placeholder="0.00" step="0.01" min="0" inputmode="decimal">
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitCardPayment('${card}')">Record Payment</button>
        </div>
      </div>
    </div>`;
}

async function submitCardPayment(card) {
  const amount = parseFloat(document.getElementById('cp-amount').value);
  if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
  const date = new Date().toISOString().slice(0, 10);
  try {
    await api('POST', 'transactions', '', { user_id: currentUserId, type: 'expense', amount, category: '__card_payment__', date, description: JSON.stringify({ d: 'Card Payment', pm: card }) });
    closeModal();
    showToast('Payment recorded', 'success');
    loadDashboard();
  } catch (e) { showToast(e.message, 'error'); }
}

// ─── Budget ──────────────────────────────────────────────────────────────────

const BUDGET_ITEMS = ['Rent','Groceries','Phone Bill','Electric Bill','Sara Allowance','Savings','Baba Allowance','Auto Insurance','Subscriptions'];


async function loadBudget() {
  hideFab();
  const el = document.getElementById('budget-content');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const [budgets, allIncomeGoals, transactions] = await Promise.all([
      api('GET', 'budgets',      `user_id=eq.${currentUserId}&month=eq.${_activeMonth}&category=neq.__income_goal__&select=*`),
      api('GET', 'budgets',      `user_id=eq.${currentUserId}&category=eq.__income_goal__&select=*&order=created_at.desc`),
      api('GET', 'transactions', `user_id=eq.${currentUserId}&${monthRange(_activeMonth)}&type=eq.expense&category=neq.__card_payment__&select=amount,category`),
    ]);

    // Ensure all 9 items exist for this month — create any missing ones at $0
    const existingCats = new Set(budgets.map(b => b.category));
    const missing = BUDGET_ITEMS.filter(cat => !existingCats.has(cat));
    if (missing.length > 0) {
      await Promise.all(missing.map(cat =>
        api('POST', 'budgets', '', { user_id: currentUserId, month: _activeMonth, category: cat, limit_amount: 0 })
      ));
      return loadBudget();
    }

    // Spending per category from actual transactions
    const spentMap = {};
    transactions.forEach(t => {
      spentMap[t.category] = (spentMap[t.category] || 0) + parseFloat(t.amount);
    });

    const budgetMap = {};
    budgets.forEach(b => { budgetMap[b.category] = b; });
    const ordered = BUDGET_ITEMS.map(cat => budgetMap[cat]).filter(Boolean);

    // Active income goal
    const today = new Date().toISOString().slice(0, 10);
    const activeGoal = allIncomeGoals.find(g => {
      if (!g.month.includes('_')) return false;
      const [s, e] = g.month.split('_');
      return today >= s && today <= e;
    }) || allIncomeGoals[0] || null;
    const incomeGoalAmt = activeGoal ? parseFloat(activeGoal.limit_amount) : null;
    const totalBudgeted = ordered.reduce((s, b) => s + parseFloat(b.limit_amount), 0);
    const normalSpending = incomeGoalAmt != null ? incomeGoalAmt - totalBudgeted : null;

    const nsSpent  = spentMap['Normal Spending'] || 0;
    const nsBudget = normalSpending;

    let html = `<div class="month-bar"><span class="month-label">${monthLabel(_activeMonth)}</span></div>`;

    // Normal Spending card — always first
    if (nsBudget !== null) {
      const nsP = nsBudget > 0 ? pct(nsSpent, nsBudget) : 0;
      html += `
        <div class="card" style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:15px;font-weight:700">Normal Spending</div>
            <span style="font-size:11px;color:var(--muted)">Income − Fixed</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:${nsBudget > 0 ? '6px' : '0'}">
            <span style="color:${nsSpent > 0 ? 'var(--red)' : 'var(--muted)'}">Spent: ${privVal(fmt(nsSpent))}</span>
            <span style="color:var(--muted)">${nsBudget > 0 ? 'Budget: ' + privVal(fmt(nsBudget)) : 'Set income goal to see budget'}</span>
          </div>
          ${nsBudget > 0 ? `
          <div class="progress-bar"><div class="progress-fill ${nsP >= 100 ? 'over' : nsP >= 80 ? 'warn' : 'safe'}" style="width:${nsP}%"></div></div>
          <div style="text-align:right;font-size:11px;color:var(--muted);margin-top:3px">${nsP}%</div>
          ` : ''}
        </div>`;
    }

    ordered.forEach(b => {
      const budget = parseFloat(b.limit_amount);
      const spent  = spentMap[b.category] || 0;
      const p      = budget > 0 ? pct(spent, budget) : 0;
      html += `
        <div class="card" style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:15px;font-weight:700">${b.category}</div>
            <button class="btn btn-sm btn-secondary" onclick="openEditBudget('${b.id}','${b.category}',${budget})">Edit</button>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:${budget > 0 ? '6px' : '0'}">
            <span style="color:${spent > 0 ? 'var(--red)' : 'var(--muted)'}">Spent: ${privVal(fmt(spent))}</span>
            <span style="color:var(--muted)">${budget > 0 ? 'Budget: ' + privVal(fmt(budget)) : 'No budget set'}</span>
          </div>
          ${budget > 0 ? `
          <div class="progress-bar"><div class="progress-fill ${p >= 100 ? 'over' : p >= 80 ? 'warn' : 'safe'}" style="width:${p}%"></div></div>
          <div style="text-align:right;font-size:11px;color:var(--muted);margin-top:3px">${p}%</div>
          ` : ''}
        </div>`;
    });

    // Totals row
    const totalSpent = BUDGET_ITEMS.reduce((s, cat) => s + (spentMap[cat] || 0), 0) + nsSpent;
    html += `
      <div class="card" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:700;font-size:15px">Total Budgeted</span>
          <span style="font-size:18px;font-weight:800">${privVal(fmt(totalBudgeted))}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
          <span style="font-size:12px;color:var(--muted)">Total Spent</span>
          <span style="font-size:14px;font-weight:700;color:var(--red)">${privVal(fmt(totalSpent))}</span>
        </div>
      </div>`;


    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error loading</div></div>`;
    showToast(e.message, 'error');
  }
}

function openEditBudget(id, cat, amount) {
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">${cat}</div>
        <div class="field">
          <label>Amount for ${monthLabel(_activeMonth)}</label>
          <input type="number" id="b-limit" step="0.01" min="0" value="${amount === 0 ? '' : amount}" placeholder="0.00" inputmode="decimal">
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitEditBudget('${id}')">Save</button>
        </div>
      </div>
    </div>`;
}

async function submitEditBudget(id) {
  const val   = document.getElementById('b-limit').value;
  const limit = val === '' ? 0 : parseFloat(val);
  if (isNaN(limit)) { showToast('Enter a valid amount', 'error'); return; }
  try {
    await api('PATCH', 'budgets', `id=eq.${id}`, { limit_amount: limit });
    closeModal(); showToast('Saved', 'success'); loadBudget();
  } catch (e) { showToast(e.message, 'error'); }
}

// ─── Savings ─────────────────────────────────────────────────────────────────

async function loadSavings() {
  hideFab();
  const el = document.getElementById('savings-content');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const goals = await api('GET', 'savings_goals', `user_id=eq.${currentUserId}&select=*&order=created_at`);
    const totalSaved  = goals.reduce((s, g) => s + parseFloat(g.current_amount || 0), 0);
    const totalTarget = goals.reduce((s, g) => s + parseFloat(g.target_amount), 0);

    let html = `<div class="page-header">
      <span class="section-title">Savings Goals</span>
      <button class="btn btn-primary btn-sm" onclick="openAddGoal()">+ Add Goal</button>
    </div>`;

    if (goals.length) {
      html += `<div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:var(--muted);font-size:13px">Total Saved</span>
          <span style="font-weight:700;color:var(--green)">${privVal(fmt(totalSaved))}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--muted);font-size:13px">Total Target</span>
          <span style="font-weight:700">${privVal(fmt(totalTarget))}</span>
        </div>
      </div>`;

      goals.forEach(g => {
        const p   = pct(parseFloat(g.current_amount || 0), parseFloat(g.target_amount));
        let extra = '';
        if (g.target_date) {
          const diff = Math.ceil((new Date(g.target_date) - new Date()) / 86400000);
          extra = diff > 0 ? `${diff} days left` : 'Past target date';
        }
        html += `<div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-size:16px;font-weight:700">${g.name}</div>
              ${extra ? `<div style="font-size:12px;color:var(--muted);margin-top:2px">${extra}</div>` : ''}
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-primary" onclick="openDeposit('${g.id}',${parseFloat(g.current_amount || 0)})">+ Add</button>
              <button class="btn btn-sm btn-danger" onclick="deleteGoal('${g.id}')">✕</button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
            <span style="color:var(--green);font-weight:700">${privVal(fmt(g.current_amount))}</span>
            <span style="color:var(--muted)">of ${privVal(fmt(g.target_amount))}</span>
          </div>
          <div class="progress-bar"><div class="progress-fill safe" style="width:${p}%"></div></div>
          <div style="text-align:right;font-size:12px;color:var(--muted);margin-top:4px">${p}% complete</div>
        </div>`;
      });
    } else {
      html += `<div class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-text">No savings goals yet.<br>Tap "Add Goal" to create one.</div></div>`;
    }

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error loading</div></div>`;
    showToast(e.message, 'error');
  }
}

function openAddGoal() {
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">New Savings Goal</div>
        <div class="field"><label>Goal Name</label><input type="text" id="g-name" placeholder="e.g. Emergency Fund, Vacation"></div>
        <div class="field"><label>Target Amount</label><input type="number" id="g-target" placeholder="0.00" step="0.01" min="0" inputmode="decimal"></div>
        <div class="field"><label>Starting Amount</label><input type="number" id="g-current" placeholder="0.00" step="0.01" min="0" value="0" inputmode="decimal"></div>
        <div class="field"><label>Target Date (optional)</label><input type="date" id="g-date"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitGoal()">Create</button>
        </div>
      </div>
    </div>`;
}

async function submitGoal() {
  const name        = document.getElementById('g-name').value.trim();
  const target      = parseFloat(document.getElementById('g-target').value);
  const current     = parseFloat(document.getElementById('g-current').value || 0);
  const target_date = document.getElementById('g-date').value || null;
  if (!name || !target) { showToast('Fill in name and target amount', 'error'); return; }
  try {
    await api('POST', 'savings_goals', '', { user_id: currentUserId, name, target_amount: target, current_amount: current, target_date });
    closeModal(); showToast('Goal created', 'success'); loadSavings();
  } catch (e) { showToast(e.message, 'error'); }
}

function openDeposit(id, current) {
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">Add to Savings</div>
        <div class="field"><label>Current Balance: ${fmt(current)}</label></div>
        <div class="field"><label>Deposit Amount</label><input type="number" id="dep-amount" placeholder="0.00" step="0.01" min="0" inputmode="decimal"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitDeposit('${id}',${current})">Add</button>
        </div>
      </div>
    </div>`;
}

async function submitDeposit(id, current) {
  const deposit = parseFloat(document.getElementById('dep-amount').value);
  if (!deposit) { showToast('Enter an amount', 'error'); return; }
  try {
    await api('PATCH', 'savings_goals', `id=eq.${id}`, { current_amount: current + deposit });
    closeModal(); showToast('Deposit added', 'success'); loadSavings();
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteGoal(id) {
  if (!confirm('Delete this savings goal?')) return;
  try {
    await api('DELETE', 'savings_goals', `id=eq.${id}`);
    showToast('Deleted', 'success'); loadSavings();
  } catch (e) { showToast(e.message, 'error'); }
}

// ─── Investments ──────────────────────────────────────────────────────────────

let _investChart = null;
let _marketsTimer = null;

async function loadPortfolio() {
  hideFab();
  const el = document.getElementById('portfolio-content');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const [accounts, snapshots] = await Promise.all([
      api('GET', 'investment_accounts',  `user_id=eq.${currentUserId}&select=*&order=created_at`),
      api('GET', 'investment_snapshots', `user_id=eq.${currentUserId}&select=*&order=date.asc`),
    ]);

    // Latest balance per account
    const latestByAcct = {};
    snapshots.forEach(s => { latestByAcct[s.account_id] = parseFloat(s.balance); });
    const total = Object.values(latestByAcct).reduce((a, b) => a + b, 0);

    // Portfolio chart: sum all balances per date
    const byDate = {};
    snapshots.forEach(s => {
      byDate[s.date] = byDate[s.date] || {};
      byDate[s.date][s.account_id] = parseFloat(s.balance);
    });
    const chartDates  = Object.keys(byDate).sort();
    // For each date, carry forward latest known balance per account
    const knownBals   = {};
    const chartTotals = chartDates.map(date => {
      Object.assign(knownBals, byDate[date]);
      return Object.values(knownBals).reduce((a, b) => a + b, 0);
    });

    let html = `<div class="page-header">
      <span class="section-title">Investments</span>
      <button class="btn btn-primary btn-sm" onclick="openAddAccount()">+ Add Account</button>
    </div>
    <div class="stat-row two" style="margin-bottom:12px">
      <div class="nw-banner" style="flex:1;margin-bottom:0">
        <div class="nw-label">Total Portfolio</div>
        <div class="nw-value">${privVal(fmtS(total))}</div>
      </div>
      <div class="nw-banner" style="flex:1;margin-bottom:0" id="gold-card">
        <div class="nw-label">Gold (oz)</div>
        <div class="nw-value" id="gold-price" style="font-size:18px">—</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px" id="gold-change"></div>
      </div>
    </div>`;

    if (chartDates.length > 1) {
      html += `<div class="card"><div class="card-title">Portfolio Value</div><div class="chart-wrap"><canvas id="invest-chart"></canvas></div></div>`;
    }

    if (accounts.length) {
      accounts.forEach(a => {
        const balance  = latestByAcct[a.id];
        const acctSnaps = snapshots.filter(s => s.account_id === a.id);
        const lastSnap  = acctSnaps[acctSnaps.length - 1];
        const lastDate  = lastSnap
          ? new Date(lastSnap.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'No data';
        html += `<div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-size:16px;font-weight:700">${a.name}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px">${a.institution ? a.institution + ' · ' : ''}${a.account_type}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">Updated ${lastDate}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:22px;font-weight:800;color:var(--green)">${balance != null ? privVal(fmtS(balance)) : '—'}</div>
              <div style="display:flex;gap:6px;margin-top:6px;justify-content:flex-end">
                <button class="btn btn-sm btn-primary" onclick="openLogBalance('${a.id}','${a.name}')">Log Balance</button>
                <button class="btn btn-sm btn-danger" onclick="deleteAccount('${a.id}')">✕</button>
              </div>
            </div>
          </div>
        </div>`;
      });
    } else {
      html += `<div class="empty-state"><div class="empty-state-icon">📈</div><div class="empty-state-text">No investment accounts yet.<br>Tap "Add Account" to get started.</div></div>`;
    }

    el.innerHTML = html;

    // Fetch live gold price (no API key needed)
    fetch('https://freegoldapi.com/data/latest.json')
      .then(r => r.json())
      .then(data => {
        const entries = Array.isArray(data) ? data : Object.values(data);
        entries.sort((a, b) => new Date(a.date || a.Date) - new Date(b.date || b.Date));
        const latest = entries[entries.length - 1];
        const prev   = entries[entries.length - 2];
        const price  = parseFloat(latest.price || latest.Price || latest.gold || latest.XAU);
        const priceEl  = document.getElementById('gold-price');
        const changeEl = document.getElementById('gold-change');
        if (priceEl && price) {
          priceEl.textContent = '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          if (prev && changeEl) {
            const prevPrice = parseFloat(prev.price || prev.Price || prev.gold || prev.XAU);
            const change = price - prevPrice;
            const changePct = ((change / prevPrice) * 100).toFixed(2);
            changeEl.textContent = (change >= 0 ? '▲' : '▼') + ' $' + Math.abs(change).toFixed(2) + ' (' + Math.abs(changePct) + '%)';
            changeEl.style.color = change >= 0 ? 'var(--green)' : 'var(--red)';
          }
        }
      })
      .catch(() => {
        const el2 = document.getElementById('gold-price');
        if (el2) el2.textContent = 'Unavailable';
      });

    if (chartDates.length > 1) {
      if (_investChart) { _investChart.destroy(); _investChart = null; }
      const ctx = document.getElementById('invest-chart').getContext('2d');
      _investChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartDates.map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
          datasets: [{
            data: chartTotals,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.1)',
            tension: 0.3, fill: true, pointRadius: 3, borderWidth: 2,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#2e3347' } },
            y: { ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => '$' + v.toLocaleString() }, grid: { color: '#2e3347' } },
          }
        }
      });
    }
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error loading</div></div>`;
    showToast(e.message, 'error');
  }
}

function openAddAccount() {
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">Add Investment Account</div>
        <div class="field"><label>Account Name</label><input type="text" id="a-name" placeholder="e.g. Roth IRA, 401k, Brokerage"></div>
        <div class="field"><label>Institution (optional)</label><input type="text" id="a-inst" placeholder="e.g. Fidelity, Vanguard, Robinhood"></div>
        <div class="field"><label>Account Type</label>
          <select id="a-type">${ACCOUNT_TYPES.map(t => `<option>${t}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Current Balance</label><input type="number" id="a-bal" placeholder="0.00" step="0.01" min="0" inputmode="decimal"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitAccount()">Add</button>
        </div>
      </div>
    </div>`;
}

async function submitAccount() {
  const name         = document.getElementById('a-name').value.trim();
  const institution  = document.getElementById('a-inst').value.trim();
  const account_type = document.getElementById('a-type').value;
  const balance      = parseFloat(document.getElementById('a-bal').value || 0);
  if (!name) { showToast('Enter account name', 'error'); return; }
  try {
    const [acct] = await api('POST', 'investment_accounts', '', { user_id: currentUserId, name, institution, account_type });
    if (balance > 0) {
      await api('POST', 'investment_snapshots', '', {
        account_id: acct.id, user_id: currentUserId,
        date: new Date().toISOString().slice(0, 10), balance, contributions: balance
      });
    }
    closeModal(); showToast('Account added', 'success'); loadPortfolio();
  } catch (e) { showToast(e.message, 'error'); }
}

function openLogBalance(accountId, accountName) {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">Log Balance — ${accountName}</div>
        <div class="field"><label>Current Balance</label><input type="number" id="s-bal" placeholder="0.00" step="0.01" min="0" inputmode="decimal"></div>
        <div class="field"><label>Contributions This Period</label><input type="number" id="s-contrib" placeholder="0.00" step="0.01" min="0" value="0" inputmode="decimal"></div>
        <div class="field"><label>Date</label><input type="date" id="s-date" value="${today}"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitSnapshot('${accountId}')">Save</button>
        </div>
      </div>
    </div>`;
}

async function submitSnapshot(accountId) {
  const balance       = parseFloat(document.getElementById('s-bal').value);
  const contributions = parseFloat(document.getElementById('s-contrib').value || 0);
  const date          = document.getElementById('s-date').value;
  if (!balance || !date) { showToast('Fill in balance and date', 'error'); return; }
  try {
    await api('POST', 'investment_snapshots', '', { account_id: accountId, user_id: currentUserId, date, balance, contributions });
    closeModal(); showToast('Balance logged', 'success'); loadPortfolio();
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteAccount(id) {
  if (!confirm('Delete this account and all its history?')) return;
  try {
    await api('DELETE', 'investment_snapshots', `account_id=eq.${id}`);
    await api('DELETE', 'investment_accounts',  `id=eq.${id}`);
    showToast('Deleted', 'success'); loadPortfolio();
  } catch (e) { showToast(e.message, 'error'); }
}

// ─── Monthly Income Goal ──────────────────────────────────────────────────────

function openSetIncome(existingId, currentAmount, currentStart, currentEnd) {
  // Smart defaults: cycle starts on the 25th
  const today = new Date();
  let defaultStart, defaultEnd;
  if (currentStart && currentEnd) {
    defaultStart = currentStart;
    defaultEnd   = currentEnd;
  } else {
    const day = today.getDate();
    if (day >= 25) {
      defaultStart = new Date(today.getFullYear(), today.getMonth(), 25).toISOString().slice(0, 10);
    } else {
      defaultStart = new Date(today.getFullYear(), today.getMonth() - 1, 25).toISOString().slice(0, 10);
    }
    const [sy, sm] = defaultStart.split('-').map(Number);
    defaultEnd = new Date(sy, sm, 24).toISOString().slice(0, 10);
  }

  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">Set Income Cycle</div>
        <div class="field">
          <label>Expected Income Amount</label>
          <input type="number" id="inc-amount" placeholder="0.00" step="0.01" min="0"
            inputmode="decimal" value="${currentAmount || ''}">
        </div>
        <div class="field">
          <label>Cycle Start Date</label>
          <input type="date" id="inc-start" value="${defaultStart}">
        </div>
        <div class="field">
          <label>Cycle End Date</label>
          <input type="date" id="inc-end" value="${defaultEnd}">
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:-8px;margin-bottom:12px">
          e.g. Jan 25 → Feb 24 for a 25th-of-month pay cycle
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitSetIncome('${existingId}')">Save</button>
        </div>
      </div>
    </div>`;
}

async function submitSetIncome(existingId) {
  const amount    = parseFloat(document.getElementById('inc-amount').value);
  const startDate = document.getElementById('inc-start').value;
  const endDate   = document.getElementById('inc-end').value;
  if (!amount || !startDate || !endDate) { showToast('Fill in all fields', 'error'); return; }
  if (startDate >= endDate) { showToast('End date must be after start date', 'error'); return; }
  const monthKey = `${startDate}_${endDate}`;
  try {
    if (existingId) {
      await api('PATCH', 'budgets', `id=eq.${existingId}`, { limit_amount: amount, month: monthKey });
    } else {
      await api('POST', 'budgets', '', { user_id: currentUserId, month: monthKey, category: '__income_goal__', limit_amount: amount });
    }
    closeModal();
    showToast('Income cycle saved', 'success');
    loadDashboard();
  } catch (e) { showToast(e.message, 'error'); }
}

// ─── Markets ──────────────────────────────────────────────────────────────────

const MARKET_CRYPTOS = [
  { sym: 'BTC',  name: 'Bitcoin',   cpSym: 'BTC'  },
  { sym: 'ETH',  name: 'Ethereum',  cpSym: 'ETH'  },
  { sym: 'SOL',  name: 'Solana',    cpSym: 'SOL'  },
  { sym: 'XRP',  name: 'XRP',       cpSym: 'XRP'  },
  { sym: 'BNB',  name: 'BNB',       cpSym: 'BNB'  },
  { sym: 'ADA',  name: 'Cardano',   cpSym: 'ADA'  },
  { sym: 'AVAX', name: 'Avalanche', cpSym: 'AVAX' },
  { sym: 'POL',  name: 'Polygon',   cpSym: 'MATIC' }, // CoinPaprika still uses MATIC
  { sym: 'CRO',  name: 'Cronos',    cpSym: 'CRO'  },
];

function fmtMarketCap(n) {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(1) + 'B';
  return '$' + (n / 1e6).toFixed(0) + 'M';
}

function fetchJSON(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    .then(r => { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); })
    .catch(e => { clearTimeout(t); throw e; });
}

async function loadMarkets() {
  hideFab();
  const el = document.getElementById('markets-content');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const [cpTickersResult, fngResult, cpGlobalResult] = await Promise.allSettled([
      fetchJSON('https://api.coinpaprika.com/v1/tickers?quotes=USD&limit=100'),
      fetchJSON('https://api.alternative.me/fng/'),
      fetchJSON('https://api.coinpaprika.com/v1/global'),
    ]);

    // Build symbol → ticker map from CoinPaprika
    const cpTickers = cpTickersResult.status === 'fulfilled' ? cpTickersResult.value : [];
    const tickerMap = {};
    cpTickers.forEach(t => { tickerMap[t.symbol] = t; });

    const fng      = fngResult.status      === 'fulfilled' ? fngResult.value?.data?.[0] : null;
    const cpGlobal = cpGlobalResult.status === 'fulfilled' ? cpGlobalResult.value : null;

    const updatedAt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let html = `<div class="page-header">
      <span class="section-title">Markets</span>
      <button class="btn btn-sm btn-secondary" onclick="loadMarkets()">↻ Refresh</button>
    </div>
    <div style="font-size:11px;color:var(--muted);text-align:right;margin-bottom:8px">Updated ${updatedAt}</div>`;

    // ── Market Overview (from CoinPaprika global) ──
    if (cpGlobal) {
      const totalMcap = cpGlobal.market_cap_usd;
      const btcDom    = cpGlobal.bitcoin_dominance_percentage;
      html += `<div class="card">
        <div class="card-title">Market Overview</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:3px">Total Market Cap</div>
            <div style="font-size:20px;font-weight:800">${fmtMarketCap(totalMcap)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--muted);margin-bottom:3px">BTC Dominance</div>
            <div style="font-size:16px;font-weight:700;color:var(--yellow)">${btcDom != null ? btcDom.toFixed(1) + '%' : '—'}</div>
          </div>
        </div>
      </div>`;
    }

    // ── Fear & Greed ──
    if (fng) {
      const val      = parseInt(fng.value);
      const label    = fng.value_classification;
      const fngColor = val <= 25 ? 'var(--red)' : val <= 45 ? 'var(--orange)' : val <= 55 ? 'var(--yellow)' : 'var(--green)';
      html += `<div class="card">
        <div class="card-title">Fear & Greed Index</div>
        <div style="display:flex;align-items:center;gap:16px">
          <div style="font-size:40px;font-weight:800;color:${fngColor};line-height:1">${val}</div>
          <div>
            <div style="font-size:16px;font-weight:700;color:${fngColor}">${label}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">Crypto Sentiment</div>
          </div>
        </div>
        <div style="margin-top:12px;background:linear-gradient(to right,#ef4444,#f97316,#f59e0b,#22c55e);border-radius:4px;height:6px;position:relative">
          <div style="position:absolute;top:-4px;left:calc(${val}% - 6px);width:12px;height:12px;background:#fff;border-radius:50%;border:2px solid ${fngColor}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:4px"><span>Fear</span><span>Greed</span></div>
      </div>`;
    }

    // ── Crypto Prices (from CoinPaprika) ──
    html += `<div class="card"><div class="card-title">Crypto</div>`;
    const anyPrices = cpTickers.length > 0;
    if (anyPrices) {
      MARKET_CRYPTOS.forEach(c => {
        const t = tickerMap[c.cpSym];
        if (!t) return;
        const price  = t.quotes?.USD?.price;
        const change = t.quotes?.USD?.percent_change_24h;
        if (price == null) return;
        const priceStr   = price >= 1
          ? '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '$' + price.toFixed(4);
        const changeStr  = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
        const changeColor = change >= 0 ? 'var(--green)' : 'var(--red)';
        html += `<div class="list-item">
          <div class="list-item-left">
            <div class="list-item-title">${c.name}</div>
            <div class="list-item-sub">${c.sym}</div>
          </div>
          <div class="list-item-right">
            <div style="font-size:15px;font-weight:700">${priceStr}</div>
            <div style="font-size:12px;color:${changeColor}">${changeStr}</div>
          </div>
        </div>`;
      });
    } else {
      html += `<div style="color:var(--muted);font-size:13px;padding:8px 0">Prices unavailable — tap refresh</div>`;
    }
    html += `</div>`;

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error loading — tap refresh</div></div>`;
  }

  // Auto-refresh every 60s — restart the timer each call so only one runs at a time
  clearTimeout(_marketsTimer);
  _marketsTimer = setTimeout(loadMarkets, 300000); // CoinPaprika updates every 5 min
}
