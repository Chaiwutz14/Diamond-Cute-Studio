/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — analytics.js (V37)
   ระบบเก็บสถิติผู้เข้าชม (ฝั่งลูกค้า) — น้ำหนักเบา ประหยัดโควต้า

   เก็บอะไรบ้าง (เขียนลง Firestore แบบ increment เท่านั้น):
   • stats/{YYYY-MM-DD}  — สถิติรายวัน 1 doc/วัน
       pv   = page views                 ss   = sessions (ผู้เข้าชม)
       eng  = session ที่ดู ≥2 หน้า       dur  = เวลารวมบนเว็บ (วินาที)
       dAnd dIos dWin dMac dTab dOth     = อุปกรณ์ (นับต่อ session)
       bChr bSaf bEdg bFox bSam bOth     = เบราว์เซอร์ (นับต่อ session)
       sGoo sFb sLine sTt sDir sRef      = ที่มา traffic (นับต่อ session)
       sq   = จำนวนค้นหา   pc = คลิกสินค้า   err = JS error   e404 = หน้า 404
   • productStats/{productId} — v = เข้าชมหน้าสินค้า, c = คลิกการ์ดสินค้า

   หลักการความปลอดภัย/ต้นทุน:
   - เขียนแบบ fire-and-forget + try/catch ทุกจุด → พังเงียบ ไม่กระทบหน้าเว็บ
   - 1 pageview = 1 write (รวมทุก field ในครั้งเดียว) / คลิกสินค้า = 1 write
   - ไม่เก็บข้อมูลส่วนตัว (ไม่มี IP, ไม่มีชื่อ, ไม่มี fingerprint)
   - แอดมิน (มี session หลังบ้านค้างอยู่) = ไม่นับ กันสถิติเพี้ยน
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── ค่าคงที่ ──
  var SS_KEY   = 'dca_session_v1';     // sessionStorage: ข้อมูล session ปัจจุบัน
  var MAX_ERR  = 5;                     // จำกัดการนับ error ต่อ session (กัน loop เผาโควต้า)
  var DUR_CAP  = 600;                   // ช่วงเวลาระหว่างหน้า นับสูงสุด 600 วิ (กันเปิดค้างข้ามคืน)

  var db = null, ready = null, errCount = 0;

  // ── ข้าม: หน้าแอดมิน / แอดมินกำลังใช้งาน / เปิดจากไฟล์ ──
  function isAdminContext() {
    try {
      if (/admin/i.test(location.pathname)) return true;
      if (sessionStorage.getItem('dmc_admin_session')) return true;
    } catch (e) {}
    return false;
  }

  function todayKey() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  // ── ตรวจอุปกรณ์ / เบราว์เซอร์ / ที่มา (แบบง่าย ไม่ fingerprint) ──
  function detectDevice() {
    var ua = navigator.userAgent || '';
    var isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
      (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua)); // iPadOS ปลอมเป็น Mac
    if (isTablet) return 'dTab';
    if (/iPhone|iPod/i.test(ua)) return 'dIos';
    if (/Android/i.test(ua))     return 'dAnd';
    if (/Windows/i.test(ua))     return 'dWin';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'dMac';
    return 'dOth';
  }
  function detectBrowser() {
    var ua = navigator.userAgent || '';
    if (/SamsungBrowser/i.test(ua)) return 'bSam';
    if (/Edg\//i.test(ua))          return 'bEdg';
    if (/Firefox\//i.test(ua))      return 'bFox';
    if (/CriOS|Chrome\//i.test(ua)) return 'bChr';
    if (/Safari\//i.test(ua))       return 'bSaf';
    return 'bOth';
  }
  function detectSource() {
    try {
      var u = new URL(location.href);
      var utm = (u.searchParams.get('utm_source') || '').toLowerCase();
      var ref = (document.referrer || '').toLowerCase();
      var host = ref ? new URL(ref).hostname : '';
      var self_ = location.hostname;
      if (utm.indexOf('facebook') >= 0 || utm === 'fb' || /facebook\.com|fb\.com|l\.messenger/.test(host)) return 'sFb';
      if (utm.indexOf('line') >= 0   || /line\.me|liff/.test(host))    return 'sLine';
      if (utm.indexOf('tiktok') >= 0 || /tiktok\.com/.test(host))      return 'sTt';
      if (utm.indexOf('google') >= 0 || /google\./.test(host))         return 'sGoo';
      if (!ref || host === self_)                                      return 'sDir';
      return 'sRef';
    } catch (e) { return 'sDir'; }
  }

  // ── Session (sessionStorage — หมดเมื่อปิดแท็บ) ──
  function getSess() {
    try { return JSON.parse(sessionStorage.getItem(SS_KEY) || 'null'); } catch (e) { return null; }
  }
  function setSess(s) {
    try { sessionStorage.setItem(SS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  // ── Firestore ──
  function getDb() {
    if (ready) return ready;
    ready = (window.DMC && DMC.getFirebaseReady)
      ? DMC.getFirebaseReady().then(function (d) { db = d; return d; }).catch(function () { return null; })
      : Promise.resolve(null);
    return ready;
  }
  function inc(n) { return firebase.firestore.FieldValue.increment(n); }

  // เขียนสถิติรายวัน (merge + increment) — data = { field: จำนวนที่บวก }
  function writeDaily(data) {
    getDb().then(function (d) {
      if (!d) return;
      try {
        var payload = { day: todayKey(), lastAt: firebase.firestore.FieldValue.serverTimestamp() };
        Object.keys(data).forEach(function (k) { payload[k] = inc(data[k]); });
        d.collection('stats').doc(todayKey()).set(payload, { merge: true }).catch(function () {});
      } catch (e) {}
    });
  }
  function writeProduct(pid, field) {
    if (!pid || !/^[\w-]{1,60}$/.test(pid)) return;
    getDb().then(function (d) {
      if (!d) return;
      try {
        var payload = { lastAt: firebase.firestore.FieldValue.serverTimestamp() };
        payload[field] = inc(1);
        d.collection('productStats').doc(pid).set(payload, { merge: true }).catch(function () {});
      } catch (e) {}
    });
  }

  // ── Page view + session ──
  function trackPageView() {
    var now = Date.now();
    var s = getSess();
    var data = { pv: 1 };

    if (!s) {
      // session ใหม่ → นับผู้เข้าชม + อุปกรณ์ + เบราว์เซอร์ + ที่มา (ครั้งเดียวต่อ session)
      s = { start: now, last: now, views: 1, engaged: false };
      data.ss = 1;
      data[detectDevice()]  = 1;
      data[detectBrowser()] = 1;
      data[detectSource()]  = 1;
    } else {
      // หน้า ≥2 ของ session → engaged (นับครั้งเดียว) + สะสมเวลาบนเว็บ
      s.views = (s.views || 0) + 1;
      var delta = Math.round((now - (s.last || now)) / 1000);
      if (delta > 0) data.dur = Math.min(delta, DUR_CAP);
      if (!s.engaged) { s.engaged = true; data.eng = 1; }
      s.last = now;
    }
    setSess(s);

    // หน้า 404 → นับแยก
    // GitHub Pages เสิร์ฟ 404.html แต่ URL ยังเป็นลิงก์ที่พัง → ตรวจจาก data-page ใน <body>
    if (/404\.html$/i.test(location.pathname) ||
        (document.body && document.body.getAttribute('data-page') === '404')) data.e404 = 1;

    writeDaily(data);
  }

  // ── หน้าสินค้า → นับเข้าชมสินค้า ──
  function trackProductView() {
    if (!/product\.html$/i.test(location.pathname)) return;
    try {
      var pid = new URLSearchParams(location.search).get('id');
      if (pid) writeProduct(pid, 'v');
    } catch (e) {}
  }

  // ── คลิกการ์ดสินค้า (หน้าแรก/แคตตาล็อก) → นับคลิก ──
  function bindProductClicks() {
    document.addEventListener('click', function (e) {
      var card = e.target.closest && e.target.closest('.product-card[data-id]');
      if (!card) return;
      writeProduct(card.dataset.id, 'c');
      writeDaily({ pc: 1 });
    }, { capture: true, passive: true });
  }

  // ── JS Error → นับ (จำกัด 5 ครั้ง/session) ──
  function bindErrorMonitor() {
    window.addEventListener('error', function () {
      if (errCount >= MAX_ERR) return;
      errCount++;
      writeDaily({ err: 1 });
    });
    window.addEventListener('unhandledrejection', function () {
      if (errCount >= MAX_ERR) return;
      errCount++;
      writeDaily({ err: 1 });
    });
  }

  // ── API สาธารณะ (ให้โมดูลอื่นเรียกนับได้ เช่น catalog นับคำค้น) ──
  window.DCA = {
    count: function (field, n) {
      var allow = ['sq', 'pc', 'err', 'e404', 'bnImp', 'bnClick'];
      if (allow.indexOf(field) < 0) return;
      writeDaily((function () { var o = {}; o[field] = Math.max(1, Math.min(n || 1, 20)); return o; })());
    },
    productView:  function (pid) { writeProduct(pid, 'v'); },
    productClick: function (pid) { writeProduct(pid, 'c'); },
  };

  // ── Boot ──
  function boot() {
    if (isAdminContext()) return;         // ไม่นับแอดมิน
    if (!window.DMC_CONFIG) return;       // config ยังไม่พร้อม = ข้าม
    trackPageView();
    trackProductView();
    bindProductClicks();
    bindErrorMonitor();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
