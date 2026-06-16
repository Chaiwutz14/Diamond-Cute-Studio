# 🧩 PROMPT สำหรับ Claude Code — สร้างเว็บ "Diamond Cute Studio" ใหม่ทั้งระบบ

> วางข้อความทั้งไฟล์นี้ให้ Claude Code อ่านเป็น spec หลัก แล้วสั่งให้สร้างทีละเฟส
> โปรเจกต์นี้คือเว็บร้านพิมพ์ภาพ/สิ่งพิมพ์ครบวงจร (หน้าร้าน + ตะกร้า + เช็คเอาท์ + ติดตามออเดอร์ + รีวิว + หลังบ้านเต็มระบบ + PWA) ภาษาไทยทั้งหมด

---

## 0) วิธีใช้ prompt นี้กับ Claude Code (อ่านก่อน)
- ให้ Claude Code อ่าน spec นี้ทั้งหมดก่อน แล้ว **สร้างเป็นเฟส** ตามหัวข้อ §12 (อย่าทำทีเดียวจบ)
- สั่งให้ใช้ **skills/subagents** ที่ติดตั้ง เช่น สร้าง component, ตรวจ responsive, ตรวจ a11y, เขียน Firestore rules
- หลังแต่ละเฟส: ให้ **recheck** (syntax, responsive 360–1280px, ทุกธีม, ไม่มี console error) ก่อนไปต่อ
- เป้าหมายคุณภาพ: **10/10** — responsive ทุกขนาด, รองรับ 6 ธีม, โหลดไว, a11y, ไม่มี dead code

---

## 1) ภาพรวมโปรเจกต์
**ชื่อร้าน:** Diamond Cute Studio (โลโก้ 💎) — ร้านพิมพ์ภาพโพลารอยด์ นามบัตร บัตรแขวนคอ ป้ายร้าน QR Code ป้ายตุ๊กตา บัตรนักเรียน
**กลุ่มลูกค้า:** คนไทย, สั่งผ่านมือถือเป็นหลัก
**โทนแบรนด์:** น่ารัก-พรีเมียม, สดใส, ทันสมัย
**ภาษา:** ไทยทั้งหมด (ทั้ง UI และข้อความระบบ)

---

## 2) Tech Stack (บังคับตามนี้ เพื่อความเข้ากันได้กับโฮสต์ฟรี)
| ชั้น | เทคโนโลยี | หมายเหตุ |
|---|---|---|
| Frontend | **HTML5 + CSS3 + Vanilla JS** (ไม่มี framework, ไม่มี build step) | โหลดตรงบน GitHub Pages |
| Hosting | **GitHub Pages** (static) | อัปไฟล์ขึ้น repo → ออนไลน์ |
| Database | **Firebase Firestore** (project `diamond-cute-studio`, region `asia-southeast3`) | ทุก collection อยู่ root |
| Auth (หลังบ้าน) | **Firebase Auth (Email/Password)** + fallback รหัสผ่าน hash (PBKDF2-SHA256) | ลูกผสม |
| Auth (ลูกค้าดูออเดอร์) | **Firebase Phone Auth (OTP)** + โหมด "เครื่องนี้" (localStorage) | OTP ออปชัน |
| รูปทั่วไป | **ImgBB** (อัปผ่าน Cloudflare Worker proxy — key เป็น secret) | |
| รูปอ่อนไหว (สลิป) | **Firebase Storage** แบบ private (อ่านได้เฉพาะแอดมิน) | flag `PRIVATE_UPLOADS` |
| แจ้งเตือน | **Cloudflare Worker → LINE Messaging API** (Flex Message) | push/multicast |
| ความปลอดภัยเสริม | **Firebase App Check** (reCAPTCHA v3) + **CSP** ทุกหน้า + frame-buster | |
| PWA | **Service Worker + manifest** (ติดตั้งลงเครื่องได้) | |
| ฟอนต์ | **Kanit** (หัวข้อ) + **Sarabun** (เนื้อหา) — Google Fonts | |
| QR ชำระเงิน | **promptpay.io** (สร้าง PromptPay QR จากเบอร์/เลขบัญชี) | |

> **หลักความปลอดภัยสำคัญ:** Firebase web config เปิดเผยได้ (ปกติของ Firebase) — การป้องกันจริงอยู่ที่ **Firestore Rules** ไม่ใช่การซ่อน config. **Secret จริง (ImgBB key, LINE token) ต้องอยู่ใน Cloudflare Worker เท่านั้น** ห้ามใส่ในโค้ดฝั่ง client

---

