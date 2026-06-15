# 📜 CHANGELOG — Diamond Cute Studio

## V4.1 — คูปอง(verified) + แถบประกาศ + แก้ empty-state
- 🎟️ **ระบบคูปองส่วนลด (แนว B / Poka-yoke)** — collection `coupons` (doc id=CODE), validate ครบ (active/ช่วงเวลา/minSpend/usageLimit/maxDiscount cap), ส่วนลด percent/fixed/freeship, นับ `usedCount` ด้วย atomic transaction กันใช้เกินลิมิต · **ทดสอบ 9/9 scenarios ผ่าน**
- 💸 **ค่าส่ง/ค่าธรรมเนียม/surcharge แก้ได้จากหลังบ้าน** (siteContent/main.fees) — มีผลกับยอดตะกร้าทันที
- 📢 **แถบประกาศด่วน (announce)** ใหม่ — หลังบ้านเปิด/ปิด+พิมพ์ข้อความ → แสดงแถบบนสุดทุกหน้า (เลื่อน navbar+เนื้อหาลงอัตโนมัติ, ปิดได้, กัน XSS)
- 🎯 **แก้ empty-state "ไม่พบสินค้า"** ให้อยู่กึ่งกลาง (flexbox centering — icon/ข้อความ/ปุ่ม ตรงกลางเป๊ะ) + แก้ตัวแปรสีที่ผิด
- ✅ Recheck: syntax ทุกไฟล์ · จำลอง coupon 9 scenario + announce bar + empty-state ผ่านหมด 0 error

---

## V4 Final — อนิเมชัน Hero + ลูกเล่นพาดหัว + แก้ Responsive เทมเพลต
- ✨ **อนิเมชันการ์ด Hero (6 ชั้น เบาๆ)**: ไล่สีหายใจ · วงกลมลอย · แสงกวาด (sheen) · ประกายวิบวับ · จุด badge เต้น · ปุ่มมีประกายวิ่ง
- 🥇 **พาดหัวคงข้อความเดิม** "ทำให้ทุกภาพ / กลายเป็นของที่ระลึก / ที่สวยงามที่สุด" + ทำ **"ที่สวยงามที่สุด" เป็นทองเรืองแสงวิบวับ**
- ♿ เคารพ `prefers-reduced-motion` — ปิดอนิเมชันทั้งหมดให้ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหว (คงสีทองไว้)
- 🧹 **ลบค่าพาดหัวใหม่ที่ซ้อนทับ** — revert `cms.js` default + `index.html` กลับเป็นข้อความเดิม
- 🐛 **แก้ Canvas/Preview เพี้ยนบนมือถือ**: ต้นเหตุคือ `.detail-info` (grid item) ไม่มี `min-width:0` → เมื่อสินค้ามีเทมเพลต ข้อความยาวใน preview-tool ดัน grid บวมเกินจอ (ล้น 192px) — แก้ด้วย `min-width:0` + `overflow-wrap:anywhere` บน `.detail-info`/`.detail-gallery`
- ✅ **จำลอง Preview Tool จริง**: อัปโหลดรูป → วาด canvas สำเร็จ → สลับครบ 7 เทมเพลต → ใส่ caption → ทั้งมือถือ/เดสก์ท็อป overflow = 0 ทุกขั้น, 0 JS error

---

## V4 — หน้าแรกโฉมใหม่ (Homepage Redesign · Direction B Bright Premium)
- 🎨 **Hero ใหม่**: การ์ดไล่สีสดใสพรีเมียม (วงตกแต่ง + เงาเรืองสีตามธีม) แทน hero เดิม
- ✍️ **พาดหัวใหม่**: "เพราะทุกรูปภาพของคุณ ล้วนมีความหมาย"
- 🌈 รองรับครบ **6 ธีม** (เพิ่มตัวแปร `--hg1/--hg2/--hglow/--soft` ต่อธีมใน themes.css)
- 🧩 ส่วนใหม่: **service chips** การ์ดขาวไอคอนพื้นนุ่ม · **แถบผลงานจริง** (gallery strip เลื่อนได้) · promo/รีวิว/features จัดโทนใหม่
- 📱 **Responsive** มือถือ→เดสก์ท็อป (chips/products 4 คอลัมน์บนจอใหญ่) + ใช้ฟอนต์ Kanit
- 🔌 **คงทุกฟังก์ชัน + ข้อมูล Firebase จริง**: CMS (hero/promo/stats), หมวดหมู่+จำนวนจริง, สินค้าแนะนำ, รีวิว, ตะกร้า, navbar/footer/bottom-nav, theme switcher, PWA
- 🧹 ลบ dead code: particle canvas, hero carousel/showcase, float badge เก่า
- ✅ ผ่าน recheck: syntax ทุกไฟล์ · CSS สมดุล · ทุก ID ที่ JS ใช้มีครบ · render จริง 6 ธีม + เดสก์ท็อป ไม่มี JS error

