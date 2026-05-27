/* ============================================================
 * yellowyellow.co — Menu store (CRUD layer on top of menus.js)
 *
 * Wraps the read-only YY_MENUS defaults with a writable
 * localStorage layer so menus can be edited from the admin UI.
 *
 * Usage:
 *   YY_MENU_STORE.getStoreMenus('nmtun')         // [{ cat, label, items: [...] }, ...]
 *   YY_MENU_STORE.upsertItem('nmtun', item)
 *   YY_MENU_STORE.deleteItem('nmtun', itemId)
 *   YY_MENU_STORE.upsertCategory('nmtun', cat)
 *   YY_MENU_STORE.deleteCategory('nmtun', catId)
 *   YY_MENU_STORE.resetStore('nmtun')            // wipe overrides → defaults
 *   YY_MENU_STORE.on('changed', fn)
 *
 * After every write, window.YY_MENUS is rebuilt and 'changed' fires.
 * ============================================================ */
(function (root) {
  'use strict';

  const KEY = (storeId) => `yy.menuOverrides.${storeId}`;
  const DEFAULTS = JSON.parse(JSON.stringify(root.YY_MENUS || {})); // deep clone defaults once

  const listeners = new Set();
  function emit() { listeners.forEach(fn => { try { fn(); } catch {} }); }

  function readOverrides(storeId) {
    try {
      const raw = localStorage.getItem(KEY(storeId));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }
  function writeOverrides(storeId, data) {
    localStorage.setItem(KEY(storeId), JSON.stringify(data));
    rebuildGlobal();
    emit();
  }

  /** Merge defaults + overrides → returns the live menu for a store. */
  function getStoreMenus(storeId) {
    const overrides = readOverrides(storeId);
    if (!overrides) {
      // No overrides yet — return a deep clone of defaults
      return JSON.parse(JSON.stringify(DEFAULTS[storeId] || []));
    }
    return overrides;
  }

  /** Rebuild window.YY_MENUS in-place so cached references stay valid. */
  function rebuildGlobal() {
    if (!root.YY_MENUS) root.YY_MENUS = {};
    // Wipe existing keys (so deletions propagate)
    Object.keys(root.YY_MENUS).forEach(k => delete root.YY_MENUS[k]);
    // Repopulate from defaults+overrides
    Object.keys(DEFAULTS).forEach(sid => { root.YY_MENUS[sid] = getStoreMenus(sid); });
  }

  // ── Item CRUD ────────────────────────────────────────────
  function upsertItem(storeId, item) {
    const cats = getStoreMenus(storeId);
    const catObj = cats.find(c => c.cat === item.cat);
    if (!catObj) throw new Error('หมวด ' + item.cat + ' ไม่พบ');
    const idx = catObj.items.findIndex(i => i.id === item.id);
    // Normalise common fields
    const clean = {
      ...item,
      store: storeId,
      basePrice: Number(item.basePrice) || 0,
      cost:      Number(item.cost)      || 0,
    };
    if (idx >= 0) catObj.items[idx] = { ...catObj.items[idx], ...clean };
    else           catObj.items.push(clean);
    writeOverrides(storeId, cats);
    return clean;
  }

  function deleteItem(storeId, itemId) {
    const cats = getStoreMenus(storeId);
    let removed = null;
    cats.forEach(c => {
      const idx = c.items.findIndex(i => i.id === itemId);
      if (idx >= 0) { removed = c.items.splice(idx, 1)[0]; }
    });
    writeOverrides(storeId, cats);
    return removed;
  }

  function setItemActive(storeId, itemId, active) {
    const cats = getStoreMenus(storeId);
    cats.forEach(c => c.items.forEach(i => {
      if (i.id === itemId) i.active = !!active;
    }));
    writeOverrides(storeId, cats);
  }

  // ── Category CRUD ────────────────────────────────────────
  function upsertCategory(storeId, cat) {
    const cats = getStoreMenus(storeId);
    const idx = cats.findIndex(c => c.cat === cat.cat);
    const clean = {
      cat:   cat.cat,
      label: cat.label || cat.cat,
      en:    cat.en    || '',
      items: cat.items || [],
    };
    if (idx >= 0) cats[idx] = { ...cats[idx], ...clean, items: cats[idx].items };
    else           cats.push(clean);
    writeOverrides(storeId, cats);
    return clean;
  }

  function deleteCategory(storeId, catId) {
    const cats = getStoreMenus(storeId);
    const idx = cats.findIndex(c => c.cat === catId);
    if (idx < 0) return null;
    const removed = cats.splice(idx, 1)[0];
    writeOverrides(storeId, cats);
    return removed;
  }

  // ── Reset ────────────────────────────────────────────────
  function resetStore(storeId) {
    localStorage.removeItem(KEY(storeId));
    rebuildGlobal();
    emit();
  }
  function resetAll() {
    Object.keys(DEFAULTS).forEach(sid => localStorage.removeItem(KEY(sid)));
    rebuildGlobal();
    emit();
  }

  // ── Event API ────────────────────────────────────────────
  function on(_evt, fn)  { listeners.add(fn); }
  function off(_evt, fn) { listeners.delete(fn); }

  // ── Init ─────────────────────────────────────────────────
  rebuildGlobal();

  root.YY_MENU_STORE = {
    getStoreMenus,
    upsertItem, deleteItem, setItemActive,
    upsertCategory, deleteCategory,
    resetStore, resetAll,
    on, off,
    DEFAULTS,
  };
})(window);
