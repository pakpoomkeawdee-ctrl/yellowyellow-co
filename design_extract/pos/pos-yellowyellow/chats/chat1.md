# เสียหายเว็บไซต์

_Started 2026-05-15 19:36 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Pos yellowyellow"
Current date is now May 16, 2026
</system-info>

<default aesthetic>
If no references, art direction or design systems were provided, use this default professional modern, minimal aesthetic as a base. Declare your choice out loud so you stick to it. Guidance:
- Choose a type pairing from web-safe set or Google Fonts. Helvetica is a good choice. Avoid hard-to-read or overly stylized fonts. Use 1-3 fonts only.
- Foreground and background: choose a color tone (warm, cool, neutral, something in-between). Use subtly-toned whites and blacks; avoid saturations above 0.02 for whites.
- Accents: choose 0-2 additional accent colors using oklch. All accents should share same chroma and lightness; vary hue.
- NEVER write out an SVG yourself that's more complicated than a square, circle, diamond, etc.
- For imagery, never hand-draw SVGs; use subtly-striped SVG placeholders instead with monospace explainers for what should be dropped there (e.g. “product shot”)

CRITICAL: ignore default aesthetic entirely if given other aesthetic instructions like reference images, design systems or guidance, or if there are files in the project already.
</default aesthetic>

<attached_files>
- uploads/pp.jpg
- uploads/yellowyellow _offline_Vol1.html
- uploads/แบล็คลิส เมนู ร้านนม.jpg
- uploads/ใบสั่ง ภัสสรสุกี้.jpg
- uploads/เมนู ภัสสรสุกี้.jpg
- uploads/เมนูไข่ข้น.jpg
</attached_files>

<pasted_text name="Pasted text (340 lines)">
# Claude Design Prompt — Multi-Restaurant POS Web App (yellowyellow ecosystem)

---

## PROJECT OVERVIEW

Build a **world-class multi-restaurant ordering & POS web application** for 3 Thai food businesses that integrates with the existing **yellowyellow_offline_Vol1** backend system (localStorage-based, webhook-to-Make.com pipeline). The app must be beautiful, fast, and operable by both staff and customers (via QR code).

---

## DESIGN REFERENCE & STYLE

Reference style: **pp.jpg** — clean, modern restaurant POS UI with:
- Card-based layout with soft shadows
- Teal/mint primary accent color scheme
- Clean white background with subtle gradients
- Order summary panel on the right side
- Category tab navigation for menu items
- Circular food item images
- Clear price display with +/- quantity controls
- Status badges for order states (In Kitchen, Wait List, Ready)
- Multi-tab order line at top

**Adapt this style to each restaurant's brand color:**
- 🥛 นมตุ๋น (Nom Tun) → **Blue** theme (`#1E40AF`, `#3B82F6`, `#BFDBFE`)
- 🍲 ภัสสรสุกี้ (Pussorn Suki) → **Red** theme (`#991B1B`, `#EF4444`, `#FEE2E2`)
- 🍳 ข้าวสุกี้ไข่ข้น (Khaow Suki Egg) → **Orange** theme (`#C2410C`, `#F97316`, `#FED7AA`)

---

## ARCHITECTURE REQUIREMENTS

### Three Separate Store Pages
Each store has its own route/section. Entry via:
- `/nmtun` → Nom Tun Milk Shop
- `/pussorn` → Pussorn Traditional Suki
- `/khaow` → Khaow Suki Egg Rice Bowl

**QR Code Generation:** Each store page must display a QR code that customers/staff can scan to open the ordering interface directly on mobile. Generate QR codes using `qrcode.js` or similar library (CDN: `https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js`).

### User Roles (toggle-based, no login required)
- **Customer mode**: Simplified menu → Add to cart → Submit order → Thank you screen
- **Staff/POS mode**: Full order management, kitchen queue, payment processing, end-of-day entry

---

## STORE 1: นมตุ๋น (Nom Tun Milk Shop) — BLUE THEME

