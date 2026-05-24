# yellowyellow.co — Restaurant Management Platform

ระบบจัดการร้านอาหารครบวงจร · POS + หลังบ้าน + วิเคราะห์ + รายงาน
ภาษาไทย · รองรับหลายร้าน · ใช้ Google Sheets เป็นฐานข้อมูล

> ร้านที่รองรับ: **ร้านนมตุ๋น** · **ภัสสรสุกี้** · **ภัสสรข้าวสุกี้ไข่ข้น**

---

## โครงสร้างโปรเจกต์

```
yellowyellow_co/
├── index.html              ← POS หน้าร้าน (ลูกค้า + พนักงาน)
├── yellowyellow.html       ← หลังบ้าน (แดชบอร์ดผู้บริหาร)
├── assets/
│   ├── styles.css          ← ดีไซน์โทเค่นกลาง
│   ├── config.js           ← ตั้งค่าร้าน, สี, ตาราง, โปรโมชั่น
│   ├── menus.js            ← เมนูทั้ง 3 ร้าน + วัตถุดิบเริ่มต้น
│   ├── api.js              ← API layer + offline queue + auto-sync
│   ├── pos-app.js          ← Logic ของหน้า POS
│   └── admin-app.js        ← Logic ของหน้าหลังบ้าน
├── backend/
│   └── Code.gs             ← Google Apps Script (Web App backend)
└── README.md
```

ไม่ต้อง build · ไม่ต้องลง npm · เปิด `index.html` ได้เลย

---

## คุณสมบัติหลัก

### POS Frontend (`index.html`)
- ✅ Touch-friendly interface สำหรับ tablet/มือถือ
- ✅ สั่งเร็ว: เลือกหมวด → กดเมนู → ปรับแต่ง → เพิ่มตะกร้า
- ✅ เลือกขนาด / อุณหภูมิ / เนื้อสัตว์ / น้ำจิ้ม / ระดับหวาน-เผ็ด / ท็อปปิ้ง
- ✅ ส่วนลด & โปรโมชั่น (เปอร์เซ็นต์ / ฟิกซ์)
- ✅ ระบบโต๊ะ / รวมโต๊ะ / ย้ายโต๊ะ
- ✅ ระบบคิว (Kitchen → Ready → Served → Paid)
- ✅ ค้นหาเมนู
- ✅ ชำระเงิน: เงินสด · QR พร้อมเพย์ · โอน · บัตร
- ✅ คำนวณเงินทอนอัตโนมัติ + พรีเซ็ตจำนวนเงิน
- ✅ QR สั่งเมนู (ลูกค้าสแกนเปิดเมนูเอง)
- ✅ พิมพ์ใบเสร็จ 80mm
- ✅ Daily sales widget แสดงยอดสด
- ✅ สลับร้านได้ทันที (สี + เมนู + โต๊ะปรับตาม)
- ✅ Responsive: tablet landscape / มือถือ / desktop

### Back-Office (`yellowyellow.html`)
- ✅ Executive Dashboard (KPI, แนวโน้ม, เป้าหมาย)
- ✅ Sales Analytics + กราฟ
- ✅ จัดการสต็อก (ปกติ / ใกล้หมด / หมด)
- ✅ จัดการพนักงาน + ค่าแรง
- ✅ จัดการซัพพลายเออร์
- ✅ จัดการสินค้า + ดูต้นทุน-margin
- ✅ บันทึกค่าใช้จ่าย + จำแนกหมวด
- ✅ รายงาน P&L รายเดือน
- ✅ KPI: รายได้, ออเดอร์, บิลเฉลี่ย, กำไรขั้นต้น, margin
- ✅ เมนูขายดี + กราฟเปรียบเทียบ
- ✅ Multi-store comparison
- ✅ Dark mode
- ✅ Export CSV
- ✅ Mobile-responsive

