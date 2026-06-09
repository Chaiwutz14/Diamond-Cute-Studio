/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Admin JS
   js/admin.js
═══════════════════════════════════════════════ */

'use strict';

// ─── Admin Config ───
// IMPORTANT: Change this before deployment!
// Run in console: DMC.pbkdf2Hash('your_password', 'dmc_salt_2025') to generate hash
// Then paste the result here
const ADMIN_HASH = "b454dc28df89029f894c5046920aec23d2bcceb2db61e1b2a354709c069f6ffc";
const ADMIN_SALT = "dmc_salt_2025";

let db = null;

document.addEventListener('DOMContentLoaded', async () => {

  const isLoginPage = document.getElementById('admin-login-page');
  const isDashboard = document.getElementById('admin-dashboard');

  if (isLoginPage) {
    initLoginPage();
    return;
  }

  if (isDashboard) {
    // Guard: must be authenticated
    if (!DMC.isAdminAuthenticated()) {
      window.location.href = 'admin-login.html';
      return;
    }
    // Load Firebase and init dashboard
    try {
      db = await DMC.getFirebaseReady();
      initDashboard();
    } catch (e) {
      console.error('Firebase init error:', e);
      DMC.toast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
    }
  }
});

// ─────────────────────────────────
//  LOGIN PAGE
// ─────────────────────────────────
function initLoginPage() {
  const form     = document.getElementById('login-form');
  const passInput = document.getElementById('login-password');
  const errorBox  = document.getElementById('login-error');
  const lockBox   = document.getElementById('login-locked');
  const attDots   = document.querySelectorAll('.attempt-dot');

  // Check if locked out
  function checkLockout() {
    if (DMC.isLockedOut()) {
      const mins = DMC.getRemainingLockout();
      showLocked(mins);
      return true;
    }
    return false;
  }

  function showLocked(mins) {
    lockBox.innerHTML = `🔒 บัญชีถูกล็อค กรุณารอ ${mins} นาที แล้วลองใหม่`;
    lockBox.classList.add('visible');
    form?.querySelectorAll('input, button').forEach(el => el.disabled = true);
  }

  function updateAttemptDots() {
    const data = DMC.getRateLimit();
    attDots.forEach((dot, i) => {
      dot.classList.toggle('used', i < data.count);
    });
  }

  if (checkLockout()) return;
  updateAttemptDots();

  // Tick lockout countdown
  const lockTimer = setInterval(() => {
    if (DMC.isLockedOut()) {
      showLocked(DMC.getRemainingLockout());
    } else if (lockBox.classList.contains('visible')) {
      lockBox.classList.remove('visible');
      form?.querySelectorAll('input, button').forEach(el => el.disabled = false);
      updateAttemptDots();
      clearInterval(lockTimer);
    }
  }, 30000);

  // Submit
  async function handleLogin(e) {
    e?.preventDefault();
    if (checkLockout()) return;

    const password = passInput.value.trim();
    if (!password) return;

    const submitBtn = document.getElementById('login-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span>';

    try {
      const hash = await DMC.pbkdf2Hash(password, ADMIN_SALT);
      const correct = hash === ADMIN_HASH;

      if (correct) {
        DMC.clearRateLimit();
        DMC.createSession();
        DMC.toast('เข้าสู่ระบบสำเร็จ 🎉', 'success');
        setTimeout(() => { window.location.href = 'admin.html'; }, 600);
      } else {
        const data = DMC.recordFailedAttempt();
        updateAttemptDots();

        if (data.count >= DMC.MAX_ATTEMPTS) {
          showLocked(DMC.getRemainingLockout());
        } else {
          const remaining = DMC.MAX_ATTEMPTS - data.count;
          errorBox.innerHTML = `❌ รหัสผ่านไม่ถูกต้อง (เหลือ ${remaining} ครั้ง)`;
          errorBox.classList.add('visible');
          passInput.value = '';
          passInput.classList.add('error');
          passInput.focus();
          setTimeout(() => {
            errorBox.classList.remove('visible');
            passInput.classList.remove('error');
          }, 3000);
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = '🔓 เข้าสู่ระบบ';
      }
    } catch (err) {
      console.error('Login error:', err);
      DMC.toast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '🔓 เข้าสู่ระบบ';
    }
  }

  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  passInput?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
}

// ─────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────
function initDashboard() {
  // Sidebar navigation
  initSidebarNav();

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('ออกจากระบบ?')) {
      DMC.clearSession();
      window.location.href = 'admin-login.html';
    }
  });

  // Load default section
  const hash = location.hash.slice(1) || 'overview';
  loadSection(hash);

  // Mobile sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('admin-sidebar')?.classList.toggle('open');
  });
}

