/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Reviews V12
   js/reviews.js

   - ลูกค้ารีวิวได้ → สถานะ pending → Admin อนุมัติก่อนแสดง
   - ตัวกรองหลายชั้น: คำหยาบไทย/อังกฤษ, ลิงก์, เบอร์โทร,
     ความยาว, ตัวอักษรซ้ำ, honeypot, rate limit ต่อเครื่อง
   - แสดงเฉพาะรีวิวที่อนุมัติแล้ว (approved)
═══════════════════════════════════════════════ */
'use strict';

window.Reviews = (function(){

  // ─── คำต้องห้าม (ไทย + อังกฤษ — ตรวจแบบ normalize) ───
  const BAD_WORDS = [
    'เหี้ย','เหี่ย','เฮี้ย','สัส','สัด','ควย','คxย','หี','เย็ด','เยด','มึง','กู',
    'ไอ้สัตว์','ไอสัตว์','ระยำ','ชาติหมา','พ่อมึง','แม่มึง','ส้นตีน','สันตีน',
    'fuck','fck','f u c k','shit','bitch','asshole','dick','cunt','porn','xxx',
    'slut','whore','bastard','nigger','nigga',
  ];
  const URL_RE    = /(https?:\/\/|www\.|\.com|\.net|\.shop|\.co|bit\.ly|line\.me|t\.me)/i;
  const PHONE_RE  = /0[0-9][\s\-]?[0-9]{3,4}[\s\-]?[0-9]{3,4}/;
  const REPEAT_RE = /(.)\1{7,}/; // ตัวอักษรเดิมซ้ำ 8+ ครั้ง

  const RL_KEY = 'dmc_review_rl_v1';

  function normalizeForCheck(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[\s\.\-_\*\u200b]/g, '')   // ลบช่องว่าง/จุด/ขีด/zero-width กัน "เ หี้ ย"
      .replace(/[0๐]/g, 'o');
  }

  // ─── ตรวจรีวิวก่อนส่ง — คืน {ok, reason} ───
  function moderate(name, text, rating) {
    const t = String(text || '').trim();
    const n = String(name || '').trim();

    if (n.length < 2)  return { ok: false, reason: 'กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร' };
    if (n.length > 40) return { ok: false, reason: 'ชื่อยาวเกินไป (สูงสุด 40 ตัวอักษร)' };
    if (t.length < 10) return { ok: false, reason: 'รีวิวสั้นเกินไป กรุณาเขียนอย่างน้อย 10 ตัวอักษร' };
    if (t.length > 500) return { ok: false, reason: 'รีวิวยาวเกินไป (สูงสุด 500 ตัวอักษร)' };
    if (!rating || rating < 1 || rating > 5) return { ok: false, reason: 'กรุณาให้คะแนนดาว' };

    if (URL_RE.test(t) || URL_RE.test(n))   return { ok: false, reason: 'ไม่อนุญาตให้ใส่ลิงก์ในรีวิว' };
    if (PHONE_RE.test(t))                   return { ok: false, reason: 'ไม่อนุญาตให้ใส่เบอร์โทรในรีวิว' };
    if (REPEAT_RE.test(t))                  return { ok: false, reason: 'ข้อความมีตัวอักษรซ้ำผิดปกติ' };

    const norm = normalizeForCheck(n + ' ' + t);
    for (const w of BAD_WORDS) {
      if (norm.includes(normalizeForCheck(w))) {
        return { ok: false, reason: 'พบคำไม่เหมาะสมในรีวิว กรุณาแก้ไข' };
      }
    }
    return { ok: true };
  }

  // ─── Rate limit ต่อเครื่อง: 1 รีวิว/สินค้า/วัน และ 3 รีวิว/วัน รวม ───
  function checkRateLimit(productId) {
    let data;
    try { data = JSON.parse(localStorage.getItem(RL_KEY) || '{}'); } catch (e) { data = {}; }
    const today = new Date().toISOString().slice(0, 10);
    if (data.date !== today) data = { date: today, total: 0, products: {} };

    if (data.products[productId]) return { ok: false, reason: 'คุณรีวิวสินค้านี้ไปแล้ววันนี้ ขอบคุณครับ 🙏' };
    if (data.total >= 3)          return { ok: false, reason: 'รีวิวได้สูงสุด 3 ครั้งต่อวัน' };
    return { ok: true, data };
  }

  function recordRateLimit(data, productId) {
    data.products[productId] = true;
    data.total = (data.total || 0) + 1;
    try { localStorage.setItem(RL_KEY, JSON.stringify(data)); } catch (e) {}
  }

  // ─── ส่งรีวิว (ผ่านทุกตัวกรองแล้วเท่านั้น) ───
  async function submit(db, { productId, productName, name, rating, text, honeypot }) {
    // honeypot — bot จะกรอกช่องซ่อน
    if (honeypot) return { ok: false, reason: 'ไม่สามารถส่งรีวิวได้' };

    const mod = moderate(name, text, rating);
    if (!mod.ok) return mod;

    const rl = checkRateLimit(productId);
    if (!rl.ok) return rl;

    try {
      await db.collection('reviews').add({
        productId,
        productName: productName || '',
        name:   String(name).trim().slice(0, 40),
        rating: Number(rating),
        text:   String(text).trim().slice(0, 500),
        status: 'pending',                      // ← Admin ต้องอนุมัติก่อนแสดง
        source: 'customer',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      recordRateLimit(rl.data, productId);
      return { ok: true };
    } catch (e) {
      console.error('Review submit error:', e);
      return { ok: false, reason: 'ส่งรีวิวไม่สำเร็จ กรุณาลองใหม่' };
    }
  }

  // ─── ดึงรีวิวที่อนุมัติแล้ว ───
  async function fetchApproved(db, productId, limit) {
    // วิธีหลัก: query ตรง (เร็ว — แต่ถ้ามี productId จะต้องมี composite index)
    try {
      let q = db.collection('reviews').where('status', '==', 'approved');
      if (productId) q = q.where('productId', '==', productId);
      const snap = await q.limit(limit || 50).get();
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      return list;
    } catch (e) {
      // V16 Fallback: ยังไม่ได้สร้าง composite index → กรองสถานะฝั่ง client (ไม่ต้องมี index)
      //              ทำให้รีวิวต่อสินค้าแสดงผลได้แม้ยังไม่สร้าง index (index = ทำให้เร็วขึ้นเฉยๆ)
      if (productId) {
        try {
          const snap = await db.collection('reviews').where('productId', '==', productId).limit((limit || 50) * 4).get();
          const list = [];
          snap.forEach(doc => { const x = doc.data(); if (x.status === 'approved') list.push({ id: doc.id, ...x }); });
          list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          return list.slice(0, limit || 50);
        } catch (e2) { console.warn('Reviews fallback failed:', e2.message); }
      }
      console.warn('Reviews fetch failed:', e.message);
      return [];
    }
  }

  // ─── HTML ดาว ───
  function starsHtml(rating) {
    const r = Math.round(Number(rating) || 0);
    let html = '';
    for (let i = 1; i <= 5; i++) html += '<span class="rv-star ' + (i <= r ? 'on' : '') + '">★</span>';
    return '<span class="rv-stars" aria-label="' + r + ' ดาว">' + html + '</span>';
  }

  function avgRating(list) {
    if (!list.length) return 0;
    return list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / list.length;
  }

  // ─── การ์ดรีวิว ───
  function cardHtml(r) {
    const date = r.createdAt?.toDate ? DMC.formatDate(r.createdAt) : '';
    const badge = r.source === 'admin'
      ? '<span class="rv-badge-shop">🏪 รีวิวจากร้าน</span>'
      : '<span class="rv-badge-verified">✓ ลูกค้า</span>';
    return [
      '<div class="rv-card">',
        '<div class="rv-card-head">',
          '<div class="rv-avatar">' + DMC.escapeHtml((r.name || '?').charAt(0).toUpperCase()) + '</div>',
          '<div class="rv-meta">',
            '<div class="rv-name">' + DMC.escapeHtml(r.name || 'ลูกค้า') + ' ' + badge + '</div>',
            '<div class="rv-sub">' + starsHtml(r.rating) + (date ? '<span class="rv-date">' + date + '</span>' : '') + '</div>',
          '</div>',
        '</div>',
        '<div class="rv-text">' + DMC.escapeHtml(r.text || '') + '</div>',
        (r.productName && !r._hideProduct ? '<div class="rv-product">📦 ' + DMC.escapeHtml(r.productName) + '</div>' : ''),
      '</div>'
    ].join('');
  }

  return { moderate, submit, fetchApproved, starsHtml, avgRating, cardHtml };
})();
