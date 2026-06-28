/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — admin-content.js
   Site Content CMS
   (แยกจาก admin.js เดิม เพื่อให้ดูแลง่าย — โหลดตามลำดับใน admin.html)
═══════════════════════════════════════════════ */
'use strict';

// ══════════════════════════════════════════════
//  SITE CONTENT CMS (แก้หน้าบ้านจากหลังบ้าน)
// ══════════════════════════════════════════════
async function loadContentCMS(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>📝 เนื้อหาเว็บไซต์</h2><p>แก้ไขข้อความหน้าบ้านทั้งหมด — บันทึกแล้วมีผลทันที</p></div>
      <div class="admin-topbar-actions">
        <a href="about.html?edit=1" class="btn btn-ghost btn-md" style="border-radius:var(--r-lg)" title="ไปแก้เนื้อหาบนหน้าเว็บจริงแบบเห็นภาพ">✏️ แก้บนหน้าเว็บจริง</a>
        <button class="btn btn-primary btn-md" id="cms-save-btn">💾 บันทึกทั้งหมด</button>
      </div>
    </div>
    <div class="settings-grid" id="cms-grid">
      <div style="grid-column:1/-1;text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div>
    </div>`;

  let content;
  try {
    if (typeof CMS !== 'undefined') CMS.clearCache();
    content = await CMS.get();
  } catch(e) {
    document.getElementById('cms-grid').innerHTML = '<div style="grid-column:1/-1;color:var(--rose)">โหลดเนื้อหาไม่สำเร็จ</div>';
    return;
  }

  const v = (s) => DMC.escapeHtml(s || '');
  const _an = content.announce || { active:false, text:'' };
  document.getElementById('cms-grid').innerHTML = `
    <!-- ประกาศด่วน (แถบบนสุดทุกหน้า) -->
    <div class="admin-box" style="grid-column:1/-1">
      <div class="admin-box-header"><div class="admin-box-title">📢 แถบประกาศด่วน (บนสุดทุกหน้า)</div></div>
      <p style="font-size:.82rem;color:var(--text-2);line-height:1.6;margin-bottom:.9rem">เช่น "หยุดส่งช่วงสงกรานต์ 13–15 เม.ย." — เปิดแล้วจะแสดงเป็นแถบบนสุดของทุกหน้า</p>
      <label style="display:flex;align-items:center;gap:.45rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem;margin-bottom:.85rem">
        <input type="checkbox" id="cms-announce-active" ${_an.active ? 'checked' : ''} style="accent-color:var(--accent)"> แสดงแถบประกาศ
      </label>
      <div class="form-group" style="margin:0"><label class="form-label">ข้อความประกาศ</label><input class="form-input" id="cms-announce-text" value="${v(_an.text)}" placeholder="เช่น 🎉 ลดพิเศษเดือนนี้ ทุกออเดอร์ส่งฟรี!"></div>
    </div>

    <!-- Hero -->
    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">🏠 หน้าแรก — Hero</div></div>
      <div class="form-group"><label class="form-label">ป้ายเล็กด้านบน</label><input class="form-input" id="cms-hero-badge" value="${v(content.hero.badge)}"></div>
      <div class="form-group"><label class="form-label">หัวข้อบรรทัด 1</label><input class="form-input" id="cms-hero-t1" value="${v(content.hero.title1)}"></div>
      <div class="form-group"><label class="form-label">หัวข้อบรรทัด 2 (ไฮไลต์)</label><input class="form-input" id="cms-hero-t2" value="${v(content.hero.title2)}"></div>
      <div class="form-group"><label class="form-label">หัวข้อบรรทัด 3</label><input class="form-input" id="cms-hero-t3" value="${v(content.hero.title3)}"></div>
      <div class="form-group"><label class="form-label">คำอธิบายใต้หัวข้อ</label><textarea class="form-input form-textarea" id="cms-hero-desc">${v(content.hero.desc)}</textarea></div>
    </div>

    <!-- ตัวเลขความเชื่อมั่น + โปรโมชั่น -->
    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">📊 ตัวเลขความเชื่อมั่น</div></div>
      <div class="form-row" style="margin-bottom:1rem">
        <div class="form-group" style="margin:0"><label class="form-label">จำนวนออเดอร์ เช่น 500+</label><input class="form-input" id="cms-stat-orders" value="${v(content.stats.orders)}"></div>
        <div class="form-group" style="margin:0"><label class="form-label">คะแนนรีวิว เช่น 4.9/5</label><input class="form-input" id="cms-stat-rating" value="${v(content.stats.rating)}"></div>
      </div>
      <div class="form-group"><label class="form-label">เวลาผลิต (วัน) เช่น 1-3</label><input class="form-input" id="cms-stat-days" value="${v(content.stats.days)}"></div>
      <div class="admin-box-header" style="margin-top:1.25rem"><div class="admin-box-title">🎁 แบนเนอร์โปรโมชั่น</div></div>
      <label style="display:flex;align-items:center;gap:.45rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem;margin-bottom:.85rem">
        <input type="checkbox" id="cms-promo-active" ${content.promo.active ? 'checked' : ''} style="accent-color:var(--accent)"> แสดงแบนเนอร์โปรโมชั่น
      </label>
      <div class="form-group"><label class="form-label">ป้ายกำกับ</label><input class="form-input" id="cms-promo-tag" value="${v(content.promo.tag)}"></div>
      <div class="form-group"><label class="form-label">หัวข้อโปร</label><input class="form-input" id="cms-promo-title" value="${v(content.promo.title)}"></div>
      <div class="form-group"><label class="form-label">รายละเอียด</label><input class="form-input" id="cms-promo-desc" value="${v(content.promo.desc)}"></div>
      <div class="form-group"><label class="form-label">ข้อความปุ่ม</label><input class="form-input" id="cms-promo-btn" value="${v(content.promo.btnText)}"></div>
    </div>

    <!-- ช่องทางติดต่อ -->
    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">📞 ช่องทางติดต่อ (ใช้ทั้งเว็บ)</div></div>
      <div class="form-group"><label class="form-label">LINE URL</label><input class="form-input" id="cms-ct-line" value="${v(content.contact.line)}" placeholder="https://line.me/R/ti/p/@xxx"></div>
      <div class="form-group"><label class="form-label">ชื่อ LINE ID แสดงผล</label><input class="form-input" id="cms-ct-linelabel" value="${v(content.contact.lineLabel)}" placeholder="@yourshop"></div>
      <div class="form-group"><label class="form-label">Facebook URL</label><input class="form-input" id="cms-ct-fb" value="${v(content.contact.facebook)}"></div>
      <div class="form-group"><label class="form-label">Instagram URL</label><input class="form-input" id="cms-ct-ig" value="${v(content.contact.instagram)}"></div>
      <div class="form-group"><label class="form-label">TikTok URL</label><input class="form-input" id="cms-ct-tiktok" value="${v(content.contact.tiktok)}"></div>
      <div class="form-row" style="margin-bottom:0">
        <div class="form-group" style="margin:0"><label class="form-label">อีเมล</label><input class="form-input" id="cms-ct-email" value="${v(content.contact.email)}"></div>
        <div class="form-group" style="margin:0"><label class="form-label">เบอร์โทรร้าน</label><input class="form-input" id="cms-ct-phone" value="${v(content.contact.phone)}"></div>
      </div>
      <div class="form-group" style="margin-top:1rem"><label class="form-label">เวลาทำการ</label><input class="form-input" id="cms-ct-hours" value="${v(content.contact.hours)}"></div>
    </div>

    <!-- PromptPay -->
    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">💳 PromptPay (เปลี่ยนบัญชีได้ที่นี่)</div></div>
      <div class="form-group">
        <label class="form-label">หมายเลขพร้อมเพย์ (เบอร์/เลขบัตร ปชช.)</label>
        <input class="form-input" id="cms-pay-id" value="${v(content.payment.promptpayId)}" placeholder="0812345678" inputmode="numeric">
        <div style="font-size:.74rem;color:var(--text-3);margin-top:.3rem">ระบบสร้าง QR พร้อมยอดเงินให้อัตโนมัติ</div>
      </div>
      <div class="form-group"><label class="form-label">ชื่อบัญชี (แสดงใต้ QR)</label><input class="form-input" id="cms-pay-name" value="${v(content.payment.promptpayName)}" placeholder="นายชัยวุฒิ ..."></div>
      <div class="form-group">
        <label class="form-label">หรืออัปโหลดรูป QR เอง (ถ้าใส่ จะใช้รูปนี้แทน)</label>
        <div style="display:flex;gap:.6rem;align-items:center;margin-bottom:.45rem">
          <input type="file" id="cms-qr-file" accept="image/*" style="display:none">
          <button class="btn btn-ghost btn-sm" id="cms-qr-upload-btn" style="border-radius:var(--r-md)">📤 อัปโหลดรูป QR</button>
          <span id="cms-qr-status" style="font-size:.76rem;color:var(--text-3)"></span>
        </div>
        <input class="form-input" id="cms-pay-qrimg" value="${v(content.payment.qrImageUrl)}" placeholder="URL รูป QR (เว้นว่าง = ใช้ QR อัตโนมัติ)">
      </div>
      <div id="cms-qr-preview" style="text-align:center"></div>
    </div>

    <!-- ช่องทางชำระเงิน (เปิด/ปิด + พร้อม/ไม่พร้อม) -->
    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">🔘 ช่องทางชำระเงิน</div></div>
      <p style="font-size:.82rem;color:var(--text-2);line-height:1.6;margin-bottom:.9rem">
        เลือกช่องทางที่จะแสดงในหน้าชำระเงิน และตั้งสถานะว่าพร้อมใช้งานหรือยัง
      </p>
      <div id="cms-pay-methods-list"></div>
      <div style="font-size:.74rem;color:var(--text-3);margin-top:.6rem;line-height:1.6">
        💡 <strong>แสดงในเว็บ</strong> = ลูกค้าเห็นช่องทางนี้ &nbsp;·&nbsp; <strong>พร้อมใช้งาน</strong> = กดเลือกได้ (ปิด = ขึ้น "เร็วๆ นี้" กดไม่ได้)
      </div>
    </div>

    <!-- ค่าส่ง / ค่าธรรมเนียม -->
    <div class="admin-box">
      <div class="admin-box-header"><div class="admin-box-title">🚚 ค่าส่ง / ค่าธรรมเนียม</div></div>
      <p style="font-size:.82rem;color:var(--text-2);line-height:1.6;margin-bottom:.9rem">ปรับค่าจัดส่งและค่าธรรมเนียมแต่ละช่องทาง — มีผลกับยอดรวมในตะกร้าทันที</p>
      <div class="form-row" style="margin-bottom:1rem">
        <div class="form-group" style="margin:0"><label class="form-label">ค่าส่ง โอน/PromptPay (บาท)</label><input class="form-input" id="cms-fee-ship-transfer" type="number" min="0" inputmode="numeric" value="${Number((content.fees&&content.fees.shipTransfer) ?? 50)}"></div>
        <div class="form-group" style="margin:0"><label class="form-label">ค่าส่ง COD (บาท)</label><input class="form-input" id="cms-fee-ship-cod" type="number" min="0" inputmode="numeric" value="${Number((content.fees&&content.fees.shipCod) ?? 80)}"></div>
      </div>
      <div class="form-group"><label class="form-label">ส่งฟรีเมื่อยอดสินค้าถึง (บาท, 0 = ปิด)</label><input class="form-input" id="cms-fee-freeship-min" type="number" min="0" inputmode="numeric" value="${Number((content.fees&&content.fees.freeShipMin) ?? 0)}"></div>
      <div class="form-row" style="margin-bottom:0">
        <div class="form-group" style="margin:0"><label class="form-label">ค่าธรรมเนียมเพิ่ม PromptPay (บาท)</label><input class="form-input" id="cms-fee-sur-promptpay" type="number" min="0" inputmode="numeric" value="${Number((content.fees&&content.fees.surchargePromptpay) ?? 0)}"></div>
        <div class="form-group" style="margin:0"><label class="form-label">ค่าธรรมเนียมเพิ่ม COD (บาท)</label><input class="form-input" id="cms-fee-sur-cod" type="number" min="0" inputmode="numeric" value="${Number((content.fees&&content.fees.surchargeCod) ?? 0)}"></div>
      </div>
    </div>

    <!-- FAQ -->
    <div class="admin-box" style="grid-column:1/-1">
      <div class="admin-box-header">
        <div class="admin-box-title">❓ คำถามที่พบบ่อย (หน้า "วิธีสั่งซื้อ")</div>
        <span class="admin-box-action" id="cms-faq-add">+ เพิ่มคำถาม</span>
      </div>
      <div id="cms-faq-list"></div>
    </div>`;

  // ── FAQ editor ──
  let faqData = Array.isArray(content.faq) ? content.faq.map(f => ({ q: f.q||'', a: f.a||'' })) : [];
  function renderFaqList() {
    const wrap = document.getElementById('cms-faq-list');
    wrap.innerHTML = faqData.map((f, i) => `
      <div style="background:var(--bg-mid);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:.85rem;margin-bottom:.65rem">
        <div class="form-group" style="margin-bottom:.6rem">
          <label class="form-label">คำถาม ${i+1}</label>
          <input class="form-input cms-faq-q" data-i="${i}" value="${DMC.escapeHtml(f.q)}">
        </div>
        <div class="form-group" style="margin-bottom:.6rem">
          <label class="form-label">คำตอบ</label>
          <textarea class="form-input form-textarea cms-faq-a" data-i="${i}" style="min-height:70px">${DMC.escapeHtml(f.a)}</textarea>
        </div>
        <button class="table-action-btn cms-faq-del" data-i="${i}" style="color:var(--rose);border-color:var(--rose)">🗑️ ลบข้อนี้</button>
      </div>`).join('') || '<div style="color:var(--text-3);text-align:center;padding:1rem;font-size:.85rem">ยังไม่มีคำถาม กด "+ เพิ่มคำถาม"</div>';

    wrap.querySelectorAll('.cms-faq-q').forEach(el => el.addEventListener('input', () => { faqData[+el.dataset.i].q = el.value; }));
    wrap.querySelectorAll('.cms-faq-a').forEach(el => el.addEventListener('input', () => { faqData[+el.dataset.i].a = el.value; }));
    wrap.querySelectorAll('.cms-faq-del').forEach(el => el.addEventListener('click', async () => { faqData.splice(+el.dataset.i, 1); renderFaqList(); }));
  }
  renderFaqList();
  document.getElementById('cms-faq-add')?.addEventListener('click', async () => { faqData.push({ q:'', a:'' }); renderFaqList(); });

  // ── ช่องทางชำระเงิน: render toggles ──
  const PAY_META = {
    promptpay: { icon:'📱', name:'PromptPay',          sub:'โอน QR พร้อมเพย์' },
    cod:       { icon:'🚚', name:'เก็บเงินปลายทาง',     sub:'COD' },
    truemoney: { icon:'💰', name:'TrueMoney Wallet',    sub:'ทรูมันนี่ วอลเล็ท' },
    credit:    { icon:'💳', name:'บัตรเครดิต/เดบิต',     sub:'Visa · Mastercard' },
  };
  const payMethodsCfg = JSON.parse(JSON.stringify(
    (content.payment && content.payment.methods) || {
      promptpay:{shown:true,ready:true}, cod:{shown:true,ready:true},
      truemoney:{shown:false,ready:false}, credit:{shown:false,ready:false}
    }
  ));
  // เผื่อ key ใหม่ที่ยังไม่มีใน data เก่า
  ['promptpay','cod','truemoney','credit'].forEach(k => { if (!payMethodsCfg[k]) payMethodsCfg[k] = {shown:false,ready:false}; });

  function renderPayMethods() {
    const box = document.getElementById('cms-pay-methods-list');
    if (!box) return;
    box.innerHTML = ['promptpay','cod','truemoney','credit'].map(key => {
      const m = PAY_META[key];
      const c = payMethodsCfg[key];
      return `
        <div style="display:flex;align-items:center;gap:.7rem;padding:.7rem .2rem;border-bottom:1px solid var(--border)">
          <span style="font-size:1.4rem">${m.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-family:var(--font-display);font-weight:700;font-size:.9rem;color:var(--text-1)">${m.name}</div>
            <div style="font-size:.74rem;color:var(--text-3)">${m.sub}</div>
          </div>
          <label class="cms-pay-toggle" title="แสดงในเว็บ">
            <input type="checkbox" class="cms-pay-shown" data-k="${key}" ${c.shown ? 'checked' : ''}>
            <span class="cms-pay-toggle-label">แสดง</span>
          </label>
          <label class="cms-pay-toggle" title="พร้อมใช้งาน">
            <input type="checkbox" class="cms-pay-ready" data-k="${key}" ${c.ready ? 'checked' : ''}>
            <span class="cms-pay-toggle-label">พร้อม</span>
          </label>
        </div>`;
    }).join('');
    box.querySelectorAll('.cms-pay-shown').forEach(el => el.addEventListener('change', () => { payMethodsCfg[el.dataset.k].shown = el.checked; }));
    box.querySelectorAll('.cms-pay-ready').forEach(el => el.addEventListener('change', () => { payMethodsCfg[el.dataset.k].ready = el.checked; }));
  }
  renderPayMethods();
  window._getPayMethodsCfg = () => payMethodsCfg;  // ให้ปุ่มบันทึกอ่านค่า

  // ── QR upload + live preview ──
  const qrFile = document.getElementById('cms-qr-file');
  document.getElementById('cms-qr-upload-btn')?.addEventListener('click', () => qrFile?.click());
  qrFile?.addEventListener('change', async () => {
    const f = qrFile.files[0];
    if (!f) return;
    const st = document.getElementById('cms-qr-status');
    st.textContent = '⏳ กำลังอัปโหลด...';
    try {
      const res = await DMC.uploadToImgBB(f);
      document.getElementById('cms-pay-qrimg').value = res.url;
      st.textContent = '✅ อัปโหลดแล้ว';
      updateQrPreview();
    } catch(e) { st.textContent = '❌ อัปโหลดไม่สำเร็จ'; }
  });
  function updateQrPreview() {
    const id  = document.getElementById('cms-pay-id')?.value.trim();
    const img = document.getElementById('cms-pay-qrimg')?.value.trim();
    const box = document.getElementById('cms-qr-preview');
    const url = img || (id ? 'https://promptpay.io/' + id.replace(/\D/g,'') : '');
    box.innerHTML = url ? '<img src="' + url + '" alt="QR" style="max-width:160px;border-radius:12px;border:1px solid var(--border);margin-top:.4rem">' : '';
  }
  document.getElementById('cms-pay-id')?.addEventListener('input', DMC.debounce(updateQrPreview, 500));
  document.getElementById('cms-pay-qrimg')?.addEventListener('input', DMC.debounce(updateQrPreview, 500));
  updateQrPreview();

  // ── Save ──
  document.getElementById('cms-save-btn')?.addEventListener('click', async () => {
    const g = (id) => document.getElementById(id)?.value.trim() || '';
    const data = {
      announce: { active: !!document.getElementById('cms-announce-active')?.checked, text: g('cms-announce-text') },
      hero: { badge: g('cms-hero-badge'), title1: g('cms-hero-t1'), title2: g('cms-hero-t2'), title3: g('cms-hero-t3'), desc: document.getElementById('cms-hero-desc')?.value.trim() || '' },
      stats: { orders: g('cms-stat-orders'), rating: g('cms-stat-rating'), days: g('cms-stat-days') },
      promo: { active: !!document.getElementById('cms-promo-active')?.checked, tag: g('cms-promo-tag'), title: g('cms-promo-title'), desc: g('cms-promo-desc'), btnText: g('cms-promo-btn'), btnLink: 'catalog.html' },
      contact: { line: g('cms-ct-line'), lineLabel: g('cms-ct-linelabel'), facebook: g('cms-ct-fb'), instagram: g('cms-ct-ig'), tiktok: g('cms-ct-tiktok'), email: g('cms-ct-email'), phone: g('cms-ct-phone'), hours: g('cms-ct-hours') },
      payment: { promptpayId: g('cms-pay-id'), promptpayName: g('cms-pay-name'), qrImageUrl: g('cms-pay-qrimg'), methods: (window._getPayMethodsCfg ? window._getPayMethodsCfg() : undefined) },
      fees: {
        shipTransfer:       Math.max(0, Number(document.getElementById('cms-fee-ship-transfer')?.value || 0)),
        shipCod:            Math.max(0, Number(document.getElementById('cms-fee-ship-cod')?.value || 0)),
        freeShipMin:        Math.max(0, Number(document.getElementById('cms-fee-freeship-min')?.value || 0)),
        surchargePromptpay: Math.max(0, Number(document.getElementById('cms-fee-sur-promptpay')?.value || 0)),
        surchargeCod:       Math.max(0, Number(document.getElementById('cms-fee-sur-cod')?.value || 0)),
      },
      faq: faqData.filter(f => f.q.trim() && f.a.trim()),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const btn = document.getElementById('cms-save-btn');
    if (typeof Loading !== 'undefined') Loading.buttonLoad(btn);
    try {
      await db.collection('siteContent').doc('main').set(data, { merge: true });
      if (typeof CMS !== 'undefined') CMS.clearCache();
      DMC.toast('บันทึกเนื้อหาแล้ว ✅ หน้าเว็บอัปเดตทันที', 'success', 3500);
      if (window.AdminSnapshot) AdminSnapshot.autoPublish();
    } catch(e) {
      DMC.toast('บันทึกไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      if (typeof Loading !== 'undefined') Loading.buttonDone(btn);
    }
  });
}