## 3) โครงสร้างไฟล์ที่ต้องสร้าง
```
/ (root ของ repo)
├── index.html          หน้าแรก
├── catalog.html        รายการสินค้า (กรอง/ค้นหา/หมวด)
├── product.html        รายละเอียดสินค้า (+ Canvas Preview)
├── cart.html           ตะกร้า + เช็คเอาท์
├── orders.html         ติดตามออเดอร์ (OTP / เครื่องนี้)
├── gallery.html        ตัวอย่างผลงาน
├── about.html          เกี่ยวกับร้าน
├── contact.html        ติดต่อ + ฟอร์มข้อความ
├── admin-login.html    เข้าสู่ระบบหลังบ้าน
├── admin.html          แดชบอร์ดหลังบ้าน
├── 404.html            หน้าไม่พบ
│
├── css/
│   ├── themes.css      ⭐ ตัวแปรสี 6 ธีม (CSS variables)
│   ├── main.css        design tokens + base + component ร่วม
│   ├── loading.css     skeleton/blur-up/spinner/progress
│   ├── navbar.css      แถบนำทางบน
│   ├── home.css        หน้าแรก (hero + sections)
│   ├── product.css     หน้าสินค้า + Canvas Preview
│   ├── order.css       ตะกร้า/เช็คเอาท์/ติดตาม
│   └── admin.css       หลังบ้าน
│
├── js/
│   ├── config.js       ⭐ ตั้งค่าทั้งหมดไฟล์เดียว (โหลดก่อน utils.js)
│   ├── categories.js   ⭐ หมวดหมู่ built-in (แหล่งเดียวทั้งระบบ)
│   ├── utils.js        แกนกลาง: window.DMC = {...} (Firebase, ตะกร้า, อัปโหลด, helpers)
│   ├── cms.js          โหลดเนื้อหาเว็บจาก Firestore (siteContent/main)
│   ├── theme-init.js   ตั้งธีมจาก localStorage ก่อน render (กันกระพริบ) + frame-buster
│   ├── theme-switcher.js  ปุ่มสลับธีม
│   ├── navbar.js / footer.js / bottom-nav.js   component ฉีด HTML+CSS ในตัว
│   ├── loading.js / skeleton.js   สถานะโหลด
│   ├── home.js         logic หน้าแรก
│   ├── catalog.js      logic รายการสินค้า
│   ├── product.js      logic หน้าสินค้า
│   ├── canvas-preview.js  ระบบ Canvas Preview Template
│   ├── cart... / order.js   ตะกร้า + เช็คเอาท์ + สร้างออเดอร์ + แจ้ง LINE
│   ├── order-history.js   ติดตามออเดอร์ (OTP/เครื่องนี้)
│   ├── reviews.js      การ์ดรีวิว + ส่งรีวิว
│   ├── gallery.js / about-page.js / contact-page.js   สคริปต์ประจำหน้า
│   ├── admin.js        หลังบ้านทั้งหมด (login ลูกผสม + ทุก section + backup)
│   ├── admin-login-page.js / admin-page.js   bootstrap หน้า admin (แยกจาก inline เพื่อ CSP)
│   ├── admin-access.js / admin-nav.js   ลิงก์เข้าหลังบ้าน
│   ├── inline-editor.js   แก้เนื้อหา CMS แบบคลิกบนหน้าจริง (เมื่อ login แอดมิน)
│   ├── custom-select.js / pwa-install.js / sw-register.js
│   └── ...
│
├── firebase-rules/
│   ├── firestore.rules     ⭐ กติกาฐานข้อมูล (ต้อง publish ใน Console)
│   └── storage.rules       กติกา Storage (สลิป private)
│
├── cloudflare-worker/
│   ├── index.js            Worker: /notify (LINE) + /upload (ImgBB proxy) + /health
│   └── wrangler.toml
│
├── manifest.webmanifest    PWA
├── sw.js                   Service Worker (cache)
├── robots.txt / sitemap.xml / .gitignore
├── assets/  icon-192.png, icon-512.png, apple-touch-icon.png, og-image.jpg
└── .github/workflows/deploy.yml   (ออปชัน) auto-deploy
```

---

## 4) ระบบธีม (Design System)
**6 ธีม** สลับด้วย `<html data-theme="...">` เก็บใน localStorage:
`sky` (ฟ้า, ค่าเริ่มต้น) · `sakura` (ชมพู) · `mint` (เขียว) · `peach` (ส้ม) · `lavender` (ม่วง) · `midnight` (ดาร์ก)

