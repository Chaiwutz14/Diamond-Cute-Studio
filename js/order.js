/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Order / Cart JS
   js/order.js
═══════════════════════════════════════════════ */
'use strict';

let uploadedFileUrls = [];
let slipUrl = '';
let selectedPayment = 'promptpay';
let couponPct = 0;            // V.upgrade1: เก็บเป็น % แล้วคิดสดทุกครั้ง (กันยอดเพี้ยนเมื่อแก้ตะกร้า)
let db = null;
window._orderFiles = [];      // V.upgrade1: เก็บไฟล์รูปงานจริงเพื่ออัปตอน submit

document.addEventListener('DOMContentLoaded', async () => {
  try { db = await DMC.getFirebaseReady(); } catch {}
  renderCart();
  bindStepNavigation();
  renderPaymentMethods();
  bindFileUpload();
  renderPendingDesigns();   // V2: แสดงแบบที่ลูกค้าออกแบบจากหน้าสินค้า
  bindSlipUpload();
  bindCoupon();
  bindInlineValidation();   // V2: ตรวจฟอร์มแบบเรียลไทม์
  renderSummary();
});

// ─── Render Cart List ───
function renderCart() {
  const cart = DMC.getCart();
  const list = document.getElementById('cart-list');
  const emptyEl = document.getElementById('cart-empty');
  const uploadBlock = document.getElementById('upload-block');
  const step2Btn = document.getElementById('goto-step2-btn');

  if (!list) return;

  if (cart.length === 0) {
    list.style.display = 'none';
    emptyEl.style.display = 'block';
    if (uploadBlock) uploadBlock.style.display = 'none';
    if (step2Btn) step2Btn.style.display = 'none';
    return;
  }

  list.style.display = '';
  emptyEl.style.display = 'none';

  list.innerHTML = cart.map(item => `
    <div class="cart-item" data-cart-id="${item.cartItemId}">
      <div class="cart-item-thumb">${item.image ? `<img src="${item.image}" alt="${DMC.escapeHtml(item.name||'')}" loading="lazy" onerror="this.style.display='none';this.parentElement.textContent='${item.emoji||'📦'}'">` : (item.emoji || '📦')}</div>
      <div class="cart-item-body">
        <div class="cart-item-name">${DMC.escapeHtml(item.name)}</div>
        <div class="cart-item-spec">
          ${item.options ? DMC.escapeHtml(item.options) + ' · ' : ''}
          จำนวน ${item.qty} ${item.unit || 'ชิ้น'}
        </div>
      </div>
      <div class="cart-item-right">
        <div class="cart-item-price">${DMC.formatPrice(item.price * item.qty)}</div>
        <button class="cart-item-remove" data-cart-id="${item.cartItemId}">🗑️ ลบ</button>
      </div>
    </div>
  `).join('');

  // Bind remove buttons
  list.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      DMC.removeFromCart(btn.dataset.cartId);
      renderCart();
      renderSummary();
    });
  });

  renderSummary();
}

// ─── Summary Panel ───
function renderSummary() {
  const cart     = DMC.getCart();
  const rowsEl   = document.getElementById('summary-rows');
  const totalEl  = document.getElementById('grand-total');
  const qrAmtEl  = document.getElementById('qr-amount');

  if (!rowsEl) return;

  const subtotal   = DMC.getCartTotal();
  const shipping   = selectedPayment === 'cod' ? ((window.DMC_CONFIG||{}).SHIPPING||{}).cod ?? 80 : ((window.DMC_CONFIG||{}).SHIPPING||{}).transfer ?? 50;
  const discount   = Math.floor(subtotal * couponPct / 100);   // V.upgrade1: คิดสดจาก %
  const grandTotal = Math.max(0, subtotal + shipping - discount);

  rowsEl.innerHTML = cart.map(item => `
    <div class="summary-row">
      <span class="label">${DMC.escapeHtml(item.name)} ×${item.qty}</span>
      <span class="value">${DMC.formatPrice(item.price * item.qty)}</span>
    </div>
  `).join('') + `
    <div class="summary-row">
      <span class="label">${selectedPayment === 'cod' ? 'ค่าจัดส่ง COD (รวมค่าธรรมเนียม)' : 'ค่าจัดส่ง'}</span>
      <span class="value">${DMC.formatPrice(shipping)}</span>
    </div>
    ${discount > 0 ? `
    <div class="summary-row">
      <span class="label">ส่วนลด</span>
      <span class="value discount">-${DMC.formatPrice(discount)}</span>
    </div>` : ''}
  `;

  if (totalEl)  totalEl.textContent  = DMC.formatPrice(grandTotal);
  if (qrAmtEl)  qrAmtEl.textContent  = DMC.formatPrice(grandTotal);
  updatePromptpayQR(grandTotal);
}


