/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Admin JS V12 (Full Rewrite)

   Sections: Overview · Orders(+Tracking) · Products(+Multi-image/Video/Templates)
             · Gallery · Contacts · Reviews · Site Content(CMS) · Templates · Settings
   กฎความปลอดภัยโค้ด:
   - ห้ามใส่ onclick ที่มี URL/ชื่อ ใน template string (ใช้ data-attr + delegation)
   - onclick ใช้ได้เฉพาะ doc id (ตัวอักษร/ตัวเลขล้วน)
═══════════════════════════════════════════════ */
'use strict';

const ADMIN_HASH = "b454dc28df89029f894c5046920aec23d2bcceb2db61e1b2a354709c069f6ffc";
const ADMIN_SALT = "dmc_diamond_studio_salt_v1";

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
  { key:'kerry',    name:'Kerry Express' },
  { key:'flash',    name:'Flash Express' },
  { key:'jt',       name:'J&T Express' },
  { key:'thaipost', name:'ไปรษณีย์ไทย' },
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

document.addEventListener('DOMContentLoaded', async () => {
  const isLogin     = document.getElementById('admin-login-page');
  const isDashboard = document.getElementById('admin-dashboard');
  if (isLogin)     { initLoginPage(); return; }
  if (isDashboard) {
    try { db = await DMC.getFirebaseReady(); }
    catch (e) { DMC.toast('ไม่สามารถเชื่อมต่อ Firebase ได้', 'error'); return; }

    // เช็คสิทธิ์: session ปกติ หรือ Firebase Auth (ลูกผสม — ไม่ต้องพิมพ์รหัสซ้ำ)
    if (!DMC.isAdminAuthenticated()) {
      const ok = await checkFirebaseAdmin();
      if (!ok) { window.location.href = 'admin-login.html'; return; }
      DMC.createSession();   // ต่ออายุ session จาก Firebase Auth
    }
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

      if (adminEmail) {
        // ⭐ โหมดลูกผสม: ยืนยันกับ Firebase Auth จริง (อีเมลฝังในระบบ พิมพ์แค่รหัส)
        try {
          await DMC.getFirebaseReady();
          await firebase.auth().signInWithEmailAndPassword(adminEmail, password);
          success = true;
        } catch (fbErr) {
          const code = fbErr.code || '';
          // Auth ยังไม่ได้เปิดใช้/config ผิด → ใช้ระบบ hash เดิมแทน (ระบบไม่ล่ม)
          if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found'
              || code === 'auth/invalid-api-key' || code === 'auth/network-request-failed') {
            const hash = await DMC.pbkdf2Hash(password, ADMIN_SALT);
            success = (hash === ADMIN_HASH);
          } else {
            success = false;  // รหัสผิดจริง (wrong-password / invalid-credential)
          }
        }
      } else {
        // โหมดเดิม: เทียบ hash (ยังไม่ตั้งค่า ADMIN_EMAIL ใน config.js)
        const hash = await DMC.pbkdf2Hash(password, ADMIN_SALT);
        success = (hash === ADMIN_HASH);
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
  document.getElementById('logout-btn')?.addEventListener('click', doLogout);
  document.getElementById('logout-btn-2')?.addEventListener('click', doLogout);
  const hash = location.hash.slice(1) || 'overview';
  loadSection(hash);
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
    item.addEventListener('click', () => {
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
    content:loadContentCMS, templates:loadTemplatesAdmin, settings:loadSettings
  };
  const fn = map[name] || loadOverview;
  Promise.resolve(fn(content)).then(() => {
    if (typeof Loading !== 'undefined') Loading.progressDone();
  }).catch(() => {
    if (typeof Loading !== 'undefined') Loading.progressDone();
  });
}

// ══════════════════════════════════════════════
//  OVERVIEW
// ══════════════════════════════════════════════
async function loadOverview(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting">
        <h2>สวัสดี Admin 👋</h2>
        <p id="greeting-sub">กำลังโหลดข้อมูล...</p>
      </div>
      <div class="admin-topbar-actions">
        <button class="btn btn-line btn-md" id="test-notify-btn">🔔 ทดสอบ LINE</button>
        <button class="btn btn-primary btn-md" id="goto-add-product">+ เพิ่มสินค้า</button>
      </div>
    </div>

    <div class="kpi-grid" id="kpi-grid">
      ${typeof Loading !== 'undefined' ? Loading.Skeleton.adminKPIs() : ''}
    </div>

    <div class="admin-grid">
      <div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">📈 ยอดขาย 7 วันล่าสุด</div></div>
          <div class="chart-area" id="sales-chart"></div>
          <div class="chart-x-labels" id="chart-labels"></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header">
            <div class="admin-box-title">📦 ออเดอร์ล่าสุด</div>
            <span class="admin-box-action" id="goto-orders">ดูทั้งหมด →</span>
          </div>
          <div id="recent-orders-table">${typeof Loading !== 'undefined' ? Loading.Skeleton.tableRows(4) : ''}</div>
        </div>
      </div>
      <div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">⭐ รีวิวรออนุมัติ</div></div>
          <div id="pending-reviews-mini"><div style="color:var(--text-3);text-align:center;padding:.5rem;font-size:.85rem">กำลังโหลด...</div></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">💬 LINE Notify</div></div>
          <div style="font-size:.84rem;color:var(--text-2);margin-bottom:.75rem">ระบบแจ้งเตือนออเดอร์ใหม่ผ่าน LINE</div>
          <button class="btn btn-secondary btn-block btn-md" id="test-notify-2">🔔 ทดสอบส่งแจ้งเตือน</button>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🔐 ความปลอดภัย</div></div>
          <div class="security-status">
            <div class="security-row ok">✅ PBKDF2-SHA256 (100k iterations)</div>
            <div class="security-row ok">✅ Session Token (8 ชม.)</div>
            <div class="security-row ok">✅ Rate Limit 5 ครั้ง/15 นาที</div>
            <div class="security-row ok">✅ รีวิวต้องอนุมัติก่อนแสดง</div>
            <div class="security-row ok">✅ HTTPS Only</div>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('goto-add-product')?.addEventListener('click', () => { loadSection('products'); setTimeout(() => openProductModal(null), 250); });
  document.getElementById('goto-orders')?.addEventListener('click', () => loadSection('orders'));
  ['test-notify-btn','test-notify-2'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', async (e) => {
      const b = e.currentTarget;
      if (typeof Loading !== 'undefined') Loading.buttonLoad(b);
      const ok = await DMC.sendLineNotify({ orderId:'TEST', customerName:'ทดสอบ', customerPhone:'000', itemsSummary:'ทดสอบระบบแจ้งเตือน', total:0, paymentMethod:'test' });
      if (typeof Loading !== 'undefined') Loading.buttonDone(b);
      DMC.toast(ok ? '✅ ส่ง LINE สำเร็จ!' : '❌ ส่งไม่สำเร็จ ตรวจสอบ config', ok ? 'success' : 'error');
    });
  });

  await Promise.all([loadKPIs(), loadRecentOrdersTable(), loadPendingReviewsMini(), renderSalesChart()]);
}

async function loadKPIs() {
  const kpiGrid = document.getElementById('kpi-grid');
  if (kpiGrid) {
    kpiGrid.innerHTML = [
      ['blue','⏳','กำลังดำเนินการ','kpi-pending'],
      ['gold','💰','ยอดขายเดือนนี้','kpi-revenue'],
      ['green','🎉','ส่งสำเร็จ','kpi-done'],
      ['rose','📦','ออเดอร์วันนี้','kpi-today']
    ].map(([cls,icon,label,id]) =>
      `<div class="kpi-card kpi-${cls}"><div class="kpi-icon">${icon}</div><div class="kpi-label">${label}</div><div class="kpi-value" id="${id}">${typeof Loading!=='undefined'?Loading.pulseDotHTML:'…'}</div></div>`
    ).join('');
  }
  try {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [all, today, month] = await Promise.all([
      db.collection('orders').get(),
      db.collection('orders').where('createdAt','>=',firebase.firestore.Timestamp.fromDate(todayStart)).get(),
      db.collection('orders').where('createdAt','>=',firebase.firestore.Timestamp.fromDate(monthStart)).get(),
    ]);
    let active=0, done=0, revenue=0;
    all.forEach(d => {
      const o = d.data();
      if (o.status==='cancelled') return;
      if (['pending','processing','shipping'].includes(o.status)) active++;
      if (o.status==='done') done++;
    });
    month.forEach(d => { const o=d.data(); if (o.status!=='cancelled') revenue += o.total||0; });
    setAdminText('kpi-pending', active);
    setAdminText('kpi-revenue', DMC.formatPrice(revenue));
    setAdminText('kpi-done', done);
    setAdminText('kpi-today', today.size);
    setAdminText('greeting-sub', active>0 ? `มี ${active} ออเดอร์กำลังดำเนินการ 🔔` : 'ทุกออเดอร์เรียบร้อยดี 🎉');
  } catch(e) { ['pending','revenue','done','today'].forEach(k=>setAdminText(`kpi-${k}`,'—')); }
}

