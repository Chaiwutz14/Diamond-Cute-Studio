/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — admin-products.js
   Products: Multi-image + Video + Templates + Modal
   (แยกจาก admin.js เดิม เพื่อให้ดูแลง่าย — โหลดตามลำดับใน admin.html)
═══════════════════════════════════════════════ */
'use strict';

// ══════════════════════════════════════════════
//  PRODUCTS (Multi-image + Video + Templates)
// ══════════════════════════════════════════════
async function loadProducts(container) {
  container.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-greeting"><h2>🛍️ จัดการสินค้า</h2><p>เพิ่ม แก้ไข รูปหลายรูป วิดีโอ และเทมเพลต</p></div>
      <div class="admin-topbar-actions">
        <input class="form-input" id="product-search" placeholder="🔍 ค้นหาสินค้า..." style="width:200px">
        <button class="btn btn-primary btn-md" id="add-product-btn">+ เพิ่มสินค้าใหม่</button>
      </div>
    </div>
    <div class="admin-box">
      <div id="products-table-wrap">${typeof Loading !== 'undefined' ? Loading.Skeleton.tableRows(4) : ''}</div>
    </div>`;
  document.getElementById('add-product-btn')?.addEventListener('click', () => openProductModal(null));
  document.getElementById('product-search')?.addEventListener('input', DMC.debounce(loadProductsTable, 300));
  await loadProductsTable();
}

function adminCoverOf(p) {
  if (Array.isArray(p.images) && p.images.length) {
    const ci = Number(p.coverIndex);
    const item = (!isNaN(ci) && p.images[ci]) ? p.images[ci] : p.images[0];
    return typeof item === 'string' ? item : (item.url || '');
  }
  return p.image || '';
}

async function loadProductsTable() {
  const el     = document.getElementById('products-table-wrap');
  const search = document.getElementById('product-search')?.value.toLowerCase().trim() || '';
  if (!el) return;
  try {
    const snap = await db.collection('products').get();
    if (snap.empty) {
      el.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-3)">ยังไม่มีสินค้า<br><button class="btn btn-primary btn-md" style="margin-top:1rem" data-act="openProductModal">+ เพิ่มสินค้าแรก</button></div>`;
      return;
    }
    let products = [];
    snap.forEach(doc => products.push({id:doc.id,...doc.data()}));
    if (search) products = products.filter(p => (p.name||'').toLowerCase().includes(search) || (p.category||'').toLowerCase().includes(search));
    products.sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

    const rows = products.map(p => {
      const cover = adminCoverOf(p);
      const imgCount = Array.isArray(p.images) ? p.images.length : (p.image ? 1 : 0);
      return `<tr>
      <td>
        <div style="width:46px;height:46px;border-radius:var(--r-md);background:var(--bg-mid);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:1.3rem;position:relative">
          ${cover?`<img src="${cover}" style="width:100%;height:100%;object-fit:contain;padding:2px">`:(p.emoji||'📦')}
          ${imgCount>1?`<span style="position:absolute;bottom:0;right:0;background:var(--accent);color:#fff;font-size:.55rem;padding:0 .25rem;border-radius:4px 0 0 0">${imgCount}</span>`:''}
        </div>
      </td>
      <td><div style="font-family:var(--font-display);font-weight:600">${DMC.escapeHtml(p.name)}</div><div style="font-size:.75rem;color:var(--text-3)">${DMC.escapeHtml(p.category||'—')}${p.videoUrl?' · 🎬':''}${p.hasPreview?' · 🎨':''}</div></td>
      <td class="price-cell">${DMC.formatPrice(p.price)}<span style="color:var(--text-3);font-size:.75rem">/${DMC.escapeHtml(p.unit||'ชิ้น')}</span></td>
      <td>
        <div style="display:flex;gap:.3rem;flex-wrap:wrap">
          ${p.isNew?'<span class="badge badge-new" style="font-size:.65rem">✨</span>':''}
          ${p.isHot?'<span class="badge badge-hot" style="font-size:.65rem">🔥</span>':''}
          ${p.isSale?'<span class="badge badge-sale" style="font-size:.65rem">💰</span>':''}
          ${p.featured?'<span class="badge badge-accent" style="font-size:.65rem">⭐</span>':''}
        </div>
      </td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${p.active?'checked':''} data-act-change="toggleProduct" data-id="${p.id}">
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div style="display:flex;gap:.35rem">
          <button class="table-action-btn" data-act="openProductModal" data-id="${p.id}">✏️ แก้ไข</button>
          <button class="table-action-btn btn-del-product" style="color:var(--rose);border-color:var(--rose)" data-id="${p.id}" data-name="${DMC.escapeHtml(p.name)}">🗑️</button>
        </div>
      </td>
    </tr>`;}).join('');

    el.innerHTML = `<div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>รูป</th><th>สินค้า</th><th>ราคา</th><th>แท็ก</th><th>แสดง</th><th>จัดการ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;

    // ปุ่มลบ — ใช้ data-attr กัน quote ในชื่อสินค้า
    el.querySelectorAll('.btn-del-product').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.id, btn.dataset.name));
    });
  } catch(e) { el.innerHTML = '<div style="color:var(--text-3);padding:1rem;text-align:center">โหลดไม่สำเร็จ: '+DMC.escapeHtml(e.message)+'</div>'; }
}

window.toggleProduct = async function(id, active) {
  try { await db.collection('products').doc(id).update({active}); DMC.toast(`${active?'เปิด':'ปิด'}แสดงสินค้า`, 'success'); if (window.AdminSnapshot) AdminSnapshot.autoPublish(); }
  catch(e) { DMC.toast('บันทึกไม่สำเร็จ','error'); }
};

async function deleteProduct(id, name) {
  if (!(await DMC.confirm('ลบสินค้า "' + name + '"?\nไม่สามารถย้อนกลับได้'))) return;
  db.collection('products').doc(id).delete()
    .then(() => { DMC.toast('ลบสินค้าแล้ว','success'); loadProductsTable(); if (window.AdminSnapshot) AdminSnapshot.autoPublish(); })
    .catch(() => DMC.toast('ลบไม่สำเร็จ','error'));
}

// ── Product Modal state ──
let _modalImages = [];     // [{url, label}]
let _modalCoverIndex = 0;
let _customTplCache = null;

async function fetchCustomTemplatesOnce() {
  if (_customTplCache) return _customTplCache;
  try {
    const snap = await db.collection('templates').get();
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    _customTplCache = list;
  } catch(e) { _customTplCache = []; }
  return _customTplCache;
}

window.openProductModal = async function(productId) {
  const overlay = document.getElementById('modal-overlay');
  const body    = document.getElementById('modal-body');
  if (!overlay||!body) return;

  let product = { name:'', category:'โพลารอยด์', price:'', unit:'ใบ', shortDesc:'', fullDesc:'',
                  emoji:'📦', images:[], coverIndex:0, videoUrl:'', active:true, isNew:false, isHot:false,
                  isSale:false, featured:false, minQty:1, sizes:[], materials:[], priceTiers:[],
                  templates:[], hasPreview:false, orderCount:0 };

  body.innerHTML = '<div style="text-align:center;padding:2rem"><span class="spinner" style="display:block;margin:0 auto"></span></div>';
  overlay.classList.add('open');

  if (productId) {
    const doc = await db.collection('products').doc(productId).get();
    if (doc.exists) product = Object.assign(product, {id:doc.id}, doc.data());
  }

  // เตรียม state รูป (รองรับสินค้าเก่าที่มี image เดี่ยว)
  _modalImages = Array.isArray(product.images) && product.images.length
    ? product.images.map(im => typeof im === 'string' ? {url:im, label:''} : {url:im.url||'', label:im.label||''})
    : (product.image ? [{url:product.image, label:''}] : []);
  _modalCoverIndex = Math.min(Number(product.coverIndex)||0, Math.max(_modalImages.length-1, 0));

  const customTpls = await fetchCustomTemplatesOnce();
  // หมวด built-in จาก module กลาง (js/categories.js) + 'อื่นๆ' ปิดท้าย
  const baseCats = (window.DMCCat ? DMCCat.BUILTIN.map(c => c.name) : []).concat(['อื่นๆ']);
  const customCats = await fetchCustomCategoriesOnce();
  const categories = baseCats.slice();
  customCats.forEach(cc => { if (!categories.includes(cc.name)) categories.splice(categories.length-1, 0, cc.name); });
  const selectedTpls = (product.templates||[]).map(t=>String(t).toLowerCase());

  body.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${productId?'✏️ แก้ไขสินค้า':'➕ เพิ่มสินค้าใหม่'}</div>
      <button class="modal-close" data-act="closeModal">✕</button>
    </div>

    <!-- รูปสินค้า (หลายรูป) -->
    <div class="form-group">
      <label class="form-label">🖼️ รูปสินค้า <span style="font-weight:400;color:var(--text-3)">— เพิ่มได้หลายรูป เลือกปก ⭐ และใส่ชื่อแบบเพื่อให้รูปสลับตามตัวเลือก</span></label>
      <div id="p-images-list"></div>
      <button type="button" id="p-add-image-btn" style="margin-top:.5rem">➕ เพิ่มรูปอีก</button>
      <input type="file" id="p-img-file-hidden" accept="image/*" style="display:none">
      <div style="font-size:.73rem;color:var(--text-3);margin-top:.35rem">💡 ใส่ "ชื่อแบบ" ให้ตรงกับตัวเลือกขนาด/วัสดุ เช่น "2x3 นิ้ว" — ลูกค้ากดตัวเลือกนั้นแล้วรูปจะสลับให้เอง</div>
    </div>

    <!-- วิดีโอ -->
    <div class="form-group">
      <label class="form-label">🎬 วิดีโอสินค้า <span style="font-weight:400;color:var(--text-3)">(ลิงก์ YouTube หรือ TikTok — ไม่บังคับ)</span></label>
      <input class="form-input" id="p-video" value="${DMC.escapeHtml(product.videoUrl||'')}" placeholder="https://youtu.be/... หรือ https://www.tiktok.com/@shop/video/...">
    </div>

    <!-- ชื่อ + Emoji -->
    <div class="form-row" style="margin-bottom:1rem">
      <div class="form-group" style="margin:0">
        <label class="form-label">ชื่อสินค้า *</label>
        <input class="form-input" id="p-name" value="${DMC.escapeHtml(product.name)}" placeholder="ชื่อสินค้า">
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">Emoji (ถ้าไม่มีรูป)</label>
        <input class="form-input" id="p-emoji" value="${DMC.escapeHtml(product.emoji||'📦')}" placeholder="📦">
      </div>
    </div>

    <div class="form-row" style="margin-bottom:1rem">
      <div class="form-group" style="margin:0">
        <label class="form-label">หมวดหมู่ *</label>
        <select data-custom class="form-input form-select" id="p-category">
          ${categories.map(c=>`<option ${product.category===c?'selected':''}>${c}</option>`).join('')}
          <option value="__add__">➕ เพิ่มหมวดหมู่ใหม่...</option>
          ${customCats.length ? `<option value="__manage__">🗑️ จัดการหมวดหมู่ที่เพิ่มเอง...</option>` : ''}
        </select>
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">หน่วย</label>
        <input class="form-input" id="p-unit" value="${DMC.escapeHtml(product.unit||'ชิ้น')}" placeholder="ใบ / ชิ้น / ชุด">
      </div>
    </div>

    <div class="form-row-3" style="margin-bottom:1rem">
      <div class="form-group" style="margin:0">
        <label class="form-label">ราคา (฿) *</label>
        <input class="form-input" id="p-price" type="number" value="${product.price||''}" placeholder="0">
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">ราคาเดิม (ก่อนลด)</label>
        <input class="form-input" id="p-oldprice" type="number" value="${product.oldPrice||''}" placeholder="ว่างถ้าไม่มี">
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">ขั้นต่ำ</label>
        <input class="form-input" id="p-minqty" type="number" value="${product.minQty||1}" placeholder="1">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">📐 ตัวเลือกขนาด <span style="font-weight:400;color:var(--text-3)">(คั่นด้วย , เช่น 2x3 นิ้ว, 3x4 นิ้ว)</span></label>
      <input class="form-input" id="p-sizes" value="${DMC.escapeHtml((product.sizes||[]).join(', '))}" placeholder="2x3 นิ้ว, 3x4 นิ้ว, 4x6 นิ้ว">
    </div>

    <div class="form-group">
      <label class="form-label">🗒️ วัสดุ/การเคลือบ <span style="font-weight:400;color:var(--text-3)">(คั่นด้วย ,)</span></label>
      <input class="form-input" id="p-materials" value="${DMC.escapeHtml((product.materials||[]).join(', '))}" placeholder="มันเงา (Glossy), ด้าน (Matte)">
    </div>

    <div class="form-group">
      <label class="form-label">🎁 ส่วนลดตามปริมาณ <span style="font-weight:400;color:var(--text-3)">(คั่นด้วย ,)</span></label>
      <input class="form-input" id="p-tiers" value="${DMC.escapeHtml((product.priceTiers||[]).join(', '))}" placeholder="50+ ใบ ลด 10%, 100+ ใบ ลด 20%">
    </div>

    <!-- Canvas Preview + Templates -->
    <div class="form-group" style="background:var(--bg-mid);border-radius:var(--r-lg);padding:1rem">
      <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-family:var(--font-display);font-weight:600;font-size:.92rem;margin-bottom:.4rem">
        <input type="checkbox" id="p-preview" ${product.hasPreview?'checked':''} style="accent-color:var(--accent);width:17px;height:17px">
        🎨 เปิดให้ลูกค้าลองดูตัวอย่าง (Canvas Preview)
      </label>
      <div style="font-size:.76rem;color:var(--text-3);margin-bottom:.65rem">เปิดแล้วลูกค้าจะอัปโหลดรูปตัวเองเพื่อดูตัวอย่างกับเทมเพลตได้ในหน้าสินค้านี้</div>
      <div id="p-templates-wrap" style="display:${product.hasPreview?'':'none'}">
        <div style="font-size:.8rem;font-family:var(--font-display);font-weight:600;margin-bottom:.4rem">เลือกแบบที่ให้ลูกค้าใช้ <span style="font-weight:400;color:var(--text-3)">(ไม่เลือกเลย = แสดงแบบมาตรฐานทั้ง 6)</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:.5rem">
          ${BUILTIN_TEMPLATES.map(t=>`
            <label class="tpl-check-chip">
              <input type="checkbox" class="p-tpl-check" value="${t.id}" ${selectedTpls.includes(t.id)?'checked':''}>
              <span>${t.emoji} ${t.name}</span>
            </label>`).join('')}
          ${customTpls.map(t=>`
            <label class="tpl-check-chip tpl-custom">
              <input type="checkbox" class="p-tpl-check" value="${t.id}" ${selectedTpls.includes(t.id.toLowerCase())?'checked':''}>
              <span>🖼️ ${DMC.escapeHtml(t.name||'Custom')}</span>
            </label>`).join('')}
        </div>
        ${customTpls.length===0?'<div style="font-size:.74rem;color:var(--text-3);margin-top:.4rem">💡 อัปโหลดกรอบของร้านเองได้ที่เมนู "เทมเพลต"</div>':''}
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">คำอธิบายสั้น <span style="font-weight:400;color:var(--text-3)">(แสดงในการ์ดสินค้า)</span></label>
      <input class="form-input" id="p-shortdesc" value="${DMC.escapeHtml(product.shortDesc||'')}" placeholder="คำอธิบายสั้นๆ">
    </div>
    <div class="form-group">
      <label class="form-label">รายละเอียดเต็ม</label>
      <textarea class="form-input form-textarea" id="p-desc">${DMC.escapeHtml(product.fullDesc||'')}</textarea>
    </div>

    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem">
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-active" ${product.active?'checked':''} style="accent-color:var(--accent)"> แสดงสินค้า
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-new" ${product.isNew?'checked':''} style="accent-color:var(--emerald)"> ✨ ใหม่
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-hot" ${product.isHot?'checked':''} style="accent-color:var(--rose)"> 🔥 ขายดี
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-sale" ${product.isSale?'checked':''} style="accent-color:var(--gold)"> 💰 ลด
      </label>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-family:var(--font-display);font-size:.85rem">
        <input type="checkbox" id="p-featured" ${product.featured?'checked':''} style="accent-color:var(--gold)"> ⭐ แนะนำ
      </label>
    </div>

    <div style="display:flex;gap:.75rem">
      <button class="btn btn-primary btn-md" id="p-save-btn" style="flex:1">💾 ${productId?'บันทึกการแก้ไข':'เพิ่มสินค้า'}</button>
      <button class="btn btn-ghost btn-md" data-act="closeModal">ยกเลิก</button>
    </div>`;

  renderModalImages();

  // toggle templates section
  document.getElementById('p-preview')?.addEventListener('change', e => {
    document.getElementById('p-templates-wrap').style.display = e.target.checked ? '' : 'none';
  });
  document.getElementById('p-add-image-btn')?.addEventListener('click', async () => {
    _modalImages.push({url:'', label:''});
    renderModalImages();
  });
  // เพิ่ม/จัดการหมวดหมู่จาก dropdown
  document.getElementById('p-category')?.addEventListener('change', function(){
    if (this.value === '__add__')    promptNewCategory(this);
    if (this.value === '__manage__') openManageCategories(this);
  });
  document.getElementById('p-save-btn')?.addEventListener('click', () => saveProduct(productId||''));
};

