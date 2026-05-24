// Shared UI primitives + customer-facing menu view.
// Globals consumed: React, window.YY (data), window.YYBack (storage).
(() => {
const { useState, useEffect, useMemo, useRef, useCallback } = React;
const { STORES, MENUS, STATUS_FLOW } = window.YY;

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------
const baht = (n) => `฿${Math.round(n).toLocaleString()}`;
const cx = (...a) => a.filter(Boolean).join(' ');

// Stable monogram color per item — tiny hash → hue offset from brand accent.
const hashHue = (s) => {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
};

// Format time-ago for kitchen queue.
const timeAgo = (ts) => {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} นาที`;
  const h = Math.round(m / 60);
  return `${h} ชม.`;
};

// ---------------------------------------------------------------------------
// Item thumbnail — original placeholder design (no copyrighted food photos).
// Soft tinted block with monogram + steam/swirl SVG keyed to category.
// ---------------------------------------------------------------------------
function Thumb({ item, store, size = 96 }) {
  const hue = (hashHue(item.id + item.th) + (store.id === 'nmtun' ? 210 : store.id === 'pussorn' ? 0 : 25)) % 360;
  const bg = `oklch(0.93 0.06 ${hue})`;
  const ink = `oklch(0.32 0.10 ${hue})`;
  const mono = (item.th.replace(/^นมตุ๋น[-\s]*/, '').replace(/^ข้าวหน้า/, '').replace(/^สุกี้/, '').slice(0, 2)) || item.th.slice(0, 2);
  // Category glyph drawn as simple geometric SVG, no AI-illustrated content.
  const glyph = ({
    nmtun: (
      <svg viewBox="0 0 64 64" width={size * 0.42} height={size * 0.42} aria-hidden="true">
        <path d="M20 8 H44 V14 L40 18 V52 Q40 58 32 58 Q24 58 24 52 V18 L20 14 Z" fill="none" stroke={ink} strokeWidth="2.2" strokeLinejoin="round"/>
        <path d="M26 36 Q32 30 38 36 Q32 44 26 36 Z" fill={ink} opacity="0.18"/>
      </svg>
    ),
    pussorn: (
      <svg viewBox="0 0 64 64" width={size * 0.46} height={size * 0.46} aria-hidden="true">
        <path d="M8 30 Q32 22 56 30 Q52 50 32 52 Q12 50 8 30 Z" fill="none" stroke={ink} strokeWidth="2.2"/>
        <path d="M14 32 Q22 28 32 30 M22 36 Q30 32 40 34 M30 40 Q38 38 46 38" stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    khaow: (
      <svg viewBox="0 0 64 64" width={size * 0.46} height={size * 0.46} aria-hidden="true">
        <ellipse cx="32" cy="42" rx="22" ry="10" fill="none" stroke={ink} strokeWidth="2.2"/>
        <path d="M18 38 Q24 28 32 30 Q40 28 46 38" fill={ink} opacity="0.22"/>
        <circle cx="32" cy="34" r="6" fill={ink} opacity="0.35"/>
      </svg>
    ),
  })[store.id];

  return (
    <div className="thumb" style={{ width: size, height: size, background: bg }}>
      <div className="thumb-glyph">{glyph}</div>
      <div className="thumb-mono" style={{ color: ink }}>{mono}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header — store switcher + mode toggle, sticky top.
// ---------------------------------------------------------------------------
function Header({ store, setStore, mode, setMode, onOpenSettings, onOpenQR }) {
  return (
    <header className="hdr">
      <div className="hdr-left">
        <div className="brand">
          <div className="brand-mark" style={{ background: store.accent }}>
            <span>yy</span>
          </div>
          <div className="brand-meta">
            <div className="brand-name">{store.name}</div>
            <div className="brand-tag">{store.tagline} · {store.hours}</div>
          </div>
        </div>
      </div>
      <nav className="store-tabs" role="tablist" aria-label="เลือกร้าน">
        {Object.values(STORES).map(s => (
          <button key={s.id}
            role="tab" aria-selected={s.id === store.id}
            className={cx('store-tab', s.id === store.id && 'is-active')}
            style={s.id === store.id ? { '--c': s.accent, '--ct': s.accentTint } : undefined}
            onClick={() => setStore(s.id)}>
            <span className="dot" style={{ background: s.accent }}></span>
            <span className="store-tab-name">{s.name}</span>
            <span className="store-tab-route">{s.route}</span>
          </button>
        ))}
      </nav>
      <div className="hdr-right">
        <button className="ghost-btn" onClick={onOpenQR} title="QR ลูกค้า">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M20 14v3M14 17v4h7"/></svg>
          QR
        </button>
        <button className="ghost-btn" onClick={onOpenSettings} title="ตั้งค่า">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        <div className="mode-switch" role="tablist" aria-label="โหมด">
          <button role="tab" aria-selected={mode === 'customer'}
            className={cx('mode-btn', mode === 'customer' && 'is-active')}
            onClick={() => setMode('customer')}>ลูกค้า</button>
          <button role="tab" aria-selected={mode === 'staff'}
            className={cx('mode-btn', mode === 'staff' && 'is-active')}
            onClick={() => setMode('staff')}>พนักงาน</button>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Menu card
// ---------------------------------------------------------------------------
function MenuCard({ item, store, onPick }) {
  const minPrice = item.basePrice;
  const tempLabel = item.tempOptions
    ? item.tempOptions.map(o => o.label).join(' · ')
    : item.sizeOptions
    ? item.sizeOptions.map(o => o.label).join(' / ')
    : '';
  return (
    <button className="menu-card" onClick={() => onPick(item)}>
      <Thumb item={item} store={store} size={88} />
      <div className="menu-card-body">
        <div className="menu-card-th">{item.th}</div>
        <div className="menu-card-en">{item.en}{item.hint ? ` · ${item.hint}` : ''}</div>
        <div className="menu-card-foot">
          <div className="menu-card-price">
            <span className="menu-card-price-from">เริ่ม</span>
            <span className="menu-card-price-num">{baht(minPrice)}</span>
          </div>
          {tempLabel && <div className="menu-card-options">{tempLabel}</div>}
        </div>
      </div>
      <div className="menu-card-add" style={{ background: store.accent }}>+</div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Item customizer modal
// ---------------------------------------------------------------------------
function Customizer({ item, store, onClose, onAdd, editing }) {
  // Pre-fill from `editing` cart line if user is editing an item.
  const initTemp  = editing?.temp     ?? item.tempOptions?.[0]?.id ?? null;
  const initSize  = editing?.size     ?? item.sizeOptions?.[0]?.id ?? null;
  const initProt  = editing?.protein  ?? item.proteins?.[0]        ?? null;
  const initType  = editing?.type     ?? item.types?.[0]            ?? null;
  const initSauce = editing?.sauce    ?? item.sauces?.[0]           ?? null;
  const initSweet = editing?.sweet    ?? item.sweetness?.[0]        ?? null;
  const initSpice = editing?.spice    ?? item.spice?.[0]            ?? null;
  const initMods  = editing?.mods     ?? [];
  const initQty   = editing?.qty      ?? 1;
  const initNote  = editing?.note     ?? '';

  const [temp, setTemp]     = useState(initTemp);
  const [size, setSize]     = useState(initSize);
  const [protein, setProt]  = useState(initProt);
  const [type, setType]     = useState(initType);
  const [sauce, setSauce]   = useState(initSauce);
  const [sweet, setSweet]   = useState(initSweet);
  const [spice, setSpice]   = useState(initSpice);
  const [mods, setMods]     = useState(new Set(initMods));
  const [qty, setQty]       = useState(initQty);
  const [note, setNote]     = useState(initNote);

  const tempOpt = item.tempOptions?.find(o => o.id === temp);
  const sizeOpt = item.sizeOptions?.find(o => o.id === size);
  const unit = (tempOpt?.price ?? sizeOpt?.price ?? item.basePrice) +
    (item.modifiers || []).filter(m => mods.has(m.id)).reduce((a, b) => a + b.price, 0);
  const total = unit * qty;

  const toggleMod = (id) => {
    const s = new Set(mods);
    s.has(id) ? s.delete(id) : s.add(id);
    setMods(s);
  };

  const submit = () => {
    onAdd({
      itemId: item.id, th: item.th, en: item.en,
      temp, size, protein, type, sauce, sweet, spice,
      mods: [...mods], qty, note,
      unit, total,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal customizer" onClick={e => e.stopPropagation()}>
        <div className="customizer-hero" style={{ background: `linear-gradient(160deg, ${store.accentTint}, ${store.accentLight})` }}>
          <Thumb item={item} store={store} size={108} />
          <div>
            <div className="customizer-th">{item.th}</div>
            <div className="customizer-en">{item.en}{item.hint ? ` · ${item.hint}` : ''}</div>
            <div className="customizer-base">เริ่มต้น {baht(item.basePrice)}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">×</button>
        </div>
        <div className="customizer-body">
          {item.tempOptions && (
            <OptGroup label="อุณหภูมิ" sub="Temperature">
              {item.tempOptions.map(o => (
                <Chip key={o.id} active={temp === o.id} accent={store.accent}
                      onClick={() => setTemp(o.id)}>
                  {o.label}<small>{baht(o.price)}</small>
                </Chip>
              ))}
            </OptGroup>
          )}
          {item.sizeOptions && item.sizeOptions.length > 1 && (
            <OptGroup label="ขนาด" sub="Size">
              {item.sizeOptions.map(o => (
                <Chip key={o.id} active={size === o.id} accent={store.accent}
                      onClick={() => setSize(o.id)}>
                  {o.label}<small>{baht(o.price)}</small>
                </Chip>
              ))}
            </OptGroup>
          )}
          {item.types && (
            <OptGroup label="ชนิดสุกี้" sub="Style">
              {item.types.map(o => (
                <Chip key={o} active={type === o} accent={store.accent} onClick={() => setType(o)}>{o}</Chip>
              ))}
            </OptGroup>
          )}
          {item.proteins && (
            <OptGroup label="เนื้อสัตว์" sub="Protein">
              {item.proteins.map(o => (
                <Chip key={o} active={protein === o} accent={store.accent} onClick={() => setProt(o)}>{o}</Chip>
              ))}
            </OptGroup>
          )}
          {item.sauces && (
            <OptGroup label="น้ำจิ้ม" sub="Sauce (กลับบ้านเลือกได้)">
              {item.sauces.map(o => (
                <Chip key={o} active={sauce === o} accent={store.accent} onClick={() => setSauce(o)}>{o}</Chip>
              ))}
            </OptGroup>
          )}
          {item.sweetness && (
            <OptGroup label="ระดับความหวาน" sub="Sweetness">
              {item.sweetness.map(o => (
                <Chip key={o} active={sweet === o} accent={store.accent} onClick={() => setSweet(o)}>{o}</Chip>
              ))}
            </OptGroup>
          )}
          {item.spice && (
            <OptGroup label="ระดับความเผ็ด" sub="Spice">
              {item.spice.map(o => (
                <Chip key={o} active={spice === o} accent={store.accent} onClick={() => setSpice(o)}>{o}</Chip>
              ))}
            </OptGroup>
          )}
          {item.modifiers && item.modifiers.length > 0 && (
            <OptGroup label="ท็อปปิ้งเพิ่ม" sub="Add-ons">
              {item.modifiers.map(m => (
                <Chip key={m.id} active={mods.has(m.id)} accent={store.accent} onClick={() => toggleMod(m.id)}>
                  {m.label}<small>+{baht(m.price)}</small>
                </Chip>
              ))}
            </OptGroup>
          )}
          <OptGroup label="หมายเหตุ" sub="Special notes">
            <input className="note-input" type="text" placeholder="เช่น ไม่ใส่ผัก / น้ำซุปแยก" value={note} onChange={e => setNote(e.target.value)} />
          </OptGroup>
        </div>
        <div className="customizer-foot">
          <div className="qty-stepper">
            <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="ลด">−</button>
            <span>{qty}</span>
            <button onClick={() => setQty(qty + 1)} aria-label="เพิ่ม">+</button>
          </div>
          <button className="primary-btn" style={{ background: store.accent }} onClick={submit}>
            <span>{editing ? 'อัปเดต' : 'เพิ่มเข้าตะกร้า'}</span>
            <span className="primary-btn-price">{baht(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function OptGroup({ label, sub, children }) {
  return (
    <div className="opt-group">
      <div className="opt-group-head">
        <span className="opt-group-th">{label}</span>
        {sub && <span className="opt-group-en">{sub}</span>}
      </div>
      <div className="chip-row">{children}</div>
    </div>
  );
}

function Chip({ active, accent, onClick, children }) {
  return (
    <button className={cx('chip', active && 'is-active')}
      style={active ? { borderColor: accent, color: accent, background: `${accent}14` } : undefined}
      onClick={onClick}>
      {children}
    </button>
  );
}

window.YYUI = { Header, MenuCard, Customizer, Thumb, OptGroup, Chip, baht, cx, timeAgo };
})();
