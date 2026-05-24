/* ============================================================
 * yellowyellow.co — API service layer
 * - Talks to the Google Apps Script Web App (backend/Code.gs)
 * - LocalStorage cache + offline queue (auto-sync every 15 s)
 * - Cross-tab broadcast via storage event
 *
 * Exposes window.YY_API.
 * ============================================================ */

(function (root) {
  'use strict';

  const cfg = root.YY_CONFIG || {};
  const STORE_IDS = cfg.STORE_IDS || ['nmtun', 'pussorn', 'khaow'];

  /* ---------- Storage helpers ---------- */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    raw(k)    { return localStorage.getItem(k); },
    del(k)    { localStorage.removeItem(k); },
  };

  const k = (storeId, kind) => `yy.${storeId}.${kind}`;
  const apiUrl = () => LS.raw('yy.api') || cfg.API_URL || '';
  const setApiUrl = (u) => { if (u) localStorage.setItem('yy.api', u); else LS.del('yy.api'); };

  /* ---------- Online detection ---------- */
  let online = navigator.onLine !== false;
  window.addEventListener('online',  () => { online = true;  emit('online');  syncQueue(); });
  window.addEventListener('offline', () => { online = false; emit('offline'); });

  /* ---------- Event bus ---------- */
  const handlers = {};
  function on(evt, fn)  { (handlers[evt] = handlers[evt] || []).push(fn); }
  function off(evt, fn) { if (handlers[evt]) handlers[evt] = handlers[evt].filter(h => h !== fn); }
  function emit(evt, payload) { (handlers[evt] || []).forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } }); }

  /* ---------- Cross-tab sync ---------- */
  window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (e.key.startsWith('yy.') && e.key.endsWith('.records')) {
      const storeId = e.key.split('.')[1];
      emit('records-changed', { storeId });
    }
  });

  /* ---------- Low-level fetch with timeout ---------- */
  async function postJSON(action, body) {
    const url = apiUrl();
    if (!url) throw new Error('no-api');
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        // text/plain avoids CORS preflight for Apps Script
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload: body || {} }),
        signal: ctrl.signal,
      });
      clearTimeout(tm);
      const text = await res.text();
      try { return JSON.parse(text); }
      catch { return { ok: false, error: 'bad-json', raw: text }; }
    } catch (err) {
      clearTimeout(tm);
      return { ok: false, error: err.message || 'network' };
    }
  }

  /* ---------- Local record cache ---------- */
  function getRecords(storeId) {
    return LS.get(k(storeId, 'records'), []);
  }
  function setRecords(storeId, list) {
    LS.set(k(storeId, 'records'), list);
    emit('records-changed', { storeId });
  }
  function upsertRecord(storeId, rec) {
    const list = getRecords(storeId);
    const i = list.findIndex(r => r.orderId === rec.orderId);
    if (i >= 0) list[i] = { ...list[i], ...rec };
    else list.push(rec);
    setRecords(storeId, list);
    return rec;
  }
  function clearStore(storeId) { setRecords(storeId, []); }

  /* ---------- Sequential daily order number ---------- */
  function nextOrderNo(storeId) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ck = `yy.${storeId}.counter.${today}`;
    const next = (parseInt(localStorage.getItem(ck) || '0', 10) + 1);
    localStorage.setItem(ck, String(next));
    return `${today.slice(4)}-${String(next).padStart(4, '0')}`;
  }

  /* ---------- Offline queue ---------- */
  const QKEY = 'yy.queue';
  function getQueue()        { return LS.get(QKEY, []); }
  function setQueue(q)       { LS.set(QKEY, q); emit('queue-changed', { length: q.length }); }
  function enqueue(item)     { const q = getQueue(); q.push({ ...item, ts: Date.now() }); setQueue(q); }
  function queueLength()     { return getQueue().length; }

  let syncing = false;
  async function syncQueue() {
    if (syncing || !online || !apiUrl()) return;
    syncing = true;
    try {
      let q = getQueue();
      while (q.length) {
        const item = q[0];
        const r = await postJSON(item.action, item.payload);
        if (!r || !r.ok) break;            // stop on first failure; will retry next tick
        q = q.slice(1);
        setQueue(q);
      }
    } finally { syncing = false; }
  }
  setInterval(syncQueue, 15000);
  setTimeout(syncQueue, 1500);

  /* ---------- High-level helpers ---------- */
  /**
   * Save an order. Optimistic: writes to local cache immediately,
   * fires webhook in background, queues if offline.
   */
  async function saveOrder(storeId, record) {
    if (!record.orderId) record.orderId = nextOrderNo(storeId);
    if (!record.createdAt) record.createdAt = Date.now();
    record.store = storeId;
    record.synced = false;
    upsertRecord(storeId, record);

    if (!apiUrl()) {
      enqueue({ action: 'saveOrder', payload: { store: storeId, record } });
      return { ok: true, queued: true, record };
    }
    const r = await postJSON('saveOrder', { store: storeId, record });
    if (r && r.ok) {
      record.synced = true;
      upsertRecord(storeId, record);
      return { ok: true, record };
    }
    enqueue({ action: 'saveOrder', payload: { store: storeId, record } });
    return { ok: true, queued: true, record };
  }

  async function updateOrder(storeId, orderId, patch) {
    const list = getRecords(storeId);
    const i = list.findIndex(r => r.orderId === orderId);
    if (i < 0) return { ok: false, error: 'not-found' };
    list[i] = { ...list[i], ...patch, synced: false };
    setRecords(storeId, list);
    if (!apiUrl()) {
      enqueue({ action: 'updateOrder', payload: { store: storeId, orderId, patch } });
      return { ok: true, queued: true };
    }
    const r = await postJSON('updateOrder', { store: storeId, orderId, patch });
    if (r && r.ok) {
      list[i].synced = true;
      setRecords(storeId, list);
      return { ok: true };
    }
    enqueue({ action: 'updateOrder', payload: { store: storeId, orderId, patch } });
    return { ok: true, queued: true };
  }

  async function pullOrders(storeId, since) {
    if (!apiUrl()) return { ok: false, error: 'no-api' };
    const r = await postJSON('listOrders', { store: storeId, since: since || 0 });
    if (r && r.ok && Array.isArray(r.records)) {
      // Merge — server is source of truth for already-synced rows
      const local = getRecords(storeId);
      const map = new Map(local.map(x => [x.orderId, x]));
      r.records.forEach(srv => map.set(srv.orderId, { ...map.get(srv.orderId), ...srv, synced: true }));
      const merged = [...map.values()].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setRecords(storeId, merged);
    }
    return r;
  }

  async function saveExpense(storeId, expense) {
    expense.id = expense.id || ('ex-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
    const list = LS.get(k(storeId, 'expenses'), []);
    list.push(expense);
    LS.set(k(storeId, 'expenses'), list);
    if (!apiUrl()) { enqueue({ action: 'saveExpense', payload: { store: storeId, expense } }); return { ok: true, queued: true }; }
    const r = await postJSON('saveExpense', { store: storeId, expense });
    if (r && r.ok) return { ok: true };
    enqueue({ action: 'saveExpense', payload: { store: storeId, expense } });
    return { ok: true, queued: true };
  }
  function getExpenses(storeId) { return LS.get(k(storeId, 'expenses'), []); }

  async function saveInventoryUpdate(storeId, updates) {
    LS.set(k(storeId, 'invState'), updates);
    if (!apiUrl()) { enqueue({ action: 'saveInventory', payload: { store: storeId, updates } }); return { ok: true, queued: true }; }
    const r = await postJSON('saveInventory', { store: storeId, updates });
    if (r && r.ok) return { ok: true };
    enqueue({ action: 'saveInventory', payload: { store: storeId, updates } });
    return { ok: true, queued: true };
  }
  function getInventoryState(storeId) { return LS.get(k(storeId, 'invState'), {}); }

  async function saveDailySummary(storeId, summary) {
    summary.dateISO = summary.dateISO || new Date().toISOString().slice(0, 10);
    const all = LS.get(k(storeId, 'daily'), {});
    all[summary.dateISO] = summary;
    LS.set(k(storeId, 'daily'), all);
    if (!apiUrl()) { enqueue({ action: 'saveDaily', payload: { store: storeId, summary } }); return { ok: true, queued: true }; }
    const r = await postJSON('saveDaily', { store: storeId, summary });
    if (r && r.ok) return { ok: true };
    enqueue({ action: 'saveDaily', payload: { store: storeId, summary } });
    return { ok: true, queued: true };
  }
  function getDaily(storeId) { return LS.get(k(storeId, 'daily'), {}); }

  /* ---------- Auto-refresh tick ---------- */
  function startAutoRefresh(intervalMs) {
    intervalMs = intervalMs || 30000;
    let timer = null;
    function tick() {
      STORE_IDS.forEach(id => pullOrders(id).catch(() => {}));
    }
    tick();
    timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }

  /* ---------- Connection helpers ---------- */
  async function ping() {
    if (!apiUrl()) return { ok: false, error: 'no-api' };
    return await postJSON('ping', {});
  }

  /* ---------- Export ---------- */
  root.YY_API = {
    apiUrl, setApiUrl,
    on, off,
    getRecords, setRecords, upsertRecord, clearStore,
    nextOrderNo,
    saveOrder, updateOrder, pullOrders,
    saveExpense, getExpenses,
    saveInventoryUpdate, getInventoryState,
    saveDailySummary, getDaily,
    queueLength, syncQueue,
    startAutoRefresh, ping,
    isOnline: () => online,
  };
})(window);
