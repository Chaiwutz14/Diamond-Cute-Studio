/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — CONFIG กลาง (V15)
   js/config.js

   ⭐ ไฟล์เดียวที่ต้องแก้เมื่อย้ายระบบ/เปลี่ยนค่า ⭐
   ไฟล์นี้ต้องถูกโหลด "ก่อน" js/utils.js เสมอ
═══════════════════════════════════════════════ */
window.DMC_CONFIG = {

  // ── ข้อมูลร้าน ──
  SHOP_NAME: 'Diamond Cute Studio',
  SITE_URL:  'https://chaiwutz14.github.io/Diamond-Cute-Studio/',

  // ── Firebase (จาก Firebase Console → Project settings → Web app) ──
  FIREBASE_CONFIG: {
  apiKey:            "AIzaSyB7bssyVp57OOX2Q0PDcmjdL259VuEOP-0",
  authDomain:        "diamond-cute-studio.firebaseapp.com",
  projectId:         "diamond-cute-studio",
  storageBucket:     "diamond-cute-studio.firebasestorage.app",
  messagingSenderId: "896135008460",
  appId:             "1:896135008460:web:be9bb385f3aca1533f3269"
},

  // ── Admin Email สำหรับระบบ login แบบลูกผสม (Firebase Auth) ──
  // วิธีตั้งค่า: Firebase Console → Authentication → เปิด Email/Password
  // → Add user (อีเมล+รหัสผ่าน) → เอาอีเมลนั้นมาใส่ตรงนี้
  // เว้นว่าง = ใช้ระบบรหัสผ่านแบบเดิม (hash) ไปก่อน
  ADMIN_EMAIL: 'peeza1482546@gmail.com',

  // ── อัปโหลดรูป (รูปสินค้า/แกลเลอรี — สาธารณะ) ──
  // อัปผ่าน Cloudflare Worker → Worker เก็บ Cloudinary key/secret ไว้ฝั่งเซิร์ฟเวอร์
  //   → ไม่มี API key โผล่ในหน้าเว็บ (ปลอดภัยกว่า ImgBB ที่ต้องเปิด key)
  // ⚙️ ตั้ง secret ใน Cloudflare Worker: CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
  UPLOAD_PROXY_URL: 'https://dmc-studio-notify.peeza1482546.workers.dev/upload',
  IMGBB_API_KEY: '',   // เลิกใช้แล้ว (ย้ายไป Cloudinary ฝั่ง Worker) — เว้นว่างไว้


  // V3 Security: Firebase App Check — กันการยิง Firestore/Auth ตรงด้วย config สาธารณะ
  // ขอ site key (reCAPTCHA v3) ที่ Firebase Console → App Check → เว็บแอป → reCAPTCHA v3
  // เว้นว่าง = ปิด App Check (ระบบยังทำงานปกติ)
  APP_CHECK_SITE_KEY: '6LfrxD4tAAAAAOipzi5y89JFH4_Rb8nOpn6DNqvj',

  // V3 Security: เก็บสลิป/รูปลูกค้าใน Firebase Storage แบบ private (แทน ImgBB สาธารณะ)
  // V16: เปิดเป็น true แล้ว + มี "ระบบสำรองอัตโนมัติ" — ถ้ายังไม่ได้เปิด Firebase Storage
  //      ระบบจะ fallback ไปอัปแบบเดิม (ImgBB) ให้เอง ออเดอร์จึงไม่มีวันพังเพราะตั้งค่านี้
  //      ✅ เมื่อเปิด Firebase Storage + deploy storage.rules เสร็จ → สลิปจะกลายเป็น private ทันที
  //      (เปิด Storage ที่ Firebase Console → Storage → Get started แล้ว deploy firebase-rules/storage.rules)
  //      ⚠️ ต้องตั้ง CORS ที่ bucket ด้วย (ไม่งั้น browser block) — ดู cors.json + คำสั่ง gsutil ใน HANDOVER.md
  PRIVATE_UPLOADS: false,        // ⏸ ปิดไว้ก่อน — เปิด true เมื่อตั้ง Storage + CORS เสร็จ (สลิปจะ fallback ไป ImgBB อัตโนมัติ)

  // ── แจ้งเตือน LINE ผ่าน Cloudflare Worker ──
  CF_WORKER_URL: 'https://dmc-studio-notify.peeza1482546.workers.dev',

  // V17 (ออปชัน): shared secret กับ Cloudflare Worker — กันสคริปต์ยิง Worker มั่ว
  //   ใส่ค่าเดียวกับ secret CLIENT_KEY ใน Worker (ตั้งทั้ง 2 ฝั่งให้ตรงกันถึงจะทำงาน)
  //   เว้นว่าง = ไม่ส่ง header นี้ (Worker จะไม่บังคับ) — ระบบทำงานปกติ
  //   หมายเหตุ: หน้าเว็บเป็น static คีย์นี้จึงไม่ลับสนิท เป็นแค่ชั้นกันสแปมเสริม
  CF_CLIENT_KEY: '',

  // ── ตรวจสลิปอัตโนมัติ ──
  // โหมดฟรี (enabled): อ่าน QR ในสลิปฝั่งเบราว์เซอร์ (jsQR) → เช็กว่าเป็นสลิปจริง + กันสลิปซ้ำ
  //   ตรวจได้แค่ "เป็นสลิปจริงและไม่ซ้ำ" (ฟรี ไม่เช็กยอดเงิน)
  // blockOnFail:false = สลิปไม่ผ่านก็ยังสั่งซื้อได้ (เตือน + ติดธงให้แอดมินตรวจเอง)
  // โหมด API (api.enabled): ตรวจกับธนาคารจริง (ยอด/ผู้รับ) ผ่าน Worker /verify-slip
  //   ต้องตั้ง secret SLIP_VERIFY_KEY ใน Worker ก่อน (มีค่าใช้จ่ายตามผู้ให้บริการ) — ปิดไว้ก่อน
  SLIP_VERIFY: {
    enabled:     true,
    blockOnFail: false,
    api: { enabled: false, provider: 'easyslip', url: '' },
  },

  // ── ค่าจัดส่ง (บาท) ──
  SHIPPING: {
    cod: 40,        // เก็บเงินปลายทาง (รวมค่าธรรมเนียม COD แล้ว)
    transfer: 35,   // โอนผ่าน PromptPay
  },

  // ── V17: สร้างออเดอร์ฝั่งเซิร์ฟเวอร์ (ปิดช่องโหว่ราคา CRIT-01) ──
  // enabled:true = ส่งออเดอร์ให้ Worker /create-order คำนวณยอด "จากราคาจริง" แล้วเขียน Firestore ให้
  //   → ส่งออเดอร์ ฿1 ไม่ได้อีกต่อไป
  //   ต้องตั้ง secret ใน Worker ก่อน: GCP_SERVICE_ACCOUNT + PRODUCTS_SNAPSHOT_URL (+ SHIP_* ให้ตรง CMS)
  //   ถ้า Worker ตอบ fallback/ผิดพลาด → หน้าเว็บเขียน Firestore ตรงเองอัตโนมัติ (เช็คเอาต์ไม่มีวันพัง)
  // V24/SEC-A: เปิดแล้ว — แต่ "ออกฤทธิ์จริง" ต่อเมื่อตั้ง GCP_SERVICE_ACCOUNT + PRODUCTS_SNAPSHOT_URL ใน Worker
  //   ถ้ายังไม่ตั้ง secret → Worker ตอบ {fallback:true} ทันที หน้าเว็บเขียน Firestore ตรงเหมือนเดิม (ไม่พัง)
  //   วิธีตั้ง secret ดูใน HANDOVER.md หัวข้อ "เปิด Server Order (ปิดช่องราคา)"
  SERVER_ORDER: { enabled: true },

  // Turnstile (CAPTCHA ฟรีของ Cloudflare) — กันบอตยิง endpoint อัปรูป (/upload)
  //   วิธีเปิด (3 ขั้น): 1) Cloudflare → Turnstile → Add widget (โดเมน chaiwutz14.github.io) ได้ siteKey + secret
  //                      2) เอา secret ใส่ Worker secret ชื่อ TURNSTILE_SECRET
  //                      3) เอา siteKey ใส่ตรงนี้ + เปลี่ยน enabled เป็น true
  //   ปิดอยู่ (ค่าเริ่มต้น) = อัปรูปทำงานปกติ ไม่ต้องผ่าน CAPTCHA (Worker fail-open จนกว่าจะตั้ง secret)
  TURNSTILE: { enabled: true, siteKey: '0x4AAAAAADuTMNqo9MrOEVM6' },

  // ── V16: Static Snapshot — ลดการอ่าน Firestore ฝั่งหน้าบ้านให้เหลือ ~0 ──
  // หลักการ: export สินค้า/แกลเลอรีเป็นไฟล์ JSON (ปุ่ม "เผยแพร่ snapshot" ในแอดมิน หรือ _dev/export-snapshot.html)
  //          แล้วอัปขึ้นโฟลเดอร์ /data/ บน GitHub → หน้าบ้านอ่านจากไฟล์ (ผ่าน CDN) แทน Firestore
  // ✅ รองรับผู้ใช้ได้ "ไม่จำกัด" โดยไม่แตะโควต้าอ่าน Firestore ฟรีเทียร์
  // ✅ ถ้ายังไม่มีไฟล์ /data/products.json ระบบจะ fallback ไปอ่าน Firestore ให้อัตโนมัติ (ไม่พัง)
  // ตั้ง false = ปิดสแนปช็อต อ่าน Firestore ตรงเหมือนเดิม
  USE_SNAPSHOT: true,
  SNAPSHOT_BASE: './data/',   // โฟลเดอร์ที่วางไฟล์ products.json / gallery.json

  // ── V16: เร่งโหลดรูป — ใช้ image CDN (wsrv.nl) ย่อรูป + แปลงเป็น WebP ตามขนาดที่แสดงจริง ──
  // เดิมรูปการ์ดโหลดไฟล์เต็ม (สูงสุด 1600px) ทั้งที่แสดงแค่ ~200px → ช้ามาก
  // CDN นี้ฟรี + ถ้าล่ม ระบบจะ fallback กลับไปใช้ลิงก์รูปเดิมอัตโนมัติ (รูปไม่หาย)
  // ตั้ง false = ปิด ใช้ลิงก์รูปต้นฉบับตรงๆ
  IMG_CDN: true,
};