**ทุกธีมต้องนิยามตัวแปรชุดเดียวกันใน `themes.css`** (ตัวอย่างที่ต้องมี):
```
--bg, --bg-card, --bg-card2, --bg-mid        พื้นหลัง/การ์ด
--text-1, --text-2, --text-3                 ข้อความหลัก/รอง/จาง
--accent, --accent-dark, --accent-light      สีหลักของธีม
--accent-rgb                                 (เลข r,g,b สำหรับ rgba())
--border, --border-hover                     เส้นขอบ
--shadow-card, --shadow-hover                เงา
--glass, --soft                              พื้นโปร่ง/พื้นอ่อนของ accent
--hg1, --hg2, --hglow                        ⭐ ไล่สี Hero card (สดใส) + เงาเรืองสี
--particle                                   (ออปชัน)
```
ค่าตัวอย่างต่อธีม (Hero gradient สดใส):
- sky: `--hg1:#38BDF8; --hg2:#6366F1` · sakura: `#FB7AC3 → #C084FC` · mint: `#34D399 → #22D3EE`
- peach: `#FB923C → #FB7185` · lavender: `#A78BFA → #818CF8` · midnight: `#38BDF8 → #818CF8` (พื้นดาร์ก)

**Design tokens กลาง (main.css `:root`):**
```
--font-display:'Kanit'; --font-body:'Sarabun';
--nav-h:64px;
--r-sm:6px; --r-md:10px; --r-lg:14px; --r-xl:18px; --r-2xl:24px; --r-pill:9999px;
--t-fast:.15s ease; --t-normal:.25s ease; --t-slow:.4s ease;
```
**Responsive breakpoints:** 1024 / 900 / 768 / 640 / 560 / 400 px (มือถือต้องไม่ล้นแนวนอน — ดู §11 บั๊กสำคัญ)

---

## 5) หน้าแรก (index.html) — ดีไซน์ "Bright Premium" (สำคัญ ลูกค้าเลือกแบบนี้)
โครงเรียงบนลงล่าง:
1. **Navbar** (component ฉีดเอง) — โลโก้ 💎 + เมนู + ปุ่มสลับธีม + ตะกร้า + ปุ่ม LINE
2. **Hero = การ์ดไล่สีสดใส** (`.hp-hero-card`) บนพื้นสว่าง:
   - พื้นหลังการ์ด `linear-gradient(140deg, var(--hg1), var(--hg2))` + เงา `var(--hglow)`
   - มี **อนิเมชันเบาๆ 6 ชั้น** (ดู §5.1)
   - badge, พาดหัว 3 บรรทัด, ข้อความรอง, 2 ปุ่ม (เริ่มออกแบบ / ดูผลงาน), แถบสถิติ (ออเดอร์/เรตติ้ง/วันได้รับ)
   - **พาดหัว:** "ทำให้ทุกภาพ / กลายเป็นของที่ระลึก / **ที่สวยงามที่สุด**" — บรรทัด 3 ทำเป็น**ทองเรืองแสงวิบวับ** (gold gradient + shimmer)
3. **Service chips** — การ์ดหมวดบริการ(ไอคอนพื้นนุ่ม `var(--soft)`) ดึงจำนวนจริงต่อหมวด
4. **สินค้ายอดนิยม** — การ์ดสินค้าจริงจาก Firestore (badge ขายดี/ใหม่/ลด, wishlist, ราคา, ปุ่มใส่ตะกร้า)
5. **แถบผลงานล่าสุด** — รูปจริงจาก gallery (เลื่อนแนวนอน)
6. **โปรโมชัน** (จาก CMS, เปิด/ปิดได้)
7. **ทำไมต้องเรา** — 4 จุดเด่น
8. **รีวิวลูกค้าจริง** — จาก Firestore (เฉพาะ approved)
9. **Footer** (component) + **Bottom nav** (มือถือ)

### 5.1 อนิเมชัน Hero card (เบาๆ มีมิติ, ต้องรองรับ `prefers-reduced-motion`)
1. ไล่สีหายใจ (animate `background-position`, `background-size:180%`)
2. วงกลมตกแต่งลอยขึ้นลง (2-3 วง)
3. แสงกวาด (sheen) เฉียงผ่านการ์ดเป็นจังหวะ
4. ประกายวิบวับ ✨ (twinkle หลายจุด สลับเวลา)
5. จุดใน badge เต้น (pulse)
6. ปุ่มหลักมีประกายวิ่งผ่าน + พาดหัวบรรทัด 3 ทองเรืองแสง (shimmer)
> ใส่ `@media (prefers-reduced-motion: reduce){ ปิดอนิเมชันทั้งหมด คงสีทองไว้ }`

---

## 6) หน้าอื่นๆ (ฟีเจอร์ที่ต้องมี)

