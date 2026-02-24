// MyBudget — Personal Finance PWA
const SUPABASE_URL = 'https://ulrdmnzeoswlzuyxxzbx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yWV0O6uMKoc7E3BHmKPmiw_dIqDsN21';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mybudget-auth' }
});

let authToken = null;
let currentUserId = null;

const EXPENSE_CATS = ['Housing','Food & Dining','Transportation','Utilities','Healthcare','Entertainment','Shopping','Personal Care','Education','Travel','Subscriptions','Other'];
const INCOME_CATS = ['Salary','Freelance','Investment Returns','Business','Gift','Tax Refund','Other Income'];
const ACCOUNT_TYPES = ['401k','Roth IRA','Traditional IRA','Brokerage','HSA','Crypto','Savings Bond','Other'];

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
  document.getElementById('tab-bar').style.display = 'none';
  document.getElementById('content').style.display = 'none';
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-header').style.display = '';
  document.getElementById('tab-bar').style.display = '';
  document.getElementById('content').style.display = '';
  document.getElementById('header-right').innerHTML =
    `<button class="logout-btn" onclick="doLogout()">Logout</button>`;
  const saved = localStorage.getItem('mybudget-tab') || 'dashboard';
  activateTab(saved);
}

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
function pct(a, b)   { return b ? Math.min(100, Math.round((a / b) * 100)) : 0; }
function currMonth() { return new Date().toISOString().slice(0, 7); }
function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}
function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  const next = new Date(y, m, 1).toISOString().slice(0, 7);
  return `date=gte.${ym}-01&date=lt.${next}-01`;
}
function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 2, 1).toISOString().slice(0, 7);
}
function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 1).toISOString().slice(0, 7);
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
    activateTab(btn.dataset.tab);
    localStorage.setItem('mybudget-tab', btn.dataset.tab);
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
  switch (tab) {
    case 'dashboard':    loadDashboard();    break;
    case 'transactions': loadTransactions(); break;
    case 'budget':       loadBudget();       break;
    case 'savings':      loadSavings();      break;
    case 'investments':  loadInvestments();  break;
  }
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

let _dashMonth = currMonth();