// ─── PromptPay QR จากการตั้งค่าหลังบ้าน (CMS) ───
let _cmsPayment = null;
async function updatePromptpayQR(amount) {
  const wrap = document.getElementById('qr-img-wrap');
  if (!wrap) return;
  try {
    if (!_cmsPayment && typeof CMS !== 'undefined') {
      const content = await CMS.get();
      _cmsPayment = content.payment || {};
      const nameEl = document.getElementById('qr-account-name');
      if (nameEl && _cmsPayment.promptpayName) nameEl.textContent = _cmsPayment.promptpayName;
    }
    const url = (typeof CMS !== 'undefined') ? CMS.promptpayQR(_cmsPayment || {}, amount) : '';
    const saveBtn = document.getElementById('qr-save-btn');
    if (url) {
      wrap.innerHTML = '<img src="' + url + '" alt="PromptPay QR" id="qr-pay-img" style="width:100%;max-width:220px;border-radius:10px" loading="lazy">';
      if (saveBtn) {
        saveBtn.style.display = '';
        saveBtn.onclick = function() {
          const a = document.createElement('a');
          a.href = url; a.download = 'promptpay-qr.png'; a.target = '_blank';
          document.body.appendChild(a); a.click(); a.remove();
        };
      }
    } else {
      wrap.innerHTML = '<div style="font-size:.82rem;color:var(--text-3);padding:1rem">⚠️ ร้านยังไม่ตั้งค่า PromptPay<br>กรุณาสอบถามทาง LINE</div>';
      if (saveBtn) saveBtn.style.display = 'none';
    }
  } catch (e) { /* แสดง placeholder เดิม */ }
}

// ─── Step Navigation ───
function bindStepNavigation() {
  document.getElementById('goto-step2-btn')?.addEventListener('click', () => {
    if (DMC.getCart().length === 0) { DMC.toast('ตะกร้าว่างอยู่', 'error'); return; }
    goToStep(2);
  });

  document.getElementById('back-to-step1')?.addEventListener('click', () => goToStep(1));

  document.getElementById('goto-step3-btn')?.addEventListener('click', () => {
    if (!validateCustomerForm()) return;
    goToStep(3);
  });

  document.getElementById('back-to-step2')?.addEventListener('click', () => goToStep(2));

  document.getElementById('submit-order-btn')?.addEventListener('click', submitOrder);
}

function goToStep(n) {
  const sections = ['cart-section', 'info-section', 'payment-section'];
  sections.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.display = i === n - 1 ? '' : 'none';
  });

  for (let i = 1; i <= 3; i++) {
    const step = document.getElementById(`step-${i}`);
    if (!step) continue;
    step.classList.remove('active', 'done');
    if (i < n)  step.classList.add('done');
    if (i === n) step.classList.add('active');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Customer Form Validation ───
function validateCustomerForm() {
  const name    = document.getElementById('customer-name')?.value.trim();
  const phone   = document.getElementById('customer-phone')?.value.trim();
  const address = document.getElementById('customer-address')?.value.trim();

  if (!name)    { highlightError('customer-name',    'กรุณากรอกชื่อ-นามสกุล'); return false; }
  if (!phone)   { highlightError('customer-phone',   'กรุณากรอกเบอร์โทรศัพท์'); return false; }
  if (!/^0[0-9]{8,9}$/.test(phone.replace(/-/g, ''))) {
    highlightError('customer-phone', 'รูปแบบเบอร์โทรไม่ถูกต้อง');
    return false;
  }
  if (!address) { highlightError('customer-address', 'กรุณากรอกที่อยู่จัดส่ง'); return false; }
  return true;
}

function highlightError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('error');
  el.focus();
  DMC.toast(message, 'error');
  el.addEventListener('input', () => el.classList.remove('error'), { once: true });
}

