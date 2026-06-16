/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — admin-overview.js
   Overview (Dashboard KPIs)
   (แยกจาก admin.js เดิม เพื่อให้ดูแลง่าย — โหลดตามลำดับใน admin.html)
═══════════════════════════════════════════════ */
'use strict';

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
            ${securityRows()}
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('goto-add-product')?.addEventListener('click', async () => { loadSection('products'); setTimeout(() => openProductModal(null), 250); });
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
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    // V.upgrade1: ดึง orders ครั้งเดียวแล้วคำนวณในหน่วยความจำ (ลดจาก 3 query เหลือ 1 → ประหยัด Firestore reads)
    const all = await db.collection('orders').get();
    let active=0, done=0, revenue=0, todayCount=0;
    all.forEach(d => {
      const o = d.data();
      const ms = o.createdAt?.toDate ? o.createdAt.toDate().getTime() : 0;
      if (ms >= todayStart) todayCount++;
      if (o.status==='cancelled') return;
      if (['pending','processing','shipping'].includes(o.status)) active++;
      if (o.status==='done') done++;
      if (ms >= monthStart) revenue += o.total||0;
    });
    setAdminText('kpi-pending', active);
    setAdminText('kpi-revenue', DMC.formatPrice(revenue));
    setAdminText('kpi-done', done);
    setAdminText('kpi-today', todayCount);
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
