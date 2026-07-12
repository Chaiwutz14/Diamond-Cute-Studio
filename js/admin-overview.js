/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — admin-overview.js (V37)
   Dashboard Admin ฉบับเต็ม — 5 แท็บ ครอบคลุม 21 หัวข้อ

   แท็บ:  📊 ภาพรวม · 🔍 ค้นหา · 🛍️ สินค้า · 👥 ผู้เข้าชม · 🖥️ ระบบ

   แหล่งข้อมูล:
   • stats/{YYYY-MM-DD}   — สถิติรายวัน (เขียนโดย js/analytics.js ฝั่งลูกค้า)
   • productStats/{id}    — ยอดเข้าชม/คลิกต่อสินค้า
   • searchStats/{term}   — สถิติคำค้น (มีอยู่แล้วตั้งแต่ V36)
   • orders / products / reviews / ฯลฯ — ข้อมูลหลักเดิม

   หลักประหยัดโควต้า: โหลดครั้งเดียวต่อการเปิด dashboard แล้วแคชไว้ 5 นาที
   หมายเหตุ: ฟังก์ชัน loadKPIs() ถูกเรียกจาก admin-orders.js ด้วย — ห้ามเปลี่ยนชื่อ
═══════════════════════════════════════════════ */
'use strict';

const DASH_VERSION = 'V37';
const DASH_CACHE_MS = 5 * 60 * 1000;

// แคชข้อมูล dashboard (ต่อการเปิดหน้า admin 1 ครั้ง)
const _dash = {
  at: 0,
  products: null,       // สินค้าทั้งหมด [{id,...}]
  statsMap: null,       // { 'YYYY-MM-DD': {...} } 30 วันล่าสุด
  counts: null,         // จำนวน docs ต่อคอลเลกชัน
  dict: null,           // settings/search (synonyms/aliases)
  searchTop: null,      // คำค้นยอดนิยม
  searchZero: null,     // คำค้นไม่พบ
  pTopV: null,          // สินค้าเข้าชมมากสุด
  pTopC: null,          // สินค้าคลิกมากสุด
  recent: null,         // กิจกรรมล่าสุด (รวม orders/products/reviews)
  pings: null,          // ผล ping ระบบ
  ordersKpi: null,      // { active, done, revenue, todayCount }
  visRange: 7,          // ช่วงกราฟผู้เข้าชม (7/30)
};

