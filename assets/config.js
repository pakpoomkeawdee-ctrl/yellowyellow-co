/* ============================================================
 * yellowyellow.co — Shared configuration
 * Multi-store config (นมตุ๋น / ภัสสรสุกี้ / ภัสสรข้าวสุกี้ไข่ข้น)
 * Used by both POS (index.html) and Admin (yellowyellow.html)
 * ============================================================ */

(function (root) {
  'use strict';

  /* ---------- Backend endpoint ---------- */
  /* Set this to your deployed Google Apps Script Web App URL
     (Deploy → New deployment → Web app → Execute as: Me, Access: Anyone).
     Can be overridden per browser via localStorage 'yy.api'.            */
  const DEFAULT_API_URL = '';                 // ← วาง URL Apps Script ของคุณที่นี่
  const DEFAULT_SHEET_ID = '';                // ← ใส่ Google Sheet ID (ถ้าไม่ระบุใน Apps Script)

  /* ---------- Stores ---------- */
  const STORES = {
    nmtun: {
      id: 'nmtun',
      name: 'ร้านนมตุ๋น',
      shortName: 'นมตุ๋น',
      tagline: 'นมวัวสดแท้ ตุ๋นนาน 1 ชม.',
      route: '/nmtun',
      badge: '🐄',
      glyph: 'นม',
      cuisine: 'Milk Bar',
      hours: 'ทุกวัน 09:00 – 21:00',
      accent: '#1E40AF',
      accentSoft: '#3B82F6',
      accentTint: '#DBEAFE',
      accentLight: '#EFF6FF',
      accentHue: 245,
      target: 30000,
    },
    pussorn: {
      id: 'pussorn',
      name: 'ภัสสรสุกี้',
      shortName: 'ภัสสร',
      tagline: 'สุกี้แห้ง / น้ำ สูตรโบราณ',
      route: '/pussorn',
      badge: '🍲',
      glyph: 'ภัส',
      cuisine: 'Traditional Suki',
      hours: 'จ.–ส. 10:30 – 20:30',
      accent: '#991B1B',
      accentSoft: '#EF4444',
      accentTint: '#FEE2E2',
      accentLight: '#FEF2F2',
      accentHue: 15,
      target: 90000,
    },
    khaow: {
      id: 'khaow',
      name: 'ภัสสรข้าวสุกี้ไข่ข้น',
      shortName: 'ไข่ข้น',
      tagline: 'By ภัสสร สุกี้โบราณ',
      route: '/khaow',
      badge: '🥚',
      glyph: 'ข้าว',
      cuisine: 'Rice Bowls',
      hours: 'ทุกวัน 11:00 – 19:00',
      accent: '#C2410C',
      accentSoft: '#F97316',
      accentTint: '#FED7AA',
      accentLight: '#FFF7ED',
      accentHue: 55,
      target: 60000,
    },
  };

  const STORE_IDS = ['nmtun', 'pussorn', 'khaow'];

  /* ---------- Order status pipeline ---------- */
  const STATUS_FLOW = [
    { id: 'new',     label: 'ใหม่',         en: 'New',         color: '#F59E0B', bg: '#FEF3C7' },
    { id: 'kitchen', label: 'อยู่ครัว',      en: 'In Kitchen',  color: '#2563EB', bg: '#DBEAFE' },
    { id: 'ready',   label: 'พร้อมเสิร์ฟ',   en: 'Ready',       color: '#7C3AED', bg: '#EDE9FE' },
    { id: 'served',  label: 'เสิร์ฟแล้ว',    en: 'Served',      color: '#059669', bg: '#D1FAE5' },
    { id: 'paid',    label: 'จ่ายแล้ว',      en: 'Paid',        color: '#525252', bg: '#E5E5E5' },
    { id: 'cancel',  label: 'ยกเลิก',       en: 'Cancelled',   color: '#DC2626', bg: '#FEE2E2' },
  ];

  /* ---------- Payment methods ---------- */
  const PAYMENT_METHODS = [
    { id: 'cash',     label: 'เงินสด',      icon: '💵' },
    { id: 'qr',       label: 'QR พร้อมเพย์', icon: '📱' },
    { id: 'transfer', label: 'โอนธนาคาร',    icon: '🏦' },
    { id: 'card',     label: 'บัตรเครดิต',  icon: '💳' },
  ];

  /* ---------- Order types ---------- */
  const ORDER_TYPES = [
    { id: 'dinein',   label: 'นั่งทาน',     en: 'Dine in'  },
    { id: 'takeaway', label: 'กลับบ้าน',    en: 'Takeaway' },
    { id: 'delivery', label: 'เดลิเวอรี่',  en: 'Delivery' },
  ];

  /* ---------- Tables (per store) ---------- */
  const TABLES = {
    nmtun:  Array.from({length: 8 }, (_, i) => ({ id: `nm-${i+1}`,  no: i+1, seats: 4 })),
    pussorn:Array.from({length: 12}, (_, i) => ({ id: `ps-${i+1}`,  no: i+1, seats: 4 })),
    khaow:  Array.from({length: 6 }, (_, i) => ({ id: `kh-${i+1}`,  no: i+1, seats: 2 })),
  };

  /* ---------- Default promotions ---------- */
  const PROMOS = [
    { id: 'p10',  label: 'ลด 10%',          type: 'percent', value: 10 },
    { id: 'p20',  label: 'ลด 20%',          type: 'percent', value: 20 },
    { id: 's20',  label: 'ลด ฿20',          type: 'fixed',   value: 20 },
    { id: 's50',  label: 'ลด ฿50',          type: 'fixed',   value: 50 },
    { id: 'pgo',  label: 'พนักงานบริษัท',   type: 'percent', value: 15 },
  ];

  /* ---------- Default suppliers ---------- */
  const SUPPLIERS = [
    { id: 'sp1', name: 'ตลาดสด ABC',        type: 'วัตถุดิบ', phone: '081-234-5678' },
    { id: 'sp2', name: 'นม-โฟร์โมสต์',     type: 'นมและของเหลว', phone: '02-555-0001' },
    { id: 'sp3', name: 'CP ฟู้ดส์',         type: 'เนื้อสัตว์', phone: '02-625-8000' },
    { id: 'sp4', name: 'แม็คโคร',            type: 'ทั่วไป',     phone: '02-067-8888' },
  ];

  /* ---------- Default employees ---------- */
  const EMPLOYEES = [
    { id: 'em1', name: 'น้องเมย์',  role: 'แคชเชียร์',  store: 'nmtun',   wage: 450, active: true },
    { id: 'em2', name: 'พี่นัท',     role: 'พ่อครัว',    store: 'pussorn', wage: 600, active: true },
    { id: 'em3', name: 'พี่กิ๊ฟ',    role: 'แคชเชียร์',  store: 'khaow',   wage: 450, active: true },
    { id: 'em4', name: 'พี่อ้น',     role: 'ผู้จัดการ',   store: 'pussorn', wage: 800, active: true },
  ];

  /* ---------- Format helpers ---------- */
  const baht = (n) => `฿${Math.round(Number(n || 0)).toLocaleString('th-TH')}`;
  const numTH = (n) => Number(n || 0).toLocaleString('th-TH');
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const fmtDateTH = (iso) => {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${String(+y + 543).slice(-2)}`;
  };
  const cx = (...a) => a.filter(Boolean).join(' ');

  /* ---------- Apply theme overrides from localStorage (set by admin) ---------- */
  try {
    const overrides = JSON.parse(localStorage.getItem('yy.themeOverrides') || '{}');
    Object.keys(overrides).forEach(sid => {
      if (STORES[sid]) {
        STORES[sid].accent = overrides[sid];
        // Lighten/darken variants from the chosen color
        STORES[sid].accentSoft  = STORES[sid].accentSoft;
        STORES[sid].accentTint  = STORES[sid].accentTint;
        STORES[sid].accentLight = STORES[sid].accentLight;
      }
    });
  } catch {}

  /* ---------- Export ---------- */
  root.YY_CONFIG = {
    API_URL:     DEFAULT_API_URL,
    SHEET_ID:    DEFAULT_SHEET_ID,
    STORES, STORE_IDS,
    STATUS_FLOW, PAYMENT_METHODS, ORDER_TYPES,
    TABLES, PROMOS, SUPPLIERS, EMPLOYEES,
    fmt: { baht, numTH, todayISO, fmtDateTH, cx },
  };
})(window);