// ─── Payment Methods ───
// ─── ช่องทางชำระเงิน (เมตาดาต้า) ───
const PAY_METHODS_META = {
  promptpay: { icon: '📱', name: 'PromptPay QR',          desc: 'สแกน QR Code แล้วแนบสลิปโอนเงิน' },
  cod:       { icon: '🚚', name: 'เก็บเงินปลายทาง (COD)', desc: 'ชำระเมื่อได้รับสินค้า มีค่าธรรมเนียมเพิ่ม' },
  truemoney: { icon: '💰', name: 'TrueMoney Wallet',      desc: 'ชำระผ่านทรูมันนี่ วอลเล็ท' },
  credit:    { icon: '💳', name: 'บัตรเครดิต/เดบิต',       desc: 'Visa · Mastercard · JCB' },
};

async function renderPaymentMethods() {
  const wrap = document.getElementById('payment-methods');
  if (!wrap) return;

  // ดึงการตั้งค่าช่องทางจาก CMS (แอดมินกำหนด)
  let cfg = { promptpay:{shown:true,ready:true}, cod:{shown:true,ready:true} };
  try {
    if (typeof CMS !== 'undefined') {
      const content = await CMS.get();
      if (content.payment && content.payment.methods) cfg = content.payment.methods;
    }
  } catch(e) {}

  // เรียงตามลำดับมาตรฐาน + แสดงเฉพาะที่ shown
  const order = ['promptpay', 'cod', 'truemoney', 'credit'];
  const visible = order.filter(k => cfg[k] && cfg[k].shown);
  if (visible.length === 0) visible.push('promptpay');  // กันว่าง

  // เลือกตัวแรกที่ "พร้อมใช้งาน" เป็นค่าเริ่มต้น
  const firstReady = visible.find(k => cfg[k] && cfg[k].ready) || visible[0];
  selectedPayment = firstReady;

  wrap.innerHTML = visible.map(key => {
    const meta = PAY_METHODS_META[key];
    const ready = !!(cfg[key] && cfg[key].ready);
    const isSel = (key === firstReady);
    return `
      <div class="payment-method ${isSel ? 'selected' : ''} ${ready ? '' : 'pay-disabled'}" data-method="${key}" ${ready ? '' : 'data-disabled="1"'}>
        <div class="pay-icon-wrap">${meta.icon}</div>
        <div class="pay-info">
          <div class="pay-name">${meta.name}${ready ? '' : ' <span class="pay-soon">🔜 เร็วๆ นี้</span>'}</div>
          <div class="pay-desc">${meta.desc}</div>
        </div>
        <div class="pay-radio"></div>
      </div>`;
  }).join('');

  bindPaymentMethods();
  updatePaymentUI();
}

function bindPaymentMethods() {
  const methods = document.querySelectorAll('.payment-method');
  methods.forEach(m => {
    m.addEventListener('click', () => {
      if (m.dataset.disabled) {            // ช่องทางที่ยังไม่พร้อม — กดไม่ได้
        DMC.toast('ช่องทางนี้กำลังเปิดให้บริการเร็วๆ นี้ 🔜', 'info');
        return;
      }
      methods.forEach(x => x.classList.remove('selected'));
      m.classList.add('selected');
      selectedPayment = m.dataset.method;
      updatePaymentUI();
      renderSummary();
    });
  });
}

