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
  APP_CHECK_SITE_KEY: 'Diamond-Cute-Studio',

  // V3 Security: เก็บสลิป/รูปลูกค้าใน Firebase Storage แบบ private (แทน ImgBB สาธารณะ)
  // ต้องเปิด Firebase Storage + deploy storage.rules ก่อน แล้วตั้งเป็น true
  PRIVATE_UPLOADS: true,

  // ── แจ้งเตือน LINE ผ่าน Cloudflare Worker ──
  CF_WORKER_URL: 'https://dmc-studio-notify.peeza1482546.workers.dev',

  // ── ค่าจัดส่ง (บาท) ──
  SHIPPING: {
    cod: 40,        // เก็บเงินปลายทาง (รวมค่าธรรมเนียม COD แล้ว)
    transfer: 35,   // โอนผ่าน PromptPay
  },
};
