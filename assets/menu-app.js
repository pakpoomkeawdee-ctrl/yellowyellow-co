/* ============================================================
 * yellowyellow.co — Customer menu app (menu.html)
 *
 * What this is:
 *   - A simplified, customer-facing menu/ordering app
 *   - NO admin features, NO payment (staff handles at POS)
 *   - Browse menu → add to cart → place order → track status
 *
 * Used by customers scanning a QR at the table.
 * ============================================================ */
(function () {
  'use strict';

  const cfg   = window.YY_CONFIG;
  const auth  = window.YY_AUTH;
  const MENUS = window.YY_MENUS;
  const api   = window.YY_API;
  const { STORES, fmt } = cfg;
  const { baht, numTH } = fmt;

  // ── State ──────────────────────────────────────────────────
  const storeId = auth.getStoreFromURL();
  const store   = STORES[storeId] || STORES.nmtun;

  const state = {
    activeCat:  null,            // null = show all
    search:     '',
    cart:       readCart(),      // [{ itemId, th, en, qty, unitPrice, total, opts:{} }]
    drawerOpen: false,
    orderType:  localStorage.getItem(`yy.${storeId}.orderType`) || 'dinein', // 'dinein' | 'takeaway'
    activeOrderId: localStorage.getItem(`yy.${storeId}.activeOrder`) || '',
    pollTm: null,
  };

  function readCart() {
    try { return JSON.parse(localStorage.getItem(`yy.${storeId}.menu.cart`) || '[]'); }
    catch { return []; }
  }
  function writeCart() {
    localStorage.setItem(`yy.${storeId}.menu.cart`, JSON.stringify(state.cart));
  }

  // ── Theme ──────────────────────────────────────────────────
  function applyTheme() {
    const r = document.documentElement.style;
    r.setProperty('--store', store.accent);
    r.setProperty('--store-soft', store.accentSoft);
    r.setProperty('--store-tint', store.accentTint);
    r.setProperty('--store-light', store.accentLight);
  }

  // ── Render: header ─────────────────────────────────────────
  function renderHeader() {
    document.getElementById('store_name').textContent = store.name;
    document.getElementById('store_sub').textContent  = store.hours;
    document.getElementById('hero_title').textContent = `เมนู ${store.shortName}`;
    document.getElementById('hero_sub').textContent   = store.tagline;
    document.title = `${store.name} · เมนู`;
  }

  // ── Render: category chips ────────────────────────────────
  function renderCats() {
    const cats = MENUS[storeId] || [];
    const html = ['<button class="cat-chip ' + (state.activeCat === null ? 'active' : '') + '" data-cat="">ทั้งหมด</button>']
      .concat(cats.map(c => `<button class="cat-chip ${state.activeCat === c.cat ? 'active' : ''}" data-cat="${c.cat}">${c.label}</button>`))
      .join('');
    document.getElementById('cats').innerHTML = html;
  }

  // ── Render: menu list ─────────────────────────────────────
  function renderMenu() {
    const cats = MENUS[storeId] || [];
    const q = state.search.trim().toLowerCase();
    const root = document.getElementById('menu');

    const sections = cats
      .filter(c => state.activeCat === null || state.activeCat === c.cat)
      .map(c => {
        const items = c.items.filter(it =>
          !q ||
          (it.th || '').toLowerCase().includes(q) ||
          (it.en || '').toLowerCase().includes(q)
        );
        if (!items.length) return '';
        return `
          <h3 class="sec-h">${c.label}${c.en ? ' · ' + c.en : ''}</h3>
          ${items.map(it => itemCard(it)).join('')}
        `;
      });

    const visible = sections.filter(Boolean);
    if (!visible.length) {
      root.innerHTML = `<div class="empty"><div class="empty-emoji">🔍</div>ไม่พบเมนูที่ค้นหา</div>`;
      return;
    }
    root.innerHTML = visible.join('');
  }

  function itemCard(it) {
    const price = baht(it.basePrice);
    const emoji = pickEmoji(it);
    return `
    <div class="item" data-item="${it.id}">
      <div class="item-img">${emoji}</div>
      <div class="item-body">
        <h4 class="item-name">${it.th}</h4>
        ${it.en ? `<p class="item-en">${it.en}</p>` : ''}
        <div class="item-price">${price}</div>
      </div>
      <button class="add-btn" aria-label="เพิ่ม">+</button>
    </div>`;
  }
  function pickEmoji(it) {
    const th = (it.th || '').toLowerCase();
    if (it.store === 'nmtun')  return '🥛';
    if (th.includes('ทะเล') || th.includes('กุ้ง') || th.includes('ปลา')) return '🦐';
    if (th.includes('ไก่'))  return '🍗';
    if (th.includes('หมู'))  return '🐖';
    if (th.includes('ข้าว')) return '🍚';
    if (th.includes('สุกี้')) return '🍲';
    return store.badge || '🍽️';
  }

  // ── Cart ──────────────────────────────────────────────────
  function findItem(itemId) {
    const cats = MENUS[storeId] || [];
    for (const c of cats) for (const it of c.items) if (it.id === itemId) return it;
    return null;
  }

  function addToCart(itemId) {
    const it = findItem(itemId);
    if (!it) return;

    // If item has options → open customizer; else add directly
    const CUST = window.YY_CUSTOMIZER;
    if (CUST && CUST.hasOptions(it)) {
      CUST.open(it, {
        storeColor: store.accent,
        mode: 'customer',
        emoji: pickEmoji(it),
        onConfirm: (r) => {
          state.cart.push({
            itemId: it.id,
            th: it.th, en: it.en || '',
            qty: r.qty,
            unitPrice: r.unitPrice,
            total: r.totalPrice,
            note: r.note,
            choices: r.choices,
            mods: r.mods,
            opts: r.legacy,  // legacy keys for sheet sync
            summary: r.summary,
            hasOpts: true,
          });
          writeCart();
          renderCart();
          toast('✓ เพิ่ม ' + it.th + ' แล้ว');
        },
      });
      return;
    }

    // No options — quick add (merge with existing same-item line)
    const existing = state.cart.find(r => r.itemId === itemId && !r.hasOpts);
    if (existing) {
      existing.qty += 1;
      existing.total = existing.qty * existing.unitPrice;
    } else {
      state.cart.push({
        itemId, th: it.th, en: it.en || '',
        qty: 1, unitPrice: it.basePrice, total: it.basePrice,
      });
    }
    writeCart();
    renderCart();
    toast('✓ เพิ่ม ' + it.th + ' แล้ว');
  }

  function setQty(idx, qty) {
    if (qty <= 0) state.cart.splice(idx, 1);
    else {
      state.cart[idx].qty   = qty;
      state.cart[idx].total = qty * state.cart[idx].unitPrice;
    }
    writeCart();
    renderCart();
  }

  function cartCount() { return state.cart.reduce((s, r) => s + r.qty, 0); }
  function cartTotal() { return state.cart.reduce((s, r) => s + r.total, 0); }

  function renderCart() {
    const n = cartCount();
    const bar = document.getElementById('cart_bar');
    document.getElementById('cart_count').textContent = numTH(n);
    document.getElementById('cart_total').textContent = baht(cartTotal());
    bar.classList.toggle('show', n > 0);

    // Reflect orderType in toggle buttons
    document.querySelectorAll('#ot_row [data-ot]').forEach(b => {
      b.classList.toggle('on', b.dataset.ot === state.orderType);
    });

    // Drawer body
    const body = document.getElementById('drawer_body');
    if (!state.cart.length) {
      body.innerHTML = `<div class="empty"><div class="empty-emoji">🛒</div>ตะกร้าว่างเปล่า</div>`;
    } else {
      body.innerHTML = state.cart.map((r, i) => {
        const summary = Array.isArray(r.summary) && r.summary.length
          ? `<div style="font-size:11.5px;color:var(--muted);margin:3px 0 4px;line-height:1.4">${r.summary.map(s => `• ${s}`).join('<br>')}</div>`
          : '';
        const note = r.note
          ? `<div style="font-size:11px;color:var(--muted);font-style:italic;margin-bottom:4px">📝 ${r.note}</div>`
          : '';
        return `
          <div class="cart-row">
            <div class="cart-info">
              <div class="cart-name">${r.th}</div>
              ${summary}
              ${note}
              <div class="cart-price">${baht(r.total)} <span style="color:var(--muted);font-weight:500">(${baht(r.unitPrice)} × ${r.qty})</span></div>
            </div>
            <div class="qty">
              <button data-q="-" data-i="${i}">−</button>
              <span>${r.qty}</span>
              <button data-q="+" data-i="${i}">+</button>
            </div>
          </div>
        `;
      }).join('');
    }
    document.getElementById('grand').textContent = baht(cartTotal());
    document.getElementById('place_btn').disabled = !state.cart.length;
  }

  // ── Cart drawer ───────────────────────────────────────────
  function openDrawer() {
    state.drawerOpen = true;
    document.getElementById('drawer').classList.add('show');
    document.getElementById('drawer_bd').classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    state.drawerOpen = false;
    document.getElementById('drawer').classList.remove('show');
    document.getElementById('drawer_bd').classList.remove('show');
    document.body.style.overflow = '';
  }

  // ── Place order ───────────────────────────────────────────
  async function placeOrder() {
    if (!state.cart.length) return;
    const subtotal = cartTotal();
    const orderType = state.orderType; // 'dinein' | 'takeaway'

    const orderId = await api.nextOrderNo(storeId);
    const record = {
      orderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'new',
      type:    orderType,
      table:   '',
      customer: '',
      subtotal,
      discount: 0,
      tax: 0,
      total: subtotal,
      paid: 0,
      change: 0,
      paymentMethod: '',
      cashier: 'ลูกค้า (QR)',
      note: '',
      synced: false,
      dateISO: fmt.todayISO(),
      lines: state.cart.map((r, i) => ({
        lineId:  `${orderId}-${i+1}`,
        itemId:  r.itemId, th: r.th, en: r.en,
        qty:     r.qty, unitPrice: r.unitPrice, total: r.total,
        // Legacy keys (compatible with sheet schema + pos-app)
        temp:    r.opts?.temp    || '',
        size:    r.opts?.size    || '',
        type:    r.opts?.type    || '',
        protein: r.opts?.protein || '',
        sauce:   r.opts?.sauce   || '',
        sweet:   r.opts?.sweet   || '',
        spice:   r.opts?.spice   || '',
        mods:    (r.mods || []).map(m => m.label || m),
        note:    r.note || '',
      })),
    };

    try {
      await api.saveOrder(storeId, record);
    } catch (e) {
      // Saved locally, queue handles sync
    }
    // Clear cart, remember active order for tracker
    state.cart = [];
    writeCart();
    state.activeOrderId = orderId;
    localStorage.setItem(`yy.${storeId}.activeOrder`, orderId);
    closeDrawer();
    renderCart();
    openTracker();
    startPolling();
  }

  // ── Order tracker ─────────────────────────────────────────
  const STEPS = [
    { id: 'new',     label: 'ส่งครัว',    emoji: '📨' },
    { id: 'kitchen', label: 'กำลังทำ',   emoji: '👨‍🍳' },
    { id: 'ready',   label: 'พร้อมเสิร์ฟ', emoji: '🍽️' },
    { id: 'served',  label: 'เสิร์ฟแล้ว',  emoji: '✅' },
  ];

  function openTracker() {
    document.getElementById('tracker_bd').classList.add('show');
    refreshTracker();
  }
  function closeTracker() {
    document.getElementById('tracker_bd').classList.remove('show');
    stopPolling();
  }

  function refreshTracker() {
    if (!state.activeOrderId) { closeTracker(); return; }
    const rec = api.getRecords(storeId).find(r => r.orderId === state.activeOrderId);
    if (!rec) {
      document.getElementById('tk_no').textContent  = '#' + state.activeOrderId;
      document.getElementById('tk_msg').textContent = 'กำลังส่งคำสั่ง...';
      return;
    }
    const status = rec.status || 'new';
    const idx = Math.max(0, STEPS.findIndex(s => s.id === status));
    document.getElementById('tk_no').textContent  = '#' + rec.orderId;
    document.getElementById('tk_emoji').textContent = STEPS[idx]?.emoji || '📨';
    document.getElementById('tk_msg').textContent =
      status === 'served' ? 'เสิร์ฟแล้ว — ขอบคุณที่ใช้บริการ 💛' :
      status === 'ready'  ? 'อาหารพร้อมแล้ว — กำลังนำไปเสิร์ฟ' :
      status === 'kitchen'? 'ครัวกำลังทำอาหารให้คุณ' :
      status === 'paid'   ? 'ชำระเงินสำเร็จแล้ว ✓' :
      'รอครัวรับออเดอร์';

    // Steps
    document.getElementById('tk_steps').innerHTML = STEPS.map((s, i) => {
      const done = i < idx, active = i === idx;
      const conn = i > 0 ? `<div class="step-conn ${i <= idx ? 'done' : ''}"></div>` : '';
      return `${conn}<div class="step ${done ? 'done' : ''} ${active ? 'active' : ''}">
        <div class="step-dot">${done ? '✓' : (i + 1)}</div>${s.label}
      </div>`;
    }).join('');

    if (status === 'paid' || status === 'served') {
      // Auto-close tracker after 5s on served, but keep paid forever
      if (status === 'served') {
        setTimeout(() => {
          localStorage.removeItem(`yy.${storeId}.activeOrder`);
          state.activeOrderId = '';
        }, 4000);
      }
    }
  }

  function startPolling() {
    stopPolling();
    state.pollTm = setInterval(refreshTracker, 5000);
    api.pullOrders(storeId).catch(() => {});
  }
  function stopPolling() {
    if (state.pollTm) { clearInterval(state.pollTm); state.pollTm = null; }
  }

  // ── Toast ─────────────────────────────────────────────────
  let toastTm;
  function toast(msg) {
    const t = document.getElementById('ok_toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTm);
    toastTm = setTimeout(() => t.classList.remove('show'), 1500);
  }

  // ── Bindings ──────────────────────────────────────────────
  function bind() {
    // Category chips
    document.getElementById('cats').addEventListener('click', (e) => {
      const c = e.target.closest('[data-cat]');
      if (!c) return;
      const cat = c.dataset.cat || null;
      state.activeCat = cat === '' ? null : cat;
      renderCats(); renderMenu();
    });

    // Search
    document.getElementById('search').addEventListener('input', (e) => {
      state.search = e.target.value;
      renderMenu();
    });

    // Add buttons
    document.getElementById('menu').addEventListener('click', (e) => {
      const card = e.target.closest('.item');
      if (!card) return;
      addToCart(card.dataset.item);
    });

    // Cart bar
    document.getElementById('cart_btn').addEventListener('click', openDrawer);

    // Drawer
    document.getElementById('drawer_bd').addEventListener('click', closeDrawer);
    document.getElementById('drawer_x').addEventListener('click', closeDrawer);
    document.getElementById('drawer_body').addEventListener('click', (e) => {
      const b = e.target.closest('[data-q]');
      if (!b) return;
      const i = +b.dataset.i;
      const delta = b.dataset.q === '+' ? 1 : -1;
      setQty(i, state.cart[i].qty + delta);
    });

    document.getElementById('place_btn').addEventListener('click', placeOrder);

    // Order-type toggle (ทานที่นี่ / กลับบ้าน)
    document.getElementById('ot_row').addEventListener('click', (e) => {
      const b = e.target.closest('[data-ot]');
      if (!b) return;
      state.orderType = b.dataset.ot;
      localStorage.setItem(`yy.${storeId}.orderType`, state.orderType);
      renderCart();
    });

    // Tracker
    document.getElementById('tk_close').addEventListener('click', closeTracker);

    // Call staff
    document.getElementById('btn_call').addEventListener('click', () => {
      alert('🛎️ ได้แจ้งพนักงานแล้ว — รอสักครู่นะคะ');
      // Optional: send a "call" notification via API in future
    });

    // Esc to close drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.drawerOpen) closeDrawer();
      }
    });
  }

  // ── Start ─────────────────────────────────────────────────
  applyTheme();
  renderHeader();
  renderCats();
  renderMenu();
  renderCart();
  bind();

  // Resume tracker if there's an active order
  if (state.activeOrderId) {
    openTracker();
    startPolling();
  }
})();