// ══════════════════════════════════════════════
//  ENTRY — โครงหน้า + แท็บ
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

    <!-- ── 1. Overview counters ── -->
    <div class="kpi-grid" id="kpi-grid">
      ${typeof Loading !== 'undefined' ? Loading.Skeleton.adminKPIs() : ''}
    </div>
    <div class="dash-ov-grid" id="dash-ov-grid"></div>

    <!-- ── 13. Quick Actions ── -->
    <div class="dash-quick" id="dash-quick"></div>

    <!-- ── แท็บ ── -->
    <div class="dash-tabs" id="dash-tabs">
      <button class="dash-tab active" data-dtab="main">📊 ภาพรวม</button>
      <button class="dash-tab" data-dtab="search">🔍 ค้นหา</button>
      <button class="dash-tab" data-dtab="product">🛍️ สินค้า</button>
      <button class="dash-tab" data-dtab="visitor">👥 ผู้เข้าชม</button>
      <button class="dash-tab" data-dtab="system">🖥️ ระบบ</button>
    </div>
    <div id="dash-panel"><div class="dash-loading"><span class="spinner"></span> กำลังโหลดข้อมูล...</div></div>`;

  // ปุ่มบนสุด
  document.getElementById('goto-add-product')?.addEventListener('click', () => {
    loadSection('products'); setTimeout(() => openProductModal(null), 250);
  });
  document.getElementById('test-notify-btn')?.addEventListener('click', dashTestLine);

  // Quick actions
  dashRenderQuickActions();

  // แท็บ
  document.querySelectorAll('.dash-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dash-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dashRenderTab(btn.dataset.dtab);
    });
  });

  // โหลดข้อมูล: KPI ออเดอร์ (ของเดิม) + ข้อมูลหลัก dashboard พร้อมกัน
  loadKPIs();
  try { await dashEnsureCore(); } catch (e) {}
  dashRenderOvCounters();
  dashRenderTab('main');
}

async function dashTestLine(e) {
  const b = e.currentTarget;
  if (typeof Loading !== 'undefined') Loading.buttonLoad(b);
  const ok = await DMC.sendLineNotify({ orderId:'TEST', customerName:'ทดสอบ', customerPhone:'000', itemsSummary:'ทดสอบระบบแจ้งเตือน', total:0, paymentMethod:'test' });
  if (typeof Loading !== 'undefined') Loading.buttonDone(b);
  DMC.toast(ok ? '✅ ส่ง LINE สำเร็จ!' : '❌ ส่งไม่สำเร็จ ตรวจสอบ config', ok ? 'success' : 'error');
}

// ══════════════════════════════════════════════
//  ตัวช่วยทั่วไป
// ══════════════════════════════════════════════
function dashEsc(s) { return DMC.escapeHtml(String(s == null ? '' : s)); }
function dashNum(n) { return (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('th-TH'); }
function dashDayKey(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function dashStat(offset) { return (_dash.statsMap || {})[dashDayKey(offset)] || {}; }
function dashSumStats(days, field) {
  let sum = 0;
  for (let i = 0; i < days; i++) sum += Number(dashStat(-i)[field] || 0);
  return sum;
}
function dashFmtDur(sec) {
  if (!sec || sec <= 0) return '—';
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return m > 0 ? `${m} นาที ${s} วิ` : `${s} วิ`;
}
function dashAgo(ms) {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  if (diff < 60e3) return 'เมื่อสักครู่';
  if (diff < 3600e3) return Math.floor(diff / 60e3) + ' นาทีที่แล้ว';
  if (diff < 86400e3) return Math.floor(diff / 3600e3) + ' ชม.ที่แล้ว';
  return Math.floor(diff / 86400e3) + ' วันที่แล้ว';
}
// แถบสถิติแนวนอน (ใช้กับ device/browser/source)
function dashBars(rows) {
  const max = Math.max(...rows.map(r => r.val), 1);
  return rows.map(r => `
    <div class="dash-bar-row">
      <span class="dash-bar-label">${r.icon || ''} ${dashEsc(r.label)}</span>
      <span class="dash-bar-track"><span class="dash-bar-fill" style="width:${Math.max((r.val / max) * 100, 2)}%;${r.color ? 'background:' + r.color : ''}"></span></span>
      <span class="dash-bar-val">${dashNum(r.val)}</span>
    </div>`).join('');
}
// กราฟแท่งรายวัน (ใช้ CSS .chart-bar เดิม)
function dashDayChart(elBars, elLabels, days, field, fmt) {
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const val = Number(dashStat(-i)[field] || 0);
    let label;
    if (days <= 7) label = i === 0 ? 'วันนี้' : ['อา','จ','อ','พ','พฤ','ศ','ส'][d.getDay()];
    else label = (i === 0) ? 'วันนี้' : (i % 5 === 0 ? d.getDate() + '/' + (d.getMonth() + 1) : '');
    buckets.push({ val, label, today: i === 0 });
  }
  const max = Math.max(...buckets.map(b => b.val), 1);
  if (elBars) elBars.innerHTML = buckets.map(b =>
    `<div class="chart-bar ${b.today ? 'today' : ''}" style="height:${Math.max((b.val / max) * 100, 3)}%" data-val="${fmt ? fmt(b.val) : dashNum(b.val)}"></div>`).join('');
  if (elLabels) elLabels.innerHTML = buckets.map(b =>
    `<div class="chart-x-label ${b.today ? 'today' : ''}">${b.label}</div>`).join('');
}
// Levenshtein แบบย่อ — ใช้เดาคำพิมพ์ผิด
function dashLev(a, b) {
  a = String(a); b = String(b);
  if (Math.abs(a.length - b.length) > 2) return 99;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return dp[m][n];
}

// ══════════════════════════════════════════════
//  โหลดข้อมูลหลัก (แคช 5 นาที)
// ══════════════════════════════════════════════
async function dashEnsureCore() {
  if (_dash.products && Date.now() - _dash.at < DASH_CACHE_MS) return;

  const FP = firebase.firestore.FieldPath;

  // นับ docs แบบถูก (count aggregation) — ตัวไหนพังให้เป็น null (แสดง —)
  async function safeCount(col) {
    try { const s = await db.collection(col).count().get(); return s.data().count; }
    catch (e) {
      try { const s = await db.collection(col).get(); return s.size; } catch (e2) { return null; }
    }
  }

  const [pSnap, sSnap, dictDoc, cCat, cGal, cOrd, cRev, cCon, cTpl, cSea] = await Promise.all([
    db.collection('products').get(),
    db.collection('stats').orderBy(FP.documentId()).startAt(dashDayKey(-29)).endAt(dashDayKey(0)).get().catch(() => null),
    db.collection('settings').doc('search').get().catch(() => null),
    safeCount('categories'), safeCount('gallery'), safeCount('orders'),
    safeCount('reviews'), safeCount('contacts'), safeCount('templates'), safeCount('searchStats'),
  ]);

  _dash.products = [];
  pSnap.forEach(d => _dash.products.push({ id: d.id, ...d.data() }));

  _dash.statsMap = {};
  if (sSnap) sSnap.forEach(d => { _dash.statsMap[d.id] = d.data(); });

  _dash.dict = (dictDoc && dictDoc.exists) ? dictDoc.data() : {};
  _dash.counts = { categories: cCat, gallery: cGal, orders: cOrd, reviews: cRev, contacts: cCon, templates: cTpl, searchStats: cSea };
  _dash.at = Date.now();
}

// ── 1. Overview counters (แถวใต้ KPI ออเดอร์) ──
function dashRenderOvCounters() {
  const el = document.getElementById('dash-ov-grid');
  if (!el) return;
  const P = _dash.products || [];
  const imgCount = P.reduce((s, p) => s + (Array.isArray(p.images) ? p.images.length : (p.image ? 1 : 0)), 0)
    + (_dash.counts?.gallery || 0);
  const tagCount = P.reduce((s, p) => s + (p.isNew ? 1 : 0) + (p.isHot ? 1 : 0) + ((p.oldPrice && p.oldPrice > p.price) ? 1 : 0), 0);
  const t = dashStat(0);
  const monthPrefix = dashDayKey(0).slice(0, 7);
  let monthVisitors = 0;
  Object.keys(_dash.statsMap || {}).forEach(k => { if (k.startsWith(monthPrefix)) monthVisitors += Number(_dash.statsMap[k].ss || 0); });

  const items = [
    ['🛍️', 'สินค้าทั้งหมด', dashNum(P.length)],
    ['🗂️', 'หมวดหมู่', dashNum(_dash.counts?.categories)],
    ['🏷️', 'Tag สินค้า', dashNum(tagCount)],
    ['🖼️', 'รูปภาพ', dashNum(imgCount)],
    ['👤', 'สมาชิก', '<span class="dash-soon">รองรับอนาคต</span>'],
    ['👥', 'ผู้ชมวันนี้', dashNum(t.ss || 0)],
    ['📅', 'ผู้ชมเดือนนี้', dashNum(monthVisitors)],
    ['🔍', 'ค้นหาวันนี้', dashNum(t.sq || 0)],
    ['📦', 'ออเดอร์ทั้งหมด', dashNum(_dash.counts?.orders)],
  ];
  el.innerHTML = items.map(([ic, lb, v]) =>
    `<div class="dash-ov-card"><span class="dash-ov-ic">${ic}</span><span class="dash-ov-val">${v}</span><span class="dash-ov-lb">${lb}</span></div>`).join('');
}

// ── 13. Quick Actions ──
function dashRenderQuickActions() {
  const el = document.getElementById('dash-quick');
  if (!el) return;
  const acts = [
    ['➕', 'เพิ่มสินค้า', () => { loadSection('products'); setTimeout(() => openProductModal(null), 250); }],
    ['🗂️', 'เพิ่มหมวดหมู่', () => { loadSection('products'); setTimeout(() => openProductModal(null), 250); DMC.toast('เพิ่มหมวดหมู่ได้จาก dropdown "หมวดหมู่" ในฟอร์มสินค้า', 'info', 4000); }],
    ['🖼️', 'เพิ่มตัวอย่างงาน', () => loadSection('gallery')],
    ['📖', 'Search Dictionary', () => { loadSection('settings'); }],
    ['💾', 'Backup ข้อมูล', () => { loadSection('settings'); }],
    ['📝', 'แก้เนื้อหาเว็บ', () => loadSection('content')],
    ['🎟️', 'คูปอง', () => loadSection('coupons')],
  ];
  el.innerHTML = acts.map(([ic, lb], i) => `<button class="dash-quick-btn" data-qa="${i}"><span>${ic}</span>${lb}</button>`).join('');
  el.querySelectorAll('.dash-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => acts[+btn.dataset.qa][2]());
  });
}

// ══════════════════════════════════════════════
//  ROUTER แท็บ
// ══════════════════════════════════════════════
function dashRenderTab(name) {
  const panel = document.getElementById('dash-panel');
  if (!panel) return;
  const map = { main: dashTabMain, search: dashTabSearch, product: dashTabProduct, visitor: dashTabVisitor, system: dashTabSystem };
  (map[name] || dashTabMain)(panel);
}

// ══════════════════════════════════════════════
//  แท็บ 1 — ภาพรวม (ยอดขาย · ออเดอร์ · แจ้งเตือน · Health Score)
// ══════════════════════════════════════════════
async function dashTabMain(panel) {
  panel.innerHTML = `
    <div class="admin-grid">
      <div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">📈 ยอดขาย 7 วันล่าสุด</div></div>
          <div class="chart-area" id="sales-chart"></div>
          <div class="chart-x-labels" id="chart-labels"></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">👥 ผู้เข้าชม 7 วันล่าสุด</div></div>
          <div class="chart-area" id="dash-vis7-chart"></div>
          <div class="chart-x-labels" id="dash-vis7-labels"></div>
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
          <div class="admin-box-header"><div class="admin-box-title">💯 Health Score</div></div>
          <div id="dash-health"><div class="dash-loading-sm">กำลังคำนวณ...</div></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🔔 การแจ้งเตือน</div></div>
          <div id="dash-notif"><div class="dash-loading-sm">กำลังตรวจสอบ...</div></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">⭐ รีวิวรออนุมัติ</div></div>
          <div id="pending-reviews-mini"><div class="dash-loading-sm">กำลังโหลด...</div></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🔐 ความปลอดภัย</div></div>
          <div class="security-status">${securityRows()}</div>
        </div>
      </div>
    </div>`;

  document.getElementById('goto-orders')?.addEventListener('click', () => loadSection('orders'));
  dashDayChart(document.getElementById('dash-vis7-chart'), document.getElementById('dash-vis7-labels'), 7, 'ss', v => dashNum(v) + ' คน');
  await Promise.all([loadRecentOrdersTable(), loadPendingReviewsMini(), renderSalesChart()]);
  dashRenderNotifications();
  dashRenderHealth();
}

// ── 11. Notifications (คำนวณจากข้อมูลจริง) ──
function dashRenderNotifications() {
  const el = document.getElementById('dash-notif');
  if (!el) return;
  const list = [];
  const t = dashStat(0);
  const cfg = window.DMC_CONFIG || {};

  const active = _dash.ordersKpi?.active || 0;
  if (active > 0) list.push(['🟡', `มี ${active} ออเดอร์กำลังดำเนินการ`, 'orders']);

  // Backup
  const lastBk = Number(localStorage.getItem('dcs_last_backup') || 0);
  if (!lastBk) list.push(['🔴', 'ยังไม่เคย Backup ข้อมูล (Export JSON) — แนะนำทำทันที', 'settings']);
  else if (Date.now() - lastBk > 7 * 86400e3) list.push(['🟠', `Backup ล่าสุด ${dashAgo(lastBk)} — เกิน 7 วันแล้ว`, 'settings']);

  // Errors
  if ((t.err || 0) > 10) list.push(['🔴', `พบ JavaScript Error วันนี้ ${t.err} ครั้ง — ควรตรวจสอบ`, null]);
  else if ((t.err || 0) > 0) list.push(['🟡', `พบ JavaScript Error วันนี้ ${t.err} ครั้ง`, null]);
  if ((t.e404 || 0) > 5) list.push(['🟠', `มีคนเข้าหน้า 404 วันนี้ ${t.e404} ครั้ง — อาจมีลิงก์เสีย`, null]);

  // Security
  if (!(cfg.ADMIN_EMAIL || '').trim()) list.push(['🔴', 'ยังไม่ตั้ง ADMIN_EMAIL — ระบบยืนยันตัวตนไม่สมบูรณ์', null]);
  if (!(cfg.APP_CHECK_SITE_KEY || '').trim()) list.push(['🟠', 'ยังไม่เปิด App Check', null]);

  // Checklist สินค้า
  const issues = dashChecklist().reduce((s, c) => s + c.items.length, 0);
  if (issues > 0) list.push(['🟡', `Checklist สินค้า: มี ${issues} รายการควรปรับปรุง`, '#dtab-product']);

  // คำค้นไม่พบ (ใช้ข้อมูลถ้าโหลดแล้ว)
  if (_dash.searchZero && _dash.searchZero.length > 0) list.push(['🟡', `มีคำค้นที่ไม่พบสินค้า ${_dash.searchZero.length} คำ — ดูแท็บค้นหา`, '#dtab-search']);

  if (!list.length) list.push(['🟢', 'ทุกอย่างเรียบร้อยดี ไม่มีการแจ้งเตือน 🎉', null]);

  el.innerHTML = list.map(([ic, msg, target]) =>
    `<div class="dash-notif-row" ${target ? `data-target="${target}"` : ''}><span>${ic}</span><span>${dashEsc(msg)}</span></div>`).join('');
  el.querySelectorAll('.dash-notif-row[data-target]').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      const tg = row.dataset.target;
      if (tg.startsWith('#dtab-')) document.querySelector(`.dash-tab[data-dtab="${tg.slice(6)}"]`)?.click();
      else loadSection(tg);
    });
  });
}

// ── 21. Health Score ──
function dashRenderHealth() {
  const el = document.getElementById('dash-health');
  if (!el) return;
  const cfg = window.DMC_CONFIG || {};
  const t = dashStat(0);
  const parts = [];

  // Security (25)
  let sec = 5; // rules deploy แล้ว (ตรวจอัตโนมัติไม่ได้ ให้คะแนนฐาน)
  if ((cfg.ADMIN_EMAIL || '').trim()) sec += 10;
  if ((cfg.APP_CHECK_SITE_KEY || '').trim()) sec += 10;
  parts.push(['Authentication + Security', sec, 25]);

  // Backup (15)
  const lastBk = Number(localStorage.getItem('dcs_last_backup') || 0);
  let bk = 0;
  if (lastBk) { const d = (Date.now() - lastBk) / 86400e3; bk = d <= 7 ? 15 : d <= 30 ? 8 : 3; }
  parts.push(['Backup', bk, 15]);

  // Errors (15)
  const errT = t.err || 0;
  parts.push(['Error วันนี้', errT === 0 ? 15 : errT <= 5 ? 10 : errT <= 20 ? 5 : 0, 15]);

  // Checklist (15)
  const issues = dashChecklist().reduce((s, c) => s + c.items.length, 0);
  parts.push(['ความสมบูรณ์ข้อมูลสินค้า', Math.max(0, 15 - Math.min(issues, 15)), 15]);

  // Database/API (20) — ยึดจากการโหลดข้อมูลสำเร็จ + ping (ถ้ามี)
  let sys = _dash.products ? 12 : 0;
  if (_dash.pings) {
    if (_dash.pings.fsOk) sys = 12;
    if (_dash.pings.workerOk) sys += 4;
    if (_dash.pings.cdnOk) sys += 4;
  } else sys += 4; // ยังไม่ ping → ให้คะแนนกลาง
  parts.push(['Database / API / CDN', Math.min(sys, 20), 20]);

  // Search engine (10)
  const zeroN = _dash.searchZero ? _dash.searchZero.length : 0;
  parts.push(['Search Engine', _dash.dict ? (zeroN === 0 ? 10 : zeroN <= 5 ? 7 : 4) : 5, 10]);

  const score = Math.round(parts.reduce((s, p) => s + p[1], 0));
  const grade = score >= 90 ? ['A', 'var(--emerald)'] : score >= 75 ? ['B', 'var(--accent)'] : score >= 60 ? ['C', 'var(--gold)'] : ['D', 'var(--rose)'];

  el.innerHTML = `
    <div class="dash-health-wrap">
      <div class="dash-health-ring" style="background:conic-gradient(${grade[1]} ${score * 3.6}deg, var(--bg-mid) 0deg)">
        <div class="dash-health-inner"><span class="dash-health-score">${score}</span><span class="dash-health-grade" style="color:${grade[1]}">เกรด ${grade[0]}</span></div>
      </div>
      <div class="dash-health-rows">
        ${parts.map(([lb, v, mx]) => `<div class="dash-health-row"><span>${lb}</span><span>${v}/${mx}</span></div>`).join('')}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════
