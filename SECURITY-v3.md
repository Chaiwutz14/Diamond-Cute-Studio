# 🔒 SECURITY v3 — Diamond Cute Studio (สู่ 10/10)

v3 แก้ช่องโหว่จาก Security Audit ทั้งหมด แบ่งเป็น **(A) แก้ในโค้ดให้แล้ว** และ **(B) ต้องตั้งค่าใน Console เอง** (จุด CRITICAL อยู่ในส่วน B — ผมแทนคุณกดไม่ได้)

---

## 🅰️ แก้ในโค้ดให้แล้ว (อัปไฟล์ทับขึ้น GitHub ได้เลย)

| ข้อ | เรื่อง | ไฟล์ |
|----|--------|------|
| C1 | **Auth boundary ใหม่** — เมื่อตั้ง `ADMIN_EMAIL` แล้ว หลังบ้านต้องผ่าน Firebase Auth จริง (ปลอม session ใน Console ไม่ได้อีก) | `admin.js`, `utils.js` |
| M1 | **CSP + security headers** ทุกหน้า (`script-src`/`connect-src`/`object-src`/`base-uri`/`form-action`) + **frame-buster กัน clickjacking** | ทุก HTML, `theme-init.js` |
| — | **ย้าย inline `<script>` เป็นไฟล์ภายนอก** เพื่อใช้ CSP เข้มได้ (ไม่ต้องใช้ `unsafe-inline` กับสคริปต์) | `admin-page.js`, `admin-login-page.js` |
| M2 | **ลบ ImgBB key ออกจากหน้าเว็บ** — อัปผ่าน Worker เท่านั้น | `config.js`, `utils.js` |
| L1 | **`escapeHtml` แข็งขึ้น** — escape `'` และ `` ` `` เพิ่ม | `utils.js` |
| L4 | **Panel ความปลอดภัยในหลังบ้านแสดงสถานะจริง** (ไม่โชว์คำรับรองเกินจริง) — เตือนถ้ายังไม่เปิด Auth/App Check | `admin.js` |
| — | **logout ออกจาก Firebase Auth ด้วย** | `utils.js` |
| H2 | **โค้ด App Check พร้อมแล้ว** (เปิดด้วยการตั้ง key — ดูข้อ B-2) | `utils.js`, `config.js` |
| H1 | **`storage.rules` พร้อม deploy** + flag `PRIVATE_UPLOADS` (ดูข้อ B-3) | `firebase-rules/storage.rules` |

---

## 🅱️ ต้องตั้งค่าใน Console เอง (จุดสำคัญสู่ 10/10)

### B-1 🔴 Firebase Auth + กฎ secure (แก้ C1 + C2 — สำคัญสุด)
> นี่คือจุดที่ทำให้ database เลิก "เปิดโล่ง" และ session ปลอมไม่ได้

1. **Firebase Console → Authentication → Sign-in method → เปิด Email/Password**
2. **Users → Add user** → ใส่อีเมล + รหัสผ่านแอดมิน (เก็บให้ดี)
3. แก้ `js/config.js`:
   ```js
   ADMIN_EMAIL: 'youradmin@email.com',
   ```
4. **Firestore → Rules** → วางเนื้อหาจาก `firebase-rules/firestore.rules` → แก้อีเมลใน `isAdmin()` ให้ตรงข้อ 3 → **Publish**

✅ ผล: หลังบ้านต้อง login Firebase Auth จริง · คนนอกอ่าน/เขียน database ไม่ได้ · ปลอม session ใน Console ไม่มีผล

---

### B-2 🟠 Firebase App Check (แก้ H2 — กันยิง API ตรง)
1. **Firebase Console → App Check → เลือกเว็บแอป → reCAPTCHA v3 → ลงทะเบียน** (จะได้ **site key**)
2. แก้ `js/config.js`:
   ```js
   APP_CHECK_SITE_KEY: 'your-recaptcha-v3-site-key',
   ```
3. ใน App Check → แท็บ APIs → **Enforce** สำหรับ Firestore + Authentication (หลังทดสอบว่าเว็บใช้งานได้ปกติแล้ว)

✅ ผล: ใครยิง Firestore/Auth ตรงด้วย config สาธารณะ จะถูกปฏิเสธ (ต้องมาจากแอปจริงเท่านั้น)

---

### B-3 🟠 สลิป/รูปลูกค้าแบบ private (แก้ H1 — สลิปไม่สาธารณะ) ✅ โค้ดพร้อมแล้ว
> ปัจจุบันสลิปอัปขึ้น ImgBB = ใครมี URL ก็เห็นเลขบัญชี ขั้นนี้ทำให้สลิป + รูปงานลูกค้า "อ่านได้เฉพาะแอดมิน"
> (v3 ต่อโค้ด upload→Storage + แสดงสลิปในหลังบ้านผ่าน `getDownloadURL` แบบยืนยันตัวตนให้แล้ว)

1. **Firebase Console → Storage → เริ่มใช้งาน** (เลือก region เดียวกับ Firestore)
2. **Storage → Rules** → วางจาก `firebase-rules/storage.rules` → แก้อีเมลใน `isAdmin()` ให้ตรง `ADMIN_EMAIL` → **Publish**
3. แก้ `js/config.js`:
   ```js
   PRIVATE_UPLOADS: true,
   ```
4. อัปไฟล์ขึ้น GitHub → ทดสอบสั่งซื้อ 1 ออเดอร์ (แนบสลิป) → เปิดหลังบ้านดูสลิป (ต้องเห็น) → คัดลอก URL สลิปไปเปิดในหน้าต่างไม่ login → **ต้องเปิดไม่ได้** (พิสูจน์ว่า private)

✅ ผล: สลิป + รูปงานลูกค้าเก็บใน Storage แบบ private (อ่านได้เฉพาะแอดมินที่ login Firebase Auth) · *แบบที่ลูกค้าออกแบบ (canvas) ยังอยู่ ImgBB เพราะลูกค้าต้องเห็น preview — ไม่ใช่ข้อมูลอ่อนไหว*

> ⚠️ ต้องทำ **B-1 (Firebase Auth) ก่อน** เพราะการอ่านสลิปจาก Storage ต้องยืนยันตัวตนแอดมิน

---

### B-4 🟡 Cloudflare Worker (แก้ M2 + M3)
ที่ **Cloudflare → Workers → dmc-studio-notify → Settings → Variables and Secrets**:

| Secret | ค่า | จำเป็น |
|--------|-----|--------|
| `IMGBB_KEY` | ImgBB API key | ✅ (เพราะ client ไม่มี key แล้ว — ถ้าไม่ตั้ง อัปรูปจะไม่ทำงาน) |
| `ALLOWED_ORIGIN` | `https://chaiwutz14.github.io` | ✅ (กันคนนอกยืม Worker) |

