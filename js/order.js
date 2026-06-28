/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Order / Cart JS
   js/order.js
═══════════════════════════════════════════════ */
'use strict';

let uploadedFileUrls = [];
let slipUrl = '';
let selectedPayment = 'promptpay';
let appliedCoupon = null;     // V4: คูปองจริงจาก Firestore { code, type, value, minSpend, maxDiscount }
let _cms = null;              // V4: เนื้อหา + ค่าธรรมเนียมจากหลังบ้าน (CMS)
let db = null;
window._orderFiles = [];      // V.upgrade1: เก็บไฟล์รูปงานจริงเพื่ออัปตอน submit

document.addEventListener('DOMContentLoaded', async () => {
  try { db = await DMC.getFirebaseReady(); } catch {}
  try { _cms = await CMS.get(); } catch { _cms = null; }   // V4: ค่าธรรมเนียม/ค่าส่งที่แก้ได้
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

// ─── V4: ค่าส่ง/ค่าธรรมเนียม จากหลังบ้าน (fallback config.js) ───
function getFees() {
  const f = (_cms && _cms.fees) || {};
  const cfg = (window.DMC_CONFIG || {}).SHIPPING || {};
  return {
    shipTransfer: Number(f.shipTransfer ?? cfg.transfer ?? 50),
    shipCod:      Number(f.shipCod ?? cfg.cod ?? 80),
    freeShipMin:  Number(f.freeShipMin ?? 0),
    surchargePromptpay: Number(f.surchargePromptpay ?? 0),
    surchargeCod:       Number(f.surchargeCod ?? 0),
  };
}

// ─── V4: คำนวณค่าส่ง + ค่าธรรมเนียมช่องทาง + ส่วนลดคูปอง → ยอดรวม (แหล่งเดียว) ───
function computeTotals() {
  const subtotal = DMC.getCartTotal();
  const fees = getFees();
  let shipping  = selectedPayment === 'cod' ? fees.shipCod : fees.shipTransfer;
  const surcharge = selectedPayment === 'cod' ? fees.surchargeCod : fees.surchargePromptpay;

  let discount = 0, freeship = false;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      discount = Math.floor(subtotal * Number(appliedCoupon.value) / 100);
      const cap = Number(appliedCoupon.maxDiscount || 0);
      if (cap > 0) discount = Math.min(discount, cap);
    } else if (appliedCoupon.type === 'fixed') {
      discount = Math.min(Number(appliedCoupon.value), subtotal);
    } else if (appliedCoupon.type === 'freeship') {
      freeship = true;
    }
  }
  if (freeship || (fees.freeShipMin > 0 && subtotal >= fees.freeShipMin)) shipping = 0;

  const total = Math.max(0, subtotal + shipping + surcharge - discount);
  return { subtotal, shipping, surcharge, discount, freeship, total };
}

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
        ${item.customDetails ? `<div class="cart-item-spec" style="margin-top:.2rem;color:var(--accent);font-size:.8rem;line-height:1.45">📝 ${DMC.escapeHtml(item.customDetails)}</div>` : ''}
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
  checkCartPrices(cart);   // V24/SEC-A: เตือนถ้าราคาในตะกร้าต่างจากแคตตาล็อกล่าสุด
}

