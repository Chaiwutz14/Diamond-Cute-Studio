# CHANGELOG — Diamond Cute Studio

> เรียงจากใหม่ไปเก่า (V24 = ล่าสุด, V1 = เริ่มต้น)

---

## V24 — Audit Remediation (ปิดช่องราคา + ลดน้ำหนัก + ขัดเงา UX)

ทำตามแผน Audit 2026 (P0→P3) — เน้น "เปิดสวิตช์ที่เตรียมไว้ + ลดน้ำหนักหน้าเว็บ + ขัดเงา UX" โดยไม่รื้อระบบ ทุกอย่างยังอยู่บนฟรีเทียร์ และมี fallback กันพังทุกจุด

### ความปลอดภัย
| รหัส | สิ่งที่ทำ | ระดับ | ไฟล์ |
|------|-----------|-------|------|
| **SEC-A** | เปิด `SERVER_ORDER:{enabled:true}` — ปิดช่องสั่ง ฿1. "ออกฤทธิ์จริง" เมื่อตั้ง secret `GCP_SERVICE_ACCOUNT`+`PRODUCTS_SNAPSHOT_URL` ใน Worker (ยังไม่ตั้ง = Worker ตอบ fallback หน้าเว็บเขียนตรงเหมือนเดิม ไม่พัง) | High | config.js |
| **SEC-A+** | เสริมความถูกต้องราคาฝั่งลูกค้า: ตะกร้าเตือน + ปุ่ม "อัปเดตราคา" เมื่อราคาต่างจากแคตตาล็อกล่าสุด | High | order.js |
| **SEC-B** | กันสแปม `/upload`: ลด rate limit 30→20/10นาที + เพิ่ม Turnstile แบบ flag-gated (ปิดไว้ ตั้ง `TURNSTILE_SECRET` เพื่อเปิด) | Med | cloudflare-worker/index.js, config.js |
| **SEC-C** | กันซอร์สหลังบ้าน/เอกสารภายในหลุดเว็บ: deploy ลบ `cloudflare-worker/`, `firebase-rules/`, `*.md` | Med | .github/workflows/deploy.yml |

### ประสิทธิภาพ / ความลื่นไหล
| รหัส | สิ่งที่ทำ | ไฟล์ |
|------|-----------|------|
| **PERF-A** | ฟอนต์ 10→7 น้ำหนัก (Kanit 400;600;700;800 + Sarabun 400;600;700) · รวม themes+loading+main → `core.css` (ลด 3 คำขอ/หน้า) | ทุก *.html, css/core.css, sw.js |
| **PERF-B** | หน้าแรกไม่บังคับโหลด Firebase: ตัด `await getFirebaseReady()` ก่อนสินค้า (อ่าน snapshot ตรง) + รีวิว/CMS อ่านจาก snapshot (`reviews.json`/`sitecontent.json`) fallback Firestore | home.js, utils.js, cms.js, admin-snapshot.js |
| **PERF-B** | jsQR (256KB) โหลดแบบ lazy เฉพาะตอนสแกนสลิป (เดิมโหลดทุกครั้งที่เปิดตะกร้า) | slip-verify.js, cart.html, sw.js |

### บั๊ก
| รหัส | สิ่งที่แก้ | ไฟล์ |
|------|-----------|------|
| **BUG-A** | publish snapshot ปุ่มเดียว (มี path แล้ว) + เพิ่มป้าย "เผยแพร่ล่าสุดเมื่อ..." + snapshot ครอบ reviews/sitecontent | admin-snapshot.js |
| **BUG-B/C** | atomicity คูปอง — ออเดอร์ล้มหลังจองคูปอง → คืน `usedCount -1` อัตโนมัติ (กันคูปองหายฟรี) | order.js |

