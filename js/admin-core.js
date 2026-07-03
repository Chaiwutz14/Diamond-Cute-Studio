/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Admin JS V12 (Full Rewrite)

   Sections: Overview · Orders(+Tracking) · Products(+Multi-image/Video/Templates)
             · Gallery · Contacts · Reviews · Site Content(CMS) · Templates · Settings
   กฎความปลอดภัยโค้ด:
   - ห้ามใส่ onclick ที่มี URL/ชื่อ ใน template string (ใช้ data-attr + delegation)
   - onclick ใช้ได้เฉพาะ doc id (ตัวอักษร/ตัวเลขล้วน)
═══════════════════════════════════════════════ */
'use strict';

// V17: ลบทางสำรองแฮชแอดมินออกแล้ว — ยืนยันตัวตนด้วย Firebase Auth เท่านั้น (เซิร์ฟเวอร์ตรวจสอบ ปลอมไม่ได้)
//      เปลี่ยนรหัสผ่านที่ Firebase Console → Authentication

let db = null;

// สถานะออเดอร์ V12 (เพิ่ม shipping)
const ORDER_STATUSES = [
  { key:'pending',    label:'📥 รับออเดอร์',  short:'📥 รับแล้ว' },
  { key:'processing', label:'🛠️ จัดเตรียม',   short:'🛠️ เตรียม' },
  { key:'shipping',   label:'🚚 กำลังส่ง',    short:'🚚 ส่ง' },
  { key:'done',       label:'🎉 ส่งสำเร็จ',   short:'🎉 สำเร็จ' },
  { key:'cancelled',  label:'❌ ยกเลิก',      short:'❌ ยกเลิก' },
];

const CARRIER_OPTIONS = [
  { key:'',         name:'— เลือกขนส่ง —' },
  { key:'kerry',    name:'Kerry Express (KEX)' },
  { key:'flash',    name:'Flash Express' },
  { key:'jt',       name:'J&T Express' },
  { key:'thaipost', name:'ไปรษณีย์ไทย' },
  { key:'other',    name:'อื่นๆ — พิมพ์ชื่อขนส่งเอง' },   // V26: ขนส่งนอกลิสต์ (Ninja Van, Best, DHL ฯลฯ)
];

// Built-in canvas templates (ให้เลือกผูกกับสินค้า)
const BUILTIN_TEMPLATES = [
  { id:'classic', name:'Classic', emoji:'📸' },
  { id:'minimal', name:'Minimal', emoji:'🌸' },
  { id:'dark',    name:'Dark',    emoji:'🌙' },
  { id:'warm',    name:'Warm',    emoji:'☀️' },
  { id:'cool',    name:'Cool',    emoji:'❄️' },
  { id:'cute',    name:'Cute',    emoji:'🎀' },
];

// V3 Security: แสดงสถานะความปลอดภัยตามค่าจริงใน config (ไม่โชว์คำรับรองเกินจริง)
function securityRows() {
  const cfg = window.DMC_CONFIG || {};
  const hasAuth     = !!(cfg.ADMIN_EMAIL || '').trim();
  const hasAppCheck = !!(cfg.APP_CHECK_SITE_KEY || '').trim();
  const rows = [];
  rows.push(hasAuth
    ? '<div class="security-row ok">✅ ยืนยันตัวตนด้วย Firebase Auth (เซิร์ฟเวอร์ตรวจสอบ)</div>'
    : '<div class="security-row" style="color:var(--danger);font-weight:600">⚠️ ยังไม่เปิด Firebase Auth — ตั้ง ADMIN_EMAIL + deploy กฎ secure</div>');
  rows.push(hasAppCheck
    ? '<div class="security-row ok">✅ Firebase App Check (กันยิง API ตรง)</div>'
    : '<div class="security-row" style="color:var(--gold-deep);font-weight:600">⚠️ ยังไม่เปิด App Check — ตั้ง APP_CHECK_SITE_KEY</div>');
  rows.push('<div class="security-row ok">✅ รีวิวต้องอนุมัติก่อนแสดง</div>');
  rows.push('<div class="security-row ok">✅ Rate Limit หน้า login (5 ครั้ง/15 นาที)</div>');
  rows.push('<div class="security-row ok">✅ HTTPS + CSP + กัน clickjacking</div>');
  rows.push('<div class="security-row" style="color:var(--text-2)">ℹ️ ตรวจให้แน่ใจว่า deploy firestore.rules (ตัว secure) แล้ว</div>');
  return rows.join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  const isLogin     = document.getElementById('admin-login-page');
  const isDashboard = document.getElementById('admin-dashboard');
  if (isLogin)     { initLoginPage(); return; }
  if (isDashboard) {
    try { db = await DMC.getFirebaseReady(); }
    catch (e) { DMC.toast('ไม่สามารถเชื่อมต่อ Firebase ได้', 'error'); return; }

    // V17: ยืนยันตัวตนด้วย Firebase Auth เท่านั้น (sessionStorage เป็นแค่ความสะดวก ไม่ใช่ขอบเขตความปลอดภัย)
    const adminEmail = ((window.DMC_CONFIG || {}).ADMIN_EMAIL || '').trim();
    if (!adminEmail) {
      DMC.toast('ยังไม่ได้ตั้งค่า ADMIN_EMAIL ใน config.js', 'error', 5000);
      DMC.clearSession(); window.location.href = 'admin-login.html'; return;
    }
    const ok = await checkFirebaseAdmin();             // ← ตรวจสถานะ Firebase Auth จริง (ปลอมไม่ได้)
    if (!ok) { DMC.clearSession(); window.location.href = 'admin-login.html'; return; }
    DMC.createSession();                                // UX only
    initDashboard();
  }
});


