/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — admin-snapshot.js (V17)
   เผยแพร่ Static Snapshot (products.json / gallery.json) จากแอดมิน

   ทำไม: หน้าเว็บลูกค้าอ่านสินค้า/แกลเลอรีจากไฟล์ /data/*.json (ลดอ่าน Firestore = 0)
         เมื่อแอดมินเพิ่ม/แก้/ลบสินค้า ต้อง "เผยแพร่ snapshot" ใหม่ ข้อมูลหน้าเว็บถึงจะตรง

   การทำงาน (อัตโนมัติ-กึ่ง):
   • หลังบันทึกสินค้า/แกลเลอรี → ขึ้นแถบเตือน + ปุ่ม "เผยแพร่ snapshot"
   • กดปุ่ม → สร้าง JSON ใหม่จาก Firestore แล้ว:
       1) ถ้าตั้ง Worker /publish-snapshot ไว้ (GITHUB_TOKEN) → commit ขึ้น GitHub อัตโนมัติ
       2) ถ้าไม่ได้ตั้ง → ดาวน์โหลด 2 ไฟล์ให้ admin อัปขึ้น GitHub /data/ เอง (ไม่พึ่ง secret)
═══════════════════════════════════════════════ */
'use strict';
(function () {
  let dirty = false;

  // แปลง Firestore Timestamp → {seconds} (JSON สะอาด) — เหมือน _dev/export-snapshot.html
  function cleanTs(obj) {
    return JSON.parse(JSON.stringify(obj, (k, v) => {
      if (v && typeof v === 'object' && typeof v.seconds === 'number' && typeof v.nanoseconds === 'number') return { seconds: v.seconds };
      return v;
    }));
  }

  async function build() {
    const db = (window.DMC && DMC.getDb && DMC.getDb()) || await DMC.getFirebaseReady();
    const pSnap = await db.collection('products').where('active', '==', true).get();
    const products = [];
    pSnap.forEach(d => products.push(cleanTs({ id: d.id, ...d.data() })));
    const gSnap = await db.collection('gallery').get();
    const gallery = [];
    gSnap.forEach(d => { const x = d.data(); if (x.active !== false) gallery.push(cleanTs({ id: d.id, ...x })); });
    // PERF-03: เผยแพร่หมวดหมู่ด้วย → หน้าเว็บอ่าน categories จากไฟล์ (อ่าน Firestore = 0)
    const cSnap = await db.collection('categories').get();
    const categories = [];
    cSnap.forEach(d => categories.push(cleanTs({ id: d.id, ...d.data() })));
    // V24/PERF-B: เผยแพร่รีวิว (อนุมัติแล้ว) + เนื้อหาเว็บ → หน้าแรกไม่ต้องโหลด Firebase
    const rSnap = await db.collection('reviews').where('status', '==', 'approved').limit(100).get();
    const reviews = [];
    rSnap.forEach(d => reviews.push(cleanTs({ id: d.id, ...d.data() })));
    let siteContent = {};
    try {
      const scDoc = await db.collection('siteContent').doc('main').get();
      siteContent = scDoc.exists ? cleanTs(scDoc.data()) : {};
    } catch (e) { siteContent = {}; }
    const now = new Date().toISOString();
    return {
      'data/products.json':    { generatedAt: now, count: products.length,   items: products },
      'data/gallery.json':     { generatedAt: now, count: gallery.length,    items: gallery },
      'data/categories.json':  { generatedAt: now, count: categories.length, items: categories },
      'data/reviews.json':     { generatedAt: now, count: reviews.length,    items: reviews },
      'data/sitecontent.json': { generatedAt: now, data: siteContent },
    };
  }

  function download(name, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function tryWorkerPublish(files) {
    const wk = (window.DMC_CONFIG || {}).CF_WORKER_URL || '';
    if (!wk) return { ok: false };
    try {
      const res = await fetch(wk + '/publish-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(typeof dmcWorkerKeyHeader === 'function' ? dmcWorkerKeyHeader() : {}) },
        body: JSON.stringify({ files }),
      });
      const j = await res.json().catch(() => ({}));
      return (j && j.ok) ? { ok: true } : { ok: false, reason: (j && j.reason) || '' };
    } catch (e) { return { ok: false, reason: e.message }; }
  }

  async function publish(btn) {
    const orig = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังสร้าง...'; }
    try {
      const files = await build();
      const r = await tryWorkerPublish(files);   // ลอง commit ขึ้น GitHub อัตโนมัติก่อน
      if (r.ok) {
        DMC.toast('✅ เผยแพร่ขึ้นเว็บแล้ว — หน้าลูกค้าจะอัปเดตภายใน 1–2 นาที', 'success', 6000);
      } else {
        download('products.json', files['data/products.json']);
        setTimeout(() => download('gallery.json', files['data/gallery.json']), 300);
        setTimeout(() => download('categories.json', files['data/categories.json']), 600);
        setTimeout(() => download('reviews.json', files['data/reviews.json']), 900);
        setTimeout(() => download('sitecontent.json', files['data/sitecontent.json']), 1200);
        DMC.toast('⬇️ ดาวน์โหลด snapshot แล้ว — อัปขึ้น GitHub โฟลเดอร์ /data/ เพื่อให้หน้าเว็บอัปเดต', 'info', 8000);
      }
      clearDirty();
      markPublished();   // V24/BUG-A: บันทึกเวลาเผยแพร่ล่าสุด
    } catch (e) {
      DMC.toast('สร้าง snapshot ไม่สำเร็จ: ' + e.message, 'error', 6000);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = orig || '📤 เผยแพร่ snapshot'; }
    }
  }

  // V24/BUG-A: บันทึก + แสดง "เผยแพร่ล่าสุดเมื่อ..."
  const PUB_KEY = 'dmc_snapshot_published_at';
  function markPublished() { try { localStorage.setItem(PUB_KEY, new Date().toISOString()); } catch (e) {} }
  async function lastPublishedText() {
    // อ่านจากไฟล์ที่ live อยู่จริง (data/products.json) เป็นหลัก — ตรงกับสิ่งที่ลูกค้าเห็น
    let iso = '';
    try {
      const base = (window.DMC_CONFIG || {}).SNAPSHOT_BASE || './data/';
      const res = await fetch(base + 'products.json', { cache: 'no-cache' });
      if (res.ok) { const j = await res.json(); iso = (j && j.generatedAt) || ''; }
    } catch (e) {}
    if (!iso) { try { iso = localStorage.getItem(PUB_KEY) || ''; } catch (e) {} }
    if (!iso) return 'ยังไม่เคยเผยแพร่';
    try {
      const d = new Date(iso);
      const ago = DMC.timeAgo ? DMC.timeAgo(d) : '';
      return 'เผยแพร่ล่าสุด: ' + d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) + (ago ? ' (' + ago + ')' : '');
    } catch (e) { return 'เผยแพร่ล่าสุด: ' + iso; }
  }

  function banner() {
    let b = document.getElementById('dmc-snapshot-banner');
    if (b) return b;
    b = document.createElement('div');
    b.id = 'dmc-snapshot-banner';
    b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9990;background:linear-gradient(135deg,#7c5cff,#a855f7);color:#fff;padding:.7rem 1rem;display:none;gap:.8rem;align-items:center;justify-content:center;flex-wrap:wrap;box-shadow:0 -6px 24px rgba(0,0,0,.18);font-family:var(--font-display,sans-serif)';
    const txt = document.createElement('span');
    txt.style.cssText = 'font-size:.86rem';
    txt.textContent = '📦 ข้อมูลสินค้า/แกลเลอรีเปลี่ยนแล้ว — กดเผยแพร่เพื่ออัปเดตหน้าเว็บลูกค้า';
    const last = document.createElement('span');
    last.id = 'dmc-snapshot-last';
    last.style.cssText = 'font-size:.74rem;opacity:.85;width:100%;text-align:center;order:9';
    last.textContent = '';
    lastPublishedText().then(t => { last.textContent = '🕓 ' + t; });
    const pub = document.createElement('button');
    pub.textContent = '📤 เผยแพร่ snapshot';
    pub.style.cssText = 'background:#fff;color:#7c3aed;border:none;border-radius:10px;padding:.5rem .95rem;font-weight:700;font-size:.84rem;cursor:pointer;font-family:inherit';
    pub.addEventListener('click', () => publish(pub));
    const dim = document.createElement('button');
    dim.textContent = '✕'; dim.title = 'ปิดแถบนี้';
    dim.style.cssText = 'background:rgba(255,255,255,.22);color:#fff;border:none;border-radius:8px;padding:.45rem .7rem;font-weight:700;cursor:pointer;font-family:inherit';
    dim.addEventListener('click', clearDirty);
    b.appendChild(txt); b.appendChild(pub); b.appendChild(dim); b.appendChild(last);
    document.body.appendChild(b);
    return b;
  }

  function markDirty() {
    dirty = true;
    const b = banner();
    b.style.display = 'flex';
    const last = document.getElementById('dmc-snapshot-last');
    if (last) lastPublishedText().then(t => { last.textContent = '🕓 ' + t; });
  }
  function clearDirty() { dirty = false; const b = document.getElementById('dmc-snapshot-banner'); if (b) b.style.display = 'none'; }

  // ─── V24: Auto-publish — เรียกหลังบันทึกข้อมูลทุกครั้ง (สินค้า/แกลเลอรี/CMS/รีวิว) ───
  //   หลักการ: debounce 1.5 วิ (กันยิงซ้ำหลายครั้งติดกัน) → build → commit ขึ้น GitHub อัตโนมัติ
  //   - ถ้าตั้ง GITHUB_TOKEN แล้ว: หน้าเว็บอัปเดตภายใน 1–2 นาทีโดยไม่ต้องทำอะไร
  //   - ถ้ายังไม่ตั้ง: แจ้งเตือน (ไม่ดาวน์โหลดไฟล์ ไม่ทำให้งง)
  //   - ถ้า Worker ล่ม/error: แจ้งเตือน + ขึ้นแถบเตือน (ไม่พัง)
  let _autoTimer = null;
  let _autoBusy  = false;
  async function autoPublish() {
    // debounce: รอ 1.5 วิ ถ้ามีการบันทึกซ้ำให้รีเซ็ตนับใหม่
    clearTimeout(_autoTimer);
    _autoTimer = setTimeout(_runAutoPublish, 1500);
  }

  async function _runAutoPublish() {
    if (_autoBusy) { clearTimeout(_autoTimer); _autoTimer = setTimeout(_runAutoPublish, 2000); return; }
    _autoBusy = true;
    // แสดง toast "กำลังอัปเดต..." (toast สั้น ไม่ขวางการทำงาน)
    const wk = (window.DMC_CONFIG || {}).CF_WORKER_URL || '';
    if (!wk) { _autoBusy = false; markDirty(); return; }
    try {
      DMC.toast('🔄 กำลังอัปเดตหน้าเว็บ...', 'info', 2500);
      const files = await build();
      const r = await tryWorkerPublish(files);
      if (r.ok) {
        DMC.toast('✅ หน้าเว็บอัปเดตแล้ว — ลูกค้าเห็นข้อมูลใหม่ทันที', 'success', 4000);
        clearDirty();
        markPublished();
      } else {
        // Worker ไม่ได้ตั้ง GITHUB_TOKEN → แจ้งให้เจ้าของระบบรู้ (ไม่ดาวน์โหลดไฟล์)
        DMC.toast('⚠️ อัปเดตอัตโนมัติยังไม่พร้อม — กรุณาตั้งค่า GITHUB_TOKEN ใน Worker (ดูคู่มือ HANDOVER.md)', 'warning', 7000);
        markDirty();   // ขึ้นแถบสีม่วงให้กดเอง
      }
    } catch (e) {
      console.warn('auto-publish error:', e.message);
      DMC.toast('⚠️ อัปเดตหน้าเว็บไม่สำเร็จ — ' + e.message, 'warning', 5000);
      markDirty();
    } finally {
      _autoBusy = false;
    }
  }

  window.AdminSnapshot = { markDirty, clearDirty, publish, autoPublish, build, lastPublishedText };
})();