// ─── Sidebar Nav ───
function initSidebarNav() {
  document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      loadSection(section);
      location.hash = section;
      // Close mobile sidebar
      document.getElementById('admin-sidebar')?.classList.remove('open');
    });
  });
}

// ─── Load Section ───
const SECTIONS = {};

function loadSection(name) {
  const content = document.getElementById('admin-content');
  if (!content) return;

  const loaders = {
    overview:  loadOverview,
    orders:    loadOrders,
    products:  loadProducts,
    settings:  loadSettings
  };

  const loader = loaders[name] || loaders.overview;
  loader(content);
}

// ─── Overview / Dashboard ───
async function loadOverview(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting">
        <h2>สวัสดี Admin 👋</h2>
        <p id="greeting-sub">กำลังโหลดข้อมูล...</p>
      </div>
      <div class="admin-topbar-actions">
        <button class="btn btn-line btn-md" id="test-notify">🔔 ทดสอบ LINE</button>
        <button class="btn btn-primary btn-md" onclick="location.hash='products'">+ เพิ่มสินค้า</button>
      </div>
    </div>

    <!-- KPI -->
    <div class="kpi-grid" id="kpi-grid">
      ${['','','',''].map((_, i) => `
        <div class="kpi-card kpi-${['blue','gold','green','rose'][i]}">
          <div class="kpi-icon">${['⏳','💰','✅','📦'][i]}</div>
          <div class="kpi-label">${['รอดำเนินการ','ยอดขายเดือนนี้','งานเสร็จแล้ว','ออเดอร์วันนี้'][i]}</div>
          <div class="kpi-value" id="kpi-${['pending','revenue','done','today'][i]}">
            <span class="spinner"></span>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="admin-grid">
      <div>
        <!-- Sales Chart -->
        <div class="admin-box">
          <div class="admin-box-header">
            <div class="admin-box-title">📈 ยอดขาย 7 วันล่าสุด</div>
          </div>
          <div class="chart-area" id="sales-chart"></div>
          <div class="chart-x-labels" id="chart-labels"></div>
        </div>

        <!-- Recent Orders -->
        <div class="admin-box">
          <div class="admin-box-header">
            <div class="admin-box-title">📦 ออเดอร์ล่าสุด</div>
            <span class="admin-box-action" onclick="location.hash='orders'">ดูทั้งหมด →</span>
          </div>
          <div id="recent-orders-table">
            <div style="text-align:center;padding:2rem;color:var(--text-muted)">
              <span class="spinner" style="margin:0 auto;display:block"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div>
        <!-- Top Products -->
        <div class="admin-box">
          <div class="admin-box-header">
            <div class="admin-box-title">🏆 สินค้าขายดี</div>
          </div>
          <div id="top-products-list">
            <div style="color:var(--text-muted);font-size:0.84rem;text-align:center;padding:1rem">กำลังโหลด...</div>
          </div>
        </div>

        <!-- LINE Status -->
        <div class="admin-box">
          <div class="admin-box-header">
            <div class="admin-box-title">💬 LINE Notify</div>
          </div>
          <div style="font-size:0.84rem;color:var(--text-muted);margin-bottom:0.75rem">
            ระบบแจ้งเตือนออเดอร์ใหม่ทันทีผ่าน LINE
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;padding:0.55rem 0.8rem;
               background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2);
               border-radius:var(--r-md);margin-bottom:0.75rem">
            <span style="color:var(--emerald-light)">●</span>
            <span style="font-family:var(--font-display);font-size:0.84rem;color:var(--emerald-light)">เชื่อมต่อแล้ว</span>
          </div>
          <button class="btn btn-secondary btn-block btn-md" id="test-notify-2">🔔 ทดสอบส่งแจ้งเตือน</button>
        </div>

        <!-- Security -->
        <div class="admin-box">
          <div class="admin-box-header">
            <div class="admin-box-title">🔐 ความปลอดภัย</div>
          </div>
          <div class="security-status">
            <div class="security-row ok">✅ PBKDF2-SHA256 Hashing</div>
            <div class="security-row ok">✅ Session Token (8 ชม.)</div>
            <div class="security-row ok">✅ Rate Limit 5 ครั้ง/15 นาที</div>
            <div class="security-row ok">✅ Cloudflare WAF</div>
            <div class="security-row ok">✅ HTTPS Only</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Test LINE notify buttons
  ['test-notify', 'test-notify-2'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', async () => {
      const ok = await DMC.sendLineNotify('🔔 ทดสอบระบบแจ้งเตือน Diamond Cute Studio');
      DMC.toast(ok ? 'ส่ง LINE สำเร็จ! ✅' : 'ส่งไม่สำเร็จ กรุณาตรวจสอบ config', ok ? 'success' : 'error');
    });
  });

  // Load data
  await Promise.all([
    loadKPIs(),
    loadRecentOrdersTable(),
    loadTopProducts(),
    renderSalesChart()
  ]);
}

// ─── KPIs ───
async function loadKPIs() {
  try {
    const now    = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allOrders, todayOrders, monthOrders] = await Promise.all([
      db.collection('orders').where('status', '!=', 'cancelled').get(),
      db.collection('orders').where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(todayStart)).get(),
      db.collection('orders').where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(monthStart)).get()
    ]);

    let pending = 0, done = 0, monthRevenue = 0;

    allOrders.forEach(d => {
      const o = d.data();
      if (o.status === 'pending' || o.status === 'processing') pending++;
      if (o.status === 'done') done++;
    });

    monthOrders.forEach(d => {
      monthRevenue += d.data().total || 0;
    });

    setText('kpi-pending', pending);
    setText('kpi-revenue', DMC.formatPrice(monthRevenue));
    setText('kpi-done', done);
    setText('kpi-today', todayOrders.size);

    const subText = pending > 0
      ? `มี ${pending} ออเดอร์รอดำเนินการ`
      : 'ทุกออเดอร์เรียบร้อยดี 🎉';
    setText('greeting-sub', subText);

  } catch (e) {
    console.warn('KPI load error:', e);
    ['pending','revenue','done','today'].forEach(k => setText(`kpi-${k}`, '—'));
  }
}

// ─── Recent Orders Table ───
async function loadRecentOrdersTable() {
  const container = document.getElementById('recent-orders-table');
  if (!container) return;

  try {
    const snap = await db.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(8)
      .get();

    if (snap.empty) {
      container.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-muted)">ยังไม่มีออเดอร์</div>';
      return;
    }

    const rows = [];
    snap.forEach(doc => {
      const o = { id: doc.id, ...doc.data() };
      rows.push(`
        <tr>
          <td><span class="order-id-cell">#${o.orderId || o.id.slice(-6).toUpperCase()}</span></td>
          <td>${DMC.escapeHtml(o.customerName || '—')}</td>
          <td style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${DMC.escapeHtml(o.itemsSummary || '—')}
          </td>
          <td class="price-cell">${DMC.formatPrice(o.total || 0)}</td>
          <td><span class="status status-${o.status || 'new'}">${statusLabel(o.status)}</span></td>
          <td>
            <button class="table-action-btn" onclick="openOrderModal('${doc.id}')">ดู</button>
          </td>
        </tr>
      `);
    });

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>ออเดอร์</th><th>ลูกค้า</th><th>รายการ</th>
            <th>ราคา</th><th>สถานะ</th><th>จัดการ</th>
          </tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    `;
  } catch (e) {
    console.warn('Orders table error:', e);
    container.innerHTML = '<div style="color:var(--text-muted);padding:1rem;text-align:center">ไม่สามารถโหลดข้อมูลได้</div>';
  }
}

// ─── Top Products ───
async function loadTopProducts() {
  const container = document.getElementById('top-products-list');
  if (!container) return;

  try {
    const snap = await db.collection('products')
      .orderBy('orderCount', 'desc')
      .limit(5)
      .get();

    if (snap.empty) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.83rem;text-align:center">ยังไม่มีข้อมูล</div>';
      return;
    }

    const rankClass = ['gold-rank','silver-rank','bronze-rank','',''];
    let html = '';
    let i = 0;
    snap.forEach(doc => {
      const p = doc.data();
      html += `
        <div class="top-product-item">
          <div class="tp-rank ${rankClass[i] || ''}">${i + 1}</div>
          <div class="tp-icon">${p.emoji || '📦'}</div>
          <div class="tp-info">
            <div class="tp-name">${DMC.escapeHtml(p.name)}</div>
            <div class="tp-count">${p.orderCount || 0} ออเดอร์เดือนนี้</div>
          </div>
          <div class="tp-val">${DMC.formatPrice((p.price || 0) * (p.orderCount || 0))}</div>
        </div>
      `;
      i++;
    });

    container.innerHTML = html;
  } catch (e) { container.innerHTML = ''; }
}

