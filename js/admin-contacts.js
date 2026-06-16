/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — admin-contacts.js
   Contacts Inbox
   (แยกจาก admin.js เดิม เพื่อให้ดูแลง่าย — โหลดตามลำดับใน admin.html)
═══════════════════════════════════════════════ */
'use strict';

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
      btn.addEventListener('click', async () => {
        if (!(await DMC.confirm('ลบข้อความนี้?'))) return;
        db.collection('contacts').doc(btn.dataset.id).delete()
          .then(() => { DMC.toast('ลบแล้ว','success'); loadContacts(document.getElementById('admin-content')); })
          .catch(() => DMC.toast('ลบไม่สำเร็จ','error'));
      });
    });
  } catch(e) {
    document.getElementById('contacts-list').innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ: '+DMC.escapeHtml(e.message)+'</div>';
  }
}