//  แท็บ 2 — 🔍 Search Analytics
// ══════════════════════════════════════════════
async function dashEnsureSearch() {
  if (_dash.searchTop) return;
  try {
    const [topSnap, zeroSnap] = await Promise.all([
      db.collection('searchStats').orderBy('count', 'desc').limit(10).get(),
      db.collection('searchStats').where('zero', '==', true).limit(50).get(),
    ]);
    _dash.searchTop = []; topSnap.forEach(d => { const x = d.data(); if (x && x.term) _dash.searchTop.push(x); });
    _dash.searchZero = []; zeroSnap.forEach(d => { const x = d.data(); if (x && x.term) _dash.searchZero.push(x); });
    _dash.searchZero.sort((a, b) => (b.count || 0) - (a.count || 0));
  } catch (e) { _dash.searchTop = []; _dash.searchZero = []; }
}

async function dashTabSearch(panel) {
  panel.innerHTML = `<div class="dash-loading"><span class="spinner"></span> กำลังโหลดสถิติค้นหา...</div>`;
  await Promise.all([dashEnsureSearch(), dashEnsureProdStats()]);

  const top = _dash.searchTop, zeros = _dash.searchZero;
  const totSearch = top.reduce((s, x) => s + (x.count || 0), 0);
  const totClicks = top.reduce((s, x) => s + (x.clicks || 0), 0);
  const ctr = totSearch ? Math.round((totClicks / totSearch) * 100) : 0;

  // เดาคำพิมพ์ผิด: คำค้นไม่พบ ที่ "ใกล้เคียง" ชื่อสินค้า (ระยะแก้ไข ≤ 2)
  const names = (_dash.products || []).map(p => String(p.name || '').toLowerCase());
  const typos = zeros.map(z => {
    const term = String(z.term || '').toLowerCase();
    let best = null, bestD = 99;
    names.forEach(n => {
      n.split(/\s+/).concat([n]).forEach(w => {
        if (w.length < 3) return;
        const d = dashLev(term, w);
        if (d < bestD) { bestD = d; best = w; }
      });
    });
    return (bestD > 0 && bestD <= 2) ? { ...z, near: best } : null;
  }).filter(Boolean);

  // สินค้าที่ถูกค้นหา(คลิกจากผลค้น)มากที่สุด — ใช้ยอดคลิกสินค้าเป็นตัวแทน
  const topClicked = (_dash.pTopC || []).slice(0, 5);

  panel.innerHTML = `
    <div class="dash-mini-grid">
      <div class="dash-mini"><span class="dash-mini-val">${dashNum(dashStat(0).sq || 0)}</span><span class="dash-mini-lb">ค้นหาวันนี้</span></div>
      <div class="dash-mini"><span class="dash-mini-val">${dashNum(dashSumStats(7, 'sq'))}</span><span class="dash-mini-lb">ค้นหา 7 วัน</span></div>
      <div class="dash-mini"><span class="dash-mini-val">${ctr}%</span><span class="dash-mini-lb">CTR หลังค้นหา (Top 10)</span></div>
      <div class="dash-mini"><span class="dash-mini-val">${dashNum(_dash.counts?.searchStats)}</span><span class="dash-mini-lb">คำค้นสะสม</span></div>
    </div>
    <div class="admin-grid">
      <div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">📊 จำนวนการค้นหาต่อวัน (7 วัน)</div></div>
          <div class="chart-area" id="dash-sq-chart"></div>
          <div class="chart-x-labels" id="dash-sq-labels"></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🔥 คำค้นยอดนิยม</div></div>
          ${top.length ? top.map(x => {
            const c = x.count ? Math.round(((x.clicks || 0) / x.count) * 100) : 0;
            return `<div class="dash-term-row"><span class="dash-term">${dashEsc(x.term)}</span>
              <span class="dash-term-meta">ค้น ${dashNum(x.count)} · คลิก ${dashNum(x.clicks || 0)} · CTR ${c}%</span></div>`;
          }).join('') : '<div class="dash-empty">ยังไม่มีข้อมูลการค้นหา</div>'}
        </div>
      </div>
      <div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">⚠️ ค้นแล้วไม่พบ</div></div>
          ${zeros.length ? `<div class="dash-chip-wrap">${zeros.slice(0, 20).map(x =>
            `<span class="dash-chip warn">${dashEsc(x.term)} <b>×${dashNum(x.count || 0)}</b></span>`).join('')}</div>
            <div class="dash-hint">แนะนำ: เพิ่มสินค้า หรือเพิ่มคำพ้องใน Search Dictionary (ตั้งค่า)</div>`
          : '<div class="dash-empty">ไม่มี — เยี่ยมมาก! 🎉</div>'}
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">✏️ คำที่น่าจะพิมพ์ผิด</div></div>
          ${typos.length ? typos.slice(0, 10).map(x =>
            `<div class="dash-term-row"><span class="dash-term">${dashEsc(x.term)}</span>
             <span class="dash-term-meta">ใกล้เคียง "${dashEsc(x.near)}" ×${dashNum(x.count || 0)}</span></div>`).join('')
          : '<div class="dash-empty">ไม่พบคำที่เข้าข่ายพิมพ์ผิด</div>'}
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🏆 สินค้าที่ถูกค้นหา/คลิกมากที่สุด</div></div>
          ${topClicked.length ? topClicked.map(p =>
            `<div class="dash-term-row"><span class="dash-term">${dashEsc(p.name)}</span>
             <span class="dash-term-meta">คลิก ${dashNum(p.c || 0)}</span></div>`).join('')
          : '<div class="dash-empty">ยังไม่มีข้อมูล (สถิติเริ่มเก็บหลังอัปเดตนี้)</div>'}
        </div>
      </div>
    </div>`;

  dashDayChart(document.getElementById('dash-sq-chart'), document.getElementById('dash-sq-labels'), 7, 'sq');
}