### UX (เล็กแต่ได้ใจ)
- **ทางเข้าแอดมิน:** ยกเลิกแตะโลโก้ 5 ครั้ง + Ctrl+Shift+A (กดโดนเอง) — คงไอคอนเฟือง ⚙ ที่ Footer ไว้ตามเดิม (admin-access.js)
- **คำในปุ่มสม่ำเสมอ:** ปุ่ม "ยืนยันออเดอร์" → หน้าสำเร็จ "ยืนยันออเดอร์สำเร็จแล้ว!" (cart.html)
- **ความเชื่อมั่นเรื่องราคา:** Footer แสดง "อัปเดตแคตตาล็อกล่าสุด..." จากเวลา snapshot (footer.js)

**ยังไม่เปิด (รอเจ้าของตั้ง secret/นโยบาย):** Server Order (ตั้ง GCP service account), Turnstile (ตั้ง keys), publish อัตโนมัติ (ตั้ง GITHUB_TOKEN), API ตรวจสลิป, Storage private — ดูขั้นตอนใน HANDOVER.md

**ต้องทำหลัง deploy:** ① กด "เผยแพร่ snapshot" 1 ครั้งเพื่อสร้าง `reviews.json`/`sitecontent.json` (หน้าแรกถึงจะไม่โหลด Firebase) ② ตั้ง Cloudflare Rate Limiting Rules (ดู HANDOVER.md) ③ ยืนยัน composite index deploy แล้ว

---

## V23 — Audit Fixes (แก้บั๊ก + ปรับปรุงตาม Audit Report)

แก้เฉพาะ "โค้ดจริง" ที่เป็นบั๊ก/ปัญหา — **ข้าม** ส่วนที่รอเปิดสวิตช์ (Server Order, App Check deploy, API สลิป, Storage private)

| รหัส | สิ่งที่แก้ | ระดับ | ไฟล์ |
|------|-----------|-------|------|
| **BUG-01** | ลิสต์ออเดอร์ใบใหม่หายเมื่อเกิน 150 ใบ — เดิม .limit(150) ไม่มี orderBy, Firestore คืนใบแรกตาม docId ไม่ใช่ล่าสุด. แก้: orderBy('createdAt','desc') + pagination (โหลดเพิ่ม) + fallback client-sort ถ้าไม่มี composite index | High | admin-orders.js, admin-overview.js |
| **BUG-02** | แดชบอร์ดอ่านออเดอร์ทั้งคอลเลกชันทุกครั้ง, ต้นทุนโตไม่จำกัด. แก้: count() aggregation + อ่านเฉพาะเดือนนี้สำหรับรายได้. fallback วิธีเดิมถ้า count() มีปัญหา | High | admin-overview.js |
| **PERF-03** | หมวดหมู่ไม่ได้เข้า snapshot/cache, อ่าน Firestore ตรงทุกหน้า. แก้: เพิ่ม DMC.loadCategoriesRaw() (snapshot, cache, Firestore) + snapshot ออก categories.json เพิ่ม | Med | utils.js, home.js, categories.js, admin-snapshot.js |
| **BUG-05** | เลขออเดอร์ซ้ำง่าย (สุ่มแค่ 4 หลัก = 9,000 ค่า). แก้: วินาทีในวัน(base36) + สุ่ม 3 ตัว, ชนกัน 1 ใน 4 พันล้าน เช่น DCS-260625-LMN4QK | Low | utils.js |
| **SEC-06** | Storage rules อนุญาตอัปโหลดโดยไม่ผ่านแอป. แก้: เพิ่ม request.app != null (App Check) — มีผลเมื่อเปิด Storage ในอนาคต | Med | storage.rules |
| **Future-bug** | Worker เขียนออเดอร์ไม่มี createdAt timestamp, ถ้าเปิด server-order ออเดอร์จะไม่ขึ้นในมุมมอง orderBy. แก้: เพิ่ม createdAt จริง + รองรับ Date to timestampValue ใน converter | — | cloudflare-worker/index.js |
| **UX/a11y** | คอนทราสต์ --text-3 ทั้ง 6 ธีม (WCAG AA) — 5 ธีมสว่างเข้มขึ้น, midnight สว่างขึ้น (เดิม ~3.75 ตก, ~5.7 ผ่าน). aria-label ปุ่มไอคอนล้วน + ช่อง placeholder-only | Med | themes.css, product.html, gallery.html, catalog.html, cart.html, admin-orders.js |

