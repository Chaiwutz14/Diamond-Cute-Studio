# 💎 Diamond Cute Studio — V15

เว็บร้านพิมพ์ภาพ/สิ่งพิมพ์ครบวงจร: หน้าร้าน + ตะกร้า + ติดตามออเดอร์ (OTP) + รีวิว + หลังบ้านเต็มระบบ + PWA
**Stack:** HTML/CSS/Vanilla JS (GitHub Pages) · Firebase Firestore + Auth · ImgBB · Cloudflare Worker (LINE แจ้งเตือน + upload proxy)

📚 เอกสารชุดนี้: [USER-MANUAL.md](USER-MANUAL.md) คู่มือแอดมิน · [DATA-MODEL.md](DATA-MODEL.md) โครงสร้างข้อมูล · [HANDOVER.md](HANDOVER.md) เช็กลิสต์ส่งมอบ · [CHANGELOG.md](CHANGELOG.md) ประวัติเวอร์ชัน

---

## 🚀 ติดตั้งครั้งแรก (เรียงตามลำดับ)

### 1. ตั้งค่าหลัก — แก้ไฟล์เดียว: `js/config.js`
ทุกค่าอยู่ที่นี่: Firebase config · ADMIN_EMAIL · UPLOAD_PROXY_URL · IMGBB_API_KEY · CF_WORKER_URL · ค่าจัดส่ง

### 2. Firebase (Firestore)
Console → สร้างโปรเจกต์ → Firestore Database (asia-southeast3) → คัดลอก Web app config ใส่ `js/config.js`

### 3. 🔐 เปิดระบบ Login ปลอดภัย (Auth ลูกผสม) — *แนะนำอย่างยิ่ง*
> ทำตามลำดับนี้เป๊ะๆ เพื่อไม่ให้หลังบ้านล็อคตัวเอง
1. Firebase Console → **Authentication → Get started → Sign-in method → เปิด Email/Password**
2. แท็บ **Users → Add user** → ใส่อีเมล + รหัสผ่านที่ต้องการใช้เข้าหลังบ้าน
3. นำอีเมลนั้นใส่ **`ADMIN_EMAIL` ใน js/config.js** → อัปไฟล์ขึ้น GitHub
4. ทดสอบ login หลังบ้านด้วยรหัสผ่านใหม่ (หน้า login เหมือนเดิม พิมพ์แค่รหัสผ่าน)
5. เปิด `firebase-rules/firestore.rules` → แก้บรรทัด `isAdmin()` ใส่อีเมลเดียวกัน → คัดลอกทั้งไฟล์ไป **publish ใน Firestore → Rules**
6. ทดสอบ: เพิ่ม/แก้สินค้าจากหลังบ้านได้ปกติ = สำเร็จ ✅

*ยังไม่พร้อม? เว้น ADMIN_EMAIL ว่าง = ใช้รหัสแบบเดิม (hash) และใช้ rules เดิมไปก่อนได้ (`firestore-open-legacy.rules`) — แต่ความปลอดภัยต่ำกว่า*

### 4. รูปภาพ (เลือก 1 ทาง)
- **ทาง A (แนะนำ — key ไม่หลุด):** Cloudflare Worker → เพิ่ม secret `IMGBB_KEY` → ใส่ `UPLOAD_PROXY_URL = '<worker-url>/upload'` ใน config.js
- **ทาง B:** ใส่ `IMGBB_API_KEY` ใน config.js (key เปิดเผยในหน้าเว็บ)

### 5. แจ้งเตือน LINE (Cloudflare Worker)
สร้าง Worker → วางโค้ด `cloudflare-worker/index.js` → secrets: `LINE_TOKEN`, `LINE_USER_ID` (หลายคนคั่น ,), `IMGBB_KEY` → ใส่ URL ใน `CF_WORKER_URL`

### 6. (ทางเลือก) OTP ดูออเดอร์ข้ามเครื่อง
Authentication → เปิด **Phone** → Authorized domains เพิ่มโดเมนเว็บ → อัปเกรด Blaze (จ่ายเฉพาะ SMS ~฿2-3/ครั้ง) · ไม่เปิดก็ใช้แท็บ "เครื่องนี้" ได้ปกติ

### 7. Deploy
อัปไฟล์ทั้งหมดขึ้น GitHub repo → Settings → Pages → Branch main → เว็บออนไลน์
**ทุกครั้งที่อัปไฟล์: พิมพ์ commit message ว่าแก้อะไร** เช่น `v15: enable firebase auth`

---

## 🗂 โครงสร้างไฟล์ (จุดที่ต้องรู้)
```
js/config.js        ⭐ ตั้งค่าทั้งหมด — แก้ที่นี่ที่เดียว
js/categories.js    ⭐ หมวดหมู่ built-in — แก้ที่นี่ใช้ทั้งระบบ
js/utils.js         แกนกลาง: Firebase, ตะกร้า, อัปโหลด, helpers
js/cms.js           โหลดเนื้อหาเว็บจาก Firestore (+ lineChat)
js/admin.js         หลังบ้านทั้งหมด (login ลูกผสม, backup)
js/footer.js / bottom-nav.js / custom-select.js / pwa-install.js
                    component ฉีด CSS ในตัว → แก้สไตล์ของมัน "ในไฟล์นั้น"
js/gallery.js, contact-page.js, about-page.js   สคริปต์ประจำหน้า
css/                สไตล์แยกตามหน้า · firebase-rules/  กติกาฐานข้อมูล
cloudflare-worker/  Worker (LINE notify + /upload proxy)
sw.js + manifest.webmanifest + assets/   PWA
```

## 🔒 โมเดลความปลอดภัย (สรุปสำหรับไอที)
- Firebase config เปิดเผยได้ (ปกติของ Firebase) — การป้องกันจริงอยู่ที่ **Firestore Rules v2**: write ทุก collection ต้อง `isAdmin()` (เช็คอีเมลจาก Firebase Auth) ยกเว้น create ออเดอร์/รีวิว pending ที่ validate ฝั่ง rules
- ออเดอร์: `get` รายใบด้วย docId ได้ (docId สุ่ม = token) แต่ `list` ต้องเป็นแอดมินหรือเจ้าของเบอร์ที่ผ่าน OTP (Phone Auth)
- Secrets ฝั่ง server ทั้งหมดอยู่ใน Cloudflare Worker
- รหัสแอดมิน fallback เก็บเป็น PBKDF2-SHA256 hash (ไม่มี plaintext ในโค้ด)
