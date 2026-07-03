/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Order History V12
   js/order-history.js

   - แท็บ 1: ออเดอร์ในเครื่องนี้ (localStorage — ไม่ต้อง OTP)
   - แท็บ 2: ค้นหาด้วยเบอร์โทร + ยืนยัน OTP ผ่าน SMS (Firebase Phone Auth)
   - Stepper: รับออเดอร์ → จัดเตรียม → กำลังส่ง → ส่งสำเร็จ
   - เลขพัสดุ + ลิงก์ตรวจสอบกับขนส่ง
═══════════════════════════════════════════════ */
'use strict';

let db = null;
let _recaptcha = null;
let _confirmation = null;
let _countdownTimer = null;

// ─── สถานะออเดอร์ → ขั้นที่ (stepper) ───
const STATUS_STEPS = [
  { key: 'pending',    label: 'รับออเดอร์',  icon: '📥' },
  { key: 'processing', label: 'จัดเตรียม',   icon: '🛠️' },
  { key: 'shipping',   label: 'กำลังส่ง',    icon: '🚚' },
  { key: 'done',       label: 'ส่งสำเร็จ',   icon: '🎉' },
];

function statusIndex(status) {
  const i = STATUS_STEPS.findIndex(s => s.key === status);
  return i >= 0 ? i : 0;
}

// ─── ลิงก์ตรวจพัสดุของแต่ละขนส่ง (V26 · เช็คโดเมนจริงแล้ว 03/07/2026) ───
//   kerry: Kerry Express รีแบรนด์เป็น "KEX" → โดเมนใหม่ th.kex-express.com (โดเมนเก่า th.kerryexpress.com ตายแล้ว)
//   flash: โดเมนทางการไทยคือ .co.th (ตัว .com เป็นหน้า global/WAF)
//   jt:    หน้า track ใหม่ /service/track ไม่มีพารามิเตอร์เลขพัสดุแบบเปิดเผย → พาเข้าหน้า track แล้วให้ลูกค้าวางเลข (มีปุ่มคัดลอก 📋 ให้แล้ว)
const CARRIERS = {
  kerry:    { name: 'Kerry Express (KEX)', track: no => 'https://th.kex-express.com/th/track/?track=' + encodeURIComponent(no) },
  flash:    { name: 'Flash Express',       track: no => 'https://www.flashexpress.co.th/fle/tracking?se=' + encodeURIComponent(no) },
  jt:       { name: 'J&T Express',         track: () => 'https://www.jtexpress.co.th/service/track', paste: true },
  thaipost: { name: 'ไปรษณีย์ไทย',          track: no => 'https://track.thailandpost.co.th/?trackNumber=' + encodeURIComponent(no) },
};

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  try {
    db = await DMC.getFirebaseReady();
  } catch (e) {
    document.getElementById('device-orders-list').innerHTML =
      '<div class="track-empty">⚠️ เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่ภายหลัง</div>';
    return;
  }
  loadDeviceOrders();
  initOTPFlow();
});

// ══════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════
function initTabs() {
  const tabDevice = document.getElementById('tab-device');
  const tabPhone  = document.getElementById('tab-phone');
  const pDevice   = document.getElementById('panel-device');
  const pPhone    = document.getElementById('panel-phone');

  function activate(which) {
    const isDevice = which === 'device';
    tabDevice.classList.toggle('active', isDevice);
    tabPhone.classList.toggle('active', !isDevice);
    tabDevice.setAttribute('aria-selected', isDevice);
    tabPhone.setAttribute('aria-selected', !isDevice);
    pDevice.classList.toggle('active', isDevice);
    pPhone.classList.toggle('active', !isDevice);
  }
  tabDevice.addEventListener('click', () => activate('device'));
  tabPhone.addEventListener('click',  () => activate('phone'));
}