### catalog.html — รายการสินค้า
- ดึง products จาก Firestore (เฉพาะ active), การ์ดสินค้า (รูป/emoji, badge, wishlist, ราคา/หน่วย, ปุ่มใส่ตะกร้า)
- กรองตามหมวด (`?cat=slug`), ค้นหา (debounce), เรียงลำดับ
- หมวดจาก `categories.js` (built-in) + custom จาก Firestore
- โหลดแบบ skeleton

### product.html — รายละเอียดสินค้า
- Layout 2 คอลัมน์ (เดสก์ท็อป) → 1 คอลัมน์ (มือถือ): `.detail-gallery` (รูป+thumbnails) | `.detail-info`
- ราคาแบบขั้นบันได (bulk discount), ตัวเลือกขนาด/วัสดุ (chips), จำนวน, รวมยอด, ปุ่มใส่ตะกร้า
- เรตติ้ง+จำนวนรีวิว+จำนวนออเดอร์, วิดีโอ (YouTube/TikTok ออปชัน)
- **Canvas Preview Tool** (เฉพาะสินค้า `hasPreview:true`) — ดู §8
- ⚠️ **`.detail-info` และ `.detail-gallery` ต้องมี `min-width:0`** (กัน grid ล้นมือถือ — ดู §11)

### cart.html — ตะกร้า + เช็คเอาท์
- รายการในตะกร้า (localStorage), แก้จำนวน/ลบ, สรุปยอด (ย่อย+ส่ง−ส่วนลด=รวม)
- ฟอร์มลูกค้า: ชื่อ, เบอร์, ที่อยู่, หมายเหตุ
- **ชำระเงิน:** PromptPay QR (สร้างจาก `promptpay.io/{id}/{amount}.png`) หรือ COD
- อัปสลิป (→ Firebase Storage private ถ้า `PRIVATE_UPLOADS`) + แนบรูปงาน
- ค่าส่ง: COD ฿80 / โอน ฿50 (จาก config)
- สร้าง order ใน Firestore → **ยิง LINE notify** ผ่าน Worker → บันทึก orderId ลง localStorage (โหมดเครื่องนี้)
- แสดง orderId (เช่น DCS-2665) + สรุป

### orders.html — ติดตามออเดอร์
- 2 โหมด: **"เครื่องนี้"** (อ่าน orderId จาก localStorage แล้ว `get` รายใบด้วย docId) · **"ค้นด้วยเบอร์ (OTP)"** (Phone Auth → ค้น `phoneSearch`)
- แสดงสถานะ (pending→processing→shipping→done/cancelled), ขนส่ง+เลขพัสดุ, รายการ, ยอด

### gallery.html — ผลงาน
- ดึง gallery (active) จาก Firestore, layout masonry (size: tall/wide/normal), กรองหมวด, lightbox

### about.html / contact.html
- about: เนื้อหา + ขั้นตอนสั่งซื้อ (แก้ inline ผ่าน CMS ได้)
- contact: ช่องทางติดต่อ (LINE/FB/IG/TikTok/โทร/เวลาเปิด จาก CMS) + ฟอร์มส่งข้อความ → Firestore `contacts`

### 404.html — หน้าไม่พบ (ลิงก์กลับหน้าแรก/สินค้า)

---

## 7) หลังบ้าน (admin.html + admin.js) — เต็มระบบ
**เข้าระบบ (admin-login.html):** ลูกผสม — ถ้าตั้ง `ADMIN_EMAIL` → ใช้ Firebase Auth จริง (พิมพ์รหัสผ่าน), ถ้าไม่ตั้ง → ตรวจรหัสผ่านแบบ hash (PBKDF2-SHA256). มี **rate-limit + lockout** เมื่อกรอกผิดหลายครั้ง

