/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Product Detail JS
   js/product.js
═══════════════════════════════════════════════ */
'use strict';

const PLACEHOLDER_DETAIL = {
  p1: { id:'p1', name:'รูปโพลารอยด์ 3×4 นิ้ว', shortDesc:'กระดาษ Fuji Crystal Archive สีสดใส ทนทาน', fullDesc:'พิมพ์ด้วยเครื่องพิมพ์ระดับมืออาชีพ บนกระดาษ Fuji Crystal Archive คมชัด สีสดใส ทนทาน ไม่ซีดจาง รับประกันคุณภาพทุกใบ', price:29, unit:'ใบ', emoji:'📸', category:'polaroid', isHot:true, rating:4.9, reviewCount:128, orderCount:500, sizes:['3×4 นิ้ว','4×6 นิ้ว','2×3 นิ้ว (มินิ)','Square 3×3'], materials:['มันเงา (Glossy)','ด้าน (Matte)','Luster'], hasPreview:true, priceTiers:['50+ ใบ ลด 10%','100+ ใบ ลด 20%','200+ ใบ ลด 30%'], minQty:1 },
  p4: { id:'p4', name:'บัตรแขวนคอนักเรียน', shortDesc:'PVC อย่างดี พร้อมซองใส+สายคล้อง', fullDesc:'บัตร PVC ความหนา 0.76mm พิมพ์ 4 สีเต็มใบ ทั้ง 2 ด้าน พร้อมซองใส PVC กันน้ำ และสายคล้องคอ 1 เส้น ปรับแต่ง layout ได้ตามต้องการ', price:59, unit:'ใบ', emoji:'🪪', category:'lanyard', isNew:true, rating:4.8, reviewCount:65, orderCount:200, sizes:['CR80 (มาตรฐาน)','ขนาดเล็ก'], materials:['PVC','PVC ลามิเนต'], hasPreview:true, priceTiers:['10+ ใบ ลด 5%','50+ ใบ ลด 15%'], minQty:1 },
};

let product = null;
let qty = 1;
let selectedSize = '';
let selectedMaterial = '';

document.addEventListener('DOMContentLoaded', async () => {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { showError(); return; }

  try {
    const db = await DMC.getFirebaseReady();
    const doc = await db.collection('products').doc(id).get();
    if (!doc.exists) throw new Error('not found');
    product = { id: doc.id, ...doc.data() };
  } catch {
    product = PLACEHOLDER_DETAIL[id] || null;
  }

  if (!product) { showError(); return; }

  renderProduct();
  loadRelated();
});

function showError() {
  document.getElementById('product-loading').style.display = 'none';
  document.getElementById('product-error').style.display = 'block';
}

