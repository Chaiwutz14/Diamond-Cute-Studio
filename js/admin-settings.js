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
  // V38: เรียงกล่องตามความสำคัญ — Backup (ประกันชีวิตข้อมูล) → LINE →
  //      Search Dictionary → รหัสผ่าน → ความปลอดภัย (สรุปสถานะไว้ท้าย)
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>⚙️ ตั้งค่าระบบ</h2><p>Backup · แจ้งเตือน LINE · ระบบค้นหา · รหัสผ่าน · ความปลอดภัย</p></div>
    </div>
    <div class="settings-grid">
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
    </div>`;

  const grid = container.querySelector('.settings-grid');
  if (grid) {
    initBackupBox();
    initSearchAdminBox(grid);   // V36: การ์ดจัดการคำพ้อง/Alias + สถิติคำค้น (ต่อท้าย = ลำดับ 3)

    // ── ลำดับ 4-5: รหัสผ่าน + ความปลอดภัย (V38: เพิ่ม Login ล่าสุด/Failed/เวอร์ชัน) ──
    const lastLogin = Number(localStorage.getItem('dcs_last_login') || 0);
    const loginTxt  = lastLogin ? new Date(lastLogin).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
    let failedTxt = '0 ครั้ง';
    try { const rl = DMC.getRateLimit(); if (rl && rl.count) failedTxt = rl.count + ' ครั้ง (ใน 15 นาที)'; } catch (e) {}
    const verTxt = (typeof DASH_VERSION !== 'undefined') ? DASH_VERSION : '—';
    grid.insertAdjacentHTML('beforeend', `
      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">🔐 เปลี่ยนรหัสผ่าน Admin</div></div>
        <div style="background:rgba(14,165,233,.06);border:1px solid var(--border);border-radius:var(--r-md);padding:.9rem 1rem;font-size:.84rem;color:var(--text-2);line-height:1.75">
          🔑 ระบบยืนยันตัวตนด้วย <strong>Firebase Authentication</strong> แล้ว<br>
          เปลี่ยนรหัสผ่านได้ที่ <strong>Firebase Console → Authentication → Users</strong> → เลือกอีเมลแอดมิน → Reset password<br>
          <span style="color:var(--text-3);font-size:.78rem">ปลอดภัยกว่าเดิม · ไม่ต้องแก้โค้ดหรืออัปขึ้น GitHub อีกต่อไป</span>
        </div>
      </div>

      <div class="admin-box">
        <div class="admin-box-header"><div class="admin-box-title">🛡️ ความปลอดภัยของระบบ</div></div>
        <div class="security-status">
          ${securityRows()}
          <div class="security-row" style="color:var(--text-2)">🕘 Login ล่าสุด (เครื่องนี้): ${DMC.escapeHtml(loginTxt)}</div>
          <div class="security-row" style="color:var(--text-2)">🚫 Login ผิดพลาดล่าสุด: ${DMC.escapeHtml(failedTxt)}</div>
          <div class="security-row" style="color:var(--text-2)">🏷️ เวอร์ชันระบบ Admin: ${DMC.escapeHtml(verTxt)}</div>
        </div>
      </div>`);
  }

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
      // V37: บันทึกเวลา Backup ล่าสุด — Dashboard ใช้แจ้งเตือน/คิด Health Score
      try { localStorage.setItem('dcs_last_backup', String(Date.now())); } catch (e) {}
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


// ══════════════════════════════════════════════
//  V36 — SEARCH ADMIN: จัดการคำพ้อง/Alias + สถิติคำค้น
//  บันทึกลง settings/search — เอนจินค้นหาฝั่งลูกค้าอ่านไปใช้อัตโนมัติ
// ══════════════════════════════════════════════
function initSearchAdminBox(grid) {
  if (!grid) return;
  grid.insertAdjacentHTML('beforeend', `
    <div class="admin-box" id="search-admin-box">
      <div class="admin-box-header"><div class="admin-box-title">🔍 ระบบค้นหา — คำพ้อง & คำย่อ</div></div>
      <p style="font-size:.83rem;color:var(--text-2);line-height:1.7;margin-bottom:.8rem">
        เพิ่มคำพ้องความหมายและคำย่อ เพื่อให้ลูกค้าค้นหาเจอสินค้าได้ง่ายขึ้น<br>
        <span style="color:var(--text-3);font-size:.78rem">มีชุดคำพื้นฐานให้อยู่แล้ว — ที่เพิ่มตรงนี้คือคำเสริมของร้านคุณ</span>
      </p>
      <div class="form-group">
        <label class="form-label">คำพ้องความหมาย (Synonyms)
          <span style="font-weight:400;color:var(--text-3)">— บรรทัดละกลุ่ม รูปแบบ: <code>คำหลัก = คำพ้อง1, คำพ้อง2</code></span>
        </label>
        <textarea class="form-input form-textarea" id="search-synonyms" rows="5" placeholder="รูป = ภาพ, photo, ปริ้นรูป&#10;การ์ดแต่งงาน = การ์ดเชิญ, wedding card" style="font-family:monospace;font-size:.82rem"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">คำย่อ / ชื่อเรียกอื่น (Aliases)
          <span style="font-weight:400;color:var(--text-3)">— บรรทัดละคู่ รูปแบบ: <code>คำย่อ &gt; คำเต็ม</code></span>
        </label>
        <textarea class="form-input form-textarea" id="search-aliases" rows="4" placeholder="นบ > นามบัตร&#10;รร > โรงเรียน" style="font-family:monospace;font-size:.82rem"></textarea>
      </div>
      <button class="btn btn-primary btn-md" id="search-dict-save">💾 บันทึกคำพ้อง</button>
      <div id="search-dict-status" style="font-size:.78rem;color:var(--text-3);margin-top:.7rem"></div>
    </div>

    <div class="admin-box" id="search-stats-box">
      <div class="admin-box-header"><div class="admin-box-title">📊 สถิติคำค้นหา</div></div>
      <div id="search-stats-body" style="font-size:.85rem;color:var(--text-2)">กำลังโหลด…</div>
      <button class="btn btn-ghost btn-sm" id="search-stats-refresh" style="margin-top:.7rem">🔄 รีเฟรช</button>
    </div>`);

  loadSearchDict();
  loadSearchStats();
  document.getElementById('search-dict-save')?.addEventListener('click', saveSearchDict);
  document.getElementById('search-stats-refresh')?.addEventListener('click', loadSearchStats);
}

async function loadSearchDict() {
  try {
    if (!db) db = await DMC.getFirebaseReady();
    const doc = await db.collection('settings').doc('search').get();
    const d = doc.exists ? doc.data() : {};
    const syn = document.getElementById('search-synonyms');
    const ali = document.getElementById('search-aliases');
    if (syn) syn.value = d.synonyms || '';
    if (ali) ali.value = d.aliases || '';
  } catch (e) {}
}

async function saveSearchDict() {
  const btn = document.getElementById('search-dict-save');
  const status = document.getElementById('search-dict-status');
  const synonyms = document.getElementById('search-synonyms')?.value || '';
  const aliases  = document.getElementById('search-aliases')?.value || '';
  if (typeof Loading !== 'undefined') Loading.buttonLoad(btn);
  try {
    if (!db) db = await DMC.getFirebaseReady();
    await db.collection('settings').doc('search').set({
      synonyms, aliases,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    // ล้าง cache ฝั่งลูกค้า (โหลดใหม่รอบหน้า) — และของแอดมินเองด้วย
    try { localStorage.removeItem('dcs_search_dict_v1'); } catch (e) {}
    if (typeof Loading !== 'undefined') Loading.buttonDone(btn);
    DMC.toast('บันทึกคำพ้องสำเร็จ ✅ (มีผลกับหน้าค้นหาทันทีรอบถัดไป)', 'success');
    if (status) status.textContent = 'อัปเดตล่าสุด: เมื่อสักครู่';
  } catch (e) {
    if (typeof Loading !== 'undefined') Loading.buttonDone(btn);
    DMC.toast('บันทึกไม่สำเร็จ: ' + (e.message || e), 'error');
  }
}

async function loadSearchStats() {
  const body = document.getElementById('search-stats-body');
  if (!body) return;
  body.textContent = 'กำลังโหลด…';
  try {
    if (!db) db = await DMC.getFirebaseReady();
    // Top 10 ตามจำนวนค้น
    const topSnap = await db.collection('searchStats').orderBy('count', 'desc').limit(10).get();
    const top = [];
    topSnap.forEach(d => { const x = d.data(); if (x && x.term) top.push(x); });

    // คำที่ค้นแล้วไม่พบ (zero == true) — เรียงตามจำนวนครั้ง
    const zeroSnap = await db.collection('searchStats').where('zero', '==', true).limit(30).get();
    const zeros = [];
    zeroSnap.forEach(d => { const x = d.data(); if (x && x.term) zeros.push(x); });
    zeros.sort((a, b) => (b.count || 0) - (a.count || 0));

    if (!top.length && !zeros.length) {
      body.innerHTML = '<span style="color:var(--text-3)">ยังไม่มีข้อมูลการค้นหา</span>';
      return;
    }

    const esc = s => DMC.escapeHtml(String(s || ''));
    let html = '';
    if (top.length) {
      html += '<div style="font-family:var(--font-display);font-weight:700;margin:.2rem 0 .5rem">🔥 คำค้นยอดนิยม</div>';
      html += '<div style="display:flex;flex-direction:column;gap:.3rem;margin-bottom:1rem">' + top.map(x => {
        const ctr = x.count ? Math.round(((x.clicks || 0) / x.count) * 100) : 0;
        return `<div style="display:flex;justify-content:space-between;gap:.75rem;padding:.35rem .6rem;background:var(--bg-mid);border-radius:var(--r-sm)">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.term)}</span>
          <span style="flex-shrink:0;color:var(--text-3);font-size:.8rem">ค้น ${x.count || 0} · คลิก ${x.clicks || 0} · CTR ${ctr}%</span>
        </div>`;
      }).join('') + '</div>';
    }
    if (zeros.length) {
      html += '<div style="font-family:var(--font-display);font-weight:700;margin:.2rem 0 .5rem;color:var(--rose,#fb7185)">⚠️ ค้นแล้วไม่พบ (ควรเพิ่มสินค้า/คำพ้อง)</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:.4rem">' + zeros.slice(0, 20).map(x =>
        `<span style="padding:.3rem .7rem;background:rgba(251,113,133,.12);border-radius:999px;font-size:.82rem">${esc(x.term)} <span style="color:var(--text-3)">×${x.count || 0}</span></span>`
      ).join('') + '</div>';
    }
    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = '<span style="color:var(--text-3)">โหลดสถิติไม่สำเร็จ (อาจต้องสร้าง index ใน Firestore) — ' + DMC.escapeHtml(e.message || '') + '</span>';
  }
}