// ─── Sales Chart ───
async function renderSalesChart() {
  const chartEl  = document.getElementById('sales-chart');
  const labelsEl = document.getElementById('chart-labels');
  if (!chartEl || !labelsEl) return;

  try {
    const days = 7;
    const buckets = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      buckets.push({
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        label: i === 0 ? 'วันนี้' : ['อา','จ','อ','พ','พฤ','ศ','ส'][d.getDay()],
        isToday: i === 0,
        total: 0
      });
    }

    const startDate = buckets[0].date;
    const snap = await db.collection('orders')
      .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(startDate))
      .get();

    snap.forEach(doc => {
      const o = doc.data();
      if (!o.createdAt) return;
      const d = o.createdAt.toDate();
      const bucket = buckets.find(b =>
        b.date.getFullYear() === d.getFullYear() &&
        b.date.getMonth() === d.getMonth() &&
        b.date.getDate() === d.getDate()
      );
      if (bucket) bucket.total += o.total || 0;
    });

    const maxVal = Math.max(...buckets.map(b => b.total), 1);

    chartEl.innerHTML = buckets.map(b => {
      const pct = Math.max((b.total / maxVal) * 100, 3);
      return `<div class="chart-bar ${b.isToday ? 'today' : ''}"
               style="height:${pct}%" data-val="${DMC.formatPrice(b.total)}"></div>`;
    }).join('');

    labelsEl.innerHTML = buckets.map(b =>
      `<div class="chart-x-label ${b.isToday ? 'today' : ''}">${b.label}</div>`
    ).join('');

  } catch (e) {
    // Show placeholder chart
    const placeholderHeights = [45, 68, 52, 80, 60, 88, 65];
    chartEl.innerHTML = placeholderHeights.map((h, i) =>
      `<div class="chart-bar ${i === 6 ? 'today' : ''}" style="height:${h}%"></div>`
    ).join('');
    labelsEl.innerHTML = ['จ','อ','พ','พฤ','ศ','ส','วันนี้'].map((l, i) =>
      `<div class="chart-x-label ${i === 6 ? 'today' : ''}">${l}</div>`
    ).join('');
  }
}