// ── รายการรูปใน modal (delegation — ไม่มี onclick ใน template) ──

let _customCatsCache = null;
async function fetchCustomCategoriesOnce() {
  if (_customCatsCache) return _customCatsCache;
  try {
    const snap = await db.collection('categories').get();
    const list = [];
    snap.forEach(d => { const x = d.data(); list.push({ id: d.id, name: x.name||d.id, emoji: x.emoji||'', slug: x.slug||d.id }); });
    _customCatsCache = list;
    return list;
  } catch(e) { return []; }
}

async function promptNewCategory(selectEl) {
  const name = prompt('ชื่อหมวดหมู่ใหม่ (เช่น สติกเกอร์, ปฏิทิน):');
  if (!name || !name.trim()) { selectEl.value = selectEl.options[0].value; return; }
  const emoji = prompt('อิโมจิประจำหมวด (ไม่บังคับ เช่น 🏷️):', '🏷️') || '';
  const clean = name.trim();
  const slug = 'cat-' + Date.now().toString(36);
  try {
    await db.collection('categories').add({ name: clean, emoji: emoji.trim(), slug, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    _customCatsCache = null;  // refresh
    DMC.toast('เพิ่มหมวด "'+clean+'" แล้ว ✅','success');
    // เพิ่ม option ใหม่ก่อน __add__ แล้วเลือก
    const addOpt = selectEl.querySelector('option[value="__add__"]');
    const opt = document.createElement('option');
    opt.textContent = clean; opt.value = clean;
    selectEl.insertBefore(opt, addOpt);
    selectEl.value = clean;
  } catch(e) {
    DMC.toast('เพิ่มไม่สำเร็จ: '+e.message,'error');
    selectEl.value = selectEl.options[0].value;
  }
}

// V4.6: เปิด modal จัดการหมวดหมู่ที่เพิ่มเอง (ลบได้)
async function openManageCategories(selectEl) {
  // reset dropdown ก่อน (กันค้างที่ __manage__)
  selectEl.value = selectEl.options[0].value;
  const cats = await fetchCustomCategoriesOnce();
  if (!cats.length) { DMC.toast('ยังไม่มีหมวดหมู่ที่เพิ่มเอง', 'info'); return; }

  // สร้าง modal (z-index สูงกว่า product modal)
  const old = document.getElementById('cat-manage-modal'); if (old) old.remove();
  const m = document.createElement('div');
  m.id = 'cat-manage-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem';
  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-card,#fff);border:1.5px solid var(--border,#e5e7eb);border-radius:var(--r-2xl,24px);padding:1.5rem 1.4rem 1.3rem;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.3)';
  box.innerHTML = '<div style="font-family:var(--font-display);font-weight:700;font-size:1.05rem;margin-bottom:.25rem;color:var(--text-1)">🗑️ จัดการหมวดหมู่ที่เพิ่มเอง</div>'
    + '<div style="font-size:.78rem;color:var(--text-3);margin-bottom:1rem">หมวด built-in (โพลารอยด์ บัตรแขวนคอ ฯลฯ) ลบไม่ได้</div>'
    + '<div id="cat-mng-list"></div>'
    + '<button id="cat-mng-close" style="margin-top:1rem;width:100%;padding:.7rem;background:var(--bg-mid,#f1f5f9);border:1.5px solid var(--border,#e5e7eb);color:var(--text-2);border-radius:var(--r-lg,14px);font-family:var(--font-display),sans-serif;font-weight:600;cursor:pointer">ปิด</button>';
  m.appendChild(box);
  document.body.appendChild(m);

  function renderList() {
    const list = document.getElementById('cat-mng-list');
    list.innerHTML = cats.map(c =>
      '<div style="display:flex;align-items:center;gap:.55rem;padding:.7rem .85rem;background:var(--bg-mid,#f8fafc);border:1px solid var(--border,#e5e7eb);border-radius:12px;margin-bottom:.5rem">'
      + '<span style="font-size:1.15rem">' + DMC.escapeHtml(c.emoji || '🏷️') + '</span>'
      + '<span style="flex:1;font-weight:600;font-size:.9rem;color:var(--text-1);min-width:0;overflow-wrap:anywhere">' + DMC.escapeHtml(c.name) + '</span>'
      + '<button data-del-cat="' + DMC.escapeHtml(c.id) + '" style="background:transparent;border:1.5px solid var(--rose,#f43f5e);color:var(--rose,#f43f5e);padding:.35rem .7rem;border-radius:9px;font-family:inherit;font-size:.78rem;font-weight:600;cursor:pointer">🗑️ ลบ</button>'
      + '</div>'
    ).join('') || '<div style="text-align:center;color:var(--text-3);padding:1rem">ไม่มีหมวดหมู่ที่เพิ่มเอง</div>';
    list.querySelectorAll('button[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-cat');
        const c = cats.find(x => x.id === id); if (!c) return;
        // ✅ กันลบหมวดที่ยังมีสินค้าอยู่
        try {
          const used = await db.collection('products').where('category', '==', c.name).limit(1).get();
          if (!used.empty) { DMC.toast('ลบไม่ได้: ยังมีสินค้าในหมวด "' + c.name + '"', 'error', 5000); return; }
        } catch(e) {}
        if (!(await DMC.confirm('ลบหมวด "' + c.name + '" ?\n(การลบไม่ส่งผลกับสินค้าเก่าที่ใช้ชื่อเดียวกัน)', { icon: '🗑️', title: 'ลบหมวดหมู่' }))) return;
        try {
          await db.collection('categories').doc(id).delete();
          // ลบจาก cache + dropdown
          const idx = cats.findIndex(x => x.id === id); if (idx >= 0) cats.splice(idx, 1);
          _customCatsCache = null;
          const opt = selectEl.querySelector('option[value="' + CSS.escape(c.name) + '"]'); if (opt) opt.remove();
          DMC.toast('ลบหมวด "' + c.name + '" แล้ว ✅', 'success');
          renderList();
          // ถ้าไม่เหลือ custom → ลบ option __manage__
          if (cats.length === 0) {
            const mOpt = selectEl.querySelector('option[value="__manage__"]'); if (mOpt) mOpt.remove();
            m.remove();
          }
        } catch(e) { DMC.toast('ลบไม่สำเร็จ: ' + e.message, 'error'); }
      });
    });
  }
  renderList();
  document.getElementById('cat-mng-close').addEventListener('click', () => m.remove());
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
}