// ══════════════════════════════════════════════
//  แท็บ 3 — 🛍️ Product Analytics + Checklist
// ══════════════════════════════════════════════
async function dashEnsureProdStats() {
  if (_dash.pTopV) return;
  const nameOf = id => (_dash.products || []).find(p => p.id === id)?.name || id;
  try {
    const [vSnap, cSnap] = await Promise.all([
      db.collection('productStats').orderBy('v', 'desc').limit(10).get(),
      db.collection('productStats').orderBy('c', 'desc').limit(10).get(),
    ]);
    _dash.pTopV = []; vSnap.forEach(d => _dash.pTopV.push({ id: d.id, name: nameOf(d.id), ...d.data() }));
    _dash.pTopC = []; cSnap.forEach(d => _dash.pTopC.push({ id: d.id, name: nameOf(d.id), ...d.data() }));
    _dash.pTopV = _dash.pTopV.filter(x => (x.v || 0) > 0);
    _dash.pTopC = _dash.pTopC.filter(x => (x.c || 0) > 0);
  } catch (e) { _dash.pTopV = []; _dash.pTopC = []; }
}

// ── 19. Checklist — สินค้าที่ข้อมูลไม่ครบ ──
function dashChecklist() {
  const P = _dash.products || [];
  const noImg   = P.filter(p => !(Array.isArray(p.images) && p.images.length) && !p.image);
  const noPrice = P.filter(p => !(Number(p.price) > 0));
  const noTag   = P.filter(p => !p.isNew && !p.isHot && !(p.oldPrice > p.price));
  const noDesc  = P.filter(p => !(p.shortDesc || '').trim());
  const noDetail= P.filter(p => !(p.desc || p.description || p.detail || '').trim());
  const stale   = P.filter(p => {
    const ms = p.updatedAt?.toDate ? p.updatedAt.toDate().getTime() : 0;
    return ms > 0 && (Date.now() - ms) > 90 * 86400e3;
  });
  return [
    { icon: '🖼️', label: 'สินค้าไม่มีรูป',            items: noImg },
    { icon: '💰', label: 'สินค้าไม่มีราคา',           items: noPrice },
    { icon: '🏷️', label: 'สินค้าไม่มี Tag (ใหม่/ขายดี/ลด)', items: noTag },
    { icon: '📝', label: 'สินค้าไม่มีคำอธิบายย่อ',     items: noDesc },
    { icon: '📄', label: 'สินค้าไม่มีรายละเอียด',      items: noDetail },
    { icon: '⏰', label: 'ไม่ได้อัปเดตเกิน 90 วัน',     items: stale },
  ];
}