// ─── Hybrid Auth: เช็คว่า login Firebase ค้างอยู่เป็นแอดมินหรือไม่ ───
function checkFirebaseAdmin() {
  return new Promise((resolve) => {
    const adminEmail = ((window.DMC_CONFIG || {}).ADMIN_EMAIL || '').trim().toLowerCase();
    if (!adminEmail || !firebase.auth) { resolve(false); return; }
    const unsub = firebase.auth().onAuthStateChanged((user) => {
      unsub();
      resolve(!!(user && (user.email || '').toLowerCase() === adminEmail));
    });
    setTimeout(() => resolve(false), 4000);   // กันค้าง
  });
}

// ══════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════
function initLoginPage() {
  const passInput = document.getElementById('login-password');

  // ลูกผสม: ถ้าเคย login Firebase ไว้บนเครื่องนี้ → เข้าได้เลยไม่ต้องพิมพ์ซ้ำ
  (async () => {
    try {
      await DMC.getFirebaseReady();
      if (await checkFirebaseAdmin()) {
        DMC.createSession();
        window.location.href = 'admin.html';
      }
    } catch(e) {}
  })();

  const errorBox  = document.getElementById('login-error');
  const lockBox   = document.getElementById('login-locked');
  const attDots   = document.querySelectorAll('.attempt-dot');

  function checkLock() {
    if (!DMC.isLockedOut()) return false;
    lockBox.innerHTML = `🔒 บัญชีถูกล็อค กรุณารอ ${DMC.getRemainingLockout()} นาที`;
    lockBox.classList.add('visible');
    document.querySelectorAll('#login-form input,#login-form button').forEach(e=>e.disabled=true);
    return true;
  }
  function updateDots() {
    const d = DMC.getRateLimit();
    attDots.forEach((dot,i) => dot.classList.toggle('used', i < d.count));
  }
  if (checkLock()) return;
  updateDots();

  async function handleLogin() {
    if (checkLock()) return;
    const password = passInput.value.trim();
    if (!password) return;
    const btn = document.getElementById('login-btn');
    if (typeof Loading !== 'undefined') { Loading.buttonLoad(btn); Loading.progressStart(); }
    else btn.disabled = true;
    try {
      let success = false;
      const adminEmail = ((window.DMC_CONFIG || {}).ADMIN_EMAIL || '').trim();

      if (!adminEmail) {
        // V17: ไม่มี ADMIN_EMAIL = ตั้งค่าระบบยังไม่ครบ (ไม่มีโหมด hash สำรองอีกแล้ว)
        DMC.toast('ยังไม่ได้ตั้งค่า ADMIN_EMAIL ใน config.js — ตั้งค่าก่อนเข้าสู่ระบบ', 'error', 6000);
        if (typeof Loading !== 'undefined') { Loading.buttonDone(btn); Loading.progressDone(); }
        else btn.disabled = false;
        return;
      }

      // ⭐ ยืนยันกับ Firebase Auth จริง (อีเมลฝังในระบบ พิมพ์แค่รหัส) — เซิร์ฟเวอร์ตรวจสอบ ปลอมไม่ได้
      try {
        await DMC.getFirebaseReady();
        await firebase.auth().signInWithEmailAndPassword(adminEmail, password);
        success = true;
      } catch (fbErr) {
        success = false;   // V17: ผิด/Auth ไม่พร้อม = ไม่ผ่าน (ไม่มีทางสำรองแฮชแล้ว)
        const code = fbErr.code || '';
        if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found' || code === 'auth/invalid-api-key') {
          DMC.toast('ยังไม่ได้เปิด Email/Password ใน Firebase Console (Authentication → Sign-in method)', 'error', 6500);
        } else if (code === 'auth/network-request-failed') {
          DMC.toast('เชื่อมต่อเครือข่ายไม่ได้ ลองใหม่อีกครั้ง', 'error', 5000);
        }
      }

      if (success) {
        DMC.clearRateLimit(); DMC.createSession();
        if (typeof Loading !== 'undefined') Loading.progressDone();
        DMC.toast('เข้าสู่ระบบสำเร็จ 🎉', 'success');
        setTimeout(() => window.location.href = 'admin.html', 600);
      } else {
        const data = DMC.recordFailedAttempt(); updateDots();
        if (data.count >= DMC.MAX_ATTEMPTS) {
          checkLock();
        } else {
          errorBox.innerHTML = `❌ รหัสผ่านไม่ถูกต้อง (เหลือ ${DMC.MAX_ATTEMPTS - data.count} ครั้ง)`;
          errorBox.classList.add('visible');
          passInput.value = ''; passInput.classList.add('error'); passInput.focus();
          setTimeout(() => { errorBox.classList.remove('visible'); passInput.classList.remove('error'); }, 2500);
        }
        if (typeof Loading !== 'undefined') { Loading.buttonDone(btn); Loading.progressDone(); }
        else btn.disabled = false;
      }
    } catch(e) {
      DMC.toast('เกิดข้อผิดพลาด', 'error');
      if (typeof Loading !== 'undefined') { Loading.buttonDone(btn); Loading.progressDone(); }
      else btn.disabled = false;
    }
  }
  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  passInput?.addEventListener('keydown', e => { if (e.key==='Enter') handleLogin(); });
}

