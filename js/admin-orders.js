/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — admin-orders.js
   Orders + Tracking + Order Modal
   (แยกจาก admin.js เดิม เพื่อให้ดูแลง่าย — โหลดตามลำดับใน admin.html)
═══════════════════════════════════════════════ */
'use strict';

// ══════════════════════════════════════════════
//  ORDERS (+ Tracking)
// ══════════════════════════════════════════════
async function loadOrders(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>📦 ออเดอร์ทั้งหมด</h2><p>จัดการสถานะ เลขพัสดุ และรายละเอียดออเดอร์</p></div>
      <div class="admin-topbar-actions">
        <select data-custom class="form-input form-select" id="order-filter" style="width:auto;padding:.45rem 2rem .45rem .75rem">
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

// ── BUG-01 fix: เดิม .limit(150) ไม่มี orderBy → Firestore คืน 150 ใบ "แรกตาม docId" (ไม่ใช่ล่าสุด)
//    พอออเดอร์เกิน 150 ใบ ใบใหม่จะหายจากหน้าจอ (เรียงฝั่ง client ช่วยไม่ได้เพราะไม่อยู่ในชุดที่ดึงมา)
//    ใหม่: เรียงที่เซิร์ฟเวอร์ด้วย orderBy('createdAt','desc') + แบ่งหน้า (startAfter) → ใบล่าสุดขึ้นเสมอ + โหลดเพิ่มได้
const ORDERS_PAGE_SIZE = 50;
let _ordersPage = { cursor: null, filter: '', clientSorted: false, busy: false };

function orderRowHtml(o) {
  return `<tr>
      <td><span class="order-id-cell">#${o.orderId||o.id.slice(-6).toUpperCase()}</span>${o.slipVerify&&o.slipVerify.status==='failed'?` <span title="ตรวจสลิปอัตโนมัติไม่ผ่าน — ควรตรวจเอง" style="color:#f59e0b">⚠️</span>`:''}</td>
      <td><div style="font-weight:600">${DMC.escapeHtml(o.customerName||'—')}</div><div style="font-size:.75rem;color:var(--text-3)">${DMC.escapeHtml(o.customerPhone||'')}</div></td>
      <td style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.83rem">${DMC.escapeHtml(o.itemsSummary||'—')}</td>
      <td class="price-cell">${DMC.formatPrice(o.total||0)}</td>
      <td style="font-size:.78rem">${o.trackingNo ? '🚚 ' + DMC.escapeHtml(o.trackingNo) : '<span style="color:var(--text-3)">—</span>'}</td>
      <td>
        <select data-custom class="form-input form-select" style="padding:.28rem .5rem;font-size:.78rem;width:auto" data-act-change="quickUpdateStatus" data-id="${o.id}">
          ${ORDER_STATUSES.map(s=>`<option value="${s.key}" ${o.status===s.key?'selected':''}>${s.short}</option>`).join('')}
        </select>
      </td>
      <td style="font-size:.78rem;color:var(--text-3)">${o.createdAt?DMC.formatDate(o.createdAt,true):'—'}</td>
      <td><button class="table-action-btn" data-act="openOrderModal" data-id="${o.id}">📋 ดู</button></td>
    </tr>`;
}

async function fetchOrdersPage(filter, cursor) {
  const col = db.collection('orders');
  let docs = [], lastDoc = null, clientSorted = false;
  try {
    let q = filter
      ? col.where('status', '==', filter).orderBy('createdAt', 'desc')
      : col.orderBy('createdAt', 'desc');
    if (cursor) q = q.startAfter(cursor);
    q = q.limit(ORDERS_PAGE_SIZE);
    const snap = await q.get();
    snap.forEach(d => { docs.push({ id: d.id, ...d.data() }); lastDoc = d; });
  } catch (idxErr) {
    // กรองสถานะ + orderBy ต้องมี composite index (status + createdAt) — ถ้ายังไม่ได้สร้าง index จะ error ที่นี่
    // fallback: ดึงตามสถานะแล้วเรียงฝั่ง client (แสดง 150 ล่าสุดของสถานะนั้น ไม่แบ่งหน้า) → ยังใช้งานได้ไม่พัง
    const snap = await col.where('status', '==', filter).limit(150).get();
    snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    clientSorted = true;
  }
  return { docs, cursor: lastDoc, clientSorted, canLoadMore: !clientSorted && docs.length === ORDERS_PAGE_SIZE };
}

async function loadOrdersTable() {
  const el     = document.getElementById('orders-table-wrap');
  const filter = document.getElementById('order-filter')?.value || '';
  if (!el) return;
  if (typeof Loading !== 'undefined') el.innerHTML = Loading.Skeleton.tableRows(5);
  _ordersPage = { cursor: null, filter, clientSorted: false, busy: false };
  try {
    const page = await fetchOrdersPage(filter, null);
    if (!page.docs.length) { el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-3)">ไม่พบออเดอร์</div>'; return; }
    _ordersPage.cursor = page.cursor;
    _ordersPage.clientSorted = page.clientSorted;

    el.innerHTML = `<div style="overflow-x:auto">
        <table class="data-table">
          <thead><tr><th>ออเดอร์</th><th>ลูกค้า</th><th>รายการ</th><th>ราคา</th><th>เลขพัสดุ</th><th>สถานะ</th><th>วันที่</th><th></th></tr></thead>
          <tbody id="orders-tbody">${page.docs.map(orderRowHtml).join('')}</tbody>
        </table></div>
      <div id="orders-more-wrap" style="text-align:center;margin-top:1rem">
        ${page.canLoadMore
          ? '<button class="btn btn-ghost btn-md" id="orders-more-btn" style="border-radius:var(--r-lg)">โหลดเพิ่ม ↓</button>'
          : (page.clientSorted ? '<div style="font-size:.74rem;color:var(--text-3)">แสดง 150 ออเดอร์ล่าสุดของสถานะนี้ · สร้าง composite index (status + createdAt) เพื่อดูครบและโหลดเพิ่ม</div>' : '')}
      </div>`;
    document.getElementById('orders-more-btn')?.addEventListener('click', loadMoreOrders);
  } catch(e) { el.innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ: '+DMC.escapeHtml(e.message)+'</div>'; }
}

async function loadMoreOrders() {
  if (_ordersPage.busy || !_ordersPage.cursor) return;
  _ordersPage.busy = true;
  const btn   = document.getElementById('orders-more-btn');
  const tbody = document.getElementById('orders-tbody');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังโหลด...'; }
  try {
    const page = await fetchOrdersPage(_ordersPage.filter, _ordersPage.cursor);
    if (tbody && page.docs.length) tbody.insertAdjacentHTML('beforeend', page.docs.map(orderRowHtml).join(''));
    _ordersPage.cursor = page.cursor;
    const wrap = document.getElementById('orders-more-wrap');
    if (!page.canLoadMore) { if (wrap) wrap.innerHTML = '<div style="font-size:.74rem;color:var(--text-3)">แสดงครบทุกออเดอร์แล้ว ✅</div>'; }
    else if (btn) { btn.disabled = false; btn.textContent = 'โหลดเพิ่ม ↓'; }
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = 'โหลดเพิ่ม ↓'; }
    DMC.toast('โหลดเพิ่มไม่สำเร็จ', 'error');
  } finally { _ordersPage.busy = false; }
}

// V16: บันทึกเวลา "ส่งล่าสุด" ลง siteContent/main (public read) เพื่อโชว์บนหน้าแรก (coverflow badge)
async function touchLastDelivered(status) {
  if (status !== 'done') return;
  try {
    await db.collection('siteContent').doc('main').set(
      { lastDeliveredAt: firebase.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  } catch (e) { /* ไม่บล็อกงานหลัก */ }
}

window.quickUpdateStatus = async function(id, status) {
  try {
    await db.collection('orders').doc(id).update({ status, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    touchLastDelivered(status);   // V16
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
        <div><div style="font-weight:600">${DMC.escapeHtml(item.name||'—')}</div><div style="color:var(--text-3);font-size:.78rem">${DMC.escapeHtml(item.options||'')} × ${item.qty||1} ${DMC.escapeHtml(item.unit||'ชิ้น')}</div>${item.customDetails ? `<div style="margin-top:.25rem;padding:.4rem .6rem;background:var(--bg-mid);border-left:3px solid var(--accent);border-radius:6px;color:var(--text-2);font-size:.8rem;line-height:1.45;white-space:pre-line">📝 ${DMC.escapeHtml(item.customDetails)}</div>` : ''}</div>
        <div style="font-family:var(--font-display);font-weight:700;color:var(--accent)">${DMC.formatPrice((item.price||0)*(item.qty||1))}</div>
      </div>`).join('');

    body.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">📦 ออเดอร์ #${o.orderId||o.id.slice(-6).toUpperCase()}</div>
        <button class="modal-close" data-act="closeModal" aria-label="ปิด">✕</button>
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
        <img src="" id="slip-img-${o.id}" style="max-height:180px;border-radius:var(--r-md);border:1.5px solid var(--border);cursor:zoom-in;background:var(--bg-mid)" title="คลิกเพื่อดูเต็มหน้าจอ">
        <div id="slip-loading-${o.id}" style="font-size:.72rem;color:var(--text-3)">กำลังโหลดสลิป...</div>
      </div>`:''}

      ${(() => {
        const sv = o.slipVerify;
        if (!sv && !o.slipRef) return '';
        const st = (sv && sv.status) || 'unverified';
        const map = {
          passed:     { c:'#10b981', bg:'rgba(16,185,129,.10)', icon:'✅', label:'ตรวจสลิปอัตโนมัติผ่าน' },
          failed:     { c:'#f59e0b', bg:'rgba(245,158,11,.12)', icon:'⚠️', label:'ตรวจสลิปไม่ผ่าน — ควรตรวจด้วยตนเอง' },
          unverified: { c:'var(--text-3)', bg:'var(--bg-mid)',  icon:'ℹ️', label:'ยังไม่ได้ตรวจอัตโนมัติ' },
        };
        const m = map[st] || map.unverified;
        const reason = sv && sv.reason ? `<div style="font-size:.74rem;color:var(--text-2);margin-top:.25rem">${DMC.escapeHtml(sv.reason)}</div>` : '';
        const ref    = o.slipRef ? `<div style="font-size:.7rem;color:var(--text-3);margin-top:.2rem">อ้างอิง: ${DMC.escapeHtml(o.slipRef)}</div>` : '';
        const amt    = (sv && sv.amount != null) ? `<div style="font-size:.7rem;color:var(--text-3)">ยอดในสลิป: ${DMC.formatPrice(sv.amount)}</div>` : '';
        const prov   = (sv && sv.provider && sv.provider !== 'local') ? ` <span style="font-size:.66rem;color:var(--text-3)">(${DMC.escapeHtml(sv.provider)})</span>` : '';
        return `<div style="margin-bottom:1rem;background:${m.bg};border-left:3px solid ${m.c};border-radius:var(--r-md);padding:.6rem .75rem">
          <div style="font-family:var(--font-display);font-size:.82rem;font-weight:700;color:${m.c}">${m.icon} ${m.label}${prov}</div>
          ${reason}${amt}${ref}
        </div>`;
      })()}

      ${o.fileUrls?.length?`<div style="margin-bottom:1rem">
        <div style="font-family:var(--font-display);font-size:.78rem;color:var(--text-3);margin-bottom:.5rem">ไฟล์รูปภาพ (${o.fileUrls.length} ไฟล์) <span style="font-size:.7rem;color:var(--accent)">(คลิกเพื่อขยาย)</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:.5rem" id="file-urls-wrap-${o.id}"></div>
      </div>`:''}

      <!-- สถานะ + Tracking -->
      <div style="background:var(--bg-mid);border-radius:var(--r-lg);padding:1rem;margin-bottom:1rem">
        <div style="font-family:var(--font-display);font-size:.78rem;color:var(--text-3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:.6rem">อัปเดตสถานะ + เลขพัสดุ</div>
        <div class="form-group">
          <label class="form-label">สถานะออเดอร์</label>
          <select data-custom class="form-input form-select" id="modal-status-select">
            ${ORDER_STATUSES.map(s=>`<option value="${s.key}" ${o.status===s.key?'selected':''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group" style="margin:0">
            <label class="form-label">ขนส่ง</label>
            <select data-custom class="form-input form-select" id="modal-carrier-select">
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
        <button class="btn btn-primary btn-md" style="flex:1" data-act="updateOrderStatus" data-id="${o.id}">💾 บันทึก</button>
        <button class="btn btn-ghost btn-md" data-act="closeModal">ปิด</button>
      </div>`;

    // Wire image clicks — V3: resolve รองรับทั้ง ImgBB URL และ storage path (สลิป private)
    setTimeout(async () => {
      const slipImg = document.getElementById('slip-img-' + o.id);
      const slipLoad = document.getElementById('slip-loading-' + o.id);
      if (slipImg && o.slipUrl) {
        const src = await DMC.resolveImageSrc(o.slipUrl);
        if (src) { slipImg.src = src; slipImg.addEventListener('click', () => openImageLightbox(src)); }
        else if (slipImg) slipImg.style.display = 'none';
        if (slipLoad) slipLoad.remove();
      } else if (slipLoad) { slipLoad.remove(); }

      const fileWrap = document.getElementById('file-urls-wrap-' + o.id);
      if (fileWrap && o.fileUrls && o.fileUrls.length) {
        for (const val of o.fileUrls) {
          const src = await DMC.resolveImageSrc(val);
          if (!src) continue;
          const img = document.createElement('img');
          img.src = src;
          img.style.cssText = 'height:70px;border-radius:var(--r-md);border:1.5px solid var(--border);cursor:zoom-in;object-fit:cover';
          img.title = 'คลิกเพื่อดูเต็มหน้าจอ';
          img.addEventListener('click', () => openImageLightbox(src));
          fileWrap.appendChild(img);
        }
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
    touchLastDelivered(s);   // V16
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
    closeBtn.setAttribute('aria-label', 'ปิด');
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