async function dashTabProduct(panel) {
  panel.innerHTML = `<div class="dash-loading"><span class="spinner"></span> กำลังโหลดสถิติสินค้า...</div>`;
  await dashEnsureProdStats();

  const P = (_dash.products || []).slice();
  const newest = P.filter(p => p.createdAt?.toDate).sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate()).slice(0, 5);
  const checklist = dashChecklist();
  const listRows = (arr, valFn) => arr.length
    ? arr.map(x => `<div class="dash-term-row"><span class="dash-term">${dashEsc(x.name)}</span><span class="dash-term-meta">${valFn(x)}</span></div>`).join('')
    : '<div class="dash-empty">ยังไม่มีข้อมูล (สถิติเริ่มเก็บหลังอัปเดตนี้)</div>';

  panel.innerHTML = `
    <div class="admin-grid">
      <div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">👁️ สินค้าที่เข้าชมมากที่สุด</div></div>
          ${listRows(_dash.pTopV.slice(0, 8), x => 'เข้าชม ' + dashNum(x.v || 0))}
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">👆 สินค้าที่ถูกคลิกมากที่สุด</div></div>
          ${listRows(_dash.pTopC.slice(0, 8), x => 'คลิก ' + dashNum(x.c || 0))}
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">💰 สินค้าขายดีที่สุด</div></div>
          <div class="dash-empty"><span class="dash-soon">รองรับอนาคต</span> — จะสรุปจากรายการในออเดอร์เมื่อเปิดระบบวิเคราะห์ยอดขาย</div>
        </div>
      </div>
      <div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">✨ สินค้าใหม่ล่าสุด</div></div>
          ${newest.length ? newest.map(p =>
            `<div class="dash-term-row"><span class="dash-term">${dashEsc(p.name)}</span><span class="dash-term-meta">${dashAgo(p.createdAt.toDate().getTime())}</span></div>`).join('')
          : '<div class="dash-empty">—</div>'}
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">✅ Checklist สินค้า</div>
            <span class="admin-box-action" id="dash-goto-products">จัดการสินค้า →</span></div>
          ${checklist.map((c, i) => `
            <div class="dash-check-row ${c.items.length ? 'has' : ''}" data-ck="${i}">
              <span>${c.icon} ${c.label}</span>
              <span class="dash-check-count ${c.items.length ? 'warn' : 'ok'}">${c.items.length ? c.items.length + ' รายการ ▾' : '✓'}</span>
            </div>
            <div class="dash-check-detail" id="dash-ck-${i}" style="display:none">
              ${c.items.slice(0, 15).map(p => dashEsc(p.name || p.id)).join(' · ') || '—'}
              ${c.items.length > 15 ? ` …และอีก ${c.items.length - 15} รายการ` : ''}
            </div>`).join('')}
        </div>
      </div>
    </div>`;

  document.getElementById('dash-goto-products')?.addEventListener('click', () => loadSection('products'));
  panel.querySelectorAll('.dash-check-row.has').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      const d = document.getElementById('dash-ck-' + row.dataset.ck);
      if (d) d.style.display = d.style.display === 'none' ? '' : 'none';
    });
  });
}

// ══════════════════════════════════════════════
//  แท็บ 4 — 👥 Visitor / Device / Browser / Sources
// ══════════════════════════════════════════════
async function dashTabVisitor(panel) {
  const t = dashStat(0), y = dashStat(-1);
  const days = _dash.visRange;
  const sum = f => dashSumStats(30, f);

  const monthPrefix = dashDayKey(0).slice(0, 7);
  let mSS = 0, mPV = 0;
  Object.keys(_dash.statsMap || {}).forEach(k => {
    if (k.startsWith(monthPrefix)) { mSS += Number(_dash.statsMap[k].ss || 0); mPV += Number(_dash.statsMap[k].pv || 0); }
  });

  const ss30 = sum('ss'), eng30 = sum('eng'), dur30 = sum('dur');
  const bounce = ss30 ? Math.round(((ss30 - eng30) / ss30) * 100) : null;
  const avgDur = ss30 ? dur30 / ss30 : 0;

  const device = [
    { icon: '🤖', label: 'Android', val: sum('dAnd') }, { icon: '🍎', label: 'iPhone', val: sum('dIos') },
    { icon: '🪟', label: 'Windows', val: sum('dWin') }, { icon: '💻', label: 'macOS', val: sum('dMac') },
    { icon: '📱', label: 'Tablet',  val: sum('dTab') }, { icon: '❓', label: 'อื่นๆ',   val: sum('dOth') },
  ];
  const browser = [
    { icon: '🟢', label: 'Chrome',  val: sum('bChr') }, { icon: '🧭', label: 'Safari', val: sum('bSaf') },
    { icon: '🔷', label: 'Edge',    val: sum('bEdg') }, { icon: '🦊', label: 'Firefox', val: sum('bFox') },
    { icon: '🌀', label: 'Samsung Internet', val: sum('bSam') }, { icon: '❓', label: 'อื่นๆ', val: sum('bOth') },
  ];
  const sources = [
    { icon: '🔎', label: 'Google',  val: sum('sGoo'), color: 'var(--accent)' },
    { icon: '📘', label: 'Facebook', val: sum('sFb'),  color: '#1877f2' },
    { icon: '💚', label: 'LINE',    val: sum('sLine'), color: '#06c755' },
    { icon: '🎵', label: 'TikTok',  val: sum('sTt') },
    { icon: '🔗', label: 'Direct',  val: sum('sDir'), color: 'var(--gold)' },
    { icon: '🌐', label: 'Referral', val: sum('sRef') },
  ];

  panel.innerHTML = `
    <div class="dash-mini-grid">
      <div class="dash-mini"><span class="dash-mini-val">${dashNum(t.ss || 0)}</span><span class="dash-mini-lb">ผู้เข้าชมวันนี้</span></div>
      <div class="dash-mini"><span class="dash-mini-val">${dashNum(y.ss || 0)}</span><span class="dash-mini-lb">เมื่อวาน</span></div>
      <div class="dash-mini"><span class="dash-mini-val">${dashNum(mSS)}</span><span class="dash-mini-lb">เดือนนี้</span></div>
      <div class="dash-mini"><span class="dash-mini-val">${dashNum(mPV)}</span><span class="dash-mini-lb">Page Views เดือนนี้</span></div>
      <div class="dash-mini"><span class="dash-mini-val">${dashNum(ss30)}</span><span class="dash-mini-lb">Sessions 30 วัน</span></div>
      <div class="dash-mini"><span class="dash-mini-val">${bounce == null ? '—' : bounce + '%'}</span><span class="dash-mini-lb">Bounce Rate (30 วัน)</span></div>
      <div class="dash-mini"><span class="dash-mini-val">${dashFmtDur(avgDur)}</span><span class="dash-mini-lb">เวลาเฉลี่ย/คน (ประมาณ)</span></div>
    </div>

    <div class="admin-grid">
      <div>
        <div class="admin-box">
          <div class="admin-box-header">
            <div class="admin-box-title">📈 กราฟผู้เข้าชม</div>
            <span>
              <button class="dash-range-btn ${days === 7 ? 'active' : ''}" data-range="7">7 วัน</button>
              <button class="dash-range-btn ${days === 30 ? 'active' : ''}" data-range="30">30 วัน</button>
            </span>
          </div>
          <div class="chart-area" id="dash-vis-chart"></div>
          <div class="chart-x-labels" id="dash-vis-labels"></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">👆 กราฟยอดคลิกสินค้า (7 วัน)</div></div>
          <div class="chart-area" id="dash-pc-chart"></div>
          <div class="chart-x-labels" id="dash-pc-labels"></div>
        </div>
      </div>
      <div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">📱 อุปกรณ์ (30 วัน)</div></div>
          ${dashBars(device)}
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🌐 เบราว์เซอร์ (30 วัน)</div></div>
          ${dashBars(browser)}
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🚦 Traffic Sources (30 วัน)</div></div>
          ${dashBars(sources)}
        </div>
      </div>
    </div>
    <div class="dash-hint" style="margin-top:.5rem">ℹ️ สถิติเริ่มเก็บตั้งแต่อัปเดต V37 เป็นต้นไป (ไม่เก็บข้อมูลส่วนตัว/IP ของผู้เข้าชม)</div>`;

  dashDayChart(document.getElementById('dash-vis-chart'), document.getElementById('dash-vis-labels'), days, 'ss', v => dashNum(v) + ' คน');
  dashDayChart(document.getElementById('dash-pc-chart'), document.getElementById('dash-pc-labels'), 7, 'pc');
  panel.querySelectorAll('.dash-range-btn').forEach(b => b.addEventListener('click', () => {
    _dash.visRange = +b.dataset.range; dashTabVisitor(panel);
  }));
}