**แดชบอร์ด — sidebar nav + section ต่อไปนี้:**
1. **ภาพรวม (Overview)** — KPI (ยอดขาย/ออเดอร์/รออนุมัติ), ตารางออเดอร์ล่าสุด, รีวิวรออนุมัติ, **กราฟยอดขาย**
2. **ออเดอร์** — ตาราง, เปลี่ยนสถานะ, ใส่ขนส่ง+เลขพัสดุ, ดูสลิป (ผ่าน Storage แบบยืนยันตัวตน), ดูรายละเอียด
3. **สินค้า** — ตาราง, เพิ่ม/แก้ (modal): ชื่อ/หมวด/ราคา/หน่วย/รูปหลายรูป (ผูก label ขนาด)/ปก/วิดีโอ/คำอธิบาย/ขนาด/วัสดุ/ส่วนลดจำนวน/ขั้นต่ำ/เปิด Canvas Preview+เลือกเทมเพลต/ป้าย hot-new/active, ลบ
4. **แกลเลอรี** — เพิ่ม/ลบรูปผลงาน (ชื่อ/หมวด/รูป/ขนาด tall-wide)
5. **กล่องข้อความ** — ข้อความจากฟอร์มติดต่อ (อ่าน/ยังไม่อ่าน)
6. **รีวิว** — อนุมัติ/ปฏิเสธรีวิวลูกค้า + เพิ่มรีวิวเอง
7. **เนื้อหาเว็บ (CMS)** — แก้ hero, โปรโมชัน, สถิติ, ช่องทางติดต่อ, **วิธีชำระเงิน (เปิด/ปิดแต่ละแบบ)**, QR PromptPay, FAQ, ข้อความหน้า about/gallery
8. **เทมเพลตกรอบรูป** — อัป PNG กรอบโปร่งใส (ใช้ใน Canvas Preview)
9. **ตั้งค่า + สำรองข้อมูล** — Export/Import JSON (backup ทุก collection)

> หน้า admin แยก bootstrap script (`admin-page.js`, `admin-login-page.js`) ออกจาก inline เพื่อใช้ CSP เข้ม (ไม่ต้อง `unsafe-inline` กับ script)

---

## 8) ระบบ Canvas Preview Template (จุดขายที่ต่างจากร้านอื่น)
ในหน้าสินค้า (ถ้า `hasPreview:true`): ลูกค้า**อัปรูปของตัวเอง → เลือกแบบกรอบ → เห็นตัวอย่างจริงทันทีบน `<canvas>` → บันทึกภาพ / แนบเข้าออเดอร์ได้**
- เทมเพลต built-in 6 แบบ: Classic / Minimal / Dark / Warm / Cool / Cute (วาดด้วย canvas 2D)
- + เทมเพลต custom: กรอบ PNG โปร่งใสจากร้าน (collection `templates`)
- ใส่ caption ใต้รูปได้
- canvas ขนาดเล็ก (เช่น 280×390 / 250×390 / 280×280 ตามชนิดสินค้า) + CSS `max-width:100%; height:auto` (responsive)
- ปุ่ม 💾 ดาวน์โหลด (toDataURL) + 📎 แนบแบบเข้าออเดอร์
- ⚠️ ต้องไม่ทำให้หน้าล้นแนวนอนบนมือถือ (ดู §11)

---

## 8.5) ระบบคูปอง/ส่วนลด + ค่าธรรมเนียมแก้ได้ + แถบประกาศ (ต้องมี)

### 8.5.1 คูปองส่วนลด — collection `coupons` (doc id = CODE ตัวพิมพ์ใหญ่)
fields: `code` · `type`(percent|fixed|freeship) · `value` · `minSpend` · `maxDiscount`(เพดาน% ) · `active` · `startAt`/`expireAt`(timestamp) · `usageLimit`(0=ไม่จำกัด) · `usedCount` · `description` · `createdAt`

**หน้าบ้าน (cart):** ช่องกรอกโค้ด + ปุ่ม "ใช้โค้ด" → validate (มีจริง/active/ช่วงเวลา/minSpend/usageLimit) → คำนวณ: percent=`min(subtotal×value/100, maxDiscount)`, fixed=`min(value,subtotal)`, freeship=ค่าส่งเป็น 0 → อัปเดตสรุปยอด + เก็บ `couponCode`+`couponDiscount` ลงออเดอร์ → re-validate ตอนกดสั่ง

**หลังบ้าน:** section "🎟️ คูปอง" — ตาราง + สร้าง/แก้/ลบ/เปิด-ปิด + ดูยอดใช้

**ความปลอดภัย (แนว B — Poka-yoke กันใช้เกินลิมิต):**
```
match /coupons/{code} {
  allow get: if true;            // validate โค้ดที่พิมพ์ (ต้องรู้โค้ด)
  allow list: if isAdmin();      // ห้ามไล่ดูทั้งหมด
  allow create, delete: if isAdmin();
  allow update: if isAdmin() || (   // ลูกค้าบวก usedCount ได้ทีละ 1 เท่านั้น
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['usedCount']) &&
    request.resource.data.usedCount == resource.data.usedCount + 1 &&
    resource.data.active == true &&
    (resource.data.usageLimit == 0 || resource.data.usedCount < resource.data.usageLimit)
  );
}
```
ตอนสั่งซื้อ: เพิ่ม `usedCount` ด้วย **Firestore transaction** (atomic, เปลี่ยนเฉพาะ usedCount +1 ให้ตรง rule) → กันใช้เกินแม้สั่งพร้อมกัน

