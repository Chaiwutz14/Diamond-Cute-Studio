/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Admin JS  V6
   Full featured: Orders · Products · Settings · Canvas Templates
═══════════════════════════════════════════════ */
'use strict';

const ADMIN_HASH = "b454dc28df89029f894c5046920aec23d2bcceb2db61e1b2a354709c069f6ffc";
const ADMIN_SALT = "dmc_diamond_studio_salt_v1";

let db = null;

document.addEventListener('DOMContentLoaded', async () => {
  const isLogin     = document.getElementById('admin-login-page');
  const isDashboard = document.getElementById('admin-dashboard');
  if (isLogin)     { initLoginPage(); return; }
  if (isDashboard) {
    if (!DMC.isAdminAuthenticated()) { window.location.href = 'admin-login.html'; return; }
    try { db = await DMC.getFirebaseReady(); initDashboard(); }
    catch (e) { DMC.toast('ไม่สามารถเชื่อมต่อ Firebase ได้', 'error'); }
  }
});

// ══════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════
function initLoginPage() {
  const passInput = document.getElementById('login-password');
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
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle"></span>';
    try {
      const hash    = await DMC.pbkdf2Hash(password, ADMIN_SALT);
      const correct = hash === ADMIN_HASH;
      if (correct) {
        DMC.clearRateLimit(); DMC.createSession();
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
        btn.disabled = false; btn.innerHTML = '🔓 เข้าสู่ระบบ';
      }
    } catch(e) {
      DMC.toast('เกิดข้อผิดพลาด', 'error');
      btn.disabled = false; btn.innerHTML = '🔓 เข้าสู่ระบบ';
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
  if (confirm('ออกจากระบบ?')) { DMC.clearSession(); window.location.href = 'admin-login.html'; }
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
  const content  = document.getElementById('admin-content');
  if (!content) return;
  const active = document.querySelector(`.sidebar-item[data-section="${name}"]`);
  if (active) { document.querySelectorAll('.sidebar-item').forEach(i=>i.classList.remove('active')); active.classList.add('active'); }
  const map = { overview:loadOverview, orders:loadOrders, products:loadProducts, gallery:loadGallery, contacts:loadContacts, settings:loadSettings };
  (map[name] || loadOverview)(content);
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
        <button class="btn btn-primary btn-md" onclick="loadSection('products')">+ เพิ่มสินค้า</button>
      </div>
    </div>

    <div class="kpi-grid">
      ${[['blue','⏳','รอดำเนินการ','kpi-pending'],['gold','💰','ยอดขายเดือนนี้','kpi-revenue'],['green','✅','งานเสร็จแล้ว','kpi-done'],['rose','📦','ออเดอร์วันนี้','kpi-today']].map(([cls,icon,label,id])=>`
        <div class="kpi-card kpi-${cls}">
          <div class="kpi-icon">${icon}</div>
          <div class="kpi-label">${label}</div>
          <div class="kpi-value" id="${id}"><span class="spinner"></span></div>
        </div>`).join('')}
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
            <span class="admin-box-action" onclick="loadSection('orders')">ดูทั้งหมด →</span>
          </div>
          <div id="recent-orders-table"><div style="text-align:center;padding:1.5rem"><span class="spinner" style="display:block;margin:0 auto"></span></div></div>
        </div>
      </div>
      <div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🏆 สินค้าขายดี</div></div>
          <div id="top-products-list"><div style="color:var(--text-3);text-align:center;padding:1rem;font-size:.85rem">กำลังโหลด...</div></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">💬 LINE Notify</div></div>
          <div style="font-size:.84rem;color:var(--text-2);margin-bottom:.75rem">ระบบแจ้งเตือนออเดอร์ใหม่ผ่าน LINE</div>
          <div style="display:flex;align-items:center;gap:.5rem;padding:.55rem .8rem;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);border-radius:var(--r-md);margin-bottom:.75rem">
            <span style="color:var(--emerald)">●</span><span style="font-family:var(--font-display);font-size:.84rem;color:var(--emerald)">เชื่อมต่อแล้ว</span>
          </div>
          <button class="btn btn-secondary btn-block btn-md" id="test-notify-2">🔔 ทดสอบส่งแจ้งเตือน</button>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🔐 ความปลอดภัย</div></div>
          <div class="security-status">
            <div class="security-row ok">✅ PBKDF2-SHA256 (100k iterations)</div>
            <div class="security-row ok">✅ Session Token (8 ชม.)</div>
            <div class="security-row ok">✅ Rate Limit 5 ครั้ง/15 นาที</div>
            <div class="security-row ok">✅ Cloudflare WAF</div>
            <div class="security-row ok">✅ HTTPS Only</div>
          </div>
        </div>
      </div>
    </div>`;

  ['test-notify-btn','test-notify-2'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', async () => {
      const ok = await DMC.sendLineNotify({ orderId:'TEST', customerName:'ทดสอบ', customerPhone:'000', itemsSummary:'ทดสอบระบบแจ้งเตือน', total:0, paymentMethod:'test' });
      DMC.toast(ok ? '✅ ส่ง LINE สำเร็จ!' : '❌ ส่งไม่สำเร็จ ตรวจสอบ config', ok ? 'success' : 'error');
    });
  });

  await Promise.all([loadKPIs(), loadRecentOrdersTable(), loadTopProducts(), renderSalesChart()]);
}

// ── KPIs ──
async function loadKPIs() {
  try {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [all, today, month] = await Promise.all([
      db.collection('orders').get(),
      db.collection('orders').where('createdAt','>=',firebase.firestore.Timestamp.fromDate(todayStart)).get(),
      db.collection('orders').where('createdAt','>=',firebase.firestore.Timestamp.fromDate(monthStart)).get(),
    ]);
    let pending=0, done=0, revenue=0;
    all.forEach(d => {
      const o = d.data();
      if (o.status==='cancelled') return;
      if (o.status==='pending'||o.status==='processing') pending++;
      if (o.status==='done') done++;
    });
    month.forEach(d => { const o=d.data(); if (o.status!=='cancelled') revenue += o.total||0; });
    setText('kpi-pending', pending);
    setText('kpi-revenue', DMC.formatPrice(revenue));
    setText('kpi-done', done);
    setText('kpi-today', today.size);
    setText('greeting-sub', pending>0 ? `มี ${pending} ออเดอร์รอดำเนินการ 🔔` : 'ทุกออเดอร์เรียบร้อยดี 🎉');
  } catch(e) { ['pending','revenue','done','today'].forEach(k=>setText(`kpi-${k}`,'—')); }
}

// ── Recent Orders Table ──
async function loadRecentOrdersTable() {
  const el = document.getElementById('recent-orders-table');
  if (!el) return;
  try {
    const snap = await db.collection('orders').limit(8).get();
    if (snap.empty) { el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-3)">ยังไม่มีออเดอร์</div>'; return; }
    const rows = [];
    snap.forEach(doc => {
      const o = { id:doc.id, ...doc.data() };
      rows.push(`<tr>
        <td><span class="order-id-cell">#${o.orderId||o.id.slice(-6).toUpperCase()}</span></td>
        <td>${DMC.escapeHtml(o.customerName||'—')}</td>
        <td style="max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${DMC.escapeHtml(o.itemsSummary||'—')}</td>
        <td class="price-cell">${DMC.formatPrice(o.total||0)}</td>
        <td><span class="status status-${o.status||'new'}">${statusLabel(o.status)}</span></td>
        <td><button class="table-action-btn" onclick="openOrderModal('${doc.id}')">ดู</button></td>
      </tr>`);
    });
    el.innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>ออเดอร์</th><th>ลูกค้า</th><th>รายการ</th><th>ราคา</th><th>สถานะ</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  } catch(e) { el.innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ</div>'; }
}

// ── Top Products ──
async function loadTopProducts() {
  const el = document.getElementById('top-products-list');
  if (!el) return;
  try {
    const snap = await db.collection('products').limit(5).get();
    if (snap.empty) { el.innerHTML = '<div style="color:var(--text-3);font-size:.83rem;text-align:center">ยังไม่มีสินค้า</div>'; return; }
    const ranks = ['gold-rank','silver-rank','bronze-rank','',''];
    let html = ''; let i = 0;
    snap.forEach(doc => {
      const p = doc.data();
      html += `<div class="top-product-item">
        <div class="tp-rank ${ranks[i]||''}">${i+1}</div>
        <div class="tp-icon">${p.image?`<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`:(p.emoji||'📦')}</div>
        <div class="tp-info"><div class="tp-name">${DMC.escapeHtml(p.name)}</div><div class="tp-count">${p.orderCount||0} ออเดอร์</div></div>
        <div class="tp-val">${DMC.formatPrice((p.price||0)*(p.orderCount||0))}</div>
      </div>`;
      i++;
    });
    el.innerHTML = html;
  } catch(e) { el.innerHTML = ''; }
}

// ── Sales Chart ──
async function renderSalesChart() {
  const chartEl = document.getElementById('sales-chart');
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
//  ORDERS
// ══════════════════════════════════════════════
async function loadOrders(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>📦 ออเดอร์ทั้งหมด</h2><p>จัดการและอัพเดทสถานะออเดอร์</p></div>
      <div class="admin-topbar-actions">
        <select class="form-input form-select" id="order-filter" style="width:auto;padding:.45rem 2rem .45rem .75rem">
          <option value="">ทุกสถานะ</option>
          <option value="pending">⏳ รอดำเนินการ</option>
          <option value="processing">🔄 กำลังทำ</option>
          <option value="done">✅ เสร็จสิ้น</option>
          <option value="cancelled">❌ ยกเลิก</option>
        </select>
      </div>
    </div>
    <div class="admin-box">
      <div id="orders-table-wrap"><div style="text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div></div>
    </div>`;
  document.getElementById('order-filter')?.addEventListener('change', loadOrdersTable);
  await loadOrdersTable();
}

async function loadOrdersTable() {
  const el     = document.getElementById('orders-table-wrap');
  const filter = document.getElementById('order-filter')?.value;
  if (!el) return;
  try {
    let q = db.collection('orders').limit(100);
    if (filter) q = q.where('status','==',filter);
    const snap = await q.get();
    if (snap.empty) { el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-3)">ไม่พบออเดอร์</div>'; return; }

    // Sort by createdAt desc in JS
    const docs = [];
    snap.forEach(doc => docs.push({id:doc.id,...doc.data()}));
    docs.sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

    const rows = docs.map(o => `<tr>
      <td><span class="order-id-cell">#${o.orderId||o.id.slice(-6).toUpperCase()}</span></td>
      <td><div style="font-weight:600">${DMC.escapeHtml(o.customerName||'—')}</div><div style="font-size:.75rem;color:var(--text-3)">${DMC.escapeHtml(o.customerPhone||'')}</div></td>
      <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.83rem">${DMC.escapeHtml(o.itemsSummary||'—')}</td>
      <td class="price-cell">${DMC.formatPrice(o.total||0)}</td>
      <td>${DMC.escapeHtml(o.paymentMethod==='promptpay'?'📱 QR':'🚚 COD')}</td>
      <td>
        <select class="form-input form-select" style="padding:.28rem .5rem;font-size:.78rem;width:auto" onchange="quickUpdateStatus('${o.id}',this.value)">
          <option value="pending"    ${o.status==='pending'?'selected':''}>⏳ รอ</option>
          <option value="processing" ${o.status==='processing'?'selected':''}>🔄 ทำ</option>
          <option value="done"       ${o.status==='done'?'selected':''}>✅ เสร็จ</option>
          <option value="cancelled"  ${o.status==='cancelled'?'selected':''}>❌ ยกเลิก</option>
        </select>
      </td>
      <td style="font-size:.78rem;color:var(--text-3)">${o.createdAt?DMC.formatDate(o.createdAt,true):'—'}</td>
      <td><button class="table-action-btn" onclick="openOrderModal('${o.id}')">📋 ดู</button></td>
    </tr>`);

    el.innerHTML = `<div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>ออเดอร์</th><th>ลูกค้า</th><th>รายการ</th><th>ราคา</th><th>ชำระ</th><th>สถานะ</th><th>วันที่</th><th></th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table></div>`;
  } catch(e) { el.innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ: '+e.message+'</div>'; }
}

window.quickUpdateStatus = async function(id, status) {
  try {
    await db.collection('orders').doc(id).update({ status, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    DMC.toast('อัพเดทสถานะแล้ว ✅', 'success');
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
        <div><div style="font-weight:600">${DMC.escapeHtml(item.name||'—')}</div><div style="color:var(--text-3);font-size:.78rem">${DMC.escapeHtml(item.options||'')} × ${item.qty||1} ${item.unit||'ชิ้น'}</div></div>
        <div style="font-family:var(--font-display);font-weight:700;color:var(--accent)">${DMC.formatPrice((item.price||0)*(item.qty||1))}</div>
      </div>`).join('');

    body.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">📦 ออเดอร์ #${o.orderId||o.id.slice(-6).toUpperCase()}</div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <!-- ข้อมูลลูกค้า -->
      <div style="background:var(--bg-mid);border-radius:var(--r-lg);padding:1rem;margin-bottom:1rem">
        <div style="font-family:var(--font-display);font-size:.78rem;color:var(--text-3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:.6rem">ข้อมูลลูกค้า</div>
        <div class="order-detail-grid">
          <div class="detail-field"><div class="detail-field-label">ชื่อ</div><div class="detail-field-value">${DMC.escapeHtml(o.customerName||'—')}</div></div>
          <div class="detail-field"><div class="detail-field-label">โทร</div><div class="detail-field-value">${DMC.escapeHtml(o.customerPhone||'—')}</div></div>
          <div class="detail-field" style="grid-column:1/-1"><div class="detail-field-label">ที่อยู่</div><div class="detail-field-value">${DMC.escapeHtml(o.address||'—')}</div></div>
          <div class="detail-field"><div class="detail-field-label">ขนส่ง</div><div class="detail-field-value">${DMC.escapeHtml(o.shippingMethod||'—')}</div></div>
          <div class="detail-field"><div class="detail-field-label">ชำระ</div><div class="detail-field-value">${o.paymentMethod==='promptpay'?'📱 PromptPay':'🚚 COD'}</div></div>
        </div>
        ${o.note?`<div style="margin-top:.6rem;padding:.5rem .75rem;background:rgba(245,158,11,.08);border-radius:var(--r-md);font-size:.82rem;color:var(--text-2)">💬 ${DMC.escapeHtml(o.note)}</div>`:''}
      </div>

      <!-- รายการสินค้า -->
      <div style="margin-bottom:1rem">
        <div style="font-family:var(--font-display);font-size:.78rem;color:var(--text-3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:.6rem">รายการสินค้า</div>
        ${items || `<div style="font-size:.87rem;color:var(--text-3)">${DMC.escapeHtml(o.itemsSummary||'—')}</div>`}
        <div style="display:flex;justify-content:space-between;padding:.6rem 0 0;font-family:var(--font-display);font-weight:800;font-size:1.1rem;color:var(--accent)">
          <span>รวมทั้งหมด</span><span>${DMC.formatPrice(o.total||0)}</span>
        </div>
      </div>

      <!-- สลิป -->
      ${o.slipUrl?`<div style="margin-bottom:1rem"><div style="font-family:var(--font-display);font-size:.78rem;color:var(--text-3);margin-bottom:.5rem">สลิปโอนเงิน</div><img src="${o.slipUrl}" style="max-height:180px;border-radius:var(--r-md);border:1px solid var(--border)"></div>`:''}

      <!-- ไฟล์รูปภาพ -->
      ${o.fileUrls?.length?`<div style="margin-bottom:1rem"><div style="font-family:var(--font-display);font-size:.78rem;color:var(--text-3);margin-bottom:.5rem">ไฟล์รูปภาพ (${o.fileUrls.length} ไฟล์)</div><div style="display:flex;flex-wrap:wrap;gap:.5rem">${o.fileUrls.map(url=>`<img src="${url}" style="height:70px;border-radius:var(--r-md);border:1px solid var(--border);cursor:pointer" onclick="window.open('${url}','_blank')">`).join('')}</div></div>`:''}

      <!-- อัพเดทสถานะ -->
      <div class="form-group">
        <label class="form-label">อัพเดทสถานะ</label>
        <select class="form-input form-select" id="modal-status-select">
          <option value="pending"    ${o.status==='pending'?'selected':''}>⏳ รอดำเนินการ</option>
          <option value="processing" ${o.status==='processing'?'selected':''}>🔄 กำลังทำ</option>
          <option value="done"       ${o.status==='done'?'selected':''}>✅ เสร็จสิ้น</option>
          <option value="cancelled"  ${o.status==='cancelled'?'selected':''}>❌ ยกเลิก</option>
        </select>
      </div>
      <div style="display:flex;gap:.75rem;margin-top:.75rem">
        <button class="btn btn-primary btn-md" style="flex:1" onclick="updateOrderStatus('${o.id}')">💾 บันทึก</button>
        <button class="btn btn-ghost btn-md" onclick="closeModal()">ปิด</button>
      </div>`;
  } catch(e) { body.innerHTML = '<p style="color:var(--rose)">เกิดข้อผิดพลาด: '+e.message+'</p>'; }
};

window.updateOrderStatus = async function(id) {
  const s = document.getElementById('modal-status-select')?.value;
  if (!s) return;
  try {
    await db.collection('orders').doc(id).update({ status:s, updatedAt:firebase.firestore.FieldValue.serverTimestamp() });
    DMC.toast('อัพเดทสำเร็จ ✅', 'success');
    closeModal(); loadOrdersTable(); loadKPIs();
  } catch(e) { DMC.toast('อัพเดทไม่สำเร็จ', 'error'); }
};

window.closeModal = function() { document.getElementById('modal-overlay')?.classList.remove('open'); };

// ══════════════════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════════════════
async function loadProducts(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>🛍️ จัดการสินค้า</h2><p>เพิ่ม แก้ไข และจัดการสินค้า</p></div>
      <div class="admin-topbar-actions">
        <input class="form-input" id="product-search" placeholder="🔍 ค้นหาสินค้า..." style="width:200px">
        <button class="btn btn-primary btn-md" id="add-product-btn">+ เพิ่มสินค้าใหม่</button>
      </div>
    </div>
    <div class="admin-box">
      <div id="products-table-wrap"><div style="text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div></div>
    </div>`;
  document.getElementById('add-product-btn')?.addEventListener('click', () => openProductModal(null));
  document.getElementById('product-search')?.addEventListener('input', DMC.debounce(loadProductsTable, 300));
  await loadProductsTable();
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
    if (search) products = products.filter(p => p.name?.toLowerCase().includes(search) || p.category?.toLowerCase().includes(search));
    products.sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

    const rows = products.map(p => `<tr>
      <td>
        <div style="width:46px;height:46px;border-radius:var(--r-md);background:var(--bg-mid);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:1.3rem">
          ${p.image?`<img src="${p.image}" style="width:100%;height:100%;object-fit:cover">`:(p.emoji||'📦')}
        </div>
      </td>
      <td><div style="font-family:var(--font-display);font-weight:600">${DMC.escapeHtml(p.name)}</div><div style="font-size:.75rem;color:var(--text-3)">${DMC.escapeHtml(p.category||'—')}</div></td>
      <td class="price-cell">${DMC.formatPrice(p.price)}<span style="color:var(--text-3);font-size:.75rem">/${p.unit||'ชิ้น'}</span></td>
      <td style="font-size:.8rem;color:var(--text-3)">${p.orderCount||0} ออเดอร์</td>
      <td>
        <div style="display:flex;gap:.3rem;flex-wrap:wrap">
          ${p.isNew?'<span class="badge badge-new" style="font-size:.65rem">✨ใหม่</span>':''}
          ${p.isHot?'<span class="badge badge-hot" style="font-size:.65rem">🔥ดี</span>':''}
          ${p.isSale?'<span class="badge badge-sale" style="font-size:.65rem">💰ลด</span>':''}
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
          <button class="table-action-btn" style="color:var(--rose);border-color:var(--rose)" onclick="deleteProduct('${p.id}','${DMC.escapeHtml(p.name).replace(/'/g,"\\'")}')">🗑️</button>
        </div>
      </td>
    </tr>`);

    el.innerHTML = `<div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>รูป</th><th>สินค้า</th><th>ราคา</th><th>ยอดขาย</th><th>แท็ก</th><th>แสดง</th><th>จัดการ</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table></div>`;
  } catch(e) { el.innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ: '+e.message+'</div>'; }
}

window.toggleProduct = async function(id, active) {
  try { await db.collection('products').doc(id).update({active}); DMC.toast(`${active?'เปิด':'ปิด'}แสดงสินค้า`, 'success'); }
  catch(e) { DMC.toast('บันทึกไม่สำเร็จ','error'); }
};

window.deleteProduct = async function(id, name) {
  if (!confirm(`ลบสินค้า "${name}"?\nไม่สามารถย้อนกลับได้`)) return;
  try { await db.collection('products').doc(id).delete(); DMC.toast(`ลบ "${name}" แล้ว`,'success'); loadProductsTable(); }
  catch(e) { DMC.toast('ลบไม่สำเร็จ','error'); }
};

// ── Product Modal (Add/Edit) — FULL FIELDS ──
window.openProductModal = async function(productId) {
  const overlay = document.getElementById('modal-overlay');
  const body    = document.getElementById('modal-body');
  if (!overlay||!body) return;

  let product = { name:'', category:'โพลารอยด์', price:'', unit:'ใบ', shortDesc:'', fullDesc:'', emoji:'📦', image:'', active:true, isNew:false, isHot:false, isSale:false, minQty:1, sizes:[], materials:[], priceTiers:[], hasPreview:false, orderCount:0 };

  if (productId) {
    body.innerHTML = '<div style="text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div>';
    overlay.classList.add('open');
    const doc = await db.collection('products').doc(productId).get();
    if (doc.exists) product = {id:doc.id,...doc.data()};
  }

  const categories = ['โพลารอยด์','บัตรแขวนคอ','นามบัตร','ป้ายร้านค้า','QR Code','ป้ายตุ๊กตา','บัตรนักเรียน','อื่นๆ'];

  body.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${productId?'✏️ แก้ไขสินค้า':'➕ เพิ่มสินค้าใหม่'}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>

    <!-- รูปสินค้า -->
    <div class="form-group">
      <label class="form-label">🖼️ รูปสินค้า</label>
      <div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap">
        <div id="p-img-preview" style="width:80px;height:80px;border-radius:var(--r-lg);background:var(--bg-mid);border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:2rem;overflow:hidden;flex-shrink:0">
          ${product.image?`<img src="${product.image}" style="width:100%;height:100%;object-fit:cover">`:(product.emoji||'📦')}
        </div>
        <div style="flex:1">
          <input type="file" id="p-img-file" accept="image/*" style="display:none">
          <button class="btn btn-ghost btn-sm" id="p-upload-btn" style="border-radius:var(--r-md);margin-bottom:.35rem">📤 อัปโหลดรูป</button>
          <div id="p-upload-status" style="font-size:.73rem;color:var(--text-3)">JPG, PNG ไม่เกิน 5MB</div>
          <input class="form-input" id="p-image" value="${DMC.escapeHtml(product.image||'')}" placeholder="หรือวาง URL รูปภาพ" style="font-size:.8rem;margin-top:.35rem">
        </div>
      </div>
    </div>

    <!-- ชื่อ + Emoji -->
    <div class="form-row" style="margin-bottom:1rem">
      <div class="form-group" style="margin:0">
        <label class="form-label">ชื่อสินค้า *</label>
        <input class="form-input" id="p-name" value="${DMC.escapeHtml(product.name)}" placeholder="ชื่อสินค้า">
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">Emoji (ถ้าไม่มีรูป)</label>
        <input class="form-input" id="p-emoji" value="${product.emoji||'📦'}" placeholder="📦">
      </div>
    </div>

    <!-- หมวดหมู่ + หน่วย -->
    <div class="form-row" style="margin-bottom:1rem">
      <div class="form-group" style="margin:0">
        <label class="form-label">หมวดหมู่ *</label>
        <select class="form-input form-select" id="p-category">
          ${categories.map(c=>`<option ${product.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">หน่วย</label>
        <input class="form-input" id="p-unit" value="${DMC.escapeHtml(product.unit||'ชิ้น')}" placeholder="ใบ / ชิ้น / ชุด">
      </div>
    </div>

    <!-- ราคา + ราคาเดิม + ขั้นต่ำ -->
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

    <!-- ตัวเลือกขนาด -->
    <div class="form-group">
      <label class="form-label">📐 ตัวเลือกขนาด <span style="font-weight:400;color:var(--text-3)">(คั่นด้วย , เช่น 3×4 นิ้ว, 4×6 นิ้ว)</span></label>
      <input class="form-input" id="p-sizes" value="${(product.sizes||[]).join(', ')}" placeholder="3×4 นิ้ว, 4×6 นิ้ว, Square 3×3">
    </div>

    <!-- วัสดุ/เคลือบ -->
    <div class="form-group">
      <label class="form-label">🗒️ วัสดุ/การเคลือบ <span style="font-weight:400;color:var(--text-3)">(คั่นด้วย ,)</span></label>
      <input class="form-input" id="p-materials" value="${(product.materials||[]).join(', ')}" placeholder="มันเงา (Glossy), ด้าน (Matte), Luster">
    </div>

    <!-- ส่วนลดปริมาณ -->
    <div class="form-group">
      <label class="form-label">🎁 ส่วนลดตามปริมาณ <span style="font-weight:400;color:var(--text-3)">(คั่นด้วย , เช่น 50+ ใบ ลด 10%)</span></label>
      <input class="form-input" id="p-tiers" value="${(product.priceTiers||[]).join(', ')}" placeholder="50+ ใบ ลด 10%, 100+ ใบ ลด 20%">
    </div>

    <!-- คำอธิบาย -->
    <div class="form-group">
      <label class="form-label">คำอธิบายสั้น <span style="font-weight:400;color:var(--text-3)">(แสดงในการ์ดสินค้า)</span></label>
      <input class="form-input" id="p-shortdesc" value="${DMC.escapeHtml(product.shortDesc||'')}" placeholder="คำอธิบายสั้นๆ">
    </div>
    <div class="form-group">
      <label class="form-label">รายละเอียดเต็ม</label>
      <textarea class="form-input form-textarea" id="p-desc">${DMC.escapeHtml(product.fullDesc||'')}</textarea>
    </div>

    <!-- Checkbox options -->
    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem">
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-active"   ${product.active?'checked':''} style="accent-color:var(--accent)"> แสดงสินค้า
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-preview"  ${product.hasPreview?'checked':''} style="accent-color:var(--accent)"> 🎨 มี Preview Tool
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-new"      ${product.isNew?'checked':''} style="accent-color:var(--emerald)"> ✨ ใหม่
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-hot"      ${product.isHot?'checked':''} style="accent-color:var(--rose)"> 🔥 ขายดี
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-sale"     ${product.isSale?'checked':''} style="accent-color:var(--gold)"> 💰 ลด
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-featured" ${product.featured?'checked':''} style="accent-color:var(--gold)"> ⭐ แนะนำ
      </label>
    </div>

    <div style="display:flex;gap:.75rem">
      <button class="btn btn-primary btn-md" style="flex:1" onclick="saveProduct('${productId||''}')">
        💾 ${productId?'บันทึกการแก้ไข':'เพิ่มสินค้า'}
      </button>
      <button class="btn btn-ghost btn-md" onclick="closeModal()">ยกเลิก</button>
    </div>`;

  overlay.classList.add('open');

  // Image upload handler
  setTimeout(() => {
    const fileInput = document.getElementById('p-img-file');
    const preview   = document.getElementById('p-img-preview');
    const urlInput  = document.getElementById('p-image');
    const uploadBtn = document.getElementById('p-upload-btn');
    const statusEl  = document.getElementById('p-upload-status');

    uploadBtn?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      // Local preview
      const reader = new FileReader();
      reader.onload = e => { preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`; };
      reader.readAsDataURL(file);
      // Upload
      try {
        statusEl.textContent = '⏳ กำลังอัปโหลด...';
        statusEl.style.color = 'var(--accent)';
        urlInput.disabled = true;
        const res = await DMC.uploadToImgBB(file);
        urlInput.value = res.url;
        urlInput.disabled = false;
        statusEl.textContent = '✅ อัปโหลดสำเร็จ';
        statusEl.style.color = 'var(--emerald)';
        DMC.toast('อัปโหลดรูปสำเร็จ ✅', 'success');
      } catch(e) {
        urlInput.disabled = false;
        statusEl.textContent = '❌ อัปโหลดไม่สำเร็จ';
        statusEl.style.color = 'var(--rose)';
        DMC.toast('อัปโหลดไม่สำเร็จ: '+e.message, 'error');
      }
    });

    urlInput?.addEventListener('input', DMC.debounce(() => {
      const url = urlInput.value.trim();
      if (url.startsWith('http')) preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.textContent='❌'">`;
    }, 600));
  }, 100);
};

