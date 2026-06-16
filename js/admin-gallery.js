/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — admin-gallery.js
   Gallery Management
   (แยกจาก admin.js เดิม เพื่อให้ดูแลง่าย — โหลดตามลำดับใน admin.html)
═══════════════════════════════════════════════ */
'use strict';

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
          <select data-custom class="form-input form-select" id="g-cat">
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

  document.getElementById('add-gallery-btn')?.addEventListener('click', async () => {
    const form = document.getElementById('gallery-add-form');
    form.style.display = form.style.display === 'none' ? '' : 'none';
  });
  document.getElementById('g-cancel-btn')?.addEventListener('click', async () => {
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

async function deleteGalleryItem(id) {
  if (!(await DMC.confirm('ลบรูปนี้?'))) return;
  db.collection('gallery').doc(id).delete()
    .then(() => { DMC.toast('ลบแล้ว','success'); loadGalleryItems(); })
    .catch(() => DMC.toast('ลบไม่สำเร็จ','error'));
}