// ══════════════════════════════════════════════
//  TAB 1 — ออเดอร์ในเครื่องนี้ (localStorage)
// ══════════════════════════════════════════════
async function loadDeviceOrders() {
  const wrap = document.getElementById('device-orders-list');
  const mine = DMC.getMyOrders();

  if (!mine.length) {
    wrap.innerHTML = `
      <div class="track-empty">
        <div class="track-empty-icon">🗂️</div>
        <div class="track-empty-title">ยังไม่มีออเดอร์ในเครื่องนี้</div>
        <p>ออเดอร์ที่สั่งจากเครื่อง/เบราว์เซอร์นี้จะแสดงที่นี่อัตโนมัติ<br>
        หากสั่งจากเครื่องอื่น ใช้แท็บ <strong>"ค้นหาด้วยเบอร์โทร"</strong> ได้เลยครับ</p>
        <a href="catalog.html" class="btn btn-primary btn-md" style="margin-top:1rem">🛍️ เลือกซื้อสินค้า</a>
      </div>`;
    return;
  }

  wrap.innerHTML = '<div class="track-loading"><span class="spinner" style="display:block;margin:0 auto"></span></div>';

  try {
    const results = await Promise.all(mine.map(async (m) => {
      try {
        const doc = await db.collection('orders').doc(m.docId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
      } catch (e) { return null; }
    }));
    const orders = results.filter(Boolean);
    if (!orders.length) {
      wrap.innerHTML = '<div class="track-empty">ไม่พบข้อมูลออเดอร์ (อาจถูกลบจากระบบแล้ว)</div>';
      return;
    }
    renderOrderCards(wrap, orders);
  } catch (e) {
    wrap.innerHTML = '<div class="track-empty">⚠️ โหลดไม่สำเร็จ: ' + DMC.escapeHtml(e.message) + '</div>';
  }
}

// ══════════════════════════════════════════════
//  TAB 2 — OTP ผ่าน SMS (Firebase Phone Auth)
// ══════════════════════════════════════════════
function initOTPFlow() {
  const sendBtn   = document.getElementById('otp-send-btn');
  const verifyBtn = document.getElementById('otp-verify-btn');
  const resendBtn = document.getElementById('otp-resend-btn');
  const backBtn   = document.getElementById('otp-back-btn');
  const logoutBtn = document.getElementById('otp-logout-btn');
  const phoneIn   = document.getElementById('otp-phone');
  const codeIn    = document.getElementById('otp-code');

  // ถ้าเคยยืนยันไว้ใน session นี้ → แสดงผลทันที
  try {
    const saved = sessionStorage.getItem('dmc_verified_phone');
    if (saved) { showResults(saved); }
  } catch (e) {}

  sendBtn?.addEventListener('click', sendOTP);
  phoneIn?.addEventListener('keydown', e => { if (e.key === 'Enter') sendOTP(); });
  verifyBtn?.addEventListener('click', verifyOTP);
  codeIn?.addEventListener('keydown', e => { if (e.key === 'Enter') verifyOTP(); });
  resendBtn?.addEventListener('click', () => { resetToPhoneStep(); setTimeout(sendOTP, 100); });
  backBtn?.addEventListener('click', resetToPhoneStep);
  logoutBtn?.addEventListener('click', () => {
    try { sessionStorage.removeItem('dmc_verified_phone'); } catch (e) {}
    try { firebase.auth().signOut(); } catch (e) {}
    document.getElementById('otp-step-results').style.display = 'none';
    resetToPhoneStep();
  });

  async function sendOTP() {
    const errEl = document.getElementById('otp-phone-error');
    errEl.textContent = '';
    const raw    = phoneIn.value.trim();
    const digits = DMC.normalizePhone(raw);

    if (!/^0[0-9]{8,9}$/.test(digits)) {
      errEl.textContent = '❌ กรุณากรอกเบอร์โทรให้ถูกต้อง เช่น 0812345678';
      return;
    }
    if (!firebase.auth) {
      errEl.textContent = '❌ ระบบ OTP ยังไม่พร้อม กรุณาติดต่อร้านทาง LINE';
      return;
    }

    if (typeof Loading !== 'undefined') Loading.buttonLoad(sendBtn);
    try {
      // reCAPTCHA (invisible) — Firebase Phone Auth บังคับใช้
      if (!_recaptcha) {
        _recaptcha = new firebase.auth.RecaptchaVerifier('otp-send-btn', { size: 'invisible' });
      }
      _confirmation = await firebase.auth().signInWithPhoneNumber(DMC.toIntlPhone(digits), _recaptcha);

      // ไปขั้นกรอกรหัส
      document.getElementById('otp-step-phone').style.display = 'none';
      document.getElementById('otp-step-code').style.display  = '';
      document.getElementById('otp-sent-to').textContent = raw;
      codeIn.value = '';
      codeIn.focus();
      startCountdown();
    } catch (e) {
      console.error('OTP send error:', e);
      let msg = 'ส่งรหัสไม่สำเร็จ กรุณาลองใหม่';
      if (e.code === 'auth/too-many-requests')      msg = 'ส่งรหัสบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
      else if (e.code === 'auth/invalid-phone-number') msg = 'รูปแบบเบอร์โทรไม่ถูกต้อง';
      else if (e.code === 'auth/billing-not-enabled' || /billing/i.test(e.message || '')) msg = 'ระบบ OTP ยังไม่เปิดใช้งาน กรุณาติดต่อร้านทาง LINE เพื่อสอบถามออเดอร์';
      errEl.textContent = '❌ ' + msg;
      // reset recaptcha เพื่อให้ลองใหม่ได้
      try { _recaptcha.clear(); } catch (err) {}
      _recaptcha = null;
    } finally {
      if (typeof Loading !== 'undefined') Loading.buttonDone(sendBtn);
    }
  }

  async function verifyOTP() {
    const errEl = document.getElementById('otp-code-error');
    errEl.textContent = '';
    const code = codeIn.value.trim();
    if (!/^[0-9]{6}$/.test(code)) {
      errEl.textContent = '❌ กรุณากรอกรหัส 6 หลัก';
      return;
    }
    if (!_confirmation) { resetToPhoneStep(); return; }

    if (typeof Loading !== 'undefined') Loading.buttonLoad(verifyBtn);
    try {
      const result = await _confirmation.confirm(code);
      const phone  = result.user?.phoneNumber || '';
      // เก็บไว้ใน session — ปิดแท็บแล้วหาย ปลอดภัย
      const digits = DMC.normalizePhone(phone).replace(/^66/, '0');
      try { sessionStorage.setItem('dmc_verified_phone', digits); } catch (e) {}
      showResults(digits);
    } catch (e) {
      console.error('OTP verify error:', e);
      errEl.textContent = e.code === 'auth/invalid-verification-code'
        ? '❌ รหัสไม่ถูกต้อง ลองอีกครั้ง'
        : '❌ ยืนยันไม่สำเร็จ: ' + (e.message || 'ลองใหม่อีกครั้ง');
    } finally {
      if (typeof Loading !== 'undefined') Loading.buttonDone(verifyBtn);
    }
  }

  function startCountdown() {
    let sec = 60;
    const cd = document.getElementById('otp-countdown');
    resendBtn.disabled = true;
    clearInterval(_countdownTimer);
    cd.textContent = sec;
    _countdownTimer = setInterval(() => {
      sec--;
      cd.textContent = sec;
      if (sec <= 0) {
        clearInterval(_countdownTimer);
        resendBtn.disabled = false;
        resendBtn.innerHTML = 'ส่งรหัสใหม่';
      }
    }, 1000);
  }

  function resetToPhoneStep() {
    clearInterval(_countdownTimer);
    document.getElementById('otp-step-code').style.display  = 'none';
    document.getElementById('otp-step-phone').style.display = '';
    document.getElementById('otp-phone-error').textContent  = '';
    document.getElementById('otp-code-error').textContent   = '';
    _confirmation = null;
  }
}

// ─── แสดงออเดอร์ของเบอร์ที่ยืนยันแล้ว ───
async function showResults(phoneDigits) {
  document.getElementById('otp-step-phone').style.display   = 'none';
  document.getElementById('otp-step-code').style.display    = 'none';
  document.getElementById('otp-step-results').style.display = '';
  document.getElementById('verified-phone').textContent     = phoneDigits;

  const wrap = document.getElementById('phone-orders-list');
  wrap.innerHTML = '<div class="track-loading"><span class="spinner" style="display:block;margin:0 auto"></span></div>';

  try {
    // ค้นจาก phoneSearch (ออเดอร์ V12+) และ fallback customerPhone ตรงตัว (ออเดอร์เก่า)
    const [snapNew, snapOld] = await Promise.all([
      db.collection('orders').where('phoneSearch', '==', phoneDigits).get(),
      db.collection('orders').where('customerPhone', '==', phoneDigits).get(),
    ]);
    const seen = new Set();
    const orders = [];
    [snapNew, snapOld].forEach(snap => snap.forEach(doc => {
      if (seen.has(doc.id)) return;
      seen.add(doc.id);
      orders.push({ id: doc.id, ...doc.data() });
    }));
    orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    if (!orders.length) {
      wrap.innerHTML = `
        <div class="track-empty">
          <div class="track-empty-icon">🔍</div>
          <div class="track-empty-title">ไม่พบออเดอร์ของเบอร์นี้</div>
          <p>หากแน่ใจว่าเคยสั่งซื้อ อาจกรอกเบอร์ไว้คนละรูปแบบ<br>ติดต่อร้านทาง LINE เพื่อให้ช่วยตรวจสอบได้เลยครับ</p>
        </div>`;
      return;
    }
    renderOrderCards(wrap, orders);
  } catch (e) {
    wrap.innerHTML = '<div class="track-empty">⚠️ โหลดไม่สำเร็จ: ' + DMC.escapeHtml(e.message) + '</div>';
  }
}

// ══════════════════════════════════════════════
//  ORDER CARDS + STEPPER
// ══════════════════════════════════════════════
function renderOrderCards(wrap, orders) {
  wrap.innerHTML = orders.map(buildOrderCard).join('');
  if (typeof Loading !== 'undefined') Loading.staggerItems('.track-order-card', 70);

  // ปุ่ม copy เลขพัสดุ
  wrap.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-copy');
      navigator.clipboard?.writeText(text)
        .then(() => DMC.toast('คัดลอกเลขพัสดุแล้ว ✅', 'success'))
        .catch(() => DMC.toast('คัดลอกไม่สำเร็จ', 'error'));
    });
  });
}

