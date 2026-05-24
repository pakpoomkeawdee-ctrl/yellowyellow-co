/* ============================================================
 *  yellowyellow.co — Google Apps Script backend
 *  Web App endpoint for POS + Admin dashboard.
 *  Stores everything in a single Google Sheet (multi-tab).
 *
 *  SETUP
 *  ─────
 *  1) Create a new Google Sheet. Copy its ID from the URL.
 *  2) Open Extensions → Apps Script. Paste this whole file.
 *  3) Set SHEET_ID below (or set as Script Property "SHEET_ID").
 *  4) Run setupSheets() once from the editor to create all tabs.
 *  5) Deploy → New deployment → Web app:
 *       Execute as: Me
 *       Who has access: Anyone
 *  6) Copy the /exec URL into assets/config.js → DEFAULT_API_URL
 *     (or paste into the app's Settings → API URL field).
 *
 *  Tabs created:
 *    Orders, OrderLines, Products, Inventory, InventoryLog,
 *    Sales, Expenses, Employees, Suppliers, KPI, Daily, Monthly
 *
 *  All actions are POST + JSON body: { action, payload }.
 * ============================================================ */

const SHEET_ID = ''; // ← วาง Google Sheet ID ตรงนี้ หรือกำหนดเป็น Script Property

const STORE_IDS = ['nmtun', 'pussorn', 'khaow'];

const TABS = {
  Orders:      ['orderId','store','createdAt','updatedAt','status','type','table','customer','subtotal','discount','tax','total','paid','change','paymentMethod','cashier','note','synced','dateISO'],
  OrderLines:  ['lineId','orderId','store','itemId','th','en','qty','unitPrice','total','temp','size','protein','type','sauce','sweet','spice','mods','note'],
  Products:    ['itemId','store','cat','th','en','basePrice','cost','active','imageUrl'],
  Inventory:   ['store','category','name','unit','onHand','par','reorderAt','state','updatedAt'],
  InventoryLog:['ts','store','name','delta','reason','user'],
  Sales:       ['dateISO','store','orderId','total','net','paymentMethod','cashier'],
  Expenses:    ['id','dateISO','store','category','amount','note','vendor','createdAt'],
  Employees:   ['id','store','name','role','wage','phone','active','startDate'],
  Suppliers:   ['id','name','type','phone','email','address','note'],
  KPI:         ['dateISO','store','revenue','orders','avgTicket','customers','foodCost','laborCost','margin'],
  Daily:       ['dateISO','store','revenue','orders','cashIn','cashOut','net','target','recorder','note'],
  Monthly:     ['month','store','revenue','orders','avgTicket','foodCost','laborCost','expenses','netProfit'],
};

/* ---------- Entry point ---------- */
function doPost(e) {
  return json(handle(e));
}
function doGet(e) {
  // Allow simple GET for ping/test
  if (e && e.parameter && e.parameter.action === 'ping') return json({ ok: true, ts: Date.now(), v: '1.0' });
  return json({ ok: true, msg: 'yellowyellow.co backend up. POST { action, payload } to use.' });
}