// แสดง/ซ่อน QR + slip ตามช่องทางที่เลือก
function updatePaymentUI() {
  const qrBox = document.getElementById('qr-box');
  const slipWrap = document.getElementById('slip-upload-wrap');
  const isQR = selectedPayment === 'promptpay';
  if (qrBox)    qrBox.classList.toggle('visible', isQR);
  if (slipWrap) slipWrap.style.display = isQR ? '' : 'none';
}

// ─── File Upload (photos) — V.upgrade1: เก็บไฟล์จริงเพื่ออัปตอน submit ───
function bindFileUpload() {
  const zone  = document.getElementById('files-upload-zone');
  const input = document.getElementById('files-input');
  const preview = document.getElementById('file-preview-list');

  zone?.addEventListener('click', () => input?.click());
  zone?.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('active'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('active'));
  zone?.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('active');
    handleFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
  });

  input?.addEventListener('change', () => {
    handleFiles(Array.from(input.files));
    input.value = '';
  });

  function handleFiles(files) {
    if (!files.length) return;
    const room = 20 - window._orderFiles.filter(Boolean).length;
    if (room <= 0) { DMC.toast('อัพโหลดได้สูงสุด 20 ไฟล์', 'warning'); return; }
    if (files.length > room) { DMC.toast('อัพโหลดได้สูงสุด 20 ไฟล์', 'warning'); files = files.slice(0, room); }

    files.forEach(file => {
      window._orderFiles.push(file);                 // ← เก็บ File จริงไว้สำหรับอัปตอน submit
      const idx = window._orderFiles.length - 1;
      const reader = new FileReader();
      reader.onload = e => {
        const item = document.createElement('div');
        item.className = 'file-preview-item';
        item.dataset.fileIdx = String(idx);
        item.innerHTML = `
          <img src="${e.target.result}" alt="${DMC.escapeHtml(file.name)}">
          <button class="file-preview-remove" aria-label="ลบ">✕</button>
        `;
        item.querySelector('.file-preview-remove').addEventListener('click', () => {
          window._orderFiles[idx] = null;            // mark ว่าลบแล้ว (คง index เดิมของไฟล์อื่น)
          item.remove();
        });
        preview?.appendChild(item);
      };
      reader.readAsDataURL(file);
    });

    DMC.toast(`เพิ่ม ${files.length} ไฟล์แล้ว`, 'success');
  }
}

// ─── V2: แบบที่ลูกค้าออกแบบจากหน้าสินค้า (แนบมาทาง localStorage เป็น URL) ───
window._attachedDesignUrls = [];
function renderPendingDesigns() {
  let designs = [];
  try { designs = JSON.parse(localStorage.getItem('dmc_pending_designs') || '[]'); } catch(e){}
  if (!designs.length) return;
  window._attachedDesignUrls = designs.map(d => d.url).filter(Boolean);

  const preview = document.getElementById('file-preview-list');
  const zone = document.getElementById('files-upload-zone');
  // แถบแจ้งว่ามีแบบที่ออกแบบแนบมาแล้ว
  if (zone && !document.getElementById('attached-design-note')) {
    const note = document.createElement('div');
    note.id = 'attached-design-note';
    note.style.cssText = 'background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.28);border-radius:var(--r-md);padding:.6rem .85rem;margin-bottom:.7rem;font-size:.82rem;color:var(--emerald);font-family:var(--font-display)';
    note.innerHTML = '🎨 มีแบบที่คุณออกแบบไว้ ' + designs.length + ' รูป แนบไปกับออเดอร์นี้แล้ว';
    zone.parentNode.insertBefore(note, zone);
  }
  // แสดง thumbnail ของแบบ (ลบได้)
  designs.forEach((d, idx) => {
    if (!preview) return;
    const item = document.createElement('div');
    item.className = 'file-preview-item';
    item.title = d.name || 'แบบที่ออกแบบ';
    item.innerHTML = `
      <img src="${d.url}" alt="${DMC.escapeHtml(d.name || 'แบบที่ออกแบบ')}">
      <span style="position:absolute;bottom:0;left:0;right:0;background:rgba(16,185,129,.85);color:#fff;font-size:.5rem;text-align:center;font-family:var(--font-display)">แบบที่ออกแบบ</span>
      <button class="file-preview-remove" aria-label="ลบ">✕</button>`;
    item.querySelector('.file-preview-remove').addEventListener('click', () => {
      window._attachedDesignUrls = window._attachedDesignUrls.filter(u => u !== d.url);
      // อัปเดต localStorage
      try {
        let arr = JSON.parse(localStorage.getItem('dmc_pending_designs') || '[]');
        arr = arr.filter(x => x.url !== d.url);
        localStorage.setItem('dmc_pending_designs', JSON.stringify(arr));
      } catch(e){}
      item.remove();
    });
    preview.appendChild(item);
  });
}