// ══════════════════════════════════════════════
//  แท็บ 5 — 🖥️ ระบบ (Status · Performance · Storage · Error ·
//            Security · Backup · Activity · Banner/Affiliate)
// ══════════════════════════════════════════════
async function dashTabSystem(panel) {
  panel.innerHTML = `
    <div class="admin-grid">
      <div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🖥️ System Status</div>
            <span class="admin-box-action" id="dash-reping">🔄 ตรวจใหม่</span></div>
          <div id="dash-sysstatus"><div class="dash-loading-sm">กำลังตรวจสอบระบบ...</div></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">⚡ Performance</div></div>
          <div id="dash-perf"><div class="dash-loading-sm">กำลังวัดผล...</div></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🐞 Error Monitor (7 วัน)</div></div>
          <div class="chart-area" id="dash-err-chart"></div>
          <div class="chart-x-labels" id="dash-err-labels"></div>
          <div id="dash-err-sum" class="dash-hint"></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🕘 Recent Activity</div></div>
          <div id="dash-activity"><div class="dash-loading-sm">กำลังโหลด...</div></div>
        </div>
      </div>
      <div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">💽 Storage (ประมาณการ)</div></div>
          <div id="dash-storage"><div class="dash-loading-sm">กำลังคำนวณ...</div></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🔐 Security</div></div>
          <div id="dash-security"></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">💾 Backup</div>
            <span class="admin-box-action" id="dash-goto-backup">ไปหน้า Backup →</span></div>
          <div id="dash-backup"></div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🖼️ Banner Analytics</div></div>
          <div class="dash-empty"><span class="dash-soon">รองรับอนาคต</span> — ปัจจุบัน Hero หน้าแรกเป็นเนื้อหา CMS (ยังไม่มีระบบแบนเนอร์หมุน) เมื่อเปิดใช้จะแสดง Impression / Click / CTR ที่นี่</div>
        </div>
        <div class="admin-box">
          <div class="admin-box-header"><div class="admin-box-title">🤝 Affiliate Analytics</div></div>
          <div class="dash-empty"><span class="dash-soon">รองรับอนาคต</span> — จำนวนคลิก · CTR · รายได้ · ลิงก์ยอดนิยม</div>
        </div>
      </div>
    </div>`;

  document.getElementById('dash-goto-backup')?.addEventListener('click', () => loadSection('settings'));
  document.getElementById('dash-reping')?.addEventListener('click', () => { _dash.pings = null; dashRenderSystemStatus(); });

  // Error chart
  dashDayChart(document.getElementById('dash-err-chart'), document.getElementById('dash-err-labels'), 7, 'err');
  const errEl = document.getElementById('dash-err-sum');
  if (errEl) {
    const t = dashStat(0);
    errEl.innerHTML = `วันนี้: JS Error ${dashNum(t.err || 0)} ครั้ง · หน้า 404 ${dashNum(t.e404 || 0)} ครั้ง · 7 วัน: Error รวม ${dashNum(dashSumStats(7, 'err'))} ครั้ง<br>
      <span style="color:var(--text-3)">ℹ️ นับ JavaScript Error ฝั่งผู้ใช้อัตโนมัติ · API/Database error ดูเพิ่มได้ใน Firebase Console</span>`;
  }

  dashRenderSecurity();
  dashRenderBackup();
  dashRenderStorage();
  dashRenderSystemStatus();
  dashRenderActivity();
}