function renderModalImages() {
  const wrap = document.getElementById('p-images-list');
  if (!wrap) return;
  if (_modalImages.length === 0) _modalImages.push({url:'', label:''});
  if (_modalCoverIndex >= _modalImages.length) _modalCoverIndex = 0;

  wrap.innerHTML = _modalImages.map((im, i) => `
    <div class="p-img-card ${i===_modalCoverIndex?'is-cover':''}" data-idx="${i}">
      <div class="p-img-preview">
        ${im.url
          ? `<img src="${DMC.escapeHtml(im.url)}" alt="" onerror="this.style.display='none';this.parentElement.classList.add('empty')">`
          : '<span class="p-img-ph">🖼️ ยังไม่มีรูป</span>'}
        ${i===_modalCoverIndex ? '<span class="p-img-cover-tag">⭐ รูปปก</span>' : ''}
        <span class="p-img-num">${i+1}</span>
      </div>
      <div class="p-img-inputs">
        <input class="form-input p-img-url" data-idx="${i}" value="${DMC.escapeHtml(im.url)}" placeholder="วาง URL รูป หรือกดปุ่มอัปโหลดด้านล่าง" style="font-size:.82rem">
        <input class="form-input p-img-label" data-idx="${i}" value="${DMC.escapeHtml(im.label)}" placeholder="ชื่อแบบ เช่น 2x3 นิ้ว (ไม่บังคับ)" style="font-size:.82rem">
      </div>
      <div class="p-img-buttons">
        <button type="button" class="p-img-action upload" data-action="upload" data-idx="${i}">📤 อัปโหลดรูป</button>
        <button type="button" class="p-img-action cover ${i===_modalCoverIndex?'active':''}" data-action="cover" data-idx="${i}">${i===_modalCoverIndex?'⭐ เป็นรูปปกแล้ว':'☆ ตั้งเป็นรูปปก'}</button>
        <button type="button" class="p-img-action remove" data-action="remove" data-idx="${i}">🗑️ ลบ</button>
      </div>
    </div>`).join('');

  wrap.querySelectorAll('.p-img-url').forEach(inp => {
    inp.addEventListener('input', () => { _modalImages[Number(inp.dataset.idx)].url = inp.value.trim(); });
    inp.addEventListener('change', () => renderModalImages());
  });
  wrap.querySelectorAll('.p-img-label').forEach(inp => {
    inp.addEventListener('input', () => { _modalImages[Number(inp.dataset.idx)].label = inp.value; });
  });

  wrap.querySelectorAll('.p-img-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.idx);
      const action = btn.dataset.action;
      if (action === 'cover') {
        _modalCoverIndex = idx; renderModalImages();
      } else if (action === 'remove') {
        if (_modalImages.length === 1) { _modalImages[0] = {url:'',label:''}; }
        else { _modalImages.splice(idx, 1); }
        if (_modalCoverIndex >= _modalImages.length) _modalCoverIndex = 0;
        renderModalImages();
      } else if (action === 'upload') {
        const fileInput = document.getElementById('p-img-file-hidden');
        fileInput.onchange = async () => {
          const file = fileInput.files[0];
          fileInput.value = '';
          if (!file) return;
          const orig = btn.innerHTML;
          btn.innerHTML = '⏳ กำลังอัปโหลด...';
          btn.disabled = true;
          try {
            const up = await DMC.compressImage(file);
            const res = await DMC.uploadToImgBB(up);
            _modalImages[idx].url = res.url;
            DMC.toast('อัปโหลดรูปสำเร็จ ✅', 'success');
          } catch(e) {
            DMC.toast('อัปโหลดไม่สำเร็จ: ' + e.message, 'error');
          }
          renderModalImages();
        };
        fileInput.click();
      }
    });
  });
}

