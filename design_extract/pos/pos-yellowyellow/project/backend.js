// Shared backend integration helpers — wrap yy.* localStorage + webhook fire.
// Exposed on window.YYBack for app.jsx and pos.jsx to use.

const YYBack = (() => {
  const k = (storeId, kind) => `yy.${storeId}.${kind}`;

  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) ?? '') ?? fallback; }
    catch { return fallback; }
  };
  const writeJSON = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };

  const getRecords  = (storeId) => readJSON(k(storeId, 'records'), []);
  const setRecords  = (storeId, list) => writeJSON(k(storeId, 'records'), list);
  const getHook     = (storeId) => localStorage.getItem(k(storeId, 'hook')) || '';
  const setHook     = (storeId, url) => localStorage.setItem(k(storeId, 'hook'), url || '');
  const getActive   = () => localStorage.getItem('yy.activeStore') || 'nmtun';
  const setActive   = (id) => localStorage.setItem('yy.activeStore', id);

  // Sequential order number per day, per store.
  const nextOrderNo = (storeId) => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const key = `yy.${storeId}.counter.${today}`;
    const next = (parseInt(localStorage.getItem(key) || '0', 10) + 1);
    localStorage.setItem(key, String(next));
    return `${today.slice(4)}-${String(next).padStart(4, '0')}`;
  };

  const fireWebhook = (storeId, payload) => {
    const hook = getHook(storeId);
    if (!hook) return Promise.resolve(false);
    return fetch(hook, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(() => true).catch(() => false);
  };

  // Persist a new order. Append to records, fire webhook.
  // Returns the saved record (with synced flag updated).
  const saveOrder = async (storeId, record) => {
    const list = getRecords(storeId);
    list.push(record);
    setRecords(storeId, list);
    const ok = await fireWebhook(storeId, record);
    if (ok) {
      const idx = list.findIndex(r => r.orderId === record.orderId);
      if (idx >= 0) { list[idx].synced = true; setRecords(storeId, list); }
    }
    window.dispatchEvent(new CustomEvent('yy:changed', { detail: { storeId } }));
    return list[list.length - 1];
  };

  // Update existing record (e.g. status change).
  const updateOrder = (storeId, orderId, patch) => {
    const list = getRecords(storeId);
    const idx = list.findIndex(r => r.orderId === orderId);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...patch };
    setRecords(storeId, list);
    window.dispatchEvent(new CustomEvent('yy:changed', { detail: { storeId } }));
    return list[idx];
  };

  const clearStore = (storeId) => {
    setRecords(storeId, []);
    window.dispatchEvent(new CustomEvent('yy:changed', { detail: { storeId } }));
  };

  return {
    getRecords, setRecords, getHook, setHook, getActive, setActive,
    nextOrderNo, saveOrder, updateOrder, fireWebhook, clearStore,
  };
})();

window.YYBack = YYBack;