// ─── V24: ตรวจราคาตะกร้าเทียบแคตตาล็อกปัจจุบัน (กันราคาเก่าค้าง + เสริมความถูกต้องของยอด) ───
async function checkCartPrices(cart) {
  const host = document.getElementById('cart-list');
  if (!host || !cart || !cart.length) return;
  let current = [];
  try { current = await DMC.loadProducts(); } catch (e) { return; }
  if (!current || !current.length) return;
  const priceOf = {};
  current.forEach(p => { if (p && p.id != null) priceOf[String(p.id)] = Number(p.price); });

  const changed = [];
  cart.forEach(item => {
    if (item.id == null) return;
    const now = priceOf[String(item.id)];
    if (now != null && Number(now) !== Number(item.price)) {
      changed.push({ name: item.name, was: Number(item.price), now: Number(now) });
    }
  });

  const old = document.getElementById('cart-price-warning');
  if (old) old.remove();
  if (!changed.length) return;

  const box = document.createElement('div');
  box.id = 'cart-price-warning';
  box.style.cssText = 'background:var(--bg-card2,#fff7ed);border:1.5px solid #f59e0b;border-radius:12px;padding:.85rem 1rem;margin:0 0 1rem;font-size:.85rem;line-height:1.6;color:var(--text-1,#7c2d12)';
  box.innerHTML = '⚠️ <strong>ราคาบางรายการมีการอัปเดต</strong><br>' +
    changed.map(c => '• ' + DMC.escapeHtml(c.name) + ': ' + DMC.formatPrice(c.was) + ' → <strong>' + DMC.formatPrice(c.now) + '</strong>').join('<br>') +
    '<br><button id="cart-sync-price" type="button" style="margin-top:.6rem;padding:.5rem 1rem;border:none;border-radius:9px;background:#f59e0b;color:#fff;font-weight:700;font-size:.82rem;cursor:pointer;font-family:var(--font-display),sans-serif">อัปเดตราคาเป็นปัจจุบัน</button>';
  host.parentElement.insertBefore(box, host);

  document.getElementById('cart-sync-price')?.addEventListener('click', () => {
    const fresh = DMC.getCart().map(item => {
      const now = priceOf[String(item.id)];
      return (now != null) ? { ...item, price: Number(now) } : item;
    });
    DMC.saveCart(fresh);
    DMC.toast('อัปเดตราคาเรียบร้อยแล้ว ✓', 'success');
    renderCart();
  });
}

// ─── Summary Panel ───
function renderSummary() {
  const cart     = DMC.getCart();
  const rowsEl   = document.getElementById('summary-rows');
  const totalEl  = document.getElementById('grand-total');
  const qrAmtEl  = document.getElementById('qr-amount');

  if (!rowsEl) return;

  const t = computeTotals();   // V4: แหล่งคำนวณเดียว

  rowsEl.innerHTML = cart.map(item => `
    <div class="summary-row">
      <span class="label">${DMC.escapeHtml(item.name)} ×${item.qty}</span>
      <span class="value">${DMC.formatPrice(item.price * item.qty)}</span>
    </div>
  `).join('') + `
    <div class="summary-row">
      <span class="label">${selectedPayment === 'cod' ? 'ค่าจัดส่ง COD (รวมค่าธรรมเนียม)' : 'ค่าจัดส่ง'}</span>
      <span class="value">${t.shipping === 0 ? '<span style="color:#10B981;font-weight:700">ฟรี</span>' : DMC.formatPrice(t.shipping)}</span>
    </div>
    ${t.surcharge > 0 ? `
    <div class="summary-row">
      <span class="label">ค่าธรรมเนียมช่องทางชำระ</span>
      <span class="value">${DMC.formatPrice(t.surcharge)}</span>
    </div>` : ''}
    ${t.discount > 0 ? `
    <div class="summary-row">
      <span class="label">ส่วนลด${appliedCoupon ? ' (' + DMC.escapeHtml(appliedCoupon.code) + ')' : ''}</span>
      <span class="value discount">-${DMC.formatPrice(t.discount)}</span>
    </div>` : ''}
    ${(appliedCoupon && appliedCoupon.type === 'freeship') ? `
    <div class="summary-row">
      <span class="label">ส่วนลด (${DMC.escapeHtml(appliedCoupon.code)})</span>
      <span class="value discount">ส่งฟรี</span>
    </div>` : ''}
  `;

  if (totalEl)  totalEl.textContent  = DMC.formatPrice(t.total);
  if (qrAmtEl)  qrAmtEl.textContent  = DMC.formatPrice(t.total);
  updatePromptpayQR(t.total);
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
    window._slipVerify = null;
    const reader = new FileReader();
    reader.onload = e => {
      if (previewImg)  previewImg.src = e.target.result;
      if (previewWrap) previewWrap.style.display = '';
      if (zone)        zone.style.display = 'none';
      slipUrl = 'pending_upload'; // placeholder — actual URL set during submitOrder
    };
    reader.readAsDataURL(file);
    runSlipVerify(file);
  }
}

