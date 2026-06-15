/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Catalog JS
   js/catalog.js
═══════════════════════════════════════════════ */
'use strict';

// ── รูปปกของสินค้า (V12: รองรับหลายรูป + coverIndex) ──
function catalogCoverOf(p) {
  if (Array.isArray(p.images) && p.images.length) {
    const i = (typeof p.coverIndex === 'number' && p.images[p.coverIndex]) ? p.coverIndex : 0;
    return p.images[i].url || p.images[i] || '';
  }
  return p.image || '';
}


const PLACEHOLDER_PRODUCTS = [
  { id:'p1', name:'รูปโพลารอยด์ 3×4 นิ้ว',      shortDesc:'กระดาษ Fuji Crystal Archive สีสดใส ทนทาน', price:29,  unit:'ใบ',    emoji:'📸', category:'polaroid',      isHot:true  },
  { id:'p2', name:'รูปโพลารอยด์ 4×6 นิ้ว',      shortDesc:'ขนาดใหญ่ เหมาะตกแต่งห้อง คุณภาพสูง',    price:39,  unit:'ใบ',    emoji:'🖼️', category:'polaroid',      isNew:true  },
  { id:'p3', name:'โพลารอยด์ Square 3×3',        shortDesc:'ทรงสี่เหลี่ยมจัตุรัส สไตล์มินิมอล',       price:35,  unit:'ใบ',    emoji:'📷', category:'polaroid'                  },
  { id:'p4', name:'บัตรแขวนคอนักเรียน',          shortDesc:'PVC อย่างดี พร้อมซองใส+สายคล้อง',        price:59,  unit:'ใบ',    emoji:'🪪', category:'lanyard',       isNew:true  },
  { id:'p5', name:'บัตรแขวนคอพนักงาน',           shortDesc:'PVC พรีเมียม พร้อมซองใส ปรับแต่งได้',    price:69,  unit:'ใบ',    emoji:'🪪', category:'lanyard'                   },
  { id:'p6', name:'นามบัตรพรีเมียม (เคลือบมัน)',  shortDesc:'กระดาษ 350 แกรม เคลือบมันเงา',           price:199, unit:'100 ใบ',emoji:'💼', category:'business-card', isSale:true },
  { id:'p7', name:'นามบัตรด้าน (Matte)',          shortDesc:'กระดาษ 350 แกรม เคลือบด้าน ดูสุภาพ',    price:219, unit:'100 ใบ',emoji:'💼', category:'business-card'             },
  { id:'p8', name:'ป้ายชื่อร้านอะคริลิก',          shortDesc:'อะคริลิก UV กันน้ำ ทนแดด หลายขนาด',     price:299, unit:'ชิ้น',  emoji:'🏪', category:'shop-sign',     isHot:true  },
  { id:'p9', name:'ป้ายเมนูร้านค้า',              shortDesc:'พิมพ์ UV บนอะคริลิก คมชัด ทนทาน',        price:199, unit:'ชิ้น',  emoji:'🏪', category:'shop-sign'                 },
  { id:'p10',name:'ป้าย QR สแกนจ่าย',            shortDesc:'PromptPay + TrueMoney อะคริลิกกันน้ำ',   price:149, unit:'ชิ้น',  emoji:'📱', category:'qrcode'                    },
  { id:'p11',name:'ป้าย QR ไวไฟร้าน',            shortDesc:'QR Wifi พร้อมขาตั้ง ดีไซน์สวย',          price:129, unit:'ชิ้น',  emoji:'📶', category:'qrcode',        isNew:true  },
  { id:'p12',name:'ป้ายตุ๊กตาหัวดุ๊กดิ๊ก',        shortDesc:'น่ารัก ทำมือ สกรีนสีสด ทนทาน',          price:49,  unit:'ชิ้น',  emoji:'🧸', category:'doll-tag'                  },
  { id:'p13',name:'ป้ายตุ๊กตาแขวนกระเป๋า',        shortDesc:'PVC ใส พิมพ์ทั้ง 2 ด้าน',               price:39,  unit:'ชิ้น',  emoji:'🎀', category:'doll-tag',      isNew:true  },
  { id:'p14',name:'บัตรนักเรียน (ม.ต้น)',         shortDesc:'PVC คุณภาพสูง พร้อมซองใส',               price:55,  unit:'ใบ',    emoji:'🎓', category:'student-card'              },
  { id:'p15',name:'บัตรนักเรียน (ม.ปลาย)',        shortDesc:'ขนาด CR80 PVC ทนทาน ปรับแต่งได้',        price:55,  unit:'ใบ',    emoji:'🎓', category:'student-card',  isSale:true },
];

