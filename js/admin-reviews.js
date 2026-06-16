/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — admin-reviews.js
   Reviews Management
   (แยกจาก admin.js เดิม เพื่อให้ดูแลง่าย — โหลดตามลำดับใน admin.html)
═══════════════════════════════════════════════ */
'use strict';

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
          <select data-custom class="form-input form-select" id="ar-rating">
            <option value="5">★★★★★ (5)</option>
            <option value="4">★★★★ (4)</option>
            <option value="3">★★★ (3)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">สินค้า (ไม่บังคับ)</label>
        <select data-custom class="form-input form-select" id="ar-product"><option value="">— ไม่ระบุ —</option></select>
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
  document.getElementById('add-review-btn')?.addEventListener('click', async () => {
    form.style.display = form.style.display === 'none' ? '' : 'none';
  });
  document.getElementById('ar-cancel-btn')?.addEventListener('click', async () => { form.style.display = 'none'; });

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
      el.querySelectorAll('[data-rv-del]').forEach(btn => btn.addEventListener('click', async () => {
        if (!(await DMC.confirm('ลบรีวิวนี้ถาวร?'))) return;
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
