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
    const now = new Date().toISOString();
    return {
      'data/products.json':   { generatedAt: now, count: products.length,   items: products },
      'data/gallery.json':    { generatedAt: now, count: gallery.length,    items: gallery },
      'data/categories.json': { generatedAt: now, count: categories.length, items: categories },
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
        setTimeout(() => download('gallery.json', files['data/gallery.json']), 400);
        setTimeout(() => download('categories.json', files['data/categories.json']), 800);
        DMC.toast('⬇️ ดาวน์โหลด snapshot แล้ว — อัปขึ้น GitHub โฟลเดอร์ /data/ เพื่อให้หน้าเว็บอัปเดต', 'info', 8000);
      }
      clearDirty();
    } catch (e) {
      DMC.toast('สร้าง snapshot ไม่สำเร็จ: ' + e.message, 'error', 6000);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = orig || '📤 เผยแพร่ snapshot'; }
    }
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
    const pub = document.createElement('button');
    pub.textContent = '📤 เผยแพร่ snapshot';
    pub.style.cssText = 'background:#fff;color:#7c3aed;border:none;border-radius:10px;padding:.5rem .95rem;font-weight:700;font-size:.84rem;cursor:pointer;font-family:inherit';
    pub.addEventListener('click', () => publish(pub));
    const dim = document.createElement('button');
    dim.textContent = '✕'; dim.title = 'ปิดแถบนี้';
    dim.style.cssText = 'background:rgba(255,255,255,.22);color:#fff;border:none;border-radius:8px;padding:.45rem .7rem;font-weight:700;cursor:pointer;font-family:inherit';
    dim.addEventListener('click', clearDirty);
    b.appendChild(txt); b.appendChild(pub); b.appendChild(dim);
    document.body.appendChild(b);
    return b;
  }

  function markDirty() { dirty = true; banner().style.display = 'flex'; }
  function clearDirty() { dirty = false; const b = document.getElementById('dmc-snapshot-banner'); if (b) b.style.display = 'none'; }

  window.AdminSnapshot = { markDirty, clearDirty, publish, build };
})();
