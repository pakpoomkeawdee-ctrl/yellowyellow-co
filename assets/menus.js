/* ============================================================
 * yellowyellow.co — Menu catalogues for all three stores
 * Adapted from product line-up captured in the original menus.
 * ============================================================ */

(function (root) {
  'use strict';

  /* ---------- นมตุ๋น ---------- */
  const NMTUN_STD = [
    ['นมตุ๋น',              'Original',         30, 35, 40],
    ['นมตุ๋นคาราเมล',       'Caramel',          35, 40, 45],
    ['นมตุ๋นน้ำผึ้ง',        'Honey',            35, 40, 45],
    ['นมตุ๋นเผือก',          'Taro',             35, 40, 45],
    ['นมตุ๋นโกโก้',          'Cocoa',            40, 45, 50],
    ['นมตุ๋นโอวันติน',       'Ovaltine',         40, 45, 50],
    ['นมตุ๋นไมโล',          'Milo',             40, 45, 50],
    ['นมตุ๋นไวท์มอลต์',      'White Malt',       40, 45, 50],
    ['นมตุ๋นเฮลบลู ชมพู',   'Heblue Pink',      35, 40, 45],
    ['นมตุ๋นเฮลบลู เขียว',  'Heblue Green',     35, 40, 45],
    ['นมตุ๋นปิโป้',          'Pipo',             null, null, 45],
    ['นมตุ๋นโอริโอ้',        'Oreo',             null, null, 50],
  ];
  const NMTUN_PREMIUM = [
    ['นมตุ๋นสตรอเบอร์รี่',           'Strawberry',         null, 45, 55],
    ['นมตุ๋นมะม่วง',                'Mango',              null, 45, 55],
    ['นมตุ๋นมิกซ์เบอร์รี่',          'Mixed Berry',        null, 55, 65],
    ['โยเกิร์ตนมตุ๋น',               'Yoghurt',            null, 35, 45],
    ['สตรอเบอร์รี่โยเกิร์ตนมตุ๋น',   'Strawberry Yog.',    null, 45, 55],
    ['มะม่วงโยเกิร์ตนมตุ๋น',         'Mango Yog.',         null, 45, 55],
    ['มิกซ์เบอร์รี่โยเกิร์ตนมตุ๋น',  'Mixed Berry Yog.',   null, 55, 65],
    ['มัทฉะนมตุ๋น',                  'Matcha',             null, 55, 65],
    ['นมตุ๋นไข่มุกบราวน์ชูก้า',      'Brown Sugar Pearl',  null, 45, 50],
  ];

  function buildNmtun() {
    const toItem = (row, idx, cat) => {
      const [th, en, hot, iced, blend] = row;
      const opts = [
        hot   != null && { id: 'hot',   label: 'ร้อน',  en: 'Hot',     price: hot   },
        iced  != null && { id: 'iced',  label: 'เย็น',  en: 'Iced',    price: iced  },
        blend != null && { id: 'blend', label: 'ปั่น',  en: 'Blended', price: blend },
      ].filter(Boolean);
      return {
        id: `${cat}-${idx}`,
        th, en, cat,
        store: 'nmtun',
        basePrice: opts[0]?.price ?? 0,
        cost: Math.round((opts[0]?.price ?? 0) * 0.35),
        tempOptions: opts,
        sweetness: ['หวานปกติ', 'หวานน้อย', 'หวานมาก', 'ไม่หวาน'],
        modifiers: [
          { id: 'honey', label: 'น้ำผึ้ง',              price: 5  },
          { id: 'pipo',  label: 'ปิโป้',               price: 5  },
          { id: 'buk',   label: 'บุก',                 price: 5  },
          { id: 'oreo',  label: 'โอริโอ้',             price: 10 },
          { id: 'pearl', label: 'ไข่มุกบราวน์ชูก้า',   price: 10 },
        ],
      };
    };
    return [
      { cat: 'std',     label: 'เมนูนมตุ๋น',           en: 'Standard',         items: NMTUN_STD.map((r, i) => toItem(r, i, 'std')) },
      { cat: 'premium', label: 'พรีเมียม & โยเกิร์ต', en: 'Premium & Yoghurt', items: NMTUN_PREMIUM.map((r, i) => toItem(r, i, 'premium')) },
    ];
  }

  /* ---------- ภัสสรสุกี้ ---------- */
  const PUSSORN_DRY = [
    ['สุกี้ วุ้นเส้น',    'Glass Noodle',  50, 60, ['หมู', 'ไก่']],
    ['สุกี้ บะหมี่หยก',   'Jade Noodle',   60, 70, ['หมู', 'ไก่']],
    ['สุกี้ มาม่า',       'Mama Noodle',   60, 70, ['หมู', 'ไก่']],
    ['สุกี้ เส้นเล็ก',    'Thin Rice',     60, 70, ['หมู', 'ไก่']],
    ['สุกี้ ทะเล',        'Seafood',       80, 90, ['ทะเลรวม']],
  ];
  const PUSSORN_SPECIAL = [
    { th: 'สุกี้หม่าล่า',             en: 'Mala Suki',          price: 70, hint: 'หมู + ปลาหมึกกรอบ' },
    { th: 'ข้าวหน้าหมูสุกี้ไข่ข้น',    en: 'Pork Suki Egg Rice', price: 60, hint: 'จานเดี่ยว' },
  ];

  function buildPussorn() {
    const sukiItems = PUSSORN_DRY.map((row, i) => {
      const [th, en, regular, premium, proteins] = row;
      return {
        id: `suki-${i}`, th, en, cat: 'suki', store: 'pussorn',
        basePrice: regular,
        cost: Math.round(regular * 0.4),
        sizeOptions: [
          { id: 'reg', label: 'ธรรมดา', en: 'Regular', price: regular },
          { id: 'sp',  label: 'พิเศษ',   en: 'Special', price: premium },
        ],
        proteins,
        types: ['แห้ง', 'น้ำ'],
        sauces: ['เต้าหู้ยี้สูตรโบราณ', 'น้ำจิ้มกวางตุ้ง', 'ผสม'],
        modifiers: [
          { id: 'crispysquid', label: 'เพิ่มปลาหมึกกรอบ', price: 10 },
          { id: 'friedegg',    label: 'เพิ่มไข่ดาว',       price: 10 },
          { id: 'addegg',      label: 'เพิ่มไข่',           price: 10 },
        ],
      };
    });
    const specials = PUSSORN_SPECIAL.map((s, i) => ({
      id: `special-${i}`, th: s.th, en: s.en, cat: 'special', store: 'pussorn',
      basePrice: s.price, cost: Math.round(s.price * 0.4), hint: s.hint,
      sizeOptions: [{ id: 'reg', label: 'ธรรมดา', price: s.price }],
      modifiers: [
        { id: 'friedegg', label: 'เพิ่มไข่ดาว', price: 10 },
        { id: 'addegg',   label: 'เพิ่มไข่',    price: 10 },
      ],
    }));
    return [
      { cat: 'suki',    label: 'เมนูสุกี้',  en: 'Suki Menu', items: sukiItems },
      { cat: 'special', label: 'เมนูพิเศษ',  en: 'Special',   items: specials },
    ];
  }

  /* ---------- ข้าวสุกี้ไข่ข้น ---------- */
  const KHAOW_BOWLS = [
    { th: 'ข้าวหน้ารวมสุกี้ไข่ข้น',    en: 'Combo Suki Egg Rice',   price: 80, hint: 'ไก่ + กุ้ง + ปลาหมึก' },
    { th: 'ข้าวหน้ากุ้งสุกี้ไข่ข้น',    en: 'Shrimp Suki Egg Rice',  price: 75, hint: 'พรีเมียม' },
    { th: 'ข้าวหน้าปลาหมึกสุกี้ไข่ข้น', en: 'Squid Suki Egg Rice',  price: 70, hint: '' },
    { th: 'ข้าวหน้าหมูสุกี้ไข่ข้น',     en: 'Pork Suki Egg Rice',   price: 65, hint: '' },
    { th: 'ข้าวหน้าไก่สุกี้ไข่ข้น',     en: 'Chicken Suki Egg Rice',price: 60, hint: 'ออริจินอล' },
  ];

  function buildKhaow() {
    return [{
      cat: 'bowl', label: 'ข้าวหน้าสุกี้ไข่ข้น', en: 'Egg Rice Bowls',
      items: KHAOW_BOWLS.map((b, i) => ({
        id: `bowl-${i}`, th: b.th, en: b.en, cat: 'bowl', store: 'khaow', hint: b.hint,
        basePrice: b.price, cost: Math.round(b.price * 0.4),
        sizeOptions: [
          { id: 'reg',   label: 'ปกติ',   price: b.price       },
          { id: 'jumbo', label: 'จัมโบ้', price: b.price + 20, en: '+ ข้าวเพิ่ม' },
        ],
        modifiers: [
          { id: 'friedegg', label: 'ไข่ดาวเพิ่ม',    price: 10 },
          { id: 'addegg',   label: 'ไข่เพิ่ม',        price: 10 },
          { id: 'cspsquid', label: 'ปลาหมึกกรอบ',   price: 10 },
          { id: 'rice',     label: 'ข้าวเปล่าเพิ่ม', price: 10 },
        ],
        spice: ['ไม่เผ็ด', 'เผ็ดน้อย', 'เผ็ดกลาง', 'เผ็ดมาก'],
      })),
    }];
  }

  /* ---------- Default inventory catalogues ---------- */
  const INVENTORY = {
    nmtun: [
      { cat: '🥛 นม / วัตถุดิบหลัก',  items: ['นมตุ๋น', 'นมผสม', 'นมข้นหวาน', 'นมข้นจืด', 'นมสด', 'โยเกิร์ต', 'น้ำผึ้ง'] },
      { cat: '🧴 ซอส / แยม / ไซรัป',  items: ['คาราเมล', 'ซอสมะม่วง', 'แยมสตรอ', 'ไซรัปมะม่วง', 'โอวัลติน', 'ไวท์มอลต์', 'โกโก้', 'ผงมัทฉะ', 'ผงปั่น'] },
      { cat: '🧁 ท็อปปิ้ง',           items: ['โอริโอ้', 'ปิโป้', 'เผือก', 'นูเทลล่า', 'มะม่วง (ผลไม้)'] },
      { cat: '🥤 ภาชนะ',             items: ['แก้วเย็น', 'แก้วร้อน', 'ฝาโดม', 'หลอดเย็น', 'หลอดไข่มุก', 'ถุงทิ้วแก้ว', 'ถุงเย็น 10×15'] },
      { cat: '🧹 อุปกรณ์',            items: ['ทิชชู่', 'น้ำยาล้างจาน', 'ผงซักฟอก', 'น้ำถัง'] },
    ],
    pussorn: [
      { cat: '🥩 เนื้อสัตว์ / ทะเล', items: ['หมูสด', 'หมูสุก', 'กุ้งสด', 'กุ้งสุก', 'หมึกวง', 'ปลาหมึกกรอบ', 'ไข่'] },
      { cat: '🥬 ผัก / เส้น',         items: ['ผักกาดขาว', 'ผักชี', 'วุ้นเส้น', 'บะหมี่หยก', 'เส้นเล็ก', 'มาม่า'] },
      { cat: '🫕 ซอส / เครื่องปรุง',  items: ['น้ำจิ้มกวางตุ้ง', 'น้ำจิ้มเต้าหู้ยี้', 'ซุปฟ้าไทย', 'หม่าล่า', 'ผงหม่าล่า', 'น้ำมัน'] },
      { cat: '📦 บรรจุภัณฑ์',         items: ['ถุงหิ้ว 7x15', 'กล่องน้ำกลับบ้าน', 'กล่องคราฟ', 'ช้อน', 'ส้อม', 'ตะเกียบ'] },
      { cat: '🔧 อื่นๆ',             items: ['น้ำถัง', 'แก๊สหุงต้ม', 'ใบเสร็จ', 'ถุงดำ'] },
    ],
    khaow: [
      { cat: '🥚 ไข่ / วัตถุดิบหลัก',  items: ['ไข่ไก่', 'ข้าวสาร', 'น้ำมัน'] },
      { cat: '🥩 เนื้อสัตว์ / ทะเล',  items: ['หมูสด', 'หมูสุก', 'หมึก', 'กุ้งสด', 'กุ้งสุก', 'ไก่'] },
      { cat: '🫕 ซอส / เครื่องปรุง',  items: ['น้ำจิ้มสุกี้', 'พริกน้ำปลา'] },
      { cat: '📦 บรรจุภัณฑ์',         items: ['กล่องเปล่า', 'ถุงหิ้วลูกค้า', 'ช้อนส้อม', 'ทิชชู่แห้ง', 'ทิชชู่เปียก'] },
      { cat: '💧 น้ำ / เชื้อเพลิง',   items: ['น้ำถัง', 'แก๊สหุงต้ม'] },
    ],
  };

  /* ---------- Combine ---------- */
  const MENUS = {
    nmtun:   buildNmtun(),
    pussorn: buildPussorn(),
    khaow:   buildKhaow(),
  };

  root.YY_MENUS = MENUS;
  root.YY_INVENTORY = INVENTORY;
})(window);