function handle(e) {
  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = body.action || (e && e.parameter && e.parameter.action);
    const p = body.payload || {};
    switch (action) {
      case 'ping':           return { ok: true, ts: Date.now(), v: '1.0' };
      case 'saveOrder':      return saveOrder(p);
      case 'updateOrder':    return updateOrder(p);
      case 'listOrders':     return listOrders(p);
      case 'saveExpense':    return saveRow_('Expenses', { ...p.expense, store: p.store, createdAt: nowISO() });
      case 'saveInventory':  return saveInventory(p);
      case 'saveDaily':      return saveDaily(p);
      case 'saveEmployee':   return saveRow_('Employees', p.employee || {});
      case 'saveSupplier':   return saveRow_('Suppliers', p.supplier || {});
      case 'saveProduct':    return saveRow_('Products', p.product || {});
      case 'summary':        return summary(p);
      case 'salesByDay':     return salesByDay(p);
      case 'topItems':       return topItems(p);
      case 'inventoryAlerts':return inventoryAlerts(p);
      default:               return { ok: false, error: 'unknown-action: ' + action };
    }
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

/* ---------- Sheet bootstrap ---------- */
function getSheetId_() {
  let id = SHEET_ID;
  if (!id) id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Missing SHEET_ID (constant in Code.gs OR Script Property).');
  return id;
}
function ss_() { return SpreadsheetApp.openById(getSheetId_()); }

function setupSheets() {
  const ss = ss_();
  Object.keys(TABS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = TABS[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fafaf9');
  });
  // Remove default Sheet1 if untouched
  const def = ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  return { ok: true, tabs: Object.keys(TABS) };
}

/* ---------- Generic row helpers ---------- */
function sh_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet ' + name + ' — run setupSheets()');
  return sh;
}
function rowFor_(name, obj) {
  return TABS[name].map(h => {
    const v = obj[h];
    if (v == null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  });
}
function appendRow_(name, obj) {
  const sh = sh_(name);
  sh.appendRow(rowFor_(name, obj));
  return sh.getLastRow();
}
function saveRow_(name, obj) {
  appendRow_(name, obj);
  return { ok: true, sheet: name };
}
function findRow_(name, keyCol, key) {
  const sh = sh_(name);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const idx = headers.indexOf(keyCol);
  if (idx < 0) return -1;
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idx]) === String(key)) return r + 1; // 1-based
  }
  return -1;
}
function updateRow_(name, keyCol, key, patch) {
  const sh = sh_(name);
  const headers = TABS[name];
  const row = findRow_(name, keyCol, key);
  if (row < 0) return null;
  const range = sh.getRange(row, 1, 1, headers.length);
  const existing = range.getValues()[0];
  const merged = headers.map((h, i) => h in patch ? (typeof patch[h] === 'object' ? JSON.stringify(patch[h]) : patch[h]) : existing[i]);
  range.setValues([merged]);
  return row;
}
function nowISO() { return new Date().toISOString(); }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- Orders ---------- */
function saveOrder(p) {
  const { store, record } = p;
  if (!store || !record) return { ok: false, error: 'missing-store-or-record' };
  const exists = findRow_('Orders', 'orderId', record.orderId);
  const header = {
    orderId: record.orderId, store, createdAt: record.createdAt || Date.now(), updatedAt: Date.now(),
    status: record.status || 'new', type: record.type || 'dinein', table: record.table || '',
    customer: record.customer || '', subtotal: record.subtotal || 0, discount: record.discount || 0,
    tax: record.tax || 0, total: record.total || 0, paid: record.paid || 0, change: record.change || 0,
    paymentMethod: record.paymentMethod || '', cashier: record.cashier || '',
    note: record.note || '', synced: true, dateISO: (record.dateISO || todayISO_()),
  };
  if (exists > 0) updateRow_('Orders', 'orderId', record.orderId, header);
  else appendRow_('Orders', header);
  // Lines
  (record.lines || record.items || []).forEach((ln, i) => {
    const lineId = ln.lineId || `${record.orderId}-${i+1}`;
    const row = {
      lineId, orderId: record.orderId, store,
      itemId: ln.itemId, th: ln.th, en: ln.en || '',
      qty: ln.qty || 1, unitPrice: ln.unit || ln.unitPrice || 0, total: ln.total || 0,
      temp: ln.temp || '', size: ln.size || '', protein: ln.protein || '',
      type: ln.type || '', sauce: ln.sauce || '', sweet: ln.sweet || '', spice: ln.spice || '',
      mods: ln.mods || [], note: ln.note || '',
    };
    if (findRow_('OrderLines', 'lineId', lineId) > 0) updateRow_('OrderLines', 'lineId', lineId, row);
    else appendRow_('OrderLines', row);
  });
  // Mirror to Sales for analytics
  if (record.status === 'paid' || header.status === 'paid') {
    appendRow_('Sales', {
      dateISO: header.dateISO, store, orderId: record.orderId,
      total: header.total, net: header.total - (record.tax || 0),
      paymentMethod: header.paymentMethod, cashier: header.cashier,
    });
  }
  return { ok: true, orderId: record.orderId };
}

function updateOrder(p) {
  const { store, orderId, patch } = p;
  const row = updateRow_('Orders', 'orderId', orderId, { ...patch, updatedAt: Date.now() });
  if (!row) return { ok: false, error: 'not-found' };
  if (patch && patch.status === 'paid') {
    appendRow_('Sales', {
      dateISO: patch.dateISO || todayISO_(), store, orderId,
      total: patch.total || 0, net: patch.total || 0,
      paymentMethod: patch.paymentMethod || '', cashier: patch.cashier || '',
    });
  }
  return { ok: true };
}

function listOrders(p) {
  const store = p && p.store;
  const since = Number(p && p.since) || 0;
  const sh = sh_('Orders');
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const rows = [];
  for (let r = 1; r < data.length; r++) {
    const obj = {};
    headers.forEach((h, i) => obj[h] = data[r][i]);
    if (store && obj.store !== store) continue;
    if (since && Number(obj.updatedAt) < since) continue;
    rows.push(obj);
  }
  return { ok: true, records: rows };
}