**ไฟล์ใหม่:** firestore.indexes.json — composite index orders (status ASC + createdAt DESC). ถ้ายังไม่ deploy โค้ด fallback อัตโนมัติ

**ยังไม่เปิด (รอเปิดเอง):** SEC-01 Server Order, SEC-02 App Check enforce, SEC-04 API สลิป, SEC-03 Storage private

---

## V22 — Image CDN + แก้ 404 + Desktop Hero

### หน้า product เด้ง 404 ตอนโหลดรูป/เน็ตช้า
- product.js แยก 3 กรณี: เน็ตล่ม/ช้า = ปุ่ม "ลองอีกครั้ง" (retry 2 ครั้งอัตโนมัติ), ไม่มีสินค้าจริง = 404, render พัง = ไม่เด้ง 404

### Image CDN (wsrv.nl) ลดขนาดรูป + แปลง WebP
- ย่อรูปตามขนาดที่แสดงจริง (เดิมโหลด 1600px ทั้งที่การ์ดแสดง ~200px), เร็วขึ้นหลายเท่า, ฟรี, fallback รูปต้นฉบับอัตโนมัติ
- ใช้กับ: การ์ดสินค้า, แกลเลอรี, รูปหลัก+thumbnail. เพิ่ม preconnect/dns-prefetch. ปิดได้ด้วย IMG_CDN: false

### Desktop Hero: Coverflow Carousel
- เพิ่ม coverflow carousel โชว์ผลงาน 5 รูป (คลิก/ลูกศร/จุด + เลื่อนอัตโนมัติ) เฉพาะเดสก์ท็อป (มือถือคงการ์ดแขวนเดิม)
- ป้าย "ส่งล่าสุด X ชั่วโมงที่แล้ว" อ่านเวลาจริงจาก Firestore. fallback ถ้าไม่มีรูป

ไฟล์: product.js, utils.js, config.js, home.js, catalog.js, gallery.js, admin-orders.js, index.html, home.css. ใหม่: _dev/hero-preview.html

---

## V21 — อุดช่องโหว่ + ปรับประสิทธิภาพตามแผน Audit (P0 ถึง P2)

### ความปลอดภัย
| รหัส | สิ่งที่แก้ | ไฟล์ |
|------|-----------|------|
| SEC-01 | รวม rules เหลือไฟล์เดียว + ใส่อีเมลแอดมินจริง. เพิ่ม slipGuard. ปิดช่อง 0 บาท + ตะกร้าว่าง. ลบ rules ซ้ำซ้อน | firestore.rules |
| SEC-02 | เปิด PRIVATE_UPLOADS: true + fallback ImgBB อัตโนมัติถ้า Storage ยังไม่พร้อม | config.js, utils.js, order.js, storage.rules |
| SEC-03 | Worker เปลี่ยนเป็น fail-closed — อนุญาตเฉพาะโดเมนร้าน + localhost | cloudflare-worker/index.js |
| SEC-04 | ปิดช่องยอดเงินผิดปกติที่ระดับ rules: total >= 1, สินค้า >= 1, จำกัดความยาว | firestore.rules |
| SEC-05 | จองสิทธิ์คูปองก่อนสร้างออเดอร์ (atomic) — กันใช้เกินลิมิต | order.js |

### ประสิทธิภาพ (รองรับ 100 คน/ชม.)
| รหัส | สิ่งที่แก้ | ไฟล์ |
|------|-----------|------|
| PERF-01 | เลิกอ่านสินค้าทั้งคอลเลกชัน 2 รอบ, ตัวโหลดกลางอ่าน "ครั้งเดียว/เซสชัน" + dedup | utils.js, home.js, catalog.js |
| PERF (P2) | Static Snapshot — สินค้า/แกลเลอรีอ่านจาก JSON บน GitHub Pages (Firestore = 0) + fallback อัตโนมัติ | utils.js, config.js, _dev/export-snapshot.html, data/ |
| PERF | เพิ่มชั้น cache sessionStorage + TTL (DMC.loadProducts/loadGallery/cachedQuery) | utils.js |

