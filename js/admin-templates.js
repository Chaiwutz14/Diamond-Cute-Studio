/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — admin-templates.js
   Templates Manager
   (แยกจาก admin.js เดิม เพื่อให้ดูแลง่าย — โหลดตามลำดับใน admin.html)
═══════════════════════════════════════════════ */
'use strict';

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
    wrap.querySelectorAll('.tpl-del').forEach(el => el.addEventListener('click', async () => {
      if (!(await DMC.confirm('ลบเทมเพลตนี้?'))) return;
      db.collection('templates').doc(el.dataset.id).delete()
        .then(() => { DMC.toast('ลบแล้ว', 'success'); loadTplList(); })
        .catch(() => DMC.toast('ลบไม่สำเร็จ', 'error'));
    }));
  } catch(e) {
    wrap.innerHTML = '<div style="grid-column:1/-1;color:var(--text-3);text-align:center;padding:1rem">โหลดไม่สำเร็จ: ' + DMC.escapeHtml(e.message) + '</div>';
  }
}