// ══════════════════════════════════════════════
//  DASHBOARD SHELL
// ══════════════════════════════════════════════
function initDashboard() {
  initSidebarNav();
  bindGlobalDelegation();
  document.getElementById('logout-btn')?.addEventListener('click', doLogout);
  document.getElementById('logout-btn-2')?.addEventListener('click', doLogout);
  const hash = location.hash.slice(1) || 'overview';
  loadSection(hash);
}

// CSP-safe event delegation — แทน inline onclick/onchange (CSP บล็อก inline handler)
function bindGlobalDelegation() {
  if (window._dmcAdmDelegated) return;
  window._dmcAdmDelegated = true;
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const id = el.dataset.id;
    switch (el.dataset.act) {
      case 'openOrderModal':    openOrderModal(id); break;
      case 'updateOrderStatus': updateOrderStatus(id); break;
      case 'openProductModal':  openProductModal(id || null); break;
      case 'editCoupon':        editCoupon(id); break;
      case 'deleteCoupon':      deleteCoupon(id); break;
      case 'closeModal':        closeModal(); break;
    }
  });
  document.addEventListener('change', function (e) {
    const el = e.target.closest('[data-act-change]');
    if (!el) return;
    const id = el.dataset.id;
    if (el.dataset.actChange === 'quickUpdateStatus') quickUpdateStatus(id, el.value);
    else if (el.dataset.actChange === 'toggleProduct') toggleProduct(id, el.checked);
  });
}

function doLogout() {
  var existing = document.getElementById('logout-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'logout-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px)';
  modal.innerHTML = [
    '<div style="background:var(--bg-card);border:1.5px solid var(--border);border-radius:var(--r-2xl);padding:2rem;max-width:340px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.3);text-align:center">',
      '<div style="font-size:2.5rem;margin-bottom:.75rem">👋</div>',
      '<div style="font-family:var(--font-display);font-weight:700;font-size:1.1rem;color:var(--text-1);margin-bottom:.4rem">ออกจากระบบ?</div>',
      '<div style="font-size:.87rem;color:var(--text-2);margin-bottom:1.5rem">Session จะถูกลบออก ต้องล็อกอินใหม่</div>',
      '<div style="display:flex;gap:.75rem;justify-content:center">',
        '<button id="logout-confirm" style="flex:1;padding:.7rem 1.25rem;background:var(--rose);border:none;border-radius:var(--r-lg);color:#fff;font-family:var(--font-display);font-weight:600;font-size:.9rem;cursor:pointer">ออกจากระบบ</button>',
        '<button id="logout-cancel"  style="flex:1;padding:.7rem 1.25rem;background:var(--bg-mid);border:1.5px solid var(--border);border-radius:var(--r-lg);color:var(--text-2);font-family:var(--font-display);font-weight:600;font-size:.9rem;cursor:pointer">ยกเลิก</button>',
      '</div>',
    '</div>'
  ].join('');
  document.body.appendChild(modal);
  document.getElementById('logout-confirm').addEventListener('click', function(){
    modal.remove(); DMC.clearSession();
    try { if (firebase.auth) firebase.auth().signOut(); } catch(e) {}
    window.location.href = 'admin-login.html';
  });
  document.getElementById('logout-cancel').addEventListener('click', function(){ modal.remove(); });
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
}

function initSidebarNav() {
  document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
    item.addEventListener('click', async () => {
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const s = item.dataset.section;
      loadSection(s); location.hash = s;
    });
  });
}

function loadSection(name) {
  const content = document.getElementById('admin-content');
  if (!content) return;
  const active = document.querySelector(`.sidebar-item[data-section="${name}"]`);
  if (active) { document.querySelectorAll('.sidebar-item').forEach(i=>i.classList.remove('active')); active.classList.add('active'); }
  if (typeof Loading !== 'undefined') Loading.progressStart();
  const map = {
    overview:loadOverview, orders:loadOrders, products:loadProducts,
    gallery:loadGallery, contacts:loadContacts, reviews:loadReviewsAdmin,
    content:loadContentCMS, coupons:loadCouponsAdmin, templates:loadTemplatesAdmin, settings:loadSettings
  };
  const fn = map[name] || loadOverview;
  Promise.resolve(fn(content)).then(() => {
    if (typeof Loading !== 'undefined') Loading.progressDone();
  }).catch(() => {
    if (typeof Loading !== 'undefined') Loading.progressDone();
  });
}