// ─── Slip Upload ───
function bindSlipUpload() {
  const zone   = document.getElementById('slip-zone');
  const input  = document.getElementById('slip-input');
  const previewWrap = document.getElementById('slip-preview');
  const previewImg  = document.getElementById('slip-img');

  zone?.addEventListener('click', () => input?.click());
  zone?.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('active'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('active'));
  zone?.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleSlipFile(file);
  });
  input?.addEventListener('change', () => {
    const file = input.files[0];
    if (file) handleSlipFile(file);
  });

  function handleSlipFile(file) {
    // Store file reference for upload on submit (NOT base64)
    window._slipFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      if (previewImg)  previewImg.src = e.target.result;
      if (previewWrap) previewWrap.style.display = '';
      if (zone)        zone.style.display = 'none';
      slipUrl = 'pending_upload'; // placeholder — actual URL set during submitOrder
    };
    reader.readAsDataURL(file);
  }
}

// ─── Coupon ───
const VALID_COUPONS = {
  'DIAMOND15': 15, // percent
  'FIRSTORDER': 20,
  'DMC10': 10,
};

// ─── V2: Inline validation (เรียลไทม์ บนฟอร์มชำระเงิน) ───
function bindInlineValidation() {
  const fields = [
    { id: 'customer-name',    test: v => v.trim().length >= 2,  err: 'กรุณากรอกชื่อ-นามสกุล' },
    { id: 'customer-phone',   test: v => /^0\d{1,2}[-\s]?\d{3}[-\s]?\d{3,4}$/.test(v.trim()) && (v.replace(/\D/g,'').length>=9), err: 'เบอร์โทรไม่ถูกต้อง (เช่น 081-234-5678)' },
    { id: 'customer-address', test: v => v.trim().length >= 10, err: 'กรุณากรอกที่อยู่ให้ครบถ้วน' },
  ];
  fields.forEach(f => {
    const input = document.getElementById(f.id);
    if (!input) return;
    // สร้างกล่องข้อความใต้ช่อง
    let msg = input.parentNode.querySelector('.field-msg');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'field-msg';
      input.insertAdjacentElement('afterend', msg);
    }
    let touched = false;
    const validate = () => {
      const ok = f.test(input.value);
      input.classList.toggle('input-valid', ok && input.value.trim() !== '');
      input.classList.toggle('input-invalid', !ok && touched);
      if (!ok && touched) { msg.textContent = '⚠ ' + f.err; msg.className = 'field-msg err'; }
      else if (ok && input.value.trim() !== '') { msg.textContent = '✓ ใช้ได้'; msg.className = 'field-msg ok'; }
      else { msg.textContent = ''; msg.className = 'field-msg'; }
      return ok;
    };
    input.addEventListener('blur', () => { touched = true; validate(); });
    input.addEventListener('input', () => { if (touched) validate(); });
  });
}

function bindCoupon() {
  document.getElementById('apply-coupon-btn')?.addEventListener('click', applyCoupon);
  document.getElementById('coupon-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') applyCoupon();
  });
}