แล้ว **deploy โค้ด Worker ใหม่** (`cloudflare-worker/index.js`)

---

## ⚠️ ข้อจำกัดที่ควรรู้
- **GitHub Pages ตั้ง HTTP header ไม่ได้** → `frame-ancestors`/`X-Frame-Options` จึงบังคับผ่าน header ไม่ได้ ผมใส่ **frame-buster (JS)** เสริมให้แล้ว ถ้าต้องการระดับ header เต็ม ให้ proxy เว็บผ่าน Cloudflare แล้วเพิ่ม header ที่นั่น
- App Check ตั้ง **Enforce** หลังทดสอบว่าเว็บทำงานปกติ (ถ้า enforce ก่อนตั้ง key ถูก จะใช้เว็บไม่ได้)

---

## ✅ เช็กลิสต์สู่ 10/10
- [ ] B-1 เปิด Firebase Auth + deploy `firestore.rules` + ตั้ง `ADMIN_EMAIL` → **(จาก ~3 → ~7.5)**
- [ ] B-2 เปิด App Check + ตั้ง `APP_CHECK_SITE_KEY` + Enforce → **(→ ~9)**
- [ ] B-3 ย้ายสลิปไป Storage private → **(→ 9.5)**
- [ ] B-4 ตั้ง `IMGBB_KEY` + `ALLOWED_ORIGIN` ใน Worker → **(→ 10/10)**
- [ ] ทดสอบ: ลอง `sessionStorage.setItem('dmc_admin_session',...)` ใน Console แล้วเข้า admin.html → **ต้องเด้งออกหน้า login** (พิสูจน์ว่า C1 ปิดแล้ว)
- [ ] ทดสอบ: เปิด DevTools → ลองอ่าน orders ตรงจาก Firestore โดยไม่ login → **ต้องถูกปฏิเสธ**

— Diamond Cute Studio 💎 · Security v3