let allProducts = [];
let filteredProducts = [];
let currentCat = '';
let currentSort = 'featured';
let db = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Read URL param for pre-selected category
  const params = new URLSearchParams(location.search);
  currentCat = params.get('cat') || '';

  // Mark active category filter
  if (currentCat) {
    document.querySelectorAll('.filter-item[data-cat]').forEach(el => {
      el.classList.toggle('active', el.dataset.cat === currentCat);
    });
  }

  // Try Firebase, fall back to placeholder
  try {
    db = await DMC.getFirebaseReady();
    await loadFromFirebase();
  } catch {
    allProducts = PLACEHOLDER_PRODUCTS;
    applyFiltersAndRender();
  }

  bindEvents();
});

// ─── Firebase Load ───
async function loadFromFirebase() {
  try {
    const snap = await db.collection('products')
      .where('active', '==', true)
      .get();

    if (snap.empty) {
      allProducts = PLACEHOLDER_PRODUCTS;
    } else {
      allProducts = [];
      snap.forEach(doc => allProducts.push({ id: doc.id, ...doc.data() }));
    }
  } catch {
    allProducts = PLACEHOLDER_PRODUCTS;
  }
  // โหลดหมวดหมู่ (รวม custom) ให้ DMCCat.matches เทียบ slug↔ชื่อไทยได้ครบ
  try { if (window.DMCCat && DMCCat.loadAll) await DMCCat.loadAll(db); } catch(e) {}
  applyFiltersAndRender();
}

// ─── Bind UI Events ───
function bindEvents() {
  // Category filter
  document.getElementById('cat-filter-list')?.addEventListener('click', e => {
    const item = e.target.closest('.filter-item[data-cat]');
    if (!item) return;
    document.querySelectorAll('.filter-item[data-cat]').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    currentCat = item.dataset.cat;
    applyFiltersAndRender();
  });

  // Search (debounced)
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = new URLSearchParams(location.search).get('q') || '';
    searchInput.addEventListener('input', DMC.debounce(applyFiltersAndRender, 300));
  }

  // Sort
  document.getElementById('sort-select')?.addEventListener('change', e => {
    currentSort = e.target.value;
    applyFiltersAndRender();
  });

  // Apply / Clear filters
  document.getElementById('apply-filter-btn')?.addEventListener('click', applyFiltersAndRender);
  document.getElementById('clear-filter-btn')?.addEventListener('click', clearFilters);

  // Mobile dropdown sync
  var mobileSelect = document.getElementById('mobile-cat-select');
  if (mobileSelect) {
    if (currentCat) mobileSelect.value = currentCat;
    mobileSelect.addEventListener('change', function(){
      currentCat = mobileSelect.value;
      document.querySelectorAll('.filter-item[data-cat]').forEach(function(el){
        el.classList.toggle('active', el.dataset.cat === currentCat);
      });
      applyFiltersAndRender();
    });
  }
}