// ─── ตรวจสลิปอัตโนมัติ (ไม่บล็อกการสั่งซื้อ — แค่เตือน + ติดธงให้แอดมิน) ───
async function runSlipVerify(file) {
  const box = document.getElementById('slip-verify-status');
  if (!window.DMC || !DMC.verifySlip) return;     // โมดูลไม่พร้อม → ข้าม
  if (box) {
    box.style.display = '';
    box.style.color = 'var(--text-3)';
    box.innerHTML = '<span class="spinner" style="width:13px;height:13px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:0.35rem"></span> กำลังตรวจสลิป...';
  }
  let total = 0;
  try { total = (computeTotals() || {}).total || 0; } catch (e) {}
  let r;
  try { r = await DMC.verifySlip(file, { orderTotal: total }); }
  catch (e) { r = { status: 'unverified', reason: 'ตรวจสลิปไม่สำเร็จ' }; }

  // กันผลเก่าทับ (ลูกค้าเปลี่ยนสลิประหว่างตรวจ)
  if (file !== window._slipFile) return;
  window._slipVerify = r;
  if (!box) return;

  if (r.status === 'passed') {
    box.style.color = 'var(--emerald-light)';
    box.innerHTML = '✅ ' + (r.reason || 'ตรวจสลิปอัตโนมัติผ่าน');
  } else if (r.status === 'failed') {
    box.style.color = 'var(--amber, #f59e0b)';
    box.innerHTML = '⚠️ ' + DMC.escapeHtml(r.reason || 'สลิปอาจไม่ถูกต้อง') +
      '<br><span style="color:var(--text-3)">ยังสั่งซื้อได้ตามปกติ — ทางร้านจะตรวจสลิปอีกครั้งก่อนจัดส่ง</span>';
  } else {
    box.style.color = 'var(--text-3)';
    box.innerHTML = 'ℹ️ ' + DMC.escapeHtml(r.reason || 'ข้ามการตรวจอัตโนมัติ');
  }
}

// ─── Coupon ───
// V4: คูปองย้ายไป Firestore collection 'coupons' (doc id = CODE) — จัดการจากหลังบ้าน
// validate + นับการใช้แบบ atomic (กันใช้เกินลิมิต) ใน applyCoupon() / submitOrder()

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
  _markCouponApplied(false);   // ตั้งสถานะปุ่มเริ่มต้น
  document.getElementById('coupon-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
  });
}

