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
  ADMIN_EMAIL: '',

  // ── อัปโหลดรูป ──
  // แนะนำ: ใช้ผ่าน Cloudflare Worker (key ไม่หลุด) → ใส่ URL Worker + /upload
  // เช่น 'https://dmc-studio-notify.xxx.workers.dev/upload'
  UPLOAD_PROXY_URL: '',
  // สำรอง: เรียก ImgBB ตรง (key เปิดเผยในหน้าเว็บ)
  IMGBB_API_KEY: 'df00a7ad6294a89bc99d7c6f900e7393',

  // ── แจ้งเตือน LINE ผ่าน Cloudflare Worker ──
  CF_WORKER_URL: 'https://dmc-studio-notify.peeza1482546.workers.dev',

  // ── ค่าจัดส่ง (บาท) ──
  SHIPPING: {
    cod: 80,        // เก็บเงินปลายทาง (รวมค่าธรรมเนียม COD แล้ว)
    transfer: 50,   // โอนผ่าน PromptPay
  },
};