### Menu Data (from blacklist menu image):
```
Category: เมนูนมตุ๋น (Standard)
- นมตุ๋น:           ร้อน ฿30 | เย็น ฿35 | ปั่น ฿40
- นมตุ๋น-คาราเมล:   ร้อน ฿35 | เย็น ฿40 | ปั่น ฿45
- นมตุ๋น-น้ำผึ้ง:    ร้อน ฿35 | เย็น ฿40 | ปั่น ฿45
- นมตุ๋น-เผือก:     ร้อน ฿35 | เย็น ฿40 | ปั่น ฿45
- นมตุ๋น-โกโก้:     ร้อน ฿40 | เย็น ฿45 | ปั่น ฿50
- นมตุ๋น-โอวันติน:  ร้อน ฿40 | เย็น ฿45 | ปั่น ฿50
- นมตุ๋น-ไมโล:     ร้อน ฿40 | เย็น ฿45 | ปั่น ฿50
- นมตุ๋น-ไวท์มอลต์: ร้อน ฿40 | เย็น ฿45 | ปั่น ฿50
- นมตุ๋น-ชมพู(เฮบจูบอย): ร้อน ฿35 | เย็น ฿40 | ปั่น ฿45
- นมตุ๋น-เขียว(เฮบจูบอย): ร้อน ฿35 | เย็น ฿40 | ปั่น ฿45
- นมตุ๋น-ปิโป:     ปั่น ฿45
- นมตุ๋น-โอริโอ้:   ปั่น ฿50

Category: เมนูนมตุ๋น (Premium/Fruit)
- นมตุ๋น-สตอเบอร์รี่:      เย็น ฿45 | ปั่น ฿55
- นมตุ๋น-มะม่วง:           เย็น ฿45 | ปั่น ฿55
- นมตุ๋น-มิกซ์เบอร์รี่:    เย็น ฿55 | ปั่น ฿65
- โยเกิร์ต นมตุ๋น:         เย็น ฿35 | ปั่น ฿45
- สตอเบอร์รี่โยเกิร์ต นมตุ๋น: เย็น ฿45 | ปั่น ฿55
- มะม่วงโยเกิร์ต นมตุ๋น:   เย็น ฿45 | ปั่น ฿55
- มิกซ์เบอร์รี่โยเกิร์ต นมตุ๋น: เย็น ฿55 | ปั่น ฿65
- มัทฉะนมตุ๋น:             เย็น ฿55 | ปั่น ฿65
- นมตุ๋นไข่มุกบราวชูก้า:   เย็น ฿45 | ปั่น ฿50

Add-ons (+฿5): น้ำผึ้ง / ปิโป / บุก
Add-ons (+฿10): โอริโอ้ / ไข่มุกบราวชูก้า
```

### Order Options per Item:
- Temperature: ร้อน (Hot) | เย็น (Iced) | ปั่น (Blended) — with dynamic pricing
- Sweetness level: หวานปกติ | หวานน้อย | หวานมาก | ไม่หวาน
- Add-ons: checkboxes for extras

---

## STORE 2: ภัสสรสุกี้ (Pussorn Traditional Suki) — RED THEME

### Menu Data (from ใบสั่ง and เมนูภัสสรสุกี้ images):

**Order Form (ใบสั่ง) Structure:**
```
1. ชนิดสุกี้: ☐ ก้ำ | ☐ แห้ง
2. น้ำจิ้ม (เฉพาะสั่งกลับบ้าน):
   ☐ เต้าหู้ สูตรโบราณ | ☐ กวางตุ้ง | ☐ ผสม
3. เนื้อสัตว์: ☐ หมู | ☐ ไก่ | ☐ ทะเล (+฿80)
   *** ☐ เพิ่มปลาหมึกกรอบ (+฿10)
4. เส้น: ☐ วุ้นเส้น
   ☐ บะหมี่หยก(+฿10) | ☐ เส้นมัน(+฿10)
   ☐ มาม่า(+฿10) | ☐ เส้นเล็ก(+฿10)
5. ไข่: ปกติ ไข่ 1 ฟอง (ไม่เพิ่ม ไม่ลดก็กดครีบ)
   ☐ เพิ่มไข่ดาว(+฿10) | ☐ เพิ่มไข่(+฿10)
เมนูพิเศษ: ☐ ธรรมดา(฿50) | ☐ มิเศษ(฿60)
```

**Full Menu (from เมนูภัสสรสุกี้):**
```
เมนู:
- สุกี้แห้ง-ก้ำ วุ้นเส้น หมู/ไก่:      ธรรมดา ฿50 | มิเศษ ฿60
- สุกี้แห้ง-ก้ำ บะหมี่หยก หมู/ไก่:    ธรรมดา ฿60 | มิเศษ ฿70
- สุกี้แห้ง-ก้ำ มาม่า หมู/ไก่:        ธรรมดา ฿60 | มิเศษ ฿70
- สุกี้แห้ง-ก้ำ เส้นเล็ก หมู/ไก่:     ธรรมดา ฿60 | มิเศษ ฿70
- สุกี้แห้ง-ก้ำ ทะเล:                 ธรรมดา ฿80 | มิเศษ ฿90

เมนูมิเศษ:
- สุกี้ หม่าล่า (หมู + ปลาหมึกกรอบ): ฿70
- ข้าวหย่าหมูสุกี้ไข่ขัน: ฿60

เพิ่ม:
- ไข่ดาว: ฿10
- เพิ่มไข่: ฿10
- เพิ่มหมึกกรอบ: ฿10

Delivery: สั่งกลับบ้าน | ทานที่นี้
Contact: 095-226-4646
```