### Google Sheets Backend (`backend/Code.gs`)
- ✅ Web App REST endpoint
- ✅ ตารางครบ: Orders, OrderLines, Products, Inventory, Sales, Expenses, Employees, Suppliers, KPI, Daily, Monthly
- ✅ CRUD ผ่าน POST `{ action, payload }`
- ✅ Auto-aggregation (sales, monthly summary)
- ✅ Inventory log (ทุกการเปลี่ยนสถานะ)

### Offline-First
- ✅ ทำงานได้แม้เน็ตล่ม (เก็บใน localStorage)
- ✅ Queue ออเดอร์ที่ยังไม่ซิงค์ → auto-sync เมื่อเน็ตกลับมา (ทุก 15 วินาที)
- ✅ Real-time pull จาก Google Sheets (ทุก 30 วินาที)
- ✅ Cross-tab sync (storage event)

---

## ตั้งค่าครั้งแรก (10 นาที)

### 1) สร้าง Google Sheet
1. ไป https://sheets.new สร้างชีทเปล่าใหม่
2. ตั้งชื่อเช่น `yellowyellow-data`
3. คัดลอก **Sheet ID** จาก URL:
   `https://docs.google.com/spreadsheets/d/`**`<นี่คือ ID>`**`/edit`

### 2) Deploy Apps Script Backend
1. ในชีทที่สร้าง: **Extensions → Apps Script**
2. ลบโค้ดเริ่มต้น (`function myFunction() {}`)
3. คัดลอกเนื้อหาทั้งหมดของไฟล์ [`backend/Code.gs`](backend/Code.gs) ไปวาง
4. ใส่ Sheet ID ที่ตัวแปร `SHEET_ID` ด้านบนสุด:
   ```js
   const SHEET_ID = '1AbCdEfGh...';  // ← วาง ID ที่นี่
   ```
   *(หรือกำหนดเป็น Script Property "SHEET_ID" ผ่านเมนู Project Settings → Script Properties)*
5. กด **Save** (💾) แล้ว **Run** → เลือก function `setupSheets` → ใช้สิทธิ์ครั้งแรก → Allow
   - จะสร้างชีททั้ง 12 tabs โดยอัตโนมัติ (Orders, OrderLines, Products, …)
6. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - กด Deploy → คัดลอก URL ที่ลงท้ายด้วย `/exec`

### 3) เชื่อมหน้าบ้านกับ Backend
**วิธีที่ 1 — ในแอป** (แนะนำ):
1. เปิด `index.html` หรือ `yellowyellow.html`
2. กด **ตั้งค่า** ที่มุมขวาบน
3. วาง Apps Script URL ที่คัดลอกมา → กด **บันทึก**
4. กด **🔌 ทดสอบเชื่อมต่อ** จะเห็น "✓ เชื่อมต่อสำเร็จ"

**วิธีที่ 2 — แก้ไฟล์** (สำหรับ deploy หลายเครื่อง):
แก้ไข `assets/config.js`:
```js
const DEFAULT_API_URL = 'https://script.google.com/.../exec';
```

### 4) เปิดใช้งาน
- POS หน้าร้าน: เปิด `index.html` (หรือ host ด้วย static server)
- หลังบ้าน: เปิด `yellowyellow.html`

---

## การ Deploy โปรดักชัน

### ตัวเลือก A — Static Hosting (แนะนำ)
รองรับ **GitHub Pages, Netlify, Vercel, Cloudflare Pages** ฟรีหมด:

```bash
# Cloudflare Pages
npx wrangler pages deploy . --project-name=yellowyellow-co

# Netlify
npx netlify deploy --prod --dir=.

# Vercel
npx vercel --prod
```

### ตัวเลือก B — รัน Local Server
```bash
# Python
python -m http.server 8080

# Node
npx serve .

# PHP
php -S localhost:8080
```

แล้วเปิด http://localhost:8080/index.html