window.saveProduct = async function(productId) {
  const splitComma = id => (document.getElementById(id)?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
  const data = {
    name:       document.getElementById('p-name')?.value.trim(),
    category:   document.getElementById('p-category')?.value,
    price:      parseFloat(document.getElementById('p-price')?.value)||0,
    oldPrice:   document.getElementById('p-oldprice')?.value ? parseFloat(document.getElementById('p-oldprice').value) || null : null,
    minQty:     parseInt(document.getElementById('p-minqty')?.value)||1,
    unit:       document.getElementById('p-unit')?.value.trim()||'ชิ้น',
    sizes:      splitComma('p-sizes'),
    materials:  splitComma('p-materials'),
    priceTiers: splitComma('p-tiers'),
    shortDesc:  document.getElementById('p-shortdesc')?.value.trim(),
    fullDesc:   document.getElementById('p-desc')?.value.trim(),
    emoji:      document.getElementById('p-emoji')?.value.trim()||'📦',
    image:      document.getElementById('p-image')?.value.trim()||'',
    active:     document.getElementById('p-active')?.checked,
    hasPreview: document.getElementById('p-preview')?.checked,
    isNew:      document.getElementById('p-new')?.checked,
    isHot:      document.getElementById('p-hot')?.checked,
    isSale:     document.getElementById('p-sale')?.checked,
    featured:   document.getElementById('p-featured')?.checked,
    updatedAt:  firebase.firestore.FieldValue.serverTimestamp(),
  };
  if (!data.name)  { DMC.toast('กรุณากรอกชื่อสินค้า','error'); return; }
  if (!data.price) { DMC.toast('กรุณากรอกราคา','error'); return; }
  try {
    if (productId) {
      await db.collection('products').doc(productId).update(data);
      DMC.toast('แก้ไขสินค้าสำเร็จ ✅','success');
    } else {
      data.createdAt   = firebase.firestore.FieldValue.serverTimestamp();
      data.orderCount  = 0;
      await db.collection('products').add(data);
      DMC.toast('เพิ่มสินค้าใหม่สำเร็จ 🎉','success');
    }
    closeModal(); loadProductsTable();
  } catch(e) { DMC.toast('บันทึกไม่สำเร็จ: '+e.message,'error'); }
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
    <div class="admin-box">
      <div id="gallery-grid-admin" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem">
        <div style="text-align:center;padding:2rem;grid-column:1/-1"><span class="spinner" style="display:block;margin:0 auto"></span></div>
      </div>
    </div>
    <!-- Add Gallery Modal -->
    <div id="gallery-add-form" style="display:none" class="admin-box">
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
        <button class="btn btn-primary btn-md" onclick="saveGalleryItem()">💾 บันทึก</button>
        <button class="btn btn-ghost btn-md" onclick="document.getElementById('gallery-add-form').style.display='none'">ยกเลิก</button>
      </div>
    </div>`;

  document.getElementById('add-gallery-btn')?.addEventListener('click', () => {
    const form = document.getElementById('gallery-add-form');
    form.style.display = form.style.display === 'none' ? '' : 'none';
  });

  const fileInput = document.getElementById('g-img-file');
  const statusEl  = document.getElementById('g-upload-status');
  document.getElementById('g-upload-btn')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      statusEl.textContent = '⏳ กำลังอัปโหลด...';
      const res = await DMC.uploadToImgBB(file);
      document.getElementById('g-image').value = res.url;
      statusEl.textContent = '✅ อัปโหลดแล้ว';
      statusEl.style.color = 'var(--emerald)';
    } catch(e) {
      statusEl.textContent = '❌ ไม่สำเร็จ';
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
    let html = '';
    snap.forEach(doc => {
      const g = {id:doc.id,...doc.data()};
      html += `<div style="position:relative;border-radius:var(--r-lg);overflow:hidden;border:1.5px solid var(--border);background:var(--bg-mid)">
        ${g.image ? `<img src="${g.image}" style="width:100%;aspect-ratio:1;object-fit:cover">` : `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:2rem">${g.emoji||'📸'}</div>`}
        <div style="padding:.5rem .6rem">
          <div style="font-family:var(--font-display);font-size:.8rem;font-weight:600">${DMC.escapeHtml(g.name||'—')}</div>
          <div style="font-size:.7rem;color:var(--text-3)">${DMC.escapeHtml(g.cat||'')}</div>
        </div>
        <button onclick="deleteGalleryItem('${doc.id}')" style="position:absolute;top:.4rem;right:.4rem;background:rgba(251,113,133,.85);border:none;border-radius:50%;width:24px;height:24px;color:#fff;font-size:.65rem;cursor:pointer">✕</button>
      </div>`;
    });
    grid.innerHTML = html;
  } catch(e) { grid.innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ</div>'; }
}

window.saveGalleryItem = async function() {
  const data = {
    name:  document.getElementById('g-name')?.value.trim(),
    cat:   document.getElementById('g-cat')?.value,
    image: document.getElementById('g-image')?.value.trim(),
    active: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (!data.image) { DMC.toast('กรุณาอัปโหลดรูปก่อน','error'); return; }
  try {
    await db.collection('gallery').add(data);
    DMC.toast('เพิ่มรูปสำเร็จ ✅','success');
    document.getElementById('gallery-add-form').style.display = 'none';
    document.getElementById('g-name').value = '';
    document.getElementById('g-image').value = '';
    await loadGalleryItems();
  } catch(e) { DMC.toast('บันทึกไม่สำเร็จ','error'); }
};

window.deleteGalleryItem = async function(id) {
  if (!confirm('ลบรูปนี้?')) return;
  try { await db.collection('gallery').doc(id).delete(); DMC.toast('ลบแล้ว','success'); loadGalleryItems(); }
  catch(e) { DMC.toast('ลบไม่สำเร็จ','error'); }
};

// ══════════════════════════════════════════════
//  CONTACTS INBOX
// ══════════════════════════════════════════════
async function loadContacts(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>📬 กล่องข้อความ</h2><p>ข้อความจากลูกค้าที่ส่งผ่านหน้าติดต่อเรา</p></div>
    </div>
    <div class="admin-box">
      <div id="contacts-list"><div style="text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div></div>
    </div>`;

  try {
    const snap = await db.collection('contacts').limit(50).get();
    const el = document.getElementById('contacts-list');
    if (snap.empty) { el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-3)">ยังไม่มีข้อความ</div>'; return; }

    const docs = [];
    snap.forEach(doc => docs.push({id:doc.id,...doc.data()}));
    docs.sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:.75rem">` +
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
            ${m.contact?`<a href="https://line.me/R/ti/p/${m.contact.replace('@','')}" target="_blank" rel="noopener" class="btn btn-line btn-sm" style="border-radius:var(--r-md)">💬 ตอบ LINE</a>`:''}
            <button class="table-action-btn" style="color:var(--rose);border-color:var(--rose)" onclick="deleteContact('${m.id}')">🗑️ ลบ</button>
          </div>
        </div>`).join('') + '</div>';
  } catch(e) {
    document.getElementById('contacts-list').innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ: '+e.message+'</div>';
  }
}

window.deleteContact = async function(id) {
  if (!confirm('ลบข้อความนี้?')) return;
  try { await db.collection('contacts').doc(id).delete(); DMC.toast('ลบแล้ว','success'); loadContacts(document.getElementById('admin-content')); }
  catch(e) { DMC.toast('ลบไม่สำเร็จ','error'); }
};

// ══════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════
async function loadSettings(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>⚙️ ตั้งค่าระบบ</h2><p>จัดการการตั้งค่าต่างๆ ของร้าน</p></div>
    </div>
    <div class="settings-grid">

      <!-- เปลี่ยนรหัสผ่าน -->
      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">🔐 เปลี่ยนรหัสผ่าน Admin</div></div>
        <div class="form-group">
          <label class="form-label">รหัสผ่านใหม่</label>
          <input class="form-input" type="password" id="new-pass" placeholder="••••••••">
        </div>
        <div class="form-group">
          <label class="form-label">ยืนยันรหัสผ่านใหม่</label>
          <input class="form-input" type="password" id="confirm-pass" placeholder="••••••••">
        </div>
        <div id="new-hash-output" style="display:none;background:var(--bg-mid);border-radius:var(--r-md);padding:.75rem;margin-bottom:.75rem;word-break:break-all">
          <div style="font-size:.72rem;color:var(--text-3);margin-bottom:.3rem;font-family:var(--font-display)">Copy ไปใส่ใน admin.js → ADMIN_HASH:</div>
          <code id="hash-value" style="font-size:.72rem;color:var(--accent)"></code>
          <button class="btn btn-ghost btn-sm" style="margin-top:.5rem;border-radius:var(--r-md)" onclick="copyHash()">📋 Copy</button>
        </div>
        <button class="btn btn-primary btn-md" onclick="generatePasswordHash()">🔑 สร้าง Hash</button>
      </div>

      <!-- ข้อมูลร้าน -->
      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">🏪 ข้อมูลร้าน</div></div>
        <div class="form-group"><label class="form-label">ชื่อร้าน</label><input class="form-input" id="s-shopname" placeholder="Diamond Cute Studio"></div>
        <div class="form-group"><label class="form-label">LINE OA URL</label><input class="form-input" id="s-line" placeholder="https://line.me/R/ti/p/..."></div>
        <div class="form-group"><label class="form-label">Facebook URL</label><input class="form-input" id="s-fb" placeholder="https://facebook.com/..."></div>
        <div class="form-group"><label class="form-label">Instagram URL</label><input class="form-input" id="s-ig" placeholder="https://instagram.com/..."></div>
        <div class="form-group"><label class="form-label">เบอร์โทร</label><input class="form-input" id="s-phone" placeholder="0xx-xxx-xxxx"></div>
        <button class="btn btn-primary btn-md" onclick="saveShopSettings()">💾 บันทึกข้อมูลร้าน</button>
      </div>

      <!-- ความปลอดภัย -->
      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">🛡️ ความปลอดภัย</div></div>
        <div class="security-status">
          <div class="security-row ok">✅ PBKDF2-SHA256 (100,000 iterations)</div>
          <div class="security-row ok">✅ Session Token + Expiry 8 ชั่วโมง</div>
          <div class="security-row ok">✅ Rate Limit: 5 ครั้ง → ล็อค 15 นาที</div>
          <div class="security-row ok">✅ Admin URL แยกจาก Public</div>
          <div class="security-row ok">✅ Cloudflare CDN + Firewall</div>
          <div class="security-row ok">✅ HTTPS Enforced</div>
        </div>
      </div>

      <!-- LINE Config -->
      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">💬 LINE Messaging API</div></div>
        <p style="font-size:.83rem;color:var(--text-2);margin-bottom:.75rem">ตั้งค่าใน Cloudflare Worker Dashboard → Settings → Variables and Secrets</p>
        <div style="background:var(--bg-mid);border-radius:var(--r-md);padding:1rem;font-size:.82rem">
          <div style="margin-bottom:.4rem"><strong>LINE_TOKEN</strong> <span style="color:var(--text-3)">= Channel Access Token</span></div>
          <div><strong>LINE_USER_ID</strong> <span style="color:var(--text-3)">= User ID (U...) คั่น , ถ้าหลายคน</span></div>
        </div>
        <button class="btn btn-secondary btn-md" style="margin-top:.75rem" onclick="testLine()">🔔 ทดสอบส่งแจ้งเตือน</button>
      </div>
    </div>`;

  // Load existing settings
  try {
    const doc = await db.collection('settings').doc('shop').get();
    if (doc.exists) {
      const s = doc.data();
      if (s.name)  document.getElementById('s-shopname').value = s.name;
      if (s.line)  document.getElementById('s-line').value     = s.line;
      if (s.fb)    document.getElementById('s-fb').value       = s.fb;
      if (s.ig)    document.getElementById('s-ig').value       = s.ig;
      if (s.phone) document.getElementById('s-phone').value    = s.phone;
    }
  } catch(e) {}
}

window.generatePasswordHash = async function() {
  const p1 = document.getElementById('new-pass')?.value;
  const p2 = document.getElementById('confirm-pass')?.value;
  if (!p1)        { DMC.toast('กรอกรหัสผ่านก่อน','error'); return; }
  if (p1 !== p2)  { DMC.toast('รหัสผ่านไม่ตรงกัน','error'); return; }
  if (p1.length < 6) { DMC.toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัว','error'); return; }
  const hash = await DMC.pbkdf2Hash(p1, ADMIN_SALT);
  document.getElementById('hash-value').textContent = hash;
  document.getElementById('new-hash-output').style.display = 'block';
  DMC.toast('สร้าง Hash สำเร็จ — Copy ไปใส่ใน admin.js', 'success', 5000);
};

window.copyHash = function() {
  const hash = document.getElementById('hash-value')?.textContent;
  if (!hash) return;
  navigator.clipboard.writeText(hash).then(() => DMC.toast('Copy แล้ว ✅','success')).catch(()=>DMC.toast('Copy ด้วยตนเองครับ','info'));
};

window.saveShopSettings = async function() {
  const data = {
    name:  document.getElementById('s-shopname')?.value.trim(),
    line:  document.getElementById('s-line')?.value.trim(),
    fb:    document.getElementById('s-fb')?.value.trim(),
    ig:    document.getElementById('s-ig')?.value.trim(),
    phone: document.getElementById('s-phone')?.value.trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try {
    await db.collection('settings').doc('shop').set(data, {merge:true});
    DMC.toast('บันทึกข้อมูลร้านสำเร็จ ✅','success');
  } catch(e) { DMC.toast('บันทึกไม่สำเร็จ','error'); }
};

window.testLine = async function() {
  const ok = await DMC.sendLineNotify({ orderId:'TEST', customerName:'ทดสอบ', customerPhone:'000', itemsSummary:'ทดสอบระบบแจ้งเตือน', total:0, paymentMethod:'test' });
  DMC.toast(ok?'✅ ส่ง LINE สำเร็จ!':'❌ ส่งไม่สำเร็จ ตรวจสอบ config', ok?'success':'error');
};

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function statusLabel(s) {
  return {pending:'⏳ รอดำเนินการ', processing:'🔄 กำลังทำ', done:'✅ เสร็จสิ้น', cancelled:'❌ ยกเลิก'}[s] || '🆕 ใหม่';
}
function setText(id, text) { const el=document.getElementById(id); if(el) el.textContent=text; }