// V4: ดึงคูปองจาก Firestore + validate ครบเงื่อนไข (active/วันที่/ยอดขั้นต่ำ/โควต้า)
async function applyCoupon() {
  const input = document.getElementById('coupon-input');
  const code  = (input?.value || '').trim().toUpperCase();
  if (!code) return;
  const btn = document.getElementById('apply-coupon-btn');
  if (btn) btn.disabled = true;

  try {
    if (!db) db = await DMC.getFirebaseReady();
    const doc = await db.collection('coupons').doc(code).get();
    if (!doc.exists) return failCoupon('ไม่พบโค้ดนี้');
    const c = doc.data();

    if (c.active === false) return failCoupon('โค้ดนี้ถูกปิดใช้งาน');
    const now = Date.now();
    if (c.startAt  && now < _toMs(c.startAt))  return failCoupon('ยังไม่ถึงเวลาใช้โค้ดนี้');
    if (c.expireAt && now > _toMs(c.expireAt)) return failCoupon('โค้ดหมดอายุแล้ว');
    const subtotal = DMC.getCartTotal();
    if (c.minSpend && subtotal < Number(c.minSpend)) return failCoupon(`ยอดสั่งซื้อขั้นต่ำ ${DMC.formatPrice(Number(c.minSpend))}`);
    if (c.usageLimit && Number(c.usedCount || 0) >= Number(c.usageLimit)) return failCoupon('โค้ดถูกใช้ครบจำนวนแล้ว');

    appliedCoupon = {
      code,
      type:        c.type || 'percent',
      value:       Number(c.value || 0),
      minSpend:    Number(c.minSpend || 0),
      maxDiscount: Number(c.maxDiscount || 0),
      firstOrderOnly: !!c.firstOrderOnly,   // V4.4: เช็กตอนสั่งจากเบอร์
      oncePerPhone:   !!c.oncePerPhone,
    };
    renderSummary();
    const t = computeTotals();
    const msg = appliedCoupon.type === 'freeship' ? 'ส่งฟรี' : DMC.formatPrice(t.discount);
    DMC.toast(`✅ ใช้โค้ด ${code} สำเร็จ — ${msg}`, 'success');
    if (appliedCoupon.firstOrderOnly) DMC.toast('ℹ️ คูปองนี้สำหรับลูกค้าใหม่ (เช็กจากเบอร์ตอนสั่งซื้อ)', 'info', 4500);
    if (input) input.disabled = true;
    _markCouponApplied(true);
  } catch (e) {
    failCoupon('ตรวจสอบโค้ดไม่สำเร็จ ลองใหม่อีกครั้ง');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function failCoupon(reason) {
  appliedCoupon = null;
  renderSummary();
  _markCouponApplied(false);
  DMC.toast('❌ ' + reason, 'error');
}

function removeCoupon() {
  appliedCoupon = null;
  const input = document.getElementById('coupon-input');
  if (input) { input.disabled = false; input.value = ''; }
  _markCouponApplied(false);
  renderSummary();
}

function _markCouponApplied(on) {
  const btn = document.getElementById('apply-coupon-btn');
  if (!btn) return;
  if (on) { btn.textContent = 'เอาออก'; btn.onclick = removeCoupon; }
  else    { btn.textContent = 'ใช้โค้ด'; btn.onclick = applyCoupon; }
}

// แปลงวันที่หลายรูปแบบ (ISO string / number / Firestore Timestamp) → ms
function _toMs(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return new Date(v).getTime();
  if (v.toMillis) return v.toMillis();
  if (v.seconds)  return v.seconds * 1000;
  return 0;
}

// ─── Submit Order ───
let _orderSubmitting = false;   // V16: กันกดส่งซ้ำ (double-submit) ระหว่างกำลังอัป/บันทึก
async function submitOrder() {
  const btn = document.getElementById('submit-order-btn');
  if (!btn) return;
  if (_orderSubmitting) return;   // กำลังส่งอยู่ — ไม่สร้างออเดอร์ซ้ำ

  if (selectedPayment === 'promptpay' && !slipUrl) {
    DMC.toast('กรุณาแนบสลิปโอนเงินก่อน', 'error');
    return;
  }

  // V4.4: เช็กคูปองตามเบอร์โทร (ลูกค้าใหม่ / 1 เบอร์ครั้งเดียว) — ก่อนเริ่มอัปโหลด เพื่อ abort ได้สะอาด
  if (appliedCoupon && (appliedCoupon.firstOrderOnly || appliedCoupon.oncePerPhone)) {
    const _ph = DMC.normalizePhone(document.getElementById('customer-phone')?.value || '');
    if (_ph) {
      try {
        if (!db) db = await DMC.getFirebaseReady();
        if (appliedCoupon.firstOrderOnly) {
          const d = await db.collection('couponGuard').doc('cust__' + _ph).get();
          if (d.exists) { DMC.toast('คูปอง ' + appliedCoupon.code + ' สำหรับลูกค้าใหม่เท่านั้น — เบอร์นี้เคยสั่งซื้อแล้ว 🙏', 'error', 5500); return; }
        }
        if (appliedCoupon.oncePerPhone) {
          const d = await db.collection('couponGuard').doc(appliedCoupon.code + '__' + _ph).get();
          if (d.exists) { DMC.toast('เบอร์นี้ใช้คูปอง ' + appliedCoupon.code + ' ไปแล้ว 🙏', 'error', 5500); return; }
        }
      } catch (e) { console.warn('coupon guard check skipped:', e.message); }   // fail-open: เน็ตมีปัญหาก็ให้สั่งได้
    }
  }

  _orderSubmitting = true;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:0.4rem"></span> กำลังส่งออเดอร์...';

  const orderId = DMC.generateOrderId();   // V3: สร้างก่อน เพื่อใช้เป็น path ของไฟล์ private

  // V16: อัปสลิปผ่าน uploadSensitive → ถ้าเปิด Firebase Storage จะเป็น private (ไม่งั้น fallback ImgBB อัตโนมัติ)
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

  // อัปรูปงานของลูกค้า — เก็บที่เดียวกับรูปสินค้า (ImgBB ผ่าน Worker) เช่นเดียวกับสลิป
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

  const _t = computeTotals();        // V4: ค่าส่ง + ค่าธรรมเนียม + ส่วนลดคูปอง (แหล่งเดียว)
  const subtotal       = _t.subtotal;
  const shipping       = _t.shipping;
  const surcharge      = _t.surcharge;
  const couponDiscount = _t.discount;
  const total          = _t.total;

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
    itemsSummary:    cart.map(i => `${i.name} ×${i.qty}${i.customDetails ? ' [📝 '+i.customDetails+']' : ''}`).join(', '),
    subtotal,
    shipping,
    surcharge,
    couponCode:      appliedCoupon ? appliedCoupon.code : '',
    couponDiscount,
    total,
    status:          'pending',
    slipUrl:         selectedPayment === 'promptpay' ? slipUrl : '',
    fileUrls:        uploadedFileUrls,
    createdAt:       new Date().toISOString(),
  };

  // ผลตรวจสลิปอัตโนมัติ (ติดธงให้แอดมิน — ไม่บล็อกการสั่งซื้อ)
  if (selectedPayment === 'promptpay' && window._slipVerify) {
    const sv = window._slipVerify;
    orderData.slipRef = sv.ref || '';
    orderData.slipVerify = {
      status:    sv.status   || 'unverified',
      reason:    sv.reason   || '',
      provider:  sv.provider || 'local',
      amount:    (sv.amount != null) ? sv.amount : null,
      checkedAt: sv.checkedAt || new Date().toISOString(),
    };
  }

  let _couponReservedRef = null;   // V24/BUG-B: เก็บ ref ไว้ "คืนสิทธิ์" ถ้าสร้างออเดอร์ล้มเหลวภายหลัง
  try {
    // V16: จองสิทธิ์คูปอง "ก่อน" สร้างออเดอร์ (atomic) — ถ้าคูปองเต็มลิมิตให้ยกเลิกทันที
    //      (เดิม: นับหลังสร้างออเดอร์ + กลืน error → ลูกค้าใช้คูปองเกินลิมิตได้)
    if (appliedCoupon && db) {
      const ref = db.collection('coupons').doc(appliedCoupon.code);
      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (!snap.exists) return;                  // ไม่มีคูปองนี้ใน Firestore — ปล่อยผ่าน (กันพัง)
          const used  = Number(snap.data().usedCount || 0);
          const limit = Number(snap.data().usageLimit || 0);
          if (limit > 0 && used >= limit) throw new Error('COUPON_EXHAUSTED');
          tx.update(ref, { usedCount: used + 1 });   // จองสิทธิ์ +1 (ตรงกับ rules)
        });
        _couponReservedRef = ref;                    // จองสำเร็จ → ถ้าออเดอร์ล้มจะคืนสิทธิ์
      } catch (e) {
        if (String(e && e.message).indexOf('COUPON_EXHAUSTED') !== -1) {
          DMC.toast('ขออภัย คูปอง ' + appliedCoupon.code + ' ถูกใช้ครบจำนวนแล้ว 🙏 กรุณานำส่วนลดออกแล้วลองใหม่', 'error', 6000);
          btn.disabled = false; btn.innerHTML = '✅ ยืนยันออเดอร์'; _orderSubmitting = false;
          return;
        }
        console.warn('coupon reserve skipped (network/permission):', e.message);  // เน็ต/สิทธิ์มีปัญหา → ไม่บล็อกการสั่ง
      }
    }

    // Save order — V17: ถ้าเปิด SERVER_ORDER ให้ Worker คำนวณยอดจากราคาจริง+เขียน Firestore (ปิดช่องโหว่ CRIT-01)
    //   ถ้าไม่เปิด / Worker ตอบ fallback / ผิดพลาด → เขียน Firestore ตรงแบบเดิม (เช็คเอาต์ไม่มีวันพัง)
    let savedDocId = null;
    let serverOk = false;
    const _SO = (window.DMC_CONFIG || {}).SERVER_ORDER || {};
    if (_SO.enabled) {
      try {
        const _wk = (window.DMC_CONFIG || {}).CF_WORKER_URL || '';
        const _res = await fetch(_wk + '/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(typeof dmcWorkerKeyHeader === 'function' ? dmcWorkerKeyHeader() : {}) },
          body: JSON.stringify(orderData),
        });
        const _j = await _res.json().catch(() => ({}));
        if (_j && _j.ok && _j.docId) {
          savedDocId = _j.docId;
          serverOk = true;
          if (_j.total != null) orderData.total = _j.total;   // ใช้ยอดจากเซิร์ฟเวอร์ในการแจ้งเตือน/แสดงผล
        }
        // _j.fallback === true หรือ error → ไหลไปเขียนตรงด้านล่าง
      } catch (e) { console.warn('server order failed, fallback to client write:', e.message); }
    }

    // เขียน Firestore ตรง (เมื่อไม่ได้ใช้เซิร์ฟเวอร์ หรือเซิร์ฟเวอร์ใช้ไม่ได้)
    if (!serverOk && db) {
      const docRef = await db.collection('orders').add({
        ...orderData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      savedDocId = docRef.id;
    }

    // V4.4: บันทึก marker เบอร์ลง couponGuard (existence = เคยสั่ง/เคยใช้คูปอง) — ใช้เช็กครั้งหน้า
    if (db && orderData.phoneSearch) {
      const _ph = orderData.phoneSearch;
      const _FV = firebase.firestore.FieldValue;
      // mark "เบอร์นี้เป็นลูกค้าแล้ว" (ทุกออเดอร์) → ใช้เช็ก firstOrderOnly
      db.collection('couponGuard').doc('cust__' + _ph).set({ at: _FV.serverTimestamp() }).catch(() => {});
      // mark "เบอร์นี้ใช้คูปองนี้แล้ว" (เฉพาะคูปอง 1-เบอร์-ครั้งเดียว) → ใช้เช็ก oncePerPhone
      if (appliedCoupon && appliedCoupon.oncePerPhone) {
        db.collection('couponGuard').doc(appliedCoupon.code + '__' + _ph).set({ code: appliedCoupon.code, at: _FV.serverTimestamp() }).catch(() => {});
      }
    }

    // บันทึกลงเครื่องนี้ — ลูกค้าดูประวัติได้ทันทีที่หน้า "ติดตามออเดอร์"
    if (savedDocId) DMC.saveMyOrder(savedDocId, orderId);

    // กันสลิปซ้ำ: จดอ้างอิง QR ของสลิปว่าถูกใช้กับออเดอร์นี้แล้ว (existence = เคยใช้)
    if (DMC.recordSlipUsed && window._slipVerify && window._slipVerify.refHash) {
      DMC.recordSlipUsed(window._slipVerify.refHash, orderId).catch(() => {});
    }

    // V16: แจ้งเตือน LINE แบบ "ไม่รอ" (fire-and-forget) → หน้าสำเร็จขึ้นทันที ไม่ค้างถ้า Worker ช้า/ล่ม
    DMC.sendLineNotify(orderData).catch(() => {});

    // Clear cart
    DMC.saveCart([]);
    window._slipFile = null; window._slipVerify = null;   // เคลียร์สลิป/ผลตรวจ
    window._orderFiles = [];   // V.upgrade1: เคลียร์ไฟล์ที่อัปแล้ว
    window._attachedDesignUrls = [];                     // V2
    try { localStorage.removeItem('dmc_pending_designs'); } catch(e){}  // V2: เคลียร์แบบที่แนบ

    // Show success
    showSuccess(orderId, total);

    // Note: ระบบแจ้งเตือนลูกค้าทาง LINE ต้องทำผ่านหน้า Admin
    // (ส่ง LINE Push ถึงลูกค้าได้เมื่อมี User ID ของลูกค้า)

  } catch (err) {
    console.error('Order submit error:', err);
    // V24/BUG-B: ออเดอร์ล้มเหลวหลังจองคูปองไปแล้ว → คืนสิทธิ์ usedCount -1 (กันคูปอง "หายฟรี")
    if (_couponReservedRef) {
      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(_couponReservedRef);
          if (!snap.exists) return;
          const used = Number(snap.data().usedCount || 0);
          if (used > 0) tx.update(_couponReservedRef, { usedCount: used - 1 });
        });
      } catch (e) { console.warn('coupon rollback skipped:', e.message); }
      _couponReservedRef = null;
    }
    DMC.toast('เกิดข้อผิดพลาด กรุณาลองใหม่หรือติดต่อ LINE', 'error');
    btn.disabled = false;
    btn.innerHTML = '✅ ยืนยันออเดอร์';
    _orderSubmitting = false;   // V16: ปลดล็อกให้ลองส่งใหม่ได้
  }
}