ผลลัพธ์: จาก ~167 อ่าน/เข้าชม เหลือ ~0-10, รับ 100 คน/ชม. โดยไม่ตันโควต้าฟรี (50,000 อ่าน/วัน)

### บั๊ก
| รหัส | สิ่งที่แก้ | ไฟล์ |
|------|-----------|------|
| BUG-01 | เลขออเดอร์เปลี่ยนเป็น DCS-YYMMDD-XXXXt (เดิม 9,000 ค่า ชนกันแน่) | utils.js |
| BUG-02 | ปุ่ม "ล้างตัวกรอง" ใช้ event listener แทน onclick inline (เดิมโดน CSP บล็อก) | catalog.js |
| BUG-03 | เพิ่ม rules slipGuard, ระบบกันสลิปซ้ำทำงานจริง | firestore.rules |
| BUG-04 | รีวิวต่อสินค้าทำงานได้แม้ไม่มี composite index (fallback client) | reviews.js |
| BUG-06 | ค่าจัดส่ง default ตรง config (35/40). LINE แจ้งเตือนไม่รอ. กันกดส่งซ้ำ | cms.js, order.js |

### UX
- หัวข้อ "ที่สวยงามที่สุด" ใช้สีเข้มของธีม + เงาบาง, อ่านง่ายทุกธีม (home.css)
- เพิ่มปุ่ม "คัดลอกเลขออเดอร์" บนหน้าสำเร็จ (order.js)

---

## V20 — ย้ายที่เก็บสลิป + ตรวจสลิปอัตโนมัติ
- ย้ายสลิป/รูปลูกค้าไป ImgBB — ไม่ต้องเปิด Storage (ฟรี > private). trade-off: URL สาธารณะ
- ตรวจสลิปอัตโนมัติ 2 ชั้น: ชั้นฟรี (เบราว์เซอร์) jsQR อ่าน QR เช็กสลิปจริง + กันซ้ำผ่าน slipGuard. ชั้น API (ปิดไว้) Worker /verify-slip ตรวจกับธนาคารจริง — เปิดเมื่อตั้ง SLIP_VERIFY_KEY
- ไม่ผ่าน = เตือนแต่ยังสั่งได้ + ติดธงแอดมิน. สถานะใต้สลิป + badge ในลิสต์/โมดอล/LINE
- เพิ่ม SLIP_VERIFY ใน config, rule slipGuard ใน firestore.rules
- ทดสอบ 10 เคสผ่านหมด

---

## V19 — Redesign หน้าแรก (Hero สายรูปจาง + พื้นหลังตามธีม)
- Hero กลืนเป็นแผ่นเดียวกับพื้นหลัง — ถอดการ์ดขอบมน ใช้พื้นหลังโปร่ง
- สายห้อยรูปแบบราวแขวนรูป (photo-garland) — SVG เวกเตอร์เอง 100% ปลอดลิขสิทธิ์ วางจางๆ หลังข้อความ
- สายแขวนขยับเบาๆ — อนิเมชัน gdSway (แกว่ง +-2.8 องศา, คาบ 4.2-5.6s)
- พื้นหลัง hero ผูกกับธีม
- คงเอฟเฟกต์เดิมครบ (ลูกโป่ง, แสงปาด, ดาววิบวับ, ปุ่มแสงวิ่ง)
- แก้บรรทัด "ที่สวยงามที่สุด" v2 — Gold Foil gradient ตัดกับทุกธีม
- prefers-reduced-motion ปิดอนิเมชันรวม gdSway
- ทดสอบ 6 ธีม + มือถือ: pixel verification ผ่านหมด

---