---

## Security v3 — อุดช่องโหว่ความปลอดภัย (Security Hardening)
> รายละเอียด + ขั้นตอน Console ดูที่ `SECURITY-v3.md`

**แก้ในโค้ด**
- 🔐 **Auth boundary ใหม่** — เมื่อเปิด Firebase Auth แล้ว session ปลอมใน Console ไม่ได้อีก (admin.js/utils.js)
- 🛡️ **CSP + security headers** ทุกหน้า + frame-buster กัน clickjacking + ย้าย inline script เป็นไฟล์
- ☁️ **ลบ ImgBB key ออกจากหน้าเว็บ** (อัปผ่าน Worker เท่านั้น)
- 🧱 **escapeHtml แข็งขึ้น** (escape `'` และ `` ` ``)
- 📊 **Panel ความปลอดภัยในหลังบ้านแสดงสถานะจริง** (เตือนถ้ายังไม่เปิด Auth/App Check)
- 🚪 logout ออกจาก Firebase Auth ด้วย
- ✅ **โค้ด App Check พร้อมเปิด** (ตั้ง APP_CHECK_SITE_KEY) + `storage.rules` พร้อม deploy

**ต้องตั้งค่า Console เอง (สู่ 10/10):** เปิด Firebase Auth + deploy กฎ secure · App Check · สลิป private ใน Storage · ตั้ง IMGBB_KEY/ALLOWED_ORIGIN ใน Worker

---

## Upgrade v.2 — ยกระดับ UX/UI เป็น 10/10 (UX/UI Polish)
> รายละเอียดเต็มดูที่ `UPGRADE-v2.md`

**🅰️ Polish gap** — นิยาม `--hero-grad*` (แก้ hero แบน), `--accent-rgb` (เงาตามธีม), `--text-3` ผ่าน WCAG AA จริงทั้ง 6 ธีม, iOS no-zoom (input 16px), touch target 44px

**🅱️ Conversion & a11y**
- ⭐ Canvas Preview → ปุ่ม "ใช้แบบนี้ในออเดอร์" แนบแบบที่ออกแบบเข้าออเดอร์จริง (canvas-preview.js, order.js)
- 📌 แถบสั่งซื้อลอยล่างจอบนมือถือ (product.*)
- 🚚 แจ้งค่าส่งตั้งแต่หน้าสินค้า
- ✅ Inline validation เรียลไทม์ในฟอร์มชำระเงิน
- ♿ ผูก label↔input ทุกช่อง (cart 6 + contact 4)

**🅲 Performance & Design debt**
- ฟอนต์ย้ายจาก @import → preconnect + link (ไม่บล็อกการเรนเดอร์) + subset
- ลบ dead carousel code (markup + JS + CSS ~4,200 ตัวอักษร)
- นิยามตัวแปร CSS ที่ขาดทั้งหมด

---

## V.upgrade1 — เก็บบั๊ก + อุดช่องโหว่ (Code Audit Fixes)
> รายละเอียดเต็ม + ขั้นตอนตั้งค่าดูที่ `UPGRADE-V.upgrade1.md`

**🔴 บั๊กร้ายแรง**
- 🖼️ **รูปงานลูกค้าถูกอัปจริงและแนบกับออเดอร์** — เดิมหน้าตะกร้าแค่โชว์ preview แต่ไม่เคยอัป ทำให้ออเดอร์มาถึงร้านโดยไม่มีรูป (`order.js`)
- 🔐 **เตรียมระบบ Firebase Auth ให้พร้อม** เพื่อปิดช่องโหว่ฐานข้อมูลเปิดโล่ง (ต้องตั้งค่า Console ตามคู่มือ)

**🟠 กระทบของจริง**
- 🏠 สินค้าแนะนำหน้าแรกเลิกพึ่ง composite index (เดิมเด้งไปโชว์สินค้า demo เมื่อ index ยังไม่ถูกสร้าง) (`home.js`)
- 💬 Worker: แก้ URL ปุ่มซ้ำ `https://https` + รองรับแจ้งเตือนหลายคนด้วย multicast (`cloudflare-worker`)
- 🎟️ คูปองส่วนลดเก็บเป็น % คิดสดทุกครั้ง — เดิมยอดเพี้ยนเมื่อแก้ตะกร้าหลังใส่โค้ด (`order.js`)
- 🧹 ล้างช่องในหลังบ้านแล้วค่าหายจริง ไม่เด้งกลับลิงก์ตัวอย่าง + ซ่อนช่องทางที่ยังไม่ตั้งค่า (`cms.js`, `footer.js`, `bottom-nav.js`)

**🟡 ประสิทธิภาพ/ความเรียบร้อย**
- ⚡ Hero: ตัด `initHeroCarousel()` ที่ถูกเรียกซ้ำ + แก้ carousel/showcase ชนกัน (timer รั่ว) (`home.js`)
- ⚡ KPI หลังบ้านดึง orders ครั้งเดียว (เดิม 3 query) — ประหยัด Firestore reads (`admin.js`)
- ☁️ อัปรูป fallback proxy→ImgBB ตรง + เปิด upload proxy ผ่าน Worker เพื่อซ่อน key (`utils.js`, `config.js`)
- ⚠️ เตือนชัดเมื่ออัปสลิป/รูปบางส่วนไม่สำเร็จ (`order.js`)

**🟢 รายละเอียด/SEO**
- 🔔 ตัด toast ซ้ำตอนเพิ่มลงตะกร้า (`product.js`)
- 🖼️ สร้าง `assets/og-image.jpg` ใหม่ + OG/Twitter meta หน้าแรก (preview ตอนแชร์ LINE/FB)
- 🤝 เลิกกุเวลาออเดอร์ปลอม → ใช้ข้อความที่เป็นจริงเสมอ (`home.js`)
- ♿ particle เคารพ prefers-reduced-motion + หยุดเมื่อ hero พ้นจอ · แถบโหลด catalog ไม่ค้าง · theme-color ตรงธีม · SW precache ครบ (bump `dcs-v15-upgrade1`)

---

## V17 — ชำระเงินหลายช่องทาง + แก้เนื้อหา inline
- 💳 **ระบบชำระเงินหลายช่องทาง** — PromptPay, COD, TrueMoney, บัตรเครดิต (2 ตัวหลังขึ้น "เร็วๆ นี้")
- ⚙️ **หลังบ้านจัดการช่องทางได้** — เปิด/ปิดการแสดง + ตั้งสถานะพร้อม/ไม่พร้อม รายช่องทาง (toggle)
- ✏️ **แก้เนื้อหา inline บนหน้าบ้าน** — แอดมินเห็นไอคอนดินสอตรงข้อความจริง กดแก้ได้เลย บันทึกเข้า Firestore ทันที
- 🛠️ **แถบโหมดแอดมิน** — แสดงบนหน้าบ้านเมื่อแอดมิน login: ปุ่มไปหลังบ้าน / ออกจากโหมด (ดูแบบลูกค้า)
- 🔗 ปุ่ม "แก้บนหน้าเว็บจริง" ในเมนูเนื้อหาเว็บไซต์ (หลังบ้าน) → พาไปหน้าบ้านพร้อมเปิดโหมดแก้
- 🔒 ความปลอดภัย: แก้ inline ได้เฉพาะแอดมินจริง (Firebase Auth) + เขียนผ่าน Firestore Rules ที่ตรวจสิทธิ์


## V16 — แก้บัค 7 + Header ใหม่
- 🐛 **บัคใหญ่: เลือกหมวดแล้วไม่พบสินค้า** — แก้การเทียบ slug↔ชื่อไทย (สินค้าเก็บชื่อไทย แต่ filter ใช้ slug) ผ่าน DMCCat.matches
- 🖼️ **Hero showcase ไม่ลบป้ายออเดอร์ล่าสุด** — แทนเฉพาะการ์ดรูป + เวลาสุ่มกลับมาทำงาน + รูป fallback สวยงามเมื่อยังไม่มีผลงานจริง
- 🎨 **Header แบบใหม่ (มือถือ)** — รูปผลงานจริงหมุน + 2 ปุ่มขนาดเท่ากันคนละสี (ม่วง/ชมพู) + skeleton ระหว่างโหลด
- 📐 **เทมเพลต responsive** — แก้การ์ด preview ล้นจอมือถือ (template-scroll + canvas ปรับขนาด)
- 📱 **Bottom navbar หลังบ้าน** — แถบล่างเฉพาะ admin (5 เมนูหลัก)
- 💄 **ยกเครื่อง UI หลังบ้าน** — sidebar/stat card/table/ปุ่ม/modal เข้าธีม + responsive
- ↔️ **ระยะห่างหัวข้อหน้าแรก** + ข้อความ "ไม่พบสินค้า" จัดกลาง


## V15 — Production-Ready & Handoff
- 🔐 **Auth ลูกผสม**: login ด้วย Firebase Auth จริง (UI รหัสผ่านช่องเดียวเหมือนเดิม, จำ session ต่อเครื่อง) + fallback ระบบ hash เดิมถ้ายังไม่ตั้งค่า
- 🛡️ **Firestore Rules v2**: เขียน/แก้/ลบต้องเป็นแอดมิน · ลูกค้าสร้างได้เฉพาะออเดอร์/รีวิว pending ที่ validate แล้ว · ค้นออเดอร์ต้องยืนยัน OTP
- 🖼️ **ImgBB ผ่าน Worker proxy** (`/upload`) — API key เก็บเป็น secret ฝั่ง server
- ⚙️ **js/config.js** — รวมการตั้งค่าทั้งระบบไว้ไฟล์เดียว
- 🗂️ **js/categories.js** — หมวดหมู่แหล่งเดียว ใช้ร่วมทุกหน้า
- 🧹 แยก inline script ออกจาก gallery/contact/about → ไฟล์ js
- 💾 **Backup**: ปุ่ม Export/Import JSON ในหลังบ้าน (ตั้งค่า)
- 🛍️ แก้การ์ด "สินค้าที่เกี่ยวข้อง" ให้เป็นการ์ดสมบูรณ์ (เดิมเป็นข้อความเปล่า)
- 📚 เอกสารครบ: USER-MANUAL / DATA-MODEL / HANDOVER / CHANGELOG / .gitignore

## V14 — แก้บัค 12 รายการ
ตัวอย่างงานโหลดทันที+รูปจริง · นับหมวดจริง · เวลาออเดอร์สุ่มสมจริง+Hero รูปจริง · แก้ Footer NaN · เพิ่มหมวดหมู่เอง · Dropdown มือถือ (bottom sheet) · LINE ทุกจุดพร้อมข้อความ · แจ้งส่งรูปทาง LINE · PWA ติดตั้งได้ · ลูกตาในช่องรหัส · Responsive

## V13 / V13.1
Footer component ฉีด CSS เอง + ไอคอน SVG · รูปจริงในตะกร้า · PromptPay การ์ดสไตล์ Thai QR · ลูกตา login · ฟอร์มรูปสินค้าแบบการ์ด · Bottom Navbar · Floating LINE · สั่งสำเร็จ→LINE พร้อมข้อความ · บีบอัดรูปอัตโนมัติ · กันรูปแตก · แบนเนอร์ออฟไลน์ · SEO (robots/sitemap/JSON-LD) · Service Worker (V13.1)

## V12
ติดตามออเดอร์ + OTP SMS · Stepper สถานะ + เลขพัสดุ · หลายรูป/วิดีโอต่อสินค้า · ระบบรีวิว (กรอง+อนุมัติ) · CMS แก้หน้าบ้านจากหลังบ้าน (รวม PromptPay) · เทมเพลตกรอบ PNG ของร้าน

## V6–V11
Admin Dashboard เต็มระบบ · Canvas Preview 6 แบบ · QA audit 25 จุด · ระบบ Loading แบบผสม · แก้บัคสะสม
