/* ============================================================
 * yellowyellow.co — Back-office admin app
 * Vanilla JS, no framework. Charts via Chart.js (CDN).
 * Views: dashboard, sales, inventory, employees, expenses,
 *        suppliers, products, reports, settings
 * ============================================================ */

(function () {
  'use strict';

  const cfg = window.YY_CONFIG;
  const { STORES, STORE_IDS, PAYMENT_METHODS, ORDER_TYPES, SUPPLIERS, EMPLOYEES, fmt } = cfg;
  const { baht, numTH, todayISO, fmtDateTH } = fmt;
  const MENUS = window.YY_MENUS;
  const INV   = window.YY_INVENTORY;
  const api   = window.YY_API;

  /* ---------- State ---------- */
  const state = {
    storeId: localStorage.getItem('yy.activeStore') || 'nmtun',
    view:    localStorage.getItem('yy.adminView') || 'dashboard',
    theme:   localStorage.getItem('yy.theme') || 'light',
    range:   localStorage.getItem('yy.range') || '7d',     // 7d | 30d | 90d | today
    search:  '',
    invFilter: 'all',  // all | low | out
    expenseDraft: null,
    employeeDraft: null,
    supplierDraft: null,
    productDraft: null,
  };

  const VIEWS = [
    { id: 'dashboard', label: 'แดชบอร์ด',     icon: '📊' },
    { id: 'sales',     label: 'ยอดขาย',        icon: '💰' },
    { id: 'orders',    label: 'ออเดอร์',       icon: '🧾' },
    { id: 'products',  label: 'สินค้า / เมนู', icon: '🍜' },
    { id: 'inventory', label: 'สต็อกวัตถุดิบ', icon: '📦' },
    { id: 'expenses',  label: 'ค่าใช้จ่าย',     icon: '💸' },
    { id: 'employees', label: 'พนักงาน',       icon: '👥' },
    { id: 'suppliers', label: 'ซัพพลายเออร์',  icon: '🚚' },
    { id: 'reports',   label: 'รายงาน',        icon: '📈' },
    { id: 'settings',  label: 'ตั้งค่า',        icon: '⚙️' },
  ];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function escAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }

  /* ---------- Theme ---------- */
  function applyTheme() {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
    document.documentElement.classList.toggle('light', state.theme === 'light');
    const toggle = $('#theme_toggle');
    if (toggle) toggle.classList.toggle('on', state.theme === 'dark');
    applyAccent();
  }
  function applyAccent() {
    const s = STORES[state.storeId];
    const hue = s.accentHue;
    const isDark = state.theme === 'dark';
    const l = isDark ? 72 : 60;
    const root = document.documentElement.style;
    root.setProperty('--accent',      `oklch(${l}% 0.16 ${hue})`);
    root.setProperty('--accent-soft', isDark ? `oklch(28% 0.07 ${hue})` : `oklch(95% 0.04 ${hue})`);
    root.setProperty('--accent-ink',  isDark ? `oklch(85% 0.10 ${hue})` : `oklch(40% 0.18 ${hue})`);
  }

  /* ---------- Toast ---------- */
  let toastTm;
  function toast(msg, kind) {
    const t = $('#yy-toast');
    t.className = 'yy-toast show ' + (kind || 'info');
    $('#yy-toast-msg').textContent = msg;
    clearTimeout(toastTm);
    toastTm = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- Data accessors ---------- */
  function getAllRecords()                  { return STORE_IDS.flatMap(id => api.getRecords(id)); }
  function getRecordsForStore(id)           { return api.getRecords(id); }
  function dateRangeCutoff() {
    const d = new Date();
    if (state.range === 'today') return todayISO();
    const days = state.range === '7d' ? 7 : state.range === '30d' ? 30 : 90;
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }
  function filterByRange(records) {
    const cut = dateRangeCutoff();
    return records.filter(r => (r.dateISO || '') >= cut);
  }

  /* ---------- Shell ---------- */
  function renderShell() {
    // Store switcher
    $('#store_switcher').innerHTML = STORE_IDS.map(id => {
      const s = STORES[id];
      const active = id === state.storeId;
      return `<button class="nav-item ${active ? 'active' : ''}" data-store="${id}">
        <span style="font-size:18px">${s.badge}</span>
        <span class="flex-1 text-left">${escHtml(s.shortName)}</span>
        ${active ? '<span style="font-size:8px">●</span>' : ''}
      </button>`;
    }).join('');

    // View nav
    $('#view_nav').innerHTML =
      `<div class="text-[10.5px] font-semibold muted-2 tracking-widest px-2 mb-2 mt-2">เมนู</div>` +
      VIEWS.map(v => `<button class="nav-item ${state.view === v.id ? 'active' : ''}" data-view="${v.id}">
        <span style="font-size:16px">${v.icon}</span><span>${v.label}</span>
      </button>`).join('');

    // Mobile bottom tabs (5 most-used)
    $('#mobile_tabs').innerHTML = VIEWS.slice(0, 5).map(v => `
      <button class="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg ${state.view === v.id ? 'text-accent-ink bg-accent-soft' : 'muted'}" data-view="${v.id}">
        <span style="font-size:18px">${v.icon}</span>
        <span class="text-[10.5px] font-medium">${v.label}</span>
      </button>
    `).join('');

    // Topbar
    const s = STORES[state.storeId];
    const av = $('#nav_avatar'); if (av) av.textContent = s.badge;
    const us = $('#nav_user_sub'); if (us) us.textContent = s.shortName + ' workspace';

    // API connection pill
    const hp = $('#topbar_hook');
    if (api.apiUrl()) {
      hp.className = 'pill pill-pos hidden lg:inline-flex';
      hp.innerHTML = '✓ เชื่อมต่อแล้ว';
    } else {
      hp.className = 'pill pill-warn hidden lg:inline-flex';
      hp.innerHTML = '⚠ ยังไม่ได้ตั้งค่า';
      hp.onclick = () => switchView('settings');
    }

    // Alerts count
    const alerts = computeAlerts();
    const badge = $('#alert_badge');
    if (alerts.length) {
      badge.style.display = 'flex';
      badge.textContent = alerts.length > 99 ? '99+' : alerts.length;
    } else {
      badge.style.display = 'none';
    }
  }

  function computeAlerts() {
    const all = [];
    STORE_IDS.forEach(id => {
      const inv = api.getInventoryState(id);
      Object.keys(inv).forEach(name => {
        if (inv[name] === 'low' || inv[name] === 'out')
          all.push({ store: id, name, state: inv[name] });
      });
    });
    return all;
  }

  function bindShell() {
    $$('[data-store]').forEach(b => b.onclick = () => switchStore(b.dataset.store));
    $$('[data-view]').forEach(b => b.onclick = () => switchView(b.dataset.view));
    $('#theme_toggle').onclick = () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('yy.theme', state.theme);
      applyTheme();
    };
    $('#btn_sidebar').onclick = () => {
      const side = $('aside.side');
      const bd = $('.mobile-backdrop');
      side.classList.toggle('mobile-open');
      bd.classList.toggle('show');
    };
    $('#mb_bd').onclick = () => {
      $('aside.side').classList.remove('mobile-open');
      $('.mobile-backdrop').classList.remove('show');
    };
    $('#topbar_search').oninput = (e) => { state.search = e.target.value; renderView(); };
    $('#btn_alerts').onclick = () => switchView('inventory');
    $('#user_chip').onclick = () => switchView('settings');
  }

  function switchStore(id) {
    if (!STORES[id]) return;
    state.storeId = id;
    localStorage.setItem('yy.activeStore', id);
    applyAccent();
    renderShell();
    renderView();
  }
  function switchView(v) {
    if (!VIEWS.find(x => x.id === v)) return;
    state.view = v;
    localStorage.setItem('yy.adminView', v);
    renderShell();
    renderView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    $('aside.side').classList.remove('mobile-open');
    $('.mobile-backdrop').classList.remove('show');
  }

  /* ---------- View dispatcher ---------- */
  const VIEW_RENDERERS = {};
  function renderView() {
    const root = $('#view');
    const fn = VIEW_RENDERERS[state.view] || VIEW_RENDERERS.dashboard;
    root.innerHTML = '<div class="muted text-center py-12"><span class="spin"></span> กำลังโหลด...</div>';
    setTimeout(() => fn(root), 20);
  }

  /* ============================================================
   *  VIEW: DASHBOARD
   * ============================================================ */
  VIEW_RENDERERS.dashboard = function (root) {
    const s = STORES[state.storeId];
    const all = filterByRange(getRecordsForStore(state.storeId));
    const paid = all.filter(r => r.status === 'paid');
    const revenue = paid.reduce((a, r) => a + (r.total || 0), 0);
    const orderCount = all.length;
    const avgTicket = paid.length ? Math.round(revenue / paid.length) : 0;
    const cancel = all.filter(r => r.status === 'cancel').length;

    // Compare with previous period
    const days = state.range === 'today' ? 1 : state.range === '7d' ? 7 : state.range === '30d' ? 30 : 90;
    const prevStart = new Date(); prevStart.setDate(prevStart.getDate() - days * 2);
    const prevEnd = new Date(); prevEnd.setDate(prevEnd.getDate() - days);
    const prev = getRecordsForStore(state.storeId).filter(r => r.dateISO >= prevStart.toISOString().slice(0,10) && r.dateISO < prevEnd.toISOString().slice(0,10) && r.status === 'paid');
    const prevRev = prev.reduce((a, r) => a + (r.total || 0), 0);
    const trend = prevRev ? Math.round((revenue - prevRev) / prevRev * 100) : 0;

    const target = s.target;
    const targetPct = target ? Math.min(100, Math.round(revenue / target * 100)) : 0;

    // Top items
    const counter = {};
    paid.forEach(r => (r.items || []).forEach(it => {
      counter[it.th] = counter[it.th] || { name: it.th, qty: 0, revenue: 0 };
      counter[it.th].qty += (it.qty || 1);
      counter[it.th].revenue += (it.total || 0);
    }));
    const topItems = Object.values(counter).sort((a, b) => b.qty - a.qty).slice(0, 8);
    const maxQty = topItems[0]?.qty || 1;

    // Payment breakdown
    const payBreak = {};
    paid.forEach(r => {
      const k = r.paymentMethod || 'unknown';
      payBreak[k] = (payBreak[k] || 0) + (r.total || 0);
    });

    // Expenses
    const expenses = api.getExpenses(state.storeId).filter(e => e.dateISO >= dateRangeCutoff());
    const expenseTotal = expenses.reduce((a, e) => a + (+e.amount || 0), 0);
    const grossProfit = revenue - expenseTotal;
    const margin = revenue ? Math.round(grossProfit / revenue * 100) : 0;

    // Render
    root.innerHTML = `
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight" style="font-family:var(--font-display)">แดชบอร์ดผู้บริหาร</h1>
          <p class="muted text-sm mt-1">${s.badge} ${s.name} · ${s.sub || s.tagline}</p>
        </div>
        <div class="flex items-center gap-2">
          ${rangePicker()}
          <button class="btn btn-soft" id="dash_export">📥 ส่งออก CSV</button>
        </div>
      </div>

      <!-- Pastel KPIs -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${pkpi('💰', 'รายได้', baht(revenue), `${paid.length} บิล · ${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}%`, '180 60% 0.10')}
        ${pkpi('🧾', 'จำนวนออเดอร์', numTH(orderCount), `เฉลี่ย ${baht(avgTicket)}/บิล · ยกเลิก ${cancel}`, '50 80% 0.10')}
        ${pkpi('🎯', 'เป้าหมายช่วง', `${targetPct}%`, `${baht(target)} เป้า · ขาด ${baht(Math.max(0, target - revenue))}`, '280 50% 0.10')}
        ${pkpi('📈', 'กำไรขั้นต้น', baht(grossProfit), `Margin ${margin}% · ค่าใช้จ่าย ${baht(expenseTotal)}`, '155 60% 0.10')}
      </div>

      <!-- Charts row -->
      <div class="grid lg:grid-cols-3 gap-4 mb-6">
        <div class="card p-5 lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-[15px]" style="font-family:var(--font-display)">ยอดขายรายวัน</h3>
            <div class="pill pill-accent">${state.range === 'today' ? 'วันนี้' : state.range}</div>
          </div>
          <canvas id="dash_revenue_chart" style="max-height:240px"></canvas>
        </div>

        <div class="card p-5">
          <h3 class="font-semibold text-[15px] mb-4" style="font-family:var(--font-display)">วิธีชำระเงิน</h3>
          <canvas id="dash_pay_chart" style="max-height:240px"></canvas>
          <div class="mt-3 space-y-1 text-[12.5px]">
            ${Object.entries(payBreak).map(([k, v]) => {
              const p = PAYMENT_METHODS.find(p => p.id === k) || { label: k, icon: '?' };
              return `<div class="flex justify-between"><span>${p.icon} ${p.label}</span><span class="num font-semibold">${baht(v)}</span></div>`;
            }).join('') || '<div class="muted-2 text-center py-4">ยังไม่มีข้อมูล</div>'}
          </div>
        </div>
      </div>

      <!-- Top items + alerts -->
      <div class="grid lg:grid-cols-3 gap-4 mb-6">
        <div class="card p-5 lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-[15px]" style="font-family:var(--font-display)">เมนูขายดี</h3>
            <span class="muted text-xs">${state.range}</span>
          </div>
          ${topItems.length === 0 ? '<div class="muted-2 text-center py-8">ยังไม่มีข้อมูล</div>' :
            topItems.map((it, i) => `
              <div class="relative p-2 mb-1 rounded-lg">
                <div class="absolute inset-0 rounded-lg" style="background:var(--accent-soft);width:${it.qty/maxQty*100}%;z-index:0"></div>
                <div class="relative z-10 grid grid-cols-[24px_1fr_auto_auto] items-center gap-3 text-[13.5px]">
                  <span class="muted-2 mono font-bold">${i+1}</span>
                  <span class="font-medium truncate">${escHtml(it.name)}</span>
                  <span class="muted text-xs">${baht(it.revenue)}</span>
                  <span class="num font-bold accent">${it.qty}</span>
                </div>
              </div>
            `).join('')}
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-[15px]" style="font-family:var(--font-display)">แจ้งเตือนวัตถุดิบ</h3>
            <button class="text-xs accent font-semibold" onclick="window.__yyAdmin.switchView('inventory')">ดูทั้งหมด →</button>
          </div>
          ${(() => {
            const inv = api.getInventoryState(state.storeId);
            const low = Object.keys(inv).filter(k => inv[k] === 'low');
            const out = Object.keys(inv).filter(k => inv[k] === 'out');
            if (!low.length && !out.length) return '<div class="muted-2 text-center py-6 text-sm">✓ วัตถุดิบครบ</div>';
            return `
              ${out.length ? `<div class="mb-3"><div class="text-[11.5px] font-bold uppercase tracking-wider mb-1.5" style="color:var(--neg)">หมด · ${out.length}</div>${out.slice(0,8).map(n=>`<span class="ic-chip out mr-1 mb-1">${escHtml(n)}</span>`).join('')}</div>` : ''}
              ${low.length ? `<div><div class="text-[11.5px] font-bold uppercase tracking-wider mb-1.5" style="color:var(--warn)">ใกล้หมด · ${low.length}</div>${low.slice(0,8).map(n=>`<span class="ic-chip low mr-1 mb-1">${escHtml(n)}</span>`).join('')}</div>` : ''}
            `;
          })()}
        </div>
      </div>

      <!-- Multi-store comparison -->
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-[15px]" style="font-family:var(--font-display)">เปรียบเทียบทุกร้าน</h3>
          <span class="muted text-xs">${state.range}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="tbl">
            <thead><tr><th>ร้าน</th><th class="text-right">รายได้</th><th class="text-right">ออเดอร์</th><th class="text-right">บิลเฉลี่ย</th><th class="text-right">เป้า %</th><th class="text-right">สัดส่วน</th></tr></thead>
            <tbody>
              ${(() => {
                const rows = STORE_IDS.map(id => {
                  const s2 = STORES[id];
                  const list = filterByRange(getRecordsForStore(id)).filter(r => r.status === 'paid');
                  const rev = list.reduce((a, r) => a + (r.total || 0), 0);
                  const avg = list.length ? Math.round(rev / list.length) : 0;
                  return { id, s: s2, rev, count: list.length, avg, pct: s2.target ? Math.round(rev / s2.target * 100) : 0 };
                });
                const totalRev = rows.reduce((a, r) => a + r.rev, 0) || 1;
                return rows.map(r => `
                  <tr>
                    <td><span class="font-semibold">${r.s.badge} ${escHtml(r.s.name)}</span></td>
                    <td class="text-right num font-bold">${baht(r.rev)}</td>
                    <td class="text-right num">${r.count}</td>
                    <td class="text-right num muted">${baht(r.avg)}</td>
                    <td class="text-right num">${r.pct}%</td>
                    <td class="text-right num">
                      <div style="background:var(--surface-2);border-radius:999px;height:6px;overflow:hidden;width:80px;margin-left:auto">
                        <div style="background:var(--accent);height:100%;width:${r.rev/totalRev*100}%"></div>
                      </div>
                    </td>
                  </tr>
                `).join('');
              })()}
            </tbody>
          </table>
        </div>
      </div>
    `;

    bindRangePicker();
    $('#dash_export').onclick = () => exportRecordsCSV(state.storeId);
    drawRevenueChart(filterByRange(getRecordsForStore(state.storeId)));
    drawPayChart(payBreak);
  };

  function pkpi(icon, label, value, sub, tone) {
    // tone is "hue chromaL%" ish — convert to oklch parameters
    const [h, l, c] = tone.split(' ');
    return `
      <div class="pkpi" style="--p-tone: oklch(${l} ${c} ${h})">
        <div class="pkpi-ic">${icon}</div>
        <div class="pkpi-eyebrow">${label}</div>
        <div class="pkpi-value num">${value}</div>
        <div class="pkpi-sub">${sub}</div>
      </div>
    `;
  }
  function rangePicker() {
    const opts = [
      { id: 'today', label: 'วันนี้' },
      { id: '7d',    label: '7 วัน' },
      { id: '30d',   label: '30 วัน' },
      { id: '90d',   label: '90 วัน' },
    ];
    return `<div class="flex bg-surface-2 surface-2 rounded-xl p-1 border hairline" id="range_picker">
      ${opts.map(o => `<button class="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold ${state.range === o.id ? 'bg-accent text-white' : 'muted'}" data-range="${o.id}">${o.label}</button>`).join('')}
    </div>`;
  }
  function bindRangePicker() {
    $$('[data-range]').forEach(b => b.onclick = () => {
      state.range = b.dataset.range;
      localStorage.setItem('yy.range', state.range);
      renderView();
    });
  }

  let charts = {};
  function destroyChart(name) { if (charts[name]) { charts[name].destroy(); delete charts[name]; } }
  function drawRevenueChart(records) {
    destroyChart('rev');
    const ctx = $('#dash_revenue_chart');
    if (!ctx) return;
    const days = state.range === 'today' ? 1 : state.range === '7d' ? 7 : state.range === '30d' ? 30 : 90;
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    records.filter(r => r.status === 'paid').forEach(r => {
      if (r.dateISO in buckets) buckets[r.dateISO] += (r.total || 0);
    });
    const labels = Object.keys(buckets).map(d => {
      const [, m, dd] = d.split('-');
      return `${dd}/${m}`;
    });
    const data = Object.values(buckets);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    charts.rev = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'ยอดขาย',
          data,
          borderColor: accent,
          backgroundColor: accent + '20',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: accent,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '฿' + c.parsed.y.toLocaleString('th-TH') } } },
        scales: {
          y: { ticks: { callback: v => '฿' + (v / 1000).toFixed(1) + 'k' }, grid: { color: 'rgba(120,113,108,.15)' } },
          x: { grid: { display: false } },
        },
      },
    });
  }
  function drawPayChart(breakdown) {
    destroyChart('pay');
    const ctx = $('#dash_pay_chart');
    if (!ctx) return;
    const keys = Object.keys(breakdown);
    if (!keys.length) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const colors = ['oklch(60% 0.16 245)', 'oklch(60% 0.16 155)', 'oklch(60% 0.16 70)', 'oklch(60% 0.16 320)'];
    charts.pay = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: keys.map(k => (PAYMENT_METHODS.find(p => p.id === k) || { label: k }).label),
        datasets: [{ data: Object.values(breakdown), backgroundColor: colors, borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => c.label + ': ฿' + c.parsed.toLocaleString('th-TH') } },
        },
      },
    });
  }

  /* ============================================================
   *  VIEW: SALES (detailed breakdown)
   * ============================================================ */
  VIEW_RENDERERS.sales = function (root) {
    const records = filterByRange(getRecordsForStore(state.storeId)).filter(r => r.status === 'paid');
    const total = records.reduce((a, r) => a + (r.total || 0), 0);
    // Group by day
    const byDay = {};
    records.forEach(r => { byDay[r.dateISO] = (byDay[r.dateISO] || 0) + (r.total || 0); });
    // Group by cashier
    const byCashier = {};
    records.forEach(r => {
      const c = r.cashier || '-';
      byCashier[c] = byCashier[c] || { name: c, count: 0, revenue: 0 };
      byCashier[c].count++;
      byCashier[c].revenue += (r.total || 0);
    });

    root.innerHTML = `
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold" style="font-family:var(--font-display)">รายงานยอดขาย</h1>
          <p class="muted text-sm mt-1">${STORES[state.storeId].name} · ${records.length} บิล รวม ${baht(total)}</p>
        </div>
        ${rangePicker()}
      </div>

      <div class="grid lg:grid-cols-2 gap-4 mb-6">
        <div class="card p-5">
          <h3 class="font-semibold text-[15px] mb-4" style="font-family:var(--font-display)">ยอดต่อวัน</h3>
          <canvas id="sales_day_chart" style="max-height:280px"></canvas>
        </div>
        <div class="card p-5">
          <h3 class="font-semibold text-[15px] mb-4" style="font-family:var(--font-display)">ยอดต่อแคชเชียร์</h3>
          ${Object.values(byCashier).sort((a,b) => b.revenue - a.revenue).map(c => `
            <div class="flex items-center justify-between py-2 border-b hairline last:border-0">
              <div><div class="font-medium text-sm">${escHtml(c.name)}</div><div class="muted-2 text-xs">${c.count} บิล</div></div>
              <div class="num font-bold accent">${baht(c.revenue)}</div>
            </div>
          `).join('') || '<div class="muted-2 text-center py-6">ยังไม่มีข้อมูล</div>'}
        </div>
      </div>

      <div class="card overflow-x-auto">
        <table class="tbl">
          <thead><tr><th>วันที่</th><th>เลขบิล</th><th>ประเภท</th><th>วิธีจ่าย</th><th>แคชเชียร์</th><th class="text-right">ยอด</th></tr></thead>
          <tbody>
            ${records.slice(0, 200).reverse().map(r => `
              <tr>
                <td class="num">${fmtDateTH(r.dateISO)}</td>
                <td><span class="mono font-semibold">#${r.orderId}</span></td>
                <td>${(ORDER_TYPES.find(t => t.id === r.type) || {}).label || '-'}${r.table ? ' · โต๊ะ ' + r.table : ''}</td>
                <td>${(PAYMENT_METHODS.find(p => p.id === r.paymentMethod) || {}).label || '-'}</td>
                <td>${escHtml(r.cashier || '-')}</td>
                <td class="text-right num font-bold">${baht(r.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${records.length > 200 ? `<div class="p-3 text-center muted-2 text-xs">แสดง 200 รายการล่าสุด จากทั้งหมด ${records.length}</div>` : ''}
      </div>
    `;
    bindRangePicker();

    // Draw daily chart
    const labels = Object.keys(byDay).sort();
    const data = labels.map(d => byDay[d]);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    destroyChart('saleDay');
    if ($('#sales_day_chart')) {
      charts.saleDay = new Chart($('#sales_day_chart'), {
        type: 'bar',
        data: { labels: labels.map(d => fmtDateTH(d)), datasets: [{ label: 'ยอดขาย', data, backgroundColor: accent, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => '฿' + (v/1000).toFixed(1) + 'k' } } } },
      });
    }
  };

  /* ============================================================
   *  VIEW: ORDERS
   * ============================================================ */
  VIEW_RENDERERS.orders = function (root) {
    const records = filterByRange(getRecordsForStore(state.storeId)).sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
    const filtered = state.search ? records.filter(r => (r.orderId + ' ' + (r.customer||'') + ' ' + (r.table||'')).toLowerCase().includes(state.search.toLowerCase())) : records;
    root.innerHTML = `
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold" style="font-family:var(--font-display)">ออเดอร์</h1>
          <p class="muted text-sm mt-1">${STORES[state.storeId].name} · ทั้งหมด ${filtered.length} ออเดอร์</p>
        </div>
        ${rangePicker()}
      </div>
      <div class="card overflow-x-auto">
        <table class="tbl">
          <thead><tr><th>เลขบิล</th><th>เวลา</th><th>ประเภท</th><th>สถานะ</th><th>ลูกค้า</th><th class="text-right">ยอด</th></tr></thead>
          <tbody>
            ${filtered.slice(0, 200).map(r => {
              const st = (cfg.STATUS_FLOW.find(s => s.id === r.status) || cfg.STATUS_FLOW[0]);
              return `
                <tr>
                  <td><span class="mono font-semibold">#${r.orderId}</span></td>
                  <td class="num">${new Date(r.createdAt||0).toLocaleString('th-TH', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' })}</td>
                  <td>${(ORDER_TYPES.find(t => t.id === r.type) || {}).label || '-'}${r.table ? ' · โต๊ะ ' + r.table : ''}</td>
                  <td><span class="pill" style="background:${st.bg};color:${st.color};border-color:${st.bg}">${st.label}</span></td>
                  <td>${escHtml(r.customer || '-')}</td>
                  <td class="text-right num font-bold">${baht(r.total || 0)}</td>
                </tr>
              `;
            }).join('')}
            ${filtered.length === 0 ? '<tr><td colspan="6" class="muted-2 text-center py-8">ไม่พบออเดอร์</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
    bindRangePicker();
  };

  /* ============================================================
   *  VIEW: PRODUCTS
   * ============================================================ */
  VIEW_RENDERERS.products = function (root) {
    const sections = MENUS[state.storeId] || [];
    const items = sections.flatMap(s => s.items.map(i => ({ ...i, section: s.label })));
    const filt = state.search ? items.filter(i => (i.th + ' ' + i.en).toLowerCase().includes(state.search.toLowerCase())) : items;

    // Compute revenue per item from records
    const counter = {};
    getRecordsForStore(state.storeId).filter(r => r.status === 'paid').forEach(r => {
      (r.items || []).forEach(it => {
        counter[it.itemId] = (counter[it.itemId] || 0) + (it.total || 0);
      });
    });

    root.innerHTML = `
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold" style="font-family:var(--font-display)">สินค้า / เมนู</h1>
          <p class="muted text-sm mt-1">${STORES[state.storeId].name} · ${items.length} รายการ</p>
        </div>
        <button class="btn btn-primary">+ เพิ่มเมนู</button>
      </div>
      <div class="card overflow-x-auto">
        <table class="tbl">
          <thead><tr><th>เมนู</th><th>หมวด</th><th class="text-right">ราคา</th><th class="text-right">ต้นทุน</th><th class="text-right">Margin</th><th class="text-right">รายได้รวม</th></tr></thead>
          <tbody>
            ${filt.map(it => {
              const rev = counter[it.id] || 0;
              const margin = it.basePrice ? Math.round((it.basePrice - it.cost) / it.basePrice * 100) : 0;
              return `
                <tr>
                  <td><div class="font-semibold">${escHtml(it.th)}</div><div class="muted-2 text-xs">${escHtml(it.en)}</div></td>
                  <td class="muted text-xs">${escHtml(it.section)}</td>
                  <td class="text-right num font-bold">${baht(it.basePrice)}</td>
                  <td class="text-right num muted">${baht(it.cost)}</td>
                  <td class="text-right"><span class="pill ${margin >= 50 ? 'pill-pos' : margin >= 30 ? 'pill-warn' : 'pill-neg'}">${margin}%</span></td>
                  <td class="text-right num accent font-bold">${baht(rev)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  /* ============================================================
   *  VIEW: INVENTORY
   * ============================================================ */
  VIEW_RENDERERS.inventory = function (root) {
    const cats = INV[state.storeId] || [];
    const inv = api.getInventoryState(state.storeId);
    const lowCount = Object.values(inv).filter(v => v === 'low').length;
    const outCount = Object.values(inv).filter(v => v === 'out').length;

    root.innerHTML = `
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold" style="font-family:var(--font-display)">สต็อกวัตถุดิบ</h1>
          <p class="muted text-sm mt-1">${STORES[state.storeId].name} · แตะที่ชิปเพื่อสลับสถานะ: ปกติ → ใกล้หมด → หมด</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="pill pill-warn">ใกล้หมด ${lowCount}</span>
          <span class="pill pill-neg">หมด ${outCount}</span>
          <button class="btn btn-soft" id="inv_save">💾 บันทึก</button>
        </div>
      </div>

      ${cats.map(cat => `
        <div class="card p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">${escHtml(cat.cat)}</h3>
            <span class="muted text-xs">${cat.items.length} รายการ</span>
          </div>
          <div class="flex flex-wrap gap-2">
            ${cat.items.map(name => {
              const s = inv[name] || 'normal';
              return `<button class="ic-chip ${s === 'normal' ? '' : s}" data-inv="${escAttr(name)}">
                <span class="dot"></span>${escHtml(name)}
              </button>`;
            }).join('')}
          </div>
        </div>
      `).join('')}

      <div class="muted-2 text-xs text-center pt-2">
        แตะ 1 ครั้ง = ใกล้หมด · แตะ 2 ครั้ง = หมด · แตะ 3 ครั้ง = ปกติ
      </div>
    `;

    $$('[data-inv]').forEach(b => b.onclick = () => {
      const name = b.dataset.inv;
      const cur = inv[name] || 'normal';
      inv[name] = cur === 'normal' ? 'low' : cur === 'low' ? 'out' : 'normal';
      renderView();
    });

    $('#inv_save').onclick = async () => {
      await api.saveInventoryUpdate(state.storeId, inv);
      toast('บันทึกสถานะสต็อกแล้ว', 'ok');
      renderShell();
    };
  };

  /* ============================================================
   *  VIEW: EXPENSES
   * ============================================================ */
  VIEW_RENDERERS.expenses = function (root) {
    const list = api.getExpenses(state.storeId).slice().reverse();
    const filtered = filterByRange(list);
    const total = filtered.reduce((a, e) => a + (+e.amount || 0), 0);

    root.innerHTML = `
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold" style="font-family:var(--font-display)">ค่าใช้จ่าย</h1>
          <p class="muted text-sm mt-1">${STORES[state.storeId].name} · รวม ${baht(total)} (${filtered.length} รายการ)</p>
        </div>
        <div class="flex items-center gap-2">
          ${rangePicker()}
          <button class="btn btn-primary" id="exp_add">+ เพิ่มค่าใช้จ่าย</button>
        </div>
      </div>

      <div class="card overflow-x-auto">
        <table class="tbl">
          <thead><tr><th>วันที่</th><th>หมวด</th><th>รายการ</th><th>ผู้ขาย</th><th class="text-right">จำนวน</th></tr></thead>
          <tbody>
            ${filtered.map(e => `
              <tr>
                <td class="num">${fmtDateTH(e.dateISO)}</td>
                <td><span class="pill">${escHtml(e.category || 'อื่นๆ')}</span></td>
                <td>${escHtml(e.note || '-')}</td>
                <td class="muted">${escHtml(e.vendor || '-')}</td>
                <td class="text-right num font-bold" style="color:var(--neg)">-${baht(e.amount)}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="muted-2 text-center py-8">ยังไม่มีค่าใช้จ่าย</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
    bindRangePicker();
    $('#exp_add').onclick = openExpenseModal;
  };

  function openExpenseModal() {
    state.expenseDraft = { dateISO: todayISO(), category: 'วัตถุดิบ', amount: '', note: '', vendor: '' };
    const cats = ['วัตถุดิบ', 'ค่าแรงพนักงาน', 'ค่าเช่า', 'ค่าไฟ-น้ำ', 'ค่าก๊าซ', 'ค่าน้ำแข็ง', 'การตลาด', 'อื่นๆ'];
    $('#modal_box').innerHTML = `
      <div class="p-5 border-b hairline flex items-center justify-between">
        <h3 class="font-semibold text-[16px]">เพิ่มค่าใช้จ่าย</h3>
        <button class="btn btn-icon" data-close>×</button>
      </div>
      <div class="p-5 grid gap-3">
        <div><label class="lbl mb-1">วันที่</label><input class="inp" type="date" id="exp_date" value="${todayISO()}"></div>
        <div><label class="lbl mb-1">หมวดหมู่</label>
          <select class="inp" id="exp_cat">${cats.map(c => `<option>${c}</option>`).join('')}</select>
        </div>
        <div><label class="lbl mb-1">จำนวนเงิน <span class="req">*</span></label>
          <input class="inp" type="number" id="exp_amt" placeholder="0" min="0"></div>
        <div><label class="lbl mb-1">รายละเอียด</label>
          <input class="inp" id="exp_note" placeholder="เช่น ซื้อนม 20 ลัง"></div>
        <div><label class="lbl mb-1">ผู้ขาย</label>
          <input class="inp" id="exp_vendor" placeholder="ชื่อร้านค้า"></div>
      </div>
      <div class="p-5 border-t hairline flex justify-end gap-2">
        <button class="btn btn-ghost" data-close>ยกเลิก</button>
        <button class="btn btn-primary" id="exp_save">บันทึก</button>
      </div>
    `;
    $('#modal_bd').classList.add('show');
    $$('[data-close]').forEach(b => b.onclick = closeModal);
    $('#exp_save').onclick = async () => {
      const amt = +$('#exp_amt').value || 0;
      if (!amt) { toast('โปรดระบุจำนวนเงิน', 'er'); return; }
      const exp = {
        dateISO: $('#exp_date').value || todayISO(),
        category: $('#exp_cat').value,
        amount: amt,
        note: $('#exp_note').value,
        vendor: $('#exp_vendor').value,
      };
      await api.saveExpense(state.storeId, exp);
      closeModal(); toast('บันทึกค่าใช้จ่ายแล้ว', 'ok'); renderView();
    };
  }
  function closeModal() { $('#modal_bd').classList.remove('show'); }

  /* ============================================================
   *  VIEW: EMPLOYEES
   * ============================================================ */
  VIEW_RENDERERS.employees = function (root) {
    const employees = JSON.parse(localStorage.getItem('yy.employees') || JSON.stringify(EMPLOYEES));
    const storeEmp = employees.filter(e => e.store === state.storeId);
    const totalWage = storeEmp.reduce((a, e) => a + (+e.wage || 0), 0);
    root.innerHTML = `
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold" style="font-family:var(--font-display)">พนักงาน</h1>
          <p class="muted text-sm mt-1">${STORES[state.storeId].name} · ${storeEmp.length} คน · ค่าแรง/วัน รวม ${baht(totalWage)}</p>
        </div>
        <button class="btn btn-primary" id="emp_add">+ เพิ่มพนักงาน</button>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${storeEmp.map(e => `
          <div class="card p-5">
            <div class="flex items-start gap-3 mb-3">
              <div class="nav-avatar" style="width:42px;height:42px;font-size:14px">${escHtml(e.name.charAt(0))}</div>
              <div class="flex-1">
                <div class="font-semibold">${escHtml(e.name)}</div>
                <div class="muted-2 text-xs">${escHtml(e.role)}</div>
              </div>
              <span class="pill ${e.active ? 'pill-pos' : 'pill-neg'}">${e.active ? 'ทำงาน' : 'หยุด'}</span>
            </div>
            <div class="border-t hairline pt-3 mt-3 grid gap-1 text-sm">
              <div class="flex justify-between"><span class="muted">ค่าแรง/วัน</span><span class="num font-bold">${baht(e.wage)}</span></div>
              <div class="flex justify-between"><span class="muted">รหัส</span><span class="mono text-xs">${e.id}</span></div>
            </div>
          </div>
        `).join('') || '<div class="muted-2 col-span-full text-center py-10">ยังไม่มีพนักงาน</div>'}
      </div>
    `;
    $('#emp_add').onclick = openEmployeeModal;
  };

  function openEmployeeModal() {
    $('#modal_box').innerHTML = `
      <div class="p-5 border-b hairline flex items-center justify-between">
        <h3 class="font-semibold text-[16px]">เพิ่มพนักงาน</h3>
        <button class="btn btn-icon" data-close>×</button>
      </div>
      <div class="p-5 grid gap-3">
        <div><label class="lbl mb-1">ชื่อ <span class="req">*</span></label><input class="inp" id="em_name"></div>
        <div><label class="lbl mb-1">ตำแหน่ง</label>
          <select class="inp" id="em_role"><option>แคชเชียร์</option><option>พ่อครัว</option><option>เสิร์ฟ</option><option>ผู้จัดการ</option><option>เจ้าหน้าที่ความสะอาด</option></select>
        </div>
        <div><label class="lbl mb-1">ค่าแรงต่อวัน (บาท)</label><input class="inp" type="number" id="em_wage" value="450"></div>
        <div><label class="lbl mb-1">เบอร์โทร</label><input class="inp" id="em_phone"></div>
      </div>
      <div class="p-5 border-t hairline flex justify-end gap-2">
        <button class="btn btn-ghost" data-close>ยกเลิก</button>
        <button class="btn btn-primary" id="em_save">บันทึก</button>
      </div>
    `;
    $('#modal_bd').classList.add('show');
    $$('[data-close]').forEach(b => b.onclick = closeModal);
    $('#em_save').onclick = () => {
      const name = $('#em_name').value.trim();
      if (!name) { toast('โปรดกรอกชื่อ', 'er'); return; }
      const employees = JSON.parse(localStorage.getItem('yy.employees') || JSON.stringify(EMPLOYEES));
      employees.push({
        id: 'em-' + Date.now(),
        name, store: state.storeId,
        role: $('#em_role').value,
        wage: +$('#em_wage').value || 0,
        phone: $('#em_phone').value,
        active: true, startDate: todayISO(),
      });
      localStorage.setItem('yy.employees', JSON.stringify(employees));
      closeModal(); toast('เพิ่มพนักงานแล้ว', 'ok'); renderView();
    };
  }

  /* ============================================================
   *  VIEW: SUPPLIERS
   * ============================================================ */
  VIEW_RENDERERS.suppliers = function (root) {
    const list = JSON.parse(localStorage.getItem('yy.suppliers') || JSON.stringify(SUPPLIERS));
    root.innerHTML = `
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold" style="font-family:var(--font-display)">ซัพพลายเออร์</h1>
          <p class="muted text-sm mt-1">รายชื่อผู้จำหน่ายวัตถุดิบ · ${list.length} ราย</p>
        </div>
        <button class="btn btn-primary" id="sup_add">+ เพิ่มซัพพลายเออร์</button>
      </div>
      <div class="card overflow-x-auto">
        <table class="tbl">
          <thead><tr><th>ชื่อ</th><th>ประเภท</th><th>เบอร์โทร</th><th>อีเมล</th><th>หมายเหตุ</th></tr></thead>
          <tbody>
            ${list.map(s => `
              <tr>
                <td><div class="font-semibold">${escHtml(s.name)}</div></td>
                <td><span class="pill">${escHtml(s.type || '-')}</span></td>
                <td class="mono">${escHtml(s.phone || '-')}</td>
                <td>${escHtml(s.email || '-')}</td>
                <td class="muted text-xs">${escHtml(s.note || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    $('#sup_add').onclick = () => {
      $('#modal_box').innerHTML = `
        <div class="p-5 border-b hairline flex items-center justify-between">
          <h3 class="font-semibold text-[16px]">เพิ่มซัพพลายเออร์</h3>
          <button class="btn btn-icon" data-close>×</button>
        </div>
        <div class="p-5 grid gap-3">
          <div><label class="lbl mb-1">ชื่อ <span class="req">*</span></label><input class="inp" id="sp_name"></div>
          <div><label class="lbl mb-1">ประเภท</label><input class="inp" id="sp_type" placeholder="วัตถุดิบ / นม / เนื้อสัตว์"></div>
          <div><label class="lbl mb-1">เบอร์โทร</label><input class="inp" id="sp_phone"></div>
          <div><label class="lbl mb-1">อีเมล</label><input class="inp" id="sp_email" type="email"></div>
          <div><label class="lbl mb-1">หมายเหตุ</label><input class="inp" id="sp_note"></div>
        </div>
        <div class="p-5 border-t hairline flex justify-end gap-2">
          <button class="btn btn-ghost" data-close>ยกเลิก</button>
          <button class="btn btn-primary" id="sp_save">บันทึก</button>
        </div>
      `;
      $('#modal_bd').classList.add('show');
      $$('[data-close]').forEach(b => b.onclick = closeModal);
      $('#sp_save').onclick = () => {
        const name = $('#sp_name').value.trim();
        if (!name) { toast('โปรดกรอกชื่อ', 'er'); return; }
        list.push({ id: 'sp-' + Date.now(), name, type: $('#sp_type').value, phone: $('#sp_phone').value, email: $('#sp_email').value, note: $('#sp_note').value });
        localStorage.setItem('yy.suppliers', JSON.stringify(list));
        closeModal(); toast('เพิ่มซัพพลายเออร์แล้ว', 'ok'); renderView();
      };
    };
  };

  /* ============================================================
   *  VIEW: REPORTS (monthly / P&L)
   * ============================================================ */
  VIEW_RENDERERS.reports = function (root) {
    const records = getRecordsForStore(state.storeId).filter(r => r.status === 'paid');
    const expenses = api.getExpenses(state.storeId);
    // Monthly grouping
    const months = {};
    records.forEach(r => {
      const m = (r.dateISO || '').slice(0, 7);
      if (!m) return;
      months[m] = months[m] || { revenue: 0, orders: 0, expense: 0, foodCost: 0 };
      months[m].revenue += (r.total || 0);
      months[m].orders++;
      (r.items || []).forEach(it => { months[m].foodCost += ((it.cost || 0) * (it.qty || 1)); });
    });
    expenses.forEach(e => {
      const m = (e.dateISO || '').slice(0, 7);
      if (!m) return;
      months[m] = months[m] || { revenue: 0, orders: 0, expense: 0, foodCost: 0 };
      months[m].expense += (+e.amount || 0);
    });
    const monthList = Object.keys(months).sort().reverse();

    root.innerHTML = `
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold" style="font-family:var(--font-display)">รายงานรายเดือน</h1>
          <p class="muted text-sm mt-1">${STORES[state.storeId].name} · กำไรขาดทุน รายเดือน</p>
        </div>
        <button class="btn btn-soft" id="rep_export">📥 ส่งออก CSV</button>
      </div>

      <div class="card overflow-x-auto mb-6">
        <table class="tbl">
          <thead><tr>
            <th>เดือน</th>
            <th class="text-right">รายได้</th>
            <th class="text-right">ออเดอร์</th>
            <th class="text-right">บิลเฉลี่ย</th>
            <th class="text-right">ต้นทุนวัตถุดิบ</th>
            <th class="text-right">ค่าใช้จ่าย</th>
            <th class="text-right">กำไรสุทธิ</th>
            <th class="text-right">Margin</th>
          </tr></thead>
          <tbody>
            ${monthList.map(m => {
              const d = months[m];
              const net = d.revenue - d.foodCost - d.expense;
              const margin = d.revenue ? Math.round(net / d.revenue * 100) : 0;
              return `
                <tr>
                  <td class="font-semibold">${m}</td>
                  <td class="text-right num font-bold">${baht(d.revenue)}</td>
                  <td class="text-right num">${d.orders}</td>
                  <td class="text-right num muted">${baht(Math.round(d.revenue / Math.max(1, d.orders)))}</td>
                  <td class="text-right num" style="color:var(--neg)">-${baht(Math.round(d.foodCost))}</td>
                  <td class="text-right num" style="color:var(--neg)">-${baht(d.expense)}</td>
                  <td class="text-right num font-bold" style="color:${net >= 0 ? 'var(--pos)' : 'var(--neg)'}">${baht(net)}</td>
                  <td class="text-right"><span class="pill ${margin >= 30 ? 'pill-pos' : margin >= 15 ? 'pill-warn' : 'pill-neg'}">${margin}%</span></td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="8" class="muted-2 text-center py-8">ยังไม่มีข้อมูล</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="card p-5">
        <h3 class="font-semibold text-[15px] mb-4" style="font-family:var(--font-display)">รายได้ vs ค่าใช้จ่าย</h3>
        <canvas id="rep_chart" style="max-height:300px"></canvas>
      </div>
    `;

    $('#rep_export').onclick = () => exportReportCSV(monthList, months);

    // Chart
    destroyChart('rep');
    if ($('#rep_chart') && monthList.length) {
      const labels = monthList.slice(0, 12).reverse();
      charts.rep = new Chart($('#rep_chart'), {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'รายได้',      data: labels.map(m => months[m].revenue),                                backgroundColor: 'oklch(60% 0.15 155)', borderRadius: 6 },
            { label: 'ต้นทุน+ค่าใช้จ่าย', data: labels.map(m => months[m].foodCost + months[m].expense), backgroundColor: 'oklch(60% 0.18 25)',  borderRadius: 6 },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => '฿' + (v/1000).toFixed(0) + 'k' } } } },
      });
    }
  };

  /* ============================================================
   *  VIEW: SETTINGS
   * ============================================================ */
  VIEW_RENDERERS.settings = function (root) {
    root.innerHTML = `
      <div class="mb-6">
        <h1 class="text-2xl font-bold" style="font-family:var(--font-display)">ตั้งค่า</h1>
        <p class="muted text-sm mt-1">การตั้งค่าระบบและการเชื่อมต่อ Google Sheets</p>
      </div>

      <div class="card p-6 mb-4">
        <h3 class="font-semibold mb-1">Google Sheets / Apps Script</h3>
        <p class="muted-2 text-sm mb-4">URL ของ Web App ที่ deploy จาก backend/Code.gs</p>
        <label class="lbl mb-1">Apps Script URL</label>
        <input class="inp mono" id="set_api" placeholder="https://script.google.com/macros/s/.../exec" value="${escAttr(api.apiUrl())}">
        <div class="flex items-center gap-2 mt-3">
          <button class="btn btn-primary" id="set_save">บันทึก URL</button>
          <button class="btn btn-soft" id="set_ping">🔌 ทดสอบเชื่อมต่อ</button>
          <span id="set_ping_result" class="muted-2 text-sm"></span>
        </div>
      </div>

      <div class="card p-6 mb-4">
        <h3 class="font-semibold mb-3">ข้อมูลในเบราว์เซอร์</h3>
        <div class="grid sm:grid-cols-3 gap-3">
          ${STORE_IDS.map(id => {
            const recs = api.getRecords(id);
            return `<div class="surface-2 rounded-xl p-4">
              <div class="text-xs muted-2 mb-1">${STORES[id].badge} ${STORES[id].shortName}</div>
              <div class="text-2xl font-bold num">${recs.length}</div>
              <div class="muted-2 text-xs">ออเดอร์ในเครื่อง</div>
            </div>`;
          }).join('')}
        </div>
        <div class="muted-2 text-sm mt-4">คิวรอซิงค์: <b class="num">${api.queueLength()}</b> รายการ</div>
        <div class="flex gap-2 mt-4 flex-wrap">
          <button class="btn btn-soft" id="set_sync">🔄 ซิงค์ตอนนี้</button>
          <button class="btn btn-soft" id="set_pull">⬇ ดึงข้อมูลจาก Sheets</button>
          <button class="btn btn-danger" id="set_clear">🗑 ล้างข้อมูลในเครื่อง</button>
        </div>
      </div>

      <div class="card p-6">
        <h3 class="font-semibold mb-3">ขั้นตอน Deploy</h3>
        <ol class="text-sm space-y-2" style="padding-left:20px;list-style:decimal">
          <li>สร้าง Google Sheet ใหม่ (เปล่า) แล้วคัดลอก <span class="mono">Sheet ID</span> จาก URL</li>
          <li>เปิด <b>Extensions → Apps Script</b>, ลบโค้ดเดิม วางไฟล์ <span class="mono">backend/Code.gs</span></li>
          <li>ใส่ <span class="mono">SHEET_ID</span> ใน Code.gs (หรือ Script Properties)</li>
          <li>รัน <span class="mono">setupSheets()</span> 1 ครั้ง เพื่อสร้างชีททั้งหมด</li>
          <li>Deploy → New Deployment → Web app → <b>Anyone</b> → คัดลอก <span class="mono">/exec</span> URL</li>
          <li>วาง URL ในช่องด้านบน กด "บันทึก URL" และ "ทดสอบเชื่อมต่อ"</li>
        </ol>
      </div>
    `;

    $('#set_save').onclick = () => {
      api.setApiUrl($('#set_api').value.trim());
      toast('บันทึก URL แล้ว', 'ok'); renderShell();
    };
    $('#set_ping').onclick = async () => {
      api.setApiUrl($('#set_api').value.trim());
      $('#set_ping_result').textContent = 'กำลังทดสอบ...';
      const r = await api.ping();
      $('#set_ping_result').textContent = r.ok ? `✓ เชื่อมต่อสำเร็จ (v${r.v || '?'})` : `✗ ${r.error}`;
    };
    $('#set_sync').onclick = () => { api.syncQueue(); toast('กำลังซิงค์...', 'info'); };
    $('#set_pull').onclick = async () => {
      toast('กำลังดึงข้อมูล...', 'info');
      for (const id of STORE_IDS) await api.pullOrders(id);
      toast('ดึงข้อมูลสำเร็จ', 'ok'); renderView();
    };
    $('#set_clear').onclick = () => {
      if (!confirm('ล้างข้อมูลทั้งหมดในเบราว์เซอร์? (ข้อมูลใน Google Sheets ไม่ถูกลบ)')) return;
      STORE_IDS.forEach(id => api.clearStore(id));
      toast('ล้างข้อมูลแล้ว', 'ok'); renderView();
    };
  };

  /* ---------- CSV exports ---------- */
  function exportRecordsCSV(storeId) {
    const records = getRecordsForStore(storeId).filter(r => r.status === 'paid');
    const headers = ['orderId', 'dateISO', 'createdAt', 'type', 'table', 'customer', 'paymentMethod', 'cashier', 'total', 'paid', 'change', 'note'];
    const rows = [headers, ...records.map(r => headers.map(h => {
      const v = r[h];
      if (typeof v === 'string' && v.includes(',')) return `"${v.replace(/"/g, '""')}"`;
      return v == null ? '' : v;
    }))];
    downloadCSV(rows, `yellowyellow-sales-${storeId}-${todayISO()}.csv`);
  }
  function exportReportCSV(months, data) {
    const headers = ['month', 'revenue', 'orders', 'foodCost', 'expense', 'netProfit', 'margin'];
    const rows = [headers, ...months.map(m => {
      const d = data[m];
      const net = d.revenue - d.foodCost - d.expense;
      const margin = d.revenue ? Math.round(net / d.revenue * 100) : 0;
      return [m, d.revenue, d.orders, Math.round(d.foodCost), d.expense, net, margin + '%'];
    })];
    downloadCSV(rows, `yellowyellow-report-${state.storeId}-${todayISO()}.csv`);
  }
  function downloadCSV(rows, filename) {
    const csv = '﻿' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    toast('ดาวน์โหลด CSV แล้ว', 'ok');
  }

  /* ---------- Bootstrap ---------- */
  function start() {
    applyTheme();
    renderShell();
    bindShell();
    renderView();

    // Live updates
    api.on('records-changed', () => { if (state.view === 'dashboard' || state.view === 'sales' || state.view === 'orders' || state.view === 'reports') renderView(); renderShell(); });
    api.on('online', () => { $('#yy-offline').classList.remove('show'); toast('กลับมาออนไลน์แล้ว', 'ok'); });
    api.on('offline', () => { $('#yy-offline').classList.add('show'); });
    api.on('queue-changed', () => { if (state.view === 'settings') renderView(); });

    if (!api.isOnline()) $('#yy-offline').classList.add('show');

    api.startAutoRefresh(30000);
    STORE_IDS.forEach(id => api.pullOrders(id).catch(() => {}));

    // Expose for inline handlers
    window.__yyAdmin = { switchView, switchStore };
  }

  document.addEventListener('DOMContentLoaded', start);
  if (document.readyState !== 'loading') start();
})();