// ── 16. System Status (ping จริง) ──
async function dashRenderSystemStatus() {
  const el = document.getElementById('dash-sysstatus');
  if (!el) return;
  el.innerHTML = '<div class="dash-loading-sm">กำลังตรวจสอบระบบ...</div>';

  if (!_dash.pings) {
    const pings = { fsOk: false, fsMs: null, workerOk: null, workerMs: null, cdnOk: null, authOk: false };
    // Firestore / Database
    try {
      const t0 = performance.now();
      await db.collection('settings').doc('search').get();
      pings.fsMs = Math.round(performance.now() - t0);
      pings.fsOk = true;
    } catch (e) {}
    // Auth
    try { pings.authOk = !!(firebase.auth && firebase.auth().currentUser); } catch (e) {}
    // Cloudflare Worker (no-cors: ตอบกลับได้ = เข้าถึงได้)
    const workerUrl = (window.DMC_CONFIG || {}).CF_WORKER_URL || '';
    if (workerUrl) {
      try {
        const t0 = performance.now();
        await Promise.race([
          fetch(workerUrl, { mode: 'no-cors', cache: 'no-store' }),
          new Promise((_, rej) => setTimeout(rej, 6000)),
        ]);
        pings.workerMs = Math.round(performance.now() - t0);
        pings.workerOk = true;
      } catch (e) { pings.workerOk = false; }
    }
    // CDN (ImgBB) — ทดสอบโหลดรูปแรกที่เจอจากสินค้า
    const imgUrl = (() => {
      for (const p of (_dash.products || [])) {
        const arr = Array.isArray(p.images) ? p.images : [];
        for (const im of arr) {
          const u = typeof im === 'string' ? im : (im && im.url);
          if (u && /i\.ibb\.co/.test(u)) return u;
        }
        if (typeof p.image === 'string' && /i\.ibb\.co/.test(p.image)) return p.image;
      }
      return null;
    })();
    if (imgUrl) {
      pings.cdnOk = await new Promise(res => {
        const im = new Image();
        const timer = setTimeout(() => res(false), 6000);
        im.onload = () => { clearTimeout(timer); res(true); };
        im.onerror = () => { clearTimeout(timer); res(false); };
        im.src = imgUrl + (imgUrl.includes('?') ? '&' : '?') + '_dcs=' + Date.now();
      });
    }
    _dash.pings = pings;
    dashRenderHealth(); // อัปเดตคะแนนหลัง ping (ถ้าอยู่แท็บภาพรวมค่อยเห็น)
  }

  const p = _dash.pings;
  const dot = ok => ok === null ? '<span class="dash-dot na"></span>' : ok ? '<span class="dash-dot ok"></span>' : '<span class="dash-dot bad"></span>';
  const label = (ok, extra) => ok === null ? 'ไม่ได้ตั้งค่า / ตรวจไม่ได้' : ok ? ('ปกติ' + (extra ? ` · ${extra}` : '')) : 'มีปัญหา — ตรวจสอบ';
  const rows = [
    ['🗄️ Database (Firestore)', p.fsOk, p.fsMs != null ? p.fsMs + ' ms' : ''],
    ['🔍 Search Engine', _dash.dict != null, 'Dictionary พร้อมใช้'],
    ['🔑 Authentication', p.authOk, 'ล็อกอินอยู่'],
    ['🖼️ CDN รูปภาพ (ImgBB)', p.cdnOk, ''],
    ['☁️ Cloudflare Worker', p.workerOk, p.workerMs != null ? p.workerMs + ' ms' : ''],
    ['📄 GitHub Pages', true, 'หน้านี้โหลดจากโฮสต์สำเร็จ'],
    ['🔌 API Status', p.fsOk && (p.workerOk !== false), ''],
  ];
  el.innerHTML = rows.map(([lb, ok, extra]) =>
    `<div class="dash-sys-row">${dot(ok)}<span class="dash-sys-name">${lb}</span><span class="dash-sys-val">${label(ok, extra)}</span></div>`).join('');

  // Performance box (ใช้ค่า ping ที่วัดได้)
  const perfEl = document.getElementById('dash-perf');
  if (perfEl) {
    let pageMs = null;
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav && nav.loadEventEnd > 0) pageMs = Math.round(nav.loadEventEnd);
    } catch (e) {}
    const t = dashStat(0);
    const errRate = (t.pv || 0) > 0 ? ((t.err || 0) / t.pv * 100).toFixed(1) + '%' : '—';
    let cacheInfo = '—';
    try {
      if (window.caches) {
        const keys = await caches.keys();
        const name = keys.find(k => k.startsWith('dcs-cache-'));
        if (name) { const c = await caches.open(name); cacheInfo = (await c.keys()).length + ' ไฟล์ใน cache'; }
      }
    } catch (e) {}
    perfEl.innerHTML = [
      ['⚡ API Response Time', p.workerMs != null ? p.workerMs + ' ms' : '—'],
      ['🗄️ Database Response Time', p.fsMs != null ? p.fsMs + ' ms' : '—'],
      ['📦 Cache (Service Worker)', cacheInfo],
      ['🚀 Page Load (หน้านี้)', pageMs != null ? pageMs + ' ms' : '—'],
      ['🐞 Error Rate วันนี้', errRate],
    ].map(([lb, v]) => `<div class="dash-sys-row"><span class="dash-sys-name">${lb}</span><span class="dash-sys-val">${v}</span></div>`).join('');
  }
}

// ── 8. Storage (ประมาณการ) ──
function dashRenderStorage() {
  const el = document.getElementById('dash-storage');
  if (!el) return;
  const C = _dash.counts || {};
  const P = _dash.products || [];
  let prodBytes = 0;
  try { prodBytes = new Blob([JSON.stringify(P)]).size; } catch (e) { prodBytes = JSON.stringify(P).length; }
  const otherDocs = (C.orders || 0) + (C.reviews || 0) + (C.contacts || 0) + (C.templates || 0) + (C.searchStats || 0) + (C.gallery || 0) + 40;
  const estBytes = prodBytes + otherDocs * 1024; // เฉลี่ย ~1KB/doc
  const quota = 1024 * 1024 * 1024; // Firestore free tier 1 GiB
  const pct = Math.min((estBytes / quota) * 100, 100);
  const fmt = b => b > 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB';
  const imgCount = P.reduce((s, p) => s + (Array.isArray(p.images) ? p.images.length : (p.image ? 1 : 0)), 0) + (C.gallery || 0);
  const totalDocs = P.length + otherDocs - 40;

  el.innerHTML = `
    <div class="dash-sys-row"><span class="dash-sys-name">🗄️ Database Usage (ประมาณ)</span><span class="dash-sys-val">${fmt(estBytes)} / 1 GB</span></div>
    <div class="dash-storage-bar"><span style="width:${Math.max(pct, 1)}%"></span></div>
    <div class="dash-sys-row"><span class="dash-sys-name">📄 จำนวนเอกสาร (docs)</span><span class="dash-sys-val">~${dashNum(totalDocs)}</span></div>
    <div class="dash-sys-row"><span class="dash-sys-name">🖼️ จำนวนรูปภาพ</span><span class="dash-sys-val">${dashNum(imgCount)} (ฝากที่ ImgBB — ไม่กินโควต้า)</span></div>
    <div class="dash-sys-row"><span class="dash-sys-name">💽 พื้นที่คงเหลือ (ประมาณ)</span><span class="dash-sys-val">${(100 - pct).toFixed(1)}%</span></div>
    <div class="dash-hint">ℹ️ ตัวเลขจริงดูได้ที่ Firebase Console → Usage</div>`;
}

// ── 17. Security ──
function dashRenderSecurity() {
  const el = document.getElementById('dash-security');
  if (!el) return;
  const lastLogin = Number(localStorage.getItem('dcs_last_login') || 0);
  const rate = (DMC.getRateLimit && DMC.getRateLimit()) || { count: 0 };
  const email = ((window.DMC_CONFIG || {}).ADMIN_EMAIL || '—');
  el.innerHTML = [
    ['🕐 Login ล่าสุด (เครื่องนี้)', lastLogin ? dashAgo(lastLogin) : '—'],
    ['❌ Failed Login (เครื่องนี้)', dashNum(rate.count || 0) + ' ครั้ง'],
    ['👤 Active Session', '1 (เซสชันนี้)'],
    ['📧 บัญชีแอดมิน', dashEsc(email)],
    ['🌐 IP ล่าสุด', '— (ไม่เก็บ IP เพื่อความเป็นส่วนตัว)'],
    ['🏷️ App Version', 'DMC Studio ' + DASH_VERSION],
  ].map(([lb, v]) => `<div class="dash-sys-row"><span class="dash-sys-name">${lb}</span><span class="dash-sys-val">${v}</span></div>`).join('');
}

