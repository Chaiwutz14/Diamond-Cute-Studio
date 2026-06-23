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

  // ── อัปโหลดรูป ──
  // V3 Security: อัปผ่าน Cloudflare Worker เท่านั้น (ImgBB key เป็น secret ฝั่ง Worker — ไม่เปิดในหน้าเว็บ)
  // ⚠️ ต้องตั้ง secret IMGBB_KEY ใน Worker (Dashboard → Settings → Variables and Secrets)
  UPLOAD_PROXY_URL: 'https://dmc-studio-notify.peeza1482546.workers.dev/upload',
  // V3: ลบ key ออกจากฝั่ง client แล้ว (กัน quota/abuse) — เว้นว่างไว้
  IMGBB_API_KEY: '',

  // V3 Security: Firebase App Check — กันการยิง Firestore/Auth ตรงด้วย config สาธารณะ
  // ขอ site key (reCAPTCHA v3) ที่ Firebase Console → App Check → เว็บแอป → reCAPTCHA v3
  // เว้นว่าง = ปิด App Check (ระบบยังทำงานปกติ)
  APP_CHECK_SITE_KEY: '6LcDmCMtAAAAAOUqHLw7G3jXC0hf3AkU8DGJn-jB',

  // V3 Security: เก็บสลิป/รูปลูกค้าใน Firebase Storage แบบ private (แทน ImgBB สาธารณะ)
  // V16: เปิดเป็น true แล้ว + มี "ระบบสำรองอัตโนมัติ" — ถ้ายังไม่ได้เปิด Firebase Storage
  //      ระบบจะ fallback ไปอัปแบบเดิม (ImgBB) ให้เอง ออเดอร์จึงไม่มีวันพังเพราะตั้งค่านี้
  //      ✅ เมื่อเปิด Firebase Storage + deploy storage.rules เสร็จ → สลิปจะกลายเป็น private ทันที
  //      ดูขั้นตอนใน DEPLOY-CHECKLIST.html (ข้อ SEC-02)
  PRIVATE_UPLOADS: true,

  // ── แจ้งเตือน LINE ผ่าน Cloudflare Worker ──
  CF_WORKER_URL: 'https://dmc-studio-notify.peeza1482546.workers.dev',

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

  // ── V16: Static Snapshot — ลดการอ่าน Firestore ฝั่งหน้าบ้านให้เหลือ ~0 ──
  // หลักการ: export สินค้า/แกลเลอรีเป็นไฟล์ JSON (จาก tools/export-snapshot.html)
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