### 8.5.2 ค่าส่ง/ค่าธรรมเนียมแก้ได้จากหลังบ้าน (ไม่ต้องแก้โค้ด)
เก็บใน `siteContent/main.fees`: `shipTransfer` · `shipCod` · `freeShipMin`(0=ปิด) · `surchargePromptpay` · `surchargeCod`
หลังบ้าน CMS มีช่องกรอกทั้งหมด · ตะกร้าคำนวณ `total = subtotal + shipping + surcharge − discount` (อ่านจาก CMS, fallback config.js)

### 8.5.3 แถบประกาศด่วน (announce) — บนสุดทุกหน้า
เก็บใน `siteContent/main.announce`: `{active, text}` · หลังบ้านมีช่องเปิด/ปิด + ข้อความ · หน้าบ้าน (navbar.js) แสดงแถบ fixed บนสุดเมื่อ active (เลื่อน navbar+เนื้อหาลงอัตโนมัติ, ปิดได้, ใช้ textContent กัน XSS)

---

## 9) โครงสร้างข้อมูล Firestore (ทุก collection root)
> สร้าง `DATA-MODEL.md` ประกอบด้วย

**products:** name, category(ชื่อไทย/slug), price(number), unit, emoji, images[{url,label}], coverIndex, videoUrl, shortDesc, description, sizes(csv), materials(csv), bulkDiscount, minQty, hasPreview(bool), templates[], isHot/isNew/active(bool), createdAt

**orders:** orderId("DCS-xxxx"), customerName, customerPhone, address, **phoneSearch**(ตัวเลขล้วน—ค้นหลัง OTP), items[{name,qty,price,options}], itemsSummary, subtotal/shipping/discount/total(number), paymentMethod('promptpay'|'cod'), slipUrl, fileUrls[], customerNote, status(pending→processing→shipping→done|cancelled), carrier(kerry|flash|jt|thaipost), trackingNo, createdAt

**reviews:** name(2–40), rating(1–5), text(10–500), productId, productName, status(pending|approved|rejected), source(customer|admin), createdAt

**gallery:** name, cat(slug), image(URL), emoji, size('tall'|'wide'|''), active(bool), createdAt *(อ่านเผื่อ field เก่า: imageUrl,url,title,category)*

**siteContent/main** (doc เดียว = CMS): hero{badge,title1,title2,title3,desc} · promo{active,tag,title,desc,btnText,btnLink} · stats{orders,rating,days} · contact{line,lineLabel,facebook,instagram,tiktok,email,phone,hours} · payment{promptpayId,promptpayName,qrImageUrl, methods{promptpay,cod,truemoney,credit:{shown,ready}}} · **fees{shipTransfer,shipCod,freeShipMin,surchargePromptpay,surchargeCod}** · **announce{active,text}** · faq[{q,a}] · pages{about{title,subtitle,stepsHead}, gallery{title,subtitle}}

**coupons** (doc id = CODE): ดู §8.5.1 — code/type/value/minSpend/maxDiscount/active/startAt/expireAt/usageLimit/usedCount/description/createdAt

**templates:** name, frameUrl(PNG โปร่งใส), active, createdAt
**categories:** name, emoji, slug, createdAt *(built-in 7 หมวดอยู่ใน categories.js)*
**contacts:** name, phone/email, topic, message, read(bool), createdAt
**settings:** (เผื่ออนาคต)

**หมวด built-in 7 หมวด (js/categories.js):**
polaroid(📸 รูปโพลารอยด์) · lanyard(🪪 บัตรแขวนคอ) · business-card(💼 นามบัตร) · shop-sign(🏪 ป้ายร้านค้า) · qrcode(📱 QR Code) · doll-tag(🧸 ป้ายตุ๊กตา) · student-card(🎓 บัตรนักเรียน)
> แต่ละหมวดมี `match[]` (คำพ้องไทย/อังกฤษ) ไว้จับคู่ `product.category` กับ slug

---

## 10) Integrations & Config

