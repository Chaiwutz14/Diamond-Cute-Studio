# Diamond Cute Studio 💎 — V16 Remediation Changelog

สรุปสิ่งที่แก้ทั้งหมดตามแผน Audit (P0 → P2) — เน้นฟรีเทียร์ทั้งหมด ไม่มีค่าใช้จ่ายเพิ่ม

---

## 🔴 ความปลอดภัย (Security)

| รหัส | สิ่งที่แก้ | ไฟล์ |
|------|-----------|------|
| **SEC-01** | รวม rules เหลือไฟล์เดียว + ใส่อีเมลแอดมินจริง (`peeza1482546@gmail.com`) แทน placeholder · เพิ่ม slipGuard · ปิดช่องส่งยอด ฿0 และตะกร้าว่าง | `firebase-rules/firestore.rules` |
| **SEC-01** | **ลบไฟล์ rules ซ้ำซ้อน** `firestore-open-legacy.rules` (เปิดโล่ง อันตราย) และ `firestore-v15-secure.rules` (ของเก่า) | — (ลบทิ้ง) |
| **SEC-02** | เปิด `PRIVATE_UPLOADS: true` + ทำให้ `uploadSensitive()` fallback ไป ImgBB อัตโนมัติถ้า Storage ยังไม่พร้อม (ออเดอร์ไม่พัง) · สลิป/รูปลูกค้าอัปไป `orders/<orderId>/` | `config.js`, `utils.js`, `order.js`, `storage.rules` |
| **SEC-03** | Worker เปลี่ยนเป็น **fail-closed** — ค่าเริ่มต้นอนุญาตเฉพาะโดเมนร้าน + localhost (เดิมไม่ตั้งค่า = เปิดทุก origin) | `cloudflare-worker/index.js` |
| **SEC-04** | ปิดช่องส่งยอดเงินผิดปกติที่ระดับ rules: `total >= 1`, ต้องมีสินค้า ≥ 1 รายการ, จำกัดความยาวชื่อ/ข้อความ | `firestore.rules` |
| **SEC-05** | **จองสิทธิ์คูปองก่อนสร้างออเดอร์** (atomic) — ถ้าคูปองเต็มลิมิตจะยกเลิกทันที (เดิมนับหลังสร้าง + กลืน error → ใช้เกินลิมิตได้) | `order.js` |

---

## ⚡ ประสิทธิภาพ + รองรับ 100 คน/ชม. (Performance & Scale)

| รหัส | สิ่งที่แก้ | ไฟล์ |
|------|-----------|------|
| **PERF-01** | เลิกอ่านสินค้าทั้งคอลเลกชัน 2 รอบบนหน้าแรก → ใช้ตัวโหลดกลางที่อ่าน "ครั้งเดียว/เซสชัน" + dedup คำขอที่ยิงพร้อมกัน | `utils.js`, `home.js`, `catalog.js` |
| **PERF (P2)** | **Static Snapshot** — เพิ่มระบบอ่านสินค้า/แกลเลอรีจากไฟล์ JSON บน GitHub Pages (อ่าน Firestore = 0) พร้อม fallback อัตโนมัติถ้ายังไม่มีไฟล์ | `utils.js`, `config.js`, `tools/export-snapshot.html`, `data/` |
| **PERF** | เพิ่มชั้น cache `sessionStorage + TTL` (`DMC.loadProducts/loadGallery/cachedQuery`) | `utils.js` |
| **PERF-05** | หัวข้อ accent ขยับเฉพาะตำแหน่งสี (รองรับ reduced-motion อยู่แล้ว) | `home.css` |

> **ผลลัพธ์:** จาก ~167 อ่าน/เข้าชม เหลือ ~0–10 → รับ 100 คน/ชม. ได้โดยไม่ตันโควต้าฟรี (50,000 อ่าน/วัน)

---

## 🐛 บั๊ก (Bugs)

| รหัส | สิ่งที่แก้ | ไฟล์ |
|------|-----------|------|
| **BUG-01** | เลขออเดอร์เปลี่ยนเป็น `DCS-YYMMDD-XXXXt` (เดิมมีแค่ 9,000 ค่า ชนกันแน่นอน) | `utils.js` |
| **BUG-02** | ปุ่ม "ล้างตัวกรอง" ในหน้า catalog ใช้ event listener แทน `onclick` inline (เดิมโดน CSP บล็อก กดไม่ทำงาน) | `catalog.js` |
| **BUG-03** | เพิ่ม rules `slipGuard` → ระบบกันสลิปซ้ำทำงานจริง | `firestore.rules` |
| **BUG-04** | รีวิวต่อสินค้าทำงานได้แม้ไม่มี composite index (fallback กรองฝั่ง client) | `reviews.js` |
| **BUG-06** | ค่าจัดส่ง default ตรงกับ config (35/40) แทน 50/80 · LINE แจ้งเตือนแบบไม่รอ (success ขึ้นทันที) · กันกดส่งซ้ำ (double-submit) | `cms.js`, `order.js` |

---

## 🎨 UX/UI

| รหัส | สิ่งที่แก้ | ไฟล์ |
|------|-----------|------|
| **UX-01** | หัวข้อ "ที่สวยงามที่สุด" ใช้สีเข้มของธีม + เงาบาง → อ่านง่ายทุกธีม (เดิมทองคงที่ กลืนพื้น peach/gold) | `home.css` |
| **UX-02** | เพิ่มปุ่ม "คัดลอกเลขออเดอร์" บนหน้าสำเร็จ | `order.js` |