---

## STORE 3: ข้าวสุกี้ไข่ข้น By ภัสสร (Khaow Suki Egg Bowl) — ORANGE THEME

### Menu Data (from เมนูไข่ข้น image):
```
Rice Bowl Menu (ข้าวหน้าสุกี้ไข่ข้น):
- ข้าวหน้ารวมสุกี้ไข่ข้น     (ไก่ + กุ้ง + ปลาหมึก)
- ข้าวหน้ากุ้งสุกี้ไข่ข้น
- ข้าวหน้าสุกี้ไข่ข้น         (standard)
- ข้าวหน้าหมูสุกี้ไข่ข้น
- ข้าวหน้าปลาหมึกสุกี้ไข่ข้น

Base price reference: ฿60 (ข้าวหย่าหมูสุกี้ไข่ขัน from Pussorn menu)
Premium items (รวม, กุ้ง): suggest ฿70-฿80
```

---

## BACKEND INTEGRATION (yellowyellow_offline_Vol1)

The frontend must integrate with the existing backend via **localStorage** keys and optionally fire **webhook POSTs**. Use these exact store IDs:

```javascript
// Store ID mapping
const STORE_MAP = {
  nmtun:   'nmtun',    // นมตุ๋น
  pussorn: 'pussorn',  // ภัสสรสุกี้
  khaow:   'khaow'     // ข้าวสุกี้ไข่ข้น
};

// localStorage key pattern (must match yy. backend):
// `yy.${storeId}.records`  — append order records here
// `yy.${storeId}.hook`     — webhook URL stored here
// `yy.activeStore`         — currently active store
```

**When an order is submitted, append to `yy.${storeId}.records`** using this record format:
```json
{
  "dateISO": "2025-05-16",
  "recorder": "POS-Order",
  "note": "Table 3 / Order #0042",
  "net": 185,
  "total": 4,
  "items": [...],
  "orderType": "dine-in | takeaway",
  "orderId": "ORD-0042",
  "ts": 1716000000000,
  "synced": false
}
```

**Also POST to webhook** (`yy.${storeId}.hook`) with the same payload if the URL is set.

---

## REQUIRED POS FEATURES

Inspired by Toast POS, Square for Restaurants, and Lightspeed — implement these features:

### Ordering Interface
- [ ] **Menu grid** with category tabs — thumbnail emoji/icons per item
- [ ] **Item customization modal** — modifiers, add-ons, quantity, special notes
- [ ] **Live cart/order panel** on right side (desktop) or bottom drawer (mobile)
- [ ] **Order types**: Dine In | Takeaway (สั่งกลับบ้าน)
- [ ] **Table number / name input** for dine-in orders
- [ ] **Order number** auto-generated (sequential per day, e.g. #0042)
- [ ] **QR code** per store URL — displayed in-app and printable

### Order Queue (Kitchen Display)
- [ ] **Order line** showing all active orders with status:
  - 🟡 New | 🔵 In Kitchen | 🟢 Ready | ✅ Served | 🏠 Takeaway
- [ ] **One-tap status update** on each order card
- [ ] **Time elapsed** badge per order
- [ ] **Filter tabs**: All | Dine In | Takeaway | Wait List | Ready | Served

### Payment & Checkout
- [ ] **Bill summary** with itemized list, subtotal, tax-inclusive note
- [ ] **Bill splitting** — split equally or by item
- [ ] **Payment methods**: 💵 Cash | 💳 Card | 📱 QR/PromptPay (Thai)
- [ ] **Cash change calculator** — input received amount, display change
- [ ] **Order receipt** — printable/shareable summary

### End-of-Day (Staff)
- [ ] **Daily summary** — total orders, revenue, top items
- [ ] **Submit to backend** — writes to `yy.${storeId}.records` and fires webhook
- [ ] **Inventory quick-check** — mark items as Low/Out (same chip-cycle pattern as backend)

### Settings & QR
- [ ] **Store selector** with branded colors
- [ ] **Webhook URL** configuration per store (reads/writes `yy.${storeId}.hook`)
- [ ] **QR Code display** — shows scannable QR for this store's ordering URL
- [ ] **Print QR** button

---

## UI/UX REQUIREMENTS

### Layout
- **Desktop**: Left sidebar (store nav + menu categories) + Center (menu grid) + Right panel (active order)
- **Tablet**: Stacked with slide-out order panel
- **Mobile**: Bottom tab nav + Full-screen menu → cart drawer slides up

### Typography
- Use **Sarabun** (Google Fonts) for Thai text — excellent Thai character support
- Pair with **Prompt** or **Kanit** for headers
- Numbers: use **Tabular figures** for price alignment

### Animations
- Smooth cart item additions (scale + fade)
- Order status badge transitions
- QR code modal with blur backdrop
- Skeleton loading states for menu grid

### Color System
```css
/* Nom Tun — Blue */
--nmtun-primary: #1E40AF;
--nmtun-light:   #BFDBFE;
--nmtun-accent:  #3B82F6;

/* Pussorn — Red */  
--pussorn-primary: #991B1B;
--pussorn-light:   #FEE2E2;
--pussorn-accent:  #EF4444;

/* Khaow — Orange */
--khaow-primary: #C2410C;
--khaow-light:   #FED7AA;
--khaow-accent:  #F97316;

/* Shared neutrals */
--bg: #FAFAF9;
--surface: #FFFFFF;
--text: #1C1917;
--muted: #78716C;
--border: #E7E5E4;
```

---

## TECHNICAL STACK

- **React** (functional components + hooks)
- **Tailwind CSS** (utility-first, no custom build — use CDN classes only)
- **lucide-react** for icons
- **recharts** for charts (daily summary)
- `qrcode.js` from cdnjs for QR code generation
- **No backend** — all state in React (session) + localStorage (persistence)
- **Single-file output** (all CSS + JS inline, React via JSX)

---

## ADDITIONAL NOTES

1. **Thai language first** — all UI text in Thai (labels, buttons, status, error messages)
2. **Offline-capable** — all core functions work without internet (localStorage)
3. **Touch-optimized** — minimum 44px tap targets, large menu cards on mobile
4. **Print-ready** — receipt and QR code print views (CSS `@media print`)
5. **Accessibility** — proper ARIA labels on interactive elements, focus management in modals
6. **Performance** — lazy-load menu sections, debounce search input

---

## SAMPLE COMPONENT STRUCTURE

```
App
├── StoreSelector (top nav — color-coded per store)
├── ModeToggle (Customer / Staff toggle)
│
├── [Customer Mode]
│   ├── MenuPage
│   │   ├── CategoryTabs
│   │   ├── MenuGrid → MenuItemCard
│   │   └── ItemCustomizerModal (temperature, modifiers, qty, notes)
│   ├── CartDrawer / CartPanel
│   │   ├── OrderItemList
│   │   ├── OrderTypePicker (Dine In / Takeaway)
│   │   ├── TableInput
│   │   └── SubmitOrderButton
│   └── OrderConfirmScreen (order number + status tracker)
│
└── [Staff Mode]
    ├── Dashboard (KPIs: orders today, revenue, pending)
    ├── OrderQueueView
    │   ├── OrderFilterTabs
    │   └── OrderCard (status badges, time, items, actions)
    ├── PaymentView
    │   ├── OrderSummary
    │   ├── BillSplitter
    │   ├── PaymentMethodSelector
    │   └── ReceiptView
    ├── EndOfDayEntry (integrates with yy. backend format)
    ├── QRCodeDisplay (per-store scannable QR)
    └── Settings (webhook URLs, store accent colors)
```

---

## OUTPUT EXPECTATIONS

Generate a **complete, functional React JSX artifact** (single file) that:
1. Renders all 3 store pages with brand-appropriate color themes
2. Shows full menu from data above with ordering flow
3. Implements the kitchen order queue
4. Includes QR code generation per store
5. Writes completed orders to `localStorage` in `yy.{storeId}.records` format compatible with the yellowyellow backend
6. Is visually polished at the level of Toast POS / Square — not a prototype, a production-quality interface
7. Works beautifully on both desktop (1280px+) and mobile (375px)

Make it extraordinary. This is a real Thai restaurant business tool.
</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Hi-fi design">
Create a high-fidelity, polished design. Follow the instructions about design in your system prompt, particularly the 'How to do design work' section. Use the design_canvas starter component, or make a full-bleed prototype and offer options via Tweaks.
</attached-skill>

<attached-skill name="Interactive prototype">
Create a fully interactive prototype with realistic state management and transitions. Use React useState/useEffect for dynamic behavior. Include hover states, click interactions, form validation, animated transitions, and multi-step navigation flows. It should feel like a real working app, not a static mockup.
</attached-skill>


<system-reminder>Auto-injected reminder (ignore if not relevant): do not recreate copyrighted or branded UI unless the user's email domain matches that company. Create original designs instead.</system-reminder>

## Assistant

_[tool: update_todos]_

_[tool: grep]_

_[tool: copy_files]_

I'll build this as a single working prototype. Original design (not cloning the reference — POS patterns like sidebar + grid + cart are common functional layouts), tailored to the 3 Thai brands with proper backend wiring.

Let me first copy the menu reference images into the project so the staff can see real food references inline, then write the app.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now the stylesheet and the index.html shell.

_[tool: write_file]_

_[tool: write_file]_

_[tool: set_project_title]_

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: str_replace_edit]_