function buildOrderCard(o) {
  const isCancelled = o.status === 'cancelled';
  const idx = statusIndex(o.status);
  const dateStr = o.createdAt?.toDate
    ? DMC.formatDate(o.createdAt, true)
    : (typeof o.createdAt === 'string' ? o.createdAt.slice(0, 10) : '—');

  // Stepper
  const stepper = isCancelled
    ? `<div class="track-cancelled">❌ ออเดอร์ถูกยกเลิก ${o.cancelReason ? '· ' + DMC.escapeHtml(o.cancelReason) : ''}</div>`
    : `<div class="track-stepper">
        ${STATUS_STEPS.map((s, i) => `
          <div class="track-step ${i < idx ? 'done' : ''} ${i === idx ? 'current' : ''}">
            <div class="track-step-dot">${i < idx ? '✓' : s.icon}</div>
            <div class="track-step-label">${s.label}</div>
          </div>
          ${i < STATUS_STEPS.length - 1 ? `<div class="track-step-line ${i < idx ? 'done' : ''}"></div>` : ''}
        `).join('')}
      </div>`;

  // Tracking number
  let trackingHtml = '';
  if (o.trackingNo && !isCancelled) {
    const known = CARRIERS[o.carrier] || null;
    // V26: ขนส่งที่ร้านพิมพ์ชื่อเอง (ไม่อยู่ในลิสต์) → โชว์ชื่อตามจริง + ปุ่มค้นหาเลขพัสดุใน Google
    const label = known ? known.name : (o.carrier || 'ขนส่ง');
    const url   = known
      ? known.track(o.trackingNo)
      : 'https://www.google.com/search?q=' + encodeURIComponent((o.carrier ? o.carrier + ' ' : '') + 'เช็คพัสดุ ' + o.trackingNo);
    trackingHtml = `
      <div class="track-shipping-box">
        <div class="track-shipping-row">
          <span class="track-shipping-label">🚚 ${DMC.escapeHtml(label)}</span>
          <span class="track-shipping-no">${DMC.escapeHtml(o.trackingNo)}</span>
          <button class="track-copy-btn" data-copy="${DMC.escapeHtml(o.trackingNo)}" title="คัดลอก">📋</button>
        </div>
        <a class="btn btn-secondary btn-sm" style="border-radius:var(--r-md);margin-top:.5rem" href="${url}" target="_blank" rel="noopener">🔎 ตรวจสอบสถานะพัสดุ →</a>
        ${known && known.paste ? '<div style="font-size:.72rem;color:var(--text-3);margin-top:.35rem">💡 กดปุ่ม 📋 คัดลอกเลข แล้วไปวางในช่องค้นหาบนหน้าเช็คพัสดุได้เลย</div>' : ''}
      </div>`;
  }

  const items = (o.items || []).slice(0, 4).map(it =>
    `<div class="track-item-row"><span>${DMC.escapeHtml(it.name || '')} ×${it.qty || 1}</span><span>${DMC.formatPrice((it.price || 0) * (it.qty || 1))}</span></div>`
  ).join('') || `<div class="track-item-row"><span>${DMC.escapeHtml(o.itemsSummary || '—')}</span></div>`;

  // ── V26: รายละเอียดออเดอร์แบบเต็ม (กดดูได้ — <details> พื้นฐานเบราว์เซอร์ ไม่พึ่ง JS) ──
  const SHIP_LABELS = { any:'📦 ขนส่งใดก็ได้ (ให้ร้านเลือก)', kerry:'Kerry Express', flash:'Flash Express', jandt:'J&T Express', jt:'J&T Express', thaipost:'ไปรษณีย์ไทย' };
  const payLabel  = o.paymentMethod === 'promptpay' ? '📱 โอนผ่าน PromptPay' : '🚚 เก็บเงินปลายทาง (COD)';
  const shipLabel = SHIP_LABELS[o.shippingMethod] || (o.shippingMethod ? DMC.escapeHtml(o.shippingMethod) : '—');
  const knownC       = CARRIERS[o.carrier] || null;
  const carrierLabel = knownC ? knownC.name : (o.carrier || '');
  const fullItems = (o.items || []).map(it => {
    const qty = it.qty || 1, unit = it.price || 0;
    return `<div class="track-detail-item">
        <span>${DMC.escapeHtml(it.name || '')}${it.customDetails ? `<small>📝 ${DMC.escapeHtml(it.customDetails)}</small>` : ''}</span>
        <span>${DMC.formatPrice(unit)} × ${qty} = <b>${DMC.formatPrice(unit * qty)}</b></span>
      </div>`;
  }).join('') || `<div class="track-detail-item"><span>${DMC.escapeHtml(o.itemsSummary || '—')}</span></div>`;
  const moneyRow = (label, val) => (val == null) ? '' :
    `<div class="track-detail-row"><span>${label}</span><span>${DMC.formatPrice(val)}</span></div>`;
  const detailHtml = `
    <details class="track-detail">
      <summary>📋 ดูรายละเอียดออเดอร์ทั้งหมด</summary>
      <div class="track-detail-body">
        <div class="track-detail-sec">🛍️ รายการสินค้า</div>
        ${fullItems}
        ${moneyRow('ยอดสินค้า', o.subtotal)}
        ${moneyRow('ค่าจัดส่ง', o.shipping)}
        ${o.surcharge ? moneyRow('ค่าธรรมเนียมเก็บเงินปลายทาง', o.surcharge) : ''}
        ${o.couponDiscount ? `<div class="track-detail-row discount"><span>ส่วนลดคูปอง${o.couponCode ? ' (' + DMC.escapeHtml(o.couponCode) + ')' : ''}</span><span>−${DMC.formatPrice(o.couponDiscount)}</span></div>` : ''}
        <div class="track-detail-row total"><span>รวมทั้งหมด</span><span>${DMC.formatPrice(o.total || 0)}</span></div>
        <div class="track-detail-sec">🚚 การจัดส่ง &amp; ชำระเงิน</div>
        <div class="track-detail-row"><span>สั่งเมื่อ</span><span>${dateStr}</span></div>
        <div class="track-detail-row"><span>ขนส่งที่เลือกตอนสั่ง</span><span>${shipLabel}</span></div>
        ${carrierLabel ? `<div class="track-detail-row"><span>จัดส่งจริงโดย</span><span>${DMC.escapeHtml(carrierLabel)}${o.trackingNo ? ' · ' + DMC.escapeHtml(o.trackingNo) : ''}</span></div>` : ''}
        <div class="track-detail-row"><span>ชำระเงิน</span><span>${payLabel}</span></div>
        ${o.address ? `<div class="track-detail-row addr"><span>📍 ที่อยู่จัดส่ง</span><span>${DMC.escapeHtml(o.address)}</span></div>` : ''}
        ${o.note ? `<div class="track-detail-row addr"><span>📝 หมายเหตุ</span><span>${DMC.escapeHtml(o.note)}</span></div>` : ''}
      </div>
    </details>`;

  return `
    <div class="track-order-card ${isCancelled ? 'cancelled' : ''}">
      <div class="track-order-head">
        <div>
          <span class="track-order-id">#${DMC.escapeHtml(o.orderId || o.id.slice(-6).toUpperCase())}</span>
          <span class="track-order-date">${dateStr}</span>
        </div>
        <span class="status status-${o.status || 'pending'}">${statusThaiLabel(o.status)}</span>
      </div>
      ${stepper}
      ${trackingHtml}
      <div class="track-items">${items}</div>
      <div class="track-total"><span>รวมทั้งหมด</span><span>${DMC.formatPrice(o.total || 0)}</span></div>
      ${detailHtml}
    </div>`;
}

function statusThaiLabel(s) {
  return {
    pending:    '📥 รับออเดอร์แล้ว',
    processing: '🛠️ กำลังจัดเตรียม',
    shipping:   '🚚 กำลังจัดส่ง',
    done:       '🎉 ส่งสำเร็จ',
    cancelled:  '❌ ยกเลิก',
  }[s] || '📥 รับออเดอร์แล้ว';
}