## V18 — แก้ 4 จุด (หน้าติดตาม + จัดการหมวด + หน้าแรก fix 8 + รายละเอียดสินค้า)
- หน้าติดตามออเดอร์ ใช้ calc(--nav-h + 1.5rem), หัวข้อไม่ถูก navbar บัง
- จัดการหมวดหมู่ — เพิ่ม "จัดการหมวดหมู่ที่เพิ่มเอง..." ใน dropdown, modal ลบหมวด custom + ป้องกัน built-in
- หน้าแรก 8 รายการถาวร — ใช้ BUILTIN เท่านั้น (7 built-in + "ทั้งหมด")
- รายละเอียดเพิ่มเติม — textarea 500 ตัวอักษร, เก็บใน cart customDetails, แสดงในตะกร้า/LINE/หลังบ้าน

---

## V17 — เก็บกวาด Console warnings
- ลบ frame-ancestors ออกจาก meta CSP (browser ignore อยู่แล้ว)
- เพิ่ม gstatic.com ใน connect-src. เพิ่ม mobile-web-app-capable meta
- ลบ _db.settings({cacheSizeBytes}), เลิก warning "overriding host"

---

## V16 — คูปองเช็กจากเบอร์โทร (ลูกค้าใหม่ / 1 เบอร์ครั้งเดียว)
- firstOrderOnly — เบอร์เคยสั่ง ใช้ไม่ได้
- oncePerPhone — เบอร์เดิมใช้คูปองนี้ซ้ำไม่ได้
- ใช้ collection couponGuard (marker เบอร์+โค้ด ไม่มีข้อมูลส่วนตัว), เช็กข้ามเบราว์เซอร์/Incognito ได้
- ทดสอบ 11 scenario ผ่านหมด. ต้อง deploy firestore.rules ใหม่

---

## V15 — แก้ 6 บั๊ก/UX แอดมิน + แตกไฟล์ admin.js
- Dropdown + ยืนยันตามธีม — data-custom select + DMC.confirm() modal แทน confirm() 7 จุด
- ปุ่มบันทึกไม่ถูก bottom-nav บัง — modal z-index 800 เป็น 9400
- แก้เนื้อหาได้ทั้งหน้าเว็บ — เติม data-edit 32 จุด (รวม 35 จุดแก้ได้)
- แถบแอดมินไม่บังส่วนบน — วัดความสูงจริง แล้วดัน navbar/เนื้อหา/drawer ลง
- ปุ่ม "แก้ไข" สินค้าใช้งานได้ — แปลง 13 handler เป็น event delegation (ปลอดภัย CSP)
- แตก admin.js (2,310 บรรทัด) เป็น 11 โมดูล — ไฟล์ใหญ่สุดเหลือ 468 บรรทัด

---

## V14 — LINE Flex card โฉมใหม่ "Vibrant Cute หลายโทน"
- ออกแบบการ์ดแจ้งเตือนใหม่ — สไตล์ Vibrant Cute: หัวไล่สี gradient, กล่องยอดรวม, การ์ดพาสเทล 2 คอลัมน์
- 8 พาเลตหมุนเวียน — ออเดอร์ติดกันคนละโทน (pickPalette ตามเลขออเดอร์)

---

## V13 — คูปอง + แถบประกาศ + แก้ empty-state
- ระบบคูปองส่วนลด — collection coupons, validate ครบ (active/ช่วงเวลา/minSpend/usageLimit/maxDiscount), atomic transaction กันเกินลิมิต. ทดสอบ 9/9 scenarios
- ค่าส่ง/ค่าธรรมเนียม แก้ได้จากหลังบ้าน (siteContent/main.fees)
- แถบประกาศด่วน — หลังบ้านเปิด/ปิด+พิมพ์ข้อความ, แสดงบนสุดทุกหน้า
- empty-state "ไม่พบสินค้า" จัดกึ่งกลาง + แก้สีที่ผิด

---

