// Main app — composes header, customer menu, cart, staff queue, modals.
(() => {
const { useState, useEffect, useMemo, useCallback, useRef } = React;
const aUseState = useState, aUseEffect = useEffect, aUseMemo = useMemo, aUseCallback = useCallback;
const { STORES: ASTORES, MENUS: AMENUS, STATUS_FLOW: ASTATUS } = window.YY;
const { Header: AHeader, MenuCard: AMenuCard, Customizer: ACustomizer, Thumb: AThumb,
        baht: aBaht, cx: aCx, timeAgo: aTimeAgo } = window.YYUI;
const { OrderCard: AOrderCard, PaymentModal: APaymentModal, QRModal: AQRModal,
        SettingsModal: ASettingsModal, Dashboard: ADashboard, StatusPill: AStatusPill,
        describeLine: aDescribeLine } = window.YYPOS;

// ---------------------------------------------------------------------------
// CartPanel — sticky right rail for customer/staff order build
// ---------------------------------------------------------------------------
function CartPanel({ store, cart, setCart, onSubmit, orderType, setOrderType, table, setTable, name, setName }) {
  const subtotal = cart.reduce((a, b) => a + b.total, 0);
  const empty = cart.length === 0;
  const removeLine = (i) => setCart(cart.filter((_, j) => j !== i));
  const adjustQty = (i, d) => setCart(cart.map((c, j) => j === i ? { ...c, qty: Math.max(1, c.qty + d), total: c.unit * Math.max(1, c.qty + d) } : c));
  return (
    <aside className="cart" style={{ '--store': store.accent, '--store-tint': store.accentTint, '--store-light': store.accentLight }}>
      <div className="cart-head">
        <div>
          <div className="cart-title">ออเดอร์ปัจจุบัน</div>
          <div className="cart-sub">{empty ? 'ยังไม่มีรายการ' : `${cart.length} รายการ`}</div>
        </div>
        {!empty && (
          <button className="cart-clear" onClick={() => setCart([])} title="ล้าง">ล้าง</button>
        )}
      </div>
      <div className="cart-type">
        <button className={aCx('type-btn', orderType === 'dine-in' && 'is-active')}
          style={orderType === 'dine-in' ? { background: store.accent, color: '#fff' } : undefined}
          onClick={() => setOrderType('dine-in')}>🍽 ทานที่ร้าน</button>
        <button className={aCx('type-btn', orderType === 'takeaway' && 'is-active')}
          style={orderType === 'takeaway' ? { background: store.accent, color: '#fff' } : undefined}
          onClick={() => setOrderType('takeaway')}>🥡 กลับบ้าน</button>
      </div>
      <div className="cart-info">
        {orderType === 'dine-in' ? (
          <input className="cart-input" placeholder="โต๊ะที่ / Table #" value={table} onChange={e => setTable(e.target.value)} />
        ) : (
          <input className="cart-input" placeholder="ชื่อ / เบอร์โทร" value={name} onChange={e => setName(e.target.value)} />
        )}
      </div>
      <div className="cart-list">
        {empty && (
          <div className="cart-empty">
            <div className="cart-empty-glyph" style={{ background: store.accentTint, color: store.accent }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h2l3 13h12l3-9H6"/><circle cx="9" cy="21" r="1.5"/><circle cx="19" cy="21" r="1.5"/>
              </svg>
            </div>
            <div>เลือกเมนูจากด้านซ้ายเพื่อเริ่ม</div>
          </div>
        )}
        {cart.map((line, i) => (
          <div key={i} className="cart-line">
            <div className="cart-line-top">
              <div className="cart-line-name">
                <div className="cart-line-th">{line.th}</div>
                <div className="cart-line-en">{aDescribeLine(line) || ' '}</div>
                {line.mods?.length > 0 && (
                  <div className="cart-line-mods">
                    + {line.mods.map(m => {
                      const item = findItem(store.id, line.itemId);
                      return item?.modifiers?.find(mm => mm.id === m)?.label;
                    }).filter(Boolean).join(', ')}
                  </div>
                )}
                {line.note && <div className="cart-line-note">หมายเหตุ: {line.note}</div>}
              </div>
              <button className="cart-line-x" onClick={() => removeLine(i)} aria-label="ลบ">×</button>
            </div>
            <div className="cart-line-bot">
              <div className="qty-stepper small">
                <button onClick={() => adjustQty(i, -1)} aria-label="ลด">−</button>
                <span>{line.qty}</span>
                <button onClick={() => adjustQty(i, 1)} aria-label="เพิ่ม">+</button>
              </div>
              <div className="cart-line-amt">{aBaht(line.total)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="cart-foot">
        <div className="cart-totals">
          <div className="cart-total-row"><span>รวม</span><span>{aBaht(subtotal)}</span></div>
          <div className="cart-total-row"><span>ภาษี (รวมในราคา)</span><span>{aBaht(0)}</span></div>
          <div className="cart-total-row cart-grand"><span>ยอดสุทธิ</span><span>{aBaht(subtotal)}</span></div>
        </div>
        <button className="primary-btn full" disabled={empty}
          style={{ background: empty ? '#a8a29e' : store.accent }}
          onClick={onSubmit}>ส่งออเดอร์เข้าครัว</button>
      </div>
    </aside>
  );
}

function findItem(storeId, itemId) {
  for (const cat of AMENUS[storeId] || []) {
    const f = cat.items.find(i => i.id === itemId);
    if (f) return f;
  }
  return null;
}

// ---------------------------------------------------------------------------
// CustomerView — sidebar w/ category jump + grid of menu cards
// ---------------------------------------------------------------------------
function CustomerView({ store, onPickItem }) {
  const cats = AMENUS[store.id];
  const [active, setActive] = useState(cats[0]?.cat);
  const refs = useRef({});

  const jump = (cat) => {
    setActive(cat);
    refs.current[cat]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="cust-view">
      <aside className="cat-rail" style={{ '--store': store.accent }}>
        <div className="cat-rail-title">หมวดหมู่</div>
        {cats.map(c => (
          <button key={c.cat} className={aCx('cat-rail-btn', active === c.cat && 'is-active')}
            style={active === c.cat ? { background: store.accentTint, color: store.accent } : undefined}
            onClick={() => jump(c.cat)}>
            <span className="cat-rail-label">{c.label}</span>
            <span className="cat-rail-en">{c.en}</span>
            <span className="cat-rail-count">{c.items.length}</span>
          </button>
        ))}
        <div className="cat-rail-sep"></div>
        <div className="cat-rail-help">
          <div className="cat-rail-help-title">ตัวอย่างราคา</div>
          <div className="cat-rail-help-sub">{store.cuisine}</div>
        </div>
      </aside>
      <section className="menu-area">
        <div className="menu-hero" style={{ background: `linear-gradient(140deg, ${store.accent} 0%, ${store.accentSoft} 100%)` }}>
          <div className="menu-hero-inner">
            <div>
              <div className="menu-hero-eyebrow">{store.cuisine}</div>
              <div className="menu-hero-title">{store.name}</div>
              <div className="menu-hero-tag">{store.tagline}</div>
            </div>
            <div className="menu-hero-meta">
              <div className="menu-hero-meta-row"><span>เวลาเปิด</span><span>{store.hours}</span></div>
              <div className="menu-hero-meta-row"><span>เมนูทั้งหมด</span><span>{cats.reduce((a, c) => a + c.items.length, 0)} รายการ</span></div>
            </div>
          </div>
        </div>
        {cats.map(c => (
          <section key={c.cat} ref={el => refs.current[c.cat] = el} className="menu-section">
            <div className="menu-section-head">
              <h2>{c.label}</h2>
              <span>{c.en} · {c.items.length} รายการ</span>
            </div>
            <div className="menu-grid">
              {c.items.map(it => <AMenuCard key={it.id} item={it} store={store} onPick={onPickItem} />)}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// StaffView — kitchen queue with filter tabs + dashboard
// ---------------------------------------------------------------------------
function StaffView({ store, records, onAdvance, onCancel, onOpenPay, onOpenOrder, tab, setTab }) {
  const today = new Date().toISOString().slice(0, 10);
  const todays = records.filter(r => r.dateISO === today);
  const filters = [
    { id: 'all',      label: 'ทั้งหมด',       fn: r => true },
    { id: 'new',      label: 'ใหม่',           fn: r => r.status === 'new' },
    { id: 'kitchen',  label: 'อยู่ครัว',      fn: r => r.status === 'kitchen' },
    { id: 'ready',    label: 'พร้อมเสิร์ฟ',   fn: r => r.status === 'ready' },
    { id: 'served',   label: 'เสิร์ฟแล้ว',    fn: r => r.status === 'served' },
    { id: 'paid',     label: 'จ่ายแล้ว',      fn: r => r.status === 'paid' },
    { id: 'dine',     label: 'ทานที่ร้าน',    fn: r => r.orderType === 'dine-in' && r.status !== 'paid' },
    { id: 'away',     label: 'กลับบ้าน',      fn: r => r.orderType === 'takeaway' && r.status !== 'paid' },
    { id: 'dashboard', label: 'แดชบอร์ด',     fn: null },
  ];
  const fil = filters.find(f => f.id === tab) || filters[0];
  const list = fil.fn ? todays.filter(fil.fn).sort((a, b) => a.ts - b.ts) : [];

  return (
    <main className="staff-view">
      <div className="staff-head">
        <div>
          <h1 className="staff-title">คิวออเดอร์ · {store.name}</h1>
          <p className="staff-sub">{today} · {todays.length} ออเดอร์วันนี้ · กดที่การ์ดเพื่อดูรายละเอียด</p>
        </div>
        <div className="staff-legend">
          {ASTATUS.map(s => (
            <span key={s.id} className="legend-pill" style={{ color: s.color, background: s.bg }}>
              <span className="status-dot" style={{ background: s.color }}></span>{s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="staff-tabs">
        {filters.map(f => {
          const count = f.fn ? todays.filter(f.fn).length : null;
          return (
            <button key={f.id} className={aCx('staff-tab', tab === f.id && 'is-active')}
              style={tab === f.id ? { borderColor: store.accent, color: store.accent } : undefined}
              onClick={() => setTab(f.id)}>
              {f.label}{count != null && <span className="staff-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>
      {tab === 'dashboard' ? (
        <ADashboard store={store} records={records} />
      ) : list.length === 0 ? (
        <div className="staff-empty">
          <div className="staff-empty-glyph" style={{ background: store.accentTint, color: store.accent }}>∅</div>
          <div className="staff-empty-title">ยังไม่มีออเดอร์ในหมวดนี้</div>
          <div className="staff-empty-sub">ลองสลับไปโหมดลูกค้าเพื่อสร้างออเดอร์</div>
        </div>
      ) : (
        <div className="order-grid">
          {list.map(o => (
            <AOrderCard key={o.orderId} order={o} store={store}
              onAdvance={onAdvance} onCancel={onCancel} onOpenPay={onOpenPay}
              onClick={() => onOpenOrder(o)} />
          ))}
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Order detail modal
// ---------------------------------------------------------------------------
function OrderDetail({ order, store, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal detail-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="detail-head" style={{ background: store.accent }}>
          <div className="detail-head-no">#{order.orderNo}</div>
          <div className="detail-head-meta">
            {order.orderType === 'dine-in' ? `โต๊ะ ${order.table || '-'}` : `กลับบ้าน · ${order.customer || '-'}`}
          </div>
          <div className="detail-head-status"><AStatusPill status={order.status} /></div>
        </div>
        <div className="detail-body">
          <div className="detail-meta">
            <div><span>เวลาเข้า</span><b>{new Date(order.ts).toLocaleTimeString('th-TH')}</b></div>
            <div><span>ผ่านมา</span><b>{aTimeAgo(order.ts)}</b></div>
            <div><span>จำนวน</span><b>{order.total} รายการ</b></div>
            <div><span>ยอด</span><b>{aBaht(order.net)}</b></div>
          </div>
          <ul className="detail-items">
            {order.items.map((it, i) => (
              <li key={i}>
                <div className="detail-item-top">
                  <span className="detail-item-qty">{it.qty}×</span>
                  <span className="detail-item-name">{it.th}</span>
                  <span className="detail-item-amt">{aBaht(it.total)}</span>
                </div>
                <div className="detail-item-desc">{aDescribeLine(it).replace(/^ · /, '')}</div>
                {it.mods?.length > 0 && (
                  <div className="detail-item-mods">
                    + {it.mods.map(m => findItem(store.id, it.itemId)?.modifiers?.find(mm => mm.id === m)?.label).filter(Boolean).join(', ')}
                  </div>
                )}
                {it.note && <div className="detail-item-note">หมายเหตุ: {it.note}</div>}
              </li>
            ))}
          </ul>
          {order.payment && (
            <div className="detail-pay">
              <div>วิธีจ่าย: <b>{order.payment.method === 'cash' ? 'เงินสด' : order.payment.method === 'card' ? 'บัตร' : 'พร้อมเพย์'}</b></div>
              {order.payment.method === 'cash' && (
                <>
                  <div>รับเงิน: <b>{aBaht(order.payment.received)}</b></div>
                  <div>เงินทอน: <b>{aBaht(order.payment.change)}</b></div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order confirm (customer view) — slide over after submit
// ---------------------------------------------------------------------------
function OrderConfirm({ order, store, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-hero" style={{ background: `linear-gradient(140deg, ${store.accent}, ${store.accentSoft})` }}>
          <div className="confirm-check">✓</div>
          <div className="confirm-title">ส่งออเดอร์เรียบร้อย!</div>
          <div className="confirm-sub">ขอบคุณค่ะ ครัวรับออเดอร์แล้ว</div>
        </div>
        <div className="confirm-body">
          <div className="confirm-bigno">#{order.orderNo}</div>
          <div className="confirm-meta">
            <div><span>ประเภท</span><b>{order.orderType === 'dine-in' ? `ทานที่ร้าน · โต๊ะ ${order.table || '-'}` : 'สั่งกลับบ้าน'}</b></div>
            <div><span>ยอดสุทธิ</span><b>{aBaht(order.net)}</b></div>
            <div><span>รายการ</span><b>{order.total}</b></div>
          </div>
          <div className="confirm-track">
            {ASTATUS.slice(0, 4).map((s, i) => (
              <div key={s.id} className={aCx('confirm-step', i === 0 && 'is-active')}>
                <div className="confirm-step-dot" style={i === 0 ? { background: store.accent } : undefined}></div>
                <div>{s.label}</div>
              </div>
            ))}
          </div>
          <button className="primary-btn full" style={{ background: store.accent }} onClick={onClose}>สั่งเพิ่ม</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------
function App() {
  // Read store from URL (?store=...&mode=...) if present. Always validate
  // against ASTORES so a stale or malformed value can't break first render.
  let urlStore = null, urlMode = null;
  try {
    const u = new URLSearchParams(location.search);
    urlStore = u.get('store');
    urlMode = u.get('mode');
  } catch {}
  let stored = null;
  try { stored = window.YYBack?.getActive?.(); } catch {}
  const initStore =
    (urlStore && ASTORES[urlStore]) ? urlStore :
    (stored && ASTORES[stored])     ? stored   :
    'nmtun';
  const initMode = urlMode === 'staff' ? 'staff' : 'customer';

  const [storeId, setStoreId] = aUseState(initStore);
  const [mode, setMode]       = aUseState(initMode);
  const [cart, setCart]       = aUseState([]);
  const [orderType, setOrderType] = aUseState('dine-in');
  const [table, setTable]     = aUseState('');
  const [name, setName]       = aUseState('');
  const [customizing, setCustomizing] = aUseState(null);
  const [showQR, setShowQR]   = aUseState(false);
  const [showSettings, setShowSettings] = aUseState(false);
  const [showPay, setShowPay] = aUseState(null);
  const [showDetail, setShowDetail] = aUseState(null);
  const [confirm, setConfirm] = aUseState(null);
  const [tab, setTab]         = aUseState('all');
  const [records, setRecords] = aUseState(() => window.YYBack.getRecords(initStore));
  const [tick, setTick]       = aUseState(0); // for time-ago refresh

  const store = ASTORES[storeId] || ASTORES.nmtun;

  // Keep storeId mirrored to backend.
  aUseEffect(() => {
    window.YYBack.setActive(storeId);
    setCart([]);
    setRecords(window.YYBack.getRecords(storeId));
  }, [storeId]);

  // Live re-read when other tabs / staff changes records.
  aUseEffect(() => {
    const refresh = () => setRecords(window.YYBack.getRecords(storeId));
    window.addEventListener('yy:changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('yy:changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [storeId]);

  // Time tick for relative time labels.
  aUseEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const handleAddLine = useCallback((line) => {
    const item = findItem(storeId, line.itemId);
    const tempLabel = item?.tempOptions?.find(o => o.id === line.temp)?.label;
    const sizeLabel = item?.sizeOptions?.find(o => o.id === line.size)?.label;
    setCart(c => [...c, { ...line, tempLabel, sizeLabel }]);
    setCustomizing(null);
  }, [storeId]);

  const submitOrder = useCallback(async () => {
    if (cart.length === 0) return;
    const orderNo = window.YYBack.nextOrderNo(storeId);
    const subtotal = cart.reduce((a, b) => a + b.total, 0);
    const record = {
      dateISO: new Date().toISOString().slice(0, 10),
      recorder: 'POS-Order',
      note: orderType === 'dine-in' ? `โต๊ะ ${table || '-'} / Order #${orderNo}` : `Takeaway · ${name || '-'} / Order #${orderNo}`,
      net: subtotal,
      total: cart.reduce((a, b) => a + b.qty, 0),
      items: cart,
      orderType,
      orderId: `ORD-${orderNo}`,
      orderNo,
      table: orderType === 'dine-in' ? table : '',
      customer: orderType === 'takeaway' ? name : '',
      ts: Date.now(),
      status: 'new',
      synced: false,
    };
    const saved = await window.YYBack.saveOrder(storeId, record);
    setCart([]); setTable(''); setName('');
    setConfirm(saved);
    setRecords(window.YYBack.getRecords(storeId));
  }, [cart, storeId, orderType, table, name]);

  const advanceOrder = useCallback((order) => {
    const sIdx = ASTATUS.findIndex(s => s.id === order.status);
    const next = ASTATUS[Math.min(sIdx + 1, ASTATUS.length - 1)];
    if (next.id === 'paid') { setShowPay(order); return; }
    window.YYBack.updateOrder(storeId, order.orderId, { status: next.id });
    setRecords(window.YYBack.getRecords(storeId));
  }, [storeId]);

  const cancelOrder = useCallback((order) => {
    if (window.confirm(`ยกเลิกออเดอร์ #${order.orderNo}?`)) {
      const next = window.YYBack.getRecords(storeId).filter(r => r.orderId !== order.orderId);
      window.YYBack.setRecords(storeId, next);
      setRecords(next);
    }
  }, [storeId]);

  const handlePaid = useCallback((paymentInfo) => {
    window.YYBack.updateOrder(storeId, showPay.orderId, { status: 'paid', payment: paymentInfo });
    setRecords(window.YYBack.getRecords(storeId));
    setShowPay(null);
  }, [storeId, showPay]);

  return (
    <div className="app" data-store={storeId} style={{ '--store': store.accent, '--store-soft': store.accentSoft, '--store-tint': store.accentTint, '--store-light': store.accentLight }}>
      <AHeader store={store} setStore={setStoreId} mode={mode} setMode={setMode}
        onOpenSettings={() => setShowSettings(true)} onOpenQR={() => setShowQR(true)} />
      <div className="layout">
        {mode === 'customer' ? (
          <>
            <CustomerView store={store} onPickItem={setCustomizing} />
            <CartPanel store={store} cart={cart} setCart={setCart}
              onSubmit={submitOrder}
              orderType={orderType} setOrderType={setOrderType}
              table={table} setTable={setTable}
              name={name} setName={setName} />
          </>
        ) : (
          <StaffView store={store} records={records}
            tab={tab} setTab={setTab}
            onAdvance={advanceOrder}
            onCancel={cancelOrder}
            onOpenPay={(o) => setShowPay(o)}
            onOpenOrder={(o) => setShowDetail(o)} />
        )}
      </div>

      {customizing && (
        <ACustomizer item={customizing} store={store}
          onClose={() => setCustomizing(null)}
          onAdd={handleAddLine} />
      )}
      {showQR && <AQRModal store={store} onClose={() => setShowQR(false)} />}
      {showSettings && <ASettingsModal store={store} onClose={() => setShowSettings(false)} />}
      {showPay && <APaymentModal order={showPay} store={store} onClose={() => setShowPay(null)} onPaid={handlePaid} />}
      {showDetail && <OrderDetail order={showDetail} store={store} onClose={() => setShowDetail(null)} />}
      {confirm && <OrderConfirm order={confirm} store={store} onClose={() => setConfirm(null)} />}

      <footer className="appfoot">
        <span>yy. POS · เชื่อมกับ yellowyellow_offline_Vol1 · localStorage key: <code>yy.{store.id}.records</code></span>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