async function showSuccess(orderId, total) {
  document.getElementById('order-wrapper').style.display = 'none';
  document.getElementById('success-page').style.display  = '';
  document.getElementById('success-order-id').textContent = orderId;
  // V16: ปุ่มคัดลอกเลขออเดอร์ (ลูกค้าใช้เลขนี้ติดตามภายหลัง — เน้นให้บันทึกไว้)
  try {
    const idEl = document.getElementById('success-order-id');
    if (idEl && idEl.parentElement && !document.getElementById('copy-order-id-btn')) {
      const cp = document.createElement('button');
      cp.id = 'copy-order-id-btn';
      cp.type = 'button';
      cp.textContent = '📋 คัดลอกเลขออเดอร์';
      cp.style.cssText = 'margin-top:.7rem;display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1rem;border:1.5px solid var(--border,#e5e7eb);background:var(--bg-card,#fff);color:var(--text-2);border-radius:var(--r-lg,12px);font-family:var(--font-display),sans-serif;font-weight:600;font-size:.85rem;cursor:pointer';
      cp.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(orderId);
          cp.textContent = '✓ คัดลอกแล้ว';
          setTimeout(() => { cp.textContent = '📋 คัดลอกเลขออเดอร์'; }, 1600);
        } catch (e) { DMC.toast('กรุณาจดเลข ' + orderId + ' ไว้นะครับ', 'info', 4000); }
      });
      idEl.parentElement.appendChild(cp);
    }
  } catch (e) {}
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
