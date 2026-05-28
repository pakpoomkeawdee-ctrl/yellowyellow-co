/* ============================================================
 * yellowyellow.co — PIN-based auth (hardened)
 *
 * Roles:
 *   customer (public) · staff · admin · super
 *
 * Default PINs (overridable in Admin → Settings):
 *   staff: 1234   admin: 5678   super: 9999
 *
 * Hardening:
 *   - Session payload is signed with a deterministic checksum
 *     so casual localStorage tampering is detected and rejected.
 *   - Every isAuthed() call re-validates signature + expiry.
 *   - guard() locks the page body + shows in-page PIN modal
 *     (no race with route navigation).
 *
 * NOTE: This is a UX safeguard, NOT cryptographic security
 * (the salt lives in JS source — visible to anyone who reads it).
 * For real security you need a server. The intent here is to
 * stop accidental access and casual snooping on shared devices.
 * ============================================================ */
(function (root) {
  'use strict';

  const SESSION_KEY = 'yy.auth.session.v2';
  const PINS_KEY    = 'yy.auth.pins.v2';
  const LEGACY_KEYS = ['yy.auth.session', 'yy.auth.pins'];
  const TTL_HOURS   = 12;
  const SALT        = 'yy.co.v1.salt.7b3f9e';   // not a real secret

  const DEFAULT_PINS = {
    staff: { nmtun: '1234', pussorn: '1234', khaow: '1234' },
    admin: { nmtun: '5678', pussorn: '5678', khaow: '5678' },
    super: { _global: '9999' },
  };

  // ── Tiny string hash (djb2 with salt) for signature ────────
  function hash(str) {
    let h = 5381;
    const s = String(str || '') + '|' + SALT;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function sign(payload) {
    const body = `${payload.role}|${payload.store || ''}|${payload.since}|${payload.exp}`;
    return hash(body);
  }

  // ── PINs storage ───────────────────────────────────────────
  function readPins() {
    try {
      // Clean up legacy unsigned PIN store on first read
      const legacy = localStorage.getItem('yy.auth.pins');
      if (legacy && !localStorage.getItem(PINS_KEY)) {
        localStorage.setItem(PINS_KEY, legacy);
      }
      const raw = localStorage.getItem(PINS_KEY);
      if (!raw) return DEFAULT_PINS;
      const stored = JSON.parse(raw);
      return {
        staff: { ...DEFAULT_PINS.staff, ...(stored.staff || {}) },
        admin: { ...DEFAULT_PINS.admin, ...(stored.admin || {}) },
        super: { ...DEFAULT_PINS.super, ...(stored.super || {}) },
      };
    } catch { return DEFAULT_PINS; }
  }
  function writePins(pins) {
    localStorage.setItem(PINS_KEY, JSON.stringify(pins));
  }

  // ── Session storage (signed) ───────────────────────────────
  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      // Required fields
      if (!s || !s.role || !s.exp || !s.sig) { clearSession(); return null; }
      // Expiry
      if (Date.now() > s.exp) { clearSession(); return null; }
      // Signature verification (rejects tampered localStorage)
      const expected = sign(s);
      if (expected !== s.sig) { clearSession(); return null; }
      // Role sanity
      if (!['staff', 'admin', 'super'].includes(s.role)) { clearSession(); return null; }
      return s;
    } catch { clearSession(); return null; }
  }
  function writeSession(payload) {
    const s = { ...payload, sig: sign(payload) };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    // Clean old key if present
    LEGACY_KEYS.forEach(k => { if (k !== SESSION_KEY && k !== PINS_KEY) localStorage.removeItem(k); });
  }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  // ── Public API ─────────────────────────────────────────────

  /** Is current session authenticated for role+store? Validates signature every call. */
  function isAuthed(role, storeId) {
    if (role === 'customer') return true;
    const s = readSession();
    if (!s) return false;
    if (s.role === 'super') return true;  // super covers all
    if (s.role !== role) return false;
    if (role === 'super') return true;
    return s.store === storeId;
  }

  /** Try a PIN. Returns true if valid + session written. */
  function tryPin(role, storeId, pin) {
    if (!pin || String(pin).length !== 4 || !/^[0-9]{4}$/.test(String(pin))) return false;
    if (!['staff', 'admin', 'super'].includes(role)) return false;
    const pins = readPins();
    let expected;
    if (role === 'super')      expected = pins.super && pins.super._global;
    else if (role === 'admin') expected = pins.admin && pins.admin[storeId];
    else if (role === 'staff') expected = pins.staff && pins.staff[storeId];
    if (!expected) return false;
    if (String(pin) !== String(expected)) return false;

    writeSession({
      role,
      store: role === 'super' ? null : storeId,
      since: Date.now(),
      exp:   Date.now() + TTL_HOURS * 3600 * 1000,
    });
    return true;
  }

  function getSession() { return readSession(); }
  function logout() { clearSession(); }

  function setPin(role, storeId, newPin) {
    if (!/^[0-9]{4}$/.test(String(newPin))) return { ok: false, error: 'PIN ต้องเป็นตัวเลข 4 หลัก' };
    const session = readSession();
    if (!session) return { ok: false, error: 'ต้อง login ก่อน' };
    if (session.role !== 'super' && session.role !== 'admin') {
      return { ok: false, error: 'ต้องเป็น admin หรือ super เท่านั้น' };
    }
    const pins = readPins();
    if (role === 'super') {
      if (session.role !== 'super') return { ok: false, error: 'เปลี่ยน Super PIN ได้เฉพาะ Super Admin' };
      pins.super._global = String(newPin);
    } else {
      pins[role] = pins[role] || {};
      pins[role][storeId] = String(newPin);
    }
    writePins(pins);
    return { ok: true };
  }

  function resetPins() {
    const s = readSession();
    if (!s || s.role !== 'super') return { ok: false, error: 'Super Admin เท่านั้น' };
    localStorage.removeItem(PINS_KEY);
    return { ok: true };
  }

  function listPins() {
    const s = readSession();
    if (!s) return null;
    const pins = readPins();
    const mask = (p) => s.role === 'super' ? p : '••••';
    const out = { staff: {}, admin: {}, super: {} };
    Object.keys(pins.staff || {}).forEach(k => out.staff[k] = mask(pins.staff[k]));
    Object.keys(pins.admin || {}).forEach(k => out.admin[k] = mask(pins.admin[k]));
    out.super._global = mask(pins.super._global);
    return out;
  }

  /* ─────────────────────────────────────────────────────────
   * IN-PAGE GUARD
   * Locks the page until the right PIN is entered.
   * Used by pos.html and yellowyellow.html instead of an
   * unreliable "redirect to start" pattern.
   * ───────────────────────────────────────────────────────── */
  let guardLockEl = null;
  function ensureGuardStyles() {
    if (document.getElementById('yy-guard-styles')) return;
    const s = document.createElement('style');
    s.id = 'yy-guard-styles';
    s.textContent = `
      .yy-guard-bd {
        position: fixed; inset: 0;
        background: rgba(15,15,15,.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 100000;
        display: flex; align-items: center; justify-content: center;
        padding: 14px;
      }
      .yy-guard-card {
        background: #fff;
        border-radius: 22px;
        padding: 24px 22px;
        width: 100%; max-width: 360px;
        text-align: center;
        box-shadow: 0 30px 60px rgba(0,0,0,.4);
        animation: yyPopIn .25s cubic-bezier(.2,.8,.2,1);
        font-family: 'Sarabun', system-ui, sans-serif;
      }
      .yy-guard-title { font-weight: 700; font-size: 18px; margin: 4px 0 4px; font-family: 'Kanit', sans-serif; }
      .yy-guard-sub { color: #78716C; font-size: 13px; margin: 0 0 16px; }
      .yy-guard-dots { display: flex; justify-content: center; gap: 12px; margin: 6px 0 16px; }
      .yy-guard-dot {
        width: 14px; height: 14px; border-radius: 999px;
        background: #F5F5F4; border: 1.5px solid #D6D3D1;
        transition: all .15s;
      }
      .yy-guard-dot.on { background: var(--yy-cc, #1C1917); border-color: var(--yy-cc, #1C1917); transform: scale(1.12); }
      .yy-guard-err { animation: yyShakeG .35s cubic-bezier(.36,.07,.19,.97); }
      .yy-guard-pad { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
      .yy-guard-key {
        padding: 14px 0;
        border-radius: 14px;
        background: #F5F5F4; border: none;
        font-size: 20px; font-weight: 600;
        font-family: 'Plus Jakarta Sans', sans-serif;
        cursor: pointer;
        min-height: 52px;
        -webkit-tap-highlight-color: transparent;
      }
      .yy-guard-key:active { transform: scale(.96); background: #D6D3D1; }
      .yy-guard-key.action { font-size: 14px; color: #78716C; }
      .yy-guard-back { margin-top: 12px; color: #78716C; font-size: 13px; background: none; border: none; padding: 8px; cursor: pointer; }
      .yy-guard-back:hover { color: #1C1917; }
      .yy-guard-hint { margin-top: 8px; font-size: 11.5px; color: #A8A29E; }
      @keyframes yyShakeG {
        10%, 90% { transform: translate3d(-1px, 0, 0); }
        20%, 80% { transform: translate3d(2px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
        40%, 60% { transform: translate3d(4px, 0, 0); }
      }
      @keyframes yyPopIn {
        from { opacity: 0; transform: scale(.92); }
        to   { opacity: 1; transform: scale(1); }
      }
      .yy-body-locked { overflow: hidden !important; pointer-events: none; }
      .yy-guard-bd, .yy-guard-bd * { pointer-events: auto; }
    `;
    document.head.appendChild(s);
  }

  /**
   * Block the page until user enters a valid PIN.
   * @param {('staff'|'admin'|'super')} role — required role
   * @param {string|null} storeId — required store (or null for super)
   * @param {function} [onPass] — invoked when authentication succeeds
   */
  function guard(role, storeId, onPass) {
    // Already authed? Just call onPass and return
    if (isAuthed(role, storeId)) { onPass && onPass(); return; }

    ensureGuardStyles();
    // Lock body interaction immediately (no flash of protected content)
    document.documentElement.classList.add('yy-body-locked');
    document.body && document.body.classList.add('yy-body-locked');

    if (guardLockEl) { guardLockEl.remove(); guardLockEl = null; }
    const bd = document.createElement('div');
    bd.className = 'yy-guard-bd';
    const accentColor = (window.YY_CONFIG?.STORES?.[storeId]?.accent) || '#1C1917';
    bd.innerHTML = `
      <div class="yy-guard-card" style="--yy-cc:${accentColor}">
        <div style="font-size:36px">${role === 'super' ? '🛡️' : role === 'admin' ? '📊' : '👤'}</div>
        <h2 class="yy-guard-title">${
          role === 'super' ? 'Super Admin'
          : role === 'admin' ? 'ผู้จัดการ · Admin'
          : 'พนักงาน · Staff'
        }</h2>
        <p class="yy-guard-sub">${
          role === 'super' ? 'ใส่รหัส 4 หลักของ Super Admin'
          : `ใส่รหัส 4 หลักของร้าน ${(window.YY_CONFIG?.STORES?.[storeId]?.shortName) || ''}`
        }</p>
        <div class="yy-guard-dots">
          <div class="yy-guard-dot"></div><div class="yy-guard-dot"></div>
          <div class="yy-guard-dot"></div><div class="yy-guard-dot"></div>
        </div>
        <div class="yy-guard-pad">
          <button class="yy-guard-key" data-k="1">1</button>
          <button class="yy-guard-key" data-k="2">2</button>
          <button class="yy-guard-key" data-k="3">3</button>
          <button class="yy-guard-key" data-k="4">4</button>
          <button class="yy-guard-key" data-k="5">5</button>
          <button class="yy-guard-key" data-k="6">6</button>
          <button class="yy-guard-key" data-k="7">7</button>
          <button class="yy-guard-key" data-k="8">8</button>
          <button class="yy-guard-key" data-k="9">9</button>
          <button class="yy-guard-key action" data-k="clear">เคลียร์</button>
          <button class="yy-guard-key" data-k="0">0</button>
          <button class="yy-guard-key action" data-k="back">←</button>
        </div>
        <div class="yy-guard-hint">ค่าเริ่มต้น: staff=1234 · admin=5678 · super=9999</div>
        <button class="yy-guard-back">← กลับไปเลือกหน้า</button>
      </div>
    `;
    document.body.appendChild(bd);
    guardLockEl = bd;

    const card = bd.querySelector('.yy-guard-card');
    const dots = bd.querySelectorAll('.yy-guard-dot');
    let buf = '';
    let busy = false;

    function render() {
      dots.forEach((d, i) => d.classList.toggle('on', i < buf.length));
    }
    function submit() {
      if (busy) return;
      busy = true;
      const pin = buf;
      // Tiny artificial delay to make brute-forcing slower & give visual feedback
      setTimeout(() => {
        const ok = tryPin(role, storeId, pin);
        if (ok) {
          document.documentElement.classList.remove('yy-body-locked');
          document.body && document.body.classList.remove('yy-body-locked');
          bd.remove();
          guardLockEl = null;
          try { onPass && onPass(); } catch (e) { console.error(e); }
        } else {
          card.classList.add('yy-guard-err');
          setTimeout(() => card.classList.remove('yy-guard-err'), 380);
          buf = '';
          render();
          busy = false;
        }
      }, 120);
    }

    bd.querySelector('.yy-guard-pad').addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]')?.dataset.k;
      if (!k || busy) return;
      if (k === 'clear') { buf = ''; render(); return; }
      if (k === 'back')  { buf = buf.slice(0, -1); render(); return; }
      if (buf.length >= 4) return;
      buf += k;
      render();
      if (buf.length === 4) submit();
    });
    bd.querySelector('.yy-guard-back').onclick = () => {
      document.documentElement.classList.remove('yy-body-locked');
      document.body && document.body.classList.remove('yy-body-locked');
      bd.remove(); guardLockEl = null;
      location.replace('./start.html');
    };
    bd.addEventListener('keydown', (e) => {
      if (busy) return;
      if (e.key === 'Backspace') { buf = buf.slice(0, -1); render(); return; }
      if (/^[0-9]$/.test(e.key) && buf.length < 4) {
        buf += e.key; render();
        if (buf.length === 4) submit();
      }
    });
    document.addEventListener('keydown', function once(e) {
      if (!guardLockEl) { document.removeEventListener('keydown', once); return; }
      if (e.key === 'Escape') {
        document.documentElement.classList.remove('yy-body-locked');
        document.body && document.body.classList.remove('yy-body-locked');
        bd.remove(); guardLockEl = null;
        location.replace('./start.html');
      }
      if (e.key === 'Backspace') { buf = buf.slice(0, -1); render(); }
      else if (/^[0-9]$/.test(e.key) && buf.length < 4 && !busy) {
        buf += e.key; render();
        if (buf.length === 4) submit();
      }
    });
  }

  function getStoreFromURL() {
    const p = new URLSearchParams(location.search);
    return p.get('store') || localStorage.getItem('yy.activeStore') || 'nmtun';
  }
  function isSuperURL() {
    return new URLSearchParams(location.search).get('super') === '1';
  }

  // Clean up legacy unsigned session on first load
  if (localStorage.getItem('yy.auth.session') && !localStorage.getItem(SESSION_KEY)) {
    localStorage.removeItem('yy.auth.session');
  }

  root.YY_AUTH = {
    isAuthed, tryPin, getSession, logout,
    setPin, resetPins, listPins,
    guard,
    getStoreFromURL, isSuperURL,
    DEFAULT_PINS,
  };
})(window);