// ─── Apply Filters ───
function applyFiltersAndRender() {
  if (typeof Loading !== 'undefined') Loading.progressStart();
  const search   = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
  const priceMin = parseFloat(document.getElementById('price-min')?.value) || 0;
  const priceMax = parseFloat(document.getElementById('price-max')?.value) || Infinity;
  const filterNew  = document.getElementById('filter-new')?.checked;
  const filterHot  = document.getElementById('filter-hot')?.checked;
  const filterSale = document.getElementById('filter-sale')?.checked;

  filteredProducts = allProducts.filter(p => {
    // ถ้ามีการค้นหา ให้ข้ามการกรองหมวดหมู่ (ค้นหาข้ามหมวดหมู่)
    // ใช้ DMCCat.matches เทียบ slug↔ชื่อไทย (สินค้าเก็บ category เป็นชื่อไทย แต่ filter เป็น slug)
    if (currentCat && !search) {
      const ok = (window.DMCCat && DMCCat.matches)
        ? DMCCat.matches(p.category, currentCat)
        : (p.category === currentCat);
      if (!ok) return false;
    }
    if (search && !p.name.toLowerCase().includes(search)
               && !(p.shortDesc||'').toLowerCase().includes(search)
               && !(p.category||'').toLowerCase().includes(search)) return false;
    if (p.price < priceMin || p.price > priceMax) return false;
    if (filterNew  && !p.isNew)  return false;
    if (filterHot  && !p.isHot)  return false;
    if (filterSale && !p.isSale) return false;
    return true;
  });

  // Sort
  filteredProducts.sort((a, b) => {
    if (currentSort === 'price-asc')  return a.price - b.price;
    if (currentSort === 'price-desc') return b.price - a.price;
    if (currentSort === 'newest')     return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    // 'featured': hot > new > sale > rest
    const scoreA = (a.isHot?4:0) + (a.isNew?2:0) + (a.isSale?1:0);
    const scoreB = (b.isHot?4:0) + (b.isNew?2:0) + (b.isSale?1:0);
    return scoreB - scoreA;
  });

  renderProducts();
  updateResultCount();
  updateActiveFilterTags(search, priceMin, priceMax, filterNew, filterHot, filterSale);
  if (typeof Loading !== 'undefined') Loading.progressDone();   // V.upgrade1: ปิดแถบโหลด (กันค้าง)
}

// ─── Render Grid ───
function renderProducts() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4rem 1.5rem;color:var(--text-3)">
        <div style="font-size:2.5rem;margin-bottom:0.75rem">🔍</div>
        <p style="margin:0 0 1rem">ไม่พบสินค้าที่ตรงกับเงื่อนไข</p>
        <button class="btn btn-ghost btn-md" style="border-radius:var(--r-lg)" onclick="clearFilters()">ล้างตัวกรอง</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProducts.map(buildCard).join('');
  bindCardEvents(grid);

  // Scroll-in animation
  grid.querySelectorAll('.product-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        el.style.opacity = '1';
        el.style.transform = '';
      }, i * 40);
    });
  });
}

function buildCard(p) {
  const badges = [];
  if (p.isNew)  badges.push('<span class="badge badge-new">✨ ใหม่</span>');
  if (p.isHot)  badges.push('<span class="badge badge-hot">🔥 ขายดี</span>');
  if (p.isSale) badges.push('<span class="badge badge-sale">💰 ลด</span>');
  const oldPrice = p.oldPrice ? `<span class="product-price-old">${DMC.formatPrice(p.oldPrice)}</span>` : '';

  return `
    <a href="product.html?id=${p.id}" class="product-card" data-id="${p.id}">
      <div class="product-img-wrap">
        ${catalogCoverOf(p) ? `<img src="${catalogCoverOf(p)}" alt="${DMC.escapeHtml(p.name)}" loading="lazy" decoding="async">` : `<span>${p.emoji||'📦'}</span>`}
        <div class="product-img-overlay"></div>
        ${badges.length ? `<div class="product-badges">${badges.join('')}</div>` : ''}
        <button class="product-wish" data-id="${p.id}" aria-label="บันทึก" title="บันทึก">♡</button>
      </div>
      <div class="product-info">
        <div class="product-name">${DMC.escapeHtml(p.name)}</div>
        <div class="product-desc">${DMC.escapeHtml(p.shortDesc||'')}</div>
        <div class="product-footer">
          <div>
            <div class="product-price">${DMC.formatPrice(p.price)}<span class="unit">/${p.unit||'ชิ้น'}</span></div>
            ${oldPrice}
          </div>
          <button class="btn-add-cart" data-id="${p.id}" aria-label="ใส่ตะกร้า" title="ใส่ตะกร้า">+</button>
        </div>
      </div>
    </a>
  `;
}

