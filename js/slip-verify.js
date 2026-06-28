/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — ตรวจสลิปอัตโนมัติ
   js/slip-verify.js   (โหลดหลัง js/utils.js + js/vendor/jsqr.min.js)

   2 ชั้น:
   1) ฟรี (ฝั่ง client): อ่าน QR ในสลิปด้วย jsQR → เช็กว่าเป็นสลิปจริง
      + กันสลิปซ้ำ (อ้างอิง QR เดิมถูกใช้ไปแล้ว) ผ่าน collection slipGuard
   2) (ออปชัน) API จริง: ถ้าเปิด SLIP_VERIFY.api.enabled จะส่งให้ Worker
      /verify-slip ตรวจกับธนาคาร (ยอด/ผู้รับ) — ปิดไว้ก่อน ไม่มีค่าใช้จ่าย

   หมายเหตุ: โหมดฟรีตรวจได้แค่ "เป็นสลิปจริงและไม่ซ้ำ" — ไม่เช็กยอดเงิน
   (ต้องใช้โหมด API ถึงจะยืนยันยอด/ปลายทางได้)
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const CFG = () => (window.DMC_CONFIG || {}).SLIP_VERIFY || {};

  // ─── โหลด File รูป → ImageData (ย่อด้านยาวสุดไม่เกิน maxDim) ───
  async function fileToImageData(file, maxDim) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const im = new Image();
        im.onload  = () => res(im);
        im.onerror = () => rej(new Error('โหลดรูปไม่สำเร็จ'));
        im.src = url;
      });
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      const scale = Math.min(1, maxDim / Math.max(w, h || 1));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      return ctx.getImageData(0, 0, w, h);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // ─── V24/PERF-B: โหลด jsQR (256KB) แบบ lazy เฉพาะตอนต้องสแกนสลิปจริง ───
  let _jsqrPromise = null;
  function ensureJsQR() {
    if (typeof window.jsQR === 'function') return Promise.resolve(true);
    if (_jsqrPromise) return _jsqrPromise;
    _jsqrPromise = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'js/vendor/jsqr.min.js';
      s.async = true;
      s.onload = () => resolve(typeof window.jsQR === 'function');
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
    return _jsqrPromise;
  }

  // ─── อ่าน QR จากรูป (ลองหลายความละเอียด — QR ในสลิปมักเล็ก) ───
  async function decodeQR(file) {
    const ready = await ensureJsQR();
    if (!ready || typeof window.jsQR !== 'function') throw new Error('jsQR ยังไม่พร้อม');
    for (const dim of [1600, 2600]) {
      let id;
      try { id = await fileToImageData(file, dim); } catch (e) { continue; }
      const code = window.jsQR(id.data, id.width, id.height, { inversionAttempts: 'attemptBoth' });
      if (code && code.data) return code.data;
    }
    return null;
  }

  // ─── ref ที่อ่านง่ายสำหรับแอดมิน (ตัดจากเนื้อ QR) ───
  function readableRef(raw) {
    const s = String(raw).replace(/\s+/g, '');
    const alnum = s.replace(/[^A-Za-z0-9]/g, '');
    return (alnum.slice(0, 28) || s.slice(0, 28));
  }

  async function safeHash(str) {
    try {
      if (window.DMC && DMC.sha256) return await DMC.sha256(str);
    } catch (e) {}
    // fallback แบบเบา (ไม่ปลอดภัยเชิง crypto แต่พอใช้เป็นคีย์กันซ้ำ)
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    return 'h' + (h >>> 0).toString(16) + '_' + str.length;
  }

  async function getDbSafe() {
    try {
      if (window.DMC && DMC.getDb && DMC.getDb()) return DMC.getDb();
      if (window.DMC && DMC.getFirebaseReady) return await DMC.getFirebaseReady();
    } catch (e) {}
    return null;
  }

  // ─── กันสลิปซ้ำ: เช็กว่า ref นี้ถูกใช้ไปแล้วหรือยัง (อ่านทีละ doc — rules อนุญาต) ───
  async function isDuplicate(refHash) {
    if (!refHash) return false;
    try {
      const db = await getDbSafe();
      if (!db) return false;                          // fail-open: ไม่มี db ก็ปล่อยผ่าน
      const d = await db.collection('slipGuard').doc(refHash).get();
      return d.exists;
    } catch (e) {
      console.warn('slip dedup check skipped:', e.message);
      return false;                                   // fail-open
    }
  }

  // ─── บันทึกว่า ref นี้ถูกใช้แล้ว (เรียกหลังบันทึกออเดอร์สำเร็จ) ───
  async function recordSlipUsed(refHash, orderId) {
    if (!refHash) return;
    try {
      const db = await getDbSafe();
      if (!db) return;
      const payload = { orderId: orderId || '' };
      try { payload.at = firebase.firestore.FieldValue.serverTimestamp(); } catch (e) {}
      await db.collection('slipGuard').doc(refHash).set(payload);
    } catch (e) {
      console.warn('record slip used skipped:', e.message);
    }
  }

  // ─── (ออปชัน) ตรวจกับธนาคารผ่าน Worker /verify-slip ───
  async function verifyViaApi(file, orderTotal) {
    const api  = CFG().api || {};
    const base = api.url || (((window.DMC_CONFIG || {}).CF_WORKER_URL || '') + '/verify-slip');
    if (!base) return null;
    const fd = new FormData();
    fd.append('image', file);
    fd.append('amount', String(orderTotal || 0));
    const _k = (((window.DMC_CONFIG || {}).CF_CLIENT_KEY) || '').trim();
    const _h = _k ? { 'X-DMC-Key': _k } : {};
    const res = await fetch(base, { method: 'POST', body: fd, headers: _h });
    if (!res.ok) throw new Error('verify-slip ' + res.status);
    return await res.json();   // { ok, amount, ref, receiver, sender, reason }
  }

  // ─── หลัก: ตรวจสลิป → คืนผลให้ฝั่งสั่งซื้อใช้ ───
  // คืน { status:'passed'|'failed'|'unverified', reason, ref, refHash, provider, amount, checkedAt }
  async function verifySlip(file, opts) {
    opts = opts || {};
    const cfg = CFG();

    if (!cfg.enabled) {
      return { status: 'unverified', reason: 'ปิดการตรวจอัตโนมัติ', ref: '', refHash: '', provider: 'local', amount: null };
    }
    if (!file || !/^image\//.test(file.type || '')) {
      return { status: 'failed', reason: 'ไฟล์ที่แนบไม่ใช่รูปภาพ', ref: '', refHash: '', provider: 'local', amount: null };
    }

    // (1) โหมดฟรี — อ่าน QR
    let payload = null;
    try { payload = await decodeQR(file); }
    catch (e) {
      // jsQR ไม่พร้อม → ตรวจไม่ได้ ไม่ถือว่าผิด
      return { status: 'unverified', reason: 'ตัวตรวจสลิปยังไม่พร้อม', ref: '', refHash: '', provider: 'local', amount: null };
    }

    let result;
    if (!payload) {
      result = { status: 'failed', reason: 'ไม่พบ QR ในรูป — อาจไม่ใช่สลิปโอนเงิน', ref: '', refHash: '', provider: 'local', amount: null };
    } else {
      const raw     = String(payload).trim();
      const ref     = readableRef(raw);
      const refHash = await safeHash(raw);
      if (raw.length < 8) {
        result = { status: 'failed', reason: 'QR ในรูปไม่ใช่สลิปโอนเงินที่ถูกต้อง', ref, refHash, provider: 'local', amount: null };
      } else if (await isDuplicate(refHash)) {
        result = { status: 'failed', reason: 'สลิปนี้ถูกใช้ไปแล้ว (อาจเป็นสลิปซ้ำ)', ref, refHash, provider: 'local', amount: null };
      } else {
        result = { status: 'passed', reason: 'สลิปถูกต้อง (ยังไม่ยืนยันยอดเงิน — รอแอดมินตรวจยอด)', ref, refHash, provider: 'local', amount: null };
      }
    }

    // (2) โหมด API จริง (ถ้าเปิด) — ผลจากธนาคารถือเป็นหลัก
    if (cfg.api && cfg.api.enabled) {
      try {
        const api = await verifyViaApi(file, opts.orderTotal);
        if (api) {
          result.provider = cfg.api.provider || 'api';
          if (api.amount != null) result.amount = Number(api.amount);
          if (api.ref) { result.ref = readableRef(api.ref); result.refHash = await safeHash(String(api.ref)); }

          if (api.ok === false) {
            result.status = 'failed';
            result.reason = api.reason || 'ตรวจกับธนาคารไม่ผ่าน';
          } else if (api.ok === true) {
            const total = Number(opts.orderTotal || 0);
            if (total > 0 && result.amount != null && Math.abs(result.amount - total) > 0.5) {
              result.status = 'failed';
              result.reason = 'ยอดในสลิป (฿' + result.amount + ') ไม่ตรงยอดที่ต้องชำระ (฿' + total + ')';
            } else if (result.status !== 'failed') {
              result.status = 'passed';
              result.reason = 'ตรวจสลิปกับธนาคารผ่าน';
            }
          }
        }
      } catch (e) {
        console.warn('slip api verify failed:', e.message);   // คงผลโหมดฟรีไว้
      }
    }

    result.checkedAt = new Date().toISOString();
    return result;
  }

  // ─── export เข้า DMC ───
  if (!window.DMC) window.DMC = {};
  window.DMC.verifySlip     = verifySlip;
  window.DMC.recordSlipUsed = recordSlipUsed;
})();