function applyCoupon() {
  const code = document.getElementById('coupon-input')?.value.trim().toUpperCase();
  if (!code) return;

  if (VALID_COUPONS[code]) {
    couponPct = VALID_COUPONS[code];                       // V.upgrade1: เก็บ % ไว้คิดสด
    const discount = Math.floor(DMC.getCartTotal() * couponPct / 100);
    renderSummary();
    DMC.toast(`✅ ใช้โค้ด ${code} ได้รับส่วนลด ${couponPct}% (${DMC.formatPrice(discount)})`, 'success');
  } else {
    couponPct = 0;
    renderSummary();
    DMC.toast('❌ โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุแล้ว', 'error');
  }
}

// ─── Submit Order ───
async function submitOrder() {
  const btn = document.getElementById('submit-order-btn');
  if (!btn) return;

  if (selectedPayment === 'promptpay' && !slipUrl) {
    DMC.toast('กรุณาแนบสลิปโอนเงินก่อน', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:0.4rem"></span> กำลังส่งออเดอร์...';

  const orderId = DMC.generateOrderId();   // V3: สร้างก่อน เพื่อใช้เป็น path ของไฟล์ private

  // Upload slip — V3: ถ้าเปิด PRIVATE_UPLOADS จะไปเก็บ Storage แบบ private (อ่านได้เฉพาะแอดมิน)
  if (selectedPayment === 'promptpay' && window._slipFile) {
    try {
      const uploaded = await DMC.uploadSensitive(window._slipFile, 'orders/' + orderId);
      slipUrl = uploaded.url;
    } catch (e) {
      console.warn('slip upload failed:', e);
      slipUrl = '';
      DMC.toast('⚠️ อัปสลิปไม่สำเร็จ ระบบจะรับออเดอร์ไว้ก่อน รบกวนส่งสลิปทาง LINE อีกครั้งครับ', 'warning', 5000);
    }
  }

  // V.upgrade1/V3: อัปรูปงานของลูกค้า (private เมื่อเปิด PRIVATE_UPLOADS)
  uploadedFileUrls = [];
  const pendingFiles = (window._orderFiles || []).filter(Boolean);
  if (pendingFiles.length) {
    const prog = document.getElementById('upload-progress');
    const bar  = document.getElementById('upload-bar');
    const stat = document.getElementById('upload-status');
    if (prog) prog.style.display = '';
    let failed = 0;
    for (let i = 0; i < pendingFiles.length; i++) {
      if (stat) stat.textContent = `กำลังอัปโหลดรูป ${i + 1}/${pendingFiles.length}...`;
      try {
        const up = await DMC.uploadSensitive(pendingFiles[i], 'orders/' + orderId);
        if (up && up.url) uploadedFileUrls.push(up.url); else failed++;
      } catch (e) { failed++; console.warn('upload file failed', e); }
      if (bar) bar.style.width = Math.round(((i + 1) / pendingFiles.length) * 100) + '%';
    }
    if (prog) prog.style.display = 'none';
    if (failed) DMC.toast(`⚠️ มี ${failed} รูปอัปไม่สำเร็จ ส่งเพิ่มทาง LINE ได้หลังสั่งซื้อครับ`, 'warning', 5000);
  }

  // V2: รวมแบบที่ลูกค้าออกแบบจากหน้าสินค้า (เป็น URL ImgBB — แสดงให้ลูกค้าเห็นได้)
  if (window._attachedDesignUrls && window._attachedDesignUrls.length) {
    uploadedFileUrls = uploadedFileUrls.concat(window._attachedDesignUrls);
  }

  const cart    = DMC.getCart();

  const subtotal  = DMC.getCartTotal();
  const shipping  = selectedPayment === 'cod' ? (((window.DMC_CONFIG||{}).SHIPPING||{}).cod ?? 80) : (((window.DMC_CONFIG||{}).SHIPPING||{}).transfer ?? 50);
  const couponDiscount = Math.floor(subtotal * couponPct / 100);   // V.upgrade1: คิดสดจาก %
  const total     = Math.max(0, subtotal + shipping - couponDiscount);

  const orderData = {
    orderId,
    customerName:    document.getElementById('customer-name')?.value.trim(),
    customerPhone:   document.getElementById('customer-phone')?.value.trim(),
    phoneSearch:     DMC.normalizePhone(document.getElementById('customer-phone')?.value),
    customerLine:    document.getElementById('customer-line')?.value.trim() || '',
    address:         document.getElementById('customer-address')?.value.trim(),
    shippingMethod:  document.getElementById('shipping-method')?.value || 'kerry',
    note:            document.getElementById('customer-note')?.value.trim() || '',
    paymentMethod:   selectedPayment,
    items:           cart,
    itemsSummary:    cart.map(i => `${i.name} ×${i.qty}`).join(', '),
    subtotal,
    shipping,
    couponDiscount,
    total,
    status:          'pending',
    slipUrl:         selectedPayment === 'promptpay' ? slipUrl : '',
    fileUrls:        uploadedFileUrls,
    createdAt:       new Date().toISOString(),
  };

  try {
    // Save to Firestore
    let savedDocId = null;
    if (db) {
      const docRef = await db.collection('orders').add({
        ...orderData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      savedDocId = docRef.id;
    }

    // บันทึกลงเครื่องนี้ — ลูกค้าดูประวัติได้ทันทีที่หน้า "ติดตามออเดอร์"
    if (savedDocId) DMC.saveMyOrder(savedDocId, orderId);

    // LINE Notify
    // Send structured data to Worker (builds Flex Card)
    await DMC.sendLineNotify(orderData);

    // Clear cart
    DMC.saveCart([]);
    window._orderFiles = [];   // V.upgrade1: เคลียร์ไฟล์ที่อัปแล้ว
    window._attachedDesignUrls = [];                     // V2
    try { localStorage.removeItem('dmc_pending_designs'); } catch(e){}  // V2: เคลียร์แบบที่แนบ

    // Show success
    showSuccess(orderId, total);

    // Note: ระบบแจ้งเตือนลูกค้าทาง LINE ต้องทำผ่านหน้า Admin
    // (ส่ง LINE Push ถึงลูกค้าได้เมื่อมี User ID ของลูกค้า)

  } catch (err) {
    console.error('Order submit error:', err);
    DMC.toast('เกิดข้อผิดพลาด กรุณาลองใหม่หรือติดต่อ LINE', 'error');
    btn.disabled = false;
    btn.innerHTML = '✅ ยืนยันออเดอร์';
  }
}

async function showSuccess(orderId, total) {
  document.getElementById('order-wrapper').style.display = 'none';
  document.getElementById('success-page').style.display  = '';
  document.getElementById('success-order-id').textContent = orderId;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // ปุ่ม LINE — เปิดแชทร้านพร้อมข้อความร่างไว้ให้ลูกค้ากดส่ง
  try {
    const btn = document.getElementById('success-line-btn');
    if (btn && typeof CMS !== 'undefined') {
      const content = await CMS.get();
      const ct = content.contact || {};
      const amountTxt = (typeof total === 'number') ? (' ยอด ฿' + total.toLocaleString()) : '';
      const msg = 'สวัสดีครับ แจ้งออเดอร์ #' + orderId + amountTxt + ' ขอส่งไฟล์รูป/สอบถามรายละเอียดเพิ่มเติมครับ 🙏';
      // ดึง LINE ID (@xxx) จาก lineLabel หรือ line URL
      let oaId = (ct.lineLabel || '').trim();
      if (!oaId && ct.line) {
        const m = ct.line.match(/@[\w.-]+/) || ct.line.match(/ti\/p\/([^/?]+)/);
        if (m) oaId = m[0].indexOf('@') === 0 ? m[0] : '@' + m[1];
      }
      if (oaId) {
        const at = oaId.indexOf('@') === 0 ? oaId : '@' + oaId;
        // LINE OA deep link พร้อมข้อความร่าง (เปิดหน้าแชท OA)
        btn.href = 'https://line.me/R/oaMessage/' + encodeURIComponent(at) + '/?' + encodeURIComponent(msg);
      } else if (ct.line) {
        btn.href = ct.line;  // fallback เปิดแชทปกติ
      }
    }
  } catch(e) { /* ใช้ลิงก์เดิม */ }
}
