// Menu data for all three stores.
(() => {
const STORES = {
  nmtun: {
    id: 'nmtun',
    name: 'นมตุ๋น',
    tagline: 'นมวัวสดแท้ ตุ๋นนาน 1 ชม.',
    route: '/nmtun',
    accent: '#1E40AF',
    accentSoft: '#3B82F6',
    accentTint: '#DBEAFE',
    accentLight: '#EFF6FF',
    glyph: 'นม',
    cuisine: 'Milk Bar',
    hours: 'ทุกวัน 09:00 – 21:00',
  },
  pussorn: {
    id: 'pussorn',
    name: 'ภัสสร สุกี้โบราณ',
    tagline: 'สุกี้แห้ง / น้ำ สูตรโบราณ',
    route: '/pussorn',
    accent: '#991B1B',
    accentSoft: '#EF4444',
    accentTint: '#FEE2E2',
    accentLight: '#FEF2F2',
    glyph: 'ภัส',
    cuisine: 'Traditional Suki',
    hours: 'จ.–ส. 10:30 – 20:30',
  },
  khaow: {
    id: 'khaow',
    name: 'ข้าวหน้าสุกี้ไข่ข้น',
    tagline: 'By ภัสสร สุกี้โบราณ',
    route: '/khaow',
    accent: '#C2410C',
    accentSoft: '#F97316',
    accentTint: '#FED7AA',
    accentLight: '#FFF7ED',
    glyph: 'ข้าว',
    cuisine: 'Rice Bowls',
    hours: 'ทุกวัน 11:00 – 19:00',
  },
};

// --- nmtun (Nom Tun) menu --------------------------------------------------
// Standard milk drinks: hot / iced / blended pricing.
// "-" means option not offered.
const NMTUN_STD = [
  ['นมตุ๋น',                'Original',         30, 35, 40],
  ['นมตุ๋น-คาราเมล',         'Caramel',          35, 40, 45],
  ['นมตุ๋น-น้ำผึ้ง',          'Honey',            35, 40, 45],
  ['นมตุ๋น-เผือก',           'Taro',             35, 40, 45],
  ['นมตุ๋น-โกโก้',           'Cocoa',            40, 45, 50],
  ['นมตุ๋น-โอวันติน',         'Ovaltine',         40, 45, 50],
  ['นมตุ๋น-ไมโล',           'Milo',             40, 45, 50],
  ['นมตุ๋น-ไวท์มอลต์',        'White Malt',       40, 45, 50],
  ['นมตุ๋น-ชมพู',            'Heblue · Pink',    35, 40, 45],
  ['นมตุ๋น-เขียว',           'Heblue · Green',   35, 40, 45],
  ['นมตุ๋น-ปิโป',            'Pipo',             null, null, 45],
  ['นมตุ๋น-โอริโอ้',          'Oreo',             null, null, 50],
];

const NMTUN_PREMIUM = [
  ['นมตุ๋น-สตรอเบอร์รี่',           'Strawberry',         null, 45, 55],
  ['นมตุ๋น-มะม่วง',                'Mango',              null, 45, 55],
  ['นมตุ๋น-มิกซ์เบอร์รี่',          'Mixed Berry',        null, 55, 65],
  ['โยเกิร์ต นมตุ๋น',              'Yoghurt',            null, 35, 45],
  ['สตรอเบอร์รี่โยเกิร์ต นมตุ๋น',   'Strawberry Yog.',    null, 45, 55],
  ['มะม่วงโยเกิร์ต นมตุ๋น',         'Mango Yog.',         null, 45, 55],
  ['มิกซ์เบอร์รี่โยเกิร์ต นมตุ๋น',  'Mixed Berry Yog.',   null, 55, 65],
  ['มัทฉะ นมตุ๋น',                 'Matcha',             null, 55, 65],
  ['นมตุ๋นไข่มุกบราวน์ชูก้า',       'Brown Sugar Pearl',  null, 45, 50],
];

function buildNmtun() {
  const toItem = (row, idx, cat) => {
    const [th, en, hot, iced, blend] = row;
    const opts = [
      hot != null && { id: 'hot',   label: 'ร้อน',  en: 'Hot',     price: hot },
      iced != null && { id: 'iced', label: 'เย็น',  en: 'Iced',    price: iced },
      blend != null && { id: 'blend', label: 'ปั่น', en: 'Blended', price: blend },
    ].filter(Boolean);
    return {
      id: `${cat}-${idx}`,
      th, en, cat,
      basePrice: opts[0]?.price ?? 0,
      tempOptions: opts,
      sweetness: ['หวานปกติ','หวานน้อย','หวานมาก','ไม่หวาน'],
      modifiers: [
        { id: 'honey', label: 'น้ำผึ้ง',     price: 5 },
        { id: 'pipo',  label: 'ปิโป',        price: 5 },
        { id: 'buk',   label: 'บุก',          price: 5 },
        { id: 'oreo',  label: 'โอริโอ้',     price: 10 },
        { id: 'pearl', label: 'ไข่มุกบราวน์ชูก้า', price: 10 },
      ],
    };
  };
  return [
    { cat: 'std',     label: 'เมนูนมตุ๋น', en: 'Standard',
      items: NMTUN_STD.map((r, i) => toItem(r, i, 'std')) },
    { cat: 'premium', label: 'พรีเมียม / โยเกิร์ต', en: 'Premium & Yoghurt',
      items: NMTUN_PREMIUM.map((r, i) => toItem(r, i, 'premium')) },
  ];
}

// --- pussorn (Suki) menu --------------------------------------------------
const PUSSORN_DRY = [
  ['สุกี้แห้ง / น้ำ · วุ้นเส้น',     'Glass Noodle',   50, 60, ['หมู','ไก่']],
  ['สุกี้แห้ง / น้ำ · บะหมี่หยก',   'Jade Noodle',    60, 70, ['หมู','ไก่']],
  ['สุกี้แห้ง / น้ำ · มาม่า',       'Mama Noodle',    60, 70, ['หมู','ไก่']],
  ['สุกี้แห้ง / น้ำ · เส้นเล็ก',    'Thin Rice',      60, 70, ['หมู','ไก่']],
  ['สุกี้แห้ง / น้ำ · ทะเล',        'Seafood',        80, 90, ['ทะเลรวม']],
];

const PUSSORN_SPECIAL = [
  { th: 'สุกี้หม่าล่า',    en: 'Mala Suki (Pork + Crispy Squid)', price: 70, hint: 'หมู + ปลาหมึกกรอบ' },
  { th: 'ข้าวหน้าหมูสุกี้ไข่ข้น', en: 'Pork Suki Egg Rice', price: 60, hint: 'จานเดี่ยว' },
];

function buildPussorn() {
  const sukiItems = PUSSORN_DRY.map((row, i) => {
    const [th, en, regular, premium, proteins] = row;
    return {
      id: `suki-${i}`, th, en, cat: 'suki',
      basePrice: regular,
      sizeOptions: [
        { id: 'reg', label: 'ธรรมดา', en: 'Regular', price: regular },
        { id: 'sp',  label: 'พิเศษ',   en: 'Special', price: premium },
      ],
      proteins,
      types: ['แห้ง','น้ำ'],
      sauces: ['เต้าหู้สูตรโบราณ', 'กวางตุ้ง', 'ผสม'],
      modifiers: [
        { id: 'crispysquid', label: 'เพิ่มปลาหมึกกรอบ', price: 10 },
        { id: 'friedegg',    label: 'เพิ่มไข่ดาว',        price: 10 },
        { id: 'addegg',      label: 'เพิ่มไข่',           price: 10 },
      ],
    };
  });
  const specials = PUSSORN_SPECIAL.map((s, i) => ({
    id: `special-${i}`, th: s.th, en: s.en, cat: 'special',
    basePrice: s.price, hint: s.hint,
    sizeOptions: [{ id: 'reg', label: 'ธรรมดา', price: s.price }],
    modifiers: [
      { id: 'friedegg', label: 'เพิ่มไข่ดาว', price: 10 },
      { id: 'addegg',   label: 'เพิ่มไข่',    price: 10 },
    ],
  }));
  return [
    { cat: 'suki',    label: 'เมนู',       en: 'Suki Menu',     items: sukiItems },
    { cat: 'special', label: 'เมนูพิเศษ',  en: 'Special',       items: specials },
  ];
}

// --- khaow (Egg rice bowls) menu ------------------------------------------
const KHAOW_BOWLS = [
  { th: 'ข้าวหน้ารวมสุกี้ไข่ข้น',    en: 'Combo Suki Egg Rice',     price: 80, hint: 'ไก่ + กุ้ง + ปลาหมึก' },
  { th: 'ข้าวหน้ากุ้งสุกี้ไข่ข้น',     en: 'Shrimp Suki Egg Rice',    price: 75, hint: 'พรีเมียม' },
  { th: 'ข้าวหน้าปลาหมึกสุกี้ไข่ข้น', en: 'Squid Suki Egg Rice',     price: 70, hint: '' },
  { th: 'ข้าวหน้าหมูสุกี้ไข่ข้น',     en: 'Pork Suki Egg Rice',      price: 65, hint: '' },
  { th: 'ข้าวหน้าไก่สุกี้ไข่ข้น',     en: 'Chicken Suki Egg Rice',   price: 60, hint: 'ออริจินอล' },
];

function buildKhaow() {
  return [
    {
      cat: 'bowl', label: 'ข้าวหน้าสุกี้ไข่ข้น', en: 'Egg Rice Bowls',
      items: KHAOW_BOWLS.map((b, i) => ({
        id: `bowl-${i}`, th: b.th, en: b.en, cat: 'bowl', hint: b.hint,
        basePrice: b.price,
        sizeOptions: [
          { id: 'reg',   label: 'ปกติ',    price: b.price },
          { id: 'jumbo', label: 'จัมโบ้',  price: b.price + 20, en: '+ ข้าวเพิ่ม' },
        ],
        modifiers: [
          { id: 'friedegg', label: 'ไข่ดาวเพิ่ม',    price: 10 },
          { id: 'addegg',   label: 'ไข่เพิ่ม',        price: 10 },
          { id: 'cspsquid', label: 'ปลาหมึกกรอบ',   price: 10 },
          { id: 'rice',     label: 'ข้าวเปล่าเพิ่ม', price: 10 },
        ],
        spice: ['ไม่เผ็ด','เผ็ดน้อย','เผ็ดกลาง','เผ็ดมาก'],
      })),
    },
  ];
}

const MENUS = {
  nmtun: buildNmtun(),
  pussorn: buildPussorn(),
  khaow: buildKhaow(),
};

// Status pipeline for the kitchen queue.
const STATUS_FLOW = [
  { id: 'new',     label: 'ใหม่',         en: 'New',         color: '#F59E0B', bg: '#FEF3C7' },
  { id: 'kitchen', label: 'อยู่ครัว',     en: 'In Kitchen',  color: '#2563EB', bg: '#DBEAFE' },
  { id: 'ready',   label: 'พร้อมเสิร์ฟ',  en: 'Ready',       color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'served',  label: 'เสิร์ฟแล้ว',   en: 'Served',      color: '#059669', bg: '#D1FAE5' },
  { id: 'paid',    label: 'จ่ายแล้ว',     en: 'Paid',        color: '#525252', bg: '#E5E5E5' },
];

window.YY = { STORES, MENUS, STATUS_FLOW };
})();