### 10.1 `js/config.js` (โหลดก่อน utils.js — ตั้งค่าที่เดียวจบ)
```js
window.DMC_CONFIG = {
  SHOP_NAME: 'Diamond Cute Studio',
  SITE_URL:  'https://<user>.github.io/Diamond-Cute-Studio/',
  FIREBASE_CONFIG: { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId },
  ADMIN_EMAIL: '',            // ตั้ง = ใช้ Firebase Auth จริง / ว่าง = ใช้รหัส hash
  UPLOAD_PROXY_URL: '<worker-url>/upload',   // อัปรูปผ่าน Worker (ImgBB key เป็น secret)
  IMGBB_API_KEY: '',          // ปล่อยว่าง (key อยู่ใน Worker)
  APP_CHECK_SITE_KEY: '',     // reCAPTCHA v3 (ว่าง=ปิด App Check)
  PRIVATE_UPLOADS: false,     // true = เก็บสลิปใน Firebase Storage private
  CF_WORKER_URL: '<worker-url>',
  SHIPPING: { cod: 80, transfer: 50 },
};
```
> Firebase web config เปิดเผยได้ (อยู่ใน source ของทุกหน้าอยู่แล้ว) — ความปลอดภัยอยู่ที่ Rules ไม่ใช่การซ่อน

### 10.2 Cloudflare Worker (`cloudflare-worker/index.js`)
3 endpoint:
- `POST /notify` — รับ JSON ออเดอร์ → สร้าง **LINE Flex Message** (การ์ดสวย: header สีฟ้า, ยอดรวม, ข้อมูลลูกค้า, ปุ่มไปหลังบ้าน) → ส่งเข้า LINE. รองรับ **หลาย User ID** (คั่น `,` → ใช้ multicast), ID เดียว → push
- `POST /upload` — proxy อัปรูปขึ้น ImgBB (key เป็น secret `IMGBB_KEY`) → คืน `{url, deleteUrl}`
- `GET /health` — เช็คสถานะ
- **Secrets (ตั้งใน Dashboard):** `LINE_TOKEN` (Channel Access Token), `LINE_USER_ID` (U-prefix, คั่น ,), `IMGBB_KEY`, `ALLOWED_ORIGIN` (= โดเมนร้าน, กันคนนอกยืม Worker)
- มี CORS + origin allowlist

### 10.3 `window.DMC` core API (js/utils.js) — ต้องมีฟังก์ชันเหล่านี้
`getFirebaseReady()` (โหลด Firebase SDK + init + App Check), `getDb()`, `uploadToImgBB(file)`, `uploadPrivateFile()/uploadSensitive()` (→Storage), `resolveImageSrc()`, `sendLineNotify(payload)`, `toast()`, `sha256()/pbkdf2Hash()`, session (create/get/clear/isAuthenticated), rate-limit (record/clear/isLockedOut/remaining), `generateId()/generateOrderId()`, `formatDate()/timeAgo()/formatPrice()`, cart (get/save/add/remove/updateBadge/total), `escapeHtml()` (escape `< > & " ' \``), `normalizePhone()/toIntlPhone()`, `$()/$$()/createElement()/show()/hide()/debounce()`

---

## 11) ⚠️ บั๊ก/ข้อควรระวังที่ต้องป้องกัน (เรียนรู้จากของจริง)
1. **Grid blowout บนมือถือ:** grid item (`.detail-info`, `.detail-gallery`, คอลัมน์ใน layout) **ต้องมี `min-width:0`** ไม่งั้นเนื้อหายาว (เช่นข้อความไทยใน Canvas Preview tool) จะดันคอลัมน์บวมเกินจอ → ล้นแนวนอน. ใส่ `overflow-wrap:anywhere` กับหัวข้อ/ข้อความยาวด้วย
2. **CMS override:** เนื้อหา hero/desc มาจาก `siteContent/main` (Firestore) — ถ้าแก้ default ในโค้ดแต่ Firestore มีค่าเก่า ค่าเก่าจะชนะ. กำหนดให้ static HTML = ค่า default และ CMS เป็นตัว override ที่ตั้งใจ
3. **ธีมกระพริบตอนโหลด:** ตั้ง `data-theme` จาก localStorage ใน `theme-init.js` **ก่อน** CSS render
4. **CSP:** ห้าม inline script (แยกเป็นไฟล์) — ดู §10/§7
5. **Service Worker cache:** เปลี่ยน cache version ทุกครั้งที่ deploy ใหญ่ ไม่งั้นผู้ใช้ค้างเวอร์ชันเก่า
6. **อย่าใส่ secret จริงในฝั่ง client** (ImgBB/LINE token อยู่ Worker เท่านั้น)
7. **a11y:** ปุ่ม/ลิงก์มี label, รูปมี alt, คอนทราสต์ผ่าน, รองรับ `prefers-reduced-motion`

---

