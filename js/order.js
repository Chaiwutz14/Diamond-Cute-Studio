/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Order / Cart JS
   js/order.js
═══════════════════════════════════════════════ */
'use strict';

let uploadedFileUrls = [];
let slipUrl = '';
let selectedPayment = 'promptpay';
let couponDiscount = 0;
let db = null;

document.addEventListener('DOMContentLoaded', async () => {
  try { db = await DMC.getFirebaseReady(); } catch {}
  renderCart();
  bindStepNavigation();
  bindPaymentMethods();
  bindFileUpload();
  bindSlipUpload();
  bindCoupon();
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
  const shipping   = selectedPayment === 'cod' ? 80 : 50;
  const discount   = couponDiscount;
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
function bindPaymentMethods() {
  const methods = document.querySelectorAll('.payment-method');
  const qrBox   = document.getElementById('qr-box');
  const slipWrap = document.getElementById('slip-upload-wrap');

  methods.forEach(m => {
    m.addEventListener('click', () => {
      methods.forEach(x => x.classList.remove('selected'));
      m.classList.add('selected');
      selectedPayment = m.dataset.method;

      const isQR = selectedPayment === 'promptpay';
      if (qrBox)    qrBox.classList.toggle('visible', isQR);
      if (slipWrap) slipWrap.style.display = isQR ? '' : 'none';

      renderSummary();
    });
  });
}

// ─── File Upload (photos) ───
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
    if (files.length > 20) { DMC.toast('อัพโหลดได้สูงสุด 20 ไฟล์', 'error'); files = files.slice(0, 20); }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const item = document.createElement('div');
        item.className = 'file-preview-item';
        item.innerHTML = `
          <img src="${e.target.result}" alt="${DMC.escapeHtml(file.name)}">
          <button class="file-preview-remove" aria-label="ลบ">✕</button>
        `;
        item.querySelector('.file-preview-remove').addEventListener('click', () => item.remove());
        preview?.appendChild(item);
      };
      reader.readAsDataURL(file);
    });

    DMC.toast(`เพิ่ม ${files.length} ไฟล์แล้ว`, 'success');
  }
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
    const pct = VALID_COUPONS[code];
    const subtotal = DMC.getCartTotal();
    couponDiscount = Math.floor(subtotal * pct / 100);
    renderSummary();
    DMC.toast(`✅ ใช้โค้ด ${code} ได้รับส่วนลด ${pct}% (${DMC.formatPrice(couponDiscount)})`, 'success');
  } else {
    couponDiscount = 0;
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

  // Upload slip image to ImgBB first (avoid storing base64 in Firestore)
  if (selectedPayment === 'promptpay' && window._slipFile) {
    try {
      const uploaded = await DMC.uploadToImgBB(window._slipFile);
      slipUrl = uploaded.url;
    } catch (e) {
      console.warn('ImgBB upload failed, continuing without slip URL:', e);
      slipUrl = '';
    }
  }

  const cart    = DMC.getCart();
  const orderId = DMC.generateOrderId();

  const subtotal  = DMC.getCartTotal();
  const shipping  = selectedPayment === 'cod' ? 80 : 50;   // COD ฿80 (รวมค่าธรรมเนียม) / โอน ฿50
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