async function loadDashboard() {
  hideFab();
  const el = document.getElementById('dash-content');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const mr = monthRange(_dashMonth);
    const [txns, budgets, goals, snapshots] = await Promise.all([
      api('GET', 'transactions', `user_id=eq.${currentUserId}&${mr}&select=*&order=date.desc`),
      api('GET', 'budgets',      `user_id=eq.${currentUserId}&month=eq.${_dashMonth}&select=*`),
      api('GET', 'savings_goals', `user_id=eq.${currentUserId}&select=*`),
      api('GET', 'investment_snapshots', `user_id=eq.${currentUserId}&select=*&order=date.desc`),
    ]);

    const incomeGoalRow = budgets.find(b => b.category === '__income_goal__');
    const incomeGoal    = incomeGoalRow ? parseFloat(incomeGoalRow.limit_amount) : null;

    const income   = txns.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
    const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
    const net      = income - expenses;

    // Net worth
    const latestByAcct = {};
    snapshots.forEach(s => { if (latestByAcct[s.account_id] == null) latestByAcct[s.account_id] = parseFloat(s.balance); });
    const investTotal  = Object.values(latestByAcct).reduce((a, b) => a + b, 0);
    const savingsTotal = goals.reduce((s, g) => s + parseFloat(g.current_amount || 0), 0);
    const netWorth     = investTotal + savingsTotal;

    // Spending by category
    const byCat = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
      byCat[t.category] = (byCat[t.category] || 0) + parseFloat(t.amount);
    });
    const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Budget alerts (exclude income goal row)
    const alerts = budgets.filter(b => b.category !== '__income_goal__' && (byCat[b.category] || 0) >= parseFloat(b.limit_amount) * 0.85);

    let html = `
      <div class="nw-banner">
        <div class="nw-label">Net Worth</div>
        <div class="nw-value">${fmtS(netWorth)}</div>
      </div>
      <div class="month-bar">
        <button class="month-nav" onclick="_dashMonth=prevMonth(_dashMonth);loadDashboard()">&#8249;</button>
        <span class="month-label">${monthLabel(_dashMonth)}</span>
        <button class="month-nav" onclick="_dashMonth=nextMonth(_dashMonth);loadDashboard()">&#8250;</button>
      </div>
      <div class="stat-row">
        <div class="stat-card"><div class="stat-label">Income</div><div class="stat-value green">${fmtS(income)}</div></div>
        <div class="stat-card"><div class="stat-label">Expenses</div><div class="stat-value red">${fmtS(expenses)}</div></div>
        <div class="stat-card"><div class="stat-label">Net</div><div class="stat-value ${net >= 0 ? 'green' : 'red'}">${net >= 0 ? '' : '-'}${fmtS(Math.abs(net))}</div></div>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${incomeGoal ? '10px' : '0'}">
          <div>
            <div class="card-title" style="margin-bottom:2px">Expected Income</div>
            ${incomeGoal
              ? `<div style="font-size:22px;font-weight:800;color:var(--green)">${fmtS(incomeGoal)}</div>`
              : `<div style="font-size:13px;color:var(--muted)">Not set for this month</div>`}
          </div>
          <button class="btn btn-sm btn-secondary" onclick="openSetIncome('${_dashMonth}','${incomeGoalRow ? incomeGoalRow.id : ''}',${incomeGoal || 0})">${incomeGoal ? 'Edit' : 'Set Income'}</button>
        </div>
        ${incomeGoal ? `
        <div class="progress-bar"><div class="progress-fill ${pct(income,incomeGoal) >= 100 ? 'safe' : 'warn'}" style="width:${pct(income,incomeGoal)}%"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-top:4px">
          <span>Received: ${fmtS(income)}</span>
          <span>${pct(income,incomeGoal)}% of expected</span>
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

    if (topCats.length) {
      html += `<div class="card"><div class="card-title">Top Spending</div>`;
      topCats.forEach(([cat, amt]) => {
        const budget = budgets.find(b => b.category === cat);
        const limit  = budget ? parseFloat(budget.limit_amount) : null;
        const p      = limit ? pct(amt, limit) : null;
        html += `<div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:13px;color:var(--text)">${cat}</span>
            <span style="font-size:13px;font-weight:700;color:var(--red)">${fmtS(amt)}</span>
          </div>
          ${p !== null ? `<div class="progress-bar"><div class="progress-fill ${p >= 100 ? 'over' : p >= 80 ? 'warn' : 'safe'}" style="width:${p}%"></div></div>
          <div style="font-size:11px;color:var(--muted)">of ${fmtS(limit)} budget · ${p}%</div>` : ''}
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
            <span style="font-size:12px;color:var(--muted)">${fmtS(g.current_amount)} / ${fmtS(g.target_amount)}</span>
          </div>
          <div class="progress-bar"><div class="progress-fill safe" style="width:${p}%"></div></div>
        </div>`;
      });
      html += `</div>`;
    }

    if (!txns.length && !goals.length) {
      html += `<div class="empty-state">
        <div class="empty-state-icon">💰</div>
        <div class="empty-state-text">No data yet.<br>Add your first transaction to get started.</div>
      </div>`;
    }

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error loading dashboard</div></div>`;
    showToast(e.message, 'error');
  }
}

// ─── Transactions ─────────────────────────────────────────────────────────────

let _txnMonth  = currMonth();
let _txnFilter = 'all';

async function loadTransactions() {
  showFab();
  const el = document.getElementById('txn-content');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const allTxns = await api('GET', 'transactions',
      `user_id=eq.${currentUserId}&${monthRange(_txnMonth)}&select=*&order=date.desc,created_at.desc`);

    const income   = allTxns.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
    const expenses = allTxns.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
    const txns     = _txnFilter === 'all' ? allTxns : allTxns.filter(t => t.type === _txnFilter);

    let html = `
      <div class="month-bar">
        <button class="month-nav" onclick="_txnMonth=prevMonth(_txnMonth);loadTransactions()">&#8249;</button>
        <span class="month-label">${monthLabel(_txnMonth)}</span>
        <button class="month-nav" onclick="_txnMonth=nextMonth(_txnMonth);loadTransactions()">&#8250;</button>
      </div>
      <div class="stat-row two" style="margin-bottom:10px">
        <div class="stat-card"><div class="stat-label">Income</div><div class="stat-value green">${fmtS(income)}</div></div>
        <div class="stat-card"><div class="stat-label">Expenses</div><div class="stat-value red">${fmtS(expenses)}</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button class="btn btn-sm ${_txnFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="_txnFilter='all';loadTransactions()">All</button>
        <button class="btn btn-sm ${_txnFilter === 'income' ? 'btn-primary' : 'btn-secondary'}" onclick="_txnFilter='income';loadTransactions()">Income</button>
        <button class="btn btn-sm ${_txnFilter === 'expense' ? 'btn-primary' : 'btn-secondary'}" onclick="_txnFilter='expense';loadTransactions()">Expenses</button>
      </div>`;

    if (txns.length) {
      // Group by date
      const byDate = {};
      txns.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });
      Object.entries(byDate).forEach(([date, items]) => {
        const d = new Date(date + 'T12:00:00');
        const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        html += `<div style="font-size:11px;color:var(--muted);margin:8px 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
          <div class="card" style="padding:0 14px">`;
        items.forEach(t => {
          html += `<div class="list-item">
            <div class="list-item-left">
              <div class="list-item-title">${t.description || t.category}</div>
              <div class="list-item-sub"><span class="cat-tag">${t.category}</span></div>
            </div>
            <div class="list-item-right" style="display:flex;align-items:center;gap:8px">
              <span class="${t.type === 'income' ? 'amount-income' : 'amount-expense'}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}</span>
              <button class="btn btn-sm btn-danger" onclick="deleteTxn('${t.id}')">✕</button>
            </div>
          </div>`;
        });
        html += `</div>`;
      });
    } else {
      html += `<div class="empty-state"><div class="empty-state-icon">💸</div><div class="empty-state-text">No transactions this month.<br>Tap + to add one.</div></div>`;
    }

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error loading</div></div>`;
    showToast(e.message, 'error');
  }
}