function renderProduct() {
  document.getElementById('product-loading').style.display = 'none';
  document.getElementById('product-detail').style.display = 'block';

  document.title = `${product.name} — Diamond Cute Studio 💎`;

  // Breadcrumb
  document.getElementById('breadcrumb-name').textContent = product.name;

  // Title, meta
  document.getElementById('product-title').textContent = product.name;
  document.getElementById('rating-score').textContent = product.rating || 4.9;
  document.getElementById('review-count').textContent = `${product.reviewCount || 0} รีวิว`;
  document.getElementById('order-count').textContent  = `สั่งซื้อแล้ว ${product.orderCount || 0}+ ครั้ง`;

  // Stars
  const rating = parseFloat(product.rating) || 4.9;
  const fullStars = Math.floor(rating);
  document.getElementById('stars-display').textContent = '★'.repeat(fullStars) + (rating % 1 >= 0.5 ? '½' : '') + '☆'.repeat(5 - Math.ceil(rating));

  // Gallery
  document.getElementById('gallery-emoji').textContent = product.emoji || '📦';
  const badgeEl = document.getElementById('gallery-badge');
  if (product.isNew)  badgeEl.innerHTML = '<span class="badge badge-new">✨ ใหม่</span>';
  if (product.isHot)  badgeEl.innerHTML = '<span class="badge badge-hot">🔥 ขายดี</span>';
  if (product.isSale) badgeEl.innerHTML = '<span class="badge badge-sale">💰 ลด</span>';

  // Price
  document.getElementById('price-main').textContent = DMC.formatPrice(product.price);
  document.getElementById('price-unit').textContent = `/${product.unit || 'ชิ้น'}`;
  if (product.oldPrice) {
    document.getElementById('price-old').textContent = DMC.formatPrice(product.oldPrice);
    document.getElementById('price-old').style.display = '';
  }
  if (product.priceTiers?.length) {
    document.getElementById('price-tiers').innerHTML =
      product.priceTiers.map(t => `<span class="price-tier">🎁 ${DMC.escapeHtml(t)}</span>`).join('');
  }

  // Size options
  if (product.sizes?.length) {
    selectedSize = product.sizes[0];
    const g = document.getElementById('size-group');
    g.style.display = '';
    document.getElementById('size-selected').textContent = selectedSize;
    document.getElementById('size-chips').innerHTML = product.sizes.map((s, i) =>
      `<button class="option-chip ${i===0?'active':''}" data-val="${DMC.escapeHtml(s)}">${DMC.escapeHtml(s)}</button>`
    ).join('');
    g.querySelectorAll('.option-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        g.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedSize = chip.dataset.val;
        document.getElementById('size-selected').textContent = selectedSize;
        updateSubtotal();
      });
    });
  }

  // Material options
  if (product.materials?.length) {
    selectedMaterial = product.materials[0];
    const g = document.getElementById('material-group');
    g.style.display = '';
    document.getElementById('material-selected').textContent = selectedMaterial;
    document.getElementById('material-chips').innerHTML = product.materials.map((m, i) =>
      `<button class="option-chip ${i===0?'active':''}" data-val="${DMC.escapeHtml(m)}">${DMC.escapeHtml(m)}</button>`
    ).join('');
    g.querySelectorAll('.option-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        g.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedMaterial = chip.dataset.val;
        document.getElementById('material-selected').textContent = selectedMaterial;
      });
    });
  }

  // Description
  if (product.fullDesc) {
    document.getElementById('product-desc-section').style.display = '';
    document.getElementById('product-desc-text').textContent = product.fullDesc;
  }

  // Preview Tool (Canvas)
  if (product.hasPreview) {
    document.getElementById('preview-tool').style.display = '';
    if (typeof window.initPreviewTool === 'function') {
      setTimeout(() => window.initPreviewTool({ containerId:'preview-tool-container', size:{w:270,h:378} }), 50);
    }
  }

  // Quantity
  qty = product.minQty || 1;
  document.getElementById('qty-val').textContent = qty;
  document.getElementById('qty-display').textContent = qty;
  document.getElementById('qty-unit').textContent = product.unit || 'ชิ้น';
  if (product.minQty > 1) document.getElementById('qty-hint').textContent = `ขั้นต่ำ ${product.minQty} ${product.unit||'ชิ้น'}`;

  document.getElementById('qty-minus').addEventListener('click', () => {
    if (qty > (product.minQty || 1)) qty--;
    document.getElementById('qty-val').textContent = qty;
    document.getElementById('qty-display').textContent = qty;
    updateSubtotal();
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    qty++;
    document.getElementById('qty-val').textContent = qty;
    document.getElementById('qty-display').textContent = qty;
    updateSubtotal();
  });

  updateSubtotal();

  // Add to cart
  document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    const opts = [selectedSize, selectedMaterial].filter(Boolean).join(' · ');
    DMC.addToCart({ id:product.id, name:product.name, price:product.price, unit:product.unit||'ชิ้น', emoji:product.emoji||'📦', options:opts, qty });
    const btn = document.getElementById('add-to-cart-btn');
    btn.textContent = '✓ เพิ่มแล้ว';
    setTimeout(() => btn.textContent = '🛒 ใส่ตะกร้า', 1500);
  });

  // Order now — store to cart then go
  document.getElementById('order-now-btn').addEventListener('click', e => {
    e.preventDefault();
    const opts = [selectedSize, selectedMaterial].filter(Boolean).join(' · ');
    DMC.addToCart({ id:product.id, name:product.name, price:product.price, unit:product.unit||'ชิ้น', emoji:product.emoji||'📦', options:opts, qty });
    window.location.href = 'cart.html';
  });
}

