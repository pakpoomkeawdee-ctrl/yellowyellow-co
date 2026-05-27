/* ============================================================
 * yellowyellow.co — POS application
 * Vanilla JS single-page app (no framework).
 *
 * Sections:
 *   1. State & helpers
 *   2. Render: header / shell
 *   3. Customer view (menu + cart)
 *   4. Staff view (orders / tables / queue / dashboard)
 *   5. Modals: customizer / payment / receipt / QR / settings
 *   6. Bootstrap
 * ============================================================ */

(function () {
  'use strict';

  const { STORES, STORE_IDS, STATUS_FLOW, PAYMENT_METHODS, ORDER_TYPES, TABLES, PROMOS, fmt } = window.YY_CONFIG;
  const { baht, numTH, todayISO, cx } = fmt;
  const MENUS = window.YY_MENUS;
  const api = window.YY_API;

  /* ---------- 1. State ---------- */
  const state = {
    storeId:   localStorage.getItem('yy.activeStore') || 'nmtun',
    mode:      localStorage.getItem('yy.mode') || 'customer',   // customer | staff
    activeCat: null,
    cart:      [],
    orderType: 'dinein',
    tableNo:   '',
    customer:  '',
    note:      '',
    discount:  { type: 'fixed', value: 0, label: '' },
    cashier:   localStorage.getItem('yy.cashier') || 'พนักงาน',
    search:    '',
    staffTab:  'orders',    // orders | queue | dashboard | history
    filterStatus: 'all',
    modal:     null,
    editIndex: -1,
    cartOpenMobile: false,
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function applyStoreAccent() {
    const s = STORES[state.storeId];
    const r = document.documentElement.style;
    r.setProperty('--store',       s.accent);
    r.setProperty('--store-soft',  s.accentSoft);
    r.setProperty('--store-tint',  s.accentTint);
    r.setProperty('--store-light', s.accentLight);
  }

  function setStore(id) {
    if (!STORES[id]) return;
    state.storeId = id;
    localStorage.setItem('yy.activeStore', id);
    state.activeCat = null;
    state.cart = [];
    state.search = '';
    applyStoreAccent();
    render();
  }
  function setMode(m) {
    state.mode = m;
    localStorage.setItem('yy.mode', m);
    render();
  }

  /* ---------- Toast ---------- */
  let toastTm;
  function toast(msg, kind) {
    const t = $('#yy-toast');
    t.className = 'yy-toast show ' + (kind || 'info');
    $('#yy-toast-msg').textContent = msg;
    clearTimeout(toastTm);
    toastTm = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------- Cart math ---------- */
  function cartSubtotal() { return state.cart.reduce((s, l) => s + l.total, 0); }
  function discountAmount() {
    const sub = cartSubtotal();
    if (!state.discount.value) return 0;
    return state.discount.type === 'percent'
      ? Math.round(sub * state.discount.value / 100)
      : Math.min(state.discount.value, sub);
  }
  function cartGrandTotal() { return Math.max(0, cartSubtotal() - discountAmount()); }

  /* ---------- 2. Render ---------- */
  function render() {
    const app = $('#app');
    const s = STORES[state.storeId];
    app.innerHTML = `
      ${renderHeader(s)}
      <div class="layout ${state.mode === 'staff' ? 'staff-mode' : ''}">
        ${state.mode === 'customer' ? renderCustomerView(s) + renderCart(s) : renderStaffView(s)}
      </div>
      <footer class="appfoot">
        <div><span class="conn-dot ${api.isOnline() ? '' : 'off'}" id="conn-dot"></span>
          ${api.isOnline() ? 'ออนไลน์' : 'ออฟไลน์'} · API: <code>${api.apiUrl() ? '✓ ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งค่า'}</code>
          · คิวรอ: <code>${api.queueLength()}</code>
        </div>
        <div>yellowyellow.co POS v1.0 · ${s.shortName}</div>
      </footer>
    `;
    bindHeader();
    if (state.mode === 'customer') {
      bindCustomerView();
      bindCart();
    } else {
      bindStaffView();
    }
  }

  function renderHeader(s) {
    return `
      <header class="hdr no-print">
        <div class="brand">
          <div class="brand-mark">yy</div>
          <div>
            <div class="brand-name">${s.name}</div>
            <div class="brand-tag">${s.tagline} · ${s.hours}</div>
          </div>
        </div>
        <nav class="store-tabs" role="tablist" aria-label="เลือกร้าน">
          ${STORE_IDS.map(id => {
            const x = STORES[id];
            const active = id === state.storeId;
            return `<button class="store-tab ${active ? 'is-active' : ''}"
                            style="${active ? `--c:${x.accent};--ct:${x.accentTint};` : ''}"
                            data-store="${id}">
              <span class="dot" style="background:${x.accent}"></span>
              <span>${x.shortName}</span>
              <span class="store-tab-route">${x.route}</span>
            </button>`;
          }).join('')}
        </nav>
        <div class="hdr-right">
          <button class="ghost-btn" id="btn-qr" title="QR สั่งอาหาร">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M20 14v3M14 17v4h7"/></svg>
            QR สั่ง
          </button>
          <button class="ghost-btn" id="btn-settings" title="ตั้งค่า">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            ตั้งค่า
          </button>
          <a class="ghost-btn" href="yellowyellow.html" title="หลังบ้าน">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
            หลังบ้าน
          </a>
          <div class="mode-switch" role="tablist" aria-label="โหมด">
            <button class="mode-btn ${state.mode === 'customer' ? 'is-active' : ''}" data-mode="customer">ลูกค้า</button>
            <button class="mode-btn ${state.mode === 'staff' ? 'is-active' : ''}" data-mode="staff">พนักงาน</button>
          </div>
        </div>
      </header>
    `;
  }

  function bindHeader() {
    $$('.store-tab').forEach(btn => btn.onclick = () => setStore(btn.dataset.store));
    $$('.mode-btn').forEach(btn => btn.onclick = () => setMode(btn.dataset.mode));
    $('#btn-qr').onclick = openQrModal;
    $('#btn-settings').onclick = openSettings;
  }

  /* ---------- 3. Customer view ---------- */
  function renderCustomerView(s) {
    const sections = MENUS[state.storeId] || [];
    const allItems = sections.flatMap(sec => sec.items);
    const matchSearch = state.search
      ? (it) => (it.th + ' ' + it.en).toLowerCase().includes(state.search.toLowerCase())
      : () => true;

    const cats = sections.map(sec => ({
      cat: sec.cat, label: sec.label, en: sec.en,
      count: sec.items.filter(matchSearch).length,
    }));

    const visible = state.activeCat
      ? sections.filter(sec => sec.cat === state.activeCat)
      : sections;

    const today = todayISO();
    const records = api.getRecords(state.storeId).filter(r => r.dateISO === today);
    const dailyRevenue = records.filter(r => r.status === 'paid').reduce((s, r) => s + (r.total || 0), 0);
    const dailyOrders = records.length;

    return `
      <section class="cust-view">
        <aside class="cat-rail no-print">
          <div class="cat-rail-title">หมวดเมนู</div>
          <button class="cat-rail-btn ${state.activeCat === null ? 'is-active' : ''}" data-cat="">
            <span class="cat-rail-label">ทั้งหมด</span>
            <span class="cat-rail-count">${allItems.length}</span>
            <span class="cat-rail-en">All</span>
          </button>
          ${cats.map(c => `
            <button class="cat-rail-btn ${state.activeCat === c.cat ? 'is-active' : ''}" data-cat="${c.cat}">
              <span class="cat-rail-label">${c.label}</span>
              <span class="cat-rail-count">${c.count}</span>
              <span class="cat-rail-en">${c.en}</span>
            </button>
          `).join('')}
          <div class="cat-rail-sep"></div>
          <div style="padding:0 12px">
            <div style="font-size:12px;font-weight:600;color:var(--text-2)">วันนี้</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${baht(dailyRevenue)} · ${dailyOrders} ออเดอร์</div>
          </div>
        </aside>

        <div class="menu-area">
          <div class="menu-hero">
            <div class="menu-hero-inner">
              <div>
                <div class="menu-hero-eyebrow">${s.cuisine}</div>
                <h1 class="menu-hero-title">${s.name}</h1>
                <div class="menu-hero-tag">${s.tagline}</div>
              </div>
              <div class="menu-hero-meta">
                <div class="menu-hero-meta-row"><span>เวลาเปิด</span><span>${s.hours}</span></div>
                <div class="menu-hero-meta-row"><span>ยอดวันนี้</span><span>${baht(dailyRevenue)}</span></div>
                <div class="menu-hero-meta-row"><span>ออเดอร์</span><span>${dailyOrders} รายการ</span></div>
              </div>
            </div>
          </div>

          <input class="menu-search" id="menu-search" type="text" placeholder="ค้นหาเมนู..." value="${escapeAttr(state.search)}">

          ${visible.map(sec => {
            const items = sec.items.filter(matchSearch);
            if (!items.length) return '';
            return `
              <section class="menu-section">
                <div class="menu-section-head">
                  <h2>${sec.label}</h2>
                  <span>${items.length} รายการ · ${sec.en}</span>
                </div>
                <div class="menu-grid">
                  ${items.map(it => renderMenuCard(it, s)).join('')}
                </div>
              </section>
            `;
          }).join('')}
          ${visible.every(sec => sec.items.filter(matchSearch).length === 0) ? `
            <div style="text-align:center;padding:60px 20px;color:var(--muted)">
              <div style="font-size:38px;opacity:.5">🔍</div>
              <div style="margin-top:10px">ไม่พบเมนูที่ค้นหา</div>
            </div>
          ` : ''}
        </div>
      </section>
    `;
  }

  function renderMenuCard(it, s) {
    const tempLabel = it.tempOptions ? it.tempOptions.map(o => o.label).join(' · ')
                    : it.sizeOptions ? it.sizeOptions.map(o => o.label).join(' / ')
                    : '';
    return `
      <button class="menu-card" data-item="${it.id}">
        ${renderThumb(it, s)}
        <div>
          <div class="menu-card-th">${it.th}</div>
          <div class="menu-card-en">${it.en}${it.hint ? ' · ' + it.hint : ''}</div>
          <div class="menu-card-foot">
            <div class="menu-card-price">
              <span class="menu-card-price-from">เริ่ม</span>
              <span class="menu-card-price-num">${baht(it.basePrice)}</span>
            </div>
            ${tempLabel ? `<div class="menu-card-options">${tempLabel}</div>` : ''}
          </div>
        </div>
        <div class="menu-card-add">+</div>
      </button>
    `;
  }

  function renderThumb(it, s) {
    const hue = (hashHue(it.id + it.th) + (s.id === 'nmtun' ? 210 : s.id === 'pussorn' ? 0 : 25)) % 360;
    const bg = `oklch(0.93 0.06 ${hue})`;
    const ink = `oklch(0.32 0.10 ${hue})`;
    const mono = (it.th.replace(/^นมตุ๋น[-\s]*/, '').replace(/^ข้าวหน้า/, '').replace(/^สุกี้\s?/, '').slice(0, 2)) || it.th.slice(0, 2);
    return `
      <div class="thumb" style="background:${bg}">
        <div class="thumb-glyph">${storeGlyph(s.id, ink)}</div>
        <div class="thumb-mono" style="color:${ink}">${mono}</div>
      </div>
    `;
  }
  function hashHue(str) {
    let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h) % 360;
  }
  function storeGlyph(id, ink) {
    if (id === 'nmtun') return `<svg viewBox="0 0 64 64" width="36" height="36" aria-hidden="true"><path d="M20 8 H44 V14 L40 18 V52 Q40 58 32 58 Q24 58 24 52 V18 L20 14 Z" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/><path d="M26 36 Q32 30 38 36 Q32 44 26 36 Z" fill="${ink}" opacity="0.18"/></svg>`;
    if (id === 'pussorn') return `<svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true"><path d="M8 30 Q32 22 56 30 Q52 50 32 52 Q12 50 8 30 Z" fill="none" stroke="${ink}" stroke-width="2.2"/><path d="M14 32 Q22 28 32 30 M22 36 Q30 32 40 34 M30 40 Q38 38 46 38" stroke="${ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;
    return `<svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true"><ellipse cx="32" cy="42" rx="22" ry="10" fill="none" stroke="${ink}" stroke-width="2.2"/><path d="M18 38 Q24 28 32 30 Q40 28 46 38" fill="${ink}" opacity="0.22"/><circle cx="32" cy="34" r="6" fill="${ink}" opacity="0.35"/></svg>`;
  }
  function escapeAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }
  function escHtml(s)    { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  function bindCustomerView() {
    $$('.cat-rail-btn').forEach(b => b.onclick = () => { state.activeCat = b.dataset.cat || null; render(); });
    $$('.menu-card').forEach(b => b.onclick = () => openCustomizer(b.dataset.item));
    const search = $('#menu-search');
    if (search) {
      search.oninput = (e) => {
        state.search = e.target.value;
        const pos = e.target.selectionStart;
        render();
        const s2 = $('#menu-search');
        if (s2) { s2.focus(); s2.selectionStart = s2.selectionEnd = pos; }
      };
    }
  }

  /* ---------- Cart ---------- */
  function renderCart(s) {
    const sub = cartSubtotal();
    const disc = discountAmount();
    const total = cartGrandTotal();
    return `
      <aside class="cart ${state.cartOpenMobile ? 'is-open' : ''}" id="cart">
        <div class="cart-handle" id="cart-handle"></div>
        <div class="cart-head">
          <div>
            <div class="cart-title">ตะกร้า</div>
            <div class="cart-sub">${state.cart.length} รายการ</div>
          </div>
          ${state.cart.length ? '<button class="cart-clear" id="cart-clear">ล้าง</button>' : ''}
        </div>

        <div class="cart-type">
          ${ORDER_TYPES.filter(t => t.id === 'dinein' || t.id === 'takeaway').map(t => `
            <button class="type-btn ${state.orderType === t.id ? 'is-active' : ''}" data-type="${t.id}">${t.id === 'dinein' ? '🍽️ ทานที่นี่' : '🥡 กลับบ้าน'}</button>
          `).join('')}
        </div>

        <div class="cart-info">
          <input class="cart-input" id="cart-customer" placeholder="ชื่อลูกค้า (ไม่บังคับ)" value="${escapeAttr(state.customer)}">
          <input class="cart-input" id="cart-note" placeholder="หมายเหตุ" value="${escapeAttr(state.note)}">
        </div>

        <div class="cart-list">
          ${state.cart.length === 0
            ? `<div class="cart-empty">
                 <div class="cart-empty-glyph">🛒</div>
                 <div>ตะกร้าว่าง<br>เลือกเมนูเพื่อเริ่มสั่ง</div>
               </div>`
            : state.cart.map((l, i) => renderCartLine(l, i)).join('')}
        </div>

        <div class="cart-foot">
          ${state.cart.length ? `
            <div class="cart-totals">
              <div class="cart-total-row"><span>ราคารวม</span><span>${baht(sub)}</span></div>
              ${disc ? `<div class="cart-total-row"><span>ส่วนลด${state.discount.label ? ' · ' + state.discount.label : ''}</span><span>-${baht(disc)}</span></div>` : ''}
              <div class="discount-row">
                ${PROMOS.map(p => `<button class="discount-chip ${state.discount.label === p.label ? 'is-active' : ''}" data-promo="${p.id}">${p.label}</button>`).join('')}
                ${state.discount.value ? '<button class="discount-chip" data-promo="">ล้าง</button>' : ''}
              </div>
              <div class="cart-total-row cart-grand"><span>ยอดสุทธิ</span><span>${baht(total)}</span></div>
            </div>
          ` : ''}
          <button class="primary-btn full" id="cart-pay" ${state.cart.length === 0 ? 'disabled' : ''}>
            <span>${state.cart.length ? 'ชำระเงิน' : 'เลือกเมนูเพื่อสั่ง'}</span>
            ${state.cart.length ? `<span class="primary-btn-price">${baht(total)}</span>` : ''}
          </button>
        </div>
      </aside>
    `;
  }

  function renderCartLine(l, i) {
    const modLabels = (l.modLabels || []).join(', ');
    const opts = [l.tempLabel, l.sizeLabel, l.protein, l.type, l.sauce, l.sweet, l.spice].filter(Boolean).join(' · ');
    return `
      <div class="cart-line">
        <div class="cart-line-top">
          <div class="cart-line-name">
            <div class="cart-line-th">${l.th}</div>
            ${opts ? `<div class="cart-line-en">${opts}</div>` : ''}
            ${modLabels ? `<div class="cart-line-mods">+ ${modLabels}</div>` : ''}
            ${l.note ? `<div class="cart-line-note">📝 ${l.note}</div>` : ''}
          </div>
          <button class="cart-line-x" data-rm="${i}" title="ลบ">×</button>
        </div>
        <div class="cart-line-bot">
          <div class="qty-stepper small">
            <button data-dec="${i}">−</button>
            <span>${l.qty}</span>
            <button data-inc="${i}">+</button>
          </div>
          <div class="cart-line-amt">${baht(l.total)}</div>
        </div>
      </div>
    `;
  }

  function bindCart() {
    $$('.type-btn').forEach(b => b.onclick = () => { state.orderType = b.dataset.type; render(); });
    $$('.discount-chip').forEach(b => b.onclick = () => {
      const id = b.dataset.promo;
      if (!id) { state.discount = { type: 'fixed', value: 0, label: '' }; }
      else {
        const p = PROMOS.find(x => x.id === id);
        if (p) state.discount = { type: p.type, value: p.value, label: p.label };
      }
      render();
    });
    const custInp  = $('#cart-customer'); if (custInp)     custInp.oninput     = (e) => state.customer = e.target.value;
    const noteInp  = $('#cart-note');     if (noteInp)     noteInp.oninput     = (e) => state.note     = e.target.value;
    const clear    = $('#cart-clear');    if (clear)       clear.onclick       = () => { state.cart = []; render(); };
    $$('[data-rm]').forEach(b => b.onclick = () => { state.cart.splice(+b.dataset.rm, 1); render(); });
    $$('[data-inc]').forEach(b => b.onclick = () => { const i = +b.dataset.inc; state.cart[i].qty++; state.cart[i].total = state.cart[i].qty * state.cart[i].unit; render(); });
    $$('[data-dec]').forEach(b => b.onclick = () => { const i = +b.dataset.dec; if (state.cart[i].qty > 1) { state.cart[i].qty--; state.cart[i].total = state.cart[i].qty * state.cart[i].unit; render(); } });
    const pay = $('#cart-pay');     if (pay)         pay.onclick        = openPaymentModal;
    const ch  = $('#cart-handle');  if (ch)          ch.onclick         = () => { state.cartOpenMobile = !state.cartOpenMobile; render(); };
  }

  /* ---------- 4. Staff view ---------- */
  function renderStaffView(s) {
    const allRecords = api.getRecords(state.storeId);
    const today = todayISO();
    const counts = {
      orders: allRecords.filter(r => r.status !== 'paid' && r.status !== 'cancel' && r.dateISO === today).length,
      tables: TABLES[state.storeId].length,
      queue:  allRecords.filter(r => (r.status === 'new' || r.status === 'kitchen' || r.status === 'ready') && r.dateISO === today).length,
      dashboard: 0,
      history: allRecords.length,
    };
    const tabs = [
      { id: 'orders',    label: 'ออเดอร์',  icon: '🧾' },
      { id: 'queue',     label: 'คิว',       icon: '🔔' },
      { id: 'dashboard', label: 'ยอดวันนี้', icon: '📊' },
      { id: 'history',   label: 'ประวัติ',  icon: '📜' },
    ];
    return `
      <section class="staff-view">
        <div class="staff-head">
          <div>
            <h1 class="staff-title">หน้าพนักงาน</h1>
            <div class="staff-sub">${s.name} · แคชเชียร์: <b>${state.cashier}</b></div>
          </div>
          <button class="ghost-btn" id="btn-new-order">+ สร้างออเดอร์ใหม่</button>
        </div>
        <div class="staff-tabs">
          ${tabs.map(t => `
            <button class="staff-tab ${state.staffTab === t.id ? 'is-active' : ''}" data-tab="${t.id}">
              ${t.icon} ${t.label}
              <span class="staff-tab-count">${counts[t.id]}</span>
            </button>
          `).join('')}
        </div>
        ${renderStaffTab(s, allRecords)}
      </section>
    `;
  }

  function renderStaffTab(s, allRecords) {
    // Migrate away from removed tabs (table tracking is gone)
    if (state.staffTab === 'tables') state.staffTab = 'orders';
    if (state.staffTab === 'orders')    return renderOrdersTab(allRecords);
    if (state.staffTab === 'queue')     return renderQueueTab(allRecords);
    if (state.staffTab === 'dashboard') return renderDashTab(allRecords, s);
    if (state.staffTab === 'history')   return renderHistoryTab(allRecords);
    return '';
  }

  function renderOrdersTab(records) {
    const today = todayISO();
    let list = records.filter(r => r.dateISO === today && r.status !== 'cancel');
    if (state.filterStatus !== 'all') list = list.filter(r => r.status === state.filterStatus);
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const filters = [
      { id: 'all', label: 'ทั้งหมด' },
      ...STATUS_FLOW.filter(s => s.id !== 'cancel').map(s => ({ id: s.id, label: s.label })),
    ];

    if (list.length === 0) {
      return `
        <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
          ${filters.map(f => `<button class="chip ${state.filterStatus === f.id ? 'is-active' : ''}" data-filter="${f.id}">${f.label}</button>`).join('')}
        </div>
        <div class="staff-empty">
          <div class="staff-empty-glyph">🍽️</div>
          <div class="staff-empty-title">ยังไม่มีออเดอร์</div>
          <div>กดปุ่ม "สร้างออเดอร์ใหม่" หรือสลับไปโหมดลูกค้าเพื่อเริ่มสั่ง</div>
        </div>
      `;
    }

    return `
      <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
        ${filters.map(f => `<button class="chip ${state.filterStatus === f.id ? 'is-active' : ''}" data-filter="${f.id}">${f.label}</button>`).join('')}
      </div>
      <div class="order-grid">
        ${list.map(renderOrderCard).join('')}
      </div>
    `;
  }

  function renderOrderCard(r) {
    const st = STATUS_FLOW.find(x => x.id === r.status) || STATUS_FLOW[0];
    const items = r.items || r.lines || [];
    const visible = items.slice(0, 4);
    const more = items.length - visible.length;
    const where = r.type === 'dinein' ? (r.table ? `โต๊ะ ${r.table}` : 'นั่งทาน')
                : r.type === 'takeaway' ? 'กลับบ้าน'
                : r.type === 'delivery' ? 'เดลิเวอรี่' : '';
    const next = nextStatus(r.status);
    return `
      <div class="order-card" data-order="${r.orderId}">
        <div class="order-card-head">
          <div class="order-card-id">
            <div class="order-card-no">#${r.orderId}</div>
            <div class="order-card-where">${where}${r.customer ? ' · ' + escHtml(r.customer) : ''}</div>
          </div>
          <div class="status-pill" style="background:${st.bg};color:${st.color}"><span style="width:6px;height:6px;border-radius:50%;background:${st.color};display:inline-block"></span>${st.label}</div>
        </div>
        <ul class="order-card-items">
          ${visible.map(it => `<li><span class="order-card-qty">${it.qty}×</span><span>${escHtml(it.th)}</span></li>`).join('')}
          ${more > 0 ? `<li class="order-card-more">+ อีก ${more} รายการ</li>` : ''}
        </ul>
        <div class="order-card-foot">
          <div class="order-card-meta">
            <div class="order-card-time">${timeAgo(r.createdAt)}</div>
            <div class="order-card-net">${baht(r.total || 0)}</div>
          </div>
          <div class="order-card-actions">
            ${next ? `<button class="step-btn" data-next="${r.orderId}">→ ${next.label}</button>` : ''}
            ${r.status !== 'paid' ? `<button class="pay-btn" data-pay-order="${r.orderId}">ชำระ</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function nextStatus(cur) {
    const order = ['new', 'kitchen', 'ready', 'served', 'paid'];
    const i = order.indexOf(cur);
    if (i < 0 || i >= order.length - 1) return null;
    return STATUS_FLOW.find(s => s.id === order[i + 1]);
  }
  function timeAgo(ts) {
    if (!ts) return '-';
    const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return `${s} วิ.`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m} นาที`;
    const h = Math.round(m / 60);
    return `${h} ชม.`;
  }

  function renderTablesTab(records) {
    const today = todayISO();
    const active = records.filter(r => r.type === 'dinein' && r.dateISO === today && r.status !== 'paid' && r.status !== 'cancel');
    const byTable = {};
    active.forEach(r => { if (r.table) byTable[r.table] = (byTable[r.table] || 0) + 1; });
    const tables = TABLES[state.storeId];
    return `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
        <div style="font-size:13px;color:var(--muted)">โต๊ะทั้งหมด: <b>${tables.length}</b> · ใช้งาน: <b>${Object.keys(byTable).length}</b></div>
        <div style="display:flex;gap:8px">
          <button class="ghost-btn" id="merge-tables">รวมโต๊ะ</button>
          <button class="ghost-btn" id="move-tables">ย้ายโต๊ะ</button>
        </div>
      </div>
      <div class="table-grid">
        ${tables.map(t => {
          const busy = byTable[t.no] || 0;
          return `
            <button class="table-cell ${busy ? 'occupied' : ''}" data-table="${t.no}">
              <div class="table-no">${t.no}</div>
              <div class="table-seats">${t.seats} ที่นั่ง</div>
              <div class="table-status ${busy ? 'busy' : 'free'}">${busy ? `${busy} ออเดอร์` : 'ว่าง'}</div>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderQueueTab(records) {
    const today = todayISO();
    const list = records.filter(r => r.dateISO === today && (r.status === 'new' || r.status === 'kitchen' || r.status === 'ready'));
    list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    if (!list.length) return `
      <div class="staff-empty">
        <div class="staff-empty-glyph">🔔</div>
        <div class="staff-empty-title">คิวว่าง</div>
        <div>ออเดอร์ทั้งหมดเสิร์ฟแล้ว</div>
      </div>
    `;
    return `
      <div class="queue-grid">
        ${list.map((r, i) => {
          const st = STATUS_FLOW.find(x => x.id === r.status);
          const queueNo = String(i + 1).padStart(2, '0');
          return `
            <div class="queue-cell" style="border-color:${st.bg}">
              <div class="queue-num">${queueNo}</div>
              <div class="queue-name">#${r.orderId}</div>
              <div class="queue-tag" style="color:${st.color};font-weight:600">${st.label}</div>
              <div class="queue-tag">${timeAgo(r.createdAt)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderDashTab(records, s) {
    const today = todayISO();
    const todayRec = records.filter(r => r.dateISO === today);
    const paidToday = todayRec.filter(r => r.status === 'paid');
    const revenue = paidToday.reduce((s, r) => s + (r.total || 0), 0);
    const orders = todayRec.length;
    const avgTicket = paidToday.length ? Math.round(revenue / paidToday.length) : 0;
    const pending = todayRec.filter(r => r.status !== 'paid' && r.status !== 'cancel').length;

    // Top items
    const counter = {};
    paidToday.forEach(r => (r.items || []).forEach(it => {
      counter[it.th] = (counter[it.th] || 0) + (it.qty || 1);
    }));
    const top = Object.entries(counter).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxQty = top[0]?.[1] || 1;

    return `
      <div class="dash-widget">
        <div class="dash-tile">
          <div class="dash-tile-label">ยอดขายวันนี้</div>
          <div class="dash-tile-value">${baht(revenue)}</div>
          <div class="dash-tile-hint">${paidToday.length} บิลที่ชำระแล้ว</div>
        </div>
        <div class="dash-tile">
          <div class="dash-tile-label">ออเดอร์</div>
          <div class="dash-tile-value">${orders}</div>
          <div class="dash-tile-hint">${pending} รออยู่</div>
        </div>
        <div class="dash-tile">
          <div class="dash-tile-label">บิลเฉลี่ย</div>
          <div class="dash-tile-value">${baht(avgTicket)}</div>
          <div class="dash-tile-hint">ต่อบิล</div>
        </div>
        <div class="dash-tile">
          <div class="dash-tile-label">เป้าหมายวัน</div>
          <div class="dash-tile-value">${Math.round(revenue / s.target * 100)}%</div>
          <div class="dash-tile-hint">${baht(s.target)} เป้า</div>
        </div>
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 22px">
        <div style="font-family:var(--font-display);font-size:16px;font-weight:600;margin-bottom:14px">เมนูขายดีวันนี้</div>
        ${top.length === 0 ? '<div style="color:var(--muted);text-align:center;padding:30px 0;font-size:13px">ยังไม่มีข้อมูล</div>' :
          top.map(([name, qty]) => `
            <div style="position:relative;padding:10px 12px;margin-bottom:6px;border-radius:8px;display:grid;grid-template-columns:1fr auto;align-items:center">
              <div style="position:absolute;left:0;top:0;bottom:0;width:${qty/maxQty*100}%;background:var(--store-light);border-radius:8px;z-index:0"></div>
              <div style="position:relative;z-index:1;font-size:13px">${escHtml(name)}</div>
              <div style="position:relative;z-index:1;font-family:var(--font-num);font-weight:700;color:var(--store)">${qty}</div>
            </div>
          `).join('')
        }
      </div>
    `;
  }

  function renderHistoryTab(records) {
    const sorted = [...records].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 50);
    if (!sorted.length) return `
      <div class="staff-empty">
        <div class="staff-empty-glyph">📜</div>
        <div class="staff-empty-title">ยังไม่มีประวัติ</div>
      </div>
    `;
    return `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead style="background:var(--surface-2)">
            <tr>
              <th style="text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">ออเดอร์</th>
              <th style="text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">เวลา</th>
              <th style="text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">ประเภท</th>
              <th style="text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">สถานะ</th>
              <th style="text-align:right;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">ยอด</th>
              <th style="text-align:center;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">พิมพ์</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(r => {
              const st = STATUS_FLOW.find(x => x.id === r.status) || STATUS_FLOW[0];
              const when = new Date(r.createdAt || 0);
              return `
                <tr style="border-top:1px solid var(--border)">
                  <td style="padding:10px 14px;font-family:var(--font-num);font-weight:600">#${r.orderId}</td>
                  <td style="padding:10px 14px;color:var(--muted)">${when.toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</td>
                  <td style="padding:10px 14px">${(ORDER_TYPES.find(t => t.id === r.type) || {}).label || '-'}${r.table ? ' · โต๊ะ ' + r.table : ''}</td>
                  <td style="padding:10px 14px"><span class="status-pill" style="background:${st.bg};color:${st.color}">${st.label}</span></td>
                  <td style="padding:10px 14px;text-align:right;font-family:var(--font-num);font-weight:600">${baht(r.total || 0)}</td>
                  <td style="padding:10px 14px;text-align:center"><button class="ghost-btn" style="padding:4px 10px;font-size:11px" data-reprint="${r.orderId}">🖨</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function bindStaffView() {
    $$('.staff-tab').forEach(b => b.onclick = () => { state.staffTab = b.dataset.tab; render(); });
    $$('[data-filter]').forEach(b => b.onclick = () => { state.filterStatus = b.dataset.filter; render(); });
    $$('.order-card').forEach(c => c.onclick = (e) => {
      if (e.target.closest('button')) return;
      openOrderDetail(c.dataset.order);
    });
    $$('[data-next]').forEach(b => b.onclick = (e) => { e.stopPropagation(); advanceOrder(b.dataset.next); });
    $$('[data-pay-order]').forEach(b => b.onclick = (e) => { e.stopPropagation(); payExistingOrder(b.dataset.payOrder); });
    $$('[data-table]').forEach(b => b.onclick = () => { state.tableNo = b.dataset.table; setMode('customer'); });
    $$('[data-reprint]').forEach(b => b.onclick = () => printReceipt(b.dataset.reprint));
    const newBtn = $('#btn-new-order'); if (newBtn) newBtn.onclick = () => setMode('customer');
    const merge = $('#merge-tables'); if (merge) merge.onclick = () => toast('เลือกออเดอร์ที่ต้องการรวม (เร็วๆ นี้)');
    const move = $('#move-tables');  if (move)  move.onclick  = () => toast('เลือกออเดอร์ที่ต้องการย้าย (เร็วๆ นี้)');
  }

  async function advanceOrder(orderId) {
    const list = api.getRecords(state.storeId);
    const r = list.find(x => x.orderId === orderId);
    if (!r) return;
    const next = nextStatus(r.status);
    if (!next) return;
    await api.updateOrder(state.storeId, orderId, { status: next.id });
    toast(`อัพเดทเป็น "${next.label}"`, 'ok');
    render();
  }

  function payExistingOrder(orderId) {
    const list = api.getRecords(state.storeId);
    const r = list.find(x => x.orderId === orderId);
    if (!r) return;
    state.cart = (r.items || []).map(it => ({ ...it }));
    state.orderType = r.type || 'dinein';
    state.tableNo = r.table || '';
    state.customer = r.customer || '';
    state.note = r.note || '';
    state.discount = r.discount || { type: 'fixed', value: 0, label: '' };
    state.modal = { kind: 'payment', editOrderId: orderId };
    renderModal();
  }

  /* ---------- 5. Modals ---------- */
  function renderModal() {
    let old = $('#yy-modal'); if (old) old.remove();
    if (!state.modal) return;
    const wrap = document.createElement('div');
    wrap.id = 'yy-modal';
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = ({
      customizer: renderCustomizerModal,
      payment:    renderPaymentModal,
      qr:         renderQrModal,
      settings:   renderSettingsModal,
      orderDetail:renderOrderDetailModal,
      confirm:    renderConfirmModal,
    }[state.modal.kind] || (() => ''))();
    wrap.onclick = (e) => { if (e.target === wrap) closeModal(); };
    document.body.appendChild(wrap);
    bindModal();
  }
  function closeModal() { state.modal = null; const m = $('#yy-modal'); if (m) m.remove(); }

  /* --- Customizer --- */
  function openCustomizer(itemId, editing) {
    const sections = MENUS[state.storeId];
    const item = sections.flatMap(s => s.items).find(i => i.id === itemId);
    if (!item) return;

    // Use shared customizer when available — covers new optionGroups + legacy
    if (window.YY_CUSTOMIZER) {
      const storeColor = (window.YY_CONFIG?.STORES?.[state.storeId]?.accent) || '#1E40AF';
      const editingIdx = state.editIndex;
      window.YY_CUSTOMIZER.open(item, {
        storeColor,
        mode: 'staff',
        editing: editing || null,
        emoji: item.tempOptions ? '🥛' : (item.proteins ? '🍲' : '🍽️'),
        onConfirm: (r) => {
          const line = {
            itemId: item.id, th: item.th, en: item.en,
            // Legacy keys (so cart rendering + sheet sync stay compatible)
            temp:    r.legacy.temp    || '',
            size:    r.legacy.size    || '',
            protein: r.legacy.protein || '',
            type:    r.legacy.type    || '',
            sauce:   r.legacy.sauce   || '',
            sweet:   r.legacy.sweet   || '',
            spice:   r.legacy.spice   || '',
            tempLabel: r.legacy.temp || '',
            sizeLabel: r.legacy.size || '',
            mods:      (r.mods || []).map(m => m.id),
            modLabels: (r.mods || []).map(m => m.label),
            // New schema (preserved for richer rendering)
            choices: r.choices,
            summary: r.summary,
            qty:   r.qty,
            unit:  r.unitPrice,
            total: r.totalPrice,
            note:  r.note,
          };
          if (editing != null && editingIdx >= 0) {
            state.cart[editingIdx] = line;
            state.editIndex = -1;
          } else {
            state.cart.push(line);
          }
          render();
        },
      });
      return;
    }

    // Fallback to legacy customizer if customizer.js missing
    state.modal = { kind: 'customizer', item, editing: editing || null, editIndex: state.editIndex };
    const e = editing || {};
    state.cust = {
      temp:    e.temp    ?? item.tempOptions?.[0]?.id ?? null,
      size:    e.size    ?? item.sizeOptions?.[0]?.id ?? null,
      protein: e.protein ?? item.proteins?.[0]        ?? null,
      type:    e.type    ?? item.types?.[0]           ?? null,
      sauce:   e.sauce   ?? item.sauces?.[0]          ?? null,
      sweet:   e.sweet   ?? item.sweetness?.[0]       ?? null,
      spice:   e.spice   ?? item.spice?.[0]           ?? null,
      mods:    new Set(e.mods || []),
      qty:     e.qty || 1,
      note:    e.note || '',
    };
    renderModal();
  }

  function renderCustomizerModal() {
    const m = state.modal; const it = m.item; const c = state.cust;
    const s = STORES[state.storeId];
    const tempOpt = it.tempOptions?.find(o => o.id === c.temp);
    const sizeOpt = it.sizeOptions?.find(o => o.id === c.size);
    const modList = (it.modifiers || []).filter(x => c.mods.has(x.id));
    const unit = (tempOpt?.price ?? sizeOpt?.price ?? it.basePrice) + modList.reduce((a, b) => a + b.price, 0);
    const total = unit * c.qty;
    return `
      <div class="modal" onclick="event.stopPropagation()" style="max-width:600px">
        <div class="customizer-hero">
          ${renderThumb(it, s)}
          <div>
            <div class="customizer-th">${it.th}</div>
            <div class="customizer-en">${it.en}${it.hint ? ' · ' + it.hint : ''}</div>
            <div class="customizer-base">เริ่มต้น ${baht(it.basePrice)}</div>
          </div>
          <button class="modal-close" id="cust-close" aria-label="ปิด">×</button>
        </div>
        <div class="customizer-body">
          ${it.tempOptions ? optGroup('อุณหภูมิ', 'Temperature', it.tempOptions.map(o => chip(o.label, c.temp === o.id, baht(o.price), `cust-temp-${o.id}`))) : ''}
          ${it.sizeOptions && it.sizeOptions.length > 1 ? optGroup('ขนาด', 'Size', it.sizeOptions.map(o => chip(o.label, c.size === o.id, baht(o.price), `cust-size-${o.id}`))) : ''}
          ${it.types     ? optGroup('ชนิด',           'Style',     it.types.map(o => chip(o, c.type === o, '', `cust-type-${cleanKey(o)}`))) : ''}
          ${it.proteins  ? optGroup('เนื้อสัตว์',     'Protein',   it.proteins.map(o => chip(o, c.protein === o, '', `cust-protein-${cleanKey(o)}`))) : ''}
          ${it.sauces    ? optGroup('น้ำจิ้ม',        'Sauce',     it.sauces.map(o => chip(o, c.sauce === o, '', `cust-sauce-${cleanKey(o)}`))) : ''}
          ${it.sweetness ? optGroup('ระดับความหวาน',  'Sweetness', it.sweetness.map(o => chip(o, c.sweet === o, '', `cust-sweet-${cleanKey(o)}`))) : ''}
          ${it.spice     ? optGroup('ระดับความเผ็ด',  'Spice',     it.spice.map(o => chip(o, c.spice === o, '', `cust-spice-${cleanKey(o)}`))) : ''}
          ${it.modifiers && it.modifiers.length ? optGroup('ท็อปปิ้งเพิ่ม', 'Add-ons',
            it.modifiers.map(m => chip(m.label, c.mods.has(m.id), '+' + baht(m.price), `cust-mod-${m.id}`))) : ''}
          <div class="opt-group">
            <div class="opt-group-head"><span class="opt-group-th">หมายเหตุ</span><span class="opt-group-en">Special notes</span></div>
            <input class="note-input" type="text" id="cust-note" placeholder="เช่น ไม่ใส่ผัก / น้ำซุปแยก" value="${escapeAttr(c.note)}">
          </div>
        </div>
        <div class="customizer-foot">
          <div class="qty-stepper">
            <button id="cust-dec" aria-label="ลด">−</button>
            <span>${c.qty}</span>
            <button id="cust-inc" aria-label="เพิ่ม">+</button>
          </div>
          <button class="primary-btn" id="cust-add">
            <span>${m.editing ? 'อัปเดต' : 'เพิ่มเข้าตะกร้า'}</span>
            <span class="primary-btn-price">${baht(total)}</span>
          </button>
        </div>
      </div>
    `;
  }

  function cleanKey(s) { return String(s).replace(/[^a-z0-9-]/gi, '_'); }

  /**
   * Recompute customizer footer (qty + price) without re-rendering the modal.
   * Eliminates the flicker that happened when chips were clicked.
   */
  function refreshCustomizerFooter() {
    const m = state.modal;
    if (!m || m.kind !== 'customizer') return;
    const it = m.item; const c = state.cust;
    const tempOpt = it.tempOptions?.find(o => o.id === c.temp);
    const sizeOpt = it.sizeOptions?.find(o => o.id === c.size);
    const modList = (it.modifiers || []).filter(x => c.mods.has(x.id));
    const unit  = (tempOpt?.price ?? sizeOpt?.price ?? it.basePrice) + modList.reduce((a, b) => a + b.price, 0);
    const total = unit * c.qty;
    const qtyEl   = document.querySelector('.qty-stepper span');
    const priceEl = document.querySelector('.primary-btn-price');
    if (qtyEl)   qtyEl.textContent   = c.qty;
    if (priceEl) priceEl.textContent = baht(total);
  }

  function optGroup(label, sub, content) {
    return `
      <div class="opt-group">
        <div class="opt-group-head"><span class="opt-group-th">${label}</span><span class="opt-group-en">${sub}</span></div>
        <div class="chip-row">${content.join('')}</div>
      </div>
    `;
  }
  function chip(label, active, suffix, id) {
    return `<button class="chip ${active ? 'is-active' : ''}" id="${id}">${escHtml(label)}${suffix ? `<small>${suffix}</small>` : ''}</button>`;
  }

  /* --- Payment --- */
  function openPaymentModal() {
    if (state.cart.length === 0) return;
    state.modal = { kind: 'payment', method: 'cash', received: '' };
    renderModal();
  }

  function renderPaymentModal() {
    const m = state.modal;
    const total = cartGrandTotal();
    const received = +m.received || 0;
    const change = received - total;
    const isShort = received > 0 && change < 0;

    return `
      <div class="modal pay-modal" onclick="event.stopPropagation()">
        <div class="pay-head">
          <div>
            <div class="pay-head-title">ชำระเงิน</div>
            <div class="pay-head-sub">${STORES[state.storeId].name}</div>
          </div>
          <button class="modal-close light" id="pay-close">×</button>
        </div>
        <div class="pay-body">
          <div class="pay-summary">
            ${state.cart.map(l => `
              <div class="pay-line">
                <div class="pay-line-qty">${l.qty}×</div>
                <div class="pay-line-name">${l.th}${(l.tempLabel || l.sizeLabel) ? ` <small style="color:var(--muted)">(${[l.tempLabel, l.sizeLabel].filter(Boolean).join(', ')})</small>` : ''}</div>
                <div class="pay-line-amt">${baht(l.total)}</div>
              </div>
            `).join('')}
            <div class="pay-divider"></div>
            <div class="pay-line"><div></div><div class="pay-line-name">ราคารวม</div><div class="pay-line-amt">${baht(cartSubtotal())}</div></div>
            ${discountAmount() ? `<div class="pay-line"><div></div><div class="pay-line-name">ส่วนลด${state.discount.label ? ' · ' + state.discount.label : ''}</div><div class="pay-line-amt">-${baht(discountAmount())}</div></div>` : ''}
            <div class="pay-line pay-total"><div></div><div class="pay-line-name">ยอดสุทธิ</div><div class="pay-line-amt">${baht(total)}</div></div>
          </div>
          <div class="pay-side">
            <div class="pay-methods">
              ${PAYMENT_METHODS.map(p => `
                <button class="pay-method ${m.method === p.id ? 'is-active' : ''}" data-method="${p.id}">
                  <div class="pay-method-ic">${p.icon}</div>
                  <div>${p.label}</div>
                </button>
              `).join('')}
            </div>

            ${m.method === 'qr' ? `
              <div class="pay-qr-block">
                <div id="pay-qr" class="pay-qr-render"></div>
                <div style="font-size:12px;color:var(--muted);margin-top:10px">สแกนเพื่อชำระ <b style="font-size:16px;color:var(--store)">${baht(total)}</b></div>
              </div>
            ` : m.method === 'cash' ? `
              <input class="pay-input" id="pay-received" type="number" placeholder="รับเงินมา (บาท)" value="${m.received || ''}">
              <div class="pay-presets">
                ${[total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000]
                  .filter((v, i, a) => v >= total && a.indexOf(v) === i)
                  .map(v => `<button class="pay-preset" data-preset="${v}">${baht(v)}</button>`).join('')}
              </div>
              ${m.received ? `
                <div class="pay-change ${isShort ? 'is-short' : ''}">
                  <span>${isShort ? 'ขาด' : 'เงินทอน'}</span>
                  <span>${baht(Math.abs(change))}</span>
                </div>
              ` : ''}
            ` : `
              <div style="padding:14px;background:var(--surface-2);border-radius:12px;font-size:13px;color:var(--muted);text-align:center">
                ${m.method === 'transfer' ? '🏦 โอนผ่านธนาคาร — กดยืนยันเมื่อได้รับเงิน' : '💳 รูดบัตร — กดยืนยันเมื่อสำเร็จ'}
              </div>
            `}

            <button class="primary-btn full" id="pay-confirm"
              ${m.method === 'cash' && (!m.received || isShort) ? 'disabled' : ''}>
              <span>ยืนยันการชำระ</span>
              <span class="primary-btn-price">${baht(total)}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* --- Receipt / confirmation --- */
  function renderConfirmModal() {
    const r = state.modal.record;
    return `
      <div class="modal" onclick="event.stopPropagation()" style="max-width:440px">
        <div style="background:var(--store);color:#fff;padding:32px 28px 24px;text-align:center">
          <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.25);display:grid;place-items:center;font-size:32px;margin:0 auto 12px">✓</div>
          <div style="font-family:var(--font-display);font-size:22px;font-weight:600">บันทึกออเดอร์สำเร็จ</div>
          <div style="font-size:13px;opacity:.9;margin-top:4px">บิลถูกบันทึกในระบบแล้ว</div>
        </div>
        <div style="padding:24px">
          <div style="font-family:var(--font-num);font-size:40px;font-weight:700;text-align:center;letter-spacing:-.02em;color:var(--store);margin-bottom:14px">#${r.orderId}</div>
          <div style="display:grid;gap:8px;font-size:13px;margin-bottom:18px;padding:14px 16px;background:var(--surface-2);border-radius:12px">
            <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">ประเภท</span><b>${(ORDER_TYPES.find(t => t.id === r.type) || {}).label}${r.table ? ' · โต๊ะ ' + r.table : ''}</b></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">ยอดสุทธิ</span><b>${baht(r.total)}</b></div>
            ${r.paid ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">รับเงิน</span><b>${baht(r.paid)}</b></div>` : ''}
            ${r.change ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">เงินทอน</span><b>${baht(r.change)}</b></div>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <button class="ghost-btn" id="confirm-close" style="justify-content:center">เสร็จสิ้น</button>
            <button class="primary-btn" id="confirm-print" style="padding:10px 14px"><span>🖨 พิมพ์ใบเสร็จ</span></button>
          </div>
        </div>
      </div>
    `;
  }

  /* --- QR ordering --- */
  function openQrModal() {
    state.modal = { kind: 'qr' };
    renderModal();
  }
  function renderQrModal() {
    const s = STORES[state.storeId];
    const url = location.href.split('?')[0] + '?store=' + s.id;
    return `
      <div class="modal" onclick="event.stopPropagation()" style="max-width:440px">
        <div style="background:var(--store);color:#fff;padding:24px 28px;text-align:center">
          <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;font-weight:700">QR สั่งอาหาร</div>
          <div style="font-family:var(--font-display);font-size:22px;font-weight:600;margin-top:6px">${s.name}</div>
          <div style="font-size:13px;opacity:.85">ลูกค้าสแกนเพื่อดูเมนู</div>
          <button class="modal-close light" id="qr-close">×</button>
        </div>
        <div style="padding:24px 28px;display:flex;flex-direction:column;align-items:center;gap:16px">
          <div id="qr-canvas" style="background:#fff;padding:14px;border-radius:14px;border:1px solid var(--border)"></div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);background:var(--surface-2);padding:8px 14px;border-radius:8px;word-break:break-all;text-align:center">${url}</div>
          <button class="primary-btn full" id="qr-close-2">เสร็จสิ้น</button>
        </div>
      </div>
    `;
  }

  /* --- Settings --- */
  function openSettings() {
    state.modal = { kind: 'settings' };
    renderModal();
  }
  function renderSettingsModal() {
    return `
      <div class="modal settings-modal" onclick="event.stopPropagation()">
        <button class="modal-close" id="set-close">×</button>
        <h2 class="settings-title">ตั้งค่าระบบ</h2>
        <p class="settings-sub">การตั้งค่าจะถูกเก็บไว้ในเบราว์เซอร์</p>

        <div class="settings-field">
          <label>Google Apps Script URL</label>
          <input class="cart-input" id="set-api" placeholder="https://script.google.com/macros/s/.../exec" value="${escapeAttr(api.apiUrl())}">
        </div>

        <div class="settings-field">
          <label>ชื่อแคชเชียร์</label>
          <input class="cart-input" id="set-cashier" value="${escapeAttr(state.cashier)}">
        </div>

        <div class="settings-field">
          <label>ทดสอบการเชื่อมต่อ</label>
          <button class="ghost-btn" id="set-ping" style="justify-self:start">เช็คสถานะ API</button>
          <div id="set-ping-result" style="font-size:12px;color:var(--muted);margin-top:4px"></div>
        </div>

        <div class="settings-actions">
          <button class="primary-btn" id="set-save" style="flex:1">บันทึก</button>
          <button class="ghost-btn danger" id="set-clear">ลบข้อมูลทั้งหมด</button>
        </div>

        <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border);font-size:11px;color:var(--muted)">
          ข้อมูลถูกเก็บที่ <code>localStorage</code> และซิงค์เข้า Google Sheets อัตโนมัติทุก 15 วินาที
          <br>คิวรอซิงค์: <b id="set-queue">${api.queueLength()}</b> รายการ
        </div>
      </div>
    `;
  }

  /* --- Order detail --- */
  function openOrderDetail(orderId) {
    const r = api.getRecords(state.storeId).find(x => x.orderId === orderId);
    if (!r) return;
    state.modal = { kind: 'orderDetail', record: r };
    renderModal();
  }
  function renderOrderDetailModal() {
    const r = state.modal.record;
    const st = STATUS_FLOW.find(x => x.id === r.status) || STATUS_FLOW[0];
    return `
      <div class="modal" onclick="event.stopPropagation()" style="max-width:560px">
        <div style="background:var(--store);color:#fff;padding:20px 26px;display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-family:var(--font-num);font-size:26px;font-weight:700">#${r.orderId}</div>
            <div style="font-size:13px;opacity:.9">${(ORDER_TYPES.find(t => t.id === r.type) || {}).label}${r.table ? ' · โต๊ะ ' + r.table : ''}</div>
          </div>
          <span class="status-pill" style="background:rgba(255,255,255,.2);color:#fff">${st.label}</span>
          <button class="modal-close light" id="od-close">×</button>
        </div>
        <div style="padding:20px 24px;max-height:60vh;overflow-y:auto">
          <ul style="list-style:none;padding:0;margin:0">
            ${(r.items || []).map(it => `
              <li style="padding:10px 0;border-bottom:1px solid var(--border)">
                <div style="display:grid;grid-template-columns:30px 1fr auto;gap:10px;font-size:14px;align-items:baseline">
                  <span style="font-family:var(--font-num);font-weight:700;color:var(--store)">${it.qty}×</span>
                  <span style="font-weight:500">${it.th}</span>
                  <span style="font-family:var(--font-num);font-weight:600">${baht(it.total)}</span>
                </div>
                ${it.modLabels?.length ? `<div style="font-size:12px;color:var(--muted);margin-left:40px;margin-top:3px">+ ${it.modLabels.join(', ')}</div>` : ''}
                ${it.note ? `<div style="font-size:12px;color:var(--muted);margin-left:40px;margin-top:3px;font-style:italic">📝 ${it.note}</div>` : ''}
              </li>
            `).join('')}
          </ul>
          <div style="margin-top:14px;padding:14px 16px;background:var(--store-light);border-radius:12px;font-size:13px;display:grid;gap:4px">
            <div style="display:flex;justify-content:space-between"><span>ยอดสุทธิ</span><b>${baht(r.total)}</b></div>
            ${r.paid ? `<div style="display:flex;justify-content:space-between"><span>รับ</span><b>${baht(r.paid)}</b></div>` : ''}
            ${r.change ? `<div style="display:flex;justify-content:space-between"><span>ทอน</span><b>${baht(r.change)}</b></div>` : ''}
            ${r.paymentMethod ? `<div style="display:flex;justify-content:space-between"><span>วิธีชำระ</span><b>${(PAYMENT_METHODS.find(p => p.id === r.paymentMethod) || {}).label || r.paymentMethod}</b></div>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
            <button class="ghost-btn" id="od-reprint" style="justify-content:center">🖨 พิมพ์ซ้ำ</button>
            <button class="primary-btn" id="od-close-2" style="padding:10px 14px">เสร็จสิ้น</button>
          </div>
        </div>
      </div>
    `;
  }

  function bindModal() {
    if (!state.modal) return;
    const kind = state.modal.kind;

    if (kind === 'customizer') {
      const it = state.modal.item;
      $('#cust-close').onclick = closeModal;
      // Quantity stepper (surgical update — no re-render)
      $('#cust-dec').onclick = () => { state.cust.qty = Math.max(1, state.cust.qty - 1); refreshCustomizerFooter(); };
      $('#cust-inc').onclick = () => { state.cust.qty++; refreshCustomizerFooter(); };
      $('#cust-note').oninput = (e) => state.cust.note = e.target.value;

      // Single-choice groups → swap .is-active, refresh footer only (no flicker)
      function bindGroup(opts, idFn, fieldName) {
        opts.forEach(o => {
          const id = idFn(o);
          const btn = $('#' + id);
          if (!btn) return;
          btn.onclick = () => {
            const val = (typeof o === 'object' && 'id' in o) ? o.id : o;
            state.cust[fieldName] = val;
            // Swap .is-active among siblings (same chip-row)
            const row = btn.closest('.chip-row');
            if (row) row.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
            btn.classList.add('is-active');
            refreshCustomizerFooter();
          };
        });
      }

      if (it.tempOptions) bindGroup(it.tempOptions, o => 'cust-temp-' + o.id,                'temp');
      if (it.sizeOptions) bindGroup(it.sizeOptions, o => 'cust-size-' + o.id,                'size');
      if (it.types)       bindGroup(it.types,       o => 'cust-type-' + cleanKey(o),         'type');
      if (it.proteins)    bindGroup(it.proteins,    o => 'cust-protein-' + cleanKey(o),      'protein');
      if (it.sauces)      bindGroup(it.sauces,      o => 'cust-sauce-' + cleanKey(o),        'sauce');
      if (it.sweetness)   bindGroup(it.sweetness,   o => 'cust-sweet-' + cleanKey(o),        'sweet');
      if (it.spice)       bindGroup(it.spice,       o => 'cust-spice-' + cleanKey(o),        'spice');

      // Multi-toggle (modifiers) — toggle .is-active and refresh footer
      if (it.modifiers) {
        it.modifiers.forEach(m => {
          const btn = $('#cust-mod-' + m.id);
          if (!btn) return;
          btn.onclick = () => {
            const active = state.cust.mods.has(m.id);
            if (active) { state.cust.mods.delete(m.id); btn.classList.remove('is-active'); }
            else        { state.cust.mods.add(m.id);    btn.classList.add('is-active'); }
            refreshCustomizerFooter();
          };
        });
      }

      $('#cust-add').onclick = () => addToCart();
    }

    if (kind === 'payment') {
      $('#pay-close').onclick = closeModal;
      $$('[data-method]').forEach(b => b.onclick = () => { state.modal.method = b.dataset.method; renderModal(); });
      const recv = $('#pay-received'); if (recv) recv.oninput = (e) => { state.modal.received = e.target.value; renderModal(); };
      $$('[data-preset]').forEach(b => b.onclick = () => { state.modal.received = b.dataset.preset; renderModal(); });
      $('#pay-confirm').onclick = () => completePayment();
      if (state.modal.method === 'qr') {
        const el = $('#pay-qr');
        if (el && window.QRCode) {
          el.innerHTML = '';
          const ref = `YY-${state.storeId.toUpperCase()}-${Date.now()}-${Math.round(cartGrandTotal())}`;
          new QRCode(el, { text: ref, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
        }
      }
    }

    if (kind === 'qr') {
      $('#qr-close').onclick = closeModal;
      $('#qr-close-2').onclick = closeModal;
      const el = $('#qr-canvas');
      if (el && window.QRCode) {
        el.innerHTML = '';
        const url = location.href.split('?')[0] + '?store=' + state.storeId;
        new QRCode(el, { text: url, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
      }
    }

    if (kind === 'settings') {
      $('#set-close').onclick = closeModal;
      $('#set-save').onclick = () => {
        const url = $('#set-api').value.trim();
        const cashier = $('#set-cashier').value.trim() || 'พนักงาน';
        api.setApiUrl(url);
        state.cashier = cashier;
        localStorage.setItem('yy.cashier', cashier);
        toast('บันทึกการตั้งค่าแล้ว', 'ok');
        closeModal(); render();
      };
      $('#set-ping').onclick = async () => {
        $('#set-ping-result').textContent = 'กำลังทดสอบ...';
        api.setApiUrl($('#set-api').value.trim());
        const r = await api.ping();
        $('#set-ping-result').textContent = r.ok ? `✓ เชื่อมต่อสำเร็จ (v${r.v || '?'})` : `✗ เชื่อมต่อไม่ได้: ${r.error}`;
      };
      $('#set-clear').onclick = () => {
        if (!confirm('ลบข้อมูลทั้งหมดในเบราว์เซอร์? (ข้อมูลใน Google Sheets จะไม่ถูกลบ)')) return;
        STORE_IDS.forEach(id => api.clearStore(id));
        toast('ลบข้อมูลทั้งหมดแล้ว', 'ok');
        closeModal(); render();
      };
    }

    if (kind === 'orderDetail') {
      $('#od-close').onclick = closeModal;
      $('#od-close-2').onclick = closeModal;
      $('#od-reprint').onclick = () => { printReceipt(state.modal.record.orderId); closeModal(); };
    }

    if (kind === 'confirm') {
      $('#confirm-close').onclick = () => { closeModal(); state.cart = []; state.tableNo = ''; state.customer = ''; state.note = ''; state.discount = { type: 'fixed', value: 0, label: '' }; render(); };
      $('#confirm-print').onclick = () => { printReceipt(state.modal.record.orderId); };
    }
  }

  function addToCart() {
    const m = state.modal; const it = m.item; const c = state.cust;
    const tempOpt = it.tempOptions?.find(o => o.id === c.temp);
    const sizeOpt = it.sizeOptions?.find(o => o.id === c.size);
    const mods = (it.modifiers || []).filter(x => c.mods.has(x.id));
    const unit = (tempOpt?.price ?? sizeOpt?.price ?? it.basePrice) + mods.reduce((a, b) => a + b.price, 0);
    const line = {
      itemId: it.id, th: it.th, en: it.en,
      temp: c.temp, size: c.size, protein: c.protein, type: c.type, sauce: c.sauce, sweet: c.sweet, spice: c.spice,
      tempLabel: tempOpt?.label || '', sizeLabel: sizeOpt?.label || '',
      mods: mods.map(x => x.id), modLabels: mods.map(x => x.label),
      qty: c.qty, unit, total: unit * c.qty, note: c.note,
    };
    if (m.editing != null && state.editIndex >= 0) {
      state.cart[state.editIndex] = line;
      state.editIndex = -1;
    } else {
      state.cart.push(line);
    }
    closeModal();
    render();
  }

  /* ---------- Complete payment ---------- */
  async function completePayment() {
    const total = cartGrandTotal();
    const m = state.modal;
    const received = m.method === 'cash' ? (+m.received || 0) : total;
    const change = Math.max(0, received - total);
    const record = {
      orderId: state.modal.editOrderId || api.nextOrderNo(state.storeId),
      store: state.storeId,
      dateISO: todayISO(),
      createdAt: Date.now(),
      status: 'paid',
      type: state.orderType,
      table: state.tableNo,
      customer: state.customer,
      cashier: state.cashier,
      items: state.cart.map(l => ({ ...l, mods: l.mods || [], modLabels: l.modLabels || [] })),
      subtotal: cartSubtotal(),
      discount: state.discount.value ? { ...state.discount, amount: discountAmount() } : null,
      total,
      paid: received,
      change,
      paymentMethod: m.method,
      note: state.note,
    };
    await api.saveOrder(state.storeId, record);
    toast('ชำระเงินสำเร็จ', 'ok');
    state.modal = { kind: 'confirm', record };
    renderModal();
  }

  /* ---------- Print receipt ---------- */
  function printReceipt(orderId) {
    const r = api.getRecords(state.storeId).find(x => x.orderId === orderId);
    if (!r) return;
    const s = STORES[state.storeId];
    const html = `
      <div class="receipt">
        <div class="receipt-head">
          <h2>${s.name}</h2>
          <div class="receipt-meta">${s.tagline}</div>
          <div class="receipt-meta">${new Date(r.createdAt || Date.now()).toLocaleString('th-TH')}</div>
          <div class="receipt-meta">บิล <b>#${r.orderId}</b> · ${(ORDER_TYPES.find(t => t.id === r.type) || {}).label}${r.table ? ' · โต๊ะ ' + r.table : ''}</div>
        </div>
        ${(r.items || []).map(it => `
          <div class="receipt-line">
            <span>${it.qty}×</span>
            <span>${it.th}${it.tempLabel || it.sizeLabel ? ` (${[it.tempLabel, it.sizeLabel].filter(Boolean).join(', ')})` : ''}${it.modLabels?.length ? '<br><small>+ ' + it.modLabels.join(', ') + '</small>' : ''}</span>
            <span>${baht(it.total)}</span>
          </div>
        `).join('')}
        <div class="receipt-total">
          <div class="receipt-line"><span></span><span>ราคารวม</span><span>${baht(r.subtotal || r.total)}</span></div>
          ${r.discount && r.discount.amount ? `<div class="receipt-line"><span></span><span>ส่วนลด</span><span>-${baht(r.discount.amount)}</span></div>` : ''}
          <div class="receipt-line receipt-grand"><span></span><span>สุทธิ</span><span>${baht(r.total)}</span></div>
          ${r.paid ? `<div class="receipt-line"><span></span><span>รับ</span><span>${baht(r.paid)}</span></div>` : ''}
          ${r.change ? `<div class="receipt-line"><span></span><span>ทอน</span><span>${baht(r.change)}</span></div>` : ''}
        </div>
        <div style="text-align:center;margin-top:14px;font-size:11px;border-top:1px dashed #000;padding-top:8px">
          ขอบคุณที่อุดหนุน 🙏<br>${s.hours}
        </div>
      </div>
    `;
    const f = document.getElementById('print-frame');
    const doc = f.contentDocument || f.contentWindow.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>ใบเสร็จ #${r.orderId}</title>
      <style>
        body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 0; }
        .receipt { width: 80mm; max-width: 100%; padding: 14px; }
        .receipt-head { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .receipt-head h2 { margin: 0; font-weight: 700; }
        .receipt-meta { font-size: 11px; margin: 4px 0; }
        .receipt-line { display: grid; grid-template-columns: 24px 1fr auto; gap: 6px; font-size: 12px; padding: 3px 0; }
        .receipt-total { border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; }
        .receipt-grand { font-weight: 700; font-size: 14px; }
        small { font-size: 10px; color: #444; }
        @page { size: 80mm auto; margin: 0; }
      </style></head><body>${html}</body></html>`);
    doc.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); }, 200);
  }

  /* ---------- 6. Bootstrap ---------- */
  function start() {
    applyStoreAccent();

    // Apply ?store= from URL (used by QR sharing)
    const sp = new URLSearchParams(location.search);
    if (sp.get('store') && STORES[sp.get('store')]) {
      state.storeId = sp.get('store');
      applyStoreAccent();
    }

    // Re-render on cross-tab data changes
    api.on('records-changed', () => render());
    api.on('queue-changed', () => {
      const dot = document.getElementById('conn-dot');
      if (dot) {} // footer is re-rendered each render(); cheap
    });
    api.on('online', () => { $('#yy-offline').classList.remove('show'); toast('กลับมาออนไลน์แล้ว', 'ok'); render(); });
    api.on('offline', () => { $('#yy-offline').classList.add('show'); render(); });

    // Auto-refresh from server every 30s
    api.startAutoRefresh(30000);

    // Pull initial data
    api.pullOrders(state.storeId).catch(() => {});

    if (!api.isOnline()) $('#yy-offline').classList.add('show');

    render();
  }

  document.addEventListener('DOMContentLoaded', start);
  if (document.readyState !== 'loading') start();
})();