### ตัวเลือก C — เปิดไฟล์ตรงๆ
เปิด `index.html` จาก File Explorer ได้เลย (เบราว์เซอร์โมเดิร์น)
หมายเหตุ: บางเบราว์เซอร์อาจบล็อก `fetch` แบบ `file://` ให้ใช้ A หรือ B แทน

---

## URL Routing (QR Sharing)

- เปิด POS ของร้านนมตุ๋น: `index.html?store=nmtun`
- เปิด POS ของภัสสรสุกี้: `index.html?store=pussorn`
- เปิด POS ของไข่ข้น: `index.html?store=khaow`

ใช้ปุ่ม "QR สั่ง" ในหน้า POS เพื่อแสดง QR code ให้ลูกค้าสแกน

---

## API Reference

ทุก action ใช้ HTTP POST ไปที่ Apps Script `/exec` พร้อม body:
```json
{ "action": "saveOrder", "payload": { ... } }
```

| Action            | Payload                                    | คำอธิบาย                    |
| ----------------- | ------------------------------------------ | --------------------------- |
| `ping`            | `{}`                                       | ทดสอบการเชื่อมต่อ           |
| `saveOrder`       | `{ store, record }`                        | บันทึก/อัปเดตออเดอร์         |
| `updateOrder`     | `{ store, orderId, patch }`                | แก้สถานะออเดอร์              |
| `listOrders`      | `{ store, since }`                         | ดึงออเดอร์ตั้งแต่ timestamp |
| `saveExpense`     | `{ store, expense }`                       | บันทึกค่าใช้จ่าย             |
| `saveInventory`   | `{ store, updates: {name: 'low'\|'out'} }` | อัปเดตสต็อก                  |
| `saveDaily`       | `{ store, summary }`                       | สรุปยอดรายวัน                |
| `saveEmployee`    | `{ employee }`                             | บันทึกพนักงาน                |
| `saveSupplier`    | `{ supplier }`                             | บันทึกซัพพลายเออร์           |
| `saveProduct`     | `{ product }`                              | บันทึกเมนู                   |
| `summary`         | `{ store, since }`                         | สรุป KPI                     |
| `salesByDay`      | `{ store, days }`                          | ยอดขายราย day               |
| `topItems`        | `{ store }`                                | เมนูขายดี Top-20             |
| `inventoryAlerts` | `{ store }`                                | รายการสต็อกแจ้งเตือน         |

---

## เพิ่มร้านใหม่

แก้ไข `assets/config.js`:
```js
const STORES = {
  // ... ร้านเดิม ...
  myNewStore: {
    id: 'myNewStore',
    name: 'ชื่อร้าน',
    shortName: 'สั้น',
    accent: '#7C3AED',
    accentSoft: '#A78BFA',
    accentTint: '#EDE9FE',
    accentLight: '#F5F3FF',
    accentHue: 280,
    badge: '🍕',
    target: 50000,
    tagline: '...',
    hours: '...',
  },
};
const STORE_IDS = ['nmtun', 'pussorn', 'khaow', 'myNewStore'];
```

แล้วเพิ่มเมนูใน `assets/menus.js` และวัตถุดิบใน `INVENTORY`

---

## Tech Stack

- **Frontend**: HTML5, TailwindCSS (CDN), Vanilla JavaScript ES6+
- **Backend**: Google Apps Script (Web App)
- **Database**: Google Sheets (multi-tab schema)
- **Charts**: Chart.js 4.4 (CDN)
- **QR**: qrcode.js (CDN)
- **Fonts**: Sarabun, Kanit, Plus Jakarta Sans, JetBrains Mono (Google Fonts)

ไม่มี build step, ไม่มี npm, ไม่มี backend server (ใช้ Apps Script แทน)

---

## License

Proprietary — yellowyellow.co
ใช้ภายในเครือ ร้านนมตุ๋น / ภัสสรสุกี้ / ภัสสรข้าวสุกี้ไข่ข้น
