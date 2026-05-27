/* ============================================================
 * yellowyellow.co — Shared Customizer Modal
 *
 * Self-contained product customizer used by both:
 *   • menu.html (customer ordering)
 *   • pos.html  (staff POS)
 *
 * Handles BOTH legacy item schema (tempOptions/sizeOptions/etc.)
 * AND the new unified optionGroups schema.
 *
 * USAGE
 * ─────
 *   YY_CUSTOMIZER.open(item, {
 *     storeColor: '#1E40AF',
 *     mode:       'customer' | 'staff',
 *     editing:    null | existingCartLine,
 *     onConfirm:  ({ qty, choices, mods, note, unitPrice, totalPrice, summary }) => { ... },
 *     onClose:    () => { ... },
 *   });
 *
 *   YY_CUSTOMIZER.hasOptions(item) → boolean
 *   YY_CUSTOMIZER.normalizeGroups(item) → [{ id, name, required, multi, options:[...] }, ...]
 *
 * Eliminates flicker: chip clicks toggle .is-active and update
 * the footer price only; no full innerHTML rebuild.
 * ============================================================ */
(function (root) {
  'use strict';

  const baht = (n) => '฿' + Math.round(Number(n || 0)).toLocaleString('th-TH');
  const cleanId = (s) => String(s).replace(/[^a-z0-9-]/gi, '_');
  const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const escAttr = (s) => String(s == null ? '' : s).replace(/"/g, '&quot;');

  // ── Inject styles once ─────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('yy-cust-styles')) return;
    const s = document.createElement('style');
    s.id = 'yy-cust-styles';
    s.textContent = `
      .yy-cust-bd {
        position: fixed; inset: 0;
        background: rgba(15,15,15,.5);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        z-index: 9000;
        display: none;
        align-items: flex-end;
        justify-content: center;
        padding: 0;
      }
      .yy-cust-bd.show { display: flex; animation: yyFade .2s ease-out; }
      @media (min-width: 720px) {
        .yy-cust-bd { align-items: center; padding: 24px; }
      }
      .yy-cust {
        background: #fff;
        width: 100%;
        max-width: 560px;
        max-height: 92dvh;
        border-radius: 22px 22px 0 0;
        display: flex; flex-direction: column;
        overflow: hidden;
        animation: yyRise .25s cubic-bezier(.2,.8,.2,1);
        padding-bottom: env(safe-area-inset-bottom);
      }
      @media (min-width: 720px) {
        .yy-cust { border-radius: 22px; max-height: 86dvh; }
      }
      .yy-cust-hero {
        position: relative;
        padding: 18px 18px 16px;
        background: linear-gradient(135deg, color-mix(in srgb, var(--yy-c) 14%, #fff), #fff 70%);
        display: flex; gap: 14px;
        border-bottom: 1px solid #E7E5E4;
      }
      .yy-cust-thumb {
        width: 64px; height: 64px;
        border-radius: 14px;
        background: linear-gradient(135deg, color-mix(in srgb, var(--yy-c) 22%, #fff), color-mix(in srgb, var(--yy-c) 8%, #fff));
        display: flex; align-items: center; justify-content: center;
        font-size: 28px;
        flex-shrink: 0;
      }
      .yy-cust-titleline { flex: 1; min-width: 0; }
      .yy-cust-th {
        font-family: 'Kanit', 'Sarabun', sans-serif;
        font-weight: 700; font-size: 18px;
        margin: 0; line-height: 1.2;
        color: #1C1917;
      }
      .yy-cust-en { font-size: 12px; color: #78716C; margin-top: 2px; }
      .yy-cust-base {
        font-size: 12.5px; color: var(--yy-c);
        font-weight: 600; margin-top: 6px;
        font-variant-numeric: tabular-nums;
      }
      .yy-cust-x {
        position: absolute; top: 12px; right: 12px;
        width: 32px; height: 32px;
        border-radius: 999px;
        background: rgba(255,255,255,.7);
        border: 1px solid #E7E5E4;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; line-height: 1;
        cursor: pointer;
      }
      .yy-cust-x:active { transform: scale(.94); }

      .yy-cust-body {
        overflow-y: auto;
        flex: 1;
        padding: 14px 18px 10px;
        -webkit-overflow-scrolling: touch;
      }
      .yy-cust-group { margin-bottom: 16px; }
      .yy-cust-group-h {
        display: flex; align-items: baseline; gap: 8px;
        margin-bottom: 8px;
      }
      .yy-cust-group-th {
        font-weight: 600; font-size: 14px;
        color: #1C1917;
      }
      .yy-cust-group-en {
        font-size: 10.5px;
        color: #A8A29E;
        text-transform: uppercase;
        letter-spacing: .04em;
      }
      .yy-cust-group-req {
        font-size: 10.5px;
        color: #DC2626;
        font-weight: 600;
        margin-left: auto;
      }
      .yy-chip-row {
        display: flex; flex-wrap: wrap; gap: 7px;
      }
      .yy-chip {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 10px 14px;
        border-radius: 12px;
        border: 1.5px solid #E7E5E4;
        background: #fff;
        font-size: 13.5px;
        font-family: 'Sarabun', sans-serif;
        color: #44403C;
        cursor: pointer;
        transition: border-color .12s, background .12s, color .12s, transform .08s;
        min-height: 42px;
        -webkit-tap-highlight-color: transparent;
        font-weight: 500;
      }
      .yy-chip:hover { border-color: #D6D3D1; }
      .yy-chip:active { transform: scale(.97); }
      .yy-chip.is-active {
        border-color: var(--yy-c);
        color: var(--yy-c);
        background: color-mix(in srgb, var(--yy-c) 10%, #fff);
        font-weight: 600;
      }
      .yy-chip small {
        font-size: 11px;
        opacity: .75;
        font-variant-numeric: tabular-nums;
      }
      .yy-chip.is-active small { opacity: 1; }

      .yy-cust-note {
        width: 100%;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1.5px solid #E7E5E4;
        background: #FAFAF9;
        font-family: inherit;
        font-size: 14px;
        outline: none;
        transition: border-color .15s;
        min-height: 44px;
      }
      .yy-cust-note:focus { border-color: var(--yy-c); background: #fff; }

      .yy-cust-foot {
        padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
        background: #fff;
        border-top: 1px solid #E7E5E4;
        display: flex; align-items: center; gap: 10px;
      }
      .yy-qty {
        display: inline-flex; align-items: center;
        background: #F5F5F4;
        border-radius: 12px;
        overflow: hidden;
        flex-shrink: 0;
      }
      .yy-qty button {
        width: 40px; height: 44px;
        font-size: 18px; font-weight: 600;
        background: none; border: none;
        color: #1C1917;
        cursor: pointer;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .yy-qty button:active { background: #E7E5E4; }
      .yy-qty span {
        min-width: 32px;
        text-align: center;
        font-weight: 700;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-variant-numeric: tabular-nums;
      }
      .yy-cust-add {
        flex: 1;
        padding: 13px 16px;
        border-radius: 14px;
        background: var(--yy-c);
        color: #fff;
        border: none;
        font-family: 'Sarabun', sans-serif;
        font-size: 15px; font-weight: 600;
        cursor: pointer;
        display: flex; align-items: center; justify-content: space-between;
        gap: 10px;
        min-height: 50px;
        box-shadow: 0 6px 16px color-mix(in srgb, var(--yy-c) 30%, transparent);
        transition: transform .1s, box-shadow .15s, filter .15s;
      }
      .yy-cust-add:hover { filter: brightness(1.06); }
      .yy-cust-add:active { transform: scale(.99); }
      .yy-cust-add:disabled {
        opacity: .55;
        cursor: not-allowed;
        box-shadow: none;
      }
      .yy-cust-add .price {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        background: rgba(255,255,255,.18);
        padding: 4px 10px;
        border-radius: 8px;
      }

      @keyframes yyFade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes yyRise {
        from { transform: translateY(20px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Normalize legacy schema → unified groups ───────────────
  // Returns: [{ id, name, en, required, multi, basePriceMode, options:[{id,label,extraPrice,enabled,absolutePrice}] }, ...]
  // `basePriceMode='replace'` means option price replaces basePrice (sizeOptions, tempOptions).
  // `basePriceMode='add'` means option extraPrice adds on top.
  function normalizeGroups(item) {
    if (Array.isArray(item.optionGroups) && item.optionGroups.length) {
      return item.optionGroups.map(g => ({
        id:      g.id || cleanId(g.name || 'group'),
        name:    g.name || '',
        en:      g.en || '',
        required: !!g.required,
        multi:    !!(g.multi || g.multiSelect),
        basePriceMode: g.basePriceMode || (g.multi ? 'add' : 'replace_or_add'),
        options: (g.options || []).filter(o => o.enabled !== false).map(o => ({
          id:    o.id || cleanId(o.label),
          label: o.label,
          extraPrice:    Number(o.extraPrice) || 0,
          absolutePrice: o.absolutePrice != null ? Number(o.absolutePrice) : null,
          enabled: o.enabled !== false,
        })),
      })).filter(g => g.options.length);
    }

    // Legacy: derive groups from old fields
    const groups = [];
    if (item.tempOptions && item.tempOptions.length) groups.push({
      id: 'temp', name: 'อุณหภูมิ', en: 'Temperature',
      required: true, multi: false, basePriceMode: 'replace',
      options: item.tempOptions.map(o => ({
        id: o.id, label: o.label, extraPrice: 0,
        absolutePrice: Number(o.price) || 0, enabled: true,
      })),
    });
    if (item.sizeOptions && item.sizeOptions.length) {
      // Only show as a group if there's >1 option, OR if it has any meaningful labels
      const show = item.sizeOptions.length > 1;
      if (show) groups.push({
        id: 'size', name: 'ขนาด', en: 'Size',
        required: true, multi: false, basePriceMode: 'replace',
        options: item.sizeOptions.map(o => ({
          id: o.id, label: o.label, extraPrice: 0,
          absolutePrice: Number(o.price) || 0, enabled: true,
        })),
      });
    }
    const textGroup = (key, name, en) => {
      const arr = item[key];
      if (!Array.isArray(arr) || !arr.length) return null;
      return {
        id: key, name, en,
        required: true, multi: false, basePriceMode: 'add',
        options: arr.map(s => ({
          id: cleanId(s), label: s, extraPrice: 0, absolutePrice: null, enabled: true,
        })),
      };
    };
    [
      ['types',     'ชนิด',           'Style'],
      ['proteins',  'เนื้อสัตว์',     'Protein'],
      ['sauces',    'น้ำจิ้ม',        'Sauce'],
      ['sweetness', 'ระดับความหวาน',  'Sweetness'],
      ['spice',     'ระดับความเผ็ด',  'Spice'],
    ].forEach(([k, n, e]) => { const g = textGroup(k, n, e); if (g) groups.push(g); });

    if (item.modifiers && item.modifiers.length) groups.push({
      id: 'mods', name: 'ท็อปปิ้งเพิ่ม', en: 'Add-ons',
      required: false, multi: true, basePriceMode: 'add',
      options: item.modifiers.map(m => ({
        id: m.id, label: m.label,
        extraPrice: Number(m.price) || 0, absolutePrice: null, enabled: true,
      })),
    });

    return groups;
  }

  function hasOptions(item) {
    return normalizeGroups(item).length > 0;
  }

  // ── State for the open modal ───────────────────────────────
  let activeBd = null;
  let activeState = null;

  function close() {
    if (activeBd) {
      activeBd.classList.remove('show');
      document.body.classList.remove('yy-cust-locked');
      if (activeState && activeState.opts.onClose) {
        try { activeState.opts.onClose(); } catch {}
      }
    }
    activeBd = null;
    activeState = null;
  }

  function ensureContainer() {
    let bd = document.getElementById('yy-cust-bd');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'yy-cust-bd';
      bd.className = 'yy-cust-bd';
      bd.innerHTML = '<div class="yy-cust" id="yy-cust-card"></div>';
      bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
      document.body.appendChild(bd);
    }
    return bd;
  }

  // ── Build initial choices from item or editing line ────────
  function initialChoices(groups, editing) {
    const c = { byGroup: {}, mods: new Set() };
    const e = editing || {};

    groups.forEach(g => {
      if (g.multi) {
        // Pre-select from editing.mods if any IDs match
        const set = new Set();
        if (Array.isArray(e.mods)) {
          e.mods.forEach(m => {
            const id = typeof m === 'string' ? m : (m.id || m.label);
            if (g.options.find(o => o.id === id || o.label === id)) set.add(id);
          });
        }
        c.byGroup[g.id] = set;
      } else {
        // Try to match editing values (legacy and new schemas)
        let picked = null;
        if (g.id === 'temp')     picked = e.temp;
        if (g.id === 'size')     picked = e.size;
        if (g.id === 'types')    picked = e.type;
        if (g.id === 'proteins') picked = e.protein;
        if (g.id === 'sauces')   picked = e.sauce;
        if (g.id === 'sweetness')picked = e.sweet;
        if (g.id === 'spice')    picked = e.spice;
        if (e.choices && e.choices[g.id]) picked = e.choices[g.id];
        // Validate
        let pickedId = picked;
        if (picked && !g.options.find(o => o.id === picked || o.label === picked)) pickedId = null;
        // Map label → id if needed
        if (pickedId) {
          const m = g.options.find(o => o.id === pickedId || o.label === pickedId);
          pickedId = m ? m.id : null;
        }
        // Default: first option for required, null for optional
        if (!pickedId && g.required && g.options[0]) pickedId = g.options[0].id;
        c.byGroup[g.id] = pickedId;
      }
    });
    return c;
  }

  // ── Compute price ──────────────────────────────────────────
  function compute(item, groups, choices) {
    let unit = Number(item.basePrice) || 0;
    let replaced = false;

    for (const g of groups) {
      if (g.multi) continue;
      const pickedId = choices.byGroup[g.id];
      if (!pickedId) continue;
      const opt = g.options.find(o => o.id === pickedId);
      if (!opt) continue;
      if (opt.absolutePrice != null && (g.basePriceMode === 'replace' || g.basePriceMode === 'replace_or_add')) {
        unit = opt.absolutePrice;
        replaced = true;
      } else if (opt.extraPrice) {
        unit += opt.extraPrice;
      }
    }
    // Multi (add-ons): always added
    for (const g of groups) {
      if (!g.multi) continue;
      const set = choices.byGroup[g.id] || new Set();
      for (const id of set) {
        const opt = g.options.find(o => o.id === id);
        if (opt) unit += (opt.extraPrice || 0);
      }
    }
    return unit;
  }

  // ── Build readable summary lines (for cart display) ────────
  function makeSummary(item, groups, choices) {
    const lines = [];
    const legacy = {}; // pos-app compat
    const modsArr = [];
    groups.forEach(g => {
      if (g.multi) {
        const set = choices.byGroup[g.id] || new Set();
        set.forEach(id => {
          const o = g.options.find(opt => opt.id === id);
          if (o) {
            lines.push(`+ ${o.label}`);
            modsArr.push({ id: o.id, label: o.label, price: o.extraPrice });
          }
        });
      } else {
        const pickedId = choices.byGroup[g.id];
        const opt = g.options.find(o => o.id === pickedId);
        if (opt) {
          lines.push(`${g.name}: ${opt.label}`);
          if (g.id === 'temp')     legacy.temp = opt.id;
          if (g.id === 'size')     legacy.size = opt.id;
          if (g.id === 'types')    legacy.type = opt.label;
          if (g.id === 'proteins') legacy.protein = opt.label;
          if (g.id === 'sauces')   legacy.sauce = opt.label;
          if (g.id === 'sweetness')legacy.sweet = opt.label;
          if (g.id === 'spice')    legacy.spice = opt.label;
        }
      }
    });
    return { lines, legacy, mods: modsArr };
  }

  // ── Render ─────────────────────────────────────────────────
  function render(item, groups, choices, opts) {
    const card = activeBd.querySelector('#yy-cust-card');
    const emoji = item.emoji || opts.emoji || '🍽️';
    const isEdit = !!opts.editing;

    const groupsHtml = groups.map(g => `
      <div class="yy-cust-group">
        <div class="yy-cust-group-h">
          <span class="yy-cust-group-th">${escHtml(g.name)}</span>
          ${g.en ? `<span class="yy-cust-group-en">${escHtml(g.en)}</span>` : ''}
          ${g.required ? '<span class="yy-cust-group-req">* จำเป็น</span>'
                       : (g.multi ? '<span class="yy-cust-group-en" style="margin-left:auto">เลือกได้หลายอย่าง</span>' : '')}
        </div>
        <div class="yy-chip-row" data-group="${g.id}" data-multi="${g.multi ? '1' : '0'}">
          ${g.options.map(o => {
            const isOn = g.multi
              ? (choices.byGroup[g.id] && choices.byGroup[g.id].has(o.id))
              : (choices.byGroup[g.id] === o.id);
            let suffix = '';
            if (o.absolutePrice != null && g.basePriceMode === 'replace') suffix = baht(o.absolutePrice);
            else if (o.extraPrice)                                        suffix = '+' + baht(o.extraPrice);
            return `<button type="button" class="yy-chip ${isOn ? 'is-active' : ''}" data-opt="${escAttr(o.id)}">
              ${escHtml(o.label)}${suffix ? `<small>${suffix}</small>` : ''}
            </button>`;
          }).join('')}
        </div>
      </div>
    `).join('');

    const initialQty = Number(opts.editing?.qty) || 1;
    activeState.qty = initialQty;

    card.style.setProperty('--yy-c', opts.storeColor || '#1E40AF');
    card.innerHTML = `
      <div class="yy-cust-hero">
        <div class="yy-cust-thumb">${emoji}</div>
        <div class="yy-cust-titleline">
          <h3 class="yy-cust-th">${escHtml(item.th || item.name || '')}</h3>
          ${item.en ? `<div class="yy-cust-en">${escHtml(item.en)}${item.hint ? ' · ' + escHtml(item.hint) : ''}</div>` : ''}
          <div class="yy-cust-base">เริ่มต้น ${baht(item.basePrice)}</div>
        </div>
        <button class="yy-cust-x" id="yy-cust-x" aria-label="ปิด">×</button>
      </div>
      <div class="yy-cust-body">
        ${groupsHtml}
        <div class="yy-cust-group">
          <div class="yy-cust-group-h">
            <span class="yy-cust-group-th">หมายเหตุ</span>
            <span class="yy-cust-group-en">Special notes</span>
          </div>
          <input type="text" class="yy-cust-note" id="yy-cust-note"
                 placeholder="เช่น ไม่ใส่ผัก / น้ำซุปแยก"
                 value="${escAttr(opts.editing?.note || '')}" />
        </div>
      </div>
      <div class="yy-cust-foot">
        <div class="yy-qty">
          <button type="button" id="yy-qty-dec" aria-label="ลด">−</button>
          <span id="yy-qty-val">${initialQty}</span>
          <button type="button" id="yy-qty-inc" aria-label="เพิ่ม">+</button>
        </div>
        <button class="yy-cust-add" id="yy-cust-add">
          <span>${isEdit ? '✓ อัปเดต' : (opts.mode === 'customer' ? '➕ เพิ่มเข้าตะกร้า' : 'เพิ่มเข้าตะกร้า')}</span>
          <span class="price" id="yy-cust-price">${baht(0)}</span>
        </button>
      </div>
    `;
    refreshFooter();
    bind();
  }

  function refreshFooter() {
    if (!activeState) return;
    const { item, groups, choices, qty } = activeState;
    const unit = compute(item, groups, choices);
    const total = unit * qty;
    const priceEl = document.getElementById('yy-cust-price');
    const qtyEl   = document.getElementById('yy-qty-val');
    if (priceEl) priceEl.textContent = baht(total);
    if (qtyEl)   qtyEl.textContent   = qty;
  }

  function bind() {
    const card = activeBd.querySelector('#yy-cust-card');
    if (!card) return;

    document.getElementById('yy-cust-x').onclick = close;

    document.getElementById('yy-qty-dec').onclick = () => {
      activeState.qty = Math.max(1, activeState.qty - 1);
      refreshFooter();
    };
    document.getElementById('yy-qty-inc').onclick = () => {
      activeState.qty = Math.min(99, activeState.qty + 1);
      refreshFooter();
    };

    // Chip clicks (event delegation on each row)
    card.querySelectorAll('.yy-chip-row').forEach(row => {
      const groupId = row.dataset.group;
      const multi = row.dataset.multi === '1';
      row.addEventListener('click', (e) => {
        const chip = e.target.closest('.yy-chip');
        if (!chip) return;
        const optId = chip.dataset.opt;
        if (multi) {
          const set = activeState.choices.byGroup[groupId];
          if (set.has(optId)) { set.delete(optId); chip.classList.remove('is-active'); }
          else                { set.add(optId);    chip.classList.add('is-active'); }
        } else {
          // Single select: remove .is-active from siblings, add to clicked
          row.querySelectorAll('.yy-chip').forEach(c => c.classList.remove('is-active'));
          chip.classList.add('is-active');
          activeState.choices.byGroup[groupId] = optId;
        }
        refreshFooter();
      });
    });

    // Note
    const noteEl = document.getElementById('yy-cust-note');
    if (noteEl) noteEl.oninput = (e) => { activeState.note = e.target.value; };

    // Confirm
    document.getElementById('yy-cust-add').onclick = () => {
      const { item, groups, choices, qty, note, opts } = activeState;
      // Validate required groups (single-select must have a pick)
      for (const g of groups) {
        if (g.required && !g.multi && !choices.byGroup[g.id]) {
          alert('โปรดเลือก ' + g.name);
          return;
        }
      }
      const unit  = compute(item, groups, choices);
      const total = unit * qty;
      const sum   = makeSummary(item, groups, choices);
      const result = {
        qty,
        unitPrice: unit,
        totalPrice: total,
        note: note || '',
        choices: { ...choices.byGroup }, // groupId → optionId or Set
        mods: sum.mods,
        legacy: sum.legacy,    // legacy keys for pos-app cart compat
        summary: sum.lines,
      };
      // Convert Sets → arrays for serialisation
      Object.keys(result.choices).forEach(k => {
        if (result.choices[k] instanceof Set) result.choices[k] = Array.from(result.choices[k]);
      });
      try { opts.onConfirm && opts.onConfirm(result); } catch (e) { console.error(e); }
      close();
    };
  }

  // ── Public API ─────────────────────────────────────────────
  function open(item, opts) {
    injectStyles();
    opts = opts || {};
    const groups = normalizeGroups(item);
    const choices = initialChoices(groups, opts.editing);
    activeBd = ensureContainer();
    activeState = {
      item, groups, choices,
      qty: Number(opts.editing?.qty) || 1,
      note: opts.editing?.note || '',
      opts,
    };
    render(item, groups, choices, opts);
    activeBd.classList.add('show');
    document.body.classList.add('yy-cust-locked');

    // Lock body scroll
    if (!document.getElementById('yy-cust-lockstyle')) {
      const ls = document.createElement('style');
      ls.id = 'yy-cust-lockstyle';
      ls.textContent = '.yy-cust-locked { overflow: hidden; touch-action: none; }';
      document.head.appendChild(ls);
    }

    // Esc key
    if (!open._escBound) {
      open._escBound = true;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activeBd && activeBd.classList.contains('show')) close();
      });
    }
  }

  root.YY_CUSTOMIZER = {
    open, close, hasOptions, normalizeGroups, compute,
  };
})(window);