## 12) ลำดับการสร้าง (สั่ง Claude Code ทำเป็นเฟส)
1. **Setup:** โครงไฟล์ + `config.js` + `themes.css` (6 ธีม) + `main.css` tokens + `theme-init.js`/`theme-switcher.js`
2. **Components:** navbar, footer, bottom-nav (ฉีด HTML+CSS ในตัว) + `utils.js` (DMC core) + `categories.js` + `cms.js` + loading/skeleton
3. **หน้าแรก** (index + home.css + home.js) — Bright Premium hero + อนิเมชัน §5 + sections (ดึงข้อมูลจริง + fallback ตอนออฟไลน์)
4. **สินค้า:** catalog + product + `canvas-preview.js` (+ ระวัง §11.1)
5. **ตะกร้า/เช็คเอาท์/ออเดอร์:** cart + order + order-history + PromptPay QR + LINE notify
6. **รีวิว/แกลเลอรี/about/contact/404**
7. **หลังบ้าน:** admin-login + admin (ทุก section §7) + inline-editor
8. **Backend:** `firestore.rules` + `storage.rules` + Cloudflare Worker (`/notify` `/upload` `/health`)
9. **PWA:** manifest + sw.js + icons + sw-register + pwa-install
10. **SEO/meta:** CSP ทุกหน้า, OG/Twitter tags, sitemap, robots, manifest
11. **Recheck รวบยอด:** responsive 360–1280px ทุกธีม, ไม่มี console error, **จำลอง Canvas Preview จริง** (อัปรูป→สลับเทมเพลต→วัด overflow=0), ทดสอบ checkout + แจ้ง LINE, ทดสอบ login หลังบ้าน
12. **เอกสาร:** README (ติดตั้ง), DATA-MODEL, USER-MANUAL, SECURITY (เช็กลิสต์ §13)

---

## 13) ความปลอดภัย — เช็กลิสต์ที่ต้องทำให้ครบ (สู่ 10/10)
1. **Firestore Rules v2** — write ทุก collection ต้อง `isAdmin()` (เช็คอีเมลจาก Firebase Auth) ยกเว้น **create** order/review pending ที่ validate ฝั่ง rules (จำกัด field/ค่า). order: `get` รายใบด้วย docId ได้ (docId สุ่ม=token) แต่ `list` เฉพาะแอดมิน/เจ้าของเบอร์ที่ผ่าน OTP
2. **Storage Rules** — สลิป/รูปลูกค้าอ่านได้เฉพาะแอดมิน (`PRIVATE_UPLOADS:true`)
3. **App Check** (reCAPTCHA v3) → Enforce Firestore+Auth (หลังทดสอบว่าใช้งานได้)
4. **CSP + frame-buster** ทุกหน้า (GitHub Pages ตั้ง HTTP header ไม่ได้ → ใช้ meta CSP + JS frame-buster)
5. **รหัสแอดมิน fallback** = PBKDF2-SHA256 hash (ไม่มี plaintext ในโค้ด) + rate-limit/lockout
6. **Secrets** (ImgBB/LINE) อยู่ Cloudflare Worker เท่านั้น + `ALLOWED_ORIGIN`
7. ทดสอบ: ปลอม session ใน Console → ต้องเด้งออก login · อ่าน orders ตรงจาก Firestore โดยไม่ login → ต้องถูกปฏิเสธ

---

## 14) เกณฑ์รับงาน (Definition of Done)
- [ ] 11 หน้าใช้งานครบ + responsive 360–1280px ทุกหน้า ทุก 6 ธีม ไม่ล้นแนวนอน
- [ ] หน้าแรก Bright Premium + อนิเมชัน Hero 6 ชั้น + รองรับ reduced-motion
- [ ] ดึงข้อมูลจริงจาก Firestore (products/gallery/reviews/CMS) + fallback ตอนออฟไลน์
- [ ] ตะกร้า→เช็คเอาท์→สร้างออเดอร์→แจ้ง LINE→ติดตามออเดอร์ ครบลูป
- [ ] Canvas Preview: อัปรูป→เลือกเทมเพลต→บันทึก/แนบ ได้จริง ไม่ล้นมือถือ
- [ ] หลังบ้านครบ 9 section + login ลูกผสม + backup
- [ ] Worker /notify /upload /health ทำงาน + secrets ครบ
- [ ] Firestore/Storage rules + App Check + CSP + PWA ครบ
- [ ] ไม่มี console error, ไม่มี dead code, syntax ผ่านทุกไฟล์
- [ ] เอกสารครบ (README/DATA-MODEL/USER-MANUAL/SECURITY)

---
*สร้างจากการวิเคราะห์โปรเจกต์ Diamond Cute Studio (V15/V4 Final) ของจริงทั้งหมด — หน้าบ้าน หลังบ้าน ฐานข้อมูล ความปลอดภัย และ integrations*
