# 🚀 UPGRADE — Diamond Cute Studio · V.upgrade1

อัปเกรดนี้แก้บั๊กและช่องโหว่ที่พบจากการตรวจสอบโค้ดทั้งระบบ
แบ่งเป็น **(A) แก้ในโค้ดให้แล้ว — อัปไฟล์ทับได้เลย** และ **(B) ต้องตั้งค่าเองด้วย**

---

## 🅰️ ส่วนที่แก้ในโค้ดให้แล้ว (อัปไฟล์ทับขึ้น GitHub ได้เลย)

| # | ระดับ | เรื่อง | ไฟล์ที่แก้ |
|---|-------|--------|-----------|
| P0-1 | 🔴 | **รูปงานลูกค้าถูกอัปจริง + แนบกับออเดอร์** (เดิมหายทั้งหมด) | `js/order.js` |
| P1-1 | 🟠 | สินค้าแนะนำหน้าแรกไม่ต้องใช้ composite index (เดิมเด้งไปโชว์สินค้า demo) | `js/home.js` |
| P1-2 | 🟠 | Worker: แก้ URL ปุ่มซ้ำ `https://` + ส่งหลาย LINE ID ด้วย multicast | `cloudflare-worker/index.js` |
| P1-3 | 🟠 | คูปองส่วนลดเก็บเป็น % คิดสด (เดิมยอดเพี้ยนเมื่อแก้ตะกร้าทีหลัง) | `js/order.js` |
| P1-4 | 🟠 | ล้างค่าในหลังบ้านแล้วไม่เด้งกลับลิงก์ตัวอย่าง + ซ่อนช่องทางที่ยังไม่ตั้งค่า | `js/cms.js`, `js/footer.js`, `js/bottom-nav.js` |
| P2 | 🟡 | ตัด `initHeroCarousel()` ที่เรียกซ้ำ + แก้ carousel/showcase ชนกัน | `js/home.js` |
| P2 | 🟡 | แก้ `loadCategories`/`loadCategoryCounts` เขียนทับกัน | `js/home.js` |
| P2 | 🟡 | KPI หลังบ้านดึง orders ครั้งเดียว (เดิม 3 query → ประหยัด Firestore reads) | `js/admin.js` |
| P2 | 🟡 | อัปรูป fallback proxy→ImgBB ตรง (เปิด proxy แล้วอัปไม่พัง) | `js/utils.js` |
| P2 | 🟡 | เปิดใช้ upload proxy ผ่าน Worker (ซ่อน ImgBB key) | `js/config.js` |
| P2 | 🟡 | เตือนชัดเมื่ออัปสลิป/รูปบางส่วนไม่สำเร็จ (เดิมเงียบ) | `js/order.js` |
| P3 | 🟢 | ตัด toast ซ้ำตอนกดเพิ่มลงตะกร้าในหน้าสินค้า | `js/product.js` |
| P3 | 🟢 | สร้าง `assets/og-image.jpg` ใหม่ (เดิมไฟล์หาย → preview ตอนแชร์พัง) + OG meta หน้าแรก | `assets/`, `index.html` |
| P3 | 🟢 | เลิกกุ "ออเดอร์ล่าสุด X นาทีที่แล้ว" → ข้อความจริงเสมอ | `js/home.js`, `index.html` |
| P3 | 🟢 | particle เคารพ prefers-reduced-motion + หยุดเมื่อ hero พ้นจอ | `js/home.js` |
| P3 | 🟢 | แถบโหลดหน้า catalog ไม่ค้าง | `js/catalog.js` |
| P3 | 🟢 | `saveCart` เขียน storage ก่อนแจ้ง event | `js/utils.js` |
| P3 | 🟢 | สีแถบเบราว์เซอร์ (theme-color) ตรงตามธีมที่เลือก | `js/theme-init.js`, `js/theme-switcher.js` |
| P3 | 🟢 | Service Worker precache ครบ + bump version (`dcs-v15-upgrade1`) | `sw.js` |

> วิธีอัป: เปิด GitHub repo → อัปไฟล์ในตารางทับของเดิม → commit
> Service Worker จะแจ้ง "✨ มีเวอร์ชันใหม่" ให้ลูกค้ากดอัปเดตเอง

---

## 🅱️ ส่วนที่ต้องตั้งค่าเองด้วย (สำคัญมาก)

### 1) 🔴 P0-2 — ปิดช่องโหว่ฐานข้อมูล (ทำก่อนโปรโมตเว็บ)