## V12 — อนิเมชัน Hero + ลูกเล่นพาดหัว + แก้ Responsive เทมเพลต
- อนิเมชัน Hero 6 ชั้น — ไล่สีหายใจ, วงกลมลอย, แสงกวาด, ประกายวิบวับ, badge เต้น, ปุ่มประกายวิ่ง
- "ที่สวยงามที่สุด" ทองเรืองแสง + เคารพ prefers-reduced-motion
- Canvas/Preview ล้นจอมือถือ — แก้ .detail-info ไม่มี min-width:0 + overflow-wrap:anywhere
- จำลอง Preview Tool จริง: 7 เทมเพลต x มือถือ/เดสก์ท็อป overflow = 0

---

## V11 — หน้าแรกโฉมใหม่ (Direction B Bright Premium)
- Hero การ์ดไล่สีพรีเมียม + ตัวแปร --hg1/--hg2/--hglow/--soft ต่อธีม
- service chips, แถบผลงานจริง (gallery strip), promo/รีวิว/features จัดโทนใหม่
- Responsive มือถือ ถึง เดสก์ท็อป (chips/products 4 คอลัมน์) + ฟอนต์ Kanit
- คงทุกฟังก์ชัน + Firebase จริง (CMS, หมวดหมู่, สินค้าแนะนำ, รีวิว, ตะกร้า, navbar/footer, theme switcher, PWA)
- ลบ dead code: particle canvas, hero carousel/showcase, float badge

---

## V10 — อุดช่องโหว่ความปลอดภัย
- Auth boundary ใหม่ — session ปลอมใน Console ไม่ได้อีก
- CSP + security headers ทุกหน้า + frame-buster + ย้าย inline script เป็นไฟล์
- ลบ ImgBB key ออกจากหน้าเว็บ (อัปผ่าน Worker เท่านั้น)
- escapeHtml แข็งขึ้น (escape single-quote และ backtick)
- Panel ความปลอดภัยในหลังบ้านแสดงสถานะจริง
- โค้ด App Check + storage.rules พร้อมเปิด

---

## V9 — ยกระดับ UX/UI

### Polish gap
- --hero-grad*, --accent-rgb, --text-3 ผ่าน WCAG AA ทั้ง 6 ธีม, iOS no-zoom (input 16px), touch target 44px

### Conversion and a11y
- Canvas Preview ปุ่ม "ใช้แบบนี้ในออเดอร์" แนบแบบเข้าออเดอร์จริง
- แถบสั่งซื้อลอยล่างจอบนมือถือ. แจ้งค่าส่งตั้งแต่หน้าสินค้า
- Inline validation เรียลไทม์. ผูก label กับ input ทุกช่อง

### Performance and Design debt
- ฟอนต์ preconnect + link (ไม่บล็อกการเรนเดอร์) + subset. ลบ dead carousel code. นิยามตัวแปร CSS ที่ขาด

---

## V8 — เก็บบั๊ก + อุดช่องโหว่ (Code Audit Fixes)

### บั๊กร้ายแรง
- รูปงานลูกค้าถูกอัปจริง — เดิมหน้าตะกร้าแค่โชว์ preview แต่ไม่เคยอัป (order.js)
- เตรียม Firebase Auth ปิดช่องโหว่ฐานข้อมูลเปิดโล่ง

### กระทบของจริง
- สินค้าแนะนำหน้าแรกเลิกพึ่ง composite index. แก้ URL ปุ่มซ้ำ + multicast
- คูปอง % คิดสดทุกครั้ง. ล้างช่องแล้วค่าหายจริง + ซ่อนช่องทางที่ยังไม่ตั้ง

### ประสิทธิภาพ
- Hero ตัด initHeroCarousel() ซ้ำ + แก้ timer รั่ว. KPI หลังบ้านดึง orders ครั้งเดียว (เดิม 3 query)
- อัปรูป fallback proxy ไป ImgBB ตรง + Worker proxy ซ่อน key

### รายละเอียด/SEO
- ตัด toast ซ้ำ. og-image ใหม่ + OG/Twitter meta. เลิกกุเวลาออเดอร์ปลอม
- particle เคารพ reduced-motion. SW precache ครบ