async function loadRecentOrdersTable() {
  const el = document.getElementById('recent-orders-table');
  if (!el) return;
  try {
    const snap = await db.collection('orders').limit(8).get();
    if (snap.empty) { el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-3)">ยังไม่มีออเดอร์</div>'; return; }
    const docs = [];
    snap.forEach(doc => docs.push({id:doc.id, ...doc.data()}));
    docs.sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    const rows = docs.map(o => `<tr>
      <td><span class="order-id-cell">#${o.orderId||o.id.slice(-6).toUpperCase()}</span></td>
      <td>${DMC.escapeHtml(o.customerName||'—')}</td>
      <td class="price-cell">${DMC.formatPrice(o.total||0)}</td>
      <td><span class="status status-${o.status||'pending'}">${statusShort(o.status)}</span></td>
      <td><button class="table-action-btn" onclick="openOrderModal('${o.id}')">ดู</button></td>
    </tr>`);
    el.innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>ออเดอร์</th><th>ลูกค้า</th><th>ราคา</th><th>สถานะ</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  } catch(e) { el.innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ</div>'; }
}

async function loadPendingReviewsMini() {
  const el = document.getElementById('pending-reviews-mini');
  if (!el) return;
  try {
    const snap = await db.collection('reviews').where('status','==','pending').limit(5).get();
    if (snap.empty) { el.innerHTML = '<div style="color:var(--text-3);text-align:center;padding:.5rem;font-size:.85rem">ไม่มีรีวิวรออนุมัติ ✅</div>'; return; }
    let html = '';
    snap.forEach(doc => {
      const r = doc.data();
      html += `<div style="padding:.5rem 0;border-bottom:1px solid var(--border);font-size:.83rem">
        <strong>${DMC.escapeHtml(r.name||'—')}</strong> · ${'★'.repeat(r.rating||0)}
        <div style="color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${DMC.escapeHtml((r.text||'').slice(0,60))}</div>
      </div>`;
    });
    html += `<button class="btn btn-secondary btn-sm btn-block" style="margin-top:.6rem;border-radius:var(--r-md)" id="goto-reviews-btn">จัดการรีวิว →</button>`;
    el.innerHTML = html;
    document.getElementById('goto-reviews-btn')?.addEventListener('click', () => loadSection('reviews'));
  } catch(e) { el.innerHTML = '<div style="color:var(--text-3);font-size:.83rem;text-align:center">—</div>'; }
}

async function renderSalesChart() {
  const chartEl  = document.getElementById('sales-chart');
  const labelsEl = document.getElementById('chart-labels');
  if (!chartEl||!labelsEl) return;
  try {
    const now = new Date();
    const buckets = [];
    for (let i=6; i>=0; i--) {
      const d = new Date(now); d.setDate(d.getDate()-i);
      buckets.push({ date:new Date(d.getFullYear(),d.getMonth(),d.getDate()), label:i===0?'วันนี้':['อา','จ','อ','พ','พฤ','ศ','ส'][d.getDay()], isToday:i===0, total:0 });
    }
    const snap = await db.collection('orders').where('createdAt','>=',firebase.firestore.Timestamp.fromDate(buckets[0].date)).get();
    snap.forEach(doc => {
      const o = doc.data();
      if (!o.createdAt || o.status==='cancelled') return;
      const d = o.createdAt.toDate();
      const b = buckets.find(b => b.date.getFullYear()===d.getFullYear()&&b.date.getMonth()===d.getMonth()&&b.date.getDate()===d.getDate());
      if (b) b.total += o.total||0;
    });
    const max = Math.max(...buckets.map(b=>b.total),1);
    chartEl.innerHTML  = buckets.map(b=>`<div class="chart-bar ${b.isToday?'today':''}" style="height:${Math.max((b.total/max)*100,3)}%" data-val="${DMC.formatPrice(b.total)}"></div>`).join('');
    labelsEl.innerHTML = buckets.map(b=>`<div class="chart-x-label ${b.isToday?'today':''}">${b.label}</div>`).join('');
  } catch(e) {
    chartEl.innerHTML  = [45,68,52,80,60,88,65].map((h,i)=>`<div class="chart-bar ${i===6?'today':''}" style="height:${h}%"></div>`).join('');
    labelsEl.innerHTML = ['จ','อ','พ','พฤ','ศ','ส','วันนี้'].map((l,i)=>`<div class="chart-x-label ${i===6?'today':''}">${l}</div>`).join('');
  }
}

// ══════════════════════════════════════════════
//  ORDERS (+ Tracking)
// ══════════════════════════════════════════════
async function loadOrders(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>📦 ออเดอร์ทั้งหมด</h2><p>จัดการสถานะ เลขพัสดุ และรายละเอียดออเดอร์</p></div>
      <div class="admin-topbar-actions">
        <select class="form-input form-select" id="order-filter" style="width:auto;padding:.45rem 2rem .45rem .75rem">
          <option value="">ทุกสถานะ</option>
          ${ORDER_STATUSES.map(s=>`<option value="${s.key}">${s.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="admin-box">
      <div id="orders-table-wrap">${typeof Loading !== 'undefined' ? Loading.Skeleton.tableRows(5) : ''}</div>
    </div>`;
  document.getElementById('order-filter')?.addEventListener('change', loadOrdersTable);
  await loadOrdersTable();
}

async function loadOrdersTable() {
  const el     = document.getElementById('orders-table-wrap');
  const filter = document.getElementById('order-filter')?.value;
  if (!el) return;
  if (typeof Loading !== 'undefined') el.innerHTML = Loading.Skeleton.tableRows(5);
  try {
    let q = db.collection('orders').limit(150);
    if (filter) q = q.where('status','==',filter);
    const snap = await q.get();
    if (snap.empty) { el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-3)">ไม่พบออเดอร์</div>'; return; }

    const docs = [];
    snap.forEach(doc => docs.push({id:doc.id,...doc.data()}));
    docs.sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

    const rows = docs.map(o => `<tr>
      <td><span class="order-id-cell">#${o.orderId||o.id.slice(-6).toUpperCase()}</span></td>
      <td><div style="font-weight:600">${DMC.escapeHtml(o.customerName||'—')}</div><div style="font-size:.75rem;color:var(--text-3)">${DMC.escapeHtml(o.customerPhone||'')}</div></td>
      <td style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.83rem">${DMC.escapeHtml(o.itemsSummary||'—')}</td>
      <td class="price-cell">${DMC.formatPrice(o.total||0)}</td>
      <td style="font-size:.78rem">${o.trackingNo ? '🚚 ' + DMC.escapeHtml(o.trackingNo) : '<span style="color:var(--text-3)">—</span>'}</td>
      <td>
        <select class="form-input form-select" style="padding:.28rem .5rem;font-size:.78rem;width:auto" onchange="quickUpdateStatus('${o.id}',this.value)">
          ${ORDER_STATUSES.map(s=>`<option value="${s.key}" ${o.status===s.key?'selected':''}>${s.short}</option>`).join('')}
        </select>
      </td>
      <td style="font-size:.78rem;color:var(--text-3)">${o.createdAt?DMC.formatDate(o.createdAt,true):'—'}</td>
      <td><button class="table-action-btn" onclick="openOrderModal('${o.id}')">📋 ดู</button></td>
    </tr>`);

    el.innerHTML = `<div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>ออเดอร์</th><th>ลูกค้า</th><th>รายการ</th><th>ราคา</th><th>เลขพัสดุ</th><th>สถานะ</th><th>วันที่</th><th></th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table></div>`;
  } catch(e) { el.innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ: '+DMC.escapeHtml(e.message)+'</div>'; }
}

window.quickUpdateStatus = async function(id, status) {
  try {
    await db.collection('orders').doc(id).update({ status, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    DMC.toast('อัพเดทสถานะแล้ว ✅', 'success');
    if (status === 'shipping') {
      DMC.toast('💡 อย่าลืมใส่เลขพัสดุ — กด 📋 ดู เพื่อเพิ่ม', 'info', 4000);
    }
    loadKPIs();
  } catch(e) { DMC.toast('อัพเดทไม่สำเร็จ', 'error'); }
};

// ── Order Detail Modal ──
window.openOrderModal = async function(orderId) {
  const overlay = document.getElementById('modal-overlay');
  const body    = document.getElementById('modal-body');
  if (!overlay||!body) return;
  body.innerHTML = '<div style="text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div>';
  overlay.classList.add('open');
  try {
    const doc = await db.collection('orders').doc(orderId).get();
    if (!doc.exists) { body.innerHTML = '<p>ไม่พบออเดอร์</p>'; return; }
    const o = {id:doc.id,...doc.data()};

    const items = (o.items||[]).map(item => `
      <div style="display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border);font-size:.87rem">
        <div><div style="font-weight:600">${DMC.escapeHtml(item.name||'—')}</div><div style="color:var(--text-3);font-size:.78rem">${DMC.escapeHtml(item.options||'')} × ${item.qty||1} ${DMC.escapeHtml(item.unit||'ชิ้น')}</div></div>
        <div style="font-family:var(--font-display);font-weight:700;color:var(--accent)">${DMC.formatPrice((item.price||0)*(item.qty||1))}</div>
      </div>`).join('');

    body.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">📦 ออเดอร์ #${o.orderId||o.id.slice(-6).toUpperCase()}</div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <div style="background:var(--bg-mid);border-radius:var(--r-lg);padding:1rem;margin-bottom:1rem">
        <div style="font-family:var(--font-display);font-size:.78rem;color:var(--text-3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:.6rem">ข้อมูลลูกค้า</div>
        <div class="order-detail-grid">
          <div class="detail-field"><div class="detail-field-label">ชื่อ</div><div class="detail-field-value">${DMC.escapeHtml(o.customerName||'—')}</div></div>
          <div class="detail-field"><div class="detail-field-label">โทร</div><div class="detail-field-value">${DMC.escapeHtml(o.customerPhone||'—')}</div></div>
          <div class="detail-field" style="grid-column:1/-1"><div class="detail-field-label">ที่อยู่</div><div class="detail-field-value">${DMC.escapeHtml(o.address||'—')}</div></div>
          <div class="detail-field"><div class="detail-field-label">ขนส่งที่เลือก</div><div class="detail-field-value">${DMC.escapeHtml(o.shippingMethod||'—')}</div></div>
          <div class="detail-field"><div class="detail-field-label">ชำระ</div><div class="detail-field-value">${o.paymentMethod==='promptpay'?'📱 PromptPay':'🚚 COD'}</div></div>
        </div>
        ${o.note?`<div style="margin-top:.6rem;padding:.5rem .75rem;background:rgba(245,158,11,.08);border-radius:var(--r-md);font-size:.82rem;color:var(--text-2)">💬 ${DMC.escapeHtml(o.note)}</div>`:''}
      </div>

      <div style="margin-bottom:1rem">
        <div style="font-family:var(--font-display);font-size:.78rem;color:var(--text-3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:.6rem">รายการสินค้า</div>
        ${items || `<div style="font-size:.87rem;color:var(--text-3)">${DMC.escapeHtml(o.itemsSummary||'—')}</div>`}
        <div style="display:flex;justify-content:space-between;padding:.6rem 0 0;font-family:var(--font-display);font-weight:800;font-size:1.1rem;color:var(--accent)">
          <span>รวมทั้งหมด</span><span>${DMC.formatPrice(o.total||0)}</span>
        </div>
      </div>

      ${o.slipUrl?`<div style="margin-bottom:1rem">
        <div style="font-family:var(--font-display);font-size:.78rem;color:var(--text-3);margin-bottom:.5rem">สลิปโอนเงิน <span style="font-size:.7rem;color:var(--accent)">(คลิกเพื่อขยาย)</span></div>
        <img src="${o.slipUrl}" id="slip-img-${o.id}" style="max-height:180px;border-radius:var(--r-md);border:1.5px solid var(--border);cursor:zoom-in" title="คลิกเพื่อดูเต็มหน้าจอ">
      </div>`:''}

      ${o.fileUrls?.length?`<div style="margin-bottom:1rem">
        <div style="font-family:var(--font-display);font-size:.78rem;color:var(--text-3);margin-bottom:.5rem">ไฟล์รูปภาพ (${o.fileUrls.length} ไฟล์) <span style="font-size:.7rem;color:var(--accent)">(คลิกเพื่อขยาย)</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:.5rem" id="file-urls-wrap-${o.id}"></div>
      </div>`:''}

      <!-- สถานะ + Tracking -->
      <div style="background:var(--bg-mid);border-radius:var(--r-lg);padding:1rem;margin-bottom:1rem">
        <div style="font-family:var(--font-display);font-size:.78rem;color:var(--text-3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:.6rem">อัปเดตสถานะ + เลขพัสดุ</div>
        <div class="form-group">
          <label class="form-label">สถานะออเดอร์</label>
          <select class="form-input form-select" id="modal-status-select">
            ${ORDER_STATUSES.map(s=>`<option value="${s.key}" ${o.status===s.key?'selected':''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group" style="margin:0">
            <label class="form-label">ขนส่ง</label>
            <select class="form-input form-select" id="modal-carrier-select">
              ${CARRIER_OPTIONS.map(c=>`<option value="${c.key}" ${o.carrier===c.key?'selected':''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">เลขพัสดุ</label>
            <input class="form-input" id="modal-tracking-input" value="${DMC.escapeHtml(o.trackingNo||'')}" placeholder="เช่น KEX12345678">
          </div>
        </div>
        <div style="font-size:.74rem;color:var(--text-3);margin-top:.4rem">💡 เมื่อใส่เลขพัสดุ ลูกค้าจะเห็นในหน้า "ติดตามออเดอร์" พร้อมลิงก์ตรวจสอบกับขนส่ง</div>
      </div>

      <div style="display:flex;gap:.75rem">
        <button class="btn btn-primary btn-md" style="flex:1" onclick="updateOrderStatus('${o.id}')">💾 บันทึก</button>
        <button class="btn btn-ghost btn-md" onclick="closeModal()">ปิด</button>
      </div>`;

    // Wire image clicks (createElement — ปลอดภัยจาก quote ใน URL)
    setTimeout(() => {
      const slipImg = document.getElementById('slip-img-' + o.id);
      if (slipImg) slipImg.addEventListener('click', () => openImageLightbox(slipImg.src));
      const fileWrap = document.getElementById('file-urls-wrap-' + o.id);
      if (fileWrap && o.fileUrls && o.fileUrls.length) {
        o.fileUrls.forEach(url => {
          const img = document.createElement('img');
          img.src = url;
          img.style.cssText = 'height:70px;border-radius:var(--r-md);border:1.5px solid var(--border);cursor:zoom-in;object-fit:cover';
          img.title = 'คลิกเพื่อดูเต็มหน้าจอ';
          img.addEventListener('click', () => openImageLightbox(url));
          fileWrap.appendChild(img);
        });
      }
    }, 50);
  } catch(e) { body.innerHTML = '<p style="color:var(--rose)">เกิดข้อผิดพลาด: '+DMC.escapeHtml(e.message)+'</p>'; }
};

window.updateOrderStatus = async function(id) {
  const s        = document.getElementById('modal-status-select')?.value;
  const carrier  = document.getElementById('modal-carrier-select')?.value || '';
  const tracking = document.getElementById('modal-tracking-input')?.value.trim() || '';
  if (!s) return;
  try {
    await db.collection('orders').doc(id).update({
      status: s, carrier, trackingNo: tracking,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    DMC.toast('บันทึกสำเร็จ ✅', 'success');
    closeModal(); loadOrdersTable(); loadKPIs();
  } catch(e) { DMC.toast('บันทึกไม่สำเร็จ', 'error'); }
};

// ── Lightbox (createElement pattern) ──
window.openImageLightbox = function(url) {
  var lb = document.getElementById('img-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'img-lightbox';
    lb.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:1rem;cursor:zoom-out;backdrop-filter:blur(4px)';
    var img = document.createElement('img');
    img.id = 'img-lb-img';
    img.style.cssText = 'max-width:95vw;max-height:92vh;border-radius:12px;object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,.5)';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position:absolute;top:1rem;right:1rem;width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:1.3rem;cursor:pointer;display:flex;align-items:center;justify-content:center';
    closeBtn.addEventListener('click', function(){ lb.style.display = 'none'; });
    lb.appendChild(img);
    lb.appendChild(closeBtn);
    lb.addEventListener('click', function(e){ if (e.target === lb) lb.style.display = 'none'; });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') lb.style.display = 'none'; });
    document.body.appendChild(lb);
  }
  document.getElementById('img-lb-img').src = url;
  lb.style.display = 'flex';
};

window.closeModal = function() { document.getElementById('modal-overlay')?.classList.remove('open'); };

function statusShort(s) {
  const found = ORDER_STATUSES.find(x => x.key === s);
  return found ? found.short : '📥 รับแล้ว';
}
function setAdminText(id, text) { const el=document.getElementById(id); if(el) el.textContent=text; }

// ══════════════════════════════════════════════
//  PRODUCTS (Multi-image + Video + Templates)
// ══════════════════════════════════════════════
async function loadProducts(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>🛍️ จัดการสินค้า</h2><p>เพิ่ม แก้ไข รูปหลายรูป วิดีโอ และเทมเพลต</p></div>
      <div class="admin-topbar-actions">
        <input class="form-input" id="product-search" placeholder="🔍 ค้นหาสินค้า..." style="width:200px">
        <button class="btn btn-primary btn-md" id="add-product-btn">+ เพิ่มสินค้าใหม่</button>
      </div>
    </div>
    <div class="admin-box">
      <div id="products-table-wrap">${typeof Loading !== 'undefined' ? Loading.Skeleton.tableRows(4) : ''}</div>
    </div>`;
  document.getElementById('add-product-btn')?.addEventListener('click', () => openProductModal(null));
  document.getElementById('product-search')?.addEventListener('input', DMC.debounce(loadProductsTable, 300));
  await loadProductsTable();
}

function adminCoverOf(p) {
  if (Array.isArray(p.images) && p.images.length) {
    const ci = Number(p.coverIndex);
    const item = (!isNaN(ci) && p.images[ci]) ? p.images[ci] : p.images[0];
    return typeof item === 'string' ? item : (item.url || '');
  }
  return p.image || '';
}

async function loadProductsTable() {
  const el     = document.getElementById('products-table-wrap');
  const search = document.getElementById('product-search')?.value.toLowerCase().trim() || '';
  if (!el) return;
  try {
    const snap = await db.collection('products').get();
    if (snap.empty) {
      el.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-3)">ยังไม่มีสินค้า<br><button class="btn btn-primary btn-md" style="margin-top:1rem" onclick="openProductModal(null)">+ เพิ่มสินค้าแรก</button></div>`;
      return;
    }
    let products = [];
    snap.forEach(doc => products.push({id:doc.id,...doc.data()}));
    if (search) products = products.filter(p => (p.name||'').toLowerCase().includes(search) || (p.category||'').toLowerCase().includes(search));
    products.sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

    const rows = products.map(p => {
      const cover = adminCoverOf(p);
      const imgCount = Array.isArray(p.images) ? p.images.length : (p.image ? 1 : 0);
      return `<tr>
      <td>
        <div style="width:46px;height:46px;border-radius:var(--r-md);background:var(--bg-mid);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:1.3rem;position:relative">
          ${cover?`<img src="${cover}" style="width:100%;height:100%;object-fit:contain;padding:2px">`:(p.emoji||'📦')}
          ${imgCount>1?`<span style="position:absolute;bottom:0;right:0;background:var(--accent);color:#fff;font-size:.55rem;padding:0 .25rem;border-radius:4px 0 0 0">${imgCount}</span>`:''}
        </div>
      </td>
      <td><div style="font-family:var(--font-display);font-weight:600">${DMC.escapeHtml(p.name)}</div><div style="font-size:.75rem;color:var(--text-3)">${DMC.escapeHtml(p.category||'—')}${p.videoUrl?' · 🎬':''}${p.hasPreview?' · 🎨':''}</div></td>
      <td class="price-cell">${DMC.formatPrice(p.price)}<span style="color:var(--text-3);font-size:.75rem">/${DMC.escapeHtml(p.unit||'ชิ้น')}</span></td>
      <td>
        <div style="display:flex;gap:.3rem;flex-wrap:wrap">
          ${p.isNew?'<span class="badge badge-new" style="font-size:.65rem">✨</span>':''}
          ${p.isHot?'<span class="badge badge-hot" style="font-size:.65rem">🔥</span>':''}
          ${p.isSale?'<span class="badge badge-sale" style="font-size:.65rem">💰</span>':''}
          ${p.featured?'<span class="badge badge-accent" style="font-size:.65rem">⭐</span>':''}
        </div>
      </td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${p.active?'checked':''} onchange="toggleProduct('${p.id}',this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div style="display:flex;gap:.35rem">
          <button class="table-action-btn" onclick="openProductModal('${p.id}')">✏️ แก้ไข</button>
          <button class="table-action-btn btn-del-product" style="color:var(--rose);border-color:var(--rose)" data-id="${p.id}" data-name="${DMC.escapeHtml(p.name)}">🗑️</button>
        </div>
      </td>
    </tr>`;}).join('');

    el.innerHTML = `<div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>รูป</th><th>สินค้า</th><th>ราคา</th><th>แท็ก</th><th>แสดง</th><th>จัดการ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;

    // ปุ่มลบ — ใช้ data-attr กัน quote ในชื่อสินค้า
    el.querySelectorAll('.btn-del-product').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.id, btn.dataset.name));
    });
  } catch(e) { el.innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ: '+DMC.escapeHtml(e.message)+'</div>'; }
}

window.toggleProduct = async function(id, active) {
  try { await db.collection('products').doc(id).update({active}); DMC.toast(`${active?'เปิด':'ปิด'}แสดงสินค้า`, 'success'); }
  catch(e) { DMC.toast('บันทึกไม่สำเร็จ','error'); }
};

function deleteProduct(id, name) {
  if (!confirm('ลบสินค้า "' + name + '"?\nไม่สามารถย้อนกลับได้')) return;
  db.collection('products').doc(id).delete()
    .then(() => { DMC.toast('ลบสินค้าแล้ว','success'); loadProductsTable(); })
    .catch(() => DMC.toast('ลบไม่สำเร็จ','error'));
}

// ── Product Modal state ──
let _modalImages = [];     // [{url, label}]
let _modalCoverIndex = 0;
let _customTplCache = null;

async function fetchCustomTemplatesOnce() {
  if (_customTplCache) return _customTplCache;
  try {
    const snap = await db.collection('templates').get();
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    _customTplCache = list;
  } catch(e) { _customTplCache = []; }
  return _customTplCache;
}

window.openProductModal = async function(productId) {
  const overlay = document.getElementById('modal-overlay');
  const body    = document.getElementById('modal-body');
  if (!overlay||!body) return;

  let product = { name:'', category:'โพลารอยด์', price:'', unit:'ใบ', shortDesc:'', fullDesc:'',
                  emoji:'📦', images:[], coverIndex:0, videoUrl:'', active:true, isNew:false, isHot:false,
                  isSale:false, featured:false, minQty:1, sizes:[], materials:[], priceTiers:[],
                  templates:[], hasPreview:false, orderCount:0 };

  body.innerHTML = '<div style="text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div>';
  overlay.classList.add('open');

  if (productId) {
    const doc = await db.collection('products').doc(productId).get();
    if (doc.exists) product = Object.assign(product, {id:doc.id}, doc.data());
  }

  // เตรียม state รูป (รองรับสินค้าเก่าที่มี image เดี่ยว)
  _modalImages = Array.isArray(product.images) && product.images.length
    ? product.images.map(im => typeof im === 'string' ? {url:im, label:''} : {url:im.url||'', label:im.label||''})
    : (product.image ? [{url:product.image, label:''}] : []);
  _modalCoverIndex = Math.min(Number(product.coverIndex)||0, Math.max(_modalImages.length-1, 0));

  const customTpls = await fetchCustomTemplatesOnce();
  // หมวด built-in จาก module กลาง (js/categories.js) + 'อื่นๆ' ปิดท้าย
  const baseCats = (window.DMCCat ? DMCCat.BUILTIN.map(c => c.name) : []).concat(['อื่นๆ']);
  const customCats = await fetchCustomCategoriesOnce();
  const categories = baseCats.slice();
  customCats.forEach(cc => { if (!categories.includes(cc.name)) categories.splice(categories.length-1, 0, cc.name); });
  const selectedTpls = (product.templates||[]).map(t=>String(t).toLowerCase());

  body.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${productId?'✏️ แก้ไขสินค้า':'➕ เพิ่มสินค้าใหม่'}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>

    <!-- รูปสินค้า (หลายรูป) -->
    <div class="form-group">
      <label class="form-label">🖼️ รูปสินค้า <span style="font-weight:400;color:var(--text-3)">— เพิ่มได้หลายรูป เลือกปก ⭐ และใส่ชื่อแบบเพื่อให้รูปสลับตามตัวเลือก</span></label>
      <div id="p-images-list"></div>
      <button type="button" id="p-add-image-btn" style="margin-top:.5rem">➕ เพิ่มรูปอีก</button>
      <input type="file" id="p-img-file-hidden" accept="image/*" style="display:none">
      <div style="font-size:.73rem;color:var(--text-3);margin-top:.35rem">💡 ใส่ "ชื่อแบบ" ให้ตรงกับตัวเลือกขนาด/วัสดุ เช่น "2x3 นิ้ว" — ลูกค้ากดตัวเลือกนั้นแล้วรูปจะสลับให้เอง</div>
    </div>

    <!-- วิดีโอ -->
    <div class="form-group">
      <label class="form-label">🎬 วิดีโอสินค้า <span style="font-weight:400;color:var(--text-3)">(ลิงก์ YouTube หรือ TikTok — ไม่บังคับ)</span></label>
      <input class="form-input" id="p-video" value="${DMC.escapeHtml(product.videoUrl||'')}" placeholder="https://youtu.be/... หรือ https://www.tiktok.com/@shop/video/...">
    </div>

    <!-- ชื่อ + Emoji -->
    <div class="form-row" style="margin-bottom:1rem">
      <div class="form-group" style="margin:0">
        <label class="form-label">ชื่อสินค้า *</label>
        <input class="form-input" id="p-name" value="${DMC.escapeHtml(product.name)}" placeholder="ชื่อสินค้า">
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">Emoji (ถ้าไม่มีรูป)</label>
        <input class="form-input" id="p-emoji" value="${DMC.escapeHtml(product.emoji||'📦')}" placeholder="📦">
      </div>
    </div>

    <div class="form-row" style="margin-bottom:1rem">
      <div class="form-group" style="margin:0">
        <label class="form-label">หมวดหมู่ *</label>
        <select class="form-input form-select" id="p-category">
          ${categories.map(c=>`<option ${product.category===c?'selected':''}>${c}</option>`).join('')}
          <option value="__add__">➕ เพิ่มหมวดหมู่ใหม่...</option>
        </select>
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">หน่วย</label>
        <input class="form-input" id="p-unit" value="${DMC.escapeHtml(product.unit||'ชิ้น')}" placeholder="ใบ / ชิ้น / ชุด">
      </div>
    </div>

    <div class="form-row-3" style="margin-bottom:1rem">
      <div class="form-group" style="margin:0">
        <label class="form-label">ราคา (฿) *</label>
        <input class="form-input" id="p-price" type="number" value="${product.price||''}" placeholder="0">
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">ราคาเดิม (ก่อนลด)</label>
        <input class="form-input" id="p-oldprice" type="number" value="${product.oldPrice||''}" placeholder="ว่างถ้าไม่มี">
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">ขั้นต่ำ</label>
        <input class="form-input" id="p-minqty" type="number" value="${product.minQty||1}" placeholder="1">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">📐 ตัวเลือกขนาด <span style="font-weight:400;color:var(--text-3)">(คั่นด้วย , เช่น 2x3 นิ้ว, 3x4 นิ้ว)</span></label>
      <input class="form-input" id="p-sizes" value="${DMC.escapeHtml((product.sizes||[]).join(', '))}" placeholder="2x3 นิ้ว, 3x4 นิ้ว, 4x6 นิ้ว">
    </div>

    <div class="form-group">
      <label class="form-label">🗒️ วัสดุ/การเคลือบ <span style="font-weight:400;color:var(--text-3)">(คั่นด้วย ,)</span></label>
      <input class="form-input" id="p-materials" value="${DMC.escapeHtml((product.materials||[]).join(', '))}" placeholder="มันเงา (Glossy), ด้าน (Matte)">
    </div>

    <div class="form-group">
      <label class="form-label">🎁 ส่วนลดตามปริมาณ <span style="font-weight:400;color:var(--text-3)">(คั่นด้วย ,)</span></label>
      <input class="form-input" id="p-tiers" value="${DMC.escapeHtml((product.priceTiers||[]).join(', '))}" placeholder="50+ ใบ ลด 10%, 100+ ใบ ลด 20%">
    </div>

    <!-- Canvas Preview + Templates -->
    <div class="form-group" style="background:var(--bg-mid);border-radius:var(--r-lg);padding:1rem">
      <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-family:var(--font-display);font-weight:600;font-size:.92rem;margin-bottom:.4rem">
        <input type="checkbox" id="p-preview" ${product.hasPreview?'checked':''} style="accent-color:var(--accent);width:17px;height:17px">
        🎨 เปิดให้ลูกค้าลองดูตัวอย่าง (Canvas Preview)
      </label>
      <div style="font-size:.76rem;color:var(--text-3);margin-bottom:.65rem">เปิดแล้วลูกค้าจะอัปโหลดรูปตัวเองเพื่อดูตัวอย่างกับเทมเพลตได้ในหน้าสินค้านี้</div>
      <div id="p-templates-wrap" style="display:${product.hasPreview?'':'none'}">
        <div style="font-size:.8rem;font-family:var(--font-display);font-weight:600;margin-bottom:.4rem">เลือกแบบที่ให้ลูกค้าใช้ <span style="font-weight:400;color:var(--text-3)">(ไม่เลือกเลย = แสดงแบบมาตรฐานทั้ง 6)</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:.5rem">
          ${BUILTIN_TEMPLATES.map(t=>`
            <label class="tpl-check-chip">
              <input type="checkbox" class="p-tpl-check" value="${t.id}" ${selectedTpls.includes(t.id)?'checked':''}>
              <span>${t.emoji} ${t.name}</span>
            </label>`).join('')}
          ${customTpls.map(t=>`
            <label class="tpl-check-chip tpl-custom">
              <input type="checkbox" class="p-tpl-check" value="${t.id}" ${selectedTpls.includes(t.id.toLowerCase())?'checked':''}>
              <span>🖼️ ${DMC.escapeHtml(t.name||'Custom')}</span>
            </label>`).join('')}
        </div>
        ${customTpls.length===0?'<div style="font-size:.74rem;color:var(--text-3);margin-top:.4rem">💡 อัปโหลดกรอบของร้านเองได้ที่เมนู "เทมเพลต"</div>':''}
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">คำอธิบายสั้น <span style="font-weight:400;color:var(--text-3)">(แสดงในการ์ดสินค้า)</span></label>
      <input class="form-input" id="p-shortdesc" value="${DMC.escapeHtml(product.shortDesc||'')}" placeholder="คำอธิบายสั้นๆ">
    </div>
    <div class="form-group">
      <label class="form-label">รายละเอียดเต็ม</label>
      <textarea class="form-input form-textarea" id="p-desc">${DMC.escapeHtml(product.fullDesc||'')}</textarea>
    </div>

    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem">
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-active" ${product.active?'checked':''} style="accent-color:var(--accent)"> แสดงสินค้า
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-new" ${product.isNew?'checked':''} style="accent-color:var(--emerald)"> ✨ ใหม่
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-hot" ${product.isHot?'checked':''} style="accent-color:var(--rose)"> 🔥 ขายดี
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-sale" ${product.isSale?'checked':''} style="accent-color:var(--gold)"> 💰 ลด
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-featured" ${product.featured?'checked':''} style="accent-color:var(--gold)"> ⭐ แนะนำ
      </label>
    </div>

    <div style="display:flex;gap:.75rem">
      <button class="btn btn-primary btn-md" id="p-save-btn" style="flex:1">💾 ${productId?'บันทึกการแก้ไข':'เพิ่มสินค้า'}</button>
      <button class="btn btn-ghost btn-md" onclick="closeModal()">ยกเลิก</button>
    </div>`;

  renderModalImages();

  // toggle templates section
  document.getElementById('p-preview')?.addEventListener('change', e => {
    document.getElementById('p-templates-wrap').style.display = e.target.checked ? '' : 'none';
  });
  document.getElementById('p-add-image-btn')?.addEventListener('click', () => {
    _modalImages.push({url:'', label:''});
    renderModalImages();
  });
  // เพิ่มหมวดหมู่ใหม่จาก dropdown
  document.getElementById('p-category')?.addEventListener('change', function(){
    if (this.value === '__add__') promptNewCategory(this);
  });
  document.getElementById('p-save-btn')?.addEventListener('click', () => saveProduct(productId||''));
};

// ── รายการรูปใน modal (delegation — ไม่มี onclick ใน template) ──

let _customCatsCache = null;
async function fetchCustomCategoriesOnce() {
  if (_customCatsCache) return _customCatsCache;
  try {
    const snap = await db.collection('categories').get();
    const list = [];
    snap.forEach(d => { const x = d.data(); list.push({ id: d.id, name: x.name||d.id, emoji: x.emoji||'', slug: x.slug||d.id }); });
    _customCatsCache = list;
    return list;
  } catch(e) { return []; }
}

async function promptNewCategory(selectEl) {
  const name = prompt('ชื่อหมวดหมู่ใหม่ (เช่น สติกเกอร์, ปฏิทิน):');
  if (!name || !name.trim()) { selectEl.value = selectEl.options[0].value; return; }
  const emoji = prompt('อิโมจิประจำหมวด (ไม่บังคับ เช่น 🏷️):', '🏷️') || '';
  const clean = name.trim();
  const slug = 'cat-' + Date.now().toString(36);
  try {
    await db.collection('categories').add({ name: clean, emoji: emoji.trim(), slug, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    _customCatsCache = null;  // refresh
    DMC.toast('เพิ่มหมวด "'+clean+'" แล้ว ✅','success');
    // เพิ่ม option ใหม่ก่อน __add__ แล้วเลือก
    const addOpt = selectEl.querySelector('option[value="__add__"]');
    const opt = document.createElement('option');
    opt.textContent = clean; opt.value = clean;
    selectEl.insertBefore(opt, addOpt);
    selectEl.value = clean;
  } catch(e) {
    DMC.toast('เพิ่มไม่สำเร็จ: '+e.message,'error');
    selectEl.value = selectEl.options[0].value;
  }
}

function renderModalImages() {
  const wrap = document.getElementById('p-images-list');
  if (!wrap) return;
  if (_modalImages.length === 0) _modalImages.push({url:'', label:''});
  if (_modalCoverIndex >= _modalImages.length) _modalCoverIndex = 0;

  wrap.innerHTML = _modalImages.map((im, i) => `
    <div class="p-img-card ${i===_modalCoverIndex?'is-cover':''}" data-idx="${i}">
      <div class="p-img-preview">
        ${im.url
          ? `<img src="${DMC.escapeHtml(im.url)}" alt="" onerror="this.style.display='none';this.parentElement.classList.add('empty')">`
          : '<span class="p-img-ph">🖼️ ยังไม่มีรูป</span>'}
        ${i===_modalCoverIndex ? '<span class="p-img-cover-tag">⭐ รูปปก</span>' : ''}
        <span class="p-img-num">${i+1}</span>
      </div>
      <div class="p-img-inputs">
        <input class="form-input p-img-url" data-idx="${i}" value="${DMC.escapeHtml(im.url)}" placeholder="วาง URL รูป หรือกดปุ่มอัปโหลดด้านล่าง" style="font-size:.82rem">
        <input class="form-input p-img-label" data-idx="${i}" value="${DMC.escapeHtml(im.label)}" placeholder="ชื่อแบบ เช่น 2x3 นิ้ว (ไม่บังคับ)" style="font-size:.82rem">
      </div>
      <div class="p-img-buttons">
        <button type="button" class="p-img-action upload" data-action="upload" data-idx="${i}">📤 อัปโหลดรูป</button>
        <button type="button" class="p-img-action cover ${i===_modalCoverIndex?'active':''}" data-action="cover" data-idx="${i}">${i===_modalCoverIndex?'⭐ เป็นรูปปกแล้ว':'☆ ตั้งเป็นรูปปก'}</button>
        <button type="button" class="p-img-action remove" data-action="remove" data-idx="${i}">🗑️ ลบ</button>
      </div>
    </div>`).join('');

  wrap.querySelectorAll('.p-img-url').forEach(inp => {
    inp.addEventListener('input', () => { _modalImages[Number(inp.dataset.idx)].url = inp.value.trim(); });
    inp.addEventListener('change', () => renderModalImages());
  });
  wrap.querySelectorAll('.p-img-label').forEach(inp => {
    inp.addEventListener('input', () => { _modalImages[Number(inp.dataset.idx)].label = inp.value; });
  });

  wrap.querySelectorAll('.p-img-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.idx);
      const action = btn.dataset.action;
      if (action === 'cover') {
        _modalCoverIndex = idx; renderModalImages();
      } else if (action === 'remove') {
        if (_modalImages.length === 1) { _modalImages[0] = {url:'',label:''}; }
        else { _modalImages.splice(idx, 1); }
        if (_modalCoverIndex >= _modalImages.length) _modalCoverIndex = 0;
        renderModalImages();
      } else if (action === 'upload') {
        const fileInput = document.getElementById('p-img-file-hidden');
        fileInput.onchange = async () => {
          const file = fileInput.files[0];
          fileInput.value = '';
          if (!file) return;
          const orig = btn.innerHTML;
          btn.innerHTML = '⏳ กำลังอัปโหลด...';
          btn.disabled = true;
          try {
            const up = await DMC.compressImage(file);
            const res = await DMC.uploadToImgBB(up);
            _modalImages[idx].url = res.url;
            DMC.toast('อัปโหลดรูปสำเร็จ ✅', 'success');
          } catch(e) {
            DMC.toast('อัปโหลดไม่สำเร็จ: ' + e.message, 'error');
          }
          renderModalImages();
        };
        fileInput.click();
      }
    });
  });
}

window.saveProduct = async function(productId) {
  const splitComma = id => (document.getElementById(id)?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
  const oldPriceRaw = document.getElementById('p-oldprice')?.value;

  // เก็บเฉพาะรูปที่มี URL
  const images = _modalImages.filter(im => im.url).map(im => ({url:im.url, label:(im.label||'').trim()}));
  let coverIndex = _modalCoverIndex;
  if (coverIndex >= images.length) coverIndex = 0;

  const tplChecks = Array.from(document.querySelectorAll('.p-tpl-check:checked')).map(c => c.value);

  const data = {
    name:       document.getElementById('p-name')?.value.trim(),
    category:   document.getElementById('p-category')?.value,
    price:      parseFloat(document.getElementById('p-price')?.value)||0,
    oldPrice:   oldPriceRaw ? (parseFloat(oldPriceRaw)||null) : null,
    minQty:     parseInt(document.getElementById('p-minqty')?.value)||1,
    unit:       document.getElementById('p-unit')?.value.trim()||'ชิ้น',
    sizes:      splitComma('p-sizes'),
    materials:  splitComma('p-materials'),
    priceTiers: splitComma('p-tiers'),
    templates:  tplChecks,
    shortDesc:  document.getElementById('p-shortdesc')?.value.trim(),
    fullDesc:   document.getElementById('p-desc')?.value.trim(),
    emoji:      document.getElementById('p-emoji')?.value.trim()||'📦',
    images,
    coverIndex,
    image:      images.length ? (images[coverIndex]||images[0]).url : '',  // backward compat
    videoUrl:   document.getElementById('p-video')?.value.trim()||'',
    active:     !!document.getElementById('p-active')?.checked,
    hasPreview: !!document.getElementById('p-preview')?.checked,
    isNew:      !!document.getElementById('p-new')?.checked,
    isHot:      !!document.getElementById('p-hot')?.checked,
    isSale:     !!document.getElementById('p-sale')?.checked,
    featured:   !!document.getElementById('p-featured')?.checked,
    updatedAt:  firebase.firestore.FieldValue.serverTimestamp(),
  };
  if (!data.name)  { DMC.toast('กรุณากรอกชื่อสินค้า','error'); return; }
  if (!data.price) { DMC.toast('กรุณากรอกราคา','error'); return; }

  const saveBtn = document.getElementById('p-save-btn');
  if (typeof Loading !== 'undefined') Loading.buttonLoad(saveBtn);
  try {
    if (productId) {
      await db.collection('products').doc(productId).update(data);
      DMC.toast('แก้ไขสินค้าสำเร็จ ✅','success');
    } else {
      data.createdAt  = firebase.firestore.FieldValue.serverTimestamp();
      data.orderCount = 0;
      await db.collection('products').add(data);
      DMC.toast('เพิ่มสินค้าใหม่สำเร็จ 🎉','success');
    }
    if (typeof Loading !== 'undefined') Loading.buttonDone(saveBtn);
    closeModal(); loadProductsTable();
  } catch(e) {
    if (typeof Loading !== 'undefined') Loading.buttonDone(saveBtn);
    DMC.toast('บันทึกไม่สำเร็จ: '+e.message,'error');
  }
};

// ══════════════════════════════════════════════
//  GALLERY MANAGEMENT
// ══════════════════════════════════════════════
async function loadGallery(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>🖼️ จัดการตัวอย่างงาน</h2><p>เพิ่มรูปตัวอย่างงานแสดงในหน้า Gallery</p></div>
      <div class="admin-topbar-actions">
        <button class="btn btn-primary btn-md" id="add-gallery-btn">+ เพิ่มรูปตัวอย่าง</button>
      </div>
    </div>
    <div class="admin-box" id="gallery-add-form" style="display:none">
      <div class="admin-box-header"><div class="admin-box-title">➕ เพิ่มรูปตัวอย่าง</div></div>
      <div class="form-row">
        <div class="form-group" style="margin:0">
          <label class="form-label">ชื่อผลงาน</label>
          <input class="form-input" id="g-name" placeholder="ชื่อผลงาน">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">หมวดหมู่</label>
          <select class="form-input form-select" id="g-cat">
            <option value="polaroid">โพลารอยด์</option>
            <option value="lanyard">บัตรแขวนคอ</option>
            <option value="business-card">นามบัตร</option>
            <option value="shop-sign">ป้ายร้านค้า</option>
            <option value="qrcode">QR Code</option>
            <option value="doll-tag">ป้ายตุ๊กตา</option>
            <option value="student-card">บัตรนักเรียน</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">รูปภาพ</label>
        <div style="display:flex;gap:.75rem;align-items:center">
          <input type="file" id="g-img-file" accept="image/*" style="display:none">
          <button class="btn btn-ghost btn-sm" id="g-upload-btn" style="border-radius:var(--r-md)">📤 อัปโหลด</button>
          <span id="g-upload-status" style="font-size:.78rem;color:var(--text-3)"></span>
        </div>
        <input class="form-input" id="g-image" placeholder="หรือวาง URL รูปภาพ" style="margin-top:.5rem">
      </div>
      <div style="display:flex;gap:.75rem">
        <button class="btn btn-primary btn-md" id="g-save-btn">💾 บันทึก</button>
        <button class="btn btn-ghost btn-md" id="g-cancel-btn">ยกเลิก</button>
      </div>
    </div>
    <div class="admin-box">
      <div id="gallery-grid-admin" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem">
        <div style="text-align:center;padding:2rem;grid-column:1/-1"><span class="spinner" style="display:block;margin:0 auto"></span></div>
      </div>
    </div>`;

  document.getElementById('add-gallery-btn')?.addEventListener('click', () => {
    const form = document.getElementById('gallery-add-form');
    form.style.display = form.style.display === 'none' ? '' : 'none';
  });
  document.getElementById('g-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('gallery-add-form').style.display = 'none';
  });
  document.getElementById('g-save-btn')?.addEventListener('click', saveGalleryItem);

  const fileInput = document.getElementById('g-img-file');
  const statusEl  = document.getElementById('g-upload-status');
  document.getElementById('g-upload-btn')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      statusEl.textContent = '⏳ กำลังอัปโหลด...';
      statusEl.style.color = 'var(--accent)';
      const res = await DMC.uploadToImgBB(file);
      document.getElementById('g-image').value = res.url;
      statusEl.textContent = '✅ อัปโหลดแล้ว';
      statusEl.style.color = 'var(--emerald)';
    } catch(e) {
      statusEl.textContent = '❌ ไม่สำเร็จ: ' + e.message;
      statusEl.style.color = 'var(--rose)';
    }
  });

  await loadGalleryItems();
}

async function loadGalleryItems() {
  const grid = document.getElementById('gallery-grid-admin');
  if (!grid) return;
  try {
    const snap = await db.collection('gallery').get();
    if (snap.empty) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-3)">ยังไม่มีรูปตัวอย่าง</div>';
      return;
    }
    const docs = [];
    snap.forEach(doc => docs.push({id:doc.id,...doc.data()}));
    docs.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    grid.innerHTML = docs.map(g => `
      <div style="position:relative;border-radius:var(--r-lg);overflow:hidden;border:1.5px solid var(--border);background:var(--bg-mid)">
        ${g.image ? `<img src="${g.image}" style="width:100%;aspect-ratio:1;object-fit:cover" loading="lazy">` : `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:2rem">📸</div>`}
        <div style="padding:.5rem .6rem">
          <div style="font-family:var(--font-display);font-size:.8rem;font-weight:600">${DMC.escapeHtml(g.name||'—')}</div>
          <div style="font-size:.7rem;color:var(--text-3)">${DMC.escapeHtml(g.cat||'')}</div>
        </div>
        <button class="g-del-btn" data-id="${g.id}" style="position:absolute;top:.4rem;right:.4rem;background:rgba(251,113,133,.9);border:none;border-radius:50%;width:24px;height:24px;color:#fff;font-size:.65rem;cursor:pointer">✕</button>
      </div>`).join('');
    grid.querySelectorAll('.g-del-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteGalleryItem(btn.dataset.id));
    });
  } catch(e) { grid.innerHTML = '<div style="grid-column:1/-1;color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ: '+DMC.escapeHtml(e.message)+'</div>'; }
}

async function saveGalleryItem() {
  const data = {
    name:  document.getElementById('g-name')?.value.trim(),
    cat:   document.getElementById('g-cat')?.value,
    image: document.getElementById('g-image')?.value.trim(),
    active: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (!data.name)  { DMC.toast('กรุณากรอกชื่อผลงาน','error'); return; }
  if (!data.image) { DMC.toast('กรุณาอัปโหลดรูปภาพก่อน','error'); return; }
  const gBtn = document.getElementById('g-save-btn');
  if (typeof Loading !== 'undefined') Loading.buttonLoad(gBtn);
  try {
    await db.collection('gallery').add(data);
    if (typeof Loading !== 'undefined') Loading.buttonDone(gBtn);
    DMC.toast('เพิ่มรูปสำเร็จ ✅','success');
    document.getElementById('gallery-add-form').style.display = 'none';
    document.getElementById('g-name').value = '';
    document.getElementById('g-image').value = '';
    document.getElementById('g-upload-status').textContent = '';
    await loadGalleryItems();
  } catch(e) {
    if (typeof Loading !== 'undefined') Loading.buttonDone(gBtn);
    console.error('Gallery save error:', e);
    DMC.toast('บันทึกไม่สำเร็จ: ' + (e.message||'unknown error'), 'error');
  }
}

function deleteGalleryItem(id) {
  if (!confirm('ลบรูปนี้?')) return;
  db.collection('gallery').doc(id).delete()
    .then(() => { DMC.toast('ลบแล้ว','success'); loadGalleryItems(); })
    .catch(() => DMC.toast('ลบไม่สำเร็จ','error'));
}

// ══════════════════════════════════════════════
//  CONTACTS INBOX
// ══════════════════════════════════════════════
async function loadContacts(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>📬 กล่องข้อความ</h2><p>ข้อความจากลูกค้าที่ส่งผ่านหน้าติดต่อเรา</p></div>
    </div>
    <div class="admin-box">
      <div id="contacts-list">${typeof Loading !== 'undefined' ? Loading.Skeleton.tableRows(3) : ''}</div>
    </div>`;

  try {
    const snap = await db.collection('contacts').limit(50).get();
    const el = document.getElementById('contacts-list');
    if (snap.empty) { el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-3)">ยังไม่มีข้อความ</div>'; return; }

    const docs = [];
    snap.forEach(doc => docs.push({id:doc.id,...doc.data()}));
    docs.sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

    el.innerHTML = '<div style="display:flex;flex-direction:column;gap:.75rem">' +
      docs.map(m => `
        <div style="background:var(--bg-mid);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:1rem">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">
            <div>
              <span style="font-family:var(--font-display);font-weight:700;font-size:.92rem">${DMC.escapeHtml(m.name||'—')}</span>
              <span class="badge badge-accent" style="margin-left:.4rem;font-size:.68rem">${DMC.escapeHtml(m.topic||'—')}</span>
            </div>
            <span style="font-size:.75rem;color:var(--text-3)">${m.createdAt?DMC.formatDate(m.createdAt,true):'—'}</span>
          </div>
          <div style="font-size:.82rem;color:var(--text-3);margin-bottom:.4rem">📞 ${DMC.escapeHtml(m.contact||'ไม่ระบุ')}</div>
          <div style="font-size:.87rem;color:var(--text-1);line-height:1.6">${DMC.escapeHtml(m.message||'—')}</div>
          <div style="display:flex;gap:.5rem;margin-top:.6rem">
            <button class="table-action-btn c-del-btn" style="color:var(--rose);border-color:var(--rose)" data-id="${m.id}">🗑️ ลบ</button>
          </div>
        </div>`).join('') + '</div>';

    el.querySelectorAll('.c-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('ลบข้อความนี้?')) return;
        db.collection('contacts').doc(btn.dataset.id).delete()
          .then(() => { DMC.toast('ลบแล้ว','success'); loadContacts(document.getElementById('admin-content')); })
          .catch(() => DMC.toast('ลบไม่สำเร็จ','error'));
      });
    });
  } catch(e) {
    document.getElementById('contacts-list').innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ: '+DMC.escapeHtml(e.message)+'</div>';
  }
}

// ══════════════════════════════════════════════
//  REVIEWS MANAGEMENT (อนุมัติ/ปฏิเสธ + เพิ่มรีวิวร้าน)
// ══════════════════════════════════════════════
async function loadReviewsAdmin(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>⭐ จัดการรีวิว</h2><p>อนุมัติรีวิวลูกค้า และเพิ่มรีวิวจากร้าน</p></div>
      <div class="admin-topbar-actions">
        <button class="btn btn-primary btn-md" id="add-review-btn">+ เพิ่มรีวิวจากร้าน</button>
      </div>
    </div>

    <!-- ฟอร์มเพิ่มรีวิวจากร้าน -->
    <div class="admin-box" id="admin-review-form" style="display:none">
      <div class="admin-box-header"><div class="admin-box-title">🏪 เพิ่มรีวิวจากร้าน</div></div>
      <div class="form-row" style="margin-bottom:1rem">
        <div class="form-group" style="margin:0">
          <label class="form-label">ชื่อลูกค้า (แสดงผล)</label>
          <input class="form-input" id="ar-name" maxlength="40" placeholder="เช่น คุณฝน จ.พัทลุง">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">คะแนน</label>
          <select class="form-input form-select" id="ar-rating">
            <option value="5">★★★★★ (5)</option>
            <option value="4">★★★★ (4)</option>
            <option value="3">★★★ (3)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">สินค้า (ไม่บังคับ)</label>
        <select class="form-input form-select" id="ar-product"><option value="">— ไม่ระบุ —</option></select>
      </div>
      <div class="form-group">
        <label class="form-label">ข้อความรีวิว</label>
        <textarea class="form-input form-textarea" id="ar-text" maxlength="500" placeholder="งานสวยมาก ส่งไว แพ็คดี..."></textarea>
      </div>
      <div style="display:flex;gap:.75rem">
        <button class="btn btn-primary btn-md" id="ar-save-btn">💾 บันทึกรีวิว</button>
        <button class="btn btn-ghost btn-md" id="ar-cancel-btn">ยกเลิก</button>
      </div>
    </div>

    <!-- รออนุมัติ -->
    <div class="admin-box">
      <div class="admin-box-header">
        <div class="admin-box-title">⏳ รออนุมัติ <span class="badge badge-hot" id="rv-pending-count" style="font-size:.7rem"></span></div>
      </div>
      <div id="rv-pending-list"><div style="text-align:center;padding:1.5rem"><span class="spinner" style="display:block;margin:0 auto"></span></div></div>
    </div>

    <!-- อนุมัติแล้ว -->
    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">✅ แสดงบนเว็บแล้ว</div></div>
      <div id="rv-approved-list"><div style="text-align:center;padding:1.5rem"><span class="spinner" style="display:block;margin:0 auto"></span></div></div>
    </div>`;

  // toggle ฟอร์ม
  const form = document.getElementById('admin-review-form');
  document.getElementById('add-review-btn')?.addEventListener('click', () => {
    form.style.display = form.style.display === 'none' ? '' : 'none';
  });
  document.getElementById('ar-cancel-btn')?.addEventListener('click', () => { form.style.display = 'none'; });

  // เติมรายชื่อสินค้าใน dropdown
  try {
    const snap = await db.collection('products').get();
    const sel = document.getElementById('ar-product');
    snap.forEach(doc => {
      const opt = document.createElement('option');
      opt.value = doc.id;
      opt.textContent = doc.data().name || doc.id;
      sel.appendChild(opt);
    });
  } catch(e) {}

  // บันทึกรีวิวร้าน (อนุมัติทันที)
  document.getElementById('ar-save-btn')?.addEventListener('click', async () => {
    const name   = document.getElementById('ar-name')?.value.trim();
    const rating = parseInt(document.getElementById('ar-rating')?.value) || 5;
    const text   = document.getElementById('ar-text')?.value.trim();
    const prodEl = document.getElementById('ar-product');
    const productId   = prodEl?.value || '';
    const productName = productId ? (prodEl.options[prodEl.selectedIndex]?.textContent || '') : '';
    if (!name || !text) { DMC.toast('กรอกชื่อและข้อความรีวิว', 'error'); return; }
    const btn = document.getElementById('ar-save-btn');
    if (typeof Loading !== 'undefined') Loading.buttonLoad(btn);
    try {
      await db.collection('reviews').add({
        name, rating, text, productId, productName,
        status: 'approved', source: 'admin',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      DMC.toast('เพิ่มรีวิวแล้ว ✅', 'success');
      form.style.display = 'none';
      document.getElementById('ar-name').value = '';
      document.getElementById('ar-text').value = '';
      await refreshReviewLists();
    } catch(e) {
      DMC.toast('บันทึกไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      if (typeof Loading !== 'undefined') Loading.buttonDone(btn);
    }
  });

  await refreshReviewLists();
}

async function refreshReviewLists() {
  const pendEl = document.getElementById('rv-pending-list');
  const apprEl = document.getElementById('rv-approved-list');
  if (!pendEl || !apprEl) return;
  try {
    const snap = await db.collection('reviews').limit(200).get();
    const pending = [], approved = [];
    snap.forEach(doc => {
      const r = { id: doc.id, ...doc.data() };
      (r.status === 'approved' ? approved : pending).push(r);
    });
    const byTime = (a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0);
    pending.sort(byTime); approved.sort(byTime);

    const countEl = document.getElementById('rv-pending-count');
    if (countEl) countEl.textContent = pending.length ? pending.length + ' รายการ' : '';

    pendEl.innerHTML = pending.length
      ? pending.map(r => adminReviewCard(r, true)).join('')
      : '<div style="text-align:center;padding:1.25rem;color:var(--text-3)">ไม่มีรีวิวรออนุมัติ 🎉</div>';
    apprEl.innerHTML = approved.length
      ? approved.map(r => adminReviewCard(r, false)).join('')
      : '<div style="text-align:center;padding:1.25rem;color:var(--text-3)">ยังไม่มีรีวิวที่แสดง</div>';

    // wire ปุ่ม (ไม่ใช้ onclick ใน template — กัน SyntaxError จาก quotes)
    [pendEl, apprEl].forEach(el => {
      el.querySelectorAll('[data-rv-approve]').forEach(btn => btn.addEventListener('click', () => setReviewStatus(btn.dataset.rvApprove, 'approved')));
      el.querySelectorAll('[data-rv-reject]').forEach(btn  => btn.addEventListener('click', () => setReviewStatus(btn.dataset.rvReject, 'rejected')));
      el.querySelectorAll('[data-rv-del]').forEach(btn => btn.addEventListener('click', () => {
        if (!confirm('ลบรีวิวนี้ถาวร?')) return;
        db.collection('reviews').doc(btn.dataset.rvDel).delete()
          .then(() => { DMC.toast('ลบแล้ว','success'); refreshReviewLists(); })
          .catch(() => DMC.toast('ลบไม่สำเร็จ','error'));
      }));
    });
  } catch(e) {
    pendEl.innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ: ' + DMC.escapeHtml(e.message) + '</div>';
    apprEl.innerHTML = '';
  }
}

function adminReviewCard(r, isPending) {
  const date  = r.createdAt?.toDate ? DMC.formatDate(r.createdAt, true) : '—';
  const stars = '★'.repeat(Math.round(r.rating||0)) + '☆'.repeat(5 - Math.round(r.rating||0));
  const src   = r.source === 'admin' ? '<span class="badge badge-accent" style="font-size:.65rem">🏪 ร้าน</span>' : '<span class="badge badge-new" style="font-size:.65rem">👤 ลูกค้า</span>';
  return `
    <div style="background:var(--bg-mid);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:.9rem 1rem;margin-bottom:.65rem">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;flex-wrap:wrap">
        <div>
          <strong style="font-family:var(--font-display)">${DMC.escapeHtml(r.name||'—')}</strong> ${src}
          <span style="color:var(--gold);font-size:.85rem;margin-left:.35rem">${stars}</span>
          ${r.productName ? '<div style="font-size:.74rem;color:var(--text-3);margin-top:.15rem">📦 ' + DMC.escapeHtml(r.productName) + '</div>' : ''}
        </div>
        <span style="font-size:.72rem;color:var(--text-3)">${date}</span>
      </div>
      <div style="font-size:.86rem;color:var(--text-2);margin:.5rem 0;line-height:1.6">${DMC.escapeHtml(r.text||'')}</div>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap">
        ${isPending ? `<button class="table-action-btn" style="color:var(--emerald);border-color:var(--emerald)" data-rv-approve="${r.id}">✅ อนุมัติ</button>` : ''}
        ${isPending ? `<button class="table-action-btn" data-rv-reject="${r.id}">🚫 ปฏิเสธ</button>` : ''}
        <button class="table-action-btn" style="color:var(--rose);border-color:var(--rose)" data-rv-del="${r.id}">🗑️ ลบ</button>
      </div>
    </div>`;
}

async function setReviewStatus(id, status) {
  try {
    await db.collection('reviews').doc(id).update({ status, moderatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    DMC.toast(status === 'approved' ? 'อนุมัติแล้ว ✅' : 'ปฏิเสธแล้ว', 'success');
    refreshReviewLists();
  } catch(e) { DMC.toast('อัพเดทไม่สำเร็จ', 'error'); }
}

// ══════════════════════════════════════════════
//  SITE CONTENT CMS (แก้หน้าบ้านจากหลังบ้าน)
// ══════════════════════════════════════════════
async function loadContentCMS(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>📝 เนื้อหาเว็บไซต์</h2><p>แก้ไขข้อความหน้าบ้านทั้งหมด — บันทึกแล้วมีผลทันที</p></div>
      <div class="admin-topbar-actions">
        <a href="about.html?edit=1" class="btn btn-ghost btn-md" style="border-radius:var(--r-lg)" title="ไปแก้เนื้อหาบนหน้าเว็บจริงแบบเห็นภาพ">✏️ แก้บนหน้าเว็บจริง</a>
        <button class="btn btn-primary btn-md" id="cms-save-btn">💾 บันทึกทั้งหมด</button>
      </div>
    </div>
    <div class="settings-grid" id="cms-grid">
      <div style="grid-column:1/-1;text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div>
    </div>`;

  let content;
  try {
    if (typeof CMS !== 'undefined') CMS.clearCache();
    content = await CMS.get();
  } catch(e) {
    document.getElementById('cms-grid').innerHTML = '<div style="grid-column:1/-1;color:var(--rose)">โหลดเนื้อหาไม่สำเร็จ</div>';
    return;
  }

  const v = (s) => DMC.escapeHtml(s || '');
  document.getElementById('cms-grid').innerHTML = `
    <!-- Hero -->
    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">🏠 หน้าแรก — Hero</div></div>
      <div class="form-group"><label class="form-label">ป้ายเล็กด้านบน</label><input class="form-input" id="cms-hero-badge" value="${v(content.hero.badge)}"></div>
      <div class="form-group"><label class="form-label">หัวข้อบรรทัด 1</label><input class="form-input" id="cms-hero-t1" value="${v(content.hero.title1)}"></div>
      <div class="form-group"><label class="form-label">หัวข้อบรรทัด 2 (ไฮไลต์)</label><input class="form-input" id="cms-hero-t2" value="${v(content.hero.title2)}"></div>
      <div class="form-group"><label class="form-label">หัวข้อบรรทัด 3</label><input class="form-input" id="cms-hero-t3" value="${v(content.hero.title3)}"></div>
      <div class="form-group"><label class="form-label">คำอธิบายใต้หัวข้อ</label><textarea class="form-input form-textarea" id="cms-hero-desc">${v(content.hero.desc)}</textarea></div>
    </div>

    <!-- ตัวเลขความเชื่อมั่น + โปรโมชั่น -->
    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">📊 ตัวเลขความเชื่อมั่น</div></div>
      <div class="form-row" style="margin-bottom:1rem">
        <div class="form-group" style="margin:0"><label class="form-label">จำนวนออเดอร์ เช่น 500+</label><input class="form-input" id="cms-stat-orders" value="${v(content.stats.orders)}"></div>
        <div class="form-group" style="margin:0"><label class="form-label">คะแนนรีวิว เช่น 4.9/5</label><input class="form-input" id="cms-stat-rating" value="${v(content.stats.rating)}"></div>
      </div>
      <div class="form-group"><label class="form-label">เวลาผลิต (วัน) เช่น 1-3</label><input class="form-input" id="cms-stat-days" value="${v(content.stats.days)}"></div>
      <div class="admin-box-header" style="margin-top:1.25rem"><div class="admin-box-title">🎁 แบนเนอร์โปรโมชั่น</div></div>
      <label style="display:flex;align-items:center;gap:.45rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem;margin-bottom:.85rem">
        <input type="checkbox" id="cms-promo-active" ${content.promo.active ? 'checked' : ''} style="accent-color:var(--accent)"> แสดงแบนเนอร์โปรโมชั่น
      </label>
      <div class="form-group"><label class="form-label">ป้ายกำกับ</label><input class="form-input" id="cms-promo-tag" value="${v(content.promo.tag)}"></div>
      <div class="form-group"><label class="form-label">หัวข้อโปร</label><input class="form-input" id="cms-promo-title" value="${v(content.promo.title)}"></div>
      <div class="form-group"><label class="form-label">รายละเอียด</label><input class="form-input" id="cms-promo-desc" value="${v(content.promo.desc)}"></div>
      <div class="form-group"><label class="form-label">ข้อความปุ่ม</label><input class="form-input" id="cms-promo-btn" value="${v(content.promo.btnText)}"></div>
    </div>

    <!-- ช่องทางติดต่อ -->
    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">📞 ช่องทางติดต่อ (ใช้ทั้งเว็บ)</div></div>
      <div class="form-group"><label class="form-label">LINE URL</label><input class="form-input" id="cms-ct-line" value="${v(content.contact.line)}" placeholder="https://line.me/R/ti/p/@xxx"></div>
      <div class="form-group"><label class="form-label">ชื่อ LINE ID แสดงผล</label><input class="form-input" id="cms-ct-linelabel" value="${v(content.contact.lineLabel)}" placeholder="@yourshop"></div>
      <div class="form-group"><label class="form-label">Facebook URL</label><input class="form-input" id="cms-ct-fb" value="${v(content.contact.facebook)}"></div>
      <div class="form-group"><label class="form-label">Instagram URL</label><input class="form-input" id="cms-ct-ig" value="${v(content.contact.instagram)}"></div>
      <div class="form-group"><label class="form-label">TikTok URL</label><input class="form-input" id="cms-ct-tiktok" value="${v(content.contact.tiktok)}"></div>
      <div class="form-row" style="margin-bottom:0">
        <div class="form-group" style="margin:0"><label class="form-label">อีเมล</label><input class="form-input" id="cms-ct-email" value="${v(content.contact.email)}"></div>
        <div class="form-group" style="margin:0"><label class="form-label">เบอร์โทรร้าน</label><input class="form-input" id="cms-ct-phone" value="${v(content.contact.phone)}"></div>
      </div>
      <div class="form-group" style="margin-top:1rem"><label class="form-label">เวลาทำการ</label><input class="form-input" id="cms-ct-hours" value="${v(content.contact.hours)}"></div>
    </div>

    <!-- PromptPay -->
    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">💳 PromptPay (เปลี่ยนบัญชีได้ที่นี่)</div></div>
      <div class="form-group">
        <label class="form-label">หมายเลขพร้อมเพย์ (เบอร์/เลขบัตร ปชช.)</label>
        <input class="form-input" id="cms-pay-id" value="${v(content.payment.promptpayId)}" placeholder="0812345678" inputmode="numeric">
        <div style="font-size:.74rem;color:var(--text-3);margin-top:.3rem">ระบบสร้าง QR พร้อมยอดเงินให้อัตโนมัติ</div>
      </div>
      <div class="form-group"><label class="form-label">ชื่อบัญชี (แสดงใต้ QR)</label><input class="form-input" id="cms-pay-name" value="${v(content.payment.promptpayName)}" placeholder="นายชัยวุฒิ ..."></div>
      <div class="form-group">
        <label class="form-label">หรืออัปโหลดรูป QR เอง (ถ้าใส่ จะใช้รูปนี้แทน)</label>
        <div style="display:flex;gap:.6rem;align-items:center;margin-bottom:.45rem">
          <input type="file" id="cms-qr-file" accept="image/*" style="display:none">
          <button class="btn btn-ghost btn-sm" id="cms-qr-upload-btn" style="border-radius:var(--r-md)">📤 อัปโหลดรูป QR</button>
          <span id="cms-qr-status" style="font-size:.76rem;color:var(--text-3)"></span>
        </div>
        <input class="form-input" id="cms-pay-qrimg" value="${v(content.payment.qrImageUrl)}" placeholder="URL รูป QR (เว้นว่าง = ใช้ QR อัตโนมัติ)">
      </div>
      <div id="cms-qr-preview" style="text-align:center"></div>
    </div>

    <!-- ช่องทางชำระเงิน (เปิด/ปิด + พร้อม/ไม่พร้อม) -->
    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">🔘 ช่องทางชำระเงิน</div></div>
      <p style="font-size:.82rem;color:var(--text-2);line-height:1.6;margin-bottom:.9rem">
        เลือกช่องทางที่จะแสดงในหน้าชำระเงิน และตั้งสถานะว่าพร้อมใช้งานหรือยัง
      </p>
      <div id="cms-pay-methods-list"></div>
      <div style="font-size:.74rem;color:var(--text-3);margin-top:.6rem;line-height:1.6">
        💡 <strong>แสดงในเว็บ</strong> = ลูกค้าเห็นช่องทางนี้ &nbsp;·&nbsp; <strong>พร้อมใช้งาน</strong> = กดเลือกได้ (ปิด = ขึ้น "เร็วๆ นี้" กดไม่ได้)
      </div>
    </div>

    <!-- FAQ -->
    <div class="admin-box" style="grid-column:1/-1">
      <div class="admin-box-header">
        <div class="admin-box-title">❓ คำถามที่พบบ่อย (หน้า "วิธีสั่งซื้อ")</div>
        <span class="admin-box-action" id="cms-faq-add">+ เพิ่มคำถาม</span>
      </div>
      <div id="cms-faq-list"></div>
    </div>`;

  // ── FAQ editor ──
  let faqData = Array.isArray(content.faq) ? content.faq.map(f => ({ q: f.q||'', a: f.a||'' })) : [];
  function renderFaqList() {
    const wrap = document.getElementById('cms-faq-list');
    wrap.innerHTML = faqData.map((f, i) => `
      <div style="background:var(--bg-mid);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:.85rem;margin-bottom:.65rem">
        <div class="form-group" style="margin-bottom:.6rem">
          <label class="form-label">คำถาม ${i+1}</label>
          <input class="form-input cms-faq-q" data-i="${i}" value="${DMC.escapeHtml(f.q)}">
        </div>
        <div class="form-group" style="margin-bottom:.6rem">
          <label class="form-label">คำตอบ</label>
          <textarea class="form-input form-textarea cms-faq-a" data-i="${i}" style="min-height:70px">${DMC.escapeHtml(f.a)}</textarea>
        </div>
        <button class="table-action-btn cms-faq-del" data-i="${i}" style="color:var(--rose);border-color:var(--rose)">🗑️ ลบข้อนี้</button>
      </div>`).join('') || '<div style="color:var(--text-3);text-align:center;padding:1rem;font-size:.85rem">ยังไม่มีคำถาม กด "+ เพิ่มคำถาม"</div>';

    wrap.querySelectorAll('.cms-faq-q').forEach(el => el.addEventListener('input', () => { faqData[+el.dataset.i].q = el.value; }));
    wrap.querySelectorAll('.cms-faq-a').forEach(el => el.addEventListener('input', () => { faqData[+el.dataset.i].a = el.value; }));
    wrap.querySelectorAll('.cms-faq-del').forEach(el => el.addEventListener('click', () => { faqData.splice(+el.dataset.i, 1); renderFaqList(); }));
  }
  renderFaqList();
  document.getElementById('cms-faq-add')?.addEventListener('click', () => { faqData.push({ q:'', a:'' }); renderFaqList(); });

  // ── ช่องทางชำระเงิน: render toggles ──
  const PAY_META = {
    promptpay: { icon:'📱', name:'PromptPay',          sub:'โอน QR พร้อมเพย์' },
    cod:       { icon:'🚚', name:'เก็บเงินปลายทาง',     sub:'COD' },
    truemoney: { icon:'💰', name:'TrueMoney Wallet',    sub:'ทรูมันนี่ วอลเล็ท' },
    credit:    { icon:'💳', name:'บัตรเครดิต/เดบิต',     sub:'Visa · Mastercard' },
  };
  const payMethodsCfg = JSON.parse(JSON.stringify(
    (content.payment && content.payment.methods) || {
      promptpay:{shown:true,ready:true}, cod:{shown:true,ready:true},
      truemoney:{shown:false,ready:false}, credit:{shown:false,ready:false}
    }
  ));
  // เผื่อ key ใหม่ที่ยังไม่มีใน data เก่า
  ['promptpay','cod','truemoney','credit'].forEach(k => { if (!payMethodsCfg[k]) payMethodsCfg[k] = {shown:false,ready:false}; });

  function renderPayMethods() {
    const box = document.getElementById('cms-pay-methods-list');
    if (!box) return;
    box.innerHTML = ['promptpay','cod','truemoney','credit'].map(key => {
      const m = PAY_META[key];
      const c = payMethodsCfg[key];
      return `
        <div style="display:flex;align-items:center;gap:.7rem;padding:.7rem .2rem;border-bottom:1px solid var(--border)">
          <span style="font-size:1.4rem">${m.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-family:var(--font-display);font-weight:700;font-size:.9rem;color:var(--text-1)">${m.name}</div>
            <div style="font-size:.74rem;color:var(--text-3)">${m.sub}</div>
          </div>
          <label class="cms-pay-toggle" title="แสดงในเว็บ">
            <input type="checkbox" class="cms-pay-shown" data-k="${key}" ${c.shown ? 'checked' : ''}>
            <span class="cms-pay-toggle-label">แสดง</span>
          </label>
          <label class="cms-pay-toggle" title="พร้อมใช้งาน">
            <input type="checkbox" class="cms-pay-ready" data-k="${key}" ${c.ready ? 'checked' : ''}>
            <span class="cms-pay-toggle-label">พร้อม</span>
          </label>
        </div>`;
    }).join('');
    box.querySelectorAll('.cms-pay-shown').forEach(el => el.addEventListener('change', () => { payMethodsCfg[el.dataset.k].shown = el.checked; }));
    box.querySelectorAll('.cms-pay-ready').forEach(el => el.addEventListener('change', () => { payMethodsCfg[el.dataset.k].ready = el.checked; }));
  }
  renderPayMethods();
  window._getPayMethodsCfg = () => payMethodsCfg;  // ให้ปุ่มบันทึกอ่านค่า

  // ── QR upload + live preview ──
  const qrFile = document.getElementById('cms-qr-file');
  document.getElementById('cms-qr-upload-btn')?.addEventListener('click', () => qrFile?.click());
  qrFile?.addEventListener('change', async () => {
    const f = qrFile.files[0];
    if (!f) return;
    const st = document.getElementById('cms-qr-status');
    st.textContent = '⏳ กำลังอัปโหลด...';
    try {
      const res = await DMC.uploadToImgBB(f);
      document.getElementById('cms-pay-qrimg').value = res.url;
      st.textContent = '✅ อัปโหลดแล้ว';
      updateQrPreview();
    } catch(e) { st.textContent = '❌ อัปโหลดไม่สำเร็จ'; }
  });
  function updateQrPreview() {
    const id  = document.getElementById('cms-pay-id')?.value.trim();
    const img = document.getElementById('cms-pay-qrimg')?.value.trim();
    const box = document.getElementById('cms-qr-preview');
    const url = img || (id ? 'https://promptpay.io/' + id.replace(/\D/g,'') : '');
    box.innerHTML = url ? '<img src="' + url + '" alt="QR" style="max-width:160px;border-radius:12px;border:1px solid var(--border);margin-top:.4rem">' : '';
  }
  document.getElementById('cms-pay-id')?.addEventListener('input', DMC.debounce(updateQrPreview, 500));
  document.getElementById('cms-pay-qrimg')?.addEventListener('input', DMC.debounce(updateQrPreview, 500));
  updateQrPreview();

  // ── Save ──
  document.getElementById('cms-save-btn')?.addEventListener('click', async () => {
    const g = (id) => document.getElementById(id)?.value.trim() || '';
    const data = {
      hero: { badge: g('cms-hero-badge'), title1: g('cms-hero-t1'), title2: g('cms-hero-t2'), title3: g('cms-hero-t3'), desc: document.getElementById('cms-hero-desc')?.value.trim() || '' },
      stats: { orders: g('cms-stat-orders'), rating: g('cms-stat-rating'), days: g('cms-stat-days') },
      promo: { active: !!document.getElementById('cms-promo-active')?.checked, tag: g('cms-promo-tag'), title: g('cms-promo-title'), desc: g('cms-promo-desc'), btnText: g('cms-promo-btn'), btnLink: 'catalog.html' },
      contact: { line: g('cms-ct-line'), lineLabel: g('cms-ct-linelabel'), facebook: g('cms-ct-fb'), instagram: g('cms-ct-ig'), tiktok: g('cms-ct-tiktok'), email: g('cms-ct-email'), phone: g('cms-ct-phone'), hours: g('cms-ct-hours') },
      payment: { promptpayId: g('cms-pay-id'), promptpayName: g('cms-pay-name'), qrImageUrl: g('cms-pay-qrimg'), methods: (window._getPayMethodsCfg ? window._getPayMethodsCfg() : undefined) },
      faq: faqData.filter(f => f.q.trim() && f.a.trim()),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const btn = document.getElementById('cms-save-btn');
    if (typeof Loading !== 'undefined') Loading.buttonLoad(btn);
    try {
      await db.collection('siteContent').doc('main').set(data, { merge: true });
      if (typeof CMS !== 'undefined') CMS.clearCache();
      DMC.toast('บันทึกเนื้อหาแล้ว ✅ หน้าเว็บอัปเดตทันที', 'success', 3500);
    } catch(e) {
      DMC.toast('บันทึกไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      if (typeof Loading !== 'undefined') Loading.buttonDone(btn);
    }
  });
}

// ══════════════════════════════════════════════
//  TEMPLATES MANAGER (กรอบ PNG ที่ร้านอัปโหลดเอง)
// ══════════════════════════════════════════════
async function loadTemplatesAdmin(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>🎨 เทมเพลตของร้าน</h2><p>อัปโหลดกรอบรูป PNG (พื้นหลังโปร่งใสตรงกลาง) ให้ลูกค้าลองใส่รูปดูตัวอย่าง</p></div>
    </div>

    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">➕ เพิ่มเทมเพลตใหม่</div></div>
      <div style="background:rgba(14,165,233,.06);border:1px solid var(--border);border-radius:var(--r-md);padding:.7rem .9rem;font-size:.8rem;color:var(--text-2);margin-bottom:1rem;line-height:1.7">
        💡 <strong>ไฟล์ที่ใช้:</strong> PNG ที่ <strong>ตรงกลางโปร่งใส</strong> (รูปลูกค้าจะอยู่ข้างหลังกรอบ)<br>
        แนะนำสัดส่วนแนวตั้ง เช่น 700×975px · สร้างได้จาก Canva → Export PNG พื้นหลังโปร่งใส
      </div>
      <div class="form-row" style="margin-bottom:1rem">
        <div class="form-group" style="margin:0">
          <label class="form-label">ชื่อเทมเพลต</label>
          <input class="form-input" id="tpl-name" maxlength="30" placeholder="เช่น กรอบดอกไม้, บัตรนักเรียนแบบ A">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">ไฟล์กรอบ PNG</label>
          <div style="display:flex;gap:.6rem;align-items:center">
            <input type="file" id="tpl-file" accept="image/png" style="display:none">
            <button class="btn btn-ghost btn-sm" id="tpl-upload-btn" style="border-radius:var(--r-md)">📤 เลือกไฟล์ PNG</button>
            <span id="tpl-upload-status" style="font-size:.76rem;color:var(--text-3)"></span>
          </div>
        </div>
      </div>
      <input class="form-input" id="tpl-url" placeholder="หรือวาง URL รูปกรอบ PNG" style="margin-bottom:1rem">
      <div id="tpl-preview" style="margin-bottom:1rem"></div>
      <button class="btn btn-primary btn-md" id="tpl-save-btn">💾 บันทึกเทมเพลต</button>
    </div>

    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">🗂️ เทมเพลตทั้งหมด</div></div>
      <div id="tpl-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:1rem">
        <div style="grid-column:1/-1;text-align:center;padding:1.5rem"><span class="spinner" style="display:block;margin:0 auto"></span></div>
      </div>
    </div>`;

  const fileIn = document.getElementById('tpl-file');
  document.getElementById('tpl-upload-btn')?.addEventListener('click', () => fileIn?.click());
  fileIn?.addEventListener('change', async () => {
    const f = fileIn.files[0];
    if (!f) return;
    if (f.type !== 'image/png') { DMC.toast('ต้องเป็นไฟล์ PNG เท่านั้น (เพื่อให้กลางโปร่งใส)', 'error'); return; }
    const st = document.getElementById('tpl-upload-status');
    st.textContent = '⏳ กำลังอัปโหลด...';
    try {
      const res = await DMC.uploadToImgBB(f);
      document.getElementById('tpl-url').value = res.url;
      st.textContent = '✅ อัปโหลดแล้ว';
      document.getElementById('tpl-preview').innerHTML =
        '<img src="' + res.url + '" alt="preview" style="max-height:140px;border-radius:var(--r-md);border:1px solid var(--border);background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/16px 16px">';
    } catch(e) { st.textContent = '❌ อัปโหลดไม่สำเร็จ'; }
  });

  document.getElementById('tpl-save-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('tpl-name')?.value.trim();
    const url  = document.getElementById('tpl-url')?.value.trim();
    if (!name) { DMC.toast('กรอกชื่อเทมเพลต', 'error'); return; }
    if (!url)  { DMC.toast('อัปโหลดไฟล์กรอบก่อน', 'error'); return; }
    const btn = document.getElementById('tpl-save-btn');
    if (typeof Loading !== 'undefined') Loading.buttonLoad(btn);
    try {
      await db.collection('templates').add({
        name, frameUrl: url, active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      DMC.toast('เพิ่มเทมเพลตแล้ว ✅', 'success');
      document.getElementById('tpl-name').value = '';
      document.getElementById('tpl-url').value = '';
      document.getElementById('tpl-preview').innerHTML = '';
      document.getElementById('tpl-upload-status').textContent = '';
      await loadTplList();
    } catch(e) {
      DMC.toast('บันทึกไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      if (typeof Loading !== 'undefined') Loading.buttonDone(btn);
    }
  });

  await loadTplList();
}

async function loadTplList() {
  const wrap = document.getElementById('tpl-list');
  if (!wrap) return;
  try {
    const snap = await db.collection('templates').get();
    if (snap.empty) {
      wrap.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:1.5rem;color:var(--text-3)">ยังไม่มีเทมเพลตของร้าน — ลูกค้าจะเห็นเฉพาะ 6 แบบมาตรฐาน</div>';
      return;
    }
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    items.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

    wrap.innerHTML = items.map(t => `
      <div style="border:1.5px solid var(--border);border-radius:var(--r-lg);overflow:hidden;background:var(--bg-mid)">
        <div style="aspect-ratio:3/4;background:repeating-conic-gradient(#e8e8e8 0 25%,#fff 0 50%) 0 0/14px 14px;display:flex;align-items:center;justify-content:center;overflow:hidden">
          <img src="${t.frameUrl}" alt="${DMC.escapeHtml(t.name)}" style="width:100%;height:100%;object-fit:contain" loading="lazy">
        </div>
        <div style="padding:.55rem .65rem">
          <div style="font-family:var(--font-display);font-size:.8rem;font-weight:600;margin-bottom:.4rem">${DMC.escapeHtml(t.name||'—')}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:.4rem">
            <label class="toggle-switch" title="เปิด/ปิดใช้งาน">
              <input type="checkbox" class="tpl-toggle" data-id="${t.id}" ${t.active ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <button class="table-action-btn tpl-del" data-id="${t.id}" style="color:var(--rose);border-color:var(--rose)">🗑️</button>
          </div>
        </div>
      </div>`).join('');

    wrap.querySelectorAll('.tpl-toggle').forEach(el => el.addEventListener('change', () => {
      db.collection('templates').doc(el.dataset.id).update({ active: el.checked })
        .then(() => DMC.toast(el.checked ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว', 'success'))
        .catch(() => DMC.toast('บันทึกไม่สำเร็จ', 'error'));
    }));
    wrap.querySelectorAll('.tpl-del').forEach(el => el.addEventListener('click', () => {
      if (!confirm('ลบเทมเพลตนี้?')) return;
      db.collection('templates').doc(el.dataset.id).delete()
        .then(() => { DMC.toast('ลบแล้ว', 'success'); loadTplList(); })
        .catch(() => DMC.toast('ลบไม่สำเร็จ', 'error'));
    }));
  } catch(e) {
    wrap.innerHTML = '<div style="grid-column:1/-1;color:var(--text-3);text-align:center;padding:1rem">โหลดไม่สำเร็จ: ' + DMC.escapeHtml(e.message) + '</div>';
  }
}

// ══════════════════════════════════════════════
//  SETTINGS (รหัสผ่าน + LINE)
// ══════════════════════════════════════════════
async function loadSettings(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>⚙️ ตั้งค่าระบบ</h2><p>รหัสผ่าน Admin และการแจ้งเตือน LINE</p></div>
    </div>
    <div class="settings-grid">
      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">🔐 เปลี่ยนรหัสผ่าน Admin</div></div>
        <div class="form-group">
          <label class="form-label">รหัสผ่านใหม่</label>
          <input class="form-input" type="password" id="new-pass" placeholder="••••••••" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label class="form-label">ยืนยันรหัสผ่านใหม่</label>
          <input class="form-input" type="password" id="confirm-pass" placeholder="••••••••" autocomplete="new-password">
        </div>
        <div id="new-hash-output" style="display:none;background:var(--bg-mid);border-radius:var(--r-md);padding:.75rem;margin-bottom:.75rem;word-break:break-all">
          <div style="font-size:.72rem;color:var(--text-3);margin-bottom:.3rem;font-family:var(--font-display)">นำไปแทนค่า ADMIN_HASH ใน js/admin.js แล้วอัปโหลดขึ้น GitHub:</div>
          <code id="hash-value" style="font-size:.72rem;color:var(--accent)"></code>
          <button class="btn btn-ghost btn-sm" id="copy-hash-btn" style="margin-top:.5rem;border-radius:var(--r-md)">📋 Copy</button>
        </div>
        <button class="btn btn-primary btn-md" id="gen-hash-btn">🔑 สร้าง Hash</button>
      </div>

      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">💬 LINE แจ้งเตือนออเดอร์</div></div>
        <p style="font-size:.83rem;color:var(--text-2);margin-bottom:.75rem">ตั้งค่าใน Cloudflare Worker → Settings → Variables and Secrets</p>
        <div style="background:var(--bg-mid);border-radius:var(--r-md);padding:1rem;font-size:.82rem;line-height:1.9">
          <div><strong>LINE_TOKEN</strong> <span style="color:var(--text-3)">= Channel Access Token</span></div>
          <div><strong>LINE_USER_ID</strong> <span style="color:var(--text-3)">= User ID (U...) คั่นด้วย , ถ้าหลายคน</span></div>
        </div>
        <button class="btn btn-secondary btn-md" id="test-line-btn" style="margin-top:.85rem">🔔 ทดสอบส่งแจ้งเตือน</button>
      </div>

      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">🛡️ ความปลอดภัยของระบบ</div></div>
        <div class="security-status">
          <div class="security-row ok">✅ PBKDF2-SHA256 (100,000 iterations)</div>
          <div class="security-row ok">✅ Session Token หมดอายุ 8 ชั่วโมง</div>
          <div class="security-row ok">✅ ล็อคหลังพิมพ์ผิด 5 ครั้ง (15 นาที)</div>
          <div class="security-row ok">✅ รีวิวลูกค้าต้องอนุมัติก่อนแสดง</div>
          <div class="security-row ok">✅ ดูประวัติออเดอร์ต้องยืนยัน OTP</div>
          <div class="security-row ok">✅ HTTPS ทุกหน้า</div>
        </div>
      </div>
    </div>`;

  // ── V15: กล่องสำรองข้อมูล (Export / Import JSON) ──
  const grid = container.querySelector('.settings-grid');
  if (grid) {
    grid.insertAdjacentHTML('beforeend', `
      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">💾 สำรองข้อมูล (Backup)</div></div>
        <p style="font-size:.83rem;color:var(--text-2);line-height:1.7;margin-bottom:.9rem">
          ดาวน์โหลดข้อมูลทั้งหมดเก็บไว้ในเครื่อง — สินค้า ออเดอร์ รีวิว เนื้อหาเว็บ ฯลฯ<br>
          <strong>แนะนำสำรองทุกสัปดาห์</strong> ป้องกันข้อมูลสูญหาย
        </p>
        <div style="display:flex;gap:.6rem;flex-wrap:wrap">
          <button class="btn btn-primary btn-md" id="backup-export-btn">⬇️ Export ข้อมูลทั้งหมด</button>
          <button class="btn btn-ghost btn-md" id="backup-import-btn">⬆️ Import (กู้คืน)</button>
          <input type="file" id="backup-import-file" accept="application/json" style="display:none">
        </div>
        <div id="backup-status" style="font-size:.78rem;color:var(--text-3);margin-top:.7rem"></div>
      </div>`);
    initBackupBox();
  }

  document.getElementById('gen-hash-btn')?.addEventListener('click', async () => {
    const p1 = document.getElementById('new-pass')?.value;
    const p2 = document.getElementById('confirm-pass')?.value;
    if (!p1)            { DMC.toast('กรอกรหัสผ่านก่อน', 'error'); return; }
    if (p1 !== p2)      { DMC.toast('รหัสผ่านไม่ตรงกัน', 'error'); return; }
    if (p1.length < 6)  { DMC.toast('รหัสผ่านอย่างน้อย 6 ตัวอักษร', 'error'); return; }
    const hash = await DMC.pbkdf2Hash(p1, ADMIN_SALT);
    document.getElementById('hash-value').textContent = hash;
    document.getElementById('new-hash-output').style.display = 'block';
    DMC.toast('สร้าง Hash สำเร็จ — Copy ไปแทนใน admin.js', 'success', 5000);
  });

  document.getElementById('copy-hash-btn')?.addEventListener('click', () => {
    const hash = document.getElementById('hash-value')?.textContent;
    if (!hash) return;
    navigator.clipboard.writeText(hash)
      .then(() => DMC.toast('Copy แล้ว ✅', 'success'))
      .catch(() => DMC.toast('Copy ด้วยตนเองครับ', 'info'));
  });

  document.getElementById('test-line-btn')?.addEventListener('click', async () => {
    const ok = await DMC.sendLineNotify({ orderId:'TEST', customerName:'ทดสอบระบบ', customerPhone:'-', itemsSummary:'ทดสอบการแจ้งเตือน', total:0, paymentMethod:'test' });
    DMC.toast(ok ? '✅ ส่ง LINE สำเร็จ!' : '❌ ส่งไม่สำเร็จ ตรวจสอบ Worker', ok ? 'success' : 'error');
  });
}


// ══════════════════════════════════════════════
//  V15 — BACKUP: Export / Import ข้อมูลทั้งระบบ
//  ทำไมต้องมี: ระบบไม่มี server backup อัตโนมัติ
//  ไฟล์ JSON นี้คือประกันชีวิตของข้อมูลร้าน
// ══════════════════════════════════════════════
const BACKUP_COLLECTIONS = ['products','orders','reviews','gallery','templates','categories','siteContent','contacts','settings'];

function initBackupBox() {
  const status = (t) => { const el = document.getElementById('backup-status'); if (el) el.textContent = t; };

  document.getElementById('backup-export-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('backup-export-btn');
    if (typeof Loading !== 'undefined') Loading.buttonLoad(btn);
    try {
      const out = { _meta: { shop: 'Diamond Cute Studio', exportedAt: new Date().toISOString(), version: 'V15' } };
      for (const col of BACKUP_COLLECTIONS) {
        out[col] = {};
        const snap = await db.collection(col).get();
        snap.forEach(doc => {
          const data = doc.data();
          // Timestamp → ISO string (อ่านได้/กู้คืนได้)
          for (const k of Object.keys(data)) {
            if (data[k] && typeof data[k].toDate === 'function') data[k] = { _ts: data[k].toDate().toISOString() };
          }
          out[col][doc.id] = data;
        });
        status('ดึงข้อมูล ' + col + ' แล้ว...');
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'dmc-backup-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      status('✅ Export สำเร็จ — เก็บไฟล์ไว้ในที่ปลอดภัย');
      DMC.toast('Export ข้อมูลสำเร็จ ✅', 'success');
    } catch(e) {
      status('❌ ' + e.message);
      DMC.toast('Export ไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      if (typeof Loading !== 'undefined') Loading.buttonDone(btn);
    }
  });

  const fileIn = document.getElementById('backup-import-file');
  document.getElementById('backup-import-btn')?.addEventListener('click', () => fileIn?.click());
  fileIn?.addEventListener('change', async () => {
    const f = fileIn.files[0];
    fileIn.value = '';
    if (!f) return;
    if (!confirm('⚠️ Import จะ "เขียนทับ" เอกสารที่ id ตรงกันด้วยข้อมูลจากไฟล์ backup\nต้องการดำเนินการต่อ?')) return;
    const status = (t) => { const el = document.getElementById('backup-status'); if (el) el.textContent = t; };
    try {
      const data = JSON.parse(await f.text());
      let total = 0;
      for (const col of BACKUP_COLLECTIONS) {
        const docs = data[col];
        if (!docs) continue;
        const ids = Object.keys(docs);
        for (let i = 0; i < ids.length; i += 400) {
          const batch = db.batch();
          ids.slice(i, i + 400).forEach(id => {
            const d = { ...docs[id] };
            for (const k of Object.keys(d)) {
              if (d[k] && typeof d[k] === 'object' && d[k]._ts) d[k] = firebase.firestore.Timestamp.fromDate(new Date(d[k]._ts));
            }
            batch.set(db.collection(col).doc(id), d, { merge: false });
          });
          await batch.commit();
          total += Math.min(400, ids.length - i);
          status('กู้คืน ' + col + ' แล้ว ' + total + ' รายการ...');
        }
      }
      status('✅ กู้คืนสำเร็จ ' + total + ' รายการ');
      DMC.toast('Import สำเร็จ — รีเฟรชหน้าเพื่อดูข้อมูล', 'success', 4000);
    } catch(e) {
      status('❌ ' + e.message);
      DMC.toast('Import ไม่สำเร็จ: ' + e.message, 'error');
    }
  });
}