Babel scripts share the global scope, causing duplicate `const` declarations. Wrapping each file in an IIFE.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: str_replace_edit]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: update_todos]_

_[tool: delete_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Built **yy. POS Console** — a Thai-first multi-restaurant ordering system wired into the yellowyellow backend.

**Three brand-themed stores** with their own routes, color systems, and menus pulled from your reference images:
- 🥛 **นมตุ๋น** (Blue) — full Standard + Premium milk menu with hot/iced/blended pricing, sweetness, add-on toppings
- 🍲 **ภัสสร สุกี้โบราณ** (Red) — suki menu with style/protein/sauce/noodle selectors matching the order slip
- 🍳 **ข้าวหน้าสุกี้ไข่ข้น** (Orange) — egg rice bowls with size + spice level

**Two modes** (toggle top-right): **ลูกค้า** is the menu browse → customizer → cart flow; **พนักงาน** is the kitchen queue with filter tabs, status pipeline (ใหม่ → อยู่ครัว → พร้อมเสิร์ฟ → เสิร์ฟแล้ว → จ่ายแล้ว), one-tap status advance, payment modal (cash with change calc / card / PromptPay QR), order detail, and a dashboard with top items + day summary.

**Backend integration**: every submitted order writes to `yy.{storeId}.records` in the exact record shape from your spec (dateISO, recorder, note, net, total, items, orderType, orderId, ts, synced) and fires the webhook URL stored at `yy.{storeId}.hook` (settable in Settings ⚙). Order numbers auto-increment per day. Active store is mirrored to `yy.activeStore`.

**Customer QR**: QR button in the header generates a scannable code with `?store=...&mode=customer` so phones land directly in the ordering interface. Printable.

A note on the reference: I read pp.jpg as a directional cue (card grid + right cart panel + status pills are common functional POS patterns) but designed the visuals originally — typography is Kanit + Sarabun + Plus Jakarta Sans, the placeholder thumbnails are abstract tinted blocks (no copyrighted food photos), and the brand-color treatment, animations, and modal/dashboard layouts are bespoke.

**Try it**: switch stores in the header → switch to ลูกค้า → tap a menu card → customize → ส่งออเดอร์ → flip to พนักงาน to advance the order through the kitchen pipeline and collect payment.

## User

Save as standalone HTML: index.html

## Assistant

_[tool: grep]_

_[tool: copy_files]_

_[tool: str_replace_edit]_

_[tool: super_inline_html]_

_[tool: str_replace_edit]_

_[tool: super_inline_html]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: get_webview_logs]_

Clean — bundled file works offline. Delivering it.

_[tool: delete_file]_

_[tool: present_fs_item_for_download]_

Standalone file ready — 2 MB, works fully offline (React + Babel + QR generator + all menus inlined). Save it anywhere and double-click to open.

## User

Save as standalone HTML: index.html

## Assistant

_[tool: copy_files]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: super_inline_html]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: delete_file]_

_[tool: present_fs_item_for_download]_

Ready — single 2 MB file, works offline.

## User

โหลดลิงค์แล้วขึ้นแบบนี้

## Assistant

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: copy_files]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: super_inline_html]_

Defensive fix — `store` was somehow undefined on first render in your local browser (likely Edge's `file://` URL handling of `?store=` style params). Adding fallbacks so it always lands on a valid store.

_[tool: show_html]_

_[tool: sleep]_

_[tool: get_webview_logs]_

_[tool: delete_file]_

_[tool: present_fs_item_for_download]_

Clean — no errors. Delivering.Re-download — added safe fallbacks so the page renders even with stale localStorage or a weird `file://` URL. Should open cleanly now.