window.saveProduct = async function(productId) {
  const splitComma = id => (document.getElementById(id)?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
  const oldPriceRaw = document.getElementById('p-oldprice')?.value;

  // เก็บเฉพาะรูปที่มี URL
  const images = _modalImages.filter(im => im.url).map(im => ({url:im.url, label:(im.label||'').trim()}));
  let coverIndex = _modalCoverIndex;
  if (coverIndex >= images.length) coverIndex = 0;

  const tplChecks = Array.from(document.querySelectorAll('.p-tpl-check:checked')).map(c => c.value);

  const data = {
    name:       document.getElementById('p-name')?.value.trim(),
    category:   document.getElementById('p-category')?.value,
    price:      parseFloat(document.getElementById('p-price')?.value)||0,
    oldPrice:   oldPriceRaw ? (parseFloat(oldPriceRaw)||null) : null,
    minQty:     parseInt(document.getElementById('p-minqty')?.value)||1,
    unit:       document.getElementById('p-unit')?.value.trim()||'ชิ้น',
    sizes:      splitComma('p-sizes'),
    materials:  splitComma('p-materials'),
    priceTiers: splitComma('p-tiers'),
    templates:  tplChecks,
    shortDesc:  document.getElementById('p-shortdesc')?.value.trim(),
    fullDesc:   document.getElementById('p-desc')?.value.trim(),
    emoji:      document.getElementById('p-emoji')?.value.trim()||'📦',
    images,
    coverIndex,
    image:      images.length ? (images[coverIndex]||images[0]).url : '',  // backward compat
    videoUrl:   document.getElementById('p-video')?.value.trim()||'',
    active:     !!document.getElementById('p-active')?.checked,
    hasPreview: !!document.getElementById('p-preview')?.checked,
    isNew:      !!document.getElementById('p-new')?.checked,
    isHot:      !!document.getElementById('p-hot')?.checked,
    isSale:     !!document.getElementById('p-sale')?.checked,
    featured:   !!document.getElementById('p-featured')?.checked,
    updatedAt:  firebase.firestore.FieldValue.serverTimestamp(),
  };
  if (!data.name)  { DMC.toast('กรุณากรอกชื่อสินค้า','error'); return; }
  if (!data.price) { DMC.toast('กรุณากรอกราคา','error'); return; }

  const saveBtn = document.getElementById('p-save-btn');
  if (typeof Loading !== 'undefined') Loading.buttonLoad(saveBtn);
  try {
    if (productId) {
      await db.collection('products').doc(productId).update(data);
      DMC.toast('แก้ไขสินค้าสำเร็จ ✅','success');
    } else {
      data.createdAt  = firebase.firestore.FieldValue.serverTimestamp();
      data.orderCount = 0;
      await db.collection('products').add(data);
      DMC.toast('เพิ่มสินค้าใหม่สำเร็จ 🎉','success');
    }
    if (typeof Loading !== 'undefined') Loading.buttonDone(saveBtn);
    closeModal(); loadProductsTable();
    if (window.AdminSnapshot) AdminSnapshot.autoPublish();
  } catch(e) {
    if (typeof Loading !== 'undefined') Loading.buttonDone(saveBtn);
    DMC.toast('บันทึกไม่สำเร็จ: '+e.message,'error');
  }
};
