/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — CMS Loader V12
   js/cms.js

   โหลดเนื้อหาเว็บไซต์จาก Firestore (siteContent/main)
   Admin แก้ไขได้จากหลังบ้าน → หน้าบ้านอัปเดตเอง
   มี defaults ครบ — ถ้า Firestore ยังไม่มีข้อมูลก็แสดงค่าเริ่มต้น
═══════════════════════════════════════════════ */
'use strict';

window.CMS = (function(){

  // ─── ค่าเริ่มต้นทั้งหมด (fallback ถ้ายังไม่ตั้งค่าจากหลังบ้าน) ───
  const DEFAULTS = {
    hero: {
      badge:  'งานคุณภาพ · ส่งทั่วไทย · รับประกันความพอใจ',
      title1: 'ทำให้ทุกภาพ',
      title2: 'กลายเป็นของที่ระลึก',
      title3: 'ที่สวยงามที่สุด',
      desc:   'บริการพิมพ์ภาพโพลารอยด์ นามบัตร บัตรแขวนคอ บัตรนักเรียน\nป้ายร้านค้า QR Code ป้ายตุ๊กตา และอีกมากมาย',
    },
    promo: {
      active:  true,
      tag:     '🎁 โปรโมชั่นพิเศษ',
      title:   'ออเดอร์แรก ลด 15%',
      desc:    'สั่งครั้งแรกรับส่วนลดทันที ไม่มีขั้นต่ำ ส่งทั่วประเทศไทย',
      btnText: 'สั่งเลย →',
      btnLink: 'catalog.html',
    },
    stats: {
      orders:    '500+',
      rating:    '4.9/5',
      days:      '1-3',
      guarantee: 'รับประกัน',
    },
    contact: {
      line:      'https://line.me/R/ti/p/@your_line_oa',
      lineLabel: '@your_line_oa',
      facebook:  'https://facebook.com/yourpage',
      instagram: 'https://instagram.com/youraccount',
      tiktok:    'https://tiktok.com/@youraccount',
      email:     'contact@example.com',
      phone:     '08x-xxx-xxxx',
      hours:     'จันทร์–เสาร์ 9:00–19:00 น.',
    },
    payment: {
      promptpayId:   '',      // เบอร์/เลขบัตรประชาชนพร้อมเพย์ — ใช้สร้าง QR อัตโนมัติ
      promptpayName: '',      // ชื่อบัญชี แสดงใต้ QR
      qrImageUrl:    '',      // ถ้าอัปโหลดรูป QR เอง จะใช้รูปนี้แทน QR อัตโนมัติ
    },
    faq: [
      { q: 'ใช้เวลาผลิตกี่วัน?',        a: 'ส่วนใหญ่ 1-3 วันทำการ ขึ้นกับจำนวนและประเภทงาน หากเร่งด่วนแจ้งทาง LINE ได้เลยครับ' },
      { q: 'ส่งไฟล์รูปทางไหน?',         a: 'แนบไฟล์ตอนสั่งซื้อได้เลย หรือส่งทาง LINE หลังสั่งซื้อก็ได้ครับ' },
      { q: 'ชำระเงินยังไงได้บ้าง?',      a: 'โอนผ่าน PromptPay หรือเก็บเงินปลายทาง (COD) ครับ' },
      { q: 'แก้ไขงานได้ไหม?',           a: 'แก้ไขได้ฟรีก่อนเริ่มผลิต หลังผลิตแล้วขึ้นกับกรณีครับ' },
    ],
    announce: { active: false, text: '' },
  };

  const CACHE_KEY = 'dmc_cms_cache_v1';
  const CACHE_TTL = 3 * 60 * 1000; // 3 นาที

  let _promise = null;

  // ─── deep merge: เติม defaults ในส่วนที่ Firestore ไม่มี ───
  function mergeDeep(base, over) {
    if (!over || typeof over !== 'object') return base;
    const out = Array.isArray(base) ? (Array.isArray(over) && over.length ? over : base)
                                    : Object.assign({}, base);
    if (Array.isArray(base)) return out;
    for (const k of Object.keys(over)) {
      if (base && typeof base[k] === 'object' && !Array.isArray(base[k]) && over[k] && typeof over[k] === 'object' && !Array.isArray(over[k])) {
        out[k] = mergeDeep(base[k], over[k]);
      } else if (over[k] !== undefined && over[k] !== null && over[k] !== '') {
        out[k] = over[k];
      } else if (out[k] === undefined) {
        out[k] = base ? base[k] : undefined;
      }
    }
    return out;
  }

  // ─── โหลดเนื้อหา (cache → Firestore → defaults) ───
  function get() {
    if (_promise) return _promise;

    _promise = (async () => {
      // 1) ลอง sessionStorage cache ก่อน (เร็ว)
      try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
        if (cached && (Date.now() - cached.at) < CACHE_TTL) {
          return mergeDeep(DEFAULTS, cached.data);
        }
      } catch (e) { /* cache เสีย — ข้าม */ }

      // 2) โหลดจาก Firestore
      try {
        const db   = await DMC.getFirebaseReady();
        const doc  = await db.collection('siteContent').doc('main').get();
        const data = doc.exists ? doc.data() : {};
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
        } catch (e) { /* storage เต็ม — ข้าม */ }
        return mergeDeep(DEFAULTS, data);
      } catch (e) {
        console.warn('CMS load failed, using defaults:', e.message);
        return DEFAULTS;
      }
    })();

    return _promise;
  }

  // ─── ล้าง cache (Admin เรียกหลังบันทึก) ───
  function clearCache() {
    try { sessionStorage.removeItem(CACHE_KEY); } catch (e) {}
    _promise = null;
  }

  // ─── PromptPay QR URL: ใช้รูปอัปโหลดก่อน ไม่มีจึงสร้างจาก promptpay.io ───
  function promptpayQR(payment, amount) {
    if (payment.qrImageUrl) return payment.qrImageUrl;
    if (payment.promptpayId) {
      const id  = String(payment.promptpayId).replace(/\D/g, '');
      const amt = amount > 0 ? '/' + Number(amount).toFixed(2) : '';
      return 'https://promptpay.io/' + id + amt;
    }
    return '';
  }

  // ─── ตัวช่วยใส่ข้อความลง element ถ้ามี ───
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
  }

  return { get, clearCache, promptpayQR, setText, DEFAULTS };
})();