/* ---------- Inventory ---------- */
function saveInventory(p) {
  const { store, updates } = p;          // updates = { name: 'low'|'out'|'normal' }
  if (!store || !updates) return { ok: false, error: 'missing' };
  const sh = sh_('Inventory');
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const idxName = headers.indexOf('name'), idxStore = headers.indexOf('store'),
        idxState = headers.indexOf('state'), idxUpd = headers.indexOf('updatedAt');
  const map = {};
  for (let r = 1; r < data.length; r++) {
    if (data[r][idxStore] === store) map[data[r][idxName]] = r + 1;
  }
  Object.keys(updates).forEach(name => {
    const state = updates[name];
    const row = map[name];
    if (row) {
      sh.getRange(row, idxState + 1).setValue(state);
      sh.getRange(row, idxUpd + 1).setValue(nowISO());
    } else {
      appendRow_('Inventory', { store, name, state, updatedAt: nowISO() });
    }
    appendRow_('InventoryLog', { ts: nowISO(), store, name, delta: 0, reason: 'state→' + state, user: '' });
  });
  return { ok: true, count: Object.keys(updates).length };
}

function inventoryAlerts(p) {
  const store = p && p.store;
  const sh = sh_('Inventory');
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const alerts = [];
  for (let r = 1; r < data.length; r++) {
    const obj = {};
    headers.forEach((h, i) => obj[h] = data[r][i]);
    if (store && obj.store !== store) continue;
    if (obj.state === 'low' || obj.state === 'out') alerts.push(obj);
  }
  return { ok: true, alerts };
}

/* ---------- Daily/Monthly aggregation ---------- */
function saveDaily(p) {
  const s = p.summary || {};
  s.dateISO = s.dateISO || todayISO_();
  // upsert by date+store
  const sh = sh_('Daily');
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const iDate = headers.indexOf('dateISO'), iStore = headers.indexOf('store');
  for (let r = 1; r < data.length; r++) {
    if (data[r][iDate] === s.dateISO && data[r][iStore] === (p.store || s.store)) {
      const range = sh.getRange(r + 1, 1, 1, headers.length);
      const merged = headers.map((h, i) => h in s ? s[h] : data[r][i]);
      range.setValues([merged]);
      return { ok: true, updated: true };
    }
  }
  appendRow_('Daily', { ...s, store: p.store || s.store });
  return { ok: true, inserted: true };
}

function todayISO_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'); }

/* ---------- Analytics ---------- */
function summary(p) {
  const store = p && p.store;
  const since = p && p.since;
  const sales = sh_('Sales').getDataRange().getValues();
  const headers = sales[0];
  const iDate = headers.indexOf('dateISO'), iStore = headers.indexOf('store'), iTotal = headers.indexOf('total');
  let revenue = 0, orders = 0;
  for (let r = 1; r < sales.length; r++) {
    if (store && sales[r][iStore] !== store) continue;
    if (since && sales[r][iDate] < since) continue;
    revenue += Number(sales[r][iTotal]) || 0;
    orders++;
  }
  return { ok: true, revenue, orders, avgTicket: orders ? Math.round(revenue / orders) : 0 };
}

function salesByDay(p) {
  const store = p && p.store;
  const days = Number(p && p.days || 14);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = Utilities.formatDate(cutoff, 'Asia/Bangkok', 'yyyy-MM-dd');
  const sales = sh_('Sales').getDataRange().getValues();
  const headers = sales[0];
  const iDate = headers.indexOf('dateISO'), iStore = headers.indexOf('store'), iTotal = headers.indexOf('total');
  const map = {};
  for (let r = 1; r < sales.length; r++) {
    if (store && sales[r][iStore] !== store) continue;
    if (sales[r][iDate] < cutoffISO) continue;
    map[sales[r][iDate]] = (map[sales[r][iDate]] || 0) + (Number(sales[r][iTotal]) || 0);
  }
  return { ok: true, series: Object.keys(map).sort().map(d => ({ date: d, total: map[d] })) };
}

function topItems(p) {
  const store = p && p.store;
  const lines = sh_('OrderLines').getDataRange().getValues();
  const headers = lines[0];
  const iStore = headers.indexOf('store'), iTh = headers.indexOf('th'),
        iQty = headers.indexOf('qty'), iTotal = headers.indexOf('total');
  const map = {};
  for (let r = 1; r < lines.length; r++) {
    if (store && lines[r][iStore] !== store) continue;
    const k = lines[r][iTh];
    if (!map[k]) map[k] = { name: k, qty: 0, revenue: 0 };
    map[k].qty += Number(lines[r][iQty]) || 0;
    map[k].revenue += Number(lines[r][iTotal]) || 0;
  }
  const arr = Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 20);
  return { ok: true, items: arr };
}
