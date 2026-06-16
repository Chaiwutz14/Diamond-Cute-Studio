/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — admin-settings.js
   Settings + Backup/Import
   (แยกจาก admin.js เดิม เพื่อให้ดูแลง่าย — โหลดตามลำดับใน admin.html)
═══════════════════════════════════════════════ */
'use strict';

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
        <div style="background:rgba(14,165,233,.06);border:1px solid var(--border);border-radius:var(--r-md);padding:.7rem .9rem;font-size:.78rem;color:var(--text-2);line-height:1.65;margin-bottom:.9rem">
          💡 <strong>ถ้าเปิดใช้ Firebase Auth แล้ว</strong> (ตั้ง ADMIN_EMAIL ใน config) — เปลี่ยนรหัสผ่านได้ที่ Firebase Console → Authentication ไม่ต้องแก้โค้ด<br>
          กล่องด้านล่างนี้สำหรับ <strong>โหมด hash เดิม</strong> (ยังไม่ตั้ง ADMIN_EMAIL) เท่านั้น
        </div>
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
          ${securityRows()}
          <div class="security-row" style="color:var(--text-3);font-size:.72rem;margin-top:.4rem">โหมด hash เดิม: PBKDF2-SHA256 100k (เลิกใช้เมื่อเปิด Firebase Auth)</div>
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

  document.getElementById('copy-hash-btn')?.addEventListener('click', async () => {
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
    if (!(await DMC.confirm('⚠️ Import จะ "เขียนทับ" เอกสารที่ id ตรงกันด้วยข้อมูลจากไฟล์ backup\nต้องการดำเนินการต่อ?'))) return;
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