---

## V7 — ชำระเงินหลายช่องทาง + แก้เนื้อหา inline
- ระบบชำระเงินหลายช่องทาง — PromptPay, COD, TrueMoney, บัตรเครดิต (2 ตัวหลัง "เร็วๆ นี้")
- หลังบ้านจัดการช่องทางได้ — เปิด/ปิด + ตั้งสถานะพร้อม/ไม่พร้อมรายช่องทาง
- แก้เนื้อหา inline บนหน้าบ้าน — ไอคอนดินสอตรงข้อความจริง กดแก้ บันทึกเข้า Firestore
- แถบโหมดแอดมิน — แสดงบนหน้าบ้านเมื่อ login: ปุ่มไปหลังบ้าน / ออกจากโหมด

---

## V6 — แก้บัค 7 + Header ใหม่
- เลือกหมวดแล้วไม่พบสินค้า — แก้การเทียบ slug กับ ชื่อไทย ผ่าน DMCCat.matches
- Hero showcase ไม่ลบป้ายออเดอร์ล่าสุด + รูป fallback สวยงาม
- Header แบบใหม่ (มือถือ) — รูปผลงานจริงหมุน + 2 ปุ่มขนาดเท่ากัน + skeleton
- เทมเพลต responsive. Bottom navbar หลังบ้าน. ยกเครื่อง UI หลังบ้าน

---

## V5 — Production-Ready and Handoff
- Auth ลูกผสม — Firebase Auth จริง (UI รหัสผ่านช่องเดียว, จำ session) + fallback hash เดิม
- Firestore Rules v2 — เขียน/แก้/ลบต้องเป็นแอดมิน. ลูกค้าสร้างได้เฉพาะออเดอร์/รีวิว + validate
- ImgBB ผ่าน Worker proxy. config.js รวมการตั้งค่าไฟล์เดียว. categories.js แหล่งเดียว
- Backup ปุ่ม Export/Import JSON. แก้การ์ดสินค้าที่เกี่ยวข้อง
- เอกสาร: USER-MANUAL / DATA-MODEL / HANDOVER / CHANGELOG / .gitignore

---

## V4 — แก้บัค 12 รายการ
ตัวอย่างงานโหลดทันที+รูปจริง. นับหมวดจริง. เวลาออเดอร์สุ่มสมจริง+Hero รูปจริง. แก้ Footer NaN. เพิ่มหมวดหมู่เอง. Dropdown มือถือ (bottom sheet). LINE ทุกจุดพร้อมข้อความ. แจ้งส่งรูปทาง LINE. PWA ติดตั้งได้. ลูกตาในช่องรหัส. Responsive

---

## V3 — Footer + PromptPay + PWA + SEO
Footer component CSS + ไอคอน SVG. รูปจริงในตะกร้า. PromptPay การ์ดสไตล์ Thai QR. ลูกตา login. ฟอร์มรูปสินค้าแบบการ์ด. Bottom Navbar. Floating LINE. สั่งสำเร็จ ไป LINE. บีบอัดรูปอัตโนมัติ. กันรูปแตก. แบนเนอร์ออฟไลน์. SEO (robots/sitemap/JSON-LD). Service Worker

---

## V2 — ติดตามออเดอร์ + รีวิว + CMS + เทมเพลต
ติดตามออเดอร์ + OTP SMS. Stepper สถานะ + เลขพัสดุ. หลายรูป/วิดีโอต่อสินค้า. ระบบรีวิว (กรอง+อนุมัติ). CMS แก้หน้าบ้านจากหลังบ้าน. เทมเพลตกรอบ PNG ของร้าน

---

## V1 — ฐานระบบ (Admin Dashboard + Canvas Preview + Loading)
Admin Dashboard เต็มระบบ. Canvas Preview 6 แบบ. QA audit 25 จุด. ระบบ Loading แบบผสม. แก้บัคสะสม