**ปัญหา:** ระบบ login แอดมินใช้ hash ฝั่งเบราว์เซอร์อย่างเดียว ไม่ผูกกับ Firebase Auth →
ถ้าใช้กฎ "secure" แอดมินจะเขียนข้อมูลไม่ได้ → จึงจำเป็นต้องใช้กฎ "เปิดโล่ง" (`allow read, write: if true`) =
**ใครก็อ่านข้อมูลลูกค้า (ชื่อ/เบอร์/ที่อยู่/สลิป) และแก้/ลบข้อมูลทั้งหมดได้** (เสี่ยง PDPA)

**โค้ดรองรับครบแล้ว** เหลือทำ 4 ขั้น:

1. **Firebase Console → Authentication → Sign-in method → เปิด Email/Password**
2. แท็บ **Users → Add user** → ใส่อีเมล + รหัสผ่านแอดมิน (เก็บไว้ดีๆ)
3. เปิด `js/config.js` ใส่อีเมลนั้น:
   ```js
   ADMIN_EMAIL: 'youradmin@email.com',
   ```
4. **Firebase Console → Firestore → Rules** → วางเนื้อหาจาก `firebase-rules/firestore.rules`
   แล้วแก้อีเมลในฟังก์ชัน `isAdmin()` ให้ตรงกับข้อ 3:
   ```
   request.auth.token.email == 'youradmin@email.com'
   ```
   → กด **Publish**

**ผลลัพธ์:** หน้า login จะ sign-in กับ Firebase Auth จริง → แอดมินเขียนได้ · คนนอกอ่าน/เขียน database ไม่ได้
และ **เปลี่ยนรหัสผ่านได้ที่ Firebase Console** (ไม่ต้องแก้โค้ดอีก)

> ระหว่างที่ยังไม่ตั้ง `ADMIN_EMAIL` ระบบจะใช้โหมด hash เดิมต่อได้ (เว็บไม่ล่ม) แต่ database ยัง "เปิดโล่ง" อยู่ — จึงควรรีบทำขั้นบนนี้

---

### 2) 🟠 P1-2 / P2 — ตั้งค่า Cloudflare Worker

ที่ **Cloudflare Dashboard → Workers → dmc-studio-notify → Settings → Variables and Secrets**
ตรวจ/เพิ่ม secrets:

| Secret | ค่า | จำเป็น |
|--------|-----|--------|
| `LINE_TOKEN` | Channel Access Token | ✅ |
| `LINE_USER_ID` | User ID (ขึ้นต้น `U…`) — **หลายคนคั่นด้วย `,`** ระบบใช้ multicast ให้เอง | ✅ |
| `IMGBB_KEY` | ImgBB API key | ✅ (เพื่อให้ proxy `/upload` ซ่อน key) |
| `ALLOWED_ORIGIN` | `https://chaiwutz14.github.io` | ⬜ (ออปชัน — กันคนนอกยิง Worker) |

แล้ว **deploy โค้ด Worker ใหม่** (`cloudflare-worker/index.js`) ที่แก้ `https://https` + multicast แล้ว

> ⚠️ ถ้ายังไม่ตั้ง `IMGBB_KEY` ใน Worker — ระบบจะ fallback ไปอัป ImgBB ตรงให้อัตโนมัติ (อัปไม่พัง แต่ key จะเปิดในหน้าเว็บเหมือนเดิม)

---

### 3) 🟠 P1-1 — (ถ้ายังอยากใช้ index) สร้าง Firestore Index

อัปเกรดนี้ทำให้ **ไม่จำเป็นต้องสร้าง index แล้ว** (จัดอันดับ featured ฝั่ง client)
ถ้าในอนาคตอยากกลับไปใช้ `orderBy` ฝั่ง server ค่อยสร้าง composite index: `products` → `active` ASC, `featured` DESC

---

## ✅ เช็กลิสต์หลังอัป

- [ ] อัปไฟล์ในตาราง 🅰️ ขึ้น GitHub แล้ว
- [ ] ลองสั่งซื้อทดสอบ 1 ออเดอร์ → **แนบรูป 2-3 รูป** → เช็กในหลังบ้านว่าออเดอร์มีรูปครบ
- [ ] กด "🔔 ทดสอบ LINE" ในหลังบ้าน → ได้การ์ด + ปุ่ม "จัดการออเดอร์" กดได้ (ไม่ใช่ลิงก์พัง)
- [ ] ตั้ง Firebase Auth + deploy `firestore.rules` (ข้อ B-1)
- [ ] เปิดเว็บในมือถือ → แชร์ลิงก์ลง LINE → เห็นรูป preview
- [ ] เข้าหลังบ้าน → เมนูเนื้อหาเว็บไซต์ → กรอกช่องทางติดต่อจริง (LINE/FB/IG/TikTok)

— Diamond Cute Studio 💎 · V.upgrade1