let _txnModalType = 'expense';

function openAddTxn() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">Add Transaction</div>
        <div class="type-toggle">
          <button id="tt-exp" class="active-expense" onclick="setTxnModalType('expense')">Expense</button>
          <button id="tt-inc" onclick="setTxnModalType('income')">Income</button>
        </div>
        <div class="field"><label>Amount</label><input type="number" id="t-amount" placeholder="0.00" step="0.01" min="0" inputmode="decimal"></div>
        <div class="field"><label>Category</label><select id="t-cat">${EXPENSE_CATS.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Date</label><input type="date" id="t-date" value="${today}"></div>
        <div class="field"><label>Description (optional)</label><input type="text" id="t-desc" placeholder="e.g. Grocery run, Netflix"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitTxn()">Add</button>
        </div>
      </div>
    </div>`;
  _txnModalType = 'expense';
}

function setTxnModalType(type) {
  _txnModalType = type;
  document.getElementById('tt-exp').className = type === 'expense' ? 'active-expense' : '';
  document.getElementById('tt-inc').className = type === 'income'  ? 'active-income'  : '';
  const cats = type === 'expense' ? EXPENSE_CATS : INCOME_CATS;
  document.getElementById('t-cat').innerHTML = cats.map(c => `<option>${c}</option>`).join('');
}

async function submitTxn() {
  const amount   = parseFloat(document.getElementById('t-amount').value);
  const category = document.getElementById('t-cat').value;
  const date     = document.getElementById('t-date').value;
  const description = document.getElementById('t-desc').value.trim();
  if (!amount || !date) { showToast('Enter amount and date', 'error'); return; }
  try {
    await api('POST', 'transactions', '', { user_id: currentUserId, type: _txnModalType, amount, category, date, description });
    closeModal();
    showToast('Transaction added', 'success');
    loadTransactions();
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

// ─── Budget ──────────────────────────────────────────────────────────────────

let _budgetMonth = currMonth();

async function loadBudget() {
  hideFab();
  const el = document.getElementById('budget-content');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const [budgets, txns] = await Promise.all([
      api('GET', 'budgets',      `user_id=eq.${currentUserId}&month=eq.${_budgetMonth}&select=*&order=category`),
      api('GET', 'transactions', `user_id=eq.${currentUserId}&${monthRange(_budgetMonth)}&type=eq.expense&select=category,amount`),
    ]);

    const expenseBudgets = budgets.filter(b => b.category !== '__income_goal__');
    const spentByCat  = {};
    txns.forEach(t => { spentByCat[t.category] = (spentByCat[t.category] || 0) + parseFloat(t.amount); });
    const totalBudget = expenseBudgets.reduce((s, b) => s + parseFloat(b.limit_amount), 0);
    const totalSpent  = expenseBudgets.reduce((s, b) => s + (spentByCat[b.category] || 0), 0);

    let html = `
      <div class="month-bar">
        <button class="month-nav" onclick="_budgetMonth=prevMonth(_budgetMonth);loadBudget()">&#8249;</button>
        <span class="month-label">${monthLabel(_budgetMonth)}</span>
        <button class="month-nav" onclick="_budgetMonth=nextMonth(_budgetMonth);loadBudget()">&#8250;</button>
      </div>`;

    if (totalBudget > 0) {
      const p = pct(totalSpent, totalBudget);
      html += `<div class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:13px;color:var(--muted)">Total Budget</span>
          <span style="font-size:13px;font-weight:700">${fmtS(totalSpent)} / ${fmtS(totalBudget)}</span>
        </div>
        <div class="progress-bar" style="height:12px">
          <div class="progress-fill ${p >= 100 ? 'over' : p >= 80 ? 'warn' : 'safe'}" style="width:${p}%"></div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">${p}% used · ${fmtS(Math.max(0, totalBudget - totalSpent))} remaining</div>
      </div>`;
    }

    html += `<div class="page-header">
      <span class="section-title">Categories</span>
      <button class="btn btn-primary btn-sm" onclick="openSetBudget()">+ Set Budget</button>
    </div>`;

    if (expenseBudgets.length) {
      expenseBudgets.forEach(b => {
        const spent = spentByCat[b.category] || 0;
        const limit = parseFloat(b.limit_amount);
        const p     = pct(spent, limit);
        const cls   = p >= 100 ? 'over' : p >= 80 ? 'warn' : 'safe';
        const remaining = limit - spent;
        html += `<div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-size:15px;font-weight:700">${b.category}</span>
            <div style="display:flex;gap:6px;align-items:center">
              <span class="badge ${p >= 100 ? 'badge-red' : p >= 80 ? 'badge-yellow' : 'badge-green'}">${p}%</span>
              <button class="btn btn-sm btn-secondary" onclick="openEditBudget('${b.id}','${b.category}',${limit})">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteBudget('${b.id}')">✕</button>
            </div>
          </div>
          <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${p}%"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-top:4px">
            <span>Spent: ${fmtS(spent)}</span>
            <span>Limit: ${fmtS(limit)}</span>
            <span style="color:${remaining >= 0 ? 'var(--green)' : 'var(--red)'}">
              ${remaining >= 0 ? 'Left: ' + fmtS(remaining) : 'Over: ' + fmtS(Math.abs(remaining))}
            </span>
          </div>
        </div>`;
      });
    } else {
      html += `<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No budgets set for this month.<br>Tap "Set Budget" to add one.</div></div>`;
    }

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error loading</div></div>`;
    showToast(e.message, 'error');
  }
}