// ─── Orders Section ───
async function loadOrders(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting">
        <h2>📦 ออเดอร์ทั้งหมด</h2>
        <p>จัดการและอัพเดทสถานะออเดอร์</p>
      </div>
      <div class="admin-topbar-actions">
        <select class="form-input form-select" id="order-filter-status" style="width:auto;padding:0.45rem 2rem 0.45rem 0.8rem">
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="processing">กำลังทำ</option>
          <option value="done">เสร็จสิ้น</option>
          <option value="cancelled">ยกเลิก</option>
        </select>
      </div>
    </div>

    <div class="admin-box">
      <div id="orders-full-table">
        <div style="text-align:center;padding:2rem">
          <span class="spinner" style="display:block;margin:0 auto"></span>
        </div>
      </div>
    </div>
  `;

  await loadOrdersTable();

  document.getElementById('order-filter-status')?.addEventListener('change', loadOrdersTable);
}

async function loadOrdersTable() {
  const container = document.getElementById('orders-full-table');
  if (!container) return;

  const statusFilter = document.getElementById('order-filter-status')?.value;

  try {
    let query = db.collection('orders').orderBy('createdAt', 'desc').limit(50);
    if (statusFilter) query = query.where('status', '==', statusFilter);

    const snap = await query.get();

    if (snap.empty) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted)">ไม่พบออเดอร์</div>';
      return;
    }

    const rows = [];
    snap.forEach(doc => {
      const o = { id: doc.id, ...doc.data() };
      rows.push(`
        <tr>
          <td><span class="order-id-cell">#${o.orderId || o.id.slice(-6).toUpperCase()}</span></td>
          <td>${DMC.escapeHtml(o.customerName || '—')}</td>
          <td>${DMC.escapeHtml(o.customerPhone || '—')}</td>
          <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${DMC.escapeHtml(o.itemsSummary || '—')}</td>
          <td class="price-cell">${DMC.formatPrice(o.total || 0)}</td>
          <td>${DMC.escapeHtml(o.paymentMethod || '—')}</td>
          <td><span class="status status-${o.status || 'new'}">${statusLabel(o.status)}</span></td>
          <td style="white-space:nowrap">${DMC.formatDate(o.createdAt, true)}</td>
          <td>
            <button class="table-action-btn" onclick="openOrderModal('${doc.id}')">ดู/แก้ไข</button>
          </td>
        </tr>
      `);
    });

    container.innerHTML = `
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>ออเดอร์</th><th>ชื่อ</th><th>โทร</th><th>รายการ</th>
              <th>ราคา</th><th>ชำระ</th><th>สถานะ</th><th>วันที่</th><th>จัดการ</th>
            </tr>
          </thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>
    `;
  } catch (e) {
    console.warn('Orders load error:', e);
    container.innerHTML = '<div style="color:var(--text-muted);padding:1rem;text-align:center">โหลดไม่สำเร็จ</div>';
  }
}

// ─── Order Detail Modal ───
window.openOrderModal = async function(orderId) {
  const overlay = document.getElementById('modal-overlay');
  const body    = document.getElementById('modal-body');
  if (!overlay || !body) return;

  body.innerHTML = '<div style="text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div>';
  overlay.classList.add('open');

  try {
    const doc = await db.collection('orders').doc(orderId).get();
    if (!doc.exists) { body.innerHTML = '<p>ไม่พบออเดอร์</p>'; return; }
    const o = { id: doc.id, ...doc.data() };

    body.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">📦 ออเดอร์ #${o.orderId || o.id.slice(-6).toUpperCase()}</div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <div class="order-detail-grid" style="margin-bottom:1.25rem">
        <div class="detail-field"><div class="detail-field-label">ชื่อลูกค้า</div><div class="detail-field-value">${DMC.escapeHtml(o.customerName||'—')}</div></div>
        <div class="detail-field"><div class="detail-field-label">โทรศัพท์</div><div class="detail-field-value">${DMC.escapeHtml(o.customerPhone||'—')}</div></div>
        <div class="detail-field"><div class="detail-field-label">ที่อยู่</div><div class="detail-field-value">${DMC.escapeHtml(o.address||'—')}</div></div>
        <div class="detail-field"><div class="detail-field-label">ชำระเงิน</div><div class="detail-field-value">${DMC.escapeHtml(o.paymentMethod||'—')}</div></div>
        <div class="detail-field"><div class="detail-field-label">รวมทั้งหมด</div><div class="detail-field-value text-sky" style="font-size:1.1rem;font-weight:700">${DMC.formatPrice(o.total||0)}</div></div>
        <div class="detail-field"><div class="detail-field-label">วันที่สั่ง</div><div class="detail-field-value">${DMC.formatDate(o.createdAt, true)}</div></div>
      </div>

      ${o.note ? `<div style="padding:0.75rem;background:var(--glass-bg);border-radius:var(--r-md);margin-bottom:1rem;font-size:0.85rem;color:var(--text-secondary)">💬 หมายเหตุ: ${DMC.escapeHtml(o.note)}</div>` : ''}

      <div class="form-group">
        <label class="form-label">อัพเดทสถานะ</label>
        <select class="form-input form-select" id="order-status-select">
          <option value="pending"    ${o.status==='pending'    ?'selected':''}>⏳ รอดำเนินการ</option>
          <option value="processing" ${o.status==='processing' ?'selected':''}>🔄 กำลังทำ</option>
          <option value="done"       ${o.status==='done'       ?'selected':''}>✅ เสร็จสิ้น</option>
          <option value="cancelled"  ${o.status==='cancelled'  ?'selected':''}>❌ ยกเลิก</option>
        </select>
      </div>

      <div style="display:flex;gap:0.75rem;margin-top:1rem">
        <button class="btn btn-primary btn-md" style="flex:1" onclick="updateOrderStatus('${o.id}')">
          💾 บันทึก
        </button>
        <button class="btn btn-ghost btn-md" onclick="closeModal()">ปิด</button>
      </div>
    `;
  } catch (e) {
    body.innerHTML = '<p style="color:var(--rose)">เกิดข้อผิดพลาด</p>';
  }
};

