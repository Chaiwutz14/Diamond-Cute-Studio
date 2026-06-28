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
      // V.upgrade1: ค่าเริ่มต้นเป็นค่าว่าง — ไม่มีลิงก์ตัวอย่างหลุดออกหน้าเว็บ
      // แอดมินกรอกจริงที่ หลังบ้าน → เนื้อหาเว็บไซต์ → ช่องทางติดต่อ
      line:      '',
      lineLabel: '',
      facebook:  '',
      instagram: '',
      tiktok:    '',
      email:     '',
      phone:     '',
      hours:     'จันทร์–เสาร์ 9:00–19:00 น.',
    },
    payment: {
      promptpayId:   '',      // เบอร์/เลขบัตรประชาชนพร้อมเพย์ — ใช้สร้าง QR อัตโนมัติ
      promptpayName: '',      // ชื่อบัญชี แสดงใต้ QR
      qrImageUrl:    '',      // ถ้าอัปโหลดรูป QR เอง จะใช้รูปนี้แทน QR อัตโนมัติ
      // ช่องทางชำระเงิน — แอดมินเปิด/ปิด + ตั้งสถานะพร้อม/ไม่พร้อมได้
      // shown = แสดงในหน้าเว็บ, ready = กดเลือกได้ (false = ขึ้น "เร็วๆ นี้")
      methods: {
        promptpay: { shown: true,  ready: true  },
        cod:       { shown: true,  ready: true  },
        truemoney: { shown: false, ready: false },
        credit:    { shown: false, ready: false },
      },
    },
    // ── ค่าส่ง / ค่าธรรมเนียม / ค่าเพิ่มตามช่องทางจ่าย (แอดมินแก้ได้จากหลังบ้าน) ──
    // V16: ค่าเริ่มต้นดึงจาก config.js (SHIPPING) ให้ตรงกัน — กันยอดเพี้ยน 50/80 vs 35/40
    fees: {
      shipTransfer:  (((window.DMC_CONFIG || {}).SHIPPING || {}).transfer ?? 50),  // ค่าจัดส่ง เมื่อโอน/PromptPay
      shipCod:       (((window.DMC_CONFIG || {}).SHIPPING || {}).cod ?? 80),        // ค่าจัดส่ง COD (รวมค่าธรรมเนียมปลายทางแล้ว)
      freeShipMin:   0,    // ส่งฟรีเมื่อยอดสินค้าถึงเท่านี้ (0 = ปิด)
      surchargePromptpay: 0, // ค่าธรรมเนียมเพิ่มเมื่อจ่าย PromptPay
      surchargeCod:       0, // ค่าธรรมเนียมเพิ่มเมื่อจ่าย COD (นอกเหนือค่าส่ง)
    },
    faq: [
      { q: 'ใช้เวลาผลิตกี่วัน?',        a: 'ส่วนใหญ่ 1-3 วันทำการ ขึ้นกับจำนวนและประเภทงาน หากเร่งด่วนแจ้งทาง LINE ได้เลยครับ' },
      { q: 'ส่งไฟล์รูปทางไหน?',         a: 'แนบไฟล์ตอนสั่งซื้อได้เลย หรือส่งทาง LINE หลังสั่งซื้อก็ได้ครับ' },
      { q: 'ชำระเงินยังไงได้บ้าง?',      a: 'โอนผ่าน PromptPay หรือเก็บเงินปลายทาง (COD) ครับ' },
      { q: 'แก้ไขงานได้ไหม?',           a: 'แก้ไขได้ฟรีก่อนเริ่มผลิต หลังผลิตแล้วขึ้นกับกรณีครับ' },
    ],
    announce: { active: false, text: '' },
    // เนื้อหาหน้าต่างๆ ที่แอดมินแก้ inline บนหน้าบ้านได้
    pages: {
      about: {
        title:    'วิธีสั่งซื้อ',
        subtitle: 'สั่งง่ายๆ ไม่กี่ขั้นตอน ส่งทั่วไทย',
        stepsHead: '🚀 ขั้นตอนการสั่งซื้อ',
      },
      gallery: {
        title:    'ตัวอย่างงาน',
        subtitle: 'ผลงานจริงจากลูกค้า คุณภาพที่คุณมั่นใจได้',
      },
    },
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
      } else if (over[k] !== undefined && over[k] !== null) {
        // V.upgrade1: ยอมให้ค่าว่าง ('') ทับ default ได้ → แอดมินล้างช่องแล้วค่าหายจริง
        // (ไม่เด้งกลับเป็นลิงก์ตัวอย่าง เช่น tiktok.com/@youraccount)
        out[k] = over[k];
      } else if (out[k] === undefined) {
        out[k] = base ? base[k] : undefined;
      }
    }
    return out;
  }

  // ─── โหลดเนื้อหา (cache → snapshot → Firestore → defaults) ───
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

      // 2) V24/PERF-B: ลอง snapshot (data/sitecontent.json) ก่อน → หน้าแรกไม่ต้องโหลด Firebase
      try {
        if (DMC.loadSnapshotObject) {
          const snap = await DMC.loadSnapshotObject('sitecontent');
          const data = (snap && snap.data) ? snap.data : (snap && !snap.generatedAt ? snap : null);
          if (data) {
            try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch (e) {}
            return mergeDeep(DEFAULTS, data);
          }
        }
      } catch (e) { /* ไม่มีไฟล์ snapshot — ข้ามไป Firestore */ }

      // 3) โหลดจาก Firestore (fallback)
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

  // ─── สร้างลิงก์แชท LINE OA พร้อมข้อความทักทาย ───
  // ใช้ทุกที่: navbar, FAB, footer, หน้าติดต่อ, ปุ่ม "เพิ่มเติม"
  function lineChat(contact, message) {
    contact = contact || {};
    var msg = message || 'สวัสดีครับ สนใจสอบถาม/สั่งทำงานกับทางร้านครับ 🙏';
    // หา LINE OA id (@xxx)
    var oaId = (contact.lineLabel || '').trim();
    if (!oaId && contact.line) {
      var m = contact.line.match(/@[\w.\-]+/);
      if (m) oaId = m[0];
      else {
        var m2 = contact.line.match(/ti\/p\/([^/?]+)/) || contact.line.match(/oaMessage\/([^/?]+)/);
        if (m2) oaId = m2[1].indexOf('@') === 0 ? m2[1] : '@' + m2[1];
      }
    }
    if (oaId) {
      var at = oaId.indexOf('@') === 0 ? oaId : '@' + oaId;
      return 'https://line.me/R/oaMessage/' + encodeURIComponent(at) + '/?' + encodeURIComponent(msg);
    }
    // ไม่มี OA id → เปิดแชทปกติ (fallback)
    return contact.line || '#';
  }

  return { get, clearCache, promptpayQR, setText, lineChat, DEFAULTS };
})();