function bindCardEvents(container) {
  container.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const p = filteredProducts.find(x => x.id === btn.dataset.id);
      if (!p) return;
      DMC.addToCart({ id:p.id, name:p.name, price:p.price, unit:p.unit||'ชิ้น', emoji:p.emoji||'📦', qty:1 });
      btn.textContent = '✓';
      setTimeout(() => btn.textContent = '+', 1200);
    });
  });
  container.querySelectorAll('.product-wish').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      btn.classList.toggle('active');
      btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
    });
  });
}

// ─── Result Count ───
function updateResultCount() {
  const el = document.getElementById('result-count');
  if (el) el.textContent = filteredProducts.length;
  // Show cross-category hint when searching with category active
  const search = document.getElementById('search-input')?.value.trim();
  const hintEl = document.getElementById('search-cat-hint');
  if (hintEl) {
    if (search && currentCat) {
      hintEl.style.display = '';
      hintEl.textContent = '🔍 ค้นหาจากทุกหมวดหมู่เนื่องจากมีคำค้นหา';
    } else {
      hintEl.style.display = 'none';
    }
  }
}

// ─── Active Filter Tags ───
function updateActiveFilterTags(search, priceMin, priceMax, filterNew, filterHot, filterSale) {
  const wrap = document.getElementById('active-filters');
  if (!wrap) return;
  const tags = [];
  if (search)            tags.push({ label:`🔍 "${search}"`, clear:() => { document.getElementById('search-input').value=''; applyFiltersAndRender(); } });
  if (priceMin > 0)      tags.push({ label:`ราคา ≥ ${DMC.formatPrice(priceMin)}`, clear:() => { document.getElementById('price-min').value=''; applyFiltersAndRender(); } });
  if (priceMax < Infinity)tags.push({ label:`ราคา ≤ ${DMC.formatPrice(priceMax)}`, clear:() => { document.getElementById('price-max').value=''; applyFiltersAndRender(); } });
  if (filterNew)         tags.push({ label:'✨ ใหม่', clear:() => { document.getElementById('filter-new').checked=false; applyFiltersAndRender(); } });
  if (filterHot)         tags.push({ label:'🔥 ขายดี', clear:() => { document.getElementById('filter-hot').checked=false; applyFiltersAndRender(); } });
  if (filterSale)        tags.push({ label:'💰 ลด', clear:() => { document.getElementById('filter-sale').checked=false; applyFiltersAndRender(); } });

  if (tags.length === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  wrap.innerHTML = tags.map((t, i) =>
    `<span class="active-filter-tag">${t.label}<button class="filter-tag-remove" data-idx="${i}">✕</button></span>`
  ).join('');
  wrap.querySelectorAll('.filter-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => tags[+btn.dataset.idx].clear());
  });
}

function clearFilters() {
  currentCat = '';
  document.querySelectorAll('.filter-item[data-cat]').forEach(el => el.classList.toggle('active', el.dataset.cat === ''));
  if (document.getElementById('search-input'))   document.getElementById('search-input').value = '';
  if (document.getElementById('price-min'))      document.getElementById('price-min').value = '';
  if (document.getElementById('price-max'))      document.getElementById('price-max').value = '';
  if (document.getElementById('filter-new'))     document.getElementById('filter-new').checked = false;
  if (document.getElementById('filter-hot'))     document.getElementById('filter-hot').checked = false;
  if (document.getElementById('filter-sale'))    document.getElementById('filter-sale').checked = false;
  applyFiltersAndRender();
}
window.clearFilters = clearFilters;