// ── 18. Backup ──
function dashRenderBackup() {
  const el = document.getElementById('dash-backup');
  if (!el) return;
  const lastBk = Number(localStorage.getItem('dcs_last_backup') || 0);
  const ok = lastBk && (Date.now() - lastBk) <= 7 * 86400e3;
  el.innerHTML = `
    <div class="dash-sys-row"><span class="dash-sys-name">💾 Backup ล่าสุด</span>
      <span class="dash-sys-val" style="color:${lastBk ? (ok ? 'var(--emerald)' : 'var(--gold-deep)') : 'var(--rose)'}">${lastBk ? dashAgo(lastBk) : 'ยังไม่เคย Backup'}</span></div>
    <div class="dash-sys-row"><span class="dash-sys-name">🔁 Auto Backup</span><span class="dash-sys-val"><span class="dash-soon">รองรับอนาคต</span> (ปัจจุบัน Export เองจากหน้าตั้งค่า)</span></div>
    <div class="dash-sys-row"><span class="dash-sys-name">📥 Restore Point</span><span class="dash-sys-val">ไฟล์ JSON ที่ Export ไว้ = จุดกู้คืน</span></div>
    <div class="dash-hint">แนะนำ Export ข้อมูลอย่างน้อยสัปดาห์ละครั้ง เก็บไฟล์ไว้หลายเวอร์ชัน</div>`;
}

// ── 12. Recent Activity (สรุปจากข้อมูลจริง) ──
async function dashRenderActivity() {
  const el = document.getElementById('dash-activity');
  if (!el) return;
  try {
    if (!_dash.recent) {
      const [oSnap, pSnap, rSnap] = await Promise.all([
        db.collection('orders').orderBy('createdAt', 'desc').limit(5).get().catch(() => null),
        db.collection('products').orderBy('updatedAt', 'desc').limit(5).get().catch(() => null),
        db.collection('reviews').orderBy('createdAt', 'desc').limit(5).get().catch(() => null),
      ]);
      const items = [];
      if (oSnap) oSnap.forEach(d => { const o = d.data(); const ms = o.createdAt?.toDate ? o.createdAt.toDate().getTime() : 0;
        items.push({ ms, icon: '📦', text: `ออเดอร์ใหม่ #${o.orderId || d.id.slice(-6).toUpperCase()} — ${o.customerName || ''}` }); });
      if (pSnap) pSnap.forEach(d => { const p = d.data(); const ms = p.updatedAt?.toDate ? p.updatedAt.toDate().getTime() : 0;
        if (ms) items.push({ ms, icon: '🛍️', text: `อัปเดตสินค้า "${p.name || d.id}"` }); });
      if (rSnap) rSnap.forEach(d => { const r = d.data(); const ms = r.createdAt?.toDate ? r.createdAt.toDate().getTime() : 0;
        items.push({ ms, icon: '⭐', text: `รีวิวใหม่จาก ${r.name || '—'} (${r.rating || 0} ดาว)` }); });
      const lastLogin = Number(localStorage.getItem('dcs_last_login') || 0);
      if (lastLogin) items.push({ ms: lastLogin, icon: '🔑', text: 'Admin เข้าสู่ระบบ (เครื่องนี้)' });
      items.sort((a, b) => b.ms - a.ms);
      _dash.recent = items.slice(0, 10);
    }
    el.innerHTML = _dash.recent.length
      ? _dash.recent.map(it => `<div class="dash-act-row"><span>${it.icon}</span><span class="dash-act-text">${dashEsc(it.text)}</span><span class="dash-act-time">${dashAgo(it.ms)}</span></div>`).join('')
      : '<div class="dash-empty">ยังไม่มีกิจกรรม</div>';
  } catch (e) { el.innerHTML = '<div class="dash-empty">โหลดไม่สำเร็จ</div>'; }
}

// ══════════════════════════════════════════════
//  ฟังก์ชันเดิม (คงชื่อไว้ — admin-orders.js เรียก loadKPIs())
// ══════════════════════════════════════════════
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
    const col        = db.collection('orders');
    // BUG-02 fix: อ่านเฉพาะออเดอร์ตั้งแต่ต้นเดือน + count() aggregation (ประหยัดโควต้า)
    const Ts = firebase.firestore.Timestamp;
    const [monthSnap, activeAgg, doneAgg] = await Promise.all([
      col.where('createdAt', '>=', Ts.fromDate(monthStart)).get(),
      col.where('status', 'in', ['pending','processing','shipping']).count().get(),
      col.where('status', '==', 'done').count().get(),
    ]);

    let revenue = 0, todayCount = 0;
    const todayMs = todayStart.getTime();
    monthSnap.forEach(d => {
      const o  = d.data();
      const ms = o.createdAt?.toDate ? o.createdAt.toDate().getTime() : 0;
      if (ms >= todayMs) todayCount++;
      if (o.status !== 'cancelled') revenue += o.total || 0;
    });
    const active = activeAgg.data().count;
    const done   = doneAgg.data().count;

    _dash.ordersKpi = { active, done, revenue, todayCount };
    try { dashRenderNotifications(); } catch (e) {}  // อัปเดตแจ้งเตือนเมื่อรู้ยอดออเดอร์แล้ว
    setAdminText('kpi-pending', active);
    setAdminText('kpi-revenue', DMC.formatPrice(revenue));
    setAdminText('kpi-done', done);
    setAdminText('kpi-today', todayCount);
    setAdminText('greeting-sub', active>0 ? `มี ${active} ออเดอร์กำลังดำเนินการ 🔔` : 'ทุกออเดอร์เรียบร้อยดี 🎉');
  } catch(e) {
    // fallback: ถ้า count() ไม่รองรับ → อ่านทั้งคอลเลกชันครั้งเดียว (วิธีเดิม)
    try {
      const now        = new Date();
      const todayMs    = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const monthMs    = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const all = await db.collection('orders').get();
      let active=0, done=0, revenue=0, todayCount=0;
      all.forEach(d => {
        const o = d.data();
        const ms = o.createdAt?.toDate ? o.createdAt.toDate().getTime() : 0;
        if (ms >= todayMs) todayCount++;
        if (o.status==='cancelled') return;
        if (['pending','processing','shipping'].includes(o.status)) active++;
        if (o.status==='done') done++;
        if (ms >= monthMs) revenue += o.total||0;
      });
      _dash.ordersKpi = { active, done, revenue, todayCount };
    try { dashRenderNotifications(); } catch (e) {}  // อัปเดตแจ้งเตือนเมื่อรู้ยอดออเดอร์แล้ว
      setAdminText('kpi-pending', active);
      setAdminText('kpi-revenue', DMC.formatPrice(revenue));
      setAdminText('kpi-done', done);
      setAdminText('kpi-today', todayCount);
      setAdminText('greeting-sub', active>0 ? `มี ${active} ออเดอร์กำลังดำเนินการ 🔔` : 'ทุกออเดอร์เรียบร้อยดี 🎉');
    } catch(e2) { ['pending','revenue','done','today'].forEach(k=>setAdminText(`kpi-${k}`,'—')); }
  }
}

async function loadRecentOrdersTable() {
  const el = document.getElementById('recent-orders-table');
  if (!el) return;
  try {
    const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(8).get();
    if (snap.empty) { el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-3)">ยังไม่มีออเดอร์</div>'; return; }
    const docs = [];
    snap.forEach(doc => docs.push({id:doc.id, ...doc.data()}));
    const rows = docs.map(o => `<tr>
      <td><span class="order-id-cell">#${o.orderId||o.id.slice(-6).toUpperCase()}</span></td>
      <td>${DMC.escapeHtml(o.customerName||'—')}</td>
      <td class="price-cell">${DMC.formatPrice(o.total||0)}</td>
      <td><span class="status status-${o.status||'pending'}">${statusShort(o.status)}</span></td>
      <td><button class="table-action-btn" data-act="openOrderModal" data-id="${o.id}">ดู</button></td>
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