function updateSubtotal() {
  const total = product.price * qty;
  document.getElementById('subtotal-display').textContent = DMC.formatPrice(total);
}

// ─── Preview Tool (Canvas Version) ───
function initPreviewTool() {
  if (typeof initPreviewTool_canvas === 'undefined') {
    // Use canvas-preview.js
    if (typeof window.initPreviewTool === 'function') {
      window.initPreviewTool({ containerId: 'preview-tool-container', size:{w:280,h:390} });
    }
  }
}

// ─── Related Products ───
async function loadRelated() {
  const container = document.getElementById('related-products');
  if (!container || !product) return;

  let related = [];

  try {
    const db = await DMC.getFirebaseReady();
    const snap = await db.collection('products')
      .where('category', '==', product.category)
      .where('active', '==', true)
      .limit(5)
      .get();
    snap.forEach(doc => {
      if (doc.id !== product.id) related.push({ id:doc.id, ...doc.data() });
    });
  } catch {
    // placeholder fallback
    const CATALOG_PLACEHOLDER = [
      { id:'p1', name:'รูปโพลารอยด์ 3×4 นิ้ว', shortDesc:'กระดาษพรีเมียม คุณภาพสูง', price:29, unit:'ใบ', emoji:'📸', isHot:true },
      { id:'p2', name:'รูปโพลารอยด์ 4×6 นิ้ว', shortDesc:'ขนาดใหญ่ เหมาะตกแต่ง',   price:39, unit:'ใบ', emoji:'🖼️' },
      { id:'p3', name:'โพลารอยด์ Square 3×3',  shortDesc:'ทรงสี่เหลี่ยม มินิมอล',   price:35, unit:'ใบ', emoji:'📷' },
    ];
    related = CATALOG_PLACEHOLDER.filter(p => p.id !== product.id).slice(0, 4);
  }

  if (related.length === 0) {
    container.closest('div').style.display = 'none';
    return;
  }

  container.innerHTML = related.slice(0, 4).map(p => {
    const badges = [p.isNew&&'<span class="badge badge-new">✨ ใหม่</span>', p.isHot&&'<span class="badge badge-hot">🔥 ขายดี</span>'].filter(Boolean).join('');
    return `
      <a href="product.html?id=${p.id}" class="product-card">
        <div class="product-img-wrap">
          ${p.image ? `<img src="${p.image}" alt="${DMC.escapeHtml(p.name)}" loading="lazy">` : `<span>${p.emoji||'📦'}</span>`}
          <div class="product-img-overlay"></div>
          ${badges ? `<div class="product-badges">${badges}</div>` : ''}
        </div>
        <div class="product-info">
          <div class="product-name">${DMC.escapeHtml(p.name)}</div>
          <div class="product-desc">${DMC.escapeHtml(p.shortDesc||'')}</div>
          <div class="product-footer">
            <div class="product-price">${DMC.formatPrice(p.price)}<span class="unit">/${p.unit||'ชิ้น'}</span></div>
            <button class="btn-add-cart" data-id="${p.id}" aria-label="ใส่ตะกร้า">+</button>
          </div>
        </div>
      </a>
    `;
  }).join('');

  // Bind cart buttons
  container.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const p = related.find(x => x.id === btn.dataset.id);
      if (!p) return;
      DMC.addToCart({ id:p.id, name:p.name, price:p.price, unit:p.unit||'ชิ้น', emoji:p.emoji||'📦', qty:1 });
      btn.textContent = '✓';
      setTimeout(() => btn.textContent = '+', 1200);
    });
  });
}