function openSetBudget() {
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">Set Budget</div>
        <div class="field"><label>Category</label>
          <select id="b-cat">${EXPENSE_CATS.map(c => `<option>${c}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Monthly Limit</label><input type="number" id="b-limit" placeholder="0.00" step="0.01" min="0" inputmode="decimal"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitBudget()">Save</button>
        </div>
      </div>
    </div>`;
}

function openEditBudget(id, cat, amount) {
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">Edit Budget</div>
        <div class="field"><label>Category</label>
          <input type="text" value="${cat}" disabled style="opacity:0.6">
        </div>
        <div class="field"><label>Monthly Limit</label><input type="number" id="b-limit" step="0.01" min="0" value="${amount}" inputmode="decimal"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitEditBudget('${id}')">Save</button>
        </div>
      </div>
    </div>`;
}

async function submitBudget() {
  const cat   = document.getElementById('b-cat').value;
  const limit = parseFloat(document.getElementById('b-limit').value);
  if (!limit) { showToast('Enter a limit', 'error'); return; }
  try {
    await api('POST', 'budgets', '', { user_id: currentUserId, month: _budgetMonth, category: cat, limit_amount: limit });
    closeModal(); showToast('Budget set', 'success'); loadBudget();
  } catch (e) { showToast(e.message, 'error'); }
}

async function submitEditBudget(id) {
  const limit = parseFloat(document.getElementById('b-limit').value);
  if (!limit) { showToast('Enter a limit', 'error'); return; }
  try {
    await api('PATCH', 'budgets', `id=eq.${id}`, { limit_amount: limit });
    closeModal(); showToast('Budget updated', 'success'); loadBudget();
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteBudget(id) {
  if (!confirm('Delete this budget?')) return;
  try {
    await api('DELETE', 'budgets', `id=eq.${id}`);
    showToast('Deleted', 'success'); loadBudget();
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
          <span style="font-weight:700;color:var(--green)">${fmt(totalSaved)}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--muted);font-size:13px">Total Target</span>
          <span style="font-weight:700">${fmt(totalTarget)}</span>
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
            <span style="color:var(--green);font-weight:700">${fmt(g.current_amount)}</span>
            <span style="color:var(--muted)">of ${fmt(g.target_amount)}</span>
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

async function loadInvestments() {
  hideFab();
  const el = document.getElementById('invest-content');
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
    <div class="nw-banner" style="margin-bottom:12px">
      <div class="nw-label">Total Portfolio</div>
      <div class="nw-value">${fmtS(total)}</div>
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
              <div style="font-size:22px;font-weight:800;color:var(--green)">${balance != null ? fmtS(balance) : '—'}</div>
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
    closeModal(); showToast('Account added', 'success'); loadInvestments();
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
    closeModal(); showToast('Balance logged', 'success'); loadInvestments();
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteAccount(id) {
  if (!confirm('Delete this account and all its history?')) return;
  try {
    await api('DELETE', 'investment_snapshots', `account_id=eq.${id}`);
    await api('DELETE', 'investment_accounts',  `id=eq.${id}`);
    showToast('Deleted', 'success'); loadInvestments();
  } catch (e) { showToast(e.message, 'error'); }
}

// ─── Monthly Income Goal ──────────────────────────────────────────────────────

function openSetIncome(month, existingId, currentAmount) {
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">Expected Income — ${monthLabel(month)}</div>
        <div class="field">
          <label>Total Expected Income This Month</label>
          <input type="number" id="inc-amount" placeholder="0.00" step="0.01" min="0"
            inputmode="decimal" value="${currentAmount || ''}">
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitSetIncome('${month}','${existingId}')">Save</button>
        </div>
      </div>
    </div>`;
}

async function submitSetIncome(month, existingId) {
  const amount = parseFloat(document.getElementById('inc-amount').value);
  if (!amount) { showToast('Enter an amount', 'error'); return; }
  try {
    if (existingId) {
      await api('PATCH', 'budgets', `id=eq.${existingId}`, { limit_amount: amount });
    } else {
      await api('POST', 'budgets', '', { user_id: currentUserId, month, category: '__income_goal__', limit_amount: amount });
    }
    closeModal();
    showToast('Income goal saved', 'success');
    loadDashboard();
  } catch (e) { showToast(e.message, 'error'); }
}
