/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — admin-coupons.js
   Coupons Manager (Poka-yoke B)
   (แยกจาก admin.js เดิม เพื่อให้ดูแลง่าย — โหลดตามลำดับใน admin.html)
═══════════════════════════════════════════════ */
'use strict';

// ══════════════════════════════════════════════
//  COUPONS MANAGER (คูปองส่วนลด — แนว B / Poka-yoke)
// ══════════════════════════════════════════════
async function loadCouponsAdmin(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>🎟️ คูปองส่วนลด</h2><p>สร้าง/แก้คูปอง — ลูกค้ากรอกโค้ดตอนชำระเงิน ระบบนับการใช้อัตโนมัติ กันใช้เกินลิมิต</p></div>
    </div>

    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title" id="coupon-form-title">➕ สร้างคูปองใหม่</div></div>
      <input type="hidden" id="coupon-edit-id">
      <div class="form-row" style="margin-bottom:1rem">
        <div class="form-group" style="margin:0"><label class="form-label">โค้ด (A-Z, 0-9)</label><input class="form-input" id="coupon-code" maxlength="24" placeholder="เช่น WELCOME15" style="text-transform:uppercase"></div>
        <div class="form-group" style="margin:0"><label class="form-label">ประเภทส่วนลด</label>
          <select data-custom class="form-input form-select" id="coupon-type">
            <option value="percent">ลดเป็นเปอร์เซ็นต์ (%)</option>
            <option value="fixed">ลดเป็นจำนวนเงิน (บาท)</option>
            <option value="freeship">ส่งฟรี</option>
          </select>
        </div>
      </div>
      <div class="form-row" style="margin-bottom:1rem">
        <div class="form-group" style="margin:0"><label class="form-label" id="coupon-value-label">มูลค่า</label><input class="form-input" id="coupon-value" type="number" min="0" inputmode="numeric" placeholder="15"></div>
        <div class="form-group" style="margin:0"><label class="form-label">ส่วนลดสูงสุด (บาท, 0=ไม่จำกัด)</label><input class="form-input" id="coupon-maxdiscount" type="number" min="0" inputmode="numeric" value="0"></div>
      </div>
      <div class="form-row" style="margin-bottom:1rem">
        <div class="form-group" style="margin:0"><label class="form-label">ยอดขั้นต่ำ (บาท, 0=ไม่จำกัด)</label><input class="form-input" id="coupon-minspend" type="number" min="0" inputmode="numeric" value="0"></div>
        <div class="form-group" style="margin:0"><label class="form-label">จำกัดจำนวนครั้งรวม (0=ไม่จำกัด)</label><input class="form-input" id="coupon-usagelimit" type="number" min="0" inputmode="numeric" value="0"></div>
      </div>
      <div class="form-row" style="margin-bottom:1rem">
        <div class="form-group" style="margin:0"><label class="form-label">เริ่มใช้ได้ (เว้นว่าง=ทันที)</label><input class="form-input" id="coupon-start" type="date"></div>
        <div class="form-group" style="margin:0"><label class="form-label">วันหมดอายุ (เว้นว่าง=ไม่จำกัด)</label><input class="form-input" id="coupon-expire" type="date"></div>
      </div>
      <div class="form-group"><label class="form-label">คำอธิบาย (ให้แอดมินจำ)</label><input class="form-input" id="coupon-desc" maxlength="80" placeholder="เช่น โปรเปิดร้าน ลูกค้าใหม่"></div>
      <label style="display:flex;align-items:center;gap:.45rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem;margin-bottom:.55rem">
        <input type="checkbox" id="coupon-active" checked style="accent-color:var(--accent)"> เปิดใช้งานคูปองนี้
      </label>
      <label style="display:flex;align-items:center;gap:.45rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem;margin-bottom:.55rem">
        <input type="checkbox" id="coupon-firstorder" style="accent-color:var(--accent)"> 🆕 เฉพาะลูกค้าใหม่ (เบอร์ที่ไม่เคยสั่งซื้อ)
      </label>
      <label style="display:flex;align-items:center;gap:.45rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem;margin-bottom:1rem">
        <input type="checkbox" id="coupon-oncephone" style="accent-color:var(--accent)"> 📱 1 เบอร์ใช้ได้ครั้งเดียว
      </label>
      <div style="display:flex;gap:.6rem">
        <button class="btn btn-primary btn-md" id="coupon-save-btn">💾 บันทึกคูปอง</button>
        <button class="btn btn-ghost btn-md" id="coupon-cancel-btn" style="display:none">ยกเลิกแก้ไข</button>
      </div>
    </div>

    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">📋 คูปองทั้งหมด</div></div>
      <div id="coupon-list"><div style="text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div></div>
    </div>`;

  const typeSel  = document.getElementById('coupon-type');
  const valLabel = document.getElementById('coupon-value-label');
  const valInput = document.getElementById('coupon-value');
  function syncCouponType() {
    const t = typeSel.value;
    if (t === 'freeship') { valLabel.textContent = 'ส่งฟรี (ไม่ต้องใส่มูลค่า)'; valInput.value = '0'; valInput.disabled = true; }
    else { valLabel.textContent = t === 'percent' ? 'มูลค่า (%)' : 'มูลค่า (บาท)'; valInput.disabled = false; }
  }
  typeSel.addEventListener('change', syncCouponType); syncCouponType();

  document.getElementById('coupon-save-btn').addEventListener('click', saveCoupon);
  document.getElementById('coupon-cancel-btn').addEventListener('click', resetCouponForm);
  loadCouponList();
}

function _couponDateToMs(v) { if (!v) return 0; const d = new Date(v + 'T00:00:00'); return isNaN(d.getTime()) ? 0 : d.getTime(); }
function _couponMsToDate(ms) { if (!ms) return ''; const d = new Date(Number(ms)); return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10); }

function resetCouponForm() {
  ['coupon-code','coupon-value','coupon-desc'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  ['coupon-maxdiscount','coupon-minspend','coupon-usagelimit'].forEach(id => { const e = document.getElementById(id); if (e) e.value = '0'; });
  const s = document.getElementById('coupon-start'); if (s) s.value = '';
  const x = document.getElementById('coupon-expire'); if (x) x.value = '';
  document.getElementById('coupon-edit-id').value = '';
  const code = document.getElementById('coupon-code'); code.disabled = false;
  document.getElementById('coupon-active').checked = true;
  document.getElementById('coupon-firstorder').checked = false;
  document.getElementById('coupon-oncephone').checked = false;
  document.getElementById('coupon-type').value = 'percent';
  document.getElementById('coupon-type').dispatchEvent(new Event('change'));
  document.getElementById('coupon-form-title').textContent = '➕ สร้างคูปองใหม่';
  document.getElementById('coupon-cancel-btn').style.display = 'none';
}

async function saveCoupon() {
  const code = (document.getElementById('coupon-code').value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3,24}$/.test(code)) return DMC.toast('โค้ดต้องเป็น A-Z หรือ 0-9 ยาว 3-24 ตัว', 'error');
  const type = document.getElementById('coupon-type').value;
  const value = Number(document.getElementById('coupon-value').value || 0);
  if (type !== 'freeship' && value <= 0) return DMC.toast('กรอกมูลค่าส่วนลด', 'error');
  if (type === 'percent' && value > 100)  return DMC.toast('เปอร์เซ็นต์ต้องไม่เกิน 100', 'error');

  const editId = document.getElementById('coupon-edit-id').value;
  const data = {
    code, type,
    value:       type === 'freeship' ? 0 : value,
    maxDiscount: Math.max(0, Number(document.getElementById('coupon-maxdiscount').value || 0)),
    minSpend:    Math.max(0, Number(document.getElementById('coupon-minspend').value || 0)),
    usageLimit:  Math.max(0, Number(document.getElementById('coupon-usagelimit').value || 0)),
    startAt:     _couponDateToMs(document.getElementById('coupon-start').value),
    expireAt:    _couponDateToMs(document.getElementById('coupon-expire').value),
    description: (document.getElementById('coupon-desc').value || '').trim(),
    active:      !!document.getElementById('coupon-active').checked,
    firstOrderOnly: !!document.getElementById('coupon-firstorder').checked,   // เฉพาะลูกค้าใหม่ (เช็กจากเบอร์)
    oncePerPhone:   !!document.getElementById('coupon-oncephone').checked,    // 1 เบอร์/ครั้ง
  };

  const btn = document.getElementById('coupon-save-btn');
  if (typeof Loading !== 'undefined') Loading.buttonLoad(btn);
  try {
    if (!db) db = await DMC.getFirebaseReady();
    const ref = db.collection('coupons').doc(code);
    if (editId && editId === code) {
      await ref.set(data, { merge: true });             // แก้ไข — ไม่แตะ usedCount/createdAt
    } else {
      const exists = await ref.get();
      if (exists.exists) { if (typeof Loading !== 'undefined') Loading.buttonDone(btn); return DMC.toast('มีโค้ดนี้อยู่แล้ว ใช้ชื่ออื่น', 'error'); }
      data.usedCount = 0;                                // ⭐ ต้องมีเพื่อให้ rule บวกได้ (แนว B)
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await ref.set(data);
    }
    DMC.toast('บันทึกคูปองแล้ว ✅', 'success');
    resetCouponForm();
    loadCouponList();
  } catch (e) {
    DMC.toast('บันทึกไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    if (typeof Loading !== 'undefined') Loading.buttonDone(btn);
  }
}

async function loadCouponList() {
  const wrap = document.getElementById('coupon-list');
  if (!wrap) return;
  try {
    if (!db) db = await DMC.getFirebaseReady();
    const snap = await db.collection('coupons').get();
    if (snap.empty) { wrap.innerHTML = '<p style="text-align:center;color:var(--text-3);padding:1.5rem">ยังไม่มีคูปอง — สร้างด้านบนได้เลย</p>'; window._couponCache = []; return; }
    const rows = [];
    snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
    rows.sort((a, b) => (a.code > b.code ? 1 : -1));
    window._couponCache = rows;
    const now = Date.now();
    wrap.innerHTML = `
      <div style="overflow-x:auto">
        <table class="admin-table"><thead><tr><th>โค้ด</th><th>ส่วนลด</th><th>ใช้แล้ว</th><th>สถานะ</th><th></th></tr></thead><tbody>
        ${rows.map(c => {
          const disc = c.type === 'percent' ? c.value + '%' : c.type === 'fixed' ? DMC.formatPrice(c.value) : 'ส่งฟรี';
          const expired   = c.expireAt && now > Number(c.expireAt);
          const exhausted = c.usageLimit > 0 && Number(c.usedCount || 0) >= Number(c.usageLimit);
          const status = c.active === false ? '<span style="color:var(--text-3)">ปิดอยู่</span>'
            : expired   ? '<span style="color:var(--rose)">หมดอายุ</span>'
            : exhausted ? '<span style="color:var(--rose)">ใช้ครบแล้ว</span>'
            : '<span style="color:#10B981;font-weight:700">ใช้งานได้</span>';
          const used = Number(c.usedCount || 0) + (c.usageLimit > 0 ? ' / ' + c.usageLimit : '');
          return `<tr>
            <td style="font-weight:700">${DMC.escapeHtml(c.code)}${c.minSpend > 0 ? `<div style="font-size:.7rem;color:var(--text-3);font-weight:400">ขั้นต่ำ ${DMC.formatPrice(c.minSpend)}</div>` : ''}</td>
            <td>${disc}</td><td>${used}</td><td>${status}</td>
            <td style="white-space:nowrap;text-align:right">
              <button class="btn btn-ghost btn-sm" data-act="editCoupon" data-id="${DMC.escapeHtml(c.id)}" style="border-radius:var(--r-md)" title="แก้ไข">✏️</button>
              <button class="btn btn-ghost btn-sm" data-act="deleteCoupon" data-id="${DMC.escapeHtml(c.id)}" style="border-radius:var(--r-md);color:var(--rose)" title="ลบ">🗑️</button>
            </td></tr>`;
        }).join('')}
        </tbody></table>
      </div>`;
  } catch (e) {
    wrap.innerHTML = '<p style="text-align:center;color:var(--rose);padding:1.5rem">โหลดคูปองไม่สำเร็จ</p>';
  }
}

function editCoupon(id) {
  const c = (window._couponCache || []).find(x => x.id === id);
  if (!c) return;
  document.getElementById('coupon-edit-id').value = c.code;
  const code = document.getElementById('coupon-code'); code.value = c.code; code.disabled = true;
  document.getElementById('coupon-type').value = c.type || 'percent';
  document.getElementById('coupon-value').value = c.value || 0;
  document.getElementById('coupon-maxdiscount').value = c.maxDiscount || 0;
  document.getElementById('coupon-minspend').value = c.minSpend || 0;
  document.getElementById('coupon-usagelimit').value = c.usageLimit || 0;
  document.getElementById('coupon-start').value = _couponMsToDate(c.startAt);
  document.getElementById('coupon-expire').value = _couponMsToDate(c.expireAt);
  document.getElementById('coupon-desc').value = c.description || '';
  document.getElementById('coupon-active').checked = c.active !== false;
  document.getElementById('coupon-firstorder').checked = !!c.firstOrderOnly;
  document.getElementById('coupon-oncephone').checked = !!c.oncePerPhone;
  document.getElementById('coupon-type').dispatchEvent(new Event('change'));
  document.getElementById('coupon-form-title').textContent = '✏️ แก้ไขคูปอง: ' + c.code;
  document.getElementById('coupon-cancel-btn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteCoupon(id) {
  if (!(await DMC.confirm('ลบคูปอง "' + id + '" ?'))) return;
  try {
    if (!db) db = await DMC.getFirebaseReady();
    await db.collection('coupons').doc(id).delete();
    DMC.toast('ลบคูปองแล้ว', 'success');
    loadCouponList();
  } catch (e) { DMC.toast('ลบไม่สำเร็จ: ' + e.message, 'error'); }
}
