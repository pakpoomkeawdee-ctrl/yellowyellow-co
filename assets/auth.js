/* ============================================================
 * yellowyellow.co — PIN-based auth system
 *
 * Roles:
 *   - customer : no auth, public
 *   - staff    : PIN per store (POS access)
 *   - admin    : PIN per store (back-office)
 *   - super    : PIN global (cross-store view)
 *
 * Default PINs (override via Admin → Settings → Employee accounts)
 *   staff: 1234   admin: 5678   super: 9999
 *
 * Session: stored in sessionStorage (cleared on tab close)
 *          AND localStorage (for tablet "always logged in" mode)
 * ============================================================ */
(function (root) {
  'use strict';

  const SESSION_KEY = 'yy.auth.session';
  const PINS_KEY    = 'yy.auth.pins';   // per-store overrides
  const TTL_HOURS   = 12;               // re-auth required after N hours

  const DEFAULT_PINS = {
    staff: { nmtun: '1234', pussorn: '1234', khaow: '1234' },
    admin: { nmtun: '5678', pussorn: '5678', khaow: '5678' },
    super: { _global: '9999' },
  };

  // ── Helpers ────────────────────────────────────────────────
  function readPins() {
    try {
      const raw = localStorage.getItem(PINS_KEY);
      if (!raw) return DEFAULT_PINS;
      const stored = JSON.parse(raw);
      // Merge defaults so new stores still work after upgrade
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
  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.exp || Date.now() > s.exp) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    } catch { return null; }
  }
  function writeSession(s) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  // ── Public API ─────────────────────────────────────────────

  /** Is the current user authenticated for this role+store? */
  function isAuthed(role, storeId) {
    if (role === 'customer') return true;
    const s = readSession();
    if (!s) return false;
    // Super covers everything
    if (s.role === 'super') return true;
    if (s.role !== role) return false;
    if (role === 'super') return true;            // global
    return s.store === storeId;                   // store-scoped
  }

  /** Attempt to login. Returns true if PIN matches. */
  function tryPin(role, storeId, pin) {
    if (!pin || pin.length !== 4) return false;
    const pins = readPins();
    let expected;
    if (role === 'super') expected = pins.super._global;
    else                  expected = (pins[role] || {})[storeId];
    if (!expected) return false;
    if (String(pin) !== String(expected)) return false;

    writeSession({
      role,
      store: storeId || null,
      since: Date.now(),
      exp:   Date.now() + TTL_HOURS * 3600 * 1000,
    });
    return true;
  }

  /** Get current session (or null). */
  function getSession() { return readSession(); }

  /** Logout. */
  function logout() { clearSession(); }

  /** Change PIN for a role+store. Requires admin or super already authed. */
  function setPin(role, storeId, newPin) {
    if (!/^[0-9]{4}$/.test(String(newPin))) {
      return { ok: false, error: 'PIN ต้องเป็นตัวเลข 4 หลัก' };
    }
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

  /** Reset to default PINs (super only). */
  function resetPins() {
    const session = readSession();
    if (!session || session.role !== 'super') {
      return { ok: false, error: 'Super Admin เท่านั้น' };
    }
    localStorage.removeItem(PINS_KEY);
    return { ok: true };
  }

  /** List all PINs (masked) for the admin view. */
  function listPins() {
    const session = readSession();
    if (!session) return null;
    const pins = readPins();
    const mask = (p) => session.role === 'super' ? p : '••••';
    const out = { staff: {}, admin: {}, super: {} };
    Object.keys(pins.staff || {}).forEach(s => out.staff[s] = mask(pins.staff[s]));
    Object.keys(pins.admin || {}).forEach(s => out.admin[s] = mask(pins.admin[s]));
    out.super._global = mask(pins.super._global);
    return out;
  }

  /** Guard a page — redirect to start.html if not authed for required role+store. */
  function guard(role, storeId) {
    if (isAuthed(role, storeId)) return true;
    const back = encodeURIComponent(location.href);
    location.replace(`./start.html?next=${back}`);
    return false;
  }

  /** Helper: get storeId from current URL (?store=xxx). */
  function getStoreFromURL() {
    const p = new URLSearchParams(location.search);
    return p.get('store') || localStorage.getItem('yy.activeStore') || 'nmtun';
  }

  /** Helper: is super mode enabled in URL (?super=1)? */
  function isSuperURL() {
    return new URLSearchParams(location.search).get('super') === '1';
  }

  root.YY_AUTH = {
    isAuthed, tryPin, getSession, logout,
    setPin, resetPins, listPins, guard,
    getStoreFromURL, isSuperURL,
    DEFAULT_PINS,
  };
})(window);