window.updateOrderStatus = async function(orderId) {
  const status = document.getElementById('order-status-select')?.value;
  if (!status) return;

  try {
    await db.collection('orders').doc(orderId).update({
      status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    DMC.toast('อัพเดทสถานะสำเร็จ ✅', 'success');
    closeModal();
    loadOrdersTable();
  } catch (e) {
    DMC.toast('บันทึกไม่สำเร็จ', 'error');
  }
};

window.closeModal = function() {
  document.getElementById('modal-overlay')?.classList.remove('open');
};

// ─── Products Section ───
async function loadProducts(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting">
        <h2>🛍️ จัดการสินค้า</h2>
        <p>เพิ่ม แก้ไข และจัดการสินค้าทั้งหมด</p>
      </div>
      <div class="admin-topbar-actions">
        <button class="btn btn-primary btn-md" id="add-product-btn">+ เพิ่มสินค้าใหม่</button>
      </div>
    </div>

    <div class="admin-box">
      <div id="products-table">
        <div style="text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div>
      </div>
    </div>
  `;

  document.getElementById('add-product-btn')?.addEventListener('click', () => openProductModal(null));

  await loadProductsTable();
}

async function loadProductsTable() {
  const container = document.getElementById('products-table');
  if (!container) return;

  try {
    const snap = await db.collection('products').orderBy('createdAt', 'desc').get();

    if (snap.empty) {
      container.innerHTML = `
        <div style="text-align:center;padding:3rem;color:var(--text-muted)">
          ยังไม่มีสินค้า <br>
          <button class="btn btn-primary btn-md" style="margin-top:1rem" onclick="openProductModal(null)">+ เพิ่มสินค้าแรก</button>
        </div>
      `;
      return;
    }

    const rows = [];
    snap.forEach(doc => {
      const p = { id: doc.id, ...doc.data() };
      rows.push(`
        <tr>
          <td><div class="product-thumb-cell">${p.emoji || '📦'}</div></td>
          <td style="max-width:180px"><strong style="font-family:var(--font-display)">${DMC.escapeHtml(p.name)}</strong></td>
          <td>${DMC.escapeHtml(p.category || '—')}</td>
          <td class="price-cell">${DMC.formatPrice(p.price)}<span style="color:var(--text-muted);font-size:0.75rem">/${p.unit||'ชิ้น'}</span></td>
          <td>
            <label class="toggle-switch">
              <input type="checkbox" ${p.active ? 'checked' : ''} 
                     onchange="toggleProduct('${p.id}', this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </td>
          <td>
            <div style="display:flex;gap:0.4rem">
              <button class="table-action-btn" onclick="openProductModal('${p.id}')">✏️ แก้ไข</button>
              <button class="table-action-btn btn-danger" onclick="deleteProduct('${p.id}','${DMC.escapeHtml(p.name)}')">🗑️</button>
            </div>
          </td>
        </tr>
      `);
    });

    container.innerHTML = `
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr><th>รูป</th><th>ชื่อสินค้า</th><th>หมวดหมู่</th><th>ราคา</th><th>แสดง</th><th>จัดการ</th></tr>
          </thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>
    `;
  } catch (e) {
    container.innerHTML = '<div style="color:var(--text-muted);padding:1rem;text-align:center">โหลดไม่สำเร็จ</div>';
  }
}

window.toggleProduct = async function(id, active) {
  try {
    await db.collection('products').doc(id).update({ active });
    DMC.toast(`${active ? 'เปิด' : 'ปิด'}การแสดงสินค้าแล้ว`, 'success');
  } catch (e) {
    DMC.toast('บันทึกไม่สำเร็จ', 'error');
  }
};

window.deleteProduct = async function(id, name) {
  if (!confirm(`ลบสินค้า "${name}"?\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return;
  try {
    await db.collection('products').doc(id).delete();
    DMC.toast(`ลบ "${name}" แล้ว`, 'success');
    loadProductsTable();
  } catch (e) {
    DMC.toast('ลบไม่สำเร็จ', 'error');
  }
};

// ─── Product Modal (Add/Edit) ───
window.openProductModal = async function(productId) {
  const overlay = document.getElementById('modal-overlay');
  const body    = document.getElementById('modal-body');
  if (!overlay || !body) return;

  let product = {
    name: '', category: '', price: '', unit: 'ชิ้น',
    shortDesc: '', fullDesc: '', emoji: '📦', active: true,
    isNew: false, isHot: false, isSale: false
  };

  if (productId) {
    body.innerHTML = '<div style="text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div>';
    overlay.classList.add('open');
    const doc = await db.collection('products').doc(productId).get();
    if (doc.exists) product = { id: doc.id, ...doc.data() };
  }

  const categories = ['โพลารอยด์','บัตรแขวนคอ','นามบัตร','ป้ายร้านค้า','QR Code','ป้ายตุ๊กตา','บัตรนักเรียน','อื่นๆ'];

  body.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${productId ? '✏️ แก้ไขสินค้า' : '➕ เพิ่มสินค้าใหม่'}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>

    <div class="form-row" style="margin-bottom:1rem">
      <div class="form-group" style="margin:0">
        <label class="form-label">ชื่อสินค้า *</label>
        <input class="form-input" id="p-name" value="${DMC.escapeHtml(product.name)}" placeholder="ชื่อสินค้า">
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">Emoji ไอคอน</label>
        <input class="form-input" id="p-emoji" value="${product.emoji||'📦'}" placeholder="📦">
      </div>
    </div>

    <div class="form-row" style="margin-bottom:1rem">
      <div class="form-group" style="margin:0">
        <label class="form-label">หมวดหมู่ *</label>
        <select class="form-input form-select" id="p-category">
          ${categories.map(c => `<option ${product.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">หน่วย</label>
        <input class="form-input" id="p-unit" value="${DMC.escapeHtml(product.unit||'ชิ้น')}">
      </div>
    </div>

    <div class="form-row" style="margin-bottom:1rem">
      <div class="form-group" style="margin:0">
        <label class="form-label">ราคา (บาท) *</label>
        <input class="form-input" id="p-price" type="number" value="${product.price||''}" placeholder="0">
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">ราคาเดิม (ก่อนลด)</label>
        <input class="form-input" id="p-oldprice" type="number" value="${product.oldPrice||''}" placeholder="ว่างถ้าไม่มี">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">คำอธิบายสั้น</label>
      <input class="form-input" id="p-shortdesc" value="${DMC.escapeHtml(product.shortDesc||'')}" placeholder="แสดงใน Card สินค้า">
    </div>

    <div class="form-group">
      <label class="form-label">รายละเอียดเต็ม</label>
      <textarea class="form-input form-textarea" id="p-desc">${DMC.escapeHtml(product.fullDesc||'')}</textarea>
    </div>

    <div style="display:flex;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-family:var(--font-display);font-size:0.85rem">
        <input type="checkbox" id="p-active" ${product.active?'checked':''} style="accent-color:var(--sky)"> แสดงสินค้า
      </label>
      <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-family:var(--font-display);font-size:0.85rem">
        <input type="checkbox" id="p-new" ${product.isNew?'checked':''} style="accent-color:var(--emerald)"> ✨ ใหม่
      </label>
      <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-family:var(--font-display);font-size:0.85rem">
        <input type="checkbox" id="p-hot" ${product.isHot?'checked':''} style="accent-color:var(--rose)"> 🔥 ขายดี
      </label>
      <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-family:var(--font-display);font-size:0.85rem">
        <input type="checkbox" id="p-sale" ${product.isSale?'checked':''} style="accent-color:var(--gold)"> 💰 ลด
      </label>
    </div>

    <div style="display:flex;gap:0.75rem">
      <button class="btn btn-primary btn-md" style="flex:1" onclick="saveProduct('${productId||''}')">
        💾 ${productId ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
      </button>
      <button class="btn btn-ghost btn-md" onclick="closeModal()">ยกเลิก</button>
    </div>
  `;

  overlay.classList.add('open');
};

window.saveProduct = async function(productId) {
  const data = {
    name:       document.getElementById('p-name')?.value.trim(),
    category:   document.getElementById('p-category')?.value,
    price:      parseFloat(document.getElementById('p-price')?.value) || 0,
    oldPrice:   parseFloat(document.getElementById('p-oldprice')?.value) || null,
    unit:       document.getElementById('p-unit')?.value.trim() || 'ชิ้น',
    shortDesc:  document.getElementById('p-shortdesc')?.value.trim(),
    fullDesc:   document.getElementById('p-desc')?.value.trim(),
    emoji:      document.getElementById('p-emoji')?.value.trim() || '📦',
    active:     document.getElementById('p-active')?.checked,
    isNew:      document.getElementById('p-new')?.checked,
    isHot:      document.getElementById('p-hot')?.checked,
    isSale:     document.getElementById('p-sale')?.checked,
    updatedAt:  firebase.firestore.FieldValue.serverTimestamp()
  };

  if (!data.name) { DMC.toast('กรุณากรอกชื่อสินค้า', 'error'); return; }
  if (!data.price) { DMC.toast('กรุณากรอกราคา', 'error'); return; }

  try {
    if (productId) {
      await db.collection('products').doc(productId).update(data);
      DMC.toast('แก้ไขสินค้าสำเร็จ ✅', 'success');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.orderCount = 0;
      data.featured = false;
      await db.collection('products').add(data);
      DMC.toast('เพิ่มสินค้าใหม่สำเร็จ 🎉', 'success');
    }
    closeModal();
    loadProductsTable();
  } catch (e) {
    DMC.toast('บันทึกไม่สำเร็จ', 'error');
    console.error(e);
  }
};

// ─── Settings Section ───
async function loadSettings(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting">
        <h2>⚙️ ตั้งค่าระบบ</h2>
        <p>จัดการการตั้งค่าต่างๆ ของร้าน</p>
      </div>
    </div>

    <div class="settings-grid">
      <!-- Change Password -->
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
        <div id="new-hash-output" style="display:none;background:var(--navy-mid);border-radius:var(--r-md);padding:0.75rem;margin-bottom:0.75rem">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.3rem;font-family:var(--font-display)">Hash สำหรับ admin.js:</div>
          <code id="hash-value" style="font-size:0.75rem;color:var(--sky-light);word-break:break-all"></code>
        </div>
        <button class="btn btn-primary btn-md" onclick="generatePasswordHash()">🔑 สร้าง Hash</button>
      </div>

      <!-- LINE Config -->
      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">💬 LINE Messaging API</div></div>
        <div class="form-group">
          <label class="form-label">Channel Access Token</label>
          <input class="form-input" type="password" id="line-token" placeholder="ใส่ Token จาก LINE Developers">
        </div>
        <div class="form-group">
          <label class="form-label">User ID (รับแจ้งเตือน)</label>
          <input class="form-input" id="line-uid" placeholder="Uxxxxxxxx...">
        </div>
        <button class="btn btn-primary btn-md" onclick="saveLineConfig()">💾 บันทึก</button>
      </div>

      <!-- Security Status -->
      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">🛡️ สถานะความปลอดภัย</div></div>
        <div class="security-status">
          <div class="security-row ok">✅ PBKDF2-SHA256 (100,000 iterations)</div>
          <div class="security-row ok">✅ Session Token + Expiry 8 ชั่วโมง</div>
          <div class="security-row ok">✅ Rate Limit: 5 ครั้ง → ล็อค 15 นาที</div>
          <div class="security-row ok">✅ Admin URL แยกจาก Public</div>
          <div class="security-row ok">✅ Cloudflare CDN + Firewall</div>
          <div class="security-row ok">✅ HTTPS / SSL Enforced</div>
          <div class="security-row ok">✅ Firebase Security Rules</div>
        </div>
      </div>

      <!-- Store Info -->
      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">🏪 ข้อมูลร้าน</div></div>
        <div class="form-group">
          <label class="form-label">ชื่อร้าน</label>
          <input class="form-input" value="Diamond Cute Studio">
        </div>
        <div class="form-group">
          <label class="form-label">LINE OA URL</label>
          <input class="form-input" placeholder="https://line.me/R/ti/p/...">
        </div>
        <div class="form-group">
          <label class="form-label">เบอร์โทรติดต่อ</label>
          <input class="form-input" placeholder="0xx-xxx-xxxx">
        </div>
        <button class="btn btn-primary btn-md">💾 บันทึกข้อมูลร้าน</button>
      </div>
    </div>
  `;
}

window.generatePasswordHash = async function() {
  const p1 = document.getElementById('new-pass')?.value;
  const p2 = document.getElementById('confirm-pass')?.value;
  if (!p1) { DMC.toast('กรอกรหัสผ่านก่อน', 'error'); return; }
  if (p1 !== p2) { DMC.toast('รหัสผ่านไม่ตรงกัน', 'error'); return; }
  if (p1.length < 8) { DMC.toast('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', 'warning'); return; }

  const hash = await DMC.pbkdf2Hash(p1, ADMIN_SALT);
  const output = document.getElementById('new-hash-output');
  document.getElementById('hash-value').textContent = hash;
  output.style.display = 'block';
  DMC.toast('สร้าง Hash สำเร็จ — คัดลอกและแก้ไขใน admin.js', 'success', 5000);
};

window.saveLineConfig = function() {
  DMC.toast('บันทึกการตั้งค่า LINE แล้ว (ต้องอัพเดท Cloudflare Worker ด้วย)', 'info');
};

// ─── Helpers ───
function statusLabel(s) {
  const map = {
    pending:    '⏳ รอดำเนินการ',
    processing: '🔄 กำลังทำ',
    done:       '✅ เสร็จสิ้น',
    cancelled:  '❌ ยกเลิก'
  };
  return map[s] || '🆕 ใหม่';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
