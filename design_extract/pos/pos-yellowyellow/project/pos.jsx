// Staff/POS views: kitchen queue, payment, day summary, QR, settings.
// Imports React + window.YYUI/window.YY/window.YYBack from global scope.
(() => {
const { useState, useEffect, useRef } = React;
const { Header: PHeader, MenuCard: PMenuCard, Customizer: PCustomizer,
        Thumb: PThumb, OptGroup: POptGroup, Chip: PChip,
        baht: pBaht, cx: pCx, timeAgo: pTimeAgo } = window.YYUI;
const { STORES: PSTORES, MENUS: PMENUS, STATUS_FLOW: PSTATUS } = window.YY;

// ---------------------------------------------------------------------------
// Status pill
// ---------------------------------------------------------------------------
function StatusPill({ status }) {
  const s = PSTATUS.find(x => x.id === status) || PSTATUS[0];
  return (
    <span className="status-pill" style={{ color: s.color, background: s.bg }}>
      <span className="status-dot" style={{ background: s.color }}></span>
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Order card (kitchen queue)
// ---------------------------------------------------------------------------
function OrderCard({ order, store, onAdvance, onOpenPay, onCancel, onClick }) {
  const sIdx = PSTATUS.findIndex(s => s.id === order.status);
  const next = PSTATUS[Math.min(sIdx + 1, PSTATUS.length - 1)];
  const isPaid = order.status === 'paid';
  return (
    <div className="order-card" style={{ '--store': store.accent }} onClick={onClick}>
      <div className="order-card-head">
        <div className="order-card-id">
          <span className="order-card-no">#{order.orderNo}</span>
          <span className="order-card-where">
            {order.orderType === 'dine-in' ? `โต๊ะ ${order.table || '-'}` : 'กลับบ้าน'}
          </span>
        </div>
        <StatusPill status={order.status} />
      </div>
      <ul className="order-card-items">
        {order.items.slice(0, 4).map((it, i) => (
          <li key={i}>
            <span className="order-card-qty">{it.qty}×</span>
            <span className="order-card-it">{it.th}</span>
            {it.note && <span className="order-card-note">“{it.note}”</span>}
          </li>
        ))}
        {order.items.length > 4 && <li className="order-card-more">+{order.items.length - 4} รายการ</li>}
      </ul>
      <div className="order-card-foot">
        <div className="order-card-meta">
          <span className="order-card-time">⏱ {pTimeAgo(order.ts)}</span>
          <span className="order-card-net">{pBaht(order.net)}</span>
        </div>
        <div className="order-card-actions" onClick={e => e.stopPropagation()}>
          {!isPaid && (
            <button className="step-btn" style={{ background: store.accent }} onClick={() => onAdvance(order)}>
              {next.label} →
            </button>
          )}
          {order.status === 'served' && (
            <button className="pay-btn" onClick={() => onOpenPay(order)}>เก็บเงิน</button>
          )}
          {order.status === 'new' && (
            <button className="cancel-btn" onClick={() => onCancel(order)}>ยกเลิก</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment modal
// ---------------------------------------------------------------------------
function PaymentModal({ order, store, onClose, onPaid }) {
  const [method, setMethod] = useState('cash');
  const [received, setReceived] = useState('');
  const subtotal = order.items.reduce((a, b) => a + b.total, 0);
  const tax = 0; // tax-inclusive
  const grand = subtotal + tax;
  const recNum = parseFloat(received) || 0;
  const change = recNum - grand;
  const enough = recNum >= grand || method !== 'cash';

  const presets = [grand, Math.ceil(grand / 50) * 50, Math.ceil(grand / 100) * 100, Math.ceil(grand / 100) * 100 + 100];
  const unique = [...new Set(presets)].slice(0, 4);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pay-modal" onClick={e => e.stopPropagation()}>
        <div className="pay-head" style={{ background: store.accent }}>
          <div>
            <div className="pay-head-title">เก็บเงิน · #{order.orderNo}</div>
            <div className="pay-head-sub">{order.orderType === 'dine-in' ? `โต๊ะ ${order.table || '-'}` : 'สั่งกลับบ้าน'}</div>
          </div>
          <button className="modal-close light" onClick={onClose}>×</button>
        </div>
        <div className="pay-body">
          <div className="pay-summary">
            {order.items.map((it, i) => (
              <div key={i} className="pay-line">
                <span className="pay-line-qty">{it.qty}×</span>
                <span className="pay-line-name">{it.th}{describeLine(it)}</span>
                <span className="pay-line-amt">{pBaht(it.total)}</span>
              </div>
            ))}
            <div className="pay-divider"></div>
            <div className="pay-line"><span></span><span>รวม</span><span>{pBaht(subtotal)}</span></div>
            <div className="pay-line"><span></span><span>ภาษี (รวมแล้ว)</span><span>{pBaht(tax)}</span></div>
            <div className="pay-line pay-total"><span></span><span>ยอดสุทธิ</span><span>{pBaht(grand)}</span></div>
          </div>
          <div className="pay-side">
            <div className="opt-group-head"><span className="opt-group-th">วิธีจ่าย</span><span className="opt-group-en">Method</span></div>
            <div className="pay-methods">
              {[['cash','💵','เงินสด'],['card','💳','บัตร'],['qr','📱','พร้อมเพย์']].map(([id, ic, lb]) => (
                <button key={id} className={pCx('pay-method', method === id && 'is-active')}
                  style={method === id ? { borderColor: store.accent, color: store.accent } : undefined}
                  onClick={() => setMethod(id)}>
                  <span className="pay-method-ic">{ic}</span>
                  <span>{lb}</span>
                </button>
              ))}
            </div>
            {method === 'cash' && (
              <>
                <div className="opt-group-head"><span className="opt-group-th">รับเงิน</span></div>
                <input className="pay-input" type="number" inputMode="numeric"
                  value={received} placeholder={String(grand)}
                  onChange={e => setReceived(e.target.value)} />
                <div className="pay-presets">
                  {unique.map(p => (
                    <button key={p} className="pay-preset" onClick={() => setReceived(String(p))}>{pBaht(p)}</button>
                  ))}
                </div>
                <div className={pCx('pay-change', change < 0 && 'is-short')}>
                  <span>เงินทอน</span>
                  <span>{change < 0 ? `ขาด ${pBaht(-change)}` : pBaht(change)}</span>
                </div>
              </>
            )}
            {method === 'qr' && (
              <div className="pay-qr-block">
                <div className="pay-qr-render">
                  <QR text={`promptpay://${store.id}/${order.orderId}/${grand.toFixed(2)}`} size={150} />
                </div>
                <div className="pay-qr-note">ให้ลูกค้าสแกนเพื่อจ่าย<br/><b>{pBaht(grand)}</b></div>
              </div>
            )}
            <button className="primary-btn full" disabled={!enough}
              style={{ background: enough ? store.accent : '#a8a29e' }}
              onClick={() => onPaid({ method, received: recNum, change: Math.max(0, change) })}>
              ยืนยันการชำระเงิน · {pBaht(grand)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function describeLine(it) {
  const parts = [];
  if (it.temp) parts.push(it.tempLabel || it.temp);
  if (it.size && it.sizeLabel && it.size !== 'reg') parts.push(it.sizeLabel);
  if (it.protein) parts.push(it.protein);
  if (it.type) parts.push(it.type);
  if (it.sweet && it.sweet !== 'หวานปกติ') parts.push(it.sweet);
  if (it.spice && it.spice !== 'ไม่เผ็ด') parts.push(it.spice);
  return parts.length ? ` · ${parts.join(' / ')}` : '';
}

// ---------------------------------------------------------------------------
// QR (real qrcode.js render in a portal div)
// ---------------------------------------------------------------------------
function QR({ text, size = 200 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !window.QRCode) return;
    ref.current.innerHTML = '';
    new window.QRCode(ref.current, {
      text, width: size, height: size,
      correctLevel: window.QRCode.CorrectLevel.M,
    });
  }, [text, size]);
  return <div ref={ref} className="qr-canvas" style={{ width: size, height: size }}></div>;
}

// ---------------------------------------------------------------------------
// QR Display Modal (store URL for customers to scan)
// ---------------------------------------------------------------------------
function QRModal({ store, onClose }) {
  const url = `${location.origin}${location.pathname}?store=${store.id}&mode=customer`;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal qr-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="qr-modal-head" style={{ background: store.accent }}>
          <div className="qr-modal-eyebrow">SCAN ME</div>
          <div className="qr-modal-title">{store.name}</div>
          <div className="qr-modal-sub">{store.tagline}</div>
        </div>
        <div className="qr-modal-body">
          <QR text={url} size={260} />
          <div className="qr-modal-url">{url}</div>
          <div className="qr-modal-cta">สแกนเพื่อสั่งอาหารจากโทรศัพท์</div>
          <div className="qr-modal-actions">
            <button className="ghost-btn" onClick={() => navigator.clipboard?.writeText(url)}>คัดลอกลิงก์</button>
            <button className="primary-btn" style={{ background: store.accent }} onClick={() => window.print()}>พิมพ์ QR</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Modal — webhook URL + clear data
// ---------------------------------------------------------------------------
function SettingsModal({ store, onClose }) {
  const [hook, setHook] = useState(window.YYBack.getHook(store.id));
  const [saved, setSaved] = useState(false);
  const save = () => {
    window.YYBack.setHook(store.id, hook.trim());
    setSaved(true); setTimeout(() => setSaved(false), 1400);
  };
  const clear = () => {
    if (confirm('ลบประวัติออเดอร์ของร้านนี้ทั้งหมด?')) window.YYBack.clearStore(store.id);
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="settings-title">ตั้งค่า · {store.name}</h2>
        <p className="settings-sub">เชื่อมต่อกับระบบ yellowyellow ผ่าน webhook</p>
        <div className="opt-group">
          <div className="opt-group-head">
            <span className="opt-group-th">Webhook URL (Make.com)</span>
            <span className="opt-group-en">yy.{store.id}.hook</span>
          </div>
          <input className="note-input" type="url" placeholder="https://hook.eu1.make.com/..."
            value={hook} onChange={e => setHook(e.target.value)} />
          <div className="settings-actions">
            <button className="primary-btn" style={{ background: store.accent }} onClick={save}>
              {saved ? '✓ บันทึกแล้ว' : 'บันทึก'}
            </button>
            <button className="ghost-btn danger" onClick={clear}>ล้างประวัติออเดอร์</button>
          </div>
        </div>
        <div className="settings-keys">
          <div className="settings-keys-label">localStorage keys ที่ใช้:</div>
          <code>yy.{store.id}.records</code>
          <code>yy.{store.id}.hook</code>
          <code>yy.activeStore</code>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staff Dashboard — KPI cards
// ---------------------------------------------------------------------------
function Dashboard({ store, records }) {
  const today = new Date().toISOString().slice(0, 10);
  const todays = records.filter(r => r.dateISO === today);
  const revenue = todays.filter(r => r.status === 'paid').reduce((a, b) => a + b.net, 0);
  const pending = todays.filter(r => ['new', 'kitchen'].includes(r.status)).length;
  const ready = todays.filter(r => r.status === 'ready').length;
  const counts = {};
  todays.forEach(r => r.items.forEach(it => {
    const k = it.th;
    counts[k] = (counts[k] || 0) + it.qty;
  }));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <div className="dashboard">
      <div className="kpi-row">
        <Kpi label="ออเดอร์วันนี้" value={todays.length} accent={store.accent} />
        <Kpi label="รายได้ที่เก็บแล้ว" value={pBaht(revenue)} accent={store.accent} />
        <Kpi label="กำลังทำ" value={pending} hint="new + kitchen" />
        <Kpi label="พร้อมเสิร์ฟ" value={ready} />
      </div>
      <div className="dash-row">
        <div className="dash-card">
          <div className="dash-card-title">เมนูขายดีวันนี้</div>
          {top.length === 0 && <div className="dash-empty">ยังไม่มีออเดอร์</div>}
          {top.map(([name, qty]) => (
            <div key={name} className="top-row">
              <span className="top-bar" style={{ width: `${Math.min(100, qty * 10)}%`, background: store.accentTint }}></span>
              <span className="top-name">{name}</span>
              <span className="top-qty">×{qty}</span>
            </div>
          ))}
        </div>
        <div className="dash-card">
          <div className="dash-card-title">สรุปสิ้นวัน</div>
          <div className="dash-eod-list">
            <div className="eod-line"><span>วันที่</span><span>{today}</span></div>
            <div className="eod-line"><span>จำนวนออเดอร์</span><span>{todays.length}</span></div>
            <div className="eod-line"><span>รายได้รวม</span><span>{pBaht(revenue)}</span></div>
            <div className="eod-line"><span>เฉลี่ย/บิล</span><span>{pBaht(todays.length ? revenue / Math.max(1, todays.filter(r => r.status === 'paid').length) : 0)}</span></div>
          </div>
          <button className="primary-btn full" style={{ background: store.accent }}
            onClick={() => {
              const data = JSON.stringify(todays, null, 2);
              navigator.clipboard?.writeText(data);
              alert('คัดลอกข้อมูลออเดอร์วันนี้ไปยังคลิปบอร์ดแล้ว');
            }}>คัดลอกข้อมูลส่งเข้า yy. console</button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, hint }) {
  return (
    <div className="kpi" style={accent ? { borderTopColor: accent } : undefined}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}

window.YYPOS = { OrderCard, StatusPill, PaymentModal, QRModal, SettingsModal, Dashboard, QR, describeLine };
})();