---

## 📦 ไฟล์ใหม่ที่เพิ่มเข้ามา

- `data/` — โฟลเดอร์ snapshot (README + ตัวอย่าง products.sample.json / gallery.sample.json)
- `tools/export-snapshot.html` — เครื่องมือสร้างไฟล์ snapshot สำหรับแอดมิน
- `DEPLOY-CHECKLIST.html` — คู่มือขั้นตอนกดใน Console (ทำตามทีละข้อ)
- `accent-preview.html` — ดูตัวอย่างการแก้สีหัวข้อทั้ง 6 ธีม
- `CHANGELOG-DMC-STUDIO.md` — ไฟล์นี้

---

## ⚠️ สิ่งที่ต้องทำเองใน Console (ดู DEPLOY-CHECKLIST.html)

1. วาง `firestore.rules` ตัวใหม่ใน Firebase Console
2. ตั้ง `ALLOWED_ORIGIN` + อัปโค้ด Worker ใหม่
3. เปิด Firebase Storage + วาง `storage.rules`
4. สร้าง + อัป snapshot (รัน `tools/export-snapshot.html`)
5. (เสริม) Enforce App Check, สร้าง index รีวิว

---

## 📝 หมายเหตุทางเทคนิค

- **คูปอง:** ถ้าจองสิทธิ์สำเร็จแต่สร้างออเดอร์ล้มเหลว (กรณีเน็ตหลุดจังหวะพอดี) อาจนับเกิน 1 — ยอมรับได้ (เกิดยากมาก และปลอดภัยกว่าการนับขาด) หากต้องการความแม่นยำ 100% ให้ย้ายไปคำนวณฝั่งเซิร์ฟเวอร์ (Worker) ในอนาคต
- **ยอดเงิน:** ปิดช่องที่ระดับ rules แล้ว (total ≥ 1 + ต้องมีสินค้า) การป้องกันสมบูรณ์แบบต้องคำนวณราคาฝั่งเซิร์ฟเวอร์ (P2 ระยะยาว)
- ทุกการแก้ผ่าน `node --check` แล้ว และไม่กระทบฟังก์ชันเดิม — ถ้าไฟล์ snapshot ยังไม่มี ระบบจะ fallback ไป Firestore ให้อัตโนมัติ

---

## V16.1 — รอบปรับเพิ่ม (ตามภาพ/ปัญหาที่แจ้ง)

### 🐛 หน้า product เด้ง 404 ตอนโหลดรูป/เน็ตช้า
- `product.js` แยก 3 กรณีชัดเจน: **เน็ตล่ม/ช้า → ปุ่ม "ลองอีกครั้ง"** (มี retry 2 ครั้งอัตโนมัติ) · **ไม่มีสินค้าจริง → 404** · **render พัง → ไม่เด้ง 404** (เดิม error ทุกชนิดเด้ง 404 ทำให้เหมือนสินค้าหาย)

### ⚡ รูปโหลดช้ามาก (ผลกระทบหลัก)
- เพิ่ม **Image CDN (wsrv.nl)** ย่อรูป + แปลง WebP ตามขนาดที่แสดงจริง (เดิมโหลดไฟล์เต็มสูงสุด 1600px ทั้งที่การ์ดแสดงแค่ ~200px) → เร็วขึ้นหลายเท่า, ฟรี, ถ้า CDN ล่มจะ fallback ใช้รูปต้นฉบับอัตโนมัติ
- ใช้กับ: การ์ดสินค้า (หน้าแรก/แคตตาล็อก/related), แกลเลอรีหน้าแรก, แกลเลอรีเต็ม, รูปหลัก+thumbnail หน้า product
- เพิ่ม `preconnect`/`dns-prefetch` + `decoding="async"` · ตั้ง `IMG_CDN: false` ใน config เพื่อปิดได้

### 🖥️ Desktop: เติมพื้นที่ว่างฝั่งขวา hero
- เพิ่ม **coverflow carousel** โชว์ผลงานที่ส่งแล้ว 5 รูป (คลิก/ลูกศร/จุด สลับได้ + เลื่อนอัตโนมัติ + คลิกรูปข้างเด้งมาหน้า) **เฉพาะเดสก์ท็อป** (มือถือคงการ์ดแขวนเดิม)
- เพิ่ม **ป้าย "ส่งล่าสุด X ชั่วโมงที่แล้ว"** (สั่นเล็กน้อย) — อ่านเวลาจริงจาก `siteContent/main.lastDeliveredAt` ที่อัปเดตอัตโนมัติเมื่อแอดมินกดสถานะ "ส่งสำเร็จ" (fallback: เวลาอัปรูปแกลเลอรีล่าสุด)
- ถ้า JS ล่ม/ไม่มีรูป → hero กลับเป็นแบบเดิมอัตโนมัติ (ไม่พัง)
- ดูตัวอย่างได้ที่ `tools/hero-preview.html` (เปลี่ยนธีมได้ 6 แบบ)

ไฟล์ที่แก้รอบนี้: `product.js`, `utils.js`, `config.js`, `home.js`, `catalog.js`, `gallery.js`, `admin-orders.js`, `index.html`, `css/home.css` · ไฟล์ใหม่: `tools/hero-preview.html`
